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

        // HABILIDADES
        this.ricochet = pokemon.ricochet;
        this.revealInvisible = (this.ability.id === 'frisk' || pokemon?.item?.id == 'silphScope') ? true : false;
        this.damageBoost = 0;
        this.speedBoost = 0;
        this.teleport = 0;
        this.teleportBuff = teleportBuff;
        this.moxieBuff = 0;
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
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89 && this.pokemon?.lvl == 100) this.speed -= 4000;

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

        if (this.tile && (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser')) && (this.pokemon.ability.id === 'ambusher' || this.pokemon.ability.id === 'castform')) {
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

        if (
            this.tile && 
            (this.tile.land === 4 || this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit') && 
            (this.pokemon.ability.id === 'vigilant' || this.pokemon.ability.id === 'castform')
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
        if (this.pokemon?.item?.id == 'silphScope' && this.pokemon.ability.id === 'frisk') this.range += 15;
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

        // terreno
        if (this.tile && (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser')) && (this.pokemon.ability.id === 'ambusher' || this.pokemon.ability.id === 'castform'))
            this.power = Math.ceil(this.power * 2);
        if (this.tile && (this.tile.land === 4 || this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit') && (this.pokemon.ability.id === 'vigilant' || this.pokemon.ability.id === 'castform'))
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
        if (this.pokemon?.item?.id == 'silphScope' && this.pokemon.ability.id === 'frisk') this.range += 15;
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
            ) <= t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0) + (t.pokemon?.item?.id === "sunflowerPetal" ? -25 : 0)
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
            };    const tileSize = 24;
        const offsetX = (tileSize - crop.width) / 2;
        const offsetY = (tileSize - crop.height) / 2;

        this.center = {
            x: this.position.x + tileSize / 2,
            y: this.position.y + tileSize / 2
        };

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
                this.position.y,
                crop.width,
                crop.height
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
                this.position.y + offsetY,
                crop.width,
                crop.height
            );
        }

        if (this.pokemon.adn != undefined) {
           // ---- CANVAS TEMPORAL ----
            const temp = document.createElement("canvas");
            temp.width = crop.width;
            temp.height = crop.height;
            const tctx = temp.getContext("2d");

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
                this.position.y + offsetY
            );
        }
    }

    update(enemiesInRange, deltaTime = 1000 / 60) {

        const simDelta = deltaTime;
        const frameFactor = simDelta / (1000 / 60);

        this.recalculatePower();

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

        // DELTA TIME FIX: Skip drawing during sub-step simulation
        if (!this._skipDraw) this.draw();

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
                        const dist = Math.hypot(dx, dy);
                        if (dist <= 115 && Math.random() < 0.25) {  // RESTORED: Vanilla values (was 140/0.33)
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

                    // RESTORED: Vanilla logic - Heat Rock = 100% burn chance
                    if (enemy.canBurn && this.ability && this.ability.id === 'burnNerf' && (Math.random() < 0.5 || this.pokemon?.item?.id == 'heatRock')) {
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
        // DELTA TIME FIX: Use while loop to allow multiple attacks per frame at high speeds
        let firedThisFrame = false;
        let shotsThisFrame = 0;
        const MAX_SHOTS_PER_FRAME = 50; // Cap to prevent lag spikes while allowing bullet hell
        // Safety: clamp attack speed to minimum 0.01ms to prevent infinite loops while allowing extreme fire rates
        const attackSpeed = Math.max(0.01, this.speed * (this.snowCloakNear ? 1.5 : 1));
        
        while (this.target && this.attackCooldown <= 0 && validEnemies.length > 0 && shotsThisFrame < MAX_SHOTS_PER_FRAME) {
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
                    const dist = Math.hypot(dx, dy);
                    if (dist <= 115 && Math.random() < 0.25) {  // RESTORED: Vanilla values (was 140/0.33)
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
                    const proj = new Projectile(
                        this.position.x + 12,
                        this.position.y + 12,
                        tgt,
                        this.ctx,
                        { ...this.projectile, ricochetsLeft: ricochets },
                        this
                    );
                    this.projectiles.push(proj);
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
