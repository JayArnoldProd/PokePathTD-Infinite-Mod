# Update Notes: Windows 1.6.1

## Source Baseline

- User-provided installer archive: `C:\Users\jayar\Downloads\PokéPath Setup 1.6.zip`
- The installer filename says 1.6, but the extracted game identifies itself as 1.6.1.
- Installer archive:
  - Size: `154384139`
  - SHA-256: `956C0794BCC7C8BFA162690DA8F11AD5F4E75EC09A8FCAD9B338444D09D6EE4F`
- Clean Windows 1.6.1 ASAR extracted from the installer:
  - Size: `83481525`
  - SHA-256: `A439708293821D0DFDCCED834D77F398E96D3BB7763F24D7381C57B6E27E4B01`
- Rebase workspace: `context\rebase_161_20260901`
- The existing local installation was not overwritten during the rebase or automated tests. Its known 1.5.9 vanilla backup and modded ASAR were left untouched.

## Changelog Inputs

- Reviewed the user-provided 1.6.0 devlog and 1.6.1 patch notes before rebasing.
- 1.6.0 introduced the larger compatibility surface: new Pokémon and routes, achievement rework, favorites/search UI, Heavy Metal and platform behavior, Bombardment and beam behavior, new target and item interactions, route/challenge changes, and many bug fixes.
- 1.6.1 changed deployment tiles, Turtwig/Grotle abilities, Swampert timing, Claw Fossil, Fiery Dance, Heart of Steel, Make It Rain, enemy balance, and several transformation/item/UI bugs.

## Supplied-Build Discrepancies

The supplied 1.6.1 runtime did not contain three values published in the 1.6.1 notes:

- Make It Rain still awarded 5% per digit even though its description says 7.5%.
- Stunky still had 43,000 health instead of 40,000.
- Skuntank still had 55,000 health instead of 50,000.

The mod installer applies those three published values when **Vanilla Bug Fixes** is selected. The corrections are narrow and idempotent, and the final extracted runtime was checked directly.

## Actions Taken

- Rebased every affected full-file patch onto clean 1.6.1 source while preserving 1.6.0 and 1.6.1 vanilla behavior.
- Reworked the Tower and Projectile integrations to preserve new Bombardment, beam, platform/passenger, Heavy Metal, targeting, and transformation behavior alongside infinite-mode timing and retargeting.
- Updated installer matching logic for 1.6.1 changes to Team, Box, Shop, Player, Challenge, and secret-shiny code paths.
- Updated installer and diagnostic fingerprints for the 1.6.1 vanilla file sizes and ASAR size.
- Regenerated save-editor metadata from the 1.6.1 runtime:
  - 378 Pokémon keys.
  - 178 evolutions.
  - 200 base/final chains.
  - 183 obtainable Pokémon.
- Updated route-completion logic for 29 normal routes and the 2,900-star total without treating secret maps as normal routes.
- Synchronized 1.6.1 normal and shiny assets into the bundled sprite sets so the installer and save editor do not overwrite new or fixed vanilla art.
- Updated public and packaged compatibility documentation to 1.6.1.

## Vanilla Feature Overlap Audit

- Vanilla now includes team sprite tooltips, favorites/search behavior, achievement-rework data, new route/challenge preview rules, and multiple new tower/item mechanics. The rebased replacements retain those behaviors.
- Delta-time performance claims were narrowed to the changes the mod actually makes; obsolete cached-draw and single-pass-aura claims were removed.
- No-duplicate and allow-duplicate installations were both tested because the 1.6.1 Team and Box implementations changed.
- Ditto refresh logic now preserves its selected target and accounts for the expanded 1.6.1 roster/evolution categories.

## Automated Verification

- Installed all selectable features into isolated clean 1.6.1 copies using both duplicate policies:
  - Allow Duplicate Pokémon enabled.
  - Force no-duplicates enabled, including Team, Box, Shop egg, and Ditto refresh guards.
- Final clean-install validation enabled:
  - `pause_micro`, `speed`, `endless`, `infinite_levels`, `shiny`, `shiny_enemies`, `qol`, `box_expansion`, `deltatime`, `vanilla_fixes`, and `dev_tools`.
- Installer result: every requested patch reported `[OK]` or an expected `[SKIP]`; zero failures.
- `diagnose.py`: all checks passed against the 83,481,525-byte vanilla backup.
- Python compilation passed for `apply_mods.py`, `diagnose.py`, and `save_editor.py`.
- JavaScript syntax validation passed for every distributed patch and every JavaScript file in the final extracted install, including `main.js`.
- Localization validation found zero missing vanilla keys and zero malformed ten-language string arrays.
- Generated metadata was checked against the 1.6.1 runtime and sprite coverage was checked for evolving species.
- Direct final-runtime checks confirmed Make It Rain uses `0.075`, Stunky has 40,000 health, and Skuntank has 50,000 health.

## Release ZIP

- Path: `releases\PokePath-TD-INFINITE-Windows-v1.6.1.zip`
- Size: `15336587`
- File count: `2574`
- SHA-256: `DB3F9E840C29561F4A320C985943C7D90E1EFE6BF2B2EB3EEAC26E09EC3F6DCC`
- Required archive shape: one top-level `mods` folder.
- Exclusions: `node_modules`, `__pycache__`, `installed_features.json`, `package-lock.json`, `current_save.json`, sprite caches, and `.pyc` files.
