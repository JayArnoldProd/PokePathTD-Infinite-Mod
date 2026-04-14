# PRP — PokePath TD INFINITE: 1.5 Content Sync, Shiny Assets, and Save Editor

## Problem Statement
PokePath TD 1.5 adds **39 new Pokémon** and likely new associated items/shop/editor data. The current mod has content-side systems that depend on curated Pokémon metadata, pre-generated shiny sprite assets, and save-editor assumptions about valid species and egg pools. A pure gameplay rebase is not enough.

This PRP covers the **content/data side** of the 1.5 upgrade:
- update Pokémon metadata and evolution/form handling
- generate or ingest shiny sprites for newly needed non-final evolutions
- update egg/shop/item compatibility where 1.5 adds new content
- update save editor behavior and asset discovery so the new content is editable and renders correctly

This PRP intentionally assumes the core 1.5 Windows compatibility rebase is handled by the companion PRP.

Official 1.5 patch notes add more urgency here than we originally assumed. Upstream explicitly changed:
- 39 new Pokémon, 5 new Megas, 37 new Abilities, 21 new Items
- UI/scene behavior in Box, Inventory, Shop, Map, Challenge, Menu, and Profile
- drag-and-drop Pokémon movement between Box and UI
- drag-and-drop item equip flow
- shop slot count from 6 to 9
- Box filtering with a new Critical % filter
- route-aware draft behavior and reroll support

That means this PRP is not just about “new Pokémon data.” It also has to validate the save editor, item metadata, filters, scene assumptions, and content-facing UI against the new vanilla structure.

---

## Current State Snapshot
### Pokémon metadata source of truth
From `windows/mods/save_editor.py`:
```python
TEMP_SAVE = SCRIPT_DIR / 'lib' / 'current_save.json'
POKEMON_DATA_FILE = SCRIPT_DIR / 'dev' / 'pokemon_data.json'
```

The save editor is directly coupled to `windows/mods/dev/pokemon_data.json`.

From `windows/mods/dev/pokemon_data.json`:
```json
{
  "allKeys": [
    "charmander",
    "charmeleon",
    "charizard",
    "megaCharizardX",
```
The file also contains structured metadata keys including:
- `allKeys`
- `evolutions`
- `baseForms`
- `finalForms`
- `chains`
- `spritePath`

Current quick inventory:
- `pokemon_data.json` currently exposes **214** keys in `allKeys`
- `windows/mods/patches/shiny_sprites/` currently contains **212** PNG assets

That mismatch is already a warning that not every key maps 1:1 to a generated shiny sprite file, so 1.5 content should be handled carefully, not by count alone.

### Save editor sprite resolution already has shiny-path logic
From `save_editor.py`:
```python
# Try shiny paths in order of priority
if is_shiny:
```
So the editor already contains special-case shiny lookup behavior. New 1.5 content must plug into that instead of inventing a parallel path.

### Existing shiny-system feature is part of installer feature flags
From `windows/mods/lib/apply_mods.py`:
```python
'shiny_system': {
    'label': 'Shiny Eggs + Starters + Sprites',
    'functions': ['apply_shiny_eggs', 'apply_shiny_starters', 'apply_shiny_sprites'],
},
```
That means shiny assets are first-class installable content, not optional scratch data.

### Existing save-editor egg reset logic
From `save_editor.py` around the egg sync path:
```python
missing = [egg for egg in all_eggs if egg not in current_eggs]
if missing:
```
The editor already normalizes egg pools. New 1.5 Pokémon/item additions need to flow through this logic correctly.

---

## Architecture Diagram
```text
Upstream 1.5 content
   |        |        |
   |        |        +--> item/shop/egg definitions
   |        +------------> Pokémon species/forms/evolutions
   +---------------------> sprite filenames / runtime asset paths
                |
                v
windows/mods/dev/pokemon_data.json
                |
        +-------+------------------+
        |                          |
        v                          v
save_editor.py               shiny sprite pipeline
        |                          |
        +------------ installer / patch assets
                           |
                           v
modded 1.5 content + tools
```

---

## Files to Create
- `windows/mods/dev/POKEMON_150_AUDIT.md`
  - list the 39 new Pokémon, forms, evolutions, and any item/shop implications
- Optional generator notes if a shiny pipeline script is rediscovered:
  - `windows/mods/dev/SHINY_PIPELINE_150.md`

## Files to Modify
- `windows/mods/dev/pokemon_data.json`
- `windows/mods/save_editor.py`
- `windows/mods/lib/apply_mods.py` (only if shiny asset copy/install logic needs expansion)
- `windows/mods/dev/MOD_FEATURES_CHECKLIST.md`
- relevant patch files if new upstream item/shop/Pokémon logic changed:
  - likely `Pokemon.modded.js`
  - likely `ShopScene.modded.js`
  - likely `ItemData.modded.js`
  - any other upstream files that now own 1.5 species or item data
- `windows/mods/patches/shiny_sprites/*`

