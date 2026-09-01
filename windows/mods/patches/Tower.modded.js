import { Projectile } from './Projectile.js';
import { Sprite } from '../../utils/Sprite.js';
import { playSound } from '../../file/audio.js';
import { projectileData } from '../data/projectileData.js';

const _REVYS_SPRITES = Object.values(projectileData);

export class Tower extends Sprite {
    constructor(main, x, y, ctx, pokemon, tile, teleportBuff = false) {
        super(x, y, ctx, pokemon.sprite.image, pokemon.sprite.frames, 8, 0, pokemon.sprite.hold);
        this.main = main;

        this.uid = this.uid ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

        this.tile = tile;
        this.ctx = ctx;

        this.center = {
            x: this.position.x + this.width / 2,
            y: this.position.y + this.height / 2
        };
        this.projectiles = [];
        this.beams = [];
        this.voltSurgeChains = [];

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
        this.orbitalSpeed = pokemon.orbitalSpeed ?? 0;

        this.isMounted = false;
        this.isPassenger = false;
        this.carriedBy = null;
        this.passengerYOffset = -13;

        // HABILIDADES
        this.ricochet = pokemon.ricochet;
        this.orbital = pokemon.orbital;
        this.revealInvisible = (
            this.ability.id === 'illuminate' ||
            this.ability.id === 'illuminateBuff' ||
            this.ability.id === 'frisk' ||
            this.ability.id === 'vigilantFrisk' ||
            pokemon?.item?.id == 'silphScope'
        ) ? true : false;
        this.secretSwordSide = 1;
        this.damageBoost = 0;

        this.teleport = 0;
        this.teleportBuff = teleportBuff;
        this.feathers = 0;

        this.incenseBuff = 0;
        this.incenseTimer = 0;
        this.lightningRodCharge = 0;
        this.lightningRodChargeCD = 0;
        this.shiftGearSpeed = 0;
        this.hitCount = 0;
        this.spikyShieldChance = 0;

        this.bulkUpTimer = false;
        this.meteorMashCount = 0;
        this.meteorMashBonus = 0;

        this.salacBerryTimer = 0;
        this.liechiBerryTimer = 0;
        this.lansatBerryTimer = 0;
        this.starfBerryTimer = 0;
        this.spiritombTimer = 0;

        this.cherrimForm = false;
        this.lastTarget = null;
        this.solrockSwitchCooldown = 0;

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

        this.boomburstWaves = [];

        this.criticalAura = false;
        this.criticalDamageAura = false;
        this.genesisAura = false;

        this.setTowerStats();

        this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
        this.targetMode = pokemon.targetMode;

        this.castformTransform();

        if (this.pokemon?.item?.id == 'bicycle') {
            this.projectile.sprite = { image: this.pokemon.item.sprite, frames: 1 };
            this.projectile.effect = 'ding';
        }

        if (this.pokemon.ability?.id === 'unburden' || this.pokemon.ability?.id === 'genesisAura') {
            this.isWandering = true;
            this.wanderSpeed = 50;
            this.wanderTarget = null;
            this.anchored = false;
        }

        if (this.attackType === 'bombardment') {
            this.bombardShellSprite = new Image();
            this.bombardShellSprite.src = this.pokemon.projectile.sprite.image;
            this.rerollBombardZone();
        }

        if (['nocturnal', 'meteorBeam'].includes(this.pokemon.ability?.id))  {
            this.isOrbitingSolrock = false;
            this.lunatoneOrbitAngle = Math.random() * Math.PI * 2; // random starting angle
            this.lunatoneOrbitRadius = (this.pokemon.ability?.id === 'nocturnal') ? 55 : 90;
            this.lunatoneOrbitSpeed = (this.pokemon.ability?.id === 'nocturnal') ? 1.4 : 0.7; // radians per second
            this.lunatoneHomePosition = { x: this.position.x, y: this.position.y };
        }

        if (this.attackType === 'orbital') {
            this.spawnOrbitales();
        }
    }

