/**
 * PokePath TD - Game Extractor
 * Uses local @electron/asar to extract game files.
 * More reliable than npx asar which can fail on some systems.
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
const RESOURCES = path.join(SCRIPT_DIR, '..', 'resources');
const APP_ASAR = path.join(RESOURCES, 'app.asar');
const APP_EXTRACTED = path.join(RESOURCES, 'app_extracted');

// Check if resources folder exists
if (!fs.existsSync(RESOURCES)) {
    console.error('ERROR: resources folder not found');
    console.error('Expected:', RESOURCES);
    console.error('Make sure the mods folder is inside the game directory!');
    process.exit(1);
}

// Check if app.asar exists
if (!fs.existsSync(APP_ASAR)) {
    console.error('ERROR: app.asar not found');
    console.error('Expected:', APP_ASAR);
    console.error('The game may need to be reinstalled.');
    process.exit(1);
}

// Check if already extracted
if (fs.existsSync(APP_EXTRACTED)) {
    console.log('OK:already_extracted');
    process.exit(0);
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
