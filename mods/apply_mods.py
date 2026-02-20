#!/usr/bin/env python3
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

SCRIPT_DIR = Path(__file__).parent.resolve()

# Load version from version.json
def get_version():
    version_file = SCRIPT_DIR / "version.json"
    if version_file.exists():
        with open(version_file, 'r') as f:
            return json.load(f).get('version', '1.4.1')
    return '1.4.1'

MOD_VERSION = get_version()
GAME_ROOT = SCRIPT_DIR.parent
APP_EXTRACTED = GAME_ROOT / "resources" / "app_extracted"
JS_ROOT = APP_EXTRACTED / "src" / "js"

# Track applied mods
applied_mods = []
failed_mods = []

# ============================================================================
# MOD FEATURES - Defines selectable feature groups for the installer GUI
# ============================================================================
MOD_FEATURES = {
    'pause_micro': {
        'name': 'Pause Micromanagement',
        'description': 'Deploy, move, swap, and retire towers while the game is paused',
        'functions': ['apply_pause_micromanagement'],
        'default': True,
    },
    'speed': {
        'name': '10x Speed',
        'description': 'Adds 2x, 3x, 5x, and 10x game speed options',
        'functions': ['apply_speed_mod'],
        'default': True,
    },
    'endless': {
        'name': 'Endless Mode',
        'description': 'Continue past wave 100 with scaling difficulty and checkpoints',
        'functions': ['apply_endless_mode', 'apply_endless_waves', 'apply_endless_checkpoints', 
                      'apply_enemy_scaling', 'apply_profile_endless_stats'],
        'default': True,
    },
    'infinite_levels': {
        'name': 'Infinite Levels',
        'description': 'Remove level 100 cap, asymptotic stat scaling',
        'functions': ['apply_pokemon_mods'],
        'default': True,
    },
    'shiny': {
        'name': 'Shiny Eggs & Starters (1/30)',
        'description': '1 in 30 chance for shiny Pokemon from eggs and starters',
        'functions': ['apply_shiny_eggs', 'apply_shiny_starters', 'apply_shiny_reveal', 'apply_shiny_sprites'],
        'default': True,
    },
    'auto_continue': {
        'name': 'Auto-Continue Option',
        'description': 'Adds "Continue" to auto-reset options for endless mode',
        'functions': ['apply_text_continue_option', 'apply_menu_autoreset_range'],
        'default': True,
    },
    'wave_record': {
        'name': 'Wave Record Uncap',
        'description': 'Display wave records above 100 on the map',
        'functions': ['apply_map_record_uncap'],
        'default': True,
    },
    'ui': {
        'name': 'UI Improvements',
        'description': 'Item tooltips, save/load tooltips, and visual polish',
        'functions': ['apply_item_tooltips', 'apply_ui_mods', 'apply_emoji_font_fix'],
        'default': True,
    },
    'box_expansion': {
        'name': 'Box Expansion (500 slots)',
        'description': 'Expand Pokemon storage from 120 to 500 slots',
        'functions': ['apply_box_expansion'],
        'default': True,
    },
    'egg_shop': {
        'name': 'Expanded Egg Shop',
        'description': 'Add 17 previously missing Pokemon to the egg shop',
        'functions': ['apply_expanded_egg_list'],
        'default': True,
    },
    'deltatime': {
        'name': 'Delta Time Fixes',
        'description': 'Smoother animations and accurate projectile timing',
        'functions': ['apply_tower_deltatime', 'apply_projectile_scaling', 'apply_pokemonscene_mods'],
        'default': True,
    },
    'devtools': {
        'name': 'Developer Tools (F12)',
        'description': 'Enable F12/Ctrl+Shift+I for browser dev tools',
        'functions': ['apply_devtools'],
        'default': True,
    },
    'challenge_fix': {
        'name': 'Challenge Level Cap Fix',
        'description': 'Fix vanilla bug where level cap boosts low-level Pokemon instead of only capping high-level ones',
        'functions': ['apply_challenge_levelcap_fix'],
        'default': True,
    },
    'hidden_items': {
        'name': 'Unlock Hidden Item(s)',
        'description': 'Unlocks 1 hidden item: Magma Stone (doubles burn duration to 20s, 50000g). The game code already supports it!',
        'functions': ['apply_hidden_items'],
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
    
    shiny_src = SCRIPT_DIR / "patches" / "shiny_sprites"
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
				0: ['Off', 'Apagado', 'ArrÃªt', 'Desligado', 'Spento', 'Aus', 'ã‚ªãƒ•', 'ë„ê¸°', 'å…³é—­', 'WyÅ‚.'],
				1: ['Restart', 'Reiniciar', 'Recommencer', 'Reiniciar', 'Ricomincia', 'Neustarten', 'ãƒªã‚¹ã‚¿ãƒ¼ãƒˆ', 'ìž¬ì‹œìž‘', 'é‡æ–°å¼€å§‹', 'Restart'],
				2: ['Retry', 'Reintentar', 'RÃ©essayer', 'Tentar', 'Riprova', 'Wiederholen', 'ãƒªãƒˆãƒ©ã‚¤', 'ìž¬ì‹œë„', 'é‡è¯•', 'PonÃ³w'],
			}"""
    
    new_pattern = """reset: {
				0: ['Off', 'Apagado', 'ArrÃªt', 'Desligado', 'Spento', 'Aus', 'ã‚ªãƒ•', 'ë„ê¸°', 'å…³é—­', 'WyÅ‚.'],
				1: ['Restart', 'Reiniciar', 'Recommencer', 'Reiniciar', 'Ricomincia', 'Neustarten', 'ãƒªã‚¹ã‚¿ãƒ¼ãƒˆ', 'ìž¬ì‹œìž‘', 'é‡æ–°å¼€å§‹', 'Restart'],
				2: ['Retry', 'Reintentar', 'RÃ©essayer', 'Tentar', 'Riprova', 'Wiederholen', 'ãƒªãƒˆãƒ©ã‚¤', 'ìž¬ì‹œë„', 'é‡è¯•', 'PonÃ³w'],
				3: ['Continue', 'Continuar', 'Continuer', 'Continuar', 'Continua', 'Fortsetzen', 'ã¤ã¥ã', 'ê³„ì†', 'ç»§ç»­', 'Kontynuuj'],
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
        new_line = "\n\t\t\t\t3: ['Continue', 'Continuar', 'Continuer', 'Continuar', 'Continua', 'Fortsetzen', 'ã¤ã¥ã', 'ê³„ì†', 'ç»§ç»­', 'Kontynuuj'],"
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
    """Add 1/30 shiny chance when buying eggs - uses full file replacement."""
    path = JS_ROOT / "game" / "core" / "Shop.js"
    content = read_file(path)
    
    # Check if already applied
    if 'isShinyEgg' in content or '1/30' in content:
        log_skip("Shop.js: Shiny eggs")
        return True
    
    # Use full file replacement from patches/Shop.modded.js
    modded_path = SCRIPT_DIR / "patches" / "Shop.modded.js"
    if modded_path.exists():
        copy_modded_file(modded_path, path)
        log_success("Shop.js: Shiny eggs (full file replacement)")
        return True
    
    log_fail("Shop.js: Shiny eggs", "Shop.modded.js not found")
    return False

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
		
		// Shiny symbol - enlarged star positioned in corner
		this.shinySymbol = new Element(this.container, { className: 'dp-scene-shiny-symbol' }).element;
		this.shinySymbol.innerHTML = 'âœ¨';
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
		this.prompt.innerText = this.isShinyReveal ? 'â­ SHINY! â­' : text.shop.new[this.main.lang].toUpperCase();
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
# FINALSCENE.JS - Endless mode continue/restart buttons
# ============================================================================
def apply_endless_mode():
    """Add Continue/Restart buttons and endless mode logic."""
    path = JS_ROOT / "game" / "scenes" / "FinalScene.js"
    content = read_file(path)
    
    # Check if already applied
    if 'continueEndless' in content:
        log_skip("FinalScene.js: Endless mode")
        return True
    
    # This requires extensive changes - use the modded file directly
    modded_file = SCRIPT_DIR / "patches" / "FinalScene.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("FinalScene.js: Endless mode (full file replacement)")
        return True
    
    log_fail("FinalScene.js: Endless mode - modded file not found")
    return False

# ============================================================================
# TOOLTIP.JS - Enhanced item tooltips
# ============================================================================
def apply_item_tooltips():
    """Add enhanced tooltip functionality for items."""
    path = JS_ROOT / "utils" / "Tooltip.js"
    content = read_file(path)
    
    # Check if already applied
    if 'showText' in content:
        log_skip("Tooltip.js: Item tooltips")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "Tooltip.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("Tooltip.js: Item tooltips (full file replacement)")
        return True
    
    log_fail("Tooltip.js: Item tooltips - modded file not found")
    return False

# ============================================================================
# UI.JS - Save/Load tooltips and level cap removal
# ============================================================================
def apply_ui_mods():
    """Apply UI modifications including save/load tooltips and level cap removal."""
    path = JS_ROOT / "game" / "UI.js"
    content = read_file(path)
    
    # Check if already applied
    if 'showText' in content and '// Level cap removed' in content:
        log_skip("UI.js: All mods")
        return True
    
    # Use modded file directly (too many changes)
    modded_file = SCRIPT_DIR / "patches" / "UI.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("UI.js: All mods (full file replacement)")
        return True
    
    log_fail("UI.js: mods - modded file not found")
    return False

# ============================================================================
# GAME.JS - Pause Micromanagement (baked into Game.modded.js)
# ============================================================================
def apply_pause_micromanagement():
    """
    Verify pause micromanagement is present in Game.modded.js.
    
    The fix is baked into Game.modded.js:
    - animate() does NOT return early when stopped
    - totalScaledDelta = 0 when stopped (game freezes but render continues)
    - No 'if (this.stopped)' guards in interaction handlers
    
    This allows deploying, moving, swapping, and retiring towers while paused.
    """
    path = JS_ROOT / "game" / "Game.js"
    
    # If Game.js doesn't exist yet, skip - will be created by apply_speed_mod
    if not path.exists():
        log_skip("Game.js: Pause micromanagement (file not yet installed)")
        return True
    
    content = read_file(path)
    
    # Check that the fix is present (animate doesn't return early on stopped)
    # Look for the comment we added
    if 'PAUSE MICROMANAGEMENT' in content and 'this.stopped ? 0 :' in content:
        # Verify there's NO early return at start of animate
        # The pattern "animate(time) {\n\t    if (this.stopped) return;" should NOT exist
        import re
        bad_pattern = re.search(r'animate\s*\([^)]*\)\s*\{\s*\n\s*if\s*\(\s*this\.stopped\s*\)\s*return\s*;', content)
        if bad_pattern:
            log_fail("Game.js: Pause micromanagement", "animate() still has early return on stopped")
            return False
        
        log_success("Game.js: Pause micromanagement verified")
        return True
    
    # If not present, the file is old - will be fixed when apply_speed_mod runs
    log_skip("Game.js: Pause micromanagement (pending Game.modded.js install)")
    return True

# ============================================================================
# GAME.JS - Speed options 2x/3x/5x/10x
# ============================================================================
def apply_speed_mod():
    """Change speed options to 2x/3x/5x/10x with text display."""
    path = JS_ROOT / "game" / "Game.js"
    content = read_file(path)
    
    # Check if already modded
    if 'speedFactor === 10' in content:
        log_skip("Game.js: Speed mod")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "Game.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("Game.js: Speed mod (full file replacement)")
        return True
    
    log_fail("Game.js: Speed mod - modded file not found")
    return False

# ============================================================================
# POKEMON.JS - Level cap, cost formula, asymptotic speed
# ============================================================================
def apply_pokemon_mods():
    """Apply Pokemon modifications including level cap removal and stat scaling."""
    path = JS_ROOT / "game" / "component" / "Pokemon.js"
    content = read_file(path)
    
    # Check if already applied
    if 'calculateAsymptoticSpeed' in content:
        log_skip("Pokemon.js: All mods")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "Pokemon.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("Pokemon.js: All mods (full file replacement)")
        return True
    
    log_fail("Pokemon.js: mods - modded file not found")
    return False

# ============================================================================
# POKEMONSCENE.JS - Level cap removal from buttons
# ============================================================================
def apply_pokemonscene_mods():
    """Remove level caps from +1/+5/+10 buttons."""
    path = JS_ROOT / "game" / "scenes" / "PokemonScene.js"
    content = read_file(path)
    
    # Check if already applied
    if '// Level cap removed' in content:
        log_skip("PokemonScene.js: Level cap removal")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "PokemonScene.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("PokemonScene.js: Level cap removal (full file replacement)")
        return True
    
    log_fail("PokemonScene.js: mods - modded file not found")
    return False

# ============================================================================
# AREA.JS - Endless wave spawning and power budget
# ============================================================================
def apply_endless_waves():
    """Apply endless mode wave spawning with power budget system."""
    path = JS_ROOT / "game" / "core" / "Area.js"
    content = read_file(path)
    
    # Check if already applied
    if 'POWER BUDGET' in content or 'endlessMode' in content:
        log_skip("Area.js: Endless waves")
        return True
    
    # Use modded file directly (256 lines added!)
    modded_file = SCRIPT_DIR / "patches" / "Area.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("Area.js: Endless waves (full file replacement)")
        return True
    
    log_fail("Area.js: Endless waves - modded file not found")
    return False

# ============================================================================
# DEFEATSCENE.JS - Checkpoints every 50 waves in endless
# ============================================================================
def apply_endless_checkpoints():
    """Apply endless mode checkpoints every 50 waves."""
    path = JS_ROOT / "game" / "scenes" / "DefeatScene.js"
    content = read_file(path)
    
    # Check if already applied
    if 'ENDLESS MODE: Dynamic checkpoint' in content:
        log_skip("DefeatScene.js: Endless checkpoints")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "DefeatScene.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("DefeatScene.js: Endless checkpoints (full file replacement)")
        return True
    
    log_fail("DefeatScene.js: Endless checkpoints - modded file not found")
    return False

# ============================================================================
# ENEMY.JS - Endless HP/armor scaling
# ============================================================================
def apply_enemy_scaling():
    """Apply endless mode enemy HP/armor scaling."""
    path = JS_ROOT / "game" / "component" / "Enemy.js"
    content = read_file(path)
    
    # Check if already applied
    if 'ENDLESS MODE' in content and 'wave > 100' in content:
        log_skip("Enemy.js: Endless scaling")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "Enemy.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("Enemy.js: Endless scaling (full file replacement)")
        return True
    
    log_fail("Enemy.js: Endless scaling - modded file not found")
    return False

# ============================================================================
# TOWER.JS - Delta time accuracy for high-speed attacks
# ============================================================================
def apply_tower_deltatime():
    """Apply delta time accuracy fix for high-speed attacks."""
    path = JS_ROOT / "game" / "component" / "Tower.js"
    content = read_file(path)
    
    # Check if already applied
    if '_skipDraw' in content or 'DELTA TIME FIX' in content:
        log_skip("Tower.js: Delta time fix")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "Tower.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("Tower.js: Delta time fix (full file replacement)")
        return True
    
    log_fail("Tower.js: Delta time fix - modded file not found")
    return False

# ============================================================================
# PROJECTILE.JS - Endless damage calculations
# ============================================================================
def apply_projectile_scaling():
    """Apply endless mode damage calculations."""
    path = JS_ROOT / "game" / "component" / "Projectile.js"
    content = read_file(path)
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "Projectile.modded.js"
    if modded_file.exists():
        # Check if different
        if read_file(path) != read_file(modded_file):
            copy_modded_file(modded_file, path)
            log_success("Projectile.js: Endless scaling (full file replacement)")
        else:
            log_skip("Projectile.js: Already applied")
        return True
    
    log_fail("Projectile.js: modded file not found")
    return False

# ============================================================================
# MAIN.JS - Enable DevTools with F12
# ============================================================================
def apply_devtools():
    """Enable F12 and Ctrl+Shift+I to open DevTools."""
    path = APP_EXTRACTED / "main.js"
    content = read_file(path)
    
    # Check if already applied
    if 'before-input-event' in content and 'toggleDevTools' in content:
        log_skip("main.js: DevTools enabled")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "main.modded.js"
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
    """Expand Pokemon box storage from 103 to 200 slots."""
    path = JS_ROOT / "game" / "scenes" / "BoxScene.js"
    
    if not path.exists():
        log_fail("BoxScene.js: File not found")
        return False
    
    content = read_file(path)
    
    # Check if already expanded
    if "< 200" in content:
        log_skip("BoxScene.js: Box expansion (already 200 slots)")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "BoxScene.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("BoxScene.js: Box expanded to 200 slots")
        return True
    
    # Fallback: direct replacement
    if "< 103" in content:
        content = content.replace("< 103", "< 200")
        write_file(path, content)
        log_success("BoxScene.js: Box expanded to 200 slots (inline)")
        return True
    
    log_fail("BoxScene.js: Box expansion pattern not found")
    return False

# ============================================================================
# PROFILESCENE.JS - Endless mode stats display
# ============================================================================
def apply_profile_endless_stats():
    """Update profile stats for endless mode (no caps, unique species count)."""
    path = JS_ROOT / "game" / "scenes" / "ProfileScene.js"
    
    if not path.exists():
        log_fail("ProfileScene.js: File not found")
        return False
    
    content = read_file(path)
    
    # Check if already applied
    if "countUniqueSpecies" in content:
        log_skip("ProfileScene.js: Endless stats")
        return True
    
    # Use modded file directly
    modded_file = SCRIPT_DIR / "patches" / "ProfileScene.modded.js"
    if modded_file.exists():
        copy_modded_file(modded_file, path)
        log_success("ProfileScene.js: Endless stats (full file replacement)")
        return True
    
    log_fail("ProfileScene.js: modded file not found")
    return False

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
    import re
    pattern = r"export const eggListData = \[[^\]]+\]"
    match = re.search(pattern, content, re.DOTALL)
    if match:
        content = content[:match.start()] + new_egg_list + content[match.end():]
        write_file(path, content)
        log_success("pokemonData.js: Egg list expanded (+17 Pokemon) (regex)")
        return True
    
    log_fail("pokemonData.js: Could not find eggListData to expand")
    return False

# ============================================================================
# SELECTIVE MOD APPLICATION
# ============================================================================
# ============================================================================
# CHALLENGESCENE.JS - Fix level cap boosting low-level Pokemon
# ============================================================================
def apply_challenge_levelcap_fix():
    """Fix vanilla bug: level cap should cap high-level Pokemon, not boost low-level ones."""
    path = JS_ROOT / "game" / "scenes" / "ChallengeScene.js"
    content = read_file(path)

    if 'poke.updateStats()' in content and 'setStatsLevel' not in content:
        log_skip("ChallengeScene.js: Level cap fix")
        return True

    old = "pokemon.forEach(poke => poke.setStatsLevel(capLevel))"
    new = "pokemon.forEach(poke => poke.updateStats())"

    if old in content:
        content = content.replace(old, new)
        write_file(path, content)
        log_success("ChallengeScene.js: Level cap fix (setStatsLevel -> updateStats)")
        return True

    log_fail("ChallengeScene.js: Level cap fix")
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
# ITEMDATA.JS - Unlock hidden/WIP items (Magma Stone)
# ============================================================================
def apply_hidden_items():
    """Uncomment Magma Stone in itemData.js and add it to the shop.
    
    IMPORTANT: Uses brace-depth tracking to handle nested objects (e.g. restriction: {}).
    Do NOT simplify to 'stop at first }' — that breaks nested blocks and causes gray screen.
    See commit 0be5a3c for the bug this fixed.
    """
    path = JS_ROOT / "game" / "data" / "itemData.js"
    content = read_file(path)

    # Check if already applied
    if "\tmagmaStone: {" in content and "// magmaStone" not in content:
        log_skip("itemData.js: Hidden items (Magma Stone already unlocked)")
        return True

    # 1) Uncomment the magmaStone block
    # Each commented line is: \t// \tkey: value  or  \t// },
    # We need to track brace depth to know when the top-level item closes
    lines = content.split('\n')
    in_magma = False
    brace_depth = 0
    new_lines = []
    for line in lines:
        if '// magmaStone: {' in line:
            in_magma = True
            brace_depth = 1
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
        else:
            new_lines.append(line)
    content = '\n'.join(new_lines)

    # 2) Add magmaStone to itemListData shop array
    # Find the itemListData array and add 'magmaStone' before its closing ]
    match = re.search(r"(export const itemListData = \[.*?)(]\s*\n)", content, re.DOTALL)
    if match and "'magmaStone'" not in match.group(1):
        content = content[:match.end(1)] + "\t'magmaStone',\n" + content[match.start(2):]

    write_file(path, content)
    log_success("itemData.js: Magma Stone unlocked and added to shop")
    return True


def apply_selected_mods(selected_features: list, progress_callback=None):
    """
    Apply only selected mod features.
    
    Args:
        selected_features: List of feature keys from MOD_FEATURES
        progress_callback: Optional callback(current, total, message) for GUI progress
    
    Returns:
        tuple: (success: bool, applied: list, failed: list)
    """
    global applied_mods, failed_mods
    applied_mods = []
    failed_mods = []
    
    if not APP_EXTRACTED.exists():
        return False, [], ["Game not extracted - run extraction first"]
    
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
    
    # Repack
    if progress_callback:
        progress_callback(total, total, "Repacking game...")
    
    repack_success = _repack_game()
    
    return repack_success, applied_mods.copy(), failed_mods.copy()

def _repack_game():
    """Repack the game asar. Returns True on success."""
    import subprocess
    import sys
    
    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    
    # Try local repack script first (more reliable)
    repack_script = SCRIPT_DIR / "repack_game.js"
    if repack_script.exists():
        try:
            result = subprocess.run(
                ['node', str(repack_script)],
                capture_output=True,
                text=True,
                timeout=300,
                creationflags=creationflags
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
                   str(GAME_ROOT / 'resources' / 'app.asar')]
        else:
            cmd = ['npx', 'asar', 'pack', 
                   str(APP_EXTRACTED), 
                   str(GAME_ROOT / 'resources' / 'app.asar')]
        
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
# MAIN
# ============================================================================
def main():
    print("\n" + "=" * 50)
    print(f"    PokePath TD Mod Applier v{MOD_VERSION}")
    print("=" * 50 + "\n")
    
    if not APP_EXTRACTED.exists():
        print("ERROR: Game not extracted.")
        print(f"Expected: {APP_EXTRACTED}")
        print("\nRun extraction first:")
        print('  npx asar extract "resources\\app.asar" "resources\\app_extracted"')
        return
    
    # Check for patches folder
    patches_dir = SCRIPT_DIR / "patches"
    if not patches_dir.exists():
        print("ERROR: patches folder not found!")
        print(f"Expected: {patches_dir}")
        print("\nThe patches folder contains the modded game files.")
        return
    
    print("[*] Applying all mods...\n")
    
    # Apply all mods in order
    apply_devtools()  # Enable F12/Ctrl+Shift+I for debugging
    apply_speed_mod()  # Install Game.modded.js (includes pause micromanagement)
    apply_pause_micromanagement()  # Verify pause micro is present
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
    apply_expanded_egg_list()
    
    # Copy pre-generated shiny sprites for non-max evolutions
    apply_shiny_sprites()
    
    # Fix challenge level cap bug
    apply_challenge_levelcap_fix()
    
    # Fix emoji rendering in pixel font
    apply_emoji_font_fix()
    
    # Unlock hidden items (Magma Stone)
    apply_hidden_items()
    
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
    import subprocess
    import sys
    
    # Use proper flags to prevent hanging on Windows
    creationflags = subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    
    try:
        # Use cmd.exe on Windows to bypass PowerShell execution policy issues
        if sys.platform == 'win32':
            cmd = ['cmd', '/c', 'npx', 'asar', 'pack', 
                   str(APP_EXTRACTED), 
                   str(GAME_ROOT / 'resources' / 'app.asar')]
        else:
            cmd = ['npx', 'asar', 'pack', 
                   str(APP_EXTRACTED), 
                   str(GAME_ROOT / 'resources' / 'app.asar')]
        
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
        else:
            print(f"  [ERROR] Repack failed: {result.stderr}")
    except subprocess.TimeoutExpired:
        print("  [ERROR] Repack timed out after 5 minutes")
    except FileNotFoundError:
        print("  [ERROR] npx/asar not found - make sure Node.js is installed")
    
    print("\n=== All done! Launch the game. ===")

if __name__ == "__main__":
    main()
