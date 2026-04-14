# PRP — Recover and Rebuild the PokePath Shiny Sprite Generator Pipeline

## Problem Statement
The original shiny sprite generator workflow that produced the non-max-evolution shiny assets was **never committed to GitHub** and is now gone. That is a real blocker for the 1.5 update, because upstream 1.5 adds many new Pokémon and the existing mod relies on a pre-generated shiny asset bundle for non-final evolutions.

Jay recovered a Discord conversation export at:
- `C:\Users\jayar\Downloads\shiny sprite generator conversation.txt`

That conversation captures the final working direction well enough to reconstruct the pipeline. The recovered system was **not** intended to be a dumb one-pass hue shifter. It evolved into a hybrid pipeline:
- analyze which shiny sprites are missing
- keep a `shiny_colors.json` database of researched palette mappings
- generate shiny sprites with **palette replacement** where accurate shiny colors are known
- use a **smart hue-shift fallback** for the remainder
- package the generated shiny sprites with the mod installer so new installs receive them automatically

This PRP is specifically for rebuilding that missing generator workflow and restoring it as a durable, documented part of the repo.

---

## Recovered Historical Intent from the Conversation Export
The conversation export contains several durable cues that define the correct rebuild target.

### Early CLI shape
From the export:
```text
python shiny_generator.py generate - Creates all missing shiny sprites,
python shiny_generator.py preview charmander - Preview a specific Pokemon,
```
That implies the original tool had at least:
- an `analyze`-style phase
- a `generate` command
- a `preview <pokemon>` command

### First implementation, then course correction
The export shows an early bulk generation pass:
```text
Generated 634 new shiny sprites (868 total now!),
shiny_colors.json - 300+ Pokemon color mappings,
shiny_generator.py - Tool to generate more shinies,
```
But Jay then explicitly corrected the approach:
```text
instead of a simple hue shift, id like to get the actual shiny colors by getting the information from the web.
... build color replacement maps (not hue shifts)
... some shinys might have multiple colors changed
```
So the correct recovered design is **researched palette replacement first**, not pure hue shifting.

### Final working compromise
The export later shows the tool settling into a hybrid mode:
```text
~70 Pokemon with accurate researched palettes (famous shinies),
~560 Pokemon with smart hue-shift based on dominant colors,
```
This matters because it tells us the real successful method was:
1. accurate mappings for known / researched Pokémon
2. fallback generation for the long tail
3. regenerate assets in bulk

### Packaging requirement
Jay also explicitly said:
```text
also this should be packed with the mod installer, so when a new game installs the mod, it gets the shinys as well
```
That means the generator is not just a one-off dev script. Its outputs must land in the mod's packaged shiny asset path.

---

## Current Repo Reality
### Existing packaged shiny asset path
The current installer already expects pre-generated shiny files under:
- `windows\mods\patches\shiny_sprites\`

Current repo inventory check found roughly:
- **212 PNGs** in `windows\mods\patches\shiny_sprites`

### Existing installer integration
From `windows\mods\lib\apply_mods.py`, the shiny feature already copies pre-generated files into the extracted game:
```python
shiny_src = MODS_DIR / "patches" / "shiny_sprites"
shiny_dest = APP_EXTRACTED / "src" / "assets" / "images" / "pokemon" / "shiny"
```
And the feature group includes:
```python
'functions': ['apply_shiny_eggs', 'apply_shiny_starters', 'apply_shiny_reveal', 'apply_shiny_sprites', 'apply_secret_shiny']
```
So installer-side delivery already exists. What is missing is the **generator/source pipeline**.

### Existing save editor dependence
From `windows\mods\save_editor.py`, the save editor already prefers bundled shiny mod sprites:
```python
mod_shiny_path = script_dir / 'patches' / 'shiny_sprites'
```
And shiny sprite resolution checks those mod sprites before other fallbacks.

That means the rebuilt generator should target the same packaged asset path, because both installer and save editor already depend on it.

---

## Architecture Diagram
```text
pokemon_data.json / game species keys
              |
              v
      analyze missing shiny coverage
              |
              +----------------------+
              |                      |
              v                      v
    shiny_colors.json         fallback color heuristic
  (researched palette map)       (smart hue/palette shift)
              |                      |
              +----------+-----------+
                         |
                         v
                 shiny_generator.py
                         |
         +---------------+----------------+
         |                                |
         v                                v
