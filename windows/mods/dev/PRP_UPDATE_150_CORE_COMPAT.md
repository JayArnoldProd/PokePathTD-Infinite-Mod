# PRP — PokePath TD INFINITE: Windows 1.5 Core Compatibility Rebase

## Problem Statement
The upstream game has moved from **PokePath TD 1.4.4** to **1.5** on Windows. The mod currently targets 1.4.4 and applies a set of full-file replacement JS patches against extracted game sources. That means a vanilla 1.5 update is **not** a small version bump. Every patched gameplay file must be revalidated against the new upstream source so we do not accidentally delete new vanilla behavior while preserving mod features.

This PRP covers the **core Windows compatibility rebase only**:
- backup/install state capture
- extraction of the new 1.5 vanilla app
- rebasing all patched gameplay files onto 1.5
- updating installer/diagnostics/version gating for 1.5
- preserving all current mod features without silently dropping any 1.5 vanilla additions

This PRP does **not** own the new-Pokémon shiny/content/save-editor sync. That is split into a second PRP.

---

## Current State Snapshot
### Local machine state already completed
- **New installer used:** `C:\Users\jayar\Downloads\PokéPath_TD Setup\PokéPath TD Setup.exe`
- **Installer type confirmed:** NSIS
- **New local install path:** `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron`
- **Pre-1.5 backup path:** `C:\Users\jayar\clawd\backups\pokepath\pre_1.5_install_2026-04-13_154913\pokePathTD_Electron`

### Current mod version metadata
From `windows/mods/version.json`:
```json
{
    "version": "1.5.0",
    "game_version": "1.5",
    "release_date": "2026-04-13"
}
```

### Current patching architecture
From `windows/mods/lib/apply_mods.py`:
```python
# full-file-replacement patches (.modded.js) will break core gameplay.
```

And the feature registry is centralized in the same file:
```python
FEATURES = {
    'pause_micro': {
        'label': 'Pause Micromanagement',
        'functions': ['apply_pause_micromanagement'],
    },
    'speed': {
        'label': '2x/3x/5x/10x Speed',
        'functions': ['apply_speed_options'],
    },
    'endless': {
        'label': 'Endless Mode / Continue to Wave 101+',
        'functions': ['apply_endless_mode'],
    },
    'infinite_levels': {
        'label': 'Infinite Levels / Endless Scaling',
        'functions': ['apply_infinite_levels'],
    },
    'shiny_system': {
        'label': 'Shiny Eggs + Starters + Sprites',
        'functions': ['apply_shiny_eggs', 'apply_shiny_starters', 'apply_shiny_sprites'],
    },
```
This is the source of truth for what must survive the 1.5 rebase.

### Existing update workflow guidance
There is already reusable update guidance at:
- `C:\Users\jayar\clawd\pokepath-auto-update\UPDATE_GUIDE.md`
- `windows/mods/dev/UPDATE_NOTES_141.md`
- `windows/mods/dev/MOD_FEATURES_CHECKLIST.md`

Those documents should be treated as the prior update playbook, not reinvented from scratch.

### Official upstream 1.5 patch notes - implications for this PRP
Jay supplied the developer patch notes for 1.5. They materially raise the scope of the compatibility pass.

Confirmed upstream surfaces touched by 1.5:
- 8 new maps, 8 new Elites, 8 new Bosses, 60 new Enemies
- 39 new Pokémon, 5 new Megas, 37 new Abilities, 21 new Items
- Reworked scenes: Profile, Box, Inventory, Shop, Map, Challenge, Menu
- New drag-and-drop flows for Box ↔ UI and drag-and-drop item equip
- New Box filter by Critical %
- Shop slots increased from 6 to 9
- Draft challenge reroll + route-aware draft guarantees
- Item/ability naming and behavior shifts, including Defiant/Contrary and item renames
- Broad stat rebalance and explicit vanilla speed-related bug fixes

Planning consequence:
- This PRP should still start with `Game.modded.js`, but it must treat scene/UI compatibility as part of the early core rebase, not as later polish.
- After the first Game-layer smoke test, the next wave of high-priority files should include `BoxScene.modded.js`, `UI.modded.js`, `ShopScene.modded.js`, `Shop.modded.js`, `MapScene.modded.js`, `MenuScene.modded.js`, and `ProfileScene.modded.js` before assuming core compatibility is stable.

---

## Architecture Diagram
```text
Upstream 1.5 Windows install
        |
        v
resources\app.asar (vanilla)
        |
        v
extract vanilla JS/assets for inspection
        |
        +------------------------------+
        |                              |
        v                              v
old 1.4.4 patched files         existing .modded.js patch files
(from repo / prior release)     (repo source of truth)
        |                              |
        +-------------- diff/rebase ---+
                       |
                       v
new 1.5-compatible .modded.js patches
                       |
                       v
apply_mods.py installer flow
                       |
                       v
modded 1.5 Windows game
```

---

## Files to Create
- `windows/mods/dev/UPDATE_NOTES_150.md`
  - new update log for the 1.5 rebase
- Optional scratch diff docs if useful:
  - `windows/mods/dev/DIFF_NOTES_150_<file>.md`

