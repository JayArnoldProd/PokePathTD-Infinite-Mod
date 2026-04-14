# PRP — PokePath TD INFINITE: Unlockables Menu (Profile QoL Feature)

## Problem Statement
PokePath TD contains many hidden or semi-hidden unlocks, including items, Pokémon, and secrets. Right now the player often has no in-game way to understand what exists, what is still locked, or how to obtain it. That pushes discovery outside the game and into community knowledge, trial-and-error, or online searching.

This feature adds a **Profile-based Unlockables menu** that turns hidden progression into readable in-game progression.

The design target is:
- a new **Unlockables** button in `ProfileScene`
- a scrollable unlockables view replacing or overlaying the stats list
- locked entries shown as silhouettes with `???`
- normal unlocks showing **exact, concise unlock conditions even while locked**
- unlocked entries showing real art/name plus a check mark
- true secret/meta entries, especially `MissingNo`, intentionally remaining concealed

This is a quality-of-life mod feature. It should feel like the game finally explains its own progression instead of requiring a wiki.

---

## Feature Intent
### What this should do
- Show the player that hidden unlockables exist
- Show where they are in progression order
- Explain exact unlock requirements for normal content
- Preserve a small amount of intentional mystery for true secrets
- Reuse existing game state where possible instead of inventing parallel save data

### What this should not do
- Spoil every hidden/meta secret
- Add a complicated codex system with multiple submenus
- Duplicate route/challenge logic in fragile hardcoded UI branches
- Create a new progression system separate from existing player/item/secret/challenge state

---

## Current State Snapshot

### Existing Profile scene structure
From `windows/mods/patches/ProfileScene.modded.js` and the current extracted game scene:
- Profile already has a top player/header area with portrait and achievements
- It already owns a large stats panel via `this.statsContainer`
- It refreshes periodically while open
- It is the most natural place to add a QoL progression/tracking subview without creating a new top-level section

Relevant current structure:
```js
this.playerContainer = new Element(this.container, { className: 'profile-player-container' }).element;
this.achievementsContainer = new Element(this.container, { className: 'profile-scene-achievements-container' }).element;
this.statsContainer = new Element(this.container, { className: 'profile-stats-container' }).element;
```

This matches Jay’s suggestion: add an **Unlockables** control below the portrait/medal header and swap the lower content area.

### Existing player state already tracks multiple unlock surfaces
From `src/js/game/core/Player.js`:
- `items`
- `secrets`
- `secretMaps`
- `rewards`
- `records`
- `challenges`
- `stats`

Relevant snippet:
```js
this.secrets = playerData.secrets ?? {
	cacnea: false,
	greavard: false,
	stakataka: false,
	luvdisc: false,
	chatot: false,
	sandygast: false,
	ducklett: false,
}
```

This is important because the unlockables feature should mostly be a **read-only interpretation layer** over existing save state.

### Route reward data already encodes major unlock progression
From `src/js/game/data/routeData.js`:
- routes include `unlock` star thresholds
- many routes include `challengeReward`
- routes also include `order`
- at least one route is explicitly flagged `isSecret: true`

This means route-based unlockables can be ordered and described from real game data instead of arbitrary manual ordering.

### Existing hidden/secret behavior is scattered
Search results show unlock-related behavior currently lives across:
- `routeData.js`
- `itemData.js`
- `pokemonData.js`
- `UI.js`
- `MenuScene.js`
- `ProfileScene.js`
- `ChallengeScene.js`
- `Player.js`

Planning consequence:
- the menu needs a **single curated unlockables registry** so the UI is not forced to guess from scattered conditions at render time

---

## Proposed UX

### Entry point
Add an **Unlockables** button to the Profile screen under the top header zone, before the stats list.

Recommended behavior:
- default Profile view stays on stats
- clicking **Unlockables** switches lower panel from stats to unlockables list
- a second click or companion **Stats** button returns to stats view

### Unlockables list view
The unlockables view should be a vertically scrollable list.

Each row should show:
- icon area
- name area
- unlock-condition text
- unlocked state marker

#### Locked normal unlock
- icon: silhouette / darkened art
- name: `???`
- condition: exact unlock text
- status: none

#### Unlocked entry
- icon: full-color art
- name: real item/Pokémon name
- condition: exact unlock text still visible or as smaller subtext
- status: green check mark

#### True secret entry
- icon: silhouette
- name: `???`
- condition: `???`
- status: none

### Ordering
Order by expected player progression, not alphabetically.

Primary ordering source should be curated `order` values in the unlockables registry, informed by:
- route progression order
- star progression
- challenge progression
- special late-game unlock difficulty
- secrets last
- `MissingNo` last of all

