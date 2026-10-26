<img width="1845" height="566" alt="pokeinfinite2" src="https://github.com/user-attachments/assets/7be40fa2-48fb-459d-8e8a-b1d2fd3de027" />

# PokePath TD: INFINITE - Enhanced Mod Pack v1.6.3

**Compatible with PokePath TD v1.6.3 on Windows** ✅

A comprehensive mod for PokePath TD that adds endless mode, removes caps, and includes quality-of-life improvements.

> **v1.6.3 release:** Windows compatibility has been validated on a clean 1.6.3 installation. macOS support remains on its older release track pending a dedicated validation pass.
>
> **Install model:** Mix and match features, uninstall any feature later, or fully revert to vanilla from the installer. Vanilla/modded saves stay separate.
>
> **Windows v1.6.3 refresh (2026-10-26):**
> - Rebases the full mod onto PokePath TD 1.6.3, including the 1.6.2 content expansion and 1.6.3 balance and bug fixes
> - Updates installer checks, the 394-entry save-editor roster, 32 normal routes, sprites, and high-speed tower behavior
> - Audits all 27 secret Pokémon, 6 secret maps, and the hidden welcome gift, with exact Unlockables instructions in all 10 built-in languages

> **New hidden content:** the Board Room entrance is on Route 8-2, outside a challenge while no wave is active. Deploy Kingdra, Vespiquen, Pawniard/Bisharp/Kingambit, or Stakataka on qualifying squares to activate chess pieces and increase damage against Calyrex. Unlockables shows live active-piece progress while in the room.
>
> **Vanilla overlap:** retains both map views, Acquisition sorting, new range/filter indicators, draft restart and the corrected collection counters. The mod keeps its extra sorts, duplicate-aware collection counts, and partial +5/+10 purchases near level 100; shiny Pokémon retain infinite leveling. All new species already ship with official shiny art, which takes precedence over older bundled sprites.
>
> ### 🚨 Updating from a previous mod version? READ THIS!
> **You must install on a clean vanilla game.** Uninstall PokePath TD completely, reinstall the vanilla game from [itch.io](https://khydra98.itch.io/pokepath), then install the mod fresh. Do NOT install over a previously modded game — new features like save isolation and vanilla restore depend on starting from clean game files. Your save data will be preserved automatically.

---

## 🎮 Features

### ⚡ Speed Options
- **2x / 3x / 5x / 10x** speed (vanilla: 1x, 1.5x, 1.75x)
- Speed button shows current multiplier text

### 📈 Removed Caps
- **Level Cap Removed** - Pokemon can level past 100 (to 9999+)
- **No Star Cap** - Earn as many stars as you physically can
- **Gold Cap Raised** - Increased to the safe engine max (~9 quadrillion)
- **Orbital Speed Scaling** - Replaced the unused orbital attack-rate stat with an orbital speed stat that scales infinitely

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
- **Pre-Packaged Shiny Sprites** - 1,360 shiny sprite assets, including 1.6.3 species and non-max evolutions
- **Shiny Reveal** - ⭐ SHINY! ⭐ prompt with sparkle animation
- **Shinies Have No Level Cap** - Can level to infinity unlike regular Pokemon

### 💀 Shiny Enemy Variant
- **1 in 1,000 Shiny Enemies/Bosses** - Rare shiny combat variants can appear naturally
- **Gameplay Bonus Variant** - +100% HP (x2), +100% armor (x2), 2-heart damage, and 1000x gold
- **Profile Tracking** - Records shiny enemies defeated in the Profile screen

### 🔧 Quality of Life
- **Save/Load Button Labels** - Quick labels for team save/load buttons; saved-team Pokémon/item sprite tooltips are provided by vanilla 1.6.3
- **Attack Type/Shape Sorting** - Sort your box by Attack Type (AOE, Aura, Single, Orbital) or Attack Shape (Circle, Donut, Cross, X, Line); vanilla 1.6.3 provides its own attack/field indicators and target-mode guards
- **Unlockables Profile Tab** - Profile screen tracks every challenge reward, all 27 secret Pokémon, all 6 secret maps, and the hidden welcome gift with verified unlock conditions
- **Live Profile Updates** - Profile stats refresh while the menu is open, including shiny enemy defeat tracking

### 🐛 Vanilla Bug Fixes
- **Tower Placement Persistence** - Tower positions are saved and restored on load
- **Challenge Level Cap Fix** - Level cap no longer boosts low-level Pokemon instead of only capping high-level ones
- **Shiny Ditto Fix** - Untransformed shiny Ditto now correctly displays its blue sprite
- **Projectile Retargeting Fix** - Projectiles only retarget enemies within the firing tower's range
- **Shell Bell & Clefairy Doll Compatibility Guard** - Preserves intended trigger behavior and stays aligned with vanilla 1.5 tracking

### ⚡ Performance Optimizations
- **Delta Time Accuracy** - High-speed attacks process correctly at 5x/10x speed
- **Squared Distance Checks** - Replaces expensive sqrt calculations in range detection, targeting, and aura checks
- **High-Speed Game Loop** - Sub-step simulation and precomputed Snow Cloak candidates
- **Reduced Garbage Collection** - Object reuse in enemy/projectile position updates
- **Throttled UI Updates** - Damage display updates every 5 frames instead of every frame
- **Sub-Step Draw Skipping** - Enemies only draw on the final sub-step, not every physics tick
- **Power Recalculation Throttling** - Tower stats recalculate once per frame instead of every sub-step

---

## 💾 Save Editor

A graphical save editor with full control over your game:

### Global Actions
- **Unlock All Pokemon** - Adds all base forms (Lv1)
- **Max All Levels** - Evolves all and sets to Lv100
- **Complete All Stages** - Grants 3200 stars across the 32 normal routes
- **Max Gold** - Sets gold to the selected ruleset's cap (about 9 quadrillion with QoL enabled)
- **Reset Egg Shop** - Restocks all eggs
- **Delete All Pokemon** - Clears team and box

### Individual Pokemon
- **Edit Level** - Set any level (1-9999+)
- **Change Species** - Swap to any Pokemon in the complete 1.6.3 roster
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
| **v1.6.3** (Latest) | Windows | PokePath TD 1.6.3 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.6.3) |
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
> **⚠️ Python 3.14 Note:** If you're on mod version v1.4.1 or older, Python 3.14 is **not compatible**. Either update to the latest Windows release (v1.6.3) or use Python 3.12/3.13 instead.
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

## 📋 Release Notes (Windows v1.6.3)

Windows v1.6.3 is a compatibility refresh for PokePath TD 1.6.3.

- Updated installer compatibility fingerprints and diagnostics metadata for vanilla 1.6.3.
- Rebased the Windows mod package so the existing feature set works on the latest vanilla game build.
- Retains the earlier gray-screen fix and validates every distributed patch and installed game module with strict ES-module parsing.
- Completed a source-level secrets audit and expanded the Profile Unlockables tab to cover all 27 secret Pokémon, all 6 secret maps, and the hidden 25,000-gold welcome gift, including exact conditions translated into every built-in language.

---

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
