<img width="1845" height="566" alt="pokeinfinite2" src="https://github.com/user-attachments/assets/7be40fa2-48fb-459d-8e8a-b1d2fd3de027" />

# PokePath TD: INFINITE - Enhanced Mod Pack v1.5

**Compatible with PokePath TD v1.5.4 on Windows** ✅

A comprehensive mod pack for **PokePath TD** that adds endless mode, removes caps, improves quality of life, and includes bug fixes, shiny improvements, and save editing tools.

> **v1.5 status:** Windows compatibility rebase is now the active target. macOS support is pending a dedicated 1.5 validation pass.
>
> **Install model:** Mix and match features, uninstall any feature later, or fully revert to vanilla from the installer. Vanilla/modded saves stay separate.

> ### 🚨 Updating from a previous mod version?
> **Install on a clean vanilla game.** Uninstall PokePath TD completely, reinstall the vanilla game from [itch.io](https://khydra98.itch.io/pokepath), then install the mod fresh. Do **not** install over a previously modded copy.

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
- **Enemy Speed Scaling** - Enemies gradually get faster in endless mode
- **Pokemon Stats** - Asymptotic curves prevent stats from breaking

### 🐱 Hidden Content Notes
- **Magma Stone is now in vanilla 1.5** (no longer a mod-only unlock)
- No additional fully verified hidden item unlocks were added in this pass

### ✨ Shiny System Improvements
- **Shiny Eggs** - 1 in 30 chance when opening eggs
- **Shiny Starters** - 1 in 30 chance when selecting starter
- **Pre-Packaged Shiny Sprites** - Large shiny sprite set for non-max-evolution Pokemon
- **Shiny Reveal** - Special SHINY prompt with sparkle animation
- **Shinies Have No Level Cap** - Can level infinitely unlike regular Pokemon

### 💀 Shiny Enemy Variant
- **1 in 1,000 Shiny Enemies/Bosses**
- **Gameplay Bonus Variant** - +50% HP, +50% armor, 2-heart damage, 1000x gold
- **Profile Tracking** - Shiny enemy defeats are recorded in Profile

### 🔧 Quality of Life
- **Item Tooltips** - Identify items as you hover over them in the inventory slot in the Party UI
- **Save/Load Tooltips** - Never Miss-click save instead of load again!
- **Challenge Party Preserve** - Keep your party when you start a Challenge
- **Attack Type Sorting** - New sorting Mode
- **Unlockables Profile Tab** - See what hidden content can be unlocked and how; keep track of progress
- **Live Profile Updates** - Stats in profile update while the menu is open
- **Tower Placement Persistence** - When you close and open the game, your Tower Placement and Party Remains

### 🐛 Vanilla Bug Fixes
- **Off-Screen Projectile Fix** - Projectiles can now no longer target off screen enemies
- **Challenge Level Cap Fix** - Challenge mode now no longer levels up your pokemon
- **Projectile Retargeting Fix** - Projectiles no longer retarget enemies outside the Tower's range

### ⚡ Performance Optimizations
- **Delta Time Accuracy** at high speed
- **Squared Distance Checks**
- **Optimized Game Loop**
- **Reduced Garbage Collection**
- **Single-Pass Aura Detection**
- **Throttled UI Updates**
- **Sub-Step Draw Skipping**
- **Cached Tower Rendering**
- **Power Recalculation Throttling**

---

## 📥 Downloads

**Latest + fallback releases:**
- **Windows (latest):** [PokePath-TD-INFINITE-Windows-v1.5.4.zip](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.5.4/PokePath-TD-INFINITE-Windows-v1.5.4.zip)
- **Windows (older):** [PokePath-TD-INFINITE-Windows-v1.4.4.zip](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.4.4/PokePath-TD-INFINITE-Windows-v1.4.4.zip)
- **macOS ZIP (older 1.4.4):** [PokePath-TD-INFINITE-Mac-v1.4.4.zip](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.4.4/PokePath-TD-INFINITE-Mac-v1.4.4.zip)
- **macOS DMG (older 1.4.4):** [PokePath-TD-INFINITE-Mac-v1.4.4.dmg](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.4.4/PokePath-TD-INFINITE-Mac-v1.4.4.dmg)

> 💡 **Match your game version.** Windows v1.5.4 targets **PokePath TD 1.5.4**.
> macOS is still on the older **1.4.4** release track for now.

---

## ⚠️ Requirements

- **PokePath TD** ([Download from itch.io](https://khydra98.itch.io/pokepath)) installed at `/Applications/PokePath TD.app`

### Windows
- **Python 3.7+** ([Download Python for Windows](https://www.python.org/downloads/windows/)) (recommended: 3.12 or 3.13)
- **Node.js** ([Download Node.js](https://nodejs.org/en/download))
> **Important:** On Windows, make sure Python is added to PATH during installation.

### macOS
- **Python 3.7+** ([Download Python for macOS](https://www.python.org/downloads/macos/))
- **Node.js 18+** ([Download Node.js](https://nodejs.org/en/download))

---

## 📦 Installation

### Windows

1. Download **`PokePath-TD-INFINITE-Windows-v1.5.4.zip`** from the latest release.
2. Extract it anywhere.
3. Copy the included **`mods`** folder into your game directory:
   ```
   C:\Users\YOUR_NAME\AppData\Local\Programs\pokePathTD_Electron\
   ```
4. Your game folder should look like this:
   ```
   pokePathTD_Electron\
   ├── mods\
   │   ├── PokePath_Mod_Installer.pyw
   │   ├── apply_mods.py
   │   └── ...
   ├── resources\
   └── PokéPath TD.exe
   ```
5. Run `mods\PokePath_Mod_Installer.pyw`
6. Select your features and click **Install Selected**
7. Launch the game

### macOS

1. Download either the **Mac ZIP** or **Mac DMG** from the latest release.
2. Open it and place **`PokePath-TD-INFINITE-Mac`** wherever you want.
3. Double-click **`ModManager.command`**.
4. If macOS blocks it, you will usually see a message like:
   - **`"ModManager.command" can't be opened because it is from an unidentified developer.`**
   - On some macOS versions, the wording may instead say the app was blocked to protect your Mac.
5. Click **OK** on that popup first. This matters, because the **Open Anyway** button usually does **not** appear in Settings until after you dismiss the warning once.
6. Open **System Settings > Privacy & Security**.
7. Scroll down to the **Security** section.
8. Look for a message saying **`"ModManager.command" was blocked from use because it is not from an identified developer.`**
9. Click **Open Anyway**.
10. If macOS asks again, click **Open** to confirm.
11. Choose **Install Mods (GUI)**.
12. Select your features and install.
13. Launch the game.

> For full platform-specific instructions, see:
> - [Windows README](windows/mods/README.md)
> - [macOS README](mac/PokePath-TD-INFINITE-Mac/README.md)

---

## 💾 Save Editor

The mod includes save editing tools for both platforms.

Features include:
- Unlock All Pokemon
- Max All Levels
- Complete All Stages
- Max Gold
- Reset Egg Shop
- Edit or delete individual Pokemon
- Toggle shiny status

**Always close the game first before editing saves.**

---

## 🔄 Restore Vanilla / Change Features

You can re-run the installer any time to:
- add or remove individual features
- reinstall cleanly
- restore vanilla files

Your save data is kept separate and is not overwritten by the installer.

---

## 🐛 Troubleshooting

### Windows
- Make sure **Python** and **Node.js** are installed
- If Python is not detected, reinstall and check **Add Python to PATH**
- If PowerShell blocks scripts, use the provided installer flow or Command Prompt instead

### macOS
- If `.command` files are blocked, try opening them once, click **OK** on the warning, then go to **System Settings > Privacy & Security > Security** and click **Open Anyway**
- The warning often says **`"ModManager.command" can't be opened because it is from an unidentified developer`**, though wording can vary by macOS version
- If the game is installed somewhere else, set the app path manually as described in the Mac README

If something breaks, restore vanilla first, then reinstall the mod fresh.

---

## 📋 Notes

- This repo now includes **both platform builds**:
  - `windows/mods/`
  - `mac/PokePath-TD-INFINITE-Mac/`
- The Windows release intentionally includes a top-level **`mods`** folder so users can drop it directly into the game directory.
- Recommended for Windows: **v1.5.4**.
- Older fallback release: **v1.4.4 (older)**.

---

## Credits

- **PokePath TD** by the original game developer
- **INFINITE Mod** by Jay Arnold
- **macOS port** adapted for Mac compatibility
