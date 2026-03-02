# PokePath TD Mod Features Checklist

This document lists all mod features that MUST be present in the modded files. Use this checklist when updating to new vanilla versions to ensure no features are lost during merges.

## Area.modded.js
- [ ] `this.endlessMode = false;` in constructor
- [ ] `this.endlessMode = this.waveNumber > 100;` in loadArea()
- [ ] `import { Tower }` at top of file
- [ ] `this.main.area = this;` before `loadArea()` in constructor
- [ ] Tower redeployment from saved `tilePositions` at end of `loadArea()` with tile-type compatibility checks
- [ ] Stack-based endless wave spawning: `stackSize` scales with wave, enemies share spawn slots
- [ ] Minimum HP floor: `minHpPerEnemy = powerBudget / totalEnemyCount`, applied via `Math.max(template.hp, template.hp * hpScaleFactor, minHpPerEnemy)`
- [ ] MOD: Record handling - uncapped records past wave 100
- [ ] MOD: Stars only awarded for waves 1-100
- [ ] `enableEndlessMode()` method - sets endlessMode=true, waveNumber=101
- [ ] Wave cycling in endWave: `const displayWaveNum = ((this.waveNumber - 1) % 100) + 1;`
- [ ] Auto-stop boss check with endless mode exception
- [ ] Wave selection for endless mode in changeWave()
- [ ] spawnEnemies uses `falseWaveNumber = ((this.waveNumber - 1) % 100) + 1;`
- [ ] `BOSS_KEYS` constant at top of file for route-specific bosses
- [ ] `spawnEndlessWave()` - power budget system for waves 101+ with HP scaling, stack-based spawning, elite/champion promotion
- [ ] `spawnEndlessBossWave()` - multi-boss waves every 100 waves with escort enemies at 300+
- [ ] `spawnWave100Boss()` - single boss spawn for wave 100 using BOSS_KEYS
- [ ] `getEndlessEnemyPool()` - categorized enemy pools for endless wave generation
- [ ] `getWavePreview()` - preview enemies for endless waves (cycles wave templates)

## Game.modded.js
- [ ] `this.mapDragging = false;` in constructor
- [ ] Sub-stepping loop for accurate high-speed simulation (numSteps calculation)
- [ ] Vanilla speed toggle preserved: 0.8x, 1.2x, 1.7x, 2x, 2.5x with correct fill levels (25/50/75/100%)
- [ ] Full vanilla pause behavior: overlay, canvas pointer blocking, deploy guard, interval clearing
- [ ] `showPauseOverlay()` and `hidePauseOverlay()` methods
- [ ] `if (this.stopped) return playSound('pop0', 'ui');` guard in `tryDeployUnit()`
- [ ] **PERF**: Cache area/enemies/towers refs outside sub-step loop
- [ ] **PERF**: Pre-compute snowCloak enemy list once per frame, pass to towers via `_snowCloakEnemies`
- [ ] **PERF**: `_skipDraw` set on enemies and towers for non-last sub-steps
- [ ] **PERF**: `_isFirstStep` flag passed to towers (recalculatePower only on first step)
- [ ] **PERF**: Batch enemy removal — `_markedForRemoval` cleaned in one pass instead of indexOf per dying enemy
- [ ] **PERF**: enemiesInRange built with for-loop (not .filter()) to avoid array allocation per tower
- [ ] **PERF**: Throttled `updateDamageDealt()` to every 5 frames

## Pokemon.modded.js
- [ ] `this.sprite = JSON.parse(JSON.stringify(specie.sprite));` - Deep copy sprite
- [ ] `tilePosition` included in `getOriginalData()` (both branches) for save persistence
- [ ] `fromOriginalData()` restores `tilePosition` from save data
- [ ] `this.form = (this.specie.form) ? this.specie.key : false;`
- [ ] `transformADN()` matches vanilla behavior (uses `this.adn`, no dynamic slot 1 lookup)
- [ ] `setShiny()` guard matches vanilla: `if (this.id == 70 && this.adn?.id != 70) return;`
- [ ] `calculateAsymptoticSpeed()` method - asymptotic speed scaling for levels 100+
- [ ] NO level cap check in `levelUp()` method
- [ ] Endless mode cost scaling in `setCost()` - costs continue past level 100
- [ ] Endless mode cost scaling in `checkCost()` - check costs for multiple levels
- [ ] Asymptotic speed in `updateStats()`, `setStatsLevel()`, `transformADN()`
- [ ] `calculateEndlessCrit()` method - asymptotic crit scaling (approaches 100%, every 100 levels closes 50% of gap)
- [ ] `calculateEndlessRange()` method - logarithmic range scaling (freezes linear at lv100, applies log multiplier: 1x at 100, 3x at 1000)
- [ ] Endless crit in `updateStats()`, `setStatsLevel()`, `transformADN()`, and constructor
- [ ] Endless range in `updateStats()`, `setStatsLevel()`, `transformADN()`, and constructor

