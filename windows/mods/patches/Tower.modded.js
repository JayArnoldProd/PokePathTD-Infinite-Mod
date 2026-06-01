import { Projectile } from './Projectile.js';
import { Sprite } from '../../utils/Sprite.js';
import { playSound } from '../../file/audio.js';
import { projectileData } from '../data/projectileData.js';

const _REVYS_SPRITES = Object.values(projectileData);

export class Tower extends Sprite {
    constructor(main, x, y, ctx, pokemon, tile, teleportBuff = false) {
        super(x, y, ctx, pokemon.sprite.image, pokemon.sprite.frames, 8, 0, pokemon.sprite.hold);
        this.main = main;

        this.tile = tile;
        this.ctx = ctx;

        this.center = {
            x: this.position.x + this.width / 2,
            y: this.position.y + this.height / 2
        };
        this.projectiles = [];

        this.ability = pokemon?.ability ?? { id: '' };
        if (!pokemon.ability) pokemon.ability = this.ability;
        this.rangeType = pokemon.rangeType;
        this.attackType = pokemon.attackType;
        this.basePower = pokemon.power;
        this.power = this.basePower;
        this.range = undefined;
        this.target = null;
        this.cadence = 0;

        this.speed = pokemon.speed;      
        this.attackSpeed = this.speed;
        this.orbitalSpeed = pokemon.orbitalSpeed ?? 0;

        // HABILIDADES
        this.ricochet = pokemon.ricochet;
        this.orbital = pokemon.orbital;
        this.revealInvisible = (this.ability.id === 'illuminate' || this.ability.id === 'frisk' || this.ability.id === 'vigilantFrisk' || pokemon?.item?.id == 'silphScope') ? true : false;
        this.damageBoost = 0;
        this.speedBoost = 0;
        this.teleport = 0;
        this.teleportBuff = teleportBuff;
        this.moxieBuff = 0;
        this.incenseBuff = 0;
        this.incenseTimer = 0;
        this.lightningRodCharge = 0;
        this.lightningRodChargeCD = 0;
        this.shiftGearSpeed = 0;
        this.hitCount = 0;
        this.spikyShieldChance = 0;

        this.cherrimForm = false;
        this.lastTarget = null;

        this.pokemon = pokemon;
        this.pokemon.tilePosition = tile.id;

        this.projectile = {
            sprite: pokemon.projectile.sprite,
            effect: pokemon.specie.projectileSound,
            power: this.power,
            critical: this.critical,
            speed: this.pokemon.specie.projectileSpeed
        };

        this.pulse = {
            active: false,
            radius: 0,
            alpha: 0,
            maxRadius: 0,
            speed: 0 
        };

        this.criticalAura = false;
        this.criticalDamageAura = false;

        this.setTowerStats();

        this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
        this.targetMode = pokemon.targetMode;

        if (this.pokemon.specie.id == 61) {
            if (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser')) this.updateTowerSprite(this.pokemon.sprite.imageGrass, this.pokemon.sprite.framesGrass, this.pokemon.specie.projectileGrass);
            else if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')) this.updateTowerSprite(this.pokemon.sprite.imageWater, this.pokemon.sprite.framesWater, this.pokemon.specie.projectileWater);
            else if (this.tile.land == 4 || (this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit')) this.updateTowerSprite(this.pokemon.sprite.imageMountain, this.pokemon.sprite.framesMountain, this.pokemon.specie.projectileMountain);      
        } else  if (this.pokemon?.adn?.id == 61) {
            if (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser')) this.updateTowerSprite(this.pokemon.adn.sprite.imageGrass, this.pokemon.adn.sprite.framesGrass, this.pokemon.adn.projectileGrass);
            else if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')) this.updateTowerSprite(this.pokemon.adn.sprite.imageWater, this.pokemon.adn.sprite.framesWater, this.pokemon.adn.projectileWater);
            else if (this.tile.land == 4 || (this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit')) this.updateTowerSprite(this.pokemon.adn.sprite.imageMountain, this.pokemon.adn.sprite.framesMountain, this.pokemon.adn.projectileMountain);      
        }

        if (this.pokemon?.item?.id == 'bicycle') {
            this.projectile.sprite = { image: this.pokemon.item.sprite, frames: 1 };
            this.projectile.effect = 'ding';
        }

        if (this.attackType === 'orbital') {
            this.spawnOrbitales();
        }
    }

    updateTowerSprite(spriteImage = undefined, spriteFrames = undefined, projectileSprite = undefined) {
        this.loaded = false;
  
        this.frames.max = (spriteFrames == undefined) ? this.pokemon.sprite.frames : spriteFrames;
        this.frames.hold = this.pokemon.sprite.hold;
        this.frames.current = 0; // reset animaci├│n
        this.frames.elapsed = 0; // proteger contador

        if (projectileSprite != undefined) this.projectile.sprite = projectileSprite.sprite;

        this.sprite = new Image();
        this.sprite.onload = () => {
            this.width = this.sprite.width / this.frames.max;
            this.height = this.sprite.height / this.frames.rows;
            this.loaded = true;
        };
        this.sprite.src = (spriteImage == undefined) ? this.pokemon.sprite.image : spriteImage;
    }

    updateStatsFromPokemon() {
        this.basePower = this.pokemon.power;
        this.projectile.power = this.basePower;
        this.speed = this.pokemon.speed;
        this.attackSpeed = this.pokemon.speed;
        this.orbitalSpeed = this.pokemon.orbitalSpeed ?? 0;
        this.critical = this.pokemon.critical;
        this.range = this.pokemon.range;
        this.innerRange = this.pokemon.innerRange;
        this.ability = this.pokemon?.ability ?? { id: '' };
        if (!this.pokemon.ability) this.pokemon.ability = this.ability;
        this.attackType = this.pokemon.attackType;
        this.targetMode = this.pokemon.targetMode;
        this.orbital = this.pokemon.orbital;
        this.projectile.sprite = this.pokemon.projectile.sprite;
        this.projectile.effect = this.pokemon.specie.projectileSound;

        // volver a aplicar efectos de terreno y recalcular power real
        this.setTowerStats();
        this.recalculatePower();

        // si la torre tiene proyectiles activos -> actualizarlos tambien por si acaso xd
        this.projectiles.forEach(p => {
            if (p) p.power = this.projectile.power ?? this.basePower;
        });

        if (this.attackType === 'orbital') this.refreshOrbitalProjectiles();
        else this.projectiles = this.projectiles.filter(p => !p?.orbit);

        this.updateTowerSprite();
    }

    setTowerStats() {
        this.attackSpeed = this.pokemon.speed;
        this.critical = this.pokemon.critical;
        this.range = this.pokemon.range;
        this.innerRange = this.pokemon.innerRange;
        this.power = this.basePower;
        this.speed = this.pokemon.speed;
        this.attackSpeed = this.speed; 
        this.orbitalSpeed = this.pokemon.orbitalSpeed ?? 0;
        this.attackCooldown = Math.min(this.attackCooldown, this.attackSpeed);
       
        if (this.pokemon.id == 65 || this.pokemon?.adn?.id == 65) this.speed -= (500 * this.main.player.fossilInTeam);
        if (this.pokemon?.ability?.id == 'speedBoost') this.speed -= (300 * this.speedBoost);
        if (this.pokemon?.item?.id == 'shieldBreakerBullet') this.speed += 2000;
        if (this.pokemon?.item?.id == 'bindingBand') this.speed += 1500;
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89 && this.pokemon?.lvl == 100) this.speed -= 4000;

        if (this.ability?.id == 'rageFist') {
            this.power += (this.main.area.hitsReceived * 50);
        }

        if (this.pokemon?.item?.id === 'fullIncense') {
            this.power += this.incenseBuff;
        }

        if (
            this.pokemon?.item?.id == 'quickClaw' || 
            this.pokemon?.item?.id == 'lifeOrb' ||
            (this.main.area.heartScale && this.pokemon?.item?.id == 'heartScale')
        ) {
			if (this.pokemon?.item?.id == 'heartScale' && this.ability?.id == 'simple') {
				this.speed -= (this.speed * 0.75);
			} else {
				this.speed -= (this.speed * 0.5);
			}
		}
		if (this.pokemon?.item?.id == 'laggingTail') {
			if (this.ability.id === 'contrary') this.speed -= (this.speed * 0.5);
			else this.speed += (this.speed * 0.5);
        }
    
        if (this.pokemon?.item?.id == 'quickPowder') this.speed -= (this.speed / 4);
        if (this.pokemon?.item?.id == 'adrenalineOrb') {
            this.speed -= (this.ability?.id == 'simple') ?
            (this.speed * 0.03 * (14 - this.main.player.health[this.main.area.routeNumber])) :
            (this.speed * 0.02 * (14 - this.main.player.health[this.main.area.routeNumber]));
        }
            
        if (this.pokemon?.item?.id == 'metalPowder') this.speed += (this.speed / 4);
        if (this.cherrimForm) this.speed -= (this.speed * 0.25);

        if (this.pokemon?.item?.id == 'choiceScarf') {
            if (this.ability.id === 'quadraShot' || this.ability.id === 'quadraShotSand') this.speed -= (this.speed * 0.875);
            else if (this.ability.id === 'tripleShot') this.speed -= (this.speed * 0.75);
            else this.speed -= (this.speed * 0.5);
        }   

        if (this.pokemon?.item?.id == 'inverter' && this.pokemon?.lvl == 100 && this.pokemon?.specie?.key == 'malamar') this.speed -= (this.speed * 0.5)
        
        if (this.pokemon?.item?.id == 'poisonBarb' || this.pokemon?.item?.id == 'ancientSword') this.speed -= (this.speed * 0.2);
        if (this.pokemon?.item?.id == 'carbos') {
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.22) : (this.speed * 0.15);
        }
        if (this.pokemon?.item?.id == 'wrestlingMask') this.speed -= (this.speed * 0.5);
        if (this.pokemon?.item?.id == 'muscleBand') this.speed += (this.speed * 0.25);

        if (
            this.tile && this.pokemon?.item?.id === 'mitsuesCocktail' ||
            (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassyTerrain') 
            && (this.pokemon.ability.id === 'ambusher' || this.pokemon.ability.id === 'castform')
        ) {
            this.power = this.basePower * 2;
            this.projectile.power = this.power;
        }

        if (
            this.main.player.health[this.main.area.routeNumber] <= 5 &&
            this.pokemon.ability.id === 'torrent' &&
            (this.tile.land === 3 || this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')
        ) {
            this.power = Math.ceil(this.basePower * 1.75);
            this.projectile.power = this.power;
        }

        if (
            this.main.player.health[this.main.area.routeNumber] <= 5 &&
            this.pokemon.ability.id === 'overgrow' &&
            (this.tile.land === 2 || this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser')
        ) {
            this.power = Math.ceil(this.basePower * 1.75);
            this.projectile.power = this.power;
        }

        if (this.pokemon.ability.id === 'defeatist' && this.main.player.health[this.main.area.routeNumber] <= 7) {
            this.power = Math.ceil(this.basePower / 2);
            this.projectile.power = this.power;
        }

        if (this.pokemon?.item?.id === 'sokudosPortfolio') {
            let reductor = Math.min(this.main.player.shinyAmount * 0.05, 0.75);
            this.speed -= (this.speed * reductor)
        }

        if (
            this.tile && 
            (this.tile.land === 4 || this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit') && 
            (this.pokemon.ability.id === 'vigilant' || this.pokemon.ability.id === 'vigilantFrisk' || this.pokemon.ability.id === 'castform')
        ) {
            this.range = this.pokemon.range * 2;
        }

        if ([3,4,5,10].includes(this.main.area.routeNumber) && (this.pokemon.ability.id === 'doubleShotSand' || this.pokemon.ability.id === 'quadraShotSand')) {
            this.range = this.pokemon.range * 2;
        }  
        
        if (this.tile && (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')) && (this.pokemon.ability.id === 'swimmer' || this.pokemon.ability.id === 'castform')) {
            this.speed = this.pokemon.speed / 2;
        }

        if (this.pokemon?.item?.id == 'nanabBerry') {
            this.range = this.range * 1.3;
            this.speed += (this.speed / 4);
        }

        if (this.pokemon?.item?.id == 'eviolite' && this.pokemon?.lvl <= 50) {
            this.range = this.range * 1.2;
            this.speed -= (this.speed / 5);
        }

        if (
            this.main.area.weather == 'harshSunlight' &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser'))
        ) {
            this.speed = this.pokemon.speed / 2;
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser'))
        ) {
            this.speed = this.pokemon.speed * 4;
        }

        if (this.pokemon?.item?.id == 'helixFossil') this.range += this.main.player.fossilInTeam * 10;
        if (this.pokemon?.item?.id == 'oldRod') this.range += 75;
        if (this.pokemon?.item?.id == 'silphScope' && (this.pokemon.ability.id === 'illuminate' || this.pokemon.ability.id === 'frisk' || this.pokemon.ability.id === 'vigilantFrisk')) {
            this.range += 15;
            this.speed -= (this.speed / 4);
        }
        if (this.pokemon?.item?.id == 'revelationAroma') this.range += 25;
        if (this.pokemon?.item?.id == 'sunflowerPetal') this.range -= 50;
        if (this.pokemon?.item?.id == 'wrestlingMask') this.range -= 75;
        if (this.pokemon?.item?.id == 'condensedBlizzard') this.range /= 2;
        if (this.pokemon?.item?.id == 'spindaCocktail') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.38 : this.range * 1.25;
        }
        if (this.pokemon?.item?.id == 'ancientShield') this.range = this.range * 1.2;
        if (this.pokemon?.item?.id == 'starCandy') this.range += (this.main.player.stars * 0.1);
    }

    recalculatePower() {
        // valores base
        this.powerAura = false;
        this.criticalAura = false;
        this.criticalDamageAura = false;
        this.triageAura = false;
        this.illuminateAura = false;
        this.power = this.basePower;
        this.speed = this.pokemon.speed;
        this.range = this.pokemon.range;

        if (this.pokemon.id == 65 || this.pokemon?.adn?.id == 65) this.speed -= (500 * this.main.player.fossilInTeam);
        if (this.pokemon?.ability?.id == 'speedBoost') this.speed -= (300 * this.speedBoost);
       
         if (
            this.pokemon?.item?.id == 'quickClaw' || 
            this.pokemon?.item?.id == 'lifeOrb' ||
            (this.main.area.heartScale && this.pokemon?.item?.id == 'heartScale')
        ) {
			if (this.pokemon?.item?.id == 'heartScale' && this.ability?.id == 'simple') {
				this.speed -= (this.speed * 0.75);
			} else {
				this.speed -= (this.speed * 0.5);
			}
		}
		if (this.pokemon?.item?.id == 'laggingTail') {
			if (this.ability.id === 'contrary') this.speed -= (this.speed * 0.5);
			else this.speed += (this.speed * 0.5);
        }

        if (this.ability?.id == 'rageFist') {
            this.power += (this.main.area.hitsReceived * 50);
        }

         if (this.pokemon?.item?.id === 'fullIncense') {
            this.power += this.incenseBuff;
        }

        if (this.pokemon?.item?.id == 'shieldBreakerBullet') this.speed += 2000;
        if (this.pokemon?.item?.id == 'bindingBand') this.speed += 1500;
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89 && this.pokemon?.lvl == 100) this.speed -= 4000;

        if (this.pokemon?.item?.id == 'quickPowder') this.speed -= (this.speed / 4);
        if (this.pokemon?.item?.id == 'adrenalineOrb') {
            this.speed -= (this.ability?.id == 'simple') ?
            (this.speed * 0.03 * (14 - this.main.player.health[this.main.area.routeNumber])) :
            (this.speed * 0.02 * (14 - this.main.player.health[this.main.area.routeNumber]));
        }

        if (this.pokemon?.item?.id == 'metalPowder') this.speed += (this.speed / 4);
        if (this.cherrimForm) this.speed /= 2;

        if (this.pokemon?.item?.id == 'choiceScarf') {
            if (this.ability.id === 'quadraShot' || this.ability.id === 'quadraShotSand') this.speed -= (this.speed * 0.875);
            else if (this.ability.id === 'tripleShot') this.speed -= (this.speed * 0.75);
            else this.speed -= (this.speed * 0.5);
        }

        if (this.pokemon?.item?.id == 'inverter' && this.pokemon?.lvl == 100 && this.pokemon?.specie?.key == 'malamar') this.speed -= (this.speed * 0.5)

        if (this.pokemon?.item?.id == 'poisonBarb' || this.pokemon?.item?.id == 'ancientSword') this.speed -= (this.speed * 0.2);
        if (this.pokemon?.item?.id == 'carbos') {
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.22) : (this.speed * 0.15);
        }
        if (this.pokemon?.item?.id == 'wrestlingMask') this.speed -= (this.speed * 0.5);
        if (this.pokemon?.item?.id == 'muscleBand') this.speed += (this.speed * 0.25);

        if (this.pokemon.ability.id === 'defeatist' && this.main.player.health[this.main.area.routeNumber] <= 7) {
            this.power = Math.ceil(this.basePower / 2);
            this.projectile.power = this.power;
        }

        if (this.pokemon?.item?.id === 'sokudosPortfolio') {
            let reductor = Math.min(this.main.player.shinyAmount * 0.05, 0.75);
            this.speed -= (this.speed * reductor)
        }

        // terreno
        if (this.tile && this.pokemon?.item?.id === 'mitsuesCocktail' || 
            (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassyTerrain') && (this.pokemon.ability.id === 'ambusher' || this.pokemon.ability.id === 'castform'))
            this.power = Math.ceil(this.power * 2);
        if (this.tile && (this.tile.land === 4 || this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit') && (this.pokemon.ability.id === 'vigilant' || this.pokemon.ability.id === 'vigilantFrisk' || this.pokemon.ability.id === 'castform'))
            this.range = this.pokemon.range * 2;
        if (this.tile && (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')) && (this.pokemon.ability.id === 'swimmer' || this.pokemon.ability.id === 'castform'))
            this.speed /= 2;
        if ([3,4,5,10].includes(this.main.area.routeNumber) && (this.pokemon.ability.id === 'doubleShotSand' || this.pokemon.ability.id === 'quadraShotSand')) {
            this.range = this.pokemon.range * 2;
        }

        if (
            this.main.player.health[this.main.area.routeNumber] <= 5 &&
            this.pokemon.ability.id === 'torrent' &&
            (this.tile.land === 3 || this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')
        ) {
            this.power = Math.ceil(this.basePower * 1.75);
            this.projectile.power = this.power;
        }

        if (
            this.main.player.health[this.main.area.routeNumber] <= 5 &&
            this.pokemon.ability.id === 'overgrow' &&
            (this.tile.land === 2 || this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser')
        ) {
            this.power = Math.ceil(this.basePower * 1.75);
            this.projectile.power = this.power;
        }

        if (this.pokemon?.item?.id == 'nanabBerry') {
            this.range = this.range * 1.3;
            this.speed += (this.speed / 4);
        }

        if (this.pokemon?.item?.id == 'eviolite' && this.pokemon?.lvl <= 50) {
            this.range = this.range * 1.2;
            this.speed -= (this.speed / 5);
        }

        if (
            this.main.area.weather == 'harshSunlight' &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser'))
        ) {
            this.speed = this.pokemon.speed / 2;
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser'))
        ) {
            this.speed = this.pokemon.speed * 4;
        }

        if (this.pokemon?.item?.id == 'helixFossil') this.range += this.main.player.fossilInTeam * 10;
        if (this.pokemon?.item?.id == 'oldRod') this.range += 75;
        if (this.pokemon?.item?.id == 'silphScope' && (this.pokemon.ability.id === 'illuminate' || this.pokemon.ability.id === 'frisk' || this.pokemon.ability.id === 'vigilantFrisk')) {
            this.range += 15;
            this.speed -= (this.speed / 4);
        }
        if (this.pokemon?.item?.id == 'wrestlingMask') this.range -= 75;
        if (this.pokemon?.item?.id == 'condensedBlizzard') this.range /= 2;
        if (this.pokemon?.item?.id == 'spindaCocktail') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.38 : this.range * 1.25;
        }
        if (this.pokemon?.item?.id == 'ancientShield') this.range = this.range * 1.2;
        if (this.pokemon?.item?.id == 'starCandy') this.range += (this.main.player.stars * 0.1);
       
        // PERF: Single-pass aura detection instead of 4 separate .filter() calls
        let foundPowerAura = null;
        let foundTriageAura = false;
        let foundCriticalAura = false;
        let foundCriticalDamageAura = false;
        const allTowers = this.main.area.towers;
        const myCx = this.center.x;
        const myCy = this.center.y;
        for (let i = 0; i < allTowers.length; i++) {
            const t = allTowers[i];
            if (t === this || !t.ability) continue;
            const aid = t.ability.id;
            if (aid !== 'powerAura' && aid !== 'triage' && aid !== 'criticalAura' && aid !== 'criticalDamageAura') continue;
            const dx = t.center.x - myCx;
            const dy = t.center.y - myCy;
            const distSq = dx * dx + dy * dy;
            if (aid === 'powerAura') {
                let auraR = t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0) + (t.pokemon?.item?.id === "sunflowerPetal" ? -25 : 0);
                if (distSq <= auraR * auraR && !foundPowerAura) foundPowerAura = t;
            } else if (aid === 'triage') {
                let auraR = t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0);
                if (distSq <= auraR * auraR) foundTriageAura = true;
            } else if (aid === 'criticalAura') {
                if (distSq <= t.range * t.range) foundCriticalAura = true;
            } else if (aid === 'criticalDamageAura') {
                if (distSq <= t.range * t.range) foundCriticalDamageAura = true;
            }
        }

        if (foundPowerAura) {
            this.powerAura = (foundPowerAura.pokemon?.item?.id == 'sunflowerPetal') ? 1.3 : 1.2;
            this.power = Math.ceil(this.power * this.powerAura);

            if (this.pokemon.id == 75 && this.pokemon.lvl > 24 && !this.cherrimForm && this.main.area.weather !== 'harshSunlight') {
                this.cherrimForm = true;
                this.updateTowerSprite(this.pokemon.sprite.transform);
            }
        } else {
            this.powerAura = false;
            if (this.pokemon.id == 75 && this.pokemon.lvl > 24 && this.cherrimForm && this.main.area.weather !== 'harshSunlight') {
                this.cherrimForm = false;
                this.updateTowerSprite(this.pokemon.sprite.image);
            }
        }

        if (this.main.area.weather === 'harshSunlight' && this.pokemon.id == 75 && this.pokemon.lvl > 24 && !this.cherrimForm) {
            this.cherrimForm = true;
            this.updateTowerSprite(this.pokemon.sprite.transform);
        }

        if (foundTriageAura) {
            this.speed -= (this.speed * 0.15);
            this.triageAura = true;
        } else {
            this.triageAura = false;
        }

        this.criticalAura = foundCriticalAura;
        this.criticalDamageAura = foundCriticalDamageAura;

        // illuminate: +15 range and reveal invisible for nearby allies
        const nearbyIlluminate = this.main.area.towers.filter(t =>
            t.ability?.id === 'illuminate' &&
            t !== this &&
            Math.hypot(t.center.x - this.center.x, t.center.y - this.center.y) <= t.range
        );
        if (nearbyIlluminate.length > 0) {
            this.illuminateAura = true;
            this.range += 15;
            this.revealInvisible = true;
        } else {
            this.illuminateAura = false;
            // Restore revealInvisible to its intrinsic value (own ability/item only)
            this.revealInvisible = (
                this.ability.id === 'illuminate' ||
                this.ability.id === 'frisk' ||
                this.ability.id === 'vigilantFrisk' ||
                this.pokemon?.item?.id === 'silphScope'
            ) ? true : false;
        }

        this.projectile.power = this.power;
    }

    draw() {
        if (!this.loaded) return;

        const crop = {
            position: {
                x: this.width * this.frames.current,
                y: this.height * this.frames.direction
            },
            width: this.width,
            height: this.height
        };

        const tileSize = 24;
        const fieldSpriteScale = 1;
        const drawWidth = crop.width * fieldSpriteScale;
        const drawHeight = crop.height * fieldSpriteScale;
        const offsetX = (tileSize - drawWidth) / 2;
        const offsetY = (tileSize - drawHeight) / 2;
        const passengerOffset = this.isPassenger ? this.passengerYOffset : 0;
        this.drawYOffset = passengerOffset;

        this.center = {
            x: this.position.x + tileSize / 2,
            y: this.position.y + tileSize / 2 + passengerOffset
        };

        // --- lightning rod / pulse radiantes usan this.center que ya tiene passengerOffset ---
        if (this.lightningRodCharge > 0) {
            const now = Date.now();
            const pulse = 1 + 0.06 * Math.sin(now / 200);

            const cx = this.center.x;
            const cy = this.center.y + (tileSize * 0.15);

            const baseRadius = 10;
            const radiusStep = 6;

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';

            for (let i = 1; i <= this.lightningRodCharge; i++) {
                const inner = (baseRadius + radiusStep * (i - 1)) * pulse;
                const outer = (baseRadius + radiusStep * i) * pulse;
                const alpha = Math.max(0.25 - i * 0.04, 0.06);

                const grad = this.ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
                grad.addColorStop(0, `rgba(80,255,120,${alpha})`);
                grad.addColorStop(0.7, `rgba(40,220,80,${alpha * 0.6})`);
                grad.addColorStop(1, `rgba(20,180,60,${alpha * 0.3})`);

                this.ctx.beginPath();
                this.ctx.fillStyle = grad;
                this.ctx.arc(cx, cy, outer, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.restore();
        }

        // illuminate aura glow on buffed allies (yellow-white shimmer)
        if (this.illuminateAura) {
            const now = Date.now();
            const pulse = 1 + 0.10 * Math.sin(now / 220);
            const cx = this.center.x;
            const cy = this.center.y;
            const inner = 5 * pulse;
            const outer = 14 * pulse;
            const grad = this.ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
            grad.addColorStop(0, 'rgba(255,255,180,0.38)');
            grad.addColorStop(0.55, 'rgba(255,240,100,0.18)');
            grad.addColorStop(1, 'rgba(255,220,60,0.06)');
            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.beginPath();
            this.ctx.fillStyle = grad;
            this.ctx.arc(cx, cy, outer, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        }

        if (this.powerAura || this.criticalAura || this.criticalDamageAura || this.triageAura) {
            const now = Date.now();
            const pulse = 1 + 0.08 * Math.sin(now / 180);
            const baseInner = 6;
            const baseOuter = 16;
            const inner = baseInner * pulse;
            const outer = baseOuter * pulse;

            const cx = this.center.x;
            const cy = this.center.y + (tileSize * 0.15);

            const baseColors = {
                power: { r: 255, g: 180, b: 50 },
                critical: { r: 180, g: 0, b: 255 },
                triage: { r: 50, g: 200, b: 255 },
                criticalDamage: { r: 255, g: 50, b: 50 }  
            };

            const auraColors = {
                power: { inner: 'rgba(255,200,50,0.28)', middle: 'rgba(255,150,40,0.16)', outer: 'rgba(255,120,20,0.06)' },
                critical: { inner: 'rgba(180,0,255,0.38)', middle: 'rgba(140,0,220,0.26)', outer: 'rgba(100,0,180,0.16)' },
                triage: { inner: 'rgba(50,200,255,0.28)', middle: 'rgba(40,150,255,0.16)', outer: 'rgba(20,120,255,0.06)' },
                criticalDamage: { inner: 'rgba(255,50,50,0.38)', middle: 'rgba(220,30,30,0.26)', outer: 'rgba(180,0,0,0.16)' }, 

                'power+critical': { inner: 'rgba(255,80,80,0.62)', middle: 'rgba(255,60,60,0.24)', outer: 'rgba(255,40,40,0.16)' },
                'power+triage': { inner: 'rgba(255,180,50,0.42)', middle: 'rgba(255,160,40,0.22)', outer: 'rgba(255,140,30,0.12)' },
                'power+criticalDamage': { inner: 'rgba(255,100,50,0.42)', middle: 'rgba(255,80,40,0.22)', outer: 'rgba(255,60,30,0.12)' }, 
                'critical+triage': { inner: 'rgba(120,0,255,0.42)', middle: 'rgba(90,0,220,0.26)', outer: 'rgba(60,0,180,0.16)' },
                'critical+criticalDamage': { inner: 'rgba(200,0,150,0.42)', middle: 'rgba(180,0,130,0.26)', outer: 'rgba(160,0,110,0.16)' }, 
                'triage+criticalDamage': { inner: 'rgba(150,50,200,0.42)', middle: 'rgba(130,30,180,0.26)', outer: 'rgba(110,0,160,0.16)' },  

                'power+critical+triage': { inner: 'rgba(255,100,100,0.52)', middle: 'rgba(255,80,80,0.26)', outer: 'rgba(255,60,60,0.16)' },
                'power+critical+criticalDamage': { inner: 'rgba(255,60,100,0.52)', middle: 'rgba(255,40,80,0.26)', outer: 'rgba(255,20,60,0.16)' },
                'power+triage+criticalDamage': { inner: 'rgba(255,100,100,0.52)', middle: 'rgba(255,80,80,0.26)', outer: 'rgba(255,60,60,0.16)' },  
                'critical+triage+criticalDamage': { inner: 'rgba(150,50,200,0.52)', middle: 'rgba(130,30,180,0.26)', outer: 'rgba(110,0,160,0.16)' },  

                'power+critical+triage+criticalDamage': { inner: 'rgba(255,80,120,0.62)', middle: 'rgba(255,60,100,0.32)', outer: 'rgba(255,40,80,0.22)' } 
            };

            let key = [];
            if (this.powerAura) key.push('power');
            if (this.criticalAura) key.push('critical');
            if (this.triageAura) key.push('triage');
            if (this.criticalDamageAura) key.push('criticalDamage');
            key.sort(); 
            key = key.join('+');

            let colors = auraColors[key];
            if (!colors) {
                let activeAuras = key.split('+');
                let r = 0, g = 0, b = 0;
                activeAuras.forEach(aura => {
                    const base = baseColors[aura];
                    if (base) {
                        r += base.r;
                        g += base.g;
                        b += base.b;
                    }
                });
                r = Math.floor(r / activeAuras.length);
                g = Math.floor(g / activeAuras.length);
                b = Math.floor(b / activeAuras.length);

                colors = {
                    inner: `rgba(${r},${g},${b},0.42)`,
                    middle: `rgba(${Math.floor(r*0.9)},${Math.floor(g*0.9)},${Math.floor(b*0.9)},0.26)`,
                    outer: `rgba(${Math.floor(r*0.8)},${Math.floor(g*0.8)},${Math.floor(b*0.8)},0.16)`
                };
            }

            const { inner: colInner, middle: colMiddle, outer: colOuter } = colors;

            const grad = this.ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
            grad.addColorStop(0, colInner);
            grad.addColorStop(0.6, colMiddle);
            grad.addColorStop(1, colOuter);

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.beginPath();
            this.ctx.fillStyle = grad;
            this.ctx.arc(cx, cy, outer, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.lineWidth = 1.2 * pulse;

            let strokeColor;
            if (this.triageAura && !this.powerAura && !this.criticalAura && !this.criticalDamageAura) {
                strokeColor = 'rgba(50,180,255,0.14)';  
            } else if (this.powerAura && !this.criticalAura && !this.triageAura && !this.criticalDamageAura) {
                strokeColor = 'rgba(255,180,50,0.18)'; 
            } else if (this.criticalAura && !this.powerAura && !this.triageAura && !this.criticalDamageAura) {
                strokeColor = 'rgba(180,80,200,0.14)';  
            } else if (this.criticalDamageAura && !this.powerAura && !this.criticalAura && !this.triageAura) {
                strokeColor = 'rgba(255,80,80,0.18)';  
            } else {
                strokeColor = 'rgba(200,100,150,0.16)';  
            }

            this.ctx.strokeStyle = strokeColor;
            this.ctx.stroke();
            this.ctx.restore();
        }

        if (this.pokemon?.item?.id === 'inverter') {
            this.ctx.save();

            const cx = this.position.x + tileSize / 2;
            const cy = this.position.y + tileSize / 2;

            this.ctx.translate(cx, cy);
            (this.pokemon?.ability?.id == 'simple') ? this.ctx.rotate(Math.PI / 2) : this.ctx.scale(1, -1);      
            this.ctx.translate(-cx, -cy);

            this.ctx.drawImage(
                this.sprite,
                crop.position.x,
                crop.position.y,
                crop.width,
                crop.height,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset,
                drawWidth,
                drawHeight
            );

            this.ctx.restore();
        } else {
            this.ctx.drawImage(
                this.sprite,
                crop.position.x,
                crop.position.y,
                crop.width,
                crop.height,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset,
                drawWidth, drawHeight
            );
        }

        if (this.pokemon.adn != undefined) {
           // PERF: Reuse cached temp canvas instead of creating new one every frame
            if (!this._tempCanvas || this._tempCanvas.width !== crop.width || this._tempCanvas.height !== crop.height) {
                this._tempCanvas = document.createElement("canvas");
                this._tempCanvas.width = crop.width;
                this._tempCanvas.height = crop.height;
                this._tempCtx = this._tempCanvas.getContext("2d");
            }
            const temp = this._tempCanvas;
            const tctx = this._tempCtx;
            tctx.clearRect(0, 0, crop.width, crop.height);

            // Dibujar el sprite recortado en el canvas temporal
            tctx.drawImage(
                this.sprite,
                crop.position.x,
                crop.position.y,
                crop.width,
                crop.height,
                0,
                0,
                crop.width,
                crop.height
            );

            // tinta rsa
            tctx.globalCompositeOperation = "source-atop";
            if (this.pokemon.isShiny && !this.pokemon.hideShiny) {
                tctx.fillStyle = "rgba(100, 180, 255, 0.65)"; // azul 
            } else {
                tctx.fillStyle = "rgba(255, 100, 150, 0.6)"; // rosa
            }
            tctx.fillRect(0, 0, crop.width, crop.height);

            // dibujar el resultado en el canvas real
            this.ctx.drawImage(
                temp,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset,
                drawWidth,
                drawHeight
            );
        }
    }

    refreshOrbitalProjectiles() {
        this.projectiles = this.projectiles.filter(p => !p?.orbit);
        this.spawnOrbitales();
    }

    getOrbitalAngularSpeed() {
        let angularSpeed = this.orbitalSpeed || (Math.PI / 5);
        if (this.ability?.id == 'shiftGear' && this.shiftGearSpeed > 0) angularSpeed = this.shiftGearSpeed;
        if (this.pokemon?.item?.id == 'lustrousOrb') angularSpeed *= 2;
        return angularSpeed;
    }

    spawnOrbitales() {
        // Orbital towers must never keep stray normal projectiles around.
        this.projectiles = this.projectiles.filter(p => p?.orbit);

        let numMax = this.orbital;
        const angularSpeed = this.getOrbitalAngularSpeed();

        if (!numMax || numMax <= 0) return;

        // Rebuild orbitals from current stats instead of stacking duplicates.
        this.projectiles = this.projectiles.filter(p => !p?.orbit);

        if (this.pokemon?.item?.id == 'jadeOrb') numMax += 2;

        for (let i = 0; i < numMax; i++) {
            const angle = (i * Math.PI * 2) / numMax;

            const orbitProjectileConfig = {
                ...this.projectile,
                power: this.projectile.power ?? this.basePower,
                orbit: {
                    radius: this.range,
                    angularSpeed: angularSpeed,
                    duration: Infinity,
                    hitCooldown: 350,
                    startAngle: angle
                }
            };

            const proj = new Projectile(
                this.center.x,
                this.center.y,
                null,
                this.ctx,
                orbitProjectileConfig,
                this
            );

            this.projectiles.push(proj);
        }
    }

    update(enemiesInRange, deltaTime = 1000 / 60, shouldDraw = undefined) {
        if (shouldDraw === undefined) shouldDraw = !this._skipDraw;

        const simDelta = deltaTime;
        const frameFactor = simDelta / (1000 / 60);

		// PERF: Only recalculate power on first sub-step (inputs don't change between steps)
		if (this._isFirstStep) this.recalculatePower();
		if (this.lightningRodChargeCD > 0) {
			this.lightningRodChargeCD = Math.max(0, this.lightningRodChargeCD - simDelta);
		}
		if (this.pokemon?.item?.id === 'fullIncense' && this.main.area.waveActive) {
			this.incenseTimer += simDelta;
		}

		// PERF: use the per-frame snowCloak enemy list from Game.js and squared distance.
		const snowCloakEnemies = this._snowCloakEnemies || this.main.area.enemies;
		let foundSnowCloak = false;
		const scThreshSq = 160 * 160;
		for (const e of snowCloakEnemies) {
			if (!e || e.hp <= 0 || e.invulnerable || e.passive?.id !== 'snowCloak') continue;
			const dx = e.center.x - this.center.x;
			const dy = e.center.y - this.center.y;
			if (dx * dx + dy * dy <= scThreshSq) {
				foundSnowCloak = true;
				break;
			}
		}
		this.snowCloakNear = foundSnowCloak;

        if (this.frames.elapsed === undefined) this.frames.elapsed = 0;
        this.frames.elapsed += frameFactor;
        while (this.frames.elapsed >= this.frames.hold) {
            this.frames.current++;
            this.frames.elapsed -= this.frames.hold;
            if (this.frames.current >= this.frames.max) this.frames.current = 0;
        }

        // DELTA TIME FIX: Skip drawing during sub-step simulation
        if (!this._skipDraw) this.draw();

        if (!this.attackCooldown && this.attackCooldown !== 0) this.attackCooldown = 0;
        // cds usan simDelta 
        this.attackCooldown -= simDelta;

        if (this.pokemon.id == 70 && this.pokemon.adn.id == 70) return;

        if (this.ability && this.ability.id === 'illuminate') {
            const auraRange = this.range;
            this.main.area.towers.forEach(tower => {
                if (tower === this) return;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                const distance = Math.hypot(dx, dy);
                if (distance <= auraRange) {
                    tower.auraBuffActive = true;
                    tower.isIlluminated = true;
                }
            });
            return;
        }

        if (this.ability && this.ability.id === 'powerAura') {
            let auraRange = this.range;
            if (this.pokemon?.item?.id == 'revelationAroma') auraRange += 25;
            if (this.pokemon?.item?.id == 'sunflowerPetal') auraRange -= 50;
            const auraRangeSq = auraRange * auraRange;
            let numAllies = 0;
            const towers = this.main.area.towers;
            for (let i = 0; i < towers.length; i++) {
                const tower = towers[i];
                if (tower === this) continue;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                if (dx * dx + dy * dy <= auraRangeSq) {
                    numAllies++;
                    tower.auraBuffActive = true;
                }
            }
            if (numAllies === 9) this.main.player.unlockAchievement(20)
            return;
        }

        if (this.ability && this.ability.id === 'triage') {
            let auraRange = this.range;
            if (this.pokemon?.item?.id == 'revelationAroma') auraRange += 25;
            const auraRangeSq = auraRange * auraRange;
            let numAllies = 0;
            const towers = this.main.area.towers;
            for (let i = 0; i < towers.length; i++) {
                const tower = towers[i];
                if (tower === this) continue;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                if (dx * dx + dy * dy <= auraRangeSq) {
                    numAllies++;
                    tower.auraBuffActive = true;
                }
            }
            return;
        }

        if (this.ability && this.ability.id === 'criticalAura') {
            const auraRangeSq = this.range * this.range;
            let numAllies = 0;
            const towers = this.main.area.towers;
            for (let i = 0; i < towers.length; i++) {
                const tower = towers[i];
                if (tower === this) continue;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                if (dx * dx + dy * dy <= auraRangeSq) {
                    numAllies++;
                    tower.criticalBuffActive = true;
                }
            }
            return;
        }

        if (this.ability && this.ability.id === 'criticalDamageAura') {
            const auraRangeSq = this.range * this.range;
            let numAllies = 0;
            const towers = this.main.area.towers;
            for (let i = 0; i < towers.length; i++) {
                const tower = towers[i];
                if (tower === this) continue;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                if (dx * dx + dy * dy <= auraRangeSq) {
                    numAllies++;
                    tower.criticalDamageBuffActive = true;
                }
            }
        }

        // --- FILTRAR ENEMIGOS segun invis (solo filtrar si la torre NO puede ver invis y el modo no es invi)
        let validEnemies = (enemiesInRange || []).slice();
        validEnemies = validEnemies.filter(e => !e.invulnerable);

        // invisibilidad
        if (!this.revealInvisible && this.targetMode !== 'invisible') {
            validEnemies = validEnemies.filter(e => !e.invisible);
        }

        if (this.ability.id == 'teleport' && validEnemies.length == 0 && this.main.area.waveActive) {
            this.teleport += frameFactor;
            if (this.teleport >= 200 || (this.teleport >= 100 && this.pokemon?.item?.id == "ejectButton")) {
                this.teleport = 0;
                this.tryTeleport();
            }
        }

        // TARGET 
        let desiredTarget = null;

        if (this.targetMode === 'invisible') {
            if (this.revealInvisible) {
                const invisibleList = validEnemies.filter(e => e.invisible);
                if (invisibleList.length > 0) {
                    const orderedInv = this.getOrderedEnemies(invisibleList);
                    desiredTarget = orderedInv[0] || null;
                } else {
                    if (this.target && validEnemies.includes(this.target) && this.target.hp > 0) {
                        desiredTarget = this.target;
                    } else {
                        const ordered = this.getOrderedEnemies(validEnemies);
                        desiredTarget = ordered[0] || null;
                    }
                }
            } else {
                const ordered = this.getOrderedEnemies(validEnemies);
                desiredTarget = ordered[0] || null;
            }
        } else {
            const ordered = this.getOrderedEnemies(validEnemies);
            desiredTarget = ordered[0] || null;
        }

        if (!this.target || this.target.hp <= 0 || !validEnemies.includes(this.target) || (desiredTarget && desiredTarget !== this.target)) {
            this.target = desiredTarget;
        }

        // --- TORRES DE ├üREA ---
        // DELTA TIME FIX: Use while loop to allow multiple attacks per frame at high speeds
        if (this.pokemon.attackType === 'area') {
            let areaFiredThisFrame = false;
            let areaAttacksThisFrame = 0;
            const MAX_AREA_ATTACKS_PER_FRAME = 50; // Cap to prevent lag spikes
            // Safety: clamp attack speed to minimum 0.01ms to prevent infinite loops while allowing extreme fire rates
            const areaAttackSpeed = Math.max(0.01, this.speed * (this.snowCloakNear ? 1.5 : 1));
            
            while (validEnemies.length > 0 && this.attackCooldown <= 0 && areaAttacksThisFrame < MAX_AREA_ATTACKS_PER_FRAME) {
                // Only play sound once per frame
                if (!areaFiredThisFrame && !this.main.mute[0]) playSound(this.projectile.effect, 'effect');

                let areaStunned = false;
                for (const enemy of validEnemies) {
                    if (enemy?.passive?.id === 'static') {
                        const dx = enemy.center.x - this.center.x;
                        const dy = enemy.center.y - this.center.y;
                        // PERF: squared distance comparison
                        if (dx * dx + dy * dy <= 13225 && Math.random() < 0.25) {  // 115*115=13225. RESTORED: Vanilla values (was 140/0.33)
                            playSound('paralyzed', 'effect');
                            this.attackCooldown += areaAttackSpeed;
                            areaStunned = true;
                            break;
                        }
                    }
                }
                if (areaStunned) break;

                validEnemies.forEach(enemy => {
                    if (enemy.invulnerable) return;
                    let finalDamage = this.projectile.power;

                    if (this.pokemon?.item?.id == 'softSand') {
                        let ssBonus = Math.max(1, 100 * Math.pow(0.5, validEnemies.length - 1));
                        finalDamage += Math.floor(finalDamage * (ssBonus / 100));
                    }

                    if (this.pokemon?.item?.id == 'protein') finalDamage += 15;  // RESTORED: Vanilla value (was 10)
                    if (this.pokemon?.item?.id == 'xAttack') finalDamage += 50;

                    if (this.pokemon?.item?.id == 'sharpBeak' && this.tile.land == 4) {
                        let dist = Math.sqrt(Math.pow(enemy.position.x - this.position.x, 2) + Math.pow(enemy.position.y - this.position.y, 2));
                        let bonus = Math.min(1.5, Math.sqrt(this.range / dist, 2));
                        finalDamage = Math.floor(finalDamage * bonus);
                    }
                    if (this.pokemon?.item?.id == 'quickPowder' || this.pokemon?.item?.id == 'quickClaw' || this.pokemon?.item?.id == 'scovillainSiracha') finalDamage -= Math.ceil(this.power / 2);
                    if (this.pokemon?.item?.id == 'metalPowder' || this.pokemon?.item?.id == 'lifeOrb') finalDamage += Math.ceil(this.power / 2);
                    if (this.pokemon?.item?.id == 'hardStone') finalDamage += Math.floor(finalDamage * 0.25);
                    if (this.pokemon?.item?.id == 'laggingTail') finalDamage += Math.ceil(this.power / 2);

                    if (this.ability?.id === 'fieryDance' && enemy.burnedBy != null) {
                        finalDamage = Math.ceil(finalDamage * 1.3);
                        enemy.statusEffects.forEach(effect => {
                            if (effect.type == 'burn') {
                                let burnExplosion = effect.duration * 0.002 * enemy.hpMax;
                                finalDamage = Math.ceil(finalDamage + burnExplosion);
                                effect.duration = 0;
                            }
                        })
                    }

                    if (this.ability?.id === 'dreamEater' && enemy.nightmaredBy != null) {
                        finalDamage = Math.ceil(finalDamage * 2);
                    }

                    if (this.tower?.pokemon?.item?.id === 'ancientShield' || (this.tower?.pokemon?.item?.id == 'eviolite' && this.tower?.pokemon?.lvl <= 50)) {
                        finalDamage = Math.ceil(finalDamage * 1.2);
                    }

                    let isCritical = false;
                    if (this.criticalAura) this.critical += 10;
                    if (this.pokemon?.item?.id == 'direHit') this.critical += 10;
                    if ((Math.random() * 100) < this.critical && this.tower?.pokemon?.item?.id != 'blueBandana') {
                        isCritical = true;
                        let multiplier = (this.ability?.id === 'superCritical') ? 2.0 : 1.5;
                        if (this.criticalDamageAura) multiplier *= 1.5;
                        if (this.pokemon?.item?.id == 'clover') multiplier *= 1.3;
                        finalDamage = Math.ceil(finalDamage * multiplier);
                    }

                    if (
                        this.main.area.weather == 'rain' &&
                        (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle'))
                    ) {
                        finalDamage = Math.ceil(finalDamage * 1.2);
                    }

                    if (this.pokemon?.item?.id === 'blueBandana') {
                        finalDamage = Math.ceil(finalDamage * (1 + this.critical * 0.01));
                    }

                    enemy.getDamaged(finalDamage, 'physical', this.pokemon.ability, isCritical, new Set(), this.pokemon, this);

                    if (isCritical && this.pokemon?.item?.id == 'razorClaw' && enemy.canSlow) enemy.applyStatusEffect({ type: 'slow', duration: 0.2, slowPercent: 0.5 })

                    if (
                        enemy.canBurn && 
                        (this.ability.id === 'burnNerf' && (Math.random() < 0.5 || this.pokemon?.item?.id == 'heatRock')) ||
                        this.pokemon?.item?.id == 'scovillainSiracha'
                    ) {
                        if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
                        else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
                        else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);
                    }
                    if (enemy.canPoison && this.ability && this.ability.id === 'poison') {
                        enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.pokemon);
                        if (this.pokemon?.item?.id == 'toxicOrb' || (this.pokemon?.item?.id == 'poisonBarb' && Math.random() < 0.5)) enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.pokemon);
                    }  
                    if (enemy.canStun && this.ability && this.ability.id === 'stunArea' && Math.random() < 0.3) {
                        (this.pokemon?.item?.id == 'lightClay') ? enemy.applyStatusEffect({ type: 'stun', duration: 1.65 }) : enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
                    }
                    if (enemy.canSlow && this.ability && this.ability.id === 'slow') {
                        if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'slow', duration: 2.2, slowPercent: 0.5 })
                        else if (this.pokemon?.item?.id == 'berryJuice') enemy.applyStatusEffect({ type: 'slow', duration: 2, slowPercent: 0.37 });
                        else enemy.applyStatusEffect({ type: 'slow', duration: 2, slowPercent: 0.5 });
                    }
                    if (this.ability.id === 'curse') enemy.applyStatusEffect({ type: 'curse' });
                });

                // Only trigger pulse visual once per frame
                if (!areaFiredThisFrame) {
                    this.pulse.active = true;
                    this.pulse.radius = 0;
                    this.pulse.alpha = 0.7;
                    this.pulse.maxRadius = this.range;
                    this.pulse.speed = this.range / 15;
                }
                areaFiredThisFrame = true;
                areaAttacksThisFrame++;
                this.attackCooldown += areaAttackSpeed;
            }

            if (this.pulse.active) {
                this.ctx.beginPath();
                this.ctx.arc(this.center.x, this.center.y, this.pulse.radius, 0, Math.PI * 2);

                const hex = (this.pokemon.specie.color || '#ffffff').replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) || 255;
                const g = parseInt(hex.substring(2, 4), 16) || 255;
                const b = parseInt(hex.substring(4, 6), 16) || 255;

                this.ctx.fillStyle = `rgba(${r},${g},${b},${this.pulse.alpha})`;
                this.ctx.fill();

                this.pulse.radius += this.pulse.speed * frameFactor;
                this.pulse.alpha -= 0.04 * frameFactor;
                if (this.pulse.radius >= this.pulse.maxRadius || this.pulse.alpha <= 0)
                    this.pulse.active = false;
            }
            return;
        }

        // --- TORRES CON PROYECTILES ---
        const isOrbitalTower = this.attackType === 'orbital' || this.pokemon?.attackType === 'orbital' || (this.orbital ?? 0) > 0;
        if (isOrbitalTower && !this.projectiles.some(p => p?.orbit)) this.refreshOrbitalProjectiles();

        // DELTA TIME FIX: Use while loop to allow multiple attacks per frame at high speeds
        let firedThisFrame = false;
        let shotsThisFrame = 0;
        const MAX_SHOTS_PER_FRAME = 50; // Cap to prevent lag spikes while allowing bullet hell
        // Safety: clamp attack speed to minimum 0.01ms to prevent infinite loops while allowing extreme fire rates
        const attackSpeed = Math.max(0.01, this.speed * (this.snowCloakNear ? 1.5 : 1));
        
        while (this.target && this.attackCooldown <= 0 && validEnemies.length > 0 && shotsThisFrame < MAX_SHOTS_PER_FRAME && !isOrbitalTower) {
            let maxShots =
                this.ability && this.ability.id === 'cradily' ? this.main.player.fossilInTeam :
                this.ability && (this.ability.id === 'quadraShot' || this.ability.id === 'quadraShotSand') ? 4 :
                this.ability && this.ability.id === 'tripleShot' ? 3 :
                this.ability && (
                    this.ability.id === 'doubleShot' || 
                    this.ability.id === 'doubleShotSand' || 
                    this.ability.id === 'curseDoubleShot' || 
                    this.ability.id === 'poisonDoubleShot' ||
                    this.ability.id === 'armorBreakDoubleShot' || 
                    this.pokemon?.item?.id == 'zoomLens'
                ) ? 2 : 1;

            if (this.pokemon?.item?.id == 'choiceScarf') maxShots = 1;
            if (this.pokemon?.item?.id == 'zoomLens' && this.pokemon?.ability?.id == 'simple') maxShots = 3;
            if (this.pokemon?.item?.id == 'cherryBlossom') maxShots = 3;

            const orderedAll = this.getOrderedEnemies(validEnemies);

            const targets = [];
            if (this.target && validEnemies.includes(this.target)) targets.push(this.target);

            for (let i = 0; i < orderedAll.length && targets.length < maxShots; i++) {
                const cand = orderedAll[i];
                if (!targets.includes(cand)) targets.push(cand);
            }

            let ricochets = this.ricochet;
            if (this.pokemon?.item?.id == 'stretchySpring') ricochets += 1;

            // static stun
            let skipAttack = false;
            for (const cand of targets) {
                if (cand?.passive?.id === 'static') {
                    const dx = cand.center.x - this.center.x;
                    const dy = cand.center.y - this.center.y;
                    // PERF: squared distance comparison
                    if (dx * dx + dy * dy <= 13225 && Math.random() < 0.25) {  // 115*115=13225. RESTORED: Vanilla values (was 140/0.33)
                        playSound('paralyzed', 'effect');
                        skipAttack = true;
                        break;
                    }
                }
            }

            if (skipAttack) {
                this.attackCooldown += attackSpeed;
                break; // Exit loop on stun
            } else {
               targets.forEach(tgt => {
                    if (!tgt) return;
                    if (this.ability.id === 'solarBeam') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 48 : 24;     
                        const beamDuration = 260;  
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);
                    } if (this.ability.id === 'hyperBeam' && this.hitCount === 4) {
                        if (!this.main.mute[0]) playSound('beam1', 'effect');
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 100 : 50;     
                        const beamDuration = 260;  
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);
                        this.hitCount = 0;
                    } else if (this.ability.id === 'zapCannon') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 16 : 8;     
                        const beamDuration = 260;  
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);
                    } else if (this.ability.id === 'hydroCannon') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };

                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 36 : 18;        
                        const beamDuration = 4000;   
                        const hitCooldown = 390;       
                        const beamOpts = {
                            width: beamWidth,
                            duration: 4000,       
                            hitCooldown: 390,
                            extend: Math.max(this.range, 100),
                            attachedEnemy: tgt,
                            persistOnDeath: true   
                        };

                        const hydro = new Beam(from, to, this, beamOpts);
                        this.beams.push(hydro);
                    } else {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;

                        if (this.pokemon?.ability?.id == 'bubbleBeam' || this.pokemon?.ability?.id == 'hyperDrill') {
                            const amount = (this.pokemon?.ability?.id == 'bubbleBeam') ? 8 : 3;
                            for (let i = 0; i < amount; i++) {
                                setTimeout(() => {
                                    let proj = new Projectile(
                                        this.position.x - 6,
                                        this.position.y + spawnOffsetY - 6,
                                        tgt,
                                        this.ctx,
                                        { ...this.projectile, ricochetsLeft: ricochets },
                                        this
                                    );
                                    this.projectiles.push(proj);
                                    if (!this.main.mute[0]) {
                                        if (this.pokemon?.item?.id == 'subwoofer') {
                                            let bark = Math.floor(Math.random() * 4) + 1;
                                            playSound(`dog${bark}`, 'effect');
                                        } else playSound(this.projectile.effect, 'effect');
                                    }
                                }, i * 100)
                            }
                        } else if (this.pokemon?.ability?.id == 'featherDance') {
                            for (let i = 0; i < this.feathers + 1; i++) {
                                setTimeout(() => {
                                    let proj = new Projectile(
                                        this.position.x - 6,
                                        this.position.y + spawnOffsetY - 6,
                                        tgt,
                                        this.ctx,
                                        { ...this.projectile, ricochetsLeft: ricochets },
                                        this
                                    );
                                    this.projectiles.push(proj);
                                    if (!this.main.mute[0]) {
                                        if (this.pokemon?.item?.id == 'subwoofer') {
                                            let bark = Math.floor(Math.random() * 4) + 1;
                                            playSound(`dog${bark}`, 'effect');
                                        } else playSound(this.projectile.effect, 'effect');
                                    }
                                }, i * 100)
                            }
                            this.feathers = 0;
                        } else if (this.pokemon?.item?.id === 'revysBook' && Math.random() < 0.02) {
                            if (!this.main.mute[0]) playSound('beam1', 'effect');
                            const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                            const from = { x: this.center.x, y: this.center.y };
                            const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                            const beamWidth = 25;     
                            const beamDuration = 260;  
                            const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                            this.beams.push(beam);

                        } else {
                            if (this.pokemon?.ability?.id == 'hyperBeam') this.hitCount++;
                            const proj = new Projectile(
                                this.position.x - 6,
                                this.position.y + spawnOffsetY - 6,
                                tgt,
                                this.ctx,
                                { ...this.projectile, ricochetsLeft: ricochets, ...(this.pokemon?.item?.id === 'revysBook' ? { sprite: _randomRevysSprite() } : {}) },
                                this
                            );
                            this.projectiles.push(proj);
                        }
                    }  
                });

                // Only play sound once per frame to avoid audio spam
                if (!firedThisFrame && !this.main.mute[0]) {
                    if (this.pokemon?.item?.id == 'subwoofer') {
                        let bark = Math.floor(Math.random() * 4) + 1;
                        playSound(`dog${bark}`, 'effect');
                    } else playSound(this.projectile.effect, 'effect');
                }
                firedThisFrame = true;
                shotsThisFrame++;
                
                this.attackCooldown += attackSpeed;
            }
        }

        // --- ACTUALIZAR PROYECTILES ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            if (!p) {
                this.projectiles.splice(i, 1);
                continue;
            }

            if (p.markedForDeletion) {
                this.projectiles.splice(i, 1);
                continue;
            }

            if (!(isOrbitalTower || p.orbit) && (!p.enemy || p.enemy.hp <= 0 || (p.enemy.invisible && !(p.tower?.revealInvisible || p.tower?.targetMode === 'invisible')))) {
                this.projectiles.splice(i, 1);
                continue;
            }

            if (typeof p.update === 'function') p.update(deltaTime, shouldDraw); // pasamos delta ya escalado por Game
            if (p.markedForDeletion) this.projectiles.splice(i, 1);
        }
    }

    // MOD: Tower retarget helper - searches from given position (tower center) within maxDist
    findClosestEnemy(fromEnemy, maxDist = 1000) {
        let closest = null;
        // PERF: Use squared distance to avoid Math.hypot per enemy
        let minDistSq = maxDist * maxDist;
        const cw = this.main.game.canvas.width;
        const ch = this.main.game.canvas.height;
        const enemies = this.main.area.enemies;
        for (let i = 0; i < enemies.length; i++) {
            const e = enemies[i];
            if (!e || e === fromEnemy || e.hp <= 0) continue;
            // MOD: Skip off-screen enemies
            const ex = e.center.x;
            const ey = e.center.y;
            if (ex < 0 || ex > cw || ey < 0 || ey > ch) continue;
            const dx = ex - fromEnemy.center.x;
            const dy = ey - fromEnemy.center.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDistSq) {
                minDistSq = dSq;
                closest = e;
            }
        }
        return closest;
    }

