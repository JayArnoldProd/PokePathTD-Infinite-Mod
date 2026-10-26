# Windows 1.6.3 compatibility audit

## Same-version egg-shop hotfix — 2026-10-26

An upgraded save exposed a pre-existing editor bug: loading a save appended all obtainable species to the egg list without ownership checks. Persisting that editor session could reintroduce evolved lines, secret Pokémon and challenge rewards. The vanilla shop's update method appended missing eggs but did not sanitize existing saved entries. Duplicate permission was enabled before and after the upgrade. The original compatibility checks missed this stale-pool scenario.

The hotfix removes implicit editor restocking. Explicit Reset Egg Shop now requires confirmation and uses only unowned ordinary vanilla egg lines. A shared runtime helper reconciles stale queues at startup and before purchases, recognizes evolution/form IDs (including shiny and legacy save representations), preserves valid ordering, and never changes the roster or egg price. Duplicate permission does not make normal egg progression repeat.

All mod selections now preserve existing team/box copies on load. Disabling duplicate acquisition blocks new duplicate objects but permits transfers of existing ones. The GUI remembers installed feature selections; fresh installs default duplicate permission to off. The version and release asset name remain 1.6.3.

Added regression checks: `check_egg_shop.cjs` (1,576 ownership representations, stale queues, newly added eggs, depletion/costs, constructor preservation and transfers); `test_egg_hotfix.py` (1,182 Python ownership cases, editor load/save without mutation, confirmed reset, installer preferences); and `smoke_egg_hotfix.cjs` (real Electron startup with baseline roster comparison and isolated purchasing). Tests cover full-feature installs with both policies plus four partial configurations. Existing gameplay and localization tests remain applicable.

Before local deployment, the complete installation and both save profiles were backed up to `C:\Users\jayar\clawd\backups\pokepath\before_163_egg_hotfix_20261026`. The original published ZIP is preserved there as `original_release.zip`. The copied current profile contained 187 Pokémon; Electron baseline comparison retained all 187 with their levels, shiny flags, held items and other checked properties, with no startup gold or egg-price changes. The stale 78-entry queue became 14 eligible egg lines. Purchase stress tests use a separate profile, never the live save.

Final local deployment used the packaged ZIP and retained the existing feature manifest. All 64 installed JavaScript files parsed, and the actual installed game passed the 162-row Profile smoke and the 187-Pokémon baseline check. Persisted only the reconciled egg list; offline before/after comparisons verified the entire saved team and box records were identical, with gold and egg price unchanged. Both duplicate policies passed real Electron tests on separate copies of this same profile; each isolated purchase test drained 130 eligible lines without repurchasing the owned Pikachu/Raichu line. The full earlier gameplay regression also passed. Installer safety failures now abort before repacking; the CLI reports failure with a nonzero exit status.

## Source and recovery points

- Input: `C:\Users\jayar\Downloads\PokéPath Setup 1.6 (1).zip` (191,090,414 bytes).
- ZIP SHA-256: `C72A3DA6F7D589AD70014B160680105F00F004DF4315049FA754B9B23246116F`.
- Confirmed `MenuScene.js` identifies the supplied runtime as **1.6.3**; the Electron package version is still the generic 1.0.0.
- Clean 1.6.3 ASAR: 120,710,818 bytes; SHA-256 `E96F3BE3731786AE63CED6CE309C54B818BF52ECB100DA64A293AF1259D7DF8C`.
- Before any installation changes, backed up the complete installed 1.6.1 game, both Roaming save profiles, and separately extracted the clean 1.6.1 ASAR to `C:\Users\jayar\clawd\backups\pokepath\vanilla_161_before_163_20261025`.
- Verified old clean ASAR SHA-256: `A439708293821D0DFDCCED834D77F398E96D3BB7763F24D7381C57B6E27E4B01` (83,481,525 bytes).
- New clean ASAR and extracted baseline: `C:\Users\jayar\clawd\backups\pokepath\vanilla_163_baseline_20261025`.
- Working comparison/test files: `context/rebase_163_20261025` (not distributed).

## A/B and changelog findings

Compared clean 1.6.1 against clean 1.6.3 alongside both supplied 1.6.2 and 1.6.3 notes. The JavaScript delta affects 39 files, including the new chess-piece module. New CSS and assets come directly from the clean installer, rather than old replacement files.

Preserved the new map layouts, draft restart and sunlight-biased draft behavior, Acquisition sorting and save timestamps, Star range shape, new targeting/filter behavior, Poké Skates, berry sharing/Harvest/Unnerve interactions, Room Service, platform counts, special enemy paths and boss passives, healing fixes, and upstream balance/translation changes.

Vanilla now provides improved collection counters and near-100 partial level batches. Kept the mod's duplicate-aware collection counting and extended the new partial batches to coexist with infinite shiny leveling. Acquisition sort is appended after the mod sorts to preserve existing saved sort indices. Appletun counts toward the Applin collection line.

