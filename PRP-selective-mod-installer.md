# PRP: Selective Mod Installation GUI

## Overview
Add a feature selection window that appears when installing mods, allowing users to choose which mod features to apply. All features checked by default, users can uncheck unwanted ones.

## Current State
- `apply_mods.py` applies ALL mods unconditionally
- No GUI for mod installation (users run script directly)
- `save_editor.py` is the main GUI tool but doesn't trigger mod installation

## Proposed Changes

### 1. Add "Install Mods" Button to save_editor.py
Add button to the toolbar that launches the feature selection dialog.

### 2. Create Feature Selection Dialog
A new `ModInstallerDialog` class with:
- Scrollable list of features with checkboxes
- "Select All" / "Deselect All" buttons
- "Install Selected" button
- Feature descriptions for each option

### 3. Feature Groups (User-Facing)
Group individual apply functions into logical features:

| Feature Name | Functions | Default |
|-------------|-----------|---------|
| **10x Speed** | `apply_speed_mod()` | ✓ |
| **Endless Mode** | `apply_endless_mode()`, `apply_endless_waves()`, `apply_endless_checkpoints()`, `apply_enemy_scaling()`, `apply_profile_endless_stats()` | ✓ |
| **Infinite Levels** | `apply_pokemon_mods()` | ✓ |
| **Shiny Eggs & Starters (1/30)** | `apply_shiny_eggs()`, `apply_shiny_starters()`, `apply_shiny_reveal()`, `apply_shiny_sprites()` | ✓ |
| **Auto-Continue Option** | `apply_text_continue_option()`, `apply_menu_autoreset_range()` | ✓ |
| **Wave Record Uncap** | `apply_map_record_uncap()` | ✓ |
| **UI Improvements** | `apply_item_tooltips()`, `apply_ui_mods()` | ✓ |
| **Box Expansion (500 slots)** | `apply_box_expansion()` | ✓ |
| **Expanded Egg Shop** | `apply_expanded_egg_list()` | ✓ |
| **Delta Time Fixes** | `apply_tower_deltatime()`, `apply_projectile_scaling()`, `apply_pokemonscene_mods()` | ✓ |
| **Developer Tools (F12)** | `apply_devtools()` | ✓ |

### 4. Modify apply_mods.py
- Add `apply_selected_mods(selected_features: list)` function
- Keep `main()` for backwards compatibility (CLI usage)
- Export feature definitions for the GUI to use

### 5. Implementation Details

**save_editor.py additions:**
```python
def open_mod_installer(self):
    """Open the selective mod installer dialog."""
    ModInstallerDialog(self)

class ModInstallerDialog(tk.Toplevel):
    def __init__(self, parent):
        # Feature checkboxes
        # Install button
        # Progress display
```

**apply_mods.py changes:**
```python
# Feature definitions (importable)
MOD_FEATURES = {
    'speed': {
        'name': '10x Speed',
        'description': 'Adds 2x, 3x, 5x, and 10x speed options',
        'functions': ['apply_speed_mod'],
    },
    'endless': {
        'name': 'Endless Mode',
        'description': 'Continue past wave 100 with scaling enemies',
        'functions': ['apply_endless_mode', 'apply_endless_waves', ...],
    },
    # ... etc
}

def apply_selected_mods(selected_features: list):
    """Apply only the selected feature groups."""
    # Setup (extract asar if needed)
    # Apply selected features
    # Repack
```

## File Changes
1. `mods/save_editor.py` - Add Install Mods button + ModInstallerDialog class
2. `mods/apply_mods.py` - Add MOD_FEATURES dict + apply_selected_mods() function

## User Flow
1. User opens Save Editor
2. Clicks "Install Mods" in toolbar
3. Feature selection dialog appears (all checked)
4. User unchecks unwanted features (e.g., unchecks everything except "10x Speed")
5. Clicks "Install Selected"
6. Progress shows which mods are being applied
7. Success message, user restarts game

## Notes
- Some features may have dependencies (e.g., Shiny Reveal needs Shiny Eggs)
- Repack only happens once at the end regardless of selections
- CLI `python apply_mods.py` still works and applies all mods (backwards compatible)
