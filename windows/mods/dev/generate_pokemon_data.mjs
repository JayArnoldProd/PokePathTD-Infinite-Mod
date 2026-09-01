#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const sourceRoot = process.argv[2];
const outputPath = process.argv[3] || path.join(import.meta.dirname, 'pokemon_data.json');

if (!sourceRoot) {
    console.error('Usage: node --experimental-default-type=module generate_pokemon_data.mjs <extracted-app-root> [output]');
    process.exit(2);
}

const sourcePath = path.resolve(sourceRoot, 'src/js/game/data/pokemonData.js');
if (!fs.existsSync(sourcePath)) {
    console.error(`pokemonData.js not found: ${sourcePath}`);
    process.exit(2);
}

const { allPokemon, pokemonData } = await import(`${pathToFileURL(sourcePath).href}?v=${Date.now()}`);
const allKeys = Object.keys(pokemonData).sort((a, b) => a.localeCompare(b));
const evolutions = {};

for (const key of allKeys) {
    const evolution = pokemonData[key]?.evolution;
    if (evolution?.pokemon) {
        evolutions[key] = {
            evolves_to: evolution.pokemon,
            level: evolution.level,
        };
    }
}

const evolutionTargets = new Set(Object.values(evolutions).map(value => value.evolves_to));
const baseForms = allKeys.filter(key => !evolutionTargets.has(key));
const finalForms = allKeys.filter(key => !evolutions[key]);
const chains = {};

for (const base of baseForms) {
    const chain = [base];
    const seen = new Set(chain);
    let current = base;
    while (evolutions[current] && !seen.has(evolutions[current].evolves_to)) {
        current = evolutions[current].evolves_to;
        chain.push(current);
        seen.add(current);
    }
    chains[base] = chain;
}

const spritePath = Object.fromEntries(allKeys.map(key => {
    const baseSprite = pokemonData[key]?.sprite?.base;
    return [key, baseSprite ? path.basename(baseSprite) : `${key}.png`];
}));

const allObtainable = Array.from(new Set(allPokemon || []));
const output = { allKeys, evolutions, baseForms, finalForms, chains, spritePath, allObtainable };
fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Wrote ${allKeys.length} Pokemon keys to ${path.resolve(outputPath)}`);