The supplied 1.6.3 files still contain the older Make It Rain, Stunky, and Skuntank values identified during the previous update. The optional published-1.6.1 correction patch remains applicable; it does not override unrelated new balance changes.

## Content and secrets

- 394 species/form keys, 190 obtainable entries, 32 normal star routes (3,200 stars).
- New keys: Kingambit; Porygon/Porygon2/Porygon-Z; Grubbin/Charjabug/Vikavolt; Calyrex; Tropius; Applin/Flapple/Appletun; Cutiefly/Ribombee; Gossifleur/Eldegoss.
- New items: Power Herb, Room Service, Ride Pager, Wacan Berry, Poké Skates, Berry Pouch.
- The canonical secret roster adds **Calyrex**. The secret-map roster adds **Board Room**. Redeem protocol remains unchanged (four existing rewards).
- Board Room entrance: Route 8-2 (internal route 34), outside challenges, no active wave. Clicking sets `secretMaps.secretChess` and opens internal route 35.
- Calyrex is granted by the vanilla final scene after defeating its boss. Damage depends on activated chess pieces, not a requirement to activate all 16. The source accepts Kingdra, Vespiquen, Pawniard, Bisharp, Kingambit, Stakataka, and Ditto copying a qualifying species on specific placement tiles.
- Unlockables now has **162 entries**: 128 route rewards, 27 secret Pokémon, six secret maps, and the welcome gift. The Calyrex row explains activation and shows current active/total pieces while on the board; it does not pretend this temporary puzzle state is permanent progress.
- Shared and fallback text tables contain identical new translations in English, Spanish, French, Portuguese, Italian, German, Japanese, Korean, Chinese, and Polish. Names are reused from vanilla data.

## Sprites

The supplied runtime already includes normal and shiny sprites for every newly added species, including pre-evolutions. Synchronized the official assets into the bundles, preserving the mod's missing-vanilla shiny additions. No new heuristic recolors were necessary. This also preserves the official Flapple crop and Stakataka activation sprite changes. The shiny bundle contains 1,360 PNGs.

## Integration issues caught and fixed

- Updated Team deduplication matching after vanilla removed a comment and added invalid-save-entry filtering; the new filtering is retained in both duplicate policies.
- Ditto constructor attachment no longer depends on adjacency to `this.main = main`.
- A legacy 12-route boss list would substitute Shaymin on newer routes. Boss lookup now derives from current route data for wave 100, endless spawns and previews.
- The shared Game base now has a stable marker so installing speed cannot overwrite the preceding pause patch.
- Speed replacement no longer depends on adjacency to `switchPause`; pause injects a comment there. Verified the actual speed-button cycle, not just a manually assigned speed factor. Installation only reports success after the 10× branch exists.
- An initial mechanical transplant exposed overlapping hunks. Reapplied complete, uniquely matching upstream hunks and resolved overlaps explicitly; no conflict markers or parse errors remain.

## Initial compatibility verification (before the hotfix)

- Strict ES-module parsing: all 20 distributed patches and all 63 installed JS files (including Electron main).
- Python compilation: installer, diagnostic and save editor.
- Unlockables source audit: 27 secret Pokémon, six maps, four redeem rewards, 30 required text strings × ten languages, and every referenced localized route/reward name.
- Clean full-feature installs with duplicates enabled and disabled: zero patch failures.
- Clean optional-feature installs: pause+speed, QoL only, endless only, and infinite-levels+shiny+vanilla-fixes; strict parsing for each result.
- Real Electron Profile smoke: 162 rows, visible panel, nonempty conditions, no parser/runtime/log/network failures.
- Isolated-copy gameplay regression: all 16 new species/forms at levels 1/100/5,000; acquisition timestamp round trips; partial/infinite level batches; 32 normal-route boss/preview identities; ten-language requirements; chess activation/progress; 112 tower/new-item combinations; new-route endless waves; actual speed-button cycle and paused placement/simulation freeze.
- These checks are bounded regression coverage, not a claim that every combat interaction or full campaign was manually played. macOS remains unvalidated for this version.

## Local delivery

Replaced the normal Windows installation with the complete clean 1.6.3 runtime, then installed the packaged mod ZIP with freshly installed dependencies and the previously enabled feature set. The previous installation also remains recoverable at `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron.pre163-20261025`. The installer retained the existing modded save profile; gameplay stress-test fixtures were confined to a separate copied profile.

Confirmed the installed vanilla backup matches the new baseline hash, all 63 installed JavaScript files parse, and the real installed executable opens the 162-row Unlockables panel without parser/runtime/network errors. Diagnostics passed all checks; fixed its exit prompt to tolerate Windows automation hosts reporting a TTY with closed stdin. The game was closed after verification so normal launching does not retain a debugging port.

The release ZIP contains only a top-level `mods` folder, excluding dependencies, caches, saves, installers and vanilla game archives. Publication was authorized on 2026-10-26 after local validation. The v1.6.3 release uses a single Windows ZIP; previous version releases remain available for rollback. macOS is not part of this release.