## Files to Modify
- `windows/mods/version.json`
- `windows/mods/README.md`
- `README.md`
- `windows/mods/diagnose.py`
- `windows/mods/PokePath_Mod_Installer.pyw`
- `windows/mods/lib/apply_mods.py`
- `windows/mods/dev/MOD_FEATURES_CHECKLIST.md`
- every impacted file under `windows/mods/patches/*.modded.js`

## Files to Reference
- `C:\Users\jayar\clawd\pokepath-auto-update\UPDATE_GUIDE.md`
- `windows/mods/dev/UPDATE_NOTES_141.md`
- `windows/mods/dev/MOD_FEATURES_CHECKLIST.md`
- `windows/mods/lib/extract_game.js`
- `windows/mods/lib/apply_mods.py`
- `windows/mods/diagnose.py`
- `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron\resources\app.asar`
- `C:\Users\jayar\clawd\backups\pokepath\pre_1.5_install_2026-04-13_154913\pokePathTD_Electron`

---

## Implementation Blueprint

### Phase 1 — Freeze the vanilla 1.5 baseline
1. Do **not** diff against a modded install.
2. Extract the freshly installed 1.5 `resources\app.asar` into a clean working tree for inspection.
3. Preserve that extraction as the 1.5 vanilla source of truth.
4. Record hashes / file sizes / install timestamps in `UPDATE_NOTES_150.md`.

### Phase 2 — Build the patch impact list
Enumerate all current replacement patches in `windows/mods/patches/` and map each one to its vanilla 1.5 target file. The patch system is full-file replacement, so every file below is a rebase risk surface.

Initial expected patch list includes files like:
- `Area.modded.js`
- `BoxScene.modded.js`
- `DefeatScene.modded.js`
- `Enemy.modded.js`
- `FinalScene.modded.js`
- `Game.modded.js`
- `ItemData.modded.js`
- `MapScene.modded.js`
- `MenuScene.modded.js`
- `Pokemon.modded.js`
- `ProfileScene.modded.js`
- `ShopScene.modded.js`
- `UI.modded.js`

For each file, document:
- what the vanilla 1.5 file changed
- what the mod currently changes
- whether the correct 1.5 strategy is rebase, re-patch, or replace with a more targeted patch

### Phase 3 — Rebase features, not files blindly
The prior update guide exists because a bad merge previously stripped features. Do **not** do a naive 3-way file merge and assume success.

For each patched file:
1. open vanilla 1.5 file
2. open existing `.modded.js`
3. identify mod feature deltas
4. re-apply those deltas into the 1.5 vanilla source deliberately
5. verify against `MOD_FEATURES_CHECKLIST.md`

The review rule here is:
- preserve every mod feature
- preserve every new vanilla 1.5 addition unless the mod intentionally replaces it
- if a new 1.5 system collides with an old mod patch, refactor the patch instead of deleting upstream logic

### Phase 4 — Update version gates and tooling
At minimum, the following must be brought forward to 1.5 awareness:
- `windows/mods/version.json`
- installer labels / warnings
- diagnostics expectations in `windows/mods/diagnose.py`
- README compatibility statements
- any release/build notes that still say 1.4.4

### Phase 5 — Re-run the feature audit
Use `windows/mods/dev/MOD_FEATURES_CHECKLIST.md` as acceptance criteria, not just “game launches”.

Every checkbox needs revalidation on 1.5, especially:
- pause micromanagement
- speed multipliers
- endless continue / retry / checkpoint flow
- infinite levels and endless scaling
- QoL and bug-fix behavior
- hidden content unlock
- performance patches that touch hot loops

---

## Known Gotchas & Caveats
- **Full-file replacement is fragile.** Upstream 1.5 edits can be silently lost if an old `.modded.js` is dropped in wholesale.
- **The old update workflow already warns about this.** Follow it.
- **Do not mark macOS compatible yet.** User explicitly said 1.5 is currently Windows-only upstream.
- **Installer/diagnostics can lie if not updated.** A “successful install” on 1.5 is meaningless if the tooling still fingerprints 1.4.4.
- **Do not fold the Pokémon/item/shiny/editor work into this rebase casually.** Track it separately so the core compatibility branch stays understandable.

---

## Testing Strategy
### Static verification
- extract 1.5 vanilla successfully
- apply all selected mod features without script errors
- run diagnostics without false 1.4.4-only failures
- inspect each rebased `.modded.js` for accidental upstream deletions

### Runtime verification
- game launches on 1.5 Windows build
- installer can apply selected features to the new install path
- main menu loads
- a map can start
- speed options still work
- endless flow still works
- no immediate JS/runtime crash from patched files

### Regression checklist
Validate against `windows/mods/dev/MOD_FEATURES_CHECKLIST.md` item by item.

---

## Success Criteria
- [ ] New 1.5 vanilla app is extracted and captured as the source of truth
- [ ] Every current `.modded.js` file has been consciously rebased or retired
- [ ] No upstream 1.5 gameplay additions are silently deleted by old replacement patches
- [ ] `version.json`, installer messaging, diagnostics, and README all identify 1.5 correctly
- [ ] Windows 1.5 mod install runs end-to-end
- [ ] Core feature checklist passes on 1.5
- [ ] macOS compatibility is not falsely claimed before dedicated validation

---

## Explicit Stop Gates
Stop and ask before:
- changing feature scope instead of preserving parity
- dropping an old feature because rebasing is inconvenient
- declaring macOS support for 1.5
- any commit/push/PR action unless Jay explicitly asks in that moment
