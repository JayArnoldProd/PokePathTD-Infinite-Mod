#!/usr/bin/env python3
"""
PokePath TD Save Editor
- Complete All Stages button (2000 stars)
- Editable Gold
- Delete All Pokemon button
- Global Mods section at top for visibility
"""

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
import copy
import json
import re
import shutil
import subprocess
from pathlib import Path

# Load version metadata from version.json
def get_version_info():
    version_file = Path(__file__).parent / "version.json"
    default_mod_version = '1.4.1'
    default_game_version = default_mod_version

    if version_file.exists():
        with open(version_file, 'r') as f:
            data = json.load(f)
        mod_version = data.get('version', default_mod_version)
        game_version = data.get('game_version', mod_version)
        return mod_version, game_version

    return default_mod_version, default_game_version

MOD_VERSION, GAME_VERSION = get_version_info()

try:
    from PIL import Image, ImageTk
    HAS_PIL = True
except ImportError:
    # Auto-install Pillow if missing
    HAS_PIL = False
    try:
        import subprocess as _sp
        _sp.check_call(['pip', 'install', 'Pillow', '-q'], creationflags=0x08000000)  # CREATE_NO_WINDOW
        from PIL import Image, ImageTk
        HAS_PIL = True
    except Exception:
        pass  # Will show warning in UI

# ============================================================================
# CONSTANTS
# ============================================================================

DEFAULT_GRID_COLS = 7
CELL_PAD = 2
TEAM_SLOTS = 10
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
    
    result = {
        'game_root': None,
        'sprites': None,
        'sprites_shiny': None,
        'mod_shiny_sprites': None,
        'mod_normal_sprites': None,
        'extracted_normal_sprites': None,
    }
    
    # Check for mod's bundled sprites first (works in distributed installs)
    # These are the MOST RELIABLE source — never overwrite them with extracted paths
    mod_shiny_path = script_dir / 'patches' / 'shiny_sprites'
    if mod_shiny_path.exists():
        result['mod_shiny_sprites'] = mod_shiny_path
    
    mod_normal_path = script_dir / 'patches' / 'normal_sprites'
    if mod_normal_path.exists():
        result['mod_normal_sprites'] = mod_normal_path
        result['sprites'] = mod_normal_path
    
    for check_dir in check_dirs:
        if check_dir and (check_dir / 'resources').exists():
            result['game_root'] = check_dir
            
            # Try extracted folder (development environment)
            pokemon_base = check_dir / 'resources' / 'app_extracted' / 'src' / 'assets' / 'images' / 'pokemon'
            if pokemon_base.exists():
                # Only use extracted sprites if bundled ones weren't found,
                # and verify the extracted path actually has sprite files
                extracted_normal = pokemon_base / 'normal'
                extracted_shiny = pokemon_base / 'shiny'
                if extracted_normal.exists() and any(extracted_normal.glob('*.png')):
                    result['extracted_normal_sprites'] = extracted_normal
                    if not result['sprites']:
                        result['sprites'] = extracted_normal
                if not result.get('sprites_shiny') and extracted_shiny.exists() and any(extracted_shiny.glob('*.png')):
                    result['sprites_shiny'] = extracted_shiny
                if result['sprites']:
                    return result
            
            # For distributed installs, check sprite_cache as fallback
            asar_path = check_dir / 'resources' / 'app.asar'
            if asar_path.exists():
                cache_dir = script_dir / 'sprite_cache'
                if cache_dir.exists():
                    if not result['sprites']:
                        result['sprites'] = cache_dir / 'normal'
                    if not result.get('sprites_shiny'):
                        result['sprites_shiny'] = cache_dir / 'shiny'
                else:
                    result['asar_path'] = asar_path
                return result
    
    return result

PATHS = find_paths()
SCRIPT_DIR = Path(__file__).parent
TEMP_SAVE = SCRIPT_DIR / 'lib' / 'current_save.json'
POKEMON_DATA_FILE = SCRIPT_DIR / 'dev' / 'pokemon_data.json'
SAVE_HELPER = SCRIPT_DIR / 'lib' / 'save_helper.js'
ROUTE_DATA_FILE = (PATHS.get('game_root') / 'resources' / 'app_extracted' / 'src' / 'js' / 'game' / 'data' / 'routeData.js') if PATHS.get('game_root') else None
POKEMON_JS_DATA_FILE = (PATHS.get('game_root') / 'resources' / 'app_extracted' / 'src' / 'js' / 'game' / 'data' / 'pokemonData.js') if PATHS.get('game_root') else None
ITEM_DATA_FILE = (PATHS.get('game_root') / 'resources' / 'app_extracted' / 'src' / 'js' / 'game' / 'data' / 'itemData.js') if PATHS.get('game_root') else None

# Auto-detect if game is modded (uses separate save location)
def _is_game_modded():
    try:
        from lib.save_manager import is_modded
        return is_modded()
    except Exception:
        # Fallback: check for .modded flag directly
        flag = SCRIPT_DIR.parent / 'resources' / '.modded'
        return flag.exists()

IS_MODDED = _is_game_modded()

def _get_installed_features():
    """Read which mod features are currently installed."""
    try:
        import json
        features_path = SCRIPT_DIR / 'installed_features.json'
        if features_path.exists():
            with open(features_path, 'r') as f:
                return json.load(f)
    except Exception:
        pass
    return []

INSTALLED_FEATURES = _get_installed_features()

def _has_feature(key):
    """Check if a specific mod feature is installed."""
    return key in INSTALLED_FEATURES


def _load_route_options():
    """Load route labels from routeData.js (route id + display order + English name)."""
    route_options = []
    if not ROUTE_DATA_FILE or not ROUTE_DATA_FILE.exists():
        return route_options

    try:
        text = ROUTE_DATA_FILE.read_text(encoding='utf-8', errors='replace')
        pattern = re.compile(
            r"id\s*:\s*(\d+).*?order\s*:\s*(\d+).*?name\s*:\s*\[\s*'([^']+)'",
            re.DOTALL,
        )

        found = {}
        for match in pattern.finditer(text):
            route_id = int(match.group(1))
            order = int(match.group(2))
            english_name = match.group(3).strip()
            found[route_id] = {
                'id': route_id,
                'order': order,
                'name': english_name,
            }

        route_options = sorted(found.values(), key=lambda x: (x['order'], x['id']))
    except Exception:
        pass

    return route_options


def _load_route_reward_pokemon_keys():
    """Extract route challenge Pokémon rewards from routeData.js.
    Uses reward index 1 (the Pokémon slot in challengeReward arrays)."""
    rewards = []
    if not ROUTE_DATA_FILE or not ROUTE_DATA_FILE.exists():
        return rewards

    try:
        text = ROUTE_DATA_FILE.read_text(encoding='utf-8', errors='replace')
        for match in re.finditer(r"challengeReward\s*:\s*\[(.*?)\]", text, re.DOTALL):
            values = re.findall(r"'([^']+)'", match.group(1))
            if len(values) >= 2:
                rewards.append(values[1])
    except Exception:
        pass

    return rewards


def _load_egg_list_keys():
    """Extract eggListData species keys from pokemonData.js."""
    eggs = []
    if not POKEMON_JS_DATA_FILE or not POKEMON_JS_DATA_FILE.exists():
        return eggs

    try:
        text = POKEMON_JS_DATA_FILE.read_text(encoding='utf-8', errors='replace')
        match = re.search(r"eggListData\s*=\s*\[(.*?)\]\s*;", text, re.DOTALL)
        if match:
            eggs = re.findall(r"'([^']+)'", match.group(1))
    except Exception:
        pass

    return eggs


def _load_item_catalog_from_data():
    """Load base item definitions from itemData.js."""
    catalog = {}
    if not ITEM_DATA_FILE or not ITEM_DATA_FILE.exists():
        return catalog

    try:
        text = ITEM_DATA_FILE.read_text(encoding='utf-8', errors='replace')
        pattern = re.compile(
            r"id\s*:\s*'([^']+)'.*?name\s*:\s*\[\s*['\"]([^'\"]+)['\"].*?sprite\s*:\s*'([^']+)'",
            re.DOTALL,
        )

        for match in pattern.finditer(text):
            item_id = match.group(1).strip()
            display_name = match.group(2).strip()
            sprite = match.group(3).strip()
            if item_id:
                catalog[item_id] = {
                    'id': item_id,
                    'name': [display_name],
                    'sprite': sprite,
                    'isEquipable': True,
                }
    except Exception:
        pass

    return catalog


def _ensure_node_save_deps():
    """Install Node dependencies required by the save helper if they're missing."""
    node_modules_dir = SCRIPT_DIR / 'node_modules'
    level_module_dir = node_modules_dir / 'level'
    if level_module_dir.exists():
        return True, None

    npm_cmd = shutil.which('npm.cmd') or shutil.which('npm')
    if not npm_cmd:
        return False, 'Node dependencies missing and npm was not found. Please install Node.js with npm included.'

    try:
        result = subprocess.run(
            [npm_cmd, 'install', '--no-fund', '--no-audit'],
            capture_output=True,
            text=True,
            cwd=str(SCRIPT_DIR),
            encoding='utf-8',
            errors='replace',
            timeout=120,
            creationflags=0x08000000
        )
    except subprocess.TimeoutExpired:
        return False, 'Timed out while installing required save editor dependencies with npm install.'
    except Exception as e:
        return False, f'Failed to install save editor dependencies: {e}'

    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip() or 'npm install failed'
        return False, f'Failed to install save editor dependencies: {detail}'

    if not level_module_dir.exists():
        return False, 'npm install completed, but the level package is still missing.'

    return True, None

# ============================================================================
# SAVE DATA
# ============================================================================

