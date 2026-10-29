<img width="1845" height="566" alt="pokeinfinite2" src="https://github.com/user-attachments/assets/7be40fa2-48fb-459d-8e8a-b1d2fd3de027" />

# PokePath TD: INFINITE - Enhanced Mod Pack v1.7.1

**For PokéPath TD v1.7.1 on Windows.** macOS remains on its older release track.

Endless waves, optional 10x speed, paused micromanagement, shiny improvements and save tools, rebased onto the new game.

**Windows refresh — October 28, 2026**
- Preserves 1.7.1 reward recovery, weather, combat and filter fixes.
- Keeps Unown letter/symbol forms when renaming, saving and reloading.
- Refreshes localized names, item restrictions and editor metadata.
- Keeps every existing Pokémon and remembers your selected features.

**Updating:** Close the game and back up both save profiles and your current installation. Install the official Windows 1.7.1 build, then copy this release's `mods/` folder into it, retaining your `installed_features.json`. The installer needs a **clean 1.7.1** `app.asar.vanilla`; archive the previous version's backup separately. Rerun the installer with your remembered selections. No save reset is needed.

**Egg safety:** Loading the editor does not restock eggs. Ordinary eggs exclude owned evolution lines and secret/challenge rewards. Existing duplicates stay intact, even when new duplicate acquisitions are disabled. Fresh installs default duplicate permission off.

**Vanilla overlap:** The game now supplies expanded collection storage, more sorting/filtering, item information, cosmetics, weather mechanics and the published balance fixes. INFINITE keeps adaptive storage for extra copies, its additional sorts, localized Unlockables, endless scaling and paused controls. Vanilla also supplies uncapped Moonblast/Amulet Coin scaling and large-gold notation; the mod retains its gold abbreviations. Official art takes priority; supplemental shiny art remains where needed.

---

## 🎮 Features

### ⚡ Speed Options
- **1x / 1.5x / 2x / 3x / 5x / 10x** with the speed feature; otherwise keeps vanilla speeds and the Roses item behavior
- Speed button shows current multiplier text

### 📈 Removed Caps
- **Shiny Level Cap Removed** - Shiny Pokémon can level past 100; ordinary Pokémon retain their level-100 cap
- **Star Bonuses** - Preserves vanilla Moonblast and Amulet Coin scaling; Star Candy retains its current 140-range bonus cap. Ordinary-route stars still come from waves 1–100.
- **Readable Gold Totals** - Localized billion-through-decillion names instead of scientific notation; preserves the underlying gold amount
- **Orbital Speed Scaling** - Extends orbital motion and count scaling beyond level 100 while preserving new weather and ability effects

### 🌊 Endless Mode
- **Continue Button** - After beating wave 100, choose to continue to wave 101+
- **Restart Button** - Go back to wave 1 (original behavior)
- **Auto-Continue Option** - New auto-reset setting: `Off | Restart | Retry | Continue`
- **Checkpoints Every 50 Waves** - Die on wave 175? Retry from 150

### ⚖️ Balanced Endless Scaling
- **Upgrade Costs** - Cost = (previous × 1.02) + 8000 past level 100 (caps at 1 Billion)
- **Enemy HP/Armor** - Scales smoothly with power budget system
- **Enemy Speed Scaling** - Enemies gradually get faster in endless mode (logarithmic curve)
- **Pokemon Stats** - Asymptotic curves prevent stats from breaking

### ✨ Shiny System Improvements
- **Shiny Eggs** - 1 in 30 chance when opening eggs (~3.3%)
- **Shiny Starters** - 1 in 30 chance when selecting starter
- **Shiny Sprite Coverage** - Official art plus supplemental sprites for supported earlier evolutions and forms
- **Shiny Reveal** - Animated star on shiny rewards while preserving official reward text
- **Shinies Have No Level Cap** - Can level to infinity unlike regular Pokemon

### 💀 Shiny Enemy Variant
- **1 in 1,000 Shiny Enemies/Bosses** - Rare shiny combat variants can appear naturally
- **Gameplay Bonus Variant** - +100% HP (x2), +100% armor (x2), 2-heart damage, and 1000x gold
- **Profile Tracking** - Records shiny enemies defeated in the Profile screen

### 🔧 Quality of Life
- **Save/Load Button Labels** - Quick labels for team save/load buttons; saved-team Pokémon/item sprite tooltips are provided by vanilla 1.7.1
- **Attack Type/Shape Sorting** - Sort your box by Attack Type (AOE, Aura, Single, Orbital) or Attack Shape (Circle, Donut, Cross, X, Line); vanilla 1.7.1 provides its own attack/field indicators and target-mode guards
- **Unlockables Profile Tab** - Profile screen tracks every challenge reward, all 63 secret Pokémon, all 7 secret maps, two hidden items, and the welcome gift with verified unlock conditions
- **Live Profile Updates** - Profile stats refresh while the menu is open, including shiny enemy defeat tracking

