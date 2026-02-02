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
    game_root = script_dir.parent
    resources = game_root / "resources"
    
    # Check if mods folder is in right place
    is_correct_location = resources.exists() and (game_root / "PokéPath TD.exe").exists()
    if not is_correct_location:
        # Try alternate exe name
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
    
    # 6. Check for common mistakes
    print("\n[Checking for common mistakes...]")
    
    # Running from inside zip?
    cwd = Path.cwd()
    in_temp = 'temp' in str(cwd).lower() or 'appdata\\local\\temp' in str(cwd).lower()
    check("Not running from inside a zip file", not in_temp,
          "EXTRACT the zip file first! Don't run from inside the zip.")
    all_good &= not in_temp
    
    # Check if extraction already done
    app_extracted = resources / "app_extracted" if resources.exists() else None
    if app_extracted and app_extracted.exists():
        check("Game already extracted", True)
        
        # Check if JS files exist
        js_root = app_extracted / "src" / "js"
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
