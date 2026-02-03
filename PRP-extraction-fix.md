# PRP: Fix Game Extraction Failures

## Problem
User gets "failed to extract game files" with Node.js module loader error:
```
node:internal/modules/cjs/loader:533 throw err;
```

Diagnostics pass but extraction still fails.

## Root Cause Analysis
The `npx asar extract` command is failing due to:
1. **asar package not cached** — npx needs to download it first time
2. **Node.js version incompatibility** — user reported v24.13.0 (doesn't exist - likely typo or corrupted)
3. **npx execution issues** — even with cmd.exe wrapper, something fails

## Solution

### 1. Pre-install asar locally
Instead of relying on `npx asar`, install asar as a local dependency and run it directly.

**Changes to package.json:**
```json
{
  "dependencies": {
    "level": "^8.0.1",
    "@electron/asar": "^3.2.0"
  }
}
```

### 2. Add extraction script
Create `extract_game.js` that uses the local asar module directly:
```javascript
const asar = require('@electron/asar');
const path = require('path');

const resources = path.join(__dirname, '..', 'resources');
const src = path.join(resources, 'app.asar');
const dest = path.join(resources, 'app_extracted');

asar.extractAll(src, dest);
console.log('OK:extracted');
```

### 3. Update installer to use local asar
Modify `PokePath_Mod_Installer.pyw` to:
1. Check if node_modules exists, run `npm install` if not
2. Use `node extract_game.js` instead of `npx asar extract`
3. Fall back to npx if local method fails

### 4. Update diagnose.py
Add checks for:
- node_modules folder exists
- @electron/asar package installed
- Specific extraction test

## Implementation Steps
1. Update package.json with @electron/asar dependency
2. Create extract_game.js script
3. Create repack_game.js script  
4. Update PokePath_Mod_Installer.pyw to use local scripts
5. Update apply_mods.py repack to use local script
6. Update diagnose.py with new checks
7. Test on clean install

## Files to Modify
- `mods/package.json`
- `mods/extract_game.js` (new)
- `mods/repack_game.js` (new)
- `mods/PokePath_Mod_Installer.pyw`
- `mods/apply_mods.py`
- `mods/diagnose.py`