### 🐛 Vanilla Bug Fixes
- **Tower Placement Persistence** - Tower positions are saved and restored on load
- **Challenge Level Cap Fix** - Level cap no longer boosts low-level Pokemon instead of only capping high-level ones
- **Shiny Ditto Fix** - Untransformed shiny Ditto now correctly displays its blue sprite
- **Projectile Retargeting Fix** - Projectiles only retarget enemies within the firing tower's range
- **Shell Bell & Clefairy Doll Compatibility Guard** - Preserves intended trigger behavior and stays aligned with vanilla 1.7.1 tracking

### ⚡ Performance Optimizations
- **Delta Time Accuracy** - High-speed attacks process correctly at 5x/10x speed
- **Squared Distance Checks** - Replaces expensive sqrt calculations in range detection, targeting, and aura checks
- **High-Speed Game Loop** - Sub-step simulation and precomputed Snow Cloak candidates
- **Sub-Step Draw Skipping** - Enemies only draw on the final sub-step, not every physics tick
- **Power Recalculation** - Retains vanilla 1.7.1’s simulation-time throttling

---

## 💾 Save Editor

A graphical save editor with full control over your game:

### Global Actions
- **Unlock All Pokemon** - Adds all base forms (Lv1)
- **Max All Levels** - Evolves all and sets to Lv100
- **Complete All Stages** - Grants 4000 stars across the 40 normal routes
- **Max Gold** - Sets gold to the selected ruleset's cap (about 9 quadrillion with QoL enabled)
- **Reset Egg Shop** - After confirmation, restores only unowned vanilla egg lines and resets the egg price; does not add secret/challenge rewards or change Pokémon
- **Delete All Pokemon** - Clears team and box

### Individual Pokemon
- **Edit Level** - Set any level (1-9999+)
- **Change Species** - Swap to any Pokemon in the complete 1.7.1 roster
- **Evolve / Devolve** - Advance or revert evolution
- **Toggle Shiny** - Make any Pokemon shiny
- **Add / Delete** - Manage roster
- **Runtime Sprite Fallback** - Newer 1.5 species render even when not in bundled sprite patch folders

### Items + Progress Controls
- **Item Slot Editing** - Add/manipulate inventory item slots from the Items tab
- **Route/Wave Setters** - Directly set route and wave values in save data

### Usage
1. **Close the game first!**
2. Run `PokePath_ModManager.bat`
3. Select "Open Save Editor"
4. Make changes
5. Click "Save to Game"
6. Relaunch game

---

## 🔄 Restore Vanilla / Change Features
You can **re-run the installer at any time** to change your mod configuration:
- **Add/remove individual features** — just check/uncheck and reinstall
- **Fully uninstall the mod** — deselect all features and the button changes to **"Restore Vanilla"**, which restores your game to its original unmodded state
- **Your save data is always safe** — saves are stored separately and never touched by the installer
- **No need to reinstall the game** — the installer keeps a backup of your vanilla game files and re-extracts from it every time, so you can freely switch between modded and unmodded

---

## 📥 Downloads

| Version | Platform | Game Compatibility | Download |
|---------|----------|-------------------|----------|
| **v1.7.1** (Latest) | Windows | PokePath TD 1.7.1 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.7.1) |
| v1.6.1 | Windows | PokePath TD 1.6.1 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.6.1) |
| v1.5.9 | Windows | PokePath TD 1.5.9 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.5.9) |
| v1.5.6 | Windows | PokePath TD 1.5.6 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.5.6) |
| v1.5.5 | Windows | PokePath TD 1.5.5 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.5.5) |
| v1.5.4 | Windows | PokePath TD 1.5.4 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.5.4) |
| v1.5.3 | Windows | PokePath TD 1.5.3 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.5.3) |
| v1.5.2 | Windows | PokePath TD 1.5.2 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.5.2) |
| **v1.4.4** (older) | Windows | PokePath TD 1.4.4 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.4.4) |
| **v1.4.4** (older) | macOS | PokePath TD 1.4.4 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.4.4) |
| v1.4.3 | Windows | PokePath TD 1.4.3 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.4.3) |
| v1.4.1 | Windows | PokePath TD 1.4.1 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.4.1) |
| v1.4 | Windows | PokePath TD 1.4 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.4) |

> 💡 **Match your game version!** Check your game's title screen for the version number.
> Its HIGHLY recommended to update to the latest game version first!

---

### ⚠️ Requirements (Install BOTH before proceeding!)

