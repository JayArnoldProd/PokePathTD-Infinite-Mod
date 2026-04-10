/**
 * PokePath Save Helper - Node.js LevelDB access
 * 
 * Data format: Leading 0x00 byte + UTF-16LE encoded JSON
 */

const { Level } = require('level');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync } = require('child_process');

const isModded = process.argv.includes('--modded');
const APP_FOLDER = isModded ? 'pokePathTD_Electron_modded' : 'pokePathTD_Electron';
const LEVELDB_PATH = path.join(os.homedir(), `AppData/Roaming/${APP_FOLDER}/Local Storage/leveldb`);
const SAVE_KEY = '_file://\x00\x01data';
const TEMP_FILE = path.join(__dirname, 'current_save.json');

/**
 * Check if the game process is currently running (Windows).
 */
function isGameRunning() {
    try {
        const output = execSync('tasklist /FI "IMAGENAME eq pokePathTD_Electron.exe" /NH', {
            encoding: 'utf8',
            timeout: 5000,
            windowsHide: true
        });
        return output.includes('pokePathTD_Electron.exe');
    } catch {
        return false;
    }
}

/**
 * Try to clear a stale LOCK file if the game isn't running.
 * Returns true if lock was cleared or doesn't exist.
 */
function clearStaleLock() {
    const lockPath = path.join(LEVELDB_PATH, 'LOCK');
    if (!fs.existsSync(lockPath)) return true;

    if (isGameRunning()) {
        console.error('ERROR: Game is currently running. Close PokePath TD first.');
        return false;
    }

    // Game isn't running but LOCK exists — it's stale
    try {
        fs.unlinkSync(lockPath);
        console.log('INFO: Cleared stale LOCK file');
        return true;
    } catch (e) {
        console.error(`ERROR: Cannot clear LOCK file (held by another process): ${e.message}`);
        return false;
    }
}

/**
 * Open the LevelDB with retry + stale lock cleanup.
 */
async function openDbWithRetry(maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const db = new Level(LEVELDB_PATH, { valueEncoding: 'buffer' });
            await db.open();
            return db;
        } catch (e) {
            if (attempt < maxRetries && (e.message.includes('lock') || e.message.includes('LOCK'))) {
                console.log(`INFO: DB locked, attempting to clear stale lock (attempt ${attempt + 1}/${maxRetries})`);
                if (!clearStaleLock()) {
                    throw e;
                }
                await new Promise(r => setTimeout(r, 500));
            } else {
                throw e;
            }
        }
    }
}

async function main() {
    const cmd = process.argv.filter(a => !a.startsWith('--'))[2];
    
    if (!fs.existsSync(LEVELDB_PATH)) {
        if (cmd === 'import') {
            fs.mkdirSync(LEVELDB_PATH, { recursive: true });
        } else {
            console.error('ERROR: Game save not found at', LEVELDB_PATH);
            process.exit(1);
        }
    }
    
    const db = await openDbWithRetry();
    
    try {
        if (cmd === 'export') {
            const raw = await db.get(SAVE_KEY);
            
            // Skip leading byte, decode as UTF-16LE
            const str = raw.slice(1).toString('utf16le');
            
            // Parse and save as pretty JSON
            const parsed = JSON.parse(str);
            fs.writeFileSync(TEMP_FILE, JSON.stringify(parsed, null, 2), 'utf8');
            console.log('OK:' + TEMP_FILE);
        } 
        else if (cmd === 'import') {
            const json = fs.readFileSync(TEMP_FILE, 'utf8');
            const parsed = JSON.parse(json);
            
            // Encode as UTF-16LE with leading 0x00 byte
            const utf16 = Buffer.from(JSON.stringify(parsed), 'utf16le');
            const data = Buffer.concat([Buffer.from([0x00]), utf16]);
            
            await db.put(SAVE_KEY, data);
            console.log('OK:imported');
        }
        else {
            console.log('Usage: node save_helper.js [export|import] [--modded]');
        }
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    } finally {
        try { await db.close(); } catch {}
    }
}

main().catch(e => {
    console.error('ERROR:' + e.message);
    process.exit(1);
});
