#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const gameJsRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;

if (!gameJsRoot) {
    console.error('Usage: node windows/mods/dev/check_unlockables.cjs <path-to-game-src-js>');
    process.exit(2);
}

const profilePath = path.join(repoRoot, 'windows', 'mods', 'patches', 'ProfileScene.modded.js');
const textPath = path.join(repoRoot, 'windows', 'mods', 'patches', 'text.modded.js');
const pokemonDataPath = path.join(gameJsRoot, 'game', 'data', 'pokemonData.js');
const itemDataPath = path.join(gameJsRoot, 'game', 'data', 'itemData.js');
const routeDataPath = path.join(gameJsRoot, 'game', 'data', 'routeData.js');
const achievementDataPath = path.join(gameJsRoot, 'game', 'data', 'achievementReworkData.js');
const redeemProtocolPath = path.join(gameJsRoot, 'file', 'redeemProtocol.js');

for (const requiredPath of [profilePath, textPath, pokemonDataPath, itemDataPath, routeDataPath, achievementDataPath, redeemProtocolPath]) {
    if (!fs.existsSync(requiredPath)) {
        console.error(`Required file not found: ${requiredPath}`);
        process.exit(2);
    }
}

function fail(message) {
    console.error(`Unlockables audit failed: ${message}`);
    process.exitCode = 1;
}

function extractBalanced(source, marker, openChar, closeChar) {
    const markerIndex = source.indexOf(marker);
    if (markerIndex < 0) throw new Error(`Marker not found: ${marker}`);
    const start = source.indexOf(openChar, markerIndex + marker.length);
    if (start < 0) throw new Error(`Opening ${openChar} not found after: ${marker}`);

    let depth = 0;
    let quote = null;
    let escaped = false;
    for (let index = start; index < source.length; index++) {
        const char = source[index];
        if (quote) {
            if (escaped) escaped = false;
            else if (char === '\\') escaped = true;
            else if (char === quote) quote = null;
            continue;
        }
        if (char === "'" || char === '"' || char === '`') {
            quote = char;
            continue;
        }
        if (char === openChar) depth++;
        else if (char === closeChar && --depth === 0) return source.slice(start, index + 1);
    }
    throw new Error(`Unclosed ${openChar} after: ${marker}`);
}

function evaluateLiteral(literal, filename) {
    return vm.runInNewContext(`(${literal})`, Object.create(null), { filename });
}

