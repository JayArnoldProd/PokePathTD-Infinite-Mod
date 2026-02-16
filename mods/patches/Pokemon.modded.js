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

		this.speed = Math.floor(this.specie.speed.base + (this.specie.speed.scale * lvl));
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
		this.trueDamageDealt = 0;

		if (targetMode == undefined) {
			if (this.attackType == 'area') this.targetMode = 'area';
			else if (
				this.ability.id == 'quadraShot' || this.ability.id == 'tripleShot' || this.ability.id == 'doubleShot' || 
				this.ability.id == 'curseDoubleShot' || this.ability.id == 'cradily' || this.ability.id == 'poisonDoubleShot' || 
				this.ability.id == 'armorBreakDoubleShot'
			) this.targetMode = 'available';
			else if (this.attackType == 'aura') this.targetMode = 'aura';
			else if (this.ability.id == 'frisk' || this.ability.id == 'vigilantFrisk') this.targetMode = 'invisible';
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

		this.form = (this.specie.form) ? this.specie.key : false;
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

		this.form = (this.specie.form) ? this.specie.key : false;
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
		if (this.specie.costScale === 'low') {
			this.cost = Math.min(100000, Math.ceil(27 * Math.pow(1.12, this.lvl)) - 11);
		} else if (this.specie.costScale === 'mid') {
			this.cost = Math.min(100000, Math.ceil(35 * Math.pow(1.12, this.lvl)) + ((this.lvl-1) * 5));
		} else if (this.specie.costScale === 'high') {
			this.cost = Math.min(100000, Math.ceil(51 * Math.pow(1.12, this.lvl)) + (this.lvl * 3) - 1);		
		} else if (this.specie.costScale === 'veryHigh') {
			this.cost = Math.min(150000, Math.ceil(51 * Math.pow(1.12, this.lvl)) + (this.lvl * 3) - 1);		
		}
	}

	checkCost(num) {
		let cost = 0;

		for (let i = 0; i < num; i++) {
			if (this.specie.costScale === 'low') {
				cost += Math.min(100000, Math.ceil(27 * Math.pow(1.12, this.lvl+i)) - 11);
			} else if (this.specie.costScale === 'mid') {
				cost += Math.min(100000, Math.ceil(35 * Math.pow(1.12, this.lvl+i)) + (((this.lvl+i)-1) * 5));
			} else if (this.specie.costScale === 'high') {
				cost += Math.min(100000, Math.ceil(51 * Math.pow(1.12, this.lvl+i)) + ((this.lvl+i) * 3) - 1);		
			} else if (this.specie.costScale === 'veryHigh') {
				cost += Math.min(150000, Math.ceil(51 * Math.pow(1.12, this.lvl+i)) + ((this.lvl+i) * 3) - 1);		
			}
		}
		
		return cost;
	}

	updateStats() {
		let level = this.lvl;
		if (typeof this.main?.area?.inChallenge.lvlCap === 'number') level = this.main.area.inChallenge.lvlCap;

		this.speed = Math.floor(this.specie.speed.base + (this.specie.speed.scale * level));
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));
		this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * level));
		this.critical = this.specie.critical.base + (this.specie.critical.scale * level);
	}

	setStatsLevel(level = 50) { // BORRAR y cambiar por lo de arriba 
		this.speed = Math.floor(this.specie.speed.base + (this.specie.speed.scale * level));
		this.power = Math.floor(this.specie.power.base + (this.specie.power.scale * level));
		this.range = Math.floor(this.specie.range.base + (this.specie.range.scale * level));
		this.critical = this.specie.critical.base + (this.specie.critical.scale * level);
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

		this.speed = Math.floor(this.adn.speed.base + (this.adn.speed.scale * level));
		this.power = Math.floor(this.adn.power.base + (this.adn.power.scale * level));
		this.range = Math.floor(this.adn.range.base + (this.adn.range.scale * level));

		//HABILIDADES
		this.ricochet = this.adn.ricochet ?? 0;
		
		this.innerRange = this.adn.range.inner;
		this.critical = this.adn.critical.base + (this.adn.critical.scale * level);

		this.damageDealt = 0;
		this.trueDamageDealt = 0;

		if (this.attackType == 'area') this.targetMode = 'area';
		else if (
			this.ability.id == 'quadraShot' || this.ability.id == 'tripleShot' || this.ability.id == 'doubleShot' || 
			this.ability.id == 'curseDoubleShot' || this.ability.id == 'cradily'
		) this.targetMode = 'available';
		else if (this.attackType == 'aura') this.targetMode = 'aura';
		else if (this.ability.id == 'frisk' || this.ability.id == 'vigilantFrisk') this.targetMode = 'invisible';
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
			const pokeWhitItem = pokes.find(poke => poke.id == item.equipedBy);
			if (pokeWhitItem.isDeployed && 
				(item?.id == 'silphScope' || item?.id == 'airBalloon' || item?.id == 'heavyDutyBoots' || 
				item?.id == 'dampMulch' || item?.id == 'assaultVest' || item?.id == 'subwoofer')
			) {
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
			(this.ability.id !== 'frisk' && this.ability.id !== 'vigilantFrisk')
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

		this.main.UI.update();
	}

	retireItem() {
		if (this.item != null) {
			if (this.ability.id != 'magician') this.item.equipedBy = undefined;

			if (
				this.isDeployed && 
				this.item.id == 'silphScope' && 
				(this.ability.id !== 'frisk' && this.ability.id !== 'vigilantFrisk')
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
		if (this.id == 70 && this.adn?.id != 70) return;
	    const replacePath = (p) => {
	        if (typeof p !== 'string') return p;

	        if (this.hideShiny) {
	            // shiny ΓåÆ normal
	            return p.replace(/\/shiny\//g, '/normal/');
	        } else {
	            // normal ΓåÆ shiny
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
