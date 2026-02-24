## PokePath TD: INFINITE v1.4.4

**Compatible with PokePath TD v1.4.4**

> :rotating_light: **Updating from a previous mod version?** You must install on a clean vanilla game. Uninstall PokePath TD, reinstall from [itch.io](https://khydra98.itch.io/pokepath), then install the mod fresh. Do NOT install over a previously modded copy — new features depend on clean game files. Your save data is preserved automatically.

### What's New in Latest Update (v1.4.4)

#### :floppy_disk: Save Management (NEW)
- **Vanilla/modded save isolation** - modded game uses a completely separate save folder, so your vanilla progress is never at risk
- **LevelDB API-based save migration** - saves are properly exported and imported using the game's own database format, preventing data corruption (e.g. duplicate starter Pokemon)
- **Save editor auto-detection** - automatically detects whether you're running vanilla or modded and loads the correct save
- **One-click vanilla restore** - restore button in installer to go back to unmodded game instantly

#### :art: UI & Emoji Fixes
- **Fixed emoji rendering in pixel font** - lock, rocket, sparkle, and star icons now render correctly instead of garbled text
- **Fixed shiny reveal display** - "SHINY!" text renders properly with emoji font fallback
- **Fixed egg shop sprite sizing** - Pokemon sprites in shop popup now display at proper 2.5x scale (100px)

#### :no_entry_sign: Removed: Expanded Egg Shop
- **Removed 17 "hidden" Pokemon from egg shop** - all 17 were discoverable through vanilla gameplay (secret clicks, audio codes, route challenges). Adding them to the shop undermined the developer's intended unlock experience and could cause duplicates. They can still be added via the save editor if desired.

#### :wrench: Installer Improvements
- **Restored feature selection dialog** - checklist UI for picking individual mod features works again
- **Fixed Shop.js shiny eggs pattern** - pattern matching updated for v1.4.4 code changes

#### :arrows_counterclockwise: Restore Vanilla & Feature Toggling
- **Pick and choose features** - select only the mods you want from the installer
- **Re-run anytime** - change your mod configuration without reinstalling the game
- **Restore Vanilla** - deselect all features to fully uninstall the mod and restore original game files
- **Safe & reliable** - the installer backs up your vanilla game files automatically and re-extracts from them every run, so mods never stack or corrupt

#### Previous Fixes
- Fixed white/blank screen bug (itemData.js syntax error)
- Double-install protection - all mods validate before writing
- Reworked challenge level cap as true maximum
- Fixed star emoji rendering in HUD
- Fixed challenge unlock in endless mode
- Stripped UTF-8 BOM from all mod files

### Game Compatibility (v1.4.4)
- Updated for PokePath TD 1.4.4 compatibility
- Merged all 1.4.4 game improvements:
  - 30+ Pokemon stat rebalances (Skeledirge nerf, Torterra Grassy Terrain, etc.)
  - New abilities: Grassy Terrain, Vigilant-Frisk, Armor Breaker Splash
  - Item rebalances: Wide Lens 25% to 100%, Leftovers 0.05% to 1%
  - Pause improvements, SPACEBAR keybind, base speed changes
  - New files: ItemController.js, Redeem.js
  - Bug fixes for form saves and calculations
- All endless mode features preserved

### Features
- **10x Speed** - 2x, 3x, 5x, 10x game speed options with sub-stepping for accuracy
- **Endless Mode** - Continue past wave 100 with scaling difficulty
- **Checkpoints** - Every 50 waves in endless mode (100, 150, 200...)
- **No Level Cap** - Pokemon can level past 100 with asymptotic stat scaling
- **Shiny Eggs & Starters** - 1/30 chance (~3.3%)
- **212 Custom Shiny Sprites** - Pre-packaged for non-evolved Pokemon
- **Auto-Continue Option** - 4th auto-reset mode for endless grinding
- ~~Expanded Egg Shop~~ - Removed (all 17 are vanilla-obtainable)
- **Box Expansion** - 200 slots (up from 120)
- **Item Tooltips** - Hover for descriptions
- **Wave Record Uncapped** - Display records above 100

### Installation
1. Extract zip and copy `mods` folder to your game directory
2. Run `mods/PokePath_Mod_Installer.pyw`
3. Select features and click **"Install Selected"**
4. Launch game!
5. To change features or uninstall, just re-run the installer anytime

### Requirements
- Python 3.7+ (with PATH)
- Node.js

[Full instructions in README](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod#readme)