## Shop.modded.js
- [ ] `const isShinyEgg = Math.random() < (1/30);` - 1/30 shiny egg chance
- [ ] `newPokemon.isShiny = true; newPokemon.setShiny();` for shiny eggs
- [ ] Pass `isShinyEgg` to `displayPokemon.open()`
- [ ] `dedupeEggList()` in constructor - removes eggs for Pokemon already owned (prevents duplicate starters after save migration)

## FinalScene.modded.js
- [ ] Constructor with taller height (280 instead of 230)
- [ ] `buttonContainer` with flex layout
- [ ] `continueButton` - green button for endless mode
- [ ] `restartButton` - red button for wave 1 restart
- [ ] `continueEndless()` method - enables endless mode, wave 101
- [ ] Auto-reset mode 3 handling in `open()` - auto-continue to endless
- [ ] `close()` sets `endlessMode = false`

## DefeatScene.modded.js
- [ ] `saveWaveRetry = [25, 50, 75];` and `savedWave = 0;` in constructor
- [ ] Dynamic checkpoints in `getRetryWave()` - adds 100, 150, 200... every 50 waves
- [ ] Auto-continue option (mode 3) in `open()`
- [ ] Endless mode lives calculation in `retry()` - decreases lives based on wave
- [ ] Endless mode checkpoint text in `getRetryText()`

## UI.modded.js
- [ ] `this.waveInfoDisplay = false;` in constructor
- [ ] `waveInfoPanel` element for bottom-left corner
- [ ] Tooltips for save/load team buttons
- [ ] Drag-and-drop Ditto transform matches vanilla: updates when slot 1 changes (only if not deployed)
- [ ] UI scaling values match Area.modded.js: HP exponent 1.0056, boss /187.5, armor 0.04

## BoxScene.modded.js
- [ ] 200 box slots: `for (let i = 0; i < 200; i++)`
- [ ] (Note: vanilla 1.4.4 may use `allPokemon.length` instead)

## ShopScene.modded.js
- [ ] Custom shiny sprites support in `displayPokemon.open()`
- [ ] Shiny reveal animation when `isShiny` parameter is true
- [ ] Pokemon sprite scaled to 96px (2.4x of vanilla 40px) with `image-rendering:pixelated`

## Tooltip.modded.js
- [ ] Item tooltips with stat displays

## Enemy.modded.js
- [ ] Endless scaling - enemy HP/power scales for waves 100+
- [ ] **PERF**: Center point mutation (not new object) in update loop
- [ ] **PERF**: `_markedForRemoval` flag for batch removal (not indexOf+splice per enemy)
- [ ] **PERF**: Single-pass status effect compaction (replaces two .filter() calls)

## Tower.modded.js
- [ ] Delta time fix for accurate projectile timing
- [ ] Projectile retargeting in `updateProjectiles()`: search from tower position with tower's range
- [ ] `findClosestEnemy()` method on Tower: searches from given position within maxDist
- [ ] **PERF**: `recalculatePower()` only runs on `_isFirstStep` (not every sub-step)
- [ ] **PERF**: Single-pass aura detection in recalculatePower (replaces 4 separate .filter() calls)
- [ ] **PERF**: Squared distance for aura range, snowCloak, static stun checks
- [ ] **PERF**: Pre-computed snowCloak from `_snowCloakEnemies` (not iterating all enemies per tower)
- [ ] **PERF**: Cached `_tempCanvas`/`_tempCtx` for ADN tower tint draws (not createElement every frame)
- [ ] **PERF**: `findClosestEnemy` uses squared distance, skips off-screen enemies

## Projectile.modded.js
- [ ] Endless scaling for projectile damage
- [ ] Retarget in `update()`: search from tower position with tower's range
- [ ] Ricochet `findClosestEnemy()`: 200px from enemy position, NOT limited to tower range
- [ ] **PERF**: Center point mutation (not new object) in update loop
- [ ] **PERF**: `findClosestEnemy` uses squared distance

## ProfileScene.modded.js
- [ ] Uncapped wave record display (shows 100+ instead of capping at 100)