| Requirement | Download | Why It's Needed |
|-------------|----------|-----------------|
| **Python 3.7+** (recommended: 3.12 or 3.13) | [python.org](https://python.org/downloads/) | Runs the mod installer & save editor |
| **Node.js** | [nodejs.org](https://nodejs.org) | Extracts and repacks game files |

> **🔴 IMPORTANT:** When installing Python, **check the box that says "Add Python to PATH"** — without this, the mod will not detect Python!
>
> **⚠️ Python 3.14 Note:** If you're on mod version v1.4.1 or older, Python 3.14 is **not compatible**. Either update to the latest Windows release (v1.7.1) or use Python 3.12/3.13 instead.
>
> To verify installation, open Command Prompt and run:
> ```
> python --version
> node --version
> ```
> Both should show version numbers. If either says "not found", reinstall and make sure to add to PATH.
>
## 📦 Installation

> **🚨 If updating from a previous mod version:** Uninstall PokePath TD, reinstall the vanilla game, then install the mod fresh. Do NOT install over a previously modded copy.

**⚠️ WARNING:** Back up your save prior to installation!

### Windows

1. **Download** the Windows zip from [Releases](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases)

2. **Extract the zip** anywhere, then copy the `mods` folder into your game directory:
   ```
   C:\Users\YOUR_NAME\AppData\Local\Programs\pokePathTD_Electron\
   ```

3. **Your game folder should look like this:**
   ```
   pokePathTD_Electron\
   ├── mods\                 ← Copy this folder here!
   │   ├── PokePath_Mod_Installer.pyw
   │   ├── apply_mods.py
   │   └── ...
   ├── resources\
   └── PokéPath TD.exe
   ```

4. **Run `mods\PokePath_Mod_Installer.pyw`** (double-click it)

5. **Select your features** and click **"Install Selected"**

6. **Restart the game** — enjoy!

### macOS

1. **Download** the Mac zip from [Releases](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases)

2. **Unzip** and place the `PokePath-TD-INFINITE-Mac` folder anywhere (Desktop, Documents, etc.)

3. **Double-click `ModManager.command`** to open the mod manager
   - If macOS says it can't be opened: right-click it, choose **Open**, then click **Open** in the dialog

4. Choose **1. Install Mods (GUI)**, select your features, and click **Install Selected**

5. **Launch PokePath TD** — enjoy!

> See `README.md` inside the Mac mod folder for detailed macOS instructions, save editor usage, and troubleshooting.

## 📋 Release Notes (Windows v1.7.1)

- Rebased Windows compatibility onto verified PokéPath TD 1.7.1.
- Preserved new combat, weather, cosmetics, routes, items and reward behavior.
- Expanded localized Unlockables coverage and official normal/shiny art.
- Updated editor Pokémon, item, route and ordinary-egg metadata.
- Fixed paused placement, adaptive box capacity and partial feature compatibility.
- Retained egg-shop ownership protection, existing Pokémon and feature selections.

## ⚠️ Important Notes

- **Close the game** before using the save editor
- **First run extracts game files** (takes a moment)
- **Mods are applied to extracted files** then repacked
- **Your save data is NOT in the mods folder** - it's safe in AppData

---

## 🐛 Troubleshooting

**Installer shows "Not Responding" or does nothing**
- Make sure **Python** is installed: [python.org/downloads](https://python.org/downloads/)
- When installing Python, **check "Add Python to PATH"**
- Restart your computer after installing Python
- Make sure you **extracted the zip** before running (don't run from inside the zip)

**"File not found" or "Directory not found" error**
- Verify the `mods` folder is inside your game folder:
  ```
  pokePathTD_Electron\
  ├── mods\        ← Should be here!
  ├── resources\
  └── PokéPath TD.exe
  ```
- Make sure **Node.js** is installed: [nodejs.org](https://nodejs.org)
- Open **Command Prompt** (not PowerShell) and verify: `node --version` and `python --version`

**PowerShell "scripts disabled" error (npx.ps1 cannot be loaded)**
- This happens because Windows blocks PowerShell scripts by default
- **The installer handles this automatically** by using Command Prompt instead
- If you still have issues, open **Command Prompt (cmd.exe)** instead of PowerShell
- Or fix PowerShell permanently (run as Admin):
  ```powershell
  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
  ```

**"Node.js NOT FOUND"**
- Install from [nodejs.org](https://nodejs.org)
- Restart your computer after installation

**"Python NOT FOUND" / Nothing happens when clicking installer**
- Install from [python.org/downloads](https://python.org/downloads/)
- **⚠️ Check "Add Python to PATH" during installation!**
- Restart your computer after installation

**Save editor won't load**
- Make sure the game is completely closed
- Check that game folder path is correct
- Verify Python is installed and in PATH

**Shinies not appearing**
- Run "Generate Shiny Sprites" from menu
- Make sure Pillow is installed: `pip install Pillow`

**Game crashes after mod**
- Run "Restore Vanilla" from menu
- Re-apply mods

---

## 📜 Credits

- **Mod by [Jay Arnold](https://www.youtube.com/@jayarnoldproduces)**
- **PokéPathTD by [Khydra](https://khydra98.itch.io/pokepath)**

### Special Thanks
- **[Tok3n Gamer](https://www.youtube.com/@tok3ngamer)** for playtesting and the installation video
- **Pondomatik** for playtesting

- **Pokémon** — © Nintendo, Game Freak, Creatures Inc.

*This is a fan modification. Not affiliated with Nintendo or the original developers.*
