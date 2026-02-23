## PokePath TD: INFINITE v1.4.4

**Compatible with PokePath TD v1.4.4** ✅

### What's New in Latest Update

#### 🔄 Restore Vanilla & Feature Toggling (NEW)
- **Pick and choose features** — select only the mods you want from the installer
- **Re-run anytime** — change your mod configuration without reinstalling the game
- **Restore Vanilla** — deselect all features to fully uninstall the mod and restore original game files
- **Safe & reliable** — the installer backs up your vanilla game files automatically and re-extracts from them every run, so mods never stack or corrupt
- **Save data is never touched** — your progress is always safe

#### Bug Fixes
- **Fixed white/blank screen bug** — itemData.js syntax error (tinyMushroom) that caused crashes on some installs
- **Double-install protection** — all mods now validate before writing to prevent game corruption
- **Defensive checks across all inline mods** — prevents broken output even on edge-case file states

#### Previous Updates
- **Reworked challenge level cap** — Level cap now works as a true maximum: high-level Pokemon are capped down, low-level Pokemon keep their actual level
- **Fixed star emoji rendering** — Stars now display correctly in HUD
- **Fixed challenge unlock in endless mode** — Challenges no longer lock out after surpassing wave 100
- Stripped UTF-8 BOM from all mod files to prevent encoding issues

### What's New in v1.4.4
- Updated for PokePath TD 1.4.4 compatibility
- Merged all 1.4.4 game improvements:
  - 30+ Pokemon stat rebalances (Skeledirge nerf, Torterra Grassy Terrain, etc.)
  - New abilities: Grassy Terrain, Vigilant-Frisk, Armor Breaker Splash
  - Item rebalances: Wide Lens 25%→100%, Leftovers 0.05%→1%
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
- **Expanded Egg Shop** - 17 previously hidden Pokemon added
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