    dealDirectDamage(enemy, source = 'physical') { 
        if (!enemy || enemy.hp <= 0) return;

        let finalDamage = this.projectile.power;

        if (this.ability?.id == 'shiftGear') {
            (this.pokemon?.item?.id == 'lustrousOrb') ? this.shiftGearSpeed += 0.06 : this.shiftGearSpeed += 0.03;
            this.projectiles.forEach(proj => {
                proj.angularSpeed = Math.min(5, this.shiftGearSpeed);
            })
        }

        if (['quickPowder', 'quickClaw', 'zoomLens', 'scovillainSiracha'].includes(this.pokemon?.item?.id)) finalDamage -= Math.ceil(this.power / 2);
        if (['laggingTail'].includes(this.pokemon?.item?.id)) finalDamage += Math.ceil(this.power / 2);

        if (['metalPowder', 'lifeOrb'].includes(this.pokemon?.item?.id)) finalDamage += Math.ceil(this.power / 2);
        if (this.pokemon?.item?.id == 'hardStone') finalDamage += Math.floor(finalDamage * 0.25);
        if (this.pokemon?.item?.id == 'eviolite' && this.pokemon?.lvl <= 50) finalDamage += Math.floor(finalDamage * 0.2);
        // Critical
        let isCritical = false;
        let critical = this.critical ?? 0;
        if (this.criticalAura) critical += 10;
        if (this.pokemon?.item?.id == 'direHit') critical += 10;

        if ((Math.random() * 100) < critical && this.tower?.pokemon?.item?.id != 'blueBandana') {
            isCritical = true;
            let multiplier = (this.ability?.id === 'superCritical') ? 2.0 : 1.5;
            if (this.criticalDamageAura) multiplier *= 1.5;
            if (this.pokemon?.item?.id == 'clover') multiplier *= 1.3;
            if (this.main?.area?.weather == 'hail') multiplier *= 1.1;
            finalDamage = Math.ceil(finalDamage * multiplier);
        }

        if (this.pokemon?.item?.id === 'blueBandana') {
            finalDamage = Math.ceil(finalDamage * (1 + this.critical * 0.01));
        }

        if (this.pokemon?.item?.id === 'ovalCharm') {
            let ovalCharmMultiplier = (10 - this.main.team.pokemon.length) * 12.5;
            finalDamage += Math.ceil((finalDamage * ovalCharmMultiplier) / 100);
        }

        // WEATHER / TERRAIN
        if (
            this.main.area.weather == 'rain' &&
            (this.tile?.land == 3 || (this.tile?.land == 1 && this.pokemon?.item?.id == 'squirtBottle'))
        ) {
            finalDamage = Math.ceil(finalDamage * 1.2);
        }

        if (
            this.main.area.weather == 'heavyRain' && this.pokemon?.item?.id != 'safetyGoggles' &&
            (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle'))
        ) {
            finalDamage = Math.ceil(finalDamage * 0.5);
        }

        // ESTADOS
        if (enemy.canBurn && this.pokemon.ability?.id === 'flameWheel' && Math.random() < 0.5) {
            if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
            else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
            else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);     
        }

        if (enemy.canSlow && this.pokemon.ability?.id === 'waterBubble') {
            if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2.2 }) 
            else enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
        }

        if (enemy.canStun && this.pokemon.ability?.id  === 'zapCannon' && Math.random() < 0.2) {
            if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'stun', duration: 1.65 });
            else enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
        }

        // OTROS EFECTOS
        if (isCritical && this.pokemon?.item?.id === 'razorClaw' && enemy.canSlow) {
            enemy.applyStatusEffect({ type: 'slow', duration: 0.2, slowPercent: 0.5 });
        }
        if (this.pokemon?.item?.id === 'magnet' && enemy.canSlow && enemy.armor > 0) {
            enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 1 });
        }
        if (this.pokemon?.item?.id === 'scovillainSiracha' && enemy.canBurn) {
            enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);    
        }

        if (this.pokemon?.ability?.id === 'hyperBeam') finalDamage *= 3;
        // aplicar daño con el método del enemigo
        enemy.getDamaged(finalDamage, source, this.pokemon.ability, isCritical, new Set(), this.pokemon, this);
    }

    getOrderedEnemies(validEnemies) {
        if (!validEnemies || validEnemies.length === 0) return [];

        const arr = validEnemies.slice();

        const hasStatus = (e, type) => e.statusEffects && e.statusEffects.some(se => se.type === type);
        if (this.pokemon?.item?.id == 'quickClaw' && this.ability.id !== 'defiant') this.targetMode = 'faster';

        switch (this.targetMode) {
            case 'invisible':
                arr.sort((a, b) => Number(b.invisible === true) - Number(a.invisible === true));
                break;
            case 'first':
                arr.sort((a, b) => (b.distanceTraveled || 0) - (a.distanceTraveled || 0)); // m├ís recorrido primero
                break;
            case 'last':
                arr.sort((a, b) => (a.distanceTraveled || 0) - (b.distanceTraveled || 0)); // menos recorrido primero
                break;
            case 'faster':
                arr.sort((a, b) => (b.speed || 0) - (a.speed || 0));
                break;
            case 'slower':
                arr.sort((a, b) => (a.speed || 0) - (b.speed || 0));
                break;
            case 'highHP':
                arr.sort((a, b) => (b.hp || 0) - (a.hp || 0));
                break;
            case 'lowHP':
                arr.sort((a, b) => (a.hp || 0) - (b.hp || 0));
                break;
            case 'highArmor':
                arr.sort((a, b) => (b.armor || 0) - (a.armor || 0));
                break;
            case 'noArmor':
                arr.sort((a, b) => Number(a.armor <= 0) - Number(b.armor <= 0));
                break;
            case 'poisoned':
                arr.sort((a, b) => Number(hasStatus(b, 'poison')) - Number(hasStatus(a, 'poison')));
                break;
            case 'notPoisoned':
                arr.sort((a, b) => Number(!hasStatus(b, 'poison')) - Number(!hasStatus(a, 'poison')));
                break;
            case 'burned':
                arr.sort((a, b) => Number(hasStatus(b, 'burn')) - Number(hasStatus(a, 'burn')));
                break;
            case 'notBurned':
                arr.sort((a, b) => Number(!hasStatus(b, 'burn')) - Number(!hasStatus(a, 'burn')));
                break;
            case 'stuned':
                arr.sort((a, b) => Number(hasStatus(b, 'stun')) - Number(hasStatus(a, 'stun')));
                break;
            case 'notStuned':
                arr.sort((a, b) => Number(!hasStatus(b, 'stun')) - Number(!hasStatus(a, 'stun')));
                break;
            case 'slowed':
                arr.sort((a, b) => Number(hasStatus(b, 'slow')) - Number(hasStatus(a, 'slow')));
                break;
            case 'notSlowed':
                arr.sort((a, b) => Number(!hasStatus(b, 'slow')) - Number(!hasStatus(a, 'slow')));
                break;
            case 'cursed':
                arr.sort((a, b) => Number(hasStatus(b, 'curse')) - Number(hasStatus(a, 'cursed')));
                break;
            case 'curseable':
                arr.sort((a, b) => Number(!hasStatus(b, 'curse')) - Number(!hasStatus(a, 'cursed')));
                break;
            case 'nightmared':
                arr.sort((a, b) => Number(hasStatus(b, 'nightmare')) - Number(hasStatus(a, 'nightmare')));
                break;
            case 'random':
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
                break;
            default:
                break;
        }

        return arr;
    }

    getTarget(validEnemies) {
        if (!validEnemies || validEnemies.length === 0) return null;
        if (this.pokemon?.item?.id == 'quickClaw' && this.ability.id !== 'defiant') this.targetMode = 'faster';

        switch (this.targetMode) {
            case 'invisible':
                return validEnemies.find(e => e.invisible) || validEnemies[0];
            case 'first':
                return validEnemies.reduce((prev, curr) =>
                    curr.distanceTraveled > prev.distanceTraveled ? curr : prev
                );
            case 'last':
                return validEnemies.reduce((prev, curr) =>
                    curr.distanceTraveled < prev.distanceTraveled ? curr : prev
                );
            case 'faster':
                return validEnemies.reduce((prev, curr) => curr.speed > prev.speed ? curr : prev);
            case 'slower':
                return validEnemies.reduce((prev, curr) => curr.speed < prev.speed ? curr : prev);
            case 'highHP':
                return validEnemies.reduce((prev, curr) => (curr.hp > prev.hp ? curr : prev));
            case 'lowHP':
                return validEnemies.reduce((prev, curr) => (curr.hp < prev.hp ? curr : prev));
            case 'highArmor':
                return validEnemies.reduce((prev, curr) => (curr.armor > prev.armor ? curr : prev), validEnemies[0]);
            case 'noArmor':
                return validEnemies.find(e => e.armor <= 0) || validEnemies[0];
            case 'poisoned':
                return validEnemies.find(e => e.statusEffects.some(s => s.type === 'poison')) || validEnemies[0];
            case 'notPoisoned':
                return validEnemies.find(e =>
                    e.canPoison !== false && !e.statusEffects.some(s => s.type === 'poison')
                ) || validEnemies[0];
            case 'burned':
                return validEnemies.find(e => e.statusEffects.some(s => s.type === 'burn')) || validEnemies[0];
            case 'notBurned':
                return validEnemies.find(e =>
                    e.canBurn !== false && !e.statusEffects.some(s => s.type === 'burn')
                ) || validEnemies[0];
            case 'stuned':
                return validEnemies.find(e => e.statusEffects.some(s => s.type === 'stun')) || validEnemies[0];
            case 'notStuned':
                return validEnemies.find(e =>
                    e.canStun !== false && !e.statusEffects.some(s => s.type === 'stun')
                ) || validEnemies[0];
            case 'slowed':
                return validEnemies.find(e => e.statusEffects.some(s => s.type === 'slow')) || validEnemies[0];
            case 'notSlowed':
                return validEnemies.find(e =>
                    e.canSlow !== false && !e.statusEffects.some(s => s.type === 'slow')
                ) || validEnemies[0];
            case 'cursed':
                return validEnemies.find(e =>
                    e.statusEffects.some(s => s.type === 'curse')
                ) || validEnemies[0];
            case 'curseable':
                return validEnemies.find(e =>
                    !e.statusEffects.some(s => s.type === 'curse')
                ) || validEnemies[0];
            case 'nightmared':
                return validEnemies.find(e =>
                    e.statusEffects.some(s => s.type === 'nightmare')
                ) || validEnemies[0];
            case 'random':
                return validEnemies[Math.floor(Math.random() * validEnemies.length)];
            default:
                return validEnemies[0];
        }
    }

    tryTeleport() {
        if (this.pokemon?.item?.id == 'twistedSpoon') {
            if (!this.main.mute[1]) playSound('teleport', 'effect');
            (!this.teleportBuff) ? this.teleportBuff = 2 : this.teleportBuff++;
        } else {
            const tiles = this.main.area.placementTiles.filter(tile => (tile.tower === false && [1, 2, 4].includes(tile.land)))
            const tile = tiles[Math.floor(Math.random() * tiles.length)];

            const index = this.main.area.towers.findIndex((tower) => tower.pokemon == this.pokemon);
            if (index !== -1) {
                this.main.area.towers[index].tile.tower = false;
                this.main.area.towers[index].pokemon.tilePosition = -1;
                this.main.area.towers.splice(index, 1);
            }

            const indexTeam = this.main.team.pokemon.findIndex((pokemon) => pokemon == this.pokemon);

            (!this.teleportBuff) ? this.teleportBuff = 2 : this.teleportBuff++;

            if (!this.main.mute[1]) playSound('teleport', 'effect');
            this.main.area.towers.push(
                new Tower(
                    this.main,
                    tile.position.x,
                    tile.position.y,
                    this.main.game.ctx,
                    this.main.team.pokemon[indexTeam],
                    tile, 
                    this.teleportBuff
                )
            );

            tile.tower = this.main.team.pokemon[indexTeam];
            this.main.team.pokemon[indexTeam].isDeployed = true;
            this.main.UI.updatePokemon();
            this.main.area.recalculateAuras();
        }
    }
}