function routeBlocks(source) {
    const starts = [...source.matchAll(/^\t(\d+): \{/gm)];
    return starts.map((match, index) => ({
        id: Number(match[1]),
        source: source.slice(match.index, starts[index + 1]?.index ?? source.length),
    }));
}

const profileSource = fs.readFileSync(profilePath, 'utf8');
const textSource = fs.readFileSync(textPath, 'utf8');
const pokemonSource = fs.readFileSync(pokemonDataPath, 'utf8');
const itemSource = fs.readFileSync(itemDataPath, 'utf8');
const routeSource = fs.readFileSync(routeDataPath, 'utf8');
const achievementSource = fs.readFileSync(achievementDataPath, 'utf8');
const redeemSource = fs.readFileSync(redeemProtocolPath, 'utf8');

let profileText;
let sharedText;
let listedSecretKeys;
let vanillaSecretKeys;
try {
    profileText = evaluateLiteral(
        extractBalanced(profileSource, 'const PROFILE_UNLOCKABLE_TEXT =', '{', '}'),
        profilePath
    );
    sharedText = evaluateLiteral(
        extractBalanced(textSource, 'unlockables:', '{', '}'),
        textPath
    );
    listedSecretKeys = evaluateLiteral(
        extractBalanced(profileSource, 'const SECRET_POKEMON_KEYS =', '[', ']'),
        profilePath
    );
    vanillaSecretKeys = evaluateLiteral(
        extractBalanced(pokemonSource, 'const secretPokemon =', '[', ']'),
        pokemonDataPath
    );
} catch (error) {
    fail(error.message);
    process.exit(1);
}

const requiredTextKeys = new Set(
    [...profileSource.matchAll(/getProfileUnlockableText\('([^']+)'/g)].map((match) => match[1])
);
for (const key of requiredTextKeys) {
    const fallbackValue = profileText[key];
    const sharedValue = sharedText[key];
    if (!Array.isArray(fallbackValue) || fallbackValue.length !== 10) {
        fail(`PROFILE_UNLOCKABLE_TEXT.${key} must contain exactly 10 languages`);
        continue;
    }
    if (!Array.isArray(sharedValue) || sharedValue.length !== 10) {
        fail(`text.profile.unlockables.${key} must contain exactly 10 languages`);
        continue;
    }
    if (JSON.stringify(fallbackValue) !== JSON.stringify(sharedValue)) {
        fail(`fallback and shared translations differ for ${key}`);
    }
}

function checkTenLanguages(label, values) {
    if (!Array.isArray(values) || values.length !== 10) {
        fail(`${label} must contain exactly 10 languages`);
    } else if (values.some((value) => typeof value !== 'string' || !value.trim())) {
        fail(`${label} contains a missing or empty translation`);
    }
}

function dataEntry(source, key, filename) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = new RegExp(`^\\t${escapedKey}: \\{`, 'm').exec(source);
    if (!match) throw new Error(`${filename}: data entry not found for ${key}`);
    return extractBalanced(source.slice(match.index), `${key}:`, '{', '}');
}

function propertyArray(source, property, filename) {
    return evaluateLiteral(extractBalanced(source, `${property}:`, '[', ']'), filename);
}

const sourceToUnlockKey = (key) => key === 'cacturne' ? 'cacnea' : key;
const expectedSecretKeys = vanillaSecretKeys.map(sourceToUnlockKey);
const missingKeys = expectedSecretKeys.filter((key) => !listedSecretKeys.includes(key));
const staleKeys = listedSecretKeys.filter((key) => !expectedSecretKeys.includes(key));
if (missingKeys.length) fail(`SECRET_POKEMON_KEYS is missing: ${missingKeys.join(', ')}`);
if (staleKeys.length) fail(`SECRET_POKEMON_KEYS has stale entries: ${staleKeys.join(', ')}`);

const keyToEntryId = (key) => key === 'missingNo'
    ? 'secret-missingno'
    : `secret-${key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;
const entryIds = new Set(
    [...profileSource.matchAll(/id: '(secret-[a-z0-9-]+)'/g)].map((match) => match[1])
);
for (const key of expectedSecretKeys) {
    const entryId = keyToEntryId(key);
    if (!entryIds.has(entryId)) fail(`no Unlockables row found for vanilla secret Pokémon ${key} (${entryId})`);
}

const routeRewardPokemon = new Set();
const routeRewardItems = new Set();
for (const route of routeBlocks(routeSource)) {
    try {
        checkTenLanguages(
            `routeData[${route.id}].name`,
            propertyArray(route.source, 'name', routeDataPath)
        );
        if (/\bchallengeReward:/.test(route.source)) {
            const rewards = propertyArray(route.source, 'challengeReward', routeDataPath);
            rewards.forEach((key, index) => (index === 1 ? routeRewardPokemon : routeRewardItems).add(key));
        }
    } catch (error) {
        fail(error.message);
    }
}

const referencedPokemon = new Set([
    ...expectedSecretKeys,
    ...routeRewardPokemon,
    'lunatone', 'solrock', 'corsola', 'sirfetchd',
]);
for (const key of referencedPokemon) {
    try {
        const entry = dataEntry(pokemonSource, key, pokemonDataPath);
        checkTenLanguages(`pokemonData.${key}.name`, propertyArray(entry, 'name', pokemonDataPath));
    } catch (error) {
        fail(error.message);
    }
}

for (const key of new Set([...routeRewardItems, 'strangeIdol'])) {
    try {
        const entry = dataEntry(itemSource, key, itemDataPath);
        checkTenLanguages(`itemData.${key}.name`, propertyArray(entry, 'name', itemDataPath));
    } catch (error) {
        fail(error.message);
    }
}

for (const id of [19, 23, 26]) {
    const match = new RegExp(`\\bid:\\s*${id},`).exec(achievementSource);
    if (!match) {
        fail(`achievementReworkData is missing id ${id}`);
        continue;
    }
    try {
        checkTenLanguages(
            `achievementReworkData[${id}].description`,
            propertyArray(achievementSource.slice(match.index), 'description', achievementDataPath)
        );
    } catch (error) {
        fail(error.message);
    }
}

const secretMapIds = routeBlocks(routeSource)
    .filter((route) => /\bisSecret:\s*true\b/.test(route.source))
    .map((route) => route.id);
const mapEntryByRouteId = new Map([
    [20, 'secret-manaphy-cave'],
    [30, 'secret-mirage-island'],
    [31, 'secret-victini-cave'],
    [32, 'secret-marshadow-cave'],
    [33, 'secret-castle-room'],
]);
for (const routeId of secretMapIds) {
    const entryId = mapEntryByRouteId.get(routeId);
    if (!entryId) fail(`secret route ${routeId} has no audited Unlockables mapping`);
    else if (!entryIds.has(entryId)) fail(`no Unlockables row found for secret route ${routeId} (${entryId})`);
}
for (const routeId of mapEntryByRouteId.keys()) {
    if (!secretMapIds.includes(routeId)) fail(`stale secret-map mapping for route ${routeId}`);
}

const redeemRewards = extractBalanced(redeemSource, 'rewards:', '[', ']');
const redeemIds = [...redeemRewards.matchAll(/^\s*id: '([^']+)',/gm)].map((match) => match[1]);
const redeemEntryById = new Map([
    ['missingno', 'secret-missingno'],
    ['gold25k', 'secret-gold25k'],
    ['sandyShocks', 'secret-sandy-shocks'],
    ['ironThorns', 'secret-iron-thorns'],
]);
for (const rewardId of redeemIds) {
    const entryId = redeemEntryById.get(rewardId);
    if (!entryId) fail(`redeem reward ${rewardId} has no audited Unlockables mapping`);
    else if (!entryIds.has(entryId)) fail(`no Unlockables row found for redeem reward ${rewardId} (${entryId})`);
}
for (const rewardId of redeemEntryById.keys()) {
    if (!redeemIds.includes(rewardId)) fail(`stale redeem-reward mapping for ${rewardId}`);
}

if (!process.exitCode) {
    console.log(
        `Unlockables audit passed: ${vanillaSecretKeys.length} secret Pokémon, ` +
        `${secretMapIds.length} secret maps, ${redeemIds.length} redeem rewards, ` +
        `${requiredTextKeys.size} translated UI strings × 10 languages, ` +
        `and localized names for every listed route/reward.`
    );
}
