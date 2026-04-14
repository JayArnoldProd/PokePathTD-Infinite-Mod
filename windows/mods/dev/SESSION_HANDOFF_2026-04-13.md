# Session Handoff - Windows 1.5 Rebase

Date: 2026-04-13
Repo: `C:\Users\jayar\Documents\GitHub\PokePath-TD-Mods`

## Source PRPs / planning docs
- `windows/mods/dev/PRP_UPDATE_150_CORE_COMPAT.md`
- `windows/mods/dev/PRP_UPDATE_150_CONTENT_AND_EDITOR.md`
- `windows/mods/dev/UPDATE_NOTES_150.md`
- `windows/mods/dev/PRP_SHINY_GENERATOR_RECOVERY.md` (parked, not part of current core rebase)

## Current truth
The game-side smoke test already passed earlier for the first narrow checkpoint:
- boot
- map load
- start wave
- pause/resume
- speed switching
- micromanagement
- devtools

That checkpoint validated the early runtime/apply base, but it did **not** include the later scene/UI repo changes because those updated patch files were not re-applied to the installed game yet.

## Already completed before this handoff
### Installer / tooling / versioning
- Fixed repo-driven install path detection so the mod tools target the real local game install instead of assuming the repo folder is the game directory.
- Fixed save-manager pathing similarly.
- Updated Windows 1.5 version/tooling/docs:
  - `windows/mods/version.json`
  - `windows/mods/diagnose.py`
  - `README.md`
  - `windows/mods/README.md`
  - `windows/mods/dev/UPDATE_NOTES_150.md`
- Earlier narrow checkpoint was applied/installed and tested successfully.

### Scene/UI rebase work now in repo patch files
#### `windows/mods/patches/BoxScene.modded.js`
Rebased onto vanilla 1.5 structure and kept mod behavior:
- attack-type sort restored
- attack-type labels restored
- 200 box slots behavior restored
- sort wraparound updated for the extra sort mode
- kept 1.5 Box/SectionScene structure and drag/drop behavior as trunk

#### `windows/mods/patches/UI.modded.js`
First 1.5-vanilla rebase pass written.
Includes at least:
- wave info panel support restored
- save/load button tooltip behavior restored
- `>= 100` endless gating for relevant UI checks restored
- uncapped star display restored
- inventory section handling preserved
- file passes `node --check`

### Syntax sanity checks already passed
- `windows/mods/patches/BoxScene.modded.js`
- `windows/mods/patches/UI.modded.js`

## Important caveat
These repo patch-file changes were **not yet re-applied to the installed game** at the moment of handoff.
So if Jay tests the installed game and does not see the Box attack-type sort yet, that is expected until the updated patch set is actually applied again.

## Next logical steps
1. Re-read current patch files and confirm the repo state:
   - `windows/mods/patches/BoxScene.modded.js`
   - `windows/mods/patches/UI.modded.js`
2. Re-apply the updated mod patch set to the real local install.
3. Have Jay verify that Box now shows the attack-type sort option.
4. Continue the 1.5 scene/UI rebase for the remaining high-priority files:
   - `ShopScene.modded.js`
   - `Shop.modded.js`
   - `MapScene.modded.js`
   - `MenuScene.modded.js`
   - `ProfileScene.modded.js`
5. After that, move into deeper gameplay/core merge surfaces:
   - `Pokemon.modded.js`
   - `Area.modded.js`

## High-priority mod features that must survive
- Box attack-type sort and labels
- 200 box slots
- pause micromanagement behavior
- speed mod behavior
- devtools
- endless-mode UI expectations (`>= 100` behavior where intended)
- inventory access rules during challenges
- uncapped/extended endless-related displays where the mod expects them

## Suggested immediate verification after re-apply
Ask Jay to verify:
- Box scene opens
- attack-type sort exists
- selecting that sort updates labels/order correctly
- no obvious drag/drop regressions in Box/UI

## Guardrails
- Main-agent work requested by Jay
- Keep using the repo as source of truth, then apply to local install deliberately
- Do not claim installed-game behavior until the updated patch set has actually been applied
- No commit/push unless Jay explicitly asks in that moment
