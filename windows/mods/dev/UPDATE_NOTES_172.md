# Windows 1.7.2 compatibility

Official notes: https://khydra98.itch.io/pokepath/devlog/1758807/patch-notes-172 (November 8, 2026, 15:59 UTC). Reviewed the complete notes and clean 1.7.1 → 1.7.2 source/data/CSS/assets diff; no intervening release was skipped. The read-only detector received HTTP 429, so the official page and supplied archive were verified independently. The earlier daily check preceded this release.

## Provenance and backups

- Supplied official ZIP: 221,072,197 bytes, SHA256 `0cb26b7f243b31826f27125846a1d0abe16e0bfd9212c30b4d2fe391e35e5c65`. Its download provenance records itch.io and its linked delivery host (upload 20376253).
- Installer SHA256: `753a11e68468e1dc8f97e8aa682a74cbdc3f6849bd5a73d01d6aa5f70e68477d`. Extracted into staging without launching the installer. Archive paths were checked against the extraction root.
- MenuScene identifies runtime **1.7.2**. Clean ASAR: 155,271,579 bytes, SHA256 `9ee744ae78474874d9370ceb301114928faab7a93c502dd844b91f4c3bf22b09`.
- Previous clean 1.7.1 ASAR verified against `ef6f0c5c81aece0cc55c75b113c13bb3972692cd7f80ba9db3aa9bd6a0d3d7c9` and separately extracted for comparison.
- Full previous installation (16,389 files), both closed profiles (102 files), feature manifest, clean baseline and current release ZIP were backed up and hash-verified under `C:/Users/jayar/clawd/backups/pokepath/before_172_20261108`. New clean baseline: `vanilla_172_baseline_20261108` in the same backup parent.
- Backup preparation initially referenced the prior ZIP and new baseline using stale directory names. It stopped without overwriting a baseline; paths were corrected and existing archives verified before resuming. No live installation or save was changed during preparation.

## Content, localization and sprites

The five new collection lines contain nine species/forms: Mantyke/Mantine, Sizzlipede/Centiskorch (runtime key `centiscorch`), Alolan Sandshrew/Sandslash, Wynaut/Wobbuffet, and Passimian. The runtime now has 514 species/form keys, 254 collection entries, 150 ordinary eggs, 197 items and 47 routes (40 normal, seven secret). No existing species IDs changed; no species, item or route was removed.

Four new base species enter ordinary eggs. Alolan Sandshrew is a secret: equip Icy Rock to ordinary Sandslash. Its Unlockables row uses the existing exact item-equip condition in all ten languages and recognizes either its secret flag or ownership. It is excluded from ordinary eggs. There are now 64 secret Pokémon rows and 234 total Unlockables entries. Existing redeem rewards, secret maps, puzzle conditions and challenge rewards are retained; no future content is granted.

Official normal/shiny art covers every new form, including earlier evolutions. Synchronized the official sprite bundles, including the new Mantyke shiny art and corrected Gyarados/Malamar idle crops. Supplemental mod art remains only where official art is absent. No generated recolors were needed. New Mantyke costume assets come from the clean runtime. Editor Pokémon, egg and item metadata were regenerated from the verified source.

## Rebase decisions

Preserved new Squishy Toy targets and their projectile/beam/orbital interactions; Spirit Shackle shards; Sticky Web and ricochet changes; Defiant item bonuses in both stat paths; Mega-stone validation; item restrictions; passenger teleport; rain damage; enemy-defeat counting; smoke optimization; special-attack opacity; Box Enter transfers; Cone/Mega filters; shape indicators; cosmetics and translations. Unmodified data/CSS/controller modules come from the new clean runtime.

Resolved twelve overlapping diff groups explicitly. Retained sprite isolation and reversible skin paths while moving custom-skin initialization after projectile assignment and preserving Mantyke projectile reset. Integrated the new Tower target helpers alongside orbital refresh. Retained uncapped live Profile totals. Ignored an upstream commented-out projectile assignment and trailing whitespace-only change.

## Vanilla overlap audit

- **Partial overlap: Profile total levels.** Vanilla replaces its fixed 24,200 ceiling with `min(pokemonOwned * 100, totalPokemonLevel)`. The mod already displays the actual total and updates it while the panel is open. Keep the mod's uncapped live display and duplicate-aware collection counting; do not claim the old fixed-ceiling correction alone as exclusive.
- **Upstream additions: Box keyboard shortcut and filters.** Enter transfer and Cone/Mega search are vanilla features. The mod retains attack-type/range-shape sorting and dynamic slots for extra copies; these are distinct operations.
- **Upstream visual/performance changes:** corrected cone/sweep/wave/stream indicators, special-attack opacity and cached smoke parameters are preserved. Shape indicators already existed in vanilla 1.7.1; the mod's sorting does not establish authorship of these improvements. Delta-time guards, simulation substeps and skipped intermediate draws remain separate mod behavior.
- **Upstream fixes:** passenger teleport, Mega validation, defeat counting, weather damage and new combat/item rules are attributed to vanilla. No fully redundant mod patch was identified in this release.
- Existing partial overlaps (storage, Time Warp versus general paused controls, egg cleanup, gold formatting) remain as documented for 1.7.1. Moonblast/Amulet Coin retain upstream uncapped scaling; Star Candy retains its upstream cap.

This is a functionality comparison, not evidence of inspiration or copied code.

## Verification record

Release gates and exact results are recorded in the local run ledger `C:/Users/jayar/clawd/pokepath-auto-update/run_172_20261108.json` and `context/update_172_20261108`. Tests use isolated installations and copied profiles. Publication, local deployment and notifications are separate stages; this document does not assert completion of an unrun stage. Windows is the only validated target.

Pre-package validation passed: ten feature combinations; strict installed JavaScript parsing; egg ownership/depletion and both duplicate policies; editor metadata; 514-key asset coverage; 234 Unlockables; ten-language coverage; complete 187-Pokémon migration and reload; 54 new-species state round trips and 36 image loads; 120 species at levels 1/100/5000; 5,160 tower/item combinations; 40 boss routes; chess, endless, speed and paused controls. Focused checks cover the new secret reward, Box Enter transfer, filters, Squishy Toy, Spirit Shackle, item restrictions and Mantyke skin isolation.
