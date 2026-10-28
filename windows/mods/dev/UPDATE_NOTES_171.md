# Windows 1.7.1 compatibility

Official notes: https://khydra98.itch.io/pokepath/devlog/1733509/patch-notes-171

The complete 1.7.1 notes and clean 1.7.0→1.7.1 source/data/CSS/assets differences were reviewed. There were no skipped releases. The official page still lists two Windows uploads, so the read-only detector correctly stopped at ambiguity; the official free download flow and extracted MenuScene established the actual new runtime version.

## Provenance and recovery

- Official Windows ZIP: 220,965,446 bytes; SHA256 `ea05bf69b6193e1f73c74528afd5cb90e8486d97cad882ace70b880d01a79aa4`.
- Clean 1.7.1 ASAR: 155,110,761 bytes; SHA256 `ef6f0c5c81aece0cc55c75b113c13bb3972692cd7f80ba9db3aa9bd6a0d3d7c9`.
- Verified previous 1.7.0 ASAR SHA256: `a1174c5a635cbe019433744f95b69a352c6983b43cf14edd2f4e4c86ae776d94`.
- The full previous installation, both closed save profiles, feature selections, clean baseline and previous release ZIP were backed up and hash-verified. New vanilla was extracted and backed up separately. Test fixtures use isolated copies only.

## Rebase and content audit

Twenty-two vanilla paths changed, including formatting-only files. Seventeen exact upstream diff groups and six overlapping groups were reconciled. Full-file patches now preserve the new weather initialization/reset, Bronzor Heavy Metal reward routing, Unown form serialization and deployed sprite refresh, Mega Glalie explosion/Wooper threshold, Mega Steelix sand-avalanche behavior, Flutter Mane stun chance, filter additions and shop-animation setting. Unpatched files retain upstream secret recovery, total-level recalculation, route 10-1 mirror endpoint, balance, item restrictions and translations.

The shared secret reward object retains the selected shiny roll. The partial-install shiny patch now recognizes that single construction path. The selected gold-display patch recognizes vanilla's new `formatGold` call and delegates to the mod's existing abbreviation display.

The data remains 505 species/form keys, 249 obtainable lines, 146 ordinary eggs, 197 items, 40 normal routes and seven secret maps. There are no added/removed keys, changed species IDs or new asset files. All normal/shiny sprite references resolve. Editor catalogs were regenerated; item restrictions and localized definitions reflect 1.7.1. Existing 233 Unlockables rows and ten-language conditions remain applicable; no secret/challenge/future content was added to ordinary eggs. Unown forms are cosmetic, with no new acquisition condition.

## Vanilla overlap

- Vanilla already supplies uncapped Moonblast and Amulet Coin star formulas. The obsolete 1200-star patch and its broad feature claim were removed. Actual 1.7.1 Star Candy code retains `Math.min(140, stars * 0.035)`; this cap is preserved despite the earlier official notes' broader uncapping claim.
- Vanilla now displays large gold using exponential notation. The selected QoL feature still provides its distinct gold abbreviations and raised gold limit; partial installs retain upstream formatting.
- Reward recovery, Unown naming/forms, new combat fixes, weather fixes and added filter matches are upstream features. The mod preserves them without claiming authorship.
- Prior partial overlaps remain: collection storage versus extra owned copies, vanilla paused Time Warp versus optional general micromanagement, and vanilla egg cleanup versus evolution-safe ownership filtering and editor restock protection.

## Validation

Staged checks passed all ten feature configurations, including full duplicate-on/off, speed-only, pause-only, both, neither, QoL-only, endless-only, infinite/shiny and enemy/fixes. Strict JavaScript parsing, egg-shop checks under both policies, Python egg/editor tests, sprite coverage and localized Unlockables checks passed.

Isolated Electron checks passed the complete 187-record roster migration and reload, preserving levels, shinies, held item IDs, placement, gold and egg price. Expected changes include canonical item metadata, upstream defaults/arrays/shop migration and the new total-level statistic, checked against the preserved roster sum.

Runtime fixtures covered 112 Unown form/level/shiny round-trips, deployed rename persistence, Heavy Metal reward delivery, missing-secret recovery, item restrictions, weather reset, 233 Profile rows, 111 recent species at levels 1/100/5000, all 40 normal-route bosses, 4,773 tower/item combinations, endless waves, paused controls, extra-copy storage transfers and skin isolation.

The run ledger records final code review, actual-ZIP installations, diagnostics, publication hashes and local deployment separately. This document does not assert that unfinished publication or installation stages succeeded.
