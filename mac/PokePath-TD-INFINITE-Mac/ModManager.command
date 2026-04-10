#!/bin/bash
# PokePath TD Mod Manager - macOS Launcher
# Double-click this to open the mod manager menu.

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR/_internal"

# Set custom file icons on first run
if [ ! -f ".icons_set" ] && [ -d "icons" ]; then
    osascript -l JavaScript -e '
    ObjC.import("AppKit");
    var ws = $.NSWorkspace.sharedWorkspace;
    var root = "'"$ROOT_DIR"'";
    var icons = root + "/_internal/icons";
    var pairs = [
        [icons + "/modmanager.icns", root + "/ModManager.command"],
        [icons + "/saveeditor.icns", root + "/SaveEditor.command"]
    ];
    pairs.forEach(function(p) {
        var img = $.NSImage.alloc.initWithContentsOfFile(p[0]);
        if (img) ws.setIconForFileOptions(img, p[1], 0);
    });
    ' 2>/dev/null
    touch .icons_set
fi

# Check for Python 3
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
elif command -v python &>/dev/null; then
    PYTHON_CMD=python
fi

if [ -z "$PYTHON_CMD" ]; then
    echo ""
    echo "============================================"
    echo "  Python not found!"
    echo "============================================"
    echo ""
    echo "Install Python 3 via Homebrew:  brew install python3"
    echo "Or download from python.org"
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo ""
    echo "============================================"
    echo "  Node.js not found!"
    echo "============================================"
    echo ""
    echo "Install via Homebrew:  brew install node"
    echo "Or download from nodejs.org"
    echo ""
    read -p "Press Enter to close..."
    exit 1
fi

# Install npm dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install --no-fund --no-audit
    echo ""
fi

# Menu
while true; do
    clear
    echo ""
    echo "============================================"
    echo "  PokePath TD Mod Manager (macOS)"
    echo "============================================"
    echo ""
    echo "  1. Install Mods (GUI)"
    echo "  2. Run Diagnostics"
    echo "  3. Open Save Editor"
    echo "  4. Exit"
    echo ""
    read -p "Enter choice (1-4): " choice

    case "$choice" in
        1)
            $PYTHON_CMD PokePath_Mod_Installer.pyw &
            ;;
        2)
            echo ""
            echo "Running diagnostics..."
            echo ""
            $PYTHON_CMD diagnose.py
            echo ""
            read -p "Press Enter to continue..."
            ;;
        3)
            echo ""
            echo "Opening Save Editor..."
            $PYTHON_CMD save_editor.py &
            ;;
        4)
            exit 0
            ;;
    esac
done