---

## Text Policy
This feature should follow:
- `windows/mods/dev/UNLOCKABLES_TEXT_GUIDE.md`

Key policy decision:
- **normal unlockables show exact unlock conditions**
- **true secrets remain intentionally concealed**

Examples of acceptable locked text:
- `Beat Route 1-1 Challenge`
- `Beat Route 5-3 Challenge`
- `Reach Wave 100 in Endless`
- `Collect all hidden items in Route 4`
- `Clear all Route 3 challenges`

Not acceptable:
- `Complete a challenge`
- `Unlock in challenge mode`
- `Progress further`

---

## Architecture Diagram
```text
Existing save state / game data
   |         |         |         |
   |         |         |         +--> player.secrets / secretMaps / rewards
   |         |         +------------> routeData challenge rewards + route order
   |         +----------------------> itemData / pokemonData display metadata
   +--------------------------------> challenge / endless / collection state
                    |
                    v
      unlockables registry (new source of truth)
                    |
          +---------+---------+
          |                   |
          v                   v
   unlock condition checks   UI-ready display data
          |                   |
          +---------+---------+
                    v
        ProfileScene unlockables panel
```

---

## Files to Create
- `windows/mods/dev/UNLOCKABLES_TEXT_GUIDE.md`
- `windows/mods/dev/PRP_UNLOCKABLES_MENU.md`
- `windows/mods/patches/Unlockables.data.js` or similar dedicated unlockables registry file
  - exact filename can change during implementation, but the data should be centralized

## Files to Modify
- `windows/mods/patches/ProfileScene.modded.js`
- likely `windows/mods/patches/UI.modded.js` only if shared helpers/tooltip behavior are needed
- likely one or more CSS patch surfaces if Profile needs new layout classes
- possibly `windows/mods/lib/apply_mods.py` if a new patch/data file must be copied explicitly
- possibly text/localization surfaces if button labels must live in shared text tables

## Files to Reference
- `windows/mods/patches/ProfileScene.modded.js`
- `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron\resources\app_extracted\src\js\game\scenes\ProfileScene.js`
- `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron\resources\app_extracted\src\js\game\core\Player.js`
- `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron\resources\app_extracted\src\js\game\data\routeData.js`
- `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron\resources\app_extracted\src\js\game\data\itemData.js`
- `C:\Users\jayar\AppData\Local\Programs\pokePathTD_Electron\resources\app_extracted\src\js\game\data\pokemonData.js`

---

## Recommended Data Model
Create a dedicated curated unlockables table. Do **not** try to render the menu by dynamically scraping route/item/pokemon data on the fly.

Recommended shape per entry:
```js
{
  id: 'lustrousOrb',
  type: 'item',
  order: 530,
  lockedName: '???',
  unlockedName: 'Lustrous Orb',
  unlockText: 'Beat Route 5-3 Challenge',
  icon: './src/assets/images/items/lustrous-orb.png',
  silhouetteIcon: './src/assets/images/items/lustrous-orb.png',
  secretLevel: 'normal',
  isUnlocked: (main) => boolean,
}
```

Possible `type` values:
- `item`
- `pokemon`
- `secret`
- `meta`

Possible `secretLevel` values:
- `normal`
- `hidden`

Why this should be curated:
- exact wording stays stable
- ordering is explicit
- `MissingNo` can be treated specially
- oddball unlocks do not contaminate ProfileScene logic
- conditions can still call into real game state without scattering text logic everywhere

---

## Implementation Blueprint

### Phase 1 — Audit actual unlockables and define the registry
Before touching UI, build the unlockables list.

For every planned entry, define:
- id
- display order
- type
- display art source
- locked display behavior
- exact unlock text
- unlock predicate based on real game state

Initial categories to include:
- route challenge reward items
- route challenge reward Pokémon
- hidden secret Pokémon/items already tracked by `player.secrets`
- special progression unlocks already encoded elsewhere
- `MissingNo` as final hidden/meta entry

Important rule:
- If the unlock condition cannot be stated confidently from code, stop and resolve it before adding the entry.

### Phase 2 — Add ProfileScene view toggle
Extend `ProfileScene` so it has two lower-panel modes:
- `stats`
- `unlockables`

Recommended additions:
- `this.activeSubview = 'stats'`
- `this.unlockablesButton`
- optionally `this.statsButton`
- `this.unlockablesContainer`

Behavior:
- button toggles visibility between `statsContainer` and `unlockablesContainer`
- top portrait/achievement area remains shared
- no new top-level section required

