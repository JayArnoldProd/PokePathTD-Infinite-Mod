import { routeData } from '../data/routeData.js';
import { PlacementTile } from '../component/PlacementTile.js';
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
		this.waves = [];
		this.waypoints = [];
		this.placementTiles = [];
		this.placementTile2D = [];
		this.towers = [];

		this.totalDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.heartScale = false;
		this.inChallenge = false;
		this.music;

		// ENDLESS MODE: Flag to track if we're past wave 100
		this.endlessMode = false;

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
		
		if (!keepTowers) {
			this.main.UI.tilesCountNum = [0, 0, 0, 0];
			const teamCopy = [...this.main.team.pokemon];

			for (const pokemon of teamCopy) {
				if (pokemon.isDeployed) {
					pokemon.isDeployed = false;
					pokemon.tilePosition = -1;
					// retirar torre
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

		// ENDLESS MODE: Set flag based on loaded wave
		if (this.waveNumber > 100) {
			this.endlessMode = true;
		}

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
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.heartScale = false;
		this.main.UI.refreshDamageDealt(true);
		this.music = this.map.music;
		playMusic(this.music.song);
	}

	newWave() {
		if (this.main.area.waveActive) return;
		this.goldWave = 0;
		playSound('select', 'ui');
		
		this.totalDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
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
		});

		if (this.inChallenge) {
			this.main.game.chrono.start();
		}
	}

	endWave() {
		this.imposedWeather = false;
		if (this.main.player.health[this.routeNumber] <= 0) return;

		if (this.waveStartTime !== null) {
	        this.waveElapsedTime = Math.floor(
	            (performance.now() - this.waveStartTime) / 1000
	        ); 
	        this.waveStartTime = null;
	    }

		this.main.player.stats.wavesCompleted++;
		let bonusGold = Math.floor((5 * (this.routeNumber + 1) * this.waveNumber + Math.pow(this.waveNumber, 1.4))/2);
		if (this.main.player.stars > 150) bonusGold = Math.floor(bonusGold * (this.main.player.stars / 150));

		// ENDLESS MODE: Remove 100 cap on records
		if (this.main.player.records[this.routeNumber] < this.waveNumber) {
			this.main.player.records[this.routeNumber] = this.waveNumber; // No cap!
			
			if (this.main.player.stars > 50) {
				this.main.player.changeGold(bonusGold);
				this.goldWave += bonusGold;
			}
			this.main.player.obtainStar();
		}

		this.towers.forEach(t => { 
			t.moxieBuff = 0;
			t.speedBoost = 0;
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

		// ENDLESS MODE: Wave 100 shows popup only first time (not in endless mode)
		if (this.waveNumber === 100 && !this.endlessMode) {
			// First time beating wave 100 - show continue/restart popup
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
				this.handleWaveCompleted();
			}
		} else {
			// Normal wave completion (including endless mode)
			this.handleWaveCompleted();
		}
	}

	// ENDLESS MODE: Extracted wave completion logic
	handleWaveCompleted() {
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
		
		// ENDLESS MODE: Display preview for next wave
		const previewEnemy = this.getWavePreview(this.waveNumber);
		if (previewEnemy) {
			this.main.UI.displayEnemyInfo(previewEnemy, 0);
		}

		// Auto-wave logic
		const futureWaveNum = this.waveNumber <= 100 ? this.waveNumber : ((this.waveNumber - 1) % 99) + 1;
		const futureWave = this.waves[futureWaveNum]?.preview || [];
		const invisibles = [e.ditto, e.kecleon, e.absol, e.lunala, e.froslass];

		if (this.autoWave && this.main.autoStop && futureWave.some(poke => invisibles.includes(poke))) {
			this.switchAutoWave();
		}

		// ENDLESS MODE: Auto-stop at boss waves (every 100)
		if (this.autoWave && this.main.autoStopBoss && this.waveNumber % 100 === 0) {
			this.switchAutoWave();
		}

		if (this.autoWave) return this.newWave();

		if (this.main.mapScene.isOpen) this.main.mapScene.update();
		if (this.main.shopScene.isOpen) this.main.shopScene.update();
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

		// Original logic for waves 1-100
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

	// ENDLESS MODE: POWER BUDGET SYSTEM - Generate waves 101+
	spawnEndlessWave() {
		const wave = this.waveNumber;
		
		// Boss wave every 100 (200, 300, 400...)
		if (wave % 100 === 0) {
			return this.spawnEndlessBossWave();
		}
		
		// === GET WAVE PREVIEW ENEMIES ===
		// Use the template wave's preview enemies (what's shown in UI)
		const templateWaveNum = ((wave - 1) % 99) + 1;
		const waveData = this.waves[templateWaveNum] || this.waves[1];
		const wavePreview = waveData?.preview || [];
		
		if (wavePreview.length === 0) {
			console.warn('No preview enemies for wave', wave);
			return;
		}
		
		// === POWER BUDGET CALCULATION ===
		// Base budget doubled to compensate for removing duplicate Enemy.js HP scaling
		const wavesPast100 = wave - 100;
		const baseBudget = 160000;
		let hpMult;
		if (wave < 200) {
			hpMult = 1 + wavesPast100 * 0.115;
		} else {
			hpMult = wave / 16;
		}
		const powerBudget = Math.floor(baseBudget * hpMult);
		
		// === ENEMY COUNT ===
		const totalEnemyCount = Math.floor(20 + wavesPast100 * 1.2);
		
		// === INVERSE HP DISTRIBUTION ===
		// More weak enemies, fewer strong ones
		const hpValues = wavePreview.map(p => p.hp || 100);
		const inverseHp = hpValues.map(hp => 1 / hp);
		const totalInverse = inverseHp.reduce((a, b) => a + b, 0);
		const enemyCounts = inverseHp.map(inv => Math.max(1, Math.floor(totalEnemyCount * (inv / totalInverse))));
		
		// === SEEDED RANDOM FOR CONSISTENT WAVES ===
		const seed = wave * 12345;
		const rng = (n) => {
			const x = Math.sin(seed + n) * 10000;
			return x - Math.floor(x);
		};
		let rngCounter = 0;
		
		// === BUILD ENEMY LIST ===
		const enemies = [];
		wavePreview.forEach((template, typeIdx) => {
			const count = enemyCounts[typeIdx];
			for (let i = 0; i < count; i++) {
				enemies.push({ template, typeIdx });
			}
		});
		
		// Shuffle enemies for variety
		for (let i = enemies.length - 1; i > 0; i--) {
			const j = Math.floor(rng(rngCounter++) * (i + 1));
			[enemies[i], enemies[j]] = [enemies[j], enemies[i]];
		}
		
		// === HP SCALING ===
		// Scale HP based on power budget, weighted by base HP
		const totalBaseHp = enemies.reduce((sum, e) => sum + (e.template.hp || 100), 0);
		const hpScaleFactor = powerBudget / totalBaseHp;
		
		// === SPACING ===
		const baseOffset = 30;
		const waveOffset = Math.max(8, baseOffset - Math.floor(wavesPast100 / 15));
		const clusterSize = Math.min(25, 6 + Math.floor(wavesPast100 / 20));
		const clusterGap = Math.max(10, waveOffset);
		
		const waypointEnemy = this.waypoints[Math.floor(rng(rngCounter++) * this.waypoints.length)];
		
		enemies.forEach((entry, i) => {
			if (!entry || !entry.template) return;
			
			const { template } = entry;
			
			// Scale HP proportionally
			const scaledHp = Math.floor(Math.max(template.hp, template.hp * hpScaleFactor));
			
			// Create scaled enemy object
			const scaledEnemy = {
				...template,
				hp: scaledHp,
				gold: Math.floor(template.gold * (1 + wavesPast100 * 0.11))
			};
			
			// Calculate offset with clustering
			const clusterIndex = Math.floor(i / clusterSize);
			const posInCluster = i % clusterSize;
			const xOffset = (clusterIndex * clusterSize * waveOffset) + (clusterIndex * clusterGap) + (posInCluster * waveOffset);
			
			this.enemies.push(
				new Enemy(
					waypointEnemy[0].x - xOffset - 50,
					waypointEnemy[0].y,
					scaledEnemy,
					waypointEnemy,
					this.main,
					this.main.game.ctx,
				)
			);
		});
	}
	
	// ENDLESS MODE: Get enemy pool categorized by power tier
	getEndlessEnemyPool(wave) {
		// Import reference to enemyData
		const e = this.main.enemyData || window.enemyData;
		if (!e) {
			console.warn('enemyData not found, using template fallback');
			const templateWaveNum = ((wave - 1) % 99) + 1;
			const template = this.waves[templateWaveNum];
			return { swarm: template?.wave || [], elite: template?.wave || [] };
		}
		
		// Categorize enemies by base power (HP + armor*2)
		// Swarm = weak fast enemies, Elite = tanky slow enemies
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
		
		// At higher waves, add even stronger enemies to elite pool
		if (wave > 200) {
			const superElite = [e.volbeat, e.illumise, e.flygon, e.haxorus, e.miltank, e.furfrou].filter(Boolean);
			elite.push(...superElite);
		}
		
		return { swarm, elite };
	}

	// ENDLESS MODE: Spawn multiple bosses with escort enemies
	spawnEndlessBossWave() {
		const wave = this.waveNumber;
		const bossCount = Math.floor(wave / 100); // 2 at 200, 3 at 300, etc.
		
		// Get route's boss
		const bossKey = BOSS_KEYS[this.routeNumber] || 'shaymin';
		const boss = e[bossKey];
		
		if (!boss) {
			console.warn('Boss not found:', bossKey);
			return;
		}
		
		const waypointEnemy = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
		
		// Spawn bosses with tighter spacing at higher waves
		const bossSpacing = Math.max(80, 150 - Math.floor(wave / 10));
		
		for (let i = 0; i < bossCount; i++) {
			const xOffset = (i + 1) * bossSpacing;
			
			this.enemies.push(
				new Enemy(
					waypointEnemy[0].x - xOffset,
					waypointEnemy[0].y,
					boss,
					waypointEnemy,
					this.main,
					this.main.game.ctx,
				)
			);
		}
		
		// Add escort enemies at wave 300+ (strong non-boss enemies)
		if (wave >= 300) {
			const escortCount = Math.floor((wave - 200) / 50) * 5; // 5 escorts per 50 waves past 200
			const pool = this.getEndlessEnemyPool(wave);
			const escorts = pool.elite;
			
			for (let i = 0; i < escortCount && escorts.length > 0; i++) {
				const escort = escorts[Math.floor(Math.random() * escorts.length)];
				const xOffset = (bossCount + 1) * bossSpacing + (i + 1) * 25;
				
				this.enemies.push(
					new Enemy(
						waypointEnemy[0].x - xOffset,
						waypointEnemy[0].y,
						escort,
						waypointEnemy,
						this.main,
						this.main.game.ctx,
					)
				);
			}
		}
	}

	// ENDLESS MODE: Get wave preview for endless waves
	getWavePreview(waveNum) {
		if (waveNum <= 100) {
			return this.waves[waveNum]?.preview?.[0];
		}
		
		// Boss wave preview
		if (waveNum % 100 === 0) {
			const bossKey = BOSS_KEYS[this.routeNumber] || 'shaymin';
			return e[bossKey];
		}
		
		// Normal endless wave - use template preview
		const templateWaveNum = ((waveNum - 1) % 99) + 1;
		return this.waves[templateWaveNum]?.preview?.[0];
	}

	recalculateAuras() {
	    // Reinicia poder base
	    this.towers.forEach(t => {
	        t.power = t.basePower;
	        t.projectile.power = t.basePower;
	        t.auraBuffActive = false;
	    });

	    // Reaplica auras activas
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
		
		// ENDLESS MODE: Different wave selector behavior
		if (this.endlessMode) {
			// In endless mode, can go anywhere from 1 to current max
			if (nextWave <= 0) nextWave = 1;
			// No upper cap in endless mode
		} else {
			// Normal mode: wrap around 1-100
			if (nextWave <= 0) nextWave = 100;
			else if (nextWave >= 101) nextWave = 1;
		}

		this.waveStartTime = null;
		this.goldWave = 0;

		this.towers.forEach(t => { 
			t.moxieBuff = 0;
			t.speedBoost = 0;
		});

		this.waveNumber = nextWave;
		this.routeWaves[this.routeNumber] = nextWave;
		this.main.UI.update();
		this.main.UI.revertUI();
		this.waveActive = false;
		this.enemies = [];

		// ENDLESS MODE: Use getWavePreview for endless waves
		const previewEnemy = this.getWavePreview(this.waveNumber);
		if (previewEnemy) {
			this.main.UI.displayEnemyInfo(previewEnemy, 0);
		}

		this.totalDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.heartScale = false;

		this.main.UI.update();
	}
}
