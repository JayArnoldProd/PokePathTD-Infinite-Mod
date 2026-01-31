<img width="1845" height="566" alt="pokeinfinite2" src="https://github.com/user-attachments/assets/7be40fa2-48fb-459d-8e8a-b1d2fd3de027" />

# PokePath TD: INFINITE - Enhanced Mod Pack v1.4.1

**Compatible with PokePath TD v1.4.1** ✅

A comprehensive mod for PokePath TD that adds endless mode, removes caps, and includes quality-of-life improvements.

> **v1.4.1 Update:** Merged 1.4.1's improved drag-and-drop system with pointer events, plus Silph Scope unequip fix.

---

## 🎮 Features

### ⚡ Speed Options
- **2x / 3x / 5x / 10x** speed (vanilla: 1x, 1.5x, 1.75x)
- Speed button shows current multiplier text

### 📈 Removed Caps
- **Level Cap Removed** - Pokemon can level past 100 (to 9999+)
- **No Star Cap** - Earn as many stars as you physically can
- **Asymptotic Attack Speed** - Speed approaches but never reaches zero at high levels (no negative rates)
                              - with improved delta time accuracy, we can handle a going on at high speeds.

### 🌊 Endless Mode
- **Continue Button** - After beating wave 100, choose to continue to wave 101+
- **Restart Button** - Go back to wave 1 (original behavior)
- **Auto-Continue Option** - New auto-reset setting: `Off | Restart | Retry | Continue`
- **Checkpoints Every 50 Waves** - Die on wave 175? Retry from 150

### ⚖️ Balanced Endless Scaling
- **Upgrade Costs** - Cost = (previous × 1.02) + 8000 past level 100 (caps at 1 Billion)
- **Enemy HP/Armor** - Scales smoothly with power budget system
- **Pokemon Stats** - Asymptotic curves prevent stats from breaking
- **Delta Time Accuracy** - High-speed attacks process correctly

### ✨ Shiny System Improvements
- **Shiny Eggs** - 1 in 30 chance when opening eggs (~3.3%)
- **Shiny Starters** - 1 in 30 chance when selecting starter
- **Pre-Packaged Shiny Sprites** - 212 custom shinies for all non-max-evolution Pokemon
- **Shiny Reveal** - ⭐ SHINY! ⭐ prompt with sparkle animation
- **Shinies Have No Level Cap** - Can level to infinity unlike regular Pokemon

### 🔧 Quality of Life
- **Item Tooltips** - Hover over items in the selection panel to see descriptions
- **Save/Load Tooltips** - Hover over team save/load buttons for labels
- **Improved UI** - Level-up buttons work at any level

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
- **Change Species** - Swap to any Pokemon
- **Evolve / Devolve** - Advance or revert evolution
- **Toggle Shiny** - Make any Pokemon shiny
- **Add / Delete** - Manage roster

### Usage
1. **Close the game first!**
2. Run `PokePath_ModManager.bat`
3. Select "Open Save Editor"
4. Make changes
5. Click "Save to Game"
6. Relaunch game

---

## 📥 Downloads (Windows Only)

| Version | Game Compatibility | Download |
|---------|-------------------|----------|
| **v1.4.1** (Latest) | PokePath TD 1.4.1 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.4.1) |
| v1.4 | PokePath TD 1.4 | [⬇️ Download](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases/tag/v1.4) |

> 💡 **Match your game version!** Check your game's title screen for the version number.

---

## 📦 Installation

**⚠️ WARNING:** Back up your save prior to installation!

### ⚠️ Requirements (Install BOTH before proceeding!)

| Requirement | Download | Why It's Needed |
|-------------|----------|-----------------|
| **Python 3.7+** | [python.org](https://python.org/downloads/) | Runs the mod installer & save editor |
| **Node.js** | [nodejs.org](https://nodejs.org) | Extracts and repacks game files |

> **🔴 IMPORTANT:** When installing Python, **check the box that says "Add Python to PATH"** — this is required!
>
> To verify installation, open Command Prompt and run:
> ```
> python --version
> node --version
> ```
> Both should show version numbers. If either says "not found", reinstall and make sure to add to PATH.

### Steps
1. **Download** — Click the green **Code** button → **Download ZIP**, or download from [Releases](https://github.com/JayArnoldProd/PokePathTD-Infinite-Mod/releases)

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

5. **Click "Install Mods"**

6. **Restart the game** — enjoy!

---

## 📋 Full Changelog

### Game Modifications
| File | Changes |
|------|---------|
| `Game.js` | Speed options 2x/3x/5x/10x with text display |
| `Pokemon.js` | Level cap removed, asymptotic speed scaling, cost formula |
| `UI.js` | Level-up button works past 100, item/save tooltips |
| `PokemonScene.js` | +1/+5/+10 buttons work at any level, no MAX display |
| `Area.js` | Endless mode flag, power budget wave spawning |
| `DefeatScene.js` | Checkpoints every 50 waves in endless |
| `FinalScene.js` | Continue/Restart buttons, auto-continue logic |
| `Shop.js` | 1/30 shiny egg chance |
| `ShopScene.js` | Shiny reveal display with sparkle |
| `NewGameScene.js` | 1/30 shiny starter chance |
| `MenuScene.js` | Auto-reset has 4 options (Off/Restart/Retry/Continue) |
| `text.js` | "Continue" text in all languages |
| `Enemy.js` | Endless HP/armor scaling |
| `Tower.js` | Delta time accuracy for high-speed attacks |
| `Projectile.js` | Endless damage calculations |
| `Tooltip.js` | Enhanced tooltip for items |

### Shiny Sprite Generation
- Auto-detects color mappings from existing shiny sprites
- Generates accurate shinies for ~100 non-evolved Pokemon
- Preserves original game shinies for fully-evolved Pokemon

---

## ⚠️ Important Notes

- **Close the game** before using the save editor
- **First run extracts game files** (takes a moment)
- **Mods are applied to extracted files** then repacked
- **Restore Vanilla** option available if anything breaks
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
- Open Command Prompt and verify: `node --version` and `python --version`

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