### Phase 3 — Build the scrollable unlockables panel
Create a scrollable list container under the profile header area.

Each entry should render:
- art/icon
- name text
- unlock text
- check mark if unlocked

UI behavior requirements:
- supports many entries without layout breakage
- keyboard/mouse wheel scrolling if the engine/UI layer already supports it
- if custom scroll is required, keep it simple and isolated to this scene

### Phase 4 — Locked/unlocked rendering rules
For normal entries:
- locked uses silhouette + `???` name + exact unlock text
- unlocked uses full-color art + real name + check mark

For hidden/meta entries:
- locked uses silhouette + `???` + `???`
- unlocked can either reveal fully or remain partially stylized depending on design choice

Recommendation:
- `MissingNo` remains completely hidden until unlocked, then reveals fully

### Phase 5 — Wire unlock predicates to real state
Preferred signal sources:
- route challenge completion from player reward/challenge state
- owned items from `player.items`
- owned Pokémon from team + box + rewards if needed
- `player.secrets` for hidden/manual discoveries
- records/stars/endless milestones where appropriate
- redeem/meta state for `MissingNo` if applicable

Avoid:
- creating duplicate booleans if the state already exists elsewhere

### Phase 6 — Styling pass
Need clear visual hierarchy:
- icon left
- name/check center-top
- condition text below or beside it
- clean spacing for dozens of rows

Strong recommendation:
- condition text should stay legible at game scale without wrapping into giant blocks
- keep the card/list layout narrow and consistent

### Phase 7 — Integration verification
After implementation:
- apply patch to install-local mod folder
- repack
- manually verify profile layout and scrolling
- verify a mix of locked/unlocked states on a real save
- verify no regression to existing Profile stats behavior

---

## Known Gotchas & Caveats
- **ProfileScene space is tight.** The new button and list panel must not crush the existing portrait/achievement layout.
- **Unlock logic is scattered today.** Centralizing the registry is the main architectural protection against spaghetti.
- **Do not guess unlock conditions.** Exact text is part of the feature’s value.
- **Some rewards may be route reward items but not yet owned on older saves.** The UI should reflect current save truth, not assumed progression.
- **Secret content should stay intentionally secret where desired.** Not every entry should expose its method.
- **Scroll behavior can become annoying fast.** Keep interaction simple and readable.
- **Localization exists in the base game.** This first pass can still be English-first if needed, but the PRP should acknowledge that hardcoded English is a follow-up tradeoff, not an invisible choice.

---

## Testing Strategy

### Static verification
- registry exists and covers the desired unlockables set
- every entry has explicit text and order
- no duplicate ids/order collisions
- no guessed unlock strings left as placeholders

### UI verification
- Profile opens without breaking
- new button is visible and readable
- toggling between stats and unlockables works reliably
- unlockables list scrolls correctly
- long lists do not overlap portrait/achievement/header areas

### Data verification
- a known locked entry renders as silhouette + `???`
- a known unlocked item renders with real name/art/check
- a known unlocked Pokémon renders with correct sprite/check
- a secret entry remains concealed
- `MissingNo` appears at bottom of the list

### Regression verification
- existing Profile stats still update correctly
- portrait/name editing still works
- achievements still render/tooltips still bind
- no save corruption from simply opening the menu

---

## Success Criteria
- [ ] Profile scene contains an Unlockables entry point that feels native to the menu
- [ ] Unlockables panel is scrollable and readable
- [ ] Normal locked entries show silhouette + exact concise unlock condition
- [ ] Unlocked entries show full-color art + real name + check mark
- [ ] True secret entries remain intentionally concealed
- [ ] Entries are ordered by meaningful progression, not alphabetically
- [ ] `MissingNo` exists as the final hidden/meta entry
- [ ] Existing Profile functionality remains intact

---

## Explicit Stop Gates
Stop and ask before:
- exposing a secret unlock that is supposed to remain hidden
- inventing unlock conditions that are not proven in code
- adding a whole new top-level menu instead of extending Profile
- changing save schema when existing state is sufficient
- any commit/push/PR action unless Jay explicitly asks in that moment

---

## Recommended First Implementation Slice
Implement in this order:
1. Create the curated unlockables registry with 5-10 representative entries
2. Add ProfileScene toggle/button and empty unlockables panel
3. Render a basic scrollable list from that registry
4. Prove locked/unlocked rendering works with real save state
5. Expand the registry to the full unlockables set
6. Polish layout, icon treatment, and secret handling

That sequence keeps the risky part small: architecture first, content expansion second.