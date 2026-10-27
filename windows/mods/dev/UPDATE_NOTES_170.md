# Windows 1.7.0 compatibility

Official source: https://khydra98.itch.io/pokepath/devlog/1729789/patch-notes-170

The complete October 26 notes were read and compared with the user-provided copy. There were no intervening releases between the verified 1.6.3 baseline and 1.7.0. Every future update must retrieve and review all skipped devlogs before rebasing, as required by UPDATE_WORKFLOW.md and the authorized Codex updater workflow.

## Provenance and backups

- Runtime version was read from the downloaded Windows MenuScene; the Electron package's generic version was not used.
- Official Windows ZIP: 220,968,571 bytes; SHA256 `9579DAF8DCD45E4A328C0F504DE13F1F79863CE1BF43FBCBFD4F5C498ED1CAAC`.
- Clean 1.7.0 ASAR: 155,098,387 bytes; SHA256 `A1174C5A635CBE019433744F95B69A352C6983B43CF14EDD2F4E4C86AE776D94`.
- Previous clean 1.6.3 ASAR: SHA256 `E96F3BE3731786AE63CED6CE309C54B818BF52ECB100DA64A293AF1259D7DF8C`.
- The previous full install, closed vanilla/modded saves, feature selections, vanilla baseline and public release ZIP were backed up with verified hashes before tests. New vanilla was extracted separately. All destructive fixtures used copied profiles.
- The official page retained two Windows uploads; the read-only detector reported ambiguity. The official download flow and extracted runtime established which build was 1.7.0. Legacy checker/cron/state were not used.

## Rebase and content audit

Compared 833 changed source/assets paths, including 53 JavaScript files. Rebased full replacements deliberately and audited 110 overlapping diff groups. Preserved new weather, XLH maps, streams, special projectiles, boss behavior, statistics, skins, item forms, inventory pools, sorting, settings, portrait picker and localization.

The verified data has 505 species/form keys (111 additions, no removed keys or changed species IDs), 146 ordinary eggs, 40 normal routes and seven secret maps. The editor includes all 197 item definitions, including the 42 new definitions; defining an item does not automatically grant or unlock it. Future/unused vanilla definitions are not added to ordinary eggs or presented as normal unlockables.

Unlockables covers 63 secret Pokémon, seven secret maps, two hidden items, the welcome gift and all four challenge rewards on each normal route. It preserves true meta-secret treatment, documents achievement/boss requirements, redeem rewards, Unown progress, Halloween and the Board Room. New strings and fallback strings cover ten languages. All 505 species/form sprite references resolve for normal and shiny appearances, preferring official assets.

## Vanilla overlap

- Vanilla storage now follows the collection size, exceeding the old 200-slot patch. The retained `box_expansion` selection now grows display slots for the collection and additional owned copies.
- Vanilla provides the new settings, item/achievement tooltip content, portrait/cosmetic controls, acquisition sorting and expanded field/attack indicators. The mod retains its extra sorts, button labels, duplicate-aware collection tracking and Unlockables.
- Published balance corrections previously supplied by the mod are in vanilla, including its updated Amulet Coin values. The obsolete correction function is no longer selected; newer balance is preserved.
- The egg queue cleanup overlaps only partly: the mod still excludes owned evolution lines, rejects non-egg entries, preserves existing copies and avoids implicit editor restocking.
- Vanilla permits Time Warp actions while paused. The optional pause feature still permits ordinary placement, swaps and retirement without advancing simulation; unselected installs retain vanilla Time Warp behavior.
- Vanilla's current power-recalculation throttle is retained. Stale claims about per-frame throttling and damage UI throttling were narrowed or removed.

## Issues found and corrected during validation

- Render-time star theming called Utility before its initialization.
- New paused-placement and swap guards blocked the optional pause feature.
- Old box capacity hid the expanded collection and additional copies.
- The mod's older Area replacement omitted spike-zone/link-beam methods; the Pokémon panel omitted the new cosmetics methods.
- The partial vanilla-fixes install did not recognize the new multiline orbital attack branch.
- Ditto party refresh needed the new fossil/paradox IDs.
- Route parsing skipped a double-quoted Castle Room name and assigned the following route's label to the wrong ID.
- The egg parser's required semicolon consumed later reward/secret lists in the new source. It now stops at the actual array boundary and is checked against the generated ordinary-egg catalog.
- Item parsing could miss template-literal names. The editor now uses complete generated localized item definitions.
- Installer patch failures now prevent repacking a partial installation.
- Challenge completion statistics are not incremented by ordinary wins.
- Dynamic storage slots retain drag/transfer handlers; Continue/Restart and new attack labels are localized.
- Upstream skin-copy isolation, cosmetic refresh, inventory sorting and pointer cleanup are preserved.
- Secret-map star eligibility, wave-50 auto-stop and entered-canvas targeting survive the rebase.
- Enemy previews follow the selected vanilla/endless scaling; wave timers use simulated elapsed time.
- Dynamic storage slots retain drag/transfer handlers; Continue/Restart and new attack labels are localized.
- Upstream skin-copy isolation, cosmetic refresh, inventory sorting and pointer cleanup are preserved.
- Secret-map star eligibility, wave-50 auto-stop and entered-canvas targeting survive the rebase.
- Enemy previews follow the selected vanilla/endless scaling; wave timers use simulated elapsed time.

## Validation record

Completed checks include strict patch/installed JavaScript parsing, editor regressions, ownership/purchase/transfer egg tests, all new species at levels 1/100/5000, all normal-route bosses, ten-language Profile conditions, speed/pause interaction, new item combinations, actual attacks, item/form round-trips, Halloween and storage beyond the old cap.

The complete 187-record copied roster was compared before/after migration and reload, preserving gold, egg price and unrelated save fields. Expected changes were limited to new default fields, official item metadata, appended route arrays, the official shop migration, safe ordinary-egg reconciliation and elapsed time.

Release gates, final review, package verification and publication receipts are recorded by the current run ledger; this document alone does not assert that an unfinished release was published.
