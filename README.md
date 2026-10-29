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
- **Enemy Speed Scaling** - Enemies gradually get faster in endless mode
- **Pokemon Stats** - Asymptotic curves prevent stats from breaking

### ✨ Shiny System Improvements
- **Shiny Eggs** - 1 in 30 chance when opening eggs
- **Shiny Starters** - 1 in 30 chance when selecting starter
- **Shiny Sprite Coverage** - Official art plus supplemental sprites for supported earlier evolutions and forms
- **Shiny Reveal** - Special SHINY prompt with sparkle animation
- **Shinies Have No Level Cap** - Can level infinitely unlike regular Pokemon

### 💀 Shiny Enemy Variant
- **1 in 1,000 Shiny Enemies/Bosses**
- **Gameplay Bonus Variant** - +100% HP (x2), +100% armor (x2), 2-heart damage, 1000x gold
- **Profile Tracking** - Shiny enemy defeats are recorded in Profile

### 🔧 Quality of Life
- **Save/Load Button Labels** - Quick labels for the team save/load buttons; saved-team Pokémon/item sprite tooltips are provided by vanilla 1.7.1
- **Attack Type/Shape Sorting** - Sort your box by attack type or attack shape; vanilla 1.7.1 provides its own attack/field indicators and target-mode guards
- **Unlockables Profile Tab** - Track every challenge reward, all 63 secret Pokémon, all 7 secret maps, two hidden items, and the welcome gift with verified unlock conditions
- **Live Profile Updates** - Stats in profile update while the menu is open
- **Built-in Language Support** - Mod-added UI text supports all built-in game languages
- **Tower Placement Persistence** - When you close and open the game, your Tower Placement and Party Remains

### 🐛 Vanilla Bug Fixes
- **Challenge Level Cap Fix** - Challenge mode now no longer levels up your pokemon
- **Projectile Retargeting Fix** - Projectiles no longer retarget enemies outside the Tower's range

### ⚡ Performance Optimizations
- **Delta Time Accuracy** at high speed
- **Squared Distance Checks**
- **Optimized Game Loop**
- **Sub-Step Draw Skipping**
- **Power Recalculation** - Retains vanilla 1.7.1’s simulation-time throttling

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
- Item slot editing/manipulation tools
- Set route and wave values

**Always close the game first before editing saves.**

---

## 🔄 Restore Vanilla / Change Features

You can re-run the installer any time to:
- add or remove individual features
- reinstall cleanly
- restore vanilla files

Your save data is kept separate and is not overwritten by the installer.

---

## 📥 Downloads

**Latest + fallback releases:**
- **Windows (latest 1.7.1):** [PokePath-TD-INFINITE-Windows-v1.7.1.zip](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.7.1/PokePath-TD-INFINITE-Windows-v1.7.1.zip)
- **Windows (older 1.6.1):** [PokePath-TD-INFINITE-Windows-v1.6.1.zip](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.6.1/PokePath-TD-INFINITE-Windows-v1.6.1.zip)
- **Windows (older):** [PokePath-TD-INFINITE-Windows-v1.4.4.zip](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.4.4/PokePath-TD-INFINITE-Windows-v1.4.4.zip)
- **macOS ZIP (older 1.4.4):** [PokePath-TD-INFINITE-Mac-v1.4.4.zip](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.4.4/PokePath-TD-INFINITE-Mac-v1.4.4.zip)
- **macOS DMG (older 1.4.4):** [PokePath-TD-INFINITE-Mac-v1.4.4.dmg](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/download/v1.4.4/PokePath-TD-INFINITE-Mac-v1.4.4.dmg)

> 💡 **Match your game version.** Windows v1.7.1 targets **PokePath TD 1.7.1**.
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

1. Download **`PokePath-TD-INFINITE-Windows-v1.7.1.zip`** from the [v1.7.1 release](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.7.1).
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
- Recommended for Windows: **v1.7.1**.
- Older fallback release: **v1.4.4 (older)**.

---

## 📜 Credits
- **Mod by [Jay Arnold](https://instagram.com/jayarnoldproduces)**
- **PokéPathTD by [Khydra](https://khydra98.itch.io/pokepath)**

### Special Thanks
- **[Tok3n Gamer](https://www.youtube.com/@tok3ngamer)** for playtesting and the installation video
- **Pondomatik** for playtesting

- **Pokémon** — © Nintendo, Game Freak, Creatures Inc.

*This is a fan modification. Not affiliated with Nintendo or the original developers.*
