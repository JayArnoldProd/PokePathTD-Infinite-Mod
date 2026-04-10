#!/usr/bin/env python3
"""
PokePath TD Save Manager
Handles separate save locations for vanilla vs modded game.

Vanilla save: %APPDATA%/pokePathTD_Electron/Local Storage/leveldb
Modded save:  %APPDATA%/pokePathTD_Electron_modded/Local Storage/leveldb

The modded game uses app.setPath('userData', ...) to redirect Electron's
userData to pokePathTD_Electron_modded, keeping vanilla saves untouched.
"""

import os
import shutil
import subprocess
import ctypes
from pathlib import Path


def _get_real_appdata():
    """
    Get the REAL %APPDATA% path, bypassing Microsoft Store Python's
    virtualized filesystem.
    
    Store-installed Python redirects os.environ['APPDATA'] to:
      C:\\Users\\<user>\\AppData\\Local\\Packages\\PythonSoftwareFoundation...\\LocalCache\\Roaming
    instead of the real:
      C:\\Users\\<user>\\AppData\\Roaming
    
    We use SHGetFolderPath(CSIDL_APPDATA) to get the real path.
    """
    if os.name == 'nt':
        try:
            buf = ctypes.create_unicode_buffer(260)
            # CSIDL_APPDATA = 0x001a, no flags
            ctypes.windll.shell32.SHGetFolderPathW(None, 0x001a, None, 0, buf)
            real_path = buf.value
            if real_path:
                return Path(real_path)
        except Exception:
            pass
    return Path(os.environ.get('APPDATA', ''))


APPDATA = _get_real_appdata()
VANILLA_USERDATA = APPDATA / 'pokePathTD_Electron'
MODDED_USERDATA = APPDATA / 'pokePathTD_Electron_modded'
VANILLA_SAVE = VANILLA_USERDATA / 'Local Storage' / 'leveldb'
MODDED_SAVE = MODDED_USERDATA / 'Local Storage' / 'leveldb'

# .modded flag lives next to app.asar in the game's resources folder
SCRIPT_DIR = Path(__file__).parent.resolve()
MODS_DIR = SCRIPT_DIR.parent  # mods/ root
GAME_ROOT = MODS_DIR.parent
RESOURCES = GAME_ROOT / 'resources'
MOD_FLAG = RESOURCES / '.modded'


def _migrate_save_via_api():
    """
    Migrate vanilla save to modded location using save_helper.js export/import.
    
    This reads the save through LevelDB's proper API (export from vanilla),
    then writes it through the API (import to modded). This avoids raw file
    copy issues where LevelDB write-ahead logs may not replay correctly,
    which can cause subtle data corruption (e.g. starter not removed from egg shop).
    
    Returns:
        tuple: (success: bool, message: str)
    """
    save_helper = SCRIPT_DIR / 'save_helper.js'
    if not save_helper.exists():
        return False, "save_helper.js not found"
    
    creationflags = getattr(subprocess, 'CREATE_NO_WINDOW', 0)
    temp_save = SCRIPT_DIR / 'current_save.json'
    
    # Step 1: Export from vanilla save
    try:
        result = subprocess.run(
            ['node', str(save_helper), 'export'],  # no --modded = vanilla
            capture_output=True, text=True, timeout=30,
            creationflags=creationflags, cwd=str(SCRIPT_DIR)
        )
        if result.returncode != 0 or 'OK:' not in result.stdout:
            return False, f"Export failed: {result.stderr.strip() or result.stdout.strip()}"
    except subprocess.TimeoutExpired:
        return False, "Export timed out"
    except FileNotFoundError:
        return False, "Node.js not found"
    
    # Verify export produced a file
    if not temp_save.exists():
        return False, "Export succeeded but no save file produced"
    
    # Step 2: Ensure modded userData directory exists
    _mkdir_native(MODDED_SAVE.parent)
    
    # Step 3: Import to modded save
    try:
        result = subprocess.run(
            ['node', str(save_helper), 'import', '--modded'],
            capture_output=True, text=True, timeout=30,
            creationflags=creationflags, cwd=str(SCRIPT_DIR)
        )
        if result.returncode != 0 or 'OK:' not in result.stdout:
            return False, f"Import failed: {result.stderr.strip() or result.stdout.strip()}"
    except subprocess.TimeoutExpired:
        return False, "Import timed out"
    
    # Clean up temp file
    try:
        temp_save.unlink()
    except Exception:
        pass
    
    return True, "Vanilla save migrated to modded location via LevelDB API"


def _copy_dir_native(src, dest):
    """
    Copy a directory using cmd.exe robocopy to bypass Microsoft Store Python's
    filesystem virtualization. Store Python redirects all writes to
    AppData/Roaming to a virtual store, even with absolute paths.
    """
    try:
        # Ensure parent exists
        _mkdir_native(dest.parent)
        
        result = subprocess.run(
            ['cmd', '/c', 'robocopy', str(src), str(dest), '/E', '/NFL', '/NDL', '/NJH', '/NJS'],
            capture_output=True, text=True, timeout=30,
            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        )
        # robocopy returns 0-7 for success, 8+ for errors
        return result.returncode < 8
    except Exception as e:
        print(f"  [WARN] robocopy failed: {e}, falling back to shutil")
        dest.parent.mkdir(parents=True, exist_ok=True)
        if dest.exists():
            shutil.rmtree(dest)
        shutil.copytree(src, dest)
        return True


