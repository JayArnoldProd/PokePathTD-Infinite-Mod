# Update Notes: Windows 1.5.6

## Backups

- Previous vanilla source backed up before installing 1.5.6:
  - `C:\Users\jayar\clawd\backups\pokepath\vanilla_1.5.5_before_1.5.6_20260601_143613`
  - ASAR: `app.asar.vanilla.1.5.5`
  - Size: `75,099,579`
  - SHA256: `FC57F99A00D61B3AF55CDFC0819E899E328FD784AF4DD88915400BC993005019`
- New vanilla 1.5.6 baseline:
  - `C:\Users\jayar\clawd\backups\pokepath\vanilla_1.5.6_baseline_20260601_144100`
  - ASAR: `app.asar.vanilla.1.5.6`
  - Size: `77,373,194`

## Changelog Impact Areas

- New XL map support appears in `Game.js`, `Area.js`, `routeData.js`, map CSS/assets, and Route 6-1 data.
- UI changed significantly: deployed indicators, attack-shape/type indicators, focus switching, gold-per-minute display, unequip button, saved-team tooltips, and stun/slow duration indicators.
- Storage and profile views changed for FIELD filtering and Pokédex/Shinydex counts.
- Shop and item logic changed for new items including Scovillain Siracha, Sokudo's Portfolio, Mitsue's Cocktail, Lagging Tail, Lucarionite, Charizardite Y, Buneary Egg, and Dratini Egg.
- Pokémon data changed for new evolutions/forms/stat balances, including Farigiraf, Dudunsparce, Annihilape, Cherrim sunlight transform, Buneary/Lopunny, and Dratini line.
- Enemy, wave, and route data changed for balance and route wave swaps.
- Combat fixes landed in vanilla for Tapu Bulu, item equip guards, out-of-map attacks, Sableye ricochets, and Weakness Policy.

## Actions Taken

- Rebased full-file mod patches against vanilla 1.5.6 candidates with conflicts resolved toward new vanilla behavior plus existing mod hooks.
- Updated installer and diagnostic fingerprints for 1.5.6.
- Regenerated save editor Pokémon metadata from 1.5.6 runtime data.
- Updated save editor route completion baseline to 21 normal routes / 2100 stars and added Buneary/Dratini to the egg reset list.
- Reconciled `text.modded.js` with vanilla 1.5.6 text additions and verified every text array in the modded text table has all 10 language slots.

## Vanilla Feature Overlap Audit

- Challenge saved-team retention is now partially vanilla in 1.5.6. Vanilla persists route-aware challenge/draft saved-team presets in `TeamManager`; the mod's remaining claim is scoped to active party, held-item, and deployed tower-position restore around non-draft challenge start/surrender.
- Saved-team Pokémon/item tooltips are now vanilla in 1.5.6. The mod README should only claim simple save/load button labels or other tooltip behavior not provided by vanilla.
- Attack/shape/field indicators are now vanilla in 1.5.6. The mod claim is scoped to box attack-type sorting and related mod UI, not generic attack indicators.
- Vanilla 1.5.6 fixed Pokémon attacking enemies outside the map. The mod's off-screen projectile behavior should be described as a retained projectile-targeting guard unless testing proves the patch is fully redundant and can be removed.

## Watch Points

- Route 6-1 is marked `xl` and uses a 60-column placement grid. Placement, dragging, and map scrolling must be tested on this map.
- Projectile/orbital collision behavior must be checked again because 1.5.6 changed combat code and the 1.5.5 mod fix was collision-sensitive.
- Confirm optional installer combinations still behave independently after the rebase.
- When new unlockables, settings, routes, items, or save-editor UI text are added, confirm all language arrays are 10 entries long and compare modded text keys against the new vanilla text table.
- Before publishing README/release/Reddit copy, list any vanilla features that overlap mod features and either remove the mod claim, scope it to the remaining mod-only behavior, or mark the mod patch as a temporary compatibility guard.
