import { routeData } from '../data/routeData.js';
import { PlacementTile } from '../component/PlacementTile.js';
import { Tower } from '../component/Tower.js';
import { Element } from '../../utils/Element.js';
import { Enemy } from '../component/Enemy.js';
import { text } from '../../file/text.js'
import { saveData } from '../../file/data.js';
import { playMusic, playSound } from '../../file/audio.js';
import { enemyData as e } from '../data/enemyData.js';

// ENDLESS MODE: Boss list for multi-boss spawns
const BOSS_KEYS = ['shaymin', 'celebi', 'lunala', 'moltres', 'regirock', 'groudon',
	'registeel', 'regice', 'regigigas', 'zapdos', 'hooh', 'articuno'];

export class Area {
	constructor(main, areaData) {
		this.main = main;
		this.map;
		this.weather = false;
		this.imposedWeather = false;

		this.autoWave = false;
		this.repeat = false;
		this.routeNumber = areaData.routeNumber;
		this.routeWaves = areaData.routeWaves;

		this.waveNumber;
		this.waveActive;

		this.enemies = [];
		this._spawnQueue = [];  // MOD: Deferred enemy spawning for performance
		this._spawnElapsed = 0; // MOD: Time elapsed since wave start (for deferred spawning)
		this.waves = [];
		this.waypoints = [];
		this.placementTiles = [];
		this.placementTile2D = [];
		this.towers = [];

		this.totalDamageDealt = 0;
		this.totalTrueDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.leftoversWaveUsed = false;
		this.heartScale = false;
		this.inChallenge = false;
		this.music;

		// MOD: Endless mode flag
		this.endlessMode = false;

		// MOD: Expose this Area on main before loadArea() so Tower constructors
		// can access this.main.area (needed for tower redeployment from save)
		this.main.area = this;

		this.loadArea(areaData.routeNumber);
		this.goldWave = 0;

		this.waveStartTime = null;
    	this.waveElapsedTime = 0;
	}

	getSaveData() {
		return {
			routeNumber: this.routeNumber,
			routeWaves: this.routeWaves,
			endlessMode: this.endlessMode, // Save endless state
		};
	}

	checkWeather() {
		if (this.imposedWeather) return;
		this.weather = false;
		this.towers.forEach(t => {
			if (t.ability.id == 'drizzle') this.weather = 'rain';
		});

		this.main.UI.displayWeather();
	}

	loadArea(routeNumber, wave, keepTowers = false, challenge = false) {
		this.repeat = false;
		this.main.UI.waveSelectorBlock.style.background = 'revert-layer';
		this.imposedWeather = false;
		this.autoWave = false;
		this.main.UI.autoWave.style.background = 'revert-layer';

		if (challenge) {
			this.inChallenge = challenge;
		} else this.inChallenge = false;

		// MOD: Save tile positions before clearing so we can redeploy after tiles are rebuilt
		const savedTilePositions = new Map();
		if (!keepTowers) {
			this.main.UI.tilesCountNum = [0, 0, 0, 0];
			const teamCopy = [...this.main.team.pokemon];

			for (const pokemon of teamCopy) {
				// MOD: Remember saved tilePosition before clearing
				if (pokemon.tilePosition >= 0) {
					savedTilePositions.set(pokemon, pokemon.tilePosition);
				}
				if (pokemon.isDeployed) {
					pokemon.isDeployed = false;
					pokemon.tilePosition = -1;
					const index = this.main.area.towers.findIndex(tower => tower.pokemon === pokemon);
					if (index !== -1) {
						this.main.area.towers[index].tile.tower = false;
						this.main.area.towers.splice(index, 1);
					}
				}
			}
		}

		if (wave != undefined) this.routeWaves[routeNumber] = wave;

		this.routeNumber = routeNumber;
		this.map = routeData[routeNumber];
		this.waveNumber = this.routeWaves[routeNumber];
		this.waveActive = false;

		// MOD: Set endless mode flag if wave > 100 OR player has reached past 100 on this route
		this.endlessMode = this.waveNumber > 100 || (this.main.player.records[routeNumber] || 0) > 100;

		if (!keepTowers) {
			this.placementTiles = [];
			this.placementTile2D = [];

			this.waves = this.map.waves;
			this.waypoints = this.map.waypoints;

			for (let i = 0; i < this.map.placementTile.length; i += 30) {
			    this.placementTile2D.push(this.map.placementTile.slice(i, i + 30))
			}

			let counter = 0;
			this.placementTile2D.forEach((row, y) => {
			    row.forEach((symbol, x) => {
			        if (symbol !== 0) {
			            this.placementTiles.push(
			            	new PlacementTile(this.main, x * 24, y * 24, this.main.game.ctx, symbol, counter)
			            )
			            counter++;
			        }
			    })
			})
		}

		this.enemies = [];
		this.main.game.canvasBackground.src = this.map.background;

		if (this.map.effect != null) {
			this.main.game.canvasEffect.src = this.map.effect;
			this.main.game.effectEnabled = true;
		} else {
			this.main.game.effectEnabled = false;
		}

		this.totalDamageDealt = 0;
		this.totalTrueDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.leftoversWaveUsed = false;
		this.heartScale = false;
		this.main.UI.refreshDamageDealt(true);
		this.music = this.map.music;
		playMusic(this.music.song);

		// MOD: Redeploy towers from saved tile positions after area load
		if (!keepTowers && savedTilePositions.size > 0 && this.placementTiles.length > 0) {
			for (const [pokemon, tilePos] of savedTilePositions) {
				if (tilePos < 0 || tilePos >= this.placementTiles.length) continue;
				const tile = this.placementTiles[tilePos];
				if (!tile || tile.tower) continue;  // tile occupied or invalid
				// Check if pokemon can be placed on this tile type
				if (!pokemon.tiles.includes(tile.land) &&
					!(pokemon?.item?.id == 'airBalloon' && tile.land == 4) &&
					!(pokemon?.item?.id == 'heavyDutyBoots' && tile.land == 2) &&
					!(pokemon?.item?.id == 'assaultVest' && tile.land == 2) &&
					!(pokemon?.item?.id == 'dampMulch' && tile.land == 1)
				) continue;
				// Deploy the tower
				tile.tower = pokemon;
				this.towers.push(
					new Tower(this.main, tile.position.x, tile.position.y, this.main.game.ctx, pokemon, tile)
				);
				pokemon.tilePosition = tilePos;
				pokemon.isDeployed = true;
				this.main.UI.tilesCountNum[tile.land - 1]++;
			}
			this.recalculateAuras();
			this.checkWeather();
			// Defer UI update â€" during constructor, UI.update() may reference
			// properties not yet initialized. Main.js calls UI.update() after all
			// constructors complete (Main.js line 86).
		}
	}

