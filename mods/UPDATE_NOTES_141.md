# PokePath TD Mod Update: 1.4 → 1.4.1

## Update Workflow (Reusable for Future Updates)

### Step 1: Extract New Game Version
```bash
# After game updates, extract new app.asar
npx asar extract "resources/app.asar" "resources/app_extracted_NEW"
```

### Step 2: Compare ALL Modded Files
Run fc (file compare) between your current extracted (with mod) and new vanilla:
```powershell
cmd /c fc /N "app_extracted\src\js\game\component\Pokemon.js" "app_extracted_NEW\src\js\game\component\Pokemon.js"
```

### Step 3: Identify Changes by Category
- **DEV FIXES** - Bug fixes from developer (MUST merge into mod)
- **DEV FEATURES** - New features from developer (evaluate for mod compatibility)  
- **MOD ONLY** - Your mod features (preserve these)

### Step 4: Update Mod Files
Apply DEV changes to your .modded.js files while preserving MOD features.

---

## 1.4.1 Changes Analysis

### Files With DEV Changes That Affect Mod:

#### ✅ Pokemon.js - CRITICAL
**DEV FIX:** Silph Scope added to unequip restriction list (line 334-338)
```js
// 1.4.1 adds 'silphScope' to this check:
if (pokeWhitItem.isDeployed && (item?.id == 'silphScope' || item?.id == 'airBalloon' || ...))
```
**ACTION:** Add `item?.id == 'silphScope'` to equipItem() in Pokemon.modded.js

#### ✅ Game.js - MAJOR REFACTOR  
**DEV FEATURE:** Complete drag-and-drop rewrite with pointer events
- New `pointerdown`/`pointermove`/`pointerup` event system
- `mapDragging` flag to prevent click after drag
- `canPlaceOn()` helper function
- Visual clone element during drag
- `mute` parameter added to `moveUnitToTile()`

**ACTION:** Merge your sub-stepping loop and 5x/10x speed options into the new event structure

#### ⚠️ UI.js - MINOR
**DEV CHANGE:** Removed tooltip hover events from save/load buttons (simplification)
**ACTION:** Your tooltip additions still work, just note the pattern changed

### Files With MOD-ONLY Changes (No DEV conflicts):

| File | Mod Features | 1.4.1 DEV Changes |
|------|--------------|-------------------|
| Area.js | Endless mode, boss spawns, wave 100+ | None |
| Enemy.js | Endless scaling, skip-draw | None |
| Tower.js | Multi-attack loop, skip-draw | None |
| Projectile.js | Swept collision, skip-draw | None |
| Shop.js | Shiny eggs (1/30) | None |
| ShopScene.js | Shiny reveal UI | None |
| NewGameScene.js | Shiny starters | None |
| BoxScene.js | 200 slots (vs 103) | None |
| MapScene.js | Show records >100 | None (capped at 100 in vanilla) |
| DefeatScene.js | Endless checkpoints, auto-reset 3 | None |
| FinalScene.js | Continue button for endless | None |
| PokemonScene.js | Level 100+ for shinies | None |
| MenuScene.js | Auto-reset option 3 | None (vanilla has 0-2) |
| Tooltip.js | showText() method | Method exists but different impl |
| text.js | "Continue" text | Minor structure (Continue removed in 1.4.1?) |

### Files NOT Requiring Updates:
- enemyData.js - Phantump spelling already correct
- waveData.js - No mod changes
- pokemonData.js - No mod changes

---

## Specific Code Changes Required

### 1. Pokemon.modded.js
**Line ~420 (equipItem method):**
```js
// OLD (your mod):
if (pokeWhitItem.isDeployed && (item?.id == 'airBalloon' || item?.id == 'heavyDutyBoots' || item?.id == 'dampMulch' || item?.id == 'assaultVest')) {

// NEW (add silphScope):
if (pokeWhitItem.isDeployed && (item?.id == 'silphScope' || item?.id == 'airBalloon' || item?.id == 'heavyDutyBoots' || item?.id == 'dampMulch' || item?.id == 'assaultVest')) {
```

### 2. Game.modded.js
**Complex merge required:**
- Keep your sub-stepping loop (lines 54-141)
- Keep your 5x/10x speed toggle (lines 420-448)
- Integrate DEV's new drag-and-drop system (lines 319-496 in 1.4.1)
- Add `mapDragging` flag
- Add `canPlaceOn()` helper
- Update click handler to check `mapDragging`
- Add pointer event listeners for drag

### 3. text.modded.js
**Check if "Continue" text entry is still needed** - 1.4.1 removed it from vanilla, but your endless mode needs it.

---

## Testing Checklist

After applying updates:
- [ ] Game launches without errors
- [ ] Drag and drop works on map
- [ ] Silph Scope cannot be unequipped from deployed Pokémon
- [ ] Endless mode continues past wave 100
- [ ] 5x and 10x speed work correctly
- [ ] Shiny eggs still appear (1/30 chance)
- [ ] Shiny Pokemon can level past 100
- [ ] Save/load works with 200 box slots
- [ ] Auto-reset "Continue" option works

---

## Version Tracking

| Game Version | Mod Version | Date | Notes |
|--------------|-------------|------|-------|
| 1.4.0 | 1.0.0 | - | Initial mod |
| 1.4.1 | 1.1.0 | 2026-01-31 | Silph Scope fix, drag-drop merge |
