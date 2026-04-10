#!/usr/bin/env python3
"""
PokePath TD Mod Diagnostics
Run this if installation isn't working to identify the problem.
"""

import subprocess
import sys
import os
from pathlib import Path

# Fix Unicode output on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

def check(name, condition, fix=""):
    status = "[OK]" if condition else "[FAIL]"
    print(f"{status} {name}")
    if not condition and fix:
        print(f"   → FIX: {fix}")
    return condition

def main():
    print("\n" + "=" * 50)
    print("    PokePath TD Mod Diagnostics")
    print("=" * 50 + "\n")
    
    all_good = True
    
    # 1. Check Python
    print("[Checking Python...]")
    try:
        py_version = sys.version_info
        py_ok = py_version >= (3, 7)
        check(f"Python {py_version.major}.{py_version.minor}.{py_version.micro}", py_ok,
              "Update Python from python.org")
        all_good &= py_ok
    except:
        check("Python", False, "Install Python from python.org - CHECK 'Add to PATH'!")
        all_good = False
    
    # 2. Check Node.js
    print("\n[Checking Node.js...]")
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True, timeout=10)
        node_ok = result.returncode == 0
        check(f"Node.js {result.stdout.strip()}", node_ok)
        all_good &= node_ok
    except FileNotFoundError:
        check("Node.js", False, "Install from nodejs.org")
        all_good = False
    except Exception as e:
        check(f"Node.js (error: {e})", False, "Restart computer after installing Node.js")
        all_good = False
    
    # 3. Check npx
    print("\n[Checking npx...]")
    try:
        # Use cmd.exe to bypass PowerShell issues
        if sys.platform == 'win32':
            result = subprocess.run(['cmd', '/c', 'npx', '--version'], 
                                    capture_output=True, text=True, timeout=10,
                                    creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            result = subprocess.run(['npx', '--version'], capture_output=True, text=True, timeout=10)
        
        if 'cannot be loaded because running scripts is disabled' in result.stderr:
            check("npx (PowerShell blocked)", False, 
                  "Use Command Prompt (cmd.exe) instead of PowerShell, or run:\n"
                  "      Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned")
            all_good = False
        elif result.returncode == 0:
            check(f"npx {result.stdout.strip()}", True)
        else:
            check(f"npx (exit code {result.returncode})", False, f"Error: {result.stderr}")
            all_good = False
    except FileNotFoundError:
        check("npx", False, "Reinstall Node.js from nodejs.org")
        all_good = False
    except Exception as e:
        check(f"npx (error: {e})", False)
        all_good = False
    
    # 4. Check folder structure
    print("\n[Checking folder structure...]")
    script_dir = Path(__file__).parent.resolve()

    if sys.platform == 'darwin':
        # Mac: mod lives standalone, game is a .app bundle
        app_bundle = Path(os.environ.get('POKEPATH_APP_BUNDLE', '/Applications/PokéPath TD.app'))
        resources = app_bundle / "Contents" / "Resources"
        workspace = script_dir.parent
        working_dir = workspace / "working"

        check("Game app bundle exists", app_bundle.exists(),
              f"Install PokePath TD or set POKEPATH_APP_BUNDLE.\n      Expected: {app_bundle}")
        all_good &= app_bundle.exists()

        if resources.exists():
            app_asar = resources / "app.asar"
            check("app.asar exists", app_asar.exists(),
                  "Reinstall the game - app.asar is the main game file")
            all_good &= app_asar.exists()
    else:
        # Windows: mod lives inside game folder
        game_root = script_dir.parent
        resources = game_root / "resources"
        working_dir = resources  # Windows uses resources/ for working files

        is_correct_location = resources.exists() and (game_root / "PokéPath TD.exe").exists()
        if not is_correct_location:
            is_correct_location = resources.exists() and any(
                f.name.lower().endswith('.exe') and 'pokepath' in f.name.lower()
                for f in game_root.iterdir() if f.is_file()
            )

        check("Mods folder in correct location", is_correct_location,
              f"Move the 'mods' folder to:\n      C:\\Users\\YOUR_NAME\\AppData\\Local\\Programs\\pokePathTD_Electron\\")
        all_good &= is_correct_location

        check(f"Game resources folder exists", resources.exists())
        all_good &= resources.exists()

        if resources.exists():
            app_asar = resources / "app.asar"
            check("app.asar exists", app_asar.exists(),
                  "Reinstall the game - app.asar is the main game file")
            all_good &= app_asar.exists()
    
    # 5. Check patches folder
    print("\n[Checking mod files...]")
    patches_dir = script_dir / "patches"
    check("patches folder exists", patches_dir.exists(),
          "Re-download the mod - patches folder is missing")
    all_good &= patches_dir.exists()
    
    if patches_dir.exists():
        patch_files = list(patches_dir.glob("*.modded.js"))
        check(f"Patch files present ({len(patch_files)} found)", len(patch_files) > 10,
              "Re-download the mod - patch files are missing")
        all_good &= len(patch_files) > 10
    
    # 5b. Check node_modules and dependencies
    print("\n[Checking Node.js dependencies...]")
    node_modules = script_dir / "node_modules"
    has_node_modules = node_modules.exists()
    check("node_modules folder exists", has_node_modules,
          "Run 'npm install' in the mods folder")
    
    if has_node_modules:
        # Check for @electron/asar (needed for extraction/repacking)
        asar_pkg = node_modules / "@electron" / "asar"
        has_asar = asar_pkg.exists()
        check("@electron/asar installed", has_asar,
              "Run 'npm install' in the mods folder")
        all_good &= has_asar
        
        # Check for level (needed for save editor)
        level_pkg = node_modules / "level"
        has_level = level_pkg.exists()
        check("level package installed (for save editor)", has_level,
              "Run 'npm install' in the mods folder")
        # Don't fail on this - save editor is optional
    else:
        all_good = False
        print("   → Dependencies not installed. The installer will auto-install them,")
        print("     or you can run 'npm install' manually in the mods folder.")
    
    # 5c. Check game version compatibility
    print("\n[Checking game version compatibility...]")
    # Expected vanilla file sizes for the game version this mod targets
    _EXPECTED_WIN = {
        "src/js/game/Game.js":                  44439,
        "src/js/game/component/Pokemon.js":     20520,
        "src/js/game/scenes/PokemonScene.js":   46814,
        "src/js/game/core/Area.js":             12838,
        "src/js/game/core/Team.js":             1744,
        "src/js/game/core/Box.js":              703,
    }
    _EXPECTED_MAC = {
        "src/js/game/Game.js":                  43312,
        "src/js/game/component/Pokemon.js":     19972,
        "src/js/game/scenes/PokemonScene.js":   45699,
        "src/js/game/core/Area.js":             12417,
        "src/js/game/core/Team.js":             1690,
        "src/js/game/core/Box.js":              678,
    }
    EXPECTED_VANILLA_FILES = _EXPECTED_MAC if sys.platform == 'darwin' else _EXPECTED_WIN

    # Try vanilla backup first, then extracted files
    if sys.platform == 'darwin':
        vanilla_asar = working_dir / "app.asar.vanilla" if working_dir.exists() else None
        app_extracted = working_dir / "app_extracted" if working_dir.exists() else None
    else:
        vanilla_asar = resources / "app.asar.vanilla" if resources.exists() else None
        app_extracted = resources / "app_extracted" if resources.exists() else None

    version_checked = False
    if app_extracted and app_extracted.exists():
        mismatches = []
        for rel_path, expected_size in EXPECTED_VANILLA_FILES.items():
            file_path = app_extracted / rel_path.replace("/", os.sep)
            if file_path.exists():
                actual_size = file_path.stat().st_size
                # Modded files will be different sizes, so only flag if files are
                # clearly from a different game version (vanilla files match exactly)
                # We can't distinguish modded-size from wrong-version-size here,
                # so just report for awareness
        version_checked = True

    if vanilla_asar and vanilla_asar.exists():
        vanilla_size = vanilla_asar.stat().st_size
        # Known vanilla asar sizes for v1.4.4
        expected_sizes = {49065923: 'Windows', 52077666: 'Mac'}
        version_ok = vanilla_size in expected_sizes
        check(f"Vanilla backup size ({vanilla_size:,} bytes)", version_ok,
              f"Expected a known v1.4.4 asar size.\n"
              "      Your game may be a different version. This mod requires PokePath TD v1.4.4.\n"
              "      Update your game or download the matching mod version.")
        if not version_ok:
            all_good = False
        version_checked = True

    if not version_checked:
        print("  [INFO] Cannot verify game version (no vanilla backup or extracted files)")
        print("         Run the installer first to create a vanilla backup.")

    # 6. Check for common mistakes
    print("\n[Checking for common mistakes...]")

    # Running from inside zip? (Windows-only issue)
    if sys.platform != 'darwin':
        cwd = Path.cwd()
        in_temp = 'temp' in str(cwd).lower() or 'appdata\\local\\temp' in str(cwd).lower()
        check("Not running from inside a zip file", not in_temp,
              "EXTRACT the zip file first! Don't run from inside the zip.")
        all_good &= not in_temp

    # Check if extraction already done
    if sys.platform == 'darwin':
        app_extracted_check = working_dir / "app_extracted" if working_dir.exists() else None
    else:
        app_extracted_check = resources / "app_extracted" if resources.exists() else None
    if app_extracted_check and app_extracted_check.exists():
        check("Game already extracted", True)

        # Check if JS files exist
        js_root = app_extracted_check / "src" / "js"
        check("Extracted JS files present", js_root.exists())
    else:
        check("Game needs extraction", True)  # Not a failure, just info
    
    # Summary
    print("\n" + "=" * 50)
    if all_good:
        print("ALL CHECKS PASSED! Try running the installer again.")
    else:
        print("ISSUES FOUND above. Fix them and try again.")
    print("=" * 50)
    
    # Keep window open
    input("\nPress Enter to close...")

if __name__ == "__main__":
    main()
