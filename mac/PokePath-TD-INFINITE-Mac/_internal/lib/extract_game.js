/**
 * PokePath TD - Game Extractor
 * Uses local @electron/asar to extract game files.
 * More reliable than npx asar which can fail on some systems.
 *
 * Path inputs (in priority order):
 *   1. POKEPATH_APP_ASAR / POKEPATH_APP_EXTRACTED env vars
 *   2. argv[2] / argv[3]    (CLI: node extract_game.js <asar> <dest>)
 *   3. Legacy Windows fallback: ../../resources/app.asar (mod-inside-game-folder layout)
 */

const path = require('path');
const fs = require('fs');

// Try to load asar
let asar;
try {
    asar = require('@electron/asar');
} catch (e) {
    console.error('ERROR: @electron/asar not installed');
    console.error('Run: npm install');
    process.exit(1);
}

const SCRIPT_DIR = __dirname;
const LEGACY_RESOURCES = path.join(SCRIPT_DIR, '..', '..', 'resources');

const APP_ASAR = process.env.POKEPATH_APP_ASAR
    || process.argv[2]
    || path.join(LEGACY_RESOURCES, 'app.asar');
const APP_EXTRACTED = process.env.POKEPATH_APP_EXTRACTED
    || process.argv[3]
    || path.join(LEGACY_RESOURCES, 'app_extracted');

// Check if app.asar exists
if (!fs.existsSync(APP_ASAR)) {
    console.error('ERROR: app.asar not found');
    console.error('Expected:', APP_ASAR);
    console.error('Set POKEPATH_APP_ASAR or pass the asar path as argv[2].');
    process.exit(1);
}

// Check if already extracted
if (fs.existsSync(APP_EXTRACTED)) {
    console.log('OK:already_extracted');
    process.exit(0);
}

// Make sure the parent of APP_EXTRACTED exists (e.g. ~/Code/.../working/)
const EXTRACT_PARENT = path.dirname(APP_EXTRACTED);
if (!fs.existsSync(EXTRACT_PARENT)) {
    try {
        fs.mkdirSync(EXTRACT_PARENT, { recursive: true });
    } catch (e) {
        console.error('ERROR: Could not create extract parent dir:', EXTRACT_PARENT);
        console.error(e.message);
        process.exit(1);
    }
}

// Extract
console.log('Extracting game files...');
console.log('From:', APP_ASAR);
console.log('To:', APP_EXTRACTED);

try {
    asar.extractAll(APP_ASAR, APP_EXTRACTED);
    console.log('OK:extracted');
} catch (e) {
    console.error('ERROR: Extraction failed');
    console.error(e.message);
    process.exit(1);
}
