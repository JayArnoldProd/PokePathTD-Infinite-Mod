@echo off
:: PokePath TD Mod Installer - GUI Launcher
:: Double-click this to open the installer

cd /d "%~dp0"

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Python not found! Please install from python.org
    pause
    exit /b 1
)

:: Check for Node.js (needed for extraction)
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js not found! Please install from nodejs.org
    pause
    exit /b 1
)

:: Launch GUI installer (pythonw runs without console)
start "" pythonw "%~dp0PokePath_Mod_Installer.pyw"
