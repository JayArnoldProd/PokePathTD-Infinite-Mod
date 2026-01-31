# PokePath TD: INFINITE - Enhanced Mod Pack v1.4 - made by @JayArnoldProduces (Instagram)

A comprehensive mod for PokePath TD that adds endless mode, removes caps, and includes quality-of-life improvements.

---

## 🎮 Features

### ⚡ Speed Options
- **2x / 3x / 5x / 10x** speed (vanilla: 1x, 1.5x, 1.75x)
- Speed button shows current multiplier text
- Rocket emoji (🚀) at 1x speed

### 📈 Removed Caps
- **Level Cap Removed** — Pokemon can level past 100 (to 9999+)
- **No Star Cap** — Complete all stages for 1200 stars
- **Asymptotic Attack Speed** — Speed approaches but never reaches zero at high levels (no negative rates)

### 🌊 Endless Mode
- **Continue Button** — After beating wave 100, choose to continue to wave 101+
- **Restart Button** — Go back to wave 1 (original behavior)
- **Auto-Continue Option** — New auto-reset setting: `Off | Restart | Retry | Continue`
- **Checkpoints Every 50 Waves** — Die on wave 175? Retry from 150

### ⚖️ Balanced Endless Scaling
- **Upgrade Costs** — Cost = (previous × 1.02) + 8000 past level 100
- **Enemy HP/Armor** — Scales smoothly with power budget system
- **Pokemon Stats** — Asymptotic curves prevent stats from breaking
- **Delta Time Accuracy** — High-speed attacks process correctly

### ✨ Shiny System
- **Shiny Eggs** — 1 in 30 chance when opening eggs (~3.3%)
- **Shiny Starters** — 1 in 30 chance when selecting starter
- **Pre-Packaged Shiny Sprites** — 212 custom shinies for all non-max-evolution Pokemon
- **Shiny Reveal** — ⭐ SHINY! ⭐ prompt with sparkle animation
- **Shinies Have No Level Cap** — Can level to infinity like unlike normal Pokemon

### 🔧 Quality of Life
- **Item Tooltips** — Hover over items in the selection panel to see descriptions
- **Save/Load Tooltips** — Hover over team save/load buttons for labels
- **Improved UI** — Level-up buttons work at any level

---

## 💾 Save Editor

A graphical save editor with full control over your game:

### Global Actions
- **Unlock All Pokemon** — Adds all base forms (Lv1)
- **Max All Levels** — Evolves all and sets to Lv100
- **Complete All Stages** — Grants 1200 stars
- **Max Gold** — Sets gold to 99,999,999
- **Reset Egg Shop** — Restocks all eggs
- **Delete All Pokemon** — Clears team and box

### Individual Pokemon
- **Edit Level** — Set any level (1-9999+)
- **Change Species** — Swap to any Pokemon
- **Evolve / Devolve** — Advance or revert evolution
- **Toggle Shiny** — Make any Pokemon shiny
- **Add / Delete** — Manage roster

### Usage
1. **Close the game first!**
2. Run `PokePath_ModManager.bat`
3. Select "Open Save Editor"
4. Make changes
5. Click "Save to Game"
6. Relaunch game

---

## 📦 Installation

### Requirements
- **Node.js** — [nodejs.org](https://nodejs.org) (for game extraction)
- **Python 3** — [python.org](https://python.org) (for save editor only)

### Steps
1. **Locate your game folder:**
   ```
   C:\Users\YOUR_NAME\AppData\Local\Programs\pokePathTD_Electron\
   ```

2. **Copy the `mods` folder** into the game directory:
   ```
   pokePathTD_Electron\
   ├── mods\                 <-- Put it here
   │   └── PokePath_ModManager.bat
   ├── resources\
   └── pokePathTD.exe
   ```

3. **Run `PokePath_ModManager.bat`**

4. **Select option 1** for fresh install (applies all mods)

5. **Restart the game**

6. **Run the ModManager again to access the Save Editor**

---

## 🔧 Mod Manager Menu

```
1. FRESH INSTALL (All mods + Shinies)
2. Apply Game Mods (speed, level, endless)
3. Generate Shiny Sprites (non-evolved Pokemon)
4. Open Save Editor
5. Repack Game Only
6. Restore Vanilla (from backup)
0. Exit
```

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
- **Your save data is NOT in the mods folder** — it's safe in AppData

---

## 🐛 Troubleshooting

**"Node.js NOT FOUND"**
- Install from [nodejs.org](https://nodejs.org)

**"Python NOT FOUND"**
- Install from [python.org](https://python.org)

**Save editor won't load**
- Make sure the game is completely closed
- Check that game folder path is correct

**Shinies not appearing**
- Run "Generate Shiny Sprites" from menu
- Make sure Pillow is installed: `pip install Pillow`

**Game crashes after mod**
- Run "Restore Vanilla" from menu
- Re-apply mods

---

## 📜 Credits

- **Mod Development** — @JayArnoldProduces
- **Original Game** — PokePath TD by Khydra
- **Pokemon** — © Nintendo, Game Freak, Creatures Inc.

*This is a fan modification. Not affiliated with Nintendo or the original developers.*