def _mkdir_native(path):
    """Create directory using cmd.exe to bypass Store Python virtualization."""
    try:
        subprocess.run(
            ['cmd', '/c', 'mkdir', str(path)],
            capture_output=True, text=True, timeout=10,
            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        )
    except Exception:
        path.mkdir(parents=True, exist_ok=True)


def is_game_running():
    """Check if PokePath TD is currently running."""
    try:
        result = subprocess.run(
            ['tasklist', '/FI', 'IMAGENAME eq pokePathTD_Electron.exe'],
            capture_output=True, text=True, timeout=10,
            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        )
        return 'pokePathTD_Electron.exe' in result.stdout
    except Exception:
        return False  # If we can't check, assume not running


def is_modded():
    """Check if the game is currently modded."""
    return MOD_FLAG.exists()


def set_mod_flag():
    """Set the .modded flag."""
    try:
        MOD_FLAG.write_text('modded', encoding='utf-8')
    except Exception as e:
        print(f"  [WARN] Could not set mod flag: {e}")


def clear_mod_flag():
    """Remove the .modded flag."""
    try:
        if MOD_FLAG.exists():
            MOD_FLAG.unlink()
    except Exception as e:
        print(f"  [WARN] Could not clear mod flag: {e}")


def _has_real_save(leveldb_path):
    """
    Check if a LevelDB directory contains actual game save data (not just scaffolding).
    
    Real saves have .ldb files with game data. An empty or freshly-initialized
    LevelDB only has LOG, LOCK, MANIFEST, CURRENT, and a tiny .log file.
    
    Uses cmd.exe dir to bypass Microsoft Store Python's filesystem virtualization.
    """
    try:
        result = subprocess.run(
            ['cmd', '/c', 'dir', '/b', str(leveldb_path) + '\\*.ldb'],
            capture_output=True, text=True, timeout=10,
            creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0)
        )
        # dir returns 0 if files found, 1 if not
        return result.returncode == 0 and result.stdout.strip() != ''
    except Exception:
        # Fallback to Python (may hit virtualization)
        if not leveldb_path.exists():
            return False
        try:
            return len(list(leveldb_path.glob('*.ldb'))) > 0
        except Exception:
            return False


def setup_modded_saves():
    """
    Set up the modded save directory.
    
    - If modded save has real game data, keep it (don't overwrite progress).
    - If modded save is empty/missing and vanilla save exists, copy vanilla to modded.
    - If no vanilla save exists, skip gracefully (fresh install).
    - Checks if game is running before migrating.
    
    Returns:
        tuple: (success: bool, message: str)
    """
    # Don't migrate while game is running
    if is_game_running():
        return False, "Game is running! Close PokePath TD before installing mods."
    
    # If modded save has real game data, keep it
    modded_has_data = _has_real_save(MODDED_SAVE)
    vanilla_has_data = _has_real_save(VANILLA_SAVE)
    
    if modded_has_data:
        set_mod_flag()
        print("  [OK] Modded save already exists with game data, keeping existing progress")
        return True, "Modded save already exists"
    
    # If vanilla save exists, migrate it to modded location via LevelDB API
    # Using save_helper.js export/import ensures data integrity (no raw file copy issues)
    if vanilla_has_data:
        print("  [*] Migrating vanilla save to modded location via LevelDB API...")
        try:
            success, msg = _migrate_save_via_api()
            if success:
                set_mod_flag()
                print(f"  [OK] {msg}")
                return True, msg
            else:
                print(f"  [WARN] API migration failed: {msg}")
                # Fallback to raw copy
                print("  [*] Falling back to raw file copy...")
                copy_ok = _copy_dir_native(VANILLA_SAVE, MODDED_SAVE)
                if copy_ok:
                    set_mod_flag()
                    print("  [OK] Vanilla save copied to modded location (raw copy)")
                    return True, "Save data copied (raw fallback)"
                return False, f"Both migration methods failed: {msg}"
        except Exception as e:
            return False, f"Failed to migrate save: {e}"
    
    # No vanilla save (fresh install) - just create directory and set flag
    print("  [SKIP] No vanilla save found (fresh install)")
    _mkdir_native(MODDED_SAVE.parent)
    set_mod_flag()
    return True, "Fresh install - no save to migrate"


def restore_vanilla():
    """
    Restore the game to vanilla state.
    
    - Restores app.asar from app.asar.vanilla backup
    - Clears the .modded flag
    - Does NOT delete modded saves (they're kept for future use)
    
    Returns:
        tuple: (success: bool, message: str)
    """
    if is_game_running():
        return False, "Game is running! Close PokePath TD first."
    
    app_asar = RESOURCES / 'app.asar'
    app_vanilla = RESOURCES / 'app.asar.vanilla'
    
    if not app_vanilla.exists():
        return False, "No vanilla backup found (app.asar.vanilla missing)"
    
    try:
        shutil.copy2(app_vanilla, app_asar)
        clear_mod_flag()
        print("  [OK] Game restored to vanilla")
        return True, "Game restored to vanilla"
    except Exception as e:
        return False, f"Failed to restore: {e}"
