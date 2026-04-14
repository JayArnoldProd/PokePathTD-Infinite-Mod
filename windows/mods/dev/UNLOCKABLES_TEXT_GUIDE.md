# Unlockables Menu Text Guide

## Purpose
This feature exists to remove the need for external wiki searching.

That means locked entries should show **exact unlock conditions** for normal content, not vague hint text.

The only intentional exception is true secret/meta content, such as `MissingNo`, where mystery is part of the feature.

---

## Core Rules

### 1. Be exact
The text must tell the player precisely what action unlocks the thing.

Good:
- `Beat Route 5-3 Challenge`
- `Reach Wave 100 in Endless`
- `Clear Route 2-4 on Hard`
- `Own 50 different Pokémon`
- `Collect all hidden items in Route 3`

Bad:
- `Complete a challenge`
- `Progress further in Endless`
- `Unlock through challenge mode`
- `Find it somewhere special`

### 2. Be concise
The text should be short enough to scan in a scrolling list.

Preferred length:
- ideally one line
- two lines max for edge cases

### 3. Use player-facing terms only
Use the exact in-game labels the player already sees.

Use:
- `Route 5-3`
- `Challenge`
- `Endless`
- `Hard`
- `Hidden Item`

Avoid internal/system wording like:
- `challengeReward`
- `secretMaps`
- `reward table`
- `routeData`
- `unlock flag`

### 4. Say the actual scope
If something requires all variants, say all.
If it requires one specific mode, name the mode.
If it requires a route-specific challenge, say that exactly.

Examples:
- `Clear all Route 3 challenges`
- `Beat Route 4-2 Challenge on Hard`
- `Reach Wave 250 in Endless`

### 5. Keep locked and unlocked states visually distinct
Locked entries should hide identity visually, but the condition text can still be exact for normal unlocks.

Recommended states:
- **Locked normal unlock**: silhouette + `???` name + exact unlock condition
- **Unlocked**: full-color icon + real name + check mark + optional `Unlocked`
- **True secret**: silhouette + `???` name + `???` condition or special secret wording

---

## Text Format Standards

### Pokémon unlocks
Format:
- `Beat Route X-X Challenge`
- `Clear all Route X challenges`
- `Reach Wave N in Endless`

Examples:
- `Beat Route 1-1 Challenge`
- `Beat Route 5-3 Challenge`
- `Clear all Route 2 challenges`

### Item unlocks
Format:
- same as Pokémon when route/challenge-earned
- use collection/progression wording when appropriate

Examples:
- `Beat Route 4-1 Challenge`
- `Collect all hidden items in Route 3`
- `Reach Wave 500 in Endless`

### Secret / meta unlocks
Format:
- default to concealed text if the content is meant to stay mysterious

Examples:
- `???`
- `A hidden unlock exists`
- `There is one more secret`

For `MissingNo`, the recommendation is:
- Name: `???`
- Condition: `???`
- Order: last entry in the list

This preserves the reveal that something exists without exposing the website/code flow.

---

## Consistency Rules

### Route naming
Always use the route name as shown in game.

Preferred:
- `Route 1-1`
- `Route 5-3`

Avoid:
- `World 1 Route 1`
- `Area 5-3`
- `Stage 18`

### Challenge naming
Use `Challenge` singular unless the unlock truly requires multiple challenge clears.

Preferred:
- `Beat Route 3-2 Challenge`
- `Clear all Route 3 challenges`

### Difficulty naming
Only mention difficulty when it matters.

Preferred:
- `Clear Route 2-4 on Hard`

Avoid adding extra words if the game only has one relevant route challenge condition.

### Endless naming
Always capitalize `Endless`.

Preferred:
- `Reach Wave 100 in Endless`

---

## Locked Entry Display Spec

### Normal unlock, still locked
- Icon: blacked-out silhouette
- Name: `???`
- Condition: exact text
- Status marker: none

Example:
- Name: `???`
- Condition: `Beat Route 5-3 Challenge`

### Already unlocked
- Icon: full-color sprite/item art
- Name: real name
- Condition: exact text remains visible or moves to subtext
- Status marker: green check mark

Example:
- Name: `Lustrous Orb`
- Condition: `Beat Route 5-3 Challenge`
- Status: `✓`

### True secret entry
- Icon: blacked-out silhouette
- Name: `???`
- Condition: `???`
- Status marker: none

Example:
- Name: `???`
- Condition: `???`

---

## Ordering Rules
Order entries by expected progression, not by raw ID and not alphabetically.

Preferred ordering:
1. Route 1 unlockables
2. Route 2 unlockables
3. Route 3 unlockables
4. Later-route challenge rewards
5. Endless / special progression unlocks
6. Hidden/special secrets
7. `MissingNo` last

Within a route band, preferred order is:
1. item reward
2. Pokémon reward
3. special/odd reward

If the route reward order in game already communicates progression clearly, mirroring that order is acceptable.

---

## Edge Cases

### Multi-condition unlocks
If a reward has multiple conditions, join them with `and` only if truly required.

Good:
- `Reach Wave 100 and own 50 different Pokémon`

### Retroactively unlocked entries
If the player already satisfies the condition when the feature ships, the entry should appear fully unlocked immediately.
The text should still reflect the original condition.

### Unknown or messy unlock logic
If the real condition is unclear in code, do not invent a shorter sentence.
Document the ambiguity and resolve it in implementation before exposing it in UI.

---

## Implementation Recommendation
Store unlockables text as explicit curated strings in a dedicated unlockables data table rather than generating every line from raw logic.

Why:
- exact wording stays consistent
- secret exceptions are easy to handle
- display order is deliberate
- future edits do not require touching core scene logic

Recommended per-entry fields:
- `id`
- `type`
- `order`
- `name`
- `lockedName`
- `unlockText`
- `secretLevel` (`normal` or `hidden`)
- `icon`
- `silhouetteIcon`
- `isUnlocked(main)`

---

## Final Recommendation
For this mod, the default policy should be:
- **normal unlockables** get exact, concise unlock text
- **true secrets** stay intentionally concealed

That split gives players useful progression information without flattening the game’s few real mysteries.