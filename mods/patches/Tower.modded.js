import { Projectile } from './Projectile.js';
import { Sprite } from '../../utils/Sprite.js';
import { playSound } from '../../file/audio.js';

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

        this.ability = pokemon.ability;
        this.rangeType = pokemon.rangeType;
        this.attackType = pokemon.attackType;
        this.basePower = pokemon.power;
        this.power = this.basePower;
        this.range = undefined;
        this.target = null;
        this.cadence = 0;

        this.speed = pokemon.speed;      
        this.attackSpeed = this.speed;

        this.isPassenger = false;
        this.passengerYOffset = -12;

        // HABILIDADES
        this.ricochet = pokemon.ricochet;
        this.revealInvisible = (this.ability.id === 'frisk' || this.ability.id === 'vigilantFrisk' || pokemon?.item?.id == 'silphScope') ? true : false;
        this.damageBoost = 0;
        this.speedBoost = 0;
        this.teleport = 0;
        this.teleportBuff = teleportBuff;
        this.moxieBuff = 0;
        this.lightningRodCharge = 0;
        this.lightningRodChargeCD = 0;

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

        this.castformTransform();

        if (this.pokemon?.item?.id == 'bicycle') {
            this.projectile.sprite = { image: this.pokemon.item.sprite, frames: 1 };
            this.projectile.effect = 'ding';
        }
    }

    castformTransform() {
        if (this.pokemon.specie.id == 61) {
            if (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger) this.updateTowerSprite(this.pokemon.sprite.imageGrass, this.pokemon.sprite.framesGrass, this.pokemon.specie.projectileGrass);
            else if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')) this.updateTowerSprite(this.pokemon.sprite.imageWater, this.pokemon.sprite.framesWater, this.pokemon.specie.projectileWater);
            else if (this.tile.land == 4 || (this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit')) this.updateTowerSprite(this.pokemon.sprite.imageMountain, this.pokemon.sprite.framesMountain, this.pokemon.specie.projectileMountain);      
        } else if (this.pokemon?.adn?.id == 61) {
            if (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger) this.updateTowerSprite(this.pokemon.adn.sprite.imageGrass, this.pokemon.adn.sprite.framesGrass, this.pokemon.adn.projectileGrass);
            else if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')) this.updateTowerSprite(this.pokemon.adn.sprite.imageWater, this.pokemon.adn.sprite.framesWater, this.pokemon.adn.projectileWater);
            else if (this.tile.land == 4 || (this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit')) this.updateTowerSprite(this.pokemon.adn.sprite.imageMountain, this.pokemon.adn.sprite.framesMountain, this.pokemon.adn.projectileMountain);      
        }

        if (this.pokemon.specie.id == 102) {
            if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')) this.updateTowerSprite(this.pokemon.sprite.imageWater, this.pokemon.sprite.framesWater, this.pokemon.specie.projectile);
        } else if (this.pokemon?.adn?.id == 102) {
            if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle')) this.updateTowerSprite(this.pokemon.sprite.imageWater, this.pokemon.sprite.framesWater, this.pokemon.specie.projectile);
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
        this.critical = this.pokemon.critical;
        this.range = this.pokemon.range;
        this.innerRange = this.pokemon.innerRange;
        this.ability = this.pokemon.ability;
        this.projectile.sprite = this.pokemon.projectile.sprite;
        this.projectile.effect = this.pokemon.specie.projectileSound;

        // volver a aplicar efectos de terreno y recalcular power real
        this.setTowerStats();
        this.recalculatePower();

        // si la torre tiene proyectiles activos -> actualizarlos tambien por si acaso xd
        this.projectiles.forEach(p => {
            if (p) p.power = this.projectile.power ?? this.basePower;
        });

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
        this.attackCooldown = Math.min(this.attackCooldown, this.attackSpeed);
       
        if (this.pokemon.id == 65 || this.pokemon?.adn?.id == 65) this.speed -= (500 * this.main.player.fossilInTeam);
        if (this.pokemon?.ability?.id == 'speedBoost') this.speed -= (300 * this.speedBoost);
        if (this.pokemon?.item?.id == 'shieldBreakerBullet') this.speed += 2000;
        if (this.pokemon?.item?.id == 'bindingBand') this.speed += 1500;
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89 && this.pokemon?.lvl == 100 && typeof this.main?.area?.inChallenge.lvlCap !== 'number') this.speed -= 4000;

        if (
            this.pokemon?.item?.id == 'quickClaw' || 
            this.pokemon?.item?.id == 'lifeOrb' ||
            (this.main.area.heartScale && this.pokemon?.item?.id == 'heartScale')
        ) {
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.75) : (this.speed * 0.5);
        }
    
        if (this.pokemon?.item?.id == 'quickPowder') this.speed -= (this.speed / 4);
        if (this.pokemon?.item?.id == 'adrenalineOrb') {
            this.speed -= (this.ability?.id == 'simple') ?
            (this.speed * 0.0375 * (14 - this.main.player.health[this.main.area.routeNumber])) :
            (this.speed * 0.025 * (14 - this.main.player.health[this.main.area.routeNumber]));
        }

        if (this.isPassenger) this.speed -= (this.speed * 0.15);
            
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
        if (this.pokemon?.item?.id == 'wrestlingMask') this.speed -= (this.speed * 0.3);
        if (this.pokemon?.item?.id == 'muscleBand') this.speed += (this.speed * 0.25);

        if (
            this.tile && 
            (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger) 
            && (this.pokemon.ability.id === 'ambusher' || this.pokemon.ability.id === 'castform')) {
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
            (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger)
        ) {
            this.power = Math.ceil(this.basePower * 1.75);
            this.projectile.power = this.power;
        }

        if (this.pokemon.ability.id === 'defeatist' && this.main.player.health[this.main.area.routeNumber] <= 7) {
            this.power = Math.ceil(this.basePower / 2);
            this.projectile.power = this.power;
        }

        if (
            this.tile && 
            (this.tile.land === 4 || this.tile.land  == 1 && this.pokemon?.item?.id == 'hikingKit') && 
            (this.pokemon.ability.id === 'vigilant'|| this.pokemon.ability.id === 'vigilantFrisk' || this.pokemon.ability.id === 'castform')
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

        if (
            this.main.area.weather == 'harshSunlight' &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger)
        ) {
            this.speed = this.pokemon.speed / 2;
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger)
        ) {
            this.speed = this.pokemon.speed * 4;
        }

        if (this.pokemon?.item?.id == 'helixFossil') this.range += this.main.player.fossilInTeam * 10;
        if (this.pokemon?.item?.id == 'oldRod') this.range += 75;
        if (this.pokemon?.item?.id == 'silphScope' && (this.pokemon.ability.id === 'frisk' || this.pokemon.ability.id === 'vigilantFrisk')) this.range += 15;
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
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.75) : (this.speed * 0.5);
        }

        if (this.pokemon?.item?.id == 'shieldBreakerBullet') this.speed += 2000;
        if (this.pokemon?.item?.id == 'bindingBand') this.speed += 1500;
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89 && this.pokemon?.lvl == 100 && typeof this.main?.area?.inChallenge.lvlCap !== 'number') this.speed -= 4000;

        if (this.pokemon?.item?.id == 'quickPowder') this.speed -= (this.speed / 4);
        if (this.pokemon?.item?.id == 'adrenalineOrb') {
            this.speed -= (this.ability?.id == 'simple') ?
            (this.speed * 0.0375 * (14 - this.main.player.health[this.main.area.routeNumber])) :
            (this.speed * 0.025 * (14 - this.main.player.health[this.main.area.routeNumber]));
        }

        if (this.isPassenger) this.speed -= (this.speed * 0.15);

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
        if (this.pokemon?.item?.id == 'wrestlingMask') this.speed -= (this.speed * 0.3);
        if (this.pokemon?.item?.id == 'muscleBand') this.speed += (this.speed * 0.25);

        if (this.pokemon.ability.id === 'defeatist' && this.main.player.health[this.main.area.routeNumber] <= 7) {
            this.power = Math.ceil(this.basePower / 2);
            this.projectile.power = this.power;
        }

        // terreno
        if (this.tile && (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger) && (this.pokemon.ability.id === 'ambusher' || this.pokemon.ability.id === 'castform'))
            this.power = Math.ceil(this.power * 2);
        if (this.tile && (this.tile.land === 4 || this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit') && (this.pokemon.ability.id === 'vigilant' || this.pokemon.ability.id === 'vigilantFrisk' ||this.pokemon.ability.id === 'castform'))
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
            (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger)
        ) {
            this.power = Math.ceil(this.basePower * 1.75);
            this.projectile.power = this.power;
        }

        if (this.pokemon?.item?.id == 'nanabBerry') {
            this.range = this.range * 1.3;
            this.speed += (this.speed / 4);
        }

        if (
            this.main.area.weather == 'harshSunlight' &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger)
        ) {
            this.speed = this.pokemon.speed / 2;
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.isPassenger)
        ) {
            this.speed = this.pokemon.speed * 4;
        }

        if (this.pokemon?.item?.id == 'helixFossil') this.range += this.main.player.fossilInTeam * 10;
        if (this.pokemon?.item?.id == 'oldRod') this.range += 75;
        if (this.pokemon?.item?.id == 'silphScope' && (this.pokemon.ability.id === 'frisk' || this.pokemon.ability.id === 'vigilantFrisk')) this.range += 15;
        if (this.pokemon?.item?.id == 'wrestlingMask') this.range -= 75;
        if (this.pokemon?.item?.id == 'condensedBlizzard') this.range /= 2;
        if (this.pokemon?.item?.id == 'spindaCocktail') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.38 : this.range * 1.25;
        }
        if (this.pokemon?.item?.id == 'ancientShield') this.range = this.range * 1.2;
        if (this.pokemon?.item?.id == 'starCandy') this.range += (this.main.player.stars * 0.1);
       
        const nearbyPowerAuras = this.main.area.towers.filter(t =>
            t.ability?.id === 'powerAura' &&
            t !== this &&
            Math.hypot(
                t.center.x - this.center.x,
                t.center.y - this.center.y
            ) <= t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0) + (t.pokemon?.item?.id === "sunflowerPetal" ? -50 : 0)
        );

        const nearbyTriageAuras = this.main.area.towers.filter(t =>
            t.ability?.id === 'triage' &&
            t !== this &&
            Math.hypot(
                t.center.x - this.center.x,
                t.center.y - this.center.y
            ) <= t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0) 
        );

        const nearbyCriticalAuras = this.main.area.towers.filter(t =>
            t.ability && t.ability.id === 'criticalAura' &&
            t !== this &&
            Math.hypot(t.center.x - this.center.x, t.center.y - this.center.y) <= t.range
        );

        const nearbyCriticalDamageAuras = this.main.area.towers.filter(t =>
            t.ability && t.ability.id === 'criticalDamageAura' &&
            t !== this &&
            Math.hypot(t.center.x - this.center.x, t.center.y - this.center.y) <= t.range
        );


        if (nearbyPowerAuras.length > 0) {
            this.powerAura = (nearbyPowerAuras[0]?.pokemon?.item?.id == 'sunflowerPetal') ? 1.3 : 1.2;
            this.power = Math.ceil(this.power * this.powerAura);

            if (this.pokemon.id == 75 && this.pokemon.lvl > 24 && !this.cherrimForm) {
                this.cherrimForm = true;
                this.updateTowerSprite(this.pokemon.sprite.transform);
            }
        } else {
            this.powerAura = false;
            if (this.pokemon.id == 75 && this.pokemon.lvl > 24 && this.cherrimForm) {
                this.cherrimForm = false;
                this.updateTowerSprite(this.pokemon.sprite.image);
            }
        }

        if (nearbyTriageAuras.length > 0) {
            this.speed -= (this.speed * 0.15);
            this.triageAura = true;
        } else {
            this.triageAura = false;
        }

        if (nearbyCriticalAuras.length > 0) {
            this.criticalAura = true;
        } else {
            this.criticalAura = false;
        }

        if (nearbyCriticalDamageAuras.length > 0) {
            this.criticalDamageAura = true;
        } else {
            this.criticalDamageAura = false;
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
        const offsetX = (tileSize - crop.width) / 2;
        const offsetY = (tileSize - crop.height) / 2;

        // offset visual si es pasajero
        const passengerOffset = this.isPassenger ? this.passengerYOffset : 0;
        this.drawYOffset = passengerOffset;

        // centro visual (usado por auras/pulse/rangos)
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

        // if (this.pokemon?.id === 102) {
        //     const now = Date.now();
        //     const bobbing = Math.sin(now / 250) * 2;
        //     const cx = this.center.x;
        //     const cy = this.center.y + (tileSize * 0.4) + bobbing;

        //     this.ctx.save();

        //     // 1. Sombra din├ímica (se encoge al subir la tabla)
        //     const shadowScale = 1 - (Math.abs(bobbing) * 0.05);
        //     this.ctx.beginPath();
        //     this.ctx.ellipse(cx, cy + 5 - bobbing, 12 * shadowScale, 4 * shadowScale, 0, 0, Math.PI * 2);
        //     this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
        //     this.ctx.fill();

        //     // 2. Efecto de Estela/Part├¡culas (Monedas peque├▒as)
        //     for (let i = 0; i < 3; i++) {
        //         const pOffset = (now + (i * 800)) % 2000 / 2000;
        //         const px = cx - 15 - (pOffset * 20);
        //         const py = cy + (Math.sin(now / 100 + i) * 3);
        //         this.ctx.beginPath();
        //         this.ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        //         this.ctx.fillStyle = `rgba(255, 215, 0, ${1 - pOffset})`;
        //         this.ctx.fill();
        //     }

        //     // 3. Cuerpo de la tabla con grosor (Efecto 3D)
        //     // Parte inferior (borde oscuro)
        //     this.ctx.beginPath();
        //     this.ctx.ellipse(cx, cy + 2, 15, 7, 0, 0, Math.PI * 2);
        //     this.ctx.fillStyle = '#926F12';
        //     this.ctx.fill();

        //     // Parte superior (superficie)
        //     this.ctx.beginPath();
        //     this.ctx.ellipse(cx, cy, 15, 6, 0, 0, Math.PI * 2);
            
        //     // Gradiente met├ílico animado
        //     const shine = Math.sin(now / 500) * 15;
        //     const goldGrad = this.ctx.createLinearGradient(cx - 15 + shine, cy, cx + 15 + shine, cy);
        //     goldGrad.addColorStop(0, '#D4AF37');
        //     goldGrad.addColorStop(0.5, '#FFF5A0'); // Brillo intenso
        //     goldGrad.addColorStop(1, '#B8860B');
            
        //     this.ctx.fillStyle = goldGrad;
        //     this.ctx.fill();
            
        //     // Borde refinado
        //     this.ctx.strokeStyle = '#FFD700';
        //     this.ctx.lineWidth = 1.5;
        //     this.ctx.stroke();

        //     // 4. Detalle: Icono de moneda en el centro de la tabla
        //     this.ctx.beginPath();
        //     this.ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
        //     this.ctx.strokeStyle = 'rgba(139, 101, 8, 0.5)';
        //     this.ctx.stroke();

        //     this.ctx.restore();
            
        //     // Eleva al Pok├⌐mon para que sus pies toquen la superficie
        //     this.drawYOffset -= (5 + bobbing); 
        // }

        if (this.powerAura || this.criticalAura || this.criticalDamageAura || this.triageAura) {
            const now = Date.now();
            const pulse = 1 + 0.08 * Math.sin(now / 180);
            const baseInner = 6;
            const baseOuter = 16;
            const inner = baseInner * pulse;
            const outer = baseOuter * pulse;

            const cx = this.center.x;
            const cy = this.center.y + (tileSize * 0.15);

            // (aura color logic unchanged)
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
                criticalDamage: { inner: 'rgba(255,50,50,0.38)', middle: 'rgba(220,30,30,0.26)', outer: 'rgba(180,0,0,0.16)' }
                // combos se mantienen si quieres
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
                const activeAuras = key.split('+').filter(k => k);
                if (activeAuras.length === 0) colors = auraColors.power;
                else {
                    let r = 0, g = 0, b = 0;
                    activeAuras.forEach(aura => {
                        const base = baseColors[aura];
                        if (base) { r += base.r; g += base.g; b += base.b; }
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
            if (this.triageAura && !this.powerAura && !this.criticalAura && !this.criticalDamageAura) strokeColor = 'rgba(50,180,255,0.14)';
            else if (this.powerAura && !this.criticalAura && !this.triageAura && !this.criticalDamageAura) strokeColor = 'rgba(255,180,50,0.18)';
            else if (this.criticalAura && !this.powerAura && !this.triageAura && !this.criticalDamageAura) strokeColor = 'rgba(180,80,200,0.14)';
            else if (this.criticalDamageAura && !this.powerAura && !this.criticalAura && !this.triageAura) strokeColor = 'rgba(255,80,80,0.18)';
            else strokeColor = 'rgba(200,100,150,0.16)';

            this.ctx.strokeStyle = strokeColor;
            this.ctx.stroke();
            this.ctx.restore();
        }

        if (this.pokemon?.item?.id === 'heartScale' && this.main.area.heartScale) {
            const now = Date.now();
            const pulse = 1 + 0.1 * Math.sin(now / 250);
            const cx = this.center.x;
            const cy = this.center.y + (tileSize * 0.1);
            const size = 12 * pulse;

            this.ctx.save();
            
            const drawHeartPath = (ctx, x, y, s) => {
                const topY = y - s / 2;
                ctx.beginPath();
                ctx.moveTo(x, topY + s / 4);
                ctx.bezierCurveTo(x, topY, x - s, topY, x - s, topY + s / 2);
                ctx.bezierCurveTo(x - s, topY + s, x, topY + s * 1.25, x, topY + s * 1.6);
                ctx.bezierCurveTo(x, topY + s * 1.25, x + s, topY + s, x + s, topY + s / 2);
                ctx.bezierCurveTo(x + s, topY, x, topY, x, topY + s / 4);
                ctx.closePath();
            };

            drawHeartPath(this.ctx, cx, cy, size);
            this.ctx.strokeStyle = 'rgba(40, 0, 10, 0.8)'; 
            this.ctx.lineWidth = 3 * pulse;
            this.ctx.lineJoin = 'round';
            this.ctx.stroke();

            this.ctx.globalCompositeOperation = 'lighter';
            this.ctx.fillStyle = 'rgba(255, 105, 180, 0.45)';
            this.ctx.shadowBlur = 10 * pulse;
            this.ctx.shadowColor = 'rgba(255, 20, 147, 0.9)';
            this.ctx.fill();

            this.ctx.restore();
        }

        // DIBUJADO DEL SPRITE: aplicar passengerOffset en Y en todos los casos
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
                this.position.y - passengerOffset,
                crop.width,
                crop.height
            );

            this.ctx.restore();
        } else {
            this.ctx.drawImage(
                this.sprite,
                crop.position.x, crop.position.y, crop.width, crop.height,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset,
                crop.width, crop.height
            );
        }

        // tintado/adn: dibujar resultado tambi├⌐n con passengerOffset
        if (this.pokemon.adn != undefined) {
            const temp = document.createElement("canvas");
            temp.width = crop.width;
            temp.height = crop.height;
            const tctx = temp.getContext("2d");

            tctx.drawImage(
                this.sprite,
                crop.position.x, crop.position.y, crop.width, crop.height,
                0, 0, crop.width, crop.height
            );

            tctx.globalCompositeOperation = "source-atop";
            if (this.pokemon.isShiny && !this.pokemon.hideShiny) tctx.fillStyle = "rgba(100, 180, 255, 0.65)";
            else tctx.fillStyle = "rgba(255, 100, 150, 0.6)";
            tctx.fillRect(0, 0, crop.width, crop.height);

            this.ctx.drawImage(
                temp,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset
            );
        }
    }

    update(enemiesInRange, deltaTime = 1000 / 60) {

        const simDelta = deltaTime;
        const frameFactor = simDelta / (1000 / 60);

        this.recalculatePower();

        if (this.lightningRodChargeCD > 0) {
            this.lightningRodChargeCD = Math.max(0, this.lightningRodChargeCD - simDelta);
        }

        // articuno
        if (!this.snowCloakNear) {
            for (const e of this.main.area.enemies) {
                if (!e || e.hp <= 0 || e.invulnerable) continue;
                if (e.passive?.id === 'snowCloak') {
                    const dx = e.center.x - this.center.x;
                    const dy = e.center.y - this.center.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= 160) {
                        this.snowCloakNear = true;
                        break;
                    }
                }
            }
        }

        if (this.snowCloakNear) {
            let stillNear = false;
            for (const e of this.main.area.enemies) {
                if (!e || e.hp <= 0 || e.invulnerable) continue;
                if (e.passive?.id === 'snowCloak') {
                    const dx = e.center.x - this.center.x;
                    const dy = e.center.y - this.center.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= 160) {
                        stillNear = true;
                        break;
                    }
                }
            }
            if (!stillNear) this.snowCloakNear = false;
        }

        // end articuno

        if (this.frames.elapsed === undefined) this.frames.elapsed = 0;
        this.frames.elapsed += frameFactor;
        while (this.frames.elapsed >= this.frames.hold) {
            this.frames.current++;
            this.frames.elapsed -= this.frames.hold;
            if (this.frames.current >= this.frames.max) this.frames.current = 0;
        }

        this.draw();

        if (!this.attackCooldown && this.attackCooldown !== 0) this.attackCooldown = 0;
        // cds usan simDelta 
        this.attackCooldown -= simDelta;

        if (this.pokemon.id == 70 && this.pokemon.adn.id == 70) return;

        if (this.ability && this.ability.id === 'powerAura') {
            let auraRange = this.range;
            if (this.pokemon?.item?.id == 'revelationAroma') auraRange += 25;
            if (this.pokemon?.item?.id == 'sunflowerPetal') auraRange -= 50;
            let numAllies = 0;
            this.main.area.towers.forEach(tower => {
                if (tower === this) return;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                const distance = Math.hypot(dx, dy);
                if (distance <= auraRange) {
                    numAllies++;
                    tower.auraBuffActive = true;
                }
            });
            if (numAllies === 9) this.main.player.unlockAchievement(20)
            return;
        }

        if (this.ability && this.ability.id === 'triage') {
            let auraRange = this.range;
            if (this.pokemon?.item?.id == 'revelationAroma') auraRange += 25;
            let numAllies = 0;
            this.main.area.towers.forEach(tower => {
                if (tower === this) return;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                const distance = Math.hypot(dx, dy);
                if (distance <= auraRange) {
                    numAllies++;
                    tower.auraBuffActive = true;
                }
            });
            return;
        }

        if (this.ability && this.ability.id === 'criticalAura') {
            const auraRange = this.range;
            let numAllies = 0;
            this.main.area.towers.forEach(tower => {
                if (tower === this) return;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                const distance = Math.hypot(dx, dy);
                if (distance <= auraRange) {
                    numAllies++;
                    tower.criticalBuffActive = true;
                }
            });
            return;
        }

        if (this.ability && this.ability.id === 'criticalDamageAura') {
            const auraRange = this.range;
            let numAllies = 0;
            this.main.area.towers.forEach(tower => {
                if (tower === this) return;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                const distance = Math.hypot(dx, dy);
                if (distance <= auraRange) {
                    numAllies++;
                    tower.criticalDamageBuffActive = true;
                }
            });
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
        if (this.pokemon.attackType === 'area') {
            if (validEnemies.length > 0 && this.attackCooldown <= 0) {
                if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');

                for (const enemy of validEnemies) {
                    if (enemy?.passive?.id === 'static') {
                        const dx = enemy.center.x - this.center.x;
                        const dy = enemy.center.y - this.center.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist <= 115 && Math.random() < 0.25) {
                            playSound('paralyzed', 'effect');
                            this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
                            return;
                        }
                    }
                }

                validEnemies.forEach(enemy => {
                    if (enemy.invulnerable) return;
                    let finalDamage = this.projectile.power;

                    if (this.pokemon?.item?.id == 'softSand') {
                        let ssBonus = Math.max(1, 100 * Math.pow(0.5, validEnemies.length - 1));
                        finalDamage += Math.floor(finalDamage * (ssBonus / 100));
                    }

                    if (this.pokemon?.item?.id == 'protein') finalDamage += 15;
                    if (this.pokemon?.item?.id == 'xAttack') finalDamage += 50;

                    if (this.pokemon?.item?.id == 'sharpBeak' && this.tile.land == 4) {
                        let dist = Math.sqrt(Math.pow(enemy.position.x - this.position.x, 2) + Math.pow(enemy.position.y - this.position.y, 2));
                        let bonus = Math.min(1.5, Math.sqrt(this.range / dist, 2));
                        finalDamage = Math.floor(finalDamage * bonus);
                    }
                    if (this.pokemon?.item?.id == 'quickPowder' || this.pokemon?.item?.id == 'quickClaw') finalDamage -= Math.ceil(this.power / 2);
                    if (this.pokemon?.item?.id == 'metalPowder' || this.pokemon?.item?.id == 'lifeOrb') finalDamage += Math.ceil(this.power / 2);
                    if (this.pokemon?.item?.id == 'hardStone') finalDamage += Math.floor(finalDamage * 0.25);

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

                    if (this.tower?.pokemon?.item?.id === 'ancientShield') {
                        finalDamage = Math.ceil(finalDamage * 1.2);
                    }

                    let isCritical = false;

                    let critical = this.critical;

                    if (this.criticalAura) critical += 10;
                    if (this.pokemon?.item?.id == 'direHit') critical += 10;

                    if ((Math.random() * 100) < critical && this.tower?.pokemon?.item?.id != 'blueBandana') {
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
                        this.ability.id === 'burnNerf' && 
                        (Math.random() < 0.5 || this.pokemon?.item?.id == 'heatRock')
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

                this.pulse.active = true;
                this.pulse.radius = 0;
                this.pulse.alpha = 0.7;
                this.pulse.maxRadius = this.range;
                this.pulse.speed = this.range / 15;
                this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
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
        if (this.target && this.attackCooldown <= 0) {
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
            if (this.pokemon?.item?.id == 'stretchySpring') ricochets += 2;

            // static stun
            let skipAttack = false;
            for (const cand of targets) {
                if (cand?.passive?.id === 'static') {
                    const dx = cand.center.x - this.center.x;
                    const dy = cand.center.y - this.center.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= 115 && Math.random() < 0.25) {
                        playSound('paralyzed', 'effect');
                        skipAttack = true;
                        break;
                    }
                }
            }

            if (skipAttack) {
                this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
            } else {
               targets.forEach(tgt => {
                    if (!tgt) return;
                    const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                    const proj = new Projectile(
                        this.position.x - 6,
                        this.position.y + spawnOffsetY - 6,
                        tgt,
                        this.ctx,
                        { ...this.projectile, ricochetsLeft: ricochets },
                        this
                    );
                    this.projectiles.push(proj);
                });

                if (!this.main.mute[0]) {
                    if (this.pokemon?.item?.id == 'subwoofer') {
                        let bark = Math.floor(Math.random() * 4) + 1;
                        playSound(`dog${bark}`, 'effect');
                    } else playSound(this.projectile.effect, 'effect');
                }
                
                this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
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

            if (!p.enemy || p.enemy.hp <= 0 || (p.enemy.invisible && !(p.tower?.revealInvisible || p.tower?.targetMode === 'invisible'))) {
                const fallbackSource = p.enemy ? p.enemy : { center: p.position };
                const newTarget = p.tower ? p.tower.findClosestEnemy(fallbackSource, 200) : null;
                if (newTarget) {
                    p.enemy = newTarget;
                } else {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }

            if (typeof p.update === 'function') p.update(deltaTime); // pasamos delta ya escalado por Game
            if (p.markedForDeletion) this.projectiles.splice(i, 1);
        }
    }

    findClosestEnemy(fromEnemy, maxDist = 1000) {
        let closest = null;
        let minDist = maxDist;
        for (const e of this.main.area.enemies) {
            if (!e || e === fromEnemy || e.hp <= 0) continue;
            const dx = e.center.x - fromEnemy.center.x;
            const dy = e.center.y - fromEnemy.center.y;
            const d = Math.hypot(dx, dy);
            if (d < minDist) {
                minDist = d;
                closest = e;
            }
        }
        return closest;
    }

    getOrderedEnemies(validEnemies) {
        if (!validEnemies || validEnemies.length === 0) return [];

        const arr = validEnemies.slice();

        const hasStatus = (e, type) => e.statusEffects && e.statusEffects.some(se => se.type === type);
        if (this.pokemon?.item?.id == 'quickClaw' && this.ability.id !== 'defiant') this.targetMode = 'faster';
        if (this.pokemon?.item?.id == 'silphScope') {
            this.targetMode = 'invisible';

            if (this.pokemon?.id == 53) {
                const hasInvisible = arr.some(e => e.invisible === true);
                if (!hasInvisible) this.targetMode = 'random';
            }
        }  

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
                arr.sort((a, b) => {
                    if (a.armor <= 0 && b.armor > 0) return -1; // a sin armadura va antes
                    if (a.armor > 0 && b.armor <= 0) return 1;  // b sin armadura va antes
                    return 0; // ambos igual
                });
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
        if (this.pokemon?.item?.id == 'silphScope') this.targetMode = 'invisible';

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
