#!/usr/bin/env python3
"""
PokePath TD Save Editor
- Complete All Stages button (1200 stars)
- Editable Gold
- Delete All Pokemon button
- Global Mods section at top for visibility
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import json
import subprocess
from pathlib import Path

# Load version from version.json
def get_version():
    version_file = Path(__file__).parent / "version.json"
    if version_file.exists():
        with open(version_file, 'r') as f:
            return json.load(f).get('version', '1.4.1')
    return '1.4.1'

MOD_VERSION = get_version()

try:
    from PIL import Image, ImageTk
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

# ============================================================================
# CONSTANTS
# ============================================================================

GRID_COLS = 7
TEAM_SLOTS = 6
BOX_SLOTS = 200  # Increased from 64 to support unlock all
CELL_SIZE = 58  # Fixed cell size

# ============================================================================
# PATH DETECTION
# ============================================================================

def find_paths():
    import os
    script_dir = Path(__file__).parent.resolve()
    
    # Check locations in order: script dir, parent, standard install path
    check_dirs = [
        script_dir,
        script_dir.parent,
        Path(os.environ.get('LOCALAPPDATA', '')) / 'Programs' / 'pokePathTD_Electron',
        Path.home() / 'AppData' / 'Local' / 'Programs' / 'pokePathTD_Electron',
    ]
    
    result = {'game_root': None, 'sprites': None, 'sprites_shiny': None, 'mod_shiny_sprites': None}
    
    # Check for mod's bundled sprites first (works in distributed installs)
    mod_shiny_path = script_dir / 'patches' / 'shiny_sprites'
    if mod_shiny_path.exists():
        result['mod_shiny_sprites'] = mod_shiny_path
    
    mod_normal_path = script_dir / 'patches' / 'normal_sprites'
    if mod_normal_path.exists():
        result['sprites'] = mod_normal_path
    
    for check_dir in check_dirs:
        if check_dir and (check_dir / 'resources').exists():
            # Try extracted folder first (development)
            pokemon_base = check_dir / 'resources' / 'app_extracted' / 'src' / 'assets' / 'images' / 'pokemon'
            if pokemon_base.exists():
                result['game_root'] = check_dir
                result['sprites'] = pokemon_base / 'normal'
                result['sprites_shiny'] = pokemon_base / 'shiny'
                return result
            
            # For distributed installs, we need to extract sprites from asar on first run
            asar_path = check_dir / 'resources' / 'app.asar'
            if asar_path.exists():
                result['game_root'] = check_dir
                # Try to extract sprites to a cache folder
                cache_dir = script_dir / 'sprite_cache'
                if cache_dir.exists():
                    result['sprites'] = cache_dir / 'normal'
                    result['sprites_shiny'] = cache_dir / 'shiny'
                else:
                    # Will extract on first access
                    result['asar_path'] = asar_path
                return result
    
    return result

PATHS = find_paths()
SCRIPT_DIR = Path(__file__).parent
TEMP_SAVE = SCRIPT_DIR / 'current_save.json'
POKEMON_DATA_FILE = SCRIPT_DIR / 'dev' / 'pokemon_data.json'
SAVE_HELPER = SCRIPT_DIR / 'save_helper.js'

# Auto-detect if game is modded (uses separate save location)
def _is_game_modded():
    try:
        from save_manager import is_modded
        return is_modded()
    except Exception:
        # Fallback: check for .modded flag directly
        flag = SCRIPT_DIR.parent / 'resources' / '.modded'
        return flag.exists()

IS_MODDED = _is_game_modded()

# ============================================================================
# SAVE DATA
# ============================================================================

class SaveData:
    def __init__(self):
        self.data = None
        self.source = None
    
    def load_from_game(self) -> bool:
        if not SAVE_HELPER.exists():
            return False
        try:
            cmd = ['node', str(SAVE_HELPER), 'export']
            if IS_MODDED:
                cmd.append('--modded')
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, cwd=str(SCRIPT_DIR),
                encoding='utf-8', errors='replace'
            )
            if result.returncode == 0 and 'OK:' in result.stdout:
                if TEMP_SAVE.exists():
                    with open(TEMP_SAVE, 'r', encoding='utf-8') as f:
                        self.data = json.load(f)
                    self.source = 'game'
                    return True
        except Exception as e:
            print(f"Load error: {e}")
        return False
    
    def save_to_game(self) -> bool:
        if not self.data or not SAVE_HELPER.exists():
            return False
        try:
            with open(TEMP_SAVE, 'w', encoding='utf-8') as f:
                json.dump(self.data, f)
            cmd = ['node', str(SAVE_HELPER), 'import']
            if IS_MODDED:
                cmd.append('--modded')
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, cwd=str(SCRIPT_DIR),
                encoding='utf-8', errors='replace'
            )
            return result.returncode == 0 and 'OK:' in result.stdout
        except Exception as e:
            print(f"Save error: {e}")
        return False
    
    def load_from_file(self, path: Path) -> bool:
        try:
            with open(path, 'r', encoding='utf-8') as f:
                self.data = json.load(f)
            self.source = 'file'
            return True
        except Exception as e:
            print(f"Load error: {e}")
        return False
    
    def export_to_file(self, path: Path) -> bool:
        try:
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(self.data, f, indent=2)
            return True
        except:
            return False
    
    @property
    def save_obj(self):
        return self.data.get('save', self.data) if self.data else {}
    
    @property
    def player(self):
        return self.save_obj.get('player', {})
    
    @property
    def team(self):
        return self.save_obj.get('team', [])
    
    @property
    def box(self):
        return self.save_obj.get('box', [])
    
    def get_pokemon_at_slot(self, slot_index):
        team = self.team
        box = self.box
        if slot_index < TEAM_SLOTS:
            return team[slot_index] if slot_index < len(team) else None
        else:
            box_index = slot_index - TEAM_SLOTS
            return box[box_index] if box_index < len(box) else None
    
    def set_pokemon_at_slot(self, slot_index, pokemon):
        if not self.data:
            return
        save = self.save_obj
        if slot_index < TEAM_SLOTS:
            while len(save['team']) <= slot_index:
                save['team'].append(None)
            save['team'][slot_index] = pokemon
            while save['team'] and save['team'][-1] is None:
                save['team'].pop()
        else:
            box_index = slot_index - TEAM_SLOTS
            while len(save['box']) <= box_index:
                save['box'].append(None)
            save['box'][box_index] = pokemon
            while save['box'] and save['box'][-1] is None:
                save['box'].pop()
    
    def delete_at_slot(self, slot_index):
        if not self.data:
            return
        save = self.save_obj
        if slot_index < TEAM_SLOTS:
            if slot_index < len(save['team']):
                save['team'].pop(slot_index)
        else:
            box_index = slot_index - TEAM_SLOTS
            if box_index < len(save['box']):
                save['box'].pop(box_index)
    
    def set_player(self, key, val):
        if 'save' in self.data:
            self.data['save']['player'][key] = val
        else:
            self.data['player'][key] = val

# ============================================================================
# POKEMON DATA
# ============================================================================

class PokemonData:
    def __init__(self):
        self.data = {}
        self.sprites = {}
        self.all_pokemon = []
        
        if POKEMON_DATA_FILE.exists():
            with open(POKEMON_DATA_FILE, encoding='utf-8') as f:
                self.data = json.load(f)
        
        self.all_pokemon = sorted(self.data.get('allKeys', []))
    
    # Sprite filename mappings for Pokemon with non-standard names
    SPRITE_NAME_MAP = {
        'aegislash': 'aegislashShield',
    }
    
    def get_sprite(self, key, size=48, is_shiny=False):
        if not HAS_PIL:
            return None
        cache_key = f"{key}_{size}_{'shiny' if is_shiny else 'normal'}"
        if cache_key not in self.sprites:
            # Map special sprite names
            sprite_key = self.SPRITE_NAME_MAP.get(key, key)
            
            # Try shiny paths in order of priority
            if is_shiny:
                shiny_paths = []
                # 1. Mod's bundled shiny sprites (always available in distributed installs)
                if PATHS.get('mod_shiny_sprites'):
                    shiny_paths.append(PATHS['mod_shiny_sprites'] / f"{sprite_key}.png")
                # 2. Extracted shiny sprites folder
                if PATHS.get('sprites_shiny'):
                    shiny_paths.append(PATHS['sprites_shiny'] / f"{sprite_key}.png")
                
                for shiny_path in shiny_paths:
                    if shiny_path.exists():
                        try:
                            # Use NEAREST for pixel art to keep crisp edges
                            img = Image.open(shiny_path).resize((size, size), Image.Resampling.NEAREST)
                            self.sprites[cache_key] = ImageTk.PhotoImage(img)
                            return self.sprites[cache_key]
                        except:
                            pass
            
            # Normal sprite (or fallback if shiny not found)
            if PATHS.get('sprites'):
                path = PATHS['sprites'] / f"{sprite_key}.png"
                if path.exists():
                    try:
                        # Use NEAREST for pixel art to keep crisp edges
                        img = Image.open(path).resize((size, size), Image.Resampling.NEAREST)
                        self.sprites[cache_key] = ImageTk.PhotoImage(img)
                    except:
                        self.sprites[cache_key] = None
            else:
                self.sprites[cache_key] = None
        return self.sprites.get(cache_key)
    
    def get_display_name(self, key):
        return key.replace('-', ' ').title()
    
    def get_base_forms(self):
        return self.data.get('baseForms', [])
    
    def get_final_evo(self, key):
        """Get the final evolution of a Pokemon."""
        evos = self.data.get('evolutions', {})
        while key in evos:
            key = evos[key]['evolves_to']
        return key
    
    def get_base_form(self, key):
        """Get the base form of a Pokemon by reversing the evolution chain."""
        evos = self.data.get('evolutions', {})
        # Build reverse lookup: evolved_form -> base_form
        reverse = {v['evolves_to']: k for k, v in evos.items()}
        # Walk backwards to find the base
        while key in reverse:
            key = reverse[key]
        return key
    
    def create_new_pokemon(self, species_key):
        return {
            "specieKey": species_key,
            "lvl": 1,
            "targetMode": "area",
            "favorite": False,
            "isShiny": False,
            "hideShiny": False,
            "isMega": False
        }

# ============================================================================
# POKEMON CELL WIDGET
# ============================================================================

class PokemonCell(tk.Frame):
    """A single Pokemon slot in the grid."""
    
    def __init__(self, parent, slot_index, on_click):
        super().__init__(parent, width=CELL_SIZE, height=CELL_SIZE + 15, bg='#2a2a2a')
        self.pack_propagate(False)
        
        self.slot_index = slot_index
        self.on_click = on_click
        self.is_selected = False
        self.has_pokemon = False
        
        # Sprite canvas (fixed size, no resizing)
        self.sprite_canvas = tk.Canvas(self, width=48, height=48, bg='#2a2a2a', 
                                        highlightthickness=0)
        self.sprite_canvas.pack(pady=(3, 0))
        self.sprite_image = None
        self.sprite_id = None
        
        # Level label
        self.level_label = tk.Label(self, text="", font=('Arial', 8), 
                                     bg='#2a2a2a', fg='#666666')
        self.level_label.pack()
        
        # Bindings
        self.bind('<Button-1>', self._on_click)
        self.sprite_canvas.bind('<Button-1>', self._on_click)
        self.level_label.bind('<Button-1>', self._on_click)
    
    def _on_click(self, event=None):
        self.on_click(self.slot_index)
    
    def set_pokemon(self, sprite_image, level, is_shiny=False):
        """Update cell with Pokemon data."""
        self.has_pokemon = True
        self.sprite_image = sprite_image
        
        # Clear and redraw sprite
        self.sprite_canvas.delete('all')
        if sprite_image:
            self.sprite_id = self.sprite_canvas.create_image(24, 24, image=sprite_image)
        
        # Update level
        color = '#FFD700' if is_shiny else '#FFFFFF'
        self.level_label.config(text=f"Lv{level}", fg=color)
        
        # Set background
        self._update_bg()
    
    def set_empty(self):
        """Set cell as empty slot."""
        self.has_pokemon = False
        self.sprite_image = None
        
        self.sprite_canvas.delete('all')
        self.sprite_canvas.create_text(24, 24, text="+", font=('Arial', 16), fill='#444444')
        self.level_label.config(text="empty", fg='#444444')
        
        self._update_bg()
    
    def set_selected(self, selected):
        """Update selection state."""
        self.is_selected = selected
        self._update_bg()
    
    def _update_bg(self):
        """Update background colors based on state."""
        if self.is_selected:
            bg = '#4a7a4a'
        elif self.has_pokemon:
            bg = '#3c3c3c'
        else:
            bg = '#2a2a2a'
        
        self.config(bg=bg)
        self.sprite_canvas.config(bg=bg)
        self.level_label.config(bg=bg)

# ============================================================================
# MAIN APP
# ============================================================================

class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(f"PokePath TD Save Editor v{MOD_VERSION}")
        self.geometry("1100x800")
        self.configure(bg='#2b2b2b')
        
        self.save = SaveData()
        self.poke_data = PokemonData()
        self.selected_slot = None
        self.cells = {}  # slot_index -> PokemonCell
        
        self.build_ui()
        self.auto_load()
    
    def build_ui(self):
        style = ttk.Style()
        style.theme_use('clam')
        style.configure('TFrame', background='#2b2b2b')
        style.configure('TLabel', background='#2b2b2b', foreground='white')
        style.configure('TLabelframe', background='#2b2b2b', foreground='white')
        style.configure('TLabelframe.Label', background='#2b2b2b', foreground='white')
        style.configure('TButton', padding=5)
        
        main = ttk.Frame(self)
        main.pack(fill='both', expand=True, padx=10, pady=10)
        
        # Toolbar
        toolbar = ttk.Frame(main)
        toolbar.pack(fill='x', pady=(0, 10))
        
        ttk.Button(toolbar, text="Load from Game", command=self.load_game).pack(side='left', padx=2)
        ttk.Button(toolbar, text="Load File", command=self.load_file).pack(side='left', padx=2)
        ttk.Button(toolbar, text="Save to Game", command=self.save_game).pack(side='left', padx=2)
        ttk.Button(toolbar, text="Export", command=self.export).pack(side='left', padx=2)
        
        ttk.Separator(toolbar, orient='vertical').pack(side='left', fill='y', padx=10)
        self.source_label = ttk.Label(toolbar, text="No save loaded", font=('Arial', 10, 'bold'))
        self.source_label.pack(side='left', padx=5)
        
        # Stats
        stats = ttk.LabelFrame(main, text="Player Stats", padding=10)
        stats.pack(fill='x', pady=(0, 10))
        
        self.stat_vars = {}
        
        # Name (display only)
        ttk.Label(stats, text="Name:").grid(row=0, column=0, padx=5, sticky='e')
        self.stat_vars['name'] = tk.StringVar(value="-")
        ttk.Label(stats, textvariable=self.stat_vars['name'], font=('Arial', 11, 'bold')).grid(row=0, column=1, padx=5, sticky='w')
        
        # Gold (editable)
        ttk.Label(stats, text="Gold:").grid(row=0, column=2, padx=5, sticky='e')
        self.gold_var = tk.StringVar(value="0")
        self.gold_entry = ttk.Entry(stats, textvariable=self.gold_var, width=12)
        self.gold_entry.grid(row=0, column=3, padx=5, sticky='w')
        ttk.Button(stats, text="Set", command=self.set_gold, width=5).grid(row=0, column=4, padx=2)
        ttk.Button(stats, text="Max Gold", command=lambda: self.set_gold_value(99999999)).grid(row=0, column=5, padx=5)
        
        # Stars (display only - calculated from records)
        ttk.Label(stats, text="Stars:").grid(row=0, column=6, padx=5, sticky='e')
        self.stars_var = tk.StringVar(value="0")
        ttk.Label(stats, textvariable=self.stars_var, font=('Arial', 11, 'bold')).grid(row=0, column=7, padx=5, sticky='w')
        
        # Content
        content = ttk.Frame(main)
        content.pack(fill='both', expand=True)
        
        # Left - Grid
        left_frame = ttk.LabelFrame(content, text="Pokemon Grid", padding=5)
        left_frame.pack(side='left', fill='both', expand=True, padx=(0, 10))
        
        # Team section
        team_header = tk.Label(left_frame, text="TEAM (6 slots)", font=('Arial', 9, 'bold'), 
                               bg='#2b2b2b', fg='#88ff88')
        team_header.pack(anchor='w', pady=(0, 5))
        
        team_grid = tk.Frame(left_frame, bg='#1e1e1e')
        team_grid.pack(fill='x', pady=(0, 10))
        
        for i in range(TEAM_SLOTS):
            cell = PokemonCell(team_grid, i, self.on_cell_click)
            cell.grid(row=0, column=i, padx=2, pady=2)
            self.cells[i] = cell
        
        # Box section
        box_header = tk.Label(left_frame, text="BOX (200 slots)", font=('Arial', 9, 'bold'), 
                              bg='#2b2b2b', fg='#88ff88')
        box_header.pack(anchor='w', pady=(5, 5))
        
        # Scrollable box frame
        box_container = tk.Frame(left_frame, bg='#1e1e1e')
        box_container.pack(fill='both', expand=True)
        
        box_canvas = tk.Canvas(box_container, bg='#1e1e1e', highlightthickness=0)
        box_scrollbar = ttk.Scrollbar(box_container, orient='vertical', command=box_canvas.yview)
        box_inner = tk.Frame(box_canvas, bg='#1e1e1e')
        
        box_canvas.configure(yscrollcommand=box_scrollbar.set)
        box_scrollbar.pack(side='right', fill='y')
        box_canvas.pack(side='left', fill='both', expand=True)
        
        box_canvas.create_window((0, 0), window=box_inner, anchor='nw')
        box_inner.bind('<Configure>', lambda e: box_canvas.configure(scrollregion=box_canvas.bbox('all')))
        
        # Create box slots
        for i in range(BOX_SLOTS):
            slot_index = TEAM_SLOTS + i
            row = i // GRID_COLS
            col = i % GRID_COLS
            cell = PokemonCell(box_inner, slot_index, self.on_cell_click)
            cell.grid(row=row, column=col, padx=2, pady=2)
            self.cells[slot_index] = cell
        
        # Right - Editor (with scrollbar for small screens)
        right_outer = ttk.Frame(content, width=320)
        right_outer.pack(side='right', fill='y')
        right_outer.pack_propagate(False)
        
        # Create canvas and scrollbar for right panel
        right_canvas = tk.Canvas(right_outer, bg='#2b2b2b', highlightthickness=0, width=300)
        right_scrollbar = ttk.Scrollbar(right_outer, orient='vertical', command=right_canvas.yview)
        right_frame = ttk.Frame(right_canvas)
        
        right_canvas.configure(yscrollcommand=right_scrollbar.set)
        right_scrollbar.pack(side='right', fill='y')
        right_canvas.pack(side='left', fill='both', expand=True)
        
        right_canvas.create_window((0, 0), window=right_frame, anchor='nw')
        right_frame.bind('<Configure>', lambda e: right_canvas.configure(scrollregion=right_canvas.bbox('all')))
        
        # Enable mouse wheel scrolling on right panel
        def on_right_mousewheel(event):
            right_canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        right_canvas.bind_all('<MouseWheel>', on_right_mousewheel)
        
        # Global Mods at top
        mods_frame = ttk.LabelFrame(right_frame, text="Global Mods", padding=8)
        mods_frame.pack(fill='x', pady=(0, 10), padx=5)
        
        # Pokemon form buttons row
        form_row = ttk.Frame(mods_frame)
        form_row.pack(fill='x', pady=1)
        ttk.Button(form_row, text="Evolve All", command=self.evolve_all).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(form_row, text="Devolve All", command=self.devolve_all).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(form_row, text="Toggle Shiny", command=self.toggle_all_shiny).pack(side='left', expand=True, fill='x', padx=1)
        
        ttk.Button(mods_frame, text="Unlock All Pokemon", command=self.unlock_all).pack(fill='x', pady=1)
        ttk.Button(mods_frame, text="Max All Levels (Evolve + Lv100)", command=self.max_all).pack(fill='x', pady=1)
        ttk.Button(mods_frame, text="Complete All Stages (1200 Stars)", command=self.complete_all_stages).pack(fill='x', pady=1)
        ttk.Button(mods_frame, text="Reset Egg Shop", command=self.reset_eggs).pack(fill='x', pady=1)
        ttk.Button(mods_frame, text="Delete All Pokemon", command=self.delete_all).pack(fill='x', pady=1)
        
        ttk.Separator(right_frame, orient='horizontal').pack(fill='x', pady=5, padx=5)
        
        self.selected_label = ttk.Label(right_frame, text="Select a slot", font=('Arial', 12))
        self.selected_label.pack(pady=5, padx=5)
        
        # Sprite display
        self.sprite_display = tk.Canvas(right_frame, width=80, height=80, bg='#1e1e1e', highlightthickness=1)
        self.sprite_display.pack(pady=5, padx=5)
        self.display_sprite = None
        
        # Species
        species_frame = ttk.Frame(right_frame)
        species_frame.pack(fill='x', pady=10, padx=5)
        
        ttk.Label(species_frame, text="Species:").pack(anchor='w')
        self.species_var = tk.StringVar()
        self.species_combo = ttk.Combobox(species_frame, textvariable=self.species_var, state='readonly', width=28)
        self.species_combo['values'] = [''] + [self.poke_data.get_display_name(k) for k in self.poke_data.all_pokemon]
        self.species_combo.pack(fill='x', pady=2)
        self.species_combo.bind('<<ComboboxSelected>>', self.on_species_change)
        
        # Level
        level_frame = ttk.LabelFrame(right_frame, text="Level", padding=10)
        level_frame.pack(fill='x', pady=10, padx=5)
        
        entry_row = ttk.Frame(level_frame)
        entry_row.pack(fill='x', pady=5)
        
        ttk.Label(entry_row, text="Level:").pack(side='left')
        self.level_var = tk.StringVar(value="1")
        self.level_entry = ttk.Entry(entry_row, textvariable=self.level_var, width=8)
        self.level_entry.pack(side='left', padx=5)
        self.level_entry.bind('<Return>', self.on_level_entry)
        ttk.Button(entry_row, text="Set", command=self.on_level_entry, width=5).pack(side='left')
        
        btn_row = ttk.Frame(level_frame)
        btn_row.pack(fill='x', pady=5)
        
        for delta, text in [(-10, "-10"), (-1, "-1"), (1, "+1"), (10, "+10")]:
            ttk.Button(btn_row, text=text, width=5, command=lambda d=delta: self.change_level(d)).pack(side='left', padx=2)
        
        # Slot Actions (individual Pokemon)
        slot_actions = ttk.LabelFrame(right_frame, text="Selected Pokemon", padding=5)
        slot_actions.pack(fill='x', pady=(5, 15), padx=5)
        
        # Row 1: Evolve, Devolve, Toggle Shiny
        action_row1 = ttk.Frame(slot_actions)
        action_row1.pack(fill='x', pady=2)
        ttk.Button(action_row1, text="Evolve", command=self.evolve_pokemon).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(action_row1, text="Devolve", command=self.devolve_pokemon).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(action_row1, text="Toggle Shiny", command=self.toggle_shiny).pack(side='left', expand=True, fill='x', padx=1)
        
        # Row 2: Add Pokemon
        action_row2 = ttk.Frame(slot_actions)
        action_row2.pack(fill='x', pady=2)
        ttk.Button(action_row2, text="Add Pokemon", command=self.add_pokemon).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(action_row2, text="Delete", command=self.delete_pokemon).pack(side='left', expand=True, fill='x', padx=1)
        
        # Status
        self.status = ttk.Label(main, text="Ready", relief='sunken', padding=5)
        self.status.pack(fill='x', side='bottom', pady=(10, 0))
    
    def on_cell_click(self, slot_index):
        """Handle cell click - just update selection, don't rebuild grid."""
        # Deselect old
        if self.selected_slot is not None and self.selected_slot in self.cells:
            self.cells[self.selected_slot].set_selected(False)
        
        # Select new
        self.selected_slot = slot_index
        if slot_index in self.cells:
            self.cells[slot_index].set_selected(True)
        
        # Update editor panel
        self.update_editor()
    
    def auto_load(self):
        self.load_game()
    
    def load_game(self):
        self.status.config(text="Loading...")
        self.update()
        
        if self.save.load_from_game():
            self.source_label.config(text="Game Save")
            self._inject_missing_eggs()
            self.refresh_grid()
            self.status.config(text="Loaded!")
        else:
            self.status.config(text="Failed to load")
            messagebox.showwarning("Load Failed", "Could not load. Is game closed?")
    
    def load_file(self):
        path = filedialog.askopenfilename(filetypes=[("Save files", "*.json *.txt")])
        if path and self.save.load_from_file(Path(path)):
            self.source_label.config(text=f"File: {Path(path).name}")
            self._inject_missing_eggs()
            self.refresh_grid()
    
    def save_game(self):
        if not self.save.data:
            return
        self.status.config(text="Saving...")
        self.update()
        if self.save.save_to_game():
            messagebox.showinfo("Saved", "Save written! Restart game.")
            self.status.config(text="Saved!")
        else:
            messagebox.showerror("Error", "Failed to save")
    
    def export(self):
        path = filedialog.asksaveasfilename(defaultextension=".json")
        if path and self.save.export_to_file(Path(path)):
            messagebox.showinfo("Exported", f"Saved to {path}")
    
    def refresh_grid(self):
        """Refresh all cells with current data."""
        if not self.save.data:
            return
        
        # Update stats
        p = self.save.player
        self.stat_vars['name'].set(p.get('name', '?'))
        self.gold_var.set(str(p.get('gold', 0)))
        self.stars_var.set(str(p.get('stars', 0)))
        
        # Update each cell
        for slot_index, cell in self.cells.items():
            poke = self.save.get_pokemon_at_slot(slot_index)
            
            if poke:
                key = poke.get('specieKey', '?')
                lvl = poke.get('lvl', 1)
                is_shiny = poke.get('isShiny', False)
                sprite = self.poke_data.get_sprite(key, 48, is_shiny)
                cell.set_pokemon(sprite, lvl, is_shiny)
            else:
                cell.set_empty()
            
            # Restore selection state
            cell.set_selected(slot_index == self.selected_slot)
        
        # Update status
        team_count = len(self.save.team)
        box_count = len(self.save.box)
        self.status.config(text=f"Team: {team_count}/6 | Box: {box_count}/200 | Total: {team_count + box_count}")
        
        # Update editor if something selected
        if self.selected_slot is not None:
            self.update_editor()
    
    def update_editor(self):
        """Update the editor panel for selected slot."""
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        
        slot_type = "Team" if self.selected_slot is not None and self.selected_slot < TEAM_SLOTS else "Box"
        slot_num = self.selected_slot if self.selected_slot is not None and self.selected_slot < TEAM_SLOTS else (self.selected_slot - TEAM_SLOTS if self.selected_slot else 0)
        
        # Clear sprite display
        self.sprite_display.delete('all')
        
        if poke:
            key = poke.get('specieKey', '?')
            name = self.poke_data.get_display_name(key)
            is_shiny = poke.get('isShiny', False)
            shiny = " ★" if is_shiny else ""
            self.selected_label.config(text=f"{slot_type} #{slot_num + 1}: {name}{shiny}")
            
            # Show sprite (shiny texture if shiny)
            sprite = self.poke_data.get_sprite(key, 64, is_shiny)
            if sprite:
                self.display_sprite = sprite
                self.sprite_display.create_image(40, 40, image=sprite)
            
            self.species_var.set(name)
            self.level_var.set(str(poke.get('lvl', 1)))
        else:
            self.selected_label.config(text=f"{slot_type} #{slot_num + 1}: Empty")
            self.display_sprite = None
            self.species_var.set('')
            self.level_var.set('1')
    
    def on_species_change(self, event=None):
        if self.selected_slot is None or not self.save.data:
            return
        
        display_name = self.species_var.get()
        if not display_name:
            return
        
        new_key = None
        for k in self.poke_data.all_pokemon:
            if self.poke_data.get_display_name(k) == display_name:
                new_key = k
                break
        
        if new_key:
            poke = self.save.get_pokemon_at_slot(self.selected_slot)
            if poke:
                poke['specieKey'] = new_key
            else:
                new_poke = self.poke_data.create_new_pokemon(new_key)
                self.save.set_pokemon_at_slot(self.selected_slot, new_poke)
            self.refresh_grid()
    
    def on_level_entry(self, event=None):
        if self.selected_slot is None:
            return
        try:
            level = int(self.level_var.get())
            self.set_level(max(1, level))
        except ValueError:
            pass
    
    def change_level(self, delta):
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        if poke:
            new_level = max(1, poke.get('lvl', 1) + delta)
            self.set_level(new_level)
    
    def set_level(self, level):
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        if poke:
            poke['lvl'] = max(1, level)
            self.refresh_grid()
    
    def toggle_shiny(self):
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        if poke:
            poke['isShiny'] = not poke.get('isShiny', False)
            self.refresh_grid()
    
    def evolve_pokemon(self):
        """Evolve selected Pokemon to its final form."""
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        if poke:
            old_key = poke.get('specieKey', '')
            new_key = self.poke_data.get_final_evo(old_key)
            if old_key != new_key:
                poke['specieKey'] = new_key
                self.refresh_grid()
                self.status.config(text=f"Evolved to {self.poke_data.get_display_name(new_key)}!")
            else:
                self.status.config(text="Already fully evolved!")
    
    def devolve_pokemon(self):
        """Devolve selected Pokemon to its base form."""
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        if poke:
            old_key = poke.get('specieKey', '')
            new_key = self.poke_data.get_base_form(old_key)
            if old_key != new_key:
                poke['specieKey'] = new_key
                self.refresh_grid()
                self.status.config(text=f"Devolved to {self.poke_data.get_display_name(new_key)}!")
            else:
                self.status.config(text="Already base form!")
    
    def add_pokemon(self):
        if self.selected_slot is None or not self.save.data:
            messagebox.showinfo("Select Slot", "Click an empty slot first!")
            return
        
        dialog = tk.Toplevel(self)
        dialog.title("Add Pokemon")
        dialog.geometry("300x400")
        dialog.transient(self)
        dialog.grab_set()
        
        ttk.Label(dialog, text="Search and select:").pack(pady=10)
        
        search_var = tk.StringVar()
        search_entry = ttk.Entry(dialog, textvariable=search_var)
        search_entry.pack(fill='x', padx=10)
        
        listbox = tk.Listbox(dialog, height=15)
        listbox.pack(fill='both', expand=True, padx=10, pady=10)
        
        all_names = [(k, self.poke_data.get_display_name(k)) for k in self.poke_data.all_pokemon]
        
        def update_list(*args):
            listbox.delete(0, tk.END)
            search = search_var.get().lower()
            for key, name in all_names:
                if search in name.lower():
                    listbox.insert(tk.END, name)
        
        search_var.trace('w', update_list)
        update_list()
        
        def on_select():
            sel = listbox.curselection()
            if sel:
                name = listbox.get(sel[0])
                for key, n in all_names:
                    if n == name:
                        new_poke = self.poke_data.create_new_pokemon(key)
                        self.save.set_pokemon_at_slot(self.selected_slot, new_poke)
                        self.refresh_grid()
                        dialog.destroy()
                        return
        
        ttk.Button(dialog, text="Add", command=on_select).pack(pady=10)
        listbox.bind('<Double-1>', lambda e: on_select())
        search_entry.focus()
    
    def delete_pokemon(self):
        if self.selected_slot is None or not self.save.data:
            return
        poke = self.save.get_pokemon_at_slot(self.selected_slot)
        if not poke:
            return
        if messagebox.askyesno("Delete", "Delete this Pokemon?"):
            self.save.delete_at_slot(self.selected_slot)
            self.refresh_grid()
    
    def unlock_all(self):
        if not self.save.data:
            return
        existing = set()
        for p in self.save.team + self.save.box:
            if p:
                existing.add(p.get('specieKey'))
        
        count = 0
        for key in self.poke_data.get_base_forms():
            if key not in existing and not key.startswith('mega'):
                new_poke = self.poke_data.create_new_pokemon(key)
                self.save.box.append(new_poke)
                count += 1
        
        self.refresh_grid()
        messagebox.showinfo("Done", f"Added {count} Pokemon!")
    
    def make_all_shiny(self):
        """Make all Pokemon in team and box shiny."""
        if not self.save.data:
            return
        
        count = 0
        # Process team
        for poke in self.save.team:
            if poke and not poke.get('isShiny', False):
                poke['isShiny'] = True
                count += 1
        
        # Process box
        for poke in self.save.box:
            if poke and not poke.get('isShiny', False):
                poke['isShiny'] = True
                count += 1
        
        self.refresh_grid()
        messagebox.showinfo("Done", f"Made {count} Pokemon shiny!")
    
    def max_all(self):
        if not self.save.data:
            return
        count = 0
        for p in self.save.team + self.save.box:
            if p:
                # Evolve to final form
                old_key = p.get('specieKey', '')
                new_key = self.poke_data.get_final_evo(old_key)
                p['specieKey'] = new_key
                p['lvl'] = 100
                count += 1
        self.refresh_grid()
        messagebox.showinfo("Done", f"Maxed {count} Pokemon to Lv100 and fully evolved!")
    
    def evolve_all(self):
        """Evolve all Pokemon to their final evolution without changing level."""
        if not self.save.data:
            return
        count = 0
        for p in self.save.team + self.save.box:
            if p:
                old_key = p.get('specieKey', '')
                new_key = self.poke_data.get_final_evo(old_key)
                if old_key != new_key:
                    p['specieKey'] = new_key
                    count += 1
        self.refresh_grid()
        messagebox.showinfo("Done", f"Evolved {count} Pokemon to final form!")
    
    def devolve_all(self):
        """Devolve all Pokemon to their base form without changing level."""
        if not self.save.data:
            return
        count = 0
        for p in self.save.team + self.save.box:
            if p:
                old_key = p.get('specieKey', '')
                new_key = self.poke_data.get_base_form(old_key)
                if old_key != new_key:
                    p['specieKey'] = new_key
                    count += 1
        self.refresh_grid()
        messagebox.showinfo("Done", f"Devolved {count} Pokemon to base form!")
    
    def toggle_all_shiny(self):
        """Toggle shiny status for all Pokemon."""
        if not self.save.data:
            return
        all_poke = [p for p in self.save.team + self.save.box if p]
        if not all_poke:
            return
        # If any are not shiny, make all shiny; otherwise make all normal
        any_not_shiny = any(not p.get('isShiny', False) for p in all_poke)
        new_state = any_not_shiny
        for p in all_poke:
            p['isShiny'] = new_state
        self.refresh_grid()
        state_text = "shiny" if new_state else "normal"
        messagebox.showinfo("Done", f"All Pokemon are now {state_text}!")
    
    def delete_all(self):
        if not self.save.data:
            return
        
        team_count = len(self.save.team)
        box_count = len(self.save.box)
        total = team_count + box_count
        
        if total == 0:
            messagebox.showinfo("Empty", "No Pokemon to delete!")
            return
        
        if not messagebox.askyesno("Delete All", f"Delete ALL {total} Pokemon?\n\nTeam: {team_count}\nBox: {box_count}\n\nThis cannot be undone!"):
            return
        
        # Clear team and box
        save_obj = self.save.save_obj
        save_obj['team'] = []
        save_obj['box'] = []
        
        self.selected_slot = None
        self.refresh_grid()
        messagebox.showinfo("Done", f"Deleted {total} Pokemon!")
    
    def max_gold(self):
        if self.save.data:
            self.save.set_player('gold', 999999)
            self.refresh_grid()
    
    def set_gold(self):
        """Set gold from entry field."""
        if not self.save.data:
            return
        try:
            gold = int(self.gold_var.get().replace(',', '').replace('$', ''))
            self.set_gold_value(max(0, gold))
        except ValueError:
            messagebox.showerror("Error", "Enter a valid number")
    
    def set_gold_value(self, amount):
        """Set gold to specific amount."""
        if self.save.data:
            self.save.set_player('gold', amount)
            self.refresh_grid()
    
    def _inject_missing_eggs(self):
        """Auto-add missing eggs to shop without resetting progress or price."""
        if not self.save.data:
            return
        
        # Full expanded egg list (must match reset_eggs list)
        all_eggs = [
            # === STARTERS ===
            'charmander', 'treecko', 'froaki', 'chikorita', 'totodile', 'fennekin', 
            'turtwig', 'chimchar', 'oshawott', 'sobble', 'rowlet', 'fuecoco',
            # === ORIGINAL EGG POKEMON ===
            'natu', 'spoink', 'murkrow',
            'voltorb', 'machop', 'mankey', 
            'yamask', 'cryogonal', 'sableye', 'meowth', 'tangela', 
            'spinarak', 'shroomish', 'barboach', 'drudiggon', 'remoraid', 'clauncher', 
            'seel', 'staryu', 'psyduck', 'gulpin', 'lapras', 
            'ferroseed', 'shuckle', 'maractus', 'sunkern', 'aron', 'hawlucha', 
            'cubone', 'binacle', 'absol', 'sandshrew', 'sneasel', 
            'trapinch', 'pidgey', 'noibat', 'riolu', 'mareep', 'surskit', 
            'cottonee', 'petilil', 'hoppip', 'drilbur', 'ekans',
            'girafarig', 'torkoal', 'spinda', 'dunsparce', 'ralts', 'koffing', 
            'farfetchd', 'omanyte', 'kabuto', 'corsola', 
            'castform', 'clefairy', 'anorith', 'lileep', 'shieldon', 'cranidos', 
            'starly', 'abra', 'gastly', 'ditto', 
            'magikarp', 'pikachu', 'larvesta', 'cherubi',
            'rockruff', 'pawniard', 'sandile', 'wimpod', 'honedge', 
            'comfey', 'smeargle', 'carvanha', 
            # === NEW POKEMON (previously missing from shop) ===
            'bidoof', 'cacnea', 'greavard', 'stakataka', 'luvdisc', 'chatot',
            'munna', 'hoothoot', 'wingull', 'archen', 'inkay', 'vulpix',
            'tarountula', 'carbink',
        ]
        
        # Get current shop data
        if 'save' in self.save.data:
            shop = self.save.data['save'].get('shop', {})
        else:
            shop = self.save.data.get('shop', {})
        
        current_eggs = shop.get('eggList', [])
        
        # Find and append missing eggs (preserves order, adds new ones at end)
        missing = [egg for egg in all_eggs if egg not in current_eggs]
        if missing:
            current_eggs.extend(missing)
            if 'save' in self.save.data:
                self.save.data['save']['shop']['eggList'] = current_eggs
            else:
                self.save.data['shop']['eggList'] = current_eggs
            print(f"[Mod] Injected {len(missing)} missing eggs into shop")
    
    def reset_eggs(self):
        """Reset egg shop to EXPANDED egg list with all available Pokemon."""
        if not self.save.data:
            return
        
        # EXPANDED egg list - includes 17 additional Pokemon that were missing
        original_egg_list = [
            # === STARTERS ===
            'charmander', 'treecko', 'froaki', 'chikorita', 'totodile', 'fennekin', 
            'turtwig', 'chimchar', 'oshawott', 'sobble', 'rowlet', 'fuecoco',
            
            # === ORIGINAL EGG POKEMON ===
            'natu', 'spoink', 'murkrow',
            'voltorb', 'machop', 'mankey', 
            'yamask', 'cryogonal', 'sableye', 'meowth', 'tangela', 
            'spinarak', 'shroomish', 'barboach', 'drudiggon', 'remoraid', 'clauncher', 
            'seel', 'staryu', 'psyduck', 'gulpin', 'lapras', 
            'ferroseed', 'shuckle', 'maractus', 'sunkern', 'aron', 'hawlucha', 
            'cubone', 'binacle', 'absol', 'sandshrew', 'sneasel', 
            'trapinch', 'pidgey', 'noibat', 'riolu', 'mareep', 'surskit', 
            'cottonee', 'petilil', 'hoppip', 'drilbur', 'ekans',
            'girafarig', 'torkoal', 'spinda', 'dunsparce', 'ralts', 'koffing', 
            'farfetchd', 'omanyte', 'kabuto', 'corsola', 
            'castform', 'clefairy', 'anorith', 'lileep', 'shieldon', 'cranidos', 
            'starly', 'abra', 'gastly', 'ditto', 
            'magikarp', 'pikachu', 'larvesta', 'cherubi',
            'rockruff', 'pawniard', 'sandile', 'wimpod', 'honedge', 
            'comfey', 'smeargle', 'carvanha', 
            
            # === NEW POKEMON (previously missing from shop) ===
            'bidoof', 'cacnea', 'greavard', 'stakataka', 'luvdisc', 'chatot',
            'munna', 'hoothoot', 'wingull', 'archen', 'inkay', 'vulpix',
            'tarountula', 'carbink',
        ]
        
        # Starting egg price
        starting_price = 10
        
        # Update shop data
        if 'save' in self.save.data:
            self.save.data['save']['shop']['eggList'] = original_egg_list.copy()
            self.save.data['save']['shop']['eggPrice'] = starting_price
        else:
            self.save.data['shop']['eggList'] = original_egg_list.copy()
            self.save.data['shop']['eggPrice'] = starting_price
        
        self.refresh_grid()
        messagebox.showinfo("Done", f"Egg shop reset!\n\nEgg list restored: {len(original_egg_list)} eggs\nEgg price reset to: ${starting_price}")

    def complete_all_stages(self):
        """Set all stage records to 100 (grants 1200 stars total for 12 routes)."""
        if not self.save.data:
            return
        
        save_obj = self.save.save_obj
        records = save_obj.get('player', {}).get('records', [])
        
        # Ensure we have enough record slots (9 routes)
        while len(records) < 9:
            records.append(0)
        
        # Set all to 100
        for i in range(len(records)):
            records[i] = 100
        
        # Update records
        if 'save' in self.save.data:
            self.save.data['save']['player']['records'] = records
            # Also update stars to match
            self.save.data['save']['player']['stars'] = sum(records)
        else:
            self.save.data['player']['records'] = records
            self.save.data['player']['stars'] = sum(records)
        
        self.refresh_grid()
        messagebox.showinfo("Done", f"All stages completed!\n\nRecords set to 100 for all routes.\nTotal stars: {sum(records)}")

if __name__ == "__main__":
    App().mainloop()