	newWave() {
		if (this.main.area.waveActive) return;
		this.goldWave = 0;
		this._spawnQueue = [];  // MOD: Clear deferred spawn queue
		this._spawnElapsed = 0;
		playSound('select', 'ui');

		this.totalDamageDealt = 0;
		this.totalTrueDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.leftoversWaveUsed = false;
		this.heartScale = false;
		this.main.UI.refreshDamageDealt();

		this.waveStartTime = performance.now();
    	this.waveElapsedTime = 0;

		this.waveActive = true;
		this.spawnEnemies();
		this.main.UI.update();

		this.towers.forEach(t => {
			t.moxieBuff = 0;
			t.speedBoost = 0;
			t.lightningRodCharge = 0;
			t.healUsed = false;
		});

		if (this.inChallenge) {
			this.main.game.chrono.start();
		}
	}

	endWave() {
		this.imposedWeather = false;
		if (this.main.player.health[this.routeNumber] <= 0) return;

		if (this.waveStartTime !== null) {
		    this.waveElapsedTime = (performance.now() - this.waveStartTime) / 1000;
		    this.waveStartTime = null;
		}

		this.main.player.stats.wavesCompleted++;
		let bonusGold = Math.floor((5 * (this.routeNumber + 1) * this.waveNumber + Math.pow(this.waveNumber, 1.4))/2);
		if (this.main.player.stars > 150) bonusGold = Math.floor(bonusGold * (this.main.player.stars / 150));

		// MOD: Record handling for endless mode - don't cap at 100
		if (this.main.player.records[this.routeNumber] < this.waveNumber) {
			this.main.player.records[this.routeNumber] = this.waveNumber; // MOD: Removed cap at 100

			if (this.main.player.stars > 50) {
				this.main.player.changeGold(bonusGold);
				this.goldWave += bonusGold;
			}
			// MOD: Only award stars for waves 1-100
			if (this.waveNumber <= 100) {
				this.main.player.obtainStar();
			}
		}

		this.towers.forEach(t => {
			t.moxieBuff = 0;
			t.speedBoost = 0;
			t.lightningRodCharge = 0;
			t.healUsed = false;
			if (t.ability.id == 'triage' && Math.random() < 0.05) {
				this.main.player.getHealed(1);
		        this.main.player.achievementProgress.heartRestore += 1;
		    	if (this.main.player.achievementProgress.heartRestore > 10) this.main.player.unlockAchievement(19);
			}
		});

		this.main.player.changeGold(bonusGold);
		this.goldWave += bonusGold;
		if (this.goldWave > this.main.player.stats.maxGoldPerWave[0]) {
			this.main.player.stats.maxGoldPerWave[0] = this.goldWave;
			this.main.player.stats.maxGoldPerWave[1] = this.getRouteTag(this.routeNumber, this.waveNumber);
		}

		let goldPerSecond = this.waveElapsedTime > 0 ? Math.round((this.goldWave / this.waveElapsedTime) * 100) / 100 : 0;
		if (goldPerSecond > this.main.player.stats.maxGoldPerTime[0]) {
			this.main.player.stats.maxGoldPerTime[0] = goldPerSecond;
			this.main.player.stats.maxGoldPerTime[1] = this.getRouteTag(this.routeNumber, this.waveNumber);
		}

		this.goldWave = 0;

		this.waveActive = false;
		if (this.main.player.health[this.routeNumber] === 1) this.main.player.unlockAchievement(12);

		// MOD: Handle endless mode - waves continue past 100
		if (this.waveNumber < 100 || this.endlessMode) {
			if (!this.repeat) this.waveNumber++;
			if (!this.repeat) this.routeWaves[this.routeNumber]++;
			this.main.UI.update();
			this.main.UI.revertUI();

			saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);

			const msg = new Element(this.main.scene, {
				className: 'wave-completed',
				text: text.map.waveCompleted[this.main.lang].toUpperCase()
			}).element;

			msg.style.opacity = 0;
			setTimeout(() => {
				msg.style.opacity = 1;
			}, 0);

			setTimeout(() => {
				msg.style.opacity = 0;
				setTimeout(() => msg.remove(), 500);
			}, 1500);

			playSound('end', 'ui');

			// MOD: Display enemy info with cycled wave number for endless
			const previewEnemy = this.getWavePreview(this.waveNumber);
			if (previewEnemy) this.main.UI.displayEnemyInfo(previewEnemy, 0);

			const displayWaveNum = this.waveNumber <= 100 ? this.waveNumber : ((this.waveNumber - 1) % 100) + 1;
			const futureWave = this.waves[displayWaveNum]?.preview || [];
			const invisibles = [e.ditto, e.kecleon, e.absol, e.lunala, e.froslass];

			if (this.autoWave && this.main.autoStop && futureWave.some(poke => invisibles.includes(poke))) {
				this.switchAutoWave();
			}

			// MOD: Don't auto-stop at wave 100 if in endless mode
			if (this.autoWave && this.main.autoStopBoss && this.waveNumber == 100 && !this.endlessMode) {
				this.switchAutoWave();
			}

			if (this.autoWave) return this.newWave();

			if (this.main.mapScene.isOpen) this.main.mapScene.update();
			if (this.main.shopScene.isOpen) this.main.shopScene.update();
		} else {
			// Wave 100 reached - show final scene with continue option
			if (this.main.team.pokemon.some(p => p.specie.name[0] == 'shuckle')) this.main.player.unlockAchievement(6);
			if (this.main.player.health[this.routeNumber] >= 10) this.main.player.unlockAchievement(7);
			if (this.routeNumber == 0) this.main.player.unlockAchievement(22);
			if (this.routeNumber == 1) this.main.player.unlockAchievement(23);
			if (this.routeNumber == 2) this.main.player.unlockAchievement(24);
			if (this.routeNumber == 3) this.main.player.unlockAchievement(25);
			if (this.routeNumber == 4) this.main.player.unlockAchievement(26);
			if (this.routeNumber == 5) this.main.player.unlockAchievement(27);
			if (this.routeNumber == 6) this.main.player.unlockAchievement(28);
			if (this.routeNumber == 7) this.main.player.unlockAchievement(29);
			if (this.routeNumber == 8) this.main.player.unlockAchievement(30);

			if (!this.repeat) this.main.finalScene.open();
			else {
				this.main.UI.update();
				this.main.UI.revertUI();
				saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
					const msg = new Element(this.main.scene, {
					className: 'wave-completed',
					text: text.map.waveCompleted[this.main.lang].toUpperCase()
				}).element;

				msg.style.opacity = 0;
				setTimeout(() => {
					msg.style.opacity = 1;
				}, 0);

				setTimeout(() => {
					msg.style.opacity = 0;
					setTimeout(() => msg.remove(), 500);
				}, 1500);

				playSound('end', 'ui');
				this.main.UI.displayEnemyInfo(this.waves[this.waveNumber].preview[0], 0);
				if (this.autoWave) return this.newWave();
			}
		}
	}

	// MOD: Enable endless mode - called from FinalScene continue button
	enableEndlessMode() {
		this.endlessMode = true;
		this.waveNumber = 101;
		this.routeWaves[this.routeNumber] = 101;
		this.main.UI.update();
	}

	switchAutoWave() {
		this.autoWave = !this.autoWave;
		if (this.autoWave) {
			this.main.UI.autoWave.style.background = 'linear-gradient(39deg,rgba(112, 172, 76, 1) 0%, rgba(102, 145, 77, 1) 100%)';
			if (!this.waveActive) this.newWave();
		} else {
			this.main.UI.autoWave.style.background = 'revert-layer';
		}
	}

	spawnEnemies() {
		// ENDLESS MODE: Use endless wave generator for waves > 100
		if (this.endlessMode && this.waveNumber > 100) {
			return this.spawnEndlessWave();
		}

		// ENDLESS MODE: Wave 100 spawns 1 boss using the boss system (not original multi-boss wave)
		if (this.waveNumber === 100) {
			return this.spawnWave100Boss();
		}

		// Original logic for waves 1-99
		let falseWaveNumber = ((this.waveNumber - 1) % 100) + 1;

		const wave = this.waves[falseWaveNumber].wave;
		const waveOffset = this.waves[falseWaveNumber].offSet || 50;

		wave.forEach((enemy, i) => {
			const xOffset = (i + 1) * waveOffset;
			const waypointEnemy = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
			if (enemy) {
				this.enemies.push(
					new Enemy(
						waypointEnemy[0].x - xOffset,
						waypointEnemy[0].y,
						enemy,
						waypointEnemy,
						this.main,
						this.main.game.ctx,
					)
				)
			}
		})
	}

	// MOD: Effective wavesPast100 - linear up to wave 1000, then 4x compressed
	// Keeps waves 100-1000 identical, but stretches 1000+ so current wave 2000 = new wave 5000
	// MOD: Flat /2 compression past wave 1000 — smooth difficulty ramp
	// Wave 100-1000: linear (unchanged, ewp 0-900)
	// Wave 1000+: /2 compression (wave 2000 ewp=1400, wave 5000 ewp=2900, wave 10000 ewp=5400)
	getEffectiveWP(wavesPast100) {
		if (wavesPast100 <= 900) return wavesPast100;
		return 900 + (wavesPast100 - 900) / 2;
	}

	// ENDLESS MODE: POWER BUDGET SYSTEM - Generate waves 101+
	// Targets: Wave 700 = ~75k HP avg, Wave 1600 = ~1M HP avg
	spawnEndlessWave() {
		const wave = this.waveNumber;

		// Boss wave every 100 (200, 300, 400...)
		if (wave % 100 === 0) {
			return this.spawnEndlessBossWave();
		}

		// === GET WAVE PREVIEW ENEMIES ===
		const templateWaveNum = ((wave - 1) % 100) + 1;
		const waveData = this.waves[templateWaveNum] || this.waves[1];
		const wavePreview = waveData?.preview || [];

		if (wavePreview.length === 0) {
			console.warn('No preview enemies for wave', wave);
			return;
		}

		// === HP SCALING (exponential early, polynomial tail) ===
		// Balanced so level N Pokemon can roughly reach wave N
		const wavesPast100 = wave - 100;
		// MOD: Effective wp — identical up to wave 1000, then 4x compressed
		// Current wave 2000 difficulty = new wave 5000 difficulty
		const ewp = this.getEffectiveWP(wavesPast100);
		const baseBudget = 160000;
		let hpMult;
		if (ewp <= 1300) {
			hpMult = Math.pow(1.00558, ewp);
		} else {
			const base = Math.pow(1.00558, 1300); // anchor at wave 1400
			const extra = ewp - 1300;
			hpMult = base * Math.pow(extra / 100 + 1, 0.6);
		}
		const powerBudget = Math.floor(baseBudget * hpMult * 0.775); // ~22.5% HP reduction (shifted W5200→W5000)
		
		// MOD: Speed scaling — gentle logarithmic curve (uses effective wp)
		const speedMult = 1 + 0.3 * Math.log2(1 + ewp / 2500); // slowed: 30% speed scaling
		// MOD: Regeneration scaling — flat percentage of max HP, no DPS-based cap
		// Asymptotically approaches 3.33% of max HP/sec (reduced from 5%)
		const regenScale = 0.0333 * ewp / (ewp + 3000);

		// === ENEMY COUNT (asymptotic, hard cap 600 — deferred spawning handles perf) ===
		const linearCount = Math.floor(20 + wavesPast100 * 1.2);
		const asymptoticCount = Math.floor(200 + 600 * wavesPast100 / (wavesPast100 + 3000));
		const totalEnemyCount = Math.min(linearCount, asymptoticCount, 600);

		// === SEEDED RANDOM FOR CONSISTENT WAVES ===
		const seed = wave * 12345;
		const rng = (n) => {
			const x = Math.sin(seed + n) * 10000;
			return x - Math.floor(x);
		};
		let rngCounter = 0;

		// === BUILD ENEMY LIST WITH ELITE INJECTION ===
		const enemies = [];

		// Distribute enemies inversely by HP (matches UI display exactly)
		const hpValues = wavePreview.map(p => p.hp || 100);
		const inverseHp = hpValues.map(hp => 1 / hp);
		const totalInverse = inverseHp.reduce((a, b) => a + b, 0);
		const enemyCounts = inverseHp.map(inv => Math.max(1, Math.floor(totalEnemyCount * (inv / totalInverse))));

		// Calculate HP scale factor from power budget (matches UI exactly)
		let totalBaseHp = 0;
		wavePreview.forEach((p, idx) => {
			totalBaseHp += (p.hp || 100) * enemyCounts[idx];
		});
		const hpScaleFactor = powerBudget / totalBaseHp;

		// MOD: Minimum per-enemy HP floor â€" ensures difficulty never drops when the
		// wave cycle resets (e.g. wave 201 template 1 enemies must be at least as
		// tough as wave 200 template 100 enemies). Floor = budget / enemy count,
		// so a cycle-start swarm of Rattata each has comparable HP to a single
		// endgame enemy from the previous cycle's end.
		const minHpPerEnemy = Math.floor(powerBudget / totalEnemyCount);

		// Split each type's count into base/elite/champion for variety
		const tankiest = wavePreview.reduce((a, b) => ((a.hp || 0) + (a.armor || 0) > (b.hp || 0) + (b.armor || 0)) ? a : b);

		wavePreview.forEach((template, typeIdx) => {
			const count = enemyCounts[typeIdx];
			// For the tankiest type, promote some to elite/champion
			if (template === tankiest && count >= 4) {
				const championCount = Math.floor(count * 0.1);
				const eliteCount = Math.floor(count * 0.2);
				const baseCount = count - eliteCount - championCount;
				for (let i = 0; i < baseCount; i++) enemies.push({ template, isChampion: false });
				for (let i = 0; i < eliteCount; i++) enemies.push({ template, isElite: true });
				for (let i = 0; i < championCount; i++) enemies.push({ template, isChampion: true });
			} else {
				for (let i = 0; i < count; i++) enemies.push({ template, isChampion: false });
			}
		});

		// Shuffle enemies for variety
		for (let i = enemies.length - 1; i > 0; i--) {
			const j = Math.floor(rng(rngCounter++) * (i + 1));
			[enemies[i], enemies[j]] = [enemies[j], enemies[i]];
		}

		// MOD: Invisible enemy cap - asymptotically approaches 1000 but starts low
		// Prevents all-invisible waves from being unbeatable
		// Formula: cap = 1000 * wavesPast100 / (wavesPast100 + 6000)
		// Wave 200: 16 | Wave 500: 62 | Wave 1000: 130 | Wave 1175: 151
		// Wave 2000: 240 | Wave 5000: 449 | Wave 10000: 622
		const invisCap = Math.floor(1000 * wavesPast100 / (wavesPast100 + 6000));
		let invisCount = 0;

		// === SPACING ===
		// MOD: Stack multiple enemies at the same spawn point so they arrive as packs.
		// "stackSize" = how many enemies share one spawn slot (increases with wave).
		// "slotGap" = pixels between each spawn slot (stays readable).
		// MOD: Stream-style spawning — enemies spread out for visual density
		// Small stacks (max 3) with wider gaps create a steady stream, not a clump
		// Wave 101: 1 per slot, 25px gap (vanilla feel)
		// Wave 600: 2 per slot, 20px gap (pairs)
		// Wave 1000+: 3 per slot, 15px gap (dense stream)
		const stackSize = Math.min(3, 1 + Math.floor(wavesPast100 / 500));
		const slotGap = Math.max(15, 25 - Math.floor(wavesPast100 / 200));

		const waypointEnemy = this.waypoints[Math.floor(rng(rngCounter++) * this.waypoints.length)];

		// MOD: Deferred spawning — only create Enemy objects when they'd be near the screen.
		// At wave 5000 with 5900 enemies, creating all at once causes lag at wave start.
		// Instead, queue spawn descriptors sorted by xOffset and spawn them as the wave progresses.
		const spawnDescriptors = [];

		enemies.forEach((entry, i) => {
			if (!entry || !entry.template) return;

			const { template, isElite, isChampion } = entry;

			let scaledHp = Math.floor(Math.max(template.hp, template.hp * hpScaleFactor, minHpPerEnemy));
			// MOD: All endless enemies get minimum 5% HP as armor if base armor is 0
			let scaledArmor = Math.floor((template.armor || 0) * (1 + 0.03 * ewp));
			if (scaledArmor === 0) {
				scaledArmor = Math.floor(scaledHp * 0.05);
			}

			if (isElite) {
				scaledHp = Math.floor(scaledHp * 2);
				scaledArmor = Math.floor(scaledArmor * 1.5);
			}
			if (isChampion) {
				scaledHp = Math.floor(scaledHp * 3);
				scaledArmor = Math.floor(scaledArmor * 2);
			}

			// MOD: Speed and regeneration scale with wave — flat % of max HP, no cap
			const scaledSpeed = template.speed * speedMult;
			const scaledRegen = Math.floor(scaledHp * regenScale);

			// MOD: Cap invisible enemies per wave - excess become visible
			let isInvisible = template.invisible || false;
			if (isInvisible) {
				if (invisCount < invisCap) {
					invisCount++;
				} else {
					isInvisible = false;
				}
			}

			const scaledEnemy = {
				...template,
				hp: scaledHp,
				armor: scaledArmor,
				speed: scaledSpeed,
				invisible: isInvisible,
				regeneration: Math.max(template.regeneration || 0, scaledRegen),
				gold: Math.floor(template.gold * (1 + wavesPast100 * 0.11))
			};

			// Enemies within the same stack share the same spawn slot (same x position)
			const slotIndex = Math.floor(i / stackSize);
			const xOffset = slotIndex * slotGap;
			// Small y jitter within a stack so stacked enemies don't perfectly overlap
			const stackPos = i % stackSize;
			const yJitter = (stackPos - Math.floor(stackSize / 2)) * 2;

			spawnDescriptors.push({
				x: waypointEnemy[0].x - xOffset - 50,
				y: waypointEnemy[0].y + yJitter,
				enemy: scaledEnemy,
				waypoints: waypointEnemy,
				xOffset: xOffset,  // distance from screen edge — used for deferred timing
			});
		});

		// Sort by xOffset ascending so closest-to-screen enemies spawn first
		spawnDescriptors.sort((a, b) => a.xOffset - b.xOffset);

		// Spawn the first batch immediately (enemies already near/on screen)
		// and queue the rest for deferred spawning
		const SPAWN_BUFFER = 100; // spawn enemies when they'd be within 100px of screen edge
		for (const desc of spawnDescriptors) {
			if (desc.xOffset <= SPAWN_BUFFER) {
				this.enemies.push(
					new Enemy(desc.x, desc.y, desc.enemy, desc.waypoints, this.main, this.main.game.ctx)
				);
			} else {
				this._spawnQueue.push(desc);
			}
		}
		this._spawnElapsed = 0;
		// Store SLOWEST enemy speed for spawn timing — ensures no enemy spawns late
		// Enemy speed is in px per (1000/60)ms frame, so the slowest base speed governs timing
		const slowestBaseSpeed = wavePreview.reduce((min, p) => Math.min(min, p.speed || 1), Infinity);
		this._spawnBaseSpeed = slowestBaseSpeed * speedMult;
	}

	// MOD: Deferred spawn queue tick — called each frame from Game.animate()
	// Spawns queued enemies as time progresses, based on how far they'd have traveled
	tickSpawnQueue(deltaMs) {
		if (this._spawnQueue.length === 0) return;
		this._spawnElapsed += deltaMs;

		// Calculate how many pixels the wave front has traveled since wave start
		// Enemy speed is in px per (1000/60)ms frame units, so px/ms = speed * 60/1000
		// Average base speed for spawn timing — use a conservative estimate
		// so enemies spawn slightly before they'd actually reach screen edge
		const pxPerMs = (this._spawnBaseSpeed || 1) * 60 / 1000;
		const distanceTraveled = this._spawnElapsed * pxPerMs;
		const SPAWN_BUFFER = 100;

		// Spawn all enemies whose xOffset has been reached by the wave front
		while (this._spawnQueue.length > 0) {
			const next = this._spawnQueue[0];
			// Enemy needs to travel (xOffset - SPAWN_BUFFER) px to be near screen
			if (distanceTraveled >= next.xOffset - SPAWN_BUFFER) {
				this._spawnQueue.shift();
				this.enemies.push(
					new Enemy(next.x, next.y, next.enemy, next.waypoints, this.main, this.main.game.ctx)
				);
			} else {
				break; // Queue is sorted, so no later enemies are ready either
			}
		}
	}

	// ENDLESS MODE: Get enemy pool categorized by power tier
	getEndlessEnemyPool(wave) {
		const swarm = [
			e.rattata, e.caterpie, e.ledyba, e.poliwag, e.diglett, e.sandshrew,
			e.rookidee, e.doduo, e.bellsprout, e.chingling, e.minccino, e.sneasel,
			e.swinub, e.hoothoot, e.swablu, e.silicobra, e.larvitar, e.sandile,
			e.axew, e.snover, e.poochyena, e.bonsly, e.golett, e.venonat
		].filter(Boolean);

		const elite = [
			e.raticate, e.butterfree, e.ledian, e.corvisquire, e.corviknight,
			e.dodrio, e.weepinbell, e.victreebel, e.chimecho, e.sudowoodo,
			e.chansey, e.volbeat, e.illumise, e.phantum, e.trevenant,
			e.tyranitar, e.sandaconda, e.pupitar, e.krokorok, e.krookodile,
			e.hippowdon, e.golurk, e.darmanitan, e.maractus, e.lunatone, e.solrock,
			e.cacturne, e.poliwrath, e.gligar, e.claydol, e.sigilyph, e.gliscor,
			e.flygon, e.haxorus, e.mightyena, e.furfrou, e.miltank,
			e.cinccino, e.weavile, e.piloswine, e.mamoswine, e.noctowl, e.altaria,
			e.abomasnow, e.drampa, e.togedemaru, e.kangaskhan, e.minior,
			e.arcanineHisui, e.growlitheHisui, e.fraxure
		].filter(Boolean);

		if (wave > 200) {
			const superElite = [e.volbeat, e.illumise, e.flygon, e.haxorus, e.miltank, e.furfrou].filter(Boolean);
			elite.push(...superElite);
		}

		return { swarm, elite };
	}

	// MOD: Deterministic escort type selection for boss waves (same result for spawn + preview)
	getEscortTypes(wave, count) {
		const pool = this.getEndlessEnemyPool(wave);
		const escorts = pool.elite;
		if (escorts.length === 0) return [];

		// Seeded selection: pick evenly spaced from the sorted pool based on wave number
		const step = Math.max(1, Math.floor(escorts.length / count));
		const offset = wave % step;
		const selected = [];
		const seen = new Set();
		for (let i = 0; i < escorts.length && selected.length < count; i++) {
			const idx = (offset + i * step) % escorts.length;
			const esc = escorts[idx];
			if (!seen.has(esc.id)) {
				seen.add(esc.id);
				selected.push(esc);
			}
		}
		return selected;
	}

	// ENDLESS MODE: Spawn multiple bosses with escort enemies
	spawnEndlessBossWave() {
		const wave = this.waveNumber;
		const bossCount = Math.floor(wave / 100);

		const bossKey = BOSS_KEYS[this.routeNumber] || 'shaymin';
		const boss = e[bossKey];

		if (!boss) {
			console.warn('Boss not found:', bossKey);
			return;
		}

		const wavesPast100 = wave - 100;
		// MOD: Effective wp for scaling — compressed past wave 1000
		const ewp = this.getEffectiveWP(wavesPast100);
		const bonusSteps = Math.floor((wave - 1) / 5);
		let bossHpMult = 1 + 0.02 * bonusSteps;
		// MOD: Boss HP scaling — exponential up to ewp 1500, polynomial tail after
		// Prevents astronomical HP at very high waves while keeping 100-2200 unchanged
		if (ewp <= 1500) {
			bossHpMult *= Math.pow(2, ewp / 335);
		} else {
			const anchor = Math.pow(2, 1500 / 335); // ~22.3x at ewp=1500
			const extra = ewp - 1500;
			bossHpMult *= anchor * Math.pow(extra / 200 + 1, 0.85);
		}

		// MOD: Boss HP divided by bossCount^(2/3) — stronger reduction than sqrt
		// sqrt(52) = 7.2x reduction, cbrt(52^2) = 13.9x reduction
		// Prevents late-game boss waves from being impossible due to sheer numbers
		const bossCountFactor = 1 / Math.pow(Math.max(1, bossCount), 2/3);
		const bossHp = Math.floor(boss.hp * bossHpMult * 2 * bossCountFactor * 0.775); // shifted W5200→W5000

		// MOD: Boss speed and regen scaling
		const bossSpeedMult = 1 + 0.3 * Math.log2(1 + ewp / 2500); // slowed: 30% speed scaling
		// MOD: Boss regen at 1.67% asymptotic (reduced from 2.5%)
		const bossRegenScale = 0.0167 * ewp / (ewp + 3000);
		// MOD: Boss regen — flat percentage of max HP, no DPS-based cap
		const escortCount = Math.min(100, Math.floor((wave - 200) / 50) * 5);
		const bossRegen = Math.max(boss.regeneration || 0, Math.floor(bossHp * bossRegenScale));

		const scaledBoss = {
			...boss,
			hp: bossHp,
			armor: Math.floor((boss.armor || 0) * (1 + 0.03 * ewp)),
			speed: boss.speed * bossSpeedMult,
			regeneration: bossRegen,
			gold: Math.floor(boss.gold * (1 + wavesPast100 * 0.11))
		};

		const waypointEnemy = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
		const bossSpacing = Math.max(80, 150 - Math.floor(wave / 10));

		for (let i = 0; i < bossCount; i++) {
			const xOffset = (i + 1) * bossSpacing;
			this.enemies.push(
				new Enemy(
					waypointEnemy[0].x - xOffset,
					waypointEnemy[0].y,
					scaledBoss,
					waypointEnemy,
					this.main,
					this.main.game.ctx,
				)
			);
		}

		// MOD: Add scaled escort enemies at wave 300+
		// Escort count scales slower and caps at 100 to prevent overwhelming numbers
		if (wave >= 300) {
			const escortTypes = this.getEscortTypes(wave, 3);

			// Escorts get HP scaled down by escort count (gentler than bosses — escorts are the real threat)
			const escortCountFactor = 1 / Math.pow(Math.max(1, escortCount), 0.35);

			for (let i = 0; i < escortCount && escortTypes.length > 0; i++) {
				const escortTemplate = escortTypes[i % escortTypes.length];
				const escortHp = Math.floor(escortTemplate.hp * bossHpMult * 0.75 * escortCountFactor * 0.775); // Escorts = balanced support threats
				const escortRegen = Math.max(escortTemplate.regeneration || 0, Math.floor(escortHp * bossRegenScale));
				const scaledEscort = {
					...escortTemplate,
					hp: escortHp,
					armor: Math.floor((escortTemplate.armor || 0) * (1 + 0.03 * ewp)),
					speed: escortTemplate.speed * bossSpeedMult,
					regeneration: escortRegen,
					gold: Math.floor(escortTemplate.gold * (1 + wavesPast100 * 0.11))
				};

				const xOffset = (bossCount + 1) * bossSpacing + (i + 1) * 25;
				this.enemies.push(
					new Enemy(
						waypointEnemy[0].x - xOffset,
						waypointEnemy[0].y,
						scaledEscort,
						waypointEnemy,
						this.main,
						this.main.game.ctx,
					)
				);
			}
		}
	}

	// WAVE 100: Spawn single boss
	spawnWave100Boss() {
		const bossKey = BOSS_KEYS[this.routeNumber] || 'shaymin';
		let boss = e[bossKey];

		if (!boss) {
			console.warn('Boss not found:', bossKey, '- trying fallbacks');
			for (const fallbackKey of BOSS_KEYS) {
				if (e[fallbackKey]) {
					boss = e[fallbackKey];
					break;
				}
			}
		}

		if (!boss) {
			const vanillaWave = this.waves[100];
			if (vanillaWave && vanillaWave.wave) {
				const wave = vanillaWave.wave;
				const waveOffset = vanillaWave.offSet || 50;
				wave.forEach((enemy, i) => {
					if (!enemy) return;
					const xOffset = (i + 1) * waveOffset;
					const waypointEnemy = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
					this.enemies.push(
						new Enemy(
							waypointEnemy[0].x - xOffset,
							waypointEnemy[0].y,
							enemy,
							waypointEnemy,
							this.main,
							this.main.game.ctx,
						)
					);
				});
				return;
			}
			boss = e.rattata || Object.values(e)[0];
		}

		if (!boss) {
			this.waveActive = false;
			return;
		}

		const waypointEnemy = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
		this.enemies.push(
			new Enemy(
				waypointEnemy[0].x - 150,
				waypointEnemy[0].y,
				boss,
				waypointEnemy,
				this.main,
				this.main.game.ctx,
			)
		);
	}

	// ENDLESS MODE: Get wave preview for endless waves
	getWavePreview(waveNum) {
		if (waveNum <= 100) {
			return this.waves[waveNum]?.preview?.[0];
		}
		if (waveNum % 100 === 0) {
			const bossKey = BOSS_KEYS[this.routeNumber] || 'shaymin';
			return e[bossKey];
		}
		const templateWaveNum = ((waveNum - 1) % 100) + 1;
		return this.waves[templateWaveNum]?.preview?.[0];
	}

	recalculateAuras() {
	    this.towers.forEach(t => {
	        t.power = t.basePower;
	        t.projectile.power = t.basePower;
	        t.auraBuffActive = false;
	    });

	    this.towers.forEach(auraTower => {
	        if (!auraTower.ability || auraTower.ability.id !== 'powerAura') return;
	        const auraRange = auraTower.range;

	        this.towers.forEach(tower => {
	            if (tower === auraTower) return;
	            const dx = tower.center.x - auraTower.center.x;
	            const dy = tower.center.y - auraTower.center.y;
	            const distance = Math.hypot(dx, dy);

	            if (distance <= auraRange) {
	                tower.auraBuffActive = true;
	                tower.power = Math.ceil(tower.basePower * 1.2);
	                tower.projectile.power = tower.power;
	            }
	        });
	    });
	}

	getRouteTag(route, wave) {
	  	const r1 = Math.floor(route / 3) + 1;
	  	const r2 = (route % 3) + 1;
	  	return `R${r1}-${r2} W${wave}`;
	}

	changeWave(i) {
		if (this.waveActive) return playSound('pop0', 'ui');
		playSound('option', 'ui');

		let nextWave = this.waveNumber + i;
		// MOD: Allow wave selection up to player's record (supports endless mode past 100)
		const maxWave = Math.max(this.main.player.records[this.routeNumber] || 0, 100);
		if (nextWave <= 0) nextWave = maxWave;
		else if (nextWave > maxWave) nextWave = 1;

		// MOD: Enable endless mode if we've navigated past 100
		if (nextWave > 100) this.endlessMode = true;

		this.waveStartTime = null;
		this.goldWave = 0;

		this.towers.forEach(t => {
			t.moxieBuff = 0;
			t.speedBoost = 0;
			t.lightningRodCharge = 0;
			t.healUsed = false;
		});

		this.waveNumber = nextWave;
		this.routeWaves[this.routeNumber] = nextWave;
		this.main.UI.update();
		this.main.UI.revertUI();
		this.waveActive = false;
		this.enemies = [];

		// MOD: Display enemy info with cycled wave number
		const previewEnemy = this.getWavePreview(this.waveNumber);
		if (previewEnemy) this.main.UI.displayEnemyInfo(previewEnemy, 0);

		this.totalDamageDealt = 0;
		this.totalTrueDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.leftoversWaveUsed = false;
		this.heartScale = false;

		this.main.UI.update();
	}
}
