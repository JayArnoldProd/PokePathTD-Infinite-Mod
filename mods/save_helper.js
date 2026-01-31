/**
 * PokePath Save Helper - Node.js LevelDB access
 * 
 * Data format: Leading 0x00 byte + UTF-16LE encoded JSON
 */

const { Level } = require('level');
const path = require('path');
const fs = require('fs');
const os = require('os');

const LEVELDB_PATH = path.join(os.homedir(), 'AppData/Roaming/pokePathTD_Electron/Local Storage/leveldb');
const SAVE_KEY = '_file://\x00\x01data';
const TEMP_FILE = path.join(__dirname, 'current_save.json');

async function main() {
    const cmd = process.argv[2];
    
    if (!fs.existsSync(LEVELDB_PATH)) {
        console.error('ERROR: Game save not found at', LEVELDB_PATH);
        process.exit(1);
    }
    
    const db = new Level(LEVELDB_PATH, { valueEncoding: 'buffer' });
    
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
            console.log('Usage: node save_helper.js [export|import]');
        }
    } catch (e) {
        console.error('ERROR:', e.message);
        process.exit(1);
    } finally {
        await db.close();
    }
}

main().catch(e => {
    console.error('ERROR:' + e.message);
    process.exit(1);
});
