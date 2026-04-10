#!/bin/bash
# PokePath TD Save Editor - Double-click to open

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

# Find Python
PYTHON_CMD=""
if command -v python3 &>/dev/null; then
    PYTHON_CMD=python3
elif command -v python &>/dev/null; then
    PYTHON_CMD=python
fi

if [ -z "$PYTHON_CMD" ]; then
    echo "Python 3 not found!"
    echo "Install via: brew install python3"
    echo "Or download from python.org"
    read -p "Press Enter to close..."
    exit 1
fi

# Check for Node.js
if ! command -v node &>/dev/null; then
    echo "Node.js not found!"
    echo "Install via: brew install node"
    echo "Or download from nodejs.org"
    read -p "Press Enter to close..."
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies (first run only)..."
    npm install --no-fund --no-audit
fi

$PYTHON_CMD save_editor.py
