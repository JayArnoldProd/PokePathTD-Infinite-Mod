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

SCRIPT_DIR = Path(__file__).parent.resolve()
GAME_ROOT = SCRIPT_DIR.parent
APP_EXTRACTED = GAME_ROOT / "resources" / "app_extracted"
JS_ROOT = APP_EXTRACTED / "src" / "js"

# Track applied mods
applied_mods = []
failed_mods = []

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
				0: ['Off', 'Apagado', 'Arrêt', 'Desligado', 'Spento', 'Aus', 'オフ', '끄기', '关闭', 'Wył.'],
				1: ['Restart', 'Reiniciar', 'Recommencer', 'Reiniciar', 'Ricomincia', 'Neustarten', 'リスタート', '재시작', '重新开始', 'Restart'],
				2: ['Retry', 'Reintentar', 'Réessayer', 'Tentar', 'Riprova', 'Wiederholen', 'リトライ', '재시도', '重试', 'Ponów'],
			}"""
    
    new_pattern = """reset: {
				0: ['Off', 'Apagado', 'Arrêt', 'Desligado', 'Spento', 'Aus', 'オフ', '끄기', '关闭', 'Wył.'],
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
    pattern = r"(reset:\s*\{\s*\n\s*0:\s*\[[^\]]+\],\s*\n\s*1:\s*\[[^\]]+\],\s*\n\s*2:\s*\[[^\]]+\],)(\s*\n\s*\})"
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
        write_file(path, content)
        log_success("MenuScene.js: Auto-reset range 0-3")
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
    """Add 1/30 shiny chance when buying eggs."""
    path = JS_ROOT / "game" / "core" / "Shop.js"
    content = read_file(path)
    
    # Check if already applied
    if 'isShinyEgg' in content or '1/30' in content:
        log_skip("Shop.js: Shiny eggs")
        return True
    
    # Find the buyEgg function and modify it
    old_pattern = """if (this.main.team.pokemon.length < this.main.player.teamSlots) {
			this.main.team.addPokemon(new Pokemon(pokemon, 1, null, this.main));
			this.main.shopScene.displayPokemon.open(this.main.team.pokemon.at(-1))
		} else {
			this.main.box.addPokemon(new Pokemon(pokemon, 1, null, this.main));
			this.main.shopScene.displayPokemon.open(this.main.box.pokemon.at(-1))
		}"""
    
    new_pattern = """// Create the new Pokemon
		const newPokemon = new Pokemon(pokemon, 1, null, this.main);
		
		// 1/30 chance of being shiny from egg!
		const isShinyEgg = Math.random() < (1/30);
		if (isShinyEgg) {
			newPokemon.isShiny = true;
			newPokemon.setShiny();
		}
		
		if (this.main.team.pokemon.length < this.main.player.teamSlots) {
			this.main.team.addPokemon(newPokemon);
			this.main.shopScene.displayPokemon.open(this.main.team.pokemon.at(-1), isShinyEgg)
		} else {
			this.main.box.addPokemon(newPokemon);
			this.main.shopScene.displayPokemon.open(this.main.box.pokemon.at(-1), isShinyEgg)
		}"""
    
    if old_pattern in content:
        content = content.replace(old_pattern, new_pattern)
        write_file(path, content)
        log_success("Shop.js: Shiny eggs (1/30)")
        return True
    
    log_fail("Shop.js: Shiny eggs")
    return False

# ============================================================================
# NEWGAMESCENE.JS - 1/30 shiny chance for starters
# ============================================================================
def apply_shiny_starters():
    """Add 1/30 shiny chance when selecting starter."""
    path = JS_ROOT / "game" / "scenes" / "NewGameScene.js"
    content = read_file(path)
    
    # Check if already applied
    if 'isShiny' in content and '1/30' in content:
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
		this.shinySymbol.innerHTML = '✨';
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
		this.prompt.innerText = this.isShinyReveal ? '⭐ SHINY! ⭐' : text.shop.new[this.main.lang].toUpperCase();
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
        shutil.copy(modded_file, path)
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
        shutil.copy(modded_file, path)
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
        shutil.copy(modded_file, path)
        log_success("UI.js: All mods (full file replacement)")
        return True
    
    log_fail("UI.js: mods - modded file not found")
    return False

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
        shutil.copy(modded_file, path)
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
        shutil.copy(modded_file, path)
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
        shutil.copy(modded_file, path)
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
        shutil.copy(modded_file, path)
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
        shutil.copy(modded_file, path)
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
        shutil.copy(modded_file, path)
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
        shutil.copy(modded_file, path)
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
            shutil.copy(modded_file, path)
            log_success("Projectile.js: Endless scaling (full file replacement)")
        else:
            log_skip("Projectile.js: Already applied")
        return True
    
    log_fail("Projectile.js: modded file not found")
    return False

# ============================================================================
# MAIN
# ============================================================================
def main():
    print("\n" + "=" * 50)
    print("    PokePath TD Mod Applier v4.0")
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
    apply_text_continue_option()
    apply_menu_autoreset_range()
    apply_map_record_uncap()
    apply_shiny_eggs()
    apply_shiny_starters()
    apply_shiny_reveal()
    apply_endless_mode()
    apply_item_tooltips()
    apply_ui_mods()
    apply_speed_mod()
    apply_pokemon_mods()
    apply_pokemonscene_mods()
    apply_endless_waves()
    apply_endless_checkpoints()
    apply_enemy_scaling()
    apply_tower_deltatime()
    apply_projectile_scaling()
    
    # Copy pre-generated shiny sprites for non-max evolutions
    apply_shiny_sprites()
    
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
    result = subprocess.run(
        ['npx', 'asar', 'pack', 
         str(APP_EXTRACTED), 
         str(GAME_ROOT / 'resources' / 'app.asar')],
        capture_output=True, text=True, shell=True
    )
    if result.returncode == 0:
        print("  [OK] Game repacked successfully!")
    else:
        print(f"  [ERROR] Repack failed: {result.stderr}")
    
    print("\n=== All done! Launch the game. ===")

if __name__ == "__main__":
    main()