class Beam {
    constructor(from, to, tower, options = {}) {
        this.tower = tower;
        this.ctx = tower.ctx;

        this.from = { x: from.x, y: from.y };

        this.attachedEnemy = options.attachedEnemy ?? null;
        this.persistOnDeath = options.persistOnDeath ?? false;

        if (this.attachedEnemy && this.attachedEnemy.center) {
            this.to = { x: this.attachedEnemy.center.x, y: this.attachedEnemy.center.y };
        } else {
            this.to = { x: to.x, y: to.y };
        }

        this.width = options.width ?? 10;
        this.duration = options.duration ?? 260;
        this.elapsed = 0;
        this.alpha = 1;
        this.hitCooldown = options.hitCooldown ?? 300;
        this.maxExtend = options.extend ?? 2000;
        this.active = true;
        this.simulatedTime = 0;

        this.perEnemyLastHit = new WeakMap();
        this.pairKey = options.pairKey ?? null;
        this._lockedToLastPos = false;

        this._recomputeDirection();
        this.applyHits();
    }

    _recomputeDirection() {
        const fx = this.from.x;
        const fy = this.from.y;

        if (this._lockedToLastPos) {
            const dx0 = this.to.x - fx;
            const dy0 = this.to.y - fy;
            const norm0 = Math.hypot(dx0, dy0) || 1;
            this.dir = { x: dx0 / norm0, y: dy0 / norm0 };
            this.extendedTo = { x: fx + this.dir.x * this.maxExtend, y: fy + this.dir.y * this.maxExtend };
            return;
        }

        if (this.attachedEnemy) {
            if (this.attachedEnemy.hp > 0) {
                this.to.x = this.attachedEnemy.center.x;
                this.to.y = this.attachedEnemy.center.y;
            } else {
                if (this.persistOnDeath) {
                    this._lockedToLastPos = true;
                    if (this.attachedEnemy.center) {
                        this.to.x = this.attachedEnemy.center.x;
                        this.to.y = this.attachedEnemy.center.y;
                    }
                    this.attachedEnemy = null;
                } else {
                    this.active = false;
                    return;
                }
            }
        }

        const tx = this.to.x;
        const ty = this.to.y;

        const dx = tx - fx;
        const dy = ty - fy;
        const norm = Math.hypot(dx, dy) || 1;
        this.dir = { x: dx / norm, y: dy / norm };

        this.extendedTo = {
            x: fx + this.dir.x * this.maxExtend,
            y: fy + this.dir.y * this.maxExtend
        };
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const vx = x2 - x1; const vy = y2 - y1;
        const wx = px - x1; const wy = py - y1;
        const c1 = vx * wx + vy * wy;
        if (c1 <= 0) return Math.hypot(px - x1, py - y1);
        const c2 = vx * vx + vy * vy;
        if (c2 <= c1) return Math.hypot(px - x2, py - y2);
        const b = c1 / c2;
        const bx = x1 + b * vx; const by = y1 + b * vy;
        return Math.hypot(px - bx, py - by);
    }

