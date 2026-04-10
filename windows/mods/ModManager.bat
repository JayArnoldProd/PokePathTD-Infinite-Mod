@echo off
:: PokePath TD Mod Installer - GUI Launcher
:: Double-click this to open the installer

cd /d "%~dp0"

:: Check for Python (try py launcher first, then python on PATH)
set PYTHON_CMD=
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
) else (
    python --version >nul 2>&1
    if %errorlevel% equ 0 (
        set PYTHON_CMD=python
    )
)
if "%PYTHON_CMD%"=="" (
    echo.
    echo ============================================
    echo  Python not found!
    echo ============================================
    echo.
    echo Please install Python from python.org
    echo IMPORTANT: Check "Add Python to PATH" during install!
    echo.
    pause
    exit /b 1
)

:: Check for Node.js (needed for extraction)
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ============================================
    echo  Node.js not found!
    echo ============================================
    echo.
    echo Please install from nodejs.org
    echo.
    pause
    exit /b 1
)

:: Menu
:menu
cls
echo.
echo ============================================
echo   PokePath TD Mod Manager
echo ============================================
echo.
echo   1. Install Mods (GUI)
echo   2. Run Diagnostics
echo   3. Open Save Editor
echo   4. Exit
echo.
set /p choice="Enter choice (1-4): "

if "%choice%"=="1" goto installer
if "%choice%"=="2" goto diagnose
if "%choice%"=="3" goto editor
if "%choice%"=="4" exit /b 0
goto menu

:installer
:: Launch GUI installer
start "" %PYTHON_CMD% "%~dp0PokePath_Mod_Installer.pyw"
goto menu

:diagnose
echo.
echo Running diagnostics...
echo.
%PYTHON_CMD% "%~dp0diagnose.py"
goto menu

:editor
echo.
echo Opening Save Editor...
start "" %PYTHON_CMD% "%~dp0save_editor.py"
goto menu