## Files to Reference
- `windows/mods/dev/pokemon_data.json`
- `windows/mods/save_editor.py`
- `windows/mods/lib/apply_mods.py`
- `windows/mods/dev/MOD_FEATURES_CHECKLIST.md`
- `README.md`
- `https://pokemondb.net/pokedex/shiny` (user-supplied reference source)
- any rediscovered local shiny/hue-shift generation script in the mod-dev workspace or `C:\Users\jayar\clawd`

---

## Implementation Blueprint

### Phase 1 — Audit the 39 new Pokémon before generating anything
Do not jump straight to sprite generation.

Build an explicit audit table for each new 1.5 Pokémon covering:
- internal key / expected game key
- display name
- evolution chain position
- whether it is final-form or not
- whether it needs a shiny sprite under mod rules
- whether it has alternate forms / weapon forms / branch evolutions / special handling
- whether it appears in egg pools, shop pools, item rewards, or save-editor UI

This matters because user explicitly called out edge cases like form-swapping Pokémon and unusual evolution rules.

### Phase 2 — Update `pokemon_data.json` as the canonical metadata layer
The file already carries:
- all species keys
- evolution relationships
- base/final form information
- sprite path metadata

For 1.5:
1. add the 39 new Pokémon keys
2. add any new forms and aliases carefully
3. update chain metadata
4. verify base-vs-final classification, because shiny generation rules depend on it
5. make sure sprite path entries match actual runtime/game filenames

Do not treat alternate forms as trivial copies unless the vanilla 1.5 assets prove they are.

### Phase 3 — Rebuild or extend shiny sprite coverage
Current shiny content lives under:
- `windows/mods/patches/shiny_sprites/`

The mod rule is: non-max evolutions get custom shiny sprites. That means every newly added non-final species or eligible form must be audited for whether the mod should ship:
- `name.png`
- `name-idle.png`
- any other required runtime variants

If the old hue-shift / pixel-diff generation script still exists, prefer reusing it so the new assets match prior mod behavior. If not, document the manual pipeline in the PRP update notes before generating assets.

### Phase 4 — Save editor compatibility
The save editor uses `pokemon_data.json`, shiny-path logic, and egg normalization behavior.

Required checks:
1. newly added Pokémon appear in editor lookups/search
2. shiny paths resolve for new species/forms
3. egg pool sync includes new valid eggs without duplicating old entries
4. no assumptions in editor UI hardcode the old Pokémon count or old species universe
5. item/shop-related editor actions are still valid if 1.5 changed item IDs or added new item content

### Phase 5 — Upstream item/shop/Pokémon runtime patch review
The checklist already points at runtime patch surfaces like:
- `Pokemon.modded.js`
- `ShopScene.modded.js`
- `itemData.js` via patching

For 1.5, review whether the new Pokémon or items changed these runtime files upstream. If yes, update those patches in tandem with the metadata/editor work so the runtime and the editor agree.

### Phase 6 — Preserve rule consistency
The goal is not “new entries exist somewhere”. The goal is:
- metadata
- runtime item/shop logic
- shiny asset bundle
- save editor
- installer copy logic

all agree on the same 1.5 content set.

---

## Known Gotchas & Caveats
- **39 new Pokémon likely means forms too.** The real scope may exceed 39 keys.
- **Do not assume one shiny asset per Pokémon.** Idle/non-idle variants and form-specific sprites may be required.
- **Count mismatches are expected.** `allKeys` count and sprite count already do not match exactly, so use explicit audits instead of rough totals.
- **Alternate forms are danger zones.** User explicitly called out special handling like sword/shield-style swaps.
- **Save editor and runtime can drift apart.** Updating only `pokemon_data.json` is not enough if upstream runtime files changed item or species handling.
- **Do not push scraped/generated helper scripts into Git accidentally** if they are meant to stay local/dev-only.

---

## Testing Strategy
### Metadata validation
- every new 1.5 Pokémon is represented in the audit doc
- every new species/form is categorized correctly as base/final/alternate
- every expected new key exists in `pokemon_data.json`

### Asset validation
- every newly required shiny sprite file exists in `windows/mods/patches/shiny_sprites/`
- naming matches runtime expectations
- no missing `-idle` variants where the runtime expects them

### Save editor validation
- editor loads without crashing on the new dataset
- new species appear in relevant dropdowns/search/results
- shiny preview path resolution works
- egg reset/sync includes new eggs correctly

### Runtime validation
- modded game can load scenes that touch Pokémon/item/shop content
- new Pokémon render correctly in relevant UI/gameplay surfaces
- shop/egg flows do not break when encountering new 1.5 content

---

## Success Criteria
- [ ] A concrete audit exists for all 1.5-added Pokémon/forms
- [ ] `pokemon_data.json` is updated for the new content set
- [ ] Required shiny sprites for newly eligible non-final species/forms exist and are wired correctly
- [ ] Save editor supports the new species and egg/shop data without crashes or missing assets
- [ ] Runtime item/shop/Pokémon patches are updated wherever upstream 1.5 changed content ownership
- [ ] Feature behavior matches existing mod rules for shinies and editor support

---

## Explicit Stop Gates
Stop and ask before:
- inventing shiny rules that differ from the existing mod policy
- assuming alternate forms can share data blindly
- committing generated assets/scripts without checking whether they belong in git
- any commit/push/PR action unless Jay explicitly asks in that moment