    applyHits() {
        if (!this.tower || !this.tower.main) return;
        const enemies = this.tower.main.area.enemies;
        const now = this.simulatedTime;

        this._recomputeDirection();
        if (!this.active) return;

        const x1 = this.from.x;
        const y1 = this.from.y;
        const x2 = this.extendedTo.x;
        const y2 = this.extendedTo.y;

        for (const e of enemies) {
            if (!e || e.hp <= 0 || e.invulnerable) continue;
            if (e.invisible && !(this.tower.revealInvisible || this.tower.targetMode === 'invisible')) continue;

            const dist = this.pointToSegmentDistance(e.center.x, e.center.y, x1, y1, x2, y2);
            const enemySize = Math.max(e.width ?? 12, e.height ?? 12);
            const tolerance = (this.width / 2) + (enemySize / 4);

            if (dist <= tolerance) {
                const last = this.perEnemyLastHit.get(e) || 0;
                if (now - last >= this.hitCooldown) {
                    try {
                        if (typeof this.tower.dealDirectDamage === 'function') {
                            this.tower.dealDirectDamage(e);
                        } else {
                            let dmg = this.tower.projectile?.power ?? this.tower.basePower ?? this.tower.power ?? 1;
                            e.getDamaged(dmg, 'special', this.tower.pokemon.ability, false, new Set(), this.tower.pokemon, this.tower);
                        }
                    } catch (err) {
                        let dmg = this.tower.projectile?.power ?? this.tower.basePower ?? this.tower.power ?? 1;
                        e.getDamaged(dmg, 'special', this.tower.pokemon.ability, false, new Set(), this.tower.pokemon, this.tower);
                    }

                    this.perEnemyLastHit.set(e, now);
                }
            }
        }
    }

