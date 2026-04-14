# PokePath TD Mod Update: 1.4.4 → 1.5 (Windows)

## Status
Work in progress. This file tracks the 1.5 Windows compatibility rebase.

## Baseline Capture
### New vanilla install
- Install path: `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron`
- `resources\app.asar` size: `75,087,632` bytes
- Pre-update local backup captured at:
  - `C:\Users\jayar\clawd\backups\pokepath\pre_1.5_install_2026-04-13_154913\pokePathTD_Electron`

### Clean vanilla extraction used for rebase
- Extracted to:
  - `C:\Users\jayar\clawd\backups\pokepath\vanilla_1_5_extracted_2026-04-13`

### Reference vanilla file sizes (Windows 1.5)
- `src/js/game/Game.js` → `42586`
- `src/js/game/component/Pokemon.js` → `24099`
- `src/js/game/scenes/PokemonScene.js` → `58007`
- `src/js/game/core/Area.js` → `18848`
- `src/js/game/core/Team.js` → `1784`
- `src/js/game/core/Box.js` → `703`

## Existing Patch Surfaces To Rebase
Current full-file replacement mod patches in `windows/mods/patches/`:
- `Area.modded.js`
- `BoxScene.modded.js`
- `DefeatScene.modded.js`
- `Enemy.modded.js`
- `FinalScene.modded.js`
- `Game.modded.js`
- `main.modded.js`
- `MapScene.modded.js`
- `MenuScene.modded.js`
- `NewGameScene.modded.js`
- `Pokemon.modded.js`
- `PokemonScene.modded.js`
- `ProfileScene.modded.js`
- `Projectile.modded.js`
- `Shop.modded.js`
- `ShopScene.modded.js`
- `text.modded.js`
- `Tooltip.modded.js`
- `Tower.modded.js`
- `UI.modded.js`

## Critical Rebase Rule
Do not drop old `.modded.js` files wholesale onto 1.5 and assume success. Rebase features intentionally against 1.5 vanilla source and verify against `MOD_FEATURES_CHECKLIST.md`.

## Companion Planning Docs
- `PRP_UPDATE_150_CORE_COMPAT.md`
- `PRP_UPDATE_150_CONTENT_AND_EDITOR.md`
- `PRP_SHINY_GENERATOR_RECOVERY.md`

## Early Tooling Changes Already Applied
- `windows/mods/version.json` moved to 1.5 metadata
- `windows/mods/diagnose.py` now fingerprints the Windows 1.5 vanilla sizes/asar size

## Developer 1.5 Patch Notes - High-Signal Impact
Official upstream notes confirm this is not just a combat-stat patch. The update also includes:
- 8 new maps, 8 new Elites, 8 new Bosses, 60 new Enemies
- 39 new Pokémon, 5 new Megas, 37 new Abilities, 21 new Items
- UI rework across Profile, Box, Inventory, Shop, Map, Challenge, and Menu scenes
- New drag-and-drop flows for Box ↔ UI and item equip via drag-and-drop
- Box filter additions and shop slot count increase from 6 to 9
- Draft challenge reroll and route-aware draft guarantees
- New/renamed item and ability behavior (for example Rocky Helmet → Skull Fossil, Heat Rock → Lava Cookie, Defiant/Contrary changes)
- Broad Pokémon stat rebalance and bug-fix pass, including speed-related fixes

## Rebase Priority Adjustments After Reading Upstream Notes
- `Game.modded.js` is still the correct first rebase target for the earliest smoke test.
- But the patch notes raise the priority of scene/UI files immediately after Game, especially:
  - `BoxScene.modded.js`
  - `UI.modded.js`
  - `ShopScene.modded.js`
  - `Shop.modded.js`
  - `MapScene.modded.js`
  - `MenuScene.modded.js`
  - `ProfileScene.modded.js`
- `Pokemon.modded.js` and `Area.modded.js` remain critical, but UI/scene churn is now confirmed as a first-class merge surface rather than background cleanup.

## Current Smoke-Test Scope
The current lightweight install checkpoint is still valid for an immediate test because it exercises the most fragile runtime layer first:
- boot the game
- load a map
- start a wave
- pause/resume
- cycle speed options
- confirm no soft-locks

After this checkpoint passes, the next meaningful validation set should include:
- drag and drop from Box to UI and back
- drag-and-drop item equip flow
- shop layout / extra slot behavior
- updated scene transitions in Box, Shop, Map, Challenge, Menu, and Profile

## Next Core Implementation Pass
1. Keep the current smoke test narrow and verify the Game-layer checkpoint with Jay
2. Rebase installer-critical and launch-critical patch files first
3. Rebase scene/UI files earlier than originally planned because upstream 1.5 explicitly reworked them
4. Continue with `Pokemon.modded.js` and `Area.modded.js` on top of the validated runtime base
5. Hand off the next broader UI/gameplay checkpoint to Jay

## Future Feature Thread - Orbital scaling past level 100
This is intentionally separate from the 1.5 compatibility rebase.

Goal:
- keep Orbital growth going after level 100
- make gains slow down over time instead of granting a new orb too often at very high levels
- keep the rule simple enough to patch and tune later

Current proposal:
- treat each Pokemon's current orb count at level 100 as the base
- add bonus orbs from post-100 levels with:
  - `bonusOrbs = floor(0.42 * sqrt(max(0, level - 100)))`
  - `totalOrbs = baseOrbsAt100 + bonusOrbs`

Example shape if a Pokemon has 8 orbs at level 100:
- level 100 -> 8
- level 200 -> 12
- level 500 -> 16
- level 1000 -> 20
- level 10000 -> 49

Why this shape:
- very easy to implement and balance
- strongly diminishing growth without hard stops
- tuning is easy by changing one scalar (`0.42`) or adding a cap/species modifier later

Implementation note:
- this should be added as a post-100 overlay to the existing Orbital calculation, not mixed into the 1.5 rebase work until the compatibility pass is stable.