## main.modded.js
- [ ] DevTools enabled (`nw.Window.get().showDevTools()`)
- [ ] `autoReset` options include mode 3 (continue)

## text.modded.js
- [ ] Continue option text strings

## MenuScene.modded.js
- [ ] Auto-reset range includes mode 3

## MapScene.modded.js
- [ ] Record display uncapped (shows 100+ records)

## NewGameScene.modded.js
- [ ] Shiny starter chance

## pokemonData.js
- [x] ~~Expanded egg list~~ — REMOVED in v1.4.4b (all 17 Pokemon are obtainable through vanilla secrets/challenges)

## ChallengeScene.js (via apply_mods.py patch, part of Vanilla Bug Fixes)
- [ ] `poke.updateStats()` instead of `poke.setStatsLevel(capLevel)` — fixes vanilla bug where level cap BOOSTS low-level Pokemon to cap instead of only capping high-level ones

## itemData.js (via apply_mods.py patch)
- [ ] `magmaStone` block uncommented (was commented out in vanilla)
- [ ] `'magmaStone'` added to `itemListData` shop array
- [ ] Price: 50000g, doubles burn duration to 20 seconds
- [ ] Restriction: Pokemon IDs [0, 9, 52, 73, 96] only
- [ ] Gameplay logic already exists in vanilla: Projectile.js (lines 396, 461) and Tower.js (line 939)

## PokemonScene.modded.js (challenge cap display + endless preview + form switching)
- [ ] Display level shows `Math.min(pokemon.lvl, lvlCap)` instead of always showing cap level
- [ ] Level-up buttons remain enabled during challenges (players can still level up; levels bank for after challenge ends)
- [ ] `calculatePreviewCrit()` - asymptotic crit preview matching Pokemon.calculateEndlessCrit()
- [ ] `calculatePreviewRange()` - log range preview matching Pokemon.calculateEndlessRange() (freezes linear at lv100)
- [ ] `calculatePreviewSpeed()` - asymptotic speed preview matching Pokemon.calculateAsymptoticSpeed()
- [ ] Form switch button: `lvl >= 100` (NOT `lvl == 100`) for lycanroc shiny form switching

## UI.modded.js (challenge cap display)
- [ ] Pokemon level display in team bar shows `Math.min(lvl, lvlCap)` during challenges instead of always showing cap level

## Pause Micromanagement (surgical patches via apply_pause_micromanagement)
All pause micro is now injected surgically — NOT baked into Game.modded.js.
- [ ] animate(): `if (this.stopped) return;` replaced with comment (render loop continues)
- [ ] `totalScaledDelta = this.stopped ? 0 : ...` (sim freezes but rendering continues)
- [ ] `_simSteps = this.stopped ? 0 : numSteps` injected before sub-stepping loop
- [ ] Stopped redraw block (background + enemies + towers drawn in place when paused)
- [ ] `tryDeployUnit()` deploy guard removed (allows deploying while paused)
- [ ] `switchPause()` replaced with simple toggle (no overlay, no pointer blocking, no interval clearing)
- [ ] Tile highlighting works during pause (PlacementTile.update() runs via animate loop)

## 10x Speed (surgical patches via apply_speed_mod)
All speed changes are injected surgically — NOT baked into Game.modded.js.
- [ ] `toggleSpeed()` replaced: 1x→1.5x→2x→3x→5x→10x with innerText labels
- [ ] `restoreSpeed()` updated: speedFactor=1, innerText='1x'
- [ ] Initial `speedFactor` changed from 0.8 to 1

## Feature: Vanilla Bug Fixes (installer checkbox: `vanilla_fixes`)
Consolidates all vanilla bug fixes and QoL improvements that don't add new gameplay mechanics.
Baked into core modded files — always present when any mod is installed.
Note: Ditto transform behavior is vanilla — our mod preserves it as-is (no modifications needed).

## Feature: Save Tower Positions (part of Vanilla Bug Fixes)
- [ ] `tilePosition` in `getOriginalData()` both branches (Pokemon.modded.js)
- [ ] `tilePosition` restored in `fromOriginalData()` (Pokemon.modded.js)
- [ ] Tower redeployment with tile compatibility checks at end of `loadArea()` (Area.modded.js)
- [ ] `recalculateAuras()` and `checkWeather()` called after redeploy

