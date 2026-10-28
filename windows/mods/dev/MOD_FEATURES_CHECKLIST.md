# Windows 1.7.1 feature and compatibility checklist

This is a behavior checklist for the verified 1.7.1 baseline. Historical implementation details are available in Git history. Do not restore obsolete patches merely to match an older checklist: compare clean upstream source first, preserve selected user behavior, and test the resulting combinations.

## Installation and saves
- [ ] Verify the downloaded runtime version, clean ASAR hash, all skipped official devlogs and source differences.
- [ ] Preserve the full prior installation, both closed save profiles, selected features and clean baselines.
- [ ] Extract a fresh matching vanilla baseline for each installation; fail before repacking if a patch fails.
- [ ] Preserve every existing Pokémon, including duplicates, when changing feature selections.
- [ ] Keep vanilla and modded userData separate; do not overwrite existing saves or migrate a running game.
- [ ] Retain `installed_features.json`; fresh installs default `allow_dupes` off.
- [ ] Compare complete team/box records before and after migration and reload, including level, shiny state, items, skins, statistics and placement.

## Independent feature selections
- [ ] Speed: 1x, 1.5x, 2x, 3x, 5x, 10x, preserving simulation substeps.
- [ ] Without speed: retain vanilla speeds and Rose-dependent options.
- [ ] Pause micromanagement: ordinary placement, movement, swaps and retirement while paused without advancing simulation.
- [ ] Without pause micromanagement: retain vanilla Time Warp eligibility and pause restrictions.
- [ ] Test full configurations with duplicates on/off, speed only, pause only, both, neither, QoL only, endless only, infinite/shiny and enemy/fixes combinations.

## Endless mode and high levels
- [ ] Route-derived boss identities cover all 40 normal routes; keep all seven secret maps functional.
- [ ] Continue at wave 101, auto-reset Continue option, wave selection, checkpoints and uncapped records remain available.
- [ ] Challenges end at wave 100. Secret maps do not award ordinary-route stars.
- [ ] Retain normal wave-50 boss auto-stop and endless-safe wave previews.
- [ ] Power-budget waves, deferred spawn queue, scaling, escorts and boss waves still work.
- [ ] Saved tower positions redeploy only on compatible unoccupied tiles.
- [ ] Ordinary Pokémon stop at level 100; shiny level purchases and stat scaling remain uncapped.
- [ ] Partial +5/+10 purchases stop exactly at 100 for ordinary Pokémon.
- [ ] Challenge caps restrict combat stats without boosting low-level Pokémon.
- [ ] Orbital count/speed/range, crit, range, recharge and cost previews agree with actual formulas.
- [ ] Preserve 1.7 streams, special projectiles, platforms/passengers, weather, XL/XLV/XLH maps, statistics, cosmetics and item/form transitions.

## Shiny and egg behavior
- [ ] Selected shiny feature rolls 1/30 for eggs, starters, challenge rewards and hidden acquisitions.
- [ ] Reveal animation uses the Pokémon shiny state and preserves upstream reward text.
- [ ] All 505 species/form keys resolve normal and shiny art, using official assets where available.
- [ ] Shiny enemies: 1/1000 roll, doubled HP/armor, two-heart damage, 1000x gold and defeat tracking.
- [ ] Sprite and skin objects remain isolated between Pokémon, catalog definitions and Ditto transformations.
- [ ] Egg shop uses exactly the 146 ordinary egg entries, excludes owned evolution lines and rejects secret/challenge entries.
- [ ] Stale/empty pools never charge gold, and transfers preserve existing copies under both duplicate policies.
- [ ] Editor operations never implicitly restock eggs; explicit reset retains its confirmation.

## QoL, storage and localization
- [ ] Adaptive storage exposes the full current collection and every owned copy beyond the collection size.
- [ ] Dynamically added slots support selection, transfers and drag handlers.
- [ ] Acquisition, attack type and attack shape sorting coexist, including streams and all new shapes.
- [ ] Keep vanilla inventory sorting/tier indicators, cosmetic controls, portrait picker, settings and tooltip content.
- [ ] Save/load labels, position persistence, gold limits/abbreviations, map hover counts and live Profile stats remain available.
- [ ] Profile collection counts remain duplicate-aware; evolved forms count toward their obtainable line.
- [ ] Unlockables includes 63 secret Pokémon, seven maps, two hidden items, the gift and 160 challenge rewards.
- [ ] Conditions and progress derive from real achievements/rewards/puzzle/save state. Do not grant future content.
- [ ] New strings, fallback strings, button labels and shape/type labels cover all ten languages.

## Combat and performance
- [ ] Retain vanilla 1.7 simulation-time power recalculation throttling.
- [ ] Selected delta-time feature retains bounded attack catch-up, orbital guards, substep draw skipping and squared-distance searches.
- [ ] Preserve new entered-canvas targeting rules, projectile retargeting and off-screen cleanup.
- [ ] Preserve Shell Bell/Clefairy Doll tracking and the new weather/healing counters.
- [ ] Do not reapply obsolete published balance corrections already present in vanilla.

## Editor and developer tools
- [ ] Regenerate `pokemon_data.json`, `egg_catalog.json` and `item_catalog.json` from the verified runtime.
- [ ] Editor lists 47 routes with correct IDs, 40 star routes, 146 ordinary eggs and 197 localized item definitions.
- [ ] Defining an item or future form in metadata must not automatically grant it or add it to eggs.
- [ ] Developer-tools selection enables Electron F12/Ctrl+Shift+I shortcuts.

## Release gates
- [ ] Update version/fingerprints, diagnostics, both READMEs and update notes.
- [ ] Run strict JS parsing, Python compilation, diagnostics, egg/editor checks, Unlockables checks and real isolated Electron smoke tests.
- [ ] Exercise new species at levels 1/100/5000, item combinations, actual combat, cosmetics, maps/bosses and copied-save migration.
- [ ] Use the personal code-review skill and re-review all fixes.
- [ ] Test a clean installation from the actual release ZIP; exclude dependencies, saves, manifests, baselines, caches and test hooks.
- [ ] Verify the published ZIP SHA256 and source commit/tag before local deployment and notification.

## Windows 1.7.1 regressions
- [ ] Unown A–Z/!/? forms preserve shiny state, metadata and placement through rename/save/reload.
- [ ] Heavy Metal rewards reach storage and missing already-unlocked secrets recover on startup.
- [ ] Weather initializes and clears correctly; preserve Mega Glalie, Mega Steelix, Kyogre and balance fixes.
- [ ] Preserve new filter entries, translated names, route mirror endpoint and item restrictions.
- [ ] Retain vanilla Moonblast/Amulet Coin scaling and Star Candy's 140-range bonus cap; do not restore obsolete cap patches.
