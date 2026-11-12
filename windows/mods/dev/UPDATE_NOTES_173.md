# Windows 1.7.3 compatibility

The official Windows upload appeared November 11 at 15:48 UTC. The developer published the [1.7.3 notes](https://khydra98.itch.io/pokepath/devlog/1769708/patch-notes-173) at 16:32 UTC. There were no intervening releases after 1.7.2. The downloaded ZIP contains the 1.7.3 MenuScene runtime. Its SHA256 is `af553be690e17f496f29c3f687ac1f777acdf84f18c676fdb9758d6224b2301f`. The clean ASAR hashes to `53db10d6abb66294c121ca5d6b300dfc7818ce3c4ced36ded4156f3bbf7207dc`. The previous clean ASAR hashes to `9ee744ae78474874d9370ceb301114928faab7a93c502dd844b91f4c3bf22b09`.

The comparison covered 36 changed source, data, style and asset paths. The complete prior install, feature manifest, both closed save profiles, previous release ZIP and clean baselines are backed up under `before_173_20261112` and `vanilla_173_baseline_20261112`.

## Secrets and gameplay

Mimikyu becomes obtainable on route ID 17 after its wave-50 defeat with Pikachu or Raichu deployed. Clicking the darkened tower completes the encounter on the standard route outside challenges. Defeating Zamazenta above −10 or Zacian below −90 passive charges unlocks achievements 29 and 30 respectively. All three secrets have localized Profile entries and stay outside the 150 ordinary eggs. The release has 517 species/form keys, 67 secret Pokémon, 237 Unlockables, 47 routes and 197 item definitions.

Upstream supplies the Mimikyu shiny revisions, both legendary shinies and their held-item art. The rebase carries forward the new attacks, shape indicators, summon HP, item restrictions, Mega loading and secret recovery. The editor reads the refreshed species and item catalogs.

## Feature overlap

Vanilla refreshes raw party and box counts when either collection screen opens. The modded Profile retains distinct evolution-line counts and uncapped live levels. Owned MissingNo. is a bonus above the collection target. Both versions use the upstream collectible-item denominator. No separate mod fix is claimed for refresh, item totals, Mega loading or shape indicators.

The first isolated install caught the removed draft-reset call. The challenge patch now preserves vanilla draft presets and observes slot and item limits when restoring a party. During review, two selection issues were corrected. Restoring a saved duplicate transfers the original object before removing its Box entry, and the optional secret shiny roll runs after selected UI replacements.