    update(delta) {
        if (!this.active) return;

        this.elapsed += delta;
        this.simulatedTime += delta;
        if (this.elapsed >= this.duration) {
            this.active = false;
            return;
        }

        if (this.attachedEnemy && this.attachedEnemy.hp <= 0) {

        }

        this._recomputeDirection();
        if (!this.active) return;

        this.applyHits();

        this.alpha = Math.max(0, 1 - (this.elapsed / this.duration));
    }

    draw() {
        if (!this.ctx || !this.from || !this.extendedTo) return;
        const ctx = this.ctx;

        // Extraer color base del Pokémon
        const hex = (this.tower.pokemon.specie.color || '#ffcc00').replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16) || 255;
        const g = parseInt(hex.substring(2, 4), 16) || 204;
        const b = parseInt(hex.substring(4, 6), 16) || 0;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        if (['solarBeam', 'zapCannon', 'hyperBeam'].includes(this.tower.ability.id) || this.tower?.pokemon?.item?.id === 'revysBook') {
            const currentWidth = this.width * (0.5 + this.alpha * 0.5);

            // 1. Brillo exterior (Glow)
            ctx.shadowBlur = 15 * this.alpha;
            ctx.shadowColor = `rgba(${r},${g},${b}, ${0.9 * this.alpha})`;
            ctx.strokeStyle = `rgba(${r},${g},${b}, ${0.35 * this.alpha})`;
            ctx.lineWidth = currentWidth * 2.5;
            this.drawPath(ctx);

            // 2. Cuerpo del rayo
            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(${r},${g},${b}, ${0.95 * this.alpha})`;
            ctx.lineWidth = currentWidth;
            this.drawPath(ctx);

            // 3. Núcleo blanco incandescente
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * this.alpha})`;
            ctx.lineWidth = currentWidth * 0.4;
            this.drawPath(ctx);

        } else if (this.tower.ability.id === 'hydroCannon') {
            const t = (Date.now() / 150) % 1000; 
            const dist = Math.hypot(this.extendedTo.x - this.from.x, this.extendedTo.y - this.from.y);
            const angle = Math.atan2(this.extendedTo.y - this.from.y, this.extendedTo.x - this.from.x);
            
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.strokeStyle = `rgba(30, 120, 255, ${0.5 * this.alpha})`;
            ctx.lineWidth = this.width * 1.5 * this.alpha;
            this.drawPath(ctx); 

            const drawSpiral = (offset, color, size, speed) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = size * this.alpha;
                
                for (let i = 0; i <= dist; i += 8) {
                  
                    const rotation = i * 0.05 - t * speed;
                    const wave = Math.sin(rotation + offset) * (12 + i * 0.02); 
                    
                    const px = this.from.x + Math.cos(angle) * i - Math.sin(angle) * wave;
                    const py = this.from.y + Math.sin(angle) * i + Math.cos(angle) * wave;
                    
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.stroke();
            };

            drawSpiral(0, `rgba(100, 200, 255, ${0.7 * (this.alpha + 0.3)})`, 6, 1.5);
            
            ctx.globalCompositeOperation = 'lighter';
            drawSpiral(Math.PI, `rgba(255, 255, 255, ${0.6 * (this.alpha + 0.3)})`, 3, 1.5);

            ctx.beginPath();
            ctx.setLineDash([10, 40]);
            ctx.lineDashOffset = -t * 30;
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.4 * (this.alpha + 0.3)})`;
            ctx.lineWidth = 2;
            this.drawPath(ctx);
            
            ctx.setLineDash([]);
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.restore();
    }

    drawPath(ctx) {
        ctx.beginPath();
        ctx.moveTo(this.from.x, this.from.y);
        ctx.lineTo(this.extendedTo.x, this.extendedTo.y);
        ctx.stroke();
    }
}

export class LinkBeam {
    constructor(fromTower, toTower, options = {}) {
        this.fromTower = fromTower;
        this.toTower = toTower;
        this.ctx = fromTower.ctx;
        this.width = options.width ?? 8;
        this.hitCooldown = options.hitCooldown ?? 300; 
        this.maxRange = options.maxRange ?? 1000;
        this.color = options.color ?? (fromTower.pokemon?.specie?.color || '#ff6600');

        this.perEnemyLastHit = new WeakMap();

        const getKeyId = t => t?.uid ?? (`tile-${t?.tile?.id ?? Math.random()}`);
        const a = getKeyId(fromTower);
        const b = getKeyId(toTower);
        this.pairKey = (a < b) ? `${a}-${b}` : `${b}-${a}`;

        this.active = true;
    }

    pointToSegmentDistance(px, py, x1, y1, x2, y2) {
        const vx = x2 - x1; const vy = y2 - y1;
        const wx = px - x1; const wy = py - y1;
        const c1 = vx * wx + vy * wy;
        if (c1 <= 0) return Math.hypot(px - x1, py - y1);
        const c2 = vx * vx + vy * vy;
        if (c2 <= c1) return Math.hypot(px - x2, py - y2);
        const b = c1 / c2;
        const bx = x1 + b * vx; const by = y1 + b * vy;
        return Math.hypot(px - bx, py - by);
    }

    applyHits() {
        if (!this.fromTower || !this.toTower) return;
        const enemies = this.fromTower.main.area.enemies;
        const now = Date.now();

        const from = this.fromTower.center;
        const to = this.toTower.center;

        for (const e of enemies) {
            if (!e || e.hp <= 0 || e.invulnerable) continue;
            if (e.invisible && !(this.fromTower.revealInvisible || this.fromTower.targetMode === 'invisible')) continue;

            const dist = this.pointToSegmentDistance(e.center.x, e.center.y, from.x, from.y, to.x, to.y);
            const enemySize = Math.max(e.width ?? 12, e.height ?? 12);
            const tolerance = (this.width / 2) + (enemySize / 4);

            if (dist <= tolerance) {
                const last = this.perEnemyLastHit.get(e) || 0;
                if (now - last >= this.hitCooldown) {
                    this.toTower.dealDirectDamage(e, 'link');
                    this.fromTower.dealDirectDamage(e, 'link');
                    this.perEnemyLastHit.set(e, now);
                }
            }
        }
    }

    update(delta) {
        const areaTowers = this.fromTower?.main?.area?.towers || [];

        if (!this.fromTower || !this.toTower) {
            this.active = false;
            return;
        }

        if (!areaTowers.includes(this.fromTower) || !areaTowers.includes(this.toTower)) {
            this.active = false;
            return;
        }

        const fp = this.fromTower.pokemon?.tilePosition;
        const tp = this.toTower.pokemon?.tilePosition;
        if (fp === undefined || tp === undefined || fp === -1 || tp === -1) {
            this.active = false;
            return;
        }

        this.from = this.fromTower.center;
        this.to = this.toTower.center;

        this.applyHits();
    }

    draw() {
        if (!this.ctx || !this.from || !this.to) return;
        const ctx = this.ctx;
        const now = Date.now();

        const colorPlusle = { r: 255, g: 107, b: 77 }; 
        const colorMinun = { r: 77, g: 178, b: 255 }; 

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const grad = ctx.createLinearGradient(this.from.x, this.from.y, this.to.x, this.to.y);
        
        const shift = (Math.sin(now * 0.003) + 1) / 2;
        
        grad.addColorStop(Math.max(0, shift - 0.4), `rgba(${colorPlusle.r},${colorPlusle.g},${colorPlusle.b}, 0.6)`);
        grad.addColorStop(Math.min(1, shift + 0.4), `rgba(${colorMinun.r},${colorMinun.g},${colorMinun.b}, 0.6)`);

        ctx.shadowBlur = 6; 
        ctx.shadowColor = shift > 0.5 ? `rgba(${colorMinun.r},${colorMinun.g},${colorMinun.b}, 0.4)` : `rgba(${colorPlusle.r},${colorPlusle.g},${colorPlusle.b}, 0.4)`;
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.width * 1.5;
        ctx.globalAlpha = 0.3;
        this.drawZappedLine(ctx, this.from, this.to, 3, now);

        ctx.shadowBlur = 0; 
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = this.width * 0.8;
        this.drawZappedLine(ctx, this.from, this.to, 2, now + 50);

        ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        ctx.lineWidth = Math.max(1, this.width * 0.25);
        this.drawZappedLine(ctx, this.from, this.to, 1, now + 100);

        ctx.restore();
    }

    drawZappedLine(ctx, from, to, deviation, seed) {
        const segments = 8;
        const angle = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            let px = from.x + (to.x - from.x) * t;
            let py = from.y + (to.y - from.y) * t;

            // Vibración reducida
            const offset = Math.sin(seed * 0.008 + i) * deviation;
            
            px += Math.cos(angle) * offset;
            py += Math.sin(angle) * offset;

            ctx.lineTo(px, py);
        }

        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }
}
export class SpikeZone {
    constructor(position, tower, options = {}) {
        this.x = position.x;
        this.y = position.y;
        this.tower = tower;
        this.ctx = tower.ctx || (tower.main && tower.main.game && tower.main.game.ctx);

        this.radius = options.radius ?? 40;

        this.totalDuration = options.duration ?? 5000; // ms total
        this.remaining = this.totalDuration;

        this.tickRate = options.tickRate ?? 400; // ms entre ticks de daño
        this.tickAccum = 0;

        this.active = true;
    }

    _inRange(enemy) {
        const dx = enemy.center.x - this.x;
        const dy = enemy.center.y - this.y;
        return Math.hypot(dx, dy) <= this.radius;
    }

    update(delta = 0) {
        if (!this.active) return;

        const dt = Number.isFinite(delta) ? delta : 0;

        this.remaining -= dt;
        if (this.remaining <= 0) {
            this.active = false;
            return;
        }

        this.tickAccum += dt;
        if (this.tickAccum < this.tickRate) return;

        // consume solo un tick por frame; si prefieres recuperar ticks perdidos, cambia a while(...)
        this.tickAccum %= this.tickRate;

        const enemies = this.tower.main.area.enemies;
        for (const e of enemies) {
            if (!e || e.hp <= 0 || e.invulnerable) continue;
            if (e.invisible && !(this.tower.revealInvisible || this.tower.targetMode === 'invisible')) continue;
            if (!this._inRange(e)) continue;

            this.tower.dealDirectDamage(e);
        }
    }

    draw() {
        if (!this.active || !this.ctx) return;

        const lifeRatio = Math.max(0, this.remaining / this.totalDuration);
        const alpha = lifeRatio > 0.1 ? 1.0 : lifeRatio / 0.1;

        const now = Date.now();

        this.ctx.save();
        this.ctx.translate(this.x, this.y);

        const bounceScale = 1 + Math.sin(now / 800) * 0.01;
        this.ctx.scale(bounceScale, bounceScale);

        this.ctx.rotate((now / 6000) % (Math.PI * 2));

        const numTriangles = 24;
        const spikeHeight = 6;

        this.ctx.beginPath();
        for (let i = 0; i < numTriangles; i++) {
            const angle = (i * Math.PI * 2) / numTriangles;
            const nextAngle = ((i + 1) * Math.PI * 2) / numTriangles;
            const midAngle = (angle + nextAngle) / 2;
            const tx = Math.cos(midAngle) * (this.radius + spikeHeight);
            const ty = Math.sin(midAngle) * (this.radius + spikeHeight);
            const bx = Math.cos(nextAngle) * this.radius;
            const by = Math.sin(nextAngle) * this.radius;

            if (i === 0) this.ctx.moveTo(Math.cos(angle) * this.radius, Math.sin(angle) * this.radius);
            this.ctx.lineTo(tx, ty);
            this.ctx.lineTo(bx, by);
        }
        this.ctx.closePath();

        const bgGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius + spikeHeight);
        bgGrad.addColorStop(0, `rgba(60, 45, 30, 0)`);
        bgGrad.addColorStop(0.8, `rgba(80, 55, 40, ${alpha * 0.25})`);
        bgGrad.addColorStop(1, `rgba(45, 35, 25, ${alpha * 0.4})`);
        this.ctx.fillStyle = bgGrad;
        this.ctx.fill();

        this.ctx.strokeStyle = `rgba(120, 95, 70, ${alpha})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke();

        const numSpikes = 12;
        for (let i = 0; i < numSpikes; i++) {
            const angle = (i * Math.PI * 2) / numSpikes;
            const sAlpha = 0.4 + (0.6 * Math.sin(angle + (now / 300)));
            this.ctx.strokeStyle = `rgba(180, 150, 120, ${alpha * sAlpha})`;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(Math.cos(angle) * (this.radius - 2), Math.sin(angle) * (this.radius - 2));
            this.ctx.lineTo(Math.cos(angle) * (this.radius * 0.4), Math.sin(angle) * (this.radius * 0.4));
            this.ctx.stroke();
        }

        this.ctx.restore();
    }
}

function _randomRevysSprite() {
    return _REVYS_SPRITES[Math.floor(Math.random() * _REVYS_SPRITES.length)].sprite;
}
