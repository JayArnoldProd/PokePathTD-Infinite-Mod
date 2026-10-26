// MOD: finite vanilla egg progression, independent of permission to keep duplicates.
import { pokemonData, eggListData } from '../data/pokemonData.js';

export function eggSpecies(entry) {
    if (typeof entry === 'string') return pokemonData[entry] || null;
    if (!entry || typeof entry !== 'object') return null;
    for (const key of [entry.specieKey, entry.key, entry.species]) {
        if (pokemonData[key]) return pokemonData[key];
    }
    if (entry.specie) return eggSpecies(entry.specie);
    if (entry.id != null) {
        return pokemonData[entry.id] || Object.values(pokemonData).find(p => String(p.id) === String(entry.id)) || null;
    }
    return null;
}

export function reconcileEggList(shop) {
    const canonical = new Map();
    for (const entry of eggListData) {
        const specie = eggSpecies(entry);
        if (specie) canonical.set(String(specie.id), entry);
    }
    const owned = new Set();
    for (const pokemon of [...(shop.main.team?.pokemon || []), ...(shop.main.box?.pokemon || [])]) {
        const specie = eggSpecies(pokemon);
        if (specie) owned.add(String(specie.id));
    }
    const seen = new Set();
    const result = [];
    // Keep the order of valid saved eggs, then append genuinely new/missing lines.
    for (const entry of [...(Array.isArray(shop.eggList) ? shop.eggList : []), ...eggListData]) {
        const specie = eggSpecies(entry);
        const id = specie && String(specie.id);
        if (!id || owned.has(id) || seen.has(id) || !canonical.has(id)) continue;
        seen.add(id);
        result.push(canonical.get(id));
    }
    shop.eggList = result;
}
