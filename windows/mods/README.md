<img width="1845" height="566" alt="pokeinfinite2" src="https://github.com/user-attachments/assets/7be40fa2-48fb-459d-8e8a-b1d2fd3de027" />

# PokePath TD: INFINITE - Enhanced Mod Pack v1.5

**Compatible with PokePath TD v1.5.4 on Windows** ✅

A comprehensive mod for PokePath TD that adds endless mode, removes caps, and includes quality-of-life improvements.

> **v1.5 status:** Windows compatibility rebase is now the active target. macOS support is pending a dedicated 1.5 validation pass.
>
> **Install model:** Mix and match features, uninstall any feature later, or fully revert to vanilla from the installer. Vanilla/modded saves stay separate.
>
> **Windows v1.5.4 refresh (2026-04-21):**
> - Save Editor upgrades for item slot editing/manipulation
> - Save Editor route + wave set support
> - Stability/UX polish over the previous v1.5.4 package

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

### 🐱 Hidden Content Notes

- **Magma Stone is now in vanilla 1.5** (no longer a mod-only unlock)
- No additional fully verified hidden item unlocks were added in this pass

### ✨ Shiny System Improvements
- **Shiny Eggs** - 1 in 30 chance when opening eggs (~3.3%)
- **Shiny Starters** - 1 in 30 chance when selecting starter
- **Pre-Packaged Shiny Sprites** - 800+ custom shinies for non-max-evolution Pokemon
- **Shiny Reveal** - ⭐ SHINY! ⭐ prompt with sparkle animation
- **Shinies Have No Level Cap** - Can level to infinity unlike regular Pokemon

### 💀 Shiny Enemy Variant
- **1 in 1,000 Shiny Enemies/Bosses** - Rare shiny combat variants can appear naturally
- **Gameplay Bonus Variant** - +50% HP, +50% armor, 2-heart damage, and 1000x gold
- **Profile Tracking** - Records shiny enemies defeated in the Profile screen

### 🔧 Quality of Life
- **Item Tooltips** - Hover over items in the selection panel to see descriptions
- **Save/Load Tooltips** - Hover over team save/load buttons for labels
- **Challenge Party Preserve** - Team lineup, items, and tower positions are saved and restored when entering/leaving challenges
- **Attack Type Sorting** - Sort your box by Attack Type (AOE, Aura, Single) with colored labels
- **Unlockables Profile Tab** - Profile screen now includes a scrollable unlockables view with verified secrets and challenge rewards
- **Live Profile Updates** - Profile stats refresh while the menu is open, including shiny enemy defeat tracking

### 🐛 Vanilla Bug Fixes
- **Tower Placement Persistence** - Tower positions are saved and restored on load
- **Off-Screen Projectile Fix** - Projectiles no longer chase enemies that are off-screen
- **Challenge Level Cap Fix** - Level cap no longer boosts low-level Pokemon instead of only capping high-level ones
- **Shiny Ditto Fix** - Untransformed shiny Ditto now correctly displays its blue sprite
- **Projectile Retargeting Fix** - Projectiles only retarget enemies within the firing tower's range
- **Shell Bell & Clefairy Doll Compatibility Guard** - Preserves intended trigger behavior and stays aligned with vanilla 1.5 tracking

### ⚡ Performance Optimizations
- **Delta Time Accuracy** - High-speed attacks process correctly at 5x/10x speed
- **Squared Distance Checks** - Replaces expensive sqrt calculations in range detection, targeting, and aura checks
- **Optimized Game Loop** - Cached references, batch enemy removal, and eliminated redundant array scans
- **Reduced Garbage Collection** - Object reuse for enemy/projectile positions instead of creating new objects every frame
- **Single-Pass Aura Detection** - Tower aura checks consolidated from multiple passes to one
- **Throttled UI Updates** - Damage display updates every 5 frames instead of every frame
- **Sub-Step Draw Skipping** - Enemies only draw on the final sub-step, not every physics tick
- **Cached Tower Rendering** - Reuses temp canvases for tinted tower sprites instead of creating new ones each frame
- **Power Recalculation Throttling** - Tower stats recalculate once per frame instead of every sub-step

---

## 💾 Save Editor

A graphical save editor with full control over your game:

### Global Actions
- **Unlock All Pokemon** - Adds all base forms (Lv1)
- **Max All Levels** - Evolves all and sets to Lv100
- **Complete All Stages** - Grants 1200 stars
- **Max Gold** - Sets gold to 99,999,999
- **Reset Egg Shop** - Restocks all eggs
- **Delete All Pokemon** - Clears team and box

### Individual Pokemon
- **Edit Level** - Set any level (1-9999+)
- **Change Species** - Swap to any Pokemon (1.5 roster synced, including newer added species)
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
| **v1.5.4** (Latest) | Windows | PokePath TD 1.5.4 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.5.4) |
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
> **⚠️ Python 3.14 Note:** If you're on mod version v1.4.1 or older, Python 3.14 is **not compatible**. Either update to the latest Windows release (v1.5.4) or use Python 3.12/3.13 instead.
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

## 📋 Release Notes (Windows v1.5.4)

This release notes section covers the main additions delivered across the Windows 1.5 update track.

### New and Expanded Features
- Endless mode flow improvements (continue/restart behavior, wave progression beyond 100, checkpoint support)
- Infinite-level gameplay scaling updates for cost/stat progression and late-wave pacing
- Dedicated **Shiny Enemies** feature path with profile tracking
- Expanded shiny sprite coverage for non-max-evolution species
- Unlockables/Profile improvements, including challenge reward and secret tracking support
- Orbital direction behavior aligned with vanilla 1.5.3+ expectations

### Save Editor Improvements
- 1.5 roster refresh and broader species compatibility handling
- Runtime sprite fallback support for newer species
- Item-slot editing/manipulation tools in the Items tab
- Route and wave setter support for save progression editing
- Stability and UX polish pass for item/pokemon editing workflows

### Compatibility + Installer
- Windows compatibility rebases through game version 1.5.4
- Updated installer compatibility fingerprints and diagnostics metadata
- Continued support for feature mix-and-match install, selective uninstall, and vanilla restore flow

### Included Bug Fixes
- Off-screen projectile targeting constraints
- Projectile retargeting range safety checks
- Challenge mode level-cap behavior corrections
- Tower placement persistence and related UI/QoL fixes included in the 1.5 patch line

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

- **Mod Development** — [Jay Arnold](https://instagram.com/jayarnoldproduces) | [itch.io](https://jay-arnold.itch.io) | [YouTube](https://www.youtube.com/@jayarnoldproduces)
- **Original Game** — [PokePath TD](https://khydra98.itch.io/pokepath) by [Khydra](https://khydra98.itch.io)
- **Pokemon** — © Nintendo, Game Freak, Creatures Inc.

*This is a fan modification. Not affiliated with Nintendo or the original developers.*