## Feature: Projectile Range Fix (part of Vanilla Bug Fixes)
- [ ] Retargeting searches from tower position within tower's range (Tower.modded.js, Projectile.modded.js)
- [ ] Projectiles targeting off-screen enemies are deleted (Projectile.modded.js)
- [ ] Retarget search skips off-screen enemies (Tower.modded.js findClosestEnemy)
- [ ] Ricochet chaining is 200px from enemy position — NOT tower-range-limited

## Feature: Delta Time & Performance (always-on, baked into Game/Tower/Enemy/Projectile)
- [ ] Sub-stepping simulation loop in Game.modded.js (numSteps based on speed multiplier)
- [ ] `isEnemyInRange` uses squared distance for circle/default range types (avoids sqrt)
- [ ] recalculatePower only on first sub-step per frame
- [ ] Pre-computed snowCloak list once per frame
- [ ] Batch enemy removal via `_markedForRemoval` flag
- [ ] Cached temp canvas for ADN tower tint draws
- [ ] Throttled damage UI updates (every 5 frames)
- [ ] Object reuse for enemy/projectile center points (reduces GC pressure)
- [ ] Single-pass aura detection, status effect compaction
- [ ] _skipDraw on non-last sub-steps for enemies and towers

## Feature: Endless Wave Density (always-on)
- [ ] Stack-based spawning: multiple enemies per spawn slot, `stackSize` scales with wave
- [ ] Minimum HP floor per enemy: `powerBudget / totalEnemyCount` — prevents difficulty dips on cycle reset

## Feature: Endless Scaling (always-on)
- [ ] Regular enemy HP: `Math.pow(1.0056, wavesPast100)` exponent, baseBudget=160000, polynomial tail at wavesPast100>1100
- [ ] Boss HP: `Math.pow(2, wavesPast100 / 187.5)` — stretched so old wave 900 ≈ new wave 1100
- [ ] Speed scaling: `1 + Math.log2(1 + wavesPast100 / 2000)`
- [ ] Regen scaling: `0.05 * wavesPast100 / (wavesPast100 + 2500)` — asymptotically approaches 5% max HP/sec
- [ ] Armor scaling: `(1 + 0.04 * wavesPast100)` with 4% HP minimum armor if base is 0
- [ ] Deterministic escort selection via `getEscortTypes(wave, count)` — preview matches spawns
- [ ] Escort enemies at boss waves 300+ with modular count distribution in UI

---

## How to Use This Checklist

When updating to a new vanilla version:

1. Extract the new vanilla files
2. **DO NOT 3-way merge.** Start from existing .modded.js files and patch ONLY new vanilla changes into them.
3. Diff old-vanilla vs new-vanilla to identify what changed
4. Apply those vanilla changes into the modded files, preserving all mod code
5. **CRITICALLY**: Check each item in this list against the updated modded file
6. If any feature is missing, restore it from the old modded version
7. Run `apply_mods.py` and verify 0 failures
8. Test the game to verify all features work

## Common Merge Issues

- **Record caps**: Vanilla caps records at 100, mod allows uncapped
- **Level caps**: Vanilla has `if (this.lvl >= 100) return;`, mod removes this
- **Speed options**: Game.modded.js has VANILLA speeds (0.8/1.2/1.7/2/2.5). Speed mod surgically patches to 1/1.5/2/3/5/10. Do NOT bake speed changes into Game.modded.js.
- **Endless mode**: ALL endless mode code is mod-only, easily lost in merges. Wave Record Uncap is part of Endless Mode.
- **Pause micromanagement**: Game.modded.js has VANILLA pause behavior (overlay, pointer blocking, deploy guard). Pause micro surgically patches all of that out. Do NOT bake pause micro changes into Game.modded.js.
- **Stat scaling**: Crit and range use endless scaling methods (calculateEndlessCrit/Range). Linear formulas must NOT be used past level 100. Preview functions in PokemonScene must match actual stat functions in Pokemon.
- **Save isolation**: Modded game uses separate userData folder. Save migration uses LevelDB API (save_helper.js export/import), NOT raw file copy.
- **Emoji rendering**: All emoji in game UI must use `<span class="msrre">` wrapper for proper rendering in PressStart2P pixel font. CSS class has `font-family: 'Segoe UI Emoji'` fallback.
- **File encoding**: apply_mods.py MUST be valid UTF-8. Game strings contain Japanese/Korean/accented characters — never roundtrip through Windows-1252. If editing string literals with international chars, verify with `py_compile.compile(path, doraise=True)`.
- **Internal scripts location**: Internal scripts live in `mods/lib/`. User-facing files stay in `mods/` root. See `UPDATE_GUIDE.md` for full file structure.
