# Windows Vanilla Update Workflow

Use this for every PokePath TD vanilla update before touching mod files.

## Standing Rules

- The first step is always a clean vanilla backup before installing or replacing the game.
- If the installed `resources\app.asar` is modded, back up `resources\app.asar.vanilla` as the clean source of truth.
- If multiple vanilla versions were skipped, review the changelog/devlog for every skipped version even when only installing the latest version.
- Record every backup, comparison baseline, overlap finding, mistake, and fix in that version's update notes.

## Process

1. Back up the previous vanilla `app.asar` before installing the new game.
   - Store it under `C:\Users\jayar\clawd\backups\pokepath\vanilla_<old>_before_<new>_<timestamp>`.
   - Include `app.asar.vanilla.<version>`, extracted `app_extracted`, and metadata with size/hash.
   - Verify whether `resources\app.asar` is modded. If `.modded` exists or `app.asar` differs from the known vanilla hash, copy `resources\app.asar.vanilla` instead.
   - Confirm the copied ASAR hash matches the last known vanilla baseline when one exists.
2. Install the new vanilla game and verify the local install is clean.
   - `resources\app.asar` should exist.
   - `resources\mods` should not exist unless intentionally copied after the update.
   - No PokePath process should be running during extraction or repack.
3. Back up and extract the new vanilla source.
   - Store it under `C:\Users\jayar\clawd\backups\pokepath\vanilla_<new>_baseline_<timestamp>`.
4. Diff old vanilla against new vanilla.
   - Focus on `src/js/game`, `src/js/file`, `src/css`, and game data files.
   - Avoid full-tree diffs through `node_modules`; they bury the relevant changes.
5. Audit vanilla feature overlap before rebasing claims.
   - Compare every skipped-version changelog plus the code diff against `README.md`, `windows/mods/README.md`, installer feature descriptions, and `MOD_FEATURES_CHECKLIST.md`.
   - If vanilla now provides a feature the mod previously claimed, decide one of three outcomes: remove the mod patch, keep it only as a compatibility guard, or scope the public claim to the remaining mod-only behavior.
   - Record overlap findings in the update notes before publishing GitHub release notes or Reddit copy.
   - Be especially skeptical of QoL and bug-fix claims; these are the most likely to be absorbed into vanilla.
6. Rebase mod patches onto the new vanilla source.
   - Preserve new vanilla behavior first, then carry forward mod hooks.
   - Full-file patch conflicts need manual review. Do not accept old modded files wholesale.
   - Pay special attention to `Game.js`, `Area.js`, `Tower.js`, `Enemy.js`, `Projectile.js`, `Pokemon.js`, `PokemonScene.js`, `UI.js`, and map/storage scenes.
7. Update installer metadata.
   - `windows/mods/version.json`
   - vanilla file-size fingerprints in `windows/mods/lib/apply_mods.py`
   - vanilla ASAR/file-size checks in `windows/mods/diagnose.py`
   - visible game version text in `MenuScene.modded.js`, if vanilla changed it.
8. Update save editor metadata.
   - Regenerate `windows/mods/dev/pokemon_data.json` from the new runtime `pokemonData.js`.
   - Confirm new shop items are loadable from runtime `itemData.js`.
   - Confirm route dropdowns and complete-all-stages logic match `routeData.js`.
9. Audit localization and unlockable text.
   - Compare vanilla `src/js/file/text.js` keys against `windows/mods/patches/text.modded.js`.
   - Any mod-added text, unlockable labels, settings labels, save-editor-facing labels, or new vanilla labels preserved in full-file patches must have all 10 language slots.
   - Challenge rewards, routes, Pokémon, and items can use vanilla localized data arrays, but verify new entries are reachable through the modded UI.
   - Run `node windows/mods/dev/check_unlockables.cjs <path-to-extracted-src/js>` to compare all secret Pokémon, secret maps, Profile rows, and ten-language fallback/shared text.
10. Install into the local game and run diagnostics.
   - Copy the release `mods` folder into the clean game directory.
   - Run the installer with all features enabled.
   - Run `diagnose.py`.
   - Launch Electron with a temporary remote-debugging port and run `node windows/mods/dev/smoke_profile_unlockables.cjs <port> <expected-row-count>` to force a renderer reload and exercise Profile → Unlockables.
   - Confirm no debug/devtools hooks are included in release files.
11. Package the Windows zip with the same structure as prior releases.
   - Zip root contains `mods/`.
   - Do not include extracted game source, backups, or local `app.asar`.

## Common Mistakes

- Reusing old full-file patches can erase new vanilla UI, item, map, and combat fixes.
- Treating the currently installed `app.asar` as vanilla can preserve a modded build by mistake; prefer `app.asar.vanilla` when present and hash-verified.
- Public mod claims can become stale when vanilla absorbs a mod feature; update README/release/Reddit wording before publishing.
- `Game.js` and `Area.js` often contain map/placement changes; recheck these for new wide or special maps.
- `Tower.js`, `Enemy.js`, and `Projectile.js` are collision-sensitive. Preserve vanilla damage paths and only reapply mod behavior deliberately.
- `Pokemon.js` save serialization must keep both vanilla fields and mod fields such as persisted placement.
- `save_editor.py` should not hard-code old route counts after new maps ship.
- Text patch files can silently drop new vanilla labels; run a key comparison and a recursive 10-language array check before packaging.
- Release zips must contain `mods/` at the root, not the files directly.
- Remove temporary debug logging and devtools hooks before packaging.