preview output / QA                packaged shiny_sprites/*.png
                                             |
                                             v
                               installer + save editor + runtime
```

---

## Goals
1. Recreate the missing shiny generation toolchain as source-controlled files.
2. Preserve the historical design intent: **accurate palette mappings first, smart fallback second**.
3. Make the workflow repeatable for future vanilla updates like 1.5, not just a one-time scramble.
4. Keep output compatible with the current mod installer and save editor.

---

## Files to Create
### New durable source files
- `windows/mods/dev/shiny_generator.py`
- `windows/mods/dev/shiny_colors.json`
- `windows/mods/dev/SHINY_GENERATOR_README.md`
- `windows/mods/dev/SHINY_GENERATOR_QA_CHECKLIST.md`

### Optional helper/source files if justified
- `windows/mods/dev/shiny_generator_requirements.txt`
- `windows/mods/dev/shiny_generator_sources.json`
  - if you want to track where specific researched palettes came from
- `windows/mods/dev/shiny_generator_cache/` (gitignored if used)

## Files to Modify
- `windows/mods/README.md`
- `README.md`
- `windows/mods/dev/MOD_FEATURES_CHECKLIST.md`
- possibly `windows/mods/save_editor.py` only if preview/debug hooks are helpful
- possibly `windows/mods/lib/apply_mods.py` only if naming/layout expectations need refinement

## Files to Reference
- `C:\Users\jayar\Downloads\shiny sprite generator conversation.txt`
- `windows/mods/lib/apply_mods.py`
- `windows/mods/save_editor.py`
- `windows/mods/dev/pokemon_data.json`
- `windows/mods/patches/shiny_sprites\`
- `README.md`

---

## Implementation Blueprint

### Phase 1 — Reconstruct the tool contract
Rebuild the historical CLI shape first.

Target commands:
```bash
python shiny_generator.py analyze
python shiny_generator.py generate
python shiny_generator.py preview <pokemon_key>
```
Potentially also:
```bash
python shiny_generator.py generate --pokemon <pokemon_key>
python shiny_generator.py audit
```

**Responsibilities**
- `analyze`: compare species list against packaged shiny assets and report missing coverage
- `generate`: create missing shiny sprites into a staging/output path
- `preview`: generate or show a single Pokémon for QA

### Phase 2 — Rebuild the metadata layer
`shiny_colors.json` should become the durable palette database.

For each supported species/form, store enough information to generate reliable results. Example shape:
```json
{
  "charizard": {
    "mode": "palette_map",
    "notes": "Black body, red wing membrane / belly accents",
    "mappings": [
      {"from": "#C8712C", "to": "#2F2F2F"},
      {"from": "#F0D080", "to": "#B73737"}
    ]
  },
  "gyarados": {
    "mode": "palette_map",
    "notes": "Red shiny",
    "mappings": [...] 
  },
  "some_other_species": {
    "mode": "fallback_shift",
    "strategy": "dominant_palette_hue_shift"
  }
}
```

The exact format can change, but it must support:
- researched color replacement mappings
- fallback strategy selection
- notes for weird species/forms

### Phase 3 — Use the right source images
The generator must work from the **canonical normal sprites** used by the mod/game.

That means defining one trustworthy source path strategy, likely derived from:
- packaged normal sprite bundle if present
- extracted game assets if needed
- the same species keys used by `pokemon_data.json`

Do not build a generator that relies on random manually collected images outside the repo structure.

### Phase 4 — Implement the hybrid generation algorithm
#### Mode A: researched palette replacement
This is the preferred path.
- read source sprite
- identify replaceable palette colors
- apply multiple explicit color remaps where needed
- preserve outlines, transparency, and non-target details
- support cases where multiple base colors become different shiny colors

#### Mode B: smart fallback
This is only for species without researched mappings yet.
The fallback should be better than “rotate the whole image hue blindly”.
Possible approach:
- detect dominant non-outline palette clusters
- shift only eligible colors
- preserve neutrals/black outlines/highlights carefully
- optionally use species-class heuristics for warm/cool shifts

The point is to avoid the “dark overlay / wrong-color fake shiny” problem described in the export.

### Phase 5 — Form and variant handling
The export and current 1.5 scope both imply edge cases.
The generator must account for:
- alternate forms
- branch evolutions
- species whose shiny requires more than one changed region
- idle/base variants
- naming conventions like `name.png` and `name-idle.png`

Do not assume one file per species.

### Phase 6 — Output packaging
Generated assets should land in the existing packaged path:
- `windows\mods\patches\shiny_sprites\`

That preserves compatibility with:
- installer copy logic in `apply_mods.py`
- save editor shiny preview lookup
- runtime mod packaging expectations

### Phase 7 — Documentation and QA
Create a small durable manual explaining:
- how to audit missing sprites
- how to add a researched palette entry
- how to regenerate a subset or all sprites
- how to preview a single Pokémon
- how to verify a result before committing assets

The historical problem here was not just losing code. It was losing the method. Fix both.

---

## Suggested Research Workflow
For researched palettes, prefer a repeatable process rather than ad hoc eyeballing.

Per species:
1. identify the canonical normal sprite used by the game/mod
2. inspect known shiny references
3. extract the real palette intent, not just “approximately different”
4. encode the mapping in `shiny_colors.json`
5. preview the output
6. mark the species as verified

For species without researched data yet:
- use fallback generation
- mark them clearly as fallback-generated so they can be upgraded later

This makes the system extensible instead of all-or-nothing.

---

## Known Gotchas & Caveats
- **The original generator files are gone.** Reconstruct behavior, don’t pretend exact code recovery is possible.
- **Not all shinies are one-color hue shifts.** Jay explicitly called this out.
- **Some Pokémon already have vanilla shinies.** The generator must not stomp correct existing assets blindly if the game already ships them.
- **Some prior failures presented as dark overlays or wrong colors.** Avoid repeating that by separating researched mappings from fallback logic.
- **Sprite naming conventions matter.** Base, idle, and form variants must match current runtime expectations exactly.
- **Do not hide fallback-generated assets behind the same confidence label as researched ones.** The pipeline should make that distinction visible.

---

## Testing Strategy
### Static checks
- `analyze` reports total species, covered species, missing species, and per-variant gaps
- `preview <pokemon>` works for at least a researched species and a fallback species
- output naming matches packaged asset naming conventions

### Visual QA
At minimum validate iconic test cases from the conversation:
- Charmander should read gold/yellow, not invisible or dark-overlayed
- Charizard should read black, not just darker orange
- Gyarados should read red
- Gengar should read near-white/light gray
- Greninja should read black

### Integration checks
- installer still copies `patches\shiny_sprites` into extracted game assets
- save editor still prefers bundled mod shiny sprites
- generated sprites render correctly in game and in save editor

### Durability checks
- new species can be added by editing `shiny_colors.json` without changing generator core
- fallback generation still works when no researched mapping exists

---

## Success Criteria
- [ ] A new committed `shiny_generator.py` exists with at least analyze/generate/preview flows
- [ ] A committed `shiny_colors.json` exists and drives researched palette replacements
- [ ] The generator supports researched mappings plus fallback generation
- [ ] Output targets `windows\mods\patches\shiny_sprites\`
- [ ] The workflow is documented well enough that future agents do not have to rediscover it from Discord exports
- [ ] QA checklist includes iconic known shinies and naming/variant validation
- [ ] The pipeline is ready to support the 1.5 content expansion work

---

## Explicit Stop Gates
Stop and ask before:
- replacing researched palette mapping with pure hue-shift everywhere for convenience
- committing massive generated asset changes without preview/QA samples
- introducing scraping or external-download code that stores copyrighted source images in repo
- changing installer/save-editor asset paths unless compatibility needs truly require it
- any commit/push/PR action unless Jay explicitly authorizes it in that moment
