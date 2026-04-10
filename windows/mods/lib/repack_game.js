/**
 * PokePath TD - Game Repacker
 * Uses local @electron/asar to repack game files.
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
const RESOURCES = path.join(SCRIPT_DIR, '..', '..', 'resources');
const APP_ASAR = path.join(RESOURCES, 'app.asar');
const APP_EXTRACTED = path.join(RESOURCES, 'app_extracted');

// Check if extracted folder exists
if (!fs.existsSync(APP_EXTRACTED)) {
    console.error('ERROR: app_extracted folder not found');
    console.error('Expected:', APP_EXTRACTED);
    console.error('Run extraction first!');
    process.exit(1);
}

// Repack
console.log('Repacking game files...');
console.log('From:', APP_EXTRACTED);
console.log('To:', APP_ASAR);

try {
    // Create async wrapper for the pack operation
    asar.createPackage(APP_EXTRACTED, APP_ASAR).then(() => {
        console.log('OK:repacked');
    }).catch((e) => {
        console.error('ERROR: Repack failed');
        console.error(e.message);
        process.exit(1);
    });
} catch (e) {
    console.error('ERROR: Repack failed');
    console.error(e.message);
    process.exit(1);
}
