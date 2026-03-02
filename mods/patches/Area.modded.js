import { routeData } from '../data/routeData.js';
import { PlacementTile } from '../component/PlacementTile.js';
import { Element } from '../../utils/Element.js';
import { Enemy } from '../component/Enemy.js';
import { text } from '../../file/text.js'
import { saveData } from '../../file/data.js';
import { playMusic, playSound } from '../../file/audio.js';
import { enemyData as e } from '../data/enemyData.js';

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
		this.totalTrueDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.leftoversWaveUsed = false;
		this.heartScale = false;
		this.inChallenge = false;
		this.music;

		// MOD: Endless mode flag
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
	}

	newWave() {
		if (this.main.area.waveActive) return;
		this.goldWave = 0;
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
			const displayWaveNum = this.waveNumber <= 100 ? this.waveNumber : ((this.waveNumber - 1) % 99) + 1;
			this.main.UI.displayEnemyInfo(this.waves[displayWaveNum].preview[0], 0);

			const futureWave = this.waves[displayWaveNum].preview;
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
		const wave = this.waveNumber;
		// MOD: Cycle wave number for endless mode (waves 101+ use wave 1-100 patterns)
		// Use % 99 + 1 to match UI display (avoids wave 100 boss template on non-boss waves)
		let falseWaveNumber;
		if (wave <= 100) {
			falseWaveNumber = wave;
		} else if (wave % 100 === 0) {
			// Boss waves (200, 300, etc.) use wave 100 template
			falseWaveNumber = 100;
		} else {
			falseWaveNumber = ((wave - 1) % 99) + 1;
		}

		const waveData = this.waves[falseWaveNumber] || this.waves[1];
		const waveEnemies = waveData.wave;
		const waveOffset = waveData.offSet || 50;

		if (wave <= 100) {
			// Waves 1-100: vanilla spawning (Enemy.js handles scaling)
			waveEnemies.forEach((enemy, i) => {
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
					);
				}
			});
		} else {
			// ENDLESS MODE: Power budget system for waves > 100
			this.spawnEndlessWave(wave, waveData, waveOffset);
		}
	}

	spawnEndlessWave(wave, waveData, waveOffset) {
		const wavesPast100 = wave - 100;
		const preview = waveData.preview || waveData.wave;

		// Boss waves (200, 300, etc.)
		if (wave % 100 === 0) {
			const bossCount = Math.floor(wave / 100);
			const bossEnemy = preview[0];
			if (!bossEnemy) return;

			// Boss HP multiplier: exponential scaling
			const bonusSteps = Math.floor((wave - 1) / 5);
			let hpMult = 1 + 0.02 * bonusSteps;
			hpMult *= Math.pow(2, (wave - 100) / 50);

			for (let i = 0; i < bossCount; i++) {
				const waypointEnemy = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
				const xOffset = (i + 1) * waveOffset;

				// Create a scaled copy of the enemy data
				const scaledEnemy = Object.assign({}, bossEnemy, {
					hp: Math.floor(bossEnemy.hp * hpMult * 2),
					armor: Math.floor((bossEnemy.armor || 0) * (1 + 0.05 * wavesPast100)),
					gold: Math.floor((bossEnemy.gold + this.main.player.extraGold) * (1 + wavesPast100 * 0.11)),
				});

				this.enemies.push(
					new Enemy(
						waypointEnemy[0].x - xOffset,
						waypointEnemy[0].y,
						scaledEnemy,
						waypointEnemy,
						this.main,
						this.main.game.ctx,
					)
				);
			}
			return;
		}

		// Regular endless waves: power budget distribution
		const baseBudget = 160000;
		let hpMult;
		if (wave < 200) {
			hpMult = 1 + wavesPast100 * 0.115;
		} else {
			hpMult = wave / 16;
		}
		const powerBudget = Math.floor(baseBudget * hpMult);
		const totalEnemyCount = Math.floor(20 + wavesPast100 * 1.2);

		// Distribute enemies inversely by HP (more weak ones, fewer strong ones)
		const hpValues = preview.map(p => p.hp || 100);
		const inverseHp = hpValues.map(h => 1 / h);
		const totalInverse = inverseHp.reduce((a, b) => a + b, 0);
		const enemyCounts = inverseHp.map(inv => Math.max(1, Math.floor(totalEnemyCount * (inv / totalInverse))));

		// Calculate HP scale factor from power budget
		let totalBaseHp = 0;
		preview.forEach((p, idx) => {
			totalBaseHp += (p.hp || 100) * enemyCounts[idx];
		});
		const hpScaleFactor = powerBudget / totalBaseHp;

		// Armor scale
		const armorMult = 1 + 0.05 * wavesPast100;
		// Gold scale: 100x at wave 1000
		const goldMult = 1 + wavesPast100 * 0.11;

		// Spawn each enemy type
		let spawnIndex = 0;
		preview.forEach((baseEnemy, typeIdx) => {
			const count = enemyCounts[typeIdx];
			const scaledHp = Math.floor(Math.max(baseEnemy.hp, baseEnemy.hp * hpScaleFactor));

			for (let i = 0; i < count; i++) {
				const waypointEnemy = this.waypoints[Math.floor(Math.random() * this.waypoints.length)];
				const xOffset = (spawnIndex + 1) * waveOffset;

				const scaledEnemy = Object.assign({}, baseEnemy, {
					hp: scaledHp,
					armor: Math.floor((baseEnemy.armor || 0) * armorMult),
					gold: Math.floor((baseEnemy.gold + this.main.player.extraGold) * goldMult),
				});

				this.enemies.push(
					new Enemy(
						waypointEnemy[0].x - xOffset,
						waypointEnemy[0].y,
						scaledEnemy,
						waypointEnemy,
						this.main,
						this.main.game.ctx,
					)
				);
				spawnIndex++;
			}
		});
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
		const displayWaveNum = this.waveNumber <= 100 ? this.waveNumber : ((this.waveNumber - 1) % 99) + 1;
		this.main.UI.displayEnemyInfo(this.waves[displayWaveNum].preview[0], 0);

		this.totalDamageDealt = 0;
		this.totalTrueDamageDealt = 0;
		this.shellBellWaveUsed = false;
		this.clefairyDollUsed = false;
		this.leftoversWaveUsed = false;
		this.heartScale = false;

		this.main.UI.update();
	}
}
