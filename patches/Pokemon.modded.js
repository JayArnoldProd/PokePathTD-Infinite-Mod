import { pokemonData, pokemonDataById } from '../data/pokemonData.js';
import { playSound } from '../../file/audio.js';

export class Pokemon {
	constructor(specie, lvl, targetMode, main, adn = undefined, favorite = false, item = null, alias = undefined, isShiny = false, hideShiny = false, isMega = false) {
		this.main = main;

		this.specie = specie;
		this.lvl = lvl;
		this.cost;

		this.id = this.specie.id;
		this.adn = adn;
		this.tilePosition = -1;
		this.favorite = favorite;
		this.isShiny = isShiny;
		this.isMega = isMega;

		this.sprite = specie.sprite;
		this.name = specie.name;
		this.alias = alias;
		this.ability = specie.ability;
		this.tiles = specie.tiles;
		this.projectile = specie.projectile;
		this.rangeType = specie.rangeType;
		this.attackType = specie.attackType;

		// ENDLESS MODE: Asymptotic speed scaling - approaches but never reaches 0
		this.speed = this.calculateAsymptoticSpeed(this.specie.speed.base, this.specie.speed.scale, lvl);
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * lvl));
		this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * lvl));

		if (item) {
			const indx = this.main.player.items.findIndex(i => i.id === item.id);
			if (indx !== -1) {
				this.item = this.main.player.items[indx];
				if (this.ability.id != 'magician') this.item.equipedBy = this.id;
			}
		}

		//HABILIDADES
		this.ricochet = this.specie.ricochet ?? 0;
		
		this.innerRange = this.specie.range.inner;
		this.critical = this.specie.critical.base + (this.specie.critical.scale * lvl);
		this.setCost();

		this.isDeployed = false;
		this.inGroup = false;
		
		this.damageDealt = 0;

		if (targetMode == undefined) {
			if (this.attackType == 'area') this.targetMode = 'area';
			else if (
				this.ability.id == 'quadraShot' || this.ability.id == 'tripleShot' || this.ability.id == 'doubleShot' || 
				this.ability.id == 'curseDoubleShot' || this.ability.id == 'cradily' || this.ability.id == 'poisonDoubleShot' || 
				this.ability.id == 'armorBreakDoubleShot'
			) this.targetMode = 'available';
			else if (this.attackType == 'aura') this.targetMode = 'aura';
			else if (this.ability.id == 'frisk') this.targetMode = 'invisible';
			else if (this.ability.id == 'burn') this.targetMode = 'notBurned';
			else if (this.ability.id == 'spinda') this.targetMode = 'random';
			else if (this.ability.id == 'curse') this.targetMode = 'curseable';
			else if (this.ability.id == 'willOWisp') this.targetMode = 'cursed';
			else this.targetMode = 'first';
		} else this.targetMode = targetMode;
		if (this.ability.id == 'poisonDoubleShot') this.targetMode = 'available';
		if (this.attackType == 'area') this.targetMode = 'area';

		if (
			this.item?.id == 'inverter' && 
			this.specie.key == 'malamar' &&
			this.lvl == 100
		) {
			this.innerRange = 150;
			this.range = 300;
			this.rangeType = 'donut';
		}

		this.baseSprite = JSON.parse(JSON.stringify(this.sprite));
		this.hideShiny = hideShiny;

		if (this.isShiny) {
			if (!this.hideShiny) this.setShiny();
			this.main.player.shinyAmount++;
		}
	}

	getOriginalData() {
	    if (this.specie?.key) {
	        return {
	            specieKey: this.specie.key,
	            lvl: this.lvl,
	            targetMode: this.targetMode,
	            adn: this.adn,
	            favorite: this.favorite,
	            item: this.item,
	            alias: this.alias,
	            isShiny: this.isShiny,
	            hideShiny: this.hideShiny,
	            isMega: this.isMega
	        };
	    } else {
	        return {
	            specie: this.specie,
	            lvl: this.lvl,
	            targetMode: this.targetMode,
	            adn: this.adn,
	            favorite: this.favorite,
	            item: this.item,
	            alias: this.alias,
	            isShiny: this.isShiny,
	            hideShiny: this.hideShiny,
	            isMega: this.isMega
	        };
	    }
	}

	static fromOriginalData(data, main) {
	    let specie = null;

	    if (data.specieKey) {
	        // guardado nuevo
	        specie = pokemonData[data.specieKey];
	        if (!specie) {
	            //console.warn('specieKey no encontrada:', data.specieKey);
	            // no rompemos: fallback a data.specie si viene (por si existiera)
	            if (data.specie) specie = data.specie;
	        }
	    } else if (data.specie) {
	        // guardado antiguo: intentamos mapear al pokemonData canonical
	        const mapped = findSpecieInCatalog(data.specie);
	        if (mapped) {
	            specie = mapped;
	        } else {
	            // no hemos encontrado match claro: mantenemos el objeto antiguo para no perder datos
	            //console.warn('No se pudo mapear specie antigua a pokemonData; dejando el objeto antiguo. Datos:', data.specie.name?.[0] ?? data.specie);
	            specie = data.specie;
	        }
	    }

	    return new Pokemon(
	        specie,
	        data.lvl,
	        data.targetMode,
	        main,
	        data.adn,
	        data.favorite,
	        data.item,
	        data.alias,
	        data.isShiny,
	        data.hideShiny,
	        data.isMega
	    );
	}

	changeTargetMode(mode) {
		this.targetMode = mode;
		if (this.isDeployed) {
            const tower = this.main.area.towers.find(t => t.pokemon === this);
            if (tower) tower.targetMode = mode;       
        }
	}

	levelUp() {
        this.lvl++;
        if (this.lvl >= this.specie.evolution?.level && this.id != 95) {
        	if (this.id != 76) this.updateSpecie(this.specie.evolution.pokemon);
        	else {
        		if (this.main.utility.isBetweenHours(8, 18)) this.updateSpecie('lycanrocDay');
        		else this.updateSpecie('lycanrocNight');
        	}
        	this.main.player.achievementProgress.evolutionCount++;
        	if (this.main.player.achievementProgress.evolutionCount == 210) this.main.player.unlockAchievement(1);
        }

        if (this.lvl >= this.specie.evolution?.level && this.id == 95 && this.item?.id == 'inverter') {
        	this.updateSpecie(this.specie.evolution.pokemon);
        	this.main.player.achievementProgress.evolutionCount++;
        	if (this.main.player.achievementProgress.evolutionCount == 210) this.main.player.unlockAchievement(1);
        }

        this.updateStats();
        this.setCost();

		if (this.lvl > this.main.player.stats.highestPokemonLevel) this.main.player.stats.highestPokemonLevel = this.lvl;
		this.main.player.stats.totalPokemonLevel++;

		if (this.id == 70 && this.adn != undefined) this.transformADN();

        if (this.isDeployed) {
            const tower = this.main.area.towers.find(t => t.pokemon === this);
            if (tower) {
            	tower.updateStatsFromPokemon();
            	if (this.id == 61) {
		            if (tower.tile.land == 2) tower.updateTowerSprite(tower.pokemon.sprite.imageGrass, tower.pokemon.sprite.framesGrass, tower.pokemon.specie.projectileGrass);
		            else if (tower.tile.land == 3) tower.updateTowerSprite(tower.pokemon.sprite.imageWater, tower.pokemon.sprite.framesWater, tower.pokemon.specie.projectileWater);
		            else if (tower.tile.land == 4) tower.updateTowerSprite(tower.pokemon.sprite.imageMountain, tower.pokemon.sprite.framesMountain, tower.pokemon.specie.projectileMountain);      
		        } 
                if (typeof this.main.area.recalculateAuras === 'function') {
                    this.main.area.recalculateAuras();
                }
            }
        }  

        if (this.lvl == 100) this.main.player.unlockAchievement(2);
    }

	setCost() {
		// Calculate base cost at effective level (capped at 100 for base formula)
		const effectiveLvl = Math.min(this.lvl, 100);
		let baseCost;
		if (this.specie.costScale === 'low') {
			baseCost = Math.min(100000, Math.ceil(27 * Math.pow(1.12, effectiveLvl)) - 11);
		} else if (this.specie.costScale === 'mid') {
			baseCost = Math.min(100000, Math.ceil(35 * Math.pow(1.12, effectiveLvl)) + ((effectiveLvl-1) * 5));
		} else if (this.specie.costScale === 'high') {
			baseCost = Math.min(100000, Math.ceil(51 * Math.pow(1.12, effectiveLvl)) + (effectiveLvl * 3) - 1);		
		} else if (this.specie.costScale === 'veryHigh') {
			baseCost = Math.min(150000, Math.ceil(51 * Math.pow(1.12, effectiveLvl)) + (effectiveLvl * 3) - 1);		
		}
		// At level 100+: cost to next level = prevCost * 1.01 + 9000
		if (this.lvl >= 100) {
			for (let i = 100; i <= this.lvl; i++) {
				baseCost = Math.ceil(baseCost * 1.01) + 9000;
			}
		}
		// Cap at 1 billion
		this.cost = Math.min(baseCost, 1000000000);
	}

	checkCost(num) {
		let totalCost = 0;
		let runningCost = this.cost; // Start from current cost for 100+ calculations
		
		for (let i = 0; i < num; i++) {
			const lvl = this.lvl + i;
			if (lvl < 100) {
				// Use original formula for levels under 100
				if (this.specie.costScale === 'low') {
					totalCost += Math.min(100000, Math.ceil(27 * Math.pow(1.12, lvl)) - 11);
				} else if (this.specie.costScale === 'mid') {
					totalCost += Math.min(100000, Math.ceil(35 * Math.pow(1.12, lvl)) + ((lvl-1) * 5));
				} else if (this.specie.costScale === 'high') {
					totalCost += Math.min(100000, Math.ceil(51 * Math.pow(1.12, lvl)) + (lvl * 3) - 1);		
				} else if (this.specie.costScale === 'veryHigh') {
					totalCost += Math.min(150000, Math.ceil(51 * Math.pow(1.12, lvl)) + (lvl * 3) - 1);		
				}
			} else {
				// Level 100+: cost = prevCost * 1.01 + 9000, capped at 1 billion
				totalCost += Math.min(runningCost, 1000000000);
				runningCost = Math.min(Math.ceil(runningCost * 1.01) + 9000, 1000000000);
			}
		}
		
		return totalCost;
	}

	// ENDLESS MODE: Calculate attack speed with asymptotic decay
	// - Levels 1-100: Original linear formula
	// - Levels 100+: Two decay curves based on Pokemon type
	calculateAsymptoticSpeed(base, scale, level) {
		// For levels <= 100, use original linear formula
		if (level <= 100) {
			return Math.max(1, Math.floor(base + (scale * level)));
		}
		
		// Calculate what speed was at level 100
		const speedAt100 = Math.max(1, base + (scale * 100));
		
		// Check if this Pokemon has significant negative scaling (would go to 0/negative)
		const linearSpeedAtLevel = base + (scale * level);
		const hasFastScaling = linearSpeedAtLevel <= 1 || scale < -1;
		
		const ratio = 100 / level;
		let decayedSpeed;
		
		if (hasFastScaling) {
			// FAST SCALERS: Linear decay (100/level)
			// Level 200: 50%, Level 400: 25%, Level 1000: 10%
			// Already fast, they get even faster quickly
			decayedSpeed = speedAt100 * ratio;
		} else {
			// SLOW SCALERS (like Aegislash): Hyperbolic decay
			// Level 1000: 20% (5x faster), Level 2000: 10% (10x faster)
			// Naturally slow, they improve more gradually than fast scalers
			const wavesPast100 = level - 100;
			decayedSpeed = speedAt100 * 225 / (225 + wavesPast100);
		}
		
		// Minimum of 0.001ms to allow insane fire rates at extreme levels
		return Math.max(0.001, decayedSpeed);
	}

	// ENDLESS MODE: Calculate range with logarithmic scaling past level 100
	// 1x at 100, 3x at 1000
	// Formula: multiplier = 1 + log2(level / 100) * (2 / log2(10))
	calculateEndlessRange(base, scale, level) {
		const baseRange = Math.floor(base + (scale * level));
		if (level <= 100) {
			return baseRange;
		}
		// Logarithmic scaling: 1x at 100, 3x at 1000
		const scaleFactor = 2 / Math.log2(10); // ~0.602
		const rangeMultiplier = 1 + Math.log2(level / 100) * scaleFactor;
		return Math.floor(baseRange * rangeMultiplier);
	}

	// ENDLESS MODE: Calculate crit with asymptotic approach to 100%
	// Every 100 levels past 100, get 50% closer to 100%
	// Never actually reaches 100%
	calculateAsymptoticCrit(base, scale, level) {
		const critAt100 = base + (scale * 100);
		if (level <= 100) {
			return base + (scale * level);
		}
		// Each 100 levels past 100, close 50% of the gap to 100
		// remainingGap = (100 - critAt100) * 0.5^(periods)
		const periods = (level - 100) / 100;
		const remainingGap = (100 - critAt100) * Math.pow(0.5, periods);
		return 100 - remainingGap;
	}

	updateStats() {
		let level = this.lvl;
		if (typeof this.main?.area?.inChallenge.lvlCap === 'number') level = this.main.area.inChallenge.lvlCap;

		this.speed = this.calculateAsymptoticSpeed(this.specie.speed.base, this.specie.speed.scale, level);
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));
		this.range = this.calculateEndlessRange(this.specie.range.base, this.specie.range.scale, level);
		this.critical = this.calculateAsymptoticCrit(this.specie.critical.base, this.specie.critical.scale, level);
	}

	setStatsLevel(level = 50) { // BORRAR y cambiar por lo de arriba 
		this.speed = this.calculateAsymptoticSpeed(this.specie.speed.base, this.specie.speed.scale, level);
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));
		this.range = this.calculateEndlessRange(this.specie.range.base, this.specie.range.scale, level);
		this.critical = this.calculateAsymptoticCrit(this.specie.critical.base, this.specie.critical.scale, level);
	}

	updateSpecie(specieName) {
		const newSpecie = pokemonData[specieName];
		this.specie = newSpecie;

		this.ricochet = newSpecie.ricochet ?? 0;
		this.sprite = newSpecie.sprite;
		this.name = newSpecie.name;
		this.ability = newSpecie.ability;
		this.tiles = newSpecie.tiles;
		this.projectile = newSpecie.projectile;
		this.rangeType = newSpecie.rangeType;
		this.attackType = newSpecie.attackType;

		this.updateStats(); 
		this.setCost();
		if (this.isShiny) this.setShiny();
		if (this.main.boxScene.isOpen) this.main.boxScene.update()
	}

	transformADN() {
		if (this.adn?.base) this.adn = pokemonData[this.adn.base]
		this.sprite = this.adn.sprite;

		this.ability = this.adn.ability;
		this.tiles = this.adn.tiles;
		this.projectile = this.adn.projectile;
		this.rangeType = this.adn.rangeType;
		this.attackType = this.adn.attackType;

		let level = this.lvl;
		if (typeof this.main?.area?.inChallenge.lvlCap === 'number') level = this.main.area.inChallenge.lvlCap;

		this.speed = this.calculateAsymptoticSpeed(this.adn.speed.base, this.adn.speed.scale, level);
		this.power = Math.floor(this.adn.power.base + (this.adn.power.scale * level));
		this.range = this.calculateEndlessRange(this.adn.range.base, this.adn.range.scale, level);

		//HABILIDADES
		this.ricochet = this.adn.ricochet ?? 0;
		
		this.innerRange = this.adn.range.inner;
		this.critical = this.calculateAsymptoticCrit(this.adn.critical.base, this.adn.critical.scale, level);

		this.damageDealt = 0;

		if (this.attackType == 'area') this.targetMode = 'area';
		else if (
			this.ability.id == 'quadraShot' || this.ability.id == 'tripleShot' || this.ability.id == 'doubleShot' || 
			this.ability.id == 'curseDoubleShot' || this.ability.id == 'cradily'
		) this.targetMode = 'available';
		else if (this.attackType == 'aura') this.targetMode = 'aura';
		else if (this.ability.id == 'frisk') this.targetMode = 'invisible';
		else if (this.ability.id == 'burn') this.targetMode = 'notBurned';
		else if (this.ability.id == 'spinda') this.targetMode = 'random';
		else if (this.ability.id == 'curse') this.targetMode = 'curseable';
		else this.targetMode = 'first';

		if (this.adn.id == 70 && this.isShiny) this.setShiny();
	}

	equipItem(item) {
		this.retireItem();

		if (item?.equipedBy != undefined && this.ability.id != 'magician') {
			const pokes = [...this.main.team.pokemon, ...this.main.box.pokemon];
			const pokeWhitItem = pokes.find(poke => poke.id === item.equipedBy);
			if (pokeWhitItem.isDeployed && (item?.id == 'airBalloon' || item?.id == 'heavyDutyBoots' || item?.id == 'dampMulch' || item?.id == 'assaultVest')) {
				playSound('pop0', 'ui')
				return;
			}
			pokeWhitItem.retireItem();
		}
		playSound('equip', 'ui');
		this.item = item;
		if (this.ability.id != 'magician') this.item.equipedBy = this.id;

		if (item.id == 'inverter' && this.lvl > 30 && this.id == 95 && this.specie.evolution) {
			this.updateSpecie(this.specie.evolution.pokemon);
        	this.main.player.achievementProgress.evolutionCount++;
        	if (this.main.player.achievementProgress.evolutionCount == 210) this.main.player.unlockAchievement(1);
		}

		if (
			this.isDeployed && 
			this.item.id == 'silphScope' && 
			this.ability.id !== 'frisk'
		) {
			const index = this.main.area.towers.findIndex((tower) => tower.pokemon == this);
			this.main.area.towers[index].revealInvisible = true;
		}

		if (
			this.item.id == 'inverter' && 
			this.specie.key == 'malamar' &&
			this.lvl == 100
		) {
			this.innerRange = 150;
			this.range = 300;
			this.rangeType = 'donut';
		}

		if (item?.megaStone) this.addMegaStone();
	}

	retireItem() {
		if (this.item != null) {
			if (this.ability.id != 'magician') this.item.equipedBy = undefined;

			if (
				this.isDeployed && 
				this.item.id == 'silphScope' && 
				this.ability.id !== 'frisk'
			) {
				const index = this.main.area.towers.findIndex((tower) => tower.pokemon == this);
				this.main.area.towers[index].revealInvisible = false;
			}

			if (
				this.item.id == 'inverter' && 
				this.specie.key == 'malamar' &&
				this.lvl == 100
			) {
				this.innerRange = 0;
				this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * this.lvl));
				this.rangeType = 'circle';
			}

			if (this.isMega) this.removeMegaStone();

			this.item = null;
			this.main.UI.update();
		}
	}
 
	addMegaStone() {
		if (this.main.player.megaInTeam) this.findMega();
		this.baseSpecie = this.specie;
		this.isMega = true;
		this.main.player.megaInTeam = true;
		this.updateSpecie(this.specie.mega);

		if (this.isDeployed) {
            const tower = this.main.area.towers.find(t => t.pokemon === this);
            if (tower) {
            	tower.updateStatsFromPokemon();
                if (typeof this.main.area.recalculateAuras === 'function') {
                    this.main.area.recalculateAuras();
                }
            }
        } 
	}

	removeMegaStone() {
		this.isMega = false;
		this.main.player.megaInTeam = false;
		this.updateSpecie(this.specie.base);

		if (this.isDeployed) {
            const tower = this.main.area.towers.find(t => t.pokemon === this);
            if (tower) {
            	tower.updateStatsFromPokemon();
                if (typeof this.main.area.recalculateAuras === 'function') {
                    this.main.area.recalculateAuras();
                }
            }
        } 
	}

	findMega() {
		let pokemon = [...this.main.team.pokemon, ...this.main.box.pokemon];
		pokemon.forEach(poke => {
			if (poke.isMega) poke.retireItem();
		})
	}

	toggleShiny() {
		this.hideShiny =! this.hideShiny;
		this.setShiny();
	}

	setShiny() {
		if (this.id == 70 && this.adn.id != 70) return;
	    const replacePath = (p) => {
	        if (typeof p !== 'string') return p;

	        if (this.hideShiny) {
	            // shiny → normal
	            return p.replace(/\/shiny\//g, '/normal/');
	        } else {
	            // normal → shiny
	            return p.replace(/\/normal\//g, '/shiny/');
	        }
	    };

	    for (const key in this.sprite) {
	        if (!Object.prototype.hasOwnProperty.call(this.sprite, key)) continue;
	        if (typeof this.sprite[key] === 'string') {
	            this.sprite[key] = replacePath(this.sprite[key]);
	        }
	    }

	    if (this.isDeployed) {
	        const tower = this.main.area.towers.find(t => t.pokemon === this);
	        if (tower) {
	            tower.updateStatsFromPokemon();

	            if (this.id == 61) {
	                if (tower.tile.land == 2 || (tower.tile.land == 1 && tower.pokemon?.item?.id == 'fertiliser'))
	                    tower.updateTowerSprite(this.sprite.imageGrass, this.sprite.framesGrass, this.specie.projectileGrass);
	                else if (tower.tile.land == 3 || (tower.tile.land == 1 && tower.pokemon?.item?.id == 'squirtBottle'))
	                    tower.updateTowerSprite(this.sprite.imageWater, this.sprite.framesWater, this.specie.projectileWater);
	                else if (tower.tile.land == 4 || (tower.tile.land == 1 && tower.pokemon?.item?.id == 'hikingKit'))
	                    tower.updateTowerSprite(this.sprite.imageMountain, this.sprite.framesMountain, this.specie.projectileMountain);
	            }

	            if (typeof this.main.area.recalculateAuras === 'function') {
	                this.main.area.recalculateAuras();
	            }
	        }
	    }
	}
}

function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

export function findSpecieInCatalog(oldSpecie) {
    if (!oldSpecie) return null;

    for (const key in pokemonData) {
        const s = pokemonData[key];
        if (oldSpecie.sprite && s.sprite) {
            if (oldSpecie.sprite.base && s.sprite.base && oldSpecie.sprite.base === s.sprite.base) return s;
            if (oldSpecie.sprite.image && s.sprite.image && oldSpecie.sprite.image === s.sprite.image) return s;
        }
    }

    const oldName0 = (oldSpecie.name && oldSpecie.name[0]) ? String(oldSpecie.name[0]).toLowerCase() : null;
    if (oldName0) {
        for (const key in pokemonData) {
            const s = pokemonData[key];
            const sName0 = (s.name && s.name[0]) ? String(s.name[0]).toLowerCase() : null;
            if (sName0 && sName0 === oldName0) return s;
        }
    }

    let best = null;
    let bestScore = 0;
    for (const key in pokemonData) {
        const s = pokemonData[key];
        let score = 0;

        if (oldSpecie.id !== undefined && s.id !== undefined && oldSpecie.id === s.id) score += 1; 
        if (oldSpecie.rangeType && s.rangeType && oldSpecie.rangeType === s.rangeType) score += 2;
        if (oldSpecie.attackType && s.attackType && oldSpecie.attackType === s.attackType) score += 2;
        if (oldSpecie.projectileSound && s.projectileSound && oldSpecie.projectileSound === s.projectileSound) score += 1;
        if (oldSpecie.costScale && s.costScale && oldSpecie.costScale === s.costScale) score += 1;

        if (Array.isArray(oldSpecie.tiles) && Array.isArray(s.tiles) && arraysEqual(oldSpecie.tiles, s.tiles)) score += 2;

        if (oldSpecie.speed?.base !== undefined && s.speed?.base !== undefined) {
            if (oldSpecie.speed.base === s.speed.base) score += 1;
            else if (Math.abs(oldSpecie.speed.base - s.speed.base) < 50) score += 0.5; 
        }
        if (oldSpecie.power?.base !== undefined && s.power?.base !== undefined) {
            if (oldSpecie.power.base === s.power.base) score += 1;
            else if (Math.abs(oldSpecie.power.base - s.power.base) < 5) score += 0.5;
        }

        if (oldSpecie.ability?.id && s.ability?.id && oldSpecie.ability.id === s.ability.id) score += 2;

        if (score > bestScore) {
            bestScore = score;
            best = s;
        }
    }

    if (bestScore >= 4) return best;
    return null;
}