    castformTransform() {
        if (this.pokemon.specie.id == 61) {
            if (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform') this.updateTowerSprite(this.pokemon.sprite.imageGrass, this.pokemon.sprite.framesGrass, this.pokemon.specie.projectileGrass);
            else if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform') this.updateTowerSprite(this.pokemon.sprite.imageWater, this.pokemon.sprite.framesWater, this.pokemon.specie.projectileWater);
            else if (this.tile.land == 4 || (this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit')) this.updateTowerSprite(this.pokemon.sprite.imageMountain, this.pokemon.sprite.framesMountain, this.pokemon.specie.projectileMountain);
        } else if (this.pokemon?.adn?.id == 61) {
            if (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform') this.updateTowerSprite(this.pokemon.adn.sprite.imageGrass, this.pokemon.adn.sprite.framesGrass, this.pokemon.adn.projectileGrass);
            else if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform') this.updateTowerSprite(this.pokemon.adn.sprite.imageWater, this.pokemon.adn.sprite.framesWater, this.pokemon.adn.projectileWater);
            else if (this.tile.land == 4 || (this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit')) this.updateTowerSprite(this.pokemon.adn.sprite.imageMountain, this.pokemon.adn.sprite.framesMountain, this.pokemon.adn.projectileMountain);
        }

        if (this.pokemon.specie.id == 102) {
            if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform') this.updateTowerSprite(this.pokemon.sprite.imageWater, this.pokemon.sprite.framesWater, this.pokemon.specie.projectile);
        } else if (this.pokemon?.adn?.id == 102) {
            if (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform') this.updateTowerSprite(this.pokemon.sprite.imageWater, this.pokemon.sprite.framesWater, this.pokemon.specie.projectile);
        }

        if (this.pokemon.specie.id == 150) {
            const skins = ["imageRed", "imageOrange", "imageYellow", "imageGreen", "imageBlue", "imageIndigo", "imageViolet"]
            const skin = skins[Math.floor(Math.random() * 7)];
            if (this.isOrbitingSolrock) this.updateTowerSprite(this.pokemon.sprite[skin])
            else this.updateTowerSprite(this.pokemon.sprite.image)
        }
    }

    pickRandomWanderTarget() {
        if (this.ability?.id === "genesisAura" && this.isWandering) {
            const towerTiles = this.main.area.placementTiles.filter(tile =>
                tile.tower &&
                tile.tower.id !== this.pokemon.id
            );

            if (towerTiles.length > 0) {
                const target = towerTiles[Math.floor(Math.random() * towerTiles.length)];
                this.wanderTarget = {
                    x: target.center.x,
                    y: target.center.y
                };
                return;
            }
        }

        const area = this.main?.area;
        const canvasW = (area && area.width) || (this.ctx && this.ctx.canvas && this.ctx.canvas.width) || 720;
        const canvasH = (area && area.height) || (this.ctx && this.ctx.canvas && this.ctx.canvas.height) || 624;

        const margin = 12;
        const w = Math.max(0, canvasW - margin * 2);
        const h = Math.max(0, canvasH - margin * 2);

        this.wanderTarget = {
            x: margin + Math.random() * w,
            y: margin + Math.random() * h
        };
    }

    updateTowerSprite(spriteImage = undefined, spriteFrames = undefined, projectileSprite = undefined) {
        this.loaded = false;

        this.frames.max = (spriteFrames == undefined) ? this.pokemon.sprite.frames : spriteFrames;
        this.frames.hold = this.pokemon.sprite.hold;
        this.frames.current = 0;
        this.frames.elapsed = 0;

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
        this.ability = this.pokemon.ability;
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
        if (this.pokemon?.ability?.id == 'armorCannon') this.speed -= (100 * (14 - this.main.player.health[this.main.area.routeNumber]));
        if (this.pokemon?.item?.id == 'maliciousArmor') this.speed -= (20 * (14 - this.main.player.health[this.main.area.routeNumber]));
        if (this.pokemon?.ability?.id == 'speedBoost' || this.pokemon?.ability?.id == 'strongJaw') {
            if (this.main.area.speedBoostUsers[this.pokemon.id] !== undefined) {
                this.speed -= (300 * this.main.area.speedBoostUsers[this.pokemon.id]);
            }
        }

        if (this.pokemon?.ability?.id == 'bulkUp') {
            this.power += this.main.area.bulkUpUsers[this.pokemon.id]?.power ?? 0;
            this.projectile.power += this.main.area.bulkUpUsers[this.pokemon.id]?.power ?? 0;
        }

        if (this.pokemon?.item?.id == 'shieldBreakerBullet') this.speed += 2000;
        if (this.pokemon?.item?.id == 'bindingBand') this.speed += 1500;
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89 && this.pokemon?.lvl == 100 && typeof this.main?.area?.inChallenge.lvlCap !== 'number') this.speed -= 4000;

        if (this.pokemon?.item?.id == 'protein') {
            this.power += (this.ability?.id == 'simple') ? 26 : 15;
            this.projectile.power += (this.ability?.id == 'simple') ? 26 : 15;
        }
        if (this.pokemon?.item?.id == 'xAttack') {
            this.power += (this.ability?.id == 'simple') ? 131 : 75;
            this.projectile.power += (this.ability?.id == 'simple') ? 131 : 75;
        }
        if (this.pokemon?.item?.id == 'liechiBerry' && this.liechiBerryTimer > 0) {
            this.power += (this.ability?.id == 'simple') ? 350 : 200;
            this.projectile.power += (this.ability?.id == 'simple') ? 350 : 200;
        }
        if (this.pokemon?.item?.id == 'expertBelt') {
            this.power += (this.ability?.id == 'simple') ? 88 : 50;
            this.projectile.power += (this.ability?.id == 'simple') ? 88 : 50;
        }
        if (this.pokemon?.item?.id == 'oddKeystone') {
            this.power += 40;
            this.projectile.power += 40;
        }

        if ([165, 175, 176].includes(this.pokemon.id) && this.main.area.heartOfSteel) {
            this.power += (this.main.area.hitsReceived > 0) ? 75 : 25;
            this.projectile.power += (this.main.area.hitsReceived > 0) ? 75 : 25;
        }

        this.power += this.main.area.honeyGather;
        this.projectile.power += this.main.area.honeyGather;

        if (this.pokemon?.item?.id == 'nectar') {
            for (let i = 0; i < 2; i++) {
                this.power += this.main.area.honeyGather;
                this.projectile.power += this.main.area.honeyGather;
            }
            if (this.ability?.id == 'simple') {
                this.power += this.main.area.honeyGather;
                this.projectile.power += this.main.area.honeyGather;
            }
        }

        if (this.pokemon?.item?.id == 'tropicalMail') {
            this.power += (this.ability?.id == 'simple') ? 35 * this.main.UI.tilesCountNum[1] : 20 * this.main.UI.tilesCountNum[1];
            this.projectile.power += (this.ability?.id == 'simple') ? 35 * this.main.UI.tilesCountNum[1] : 20 * this.main.UI.tilesCountNum[1];
        }

        if (this.main.area.helpingHand && this.pokemon?.item?.id == undefined) {
            this.power += (this.ability?.id == 'simple') ? (88 * this.main.area.helpingHand) : (50 * this.main.area.helpingHand);
            this.projectile.power += (this.ability?.id == 'simple') ? (88 * this.main.area.helpingHand) : (50 * this.main.area.helpingHand);
        }

        if (this.ability?.id == 'marvelScale') {
            this.power += (this.main.area.inChallenge) ? (this.main.player.ribbons * 3) : this.main.player.ribbons;
            this.projectile.power += (this.main.area.inChallenge) ? (this.main.player.ribbons * 3) : this.main.player.ribbons;
        }

        if (this.ability?.id == 'rageFist') {
            this.power += (this.main.area.hitsReceived * 50);
            this.projectile.power += (this.main.area.hitsReceived * 50);
        }

        if (this.pokemon?.item?.id === 'fullIncense') {
            this.power += Math.floor(this.incenseBuff);
            this.projectile.power += Math.floor(this.incenseBuff);
        }

        if (
            this.pokemon?.item?.id == 'quickClaw' ||
            this.pokemon?.item?.id == 'lifeOrb'
        ) {
            this.speed -= (this.speed * 0.5);
        }

        if (this.pokemon?.ability?.id === 'nocturnal' && !this.main.utility.isBetweenHours(8, 20)) {
            this.speed -= (this.speed * 0.25);
        }

        if (this.pokemon?.ability?.id === 'rivalrySpeed' && !this.main.area.rivalryAmount >= 2) {
            this.speed -= (this.speed * 0.3);
        }

        if (this.pokemon?.item?.id == 'laggingTail') {
            if (this.ability.id === 'contrary') this.speed -= (this.speed * 0.5);
            else this.speed += (this.speed * 0.5);
        }

        if (
            this.main.area.heartScale > 0 && this.pokemon?.item?.id == 'heartScale'
        ) {
            let hsValue = (this.ability?.id == 'simple') ? 17.5 : 10;
            let hsCap = (this.ability?.id == 'simple') ? 87.5 : 50;
            let speedBonusHS = Math.min(hsCap, this.main.area.heartScale * hsValue) / 100;
            this.speed -= (this.speed * speedBonusHS);
        }

        if (this.pokemon?.item?.id == 'koffingJelly') this.speed += 1100;
        if (this.pokemon?.item?.id == 'quickPowder') this.speed -= (this.speed / 4);
        if (this.pokemon?.item?.id == 'adrenalineOrb') {
            this.speed -= (this.ability?.id == 'simple') ?
            (this.speed * 0.04375 * (14 - this.main.player.health[this.main.area.routeNumber])) :
            (this.speed * 0.025 * (14 - this.main.player.health[this.main.area.routeNumber]));
        }

        if (this.pokemon?.item?.id == 'waveMail') {
            this.speed -= (this.ability?.id == 'simple') ?
            (this.speed * 0.0525 * this.main.UI.tilesCountNum[2]) :
            (this.speed * 0.03 * this.main.UI.tilesCountNum[2]);
        }

        if (this.pokemon?.item?.id == 'salacBerry' && this.salacBerryTimer > 0) {
            this.speed *= (this.ability?.id == 'simple') ? 0.875 : 0.5;
        }

        if (this.carriedBy == 'grassPlatform' || this.carriedBy == 'icePlatform') this.speed -= (this.speed * 0.15);

        if (this.pokemon?.item?.id == 'metalPowder') this.speed += (this.speed / 4);
        if (this.cherrimForm) this.speed -= (this.speed * 0.25);

        if (['dampRock', 'smoothRock', 'icyRock', 'heatRockWeather'].includes(this.pokemon?.item?.id)) this.speed += (this.speed);

        if (this.pokemon?.item?.id == 'choiceScarf') {
            if (this.ability.id === 'quadraShot' || this.ability.id === 'quadraShotSand') this.speed -= (this.speed * 0.875);
            else if (this.ability.id === 'tripleShot') this.speed -= (this.speed * 0.75);
            else this.speed -= (this.speed * 0.5);
        }

        if (this.pokemon?.item?.id == 'inverter' && this.pokemon?.specie?.key == 'malamar') this.speed -= (this.speed * 0.75)

        if (this.pokemon?.item?.id == 'poisonBarb' || this.pokemon?.item?.id == 'ancientSword') this.speed -= (this.speed * 0.2);
        if (this.pokemon?.item?.id == 'carbos') {
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.2625) : (this.speed * 0.15);
        }
        if (this.pokemon?.item?.id == 'wrestlingMask') this.speed -= (this.speed * 0.35);
        if (this.pokemon?.item?.id == 'muscleBand') this.speed += (this.speed * 0.25);

        if (
            this.tile && this.pokemon?.item?.id === 'mitsuesCocktail' ||
            (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform')
            && (this.pokemon.ability.id === 'ambusher' || this.pokemon.ability.id === 'castform')
        ) {
            this.power = this.basePower * 2;
            this.projectile.power = this.power;
        }

        if (this.isMounted && (this.pokemon.id == 114 || this.pokemon?.adn?.id == 114)) {
            this.speed -= (this.speed * 0.25);
        }

        if (this.pokemon?.item?.id === 'sokudosPortfolio') {
            let reductor = Math.min(this.main.player.shinyAmount * 0.05, 0.75);
            this.speed -= (this.speed * reductor)
        }

        if (
            this.tile &&
            (this.tile.land === 4 || this.tile.land  == 1 && this.pokemon?.item?.id == 'hikingKit') &&
            (this.pokemon.ability.id === 'vigilant' || this.pokemon.ability.id === 'vigilantFrisk' || this.pokemon.ability.id === 'castform')
        ) {
            this.range = this.range * 2;
        }

        if (
            this.tile && this.tile.land === 4 && this.pokemon.ability.id === 'noGuard'
        ) {
            this.range = this.range * 3;
        }

        if ([3,4,5,10].includes(this.main.area.routeNumber) && (this.pokemon.ability.id === 'doubleShotSand' || this.pokemon.ability.id === 'quadraShotSand')) {
            this.range = this.range * 2;
        }

        if (this.main.area.shellSmashActive && this.pokemon.ability.id === 'shellSmash') {
            this.speed -= (this.speed * 0.25);
        }

        if (this.tile && (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform') && (this.pokemon.ability.id === 'swimmer' || this.pokemon.ability.id === 'castform')) {
            this.speed = this.speed / 2;
        }

        if (this.pokemon?.item?.id == 'nanabBerry') {
            this.range = this.range * 1.3;
            this.speed += (this.speed / 4);
        }

        if (this.pokemon?.item?.id == 'eviolite') {
            this.range = this.range * 1.2;
            this.speed -= (this.speed / 5);
        }

        if (
            this.main.area.weather == 'harshSunlight'
        ) {
            if (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform') this.speed -= (this.speed * 0.15);
            if (this.pokemon.ability.id === 'chlorophyll') this.speed = this.speed / 2;
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight'
        ) {
            if (this.pokemon.ability.id === 'chlorophyll') this.speed = this.speed / 2;
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' && !this.cherrimForm &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform')
        ) {
            if (!this.main.area.airLock && this.pokemon?.item?.id != 'safetyGoggles' && this.pokemon.ability.id !== 'chlorophyll') {
                this.speed = (this.main.area.cloudNine) ? this.speed * 1.5 : this.speed * 4;
            }
        }

        if (this.main.area.anchorShot) this.speed *= 4;

        if (this.ability?.id === 'sandRush' && this.main?.area?.weather == 'sandstorm') this.speed = this.speed / 2;

        if (this.pokemon?.item?.id == 'helixFossil') this.range += this.main.player.fossilInTeam * 10;
        if (this.pokemon?.item?.id == 'oldRod') this.range += 75;
        if (this.pokemon?.item?.id == 'starfBerry' && this.starfBerryTimer > 0) {
            this.range += (this.ability?.id == 'simple') ? 140 : 80;
        }
        if (this.pokemon?.item?.id == 'silphScope' && (
            this.pokemon.ability.id === 'illuminate' ||
            this.pokemon.ability.id === 'illuminateBuff' ||
            this.pokemon.ability.id === 'frisk' ||
            this.pokemon.ability.id === 'vigilantFrisk')
        ) {
            this.range += 15;
            this.speed -= (this.speed / 4);
        }

        if (this.pokemon?.item?.id == 'brickMail') {
            this.range += (this.ability?.id == 'simple') ? 14 * this.main.UI.tilesCountNum[3] : 8 * this.main.UI.tilesCountNum[3];
        }

        if (this.pokemon?.item?.id == 'revelationAroma') this.range += 25;
        if (this.pokemon?.item?.id == 'sunflowerPetal') this.range -= 40;
        if (this.pokemon?.item?.id == 'wrestlingMask') this.range -= 75;
        if (this.pokemon?.item?.id == 'condensedBlizzard') this.range /= 2;
        if (this.pokemon?.item?.id == 'spindaCocktail') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.4375 : this.range * 1.25;
        }
        if (this.pokemon?.item?.id == 'ancientShield') this.range = this.range * 1.2;
        if (this.pokemon?.item?.id == 'starCandy') this.range += Math.min(120, this.main.player.stars * 0.1);
        if (this.pokemon?.item?.id == 'prismScale') this.range += this.main.player.ribbons * 0.5;
    }

    recalculatePower() {
        // valores base
        this.powerAura = false;
        this.criticalAura = false;
        this.criticalDamageAura = false;
        this.triageAura = false;
        this.illuminateAura = false;
        this.genesisAura = false;
        this.power = this.basePower;
        this.speed = this.pokemon.speed;
        this.range = this.pokemon.range;

        if (this.pokemon.id == 65 || this.pokemon?.adn?.id == 65) this.speed -= (500 * this.main.player.fossilInTeam);
        if (this.pokemon?.ability?.id == 'armorCannon') this.speed -= (100 * (14 - this.main.player.health[this.main.area.routeNumber]));
        if (this.pokemon?.item?.id == 'maliciousArmor') this.speed -= (20 * (14 - this.main.player.health[this.main.area.routeNumber]));
        if (this.pokemon?.ability?.id == 'speedBoost' || this.pokemon?.ability?.id == 'strongJaw') {
            if (this.main.area.speedBoostUsers[this.pokemon.id] !== undefined) {
                this.speed -= (300 * this.main.area.speedBoostUsers[this.pokemon.id]);
            }
        }

        if (this.pokemon?.ability?.id == 'bulkUp') {
            this.power += this.main.area.bulkUpUsers[this.pokemon.id]?.power ?? 0;
            this.projectile.power += this.main.area.bulkUpUsers[this.pokemon.id]?.power ?? 0;
        }

        if (
            this.pokemon?.item?.id == 'quickClaw' ||
            this.pokemon?.item?.id == 'lifeOrb'
        ) {
            this.speed -= (this.speed * 0.5);
        }

        if (this.pokemon?.ability?.id === 'nocturnal' && !this.main.utility.isBetweenHours(8, 20)) {
            this.speed -= (this.speed * 0.25);
        }

        if (this.pokemon?.ability?.id === 'rivalrySpeed' && !this.main.area.rivalryAmount >= 2) {
            this.speed -= (this.speed * 0.3);
        }

        if (this.pokemon?.item?.id == 'laggingTail') {
            if (this.ability.id === 'contrary') this.speed -= (this.speed * 0.5);
            else this.speed += (this.speed * 0.5);
        }

        if (
            this.main.area.heartScale > 0 && this.pokemon?.item?.id == 'heartScale'
        ) {
            let hsValue = (this.ability?.id == 'simple') ? 17.5 : 10;
            let hsCap = (this.ability?.id == 'simple') ? 87.5 : 50;
            let speedBonusHS = Math.min(hsCap, this.main.area.heartScale * hsValue) / 100;
            this.speed -= (this.speed * speedBonusHS);
        }

        if (this.pokemon?.item?.id == 'protein') {
            this.power += (this.ability?.id == 'simple') ? 26 : 15;
            this.projectile.power += (this.ability?.id == 'simple') ? 26 : 15;
        }
        if (this.pokemon?.item?.id == 'xAttack') {
            this.power += (this.ability?.id == 'simple') ? 131 : 75;
            this.projectile.power += (this.ability?.id == 'simple') ? 131 : 75;
        }
        if (this.pokemon?.item?.id == 'liechiBerry' && this.liechiBerryTimer > 0) {
            this.power += (this.ability?.id == 'simple') ? 350 : 200;
            this.projectile.power += (this.ability?.id == 'simple') ? 350 : 200;
        }
        if (this.pokemon?.item?.id == 'expertBelt') {
            this.power += (this.ability?.id == 'simple') ? 88 : 50;
            this.projectile.power += (this.ability?.id == 'simple') ? 88 : 50;
        }
        if (this.pokemon?.item?.id == 'oddKeystone') {
            this.power += 40;
            this.projectile.power += 40;
        }

        if ([165, 175, 176].includes(this.pokemon.id) && this.main.area.heartOfSteel) {
            this.power += (this.main.area.hitsReceived > 0) ? 75 : 25;
            this.projectile.power += (this.main.area.hitsReceived > 0) ? 75 : 25;
        }

        this.power += this.main.area.honeyGather;
        this.projectile.power += this.main.area.honeyGather;

        if (this.pokemon?.item?.id == 'nectar') {
            for (let i = 0; i < 2; i++) {
                this.power += this.main.area.honeyGather;
                this.projectile.power += this.main.area.honeyGather;
            }
            if (this.ability?.id == 'simple') {
                this.power += this.main.area.honeyGather;
                this.projectile.power += this.main.area.honeyGather;
            }
        }

        if (this.pokemon?.item?.id == 'tropicalMail') {
            this.power += (this.ability?.id == 'simple') ? 35 * this.main.UI.tilesCountNum[1] : 20 * this.main.UI.tilesCountNum[1];
            this.projectile.power += (this.ability?.id == 'simple') ? 35 * this.main.UI.tilesCountNum[1] : 20 * this.main.UI.tilesCountNum[1];
        }

        if (this.main.area.helpingHand && this.pokemon?.item?.id == undefined) {
            this.power += (this.ability?.id == 'simple') ? (88 * this.main.area.helpingHand) : (50 * this.main.area.helpingHand);
            this.projectile.power += (this.ability?.id == 'simple') ? (88 * this.main.area.helpingHand) : (50 * this.main.area.helpingHand);
        }

        if (this.ability?.id == 'marvelScale') {
            this.power += (this.main.area.inChallenge) ? (this.main.player.ribbons * 3) : this.main.player.ribbons;
            this.projectile.power += (this.main.area.inChallenge) ? (this.main.player.ribbons * 3) : this.main.player.ribbons;
        }

        if (this.ability?.id == 'rageFist') {
            this.power += (this.main.area.hitsReceived * 50);
            this.projectile.power += (this.main.area.hitsReceived * 50);
        }

        if (this.pokemon?.item?.id === 'fullIncense') {
            this.power += Math.floor(this.incenseBuff);
            this.projectile.power += Math.floor(this.incenseBuff);
        }

        if (this.pokemon?.item?.id == 'shieldBreakerBullet') this.speed += 2000;
        if (this.pokemon?.item?.id == 'bindingBand') this.speed += 1500;
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89 && this.pokemon?.lvl == 100 && typeof this.main?.area?.inChallenge.lvlCap !== 'number') this.speed -= 4000;

        if (this.pokemon?.item?.id == 'koffingJelly') this.speed += 1100;
        if (this.pokemon?.item?.id == 'quickPowder') this.speed -= (this.speed / 4);
        if (this.pokemon?.item?.id == 'adrenalineOrb') {
            this.speed -= (this.ability?.id == 'simple') ?
            (this.speed * 0.04375 * (14 - this.main.player.health[this.main.area.routeNumber])) :
            (this.speed * 0.025 * (14 - this.main.player.health[this.main.area.routeNumber]));
        }

        if (this.pokemon?.item?.id == 'waveMail') {
            this.speed -= (this.ability?.id == 'simple') ?
            (this.speed * 0.0525 * this.main.UI.tilesCountNum[2]) :
            (this.speed * 0.03 * this.main.UI.tilesCountNum[2]);
        }

        if (this.pokemon?.item?.id == 'salacBerry' && this.salacBerryTimer > 0) {
            this.speed *= (this.ability?.id == 'simple') ? 0.875 : 0.5;
        }

        if (this.carriedBy == 'grassPlatform' || this.carriedBy == 'icePlatform') this.speed -= (this.speed * 0.15);

        if (this.pokemon?.item?.id == 'metalPowder') this.speed += (this.speed / 4);
        if (this.cherrimForm) this.speed -= (this.speed * 0.25);

        if (['dampRock', 'smoothRock', 'icyRock', 'heatRockWeather'].includes(this.pokemon?.item?.id)) this.speed += (this.speed);

        if (this.pokemon?.item?.id == 'choiceScarf') {
            if (this.ability.id === 'quadraShot' || this.ability.id === 'quadraShotSand') this.speed -= (this.speed * 0.875);
            else if (this.ability.id === 'tripleShot') this.speed -= (this.speed * 0.75);
            else this.speed -= (this.speed * 0.5);
        }

        if (this.pokemon?.item?.id == 'inverter' && this.pokemon?.specie?.key == 'malamar') this.speed -= (this.speed * 0.75)

        if (this.pokemon?.item?.id == 'poisonBarb' || this.pokemon?.item?.id == 'ancientSword') this.speed -= (this.speed * 0.2);
        if (this.pokemon?.item?.id == 'carbos') {
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.2625) : (this.speed * 0.15);
        }
        if (this.pokemon?.item?.id == 'wrestlingMask') this.speed -= (this.speed * 0.35);
        if (this.pokemon?.item?.id == 'muscleBand') this.speed += (this.speed * 0.25);

        if (this.pokemon?.item?.id === 'sokudosPortfolio') {
            let reductor = Math.min(this.main.player.shinyAmount * 0.05, 0.75);
            this.speed -= (this.speed * reductor)
        }

        // terreno
        if (this.tile && this.pokemon?.item?.id === 'mitsuesCocktail' ||
            (this.tile.land === 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform') && (this.pokemon.ability.id === 'ambusher' || this.pokemon.ability.id === 'castform'))
            this.power = Math.ceil(this.power * 2);
        if (this.tile && (this.tile.land === 4 || this.tile.land == 1 && this.pokemon?.item?.id == 'hikingKit') && (this.pokemon.ability.id === 'vigilant' || this.pokemon.ability.id === 'vigilantFrisk' ||this.pokemon.ability.id === 'castform'))
            this.range = this.pokemon.range * 2;
        if (this.tile && (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform') && (this.pokemon.ability.id === 'swimmer' || this.pokemon.ability.id === 'castform'))
            this.speed /= 2;
        if ([3,4,5,10].includes(this.main.area.routeNumber) && (this.pokemon.ability.id === 'doubleShotSand' || this.pokemon.ability.id === 'quadraShotSand')) {
            this.range = this.range * 2;
        }
        if (this.tile && this.tile.land === 4 && this.pokemon.ability.id === 'noGuard') this.range = this.pokemon.range * 10;

        if (this.main.area.shellSmashActive && this.pokemon.ability.id === 'shellSmash') {
            this.speed -= (this.speed * 0.25);
        }

        if (this.isMounted && (this.pokemon.id == 114 || this.pokemon?.adn?.id == 114)) {
            this.speed -= (this.speed * 0.25);
        }

        if (this.pokemon?.item?.id == 'nanabBerry') {
            this.range = this.range * 1.3;
            this.speed += (this.speed / 4);
        }

        if (this.pokemon?.item?.id == 'eviolite') {
            this.range = this.range * 1.2;
            this.speed -= (this.speed / 5);
        }

         if (
            this.main.area.weather == 'harshSunlight'
        ) {
            if (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform') this.speed -= (this.speed * 0.15);
            if (this.pokemon.ability.id === 'chlorophyll') this.speed = this.speed / 2;
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight'
        ) {
            if (this.pokemon.ability.id === 'chlorophyll') this.speed = this.speed / 2;
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' && !this.cherrimForm &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform')
        ) {
            if (!this.main.area.airLock && this.pokemon?.item?.id != 'safetyGoggles' && this.pokemon.ability.id !== 'chlorophyll') {
                this.speed = (this.main.area.cloudNine) ? this.speed * 1.5 : this.speed * 4;
            }
        }

        if (this.main.area.anchorShot) this.speed *= 4;

        if (this.ability?.id === 'sandRush' && this.main?.area?.weather == 'sandstorm') this.speed = this.speed / 2;

        if (this.pokemon?.item?.id == 'helixFossil') this.range += this.main.player.fossilInTeam * 10;
        if (this.pokemon?.item?.id == 'oldRod') this.range += 75;
        if (this.pokemon?.item?.id == 'starfBerry' && this.starfBerryTimer > 0) {
            this.range += (this.ability?.id == 'simple') ? 140 : 80;
        }
        if (this.pokemon?.item?.id == 'silphScope' && (
            this.pokemon.ability.id === 'illuminate' ||
            this.pokemon.ability.id === 'illuminateBuff' ||
            this.pokemon.ability.id === 'frisk' ||
            this.pokemon.ability.id === 'vigilantFrisk')
        ) {
            this.range += 15;
            this.speed -= (this.speed / 4);
        }

        if (this.pokemon?.item?.id == 'brickMail') {
            this.range += (this.ability?.id == 'simple') ? 14 * this.main.UI.tilesCountNum[3] : 8 * this.main.UI.tilesCountNum[3];
        }

        if (this.pokemon?.item?.id == 'wrestlingMask') this.range -= 75;
        if (this.pokemon?.item?.id == 'condensedBlizzard') this.range /= 2;
        if (this.pokemon?.item?.id == 'spindaCocktail') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.4375 : this.range * 1.25;
        }
        if (this.pokemon?.item?.id == 'ancientShield') this.range = this.range * 1.2;
        if (this.pokemon?.item?.id == 'starCandy') this.range += Math.min(120, this.main.player.stars * 0.1);
        if (this.pokemon?.item?.id == 'prismScale') this.range += this.main.player.ribbons * 0.5;

        const nearbyPowerAuras = this.main.area.towers.filter(t =>
            t.ability?.id === 'powerAura' &&
            t !== this &&
            Math.hypot(
                t.center.x - this.center.x,
                t.center.y - this.center.y
            ) <= t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0) + (t.pokemon?.item?.id === "sunflowerPetal" ? -40 : 0)
        );

        const nearbyGenesisAuras = this.main.area.towers.filter(t =>
            t.ability?.id === 'genesisAura' &&
            t !== this &&
            Math.hypot(
                t.center.x - this.center.x,
                t.center.y - this.center.y
            ) <= t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0) + (t.pokemon?.item?.id === "sunflowerPetal" ? -40 : 0)
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
            this.powerAura = (nearbyPowerAuras[0]?.pokemon?.item?.id == 'sunflowerPetal') ? 1.35 : 1.2;
            this.power = Math.ceil(this.power * this.powerAura);

            if ((this.pokemon.id == 75 || this.pokemon?.adn?.id == 75) && this.pokemon.lvl > 24 && !this.cherrimForm && (this.main.area.weather !== 'harshSunlight' || this.main.area.weather !== 'extremelyHarshSunlight')) {
                this.cherrimForm = true;
                this.updateTowerSprite(this.pokemon.sprite.transform);
            }
        } else {
            this.powerAura = false;
            if ((this.pokemon.id == 75 || this.pokemon?.adn?.id == 75) && this.pokemon.lvl > 24 && this.cherrimForm && (this.main.area.weather !== 'harshSunlight' && this.main.area.weather !== 'extremelyHarshSunlight')) {
                this.cherrimForm = false;
                this.updateTowerSprite(this.pokemon.sprite.image);
            }
        }

        if (nearbyGenesisAuras.length > 0) {
            this.genesisAura = 1.15;
            this.power = Math.ceil(this.power * this.genesisAura);
            this.speed -= (this.speed * 0.1);
        } else {
            this.genesisAura = false;
        }

        if ((this.main.area.weather === 'harshSunlight' || this.main.area.weather === 'extremelyHarshSunlight') && (this.pokemon.id == 75 || this.pokemon?.adn?.id == 75) && this.pokemon.lvl > 24 && !this.cherrimForm) {
            this.cherrimForm = true;
            this.updateTowerSprite(this.pokemon.sprite.transform);
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

        const nearbyIlluminate = this.main.area.towers.filter(t =>
            ['illuminate', 'illuminateBuff'].includes(t.ability?.id) &&
            t !== this &&
            Math.hypot(t.center.x - this.center.x, t.center.y - this.center.y) <= ((t.pokemon?.item?.id === "luminousMoss") ? t.range + 25 : t.range)
        );

        const rangeIlluminate = nearbyIlluminate.reduce(
            (sum, t) => sum + (t.ability.id === 'illuminate' ? 15 : 25),
            0
        );

        if (rangeIlluminate > 0) {
            this.illuminateAura = rangeIlluminate;
            this.range += rangeIlluminate;
            this.revealInvisible = true;
        } else {
            this.illuminateAura = false;
            // Restore revealInvisible to its intrinsic value (own ability/item only)
            this.revealInvisible = (
                this.ability.id === 'illuminate' ||
                this.ability.id === 'illuminateBuff' ||
                this.ability.id === 'frisk' ||
                this.ability.id === 'vigilantFrisk' ||
                this.pokemon?.item?.id === 'silphScope'
            ) ? true : false;
        }

        this.projectile.power = this.power;

        if (this.bombardZone) {
            const dx = this.bombardZone.x - this.center.x;
            const dy = this.bombardZone.y - this.center.y;

            if (this.rangeType === "cross") {

                const axes = [
                    { x: 1, y: 0 },
                    { x: 0, y: 1 }
                ];

                if (this.pokemon?.item?.id === "starPiece") {
                    axes.push({ x: Math.SQRT1_2, y: Math.SQRT1_2 });
                    axes.push({ x: Math.SQRT1_2, y: -Math.SQRT1_2 });
                }

                let bestAxis = axes[0];
                let bestProj = -Infinity;

                for (const axis of axes) {
                    const proj = Math.abs(dx * axis.x + dy * axis.y);
                    if (proj > bestProj) {
                        bestProj = proj;
                        bestAxis = axis;
                    }
                }

                const signedProj = dx * bestAxis.x + dy * bestAxis.y;
                const clampedProj = Math.max(-this.range, Math.min(this.range, signedProj));

                const perpX = dx - bestAxis.x * signedProj;
                const perpY = dy - bestAxis.y * signedProj;

                let maxOffset = this.pokemon.bombardmentArea / 2;

                if (this.pokemon?.item?.id === "wideLens") maxOffset *= 2;
                if (this.main.area.victoryStar) maxOffset *= 1.5;

                const perpDist = Math.hypot(perpX, perpY);
                const scale = perpDist > maxOffset ? maxOffset / perpDist : 1;

                this.bombardZone.x =
                    this.center.x +
                    bestAxis.x * clampedProj +
                    perpX * scale;

                this.bombardZone.y =
                    this.center.y +
                    bestAxis.y * clampedProj +
                    perpY * scale;

            } else {
                const dist = Math.hypot(dx, dy);

                if (dist > this.range) {
                    const ratio = this.range / dist;

                    this.bombardZone.x = this.center.x + dx * ratio;
                    this.bombardZone.y = this.center.y + dy * ratio;
                }
            }
        }
    }

    draw() {
        if (this.anchored && this.wanderTarget) {
            this.ctx.save();
            this.ctx.strokeStyle = '#ff0000';
            this.ctx.lineWidth = 2;

            const size = 6;
            const { x, y } = this.wanderTarget;

            this.ctx.beginPath();
            this.ctx.moveTo(x - size, y - size);
            this.ctx.lineTo(x + size, y + size);
            this.ctx.moveTo(x + size, y - size);
            this.ctx.lineTo(x - size, y + size);
            this.ctx.stroke();

            this.ctx.restore();
        }

        if (this.pokemon.attackType === 'bombardment' && this.bombardZone) {
            this.ctx.save();

            const color = this.pokemon.specie.color;

            this.ctx.save();

            this.ctx.globalAlpha = 0.2;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(this.bombardZone.x, this.bombardZone.y, this.bombardZone.radius, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.globalAlpha = 1;
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.bombardZone.x, this.bombardZone.y, this.bombardZone.radius, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.globalAlpha = 0.9;
            const xSize = 8;

            this.ctx.beginPath();
            this.ctx.moveTo(this.bombardZone.x - xSize, this.bombardZone.y - xSize);
            this.ctx.lineTo(this.bombardZone.x + xSize, this.bombardZone.y + xSize);
            this.ctx.moveTo(this.bombardZone.x + xSize, this.bombardZone.y - xSize);
            this.ctx.lineTo(this.bombardZone.x - xSize, this.bombardZone.y + xSize);
            this.ctx.stroke();

            this.ctx.restore();

            (this.bombardShells || []).forEach(shell => {
                const splashRadius = this.pokemon.bombardmentSplash / 2;

                this.ctx.save();

                if (!shell.impacted) {
                    const t = shell.progress;
                    const x = shell.from.x + (shell.to.x - shell.from.x) * t;
                    const y = shell.from.y + (shell.to.y - shell.from.y) * t;

                    // sombra proyectada en el punto de impacto, mientras vuela
                    this.ctx.globalAlpha = 0.2;
                    this.ctx.fillStyle = '#000';
                    this.ctx.beginPath();
                    this.ctx.arc(shell.to.x, shell.to.y, splashRadius, 0, Math.PI * 2);
                    this.ctx.fill();

                    // sprite del proyectil, orientado hacia donde va
                    this.ctx.globalAlpha = 1;
                    const angle = Math.atan2(shell.to.y - shell.from.y, shell.to.x - shell.from.x);
                    const size = splashRadius * 2;

                    this.ctx.translate(x, y);
                    this.ctx.rotate(angle);

                    if (this.bombardShellSprite?.complete) {
                        this.ctx.drawImage(this.bombardShellSprite, -size / 2, -size / 2, size, size);
                    } else {
                        // fallback mientras carga la imagen
                        this.ctx.fillStyle = '#555';
                        this.ctx.beginPath();
                        this.ctx.arc(0, 0, splashRadius, 0, Math.PI * 2);
                        this.ctx.fill();
                    }
                } else {
                    // pulso de impacto tipo "splash", con el color de la especie
                    const duration = 400;
                    const t = Math.min(1, (shell.impactTime || 0) / duration);
                    const pulseRadius = splashRadius * 1.4 * t;
                    const pulseAlpha = 0.75 * (1 - t);

                    this.ctx.globalAlpha = Math.max(0, pulseAlpha);
                    this.ctx.fillStyle = this.pokemon.specie.color;
                    this.ctx.beginPath();
                    this.ctx.arc(shell.to.x, shell.to.y, pulseRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.restore();
            });
        }

        if (!this.loaded) return;

        if (this.secretSwordEffect) {
            const elapsed = Date.now() - this.secretSwordEffect.start;

            if (elapsed >= this.secretSwordEffect.duration) {
                this.secretSwordEffect = null;
            } else {
                const progress = elapsed / this.secretSwordEffect.duration;
                const alpha = 1 - progress;

                const totalSweep = Math.PI;
                const bladeWidth = 20;

                let currentAngle;

                if (this.secretSwordEffect.direction > 0) {
                    currentAngle =
                        this.secretSwordEffect.baseAngle -
                        totalSweep / 2 +
                        totalSweep * progress;
                } else {
                    currentAngle =
                        this.secretSwordEffect.baseAngle +
                        totalSweep / 2 -
                        totalSweep * progress;
                }

                const dirX = Math.cos(currentAngle);
                const dirY = Math.sin(currentAngle);

                const perpX = -dirY;
                const perpY = dirX;

                const inner = 12;
                const outer = this.range;

                const startLeft = {
                    x: this.center.x + dirX * inner + perpX * bladeWidth,
                    y: this.center.y + dirY * inner + perpY * bladeWidth
                };

                const startRight = {
                    x: this.center.x + dirX * inner - perpX * bladeWidth,
                    y: this.center.y + dirY * inner - perpY * bladeWidth
                };

                const endLeft = {
                    x: this.center.x + dirX * outer + perpX * bladeWidth * 0.35,
                    y: this.center.y + dirY * outer + perpY * bladeWidth * 0.35
                };

                const endRight = {
                    x: this.center.x + dirX * outer - perpX * bladeWidth * 0.35,
                    y: this.center.y + dirY * outer - perpY * bladeWidth * 0.35
                };

                this.ctx.save();

                this.ctx.globalAlpha = alpha;
                this.ctx.lineJoin = "round";
                this.ctx.shadowColor = "#b8f8ff";
                this.ctx.shadowBlur = 25;

                // Hoja
                const grad = this.ctx.createLinearGradient(
                    this.center.x,
                    this.center.y,
                    endLeft.x,
                    endLeft.y
                );

                grad.addColorStop(0, "rgba(255,255,255,0.95)");
                grad.addColorStop(0.5, "rgba(170,235,255,0.75)");
                grad.addColorStop(1, "rgba(120,200,255,0)");

                this.ctx.fillStyle = grad;

                this.ctx.beginPath();
                this.ctx.moveTo(startLeft.x, startLeft.y);
                this.ctx.lineTo(endLeft.x, endLeft.y);
                this.ctx.lineTo(endRight.x, endRight.y);
                this.ctx.lineTo(startRight.x, startRight.y);
                this.ctx.closePath();
                this.ctx.fill();

                // Filo izquierdo
                this.ctx.strokeStyle = "#ffffff";
                this.ctx.lineWidth = 4;
                this.ctx.beginPath();
                this.ctx.moveTo(startLeft.x, startLeft.y);
                this.ctx.lineTo(endLeft.x, endLeft.y);
                this.ctx.stroke();

                // Filo derecho
                this.ctx.beginPath();
                this.ctx.moveTo(startRight.x, startRight.y);
                this.ctx.lineTo(endRight.x, endRight.y);
                this.ctx.stroke();

                // Punta
                this.ctx.beginPath();
                this.ctx.moveTo(endLeft.x, endLeft.y);
                this.ctx.lineTo(
                    this.center.x + dirX * (outer + 12),
                    this.center.y + dirY * (outer + 12)
                );
                this.ctx.lineTo(endRight.x, endRight.y);
                this.ctx.stroke();

                this.ctx.restore();
            }
        }

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

        if (this.powerAura || this.criticalAura || this.criticalDamageAura || this.triageAura || this.genesisAura) {
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
                criticalDamage: { inner: 'rgba(255,50,50,0.38)', middle: 'rgba(220,30,30,0.26)', outer: 'rgba(180,0,0,0.16)' }
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

        if (this.pokemon?.item?.id === 'heartScale' && this.main.area.heartScale > 0) {
            const now = Date.now();
            const pulse = 1 + 0.1 * Math.sin(now / 250);
            const cx = this.center.x;
            const cy = this.center.y + (tileSize * 0.1);
            const size = 4 * pulse * Math.min(5, this.main.area.heartScale);

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

        if (this.feathers > 0) {
            const spacing = 9;
            const redCount = Math.floor(this.feathers / 5);
            const whiteCount = this.feathers % 5;
            const total = redCount + whiteCount;

            const totalWidth = (total - 1) * spacing;
            const startX = Math.round(this.center.x - totalWidth / 2);
            const y = Math.round(this.position.y + 22 + 5 + this.drawYOffset);

            this.ctx.save();

            const drawFeather = (ctx, x, y, color) => {
                ctx.save();
                ctx.translate(Math.round(x) + 0.5, Math.round(y) + 0.5);
                ctx.beginPath();
                ctx.moveTo(0, -5);
                ctx.quadraticCurveTo(5, 0, 0, 6);
                ctx.quadraticCurveTo(-5, 0, 0, -5);

                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000000';
                ctx.stroke();

                ctx.restore();
            };

            for (let i = 0; i < total; i++) {
                const x = startX + i * spacing;
                const isRed = i < redCount;
                drawFeather(this.ctx, x, y, isRed ? '#c53033' : '#ffffff');
            }

            this.ctx.restore();
        }

        if (this.pokemon?.item?.id === 'inverter') {
            this.ctx.save();

            const cx = this.position.x + tileSize / 2;
            const cy = this.position.y + tileSize / 2;

            this.ctx.translate(cx, cy);
            (this.pokemon?.ability?.id == 'simple') ? this.ctx.rotate(Math.PI / 2) : this.ctx.scale(1, -1);
            this.ctx.translate(-cx, -cy);

            this.ctx.imageSmoothingEnabled = false;
            this.ctx.imageSmoothingQuality = 'low';

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
            this.ctx.save();

            this.ctx.imageSmoothingEnabled = false;
            this.ctx.imageSmoothingQuality = 'low';
            this.ctx.drawImage(
                this.sprite,
                crop.position.x, crop.position.y, crop.width, crop.height,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset,
                drawWidth, drawHeight
            );

            this.ctx.restore();
        }

         // bulkUp: tiñe al pokémon de rojo progresivamente según bulkUpPower (máx en 100)
        if (this.ability?.id === 'bulkUp' && this.main.area.bulkUpUsers[this.pokemon.id]?.power > 0) {
            const intensity = Math.min(1, this.main.area.bulkUpUsers[this.pokemon.id]?.power / 500);

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
            tctx.fillStyle = `rgba(255, 0, 0, ${intensity * 0.65})`;
            tctx.fillRect(0, 0, crop.width, crop.height);

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'source-over';
            this.ctx.drawImage(
                temp,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset,
                drawWidth,
                drawHeight
            );
            this.ctx.restore();
        }

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
                this.position.y + offsetY + passengerOffset,
                drawWidth,
                drawHeight
            );
        }

        if (this.ability?.id === "genesisAura") {

            this.ctx.save();

            const t = performance.now() * 0.003;

            // Movimiento
            const floatY = Math.sin(t * 0.8) * 2;
            const scaleX = 1.1 + Math.sin(t) * 0.05;
            const scaleY = 1.1 + Math.cos(t * 1.15) * 0.05;

            const bubbleOffsetY = -12;

            this.ctx.translate(
                this.center.x,
                this.center.y + bubbleOffsetY + floatY
            );
            this.ctx.scale(scaleX, scaleY);

            this.ctx.globalCompositeOperation = "screen";

            const r = 18;

            // Interior
            this.ctx.fillStyle = "rgba(170,240,255,0.10)";
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);
            this.ctx.fill();

            // Borde
            this.ctx.strokeStyle = "rgba(210,255,255,0.9)";
            this.ctx.lineWidth = 1.8;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI * 2);
            this.ctx.stroke();

            // Segundo borde tenue
            this.ctx.globalAlpha = 0.35;
            this.ctx.lineWidth = 0.8;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
            this.ctx.stroke();

            // Brillo principal
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = "rgba(255,255,255,0.85)";
            this.ctx.beginPath();
            this.ctx.arc(
                -6 + Math.sin(t * 1.7) * 1.5,
                -7 + Math.cos(t * 1.4),
                2.2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();

            // Brillo secundario
            this.ctx.globalAlpha = 0.5;
            this.ctx.beginPath();
            this.ctx.arc(
                7 + Math.cos(t * 1.2),
                6 + Math.sin(t * 1.5),
                1.1,
                0,
                Math.PI * 2
            );
            this.ctx.fill();

            this.ctx.restore();
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
        this.projectiles = [];
        let numMax = this.orbital;
        const angularSpeed = this.getOrbitalAngularSpeed();

        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;

        if (this.pokemon?.item?.id == 'jadeOrb') numMax += 2;
        if (!numMax || numMax <= 0) return;

        for (let i = 0; i < numMax; i++) {
            const angle = (i * Math.PI * 2) / numMax;

            const orbitProjectileConfig = {
                ...this.projectile,
                power: this.projectile.power ?? this.basePower,
                orbit: {
                    radius: this.pokemon.range,
                    angularSpeed: angularSpeed,
                    duration: Infinity,
                    hitCooldown: 350,
                    startAngle: angle
                }
            };

            const proj = new Projectile(
                this.center.x,
                this.center.y + spawnOffsetY,
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

        // MOD: Inputs do not change between high-speed simulation substeps.
        if (this._isFirstStep !== false) this.recalculatePower();

        if (this.pokemon.attackType === 'bombardment' && this.bombardZone) {
            if (this.main.area.waveActive) {
                this.bombardCooldown -= simDelta;

                if (this.bombardCooldown <= 0) {
                    this.bombardCooldown = this.speed;

                    let shotCount = this.ability?.id === 'dragonDarts' ? 2 : 1;
                    if (this.pokemon?.item?.id == 'zoomLens') shotCount++;
                    if (this.pokemon?.item?.id == 'choiceScarf') shotCount = 1;

                    for (let i = 0; i < shotCount; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const r = this.bombardZone.radius * Math.sqrt(Math.random());
                        const targetX = this.bombardZone.x + Math.cos(angle) * r;
                        const targetY = this.bombardZone.y + Math.sin(angle) * r;

                        this.bombardShells.push({
                            from: { x: this.center.x, y: this.center.y },
                            to: { x: targetX, y: targetY },
                            progress: 0,
                            duration: 500,
                            impacted: false
                        });
                    }
                }
            }

            this.bombardShells.forEach(shell => {
                if (shell.impacted) return;

                shell.progress += simDelta / shell.duration;

                if (shell.progress >= 1) {
                    shell.progress = 1;
                    shell.impacted = true;
                    shell.impactTime = 0;

                    const splashRadius = this.pokemon.bombardmentSplash / 2;
                    this.main.area.enemies.forEach(enemy => {
                        if (!enemy || enemy.hp <= 0 || enemy.invulnerable) return;
                        if (enemy.invisible && !(this.revealInvisible || this.targetMode === 'invisible')) return;
                        const dx = enemy.center.x - shell.to.x;
                        const dy = enemy.center.y - shell.to.y;
                        const enemySize = Math.max(enemy.width ?? 12, enemy.height ?? 12);

                        if (Math.hypot(dx, dy) <= splashRadius + enemySize / 2) {
                            this.dealDirectDamage(enemy);
                        }
                    });

                    if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');
                }
            });

            this.bombardShells.forEach(shell => {
                if (shell.impacted) shell.impactTime += simDelta;
            });

            this.bombardShells = this.bombardShells.filter(shell => !shell.impacted || shell.impactTime < 400);
        }

        if (this.lightningRodChargeCD > 0) {
            this.lightningRodChargeCD = Math.max(0, this.lightningRodChargeCD - simDelta);
        }

        if (this.pokemon?.item?.id == 'oddKeystone') {
            this.spiritombTimer += simDelta;
            while (this.spiritombTimer >= 200) {
                this.spiritombTimer -= 200;
                const newOrbRadius = this.projectiles[0].orbitRadius - 2;
                this.projectiles.forEach(proj => {
                    proj.orbitRadius = Math.max(70, newOrbRadius);
                })
            }
        }

        if (this.pokemon?.item?.id === 'fullIncense' && this.main.area.waveActive) {
            this.incenseTimer += simDelta;
            while (this.incenseTimer >= 1000) {
                this.incenseTimer -= 1000;
                this.incenseBuff += 2.5;
            }
        }

        if (this.salacBerryTimer > 0) this.salacBerryTimer -= simDelta
        if (this.liechiBerryTimer > 0) this.liechiBerryTimer -= simDelta
        if (this.lansatBerryTimer > 0) this.lansatBerryTimer -= simDelta

        if (this.pokemon?.ability?.id === 'bulkUp' && this.main.area.waveActive && !this.main.area.bulkUpUsers[this.pokemon.id]?.paused) {
            this.bulkUpTimer += simDelta;
            while (this.bulkUpTimer >= 1000) {
                this.bulkUpTimer -= 1000;
                if (this.main.area.bulkUpUsers[this.pokemon.id] == undefined) this.main.area.bulkUpUsers[this.pokemon.id] = { power: 15, paused: false }
                else this.main.area.bulkUpUsers[this.pokemon.id].power += 15;
            }
        }

        if (this.isWandering) {
             const mouse = this.main?.game?.mouse;

            (this.pokemon?.item?.id === 'blimpKeys') ? this.wanderSpeed = 80 : this.wanderSpeed = 50;
            const followMouse = (this.pokemon?.ability?.id === 'unburden') && (this.pokemon?.item?.id === 'blimpKeys') && !this.anchored;

            if (this.anchored) {

            } else if (followMouse && mouse?.x !== undefined && mouse?.y !== undefined) {
                this.wanderTarget = { x: mouse.x, y: mouse.y };
            } else {
                if (!this.wanderTarget) this.pickRandomWanderTarget();
            }

            const cw = this.width || 24;
            const ch = this.height || 24;
            const centerX = this.position.x + cw / 2;
            const centerY = this.position.y + ch / 2;

            if (!this.wanderTarget) return;

            const dx = this.wanderTarget.x - centerX;
            const dy = this.wanderTarget.y - centerY;
            const dist = Math.hypot(dx, dy);

            if (!isFinite(dist) || Number.isNaN(dist)) {
                if (!followMouse && !this.anchored) this.pickRandomWanderTarget();
            } else if (dist < 6) {
                if (!followMouse && !this.anchored) this.pickRandomWanderTarget();
            } else {
                const step = (this.wanderSpeed || 50) * (simDelta / 1000);
                const nx = dx / dist;
                const ny = dy / dist;

                this.position.x += nx * step;
                this.position.y += ny * step;

                this.center = {
                    x: this.position.x + cw / 2,
                    y: this.position.y + ch / 2
                };

                this.x = this.position.x;
                this.y = this.position.y;
            }
        }

        if (['nocturnal', 'meteorBeam'].includes(this.pokemon.ability?.id)) {
            const cw = this.width || 24;
            const ch = this.height || 24;

            let closestSolrock = null;
            let closestDist = Infinity;

            this.main.area.towers.forEach(t => {
                if (t === this) return;
                if (t.pokemon?.ability?.id !== 'diurnal') return;

                const dx = t.center.x - this.center.x;
                const dy = t.center.y - this.center.y;
                const dist = Math.hypot(dx, dy);

                if (dist < closestDist) {
                    closestDist = dist;
                    closestSolrock = t;
                }
            });

            if (this.solrockSwitchCooldown > 0) {
                this.solrockSwitchCooldown -= simDelta;
            }

            const previousSolrock = this.lastSolrockTower ?? null;

            if (
                previousSolrock !== closestSolrock &&
                this.solrockSwitchCooldown <= 0
            ) {
                this.lastSolrockTower = closestSolrock;
                this.lastSolrock = closestSolrock?.pokemon ?? null;
                this.solrockChanged = true;

                this.solrockSwitchCooldown = 1000;

                if (closestSolrock) {
                    this.solrockTransition = {
                        startX: this.center.x,
                        startY: this.center.y,
                        elapsed: 0,
                        duration: 300
                    };
                } else {
                    this.solrockTransition = null;
                }
            }

            const rangeNeeded =
                (this.pokemon.ability?.id == 'nocturnal') ? 100 : 150;

            const inRange =
                closestSolrock && closestDist <= rangeNeeded;

            if (inRange) {
                if (!this.isOrbitingSolrock) {

                    this.isOrbitingSolrock = true;

                    const dx = this.center.x - closestSolrock.center.x;
                    const dy = this.center.y - closestSolrock.center.y;

                    this.lunatoneOrbitAngle = Math.atan2(dy, dx);

                    if (!this.main.player.secrets.minior) {
                        this.main.player.secrets.minior = true;
                        this.main.UI.getSecret('minior');
                    }

                    this.castformTransform();
                }

                this.lunatoneOrbitAngle +=
                    this.lunatoneOrbitSpeed * (simDelta / 1000);

                const orbitX =
                    closestSolrock.center.x +
                    Math.cos(this.lunatoneOrbitAngle) * this.lunatoneOrbitRadius;

                const orbitY =
                    closestSolrock.center.y +
                    Math.sin(this.lunatoneOrbitAngle) * this.lunatoneOrbitRadius;

                let finalX = orbitX;
                let finalY = orbitY;

                if (this.solrockTransition) {
                    const transition = this.solrockTransition;

                    transition.elapsed += simDelta;

                    const t = Math.min(
                        1,
                        transition.elapsed / transition.duration
                    );

                    const eased = t * t * (3 - 2 * t);

                    finalX =
                        transition.startX +
                        (orbitX - transition.startX) * eased;

                    finalY =
                        transition.startY +
                        (orbitY - transition.startY) * eased;

                    if (t >= 1) {
                        this.solrockTransition = null;
                    }
                }

                this.position.x = finalX - cw / 2;
                this.position.y = finalY - ch / 2;

                this.center = {
                    x: finalX,
                    y: finalY
                };

                this.x = this.position.x;
                this.y = this.position.y;

            } else if (this.isOrbitingSolrock) {
                this.isOrbitingSolrock = false;
                this.solrockTransition = null;
                this.castformTransform();
            }
        }

        // PERF: Game precomputes the snowCloak enemy subset once per frame.
        const snowCloakEnemies = this._snowCloakEnemies || this.main.area.enemies;
        this.snowCloakNear = false;
        for (const e of snowCloakEnemies) {
            if (!e || e.hp <= 0 || e.invulnerable || e.passive?.id !== 'snowCloak') continue;
            const dx = e.center.x - this.center.x;
            const dy = e.center.y - this.center.y;
            if (dx * dx + dy * dy <= 160 * 160) {
                this.snowCloakNear = true;
                break;
            }
        }

        if (this.frames.elapsed === undefined) this.frames.elapsed = 0;
        this.frames.elapsed += frameFactor;
        while (this.frames.elapsed >= this.frames.hold) {
            this.frames.current++;
            this.frames.elapsed -= this.frames.hold;
            if (this.frames.current >= this.frames.max) this.frames.current = 0;
        }

        if (shouldDraw) {
            // cadenas de anchorShot: se dibujan aquí para quedar debajo del sprite de la torre
            for (const b of this.beams) {
                if (b && b.active && b.isAnchorChain && typeof b.draw === 'function') b.draw();
            }
            this.draw();
        }

        if (!this.attackCooldown && this.attackCooldown !== 0) this.attackCooldown = 0;
        // cds usan simDelta
        this.attackCooldown -= simDelta;

        if (this.pokemon.id == 70 && this.pokemon.adn.id == 70) return;

        if (this.ability && (this.ability.id === 'illuminate' || this.ability.id === 'illuminateBuff')) {
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
            if (this.pokemon?.item?.id == 'sunflowerPetal') auraRange -= 40;
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

        if (this.ability && this.ability.id === 'genesisAura') {
            const auraRange = this.range;
            let numAllies = 0;
            this.main.area.towers.forEach(tower => {
                if (tower === this) return;
                const dx = tower.center.x - this.center.x;
                const dy = tower.center.y - this.center.y;
                const distance = Math.hypot(dx, dy);
                if (distance <= auraRange) {
                    numAllies++;
                    tower.genesisBuffActive = true;
                }
            });
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

        if (this.ability && this.ability.id === 'plus') {
            this.main.area.linkBeams = this.main.area.linkBeams || [];

            const maxSearchRange = 2000;
            const areaTowers = this.main.area.towers || [];

            const minusList = areaTowers.filter(t => t && t !== this && t.ability && t.ability.id === 'minus');

            const neededKeys = new Set();

            const getKeyId = t => t?.uid ?? (`tile-${t?.tile?.id ?? Math.random()}`);

            for (const m of minusList) {
                if (!m || !m.center) continue;

                const dx = m.center.x - this.center.x;
                const dy = m.center.y - this.center.y;
                const dist = Math.hypot(dx, dy);
                if (dist > maxSearchRange) continue;

                const a = getKeyId(this);
                const b = getKeyId(m);
                const pairKey = (a < b) ? `${a}-${b}` : `${b}-${a}`;
                neededKeys.add(pairKey);

                let existing = this.main.area.linkBeams.find(lb => lb.pairKey === pairKey);
                if (existing) {
                    existing.fromTower = this;
                    existing.toTower = m;
                    existing.active = true;
                    continue;
                }

                const beam = new LinkBeam(this, m, { width: 12, hitCooldown: 1000, maxRange: 2000, color: (this.pokemon?.specie?.color || '#ff6600') });
                this.main.area.linkBeams.push(beam);
            }

            this.main.area.linkBeams = this.main.area.linkBeams.filter(lb => {
                if (!lb || !lb.pairKey) return false;
                if (lb.pairKey.includes(getKeyId(this)) && !neededKeys.has(lb.pairKey)) {
                    if (lb) lb.active = false;
                    return false;
                }
                return true;
            });
        }

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

        if (this.pokemon.attackType === 'bombardment') this.target = null;

        if (this.ability?.id === 'boomburst' || this.ability?.id === 'liquidVoice') {
            if (validEnemies.length > 0 && this.attackCooldown <= 0) {
                if (!this.main.mute[0]) playSound('chimecho', 'effect');

                const waveSpeed = this.range / 50;
                const waveDelay = 450;
                const waveWidth = 6;

                let boomburstWavesNumber = (this.ability?.id === 'boomburst') ? 3 : 2;
                if (this.pokemon?.item?.id === "sootheBell") boomburstWavesNumber += 2;

                for (let w = 0; w < boomburstWavesNumber; w++) {
                    this.boomburstWaves.push({
                        radius: 0,
                        alpha: 0.9,
                        speed: waveSpeed,
                        maxRadius: this.range,
                        width: waveWidth,
                        delay: w * waveDelay,
                        elapsed: 0,
                        started: false,
                        hitEnemies: new Set(),
                    });
                }

                this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
            }

            for (let wi = this.boomburstWaves.length - 1; wi >= 0; wi--) {
                const bw = this.boomburstWaves[wi];

                bw.elapsed += simDelta;
                if (bw.elapsed < bw.delay) continue;
                bw.started = true;

                bw.radius += bw.speed * frameFactor;
                bw.alpha -= 0.018 * frameFactor;

                for (const enemy of validEnemies) {
                    if (bw.hitEnemies.has(enemy)) continue;

                    const dist = Math.hypot(
                        enemy.center.x - this.center.x,
                        enemy.center.y - this.center.y
                    );

                    if (dist <= bw.radius && dist >= bw.radius - bw.width) {
                        let bbWaveDamage = this.projectile.power;

                        // bonus damage
                        if (this.pokemon?.item?.id === 'ovalCharm') {
                            const ovalCharmMultiplier = (10 - this.main.team.pokemon.length) * 12.5;
                            bbWaveDamage += Math.ceil((bbWaveDamage * ovalCharmMultiplier) / 100);
                        }
                        if (this.pokemon?.item?.id == 'quickClaw') bbWaveDamage = Math.ceil(bbWaveDamage / 2);
                        if (this.pokemon?.item?.id == 'laggingTail') bbWaveDamage += Math.ceil(bbWaveDamage / 2);

                        // CRITICAL
                        let isCritical = false;
                        let critical = this.critical;

                        if (this.isMounted && (this.pokemon.id == 114 || this.pokemon?.adn?.id == 114)) critical += 30;
                        if (this.criticalAura) critical += 20;
                        if (this.genesisAura) critical += 5;
                        if (this.pokemon?.item?.id == 'direHit') critical += 25;
                        if (this.pokemon?.item?.id == 'expertBelt') critical += 10;
                        if (this.pokemon?.item?.id == 'lansatBerry' && this.lansatBerryTimer > 0) critical += 60;

                        if ((Math.random() * 100) < critical && this.tower?.pokemon?.item?.id != 'blueBandana') {
                            isCritical = true;
                            let multiplier = (this.ability?.id === 'superCritical') ? 2.0 : 1.5;
                            if (this.criticalDamageAura) multiplier *= 1.5;
                            if (this.pokemon?.item?.id == 'clover') multiplier *= 1.3;
                            if (this.main?.area?.weather == 'hail') multiplier *= 1.1;
                            if (this.ability?.id === 'waterCompaction' && this.main?.area?.weather == 'rain') multiplier *= 1.3;
                            bbWaveDamage = Math.ceil(bbWaveDamage * multiplier);
                        }

                        bw.hitEnemies.add(enemy);

                        enemy.getDamaged(
                            bbWaveDamage,
                            'physical',
                            this.pokemon.ability,
                            isCritical,
                            new Set(),
                            this.pokemon,
                            this
                        );

                        if (this.ability?.id === 'boomburst' && enemy.canStun && Math.random() < 0.10) {
                            if (this.pokemon?.item?.id === 'lightClay') {
                                enemy.applyStatusEffect({ type: 'stun', duration: 1.65 });
                            } else {
                                enemy.applyStatusEffect({ type: 'stun', duration: 1.5 }, this.pokemon);
                            }
                        }

                        if (this.ability?.id === 'liquidVoice' && enemy.canSlow && Math.random() < 0.25) {
                            if (this.pokemon?.item?.id === 'lightClay') {
                                enemy.applyStatusEffect({ type: 'slow', duration: 2.2, slowPercent: 0.5 });
                            } else {
                                enemy.applyStatusEffect({ type: 'slow', duration: 2, slowPercent: 0.5 }, this.pokemon);
                            }
                        }
                    }
                }

                if (shouldDraw && bw.alpha > 0) {
                    const hex = (this.pokemon.specie.color || '#e85e29').replace('#', '');
                    const r = parseInt(hex.substring(0, 2), 16) || 255;
                    const g = parseInt(hex.substring(2, 4), 16) || 255;
                    const b = parseInt(hex.substring(4, 6), 16) || 255;

                    this.ctx.save();
                    this.ctx.globalCompositeOperation = 'lighter';

                    this.ctx.beginPath();
                    this.ctx.arc(this.center.x, this.center.y, bw.radius, 0, Math.PI * 2);
                    this.ctx.strokeStyle = `rgba(${r},${g},${b},${bw.alpha * 0.3})`;
                    this.ctx.lineWidth = bw.width * 2.2;
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.arc(this.center.x, this.center.y, bw.radius, 0, Math.PI * 2);
                    this.ctx.strokeStyle = `rgba(${r},${g},${b},${bw.alpha})`;
                    this.ctx.lineWidth = bw.width * 0.7;
                    this.ctx.stroke();

                    const innerRadius = bw.radius - bw.width * 0.25;

                    if (innerRadius > 0) {
                        this.ctx.beginPath();
                        this.ctx.arc(this.center.x, this.center.y, innerRadius, 0, Math.PI * 2);
                        this.ctx.strokeStyle = `rgba(255,255,255,${bw.alpha * 0.55})`;
                        this.ctx.lineWidth = bw.width * 0.2;
                        this.ctx.stroke();
                    }

                    this.ctx.restore();
                }

                if (bw.radius >= bw.maxRadius || bw.alpha <= 0) {
                    this.boomburstWaves.splice(wi, 1);
                }
            }
            return;
        }

        // --- TORRES DE ÁREA ---
        if (this.pokemon.attackType === 'area') {
            let areaAttacksThisFrame = 0;
            let areaFiredThisFrame = false;
            const MAX_AREA_ATTACKS_PER_FRAME = 50;
            const areaAttackSpeed = Math.max(0.01, this.speed * (this.snowCloakNear ? 1.5 : 1));

            while (validEnemies.length > 0 && this.attackCooldown <= 0 && areaAttacksThisFrame < MAX_AREA_ATTACKS_PER_FRAME) {
                if (!areaFiredThisFrame && !this.main.mute[0]) playSound(this.projectile.effect, 'effect');

                for (const enemy of validEnemies) {
                    if (enemy?.passive?.id === 'static') {
                        const dx = enemy.center.x - this.center.x;
                        const dy = enemy.center.y - this.center.y;
                        const dist = Math.hypot(dx, dy);
                        if (dist <= 115 && Math.random() < 0.25) {
                            playSound('paralyzed', 'effect');
                            this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
                            enemy.achievementCount++;
                            return;
                        }
                    }
                }

                const tr = (this.pokemon?.item?.id == 'rockyHelmetSpikes') ? 250 : 500;

                if (this.ability?.id === 'spikes') {
                    const pos = { x: this.center.x, y: this.center.y };
                    this.main.area.createSpikeZone(pos, this, {
                        radius: this.range,
                        duration: 5000,
                        tickRate: tr,
                        dedupDistance: 32,
                        dedupTime: 250
                    });

                    this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
                    return;
                }

                validEnemies.forEach(enemy => {
                    if (enemy.invulnerable) return;

                    let finalDamage = this.projectile.power;

                    if (this.pokemon?.item?.id == 'softSand') {
                        let ssBonus = Math.max(1, 400 * Math.pow(0.5, validEnemies.length - 1));
                        finalDamage += Math.floor(finalDamage * (ssBonus / 100));
                    }

                    if (this.pokemon?.item?.id == 'sharpBeak' && this.tile.land == 4) {
                        let dist = Math.sqrt(Math.pow(enemy.position.x - this.position.x, 2) + Math.pow(enemy.position.y - this.position.y, 2));
                        let bonus = Math.min(1.5, Math.sqrt(this.range / dist, 2));
                        finalDamage = Math.floor(finalDamage * bonus);
                    }
                    if (
                        this.pokemon?.item?.id == 'quickPowder' ||
                        this.pokemon?.item?.id == 'quickClaw' ||
                        (this.pokemon?.item?.id == 'scovillainSiracha' && this.ability?.id !== 'burnDoubleShot')
                    ) finalDamage -= Math.ceil(this.power / 2);
                    if (this.pokemon?.item?.id == 'metalPowder' || this.pokemon?.item?.id == 'lifeOrb') finalDamage += Math.ceil(this.power / 2);
                    if (this.pokemon?.item?.id == 'hardStone') finalDamage += Math.floor(finalDamage * 0.25);
                    if (this.pokemon?.item?.id == 'laggingTail') finalDamage += Math.ceil(this.power / 2);

                    if (this.ability?.id === 'fieryDance' && enemy.burnedBy != null) {
                        finalDamage = Math.ceil(finalDamage * 1.35);
                        enemy.statusEffects.forEach(effect => {
                            if (effect.type == 'burn') {
                                let burnExplosion = effect.duration * 0.003 * enemy.hpMax;
                                finalDamage = Math.ceil(finalDamage + burnExplosion);
                                effect.duration = 0;
                            }
                        })
                    }

                    if (this.ability?.id === 'dreamEater' && enemy.nightmaredBy != null) {
                        finalDamage = Math.ceil(finalDamage * 2);
                    }

                    if (this.tower?.pokemon?.item?.id === 'ancientShield' || (this.tower?.pokemon?.item?.id == 'eviolite')) {
                        finalDamage = Math.ceil(finalDamage * 1.2);
                    }

                    if ([165, 175, 176].includes(this.pokemon.id) && this.main.area.swordsDance) {
                        finalDamage = Math.ceil(finalDamage * 1.2);
                    }

                    if (this.isMounted && (this.pokemon.id == 114 || this.pokemon?.adn?.id == 114)) {
                        finalDamage = Math.ceil(finalDamage * 1.5);
                    }

                    let isCritical = false;

                    let critical = this.critical;

                    if (this.isMounted && (this.pokemon.id == 114 || this.pokemon?.adn?.id == 114)) critical += 30;
                    if (this.criticalAura) critical += 20;
                    if (this.genesisAura) critical += 5;
                    if (this.pokemon?.item?.id == 'direHit') critical += 25;
                    if (this.pokemon?.item?.id == 'expertBelt') critical += 10;

                    if (this.pokemon?.item?.id == 'lansatBerry' && this.lansatBerryTimer > 0) {
                       critical += 60;
                    }

                    if ([165, 175, 176].includes(this.pokemon.id) && this.main.area.heartOfSteel) {
                        critical += (this.main.area.hitsReceived > 0) ? 15 : 5;
                    }

                    if (this.ability?.id === 'waterCompaction' && this.main?.area?.weather == 'rain') {
                        finalDamage = Math.ceil(finalDamage * 1.3);
                        critical += 30;
                    }

                    if ((Math.random() * 100) < critical && this.tower?.pokemon?.item?.id != 'blueBandana') {
                        isCritical = true;
                        let multiplier = (this.ability?.id === 'superCritical') ? 2.0 : 1.5;
                        if (this.criticalDamageAura) multiplier *= 1.5;
                        if (this.pokemon?.item?.id == 'clover') multiplier *= 1.3;
                        if (this.main?.area?.weather == 'hail') multiplier *= 1.1;
                        if (this.ability?.id === 'waterCompaction' && this.main?.area?.weather == 'rain') multiplier *= 1.3;
                        finalDamage = Math.ceil(finalDamage * multiplier);
                    }

                    if (
                        this.main.area.weather == 'rain' &&
                        (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform')
                    ) {
                        finalDamage = Math.ceil(finalDamage * 1.2);
                    }

                    if (
                        this.main.area.weather == 'heavyRain' && this.pokemon?.item?.id != 'safetyGoggles' &&
                        (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform')
                    ) {
                        if (!this.main.area.airLock) {
                            finalDamage = (this.main.area.cloudNine) ? Math.ceil(finalDamage * 0.875) : Math.ceil(finalDamage * 0.5);
                        }
                    }

                    if (this.pokemon?.item?.id === 'blueBandana') {
                        finalDamage = Math.ceil(finalDamage * (1 + this.critical * 0.01));
                    }

                    if (this.pokemon?.item?.id === 'ovalCharm') {
                        let ovalCharmMultiplier = (10 - this.main.team.pokemon.length) * 12.5;
                        finalDamage += Math.ceil((finalDamage * ovalCharmMultiplier) / 100);
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

                    if (this.ability.id === 'moldBreaker' && Math.random() < 0.3) {
                        if (enemy.canStun) enemy.applyStatusEffect({ type: 'stun', duration: 2 });
                        else enemy.applyStatusEffect({ type: 'stun', duration: 1 });
                    }

                    if (enemy.canStun && this.ability.id === 'refrigerate' && Math.random() < (0.2 + (this.main.player.fossilInTeam * 0.02))) {
                        (this.pokemon?.item?.id == 'lightClay') ? enemy.applyStatusEffect({ type: 'stun', duration: 1.65 }) : enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
                    } else if (enemy.canSlow && this.ability.id === 'refrigerate' && this.pokemon?.item?.id == 'sailFossil') {
                        enemy.applyStatusEffect({ type: 'slow', duration: 0.5, slowPercent: 0.5 })
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

        const featherDanceMax = (this.pokemon?.item?.id == 'boiledEgg') ? 30 : 20;

        if (!this.target && this.ability.id == 'featherDance' && this.attackCooldown <= 0 && this.feathers < featherDanceMax) {
            this.feathers++;
            this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
        }

        const isOrbitalTower = this.attackType === 'orbital' || this.pokemon?.attackType === 'orbital' || (this.orbital ?? 0) > 0;
        if (isOrbitalTower && !this.projectiles.some(p => p?.orbit)) this.refreshOrbitalProjectiles();

        let shotsThisFrame = 0;
        let firedThisFrame = false;
        const MAX_SHOTS_PER_FRAME = 50;
        const attackSpeed = Math.max(0.01, this.speed * (this.snowCloakNear ? 1.5 : 1));

        while (this.target && this.attackCooldown <= 0 && validEnemies.length > 0 && shotsThisFrame < MAX_SHOTS_PER_FRAME && !isOrbitalTower) {
            let maxShots =
                this.ability && this.ability.id === 'cradily' ? this.main.player.fossilInTeam :
                this.ability && (this.ability.id === 'quadraShot' || this.ability.id === 'quadraShotSand') ? 4 :
                this.ability && this.ability.id === 'tripleShot' ? 3 :
                this.ability && this.ability.id === 'octaShot' ? 8 :
                this.ability && (
                    this.ability.id === 'doubleShot' ||
                    this.ability.id === 'burnDoubleShot' ||
                    this.ability.id === 'doubleShotSand' ||
                    this.ability.id === 'curseDoubleShot' ||
                    this.ability.id === 'poisonDoubleShot' ||
                    this.ability.id === 'armorBreakDoubleShot' ||
                    this.ability.id ===  'bitterBlade' ||
                    this.pokemon?.item?.id == 'zoomLens' ||
                    this.pokemon?.item?.id == 'auspiciousArmor'
                ) ? 2 : 1;

            if (this.pokemon?.item?.id == 'choiceScarf') maxShots = 1;
            if (this.pokemon?.item?.id == 'zoomLens' && this.pokemon?.ability?.id == 'simple') maxShots = 3;
            if (this.pokemon?.item?.id == 'cherryBlossom') maxShots = 3;

            const orderedAll = this.getOrderedEnemies(validEnemies);

            let filteredOrderedAll = orderedAll;
            let filteredTarget = this.target;

            if (this.ability?.id === 'anchorShot') {
                const anchoredEnemies = new Set(
                    this.beams
                        .filter(b => b.isAnchorChain && b.active && b.attachedEnemy)
                        .map(b => b.attachedEnemy)
                );

                filteredOrderedAll = orderedAll.filter(e => !anchoredEnemies.has(e));
                if (filteredTarget && anchoredEnemies.has(filteredTarget)) filteredTarget = null;
            }

            const targets = [];
            if (filteredTarget && validEnemies.includes(filteredTarget)) targets.push(filteredTarget);

            for (let i = 0; i < filteredOrderedAll.length && targets.length < maxShots; i++) {
                const cand = filteredOrderedAll[i];
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
                this.attackCooldown += attackSpeed;
                break;
            } else {
                targets.forEach(tgt => {
                    if (!tgt) return;
                    if (this.ability?.id === "secretSword") {
                        this.secretSwordAttack(tgt);
                        return;
                    }
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
                    } else if (this.ability.id === 'zapCannon' || this.ability.id === 'meteorBeam') {
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
                    } else if (this.ability.id === 'anchorShot') {
                        const activeChains = this.beams.filter(b => b.isAnchorChain && b.active);
                        const alreadyAnchored = activeChains.some(b => b.attachedEnemy === tgt);

                        if (!alreadyAnchored && activeChains.length < 6) {
                            const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                            const from = { x: this.center.x, y: this.center.y };
                            const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                            const liberationRange = (tgt.cursed) ? 100 : 40;

                            const chain = new Beam(from, to, this, {
                                width: 6,
                                duration: Infinity,
                                hitCooldown: 500,
                                attachedEnemy: tgt,
                                persistOnDeath: false,
                                detachDistance: this.range + liberationRange,
                                onlyAttachedEnemy: true
                            });
                            chain.isAnchorChain = true;

                            this.beams.push(chain);

                            if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');
                        }
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
                            if (this.pokemon?.ability?.id == 'bulkUp') this.main.area.bulkUpUsers[this.pokemon.id].paused = true;
                            if (this.pokemon?.ability?.id === 'meteorMash' && (this.main.area.meteorMashUsers[this.pokemon.id] < 7 || this.main.area.meteorMashUsers[this.pokemon.id] == undefined)) {
                                this.meteorMashCount++;
                                if (this.meteorMashCount % 4 === 0) {
                                    if (this.main.area.meteorMashUsers[this.pokemon.id] == undefined) this.main.area.meteorMashUsers[this.pokemon.id] = 1;
                                    else this.main.area.meteorMashUsers[this.pokemon.id]++;
                                }
                            }
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

                if (!firedThisFrame && !this.main.mute[0]) {
                    if (this.pokemon?.item?.id == 'subwoofer') {
                        let bark = Math.floor(Math.random() * 4) + 1;
                        playSound(`dog${bark}`, 'effect');
                    } else playSound(this.projectile.effect, 'effect');
                }

                if (['voltSurge'].includes(this.ability.id)) {
                    this.main.area.towers
                        .filter(t => t.ability?.id === "aggressiveNature")
                        .forEach(t => t.attackCooldown -= 99999);
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

            if (isOrbitalTower || p.orbit) {

            } else if (!p.enemy || p.enemy.hp <= 0 || (p.enemy.invisible && !(p.tower?.revealInvisible || p.tower?.targetMode === 'invisible'))) {
                const newTarget = p.tower ? p.tower.findClosestEnemy(p.tower, p.tower.range || 100) : null;
                if (newTarget) {
                    p.enemy = newTarget;
                } else {
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }

            if (typeof p.update === 'function') p.update(deltaTime, shouldDraw);
            if (p.markedForDeletion) this.projectiles.splice(i, 1);
        }

        //rayo solar - hidrobomba
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const b = this.beams[i];
            if (!b) {
                this.beams.splice(i, 1);
                continue;
            }
            b.update(simDelta);
            if (!b.isAnchorChain) b.draw();
            if (!b.active) {
                this.beams.splice(i, 1);
            }
        }

        // voltSurge
        for (let i = this.voltSurgeChains.length - 1; i >= 0; i--) {
            const chain = this.voltSurgeChains[i];
            chain.remaining -= simDelta;
            if (chain.remaining <= 0) {
                this.voltSurgeChains.splice(i, 1);
                continue;
            }
            const alpha = Math.max(0, chain.remaining / chain.duration);
            this.drawVoltSurgeChain(chain.points, alpha);
        }

        if (this.main.area.linkBeams && this.main.area.linkBeams.length > 0) {
            if (this.main.area.towers[0] === this) {
                for (let i = this.main.area.linkBeams.length - 1; i >= 0; i--) {
                    const lb = this.main.area.linkBeams[i];
                    if (!lb) { this.main.area.linkBeams.splice(i, 1); continue; }

                    // Si las torres del beam ya no están en area.towers -> eliminar inmediatamente
                    const areaTowers = lb.fromTower?.main?.area?.towers || [];
                    if (!areaTowers.includes(lb.fromTower) || !areaTowers.includes(lb.toTower)) {
                        this.main.area.linkBeams.splice(i, 1);
                        continue;
                    }

                    // Si alguna torre ha quedado con tilePosition -1/undefined -> eliminar
                    const fp = lb.fromTower?.pokemon?.tilePosition;
                    const tp = lb.toTower?.pokemon?.tilePosition;
                    if (fp === undefined || tp === undefined || fp === -1 || tp === -1) {
                        this.main.area.linkBeams.splice(i, 1);
                        continue;
                    }

                    lb.update(simDelta);
                    lb.draw();

                    if (!lb.active) {
                        this.main.area.linkBeams.splice(i, 1);
                    }
                }
            }
        }
    }

    findClosestEnemy(fromEnemy, maxDist = 1000) {
        let closest = null;
        let minDistSq = maxDist * maxDist;
        const canvasWidth = this.main.game.canvas.width;
        const canvasHeight = this.main.game.canvas.height;
        for (const e of this.main.area.enemies) {
            if (!e || e === fromEnemy || e.hp <= 0) continue;
            const enemyX = e.center.x;
            const enemyY = e.center.y;
            if (enemyX < 0 || enemyX > canvasWidth || enemyY < 0 || enemyY > canvasHeight) continue;
            const dx = enemyX - fromEnemy.center.x;
            const dy = enemyY - fromEnemy.center.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq < minDistSq) {
                minDistSq = distanceSq;
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

        if (this.pokemon?.item?.id == 'oddKeystone') {
            this.projectiles.forEach(proj => {
                //proj.orbitRadius += 5
                proj.orbitRadius = Math.min(100, proj.orbitRadius + 3);
            })
        }

        if (['quickPowder', 'quickClaw', 'zoomLens', 'scovillainSiracha'].includes(this.pokemon?.item?.id)) finalDamage -= Math.ceil(this.power / 2);
        if (['laggingTail'].includes(this.pokemon?.item?.id)) finalDamage += Math.ceil(this.power / 2);

        if (['metalPowder', 'lifeOrb'].includes(this.pokemon?.item?.id)) finalDamage += Math.ceil(this.power / 2);
        if (this.pokemon?.item?.id == 'hardStone') finalDamage += Math.floor(finalDamage * 0.25);
        if (this.pokemon?.item?.id == 'eviolite') finalDamage += Math.floor(finalDamage * 0.2);
        // Critical
        let isCritical = false;
        let critical = this.critical ?? 0;
        if (this.criticalAura) critical += 20;
        if (this.genesisAura) critical += 5;
        if (this.pokemon?.item?.id == 'direHit') critical += 25;
        if (this.pokemon?.item?.id == 'expertBelt') critical += 10;
        if (this.pokemon?.item?.id == 'lansatBerry' && this.lansatBerryTimer > 0) {
            critical += 60;
        }

        if ([165, 175, 176].includes(this.pokemon.id) && this.main.area.heartOfSteel) {
             critical += (this.main.area.hitsReceived > 0) ? 15 : 5;
        }

        if ((Math.random() * 100) < critical && this.tower?.pokemon?.item?.id != 'blueBandana') {
            isCritical = true;
            let multiplier = (this.ability?.id === 'superCritical') ? 2.0 : 1.5;
            if (this.criticalDamageAura) multiplier *= 1.5;
            if (this.pokemon?.item?.id == 'clover') multiplier *= 1.5;
            if (this.main?.area?.weather == 'hail') multiplier *= 1.25;
            finalDamage = Math.ceil(finalDamage * multiplier);
        }

        if (this.pokemon?.item?.id === 'blueBandana') {
            isCritical = false;
            finalDamage = Math.ceil(finalDamage * (1 + this.critical * 0.01));
        }

        if (this.pokemon?.item?.id === 'ovalCharm') {
            let ovalCharmMultiplier = (10 - this.main.team.pokemon.length) * 12.5;
            finalDamage += Math.ceil((finalDamage * ovalCharmMultiplier) / 100);
        }

        if ([165, 175, 176].includes(this.pokemon.id) && this.main.area.swordsDance) {
            finalDamage = Math.ceil(finalDamage * 1.2);
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
            (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform')
        ) {
            if (!this.main.area.airLock) {
                finalDamage = (this.main.area.cloudNine) ? Math.ceil(finalDamage * 0.875) : Math.ceil(finalDamage * 0.5);
            }
        }

        if (this.pokemon?.item?.id === 'amuletCoin') {
            let g = Math.ceil(finalDamage * 0.001 * (Math.min(1200, this.main.player.stars)));
            this.main.area.goldWave += g;
            this.main.player.changeGold(g);
        }

        // ESTADOS
        if (enemy.canBurn && this.pokemon.ability?.id === 'flameWheel' && Math.random() < 0.5) {
            if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
            else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
            else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);
        }

        if (enemy.canBurn && this.pokemon.ability?.id === 'lavaPlume') {
            if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
            else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
            else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);
        }

        if (this.pokemon.ability?.id === 'shadowBall') {
            enemy.applyStatusEffect({ type: 'nightmare', damage: null, stacks: 1 }, this.pokemon);
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
        if (this.pokemon?.item?.id === 'koffingJelly' && enemy.canPoison) {
            enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.pokemon);
        }

        if (this.pokemon?.ability?.id === 'hyperBeam') finalDamage *= 3;
        if (this.pokemon?.ability?.id === 'meteorBeam' && this.isOrbitingSolrock) finalDamage *= 2
        // aplicar daño con el método del enemigo
        enemy.getDamaged(finalDamage, source, this.pokemon.ability, isCritical, new Set(), this.pokemon, this);
    }

    drawVoltSurgeChain(points, alpha) {
        if (!this.ctx || !points || points.length < 2) return;
        const ctx = this.ctx;
        const now = Date.now();

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < points.length - 1; i++) {
            const from = points[i];
            const to = points[i + 1];

            ctx.shadowBlur = 8;
            ctx.shadowColor = `rgba(255, 235, 100, ${alpha * 0.6})`;
            ctx.strokeStyle = `rgba(255, 215, 60, ${alpha * 0.85})`;
            ctx.lineWidth = 4;
            this._drawVoltSurgeSegment(ctx, from, to, 6, now + i * 40);

            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 1.5;
            this._drawVoltSurgeSegment(ctx, from, to, 3, now + 60 + i * 40);
        }

        ctx.restore();
    }

    _drawVoltSurgeSegment(ctx, from, to, deviation, seed) {
        const segments = 6;
        const angle = Math.atan2(to.y - from.y, to.x - from.x) + Math.PI / 2;

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);

        for (let i = 1; i < segments; i++) {
            const t = i / segments;
            let px = from.x + (to.x - from.x) * t;
            let py = from.y + (to.y - from.y) * t;

            const offset = Math.sin(seed * 0.02 + i * 2) * deviation;
            px += Math.cos(angle) * offset;
            py += Math.sin(angle) * offset;

            ctx.lineTo(px, py);
        }

        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    secretSwordAttack(target) {
        const baseAngle = Math.atan2(
            target.center.y - this.center.y,
            target.center.x - this.center.x
        );

        const sweep = 180 * Math.PI / 180;

        const from = this.secretSwordSide > 0
            ? baseAngle - sweep / 2
            : baseAngle + sweep / 2;

        const to = this.secretSwordSide > 0
            ? baseAngle + sweep / 2
            : baseAngle - sweep / 2;

        this.secretSwordEffect = {
            baseAngle,
            direction: this.secretSwordSide,
            start: Date.now(),
            duration: 300
        };

        this.secretSwordSide *= -1;

        const dirX = Math.cos(baseAngle);
        const dirY = Math.sin(baseAngle);

        const bladeWidth = 50;

        for (const enemy of this.main.area.enemies) {

            if (
                enemy.dead ||
                enemy.invisible ||
                enemy.escaped
            ) continue;

            const dx = enemy.center.x - this.center.x;
            const dy = enemy.center.y - this.center.y;

            // Distancia sobre el eje de la espada
            const forward = dx * dirX + dy * dirY;

            if (forward < 0 || forward > this.range)
                continue;

            // Distancia al eje
            const side = Math.abs(dx * -dirY + dy * dirX);

            // Sumar el radio aproximado del enemigo
            const enemyRadius = Math.max(enemy.width, enemy.height) * 0.5;

            if (side > bladeWidth + enemyRadius)
                continue;

            this.dealDirectDamage(enemy);
        }

        playSound("slash", "battle");
    }

    getOrderedEnemies(validEnemies) {
        if (!validEnemies || validEnemies.length === 0) return [];

        const arr = validEnemies.slice();

        const hasStatus = (e, type) => e.statusEffects && e.statusEffects.some(se => se.type === type);
        if (this.pokemon?.item?.id == 'quickClaw' && this.ability.id !== 'contrary') this.targetMode = 'faster';
        if (this.pokemon?.item?.id == 'silphScope') {
            this.targetMode = 'invisible';

            if (this.pokemon?.id == 53) {
                const hasInvisible = arr.some(e => e.invisible === true);
                if (!hasInvisible) this.targetMode = 'random';
            }
        }

        switch (this.targetMode) {
            case 'invisible':
                arr.sort((a, b) => (b.distanceTraveled || 0) - (a.distanceTraveled || 0));
                arr.sort((a, b) => Number(b.invisible === true) - Number(a.invisible === true));
                break;
            case 'first':
                arr.sort((a, b) => (b.distanceTraveled || 0) - (a.distanceTraveled || 0));
                break;
            case 'last':
                arr.sort((a, b) => (a.distanceTraveled || 0) - (b.distanceTraveled || 0));
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
        if (this.pokemon?.item?.id == 'quickClaw' && this.ability.id !== 'contrary') this.targetMode = 'faster';
        if (this.pokemon?.item?.id == 'silphScope') this.targetMode = 'invisible';

        switch (this.targetMode) {
            case 'invisible':
                validEnemies.reduce((prev, curr) =>
                    curr.distanceTraveled > prev.distanceTraveled ? curr : prev
                );
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
        if (this.pokemon?.item?.id == 'twistedSpoon' || this.pokemon.isPassenger) {
            if (!this.main.mute[1]) playSound('teleport', 'effect');
            (!this.teleportBuff) ? this.teleportBuff = 2 : this.teleportBuff++;
        } else {
            const tiles = this.main.area.placementTiles.filter(tile => (tile.tower === false && [1, 2, 4].includes(tile.land)))
            const tile = tiles[Math.floor(Math.random() * tiles.length)];
            if (tile == undefined) return;
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

    rerollBombardZone() {
        const zoneRadius = this.pokemon?.bombardmentArea / 2;
        let x, y;

        if (this.rangeType === 'cross') {
            const dist = (Math.random() * 2 - 1) * this.range; // entre -range y +range

            if (Math.random() < 0.5) {
                x = this.center.x + dist;
                y = this.center.y;
            } else {
                x = this.center.x;
                y = this.center.y + dist;
            }
        } else {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * this.range;
            x = this.center.x + Math.cos(angle) * dist;
            y = this.center.y + Math.sin(angle) * dist;
        }

        this.bombardZone = { x, y, radius: zoneRadius };
        this.bombardShells = [];
        this.bombardCooldown = 0;
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

        this.detachDistance = options.detachDistance ?? null; // se suelta si el enganchado se aleja más de esto de la torre
        this.onlyAttachedEnemy = options.onlyAttachedEnemy ?? false; // solo golpea al enganchado, no a quien cruce la línea

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
            const stillPresent = this.tower?.main?.area?.enemies?.includes(this.attachedEnemy);
            const stillAlive = this.attachedEnemy.hp > 0 && stillPresent;

            if (stillAlive) {
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

            if (this.detachDistance && this.attachedEnemy) {
                const towerX = this.tower?.center?.x ?? fx;
                const towerY = this.tower?.center?.y ?? fy;
                const ddx = this.attachedEnemy.center.x - towerX;
                const ddy = this.attachedEnemy.center.y - towerY;
                if (Math.hypot(ddx, ddy) >= this.detachDistance) {
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
        const now = this.simulatedTime;

        this._recomputeDirection();
        if (!this.active) return;

        if (this.onlyAttachedEnemy) {
            const e = this.attachedEnemy;
            if (e && e.hp > 0 && !e.invulnerable) {
                const last = this.perEnemyLastHit.get(e) || 0;
                if (now - last >= this.hitCooldown) {
                    if (typeof this.tower.dealDirectDamage === 'function') {
                        this.tower.dealDirectDamage(e);
                    } else {
                        let dmg = this.tower.projectile?.power ?? this.tower.basePower ?? this.tower.power ?? 1;
                        e.getDamaged(dmg, 'special', this.tower.pokemon.ability, false, new Set(), this.tower.pokemon, this.tower);
                    }
                    this.perEnemyLastHit.set(e, now);
                }
            }
            return;
        }

        const enemies = this.tower.main.area.enemies;

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

        if (['solarBeam', 'zapCannon', 'hyperBeam', 'meteorBeam'].includes(this.tower.ability.id) || this.tower?.pokemon?.item?.id === 'revysBook') {
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
        } else if (this.tower.ability.id === 'anchorShot') {
            ctx.globalCompositeOperation = 'source-over';

            const segments = 10;
            const sag = 10;
            const originOffsetY = -18;
            const origin = { x: this.from.x, y: this.from.y + originOffsetY };

            const chainPoint = (t) => ({
                x: origin.x + (this.to.x - origin.x) * t,
                y: origin.y + (this.to.y - origin.y) * t + Math.sin(t * Math.PI) * sag
            });

            const points = [];
            for (let i = 0; i <= segments; i++) points.push(chainPoint(i / segments));

            const linkWidth = this.width * 0.85;
            const linkHeight = this.width * 1.6;

            for (let i = 0; i < segments; i++) {
                const p1 = points[i];
                const p2 = points[i + 1];
                const mx = (p1.x + p2.x) / 2;
                const my = (p1.y + p2.y) / 2;
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + (i % 2 === 0 ? 0 : Math.PI / 2);

                ctx.save();
                ctx.translate(mx, my);
                ctx.rotate(angle);

                // sombra del eslabón
                ctx.beginPath();
                ctx.ellipse(1, 1.5, linkHeight / 2, linkWidth / 2, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(0, 0, 0, ${0.35 * this.alpha})`;
                ctx.lineWidth = linkWidth * 0.55;
                ctx.stroke();

                // cuerpo del eslabón (#7c604c)
                ctx.beginPath();
                ctx.ellipse(0, 0, linkHeight / 2, linkWidth / 2, 0, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(124, 96, 76, ${0.95 * this.alpha})`;
                ctx.lineWidth = linkWidth * 0.5;
                ctx.stroke();

                // brillo superior (tono más claro del mismo marrón)
                ctx.beginPath();
                ctx.ellipse(0, -linkWidth * 0.12, linkHeight / 2 * 0.85, linkWidth / 2 * 0.4, 0, Math.PI, Math.PI * 2);
                ctx.strokeStyle = `rgba(180, 152, 130, ${0.6 * this.alpha})`;
                ctx.lineWidth = linkWidth * 0.18;
                ctx.stroke();

                ctx.restore();
            }

            // gancho clavado en el enemigo
            ctx.save();
            ctx.translate(this.to.x, this.to.y);

            ctx.beginPath();
            ctx.arc(1, 1.5, this.width * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${0.3 * this.alpha})`;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(0, 0, this.width * 0.8, 0, Math.PI * 2);
            const hookGrad = ctx.createRadialGradient(-this.width * 0.3, -this.width * 0.3, 0, 0, 0, this.width * 0.8);
            hookGrad.addColorStop(0, `rgba(168, 138, 116, ${0.95 * this.alpha})`);
            hookGrad.addColorStop(1, `rgba(90, 68, 54, ${0.95 * this.alpha})`);
            ctx.fillStyle = hookGrad;
            ctx.fill();
            ctx.strokeStyle = `rgba(60, 45, 36, ${0.9 * this.alpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.restore();
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
        this.hitCooldown = options.hitCooldown ?? 1000;
        this.maxRange = options.maxRange ?? 1000;
        this.color = options.color ?? (fromTower.pokemon?.specie?.color || '#ff6600');

        this.perEnemyLastHit = new WeakMap();
        this.simulatedTime = 0;

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
        const now = this.simulatedTime;

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

        this.simulatedTime += delta;
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
