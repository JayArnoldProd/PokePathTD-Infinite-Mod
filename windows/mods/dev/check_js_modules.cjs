#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

if (typeof vm.SourceTextModule !== 'function') {
    console.error('SourceTextModule is unavailable. Run this check with:');
    console.error('  node --experimental-vm-modules windows/mods/dev/check_js_modules.cjs');
    process.exit(2);
}

const defaultRoot = path.resolve(__dirname, '..', 'patches');
const roots = process.argv.slice(2).map(entry => path.resolve(entry));
if (roots.length === 0) roots.push(defaultRoot);

function collectJavaScriptFiles(entry, files) {
    const stat = fs.statSync(entry);
    if (stat.isDirectory()) {
        for (const child of fs.readdirSync(entry)) {
            collectJavaScriptFiles(path.join(entry, child), files);
        }
    } else if (entry.endsWith('.js')) {
        files.push(entry);
    }
}

const files = [];
for (const root of roots) collectJavaScriptFiles(root, files);
files.sort();

let failures = 0;
for (const file of files) {
    try {
        const source = fs.readFileSync(file, 'utf8');
        new vm.SourceTextModule(source, { identifier: file });
    } catch (error) {
        failures++;
        console.error(`\n[FAIL] ${file}`);
        console.error(error.stack || error.message);
    }
}

if (failures > 0) {
    console.error(`\n${failures} of ${files.length} JavaScript modules failed to parse.`);
    process.exit(1);
}

console.log(`Parsed ${files.length} JavaScript modules successfully.`);
