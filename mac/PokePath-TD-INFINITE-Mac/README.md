# PokePath TD INFINITE Mod -- macOS Edition

**v1.4.4** | Ported from the original Windows mod to run natively on macOS.

Adds Endless Mode, 10x speed, pause micromanagement, save editor, shiny Pokemon, QoL fixes, and more to PokePath TD.

---

## Prerequisites

Install these before running the mod:

1. **Python 3.7+**
   - Install via [Homebrew](https://brew.sh): `brew install python3`
   - Or download from [python.org](https://www.python.org/downloads/)

2. **Node.js 18+**
   - Install via Homebrew: `brew install node`
   - Or download from [nodejs.org](https://nodejs.org/)

3. **PokePath TD** installed at `/Applications/PokePath TD.app`
   - If installed elsewhere, see [Troubleshooting](#troubleshooting)

---

## Setup

1. **Download** or unzip the mod folder anywhere you like (Desktop, Documents, etc.)
2. That's it -- the mod folder is self-contained. No special location required.

Your folder should look like this:

```
PokePath-TD-INFINITE-Mac/
+-- ModManager.command       <-- DOUBLE-CLICK to manage mods
+-- SaveEditor.command       <-- DOUBLE-CLICK to edit saves
+-- README.md                <-- you are here
+-- _internal/               <-- mod files (don't modify)
```

---

## Installing Mods

1. **Close PokePath TD** if it's running
2. **Double-click `ModManager.command`**
   - If macOS says it can't be opened: right-click it, choose **Open**, then click **Open** in the dialog
3. Choose **1. Install Mods (GUI)**
4. Select which features you want and click **Install Selected**
5. Close the installer and launch PokePath TD

### First Run

On the very first run, the mod will:
- Automatically install Node.js dependencies (takes ~30 seconds)
- Create a backup of your vanilla game files
- Copy your save data to a separate modded save location

---

## Save Editor

1. **Close PokePath TD** if it's running
2. **Double-click `SaveEditor.command`**

Features:
- Complete All Stages (1200 stars)
- Edit gold amount
- View/delete Pokemon
- The game must be **closed** while editing

---

## Restoring Vanilla (Unmodding)

1. Double-click `ModManager.command`
2. Choose **1. Install Mods (GUI)**
3. Click **Restore Vanilla** in the installer window

This restores your game to its original unmodded state. Your modded save data is kept safely -- if you reinstall mods later, your progress will still be there.

---

## "Apple could not verify" Warning

On first use, macOS may show a Gatekeeper warning for a file called `classic-level.node`. This is the LevelDB database driver used to read your game saves. It is safe.

**Fix:** Go to **System Settings > Privacy & Security**, scroll down, and click **Allow Anyway**. Then retry the operation. You only need to do this once.

---

## Save Data

Your vanilla saves are **never modified**. The mod uses a completely separate save location:

| | Location |
| --- | --- |
| **Vanilla saves** | `~/Library/Application Support/pokePathTD_Electron/` |
| **Modded saves** | `~/Library/Application Support/pokePathTD_Electron_modded/` |

On first install, your vanilla save is automatically copied to the modded location. Both saves are kept independently -- you can switch between vanilla and modded freely.

---

## Mod Features

All features can be individually toggled in the installer.

| Feature | Description |
| --- | --- |
| **Endless Mode** | Waves continue past 100 with scaling enemies, bosses, and checkpoints |
| **Infinite Levels** | Pokemon level past 100 with asymptotic stat curves |
| **10x Speed** | Speed options: 1x, 1.5x, 2x, 3x, 5x, 10x |
| **Pause Micro** | Deploy, move, swap, and retire towers while paused |
| **Shiny Pokemon** | 1/30 shiny chance for eggs, starters, and hidden Pokemon |
| **Box Expansion** | 200 Pokemon storage slots (up from 120) |
| **Delta Time Fix** | Sub-stepping simulation, accurate projectile timing |
| **Developer Tools** | F12 / Cmd+Shift+I opens browser DevTools |
| **QoL Improvements** | Gold cap increase, live profile stats, emoji font fix, attack type sort |
| **Vanilla Bug Fixes** | Projectile retargeting, off-screen cleanup, Shell Bell fix, level cap fix |
| **Hidden Items** | Unlocks Magma Stone (doubles burn duration, 50000g) |
| **Allow Duplicates** | Allows same-species Pokemon on a team (e.g. Cherubi + Cherrim) |

---

## Troubleshooting

### Run Diagnostics

Double-click **ModManager.command** and choose **2. Run Diagnostics**. This checks Python, Node.js, game installation, mod files, dependencies, and game version.

### Common Issues

| Problem | Solution |
| --- | --- |
| "can't be opened" when double-clicking .command | Right-click > **Open** > click **Open** in the dialog |
| Game won't launch after modding | Open ModManager, use **Restore Vanilla**, then reinstall |
| "Apple could not verify" popup | System Settings > Privacy & Security > **Allow Anyway** |
| Save editor can't load saves | Make sure PokePath TD is fully closed first |
| Dependencies fail to install | Make sure Node.js is installed: `brew install node` |
| Wrong game version | This mod requires PokePath TD v1.4.4 |
| Game not in /Applications | Set env var before running: `export POKEPATH_APP_BUNDLE="/path/to/PokePath TD.app"` |

---

## Credits

- **PokePath TD** by the original game developer
- **INFINITE Mod v1.4.4** -- original Windows mod
- **macOS Port** -- adapted for Mac compatibility