class SaveData:
    def __init__(self):
        self.data = None
        self.source = None
    
    def load_from_game(self, modded=None) -> bool:
        if modded is None:
            modded = IS_MODDED
        if not SAVE_HELPER.exists():
            return False
        self.last_error = None

        deps_ok, deps_error = _ensure_node_save_deps()
        if not deps_ok:
            self.last_error = deps_error
            return False

        try:
            cmd = ['node', str(SAVE_HELPER), 'export']
            if modded:
                cmd.append('--modded')
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, cwd=str(SCRIPT_DIR),
                encoding='utf-8', errors='replace',
                timeout=30
            )
            if result.returncode == 0 and 'OK:' in result.stdout:
                if TEMP_SAVE.exists():
                    with open(TEMP_SAVE, 'r', encoding='utf-8') as f:
                        self.data = json.load(f)
                    self.source = 'game'
                    return True
            # Store error details for display
            self.last_error = result.stderr.strip() or result.stdout.strip() or "Unknown error"
        except subprocess.TimeoutExpired:
            self.last_error = "Save helper timed out (possible stale lock)"
        except Exception as e:
            self.last_error = str(e)
            print(f"Load error: {e}")
        return False
    
    def save_to_game(self, modded=None) -> bool:
        if modded is None:
            modded = IS_MODDED
        if not self.data or not SAVE_HELPER.exists():
            return False
        self.last_error = None

        deps_ok, deps_error = _ensure_node_save_deps()
        if not deps_ok:
            self.last_error = deps_error
            return False

        try:
            with open(TEMP_SAVE, 'w', encoding='utf-8') as f:
                json.dump(self.data, f)
            cmd = ['node', str(SAVE_HELPER), 'import']
            if modded:
                cmd.append('--modded')
            result = subprocess.run(
                cmd,
                capture_output=True, text=True, cwd=str(SCRIPT_DIR),
                encoding='utf-8', errors='replace',
                timeout=30
            )
            if result.returncode == 0 and 'OK:' in result.stdout:
                return True
            self.last_error = result.stderr.strip() or result.stdout.strip() or "Unknown error"
        except subprocess.TimeoutExpired:
            self.last_error = "Save helper timed out (possible stale lock)"
        except Exception as e:
            self.last_error = str(e)
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

    @property
    def area(self):
        return self.save_obj.setdefault('area', {}) if self.data else {}

    @property
    def items(self):
        if not self.data:
            return []

        player = self.player
        if isinstance(player, dict):
            items = player.get('items')
            if isinstance(items, list):
                return items
            player['items'] = []
            return player['items']

        return self.save_obj.setdefault('items', [])

    @property
    def shop(self):
        return self.save_obj.get('shop', {}) if self.data else {}

    def get_current_route_number(self):
        area = self.area
        try:
            route_number = int(area.get('routeNumber', 0) or 0)
        except Exception:
            route_number = 0
        return max(0, route_number)

    def get_current_wave_number(self):
        area = self.area
        route_number = self.get_current_route_number()
        route_waves = area.setdefault('routeWaves', [])
        if len(route_waves) <= route_number:
            route_waves.extend([1] * (route_number + 1 - len(route_waves)))
        try:
            wave = int(route_waves[route_number])
        except Exception:
            wave = 1
        return max(1, wave)

    def set_route_and_wave(self, route_number, wave_number):
        if not self.data:
            return

        route_number = max(0, int(route_number))
        wave_number = max(1, int(wave_number))

        area = self.area
        route_waves = area.setdefault('routeWaves', [])
        if len(route_waves) <= route_number:
            route_waves.extend([1] * (route_number + 1 - len(route_waves)))

        area['routeNumber'] = route_number
        route_waves[route_number] = wave_number

    def set_item_at_slot(self, slot_index, item_obj):
        if not self.data:
            return
        items = self.items
        while len(items) <= slot_index:
            items.append(None)
        items[slot_index] = item_obj

    def get_pokemon_item(self, slot_index):
        pokemon = self.get_pokemon_at_slot(slot_index)
        if not isinstance(pokemon, dict):
            return None
        item_obj = pokemon.get('item')
        return item_obj if isinstance(item_obj, dict) else None

    def set_pokemon_item(self, slot_index, item_obj):
        pokemon = self.get_pokemon_at_slot(slot_index)
        if not isinstance(pokemon, dict):
            return
        if item_obj is None:
            pokemon.pop('item', None)
        else:
            pokemon['item'] = item_obj

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
        'cherrim': 'cherrim1',
        'lycanrocDay': 'lycanroc1',
        'lycanrocNight': 'lycanroc2',
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
            
            # Normal sprite lookup, prefer bundled mod sprites but fall back to extracted runtime sprites
            normal_paths = []
            if PATHS.get('mod_normal_sprites'):
                normal_paths.append(PATHS['mod_normal_sprites'] / f"{sprite_key}.png")
            if PATHS.get('sprites'):
                fallback_path = PATHS['sprites'] / f"{sprite_key}.png"
                if fallback_path not in normal_paths:
                    normal_paths.append(fallback_path)
            if PATHS.get('extracted_normal_sprites'):
                extracted_path = PATHS['extracted_normal_sprites'] / f"{sprite_key}.png"
                if extracted_path not in normal_paths:
                    normal_paths.append(extracted_path)

            self.sprites[cache_key] = None
            for path in normal_paths:
                if not path.exists():
                    continue
                try:
                    # Use NEAREST for pixel art to keep crisp edges
                    img = Image.open(path).resize((size, size), Image.Resampling.NEAREST)
                    self.sprites[cache_key] = ImageTk.PhotoImage(img)
                    break
                except:
                    continue
        return self.sprites.get(cache_key)
    
    # Display name overrides for Pokemon with unclear internal keys
    DISPLAY_NAMES = {
        'aegislash': 'Aegislash Shield',
        'aegislashSword': 'Aegislash Sword',
        'lycanrocDay': 'Lycanroc Day',
        'lycanrocNight': 'Lycanroc Night',
    }
    
    def get_display_name(self, key):
        if key in self.DISPLAY_NAMES:
            return self.DISPLAY_NAMES[key]
        # Split camelCase into words (e.g. 'mrMime' -> 'Mr Mime')
        import re
        name = re.sub(r'([a-z])([A-Z])', r'\1 \2', key)
        return name.replace('-', ' ').title()
    
    def get_base_forms(self):
        return self.data.get('baseForms', [])
    
    def get_next_evo(self, key):
        """Get the next evolution (one step) of a Pokemon."""
        evos = self.data.get('evolutions', {})
        if key in evos:
            return evos[key]['evolves_to']
        return key
    
    # Form alternates and mega evolutions that should resolve to their main form
    FORM_TO_MAIN = {
        'aegislashSword': 'aegislash',
        'lycanrocNight': 'lycanrocDay',
        'megaAbsol': 'absol',
        'megaCharizardX': 'charizard',
        'megaSceptile': 'sceptile',
        'megaAlakazam': 'alakazam',
    }
    
    def get_prev_evo(self, key):
        """Get the previous evolution (one step back) of a Pokemon.
        For form alternates (e.g. aegislashSword), resolve to the main form first."""
        evos = self.data.get('evolutions', {})
        # If this is a form alternate, resolve to main form first
        if key in self.FORM_TO_MAIN:
            key = self.FORM_TO_MAIN[key]
        reverse = {v['evolves_to']: k for k, v in evos.items()}
        return reverse.get(key, key)
    
    def get_final_evo(self, key):
        """Get the final evolution of a Pokemon."""
        evos = self.data.get('evolutions', {})
        while key in evos:
            key = evos[key]['evolves_to']
        return key
    
    def get_base_form(self, key):
        """Get the base form of a Pokemon by reversing the evolution chain.
        Resolves form alternates and mega evolutions first."""
        # Resolve form alternates / megas to main form
        if key in self.FORM_TO_MAIN:
            key = self.FORM_TO_MAIN[key]
        # Also handle any mega not in the explicit map (megaX -> strip 'mega' prefix)
        if key.startswith('mega') and key != 'meganium':
            possible_base = key[4].lower() + key[5:]
            if possible_base in self.data.get('allKeys', []):
                key = possible_base
        evos = self.data.get('evolutions', {})
        reverse = {v['evolves_to']: k for k, v in evos.items()}
        while key in reverse:
            key = reverse[key]
        return key
    
    def get_chain(self, key):
        """Get all species keys in an evolution chain (from base to final)."""
        base = self.get_base_form(key)
        chain = [base]
        evos = self.data.get('evolutions', {})
        current = base
        while current in evos:
            current = evos[current]['evolves_to']
            chain.append(current)
        return chain

    def get_unlock_roots(self):
        """Return one unlockable root per obtainable line/standalone species.
        Uses actual metadata relationships instead of the older baseForms list so
        newly added standalone Pokemon and new lines are included automatically."""
        roots = []
        for key in self.all_pokemon:
            if key.startswith('mega'):
                continue
            if key in self.FORM_TO_MAIN:
                continue
            if self.get_prev_evo(key) == key:
                roots.append(key)
        return roots
    
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
        self.held_item_image = None
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
    
    def set_pokemon(self, sprite_image, level, is_shiny=False, held_item_sprite=None):
        """Update cell with Pokemon data."""
        self.has_pokemon = True
        self.sprite_image = sprite_image
        self.held_item_image = held_item_sprite

        # Clear and redraw sprite
        self.sprite_canvas.delete('all')
        if sprite_image:
            self.sprite_id = self.sprite_canvas.create_image(24, 24, image=sprite_image)
        if held_item_sprite:
            self.sprite_canvas.create_image(47, 47, image=held_item_sprite, anchor='se')

        # Update level
        color = '#FFD700' if is_shiny else '#FFFFFF'
        self.level_label.config(text=f"Lv{level}", fg=color)

        # Set background
        self._update_bg()
    
    def set_item(self, sprite_image, label='item'):
        """Update cell with item data."""
        self.has_pokemon = True
        self.sprite_image = sprite_image
        self.held_item_image = None

        self.sprite_canvas.delete('all')
        if sprite_image:
            self.sprite_id = self.sprite_canvas.create_image(24, 24, image=sprite_image)
        else:
            self.sprite_canvas.create_text(24, 24, text="?", font=('Arial', 16), fill='#dddddd')

        self.level_label.config(text=label, fg='#9ad0ff')
        self._update_bg()

    def set_empty(self, label="empty"):
        """Set cell as empty slot."""
        self.has_pokemon = False
        self.sprite_image = None
        self.held_item_image = None

        self.sprite_canvas.delete('all')
        self.sprite_canvas.create_text(24, 24, text="+", font=('Arial', 16), fill='#444444')
        self.level_label.config(text=label, fg='#444444')

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
        self.title(f"PokePath TD Save Editor v{MOD_VERSION} (Game v{GAME_VERSION})")
        self.geometry("1100x800")
        self.configure(bg='#2b2b2b')
        
        self.save = SaveData()
        self.poke_data = PokemonData()
        self.route_options = _load_route_options()
        self.route_name_to_number = {}
        self.route_id_to_display = {}
        self.valid_route_ids = set()
        self.base_item_catalog = _load_item_catalog_from_data()
        self.item_catalog = {}
        self.item_display_to_id = {}
        self.item_display_to_obj = {}
        self.held_item_display_to_obj = {}
        self.item_sprite_cache = {}
        self.item_visible_slots = []
        self.item_cell_to_visible_index = {}
        self.editor_mode = 'pokemon'  # pokemon | items
        self.selected_item_slot = None
        self.selected_slot = None
        self.cells = {}  # slot_index -> PokemonCell
        self.team_cols = TEAM_SLOTS
        self.box_cols = DEFAULT_GRID_COLS
        self._relayout_job = None
        
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
        
        # Vanilla/Modded toggle
        self.save_mode_var = tk.StringVar(value="modded" if IS_MODDED else "vanilla")
        ttk.Label(toolbar, text="Save:").pack(side='left', padx=(0, 2))
        ttk.Radiobutton(toolbar, text="Vanilla", variable=self.save_mode_var, value="vanilla").pack(side='left')
        ttk.Radiobutton(toolbar, text="Modded", variable=self.save_mode_var, value="modded").pack(side='left', padx=(0, 5))
        
        ttk.Separator(toolbar, orient='vertical').pack(side='left', fill='y', padx=10)
        self.source_label = ttk.Label(toolbar, text="No save loaded", font=('Arial', 10, 'bold'))
        self.source_label.pack(side='left', padx=5)
        self.loaded_as_modded = IS_MODDED  # Track which save type was actually loaded
        
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
        ttk.Button(stats, text="Max Gold", command=lambda: self.set_gold_value(9007199254740991 if _has_feature('qol') else 99999999999)).grid(row=0, column=5, padx=5)
        
        # Stars (display only - calculated from records)
        ttk.Label(stats, text="Stars:").grid(row=0, column=6, padx=5, sticky='e')
        self.stars_var = tk.StringVar(value="0")
        ttk.Label(stats, textvariable=self.stars_var, font=('Arial', 11, 'bold')).grid(row=0, column=7, padx=5, sticky='w')

        # Route/Wave recovery controls
        ttk.Label(stats, text="Route:").grid(row=1, column=0, padx=5, pady=(8, 0), sticky='e')
        self.route_var = tk.StringVar(value='')
        self.route_combo = ttk.Combobox(stats, textvariable=self.route_var, state='readonly', width=16)
        self.route_combo.grid(row=1, column=1, padx=5, pady=(8, 0), sticky='w')

        ttk.Label(stats, text="Wave:").grid(row=1, column=2, padx=5, pady=(8, 0), sticky='e')
        self.wave_var = tk.StringVar(value='1')
        self.wave_entry = ttk.Entry(stats, textvariable=self.wave_var, width=10)
        self.wave_entry.grid(row=1, column=3, padx=5, pady=(8, 0), sticky='w')
        self.wave_entry.bind('<Return>', self.set_route_wave)

        route_wave_btns = ttk.Frame(stats)
        route_wave_btns.grid(row=1, column=4, columnspan=4, padx=5, pady=(8, 0), sticky='w')
        ttk.Button(route_wave_btns, text='-10', width=5, command=lambda: self.adjust_wave(-10)).pack(side='left', padx=1)
        ttk.Button(route_wave_btns, text='-1', width=5, command=lambda: self.adjust_wave(-1)).pack(side='left', padx=1)
        ttk.Button(route_wave_btns, text='+1', width=5, command=lambda: self.adjust_wave(1)).pack(side='left', padx=1)
        ttk.Button(route_wave_btns, text='+10', width=5, command=lambda: self.adjust_wave(10)).pack(side='left', padx=1)
        ttk.Button(route_wave_btns, text='Set Route/Wave', command=self.set_route_wave).pack(side='left', padx=(6, 0))
        
        # Global mode tabs (visible above grids)
        self.mode_tabs = ttk.Notebook(main)
        self.mode_tabs.pack(fill='x', pady=(0, 8))
        self.mode_tabs_pokemon = ttk.Frame(self.mode_tabs, height=1)
        self.mode_tabs_items = ttk.Frame(self.mode_tabs, height=1)
        self.mode_tabs.add(self.mode_tabs_pokemon, text='Pokemon')
        self.mode_tabs.add(self.mode_tabs_items, text='Items')
        self.mode_tabs.bind('<<NotebookTabChanged>>', self.on_editor_tab_changed)

        # Content
        content = ttk.Frame(main)
        content.pack(fill='both', expand=True)
        
        # Left - Grid
        self.left_frame = ttk.LabelFrame(content, text="Pokemon Grid", padding=5)
        self.left_frame.pack(side='left', fill='both', expand=True, padx=(0, 10))
        
        # Team section
        self.team_header = tk.Label(self.left_frame, text="TEAM (6 slots)", font=('Arial', 9, 'bold'), 
                               bg='#2b2b2b', fg='#88ff88')
        self.team_header.pack(anchor='w', pady=(0, 5))
        
        self.team_grid = tk.Frame(self.left_frame, bg='#1e1e1e')
        self.team_grid.pack(fill='x', pady=(0, 10))
        
        for i in range(TEAM_SLOTS):
            cell = PokemonCell(self.team_grid, i, self.on_cell_click)
            cell.grid(row=0, column=i, padx=2, pady=2)
            self.cells[i] = cell
        
        # Box section
        self.box_header = tk.Label(self.left_frame, text="BOX (200 slots)", font=('Arial', 9, 'bold'), 
                              bg='#2b2b2b', fg='#88ff88')
        self.box_header.pack(anchor='w', pady=(5, 5))
        
        # Scrollable box frame
        self.box_container = tk.Frame(self.left_frame, bg='#1e1e1e')
        self.box_container.pack(fill='both', expand=True)
        
        box_canvas = tk.Canvas(self.box_container, bg='#1e1e1e', highlightthickness=0)
        box_scrollbar = ttk.Scrollbar(self.box_container, orient='vertical', command=box_canvas.yview)
        box_inner = tk.Frame(box_canvas, bg='#1e1e1e')
        self.box_canvas = box_canvas
        self.box_inner = box_inner
        
        box_canvas.configure(yscrollcommand=box_scrollbar.set)
        box_scrollbar.pack(side='right', fill='y')
        box_canvas.pack(side='left', fill='both', expand=True)
        
        box_canvas.create_window((0, 0), window=box_inner, anchor='nw')
        box_inner.bind('<Configure>', lambda e: box_canvas.configure(scrollregion=box_canvas.bbox('all')))
        
        # Create box slots
        for i in range(BOX_SLOTS):
            slot_index = TEAM_SLOTS + i
            row = i // DEFAULT_GRID_COLS
            col = i % DEFAULT_GRID_COLS
            cell = PokemonCell(box_inner, slot_index, self.on_cell_click)
            cell.grid(row=row, column=col, padx=CELL_PAD, pady=CELL_PAD)
            self.cells[slot_index] = cell
        
        # Right - Editor (with scrollbar for small screens)
        right_outer = ttk.Frame(content, width=320)
        right_outer.pack(side='right', fill='y')
        right_outer.pack_propagate(False)
        
        # Create canvas and scrollbar for right panel
        self.right_canvas = tk.Canvas(right_outer, bg='#2b2b2b', highlightthickness=0, width=300)
        right_scrollbar = ttk.Scrollbar(right_outer, orient='vertical', command=self.right_canvas.yview)
        right_frame = ttk.Frame(self.right_canvas)
        
        self.right_canvas.configure(yscrollcommand=right_scrollbar.set)
        right_scrollbar.pack(side='right', fill='y')
        self.right_canvas.pack(side='left', fill='both', expand=True)
        
        self.right_canvas.create_window((0, 0), window=right_frame, anchor='nw')
        right_frame.bind('<Configure>', lambda e: self.right_canvas.configure(scrollregion=self.right_canvas.bbox('all')))
        
        # Enable mouse wheel scrolling on right panel
        def on_right_mousewheel(event):
            self.right_canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        self.right_canvas.bind_all('<MouseWheel>', on_right_mousewheel)
        
        # Global Mods at top
        mods_frame = ttk.LabelFrame(right_frame, text="Global Mods", padding=8)
        mods_frame.pack(fill='x', pady=(0, 10), padx=5)

        self.pokemon_mods_frame = ttk.Frame(mods_frame)
        self.pokemon_mods_frame.pack(fill='x', pady=(0, 2))

        # Pokemon-only global actions
        form_row = ttk.Frame(self.pokemon_mods_frame)
        form_row.pack(fill='x', pady=1)
        ttk.Button(form_row, text="Evolve All", command=self.evolve_all).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(form_row, text="Devolve All", command=self.devolve_all).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(form_row, text="Toggle Shiny", command=self.toggle_all_shiny).pack(side='left', expand=True, fill='x', padx=1)

        ttk.Button(self.pokemon_mods_frame, text="Unlock All Pokemon", command=self.unlock_all).pack(fill='x', pady=1)
        ttk.Button(self.pokemon_mods_frame, text="Max All Levels (Evolve + Lv100)", command=self.max_all).pack(fill='x', pady=1)
        ttk.Button(self.pokemon_mods_frame, text="Complete All Stages (2000 Stars)", command=self.complete_all_stages).pack(fill='x', pady=1)
        ttk.Button(self.pokemon_mods_frame, text="Remove Duplicate Pokemon", command=self.remove_duplicate_pokemon).pack(fill='x', pady=1)
        ttk.Button(self.pokemon_mods_frame, text="Delete All Pokemon", command=self.delete_all).pack(fill='x', pady=1)

        # Always-visible shared action
        self.shared_mods_frame = ttk.Frame(mods_frame)
        self.shared_mods_frame.pack(fill='x', pady=1)
        ttk.Button(self.shared_mods_frame, text="Reset Egg Shop", command=self.reset_eggs).pack(fill='x', pady=1)

        self.item_mods_frame = ttk.Frame(mods_frame)
        ttk.Button(self.item_mods_frame, text="Clear All Items", command=self.clear_all_items).pack(fill='x', pady=1)
        ttk.Button(self.item_mods_frame, text="Unlock All Items", command=self.unlock_all_items).pack(fill='x', pady=1)
        
        ttk.Separator(right_frame, orient='horizontal').pack(fill='x', pady=5, padx=5)

        self.editor_panel = ttk.Frame(right_frame)
        self.editor_panel.pack(fill='both', expand=True, padx=5, pady=(0, 10))

        pokemon_tab = ttk.Frame(self.editor_panel)
        items_tab = ttk.Frame(self.editor_panel)
        self.pokemon_editor_tab = pokemon_tab
        self.items_editor_tab = items_tab
        self.pokemon_editor_tab.pack(fill='both', expand=True)

        self.selected_label = ttk.Label(pokemon_tab, text="Select a slot", font=('Arial', 12))
        self.selected_label.pack(pady=5, padx=5)

        # Sprite display
        self.sprite_display = tk.Canvas(pokemon_tab, width=80, height=80, bg='#1e1e1e', highlightthickness=1)
        self.sprite_display.pack(pady=5, padx=5)
        self.display_sprite = None

        # Species
        species_frame = ttk.Frame(pokemon_tab)
        species_frame.pack(fill='x', pady=10, padx=5)

        ttk.Label(species_frame, text="Species:").pack(anchor='w')
        self.species_var = tk.StringVar()
        self.species_combo = ttk.Combobox(species_frame, textvariable=self.species_var, state='readonly', width=28)
        self.species_combo['values'] = [''] + [self.poke_data.get_display_name(k) for k in self.poke_data.all_pokemon]
        self.species_combo.pack(fill='x', pady=2)
        self.species_combo.bind('<<ComboboxSelected>>', self.on_species_change)

        # Level
        level_frame = ttk.LabelFrame(pokemon_tab, text="Level", padding=10)
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

        held_item_frame = ttk.LabelFrame(pokemon_tab, text="Held Item", padding=8)
        held_item_frame.pack(fill='x', pady=(0, 10), padx=5)
        self.held_item_var = tk.StringVar(value='(Empty)')
        self.held_item_combo = ttk.Combobox(held_item_frame, textvariable=self.held_item_var, state='readonly')
        self.held_item_combo.pack(fill='x')
        self.held_item_combo.bind('<<ComboboxSelected>>', self.on_held_item_change)

        # Slot Actions (individual Pokemon)
        slot_actions = ttk.LabelFrame(pokemon_tab, text="Selected Pokemon", padding=5)
        slot_actions.pack(fill='x', pady=(5, 15), padx=5)

        # Row 1: Evolve, Devolve, Toggle Shiny
        action_row1 = ttk.Frame(slot_actions)
        action_row1.pack(fill='x', pady=2)
        ttk.Button(action_row1, text="Evolve", command=self.evolve_pokemon).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(action_row1, text="Devolve", command=self.devolve_pokemon).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(action_row1, text="Toggle Shiny", command=self.toggle_shiny).pack(side='left', expand=True, fill='x', padx=1)

        # Row 1b: Switch Form (for Pokemon with alternate forms like Lycanroc, Aegislash)
        action_row1b = ttk.Frame(slot_actions)
        action_row1b.pack(fill='x', pady=2)
        self.switch_form_button = ttk.Button(action_row1b, text="Switch Form", command=self.switch_form)
        self.switch_form_button.pack(side='left', expand=True, fill='x', padx=1)
        self.switch_form_button.state(['disabled'])

        # Row 2: Add Pokemon
        action_row2 = ttk.Frame(slot_actions)
        action_row2.pack(fill='x', pady=2)
        ttk.Button(action_row2, text="Add Pokemon", command=self.add_pokemon).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(action_row2, text="Delete", command=self.delete_pokemon).pack(side='left', expand=True, fill='x', padx=1)

        action_row3 = ttk.Frame(slot_actions)
        action_row3.pack(fill='x', pady=2)
        self.party_button = ttk.Button(action_row3, text="Add to Team", command=self.toggle_party_membership)
        self.party_button.pack(side='left', expand=True, fill='x', padx=1)
        self.party_button.state(['disabled'])

        # Items tab
        items_info = ttk.Label(items_tab, text="Item Slots", font=('Arial', 11, 'bold'))
        items_info.pack(anchor='w', padx=5, pady=(5, 2))

        item_picker_frame = ttk.Frame(items_tab)
        item_picker_frame.pack(fill='x', padx=5, pady=(0, 6))

        ttk.Label(item_picker_frame, text="Set Slot To:").pack(anchor='w')
        self.item_var = tk.StringVar(value='')
        self.item_combo = ttk.Combobox(item_picker_frame, textvariable=self.item_var, state='readonly')
        self.item_combo.pack(fill='x', pady=(2, 0))

        item_btns = ttk.Frame(items_tab)
        item_btns.pack(fill='x', padx=5, pady=(0, 6))
        ttk.Button(item_btns, text='Set Selected Slot', command=self.set_item_slot).pack(side='left', expand=True, fill='x', padx=1)
        ttk.Button(item_btns, text='Clear Slot', command=self.clear_item_slot).pack(side='left', expand=True, fill='x', padx=1)

        item_btns2 = ttk.Frame(items_tab)
        item_btns2.pack(fill='x', padx=5, pady=(0, 10))
        ttk.Button(item_btns2, text='Add Item to Open Slot', command=self.add_item_slot).pack(side='left', expand=True, fill='x', padx=1)
        
        # Status
        self.status = ttk.Label(main, text="Ready", relief='sunken', padding=5)
        self.status.pack(fill='x', side='bottom', pady=(10, 0))

        self.team_grid.bind('<Configure>', self._on_grid_area_configure)
        self.box_canvas.bind('<Configure>', self._on_grid_area_configure)
    
    def _sync_item_dropdown_from_selected_slot(self):
        if not self.save.data or self.selected_item_slot is None:
            return

        actual_index = self._actual_item_index(self.selected_item_slot)
        item_obj = self.save.items[actual_index] if actual_index is not None and actual_index < len(self.save.items) else None

        if isinstance(item_obj, dict) and item_obj.get('id'):
            item_id = item_obj['id']
            for display, mapped_id in self.item_display_to_id.items():
                if mapped_id == item_id:
                    self.item_var.set(display)
                    return

    def on_cell_click(self, slot_index):
        """Handle cell click - select Pokemon slot or item slot based on active tab."""
        if self.editor_mode == 'items':
            visible_index = self.item_cell_to_visible_index.get(slot_index)
            if visible_index is None:
                return

            self.selected_item_slot = visible_index
            self.refresh_grid()
            return

        # Pokemon mode
        self.selected_slot = slot_index
        self.refresh_grid()
    
    def auto_load(self):
        # Warn if sprites won't load
        if not HAS_PIL:
            self.status.config(text="Warning: Pillow not installed — no sprites. Run: pip install Pillow")
        elif not PATHS.get('sprites'):
            self.status.config(text="Warning: Sprite folder not found — Pokemon images won't display")
        self.load_game()
    
    def load_game(self):
        self.status.config(text="Loading...")
        self.update()
        
        use_modded = self.save_mode_var.get() == "modded"
        if self.save.load_from_game(modded=use_modded):
            mode_str = "Modded" if use_modded else "Vanilla"
            team_count = len([p for p in self.save.team if p])
            box_count = len([p for p in self.save.box if p])
            self.loaded_as_modded = use_modded
            self.source_label.config(text=f"Game Save ({mode_str}) - {team_count} team, {box_count} box")
            self._inject_missing_eggs()
            self.refresh_grid()
            self.status.config(text="Loaded!")
        else:
            error_detail = getattr(self.save, 'last_error', '') or 'Unknown error'
            self.status.config(text=f"Failed: {error_detail[:80]}")
            
            if 'lock' in error_detail.lower() or 'running' in error_detail.lower():
                messagebox.showwarning("Load Failed",
                    f"Save database is locked.\n\n"
                    f"The editor tried to clear the stale lock automatically but couldn't.\n\n"
                    f"Try these steps:\n"
                    f"1. Make sure PokePath TD is fully closed\n"
                    f"2. Check Task Manager for 'node.exe' processes and end them\n"
                    f"3. Try loading again\n\n"
                    f"Error: {error_detail}")
            elif 'timed out' in error_detail.lower():
                messagebox.showwarning("Load Failed",
                    f"The save helper process timed out.\n\n"
                    f"This usually means the database is stuck.\n"
                    f"Try closing the game and loading again.\n\n"
                    f"Error: {error_detail}")
            else:
                title = "Load Failed"
                message = (
                    f"Could not load save data.\n\n"
                    f"Make sure the game is closed and try again.\n\n"
                    f"Error: {error_detail}"
                )
                lower_error = error_detail.lower()
                if 'cannot find module' in lower_error or 'npm install' in lower_error or 'dependencies missing' in lower_error:
                    title = "Save Editor Setup Failed"
                    message = (
                        f"The save editor is missing required Node.js packages and could not repair itself automatically.\n\n"
                        f"Try running ModManager.bat again, or run npm install inside the mods folder.\n\n"
                        f"Error: {error_detail}"
                    )
                messagebox.showwarning(title, message)
    
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
        use_modded = self.save_mode_var.get() == "modded"
        if self.save.save_to_game(modded=use_modded):
            mode_str = "modded" if use_modded else "vanilla"
            messagebox.showinfo("Saved", f"Save written to {mode_str}! Restart game.")
            self.status.config(text="Saved!")
        else:
            messagebox.showerror("Error", "Failed to save")
    
    def export(self):
        path = filedialog.asksaveasfilename(defaultextension=".json")
        if path and self.save.export_to_file(Path(path)):
            messagebox.showinfo("Exported", f"Saved to {path}")

    def _mode_from_tab_selection(self):
        if not hasattr(self, 'mode_tabs'):
            return 'pokemon'

        try:
            tab_id = self.mode_tabs.select()
            tab_text = str(self.mode_tabs.tab(tab_id, 'text')).strip().lower()
            return 'items' if tab_text == 'items' else 'pokemon'
        except Exception:
            try:
                return 'items' if self.mode_tabs.index('current') == 1 else 'pokemon'
            except Exception:
                return 'pokemon'

    def on_editor_tab_changed(self, event=None):
        self.editor_mode = self._mode_from_tab_selection()

        if hasattr(self, 'right_canvas'):
            self.right_canvas.yview_moveto(0.0)
            self.after_idle(lambda: self.right_canvas.yview_moveto(0.0))

        if hasattr(self, 'pokemon_editor_tab') and hasattr(self, 'items_editor_tab'):
            if self.editor_mode == 'items':
                self.pokemon_editor_tab.pack_forget()
                self.items_editor_tab.pack(fill='both', expand=True)
            else:
                self.items_editor_tab.pack_forget()
                self.pokemon_editor_tab.pack(fill='both', expand=True)

        if hasattr(self, 'pokemon_mods_frame') and hasattr(self, 'item_mods_frame'):
            if self.editor_mode == 'items':
                self.pokemon_mods_frame.pack_forget()
                if not self.item_mods_frame.winfo_manager():
                    self.item_mods_frame.pack(fill='x', pady=(2, 0))
            else:
                self.item_mods_frame.pack_forget()
                if not self.pokemon_mods_frame.winfo_manager():
                    self.pokemon_mods_frame.pack(fill='x', pady=(0, 2), before=self.shared_mods_frame)

        self.refresh_grid()
        self.after_idle(self.refresh_grid)
        self.after(40, self.refresh_grid)

    def _on_grid_area_configure(self, event=None):
        if self._relayout_job is not None:
            try:
                self.after_cancel(self._relayout_job)
            except Exception:
                pass
        self._relayout_job = self.after(25, self._apply_dynamic_grid_layout)

    def _dynamic_cols_for_width(self, width, max_slots, fallback):
        span = CELL_SIZE + (CELL_PAD * 2)
        if width <= 1:
            return max(1, min(max_slots, fallback))
        return max(1, min(max_slots, width // span))

    def _apply_dynamic_grid_layout(self):
        self._relayout_job = None

        if not self.cells:
            return

        team_width = self.team_grid.winfo_width() if hasattr(self, 'team_grid') else 0
        if team_width <= 1 and hasattr(self, 'left_frame'):
            team_width = max(1, self.left_frame.winfo_width() - 20)

        box_width = self.box_canvas.winfo_width() if hasattr(self, 'box_canvas') else 0
        if box_width <= 1 and hasattr(self, 'left_frame'):
            box_width = max(1, self.left_frame.winfo_width() - 20)

        self.team_cols = self._dynamic_cols_for_width(team_width, TEAM_SLOTS, TEAM_SLOTS)
        self.box_cols = self._dynamic_cols_for_width(box_width, BOX_SLOTS, DEFAULT_GRID_COLS)

        for i in range(TEAM_SLOTS):
            cell = self.cells.get(i)
            if cell:
                cell.grid_configure(row=i // self.team_cols, column=i % self.team_cols, padx=CELL_PAD, pady=CELL_PAD)

        for i in range(BOX_SLOTS):
            slot_index = TEAM_SLOTS + i
            cell = self.cells.get(slot_index)
            if cell:
                cell.grid_configure(row=i // self.box_cols, column=i % self.box_cols, padx=CELL_PAD, pady=CELL_PAD)

    def _resolve_item_sprite_path(self, item_obj):
        sprite = item_obj.get('sprite') if isinstance(item_obj, dict) else None
        if not sprite or not PATHS.get('game_root'):
            return None

        relative = sprite.replace('\\', '/').lstrip('./')
        return PATHS['game_root'] / 'resources' / 'app_extracted' / Path(relative)

    def get_item_sprite(self, item_obj, size=48):
        if not HAS_PIL or not item_obj:
            return None

        item_id = item_obj.get('id')
        if not item_id:
            return None

        cache_key = (item_id, size)
        if cache_key in self.item_sprite_cache:
            return self.item_sprite_cache[cache_key]

        sprite_path = self._resolve_item_sprite_path(item_obj)
        if not sprite_path or not sprite_path.exists():
            return None

        try:
            img = Image.open(sprite_path).convert('RGBA').resize((size, size), Image.NEAREST)
            tk_img = ImageTk.PhotoImage(img)
            self.item_sprite_cache[cache_key] = tk_img
            return tk_img
        except Exception:
            return None

    def refresh_grid(self):
        """Refresh all cells with current data."""
        if not self.save.data:
            return

        # Keep mode synced to top tabs even if tab-change event misses.
        self.editor_mode = self._mode_from_tab_selection()
        self._apply_dynamic_grid_layout()

        # Update stats
        p = self.save.player
        self.stat_vars['name'].set(p.get('name', '?'))
        self.gold_var.set(str(p.get('gold', 0)))
        self.stars_var.set(str(p.get('stars', 0)))

        if self.editor_mode == 'items':
            self.left_frame.config(text="Item Grid")
            self.team_header.pack_forget()
            self.team_grid.pack_forget()
            self.box_header.pack_forget()
            self.box_header.config(text="ITEM SLOTS")
            self.box_header.pack(anchor='w', pady=(0, 2), before=self.box_container)

            self.item_visible_slots = self._get_visible_item_indices()
            self.item_cell_to_visible_index = {}

            for slot_index, cell in self.cells.items():
                if slot_index < TEAM_SLOTS:
                    cell.set_empty("empty")
                    cell.set_selected(False)

            item_cell_slots = [TEAM_SLOTS + i for i in range(BOX_SLOTS) if (TEAM_SLOTS + i) in self.cells]
            for display_idx, cell_slot in enumerate(item_cell_slots):
                cell = self.cells[cell_slot]
                self.item_cell_to_visible_index[cell_slot] = display_idx

                if display_idx < len(self.item_visible_slots):
                    actual_index = self._actual_item_index(display_idx)
                    item_obj = self.save.items[actual_index] if actual_index is not None and actual_index < len(self.save.items) else None
                    if item_obj:
                        sprite = self.get_item_sprite(item_obj, 48)
                        label = self._item_label(item_obj)
                        short_label = label[:10] + '…' if len(label) > 11 else label
                        cell.set_item(sprite, short_label)
                    else:
                        cell.set_empty("empty")
                else:
                    cell.set_empty("empty")

                cell.set_selected(display_idx == self.selected_item_slot)

            total_slots = len(self.item_visible_slots)
            filled_slots = len([idx for idx in self.item_visible_slots if self.save.items[idx]])
            self.status.config(text=f"Item slots: {filled_slots}/{total_slots}")
        else:
            self.left_frame.config(text="Pokemon Grid")
            self.team_header.config(text=f"TEAM ({self.save.player.get('teamSlots', TEAM_SLOTS)} slots)")
            self.box_header.config(text=f"BOX ({BOX_SLOTS} slots)")
            # Always re-pack these on Pokemon mode to avoid stale hidden layout state.
            self.team_header.pack_forget()
            self.team_grid.pack_forget()
            self.box_header.pack_forget()
            self.team_header.pack(anchor='w', pady=(0, 5), before=self.box_container)
            self.team_grid.pack(fill='x', pady=(0, 10), before=self.box_container)
            self.box_header.pack(anchor='w', pady=(5, 5), before=self.box_container)

            self.item_visible_slots = []
            self.item_cell_to_visible_index = {}

            for slot_index, cell in self.cells.items():
                poke = self.save.get_pokemon_at_slot(slot_index)

                if poke:
                    key = poke.get('specieKey', '?')
                    lvl = poke.get('lvl', 1)
                    is_shiny = poke.get('isShiny', False)
                    sprite = self.poke_data.get_sprite(key, 48, is_shiny)
                    held_item_sprite = self.get_item_sprite(poke.get('item'), 24)
                    cell.set_pokemon(sprite, lvl, is_shiny, held_item_sprite)
                else:
                    cell.set_empty()

                cell.set_selected(slot_index == self.selected_slot)

            team_count = len(self.save.team)
            box_count = len(self.save.box)
            player_team_slots = self.save.player.get('teamSlots', TEAM_SLOTS)
            self.status.config(text=f"Team: {team_count}/{player_team_slots} | Box: {box_count}/{BOX_SLOTS} | Total: {team_count + box_count}")

        # Update route/wave controls
        self.refresh_route_wave_controls()

        # Update item editor
        self.refresh_item_editor()

        # Update editor if something selected
        if self.editor_mode == 'pokemon' and self.selected_slot is not None:
            self.update_editor()
        else:
            self._refresh_party_button_state()
            self._refresh_switch_form_button_state()

    def refresh_route_wave_controls(self):
        if not self.save.data:
            self.route_combo['values'] = []
            self.route_var.set('')
            self.wave_var.set('1')
            return

        route_values = []
        self.route_name_to_number = {}
        self.route_id_to_display = {}

        for route in self.route_options:
            route_id = route['id']
            route_name = route['name']
            display = f"{route_name}"
            route_values.append(display)
            self.route_name_to_number[display] = route_id
            self.route_id_to_display[route_id] = display

        self.valid_route_ids = set(self.route_id_to_display.keys())
        self.route_combo['values'] = route_values

        current_route = self.save.get_current_route_number()
        current_wave = self.save.get_current_wave_number()

        if current_route in self.route_id_to_display:
            self.route_var.set(self.route_id_to_display[current_route])
        elif route_values:
            self.route_var.set(route_values[0])
        else:
            self.route_var.set(f"Unknown Route ID {current_route}")

        self.wave_var.set(str(current_wave))

    def adjust_wave(self, delta):
        try:
            wave = int(self.wave_var.get())
        except Exception:
            wave = 1
        self.wave_var.set(str(max(1, wave + delta)))

    def set_route_wave(self, event=None):
        if not self.save.data:
            return

        selected = self.route_var.get().strip()
        route_number = self.route_name_to_number.get(selected)
        if route_number is None:
            messagebox.showerror("Invalid Route", "Choose a route from the dropdown. Hidden/unknown route IDs are blocked.")
            return

        if self.valid_route_ids and route_number not in self.valid_route_ids:
            messagebox.showerror("Invalid Route", "That route is not in routeData and may crash the game.")
            return

        try:
            wave_number = int(self.wave_var.get())
        except Exception:
            messagebox.showerror("Invalid Wave", "Wave must be a whole number.")
            return

        self.save.set_route_and_wave(route_number, wave_number)
        self.refresh_route_wave_controls()
        self.status.config(text=f"Set last route/wave to {selected}, Wave {max(1, wave_number)}")

    def _item_label(self, item_obj):
        if not item_obj:
            return "(empty)"
        name = item_obj.get('name')
        if isinstance(name, list) and name:
            return str(name[0])
        return str(item_obj.get('id', '(unknown item)'))

    def _get_held_item_counts(self):
        counts = {}
        for poke in self.save.team + self.save.box:
            if not isinstance(poke, dict):
                continue
            item_obj = poke.get('item')
            if not isinstance(item_obj, dict):
                continue
            item_id = item_obj.get('id')
            if not item_id:
                continue
            counts[item_id] = counts.get(item_id, 0) + 1
        return counts

    def _get_visible_item_indices(self):
        # Items tab is inventory-only. Held items are edited from Pokemon tab.
        return list(range(len(self.save.items)))

    def _actual_item_index(self, visible_index):
        if visible_index is None:
            return None
        if visible_index < 0 or visible_index >= len(self.item_visible_slots):
            return None
        return self.item_visible_slots[visible_index]

    def _build_item_catalog(self):
        catalog = copy.deepcopy(self.base_item_catalog)

        # Current owned items
        for item in self.save.items:
            if isinstance(item, dict) and item.get('id'):
                catalog[item['id']] = copy.deepcopy(item)

        # Shop stock and list may contain additional items
        if isinstance(self.save.shop, dict):
            for key in ('itemStock', 'itemList'):
                for item in self.save.shop.get(key, []) or []:
                    if isinstance(item, dict) and item.get('id'):
                        catalog[item['id']] = copy.deepcopy(item)

        self.item_catalog = catalog
        self.item_display_to_id = {}
        self.item_display_to_obj = {}

        options = []
        name_counts = {}
        for item_id, item_obj in sorted(catalog.items(), key=lambda kv: self._item_label(kv[1]).lower()):
            base_name = self._item_label(item_obj)
            count = name_counts.get(base_name, 0) + 1
            name_counts[base_name] = count
            display = base_name if count == 1 else f"{base_name} {count}"
            options.append(display)
            self.item_display_to_id[display] = item_id
            self.item_display_to_obj[display] = item_obj

        self.item_combo['values'] = options
        if options:
            current = self.item_var.get()
            if current not in self.item_display_to_id:
                self.item_var.set(options[0])

        self.held_item_display_to_obj = {'(Empty)': None}
        held_options = ['(Empty)']
        held_name_counts = {}

        for item_id, item_obj in sorted(catalog.items(), key=lambda kv: self._item_label(kv[1]).lower()):
            base_name = self._item_label(item_obj)
            count = held_name_counts.get(base_name, 0) + 1
            held_name_counts[base_name] = count
            display = base_name if count == 1 else f"{base_name} {count}"
            held_options.append(display)
            self.held_item_display_to_obj[display] = item_obj

        self.held_item_combo['values'] = held_options
        if self.held_item_var.get() not in self.held_item_display_to_obj:
            self.held_item_var.set('(Empty)')

    def refresh_item_editor(self):
        if hasattr(self, 'items_listbox'):
            self.items_listbox.delete(0, tk.END)

        if not self.save.data:
            return

        self._build_item_catalog()
        self.item_visible_slots = self._get_visible_item_indices()

        # Keep empty-cell selections in item grid valid (they may be beyond current visible item count).
        if self.selected_item_slot is not None and self.selected_item_slot >= BOX_SLOTS:
            self.selected_item_slot = None

        if hasattr(self, 'items_listbox'):
            for visible_index, actual_index in enumerate(self.item_visible_slots):
                item = self.save.items[actual_index] if actual_index < len(self.save.items) else None
                self.items_listbox.insert(tk.END, f"Slot {visible_index + 1}: {self._item_label(item)}")

            if self.selected_item_slot is not None:
                self.items_listbox.selection_clear(0, tk.END)
                if 0 <= self.selected_item_slot < len(self.item_visible_slots):
                    self.items_listbox.selection_set(self.selected_item_slot)
                    self.items_listbox.see(self.selected_item_slot)

        self._sync_item_dropdown_from_selected_slot()

    def on_item_slot_select(self, event=None):
        if not self.save.data:
            return
        sel = self.items_listbox.curselection()
        if not sel:
            return
        self.selected_item_slot = sel[0]

        self._sync_item_dropdown_from_selected_slot()

        if self.editor_mode == 'items':
            self.refresh_grid()

    def set_item_slot(self):
        if not self.save.data:
            return
        if self.selected_item_slot is None:
            messagebox.showinfo("Select Slot", "Select an item slot first.")
            return

        actual_index = self._actual_item_index(self.selected_item_slot)
        if actual_index is None:
            # Allow selecting empty visual cells to create/extend item slots.
            display_count = len(self.item_visible_slots)
            pad_slots = max(0, self.selected_item_slot - display_count)
            if pad_slots > 0:
                self.save.items.extend([None] * pad_slots)
            actual_index = len(self.save.items)
            self.save.items.append(None)

        selected_item_display = self.item_var.get().strip()
        item_id = self.item_display_to_id.get(selected_item_display)
        if not item_id or item_id not in self.item_catalog:
            messagebox.showerror("Invalid Item", "Choose an item from the dropdown.")
            return

        self.save.set_item_at_slot(actual_index, copy.deepcopy(self.item_catalog[item_id]))
        self.refresh_item_editor()
        self.refresh_grid()
        self.status.config(text=f"Item slot {self.selected_item_slot + 1} set to {self._item_label(self.item_catalog[item_id])}")

    def clear_item_slot(self):
        if not self.save.data:
            return
        if self.selected_item_slot is None:
            messagebox.showinfo("Select Slot", "Select an item slot first.")
            return

        actual_index = self._actual_item_index(self.selected_item_slot)
        if actual_index is None:
            messagebox.showinfo("Select Slot", "Select an existing item slot first.")
            return

        self.save.set_item_at_slot(actual_index, None)
        self.refresh_item_editor()
        self.refresh_grid()
        self.status.config(text=f"Item slot {self.selected_item_slot + 1} cleared")

    def add_item_slot(self):
        if not self.save.data:
            return

        selected_item_display = self.item_var.get().strip()
        item_id = self.item_display_to_id.get(selected_item_display)
        item_obj = copy.deepcopy(self.item_catalog[item_id]) if item_id in self.item_catalog else None

        # Fill first open slot if one exists, otherwise append a new slot.
        try:
            actual_index = self.save.items.index(None)
            self.save.items[actual_index] = item_obj
            action = "Filled open"
        except ValueError:
            actual_index = len(self.save.items)
            self.save.items.append(item_obj)
            action = "Added new"

        self.refresh_item_editor()

        if actual_index in self.item_visible_slots:
            self.selected_item_slot = self.item_visible_slots.index(actual_index)
        else:
            self.selected_item_slot = actual_index if actual_index < BOX_SLOTS else None

        self.refresh_grid()
        if self.selected_item_slot is not None:
            self.status.config(text=f"{action} slot {self.selected_item_slot + 1}")
        else:
            self.status.config(text=f"{action} slot")

    def trim_empty_item_slot(self):
        if not self.save.data or not self.save.items:
            return
        if self.save.items and self.save.items[-1] is None:
            self.save.items.pop()
            if self.selected_item_slot is not None and self.selected_item_slot >= len(self.save.items):
                self.selected_item_slot = len(self.save.items) - 1 if self.save.items else None
            self.refresh_item_editor()
            self.refresh_grid()
            self.status.config(text="Removed last empty item slot")
        else:
            messagebox.showinfo("Nothing Removed", "Last slot has an item. Clear the last slot first, then delete it.")

    def _set_held_item_combo_from_pokemon(self, poke):
        if not hasattr(self, 'held_item_combo'):
            return

        item_obj = poke.get('item') if isinstance(poke, dict) else None
        item_id = item_obj.get('id') if isinstance(item_obj, dict) else None

        if item_id:
            for display, obj in self.held_item_display_to_obj.items():
                if isinstance(obj, dict) and obj.get('id') == item_id:
                    self.held_item_var.set(display)
                    return

            fallback_base = self._item_label(item_obj)
            fallback = fallback_base
            suffix = 2
            while fallback in self.held_item_display_to_obj and self.held_item_display_to_obj.get(fallback) != item_obj:
                fallback = f"{fallback_base} {suffix}"
                suffix += 1

            if fallback not in self.held_item_display_to_obj:
                values = list(self.held_item_combo['values'])
                values.append(fallback)
                self.held_item_combo['values'] = values
                self.held_item_display_to_obj[fallback] = item_obj
            self.held_item_var.set(fallback)
            return

        self.held_item_var.set('(Empty)')

    def on_held_item_change(self, event=None):
        if not self.save.data or self.selected_slot is None or self.editor_mode != 'pokemon':
            return

        poke = self.save.get_pokemon_at_slot(self.selected_slot)
        if not isinstance(poke, dict):
            return

        selected_display = self.held_item_var.get().strip()
        selected_item = self.held_item_display_to_obj.get(selected_display)

        if selected_item is None:
            poke.pop('item', None)
            self.status.config(text=f"Cleared held item on slot {self.selected_slot + 1}")
        else:
            poke['item'] = copy.deepcopy(selected_item)
            self.status.config(text=f"Set held item: {self._item_label(selected_item)}")

        self.refresh_grid()

    def _get_effective_team_slots(self):
        if not self.save.data:
            return TEAM_SLOTS
        raw_value = self.save.player.get('teamSlots', TEAM_SLOTS)
        try:
            team_slots = int(raw_value)
        except Exception:
            team_slots = TEAM_SLOTS
        return max(1, min(TEAM_SLOTS, team_slots))

    def _first_empty_team_slot(self):
        max_slots = self._get_effective_team_slots()
        for i in range(max_slots):
            if not self.save.get_pokemon_at_slot(i):
                return i
        return None

    def _first_empty_box_slot(self):
        for i in range(BOX_SLOTS):
            slot_index = TEAM_SLOTS + i
            if not self.save.get_pokemon_at_slot(slot_index):
                return slot_index
        return None

    def _refresh_party_button_state(self):
        if not hasattr(self, 'party_button'):
            return

        if not self.save.data or self.editor_mode != 'pokemon' or self.selected_slot is None:
            self.party_button.config(text='Add to Team')
            self.party_button.state(['disabled'])
            return

        selected_poke = self.save.get_pokemon_at_slot(self.selected_slot)
        if not selected_poke:
            self.party_button.config(text='Add to Team')
            self.party_button.state(['disabled'])
            return

        if self.selected_slot < TEAM_SLOTS:
            self.party_button.config(text='Remove from Team')
            self.party_button.state(['!disabled'])
            return

        has_open_team_slot = self._first_empty_team_slot() is not None
        self.party_button.config(text='Add to Team')
        if has_open_team_slot:
            self.party_button.state(['!disabled'])
        else:
            self.party_button.state(['disabled'])

    def toggle_party_membership(self):
        if not self.save.data or self.editor_mode != 'pokemon' or self.selected_slot is None:
            return

        selected_poke = self.save.get_pokemon_at_slot(self.selected_slot)
        if not selected_poke:
            return

        if self.selected_slot < TEAM_SLOTS:
            destination_slot = self._first_empty_box_slot()
            if destination_slot is None:
                messagebox.showinfo('Box Full', 'No empty box slot is available.')
                return

            moved_poke = copy.deepcopy(selected_poke)
            self.save.set_pokemon_at_slot(destination_slot, moved_poke)
            self.save.delete_at_slot(self.selected_slot)
            self.selected_slot = destination_slot
            self.refresh_grid()
            self.status.config(text=f'Moved Pokemon to Box slot {destination_slot - TEAM_SLOTS + 1}')
            return

        destination_slot = self._first_empty_team_slot()
        if destination_slot is None:
            messagebox.showinfo('Team Full', f'Party is full ({self._get_effective_team_slots()} slots unlocked).')
            self._refresh_party_button_state()
            return

        moved_poke = copy.deepcopy(selected_poke)
        self.save.set_pokemon_at_slot(destination_slot, moved_poke)
        self.save.delete_at_slot(self.selected_slot)
        self.selected_slot = destination_slot
        self.refresh_grid()
        self.status.config(text=f'Added Pokemon to Team slot {destination_slot + 1}')

    def _has_switchable_form(self, poke):
        if not isinstance(poke, dict):
            return False
        key = poke.get('specieKey', '')
        return key in self.FORM_SWITCHES

    def _refresh_switch_form_button_state(self):
        if not hasattr(self, 'switch_form_button'):
            return

        if not self.save.data or self.editor_mode != 'pokemon' or self.selected_slot is None:
            self.switch_form_button.state(['disabled'])
            return

        selected_poke = self.save.get_pokemon_at_slot(self.selected_slot)
        if self._has_switchable_form(selected_poke):
            self.switch_form_button.state(['!disabled'])
        else:
            self.switch_form_button.state(['disabled'])

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
            self._set_held_item_combo_from_pokemon(poke)
        else:
            self.selected_label.config(text=f"{slot_type} #{slot_num + 1}: Empty")
            self.display_sprite = None
            self.species_var.set('')
            self.level_var.set('1')
            self.held_item_var.set('(Empty)')

        self._refresh_party_button_state()
        self._refresh_switch_form_button_state()
    
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
                # Remove legacy specie object to prevent stale data conflicts
                poke.pop('specie', None)
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
        """Evolve selected Pokemon one step in its evolution chain."""
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        if poke:
            old_key = poke.get('specieKey', '')
            new_key = self.poke_data.get_next_evo(old_key)
            if old_key != new_key:
                poke['specieKey'] = new_key
                self.refresh_grid()
                self.status.config(text=f"Evolved to {self.poke_data.get_display_name(new_key)}!")
            else:
                self.status.config(text="Already fully evolved!")
    
    def devolve_pokemon(self):
        """Devolve selected Pokemon one step back in its evolution chain."""
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        if poke:
            old_key = poke.get('specieKey', '')
            new_key = self.poke_data.get_prev_evo(old_key)
            if old_key != new_key:
                poke['specieKey'] = new_key
                self.refresh_grid()
                self.status.config(text=f"Devolved to {self.poke_data.get_display_name(new_key)}!")
            else:
                self.status.config(text="Already base form!")
    
    # Form switching map: key -> alternate form key (matches in-game updateSpecie calls)
    FORM_SWITCHES = {
        'lycanrocDay': 'lycanrocNight',
        'lycanrocNight': 'lycanrocDay',
        'aegislash': 'aegislashSword',
        'aegislashSword': 'aegislash',
    }
    
    def switch_form(self):
        """Switch a Pokemon to its alternate form (Lycanroc Day/Night, Aegislash Shield/Sword, etc.)."""
        poke = self.save.get_pokemon_at_slot(self.selected_slot) if self.selected_slot is not None and self.save.data else None
        if poke:
            old_key = poke.get('specieKey', '')
            new_key = self.FORM_SWITCHES.get(old_key)
            if new_key:
                poke['specieKey'] = new_key
                self.refresh_grid()
                self.status.config(text=f"Switched form to {self.poke_data.get_display_name(new_key)}!")
            else:
                self.status.config(text="This Pokemon has no alternate form.")
    
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
    
    def _profile_ownership_key(self, key, obtainable_keys):
        if not key:
            return None
        # Profile completion is mostly tracked by root/base species keys.
        # Prioritize base-form ownership so max evolutions (e.g. cacturne)
        # correctly satisfy base-counted entries (e.g. cacnea).
        base = self.poke_data.get_base_form(key)
        if base in obtainable_keys:
            return base
        if key in obtainable_keys:
            return key
        return None

    def unlock_all(self):
        if not self.save.data:
            return

        # Collect currently owned species keys
        existing_keys = set()
        for p in self.save.team + self.save.box:
            if p:
                key = p.get('specieKey', '')
                if key:
                    existing_keys.add(key)

        # Build set of covered evolution chains for non-profile roots
        covered_chains = set()
        for key in existing_keys:
            covered_chains.add(self.poke_data.get_base_form(key))
            for chain_key in self.poke_data.get_chain(key):
                covered_chains.add(chain_key)

        # Build profile-obtainable key set (used by in-game completion counters)
        all_keys = set(self.poke_data.all_pokemon)
        explicit_unlockables = {
            'greavard', 'cacnea', 'ducklett', 'sandygast', 'luvdisc',
            'chatot', 'shedinja', 'gholdengo', 'stakataka', 'missingNo',
        }
        route_reward_keys = set(_load_route_reward_pokemon_keys())
        static_egg_keys = set(_load_egg_list_keys())
        shop_egg_keys = set(self.save.save_obj.get('shop', {}).get('eggList', []) or [])
        obtainable_keys = {
            k for k in (explicit_unlockables | route_reward_keys | static_egg_keys | shop_egg_keys)
            if k in all_keys
        }

        owned_profile_keys = set()
        for key in existing_keys:
            ownership_key = self._profile_ownership_key(key, obtainable_keys)
            if ownership_key:
                owned_profile_keys.add(ownership_key)

        count = 0
        skipped = 0
        added_to_team = 0
        unlock_targets = list(self.poke_data.get_unlock_roots())

        # Include non-root unlockables that profile counts separately.
        extra_unlocks = set()
        for extra_key in obtainable_keys:
            if self.poke_data.get_base_form(extra_key) == extra_key:
                continue
            extra_unlocks.add(extra_key)

        for extra_key in sorted(extra_unlocks):
            if extra_key not in unlock_targets:
                unlock_targets.append(extra_key)

        for key in unlock_targets:
            if key in existing_keys:
                skipped += 1
                continue

            ownership_key = self._profile_ownership_key(key, obtainable_keys)

            # If this key is counted by profile completion, require exact missing ownership key.
            if ownership_key:
                if ownership_key in owned_profile_keys:
                    skipped += 1
                    continue
            else:
                # Fallback behavior for non-profile roots: avoid same-chain duplicates.
                if key in covered_chains and key not in extra_unlocks:
                    skipped += 1
                    continue

            new_poke = self.poke_data.create_new_pokemon(key)
            team_slot = self._first_empty_team_slot()
            if team_slot is not None:
                self.save.set_pokemon_at_slot(team_slot, new_poke)
                added_to_team += 1
            else:
                self.save.box.append(new_poke)

            count += 1
            existing_keys.add(key)
            covered_chains.add(self.poke_data.get_base_form(key))
            for chain_key in self.poke_data.get_chain(key):
                covered_chains.add(chain_key)
            if ownership_key:
                owned_profile_keys.add(ownership_key)

        self.refresh_grid()
        messagebox.showinfo("Done", f"Added {count} new Pokemon!\n({added_to_team} added to Team, {count - added_to_team} added to Box)\n({skipped} already covered)")
    
    def make_all_shiny(self):
        """Make all Pokemon in team and box shiny. On vanilla saves, only max evolutions."""
        if not self.save.data:
            return
        
        has_shiny_mod = _has_feature('shiny')
        count = 0
        skipped = 0
        for poke in self.save.team + self.save.box:
            if poke and not poke.get('isShiny', False):
                if not has_shiny_mod and not self._is_max_evo(poke):
                    skipped += 1
                    continue
                poke['isShiny'] = True
                count += 1
        
        self.refresh_grid()
        msg = f"Made {count} Pokemon shiny!"
        if skipped:
            msg += f"\n({skipped} non-max evolutions skipped — Shiny mod not installed, no sprites for them)"
        messagebox.showinfo("Done", msg)
    
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
                # Only raise level to 100, never lower Pokemon already above 100
                if p.get('lvl', 1) < 100:
                    p['lvl'] = 100
                count += 1
        self.refresh_grid()
        messagebox.showinfo("Done", f"Maxed {count} Pokemon to Lv100+ and fully evolved!")
    
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
    
    def _is_max_evo(self, poke):
        """Check if a Pokemon is at its max evolution."""
        key = poke.get('specieKey') or poke.get('specie', {}).get('key', '')
        if not key:
            return True  # Unknown — allow shiny
        return self.poke_data.get_final_evo(key) == key

    def _has_shiny_sprite(self, poke):
        """Check if this Pokemon has a shiny sprite available (max evo always does, others need mod sprites)."""
        if self._is_max_evo(poke):
            return True  # Vanilla game has shiny sprites for max evolutions
        # Check if mod's bundled shiny sprites exist for this Pokemon
        key = poke.get('specieKey') or poke.get('specie', {}).get('key', '')
        sprite_key = self.poke_data.SPRITE_NAME_MAP.get(key, key)
        if PATHS.get('mod_shiny_sprites'):
            return (PATHS['mod_shiny_sprites'] / f"{sprite_key}.png").exists()
        return False

    def toggle_all_shiny(self):
        """Toggle shiny status for all Pokemon. On vanilla saves, only affects max evolutions."""
        if not self.save.data:
            return
        all_poke = [p for p in self.save.team + self.save.box if p]
        if not all_poke:
            return
        has_shiny_mod = _has_feature('shiny')
        # If any are not shiny, make all shiny; otherwise make all normal
        eligible = [p for p in all_poke if has_shiny_mod or self._is_max_evo(p)]
        any_not_shiny = any(not p.get('isShiny', False) for p in eligible)
        new_state = any_not_shiny
        for p in eligible:
            p['isShiny'] = new_state
        self.refresh_grid()
        state_text = "shiny" if new_state else "normal"
        no_mod_msg = f" ({len(eligible)} max evolutions — Shiny mod not installed)" if not has_shiny_mod and len(eligible) < len(all_poke) else ""
        messagebox.showinfo("Done", f"All{no_mod_msg} Pokemon are now {state_text}!")
    
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
    
    def remove_duplicate_pokemon(self):
        if not self.save.data:
            return

        occupied_slots = []
        for slot_index in range(TEAM_SLOTS + BOX_SLOTS):
            poke = self.save.get_pokemon_at_slot(slot_index)
            if not isinstance(poke, dict):
                continue
            key = poke.get('specieKey') or poke.get('specie', {}).get('key', '')
            if not key:
                continue

            base_key = self.poke_data.get_base_form(key)
            chain = self.poke_data.get_chain(key)
            try:
                stage_index = chain.index(key)
            except ValueError:
                stage_index = 0
            try:
                level = int(poke.get('lvl', 1) or 1)
            except Exception:
                level = 1

            occupied_slots.append({
                'slot': slot_index,
                'poke': poke,
                'base': base_key,
                'stage': stage_index,
                'level': level,
                'is_team': slot_index < TEAM_SLOTS,
            })

        if not occupied_slots:
            messagebox.showinfo("Done", "No Pokemon found.")
            return

        keep_by_base = {}
        for entry in occupied_slots:
            base = entry['base']
            current = keep_by_base.get(base)
            if current is None:
                keep_by_base[base] = entry
                continue

            candidate_rank = (entry['stage'], entry['level'], 1 if entry['is_team'] else 0)
            current_rank = (current['stage'], current['level'], 1 if current['is_team'] else 0)
            if candidate_rank > current_rank:
                keep_by_base[base] = entry

        removed = 0
        for entry in sorted(occupied_slots, key=lambda e: e['slot'], reverse=True):
            keep_entry = keep_by_base.get(entry['base'])
            if keep_entry and keep_entry['slot'] == entry['slot']:
                continue
            self.save.delete_at_slot(entry['slot'])
            removed += 1

        if removed == 0:
            messagebox.showinfo("Done", "No duplicates found.")
            return

        self.selected_slot = None
        self.refresh_grid()
        messagebox.showinfo("Done", f"Removed {removed} duplicate Pokemon (kept strongest form/level per evolution chain).")

    def clear_all_items(self):
        if not self.save.data:
            return

        inventory_count = len([item for item in self.save.items if item])
        held_count = 0

        for poke in self.save.team + self.save.box:
            if isinstance(poke, dict) and 'item' in poke:
                if poke.get('item'):
                    held_count += 1
                poke.pop('item', None)

        self.save.items.clear()
        self.selected_item_slot = None
        self.refresh_grid()

        if inventory_count == 0 and held_count == 0:
            messagebox.showinfo("Done", "No items found to clear.")
        else:
            messagebox.showinfo("Done", f"Cleared {inventory_count} inventory items and removed {held_count} held items.")

    def unlock_all_items(self):
        if not self.save.data:
            return

        self._build_item_catalog()
        all_items = [copy.deepcopy(item) for item in self.item_catalog.values() if isinstance(item, dict) and item.get('id')]
        all_items.sort(key=lambda item: self._item_label(item).lower())

        self.save.items.clear()
        self.save.items.extend(all_items)

        self.selected_item_slot = 0 if self.save.items else None
        self.refresh_grid()
        messagebox.showinfo("Done", f"Unlocked {len(all_items)} items in inventory.")

    def max_gold(self):
        if self.save.data:
            self.save.set_player('gold', 9007199254740991 if _has_feature('qol') else 99999999999)
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
        """Complete all normal star routes (2000 stars total, excludes Manaphy Cave)."""
        if not self.save.data:
            return

        EXPECTED_STAR_ROUTE_COUNT = 20

        save_obj = self.save.save_obj
        records = list(save_obj.get('player', {}).get('records', []))

        if self.route_options:
            while len(records) < len(self.route_options):
                records.append(0)

            star_indices = []
            manaphy_indices = []
            for idx, route in enumerate(self.route_options):
                route_name = str(route.get('name', '')).strip().lower()
                if 'manaphy cave' in route_name:
                    manaphy_indices.append(idx)
                else:
                    star_indices.append(idx)

            # Hard-cap to vanilla 20 star routes.
            star_indices = star_indices[:EXPECTED_STAR_ROUTE_COUNT]
            for idx in star_indices:
                records[idx] = 100

            # Secret/non-star route should not contribute to the 2000-star unlock baseline.
            for idx in manaphy_indices:
                records[idx] = 0
        else:
            while len(records) < EXPECTED_STAR_ROUTE_COUNT:
                records.append(0)
            for idx in range(EXPECTED_STAR_ROUTE_COUNT):
                records[idx] = 100

        total_stars = EXPECTED_STAR_ROUTE_COUNT * 100

        # Update records
        if 'save' in self.save.data:
            self.save.data['save']['player']['records'] = records
            self.save.data['save']['player']['stars'] = total_stars
        else:
            self.save.data['player']['records'] = records
            self.save.data['player']['stars'] = total_stars

        self.refresh_grid()
        messagebox.showinfo("Done", "All normal stages completed (Manaphy Cave excluded).\n\nTotal stars set to 2000.")

if __name__ == "__main__":
    App().mainloop()
