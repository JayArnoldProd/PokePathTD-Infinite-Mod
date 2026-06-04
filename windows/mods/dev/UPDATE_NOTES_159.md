# Update Notes: Windows 1.5.9

## Backup

- Previous vanilla source backed up before installing 1.5.9:
  - `C:\Users\jayar\clawd\backups\pokepath\vanilla_1.5.6_before_1.5.9_20260604_144559`
  - ASAR: `app.asar.vanilla.1.5.6`
  - Extracted source: `app_extracted`
  - Size: `77373194`
  - SHA-256: `2D7FA526D55E75AF6833071C7DBCA08DA9A344BB2BEA59C51FD6835CDC938354`
- Source file:
  - `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron\resources\app.asar.vanilla`
- The installed `app.asar` was modded, so it was not used as the vanilla backup source.
- No running PokePath process was detected before copying/extracting.
- New vanilla 1.5.9 baseline:
  - `C:\Users\jayar\clawd\backups\pokepath\vanilla_1.5.9_baseline_20260604_151257`
  - ASAR: `app.asar.vanilla.1.5.9`
  - Extracted source: `app_extracted`
  - Size: `77379374`
  - SHA-256: `80B3657A3976BB49093718D821BF6CE27DB3BBDF7E9EA3ED215A2CE22CB194C7`

## Changelog Inputs

- Review the bundled 1.5.7 and 1.5.8 changelog before rebasing.
- Treat 1.5.9 as code-diff-driven if no devlog/changelog is available.
- User-provided changelog impact areas:
  - Slower UI scroll speed and Route 6-1 scrolling while holding a Pokémon.
  - Watchog converted to aura behavior.
  - Tentacruel regen and Zoroark speed balance.
  - Route 6-1 armor reduction and Cubone/Marowak wave replacements.
  - Target-mode guard fixes for blocked item target changes, invisible targeting, and orbital Pokémon.
  - Eviolite challenge level-cap 50 equip fix.
  - Draft Challenge Route 6-1 mountain placement priority.
  - Storage Box filter fix.
  - Equipped item duplication and free challenge-store purchase fixes.
  - Orbital Pokémon cannot equip Eviolite or gain Illuminate range.
  - Spinda/Ring Target, Dudunsparce item, Servine range, weather-rock removal, Cherrim transform display fixes.
  - Shiny/normal sprite render fixes for Lopunny, Archen, Noibat, and Cranidos.

## 1.5.9 Vanilla Diff Summary

- Full-file patch targets changed: `Game.js`, `UI.js`, `Pokemon.js`, `Projectile.js`, `Tower.js`, `Area.js`, `BoxScene.js`, `MenuScene.js`, and `PokemonScene.js`.
- Runtime data changed: `pokemonData.js`, `itemData.js`, `enemyData.js`, `routeData.js`, and `waveData.js`.
- Non-patched vanilla logic changed in `ItemController.js`, `TeamManager.js`, `DraftScene.js`, and `EditorScene.js`; these remain preserved because the mod does not replace those files.
- Asset changes include fixed/added Pokémon sprites and an `assets.json` update.

## Actions Taken

- Rebased affected full-file mod patches onto 1.5.9 vanilla behavior while preserving mod hooks.
- Updated installer and diagnostic fingerprints for 1.5.9 vanilla file sizes and ASAR size.
- Regenerated save-editor Pokémon metadata from the 1.5.9 runtime; schema remains 316 keys.
- Updated save editor egg injection/reset lists to the 1.5.9 runtime obtainable list: egg, secret, and challenge Pokémon.
- Synced changed vanilla sprite fixes into bundled mod sprite folders so install/save-editor paths do not overwrite the 1.5.9 render fixes.
- Updated root and packaged README compatibility copy to 1.5.9.
- Installed the updated `windows\mods` package into the local clean 1.5.9 game and applied all installer features.

## Vanilla Feature Overlap Audit

- Vanilla now blocks target changes for orbital Pokémon and item-blocked target modes. The mod keeps target sorting/labels, but target-mode change claims should stay scoped to mod UI behavior.
- Vanilla now prevents orbital Pokémon from gaining Illuminate range. The mod's orbital speed scaling is retained, but range-boost claims must not imply orbitals can bypass vanilla restrictions.
- Vanilla handles Eviolite at challenge level cap 50. The mod keeps its challenge level-cap bug fix scoped to preventing low-level Pokémon from being boosted to the cap.
- Vanilla's storage filter fix is preserved by adding `applyTabEffect(this.tabSelected)` to `BoxScene.modded.js`.
- Vanilla's Route 6-1 scrolling fix is preserved by moving XL wheel handling to the window listener in `Game.modded.js`.

## Local Install Verification

- Local install path: `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron`
- Local vanilla backup: `resources\app.asar.vanilla`
  - Size: `77379374`
  - SHA-256: `80B3657A3976BB49093718D821BF6CE27DB3BBDF7E9EA3ED215A2CE22CB194C7`
- Local modded ASAR: `resources\app.asar`
  - Size after repack: `81150084`
- Installer result:
  - Applied: `35`
  - Failed: `0`
  - Installed features: `pause_micro`, `speed`, `endless`, `infinite_levels`, `shiny`, `shiny_enemies`, `qol`, `box_expansion`, `deltatime`, `vanilla_fixes`, `allow_dupes`, `dev_tools`
- Validation passed:
  - `python -m py_compile windows\mods\lib\apply_mods.py windows\mods\diagnose.py windows\mods\save_editor.py`
  - `node --check` for every `.modded.js` patch file.
  - `python -m json.tool windows\mods\version.json`
  - Installed `diagnose.py`: all checks passed.
  - `node --check` for every installed extracted JavaScript file.
  - Direct `app.asar` checks for 1.5.9 version text, Route 6-1 wheel handling, orbital target lock, aura/Eviolite logic, orbital radius behavior, invisible enemy auto-stop list, and fixed/new sprite files.
- Manual smoke test:
  - User tested the installed 1.5.9 mod locally and reported no immediate issues.

## GitHub Publishing Plan

After local test sign-off, publish the Windows 1.5.9 update with these steps:

1. Keep the public README focused on compatibility and the latest Windows download link; do not advertise new mod features for this release.
2. Build `PokePath-TD-INFINITE-Windows-v1.5.9.zip` with a top-level `mods` folder.
3. Verify the ZIP excludes generated/runtime files such as `node_modules`, `__pycache__`, `installed_features.json`, and `package-lock.json`.
4. Commit the 1.5.9 rebase, documentation, and bundled sprite changes.
5. Push the repository update to GitHub.
6. Create GitHub release `v1.5.9` and upload the Windows ZIP asset.
7. Verify the release page and the README download link.

## Next Steps

1. Create and verify the Windows release ZIP.
2. Push the repository update and create GitHub release `v1.5.9`.

## Release ZIP

- Path: `releases\PokePath-TD-INFINITE-Windows-v1.5.9.zip`
- Size: `9826028`
- File count: `1784`
- SHA-256: `6C5DF8A726E2B305186197EB12E4259904E340A69FC025AFAEEF7FA17D057D47`
- Verified:
  - Top-level ZIP folder is `mods`.
  - Required installer, README, version, patch, and new 1.5.9 sprite files are present.
  - No `node_modules`, `__pycache__`, `installed_features.json`, `package-lock.json`, `current_save.json`, or `.pyc` files are included.
