# PokePath TD Mod Features Checklist

This document lists all mod features that MUST be present in the modded files. Use this checklist when updating to new vanilla versions to ensure no features are lost during merges.

## Area.modded.js
- [ ] `this.endlessMode = false;` in constructor
- [ ] `this.endlessMode = this.waveNumber > 100;` in loadArea()
- [ ] MOD: Record handling - uncapped records past wave 100
- [ ] MOD: Stars only awarded for waves 1-100
- [ ] `enableEndlessMode()` method - sets endlessMode=true, waveNumber=101
- [ ] Wave cycling in endWave: `const displayWaveNum = ((this.waveNumber - 1) % 100) + 1;`
- [ ] Auto-stop boss check with endless mode exception
- [ ] Wave selection for endless mode in changeWave()
- [ ] spawnEnemies uses `falseWaveNumber = ((this.waveNumber - 1) % 100) + 1;`

## Game.modded.js
- [ ] `this.mapDragging = false;` in constructor
- [ ] Sub-stepping loop for accurate high-speed simulation (numSteps calculation)
- [ ] Enhanced speed toggle: 1x, 1.5x, 2x, 3x, 5x, 10x options
- [ ] Speed options display with gradient backgrounds

## Pokemon.modded.js
- [ ] `this.sprite = JSON.parse(JSON.stringify(specie.sprite));` - Deep copy sprite
- [ ] `this.form = (this.specie.form) ? this.specie.key : false;`
- [ ] `calculateAsymptoticSpeed()` method - asymptotic speed scaling for levels 100+
- [ ] NO level cap check in `levelUp()` method
- [ ] Endless mode cost scaling in `setCost()` - costs continue past level 100
- [ ] Endless mode cost scaling in `checkCost()` - check costs for multiple levels
- [ ] Asymptotic speed in `updateStats()`, `setStatsLevel()`, `transformADN()`
- [ ] `vigilantFrisk` ability checks alongside `frisk`

## Shop.modded.js
- [ ] `const isShinyEgg = Math.random() < (1/30);` - 1/30 shiny egg chance
- [ ] `newPokemon.isShiny = true; newPokemon.setShiny();` for shiny eggs
- [ ] Pass `isShinyEgg` to `displayPokemon.open()`

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

## BoxScene.modded.js
- [ ] 200 box slots: `for (let i = 0; i < 200; i++)`
- [ ] (Note: vanilla 1.4.4 may use `allPokemon.length` instead)

## ShopScene.modded.js
- [ ] Custom shiny sprites support in `displayPokemon.open()`
- [ ] Shiny reveal animation when `isShiny` parameter is true

## Tooltip.modded.js
- [ ] Item tooltips with stat displays

## Enemy.modded.js
- [ ] Endless scaling - enemy HP/power scales for waves 100+

## Tower.modded.js
- [ ] Delta time fix for accurate projectile timing

## Projectile.modded.js
- [ ] Endless scaling for projectile damage

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

## pokemonData.js (via mod)
- [ ] Expanded egg list with 17 hidden Pokemon

## ChallengeScene.js (via apply_mods.py patch)
- [ ] `poke.updateStats()` instead of `poke.setStatsLevel(capLevel)` — fixes vanilla bug where level cap BOOSTS low-level Pokemon to cap instead of only capping high-level ones

## PokemonScene.modded.js (challenge cap display)
- [ ] Display level shows `Math.min(pokemon.lvl, lvlCap)` instead of always showing cap level
- [ ] Level-up buttons remain enabled during challenges (players can still level up; levels bank for after challenge ends)

## UI.modded.js (challenge cap display)
- [ ] Pokemon level display in team bar shows `Math.min(lvl, lvlCap)` during challenges instead of always showing cap level

---

## How to Use This Checklist

When updating to a new vanilla version:

1. Extract the new vanilla files
2. Run a 3-way merge with old-vanilla, old-modded, and new-vanilla
3. **CRITICALLY**: Check each item in this list against the merged file
4. If any feature is missing, restore it from the old-modded version
5. Test the mod installer
6. Test the game to verify all features work

## Common Merge Issues

- **Record caps**: Vanilla caps records at 100, mod allows uncapped
- **Level caps**: Vanilla has `if (this.lvl >= 100) return;`, mod removes this
- **Speed options**: Vanilla has fewer speed options, mod adds 5x and 10x
- **Endless mode**: ALL endless mode code is mod-only, easily lost in merges
