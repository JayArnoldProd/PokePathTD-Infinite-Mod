#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PokePath TD Mod Applier v4.0
Comprehensive mod that handles ALL game modifications:
- Speed options (2x/3x/5x/10x)
- Level cap removal (infinite levels)
- Cost formula scaling past level 100
- Endless mode (continue after wave 100)
- Auto-continue option
- Endless checkpoints every 50 waves
- Shiny eggs and starters (1/30 chance)
- Shiny reveal display
- Item tooltips
- Save/Load tooltips
- Asymptotic stat scaling
- Delta time accuracy
- Wave record display (no 100 cap)

2026-01-30 - Complete rewrite to handle all 17 modified files
"""

from pathlib import Path
import re
import shutil
import json
import os
import subprocess
import sys

SCRIPT_DIR = Path(__file__).parent.resolve()
MODS_DIR = SCRIPT_DIR.parent  # mod source root (one level up from lib/)

# Load version from version.json
def get_version():
    version_file = MODS_DIR / "version.json"
    if version_file.exists():
        with open(version_file, 'r') as f:
            return json.load(f).get('version', '1.4.1')
    return '1.4.1'

MOD_VERSION = get_version()

# ============================================================================
# GAME PATH DISCOVERY
# ============================================================================
# The mod source can live anywhere on disk. To find the game install we look:
#   1. POKEPATH_APP_BUNDLE env var (Mac: path to .app bundle; Win: game-root)
#   2. Platform default
#       - Mac: /Applications/PokéPath TD.app
#       - Win: <mod-source>/.. (legacy: mod is inside <game-root>/mods/)
#
# On macOS the workspace lives OUTSIDE the .app bundle: working files (the
# extracted game tree, the runtime vanilla backup) are kept in
# <workspace>/working/ so we don't touch the bundle until the actual
# install/uninstall step. This is friendlier to Gatekeeper/code-signing and
# lets us nuke the workspace cheaply.
def _discover_game_paths():
    env_bundle = os.environ.get('POKEPATH_APP_BUNDLE')

    if sys.platform == 'darwin':
        if env_bundle:
            app_bundle = Path(env_bundle).expanduser().resolve()
        else:
            app_bundle = Path('/Applications/PokéPath TD.app')

        if not app_bundle.exists():
            print(f"  [WARN] App bundle not found: {app_bundle}")
            print(f"  [WARN] Set POKEPATH_APP_BUNDLE to your .app path.")

        resources = app_bundle / "Contents" / "Resources"
        app_asar = resources / "app.asar"

        # Workspace = parent of mod source dir, e.g. ~/Code/PokePathTD-Mac-Mod/
        workspace = MODS_DIR.parent
        working_dir = workspace / "working"
        app_extracted = working_dir / "app_extracted"
        app_asar_vanilla = working_dir / "app.asar.vanilla"

        # Ensure the working dir exists so downstream shutil.copy2 / asar
        # extract calls don't trip over a missing parent. One-time, idempotent.
        try:
            working_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            print(f"  [WARN] Could not create working dir {working_dir}: {e}")

        game_root = app_bundle  # no separate "game-root" concept on Mac
    else:
        # Windows (and any other platform): legacy layout where mod source
        # lives at <game-root>/mods/lib/ with sibling resources/.
        if env_bundle:
            game_root = Path(env_bundle).expanduser().resolve()
        else:
            game_root = MODS_DIR.parent

        app_bundle = game_root  # no .app concept on Windows
        resources = game_root / "resources"
        app_asar = resources / "app.asar"
        app_extracted = resources / "app_extracted"
        app_asar_vanilla = resources / "app.asar.vanilla"

    js_root = app_extracted / "src" / "js"

    return {
        'APP_BUNDLE': app_bundle,
        'GAME_ROOT': game_root,
        'RESOURCES': resources,
        'APP_ASAR': app_asar,
        'APP_EXTRACTED': app_extracted,
        'APP_ASAR_VANILLA': app_asar_vanilla,
        'JS_ROOT': js_root,
    }

_paths = _discover_game_paths()
APP_BUNDLE = _paths['APP_BUNDLE']
GAME_ROOT = _paths['GAME_ROOT']
RESOURCES = _paths['RESOURCES']
APP_ASAR = _paths['APP_ASAR']
APP_EXTRACTED = _paths['APP_EXTRACTED']
APP_ASAR_VANILLA = _paths['APP_ASAR_VANILLA']
JS_ROOT = _paths['JS_ROOT']

# ============================================================================
# GAME VERSION COMPATIBILITY
# ============================================================================
# Expected vanilla file sizes for the game version this mod targets.
# If these don't match, the user likely has a different game version and
# full-file-replacement patches (.modded.js) will break core gameplay.
# Mac and Windows builds have different line endings and minor code
# differences, so sizes differ by platform.
_EXPECTED_VANILLA_WIN = {
    "src/js/game/Game.js":                  44439,
    "src/js/game/component/Pokemon.js":     20520,
    "src/js/game/scenes/PokemonScene.js":   46814,
    "src/js/game/core/Area.js":             12838,
    "src/js/game/core/Team.js":             1744,
    "src/js/game/core/Box.js":              703,
}
_EXPECTED_VANILLA_MAC = {
    "src/js/game/Game.js":                  43312,
    "src/js/game/component/Pokemon.js":     19972,
    "src/js/game/scenes/PokemonScene.js":   45699,
    "src/js/game/core/Area.js":             12417,
    "src/js/game/core/Team.js":             1690,
    "src/js/game/core/Box.js":              678,
}
EXPECTED_VANILLA_FILES = _EXPECTED_VANILLA_MAC if sys.platform == 'darwin' else _EXPECTED_VANILLA_WIN

def check_game_version_compatibility():
    """Check if extracted vanilla files match expected sizes.
    
    Returns:
        tuple: (compatible: bool, mismatches: list of str)
    """
    mismatches = []
    if not APP_EXTRACTED.exists():
        return True, []  # Can't check yet, will be checked after extraction
    
    for rel_path, expected_size in EXPECTED_VANILLA_FILES.items():
        file_path = APP_EXTRACTED / rel_path.replace("/", os.sep)
        if not file_path.exists():
            mismatches.append(f"{rel_path}: FILE MISSING (expected {expected_size} bytes)")
            continue
        actual_size = file_path.stat().st_size
        if actual_size != expected_size:
            mismatches.append(f"{rel_path}: {actual_size} bytes (expected {expected_size})")
    
    return len(mismatches) == 0, mismatches


# ============================================================================
# VANILLA BACKUP & EXTRACTION - Clean-slate mod installation
# ============================================================================
# Mod markers to detect if game is already modded
MOD_MARKERS = [
    'speedFactor === 10',        # Speed mod in Game.js
    'PAUSE MICROMANAGEMENT',      # Pause micro comment in Game.js
    'calculateAsymptoticSpeed',   # Level uncap in Pokemon.js
    'ENDLESS MODE',               # Endless mode markers
    'isShinyEgg',                 # Shiny eggs in Shop.js
    '// 1 in 30 chance',         # Shiny starters
]

def is_game_modded(check_asar=False):
    """
    Check if the game has mod markers (already modded).
    
    Args:
        check_asar: If True and app_extracted doesn't exist, extract to temp and check.
                    This is slower but more accurate.
    
    Returns:
        bool: True if mod markers are detected.
    """
    # First check app_extracted if it exists
    if APP_EXTRACTED.exists():
        # Check Game.js for most reliable markers
        game_js = JS_ROOT / "game" / "Game.js"
        if game_js.exists():
            try:
                content = game_js.read_text(encoding='utf-8')
                for marker in MOD_MARKERS[:3]:  # Check speed, pause, and asymptotic markers
                    if marker in content:
                        return True
            except Exception:
                pass
        
        # Check Pokemon.js
        pokemon_js = JS_ROOT / "game" / "component" / "Pokemon.js"
        if pokemon_js.exists():
            try:
                content = pokemon_js.read_text(encoding='utf-8')
                if 'calculateAsymptoticSpeed' in content:
                    return True
            except Exception:
                pass
        
        # Check Shop.js for shiny marker
        shop_js = JS_ROOT / "game" / "core" / "Shop.js"
        if shop_js.exists():
            try:
                content = shop_js.read_text(encoding='utf-8')
                if 'isShinyEgg' in content:
                    return True
            except Exception:
                pass
    
    # If app_extracted doesn't exist and we want to check asar, extract to temp
    elif check_asar and APP_ASAR.exists():
        import tempfile
        temp_dir = Path(tempfile.mkdtemp(prefix="pokepath_check_"))
        try:
            # Quick extraction using asar module
            creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            result = subprocess.run(
                ['node', '-e', f'''
const asar = require('@electron/asar');
asar.extractAll({repr(str(APP_ASAR))}, {repr(str(temp_dir))});
'''],
                capture_output=True,
                text=True,
                timeout=60,
                creationflags=creationflags,
                cwd=str(MODS_DIR)
            )
            
            if result.returncode == 0:
                # Check extracted temp files for markers
                temp_game_js = temp_dir / "src" / "js" / "game" / "Game.js"
                if temp_game_js.exists():
                    content = temp_game_js.read_text(encoding='utf-8')
                    for marker in MOD_MARKERS[:3]:
                        if marker in content:
                            return True
        except Exception:
            pass
        finally:
            # Clean up temp dir
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                pass
    
    return False

def ensure_vanilla_backup():
    """
    Ensure we have a vanilla backup of app.asar.
    
    Returns:
        tuple: (success: bool, message: str)
        
    If app.asar.vanilla exists, returns True (we have a backup).
    If it doesn't exist:
      - Check if current app.asar appears modded (via app_extracted markers)
      - If modded, return False with warning (don't backup a modded asar!)
      - If vanilla, copy app.asar -> app.asar.vanilla
    """
    if APP_ASAR_VANILLA.exists():
        print(f"  [OK] Vanilla backup exists: {APP_ASAR_VANILLA.name}")
        return True, "Vanilla backup exists"
    
    if not APP_ASAR.exists():
        return False, f"app.asar not found at {APP_ASAR}"
    
    # Check if game appears already modded (check extracted files or asar itself)
    if is_game_modded(check_asar=True):
        return False, (
            "Cannot create vanilla backup - game appears already modded!\n"
            "Please reinstall the vanilla game first, then run the mod installer.\n"
            "Your save data is safe (stored separately in browser data)."
        )
    
    # Create backup
    print(f"  [*] Creating vanilla backup: {APP_ASAR_VANILLA.name}")
    try:
        shutil.copy2(APP_ASAR, APP_ASAR_VANILLA)
        print(f"  [OK] Vanilla backup created ({APP_ASAR_VANILLA.stat().st_size // 1024 // 1024}MB)")
        return True, "Vanilla backup created"
    except Exception as e:
        return False, f"Failed to create backup: {e}"

def extract_from_vanilla(progress_callback=None):
    """
    Extract game files from app.asar.vanilla for a clean slate.
    
    Always extracts from .vanilla (not .asar) to ensure clean state.
    Deletes app_extracted/ first if it exists.
    
    Args:
        progress_callback: Optional callback(current, total, message)
    
    Returns:
        tuple: (success: bool, message: str)
    """
    source = APP_ASAR_VANILLA if APP_ASAR_VANILLA.exists() else APP_ASAR
    
    if not source.exists():
        return False, f"Source asar not found: {source}"
    
    source_name = "vanilla backup" if source == APP_ASAR_VANILLA else "app.asar (no vanilla backup)"
    
    # Delete existing extraction
    if APP_EXTRACTED.exists():
        print(f"  [*] Removing old extraction...")
        if progress_callback:
            progress_callback(0, 1, "Removing old extraction...")
        try:
            shutil.rmtree(APP_EXTRACTED)
        except Exception as e:
            return False, f"Failed to remove old extraction: {e}"
    
    # Extract from source
    print(f"  [*] Extracting from {source_name}...")
    if progress_callback:
        progress_callback(0, 1, f"Extracting from {source_name}...")
    
    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    
    # Try local extract script first
    extract_script = SCRIPT_DIR / "extract_game.js"
    if extract_script.exists():
        try:
            # Modify the script path for vanilla extraction
            result = subprocess.run(
                ['node', '-e', f'''
const asar = require('@electron/asar');
const path = require('path');
const source = {repr(str(source))};
const dest = {repr(str(APP_EXTRACTED))};
asar.extractAll(source, dest);
console.log('OK: Extracted to', dest);
'''],
                capture_output=True,
                text=True,
                timeout=300,
                creationflags=creationflags,
                cwd=str(MODS_DIR)
            )
            if result.returncode == 0 and 'OK:' in result.stdout:
                print(f"  [OK] Extracted successfully from {source_name}")
                return True, f"Extracted from {source_name}"
        except Exception as e:
            print(f"  [WARN] Node extraction failed, trying npx: {e}")
    
    # Fallback to npx
    try:
        if sys.platform == 'win32':
            cmd = ['cmd', '/c', 'npx', 'asar', 'extract', str(source), str(APP_EXTRACTED)]
        else:
            cmd = ['npx', 'asar', 'extract', str(source), str(APP_EXTRACTED)]
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            creationflags=creationflags
        )
        
        if result.returncode == 0:
            print(f"  [OK] Extracted successfully from {source_name}")
            return True, f"Extracted from {source_name}"
        else:
            return False, f"npx asar extract failed: {result.stderr}"
    except subprocess.TimeoutExpired:
        return False, "Extraction timed out after 5 minutes"
    except FileNotFoundError:
        return False, "npx not found - make sure Node.js is installed"
    except Exception as e:
        return False, f"Extraction failed: {e}"

# Track applied mods
applied_mods = []
failed_mods = []

# ============================================================================
# MOD FEATURES - Defines selectable feature groups for the installer GUI
# ============================================================================
MOD_FEATURES = {
    'pause_micro': {
        'name': 'Pause Micromanagement',
        'description': 'Deploy, move, swap, and retire towers while the game is paused. Uses the enhanced game loop (vanilla speeds preserved unless 10x Speed is also enabled)',
        'functions': ['_ensure_game_modded', 'apply_pause_micromanagement'],
        'default': True,
    },
    'speed': {
        'name': '10x Speed',
        'description': 'Adds 1x, 1.5x, 2x, 3x, 5x, and 10x game speed options with sub-stepping for accuracy at high speeds',
        'functions': ['_ensure_game_modded', 'apply_speed_mod'],
        'default': True,
    },
    'endless': {
        'name': 'Endless Mode',
        'description': 'Continue past wave 100 with scaling difficulty, checkpoints, auto-continue, and uncapped wave record display on the map',
        'functions': ['apply_endless_mode', 'apply_endless_waves', 'apply_endless_checkpoints', 
                      'apply_enemy_scaling', 'apply_profile_endless_stats',
                      'apply_text_continue_option', 'apply_menu_autoreset_range',
                      'apply_map_record_uncap', 'apply_wave_manager_fix',
                      'apply_endless_stat_safety', 'apply_endless_levelbutton_safety'],
        'default': True,
    },
    'infinite_levels': {
        'name': 'Infinite Levels',
        'description': 'Remove level 100 cap, asymptotic stat scaling, recharge precision at sub-0.1s',
        'functions': ['apply_pokemon_mods', 'apply_pokemonscene_mods', 'apply_recharge_precision'],
        'default': True,
    },
    'shiny': {
        'name': 'Shiny Pokemon (1/30)',
        'description': '1 in 30 chance for any new Pokemon to be shiny — eggs, starters, and secret/hidden unlocks. Includes shiny reveal animation, custom sprites for all non-max evolutions, and shiny Ditto fix',
        'functions': ['apply_shiny_eggs', 'apply_shiny_starters', 'apply_shiny_reveal', 'apply_shiny_sprites', 'apply_secret_shiny'],
        'default': True,
    },
    'qol': {
        'name': 'Quality of Life',
        'description': 'Hover tooltips for held items, save/load team buttons, tower position saving, challenge party preserve, attack type sorting in box, gold cap raised to 9 quadrillion, abbreviated gold display (BILLION/TRILLION/QUADRILLION), live profile stats',
        'functions': ['apply_item_tooltips', 'apply_ui_mods', 'apply_emoji_font_fix', 'apply_ui_emoji_font_fix', 'apply_challenge_party_preserve', 'apply_attacktype_sort', 'apply_gold_cap_increase', 'apply_gold_display_format_player', 'apply_gold_display_format_ui', 'apply_profile_live_update'],
        'default': True,
    },
    'box_expansion': {
        'name': 'Box Expansion (200 slots)',
        'description': 'Expand Pokemon storage from 120 to 200 slots',
        'functions': ['apply_box_expansion', 'apply_attacktype_sort'],
        'default': True,
    },
    # 'egg_shop' feature REMOVED in v1.4.4b -- all 17 Pokemon are obtainable
    # through vanilla gameplay (secret clicks, audio codes, route challenges).
    # Keeping them in the shop would create duplicates. See transcript guide.
    'deltatime': {
        'name': 'Delta Time & Performance',
        'description': 'Sub-stepping simulation, accurate projectile timing, squared-distance checks, batch removal, throttled UI, cached draws',
        'functions': ['apply_tower_deltatime', 'apply_projectile_scaling', 'apply_projectile_speed_scaling'], 
        'default': True,
    },
    'devtools': {
        'name': 'Developer Tools (F12)',
        'description': 'Enable F12/Ctrl+Shift+I for browser dev tools',
        'functions': ['apply_devtools'],
        'default': True,
    },
    'vanilla_fixes': {
        'name': 'Vanilla Bug Fixes',
        'description': 'Challenge level cap fix (no boost), projectile retargeting from tower position, off-screen target cleanup, Shell Bell / Clefairy Doll damage tracking fix',
        'functions': ['apply_challenge_levelcap_fix', 'apply_projectile_retarget_fix', 'apply_offscreen_target_fix', 'apply_shellbell_fix'],
        'default': True,
    },
    'hidden_items': {
        'name': 'Unlock Hidden Item(s)',
        'description': 'Unlocks 1 hidden item: Magma Stone (doubles burn duration to 20s, 50000g). The game code already supports it!',
        'functions': ['apply_hidden_items'],
        'default': True,
    },
    'allow_dupes': {
        'name': 'Allow Duplicate Pokemon',
        'description': 'Removes the team deduplication filter that prevents Pokemon sharing the same species ID (e.g. Cherubi/Cherrim both have ID 75)',
        'functions': ['apply_allow_dupes'],
        'default': True,
    },
}

def log_success(name):
    applied_mods.append(name)
    print(f"  [OK] {name}")

def log_skip(name):
    print(f"  [SKIP] {name} (already applied)")

def log_fail(name, reason="pattern not found"):
    failed_mods.append(name)
    print(f"  [FAIL] {name}: {reason}")

def read_file(path):
    return path.read_text(encoding='utf-8')

def write_file(path, content):
    path.write_text(content, encoding='utf-8')

def copy_modded_file(src, dest):
    """Copy modded file as UTF-8 without BOM (BOM breaks Electron's JS module loader)."""
    content = src.read_text(encoding='utf-8-sig')  # utf-8-sig strips BOM on read
    dest.write_text(content, encoding='utf-8')      # write without BOM

# ============================================================================
# SHINY SPRITES - Copy pre-generated non-max evolution shinies
# ============================================================================
def apply_shiny_sprites():
    """Copy pre-generated shiny sprites for non-max evolution Pokemon."""
    print("\n[*] Installing custom shiny sprites...")
    
    shiny_src = MODS_DIR / "patches" / "shiny_sprites"
    shiny_dest = APP_EXTRACTED / "src" / "assets" / "images" / "pokemon" / "shiny"
    
    if not shiny_src.exists():
        print("  [SKIP] No pre-generated shiny sprites found")
        return
    
    # Ensure destination exists
    shiny_dest.mkdir(parents=True, exist_ok=True)
    
    # Copy all sprite files
    count = 0
    for sprite_file in shiny_src.glob("*.png"):
        dest_file = shiny_dest / sprite_file.name
        shutil.copy2(sprite_file, dest_file)
        count += 1
    
    if count > 0:
        log_success(f"Shiny sprites: {count} custom sprites installed")
    else:
        print("  [SKIP] No shiny sprites to install")

# ============================================================================
# TEXT.JS - Add "Continue" option to auto-reset
# ============================================================================
def apply_text_continue_option():
    """Add 'Continue' as 4th auto-reset option in all languages."""
    path = JS_ROOT / "file" / "text.js"
    content = read_file(path)
    
    # Check if already applied
    if "'Continue'" in content or '"Continue"' in content:
        log_skip("text.js: Continue option")
        return True
    
    # Find the reset object and add option 3
    old_pattern = """reset: {
				0: ['Off', 'Apagado', 'Arrêt', 'Desligado', 'Spento', 'Aus', 'オフ', '끄기', '关é--­', 'Wył.'],
				1: ['Restart', 'Reiniciar', 'Recommencer', 'Reiniciar', 'Ricomincia', 'Neustarten', 'リスタート', '재시작', '重新开始', 'Restart'],
				2: ['Retry', 'Reintentar', 'Réessayer', 'Tentar', 'Riprova', 'Wiederholen', 'リトライ', '재시도', '重试', 'Ponów'],
			}"""
    
    new_pattern = """reset: {
				0: ['Off', 'Apagado', 'Arrêt', 'Desligado', 'Spento', 'Aus', 'オフ', '끄기', '关é--­', 'Wył.'],
				1: ['Restart', 'Reiniciar', 'Recommencer', 'Reiniciar', 'Ricomincia', 'Neustarten', 'リスタート', '재시작', '重新开始', 'Restart'],
				2: ['Retry', 'Reintentar', 'Réessayer', 'Tentar', 'Riprova', 'Wiederholen', 'リトライ', '재시도', '重试', 'Ponów'],
				3: ['Continue', 'Continuar', 'Continuer', 'Continuar', 'Continua', 'Fortsetzen', 'つづく', '계속', '继续', 'Kontynuuj'],
			}"""
    
    if old_pattern in content:
        content = content.replace(old_pattern, new_pattern)
        write_file(path, content)
        log_success("text.js: Continue option added")
        return True
    
    # Try alternate pattern matching (encoding might differ)
    # Match the structure and add line 3
    pattern = r"(reset:\s*\{\s*\n\s*0:\s*\[[^\]]+\],\s*\n\s*1:\s*\[[^\]]+\],\s*\n\s*2:\s*\[[^\]]+\],)(\s*\n\s*\},?)"
    match = re.search(pattern, content)
    if match:
        new_line = "\n\t\t\t\t3: ['Continue', 'Continuar', 'Continuer', 'Continuar', 'Continua', 'Fortsetzen', 'つづく', '계속', '继续', 'Kontynuuj'],"
        content = content[:match.end(1)] + new_line + content[match.start(2):]
        write_file(path, content)
        log_success("text.js: Continue option added (regex)")
        return True
    
    log_fail("text.js: Continue option")
    return False

# ============================================================================
# MENUSCENE.JS - Auto-reset cycles 0-3 instead of 0-2
# ============================================================================
def apply_menu_autoreset_range():
    """Change auto-reset to cycle through 4 options (0-3) instead of 3 (0-2)."""
    path = JS_ROOT / "game" / "scenes" / "MenuScene.js"
    content = read_file(path)
    
    # Check if already applied
    if 'pos == 4' in content and 'pos = 3' in content:
        log_skip("MenuScene.js: Auto-reset range")
        return True
    
    old_pattern = """updateAutoReset = (dir) => {
    	let pos = Number(this.main.autoReset) + dir;
		if (pos < 0) pos = 2;
		else if (pos == 3) pos = 0;"""
    
    new_pattern = """updateAutoReset = (dir) => {
    	let pos = Number(this.main.autoReset) + dir;
		if (pos < 0) pos = 3;
		else if (pos == 4) pos = 0;"""
    
    if old_pattern in content:
        content = content.replace(old_pattern, new_pattern)
        
        # Also fix the display code to show option 3 (Continue)
        display_old = """this.autoResetRow.label.innerText = text.menu.settings.autoReset[this.main.lang].toUpperCase();
  		if (data.config.autoReset == 1) this.autoResetRow.value.innerText = text.menu.settings.reset[1][this.main.lang].toUpperCase();
  		else if (data.config.autoReset == 2) this.autoResetRow.value.innerText = text.menu.settings.reset[2][this.main.lang].toUpperCase();
  		else this.autoResetRow.value.innerText = text.menu.settings.reset[0][this.main.lang].toUpperCase();"""
        
        display_new = """this.autoResetRow.label.innerText = text.menu.settings.autoReset[this.main.lang].toUpperCase();
  		if (data.config.autoReset == 1) this.autoResetRow.value.innerText = text.menu.settings.reset[1][this.main.lang].toUpperCase();
  		else if (data.config.autoReset == 2) this.autoResetRow.value.innerText = text.menu.settings.reset[2][this.main.lang].toUpperCase();
  		else if (data.config.autoReset == 3) this.autoResetRow.value.innerText = text.menu.settings.reset[3][this.main.lang].toUpperCase();
  		else this.autoResetRow.value.innerText = text.menu.settings.reset[0][this.main.lang].toUpperCase();"""
        
        if display_old in content:
            content = content.replace(display_old, display_new)
        
        write_file(path, content)
        log_success("MenuScene.js: Auto-reset range 0-3")
        return True
    
    # Check if cycle is already fixed but display isn't
    if 'pos == 4' in content and 'pos = 3' in content:
        display_old = """this.autoResetRow.label.innerText = text.menu.settings.autoReset[this.main.lang].toUpperCase();
  		if (data.config.autoReset == 1) this.autoResetRow.value.innerText = text.menu.settings.reset[1][this.main.lang].toUpperCase();
  		else if (data.config.autoReset == 2) this.autoResetRow.value.innerText = text.menu.settings.reset[2][this.main.lang].toUpperCase();
  		else this.autoResetRow.value.innerText = text.menu.settings.reset[0][this.main.lang].toUpperCase();"""
        
        display_new = """this.autoResetRow.label.innerText = text.menu.settings.autoReset[this.main.lang].toUpperCase();
  		if (data.config.autoReset == 1) this.autoResetRow.value.innerText = text.menu.settings.reset[1][this.main.lang].toUpperCase();
  		else if (data.config.autoReset == 2) this.autoResetRow.value.innerText = text.menu.settings.reset[2][this.main.lang].toUpperCase();
  		else if (data.config.autoReset == 3) this.autoResetRow.value.innerText = text.menu.settings.reset[3][this.main.lang].toUpperCase();
  		else this.autoResetRow.value.innerText = text.menu.settings.reset[0][this.main.lang].toUpperCase();"""
        
        if display_old in content:
            content = content.replace(display_old, display_new)
            write_file(path, content)
            log_success("MenuScene.js: Auto-reset display fix")
            return True
        
        log_skip("MenuScene.js: Auto-reset range")
        return True
    
    log_fail("MenuScene.js: Auto-reset range")
    return False

# ============================================================================
# MAPSCENE.JS - Remove wave 100 cap on record display
# ============================================================================
def apply_map_record_uncap():
    """Remove Math.min(100, ...) cap on wave record display."""
    path = JS_ROOT / "game" / "scenes" / "MapScene.js"
    content = read_file(path)
    
    # Check if already applied (no Math.min(100 in record display)
    if 'Math.min(100' not in content:
        log_skip("MapScene.js: Record display uncapped")
        return True
    
    # Replace both occurrences
    content = content.replace('Math.min(100, recordValue)', 'recordValue')
    content = content.replace('Math.min(100, this.main.player.records[i])', 'this.main.player.records[i]')
    
    write_file(path, content)
    log_success("MapScene.js: Record display uncapped")
    return True

# ============================================================================
# SHOP.JS - 1/30 shiny chance for eggs
# ============================================================================
def apply_shiny_eggs():
    """Add 1/30 shiny chance when buying eggs - uses full file replacement.

    File-replace with CRLF normalization.  The vanilla file does not exist
    in the extracted vanilla reference (Mac game structure differs), so no
    Mac-only diff comparison is possible.  The modded file is the user's
    own authoritative source.
    """
    path = JS_ROOT / "game" / "core" / "Shop.js"
    content = read_file(path)

    if 'isShinyEgg' in content or '1/30' in content:
        log_skip("Shop.js: Shiny eggs")
        return True

    modded_path = MODS_DIR / "patches" / "Shop.modded.js"
    if not modded_path.exists():
        log_fail("Shop.js: Shiny eggs", "Shop.modded.js not found")
        return False

    modded_content = modded_path.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
    write_file(path, modded_content)
    log_success("Shop.js: Shiny eggs (file replace)")
    return True

# ============================================================================
# NEWGAMESCENE.JS - 1/30 shiny chance for starters
# ============================================================================
def apply_shiny_starters():
    """Add 1/30 shiny chance when selecting starter."""
    path = JS_ROOT / "game" / "scenes" / "NewGameScene.js"
    content = read_file(path)
    
    # Check if already applied (handle both "1/30" and "1 / 30" spacing)
    if 'isShiny' in content and ('1/30' in content or '1 / 30' in content):
        log_skip("NewGameScene.js: Shiny starters")
        return True
    
    # Use modded file if available (CRLF-normalized, safer, idempotent)
    modded_file = MODS_DIR / "patches" / "NewGameScene.modded.js"
    if modded_file.exists():
        modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
        write_file(path, modded_content)
        log_success("NewGameScene.js: Shiny starters (full file replacement)")
        return True

    # Fallback: inline patch
    old_pattern = """	close() {
		super.close();
		this.main.team.addPokemon(new Pokemon(STARTER[this.starterSelected], 1, null, this.main));
		this.main.shop.eggList.splice(this.starterSelected, 1);"""
    
    new_pattern = """	close() {
		super.close();
		// 1 in 30 chance for shiny starter
		const isShiny = Math.random() < (1 / 30);
		this.main.team.addPokemon(new Pokemon(STARTER[this.starterSelected], 1, null, this.main, undefined, false, null, undefined, isShiny));
		this.main.shop.eggList.splice(this.starterSelected, 1);"""
    
    if old_pattern in content:
        content = content.replace(old_pattern, new_pattern)
        write_file(path, content)
        log_success("NewGameScene.js: Shiny starters (1/30)")
        return True
    
    log_fail("NewGameScene.js: Shiny starters")
    return False

# ============================================================================
# SHOPSCENE.JS - Shiny reveal display
# ============================================================================
def apply_shiny_reveal():
    """Add shiny reveal display with sparkle animation."""
    path = JS_ROOT / "game" / "scenes" / "ShopScene.js"
    content = read_file(path)
    
    # Check if already applied
    if 'isShinyReveal' in content:
        log_skip("ShopScene.js: Shiny reveal")
        return True
    
    # Modify DisplayPokemon constructor
    old_constructor = """class DisplayPokemon extends GameScene {
	constructor(main) {
		super(200, 200);
		this.main = main;
		this.pokemon;
		
		this.header.removeChild(this.closeButton);
		this.render();
	}"""
    
    new_constructor = """class DisplayPokemon extends GameScene {
	constructor(main) {
		super(200, 200);
		this.main = main;
		this.pokemon;
		this.isShinyReveal = false;
		
		this.header.removeChild(this.closeButton);
		this.render();
	}"""
    
    # Modify render to add shiny symbol
    old_render = """	render() {
		this.title.innerHTML = text.shop.title[this.main.lang].toUpperCase();
		this.prompt = new Element(this.container, { className: 'dp-scene-prompt' }).element;
		this.pokemonName = new Element(this.container, { className: 'dp-scene-pokemon-name' }).element;
		this.image = new Element(this.container, { className: 'dp-scene-image' }).element;
		this.closeButton = new Element(this.container, { className: 'shop-scene-purchase' }).element;"""
    
    new_render = """	render() {
		this.title.innerHTML = text.shop.title[this.main.lang].toUpperCase();
		this.prompt = new Element(this.container, { className: 'dp-scene-prompt' }).element;
		this.pokemonName = new Element(this.container, { className: 'dp-scene-pokemon-name' }).element;
		this.image = new Element(this.container, { className: 'dp-scene-image' }).element;
		// Scale up the Pokemon sprite 2.4x (96px = 40px * 2.4)
		this.image.style.cssText = 'width:96px;height:96px;background-size:contain;image-rendering:pixelated;margin-top:10px;';
		
		// Shiny symbol - enlarged star positioned in corner
		this.shinySymbol = new Element(this.container, { className: 'dp-scene-shiny-symbol' }).element;
		this.shinySymbol.innerHTML = '<span class="msrre">\u2b50</span>';
		this.shinySymbol.style.cssText = 'position:absolute;top:10px;right:10px;font-size:40px;display:none;text-shadow:0 0 10px gold,0 0 20px gold;';
		
		// Add pulse animation keyframe if not exists
		if (!document.getElementById('shinyPulseStyle')) {
			const style = document.createElement('style');
			style.id = 'shinyPulseStyle';
			style.textContent = '@keyframes shinyPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:0.8}}';
			document.head.appendChild(style);
		}
		this.shinySymbol.style.animation = 'shinyPulse 1s ease-in-out infinite';
		
		this.closeButton = new Element(this.container, { className: 'shop-scene-purchase' }).element;"""
    
    # Modify update to show shiny text
    old_update = """	update() {
		this.title.innerHTML = text.shop.title[this.main.lang].toUpperCase();
		this.prompt.innerText = text.shop.new[this.main.lang].toUpperCase();
		this.pokemonName.innerHTML = this.pokemon.name[this.main.lang].toUpperCase();
		this.pokemonName.style.color = this.pokemon.specie.color;
		this.image.style.backgroundImage = `url("${this.pokemon.sprite.base}")`;
		this.closeButton.innerHTML = 'OK';
	}"""
    
    new_update = """	update() {
		this.title.innerHTML = text.shop.title[this.main.lang].toUpperCase();
		if (this.isShinyReveal) {
			this.prompt.innerHTML = '<span class="msrre">\u2b50</span> SHINY! <span class="msrre">\u2b50</span>';
		} else {
			this.prompt.innerText = text.shop.new[this.main.lang].toUpperCase();
		}
		this.pokemonName.innerHTML = this.pokemon.name[this.main.lang].toUpperCase();
		this.pokemonName.style.color = this.pokemon.specie.color;
		this.image.style.backgroundImage = `url("${this.pokemon.sprite.base}")`;
		this.closeButton.innerHTML = 'OK';
		
		// Show shiny symbol if it's a shiny reveal
		this.shinySymbol.style.display = this.isShinyReveal ? 'block' : 'none';
	}"""
    
    # Modify open to accept isShiny param
    old_open = """	open(pokemon) {
		playSound('results', 'ui');
		this.pokemon = pokemon;

		super.open();
		this.update();
	}"""
    
    new_open = """	open(pokemon, isShiny = false) {
		playSound('results', 'ui');
		this.pokemon = pokemon;
		this.isShinyReveal = isShiny;

		super.open();
		this.update();
	}"""
    
    changes_made = 0
    
    if old_constructor in content:
        content = content.replace(old_constructor, new_constructor)
        changes_made += 1
    
    if old_render in content:
        content = content.replace(old_render, new_render)
        changes_made += 1
    
    if old_update in content:
        content = content.replace(old_update, new_update)
        changes_made += 1
    
    if old_open in content:
        content = content.replace(old_open, new_open)
        changes_made += 1
    
    if changes_made > 0:
        write_file(path, content)
        log_success(f"ShopScene.js: Shiny reveal ({changes_made} changes)")
        return True
    
    log_fail("ShopScene.js: Shiny reveal")
    return False

# ============================================================================
# UI.JS - 1/30 shiny chance for secret/hidden Pokemon unlocks
# ============================================================================
def apply_secret_shiny():
    """Patch getSecret() in UI.js to add 1/30 shiny chance for hidden Pokemon."""
    path = JS_ROOT / "game" / "UI.js"
    
    if not path.exists():
        log_skip("UI.js: Secret shiny (file not yet installed)")
        return True
    
    content = read_file(path)
    
    # Check if already applied
    if '1 / 30' in content and 'getSecret' in content and 'isShiny' in content:
        log_skip("UI.js: Secret shiny")
        return True
    
    # Vanilla getSecret pattern (matches both vanilla and our reverted UI.modded.js)
    old = """	getSecret(poke) {
		const pokemon = pokemonData[poke];

		if (this.main.team.pokemon.length < this.main.player.teamSlots) {
			this.main.team.addPokemon(new Pokemon(pokemon, 1, null, this.main));
			this.main.shopScene.displayPokemon.open(this.main.team.pokemon.at(-1))
		} else {
			this.main.box.addPokemon(new Pokemon(pokemon, 1, null, this.main));
			this.main.shopScene.displayPokemon.open(this.main.box.pokemon.at(-1))
		}"""
    
    new = """	getSecret(poke) {
		const pokemon = pokemonData[poke];
		// 1 in 30 chance for shiny secret Pokemon
		const isShiny = Math.random() < (1 / 30);

		if (this.main.team.pokemon.length < this.main.player.teamSlots) {
			this.main.team.addPokemon(new Pokemon(pokemon, 1, null, this.main, undefined, false, null, undefined, isShiny));
			const newPoke = this.main.team.pokemon.at(-1);
			if (isShiny) { newPoke.isShiny = true; newPoke.setShiny(); }
			this.main.shopScene.displayPokemon.open(newPoke, isShiny)
		} else {
			this.main.box.addPokemon(new Pokemon(pokemon, 1, null, this.main, undefined, false, null, undefined, isShiny));
			const newPoke = this.main.box.pokemon.at(-1);
			if (isShiny) { newPoke.isShiny = true; newPoke.setShiny(); }
			this.main.shopScene.displayPokemon.open(newPoke, isShiny)
		}"""
    
    if old in content:
        content = content.replace(old, new)
        write_file(path, content)
        log_success("UI.js: Secret shiny (1/30 chance for hidden Pokemon)")
        return True
    
    log_fail("UI.js: Secret shiny", "getSecret pattern not found")
    return False

# ============================================================================
# FINALSCENE.JS - Endless mode continue/restart buttons
# ============================================================================
def apply_endless_mode():
    """Add Continue/Restart buttons and endless mode logic.

    Hybrid: file-replace with modded, then restore Mac vanilla's getText()
    (correct Unicode) and fix corrupted em dash in challenge display.
    The Windows-authored modded file has CP437-reencoded Unicode in getText()
    and in the challenge display em dash.
    """
    path = JS_ROOT / "game" / "scenes" / "FinalScene.js"
    content = read_file(path)

    if 'continueEndless' in content:
        log_skip("FinalScene.js: Endless mode")
        return True

    modded_file = MODS_DIR / "patches" / "FinalScene.modded.js"
    if not modded_file.exists():
        log_fail("FinalScene.js: Endless mode", "modded file not found")
        return False

    # Preserve vanilla getText() with correct Unicode before overwriting
    try:
        v_start = content.index('\tgetText(lang)')
        v_end = content.rindex('}')  # class closing brace
        vanilla_getText = content[v_start:v_end]
    except ValueError:
        log_fail("FinalScene.js: Endless mode", "vanilla getText() not found")
        return False

    # Read modded, normalize CRLF/BOM
    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')

    # Swap corrupted getText() with vanilla's correct Unicode version
    try:
        m_start = modded_content.index('\tgetText(lang)')
        m_end = modded_content.rindex('}')
        modded_content = modded_content[:m_start] + vanilla_getText + modded_content[m_end:]
    except ValueError:
        log_fail("FinalScene.js: Endless mode", "modded getText() not found")
        return False

    # Fix corrupted em dash in challenge display (CP437 ΓÇö → Unicode —)
    modded_content = modded_content.replace('\u0393\u00c7\u00f6', '\u2014')

    write_file(path, modded_content)
    log_success("FinalScene.js: Endless mode (file replace + Unicode fix)")
    return True

# ============================================================================
# TOOLTIP.JS - Enhanced item tooltips
# ============================================================================
def apply_item_tooltips():
    """Add enhanced tooltip functionality for items.

    File-replace with CRLF normalization.  The mod adds showText() and
    bindTextTo() methods plus improved tooltip styling.  No Mac-only
    features lost — all changes are pure additions.
    """
    path = JS_ROOT / "utils" / "Tooltip.js"
    content = read_file(path)

    if 'showText' in content:
        log_skip("Tooltip.js: Item tooltips")
        return True

    modded_file = MODS_DIR / "patches" / "Tooltip.modded.js"
    if not modded_file.exists():
        log_fail("Tooltip.js: Item tooltips", "modded file not found")
        return False

    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
    write_file(path, modded_content)
    log_success("Tooltip.js: Item tooltips (file replace)")
    return True

# ============================================================================
# UI.JS - Save/Load tooltips and level cap removal
# ============================================================================
def apply_ui_mods():
    """Apply UI modifications including wave info panel and endless preview.

    File-replace with CRLF normalization.
    """
    path = JS_ROOT / "game" / "UI.js"
    content = read_file(path)

    # Idempotency: modded file has endless wave info panel
    if '// ENDLESS MOD: Wave Info Panel' in content:
        log_skip("UI.js: All mods")
        return True

    modded_file = MODS_DIR / "patches" / "UI.modded.js"
    if not modded_file.exists():
        log_fail("UI.js: mods - modded file not found")
        return False

    # Read modded, normalize CRLF/BOM for Mac
    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
    write_file(path, modded_content)
    log_success("UI.js: All mods (file-replace, CRLF-normalized)")
    return True

# ============================================================================
# GAME.JS - Pause Micromanagement (surgical patch on Game.js)
# ============================================================================
def apply_pause_micromanagement():
    """
    Surgically patch Game.js to enable pause micromanagement.
    
    Changes made:
    1. Remove 'if (this.stopped) return;' from animate() so render loop continues
    2. Add stopped ternary to totalScaledDelta so sim freezes but render continues
    3. Remove deploy guard so Pokemon can be deployed/moved while paused
    4. Modify switchPause() to not block canvas or show overlay (allow interaction)
    5. Keep game loop running during pause (don't clear interval)
    
    Works on both vanilla Game.js and Game.modded.js (different whitespace patterns).
    """
    path = JS_ROOT / "game" / "Game.js"
    
    if not path.exists():
        log_skip("Game.js: Pause micromanagement (file not yet installed)")
        return True
    
    content = read_file(path)
    
    # Check if already applied — look for the specific "No early return" comment
    if 'PAUSE MICROMANAGEMENT - No early return' in content:
        log_skip("Game.js: Pause micromanagement")
        return True
    
    changes = 0
    
    # 1. Remove early return from animate()
    pattern = r'(animate\s*\(time\)\s*\{)\s*\n(\s*)if\s*\(\s*this\.stopped\s*\)\s*return\s*;'
    match = re.search(pattern, content)
    if match:
        old_text = match.group(0)
        indent = match.group(2)
        new_text = f"{match.group(1)}\n{indent}// MOD: PAUSE MICROMANAGEMENT - No early return when stopped"
        content = content.replace(old_text, new_text)
        changes += 1
    
    # 2. Patch totalScaledDelta if it lacks the ternary
    old_delta = 'const totalScaledDelta = this.frameDuration * this.speedFactor;'
    new_delta = '// MOD: PAUSE MICROMANAGEMENT - freeze sim when stopped\n\t    const totalScaledDelta = this.stopped ? 0 : this.frameDuration * this.speedFactor;'
    if old_delta in content:
        content = content.replace(old_delta, new_delta)
        changes += 1
    
    # 3. Remove deploy guard (allow deploying while paused)
    # Matches both: "if (this.stopped) return playSound('pop0', 'ui');" patterns
    deploy_pattern = r"\s*if\s*\(this\.stopped\)\s*return\s+playSound\('pop0',\s*'ui'\);"
    if re.search(deploy_pattern, content):
        content = re.sub(deploy_pattern, '\n  \t\t// MOD: PAUSE MICROMANAGEMENT - deploy allowed while paused', content)
        changes += 1
    
    # 4. Inject _simSteps override and stopped redraw block (for Game.modded.js sub-stepping loop)
    old_loop_start = '\t    for (let step = 0; step < numSteps; step++) {'
    new_loop_start = """\t    // MOD: PAUSE MICROMANAGEMENT - Skip simulation entirely when stopped
\t    // Only the draw/render code below runs, so tiles highlight and clicks work
\t    const _simSteps = this.stopped ? 0 : numSteps;

\t    // When paused, still redraw background + entities so canvas doesn't smear
\t    if (this.stopped && this.ctx) {
\t        if (this.canvasBackground.complete && this.canvasBackground.naturalWidth !== 0) {
\t            this.ctx.drawImage(this.canvasBackground, 0, 0, canvasW, canvasH);
\t        } else {
\t            this.ctx.clearRect(0, 0, canvasW, canvasH);
\t        }
\t        // Redraw enemies and towers in place (no update, just draw)
\t        for (let i = 0; i < enemies.length; i++) { enemies[i]._skipDraw = false; enemies[i].draw(); }
\t        for (let t = 0; t < towers.length; t++) { towers[t]._skipDraw = false; towers[t].draw(); }
\t    }

\t    for (let step = 0; step < _simSteps; step++) {"""
    if old_loop_start in content:
        content = content.replace(old_loop_start, new_loop_start, 1)
        # Also update isLastStep to use _simSteps
        content = content.replace('step === numSteps - 1', 'step === _simSteps - 1')
        changes += 1
    
    # 5. Modify switchPause() — remove canvas blocking, overlay, and interval clearing
    # Replace the pause branch to keep loop running and allow interaction
    # Match the full switchPause for Game.modded.js pattern
    old_switch_modded = """	switchPause() {
	    playSound('option', 'ui');

	    // Clean up any active drag clone
	    const activeClone = document.querySelector('.map-drag-clone');
	    if (activeClone) activeClone.remove();

	    if (!this.stopped) {
	        // PAUSE: stop loop and block canvas
	        this.stopped = true;

	        if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();

	        // Stop the game loop interval
	        if (this.loopId) {
	            clearInterval(this.loopId);
	            this.loopId = null;
	        }

	        // Block canvas interaction
	        this.canvas.style.pointerEvents = 'none';
	        // Clear interaction state
	        this.deployingUnit = undefined;
	        this.mapDragging = false;
	        this.activeTile = null;
	        this.mouse.x = undefined;
	        this.mouse.y = undefined;

	        this.showPauseOverlay();

	        this.main.UI.pauseWave.style.background = `url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(239, 68, 68, 1) 100%, rgba(107, 114, 128, 1) 100%)`;
	    } else {
	        // RESUME: restart loop and enable canvas
	        this.stopped = false;
	        this.lastTime = performance.now();

	        if (this.loopId) clearInterval(this.loopId);
	        this.loopId = setInterval(() => this.animate(performance.now()), this.frameDuration);

	        this.hidePauseOverlay();

	        this.canvas.style.pointerEvents = 'auto';
	        this.main.UI.pauseWave.style.background = `url("./src/assets/images/textures/texture1.png"), #6B7280`;
	    }
	}"""
    
    new_switch = """	// MOD: PAUSE MICROMANAGEMENT — pause freezes sim but allows Pokemon interaction
	switchPause() {
	    playSound('option', 'ui');
	    if (!this.stopped) {
	      	this.stopped = true;
	      	this.main.UI.pauseWave.style.background = `url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(239, 68, 68, 1) 100%, rgba(107, 114, 128, 1) 100%)`;
	    } else {
	    	this.stopped = false;
	    	this.lastTime = performance.now();
	    	this.main.UI.pauseWave.style.background = `url("./src/assets/images/textures/texture1.png"), #6B7280`;
	    }
	}"""
    
    if old_switch_modded in content:
        content = content.replace(old_switch_modded, new_switch)
        changes += 1
    else:
        # Try vanilla switchPause pattern (regex for flexibility)
        vanilla_switch_pattern = r'(\tswitchPause\(\) \{.*?// Habilitar interacci.*?\n\s*this\.main\.UI\.pauseWave\.style\.background.*?;\s*\n\s*\})'
        vanilla_match = re.search(vanilla_switch_pattern, content, re.DOTALL)
        if vanilla_match:
            content = content.replace(vanilla_match.group(0), new_switch.lstrip())
            changes += 1
    
    if changes > 0:
        write_file(path, content)
        log_success(f"Game.js: Pause micromanagement ({changes} patches)")
        return True
    
    # Check if it's already good (no early return exists at all)
    if not re.search(r'animate\s*\(time\)\s*\{\s*\n\s*if\s*\(\s*this\.stopped\s*\)\s*return', content):
        log_skip("Game.js: Pause micromanagement (already applied)")
        return True
    
    log_fail("Game.js: Pause micromanagement", "patterns not found in animate()")
    return False

# ============================================================================
# GAME.JS - Install Game.modded.js (shared base for speed + pause micro)
# ============================================================================
def _ensure_game_modded():
    """Install Game.modded.js if not already present. Returns True if file is modded.

    File-replace with CRLF normalization.  The Mac vanilla has a Web Worker
    animation loop (prevents background-tab throttling) and isPassenger flags
    that the Windows modded version lacks — both are QoL/balance, not crash
    risks, so simple file-replace is appropriate.
    """
    path = JS_ROOT / "game" / "Game.js"
    content = read_file(path)

    # Check if already modded (has sub-stepping loop)
    if 'SUB-STEPPING' in content:
        return True

    modded_file = MODS_DIR / "patches" / "Game.modded.js"
    if not modded_file.exists():
        log_fail("Game.js: Game.modded.js not found")
        return False

    # Read modded, normalize CRLF/BOM for Mac
    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
    write_file(path, modded_content)
    log_success("Game.js: Enhanced game loop (file-replace, CRLF-normalized)")
    return True

# ============================================================================
# GAME.JS - Speed options 2x/3x/5x/10x (surgical patch on Game.modded.js)
# ============================================================================
def apply_speed_mod():
    """Surgically patch Game.js to add 1x/1.5x/2x/3x/5x/10x speed options."""
    path = JS_ROOT / "game" / "Game.js"
    
    # Ensure Game.modded.js is installed first
    _ensure_game_modded()
    
    content = read_file(path)
    
    # Check if already applied
    if 'speedFactor === 10' in content:
        log_skip("Game.js: Speed mod")
        return True
    
    changes = 0
    
    # IMPORTANT: Replace toggleSpeed FIRST before changing speedFactor values,
    # otherwise the pattern won't match after global replacement
    
    # 1. Replace vanilla toggleSpeed with enhanced version
    old_toggle = """	toggleSpeed() {
	    playSound('option', 'ui');
	    if (this.speedFactor === 0.8) {
	      	this.speedFactor = 1.2;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(34, 197, 94, 1) 25%, rgba(107, 114, 128, 1) 25%)';
	    } else if (this.speedFactor === 1.2) {
	      	this.speedFactor = 1.7;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(59, 130, 246, 1) 50%, rgba(107, 114, 128, 1) 50%)';
	    } else if (this.speedFactor === 1.7) {
	      	this.speedFactor = 2;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(245, 158, 11, 1) 75%, rgba(107, 114, 128, 1) 75%)';
	    } else if (this.speedFactor === 2) {
	      	this.speedFactor = 2.5;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(239, 68, 68, 1) 100%, rgba(107, 114, 128, 1) 100%)';
	    } else {
	      	this.speedFactor = 0.8;
	      	this.main.UI.speedWave.style.background = `url("./src/assets/images/textures/texture1.png"), #6B7280`;
	    }
	}"""
    
    new_toggle = """	// MOD: Enhanced speed toggle with 1x, 1.5x, 2x, 3x, 5x, 10x options
	toggleSpeed() {
	    playSound('option', 'ui');
	    if (this.speedFactor === 1) {
	      	this.speedFactor = 1.5;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(34, 197, 94, 1) 25%, rgba(107, 114, 128, 1) 25%)';
	      	this.main.UI.speedWave.innerText = '1.5x';
	    } else if (this.speedFactor === 1.5) {
	      	this.speedFactor = 2;
	      	this.main.UI.speedWave.innerText = '2x';
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(59, 130, 246, 1) 40%, rgba(107, 114, 128, 1) 40%)';
	    } else if (this.speedFactor === 2) {
	      	this.speedFactor = 3;
	      	this.main.UI.speedWave.innerText = '3x';
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(245, 158, 11, 1) 55%, rgba(107, 114, 128, 1) 55%)';
	    } else if (this.speedFactor === 3) {
	      	this.speedFactor = 5;
	      	this.main.UI.speedWave.innerText = '5x';
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(239, 68, 68, 1) 75%, rgba(107, 114, 128, 1) 75%)';
	    } else if (this.speedFactor === 5) {
	      	this.speedFactor = 10;
	      	this.main.UI.speedWave.innerText = '10x';
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(168, 85, 247, 1) 100%, rgba(107, 114, 128, 1) 100%)';
	    } else {
	      	this.speedFactor = 1;
	      	this.main.UI.speedWave.innerText = '1x';
	      	this.main.UI.speedWave.style.background = `url("./src/assets/images/textures/texture1.png"), #6B7280`;
	    }
	}"""
    
    if old_toggle in content:
        content = content.replace(old_toggle, new_toggle)
        changes += 1
    
    # 2. Fix restoreSpeed to use 1 instead of 0.8
    old_restore = "this.speedFactor = 0.8;\n    \tthis.main.UI.speedWave.style.background"
    new_restore = "this.speedFactor = 1;\n    \tthis.main.UI.speedWave.innerText = '1x';\n    \tthis.main.UI.speedWave.style.background"
    if old_restore in content:
        content = content.replace(old_restore, new_restore)
        changes += 1
    
    # 3. Change initial speedFactor from 0.8 to 1 (do this LAST to avoid breaking other patterns)
    content = content.replace('this.speedFactor = 0.8;', 'this.speedFactor = 1;')
    
    if changes > 0:
        write_file(path, content)
        log_success(f"Game.js: 10x speed options ({changes} patches)")
        return True
    
    log_fail("Game.js: Speed mod", "toggleSpeed pattern not found")
    return False

# ============================================================================
# POKEMON.JS - Level cap, cost formula, asymptotic speed (surgical injection)
# ============================================================================
def apply_pokemon_mods():
    """Surgically patch Pokemon.js with mod features.

    Preserves Mac-specific code:
      - 'subwoofer' item handling in equipItem()
      - this.main.UI.update() call at end of equipItem()
      - Any Mac-only methods or improvements to existing methods

    Adds:
      - Asymptotic stat scaling (calculateAsymptoticSpeed/Crit/Range)
      - Endless mode cost scaling (setCost/checkCost rewrite)
      - Sprite deep-copy fix (prevents shared sprite mutation)
      - tilePosition save persistence (getOriginalData/fromOriginalData)
      - Ditto dynamic transformADN (looks up slot 1 each time)
      - healUsed property (for heal item mechanic)
      - setShiny untransformed-Ditto fix
    """
    path = JS_ROOT / "game" / "component" / "Pokemon.js"
    content = read_file(path)

    # Idempotency marker — `calculateAsymptoticSpeed` is the canonical mod marker
    if 'calculateAsymptoticSpeed' in content:
        log_skip("Pokemon.js: All mods")
        return True

    changes = 0

    # ------------------------------------------------------------
    # Patch 1: Constructor — sprite deep-copy
    # Prevents shared sprite mutation across Pokemon instances of the same specie
    # ------------------------------------------------------------
    old = '\t\tthis.sprite = specie.sprite;'
    new = '\t\tthis.sprite = JSON.parse(JSON.stringify(specie.sprite));  // MOD: Deep copy to prevent shared sprite mutation'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 2: Constructor — asymptotic speed/range
    # ------------------------------------------------------------
    old = (
        '\t\tthis.speed = Math.floor(this.specie.speed.base + (this.specie.speed.scale * lvl));\n'
        '\t\tthis.power = Math.floor(this.specie.power.base + (this.specie.power.scale * lvl));\n'
        '\t\tthis.range = Math.floor(this.specie.range.base + (this.specie.range.scale * lvl));'
    )
    new = (
        '\t\t// MOD: ENDLESS MODE - Asymptotic/endless scaling for all stats\n'
        '\t\t// AOE Pokemon get slower speed decay (4x) and slower range growth (2x)\n'
        '\t\tconst isAOE = this.attackType === \'area\';\n'
        '\t\tthis.speed = this.calculateAsymptoticSpeed(this.specie.speed.base, this.specie.speed.scale, lvl, isAOE);\n'
        '\t\tthis.power = Math.floor(this.specie.power.base + (this.specie.power.scale * lvl));\n'
        '\t\tthis.range = this.calculateEndlessRange(this.specie.range.base, this.specie.range.scale, lvl, isAOE);'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 3: Constructor — asymptotic critical
    # ------------------------------------------------------------
    old = '\t\tthis.critical = this.specie.critical.base + (this.specie.critical.scale * lvl);'
    new = '\t\tthis.critical = this.calculateEndlessCrit(this.specie.critical.base, this.specie.critical.scale, lvl);  // MOD: endless crit scaling'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 4: Constructor — add healUsed property
    # ------------------------------------------------------------
    old = '\t\tthis.isDeployed = false;\n\t\tthis.inGroup = false;\n\t\t\n\t\tthis.damageDealt = 0;'
    new = '\t\tthis.isDeployed = false;\n\t\tthis.inGroup = false;\n\t\t\n\t\tthis.healUsed = false;  // MOD: Heal item usage tracking\n\t\tthis.damageDealt = 0;'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 5: Inject 3 new asymptotic methods after constructor closes
    # Anchor: the line `\t}` immediately followed by blank line and `\tgetOriginalData()`
    # ------------------------------------------------------------
    old = '\t}\n\n\tgetOriginalData() {'
    new = '''\t}

\t// === MODDED ASYMPTOTIC SCALING ===
\t// MOD: Asymptotic speed scaling - speed approaches minimum but never reaches 0
\tcalculateAsymptoticSpeed(baseSpeed, scale, level, isAOE = false) {
\t\tif (level <= 100) {
\t\t\treturn Math.floor(baseSpeed + (scale * level));
\t\t}
\t\tconst speed100 = baseSpeed + (scale * 100);
\t\tconst minSpeed = Math.max(50, Math.floor(speed100 * 0.05));
\t\tconst excessLevels = level - 100;
\t\tconst decayRate = isAOE ? 0.00125 : 0.005;
\t\tconst decayFactor = Math.exp(-decayRate * excessLevels);
\t\tconst asymptoticSpeed = minSpeed + (speed100 - minSpeed) * decayFactor;
\t\treturn Math.max(minSpeed, Math.floor(asymptoticSpeed));
\t}

\t// MOD: Endless crit scaling - asymptotic approach to 100%
\t// Every 100 levels past 100, close 50% of the remaining gap to 100%
\tcalculateEndlessCrit(base, scale, level) {
\t\tif (level <= 100) {
\t\t\treturn base + (scale * level);
\t\t}
\t\tconst critAt100 = base + (scale * 100);
\t\tconst periods = (level - 100) / 100;
\t\tconst remainingGap = (100 - critAt100) * Math.pow(0.5, periods);
\t\treturn 100 - remainingGap;
\t}

\t// MOD: Endless range scaling - logarithmic growth past level 100
\t// Freezes linear component at level 100, then applies log multiplier
\t// 1x at level 100, 3x at level 1000
\tcalculateEndlessRange(base, scale, level, isAOE = false) {
\t\tif (level <= 100) {
\t\t\treturn Math.floor(base + (scale * level));
\t\t}
\t\tconst range100 = base + (scale * 100);
\t\tconst scaleFactor = isAOE ? (1 / Math.log2(10)) : (2 / Math.log2(10));
\t\tconst rangeMultiplier = 1 + Math.log2(level / 100) * scaleFactor;
\t\treturn Math.floor(range100 * rangeMultiplier);
\t}
\t// === END MODDED ASYMPTOTIC SCALING ===

\tgetOriginalData() {'''
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 6a: getOriginalData — add tilePosition (specieKey branch)
    # ------------------------------------------------------------
    old = (
        '\t            isMega: this.isMega\n'
        '\t        };\n'
        '\t    } else {'
    )
    new = (
        '\t            isMega: this.isMega,\n'
        '\t            tilePosition: this.tilePosition  // MOD: Persist tower placement\n'
        '\t        };\n'
        '\t    } else {'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 6b: getOriginalData — add tilePosition (legacy specie branch)
    # ------------------------------------------------------------
    old = (
        '\t            isMega: this.isMega\n'
        '\t        };\n'
        '\t    }\n'
        '\t}'
    )
    new = (
        '\t            isMega: this.isMega,\n'
        '\t            tilePosition: this.tilePosition  // MOD: Persist tower placement\n'
        '\t        };\n'
        '\t    }\n'
        '\t}'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 7: fromOriginalData — restore tilePosition on rehydrated Pokemon
    # ------------------------------------------------------------
    old = (
        '\t    return new Pokemon(\n'
        '\t        specie,\n'
        '\t        data.lvl,\n'
        '\t        data.targetMode,\n'
        '\t        main,\n'
        '\t        data.adn,\n'
        '\t        data.favorite,\n'
        '\t        data.item,\n'
        '\t        data.alias,\n'
        '\t        data.isShiny,\n'
        '\t        data.hideShiny,\n'
        '\t        data.isMega\n'
        '\t    );\n'
        '\t}'
    )
    new = (
        '\t    const pokemon = new Pokemon(\n'
        '\t        specie,\n'
        '\t        data.lvl,\n'
        '\t        data.targetMode,\n'
        '\t        main,\n'
        '\t        data.adn,\n'
        '\t        data.favorite,\n'
        '\t        data.item,\n'
        '\t        data.alias,\n'
        '\t        data.isShiny,\n'
        '\t        data.hideShiny,\n'
        '\t        data.isMega\n'
        '\t    );\n'
        '\t    // MOD: Restore saved tower placement position\n'
        '\t    pokemon.tilePosition = data.tilePosition ?? -1;\n'
        '\t    return pokemon;\n'
        '\t}'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 8: setCost — replace entire body with endless cost scaling
    # ------------------------------------------------------------
    old = (
        '\tsetCost() {\n'
        '\t\tif (this.specie.costScale === \'low\') {\n'
        '\t\t\tthis.cost = Math.min(100000, Math.ceil(27 * Math.pow(1.12, this.lvl)) - 11);\n'
        '\t\t} else if (this.specie.costScale === \'mid\') {\n'
        '\t\t\tthis.cost = Math.min(100000, Math.ceil(35 * Math.pow(1.12, this.lvl)) + ((this.lvl-1) * 5));\n'
        '\t\t} else if (this.specie.costScale === \'high\') {\n'
        '\t\t\tthis.cost = Math.min(100000, Math.ceil(51 * Math.pow(1.12, this.lvl)) + (this.lvl * 3) - 1);\t\t\n'
        '\t\t} else if (this.specie.costScale === \'veryHigh\') {\n'
        '\t\t\tthis.cost = Math.min(150000, Math.ceil(51 * Math.pow(1.12, this.lvl)) + (this.lvl * 3) - 1);\t\t\n'
        '\t\t}\n'
        '\t}'
    )
    new = (
        '\t// MOD: Endless mode cost scaling - costs continue scaling past level 100\n'
        '\t// Levels 1-100: vanilla formula with vanilla caps (100k or 150k for veryHigh)\n'
        '\t// Levels 101+: cost = (previous * 1.02) + 8000, capping at 1 billion\n'
        '\tsetCost() {\n'
        '\t\tconst vanillaCap = this.specie.costScale === \'veryHigh\' ? 150000 : 100000;\n'
        '\t\tconst effectiveLevel = Math.min(this.lvl, 100);\n'
        '\t\tlet baseCost;\n'
        '\t\tif (this.specie.costScale === \'low\') {\n'
        '\t\t\tbaseCost = Math.ceil(27 * Math.pow(1.12, effectiveLevel)) - 11;\n'
        '\t\t} else if (this.specie.costScale === \'mid\') {\n'
        '\t\t\tbaseCost = Math.ceil(35 * Math.pow(1.12, effectiveLevel)) + ((effectiveLevel - 1) * 5);\n'
        '\t\t} else if (this.specie.costScale === \'high\') {\n'
        '\t\t\tbaseCost = Math.ceil(51 * Math.pow(1.12, effectiveLevel)) + (effectiveLevel * 3) - 1;\n'
        '\t\t} else if (this.specie.costScale === \'veryHigh\') {\n'
        '\t\t\tbaseCost = Math.ceil(51 * Math.pow(1.12, effectiveLevel)) + (effectiveLevel * 3) - 1;\n'
        '\t\t} else {\n'
        '\t\t\tbaseCost = vanillaCap;\n'
        '\t\t}\n'
        '\t\tbaseCost = Math.min(vanillaCap, baseCost);\n'
        '\t\tif (this.lvl >= 100) {\n'
        '\t\t\tconst excessLevels = this.lvl - 99;\n'
        '\t\t\tfor (let i = 0; i < excessLevels; i++) {\n'
        '\t\t\t\tbaseCost = Math.floor(baseCost * 1.02) + 8000;\n'
        '\t\t\t}\n'
        '\t\t}\n'
        '\t\tthis.cost = Math.min(1000000000, baseCost);\n'
        '\t}'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 9: checkCost — replace entire body with endless cost scaling
    # ------------------------------------------------------------
    old = (
        '\tcheckCost(num) {\n'
        '\t\tlet cost = 0;\n'
        '\n'
        '\t\tfor (let i = 0; i < num; i++) {\n'
        '\t\t\tif (this.specie.costScale === \'low\') {\n'
        '\t\t\t\tcost += Math.min(100000, Math.ceil(27 * Math.pow(1.12, this.lvl+i)) - 11);\n'
        '\t\t\t} else if (this.specie.costScale === \'mid\') {\n'
        '\t\t\t\tcost += Math.min(100000, Math.ceil(35 * Math.pow(1.12, this.lvl+i)) + (((this.lvl+i)-1) * 5));\n'
        '\t\t\t} else if (this.specie.costScale === \'high\') {\n'
        '\t\t\t\tcost += Math.min(100000, Math.ceil(51 * Math.pow(1.12, this.lvl+i)) + ((this.lvl+i) * 3) - 1);\t\t\n'
        '\t\t\t} else if (this.specie.costScale === \'veryHigh\') {\n'
        '\t\t\t\tcost += Math.min(150000, Math.ceil(51 * Math.pow(1.12, this.lvl+i)) + ((this.lvl+i) * 3) - 1);\t\t\n'
        '\t\t\t}\n'
        '\t\t}\n'
        '\t\t\n'
        '\t\treturn cost;\n'
        '\t}'
    )
    new = (
        '\tcheckCost(num) {\n'
        '\t\tlet totalCost = 0;\n'
        '\t\tconst vanillaCap = this.specie.costScale === \'veryHigh\' ? 150000 : 100000;\n'
        '\t\tfor (let i = 0; i < num; i++) {\n'
        '\t\t\tconst checkLevel = this.lvl + i;\n'
        '\t\t\tconst effectiveLevel = Math.min(checkLevel, 100);\n'
        '\t\t\tlet levelCost;\n'
        '\t\t\tif (this.specie.costScale === \'low\') {\n'
        '\t\t\t\tlevelCost = Math.ceil(27 * Math.pow(1.12, effectiveLevel)) - 11;\n'
        '\t\t\t} else if (this.specie.costScale === \'mid\') {\n'
        '\t\t\t\tlevelCost = Math.ceil(35 * Math.pow(1.12, effectiveLevel)) + ((effectiveLevel - 1) * 5);\n'
        '\t\t\t} else if (this.specie.costScale === \'high\') {\n'
        '\t\t\t\tlevelCost = Math.ceil(51 * Math.pow(1.12, effectiveLevel)) + (effectiveLevel * 3) - 1;\n'
        '\t\t\t} else if (this.specie.costScale === \'veryHigh\') {\n'
        '\t\t\t\tlevelCost = Math.ceil(51 * Math.pow(1.12, effectiveLevel)) + (effectiveLevel * 3) - 1;\n'
        '\t\t\t} else {\n'
        '\t\t\t\tlevelCost = vanillaCap;\n'
        '\t\t\t}\n'
        '\t\t\tlevelCost = Math.min(vanillaCap, levelCost);\n'
        '\t\t\tif (checkLevel >= 100) {\n'
        '\t\t\t\tconst excessLevels = checkLevel - 99;\n'
        '\t\t\t\tfor (let j = 0; j < excessLevels; j++) {\n'
        '\t\t\t\t\tlevelCost = Math.floor(levelCost * 1.02) + 8000;\n'
        '\t\t\t\t}\n'
        '\t\t\t}\n'
        '\t\t\ttotalCost += Math.min(1000000000, levelCost);\n'
        '\t\t}\n'
        '\t\treturn totalCost;\n'
        '\t}'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 10: updateStats — clamp lvlCap, use asymptotic methods
    # ------------------------------------------------------------
    old = (
        '\tupdateStats() {\n'
        '\t\tlet level = this.lvl;\n'
        '\t\tif (typeof this.main?.area?.inChallenge.lvlCap === \'number\') level = this.main.area.inChallenge.lvlCap;\n'
        '\n'
        '\t\tthis.speed = Math.floor(this.specie.speed.base + (this.specie.speed.scale * level));\n'
        '\t\tthis.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));\n'
        '\t\tthis.range = Math.floor(this.specie.range.base + (this.specie.range.scale * level));\n'
        '\t\tthis.critical = this.specie.critical.base + (this.specie.critical.scale * level);\n'
        '\t}'
    )
    new = (
        '\tupdateStats() {\n'
        '\t\tlet level = this.lvl;\n'
        '\t\t// MOD: Clamp at lvlCap instead of overwrite (preserve actual level for cost scaling)\n'
        '\t\tif (typeof this.main?.area?.inChallenge.lvlCap === \'number\') level = Math.min(this.lvl, this.main.area.inChallenge.lvlCap);\n'
        '\n'
        '\t\t// MOD: Use asymptotic/endless scaling for all stats\n'
        '\t\tconst isAOE = this.attackType === \'area\';\n'
        '\t\tthis.speed = this.calculateAsymptoticSpeed(this.specie.speed.base, this.specie.speed.scale, level, isAOE);\n'
        '\t\tthis.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));\n'
        '\t\tthis.range = this.calculateEndlessRange(this.specie.range.base, this.specie.range.scale, level, isAOE);\n'
        '\t\tthis.critical = this.calculateEndlessCrit(this.specie.critical.base, this.specie.critical.scale, level);\n'
        '\t}'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 11: setStatsLevel — use asymptotic methods
    # ------------------------------------------------------------
    old = (
        '\tsetStatsLevel(level = 50) { // BORRAR y cambiar por lo de arriba \n'
        '\t\tthis.speed = Math.floor(this.specie.speed.base + (this.specie.speed.scale * level));\n'
        '\t\tthis.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));\n'
        '\t\tthis.range = Math.floor(this.specie.range.base + (this.specie.range.scale * level));\n'
        '\t\tthis.critical = this.specie.critical.base + (this.specie.critical.scale * level);\n'
        '\t}'
    )
    new = (
        '\tsetStatsLevel(level = 50) {\n'
        '\t\t// MOD: Use asymptotic/endless scaling for all stats\n'
        '\t\tconst isAOE = this.attackType === \'area\';\n'
        '\t\tthis.speed = this.calculateAsymptoticSpeed(this.specie.speed.base, this.specie.speed.scale, level, isAOE);\n'
        '\t\tthis.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));\n'
        '\t\tthis.range = this.calculateEndlessRange(this.specie.range.base, this.specie.range.scale, level, isAOE);\n'
        '\t\tthis.critical = this.calculateEndlessCrit(this.specie.critical.base, this.specie.critical.scale, level);\n'
        '\t}'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 12: transformADN — dynamic slot 1 lookup + asymptotic stats
    # ------------------------------------------------------------
    old = (
        '\ttransformADN() {\n'
        '\t\tif (this.adn?.base) this.adn = pokemonData[this.adn.base]\n'
        '\t\tthis.sprite = this.adn.sprite;'
    )
    new = (
        '\ttransformADN() {\n'
        '\t\t// MOD: Always look up current slot 1 to prevent stale adn from save data\n'
        '\t\tif (this.main?.team?.pokemon) {\n'
        '\t\t\tconst firstSlot = this.main.team.pokemon[0];\n'
        '\t\t\tif (firstSlot && firstSlot !== this) {\n'
        '\t\t\t\tthis.adn = firstSlot.specie;\n'
        '\t\t\t} else if (!firstSlot || firstSlot === this) {\n'
        '\t\t\t\treturn; // Ditto is slot 1 or team empty - stay as base Ditto\n'
        '\t\t\t}\n'
        '\t\t}\n'
        '\t\tif (this.adn?.base) this.adn = pokemonData[this.adn.base]\n'
        '\t\tthis.sprite = this.adn.sprite;'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 13: transformADN — clamp lvlCap + asymptotic stats
    # ------------------------------------------------------------
    old = (
        '\t\tlet level = this.lvl;\n'
        '\t\tif (typeof this.main?.area?.inChallenge.lvlCap === \'number\') level = this.main.area.inChallenge.lvlCap;\n'
        '\n'
        '\t\tthis.speed = Math.floor(this.adn.speed.base + (this.adn.speed.scale * level));\n'
        '\t\tthis.power = Math.floor(this.adn.power.base + (this.adn.power.scale * level));\n'
        '\t\tthis.range = Math.floor(this.adn.range.base + (this.adn.range.scale * level));'
    )
    new = (
        '\t\tlet level = this.lvl;\n'
        '\t\t// MOD: Clamp at lvlCap instead of overwrite (preserve actual level for cost scaling)\n'
        '\t\tif (typeof this.main?.area?.inChallenge.lvlCap === \'number\') level = Math.min(this.lvl, this.main.area.inChallenge.lvlCap);\n'
        '\n'
        '\t\t// MOD: Use asymptotic/endless scaling for all stats\n'
        '\t\tconst isAOE = this.attackType === \'area\';\n'
        '\t\tthis.speed = this.calculateAsymptoticSpeed(this.adn.speed.base, this.adn.speed.scale, level, isAOE);\n'
        '\t\tthis.power = Math.floor(this.adn.power.base + (this.adn.power.scale * level));\n'
        '\t\tthis.range = this.calculateEndlessRange(this.adn.range.base, this.adn.range.scale, level, isAOE);'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 14: transformADN — asymptotic critical
    # ------------------------------------------------------------
    old = '\t\tthis.critical = this.adn.critical.base + (this.adn.critical.scale * level);'
    new = '\t\tthis.critical = this.calculateEndlessCrit(this.adn.critical.base, this.adn.critical.scale, level);  // MOD: endless crit scaling'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 15: setShiny — fix untransformed-Ditto guard
    # vanilla `this.adn?.id != 70` blocks shiny when adn is undefined
    # ------------------------------------------------------------
    old = '\t\tif (this.id == 70 && this.adn?.id != 70) return;'
    new = '\t\tif (this.id == 70 && this.adn && this.adn.id != 70) return;  // MOD FIX: vanilla ?.id blocks shiny on untransformed Ditto'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    if changes > 0:
        write_file(path, content)
        log_success(f"Pokemon.js: All mods ({changes} patches)")
        return True

    log_fail("Pokemon.js: All mods", "no patches matched (file may have changed)")
    return False

# ============================================================================
# POKEMONSCENE.JS - Level cap, shiny-past-100, preview methods (surgical injection)
# ============================================================================
def apply_pokemonscene_mods():
    """Surgically patch PokemonScene.js with mod features.

    Preserves Mac-specific code:
      - inkay evolution `?` mark
      - inventoryScene check in changePokemon()
      - silphScope and subwoofer in itemIcon disable list
      - aegislash form switch using specie.key (not id)
      - 'choiceScarf' nuance in available targetMode handling
      - quadraShot/tripleShot/etc. ability auto-available block
      - this.main.game.stopped check in open()
      - Refactored ItemWindow class using main.itemController
      - Mac balance changes (protein 15, wrestlingMask 0.7, weaknessPolicy 2x,
        adrenalineOrb 0.025, makeItRain goldPerDigit, tower.isPassenger checks,
        bicycle lvlCap guard, inverter mulRange disabled, etc.)
      - CORRECT Unicode in TERRAINS / TARGET_MODES_TRADUCTIONS localization

    Adds:
      - "Only shiny past 100" gating for +1/x5/x10 click handlers
      - Display level Math.min(lvl, lvlCap) during lvlCap challenges
      - lycanroc form switch button at lvl >= 100 (was == 100)
      - updateLevelButton: allow leveling during lvlCap, gate shiny past 100
      - showLevelUpEffect: use preview methods with isAOE param
      - 3 new preview methods (calculatePreviewSpeed/Crit/Range) mirroring Pokemon.js
    """
    path = JS_ROOT / "game" / "scenes" / "PokemonScene.js"
    content = read_file(path)

    # Idempotency marker — `calculatePreviewSpeed` is the canonical mod marker
    if 'calculatePreviewSpeed' in content:
        log_skip("PokemonScene.js: All mods")
        return True

    changes = 0

    # ------------------------------------------------------------
    # Patch 1: levelUp click handler — gate shiny past 100
    # ------------------------------------------------------------
    old = (
        '\t\tthis.levelUp.addEventListener(\'click\', () => {\n'
        '\t\t\tif (this.pokemon.lvl < 100 && this.main.player.gold >= this.pokemon.cost) {'
    )
    new = (
        '\t\tthis.levelUp.addEventListener(\'click\', () => {\n'
        '\t\t\t// MOD: Only shiny Pokemon can level past 100\n'
        '\t\t\tif (this.pokemon.lvl >= 100 && !this.pokemon.isShiny) return;\n'
        '\t\t\tif (this.main.player.gold >= this.pokemon.cost) {'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 2: levelUpFive click handler — gate shiny past 100
    # ------------------------------------------------------------
    old = (
        '\t\tthis.levelUpFive.addEventListener(\'click\', () => {\n'
        '\t\t\tif (this.pokemon.lvl < 96 && this.main.player.gold >= this.pokemon.checkCost(5)) {'
    )
    new = (
        '\t\tthis.levelUpFive.addEventListener(\'click\', () => {\n'
        '\t\t\t// MOD: Only shiny Pokemon can level past 100 (x5 would push past 100)\n'
        '\t\t\tif (this.pokemon.lvl + 5 > 100 && !this.pokemon.isShiny) return;\n'
        '\t\t\tif (this.main.player.gold >= this.pokemon.checkCost(5)) {'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 3: levelUpTen click handler — gate shiny past 100
    # ------------------------------------------------------------
    old = (
        '\t\tthis.levelUpTen.addEventListener(\'click\', () => {\n'
        '\t\t\tif (this.pokemon.lvl < 91 && this.main.player.gold >= this.pokemon.checkCost(10)) {'
    )
    new = (
        '\t\tthis.levelUpTen.addEventListener(\'click\', () => {\n'
        '\t\t\t// MOD: Only shiny Pokemon can level past 100 (x10 would push past 100)\n'
        '\t\t\tif (this.pokemon.lvl + 10 > 100 && !this.pokemon.isShiny) return;\n'
        '\t\t\tif (this.main.player.gold >= this.pokemon.checkCost(10)) {'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 4: update() — show actual level up to lvlCap (not always lvlCap)
    # ------------------------------------------------------------
    old = (
        '\t\telse this.name.innerHTML = (this.pokemon.alias != undefined) ? '
        '`${this.pokemon.alias.toUpperCase()} [${this.main.area.inChallenge.lvlCap}]` : '
        '`${this.pokemon.name[this.main.lang].toUpperCase()} [${this.main.area.inChallenge.lvlCap}]`;'
    )
    new = (
        '\t\telse {\n'
        '\t\t\t// MOD: Show actual level up to lvlCap (so leveling during lvlCap challenge is visible)\n'
        '\t\t\tconst displayLvl = Math.min(this.pokemon.lvl, this.main.area.inChallenge.lvlCap);\n'
        '\t\t\tthis.name.innerHTML = (this.pokemon.alias != undefined) ? '
        '`${this.pokemon.alias.toUpperCase()} [${displayLvl}]` : '
        '`${this.pokemon.name[this.main.lang].toUpperCase()} [${displayLvl}]`;\n'
        '\t\t}'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 5: buttonChangeForm visibility — lvl == 100 → lvl >= 100
    # ------------------------------------------------------------
    old = '(this.pokemon.id == 76 && this.pokemon.lvl == 100) ||'
    new = '(this.pokemon.id == 76 && this.pokemon.lvl >= 100) ||  // MOD: lycanroc form swap available past 100'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 6: updateLevelButton — remove lvlCap early-return, add inLvlCapChallenge flag,
    #                              gate shiny past 100 for x1 button
    # Handles multiple states depending on execution order:
    #   A) Full vanilla: lvlCap block + === 100
    #   B) After endless safety: lvlCap block + >= 100
    #   C) After challenge fix: comment (no block) + === 100
    #   D) After challenge fix + endless safety: comment (no block) + >= 100
    # ------------------------------------------------------------
    new_p6 = (
        '\t\t// MOD: During challenge lvlCap, allow leveling freely (stats capped by updateStats)\n'
        '\t\tconst inLvlCapChallenge = typeof this.main?.area?.inChallenge?.lvlCap === \'number\';\n'
        '\n'
        '\t\t// MOD: Only shiny Pokemon can level past 100 (x1 would go to 101+)\n'
        '\t\tif (this.pokemon.lvl >= 100 && !this.pokemon.isShiny && !inLvlCapChallenge) {'
    )
    _lvlcap_block = (
        '\t\tif (typeof this.main.area.inChallenge.lvlCap == \'number\') {\n'
        '\t\t\tthis.levelUp.innerHTML = `-`;\n'
        '\t\t\tthis.levelUp.style.filter = \'brightness(0.8)\';\n'
        '\t\t\tthis.levelUp.style.pointerEvents = \'none\';\n'
        '\t\t\tthis.levelUp.style.lineHeight = \'28px\';\n'
        '\n'
        '\t\t\tthis.levelUpFive.innerHTML = `-`;\n'
        '\t\t\tthis.levelUpFive.style.filter = \'brightness(0.8)\';\n'
        '\t\t\tthis.levelUpFive.style.pointerEvents = \'none\';\n'
        '\t\t\tthis.levelUpFive.style.lineHeight = \'28px\';\n'
        '\n'
        '\t\t\tthis.levelUpTen.innerHTML = `-`;\n'
        '\t\t\tthis.levelUpTen.style.filter = \'brightness(0.8)\';\n'
        '\t\t\tthis.levelUpTen.style.pointerEvents = \'none\';\n'
        '\t\t\tthis.levelUpTen.style.lineHeight = \'28px\';\n'
        '\t\t\treturn;\n'
        '\t\t}\n'
        '\n'
    )
    _challenge_comment = '\t\t// MOD: Level-up allowed during challenge (stats capped by updateStats)\n\n'
    p6_applied = False
    # State A/B: lvlCap block still present (try both === and >=)
    for cmp in ('===', '>='):
        old_p6 = _lvlcap_block + f'\t\tif (this.pokemon.lvl {cmp} 100) {{'
        if old_p6 in content:
            content = content.replace(old_p6, new_p6, 1)
            changes += 1
            p6_applied = True
            break
    # State C/D: lvlCap block already removed by challenge fix (comment + level check)
    if not p6_applied:
        for cmp in ('===', '>='):
            old_p6 = _challenge_comment + f'\t\tif (this.pokemon.lvl {cmp} 100) {{'
            if old_p6 in content:
                content = content.replace(old_p6, new_p6, 1)
                changes += 1
                p6_applied = True
                break

    # ------------------------------------------------------------
    # Patch 7: updateLevelButton — x5 condition (gate shiny past 100)
    # ------------------------------------------------------------
    old = '\t\tif (this.pokemon.lvl > 95) {'
    new = (
        '\t\t// MOD: Only shiny Pokemon can level past 100 (x5 would push past 100)\n'
        '\t\tif (this.pokemon.lvl + 5 > 100 && !this.pokemon.isShiny && !inLvlCapChallenge) {'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 8: updateLevelButton — x10 condition (gate shiny past 100)
    # ------------------------------------------------------------
    old = '\t\tif (this.pokemon.lvl > 90) {'
    new = (
        '\t\t// MOD: Only shiny Pokemon can level past 100 (x10 would push past 100)\n'
        '\t\tif (this.pokemon.lvl + 10 > 100 && !this.pokemon.isShiny && !inLvlCapChallenge) {'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 9: showLevelUpEffect — introduce newLevel + isAOE, use preview for newPower
    # ------------------------------------------------------------
    old = '\t\tconst newPower = Math.floor(specie.power.base + (specie.power.scale * (this.pokemon.lvl + levels)));'
    new = (
        '\t\t// MOD: Use preview methods to mirror endless scaling for stat preview\n'
        '\t\tconst newLevel = this.pokemon.lvl + levels;\n'
        '\t\tconst isAOE = this.pokemon.attackType === \'area\';\n'
        '\t\tconst newPower = Math.floor(specie.power.base + (specie.power.scale * newLevel));'
    )
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 10: showLevelUpEffect — newSpeed uses calculatePreviewSpeed
    # ------------------------------------------------------------
    old = '\t\tconst newSpeed = Math.floor(specie.speed.base + (specie.speed.scale * (this.pokemon.lvl + levels)));'
    new = '\t\tconst newSpeed = this.calculatePreviewSpeed(specie.speed.base, specie.speed.scale, newLevel, isAOE);'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 11: showLevelUpEffect — newCritical uses calculatePreviewCrit
    # ------------------------------------------------------------
    old = '\t\tconst newCritical = specie.critical.base + (specie.critical.scale * (this.pokemon.lvl + levels));'
    new = '\t\tconst newCritical = this.calculatePreviewCrit(specie.critical.base, specie.critical.scale, newLevel);'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 12: showLevelUpEffect — newRange uses calculatePreviewRange
    # ------------------------------------------------------------
    old = '\t\tconst newRange = Math.floor(specie.range.base + (specie.range.scale * (this.pokemon.lvl + levels)));'
    new = '\t\tconst newRange = this.calculatePreviewRange(specie.range.base, specie.range.scale, newLevel, isAOE);'
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    # ------------------------------------------------------------
    # Patch 13: Inject 3 new preview methods between showLevelUpEffect and updateStatsChanges
    # Anchor: `\t}\n\n\tupdateStatsChanges() { ` (note trailing space before newline)
    # ------------------------------------------------------------
    old = '\t}\n\n\tupdateStatsChanges() { '
    new = '''\t}

\t// === MODDED PREVIEW METHODS ===
\t// Mirror of Pokemon.calculateAsymptoticSpeed — MUST match exactly
\tcalculatePreviewSpeed(base, scale, level, isAOE = false) {
\t\tif (level <= 100) {
\t\t\treturn Math.floor(base + (scale * level));
\t\t}
\t\tconst speed100 = base + (scale * 100);
\t\tconst minSpeed = Math.max(50, Math.floor(speed100 * 0.05));
\t\tconst excessLevels = level - 100;
\t\tconst decayRate = isAOE ? 0.00125 : 0.005;
\t\tconst decayFactor = Math.exp(-decayRate * excessLevels);
\t\tconst asymptoticSpeed = minSpeed + (speed100 - minSpeed) * decayFactor;
\t\treturn Math.max(minSpeed, Math.floor(asymptoticSpeed));
\t}

\t// Mirror of Pokemon.calculateEndlessRange — MUST match exactly
\tcalculatePreviewRange(base, scale, level, isAOE = false) {
\t\tif (level <= 100) {
\t\t\treturn Math.floor(base + (scale * level));
\t\t}
\t\tconst range100 = base + (scale * 100);
\t\tconst scaleFactor = isAOE ? (1 / Math.log2(10)) : (2 / Math.log2(10));
\t\tconst rangeMultiplier = 1 + Math.log2(level / 100) * scaleFactor;
\t\treturn Math.floor(range100 * rangeMultiplier);
\t}

\t// Mirror of Pokemon.calculateEndlessCrit — MUST match exactly
\tcalculatePreviewCrit(base, scale, level) {
\t\tif (level <= 100) {
\t\t\treturn base + (scale * level);
\t\t}
\t\tconst periods = (level - 100) / 100;
\t\tconst critAt100 = base + (scale * 100);
\t\tconst remainingGap = (100 - critAt100) * Math.pow(0.5, periods);
\t\treturn 100 - remainingGap;
\t}
\t// === END MODDED PREVIEW METHODS ===

\tupdateStatsChanges() { '''
    if old in content:
        content = content.replace(old, new, 1)
        changes += 1

    if changes > 0:
        write_file(path, content)
        log_success(f"PokemonScene.js: All mods ({changes} patches)")
        return True

    log_fail("PokemonScene.js: All mods", "no patches matched (file may have changed)")
    return False


def apply_recharge_precision():
    """Show 3 decimal places for recharge time when it drops below 0.1s.
    
    Patches PokemonScene.js in 3 locations:
    1. Base stat display (update method)
    2. Level-up hover preview (+1/x5/x10 buttons)
    3. Item/ability gains preview
    """
    path = JS_ROOT / "game" / "scenes" / "PokemonScene.js"
    content = read_file(path)
    
    if 'speedDecimals' in content:
        log_skip("PokemonScene.js: Recharge precision (already applied)")
        return True
    
    patched = 0
    
    # 1. Base stat display: this.data['speed'].value.innerHTML = `${(this.pokemon.speed / 1000).toFixed(2)}s`;
    old1 = "this.data['speed'].value.innerHTML = `${(this.pokemon.speed / 1000).toFixed(2)}s`;"
    new1 = ("const _spd = this.pokemon.speed / 1000; const speedDecimals = _spd < 0.1 ? 3 : 2;\n"
            "\t\tthis.data['speed'].value.innerHTML = `${_spd.toFixed(speedDecimals)}s`;")
    if old1 in content:
        content = content.replace(old1, new1, 1)
        patched += 1
    
    # 2. Level-up hover preview: speedDiff and display lines
    old2 = "const speedDiff = Math.abs((newSpeed / 1000).toFixed(2) - (this.pokemon.speed / 1000).toFixed(2)).toFixed(2);"
    new2 = ("const _curSpd = this.pokemon.speed / 1000; const _newSpd = newSpeed / 1000;\n"
            "\t\tconst _spdDec = _curSpd < 0.1 ? 3 : 2;\n"
            "\t\tconst speedDiff = Math.abs(_newSpd.toFixed(_spdDec) - _curSpd.toFixed(_spdDec)).toFixed(_spdDec);")
    if old2 in content:
        content = content.replace(old2, new2, 1)
        patched += 1
    
    old2b = "this.data['speed'].value.innerHTML = `${(this.pokemon.speed / 1000).toFixed(2)}s <span style=\"color:var(--green)\">(-${(speedDiff)}s)</span>`;"
    new2b = "this.data['speed'].value.innerHTML = `${_curSpd.toFixed(_spdDec)}s <span style=\"color:var(--green)\">(-${(speedDiff)}s)</span>`;"
    if old2b in content:
        content = content.replace(old2b, new2b, 1)
        patched += 1
    
    # 3. Item/ability gains: const speedSec = (Math.abs(speedGains) / 1000).toFixed(2);
    old3 = "const speedSec = (Math.abs(speedGains) / 1000).toFixed(2);"
    new3 = ("const _spdDec3 = (this.pokemon.speed / 1000) < 0.1 ? 3 : 2;\n"
            "\t        const speedSec = (Math.abs(speedGains) / 1000).toFixed(_spdDec3);")
    if old3 in content:
        content = content.replace(old3, new3, 1)
        patched += 1
    
    if patched > 0:
        write_file(path, content)
        log_success(f"PokemonScene.js: Recharge precision ({patched} patches)")
        return True
    
    log_fail("PokemonScene.js: Recharge precision - no matching patterns")
    return False


# ============================================================================
# AREA.JS - Endless wave spawning and power budget
# ============================================================================
def apply_endless_waves():
    """Apply endless mode wave spawning with power budget system.

    Hybrid strategy: file-replace with `mod/patches/Area.modded.js` (preserves
    all 9 new methods, BOSS_KEYS, deferred spawning, redeploy logic, etc.) then
    surgically inject the Mac-only `this.healUsed = {}` area-level resets that
    the Windows-authored modded file lacks.

    Mac vanilla Area.js tracks per-area heal usage via `this.healUsed = {}` in 4
    locations (constructor, loadArea, newWave, changeWave). The modded file only
    has the per-tower `t.healUsed = false` resets. We inject the area-level dict
    after each `this.heartScale = false;` so per-area heal-blocking abilities
    (e.g. Heart Scale, certain berries) keep working under Endless Mode.

    Also normalizes CRLF→LF since the modded patch source is Windows-authored
    but the Mac vanilla codebase uses LF throughout.
    """
    path = JS_ROOT / "game" / "core" / "Area.js"
    content = read_file(path)

    # Idempotency: `endlessMode` is the canonical mod marker
    if 'endlessMode' in content:
        log_skip("Area.js: Endless waves")
        return True

    modded_file = MODS_DIR / "patches" / "Area.modded.js"
    if not modded_file.exists():
        log_fail("Area.js: Endless waves", "modded file not found")
        return False

    # Read modded source, strip BOM, normalize CRLF→LF for Mac
    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')

    # Inject Mac-only `this.healUsed = {}` area-level resets in 4 locations.
    # Each anchor uses the following line for uniqueness.
    healused_patches = [
        # Patch 1 — constructor (followed by `inChallenge`)
        (
            '\t\tthis.heartScale = false;\n\t\tthis.inChallenge = false;',
            '\t\tthis.heartScale = false;\n\t\tthis.healUsed = {};\n\t\tthis.inChallenge = false;',
            'constructor',
        ),
        # Patch 2 — loadArea (followed by `refreshDamageDealt(true)`)
        (
            '\t\tthis.heartScale = false;\n\t\tthis.main.UI.refreshDamageDealt(true);',
            '\t\tthis.heartScale = false;\n\t\tthis.healUsed = {};\n\t\tthis.main.UI.refreshDamageDealt(true);',
            'loadArea',
        ),
        # Patch 3 — newWave (followed by `refreshDamageDealt()`, no arg)
        (
            '\t\tthis.heartScale = false;\n\t\tthis.main.UI.refreshDamageDealt();',
            '\t\tthis.heartScale = false;\n\t\tthis.healUsed = {};\n\t\tthis.main.UI.refreshDamageDealt();',
            'newWave',
        ),
        # Patch 4 — changeWave (blank line then `update()`)
        (
            '\t\tthis.heartScale = false;\n\n\t\tthis.main.UI.update();',
            '\t\tthis.heartScale = false;\n\t\tthis.healUsed = {};\n\n\t\tthis.main.UI.update();',
            'changeWave',
        ),
    ]

    for old, new, label in healused_patches:
        count = modded_content.count(old)
        if count == 0:
            log_fail("Area.js: Endless waves", f"healUsed anchor not found in {label}")
            return False
        if count != 1:
            log_fail("Area.js: Endless waves", f"healUsed anchor ambiguous in {label} (count={count})")
            return False
        modded_content = modded_content.replace(old, new, 1)

    write_file(path, modded_content)
    log_success("Area.js: Endless waves (file replace + 4 healUsed injections)")
    return True


def apply_endless_stat_safety():
    """Clamp vanilla stat formulas for levels past 100 when Infinite Levels isn't installed.
    
    Without Infinite Levels, vanilla Pokemon.js uses linear formulas that break at high levels:
    - Speed goes negative (e.g. -0.40s recharge at level 1000)
    - Costs use Math.pow(1.12, level) which explodes past 100
    
    This patches updateStats() and setStatsLevel() to clamp the effective level at 100
    for stat calculation, and clamps cost calculation level at 100.
    The Pokemon's actual level is preserved — only the formulas are capped.
    """
    path = JS_ROOT / "game" / "component" / "Pokemon.js"
    content = read_file(path)
    
    # Don't patch if Pokemon.modded.js is installed (has asymptotic scaling)
    if 'calculateAsymptoticSpeed' in content:
        log_skip("Pokemon.js: Endless stat safety (infinite levels installed)")
        return True
    
    if '// MOD: Clamp stat level at 100' in content:
        log_skip("Pokemon.js: Endless stat safety")
        return True
    
    # Patch updateStats: clamp level for formulas at 100
    # After our lvlCap fix, the line reads: level = Math.min(this.lvl, ...)
    # We need to also clamp at 100 for vanilla formulas
    old_update = """this.speed = Math.floor(this.specie.speed.base + (this.specie.speed.scale * level));
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));
		this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * level));
		this.critical = this.specie.critical.base + (this.specie.critical.scale * level);
	}

	setStatsLevel(level = 50) { // BORRAR y cambiar por lo de arriba 
		this.speed = Math.floor(this.specie.speed.base + (this.specie.speed.scale * level));
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));
		this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * level));
		this.critical = this.specie.critical.base + (this.specie.critical.scale * level);"""
    
    new_update = """// MOD: Clamp stat level at 100 for vanilla formulas (endless safety)
		const statLevel = Math.min(level, 100);
		this.speed = Math.max(200, Math.floor(this.specie.speed.base + (this.specie.speed.scale * statLevel)));
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * statLevel));
		this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * statLevel));
		this.critical = this.specie.critical.base + (this.specie.critical.scale * statLevel);
	}

	setStatsLevel(level = 50) { // BORRAR y cambiar por lo de arriba 
		// MOD: Clamp stat level at 100 for vanilla formulas (endless safety)
		const statLevel = Math.min(level, 100);
		this.speed = Math.max(200, Math.floor(this.specie.speed.base + (this.specie.speed.scale * statLevel)));
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * statLevel));
		this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * statLevel));
		this.critical = this.specie.critical.base + (this.specie.critical.scale * statLevel);"""
    
    if old_update in content:
        content = content.replace(old_update, new_update)
    else:
        log_fail("Pokemon.js: Endless stat safety", "updateStats/setStatsLevel pattern not found")
        return False
    
    # Patch cost: clamp level at 100 in checkCost loop
    old_cost = "Math.ceil(27 * Math.pow(1.12, this.lvl+i))"
    new_cost = "Math.ceil(27 * Math.pow(1.12, Math.min(this.lvl+i, 100)))"
    content = content.replace(old_cost, new_cost)
    
    old_cost2 = "Math.ceil(35 * Math.pow(1.12, this.lvl+i))"
    new_cost2 = "Math.ceil(35 * Math.pow(1.12, Math.min(this.lvl+i, 100)))"
    content = content.replace(old_cost2, new_cost2)
    
    old_cost3 = "Math.ceil(51 * Math.pow(1.12, this.lvl+i))"
    new_cost3 = "Math.ceil(51 * Math.pow(1.12, Math.min(this.lvl+i, 100)))"
    content = content.replace(old_cost3, new_cost3)
    
    # Patch transformADN (Ditto) — same linear formulas
    old_adn = """this.speed = Math.floor(this.adn.speed.base + (this.adn.speed.scale * level));
		this.power = Math.floor(this.adn.power.base + (this.adn.power.scale * level));
		this.range = Math.floor(this.adn.range.base + (this.adn.range.scale * level));

		//HABILIDADES
		this.ricochet = this.adn.ricochet ?? 0;
		
		this.innerRange = this.adn.range.inner;
		this.critical = this.adn.critical.base + (this.adn.critical.scale * level);"""
    
    new_adn = """// MOD: Clamp stat level at 100 for vanilla formulas (endless safety)
		const adnStatLevel = Math.min(level, 100);
		this.speed = Math.max(200, Math.floor(this.adn.speed.base + (this.adn.speed.scale * adnStatLevel)));
		this.power = Math.floor(this.adn.power.base + (this.adn.power.scale * adnStatLevel));
		this.range = Math.floor(this.adn.range.base + (this.adn.range.scale * adnStatLevel));

		//HABILIDADES
		this.ricochet = this.adn.ricochet ?? 0;
		
		this.innerRange = this.adn.range.inner;
		this.critical = this.adn.critical.base + (this.adn.critical.scale * adnStatLevel);"""
    
    if old_adn in content:
        content = content.replace(old_adn, new_adn)
        write_file(path, content)
    
    write_file(path, content)
    log_success("Pokemon.js: Endless stat safety (stats capped at level 100, min speed 200ms)")
    return True


def apply_endless_levelbutton_safety():
    """Fix level-up buttons for levels past 100 when Infinite Levels isn't installed.
    
    Vanilla PokemonScene.js checks === 100 / > 95 / > 90 for MAX display.
    With Endless saves past 100, these don't match and buttons appear clickable.
    Patch to >= 100 so all three buttons show MAX for any level >= 100.
    Skipped when PokemonScene.modded.js is installed (has its own level handling).
    """
    path = JS_ROOT / "game" / "scenes" / "PokemonScene.js"
    content = read_file(path)
    
    # Don't patch if modded file is installed
    if 'calculateAsymptoticSpeed' in content or 'isShiny' in content and 'inLvlCapChallenge' in content:
        log_skip("PokemonScene.js: Endless level button safety (modded file installed)")
        return True
    
    if '// MOD: Level-up allowed during challenge' in content:
        # Our vanilla bugfix patch is present — the lvlCap block is already removed
        # Now fix the level 100 checks to >= 100
        pass
    
    patched = False
    
    # x1 button: === 100 -> >= 100
    old_x1 = "if (this.pokemon.lvl === 100) {"
    new_x1 = "if (this.pokemon.lvl >= 100) {"
    if old_x1 in content:
        content = content.replace(old_x1, new_x1)
        patched = True
    
    # x5 button: > 95 -> >= 96 (same meaning) — actually this already catches 96+
    # But level 1000 > 95 is true, so x5 already shows MAX. Same for x10 (> 90).
    # Only x1 (=== 100) is broken for levels past 100.
    
    if patched:
        write_file(path, content)
        log_success("PokemonScene.js: Endless level button safety (MAX at >= 100)")
        return True
    elif '>= 100) {' in content:
        log_skip("PokemonScene.js: Endless level button safety")
        return True
    else:
        log_fail("PokemonScene.js: Endless level button safety", "level 100 check not found")
        return False


def apply_wave_manager_fix():
    """Fix wave manager visibility for endless mode records > 100.
    
    Vanilla UI.js checks records === 100 (exact match), which fails when
    endless mode pushes records past 100. Patch to >= 100.
    Only needed when UI.modded.js is NOT installed (QoL not selected).
    """
    path = JS_ROOT / "game" / "UI.js"
    content = read_file(path)
    
    old_check = ".records[this.main.area.map.id] === 100 && this.main.player.hasBike)"
    new_check = ".records[this.main.area.map.id] >= 100 && this.main.player.hasBike)"
    
    if '>= 100 && this.main.player.hasBike)' in content:
        log_skip("UI.js: Wave manager >= 100 fix")
        return True
    elif old_check in content:
        content = content.replace(old_check, new_check)
        write_file(path, content)
        log_success("UI.js: Wave manager >= 100 fix (records past 100)")
        return True
    else:
        # UI.modded.js already has >= 100, or pattern changed
        log_skip("UI.js: Wave manager >= 100 fix (not needed)")
        return True


# ============================================================================
# DEFEATSCENE.JS - Checkpoints every 50 waves in endless
# ============================================================================
def apply_endless_checkpoints():
    """Apply endless mode checkpoints every 50 waves.

    Hybrid: file-replace with modded, then restore the getRetryText() text
    array with Mac vanilla's correct Unicode, and fix corrupted em dash in
    challenge display.  The modded getRetryText() has additional endless
    logic above the text array that we preserve.
    """
    path = JS_ROOT / "game" / "scenes" / "DefeatScene.js"
    content = read_file(path)

    if 'MOD: Endless checkpoints' in content or 'autoReset == 3' in content:
        log_skip("DefeatScene.js: Endless checkpoints")
        return True

    modded_file = MODS_DIR / "patches" / "DefeatScene.modded.js"
    if not modded_file.exists():
        log_fail("DefeatScene.js: Endless checkpoints", "modded file not found")
        return False

    # Extract vanilla text array from getRetryText() (correct Unicode)
    try:
        v_func = content.index('getRetryText')
        v_arr_start = content.index('const text = [', v_func)
        v_arr_end = content.index('\t\t]', v_arr_start) + 3
        vanilla_text_array = content[v_arr_start:v_arr_end]
    except ValueError:
        log_fail("DefeatScene.js: Endless checkpoints", "vanilla text array not found")
        return False

    # Read modded, normalize CRLF/BOM
    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')

    # Replace corrupted text array with vanilla's correct Unicode
    try:
        m_func = modded_content.index('getRetryText')
        m_arr_start = modded_content.index('const text = [', m_func)
        m_arr_end = modded_content.index('\t\t]', m_arr_start) + 3
        modded_content = modded_content[:m_arr_start] + vanilla_text_array + modded_content[m_arr_end:]
    except ValueError:
        log_fail("DefeatScene.js: Endless checkpoints", "modded text array not found")
        return False

    # Fix corrupted em dash in challenge display (CP437 ΓÇö → Unicode —)
    modded_content = modded_content.replace('\u0393\u00c7\u00f6', '\u2014')

    write_file(path, modded_content)
    log_success("DefeatScene.js: Endless checkpoints (file replace + Unicode fix)")
    return True

# ============================================================================
# ENEMY.JS - Endless HP/armor scaling
# ============================================================================
def apply_enemy_scaling():
    """Apply endless mode enemy HP/armor scaling.

    Hybrid: file-replace with modded, then inject Mac-only features:
      1. lightningRodSearch() call in applyStatusEffect (on stun)
      2. lightningRodSearch() method definition (before class closing brace)
      3. amuletCoin gold generation on curse damage spread
    """
    path = JS_ROOT / "game" / "component" / "Enemy.js"
    content = read_file(path)

    if 'ENDLESS MODE' in content and 'wave > 100' in content:
        log_skip("Enemy.js: Endless scaling")
        return True

    modded_file = MODS_DIR / "patches" / "Enemy.modded.js"
    if not modded_file.exists():
        log_fail("Enemy.js: Endless scaling", "modded file not found")
        return False

    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')

    # Patch 1: Add lightningRodSearch() call in applyStatusEffect on stun
    # Mixed indent: \t + 8 spaces for the if, \t + 8 spaces + \t for body
    old_stun = (
        "if (effect.type === 'stun') {\n"
        "\t        \tthis.main.player.stats.appliedStuns++;"
    )
    new_stun = (
        "if (effect.type === 'stun') {\n"
        "\t        \tthis.lightningRodSearch();\n"
        "\t        \tthis.main.player.stats.appliedStuns++;"
    )
    if modded_content.count(old_stun) != 1:
        log_fail("Enemy.js: Endless scaling", f"stun anchor not unique (count={modded_content.count(old_stun)})")
        return False
    modded_content = modded_content.replace(old_stun, new_stun, 1)

    # Patch 2: Add lightningRodSearch() method before class closing brace
    old_end = "\t}\n}"
    new_end = (
        "\t}\n"
        "\n"
        "\tlightningRodSearch() {\n"
        "\t    const towers = this.main.area.towers;\n"
        "\t    for (const tower of towers) {\n"
        "\t        if (tower?.ability?.id !== 'lightningRod') continue;\n"
        "\n"
        "\t        const radius = tower.range;\n"
        "\t        const dx = tower.center.x - this.center.x;\n"
        "\t        const dy = tower.center.y - this.center.y;\n"
        "\t        const distance = Math.hypot(dx, dy);\n"
        "\n"
        "\t        if (distance <= radius && tower.lightningRodChargeCD === 0 && tower.lightningRodCharge < 10) {\n"
        "\t        \ttower.lightningRodCharge++;\n"
        "\t\t\t\ttower.lightningRodChargeCD = 1000;\n"
        "\t            break;\n"
        "\t        }\n"
        "\t    }\n"
        "\t}\n"
        "}"
    )
    # The class ends with drawStatusEffects() closing brace then class brace
    if modded_content.count(old_end) < 1:
        log_fail("Enemy.js: Endless scaling", "class closing brace not found")
        return False
    # Replace the LAST occurrence (class end)
    idx = modded_content.rindex(old_end)
    modded_content = modded_content[:idx] + new_end + modded_content[idx + len(old_end):]

    # Patch 3: Add amuletCoin gold on curse damage spread
    # Modded uses \t prefix + spaces for indentation
    old_curse = (
        "e.getDamaged(cursedDamageSpread, source, ability, false, alreadyCursed, pokemon);\n"
        "\t            }\n"
        "\t            if (ability?.id === 'willOWisp'"
    )
    new_curse = (
        "e.getDamaged(cursedDamageSpread, source, ability, false, alreadyCursed, pokemon);\n"
        "\t                if (pokemon?.item?.id === 'amuletCoin') {\n"
        "\t\t                let cursedGold = Math.ceil(cursedDamageSpread * 0.001 * this.main.player.stars);\n"
        "\t\t                this.main.area.goldWave += cursedGold;\n"
        "\t\t                this.main.player.changeGold(cursedGold);\n"
        "\t                }\n"
        "\t            }\n"
        "\t            if (ability?.id === 'willOWisp'"
    )
    if modded_content.count(old_curse) != 1:
        log_fail("Enemy.js: Endless scaling", "curse spread anchor not unique")
        return False
    modded_content = modded_content.replace(old_curse, new_curse, 1)

    write_file(path, modded_content)
    log_success("Enemy.js: Endless scaling (file replace + 3 Mac-only injections)")
    return True

# ============================================================================
# TOWER.JS - Delta time accuracy for high-speed attacks
# ============================================================================
def apply_tower_deltatime():
    """Apply delta time accuracy fix for high-speed attacks.

    Hybrid: file-replace with modded, then inject Mac-only lightningRodCharge
    system (init + cooldown tick).  The Mac vanilla also has an isPassenger
    system (15 refs), but since the mod doesn't use passengers, we only inject
    the lightningRodCharge fields that Enemy.lightningRodSearch() needs.
    """
    path = JS_ROOT / "game" / "component" / "Tower.js"
    content = read_file(path)

    if '_skipDraw' in content or 'DELTA TIME FIX' in content:
        log_skip("Tower.js: Delta time fix")
        return True

    modded_file = MODS_DIR / "patches" / "Tower.modded.js"
    if not modded_file.exists():
        log_fail("Tower.js: Delta time fix", "modded file not found")
        return False

    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')

    # Patch 1: Init lightningRodCharge/CD after moxieBuff in constructor
    old_init = "this.moxieBuff = 0;\n        this.cherrimForm = false;"
    new_init = (
        "this.moxieBuff = 0;\n"
        "        this.lightningRodCharge = 0;\n"
        "        this.lightningRodChargeCD = 0;\n"
        "        this.cherrimForm = false;"
    )
    if modded_content.count(old_init) != 1:
        log_fail("Tower.js: Delta time fix", f"moxieBuff init anchor not unique (count={modded_content.count(old_init)})")
        return False
    modded_content = modded_content.replace(old_init, new_init, 1)

    # Patch 2: Add lightningRodChargeCD tick after recalculatePower() in update()
    old_update = "if (this._isFirstStep) this.recalculatePower();"
    new_update = (
        "if (this._isFirstStep) this.recalculatePower();\n\n"
        "        if (this.lightningRodChargeCD > 0) {\n"
        "            this.lightningRodChargeCD = Math.max(0, this.lightningRodChargeCD - simDelta);\n"
        "        }"
    )
    if modded_content.count(old_update) != 1:
        log_fail("Tower.js: Delta time fix", f"recalculatePower anchor not unique (count={modded_content.count(old_update)})")
        return False
    modded_content = modded_content.replace(old_update, new_update, 1)

    write_file(path, modded_content)
    log_success("Tower.js: Delta time fix (file replace + lightningRod init/tick)")
    return True

# ============================================================================
# PROJECTILE.JS - Endless damage calculations
# ============================================================================
def apply_projectile_scaling():
    """Apply endless mode damage calculations.

    File-replace with CRLF normalization.  The Windows modded file already
    includes speed-scaling, retarget fix, and off-screen cleanup, so the
    subsequent surgical patches (apply_projectile_speed_scaling,
    apply_projectile_retarget_fix, apply_offscreen_target_fix) will correctly
    skip via their own idempotency checks.
    """
    path = JS_ROOT / "game" / "component" / "Projectile.js"
    content = read_file(path)

    # Idempotency: modded file contains ricochet MOD comment
    if '// MOD: Ricochet finds nearest enemy' in content:
        log_skip("Projectile.js: Endless scaling")
        return True

    modded_file = MODS_DIR / "patches" / "Projectile.modded.js"
    if not modded_file.exists():
        log_fail("Projectile.js: modded file not found")
        return False

    # Read modded, normalize CRLF/BOM for Mac
    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
    write_file(path, modded_content)
    log_success("Projectile.js: Endless scaling (file-replace, CRLF-normalized)")
    return True

# ============================================================================
# PROJECTILE.JS - Projectile speed scales with attack rate (surgical)
# ============================================================================
def apply_projectile_speed_scaling():
    """Scale projectile speed with tower attack speed so fast enemies can't outrun bullets."""
    path = JS_ROOT / "game" / "component" / "Projectile.js"
    content = read_file(path)

    if "projectile speed with attack rate" in content:
        log_skip("Projectile.js: Projectile speed scaling")
        return True

    old = """        const rawSpeed = projectile.speed ?? 5;
        this.speed = rawSpeed <= 30 ? rawSpeed * 60 : rawSpeed; 
"""

    new = """        const rawSpeed = projectile.speed ?? 5;
        let baseSpeed = rawSpeed <= 30 ? rawSpeed * 60 : rawSpeed;

        // MOD: Scale projectile speed with attack rate — faster attacks = faster projectiles
        // Smooth linear ramp: 1x at 500ms, 2x at 50ms (no overshooting)
        if (tower?.speed && tower.speed < 500) {
            const t = (500 - tower.speed) / 450; // 0..1 from 500ms→50ms
            baseSpeed *= (1 + 1 * t); // 1x → 2x
        }
        this.speed = baseSpeed;
"""

    if old not in content:
        log_fail("Projectile.js: Projectile speed scaling", "pattern not found")
        return False

    content = content.replace(old, new)
    write_file(path, content)
    log_success("Projectile.js: Projectile speed scaling (attack rate)")
    return True

# ============================================================================
# MAIN.JS - Enable DevTools with F12
# ============================================================================
def apply_devtools():
    """Enable F12 and Ctrl+Shift+I to open DevTools.

    The Mac vanilla main.js contains Mac-specific crash mitigations the
    Windows-style patches/main.modded.js does NOT contain:
      - app.disableHardwareAcceleration() and GPU disable switches
        ("Mitigaciones para crashes nativos de Chromium en Macs Intel")
      - session.setPermissionRequestHandler / setPermissionCheckHandler
        inside app.whenReady().then(...)
      - icon.icns (vs. Windows' icon.ico) and the .app's preload.js path
      - requestSingleInstanceLock + whenReady ordering
    The Windows main.modded.js also `require`s electron-updater, which is
    NOT a dependency of the Mac game build.

    Wholesale-copying main.modded.js over the Mac vanilla would erase
    those mitigations and leave Intel Mac users with a broken game.

    Behavior:
      - macOS: inject the F12 / Ctrl+Shift+I handler into the Mac
        vanilla main.js, marker-bracketed for idempotency. Anchor is
        the existing `win.setContentSize(...)` call inside createWindow,
        which is where the Windows mod also puts the same snippet.
      - Windows (and any other platform): legacy behavior - copy
        patches/main.modded.js wholesale over main.js. Preserves the
        existing Windows install flow exactly.
    """
    path = APP_EXTRACTED / "main.js"
    content = read_file(path)

    # Idempotency check - covers both injection (marker) and legacy
    # file-replace (snippet substring).
    if ('MODDED DEVTOOLS' in content) or (
        'before-input-event' in content and 'toggleDevTools' in content
    ):
        log_skip("main.js: DevTools enabled")
        return True

    if sys.platform == 'darwin':
        # 2-space indent, no semicolons - matches Mac vanilla style.
        injection = (
            "  // === MODDED DEVTOOLS ===\n"
            "  // Enable DevTools with F12 and Ctrl+Shift+I\n"
            "  win.webContents.on('before-input-event', (event, input) => {\n"
            "    if (input.key === 'F12') {\n"
            "      win.webContents.toggleDevTools()\n"
            "      event.preventDefault()\n"
            "    }\n"
            "    if (input.control && input.shift && input.key === 'I') {\n"
            "      win.webContents.toggleDevTools()\n"
            "      event.preventDefault()\n"
            "    }\n"
            "  })\n"
            "  // === END DEVTOOLS ===\n"
        )

        # Anchor on `win.setContentSize(...)` line. Whitespace-tolerant so
        # the same regex would also match the Windows-style 4-space indent
        # if the file ever flows through here.
        anchor = re.compile(
            r'(^[ \t]*win\.setContentSize\([^)]*\)[^\n]*\n)',
            re.MULTILINE,
        )
        match = anchor.search(content)
        if not match:
            log_fail("main.js: DevTools - win.setContentSize anchor not found")
            return False

        new_content = content[:match.end()] + injection + content[match.end():]
        write_file(path, new_content)
        log_success("main.js: DevTools enabled (F12 / Ctrl+Shift+I, injected)")
        return True

    # Windows (legacy): wholesale file replace.
    modded_file = MODS_DIR / "patches" / "main.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("main.js: DevTools enabled (F12 / Ctrl+Shift+I)")
        return True

    log_fail("main.js: DevTools - modded file not found")
    return False

# ============================================================================
# BOXSCENE.JS - Expand box storage to 200 slots
# ============================================================================
def apply_box_expansion():
    """Expand Pokemon box storage from 103 to 200 slots.

    File-replace with CRLF normalization.  All differences vs Mac vanilla are
    intentional mod changes: box size 200, direct tower removal (replaces
    game.deployingUnit), attackType sort, game.stopped removal for pause
    micromanagement.  No Mac-only features lost.
    """
    path = JS_ROOT / "game" / "scenes" / "BoxScene.js"

    if not path.exists():
        log_fail("BoxScene.js: File not found")
        return False

    content = read_file(path)

    if "< 200" in content and "attackType" in content:
        log_skip("BoxScene.js: Box expansion (already 200 slots)")
        return True

    modded_file = MODS_DIR / "patches" / "BoxScene.modded.js"
    if not modded_file.exists():
        # Fallback: direct replacement
        if "< 103" in content:
            content = content.replace("< 103", "< 200")
            write_file(path, content)
            log_success("BoxScene.js: Box expanded to 200 slots (inline)")
            return True
        log_fail("BoxScene.js: Box expansion pattern not found")
        return False

    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
    write_file(path, modded_content)
    log_success("BoxScene.js: Box expanded to 200 slots + attackType sort")
    return True

# ============================================================================
# PROFILESCENE.JS - Endless mode stats display
# ============================================================================
def apply_profile_endless_stats():
    """Update profile stats for endless mode (no caps, unique species count).

    File-replace with CRLF normalization.  No Mac-only features are lost:
    the mod replaces allPokemon stats lookups with helper methods, removes
    portrait limit cap, and removes game.stopped check (intentional mod change).
    """
    path = JS_ROOT / "game" / "scenes" / "ProfileScene.js"

    if not path.exists():
        log_fail("ProfileScene.js: File not found")
        return False

    content = read_file(path)

    if "countUniqueSpecies" in content:
        log_skip("ProfileScene.js: Endless stats")
        return True

    modded_file = MODS_DIR / "patches" / "ProfileScene.modded.js"
    if not modded_file.exists():
        log_fail("ProfileScene.js: modded file not found")
        return False

    modded_content = modded_file.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
    write_file(path, modded_content)
    log_success("ProfileScene.js: Endless stats (file replace)")
    return True

# ============================================================================
# POKEMONDATA.JS - Expand egg shop with missing Pokemon
# ============================================================================
def apply_expanded_egg_list():
    """Add missing Pokemon to the egg shop that exist in game but weren't in shop."""
    path = JS_ROOT / "game" / "data" / "pokemonData.js"
    
    if not path.exists():
        log_fail("pokemonData.js: File not found")
        return False
    
    content = read_file(path)
    
    # Check if already expanded (look for one of the new Pokemon)
    if "'bidoof'" in content and "'turtwig'" in content and "'vulpix'" in content:
        # Check if they're in the eggListData specifically
        egg_section = content[content.find("export const eggListData"):content.find("export const eggListDataUpdate")]
        if "'bidoof'" in egg_section and "'turtwig'" in egg_section:
            log_skip("pokemonData.js: Egg list already expanded")
            return True
    
    # Old egg list (matches vanilla 1.4.4)
    old_egg_list = """export const eggListData = [
	'charmander', 'treecko', 'froaki', 

	'natu', 'spoink', 'murkrow',
	'voltorb', 'machop', 'mankey', 'chimchar', 
	'yamask', 'cryogonal', 'sableye', 'meowth', 'tangela', 'chikorita', 
	'spinarak', 'shroomish', 'barboach', 'drudiggon', 'remoraid', 'clauncher', 
	'seel', 'staryu', 'psyduck', 'gulpin', 'lapras', 
	'ferroseed', 'shuckle', 'maractus', 'sunkern', 'aron', 'hawlucha', 
	'cubone', 'binacle', 'absol', 'oshawott', 'sandshrew', 'sneasel', 
	'trapinch', 'pidgey', 'noibat', 'riolu', 'mareep', 'surskit', 
	'cottonee', 'petilil', 'hoppip', 'drilbur', 'ekans',
	'girafarig', 'torkoal', 'spinda', 'dunsparce', 'ralts', 'koffing', 
	'farfetchd', 'omanyte', 'kabuto', 'corsola', 
	'castform', 'clefairy', 'anorith', 'lileep', 'shieldon', 'cranidos', 
	'starly', 'abra', 'gastly', 'ditto', 

	'magikarp', 'pikachu', 'fuecoco', 'larvesta', 'cherubi',
	'rockruff', 'pawniard', 'sandile', 'wimpod', 'honedge', 
	'sobble', 'rowlet', 'comfey', 'smeargle', 'carvanha', 
]"""
    
    # New expanded egg list with 17 additional Pokemon
    new_egg_list = """export const eggListData = [
	// === STARTERS ===
	'charmander', 'treecko', 'froaki', 'chikorita', 'totodile', 'fennekin', 
	'turtwig', 'chimchar', 'oshawott', 'sobble', 'rowlet', 'fuecoco',

	// === ORIGINAL EGG POKEMON ===
	'natu', 'spoink', 'murkrow',
	'voltorb', 'machop', 'mankey', 
	'yamask', 'cryogonal', 'sableye', 'meowth', 'tangela', 
	'spinarak', 'shroomish', 'barboach', 'drudiggon', 'remoraid', 'clauncher', 
	'seel', 'staryu', 'psyduck', 'gulpin', 'lapras', 
	'ferroseed', 'shuckle', 'maractus', 'sunkern', 'aron', 'hawlucha', 
	'cubone', 'binacle', 'absol', 'sandshrew', 'sneasel', 
	'trapinch', 'pidgey', 'noibat', 'riolu', 'mareep', 'surskit', 
	'cottonee', 'petilil', 'hoppip', 'drilbur', 'ekans',
	'girafarig', 'torkoal', 'spinda', 'dunsparce', 'ralts', 'koffing', 
	'farfetchd', 'omanyte', 'kabuto', 'corsola', 
	'castform', 'clefairy', 'anorith', 'lileep', 'shieldon', 'cranidos', 
	'starly', 'abra', 'gastly', 'ditto', 
	'magikarp', 'pikachu', 'larvesta', 'cherubi',
	'rockruff', 'pawniard', 'sandile', 'wimpod', 'honedge', 
	'comfey', 'smeargle', 'carvanha', 

	// === NEW POKEMON (previously missing from shop) ===
	'bidoof', 'cacnea', 'greavard', 'stakataka', 'luvdisc', 'chatot',
	'munna', 'hoothoot', 'wingull', 'archen', 'inkay', 'vulpix',
	'tarountula', 'carbink',
]"""
    
    if old_egg_list in content:
        content = content.replace(old_egg_list, new_egg_list)
        write_file(path, content)
        log_success("pokemonData.js: Egg list expanded (+17 Pokemon)")
        return True
    
    # Try a more flexible match - just find and replace the eggListData export
    pattern = r"export const eggListData = \[[^\]]+\]"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        # DEFENSIVE: Check if already expanded (new Pokemon present in existing list)
        existing_list = match.group(0)
        if "'bidoof'" in existing_list and "'vulpix'" in existing_list:
            log_skip("pokemonData.js: Egg list already expanded (regex check)")
            return True
        content = content[:match.start()] + new_egg_list + content[match.end():]
        write_file(path, content)
        log_success("pokemonData.js: Egg list expanded (+17 Pokemon) (regex)")
        return True
    
    log_fail("pokemonData.js: Could not find eggListData to expand")
    return False

# ============================================================================
# PLAYER.JS - Gold cap increase to 999 trillion
# ============================================================================
def apply_gold_cap_increase():
    """Raise gold cap to 9 quadrillion (safe JS integer limit)."""
    path = JS_ROOT / "game" / "core" / "Player.js"
    content = read_file(path)

    if '9007199254740991' in content:
        log_skip("Player.js: Gold cap increase")
        return True

    # Match either vanilla or previously patched cap
    for old_cap in ['999999999999999', '99999999999']:
        old = f'if (this.gold >= {old_cap}) this.gold = {old_cap};'
        if old in content:
            new = 'if (this.gold >= 9007199254740991) this.gold = 9007199254740991;'
            content = content.replace(old, new)
            write_file(path, content)
            log_success("Player.js: Gold cap raised to 9 quadrillion (MAX_SAFE_INTEGER)")
            return True

    log_fail("Player.js: Gold cap increase", "gold cap pattern not found")
    return False

# ============================================================================
# PLAYER.JS - Gold display abbreviated format (HUD)
# ============================================================================
def apply_gold_display_format_player():
    """Patch Player.js gold display to use abbreviated format for large amounts."""
    path = JS_ROOT / "game" / "core" / "Player.js"
    content = read_file(path)

    if 'TRILLION' in content or 'QUADRILLION' in content:
        log_skip("Player.js: Gold display format")
        return True

    # Remove old Trillion/Billion format if present
    old_options = [
        "this.main.UI.playerGold.innerText = `$${this.main.utility.numberDot(this.main.player.gold)}`;",
    ]
    # Also match the previously patched version
    for marker in ['const g = this.main.player.gold;']:
        for line in content.split('\n'):
            if marker in line and 'Trillion' in line:
                old_options.insert(0, line.strip())

    new = ("const g = this.main.player.gold; "
           "this.main.UI.playerGold.innerText = g >= 1e15 "
           "? `$${(g/1e15).toFixed(2)} QUADRILLION` "
           ": g >= 1e12 "
           "? `$${(g/1e12).toFixed(2)} TRILLION` "
           ": g >= 1e11 "
           "? `$${(g/1e9).toFixed(2)} BILLION` "
           ": `$${this.main.utility.numberDot(g)}`;")

    for old in old_options:
        if old in content:
            content = content.replace(old, new)
            write_file(path, content)
            log_success("Player.js: Gold display abbreviated (BILLION/TRILLION/QUADRILLION)")
            return True

    log_fail("Player.js: Gold display format", "playerGold.innerText pattern not found")
    return False

# ============================================================================
# UI.JS - Gold display abbreviated format (UI update)
# ============================================================================
def apply_gold_display_format_ui():
    """Patch UI.js gold display to use abbreviated format for large amounts."""
    path = JS_ROOT / "game" / "UI.js"
    content = read_file(path)

    if 'TRILLION' in content and 'playerGold' in content:
        log_skip("UI.js: Gold display format")
        return True

    old_options = [
        "this.playerGold.innerText = `$${this.main.utility.numberDot(this.main.player.gold)}`;",
    ]
    for marker in ['const _g = this.main.player.gold;']:
        for line in content.split('\n'):
            if marker in line and 'Trillion' in line:
                old_options.insert(0, line.strip())

    new = ("const _g = this.main.player.gold; "
           "this.playerGold.innerText = _g >= 1e15 "
           "? `$${(_g/1e15).toFixed(2)} QUADRILLION` "
           ": _g >= 1e12 "
           "? `$${(_g/1e12).toFixed(2)} TRILLION` "
           ": _g >= 1e11 "
           "? `$${(_g/1e9).toFixed(2)} BILLION` "
           ": `$${this.main.utility.numberDot(_g)}`;")

    for old in old_options:
        if old in content:
            content = content.replace(old, new)
            write_file(path, content)
            log_success("UI.js: Gold display abbreviated (BILLION/TRILLION/QUADRILLION)")
            return True

    log_fail("UI.js: Gold display format", "playerGold.innerText pattern not found")
    return False

# ============================================================================
# PROFILESCENE.JS - Live auto-updating stats while open
# ============================================================================
def apply_profile_live_update():
    """Add setInterval refresh to ProfileScene so stats update live while open."""
    path = JS_ROOT / "game" / "scenes" / "ProfileScene.js"
    content = read_file(path)

    if '_refreshInterval' in content:
        log_skip("ProfileScene.js: Live update")
        return True

    # Patch open() to add refresh interval
    old_open = """\topen() {
\t\tsuper.open();
\t\tthis.update();
\t}"""

    new_open = """\topen() {
\t\tsuper.open();
\t\tthis.update();
\t\tthis._refreshInterval = setInterval(() => this.update(), 500);
\t}"""

    if old_open not in content:
        log_fail("ProfileScene.js: Live update", "open() pattern not found")
        return False

    content = content.replace(old_open, new_open)

    # Patch close() to clear interval
    old_close = """\tclose() {
\t\tthis.main.tooltip.hide();
\t\tsuper.close();"""

    new_close = """\tclose() {
\t\tif (this._refreshInterval) { clearInterval(this._refreshInterval); this._refreshInterval = null; }
\t\tthis.main.tooltip.hide();
\t\tsuper.close();"""

    if old_close in content:
        content = content.replace(old_close, new_close)
    else:
        log_fail("ProfileScene.js: Live update", "close() pattern not found")
        return False

    write_file(path, content)
    log_success("ProfileScene.js: Live auto-updating stats (500ms refresh)")
    return True

# ============================================================================
# SELECTIVE MOD APPLICATION
# ============================================================================
# ============================================================================
# CHALLENGESCENE.JS - Fix level cap boosting low-level Pokemon
# ============================================================================
def apply_challenge_levelcap_fix():
    """
    Fix vanilla bug: level cap should cap high-level Pokemon, not boost low-level ones.
    
    Two locations need fixing:
    1. Pokemon.js updateStats(): unconditionally sets level = lvlCap (should use Math.min)
    2. ChallengeScene.js: calls setStatsLevel(capLevel) which boosts low-level Pokemon
       to the cap level instead of only capping high-level ones down.
    """
    # --- Fix 1: Pokemon.js updateStats() ---
    path = JS_ROOT / "game" / "component" / "Pokemon.js"
    content = read_file(path)
    
    if 'Math.min(this.lvl' in content and 'inChallenge.lvlCap' in content:
        log_skip("Pokemon.js: Challenge level cap fix")
    else:
        old_cap = "if (typeof this.main?.area?.inChallenge.lvlCap === 'number') level = this.main.area.inChallenge.lvlCap;"
        new_cap = "if (typeof this.main?.area?.inChallenge.lvlCap === 'number') level = Math.min(this.lvl, this.main.area.inChallenge.lvlCap);"
        
        if old_cap in content:
            content = content.replace(old_cap, new_cap)
            write_file(path, content)
            log_success("Pokemon.js: Challenge level cap fix (cap down only, never boost up)")
        else:
            log_fail("Pokemon.js: Challenge level cap fix", "inChallenge.lvlCap pattern not found")
    
    # --- Fix 2: ChallengeScene.js setStatsLevel(capLevel) ---
    path_cs = JS_ROOT / "game" / "scenes" / "ChallengeScene.js"
    content_cs = read_file(path_cs)
    
    old_scene = "pokemon.forEach(poke => poke.setStatsLevel(capLevel))"
    new_scene = "pokemon.forEach(poke => poke.setStatsLevel(Math.min(poke.lvl, capLevel)))"
    
    if new_scene in content_cs:
        log_skip("ChallengeScene.js: Challenge level cap fix")
    elif old_scene in content_cs:
        content_cs = content_cs.replace(old_scene, new_scene)
        write_file(path_cs, content_cs)
        log_success("ChallengeScene.js: Challenge level cap fix (cap down only)")
    else:
        log_fail("ChallengeScene.js: Challenge level cap fix", "setStatsLevel(capLevel) pattern not found")
    
    # --- Fix 3: UI.js team sidebar display shows cap instead of Math.min ---
    path_ui = JS_ROOT / "game" / "UI.js"
    content_ui = read_file(path_ui)
    
    old_ui_display = "this.pokemon[i].level.innerText = `Lv ${this.main.area.inChallenge.lvlCap}`;"
    new_ui_display = "this.pokemon[i].level.innerText = `Lv ${Math.min(pokemon.lvl, this.main.area.inChallenge.lvlCap)}`;"
    
    if new_ui_display in content_ui:
        log_skip("UI.js: Challenge level cap display fix")
    elif old_ui_display in content_ui:
        content_ui = content_ui.replace(old_ui_display, new_ui_display)
        write_file(path_ui, content_ui)
        log_success("UI.js: Challenge level cap display fix (show actual capped level)")
    else:
        log_fail("UI.js: Challenge level cap display fix", "lvlCap display pattern not found")
    
    # --- Fix 4: PokemonScene.js detail view shows cap instead of Math.min ---
    path_ps = JS_ROOT / "game" / "scenes" / "PokemonScene.js"
    content_ps = read_file(path_ps)
    
    # The vanilla code shows [lvlCap] for ALL pokemon instead of [Math.min(lvl, cap)]
    old_ps = "else this.name.innerHTML = (this.pokemon.alias != undefined) ? `${this.pokemon.alias.toUpperCase()} [${this.main.area.inChallenge.lvlCap}]` : `${this.pokemon.name[this.main.lang].toUpperCase()} [${this.main.area.inChallenge.lvlCap}]`;"
    new_ps = "else { const displayLvl = Math.min(this.pokemon.lvl, this.main.area.inChallenge.lvlCap); this.name.innerHTML = (this.pokemon.alias != undefined) ? `${this.pokemon.alias.toUpperCase()} [${displayLvl}]` : `${this.pokemon.name[this.main.lang].toUpperCase()} [${displayLvl}]`; }"
    
    if 'const displayLvl = Math.min(this.pokemon.lvl, this.main.area.inChallenge.lvlCap)' in content_ps:
        log_skip("PokemonScene.js: Challenge level cap display fix")
    elif old_ps in content_ps:
        content_ps = content_ps.replace(old_ps, new_ps)
        write_file(path_ps, content_ps)
        log_success("PokemonScene.js: Challenge level cap display fix (show actual capped level)")
    else:
        log_fail("PokemonScene.js: Challenge level cap display fix", "lvlCap display pattern not found")
    
    # --- Fix 5: PokemonScene.js level-up buttons disabled during challenge ---
    # Vanilla completely disables +1/+5/+10 buttons when lvlCap is set.
    # Fix: remove the early return so players can still level up Pokemon.
    # Stats/display are already capped by Math.min in updateStats() and display fixes.
    # Without endless mode, vanilla level 100 cap still applies from the existing button logic.
    # With endless mode, PokemonScene.modded.js replaces this file entirely (no cap).
    content_ps = read_file(path_ps)  # re-read in case Fix 4 wrote
    
    old_btn_block = """if (typeof this.main.area.inChallenge.lvlCap == 'number') {
			this.levelUp.innerHTML = `-`;
			this.levelUp.style.filter = 'brightness(0.8)';
			this.levelUp.style.pointerEvents = 'none';
			this.levelUp.style.lineHeight = '28px';

			this.levelUpFive.innerHTML = `-`;
			this.levelUpFive.style.filter = 'brightness(0.8)';
			this.levelUpFive.style.pointerEvents = 'none';
			this.levelUpFive.style.lineHeight = '28px';

			this.levelUpTen.innerHTML = `-`;
			this.levelUpTen.style.filter = 'brightness(0.8)';
			this.levelUpTen.style.pointerEvents = 'none';
			this.levelUpTen.style.lineHeight = '28px';
			return;
		}"""
    
    if old_btn_block in content_ps:
        # Remove the entire block — level-up works normally, stats are capped by updateStats()
        content_ps = content_ps.replace(old_btn_block, '// MOD: Level-up allowed during challenge (stats capped by updateStats)')
        write_file(path_ps, content_ps)
        log_success("PokemonScene.js: Level-up buttons enabled during challenge mode")
    elif '// MOD: Level-up allowed during challenge' in content_ps or "inChallenge.lvlCap == 'number'" not in content_ps:
        # Already patched, or modded file that never had the block
        log_skip("PokemonScene.js: Level-up buttons during challenge")
    else:
        log_fail("PokemonScene.js: Level-up buttons during challenge", "lvlCap button-disable block not found")
    
    return True


def apply_attacktype_sort():
    """Add attack type sorting option to the box scene.
    
    Adds 'attackType' text label to text.js so BoxScene.modded.js can display it.
    BoxScene.modded.js already has the sort logic baked in.
    """
    path = JS_ROOT / "file" / "text.js"
    content = read_file(path)
    
    if 'attackType:' in content and 'Attack Type' in content:
        log_skip("text.js: Attack type sort label")
        return True
    
    # Add after the shiny sort label
    old_shiny = 'shiny: ["Shiny","Variocolor","Chromatique","Shiny","Shiny","Schillernd"'
    
    if old_shiny in content:
        # Find the full shiny line and add attackType after it
        import re
        match = re.search(r'(shiny: \[.*?\])', content)
        if match:
            old_line = match.group(0)
            new_line = old_line + ',\n\t\tattackType: ["Attack Type","Tipo Ataque","Type Attaque","Tipo Ataque","Tipo Attacco","Angriffstyp","\u653b\u6483\u30bf\u30a4\u30d7","\uacf5\uaca9 \ud0c0\uc785","\u653b\u64ca\u985e\u578b","Typ ataku"]'
            content = content.replace(old_line, new_line)
            write_file(path, content)
            log_success("text.js: Attack type sort label added")
            return True
    
    log_fail("text.js: Attack type sort label", "shiny label pattern not found")
    return False


def apply_challenge_party_preserve():
    """Preserve team lineup, items, and tile positions when starting a challenge.
    
    Vanilla ChallengeScene.startChallenge() strips all items and moves all team
    Pokemon to the box before loading the area. This QoL patch saves the team state
    before the wipe and restores it after loadArea, so players keep their party
    lineup and deployed positions. Draft challenges are excluded (intentionally fresh).
    """
    path = JS_ROOT / "game" / "scenes" / "ChallengeScene.js"
    content = read_file(path)
    
    if '// MOD: Save team state before challenge wipe' in content:
        log_skip("ChallengeScene.js: Challenge party preserve")
        return True
    
    old_start = """this.main.boxScene.removeAllItems();
		this.main.boxScene.removeAllButton();"""
    
    new_start = """// MOD: Save team state before challenge wipe (QoL)
		this._savedTeamForChallenge = this.main.team.pokemon.map(p => ({
			pokemon: p,
			item: p.item ? p.item : null,
			tilePosition: p.tilePosition ?? -1
		}));

		this.main.boxScene.removeAllItems();
		this.main.boxScene.removeAllButton();"""
    
    if old_start not in content:
        log_fail("ChallengeScene.js: Challenge party preserve", "removeAllItems/removeAllButton pattern not found")
        return False
    
    content = content.replace(old_start, new_start)
    
    # After loadArea + UI.update + getHealed, restore team (but not for draft)
    old_post = """this.main.player.getHealed(14);
		this.main.teamManager.teamChallenge = [[], [], [], [], []];
		if (this.challenges.draft) this.main.draftScene.open();"""
    
    new_post = """this.main.player.getHealed(14);
		this.main.teamManager.teamChallenge = [[], [], [], [], []];

		// MOD: Restore team lineup after challenge wipe (skip for draft)
		if (!this.challenges.draft && this._savedTeamForChallenge && this._savedTeamForChallenge.length > 0) {
			for (const saved of this._savedTeamForChallenge) {
				const poke = saved.pokemon;
				// Move from box back to team
				if (this.main.box.pokemon.includes(poke)) {
					this.main.box.removePokemon(poke);
					this.main.team.addPokemon(poke);
				}
				// Re-equip item
				if (saved.item) {
					poke.equipItem(saved.item);
				}
				// Redeploy to tile if position was saved
				if (saved.tilePosition >= 0 && saved.tilePosition < this.main.area.placementTiles.length) {
					const tile = this.main.area.placementTiles[saved.tilePosition];
					if (tile && !tile.tower && poke.tiles.includes(tile.land)) {
						poke.isDeployed = true;
						poke.tilePosition = saved.tilePosition;
						const tower = new Tower(this.main, tile.position.x, tile.position.y, this.main.game.ctx, poke, tile);
						this.main.area.towers.push(tower);
						tile.tower = poke;
						this.main.UI.tilesCountNum[tile.land - 1] = (this.main.UI.tilesCountNum[tile.land - 1] || 0) + 1;
					}
				}
			}
			this.main.UI.update();
		}

		if (this.challenges.draft) this.main.draftScene.open();"""
    
    if old_post not in content:
        log_fail("ChallengeScene.js: Challenge party preserve", "post-loadArea pattern not found")
        return False
    
    content = content.replace(old_post, new_post)
    
    # Patch cancelChallenge (surrender) to also restore team
    old_cancel = """this.main.boxScene.removeAllItems();
		this.main.boxScene.removeAllButton();

		this.main.area.checkWeather();
		this.main.UI.update();

		this.main.game.cancelDeployUnit();"""
    
    new_cancel = """this.main.boxScene.removeAllItems();
		this.main.boxScene.removeAllButton();

		// MOD: Restore team lineup after surrender (skip for draft)
		if (this._savedTeamForChallenge && this._savedTeamForChallenge.length > 0) {
			for (const saved of this._savedTeamForChallenge) {
				const poke = saved.pokemon;
				if (this.main.box.pokemon.includes(poke)) {
					this.main.box.removePokemon(poke);
					this.main.team.addPokemon(poke);
				}
				if (saved.item) {
					poke.equipItem(saved.item);
				}
				if (saved.tilePosition >= 0 && saved.tilePosition < this.main.area.placementTiles.length) {
					const tile = this.main.area.placementTiles[saved.tilePosition];
					if (tile && !tile.tower && poke.tiles.includes(tile.land)) {
						poke.isDeployed = true;
						poke.tilePosition = saved.tilePosition;
						const tower = new Tower(this.main, tile.position.x, tile.position.y, this.main.game.ctx, poke, tile);
						this.main.area.towers.push(tower);
						tile.tower = poke;
						this.main.UI.tilesCountNum[tile.land - 1] = (this.main.UI.tilesCountNum[tile.land - 1] || 0) + 1;
					}
				}
			}
			this._savedTeamForChallenge = null;
		}

		this.main.area.checkWeather();
		this.main.UI.update();

		this.main.game.cancelDeployUnit();"""
    
    if old_cancel in content:
        content = content.replace(old_cancel, new_cancel)
    elif '// MOD: Restore team lineup after surrender' in content:
        pass  # already applied
    else:
        log_fail("ChallengeScene.js: Challenge party preserve (surrender)", "cancelChallenge pattern not found")
        return False
    
    # Add Tower import for programmatic deployment
    if "import { Tower }" not in content:
        old_import = "import { Pokemon } from '../component/Pokemon.js';"
        new_import = "import { Pokemon } from '../component/Pokemon.js';\nimport { Tower } from '../component/Tower.js';"
        if old_import in content:
            content = content.replace(old_import, new_import)
    
    write_file(path, content)
    log_success("ChallengeScene.js: Challenge party preserve (team + items + positions)")
    return True


def apply_projectile_retarget_fix():
    """
    Fix projectile retargeting to search from tower position within tower's range,
    instead of from projectile position within 200px.
    """
    path = JS_ROOT / "game" / "component" / "Projectile.js"
    content = read_file(path)
    
    # Check if already fixed (modded file or already patched)
    if 'this.tower.range' in content and 'findClosestEnemy(this.tower' in content:
        log_skip("Projectile.js: Retarget fix")
        return True
    
    # Vanilla pattern: retargets from projectile position with 200px range
    old = "const fallbackSource = { center: this.position || { x: this.position?.x ?? 0, y: this.position?.y ?? 0 } };\n            const newTarget = this.tower.findClosestEnemy(fallbackSource, 200);"
    new = "// MOD: Retarget from tower position within tower's actual range\n            const towerRange = this.tower.range || 100;\n            const newTarget = this.tower.findClosestEnemy(this.tower, towerRange);"
    
    if old in content:
        content = content.replace(old, new)
        write_file(path, content)
        log_success("Projectile.js: Retarget fix (tower position + tower range)")
        return True
    
    log_fail("Projectile.js: Retarget fix", "fallbackSource pattern not found")
    return False


def apply_offscreen_target_fix():
    """
    Add off-screen target cleanup to Projectile.js.
    Deletes projectiles whose target enemy has gone off-screen.
    """
    path = JS_ROOT / "game" / "component" / "Projectile.js"
    content = read_file(path)
    
    # Check if already applied
    if 'off-screen' in content.lower() or 'offscreen' in content.lower():
        log_skip("Projectile.js: Off-screen target fix")
        return True
    
    # Insert after the retarget block, before the "if (!this.enemy" check
    marker = "if (!this.enemy || this.enemy.hp <= 0) {\n            this.markedForDeletion = true;\n            return;\n        }\n\n        this.age"
    
    offscreen_check = """if (!this.enemy || this.enemy.hp <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // MOD: Delete projectile if target enemy is off-screen
        if (this.enemy && !this.enemy.dying && this.tower?.main?.game?.canvas) {
            const c = this.tower.main.game.canvas;
            const ex = this.enemy.center?.x ?? this.enemy.position?.x ?? 0;
            const ey = this.enemy.center?.y ?? this.enemy.position?.y ?? 0;
            if (ex < -50 || ex > c.width + 50 || ey < -50 || ey > c.height + 50) {
                this.markedForDeletion = true;
                return;
            }
        }

        this.age"""
    
    if marker in content:
        content = content.replace(marker, offscreen_check)
        write_file(path, content)
        log_success("Projectile.js: Off-screen target fix")
        return True
    
    log_fail("Projectile.js: Off-screen target fix", "insertion marker not found")
    return False


def apply_shellbell_fix():
    """Fix vanilla bug: Shell Bell and Clefairy Doll never trigger.
    
    The vanilla game checks pokemon.trueDamageDealt but never increments it.
    Only pokemon.damageDealt gets incremented. This adds the missing increment.
    Skipped when Enemy.modded.js is installed (Endless mode already includes the fix).
    """
    path = JS_ROOT / "game" / "component" / "Enemy.js"
    content = read_file(path)
    
    # Skip if Enemy.modded.js is installed (has the fix baked in)
    if 'pokemon.trueDamageDealt += amount' in content:
        log_skip("Enemy.js: Shell Bell / Clefairy Doll fix")
        return True
    
    # Find the damageDealt increment line and add trueDamageDealt after it
    old = "    this.main.area.totalDamageDealt += amount;\n\t    pokemon.damageDealt += amount;"
    new = ("    this.main.area.totalDamageDealt += amount;\n"
           "\t    this.main.area.totalTrueDamageDealt += amount;  // MOD: Fix vanilla bug\n"
           "\t    pokemon.damageDealt += amount;\n"
           "\t    pokemon.trueDamageDealt += amount;  // MOD: Fix Shell Bell / Clefairy Doll")
    
    if old in content:
        content = content.replace(old, new, 1)
        write_file(path, content)
        log_success("Enemy.js: Shell Bell / Clefairy Doll fix (trueDamageDealt increment)")
        return True
    
    log_fail("Enemy.js: Shell Bell fix", "damageDealt pattern not found")
    return False


# ============================================================================
# SCENES.CSS - Fix emoji rendering in pixel font
# ============================================================================
def apply_emoji_font_fix():
    """Add emoji font-family to .msrre so star emoji renders with PressStart2P."""
    path = APP_EXTRACTED / "src" / "css" / "scenes.css"
    content = read_file(path)

    if "'Segoe UI Emoji'" in content:
        log_skip("scenes.css: Emoji font fix")
        return True

    old = ".msrre {\n\tvertical-align: middle;\n\tposition: relative;\n\ttop: -4px; /* ajusta seg\u00fan se necesite */\n}"

    new = ".msrre {\n\tvertical-align: middle;\n\tposition: relative;\n\ttop: -4px; /* ajusta seg\u00fan se necesite */\n\tfont-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;\n}"

    if old in content:
        content = content.replace(old, new)
        write_file(path, content)
        log_success("scenes.css: Emoji font fix")
        return True

    # Fallback: regex insert before closing brace of .msrre
    pattern = r'(\.msrre\s*\{[^}]*)(})'
    match = re.search(pattern, content)
    if match and "'Segoe UI Emoji'" not in match.group(1):
        insert = "\n\tfont-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;\n"
        content = content[:match.end(1)] + insert + content[match.start(2):]
        write_file(path, content)
        log_success("scenes.css: Emoji font fix (regex)")
        return True

    log_fail("scenes.css: Emoji font fix")
    return False

# ============================================================================
# UI.CSS - Fix emoji rendering for lock icon and speed button
# ============================================================================
def apply_ui_emoji_font_fix():
    """Add emoji font-family to .lock and .ui-speed-wave so ?? and ?? render correctly."""
    path = APP_EXTRACTED / "src" / "css" / "ui.css"
    content = read_file(path)
    
    emoji_font = "font-family: 'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif;"
    changes = 0
    
    # Fix .lock class
    if '.lock {' in content and "'Segoe UI Emoji'" not in content.split('.lock {')[1].split('}')[0]:
        old_lock = ".lock {\n\tfilter: grayscale(50%);\n\topacity: 0.8;\n\tline-height: 66px;\n\tfont-size: 30px;\n}"
        new_lock = f".lock {{\n\tfilter: grayscale(50%);\n\topacity: 0.8;\n\tline-height: 66px;\n\tfont-size: 30px;\n\t{emoji_font}\n}}"
        if old_lock in content:
            content = content.replace(old_lock, new_lock)
            changes += 1
        else:
            # Regex fallback
            pattern = r'(\.lock\s*\{[^}]*)(})'
            match = re.search(pattern, content)
            if match and "'Segoe UI Emoji'" not in match.group(1):
                content = content[:match.end(1)] + f"\n\t{emoji_font}\n" + content[match.start(2):]
                changes += 1
    
    # Fix .ui-speed-wave class
    speed_section = content.split('.ui-speed-wave,')[0] if '.ui-speed-wave,' in content else ''
    # The speed-wave shares a rule with pause-wave, then has its own. Add to shared rule.
    shared_pattern = r'(\.ui-speed-wave,\s*\.ui-pause-wave\s*\{[^}]*)(})'
    match = re.search(shared_pattern, content)
    if match and "'Segoe UI Emoji'" not in match.group(1):
        content = content[:match.end(1)] + f"\n\t{emoji_font}\n" + content[match.start(2):]
        changes += 1
    
    if changes > 0:
        write_file(path, content)
        log_success(f"ui.css: Emoji font fix ({changes} rules)")
        return True
    
    if "'Segoe UI Emoji'" in content:
        log_skip("ui.css: Emoji font fix")
        return True
    
    log_fail("ui.css: Emoji font fix")
    return False

# ============================================================================
# AREA.JS - Clamp wave numbers to 100 (when Endless Mode is NOT installed)
# ============================================================================
def apply_star_display_cap():
    """
    Surgically patch UI.js to cap the star display when Endless Mode is not installed.
    
    Without Endless, each route's record should count as at most 100 for the displayed star total.
    The raw player.stars (sum of all records) may be inflated from previous endless play.
    This replaces the star display line to compute a capped total from records.
    """
    # Try UI.modded.js first, fall back to vanilla UI.js
    path = JS_ROOT / "game" / "UI.js"
    content = read_file(path)
    
    # Check if already applied
    if 'cappedStars' in content:
        log_skip("UI.js: Star display cap")
        return True
    
    # Find and replace the star display line
    # Vanilla: this.playerStars.innerHTML = `<span class="msrre">⭐</span>${Math.min(1200, this.main.player.stars)}`;
    # We need to compute capped stars: sum of min(100, record) for each route
    old_pattern = r'this\.playerStars\.innerHTML\s*=\s*`<span class="msrre">.*?</span>\$\{Math\.min\(1200,\s*this\.main\.player\.stars\)\}`;'
    match = re.search(old_pattern, content)
    
    if match:
        new_line = 'const cappedStars = this.main.player.records.reduce((sum, r) => sum + Math.min(100, r), 0); this.playerStars.innerHTML = `<span class="msrre">\u2b50</span>${cappedStars}`;'
        content = content.replace(match.group(0), new_line)
        write_file(path, content)
        log_success("UI.js: Star display capped (100 per route without Endless)")
        return True
    
    # Try matching the modded UI.js pattern (shows raw stars without Math.min)
    modded_pattern = r'this\.playerStars\.innerHTML\s*=\s*`<span class="msrre">.*?</span>\$\{this\.main\.player\.stars\}`;'
    match2 = re.search(modded_pattern, content)
    if match2:
        new_line = 'const cappedStars = this.main.player.records.reduce((sum, r) => sum + Math.min(100, r), 0); this.playerStars.innerHTML = `<span class="msrre">\u2b50</span>${cappedStars}`;'
        content = content.replace(match2.group(0), new_line)
        write_file(path, content)
        log_success("UI.js: Star display capped (100 per route without Endless)")
        return True
    
    # Fallback: try simple string replacement
    if 'Math.min(1200' in content and 'playerStars' in content:
        content = content.replace(
            'Math.min(1200, this.main.player.stars)',
            'this.main.player.records.reduce((sum, r) => sum + Math.min(100, r), 0)'
        )
        write_file(path, content)
        log_success("UI.js: Star display capped (100 per route without Endless)")
        return True
    
    log_fail("UI.js: Star display cap (player panel)", "star display pattern not found")
    return False


def apply_star_record_cap():
    """Cap the per-route record star display (mapRecord) at 100 when Endless isn't installed.
    
    UI.modded.js has 'ENDLESS MODE: No cap on star display' showing raw records.
    Without Endless, records past 100 should display as 100.
    """
    path = JS_ROOT / "game" / "UI.js"
    content = read_file(path)
    
    if 'Math.min(100, this.main.player.records[this.main.area.map.id])' in content:
        log_skip("UI.js: Map record star cap")
        return True
    
    # Match the modded line
    old_record = 'this.mapRecord.innerHTML = `<span class="msrre">\u2b50</span>${this.main.player.records[this.main.area.map.id]}`;'
    new_record = 'this.mapRecord.innerHTML = `<span class="msrre">\u2b50</span>${Math.min(100, this.main.player.records[this.main.area.map.id])}`;'
    
    if old_record in content:
        content = content.replace(old_record, new_record)
        write_file(path, content)
        log_success("UI.js: Map record star capped at 100")
        return True
    
    # Try vanilla pattern (has Math.min(100, ...))
    if 'Math.min(100' in content and 'mapRecord' in content:
        log_skip("UI.js: Map record star cap (vanilla already caps)")
        return True
    
    log_skip("UI.js: Map record star cap (pattern not found)")
    return True


def apply_wave_clamp():
    """
    Surgically patch Area.js to clamp waveNumber to 100.
    
    This prevents crashes when a save has wave > 100 but Endless Mode is not installed.
    The clamp applies to both waveNumber and routeWaves so the clamped value persists.
    Also patches spawnEnemies and other methods that access waves[waveNumber] directly.
    
    Only runs when Endless Mode is NOT selected — if Endless is installed, Area.modded.js
    handles waves > 100 natively.
    """
    path = JS_ROOT / "game" / "core" / "Area.js"
    
    if not path.exists():
        log_skip("Area.js: Wave clamp (file not found)")
        return True
    
    content = read_file(path)
    
    # If this is Area.modded.js (has ENDLESS MODE markers), don't clamp
    if 'ENDLESS MODE' in content or 'endlessMode' in content or 'spawnEndlessWave' in content:
        log_skip("Area.js: Wave clamp (Endless Mode detected, not needed)")
        return True
    
    # Check if already applied
    if '// MOD: WAVE CLAMP' in content:
        log_skip("Area.js: Wave clamp")
        return True
    
    changes = 0
    
    # 1. Clamp waveNumber after it's read from routeWaves in loadArea
    old_wave_assign = 'this.waveNumber = this.routeWaves[routeNumber];\n\t\tthis.waveActive = false;'
    new_wave_assign = ('this.waveNumber = this.routeWaves[routeNumber];\n'
                       '\t\t// MOD: WAVE CLAMP - Cap at 100 when Endless Mode is not installed\n'
                       '\t\tif (this.waveNumber > 100) {\n'
                       '\t\t\tthis.waveNumber = 100;\n'
                       '\t\t\tthis.routeWaves[routeNumber] = 100;\n'
                       '\t\t}\n'
                       '\t\tthis.waveActive = false;')
    
    if old_wave_assign in content:
        content = content.replace(old_wave_assign, new_wave_assign)
        changes += 1
    
    # 2. Clamp in changeWave (wave selector) — prevent jumping past 100
    old_change = 'this.waveNumber = nextWave;\n\t\tthis.routeWaves[this.routeNumber] = nextWave;'
    new_change = ('// MOD: WAVE CLAMP\n'
                  '\t\tthis.waveNumber = Math.min(100, nextWave);\n'
                  '\t\tthis.routeWaves[this.routeNumber] = Math.min(100, nextWave);')
    
    if old_change in content:
        content = content.replace(old_change, new_change)
        changes += 1
    
    # 3. Guard waves[waveNumber] accesses with optional chaining where possible
    # Pattern: this.waves[this.waveNumber].preview[0]
    content = content.replace(
        'this.waves[this.waveNumber].preview[0]',
        '(this.waves[this.waveNumber]?.preview?.[0] || this.waves[1]?.preview?.[0])'
    )
    
    # Pattern: this.waves[this.waveNumber].offSet
    content = content.replace(
        "this.waves[this.waveNumber].offSet || 50",
        "(this.waves[this.waveNumber]?.offSet || this.waves[((this.waveNumber - 1) % 100) + 1]?.offSet || 50)"
    )
    
    if changes > 0:
        write_file(path, content)
        log_success(f"Area.js: Wave clamp to 100 ({changes} clamp points + safe accessors)")
        return True
    
    log_fail("Area.js: Wave clamp", "patterns not found")
    return False

# ============================================================================
# ITEMDATA.JS - Unlock hidden/WIP items (Magma Stone)
# ============================================================================
def apply_hidden_items():
    """Uncomment Magma Stone in itemData.js and add it to the shop.
    
    IMPORTANT: Uses brace-depth tracking to handle nested objects (e.g. restriction: {}).
    Do NOT simplify to 'stop at first }' -- that breaks nested blocks and causes gray screen.
    See commit 0be5a3c for the bug this fixed.
    
    DEFENSIVE: Validates output before writing to prevent syntax errors (e.g. missing comma
    before next item). If uncomment produces invalid JS, the original file is preserved.
    """
    path = JS_ROOT / "game" / "data" / "itemData.js"
    content = read_file(path)

    # Check if already applied -- magmaStone exists uncommented
    if "\tmagmaStone: {" in content and "// magmaStone" not in content:
        log_skip("itemData.js: Hidden items (Magma Stone already unlocked)")
        return True

    # If there's no commented magmaStone at all, nothing to do
    if "// magmaStone" not in content:
        log_skip("itemData.js: No hidden magmaStone block found in this version")
        return True

    # Save original content for rollback on failure
    original_content = content

    # 1) Uncomment the magmaStone block
    # Each commented line is: \t// \tkey: value  or  \t// },
    # We need to track brace depth to know when the top-level item closes
    lines = content.split('\n')
    in_magma = False
    brace_depth = 0
    new_lines = []
    magma_start_idx = -1
    magma_end_idx = -1
    for i, line in enumerate(lines):
        if '// magmaStone: {' in line:
            in_magma = True
            brace_depth = 1
            magma_start_idx = len(new_lines)
            new_lines.append('\tmagmaStone: {')
        elif in_magma:
            # Strip the "// " or "// \t" prefix after the leading tab
            uncommented = re.sub(r'^(\t)// \t?', r'\t\t', line)
            uncommented = re.sub(r'^(\t)// ?', r'\t', uncommented)
            new_lines.append(uncommented)
            # Track braces to find the real closing brace
            brace_depth += uncommented.count('{') - uncommented.count('}')
            if brace_depth <= 0:
                in_magma = False
                magma_end_idx = len(new_lines) - 1
        else:
            new_lines.append(line)

    # DEFENSIVE: Validate the uncommented block
    if magma_start_idx < 0 or magma_end_idx < 0:
        log_fail("itemData.js: Hidden items", "Could not find magmaStone block boundaries")
        return False

    # Check that the closing line ends with '},' (trailing comma required before next item)
    closing_line = new_lines[magma_end_idx].strip()
    if closing_line == '}':
        # Missing trailing comma -- add it
        new_lines[magma_end_idx] = new_lines[magma_end_idx].rstrip()
        new_lines[magma_end_idx] = new_lines[magma_end_idx][:-1] + '},'

    # Validate: the line AFTER the magmaStone block should be a valid JS identifier or closing brace
    if magma_end_idx + 1 < len(new_lines):
        next_line = new_lines[magma_end_idx + 1].strip()
        if next_line and not next_line.startswith(('/', '}', '*', '\t')):
            # Next line is an identifier (like 'tinyMushroom:') -- verify our block ends with },
            final_closing = new_lines[magma_end_idx].strip()
            if not final_closing.endswith('},'):
                log_fail("itemData.js: Hidden items", 
                         f"Uncommented block doesn't end with '}},', would break next item '{next_line[:30]}...'")
                return False

    # Additional validation: count total braces in the uncommented block
    block_text = '\n'.join(new_lines[magma_start_idx:magma_end_idx + 1])
    open_braces = block_text.count('{')
    close_braces = block_text.count('}')
    if open_braces != close_braces:
        log_fail("itemData.js: Hidden items",
                 f"Brace mismatch in uncommented block: {open_braces} open vs {close_braces} close")
        return False

    content = '\n'.join(new_lines)

    # 2) Add magmaStone to itemListData shop array (only if not already there)
    match = re.search(r"(export const itemListData = \[.*?)(]\s*\n)", content, re.DOTALL)
    if match and "'magmaStone'" not in match.group(1):
        content = content[:match.end(1)] + "\t'magmaStone',\n" + content[match.start(2):]

    # Final validation: make sure the file still has the expected structure
    if '\tmagmaStone: {' not in content:
        log_fail("itemData.js: Hidden items", "magmaStone block missing after uncomment -- rollback")
        write_file(path, original_content)
        return False

    write_file(path, content)
    log_success("itemData.js: Magma Stone unlocked and added to shop")
    return True


def apply_modded_userdata_redirect():
    """Inject app.setPath('userData', ...) into Electron main.js to redirect saves to modded location."""
    path = APP_EXTRACTED / "main.js"
    content = read_file(path)
    
    # Idempotency check
    if 'pokePathTD_Electron_modded' in content:
        log_skip("main.js: userData redirect (already applied)")
        return True
    
    # Inject after app import / at the top of the file, after require statements
    # Find the first app.on or app.whenReady or BrowserWindow creation
    inject_code = """
// === MODDED USERDATA REDIRECT ===
// Redirect userData to separate modded location to preserve vanilla saves
const { app } = require('electron');
const moddedPath = require('path').join(app.getPath('appData'), 'pokePathTD_Electron_modded');
app.setPath('userData', moddedPath);
// === END REDIRECT ===
"""
    
    # Insert after the first line (shebang or 'use strict' or first require)
    # Find a safe insertion point - after existing require('electron') or at top
    if "require('electron')" in content or 'require("electron")' in content:
        # Insert the setPath call after existing electron require
        # Find the line with require('electron') and insert after it
        lines = content.split('\n')
        insert_idx = 0
        for i, line in enumerate(lines):
            if 'require' in line and 'electron' in line:
                insert_idx = i + 1
                break
        
        # Just inject the setPath line (electron already imported)
        redirect_line = "\n// === MODDED USERDATA REDIRECT ===\nconst __moddedPath = require('path').join(app.getPath('appData'), 'pokePathTD_Electron_modded');\napp.setPath('userData', __moddedPath);\n// === END REDIRECT ===\n"
        
        # Check if 'app' is destructured from require('electron')
        electron_line = lines[insert_idx - 1]
        if 'app' not in electron_line:
            # app might be accessed differently, use full require
            redirect_line = "\n// === MODDED USERDATA REDIRECT ===\nconst { app: __modApp } = require('electron');\nconst __moddedPath = require('path').join(__modApp.getPath('appData'), 'pokePathTD_Electron_modded');\n__modApp.setPath('userData', __moddedPath);\n// === END REDIRECT ===\n"
        
        lines.insert(insert_idx, redirect_line)
        content = '\n'.join(lines)
    else:
        # No electron require found, prepend the full injection
        content = inject_code + "\n" + content
    
    write_file(path, content)
    log_success("main.js: userData redirect to pokePathTD_Electron_modded")
    return True


def apply_selected_mods(selected_features: list, progress_callback=None):
    """
    Apply only selected mod features.
    
    Flow:
    1. Ensure vanilla backup exists (create from app.asar if needed)
    2. Extract fresh from vanilla backup (clean slate every time)
    3. Apply selected mod features
    4. Repack into app.asar
    
    Args:
        selected_features: List of feature keys from MOD_FEATURES
        progress_callback: Optional callback(current, total, message) for GUI progress
    
    Returns:
        tuple: (success: bool, applied: list, failed: list)
    """
    global applied_mods, failed_mods
    applied_mods = []
    failed_mods = []
    
    # Step 1: Ensure vanilla backup
    print("\n[*] Checking vanilla backup...")
    if progress_callback:
        progress_callback(0, 1, "Checking vanilla backup...")
    
    backup_ok, backup_msg = ensure_vanilla_backup()
    if not backup_ok:
        return False, [], [backup_msg]
    
    # Step 2: Extract fresh from vanilla
    print("\n[*] Extracting vanilla game files...")
    if progress_callback:
        progress_callback(0, 1, "Extracting vanilla game files...")
    
    extract_ok, extract_msg = extract_from_vanilla(progress_callback)
    if not extract_ok:
        return False, [], [extract_msg]
    
    # Step 2b: Verify game version compatibility
    compatible, mismatches = check_game_version_compatibility()
    if not compatible:
        warning = (f"Game version mismatch! This mod is built for v{MOD_VERSION}.\n"
                   f"Mismatched files: {', '.join(m.split(':')[0] for m in mismatches)}\n"
                   f"The mod may not work correctly.")
        print(f"\n  [WARNING] {warning}")
        # Don't block in GUI mode - just warn. The GUI can check return value.
        failed_mods.append(f"VERSION WARNING: {warning}")
    else:
        print(f"  [OK] Game files match expected version ({MOD_VERSION})")
    
    # Build list of functions to call
    functions_to_call = []
    for feature_key in selected_features:
        if feature_key in MOD_FEATURES:
            functions_to_call.extend(MOD_FEATURES[feature_key]['functions'])
    
    # Remove duplicates while preserving order
    seen = set()
    unique_functions = []
    for f in functions_to_call:
        if f not in seen:
            seen.add(f)
            unique_functions.append(f)
    
    total = len(unique_functions) + 1  # +1 for repack
    current = 0
    
    # Step 3: Apply selected mods
    print("\n[*] Applying selected mods...")
    
    # Get function references from globals
    for func_name in unique_functions:
        current += 1
        if progress_callback:
            progress_callback(current, total, f"Applying {func_name}...")
        
        func = globals().get(func_name)
        if func and callable(func):
            try:
                func()
            except Exception as e:
                failed_mods.append(f"{func_name}: {str(e)}")
        else:
            failed_mods.append(f"{func_name}: function not found")
    
    # Step 4: Always apply userData redirect when any mod is selected
    if selected_features:
        if progress_callback:
            progress_callback(current + 1, total, "Applying userData redirect...")
        try:
            apply_modded_userdata_redirect()
        except Exception as e:
            failed_mods.append(f"userData redirect: {str(e)}")
    
    # Step 4b: Apply wave clamp + star display cap if Endless Mode is NOT selected
    # Prevents crashes when a save has wave > 100 but Endless isn't installed
    # Also caps star display so endless records don't inflate the total
    if 'endless' not in selected_features:
        try:
            apply_wave_clamp()
        except Exception as e:
            failed_mods.append(f"wave clamp: {str(e)}")
        try:
            apply_star_display_cap()
        except Exception as e:
            failed_mods.append(f"star display cap: {str(e)}")
        try:
            apply_star_record_cap()
        except Exception as e:
            failed_mods.append(f"star record cap: {str(e)}")
    
    # Step 4c: Apply debug diagnostics
    if progress_callback:
        progress_callback(current + 1, total, "Applying debug diagnostics...")
    try:
        apply_debug_diagnostics()
    except Exception as e:
        failed_mods.append(f"debug diagnostics: {str(e)}")
    
    # Step 5: Repack
    if progress_callback:
        progress_callback(total, total, "Repacking game...")
    
    repack_success = _repack_game()
    
    # Step 6: Set up modded saves (after repack, so game files are ready)
    if selected_features and repack_success:
        if progress_callback:
            progress_callback(total, total, "Setting up modded saves...")
        try:
            import importlib
            from lib import save_manager
            importlib.reload(save_manager)
            save_ok, save_msg = save_manager.setup_modded_saves()
            save_manager.set_mod_flag()
            # Write installed features manifest for save editor
            import json
            features_path = MODS_DIR / 'installed_features.json'
            with open(features_path, 'w') as f:
                json.dump(selected_features, f)
            print(f"  [INFO] Save setup result: success={save_ok}, msg={save_msg}")
            if not save_ok:
                print(f"  [WARN] Save setup: {save_msg}")
        except Exception as e:
            import traceback
            print(f"  [WARN] Save manager error: {e}")
            traceback.print_exc()
    
    return repack_success, applied_mods.copy(), failed_mods.copy()

def _repack_game():
    """Repack the game asar. Returns True on success."""
    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    
    # Try local repack script first (more reliable)
    repack_script = SCRIPT_DIR / "repack_game.js"
    if repack_script.exists():
        try:
            # Pass game paths via env so repack_game.js doesn't need to guess
            # them from its own __dirname (the legacy Windows layout assumption).
            repack_env = os.environ.copy()
            repack_env['POKEPATH_APP_ASAR'] = str(APP_ASAR)
            repack_env['POKEPATH_APP_EXTRACTED'] = str(APP_EXTRACTED)
            result = subprocess.run(
                ['node', str(repack_script)],
                capture_output=True,
                text=True,
                timeout=300,
                creationflags=creationflags,
                env=repack_env
            )
            if result.returncode == 0 and 'OK:' in result.stdout:
                print("  [OK] Game repacked successfully!")
                return True
            elif result.returncode == 0:
                # Give it a moment for async operation
                import time
                time.sleep(2)
                return True
            else:
                print(f"  [WARN] Local repack failed, trying npx: {result.stderr}")
        except Exception as e:
            print(f"  [WARN] Local repack error, trying npx: {e}")
    
    # Fallback to npx
    try:
        if sys.platform == 'win32':
            cmd = ['cmd', '/c', 'npx', 'asar', 'pack', 
                   str(APP_EXTRACTED), 
                   str(APP_ASAR)]
        else:
            cmd = ['npx', 'asar', 'pack', 
                   str(APP_EXTRACTED), 
                   str(APP_ASAR)]
        
        result = subprocess.run(
            cmd,
            capture_output=True, 
            text=True,
            timeout=300,
            creationflags=creationflags
        )
        
        if 'cannot be loaded because running scripts is disabled' in result.stderr:
            print("  [ERROR] PowerShell is blocking scripts. Try running from Command Prompt (cmd.exe)")
            return False
        elif result.returncode == 0:
            print("  [OK] Game repacked successfully!")
            return True
        else:
            print(f"  [ERROR] Repack failed: {result.stderr}")
            return False
    except subprocess.TimeoutExpired:
        print("  [ERROR] Repack timed out after 5 minutes")
        return False
    except FileNotFoundError:
        print("  [ERROR] npx/asar not found - make sure Node.js is installed")
        return False

# ============================================================================
# TEAM.JS - Allow duplicate Pokemon IDs
# ============================================================================
def apply_allow_dupes():
    """Remove the team deduplication filter that prevents duplicate species IDs.
    
    The vanilla game filters team members by specie.id, which means Pokemon that
    share an ID (e.g. Cherubi and Cherrim both have id:75) can't coexist on a team.
    This patch comments out the dedup filter.
    """
    path = JS_ROOT / "game" / "core" / "Team.js"
    content = read_file(path)
    
    if '// MOD: Dedup filter removed' in content:
        log_skip("Team.js: Allow dupes (already applied)")
        return True
    
    # Find and comment out the dedup filter block
    old_dedup = """		const seenIds = new Set();
	    this.pokemon = this.pokemon.filter(p => {
	        if (seenIds.has(p.id)) return false; // duplicado
	        seenIds.add(p.id);
	        return true;
	    });"""
    
    new_dedup = """		// MOD: Dedup filter removed — allow duplicate species IDs on team
		// const seenIds = new Set();
	    // this.pokemon = this.pokemon.filter(p => {
	    //     if (seenIds.has(p.id)) return false;
	    //     seenIds.add(p.id);
	    //     return true;
	    // });"""
    
    if old_dedup not in content:
        # Try alternate formatting (tabs vs spaces)
        old_dedup_alt = old_dedup.replace('	    ', '\t\t')
        if old_dedup_alt in content:
            content = content.replace(old_dedup_alt, new_dedup)
        else:
            log_fail("Team.js: Allow dupes - dedup block not found (game version may differ)")
            return False
    else:
        content = content.replace(old_dedup, new_dedup)
    
    write_file(path, content)
    log_success("Team.js: Allow duplicate Pokemon IDs")

    # Also remove Box.js dedup filter — it filters box Pokemon against team IDs,
    # which removes Pokemon like Cherubi (id:75) when Cherrim (id:75) is on team
    box_path = JS_ROOT / "game" / "core" / "Box.js"
    box_content = read_file(box_path)

    if '// MOD: Box dedup filter removed' in box_content:
        log_skip("Box.js: Allow dupes (already applied)")
        return True

    old_box_dedup = """        const seenIds = new Set(this.main.team.pokemon.map(p => p.id)); 
        this.pokemon = this.pokemon.filter(p => {
            if (seenIds.has(p.id)) return false; 
            seenIds.add(p.id); 
            return true;
        });"""

    new_box_dedup = """        // MOD: Box dedup filter removed — allow duplicate species IDs in box
        // const seenIds = new Set(this.main.team.pokemon.map(p => p.id)); 
        // this.pokemon = this.pokemon.filter(p => {
        //     if (seenIds.has(p.id)) return false; 
        //     seenIds.add(p.id); 
        //     return true;
        // });"""

    if old_box_dedup not in box_content:
        log_fail("Box.js: Allow dupes - dedup block not found (game version may differ)")
        return False

    box_content = box_content.replace(old_box_dedup, new_box_dedup)
    write_file(box_path, box_content)
    log_success("Box.js: Allow duplicate Pokemon IDs in box")
    return True


# ============================================================================
# DEBUG DIAGNOSTICS - Add debug logging and F9 diagnostics
# ============================================================================
def apply_debug_diagnostics():
    """Add debug diagnostic logging and F9 diagnostic dump for remote troubleshooting."""
    print("\n[*] Adding debug diagnostics...")
    
    # 1. Patch Init.js to expose Main instance on window
    init_path = JS_ROOT / "game" / "Init.js"
    init_content = read_file(init_path)
    
    # Check if already applied
    if 'window.__POKEPATH_MAIN__' in init_content:
        log_skip("Init.js: Main instance exposure")
    else:
        old_init = "new Main(this.data.save);"
        new_init = "const main = new Main(this.data.save); window.__POKEPATH_MAIN__ = main;"
        
        if old_init in init_content:
            init_content = init_content.replace(old_init, new_init)
            write_file(init_path, init_content)
            log_success("Init.js: Main instance exposed on window")
        else:
            log_fail("Init.js: Main instance exposure", "Main instantiation not found")
    
    # 2. Inject debug script into index.html
    index_path = APP_EXTRACTED / "index.html"
    index_content = read_file(index_path)
    
    # Check if already applied
    if 'PokePath TD Infinite Mod — Debug Diagnostics' in index_content:
        log_skip("index.html: Debug script injection")
        return True
    
    # Find the closing </body> tag and inject before it
    debug_script = '''
    <script>
        // PokePath TD Infinite Mod — Debug Diagnostics v1.4.4
        (function() {
            console.log('%c[PokePath Mod v1.4.4] Debug diagnostics loaded', 'color: #70ac4c; font-weight: bold');
            
            window.modDiagnostic = function() {
                // Try to access game state via the global main object
                const main = window.__POKEPATH_MAIN__;
                if (!main) {
                    console.warn('[MOD-DEBUG] Game state not accessible. Try after game fully loads.');
                    return;
                }
                
                const area = main.area;
                const game = main.game;
                const player = main.player;
                const team = main.team;
                
                const info = [
                    '=== PokePath TD Mod Diagnostic ===',
                    `Mod Version: 1.4.4`,
                    `Wave: ${area?.waveNumber || 'N/A'}`,
                    `Endless Mode: ${area?.endlessMode || false}`,
                    `In Challenge: ${JSON.stringify(area?.inChallenge) || false}`,
                    `Wave Active: ${area?.waveActive || false}`,
                    `Auto Wave: ${area?.autoWave || false}`,
                    `Game Stopped: ${game?.stopped || false}`,
                    `Game Loop ID: ${game?.loopId || 'null'}`,
                    `Deploying Unit: ${game?.deployingUnit?.specie?.name?.[0] || 'none'}`,
                    `Active Tile: ${game?.activeTile ? `land=${game.activeTile.land}, tower=${!!game.activeTile.tower}` : 'none'}`,
                    `Placement Tiles: ${area?.placementTiles?.length || 0}`,
                    `Towers Placed: ${area?.towers?.length || 0}`,
                    `Team Size: ${team?.pokemon?.filter(p => p)?.length || 0}`,
                    `Health: ${player?.health?.[area?.routeNumber] || 'N/A'}`,
                    `Gold: ${player?.gold || 0}`,
                    `Auto Reset: ${main.autoReset ?? 'N/A'}`,
                    `Speed Factor: ${game?.speedFactor || 'N/A'}`,
                    `Route: ${area?.routeNumber ?? 'N/A'}`,
                    `Canvas Pointer Events: ${game?.canvas?.style?.pointerEvents || 'N/A'}`,
                    '=================================='
                ];
                
                console.log(info.join('\\n'));
                return info.join('\\n');
            };
            
            // F9 key handler for diagnostic dump
            document.addEventListener('keydown', function(e) {
                if (e.key === 'F9') {
                    e.preventDefault();
                    const result = window.modDiagnostic();
                    if (result) {
                        // Also show as alert for easy screenshot
                        alert(result);
                    }
                }
            });
        })();
    </script>
</body>'''
    
    old_closing = '</body>'
    
    if old_closing in index_content:
        index_content = index_content.replace(old_closing, debug_script)
        write_file(index_path, index_content)
        log_success("index.html: Debug script injected (F9 for diagnostics)")
        return True
    
    log_fail("index.html: Debug script injection", "</body> tag not found")
    return False


# ============================================================================
# MAIN
# ============================================================================
def main():
    print("\n" + "=" * 50)
    print(f"    PokePath TD Mod Applier v{MOD_VERSION}")
    print("=" * 50 + "\n")
    
    # Check for patches folder
    patches_dir = MODS_DIR / "patches"
    if not patches_dir.exists():
        print("ERROR: patches folder not found!")
        print(f"Expected: {patches_dir}")
        print("\nThe patches folder contains the modded game files.")
        return
    
    # Step 1: Ensure vanilla backup
    print("[*] Checking vanilla backup...")
    backup_ok, backup_msg = ensure_vanilla_backup()
    if not backup_ok:
        print(f"\nERROR: {backup_msg}")
        return
    
    # Step 2: Extract fresh from vanilla
    print("\n[*] Extracting vanilla game files...")
    extract_ok, extract_msg = extract_from_vanilla()
    if not extract_ok:
        print(f"\nERROR: {extract_msg}")
        return
    
    # Step 3: Verify game version compatibility
    print("\n[*] Checking game version compatibility...")
    compatible, mismatches = check_game_version_compatibility()
    if compatible:
        print(f"  [OK] Game files match expected version ({MOD_VERSION})")
    else:
        print(f"\n  [WARNING] Game version mismatch detected!")
        print(f"  This mod was built for PokePath TD v{MOD_VERSION}.")
        print(f"  Your game files differ from the expected version:\n")
        for m in mismatches:
            print(f"    - {m}")
        print(f"\n  The mod may not work correctly. Features like placement,")
        print(f"  level cap removal, and shinies use full file replacements")
        print(f"  that are tied to a specific game version.\n")
        response = input("  Continue anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("\n  Installation cancelled. Update your game or download")
            print("  the correct mod version for your game.")
            return

    print("\n[*] Applying all mods...\n")
    
    # Apply all mods in order
    apply_devtools()  # Enable F12/Ctrl+Shift+I for debugging
    _ensure_game_modded()  # Install Game.modded.js base
    apply_speed_mod()  # Patch in 10x speed options
    apply_pause_micromanagement()  # Patch in pause micro
    apply_text_continue_option()
    apply_menu_autoreset_range()
    apply_map_record_uncap()
    apply_shiny_eggs()
    apply_shiny_starters()
    apply_shiny_reveal()
    apply_endless_mode()
    apply_item_tooltips()
    apply_ui_mods()
    apply_pokemon_mods()
    apply_pokemonscene_mods()
    apply_endless_waves()
    apply_endless_checkpoints()
    apply_enemy_scaling()
    apply_tower_deltatime()
    apply_projectile_scaling()
    apply_box_expansion()
    apply_profile_endless_stats()
    # apply_expanded_egg_list()  # REMOVED v1.4.4b -- all 17 were vanilla-obtainable
    
    # Copy pre-generated shiny sprites for non-max evolutions
    apply_shiny_sprites()
    
    # Patch secret/hidden Pokemon with 1/30 shiny chance
    apply_secret_shiny()
    
    # Fix challenge level cap bug
    apply_challenge_levelcap_fix()
    
    # QoL: Preserve party lineup when starting challenges
    apply_challenge_party_preserve()
    
    # QoL: Attack type sort in box
    apply_attacktype_sort()
    
    # QoL: Gold cap and display
    apply_gold_cap_increase()
    apply_gold_display_format_player()
    apply_gold_display_format_ui()
    
    # QoL: Live profile stats
    apply_profile_live_update()
    
    # Fix emoji rendering in pixel font
    apply_emoji_font_fix()
    apply_ui_emoji_font_fix()
    
    # Unlock hidden items (Magma Stone)
    apply_hidden_items()
    
    # Allow duplicate Pokemon IDs on team (Cherubi/Cherrim etc.)
    apply_allow_dupes()
    
    # Apply debug diagnostics
    apply_debug_diagnostics()
    
    # Apply userData redirect (modded saves isolation)
    apply_modded_userdata_redirect()
    
    print()
    print("=" * 50)
    print(f"  Applied: {len(applied_mods)}")
    print(f"  Failed:  {len(failed_mods)}")
    print("=" * 50)
    
    if failed_mods:
        print("\nFailed mods:")
        for mod in failed_mods:
            print(f"  - {mod}")
    
    # Repack
    print("\n[*] Repacking game...")
    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    
    try:
        # Use cmd.exe on Windows to bypass PowerShell execution policy issues
        if sys.platform == 'win32':
            cmd = ['cmd', '/c', 'npx', 'asar', 'pack', 
                   str(APP_EXTRACTED), 
                   str(APP_ASAR)]
        else:
            cmd = ['npx', 'asar', 'pack', 
                   str(APP_EXTRACTED), 
                   str(APP_ASAR)]
        
        result = subprocess.run(
            cmd,
            capture_output=True, 
            text=True,
            timeout=300,  # 5 minute timeout
            creationflags=creationflags
        )
        
        # Check for PowerShell execution policy error
        if 'cannot be loaded because running scripts is disabled' in result.stderr:
            print("  [ERROR] PowerShell is blocking scripts. Try running from Command Prompt (cmd.exe)")
        elif result.returncode == 0:
            print("  [OK] Game repacked successfully!")
            # Set mod flag so GUI installer knows game is modded
            try:
                from lib import save_manager
                save_manager.set_mod_flag()
            except Exception:
                pass
            # Write installed features manifest (all features when using main())
            try:
                import json
                all_features = list(MOD_FEATURES.keys())
                features_path = MODS_DIR / 'installed_features.json'
                with open(features_path, 'w') as f:
                    json.dump(all_features, f)
            except Exception:
                pass
        else:
            print(f"  [ERROR] Repack failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        print("  [ERROR] Repack timed out after 5 minutes")
    except FileNotFoundError:
        print("  [ERROR] npx/asar not found - make sure Node.js is installed")
    
    print("\n=== All done! Launch the game. ===")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description='PokePath TD Mod Applier')
    parser.add_argument('--features', type=str, help='Comma-separated feature keys to install (e.g. speed,devtools,pause_micro)')
    parser.add_argument('--reset', action='store_true', help='Reset game to vanilla')
    parser.add_argument('--list', action='store_true', help='List available feature keys')
    args = parser.parse_args()
    
    if args.list:
        print("Available features:")
        for key, feat in MOD_FEATURES.items():
            print(f"  {key:20s} - {feat['name']}")
        sys.exit(0)
    elif args.reset:
        print("\n[*] Resetting to vanilla...")
        extract_ok, msg = extract_from_vanilla()
        if extract_ok:
            # Repack
            import subprocess as _sp
            creationflags = _sp.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
            cmd = ['cmd', '/c', 'npx', 'asar', 'pack', str(APP_EXTRACTED), str(APP_ASAR)] if sys.platform == 'win32' else ['npx', 'asar', 'pack', str(APP_EXTRACTED), str(APP_ASAR)]
            result = _sp.run(cmd, capture_output=True, text=True, timeout=300, creationflags=creationflags)
            if result.returncode == 0:
                print("  [OK] Game reset to vanilla and repacked!")
            else:
                print(f"  [ERROR] Repack failed: {result.stderr}")
        else:
            print(f"  [ERROR] {msg}")
    elif args.features:
        features = [f.strip() for f in args.features.split(',')]
        apply_selected_mods(features)
    else:
        main()
