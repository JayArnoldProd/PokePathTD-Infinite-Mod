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

        this.statsRecalcTimer = 0;
        this.activeTimer = 1550;

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

        this.destructiveMawTriggered = new Set();

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
            this.ability.id === 'scrappy' || 
            this.ability.id === 'illuminate' || 
            this.ability.id === 'illuminateBuff' || 
            this.ability.id === 'frisk' || 
            this.ability.id === 'vigilantFrisk' || 
            this.ability.id === 'moongeistBeam' || 
            this.ability.id === 'grimNeigh' || 
            pokemon?.item?.id == 'silphScope'
        ) ? true : false;

        this.secretSwordSide = 1;
        this.secretSwordEffects = [];
        this.directionalAreaEffects  = [];
        this.damageBoost = 0;

        this.abilityField = [
            'spiralDrain',
            'machBolt',
            'charmedCharm',
            'naturesJudgement',
            'corrosionMega',
        ].includes(this.ability?.id);
    
        this.stickyWebTransition = null;
        this.nudgeTransition = null;
        this.lastStickyWeb = null;
        this.uTurnTransition = null;
        this.uTurnState = null;
        this.uTurnBonus = 0;
        this.fireLashEffect = null;
        this.sandsearWaves = [];
        this.psychoCutWaves = [];

        this.bulletPunchCharges = 0;
        this.bulletPunchTimer = 0;
        this.bulletPunchBurst = null;
        this.teleport = 0;
        this.teleportBuff = teleportBuff;
        this.amnesiaStacks = 0;
        this.feathers = 0;
        this.isMagnetized = false;
        this.slowStartTimer = 0;
        this.relicSongSpin = 0;

        this.incenseBuff = 0;
        this.incenseTimer = 0;
        this.lightningRodCharge = 0;

        this.shiftGearSpeed = 0;
        this.hitCount = 0;
        this.spikyShieldChance = 0;

        this.bulkUpTimer = false;
        this.meteorMashCount = 0;
        this.meteorMashBonus = 0;
        this.laundryStacks = 0;

        this.salacBerryTimer = 0;
        this.liechiBerryTimer = 0;
        this.lansatBerryTimer = 0;
        this.starfBerryTimer = 0;
        this.spiritombTimer = 0;

        this.luckyPunchStack = 0;
        this.luckyPunchTimer = 0;

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

        if (this.pokemon.specie.key === 'ditto') {
            this.projectile.speed = this.pokemon.adn.projectileSpeed;
        }

        this.pulse = {
            active: false,
            radius: 0,
            alpha: 0,
            maxRadius: 0,
            speed: 0 
        };

        this.boomburstWaves = [];
        this.supersonicWaves = [];
        this.shadowTagZones = [];
        this.shadowTagExplosions = [];

        this.explosionCharge = 0;
        this.explosionBurst = null;

        this.criticalAura = false;
        this.criticalDamageAura = false;
        this.genesisAura = false;
        this.cryogenicCannonHits = new Map();

        this.setTowerStats();

        this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
        this.targetMode = pokemon.targetMode;

        this.castformTransform();

        if (this.pokemon?.item?.id == 'bicycle') {
            this.projectile = projectileData['bike'];
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

        if (this.attackType === 'stream') {
            this.stream = {
                active: false,
                timer: 0,
                angle: 0,
                length: 0,

                tickRate: 100,
                damageMultiplier: 0.1,

                halfAngle: this.pokemon.streamAngle, // tamaño cono
                hitBuffer: 18 // el hitbox llega un poco más lejos que lo que se ve dibujado
            };

            this.streamProjectile = null;
        }

        if (this.pokemon?.ability?.id === 'aerialAce') {
            this.aerialAceOrbitCenter = {
                x: this.position.x + 12,
                y: this.position.y + 12
            };
            this.aerialAceOrbitAngle = Math.random() * Math.PI * 2;
            this.aerialAceOrbitRadius = 70;
            this.aerialAceOrbitSpeed = 1;
        }

        if (this.pokemon?.ability?.id === 'stalwart') {
            this.stalwartOrbitAngle = Math.random() * Math.PI * 2;
            this.stalwartOrbitRadius = 60;
            this.stalwartOrbitSpeed = 2.5;
            this.stalwartTarget = null;
        }

        if (['nocturnal', 'meteorBeam'].includes(this.pokemon.ability?.id))  {
            this.isOrbitingSolrock = false;
            this.lunatoneOrbitAngle = Math.random() * Math.PI * 2; // random starting angle
            this.lunatoneOrbitRadius = (this.pokemon.ability?.id === 'nocturnal') ? 55 : 90;
            this.lunatoneOrbitSpeed = (this.pokemon.ability?.id === 'nocturnal') ? 1.4 : 0.7; // radians per second
            this.lunatoneHomePosition = { x: this.position.x, y: this.position.y };
        }

        if (this.attackType === 'orbital') this.spawnOrbitales();
        this.pokemon.stadistics['deployed'] = (pokemon.stadistics['deployed'] ?? 0) + 1;
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
        this.rangeType = this.pokemon.rangeType;
        this.attackType = this.pokemon.attackType;

        this.projectile.sprite = this.pokemon.projectile.sprite;
        this.projectile.effect = this.pokemon.specie.projectileSound;

        if (this.attackType === 'stream') {
            this.stream = {
                active: false,
                timer: 0,
                angle: 0,
                length: 0,

                tickRate: 100,
                damageMultiplier: 0.1,

                halfAngle: this.pokemon.streamAngle
            };

            this.streamProjectile = null;
            this.projectiles.length = 0;
        } else {
            this.stream = null;
            this.streamProjectile = null;
        }

        this.setTowerStats();
        this.recalculatePower();

        this.projectiles.forEach(p => {
            if (p) p.power = this.projectile.power ?? this.basePower;
        });

        this.attackType = this.pokemon.attackType;
        this.targetMode = this.pokemon.targetMode;
        this.orbital = this.pokemon.orbital;
        if (this.attackType === 'orbital') this.refreshOrbitalProjectiles();
        else this.projectiles = this.projectiles.filter(p => !p?.orbit);
        this.updateTowerSprite();
    }

    setTowerStats() {
        this.attackSpeed = this.pokemon.speed;
        this.orbitalSpeed = this.pokemon.orbitalSpeed ?? 0;
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
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89) this.speed -= 4000;

        if (this.pokemon?.item?.id == 'protein') {
            this.power += (this.ability?.id == 'simple') ? 26 : 15;
            this.projectile.power += (this.ability?.id == 'simple') ? 26 : 15;
        }

        if (this.pokemon?.item?.id == 'rosesItem') {
            this.power += 315;
            this.projectile.power += 315;
        }

        if (this.pokemon?.item?.id == 'noxDex') {
            this.power += 10;
            this.projectile.power += 10;
            this.speed -= 10;
        }
        
        if (this.pokemon?.item?.id == 'xAttack') {
            this.power += (this.ability?.id == 'simple') ? 131 : 75;
            this.projectile.power += (this.ability?.id == 'simple') ? 131 : 75;
        }
        if (this.pokemon?.item?.id == 'metalCoatReal') {
            this.power -= 250;
            this.projectile.power -= 250;
            this.speed -= 250;
        }

        if (['dazzlingGleam'].includes(this.ability.id)) {
            this.power += (50 * this.main.player.futureInTeam);
            this.projectile.power += (50 * this.main.player.futureInTeam);
        }

        if (this.main.area.weather === 'starryNight') {
            this.power += Math.floor(this.main.player.stars / 50);
            this.projectile.power += Math.floor(this.main.player.stars / 50);
        }

        if (this.ability?.id == 'grimNeigh' || this.carriedBy == 'grimNeigh') {
            this.power += (this.main.area.defeatedEnemiesWave * 3);
            this.projectile.power += (this.main.area.defeatedEnemiesWave * 3);
        }

        if (this.ability?.id == 'laundryGoRound') {
            this.power += (25 * this.laundryStacks);
            this.projectile.power += (25 * this.laundryStacks);
        }
        
        if ((this.pokemon?.item?.id == 'liechiBerry' || this.pokemon?.item?.id == 'berryPouch') && this.liechiBerryTimer > 0) {
            if (this.ability?.id == 'simple') {
                this.power += (this.main.area.unnerve) ? 385 : 350;
                this.projectile.power += (this.main.area.unnerve) ? 385 : 350;
            } else {
                if (this.ability?.id == 'ripen') {
                    this.power += (this.main.area.unnerve) ? 440 : 400;
                    this.projectile.power += (this.main.area.unnerve) ? 440 : 400;
                } else {
                    this.power += (this.main.area.unnerve) ? 220 : 200;
                    this.projectile.power += (this.main.area.unnerve) ? 220 : 200;
                }
            }  
        }
        if (this.pokemon?.item?.id == 'expertBelt') {
            this.power += (this.ability?.id == 'simple') ? 88 : 50;
            this.projectile.power += (this.ability?.id == 'simple') ? 88 : 50;
        }
        if (this.pokemon?.item?.id == 'oddKeystone') {
            this.power += 40;
            this.projectile.power += 40;
        }

        if ([165, 175, 176, 233].includes(this.pokemon.id) && this.main.area.heartOfSteel) {
            this.power += (this.main.area.hitsReceived > 0) ? 75 : 25;
            this.projectile.power += (this.main.area.hitsReceived > 0) ? 75 : 25;
        }

        if (this.main.area.roomServiceActive) {
            this.power += this.main.area.roomService;
            this.projectile.power += this.main.area.roomService;
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
        
        if (this.main.area.helpingHand && (this.pokemon?.item?.id == undefined || this.pokemon?.ability?.id == 'scrappy')) {
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

        if (this.pokemon?.ability?.id === 'soulHeartReactor') this.speed -= (this.speed * this.main.area.defeatedEnemiesWave * 0.003); 
        
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

        if ((this.pokemon?.item?.id == 'salacBerry' || this.pokemon?.item?.id == 'berryPouch') && this.salacBerryTimer > 0) {
            if (this.ability?.id == 'simple') {
                this.speed *= (this.main.area.unnerve) ? 0.3375 : 0.375;
            } else {
                if (this.ability?.id == 'ripen') this.speed *= (this.main.area.unnerve) ? 0.225 : 0.25;
                else this.speed *= (this.main.area.unnerve) ? 0.45 : 0.5;
            } 
        }

        if (this.carriedBy == 'grassPlatform' || this.carriedBy == 'icePlatform') this.speed -= (this.speed * 0.15);
        if (this.carriedBy == 'mount' && this.ability.id === 'supremeCommanders') this.speed -= (this.speed * 0.25);
            
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
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.175) : (this.speed * 0.1);
        }
        if (this.pokemon?.item?.id == 'xSpeed') {
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.35) : (this.speed * 0.2);
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
            let reductor = Math.min(this.main.player.shinyAmount * 0.004, 0.75);
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
            this.range = (this.main.area.unnerve) ? this.range * 1.33 : this.range * 1.3;
            this.speed += (this.main.area.unnerve) ? (this.speed * 0.22) : (this.speed * 0.2);
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
            if (this.pokemon.ability.id === 'solarBeam') this.speed -= (this.speed * 0.1);
            if (this.pokemon.ability.id === 'flashFire') this.speed -= (this.speed * 0.2);
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' 
        ) {
            if (this.pokemon.ability.id === 'chlorophyll') this.speed = this.speed / 2; 
            if (this.pokemon.ability.id === 'solarBeam') this.speed -= (this.speed * 0.1);
            if (this.pokemon.ability.id === 'flashFire') this.speed -= (this.speed * 0.2);
            if (this.pokemon.ability.id === 'solarPower') this.speed -= (this.speed * 0.4); 
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' && !this.cherrimForm &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform')
        ) {
            if (!this.main.area.cloudNine && this.pokemon?.item?.id != 'safetyGoggles' && (this.pokemon.ability.id !== 'chlorophyll' && this.pokemon.ability.id !== 'solarBeam' && this.pokemon.ability.id !== 'flashFire' && this.pokemon.ability.id !== 'solarPower')) {
                this.speed =  this.speed * 4;
            }
        }

        if (this.main.area.anchorShot) this.speed *= 4;

        if (this.ability?.id === 'sandRush' && ['sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)) this.speed = this.speed / 2;

        if (this.ability?.id === 'sandVeil' && ['sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)) {
            this.speed -= this.speed * 0.15;
            this.range += this.range * 0.15;
        }

        if (this.ability?.id === 'auroraVeil' && this.main?.area?.weather === 'hail') {
            this.range += 40;
        }

        if (this.ability?.id === 'slowStart' && this.slowStartTimer >= 60000) {
            this.speed -= this.speed * 0.4;
            this.range += this.range;
        }

        if (this.pokemon?.item?.id == 'helixFossil') this.range += this.main.player.fossilInTeam * 10;
        if (this.pokemon?.item?.id == 'oldRod') this.range += 75;
        if (this.pokemon?.item?.id == 'noxDex') this.range += 11;
        if (this.pokemon?.item?.id == 'luckyPunch') this.range += (10 * this.luckyPunchStack);
        if ((this.pokemon?.item?.id == 'starfBerry' || this.pokemon?.item?.id == 'berryPouch') && this.starfBerryTimer > 0) {
            if (this.ability?.id == 'simple') {
                this.range += (this.main.area.unnerve) ? 154 : 140;
            } else {
                if (this.ability?.id == 'ripen') this.range += (this.main.area.unnerve) ? 176 : 160;
                else this.range += (this.main.area.unnerve) ? 88 : 80;
            }
        }
        if (this.pokemon?.item?.id == 'silphScope' && (
            this.pokemon.ability.id === 'illuminate' || 
            this.pokemon.ability.id === 'illuminateBuff' || 
            this.pokemon.ability.id === 'frisk' || 
            this.pokemon.ability.id === 'moongeistBeam' || 
            this.pokemon.ability.id === 'grimNeigh' || 
            this.pokemon.ability.id === 'vigilantFrisk')
        ) {
            this.range += 15;
            this.speed -= (this.speed / 4);
        }

        if (this.pokemon.ability.id === 'berserkMega') {
            this.range += (this.range * this.main.area.hitsReceived * 0.2);
        }

        if (this.pokemon?.item?.id == 'brickMail') {
            this.range += (this.ability?.id == 'simple') ? 14 * this.main.UI.tilesCountNum[3] : 8 * this.main.UI.tilesCountNum[3];
        }

        if (this.pokemon?.item?.id == 'revelationAroma') this.range += 25;
        if (this.pokemon?.item?.id == 'sunflowerPetal') this.range -= 40;
        if (this.pokemon?.item?.id == 'tropicalPetal') this.range -= 20;
        if (this.pokemon?.item?.id == 'wrestlingMask') this.range -= 75;
        if (this.pokemon?.item?.id == 'condensedBlizzard') this.range /= 2;
        if (this.pokemon?.item?.id == 'spindaCocktail') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.4375 : this.range * 1.25;
        }

        if (this.pokemon?.item?.id == 'zinc') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.265 : this.range * 1.1;
        }

        if (this.pokemon?.item?.id == 'ancientShield') this.range = this.range * 1.2;
        if (this.pokemon?.item?.id == 'starCandy') this.range += Math.min(140, this.main.player.stars * 0.035);
        if (this.pokemon?.item?.id == 'prismScale') this.range += this.main.player.ribbons * 0.5;
        if ([165, 175, 176, 233].includes(this.pokemon.id) && this.main.area.sacredSword) this.range = this.range * 1.2;
    }

    recalculatePower() {
        // valores base
        this.wacanAura = false;
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

        if (this.pokemon?.ability?.id === 'soulHeartReactor') this.speed -= (this.speed * this.main.area.defeatedEnemiesWave * 0.003); 

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

        if (this.pokemon?.item?.id == 'rosesItem') {
            this.power += 315;
            this.projectile.power += 315;
        }

        if (this.pokemon?.item?.id == 'noxDex') {
            this.power += 10;
            this.projectile.power += 10;
            this.speed -= 10;
        }

        if (this.pokemon?.item?.id == 'xAttack') {
            this.power += (this.ability?.id == 'simple') ? 131 : 75;
            this.projectile.power += (this.ability?.id == 'simple') ? 131 : 75;
        }
        
        if (this.pokemon?.item?.id == 'metalCoatReal') {
            this.power -= 250;
            this.projectile.power -= 250;
            this.speed -= 200;
        }

        if (['dazzlingGleam'].includes(this.ability.id)) {
            this.power += (50 * this.main.player.futureInTeam);
            this.projectile.power += (50 * this.main.player.futureInTeam);
        }

        if (this.main.area.weather === 'starryNight') {
            this.power += Math.floor(this.main.player.stars / 50);
            this.projectile.power += Math.floor(this.main.player.stars / 50);
        }

        if (this.ability?.id == 'grimNeigh' || this.carriedBy == 'grimNeigh') {
            this.power += (this.main.area.defeatedEnemiesWave * 3);
            this.projectile.power += (this.main.area.defeatedEnemiesWave * 3);
        }

        if (this.ability?.id == 'laundryGoRound') {
            this.power += (25 * this.laundryStacks);
            this.projectile.power += (25 * this.laundryStacks);
        }

        if ((this.pokemon?.item?.id == 'liechiBerry' || this.pokemon?.item?.id == 'berryPouch') && this.liechiBerryTimer > 0) {
            if (this.ability?.id == 'simple') {
                this.power += (this.main.area.unnerve) ? 385 : 350;
                this.projectile.power += (this.main.area.unnerve) ? 385 : 350;
            } else {
                if (this.ability?.id == 'ripen') {
                    this.power += (this.main.area.unnerve) ? 440 : 400;
                    this.projectile.power += (this.main.area.unnerve) ? 440 : 400;
                } else {
                    this.power += (this.main.area.unnerve) ? 220 : 200;
                    this.projectile.power += (this.main.area.unnerve) ? 220 : 200;
                }
            }  
        }
        if (this.pokemon?.item?.id == 'expertBelt') {
            this.power += (this.ability?.id == 'simple') ? 88 : 50;
            this.projectile.power += (this.ability?.id == 'simple') ? 88 : 50;
        }
        if (this.pokemon?.item?.id == 'oddKeystone') {
            this.power += 40;
            this.projectile.power += 40;
        }

        if ([165, 175, 176, 233].includes(this.pokemon.id) && this.main.area.heartOfSteel) {
            this.power += (this.main.area.hitsReceived > 0) ? 75 : 25;
            this.projectile.power += (this.main.area.hitsReceived > 0) ? 75 : 25;
        }

        if (this.isPassenger) {
            if (this.tile?.tower?.item?.id === 'ridePager') {
                this.power += 50;
                this.projectile.power += 50;
            }
        }

        if (this.main.area.roomServiceActive) {
            this.power += this.main.area.roomService;
            this.projectile.power += this.main.area.roomService;
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
        
        if (this.main.area.helpingHand && (this.pokemon?.item?.id == undefined || this.pokemon?.ability?.id == 'scrappy')) {
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
        if (this.pokemon?.item?.id == 'bicycle' && this.pokemon.id == 89) this.speed -= 4000;

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

        if ((this.pokemon?.item?.id == 'salacBerry' || this.pokemon?.item?.id == 'berryPouch')  && this.salacBerryTimer > 0) {
            if (this.ability?.id == 'simple') {
                 this.speed *= (this.main.area.unnerve) ? 0.3375 : 0.375;
            } else {
                if (this.ability?.id == 'ripen') this.speed *= (this.main.area.unnerve) ? 0.225 : 0.25;
                else this.speed *= (this.main.area.unnerve) ? 0.45 : 0.5;
            } 
        }

        if (this.carriedBy == 'grassPlatform' || this.carriedBy == 'icePlatform') this.speed -= (this.speed * 0.15);
        if (this.carriedBy == 'mount' && this.ability.id === 'supremeCommanders') this.speed -= (this.speed * 0.25);

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
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.175) : (this.speed * 0.1);
        }
        if (this.pokemon?.item?.id == 'xSpeed') {
            this.speed -= (this.ability?.id == 'simple') ? (this.speed * 0.35) : (this.speed * 0.2);
        }
        if (this.pokemon?.item?.id == 'wrestlingMask') this.speed -= (this.speed * 0.35);
        if (this.pokemon?.item?.id == 'muscleBand') this.speed += (this.speed * 0.25);

        if (this.pokemon?.item?.id === 'sokudosPortfolio') {
            let reductor = Math.min(this.main.player.shinyAmount * 0.004, 0.75);
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
        if ([3,4,5,10,21,22,23,24].includes(this.main.area.routeNumber) && (this.pokemon.ability.id === 'doubleShotSand' || this.pokemon.ability.id === 'quadraShotSand')) {
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
            this.range = (this.main.area.unnerve) ? this.range * 1.33 : this.range * 1.3;
            this.speed += (this.main.area.unnerve) ? (this.speed * 0.22) : (this.speed * 0.2);
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
            if (this.pokemon.ability.id === 'solarBeam') this.speed -= (this.speed * 0.1);
            if (this.pokemon.ability.id === 'flashFire') this.speed -= (this.speed * 0.2);
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' 
        ) {
            if (this.pokemon.ability.id === 'chlorophyll') this.speed = this.speed / 2; 
            if (this.pokemon.ability.id === 'solarBeam') this.speed -= (this.speed * 0.1);
            if (this.pokemon.ability.id === 'flashFire') this.speed -= (this.speed * 0.2);
            if (this.pokemon.ability.id === 'solarPower') this.speed -= (this.speed * 0.4);
        }

        if (
            this.main.area.weather == 'extremelyHarshSunlight' && !this.cherrimForm &&
            (this.tile.land == 2 || (this.tile.land == 1 && this.pokemon?.item?.id == 'fertiliser') || this.carriedBy == 'grassPlatform')
        ) {
            if (!this.main.area.cloudNine && this.pokemon?.item?.id != 'safetyGoggles' && (this.pokemon.ability.id !== 'chlorophyll' && this.pokemon.ability.id !== 'solarBeam' && this.pokemon.ability.id !== 'flashFire' && this.pokemon.ability.id !== 'solarPower')) {
                this.speed =  this.speed * 4;
            }
        }

        if (this.main.area.anchorShot) this.speed *= 4;

        if (this.ability?.id === 'sandRush' && ['sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)) this.speed = this.speed / 2;

        if (this.ability?.id === 'sandVeil' && ['sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)) {
            this.speed -= this.speed * 0.15;
            this.range += this.range * 0.15;
        }

        if (this.ability?.id === 'auroraVeil' && this.main?.area?.weather === 'hail') {
            this.range += 40;
        }

        if (this.ability?.id === 'slowStart' && this.slowStartTimer >= 60000) {
            this.speed -= this.speed * 0.4;
            this.range += this.range;
        }

        if (this.pokemon?.item?.id == 'helixFossil') this.range += this.main.player.fossilInTeam * 10;
        if (this.pokemon?.item?.id == 'oldRod') this.range += 75;
        if (this.pokemon?.item?.id == 'noxDex') this.range += 11;
        if (this.pokemon?.item?.id == 'luckyPunch') this.range += (10 * this.luckyPunchStack);
        if ((this.pokemon?.item?.id == 'starfBerry' || this.pokemon?.item?.id == 'berryPouch') && this.starfBerryTimer > 0) {
            if (this.ability?.id == 'simple') {
                this.range += (this.main.area.unnerve) ? 154 : 140;
            } else {
                if (this.ability?.id == 'ripen') this.range += (this.main.area.unnerve) ? 176 : 160;
                else this.range += (this.main.area.unnerve) ? 88 : 80;
            }
        }
        if (this.pokemon?.item?.id == 'silphScope' && (
            this.pokemon.ability.id === 'illuminate' || 
            this.pokemon.ability.id === 'illuminateBuff' || 
            this.pokemon.ability.id === 'frisk' || 
            this.pokemon.ability.id === 'moongeistBeam' || 
            this.pokemon.ability.id === 'grimNeigh' || 
            this.pokemon.ability.id === 'vigilantFrisk')
        ) {
            this.range += 15;
            this.speed -= (this.speed / 4);
        }

        if (this.pokemon.ability.id === 'berserkMega') {
            this.range += (this.range * this.main.area.hitsReceived * 0.2);
        }

        if (this.pokemon?.item?.id == 'brickMail') {
            this.range += (this.ability?.id == 'simple') ? 14 * this.main.UI.tilesCountNum[3] : 8 * this.main.UI.tilesCountNum[3];
        }

        if (this.pokemon?.item?.id == 'wrestlingMask') this.range -= 75;
        if (this.pokemon?.item?.id == 'condensedBlizzard') this.range /= 2;
        if (this.pokemon?.item?.id == 'spindaCocktail') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.4375 : this.range * 1.25;
        }

        if (this.pokemon?.item?.id == 'zinc') {
            this.range = (this.pokemon?.ability?.id == 'simple') ? this.range * 1.265 : this.range * 1.1;
        }
        if (this.pokemon?.item?.id == 'ancientShield') this.range = this.range * 1.2;
        if (this.pokemon?.item?.id == 'starCandy') this.range += Math.min(140, this.main.player.stars * 0.035);
        if (this.pokemon?.item?.id == 'prismScale') this.range += this.main.player.ribbons * 0.5;
        if ([165, 175, 176, 233].includes(this.pokemon.id) && this.main.area.sacredSword) this.range = this.range * 1.2;

        const nearbyPowerAuras = this.main.area.towers.filter(t =>
            t.ability?.id === 'powerAura' &&
            t !== this &&
            Math.hypot(
                t.center.x - this.center.x,
                t.center.y - this.center.y
            ) <= t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0) + (t.pokemon?.item?.id === "sunflowerPetal" ? -40 : 0)
        );

        const nearbyWacanAuras = this.main.area.towers.filter(t =>
            (t?.pokemon?.item?.id === 'wacanBerry' && t?.pokemon?.specie?.key == 'charjabug') &&
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
            ) <= t.range + (t.pokemon?.item?.id === "revelationAroma" ? 25 : 0) + (t.pokemon?.item?.id === "tropicalPetal" ? -20 : 0)
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

        if (nearbyWacanAuras.length > 0) {
            this.wacanAura = (this.main.area.unnerve) ? 1.22 : 1.2;
            this.power = Math.ceil(this.power * this.wacanAura);
        } else {
            this.wacanAura = false;
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
            this.triageAura = (nearbyTriageAuras[0]?.pokemon?.item?.id == 'tropicalPetal') ? 0.25 : 0.15;
            this.speed -= this.speed * this.triageAura;
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
                this.ability.id === 'moongeistBeam' ||
                this.ability.id === 'grimNeigh' || 
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
                } else if (this.rangeType === 'donut' && dist < this.innerRange) {
                    const ratio = dist > 0 ? this.innerRange / dist : 1;

                    this.bombardZone.x = this.center.x + dx * ratio;
                    this.bombardZone.y = this.center.y + dy * ratio;
                }
            }
        }
    }

    draw() { // METODO DRAW
        if (['discharge', 'flameBody', 'blizzard'].includes(this.ability?.id)) {
            const auraAlpha = this.getEffectOpacity('auras') ?? 1;
            const color = this.pokemon.specie.color || '#ffffff';

            this.ctx.save();

            this.ctx.globalAlpha = 0.15 * auraAlpha;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, this.range, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.globalAlpha = 0.3 * auraAlpha;
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, this.range, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.restore();
        }

        if (['sandStreamTyranitar', 'sandStreamMegaTyranitar'].includes(this.ability?.id)) {
            const auraAlpha = this.getEffectOpacity('auras') ?? 1;
            const color = this.pokemon.specie.color || '#ffffff';

            this.ctx.save();

            this.ctx.globalAlpha = 0.3 * auraAlpha;
            this.ctx.fillStyle = color;
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, this.range, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.globalAlpha = 0.5 * auraAlpha;
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(this.center.x, this.center.y, this.range, 0, Math.PI * 2);
            this.ctx.stroke();

            this.ctx.restore();
        }

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

        if (this.pokemon?.item?.id === 'pokeSkates') {
            const mouse = this.main?.game?.mouse;
            if (mouse?.x !== undefined && mouse?.y !== undefined) {
                const dx = mouse.x - this.center.x;
                const dy = mouse.y - this.center.y;
                if (Math.hypot(dx, dy) <= 70) { 
                    this.ctx.save();
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
                    this.ctx.setLineDash([4, 4]);
                    this.ctx.lineWidth = 1.5;
                    this.ctx.beginPath();
                    this.ctx.arc(this.tile.center.x, this.tile.center.y, 35, 0, Math.PI * 2);
                    this.ctx.stroke();
                    this.ctx.restore();
                }
            }
        }

        if (this.psychoCutWaves.length > 0) {
            for (const w of this.psychoCutWaves) {
                const curX = w.originX + w.dirX * w.traveled;
                const curY = w.originY + w.dirY * w.traveled;

                const startAngle = w.dirAngle - w.arcHalfAngle;
                const endAngle = w.dirAngle + w.arcHalfAngle;

                this.ctx.save();
                this.ctx.globalAlpha = this.getEffectOpacity('projectiles') ?? 1;
                this.ctx.globalCompositeOperation = 'source-over';
                this.ctx.lineCap = 'round';

                this.ctx.strokeStyle = 'rgba(190, 110, 255, 0.22)';
                this.ctx.lineWidth = 4;

                const steps = 18;
                const bladeLength = endAngle - startAngle;

                const outerPoints = [];
                const innerPoints = [];

                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const angle = startAngle + bladeLength * t;

                    const width = 2 + Math.sin(t * Math.PI) * 8;

                    const outerRadius = w.arcRadius + width;
                    const innerRadius = Math.max(1, w.arcRadius - width * 0.35);

                    outerPoints.push({
                        x: curX + Math.cos(angle) * outerRadius,
                        y: curY + Math.sin(angle) * outerRadius
                    });

                    innerPoints.push({
                        x: curX + Math.cos(angle) * innerRadius,
                        y: curY + Math.sin(angle) * innerRadius
                    });
                }

                const drawBlade = () => {
                    this.ctx.beginPath();

                    this.ctx.moveTo(
                        outerPoints[0].x,
                        outerPoints[0].y
                    );

                    for (let i = 1; i < outerPoints.length; i++) {
                        this.ctx.lineTo(
                            outerPoints[i].x,
                            outerPoints[i].y
                        );
                    }

                    for (let i = innerPoints.length - 1; i >= 0; i--) {
                        this.ctx.lineTo(
                            innerPoints[i].x,
                            innerPoints[i].y
                        );
                    }

                    this.ctx.closePath();
                };

                const hex = (this.pokemon.specie.color || '#9933cc').replace('#', '');

                const r = parseInt(hex.substring(0, 2), 16) || 153;
                const g = parseInt(hex.substring(2, 4), 16) || 51;
                const b = parseInt(hex.substring(4, 6), 16) || 204;

                // Resplandor
                this.ctx.shadowBlur = 4;
                this.ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.28)`;
                drawBlade();
                this.ctx.fill();

                // Cuerpo principal
                this.ctx.shadowBlur = 2;
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.9)`;
                drawBlade();
                this.ctx.fill();

                // Borde
                this.ctx.shadowBlur = 0;
                this.ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.95)`;
                this.ctx.lineWidth = 2;
                drawBlade();
                this.ctx.stroke();

                // Núcleo
                this.ctx.strokeStyle = `rgba(${Math.min(255, r + 35)}, ${Math.min(255, g + 35)}, ${Math.min(255, b + 35)}, 0.95)`;
                this.ctx.lineWidth = 1;
                drawBlade();
                this.ctx.stroke();

                // Pequeñas partículas en el arco
                const now = Date.now();

                if (this.main.particles) for (let i = 0; i < 8; i++) {
                    const t = i / 7;

                    const angle = startAngle + (endAngle - startAngle) * t;
                    const pulse = 1 + Math.sin(now * 0.01 + i * 1.7) * 0.25;
                    const px = curX + Math.cos(angle) * w.arcRadius;
                    const py = curY + Math.sin(angle) * w.arcRadius;

                    this.ctx.beginPath();
                    this.ctx.arc(px, py, (1.5 + (i % 3) * 0.7) * pulse, 0, Math.PI * 2);

                    this.ctx.fillStyle = 'rgba(220, 160, 255, 0.75)';
                    this.ctx.fill();
                }

                this.ctx.restore();
            }
        }

        if (this.sandsearWaves.length > 0) {
            const effectOpacity = (this.getEffectOpacity('special') ?? 1) * 0.75;
            const now = performance.now();

            for (const w of this.sandsearWaves) {
                const curX = w.originX + w.dirX * w.traveled;
                const curY = w.originY + w.dirY * w.traveled;

                const angle = Math.atan2(w.dirY, w.dirX);
                const halfW = w.bandHalfWidth;
                const trailLength = 145;
                const crest = 38;

                const wobble = Math.sin(now * 0.004 + w.originX * 0.025 + w.originY * 0.015) * 4;

                this.ctx.save();

                this.ctx.globalAlpha *= effectOpacity;

                this.ctx.translate(curX, curY);
                this.ctx.rotate(angle);

                const shadowGradient = this.ctx.createLinearGradient(-trailLength, 0, crest + 15, 0);

                shadowGradient.addColorStop(0, 'rgba(75, 43, 20, 0)');
                shadowGradient.addColorStop(0.3, 'rgba(75, 43, 20, 0.16)');
                shadowGradient.addColorStop(0.8, 'rgba(75, 43, 20, 0.24)');
                shadowGradient.addColorStop(1, 'rgba(75, 43, 20, 0)');

                this.ctx.fillStyle = shadowGradient;
                this.ctx.beginPath();
                this.ctx.ellipse(-trailLength * 0.4, 5, trailLength * 0.58, halfW * 1.05, 0, 0, Math.PI * 2);
                this.ctx.fill();

                const drawDunePath = () => {
                    this.ctx.beginPath();

                    this.ctx.moveTo(-trailLength, -halfW * 0.72);

                    this.ctx.quadraticCurveTo(
                        -trailLength * 0.62,
                        -halfW * 1.03,
                        -trailLength * 0.3,
                        -halfW * 0.88
                    );

                    this.ctx.quadraticCurveTo(
                        -trailLength * 0.04,
                        -halfW * 0.82,
                        crest * 0.58 + wobble,
                        -halfW * 0.42
                    );

                    this.ctx.quadraticCurveTo(
                        crest + wobble,
                        -halfW * 0.12,
                        crest + wobble,
                        0
                    );

                    this.ctx.quadraticCurveTo(
                        crest + wobble,
                        halfW * 0.12,
                        crest * 0.58 + wobble,
                        halfW * 0.42
                    );

                    this.ctx.quadraticCurveTo(
                        -trailLength * 0.04,
                        halfW * 0.82,
                        -trailLength * 0.3,
                        halfW * 0.88
                    );

                    this.ctx.quadraticCurveTo(
                        -trailLength * 0.62,
                        halfW * 1.03,
                        -trailLength,
                        halfW * 0.72
                    );

                    this.ctx.closePath();
                };

                const bodyGradient = this.ctx.createLinearGradient(-trailLength, 0, crest + 20, 0);

                bodyGradient.addColorStop(0, 'rgba(145, 91, 43, 0.12)');
                bodyGradient.addColorStop(0.18, 'rgba(164, 107, 51, 0.55)');
                bodyGradient.addColorStop(0.45, 'rgba(197, 145, 75, 0.9)');
                bodyGradient.addColorStop(0.75, 'rgba(228, 184, 105, 0.97)');
                bodyGradient.addColorStop(1, 'rgba(255, 225, 165, 0.98)');

                drawDunePath();

                this.ctx.fillStyle = bodyGradient;
                this.ctx.fill();
                this.ctx.save();

                drawDunePath();
                this.ctx.clip();

                const surfaceGradient = this.ctx.createLinearGradient(0, -halfW, 0, halfW);

                surfaceGradient.addColorStop(0, 'rgba(103, 62, 28, 0.45)');
                surfaceGradient.addColorStop(0.22, 'rgba(160, 104, 46, 0.12)');
                surfaceGradient.addColorStop(0.5, 'rgba(255, 224, 153, 0.25)');
                surfaceGradient.addColorStop(0.78, 'rgba(158, 99, 42, 0.12)');
                surfaceGradient.addColorStop(1, 'rgba(91, 54, 24, 0.38)');

                this.ctx.fillStyle = surfaceGradient;
                this.ctx.fillRect(-trailLength - 2, -halfW - 2, trailLength + crest + 25, halfW * 2 + 4);

                const rippleSpacing = 30;
                const rippleTravel = (w.traveled * 1.4) % rippleSpacing;

                for (let i = 0; i < 6; i++) {
                    const x = -trailLength + ((i * rippleSpacing + rippleTravel) % trailLength);

                    const progress = (x + trailLength) / trailLength;
                    const rippleWidth = halfW * (0.2 + progress * 0.52);

                    const curve = Math.sin(now * 0.003 + i * 1.8) * 4;

                    this.ctx.beginPath();
                    this.ctx.moveTo(x - 5, -rippleWidth);

                    this.ctx.quadraticCurveTo(
                        x + curve + 5,
                        0,
                        x - 5,
                        rippleWidth
                    );

                    this.ctx.strokeStyle = 'rgba(116, 70, 31, 0.3)';
                    this.ctx.lineWidth = 3;
                    this.ctx.stroke();

                    this.ctx.beginPath();
                    this.ctx.moveTo(x - 3, -rippleWidth * 0.94);

                    this.ctx.quadraticCurveTo(
                        x + curve + 5,
                        0,
                        x - 3,
                        rippleWidth * 0.94
                    );

                    this.ctx.strokeStyle = 'rgba(255, 229, 170, 0.38)';
                    this.ctx.lineWidth = 1.3;
                    this.ctx.stroke();
                }

                this.ctx.restore();

                this.ctx.strokeStyle = 'rgba(135, 79, 34, 0.75)';
                this.ctx.lineWidth = 7;
                this.ctx.stroke();

                this.ctx.strokeStyle = 'rgba(255, 233, 183, 0.95)';
                this.ctx.lineWidth = 2.5;
                this.ctx.stroke();

                for (let i = 0; i < 7; i++) {
                    const pulse = (Math.sin(now * 0.008 + i * 1.7) + 1) * 0.5;

                    const px = crest * 0.2 + i * 4 + wobble * 0.4;
                    const py = Math.sin(i * 1.2 + now * 0.002) * halfW * 0.16;

                    this.ctx.beginPath();
                    this.ctx.arc(
                        px,
                        py,
                        0.8 + pulse * 1.5,
                        0,
                        Math.PI * 2
                    );

                    this.ctx.fillStyle = `rgba(255, 244, 207, ${0.25 + pulse * 0.65})`;
                    this.ctx.fill();
                }
                if (this.main.particles) {
                    for (let i = 0; i < 18; i++) {
                        const phase = now * 0.003 + i * 2.399;

                        const travel = ((now * 0.035 + i * 17) % 60) / 60;
                        const px = crest + 4 + travel * (25 + (i % 4) * 5) + Math.sin(phase) * 5;
                        const py = Math.sin(phase * 1.3) * halfW * (0.35 + (i % 4) * 0.15);

                        const particleAlpha = (1 - travel) * (0.25 + 0.45 * ( 0.5 + 0.5 * Math.sin(phase * 1.7)));
                        const particleSize = 0.8 + ((i * 7) % 5) * 0.45;

                        this.ctx.beginPath();
                        this.ctx.arc(px, py, particleSize, 0, Math.PI * 2);

                        this.ctx.fillStyle = `rgba(255, 218, 145, ${particleAlpha})`;

                        this.ctx.fill();
                    }
                }

                this.ctx.restore();
            }
        }
        if (this.pokemon.attackType === 'bombardment' && this.bombardZone) {
            const bombardmentOpacity = this.getEffectOpacity('bombardment');
            this.ctx.save();

            const color = this.pokemon.specie.color;
            const isRockThrow = this.ability?.id === 'rockThrow';

            const bombardmentArea = this.pokemon.bombardmentArea ?? 0;
            const zoneWidth = bombardmentArea * 5;
            const zoneHeight = bombardmentArea;

            const zoneAngle = Math.atan2(
                this.bombardZone.y - this.center.y,
                this.bombardZone.x - this.center.x
            ) + Math.PI / 2;

            this.ctx.save();

            this.ctx.globalAlpha = 0.2 * bombardmentOpacity;
            this.ctx.fillStyle = color;

            if (isRockThrow) {
                this.ctx.save();
                this.ctx.translate(this.bombardZone.x, this.bombardZone.y);
                this.ctx.rotate(zoneAngle);

                this.ctx.fillRect(
                    -zoneWidth / 2,
                    -zoneHeight / 2,
                    zoneWidth,
                    zoneHeight
                );

                this.ctx.restore();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(
                    this.bombardZone.x,
                    this.bombardZone.y,
                    this.bombardZone.radius,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            }

            this.ctx.globalAlpha = 1 * bombardmentOpacity;
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 2;

            if (isRockThrow) {
                this.ctx.save();
                this.ctx.translate(this.bombardZone.x, this.bombardZone.y);
                this.ctx.rotate(zoneAngle);

                this.ctx.strokeRect(
                    -zoneWidth / 2,
                    -zoneHeight / 2,
                    zoneWidth,
                    zoneHeight
                );

                this.ctx.restore();
            } else {
                this.ctx.beginPath();
                this.ctx.arc(
                    this.bombardZone.x,
                    this.bombardZone.y,
                    this.bombardZone.radius,
                    0,
                    Math.PI * 2
                );
                this.ctx.stroke();
            }

            this.ctx.globalAlpha = 0.9 * bombardmentOpacity;
            const xSize = 8;

            this.ctx.beginPath();
            this.ctx.moveTo(this.bombardZone.x - xSize, this.bombardZone.y - xSize);
            this.ctx.lineTo(this.bombardZone.x + xSize, this.bombardZone.y + xSize);
            this.ctx.moveTo(this.bombardZone.x + xSize, this.bombardZone.y - xSize);
            this.ctx.lineTo(this.bombardZone.x - xSize, this.bombardZone.y + xSize);
            this.ctx.stroke();

            this.ctx.restore();

            (this.bombardShells || []).forEach(shell => {
                let splashRadius = this.pokemon.bombardmentSplash / 2;
                let splashRadiusBonus = 0;
                if (this.pokemon?.ability?.id == 'diamondStorm') {
                    const carbink = this.main.area.towers.find(t => t.pokemon?.specie?.key === 'carbink');
                    if (carbink) splashRadiusBonus = splashRadius * 2;
                    else splashRadiusBonus = splashRadius * this.main.area.heartScale * 4 / 10;
                }
                    
                splashRadius += splashRadiusBonus;

                this.ctx.save();

                if (!shell.impacted) {
                    const t = shell.progress;

                    // sombra proyectada en el punto de impacto, mientras cae
                    this.ctx.globalAlpha = 0.2 * (this.getEffectOpacity('projectiles') ?? 1);
                    this.ctx.fillStyle = '#000';
                    this.ctx.beginPath();
                    this.ctx.arc(shell.to.x, shell.to.y, splashRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.globalAlpha = this.getEffectOpacity('projectiles') ?? 1;

                    if (shell.isLightning) {
                        const revealCount = Math.max(1, Math.ceil(shell.boltPoints.length * t));

                        this.ctx.save();
                        this.ctx.globalCompositeOperation = 'lighter';

                        // brillo exterior azulado
                        this.ctx.strokeStyle = 'rgba(160, 200, 255, 0.5)';
                        this.ctx.lineWidth = 6;
                        this.ctx.beginPath();
                        this.ctx.moveTo(shell.boltPoints[0].x, shell.boltPoints[0].y);
                        for (let p = 1; p < revealCount; p++) this.ctx.lineTo(shell.boltPoints[p].x, shell.boltPoints[p].y);
                        this.ctx.stroke();

                        // núcleo blanco brillante
                        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
                        this.ctx.lineWidth = 2;
                        this.ctx.beginPath();
                        this.ctx.moveTo(shell.boltPoints[0].x, shell.boltPoints[0].y);
                        for (let p = 1; p < revealCount; p++) this.ctx.lineTo(shell.boltPoints[p].x, shell.boltPoints[p].y);
                        this.ctx.stroke();

                        this.ctx.restore();
                    } else {
                        const x = shell.from.x + (shell.to.x - shell.from.x) * t;
                        const y = shell.from.y + (shell.to.y - shell.from.y) * t;

                        // sprite del proyectil, orientado hacia donde va
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
                    }
                } else {
                    const duration = 400;
                    const t = Math.min(1, (shell.impactTime || 0) / duration);
                    const pulseRadius = splashRadius * 1.4 * t;
                    const pulseAlpha = 0.75 * (1 - t);

                    this.ctx.globalAlpha = Math.max(0, pulseAlpha) * this.getEffectOpacity('areas');
                    this.ctx.fillStyle = this.pokemon.specie.color;
                    this.ctx.beginPath();
                    this.ctx.arc(shell.to.x, shell.to.y, pulseRadius, 0, Math.PI * 2);
                    this.ctx.fill();
                }

                this.ctx.restore();
            });
        }
        
        if (!this.loaded) return;

        if (this.directionalAreaEffects.length > 0) {
            const now = Date.now();

            for (const effect of this.directionalAreaEffects) {
                const config = effect.config;

                const elapsed = now - effect.start;

                if (elapsed >= config.duration) continue;

                const progress = elapsed / config.duration;

                // Misma expansión que tenía Icy Wind originalmente
                const expansion = 1 - Math.pow(1 - progress, 3);
                const radius = effect.radius * expansion;

                const angle = effect.baseAngle;
                const halfAngle = config.halfAngle;

                const leftAngle = angle - halfAngle;
                const rightAngle = angle + halfAngle;

                const leftX = this.center.x + Math.cos(leftAngle) * radius;
                const leftY = this.center.y + Math.sin(leftAngle) * radius;
                const rightX = this.center.x + Math.cos(rightAngle) * radius;
                const rightY = this.center.y + Math.sin(rightAngle) * radius;

                let alpha = 0.6;

                if (progress > 0.72) alpha *=  1 - ((progress - 0.72) / 0.28);

                this.ctx.save();
                this.ctx.globalCompositeOperation = config.blendMode || 'lighter';
                this.ctx.globalAlpha = alpha * this.getEffectOpacity('areas');

                const gradient =
                    this.ctx.createRadialGradient(
                        this.center.x,
                        this.center.y,
                        0,
                        this.center.x,
                        this.center.y,
                        Math.max(radius, 1)
                    );

                gradient.addColorStop(0, config.color.start);
                gradient.addColorStop(0.35, config.color.middle);
                gradient.addColorStop(0.7, config.color.end);
                gradient.addColorStop(1, config.color.end);

                this.ctx.fillStyle = gradient;

                this.ctx.beginPath();
                this.ctx.moveTo(this.center.x, this.center.y);
                this.ctx.lineTo(leftX, leftY);

                this.ctx.arc(
                    this.center.x,
                    this.center.y,
                    radius,
                    leftAngle,
                    rightAngle
                );

                this.ctx.lineTo(
                    this.center.x,
                    this.center.y
                );

                this.ctx.closePath();
                this.ctx.fill();

                // PARTÍCULAS
                if (this.main.particles) {
                    for (const particle of effect.particles) {
                        let particleProgress = particle.distance + progress * particle.speed;
                        if (particleProgress > 1) particleProgress -= 1;

                        const particleDistance = radius * particleProgress;
                        const maxSpread = particleDistance * 0.72;

                        const side =
                            particle.offset * maxSpread +
                            Math.sin(
                                effect.start * 0.008 +
                                particle.wave +
                                particleDistance * 0.025
                            ) * 4;

                        const px =
                            this.center.x +
                            Math.cos(angle) *
                                particleDistance +
                            Math.cos(
                                angle + Math.PI / 2
                            ) * side;

                        const py =
                            this.center.y +
                            Math.sin(angle) *
                                particleDistance +
                            Math.sin(
                                angle + Math.PI / 2
                            ) * side;

                        this.ctx.globalAlpha = alpha * particle.opacity * (this.getEffectOpacity('areas') ?? 1);

                        // Icy Wind
                        if (config.particleType === 'circle') {
                            this.ctx.fillStyle = config.particleColor;
                            this.ctx.beginPath();

                            this.ctx.arc(
                                px,
                                py,
                                particle.size,
                                0,
                                Math.PI * 2
                            );

                            this.ctx.fill();

                            if (particle.size > 2) {
                                this.ctx.strokeStyle = 'rgba(220, 250, 255, 0.7)';
                                this.ctx.lineWidth = 1;
                                this.ctx.beginPath();

                                this.ctx.moveTo(px - particle.size * 1.5, py);
                                this.ctx.lineTo(px + particle.size * 1.5, py);
                                this.ctx.moveTo(px, py - particle.size * 1.5);
                                this.ctx.lineTo(px, py + particle.size * 1.5);

                                this.ctx.stroke();
                            }
                        }

                        if (config.particleType === 'sparkle') {
                            const size = particle.size * 2;

                            this.ctx.save();

                            this.ctx.translate(px, py);
                            this.ctx.rotate(particle.rotation + now * 0.002);

                            this.ctx.beginPath();

                            this.ctx.moveTo(0, -size);
                            this.ctx.lineTo(
                                size * 0.35,
                                -size * 0.35
                            );
                            this.ctx.lineTo(size, 0);
                            this.ctx.lineTo(
                                size * 0.35,
                                size * 0.35
                            );
                            this.ctx.lineTo(0, size);
                            this.ctx.lineTo(
                                -size * 0.35,
                                size * 0.35
                            );
                            this.ctx.lineTo(-size, 0);
                            this.ctx.lineTo(
                                -size * 0.35,
                                -size * 0.35
                            );

                            this.ctx.closePath();
                            this.ctx.fillStyle = config.particleColor;
                            this.ctx.fill();
                            this.ctx.restore();
                        }
                    }
                }
                

                // BORDE DEL CONO
                this.ctx.globalAlpha = alpha * 0.9 * (this.getEffectOpacity('areas') ?? 1);

                this.ctx.strokeStyle = config.borderColor;

                this.ctx.lineWidth = config.borderWidth;

                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';

                this.ctx.beginPath();

                this.ctx.moveTo(this.center.x, this.center.y);
                this.ctx.lineTo(leftX, leftY);
                this.ctx.stroke();
                this.ctx.beginPath();

                this.ctx.moveTo(this.center.x, this.center.y);
                this.ctx.lineTo(rightX, rightY);

                this.ctx.stroke();

                this.ctx.strokeStyle = 'rgba(130, 220, 255, 0.8)';

                this.ctx.lineWidth = 2;

                this.ctx.beginPath();

                this.ctx.arc(
                    this.center.x,
                    this.center.y,
                    radius,
                    leftAngle,
                    rightAngle
                );

                this.ctx.stroke();
                this.ctx.restore();
            }
        }

        if (this.secretSwordEffects.length > 0) {
            const now = Date.now();

            for (let i = this.secretSwordEffects.length - 1; i >= 0; i--) {
                const effect = this.secretSwordEffects[i];

                const elapsed = now - effect.start;

                if (elapsed >= effect.duration) {
                    this.secretSwordEffects.splice(i, 1);
                    continue;
                }

                const progress = elapsed / effect.duration;
                const alpha = (1 - progress) * (this.getEffectOpacity('special') ?? 1);

                const totalSweep = Math.PI;
                const bladeWidth = 20;

                let currentAngle;

                if (effect.direction > 0) {
                    currentAngle =
                        effect.baseAngle -
                        totalSweep / 2 +
                        totalSweep * progress;
                } else {
                    currentAngle =
                        effect.baseAngle +
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
                    x: this.center.x +
                        dirX * outer +
                        perpX * bladeWidth * 0.35,

                    y: this.center.y +
                        dirY * outer +
                        perpY * bladeWidth * 0.35
                };

                const endRight = {
                    x: this.center.x +
                        dirX * outer -
                        perpX * bladeWidth * 0.35,

                    y: this.center.y +
                        dirY * outer -
                        perpY * bladeWidth * 0.35
                };

                const isCeaselessEdge = effect.ability === 'ceaselessEdge';
                const primaryColor = isCeaselessEdge ? '#2b4347' : '#ffffff';
                const transparentColor = isCeaselessEdge  ? 'rgba(154, 32, 53, 0)'  : 'rgba(120, 200, 255, 0)';

                this.ctx.save();

                this.ctx.globalAlpha = alpha;
                this.ctx.lineJoin = 'round';

                this.ctx.shadowColor = isCeaselessEdge ? '#2b4347' : '#b8f8ff';
                this.ctx.shadowBlur = 4;

                // Hoja
                const grad = this.ctx.createLinearGradient(
                    this.center.x,
                    this.center.y,
                    endLeft.x,
                    endLeft.y
                );

                grad.addColorStop(0, isCeaselessEdge ? 'rgba(43, 67, 71, 0.95)' : 'rgba(255, 255, 255, 0.95)');
                grad.addColorStop(0.5, isCeaselessEdge  ? 'rgba(154, 32, 53, 0.85)' : 'rgba(170, 235, 255, 0.75)');
                grad.addColorStop(1, transparentColor);

                this.ctx.fillStyle = grad;

                this.ctx.beginPath();

                this.ctx.moveTo(startLeft.x, startLeft.y);
                this.ctx.lineTo(endLeft.x, endLeft.y );
                this.ctx.lineTo(endRight.x, endRight.y );
                this.ctx.lineTo(startRight.x, startRight.y);

                this.ctx.closePath();
                this.ctx.fill();

                // Filo izquierdo
                this.ctx.strokeStyle = primaryColor;
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
                this.ctx.lineTo(this.center.x + dirX * (outer + 12), this.center.y + dirY * (outer + 12));
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

        const passengerOffset = this.isPassenger ? this.passengerYOffset : 0;
        this.drawYOffset = passengerOffset;

        this.center = {
            x: this.position.x + tileSize / 2,
            y: this.position.y + tileSize / 2 + passengerOffset
        };


        this.drawAbilityField();

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

        if (this.powerAura || this.criticalAura || this.criticalDamageAura || this.triageAura || this.genesisAura || this.wacanAura) {
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
            if (this.powerAura || this.wacanAura) key.push('power');
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

        if (
            (this.salacBerryTimer > 0 && this.pokemon?.item?.id == 'salacBerry') || 
            (this.liechiBerryTimer > 0 && this.pokemon?.item?.id == 'liechiBerry') || 
            (this.lansatBerryTimer  > 0 && this.pokemon?.item?.id == 'lansatBerry') || 
            (this.starfBerryTimer  > 0 && this.pokemon?.item?.id == 'starfBerry') 
        ) {
            let color;
            if (this.salacBerryTimer > 0) color = { core: '150,255,130', mid: '90,220,90', edge: '60,190,60', ring: '180,255,170', sparkle: '210,255,200' };
            else if (this.lansatBerryTimer > 0) color = { core: '255,180,90', mid: '255,140,40', edge: '230,110,20', ring: '255,200,130', sparkle: '255,215,160' };
            else if (this.starfBerryTimer > 0) color = { core: '130,200,255', mid: '70,150,255', edge: '40,110,230', ring: '170,220,255', sparkle: '200,235,255' };
            else color = { core: '255,215,100', mid: '255,180,60', edge: '255,150,40', ring: '255,230,150', sparkle: '255,240,190' };
            
            const now = Date.now();
            const pulse = 1 + 0.15 * Math.sin(now / 300);
            const cx = this.center.x;
            const cy = this.center.y + (tileSize * 0.2);
            const radiusX = (tileSize * 0.5) * pulse;
            const radiusY = radiusX * 0.4;

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';

            // aura de fondo
            const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, radiusX);
            grad.addColorStop(0, `rgba(${color.core}, 0.55)`);
            grad.addColorStop(0.7, `rgba(${color.mid}, 0.25)`);
            grad.addColorStop(1, `rgba(${color.edge}, 0)`);

            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
            this.ctx.fill();

            // anillo brillante en el borde
            this.ctx.strokeStyle = `rgba(255, 230, 150, ${0.6 + 0.3 * Math.sin(now / 200)})`;
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.ellipse(cx, cy, radiusX * 0.95, radiusY * 0.95, 0, 0, Math.PI * 2);
            this.ctx.stroke();

            // chispas orbitando
            const sparkles = 5;
            if (this.main.particles) for (let i = 0; i < sparkles; i++) {
                const angle = (i / sparkles) * Math.PI * 2 + (now / 600);
                const sx = cx + Math.cos(angle) * radiusX;
                const sy = cy + Math.sin(angle) * radiusY;
                const twinkle = 0.4 + 0.6 * Math.abs(Math.sin(now / 250 + i * 1.3));

                this.ctx.fillStyle = `rgba(255, 240, 190, ${twinkle})`;
                this.ctx.beginPath();
                this.ctx.arc(sx, sy, 1.8 * pulse, 0, Math.PI * 2);
                this.ctx.fill();
            }

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
            this.ctx.shadowBlur = 5 * pulse;
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

        if (this.bulletPunchCharges > 0) {
            const spacing = 9;
            const rowSpacing = 9;
            const maxPerRow = 5;

            const drawBullet = (ctx, x, y, color) => {
                ctx.save();
                ctx.translate(Math.round(x) + 0.5, Math.round(y) + 0.5);

                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);

                ctx.fillStyle = color;
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000000';
                ctx.stroke();

                ctx.restore();
            };

            this.ctx.save();
            const totalRows = Math.ceil(this.bulletPunchCharges / maxPerRow);

            for (let row = 0; row < totalRows; row++) {
                const start = row * maxPerRow;
                const count = Math.min(maxPerRow, this.bulletPunchCharges - start);

                const totalWidth = (count - 1) * spacing;
                const startX = Math.round(this.center.x - totalWidth / 2);

                const y = Math.round(
                    this.position.y +
                    22 +
                    5 +
                    this.drawYOffset +
                    row * rowSpacing
                );

                for (let i = 0; i < count; i++) {
                    const x = startX + i * spacing;
                    drawBullet(this.ctx, x, y, '#ffffff');
                }
            }

            this.ctx.restore();
        }

        if (this.lightningRodCharge > 0) {
            const spacing = 9;
            const rowSpacing = 9;
            const maxPerRow = 5;

            const drawCharge = (ctx, x, y, color) => {
                ctx.save();
                ctx.translate(Math.round(x) + 0.5, Math.round(y) + 0.5);

                ctx.beginPath();
                ctx.arc(0, 0, 3, 0, Math.PI * 2);

                ctx.fillStyle = color;
                ctx.fill();

                ctx.lineWidth = 1;
                ctx.strokeStyle = '#000000';
                ctx.stroke();

                ctx.restore();
            };

            this.ctx.save();

            const totalRows = Math.ceil(this.lightningRodCharge / maxPerRow);

            for (let row = 0; row < totalRows; row++) {
                const start = row * maxPerRow;
                const count = Math.min(maxPerRow, this.lightningRodCharge - start);

                const totalWidth = (count - 1) * spacing;
                const startX = Math.round(this.center.x - totalWidth / 2);

                const y = Math.round(
                    this.position.y +
                    22 +
                    5 +
                    this.drawYOffset +
                    row * rowSpacing
                );

                for (let i = 0; i < count; i++) {
                    const x = startX + i * spacing;
                    drawCharge(this.ctx, x, y, '#ffffff');
                }
            }

            this.ctx.restore();
        }

        if (this.ability?.id === 'seedFlare' && this.main.area.heartScale > 0) {
            const chargeCount = Math.min(2, Math.floor(this.main.area.heartScale));
            const cx = this.tile.center.x;
            const cy = this.tile.position.y + tileSize - 2 + this.drawYOffset;
            const drawRing = (radiusX, radiusY, color) => {
                this.ctx.beginPath();
                this.ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
                this.ctx.strokeStyle = color;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            };

            this.ctx.save();
            if (chargeCount >= 2) drawRing(12, 5, '#ff69b4');
            drawRing(7, 3.5, '#78ff5a');
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

            if (this.relicSongSpin > 0) {
                this.ctx.translate(this.center.x, this.center.y);
                this.ctx.rotate((Math.PI * 2) - this.relicSongSpin);
                this.ctx.translate(-this.center.x, -this.center.y);
            }

            this.ctx.drawImage(
                this.sprite,
                crop.position.x, crop.position.y, crop.width, crop.height,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset,
                drawWidth, drawHeight
            );

            this.ctx.restore();
        }   

        if (this.attackType === 'stream' && this.stream?.active) {
            const flame = this.stream;
            const ctx = this.ctx;
            const length = flame.length;

            const palette = streamPalettes[this.pokemon.ability?.id] ?? streamPalettes.flamethrower;
            const rgba = (color, alpha) => `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`;

            if (length > 2) {
                const halfAngle = flame.halfAngle;
                const now = performance.now() * 0.003;

                ctx.save();
                ctx.globalAlpha = this.getEffectOpacity('special') ?? 1;
                if (this.pokemon.specie.key === 'drampa') ctx.translate(this.center.x, this.center.y + 5);
                else if (this.pokemon.specie.key === 'megaDrampa') ctx.translate(this.center.x, this.center.y - 20);
                else if (this.pokemon.specie.key === 'megaCharizardY') ctx.translate(this.center.x, this.center.y);
                else ctx.translate(this.center.x, this.center.y - 8);
                ctx.rotate(flame.angle);

                /* 1. CUERPO PRINCIPAL */
                const samples = Math.max(14, Math.ceil(length / 12));
                const top = [], bottom = [];
                const maxWidth = length * Math.tan(halfAngle);

                for (let i = 0; i <= samples; i++) {
                    const t = i / samples;
                    const x = length * t;
                    const expansion = Math.pow(t, 0.72);

                    const wave1 = Math.sin(now * 2.1 + t * 12.0) * 0.12;
                    const wave2 = Math.sin(now * 3.7 + t * 23.0 + 1.7) * 0.08;
                    const wave3 = Math.sin(now * 1.35 + t * 7.0 + 4.0) * 0.06;
                    const distortion = 1 + wave1 + wave2 + wave3;

                    let width = maxWidth * expansion * distortion;

                    if (t > 0.78) {
                        const endNoise = Math.sin(now * 4.0 + t * 35.0) * 0.15 + Math.sin(now * 6.7 + t * 51.0) * 0.08;
                        width *= 1 + endNoise;
                    }

                    const centerOffset = Math.sin(now * 2.4 + t * 14.0) * (3 + t * 10);
                    const drift = Math.sin(now * 4.1 + t * 29.0) * (1.5 + t * 5);
                    const offset = centerOffset + drift;

                    top.push({ x, y: offset - width });
                    bottom.push({ x, y: offset + width });
                }

                const outerGradient = ctx.createLinearGradient(0, 0, length, 0);
               
                outerGradient.addColorStop(0.12, rgba(palette.outer[1], 0.92));
                outerGradient.addColorStop(0.42, rgba(palette.outer[2], 0.72));
                outerGradient.addColorStop(0.72, rgba(palette.outer[3], 0.42));
                outerGradient.addColorStop(1, rgba(palette.outer[4], 0));

                ctx.fillStyle = outerGradient;
                ctx.beginPath();
                ctx.moveTo(top[0].x, top[0].y);
                for (let i = 1; i < top.length; i++) ctx.lineTo(top[i].x, top[i].y);
                for (let i = bottom.length - 1; i >= 0; i--) ctx.lineTo(bottom[i].x, bottom[i].y);
                ctx.closePath();
                ctx.fill();

                if (this.main.particles) {
                    /* 2. NÚCLEO */
                    const coreTop = [], coreBottom = [];

                    for (let i = 0; i <= samples; i++) {
                        const t = i / samples;
                        const x = length * t;
                        const expansion = Math.pow(t, 0.85);
                        const wave = Math.sin(now * 3.2 + t * 18) * (2 + t * 5);
                        const width = maxWidth * 0.38 * expansion * (1 + Math.sin(now * 2.0 + t * 11) * 0.12);
                        const offset = wave;

                        coreTop.push({ x, y: offset - width });
                        coreBottom.push({ x, y: offset + width });
                    }

                    const coreGradient = ctx.createLinearGradient(0, 0, length * 0.8, 0);
                    coreGradient.addColorStop(0, rgba(palette.core[0], 0.95));
                    coreGradient.addColorStop(0.18, rgba(palette.core[1], 0.95));
                    coreGradient.addColorStop(0.5, rgba(palette.core[2], 0.75));
                    coreGradient.addColorStop(1, rgba(palette.core[3], 0));

                    ctx.fillStyle = coreGradient;
                    ctx.beginPath();
                    ctx.moveTo(coreTop[0].x, coreTop[0].y);
                    for (let i = 1; i < coreTop.length; i++) ctx.lineTo(coreTop[i].x, coreTop[i].y);
                    for (let i = coreBottom.length - 1; i >= 0; i--) ctx.lineTo(coreBottom[i].x, coreBottom[i].y);
                    ctx.closePath();
                    ctx.fill();

                    /* 3. LENGUAS DE FUEGO */
                    ctx.globalCompositeOperation = 'lighter';
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';

                    for (let i = 0; i < 7; i++) {
                        const phase = i * 1.73;
                        const flow = (now * (0.55 + (i % 3) * 0.08) + phase) % 1;
                        const start = 0.08 + flow * 0.52;
                        const tongueLength = 0.18 + (i % 3) * 0.055;
                        const end = Math.min(start + tongueLength, 0.96);
                        const startX = length * start;
                        const endX = length * end;
                        const width = 2.5 + (1 - start) * 4;
                        const curve = Math.sin(now * 2.8 + phase) * (8 + start * 10);
                        const curve2 = Math.sin(now * 4.3 + phase * 2) * 5;
                        const startY = Math.sin(now * 2.0 + phase) * (4 + start * 7);

                        ctx.strokeStyle = i % 3 === 0 ? rgba(palette.tongue[0], 0.55) : rgba(palette.tongue[1], 0.38);
                        ctx.lineWidth = width;
                        ctx.beginPath();
                        ctx.moveTo(startX, startY);
                        ctx.quadraticCurveTo(startX + (endX - startX) * 0.45, curve, endX, curve2);
                        ctx.stroke();
                    }

                    /* 4. PEQUEÑAS SALIDAS EN LOS BORDES */
                    for (let i = 0; i < 5; i++) {
                        const phase = i * 2.4;
                        const t = 0.45 + ((now * 0.35 + i * 0.19) % 0.42);
                        const x = length * t;
                        const side = i % 2 === 0 ? -1 : 1;
                        const spread = maxWidth * (0.45 + t * 0.45);
                        const y = side * spread * (0.65 + Math.sin(now * 3 + phase) * 0.18);
                        const endX = x + 15 + Math.sin(now * 4 + phase) * 12;
                        const endY = y + side * (8 + Math.sin(now * 3.5 + phase) * 8);

                        ctx.strokeStyle = rgba(palette.edge, 0.25);
                        ctx.lineWidth = 2;
                        ctx.beginPath();
                        ctx.moveTo(x, y);
                        ctx.quadraticCurveTo(x + 8, y, endX, endY);
                        ctx.stroke();
                    }

                    /* 5. LÍNEA DE CALOR CENTRAL */
                    const heatGradient = ctx.createLinearGradient(0, 0, length * 0.7, 0);
                    heatGradient.addColorStop(0, rgba(palette.heat[0], 0.85));
                    heatGradient.addColorStop(0.35, rgba(palette.heat[1], 0.35));
                    heatGradient.addColorStop(1, rgba(palette.heat[2], 0));

                    ctx.strokeStyle = heatGradient;
                    ctx.lineWidth = 4;
                    ctx.beginPath();
                    ctx.moveTo(2, 0);
                    ctx.bezierCurveTo(length * 0.2, Math.sin(now * 3) * 3, length * 0.42, Math.sin(now * 2.1) * 6, length * 0.7, Math.sin(now * 3.7) * 9);
                    ctx.stroke();

                     /* 6. BRASAS DESPRENDIÉNDOSE DE LA PUNTA */
                    const numEmbers = 5;
                    for (let i = 0; i < numEmbers; i++) {
                        const seed = i * 13.37;
                        const cycle = 700 + (i % 3) * 150;
                        const emberT = ((now * 1000 + seed * cycle) % cycle) / cycle;

                        const ex = length * (0.75 + emberT * 0.3);
                        const ey = Math.sin(now * 2.5 + seed) * (6 + emberT * 10) + (i % 2 === 0 ? -1 : 1) * emberT * 14;
                        const emberAlpha = Math.sin(emberT * Math.PI) * 0.6;
                        const emberSize = 1.2 + (i % 3) * 0.6;

                        ctx.fillStyle = rgba(palette.ember, emberAlpha);                    
                        ctx.beginPath();
                        ctx.arc(ex, ey, emberSize, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                

                ctx.globalCompositeOperation = 'source-over';
                ctx.restore();
            }
        }

        let explosionShakeX = 0;
        let explosionShakeY = 0;

        if (this.explosionCharge > 0 && this.pokemon.specie.key == 'megaGlalie') {
            const progress = 1 - Math.min(1, this.explosionCharge / 3000);

            const strength = 1 + progress * 4;
            const time = performance.now() * 0.035;

            explosionShakeX = Math.sin(time * 2.7) * strength;
            explosionShakeY = Math.cos(time * 3.4) * strength;

            const temp = document.createElement('canvas');
            temp.width = crop.width;
            temp.height = crop.height;

            const tctx = temp.getContext('2d');

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

            tctx.globalCompositeOperation = 'source-atop';

            tctx.fillStyle = `rgba(255, 0, 0, ${0.15 + progress * 0.7})`;

            tctx.fillRect(
                0,
                0,
                crop.width,
                crop.height
            );

            this.ctx.save();

            this.ctx.drawImage(
                temp,
                this.position.x + offsetX,
                this.position.y + offsetY + passengerOffset + explosionShakeY,
                drawWidth,
                drawHeight
            );

            this.ctx.restore();
        }

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
                this.position.y + offsetY + passengerOffset + explosionShakeY,
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
                this.position.y + offsetY + passengerOffset + explosionShakeY,
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

        if (this.explosionCharge > 0 && this.pokemon.specie.key == 'megaGlalie') {
            const count = Math.max(1, Math.ceil(this.explosionCharge / 1000) );
            const progress = 1 - Math.min(1, this.explosionCharge / 3000);
            const pulse = 1 + Math.sin(performance.now() * 0.02) * 0.08;
            const red = 255;
            const green = Math.max(30, 190 - Math.floor(progress * 160));

            this.ctx.save();
            this.ctx.translate(this.center.x, this.position.y - 28);

            this.ctx.scale(pulse, pulse);
            this.ctx.font = '900 16px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
            this.ctx.strokeText(`${count}...`, 0, 0);

            this.ctx.fillStyle = `rgb(${red}, ${green}, 40)`;
            this.ctx.fillText(`${count}...`, 0, 0);
            this.ctx.restore();
        }

        if (this.explosionBurst) {
            const t = Math.min(1, this.explosionBurst.elapsed / this.explosionBurst.duration);

            const radius = 8 +  (this.explosionBurst.maxRadius - 8) *  (1 - Math.pow(1 - t, 2));
            const alpha = (1 - t) * this.getEffectOpacity('areas');

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';

            if (t < 0.25) {
                const flashAlpha =  (1 - t / 0.25) * 0.75;

                this.ctx.fillStyle =  `rgba(255, 240, 180, ${flashAlpha})`;

                this.ctx.beginPath();
                this.ctx.arc(
                    this.center.x,
                    this.center.y,
                    18 + t * 25,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            }

            // Onda exterior
            this.ctx.lineWidth = 4 + alpha * 5;
            this.ctx.strokeStyle = `rgba(255, 90, 25, ${alpha * 0.9})`;

            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = `rgba(255, 60, 10, ${alpha})`;

            this.ctx.beginPath();
            this.ctx.arc(
                this.center.x,
                this.center.y,
                radius,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();

            // Segundo anillo
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = `rgba(255, 210, 90, ${alpha * 0.8})`;

            this.ctx.beginPath();
            this.ctx.arc(
                this.center.x,
                this.center.y,
                radius * 0.72,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();

            if (this.main.particles) {
                 // Partículas
                for (const particle of this.explosionBurst.particles) {
                    const distance =  radius * particle.speed;

                    const x = this.center.x + Math.cos(particle.angle) * distance;
                    const y = this.center.y + Math.sin(particle.angle) * distance;
                    const particleAlpha = alpha * (1 - Math.min(1, distance / this.explosionBurst.maxRadius));
                    this.ctx.fillStyle = `rgba(255, ${80 + Math.random() * 120}, 30, ${particleAlpha})`;

                    this.ctx.beginPath();
                    this.ctx.arc(x, y, particle.size * (0.5 + alpha), 0, Math.PI * 2);
                    this.ctx.fill();
                }
                // Núcleo
                const coreRadius =  10 * (1 - Math.min(1, t * 2));
                if (coreRadius > 0) {
                    this.ctx.fillStyle =  `rgba(255, 240, 180, ${alpha})`;

                    this.ctx.beginPath();
                    this.ctx.arc(
                        this.center.x,
                        this.center.y,
                        coreRadius,
                        0,
                        Math.PI * 2
                    );
                    this.ctx.fill();
                }
            }
           
            this.ctx.restore();
        }
    }

    drawAbilityField() {
        if (!this.abilityField) return;

        const ctx = this.ctx;
        const id = this.ability?.id;

        const colors = {
            spiralDrain: [40, 130, 255],
            machBolt: [255, 220, 30],
            charmedCharm: [255, 80, 180],
            naturesJudgement: [50, 200, 70],
            corrosionMega: [107, 90, 181]
        };

        const [r, g, b] = colors[id];
        const radius = 120;
        const size = 18;

        ctx.save();
        ctx.globalAlpha *= this.getEffectOpacity('auras');
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, radius, 0, Math.PI * 2);
        ctx.clip();

        // Fondo
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
        ctx.fillRect(this.center.x - radius, this.center.y - radius, radius * 2, radius * 2);

        // Cuadricula
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;

        for (let x = -radius; x <= radius; x += size) {
            ctx.moveTo(this.center.x + x, this.center.y - radius);
            ctx.lineTo(this.center.x + x, this.center.y + radius);
        }

        for (let y = -radius; y <= radius; y += size) {
            ctx.moveTo(this.center.x - radius, this.center.y + y);
            ctx.lineTo(this.center.x + radius, this.center.y + y);
        }

        ctx.stroke();

        // Borde
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    }

    spawnOrbitales() {
        this.projectiles = [];
        let numMax = this.orbital;
        const angularSpeed = this.getOrbitalAngularSpeed();
        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;

        if (this.pokemon?.item?.id == 'jadeOrb') numMax += 2;

        for (let i = 0; i < numMax; i++) {
            const angle = (i * Math.PI * 2) / numMax;

            const orbitProjectileConfig = {
                ...this.projectile,
                power: this.projectile.power ?? this.basePower,

                sacredFire: this.ability?.id === 'sacredFire',

                orbit: {
                    radius: this.pokemon.range,
                    angularSpeed: angularSpeed,
                    duration: Infinity,
                    hitCooldown: this.ability?.id === 'sacredFire' ? 500 : 350,
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

            proj.angle = angle;
            this.projectiles.push(proj);
        }
    }

    getOrbitalAngularSpeed() {
        let angularSpeed = this.orbitalSpeed || (Math.PI / 5);

        if (this.ability?.id === 'shiftGear' && this.shiftGearSpeed > 0) {
            angularSpeed = this.shiftGearSpeed;
        } else if (
            this.pokemon?.ability?.id === 'stoneEdgeMega' &&
            ['sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)
        ) {
            angularSpeed *= 1.5;
        }

        if (this.pokemon?.item?.id === 'lustrousOrb') angularSpeed *= 2;

        return angularSpeed;
    }

    updateOrbitalSpeed() {
        if (this.attackType !== 'orbital') return;

        const angularSpeed = this.getOrbitalAngularSpeed();

        this.projectiles.forEach(proj => {
            if (proj?.orbit) proj.angularSpeed = angularSpeed;
        });
    }

    updateStream(deltaTime) {
        if (this.attackType !== 'stream') return;

        const flame = this.stream;
        const target = this.target;

        if (
            !target ||
            target.hp <= 0 ||
            target.invulnerable
        ) {
            flame.active = false;
            flame.timer = 0;
            return;
        }

        const dx = target.center.x - this.center.x;
        const dy = target.center.y - this.center.y;
        const distance = Math.hypot(dx, dy);

        flame.angle = Math.atan2(dy, dx);
        flame.length = this.range;
        flame.active = true;

        flame.timer += deltaTime;

        while (flame.timer >= flame.tickRate) {

            flame.timer -= flame.tickRate;

            if (!this.streamProjectile) {
                this.streamProjectile = new Projectile(
                    this.center.x,
                    this.center.y,
                    null,
                    this.ctx,
                    {
                        ...this.projectile,
                        power: 1
                    },
                    this
                );
            }

            const projectile = this.streamProjectile;
            const hitLength = flame.length + flame.hitBuffer;

            for (const enemy of this.main.area.enemies) {
                if (
                    !enemy ||
                    enemy.hp <= 0 ||
                    enemy.invulnerable
                ) continue;

                if (
                    enemy.invisible &&
                    !this.revealInvisible &&
                    this.targetMode !== 'invisible'
                ) continue;

                const enemyDx = enemy.center.x - this.center.x;
                const enemyDy = enemy.center.y - this.center.y;
                const distance = Math.hypot(enemyDx, enemyDy);

                if (distance > flame.length) continue;

                const enemyAngle = Math.atan2(enemyDy, enemyDx);

                const angleDifference = Math.atan2(
                    Math.sin(enemyAngle - flame.angle),
                    Math.cos(enemyAngle - flame.angle)
                );

                if (Math.abs(angleDifference) > flame.halfAngle) continue;

                projectile.enemy = enemy;
                projectile.power = Math.max(
                    1,
                    Math.ceil(this.power * flame.damageMultiplier)
                );
                projectile.critical = this.critical;

                projectile.markedForDeletion = false;
                projectile.impacting = false;
                projectile.pulse = null;

                projectile.processImpact();

                projectile.markedForDeletion = false;
                projectile.impacting = false;
                projectile.pulse = null;
            }
        }
    }

    fireDestructiveMaw(enemy) {
        if (!enemy || enemy.hp <= 0 || enemy.invulnerable) return;

        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;

        const proj = new Projectile(
            this.position.x - 6,
            this.position.y + spawnOffsetY - 6,
            enemy,
            this.ctx,
            { ...this.projectile },
            this,
            false,
            { multPower: 0.5 }
        );

        this.projectiles.push(proj);
        if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');
    }

    update(enemiesInRange, deltaTime = 1000 / 60, shouldDraw = !this._skipDraw) { // METODO UPDATE
        const simDelta = deltaTime;
        const realDelta = simDelta / this.main.game.speedFactor;
        const frameFactor = simDelta / (1000 / 60);

        const movementAbility = this.pokemon?.ability?.id;

        if (this.ability.id === 'supersonic') this.updateSupersonicWaves(simDelta, frameFactor, shouldDraw);
        if (this.ability.id === 'shadowTag') this.updateShadowTagZones(simDelta);
        if (movementAbility !== this._movementAbility) {
            this._movementAbility = movementAbility;

            this.stalwartTarget = null;
            this.aerialAceOrbitCenter = null;

            if (movementAbility === 'aerialAce') {
                this.aerialAceOrbitCenter = {
                    x: this.tile.position.x + 12,
                    y: this.tile.position.y + 12
                };
                this.aerialAceOrbitAngle = Math.random() * Math.PI * 2;
                this.aerialAceOrbitRadius = 70;
                this.aerialAceOrbitSpeed = 1;
            } else if (movementAbility === 'stalwart') {
                this.stalwartOrbitAngle = Math.random() * Math.PI * 2;
                this.stalwartOrbitRadius = 60;
                this.stalwartOrbitSpeed = 2.5;
                this.stalwartTarget = null;
            }
        }

        this.statsRecalcTimer -= simDelta;
        this.activeTimer -= realDelta;

        if (this.statsRecalcTimer <= 0) {
            this.recalculatePower();
            this.statsRecalcTimer = 100;
        }

        if (this.activeTimer <= 0 && this.main.area.waveActive) {
            this.pokemon.stadistics.active = (this.pokemon.stadistics.active ?? 0) + 1;
            this.activeTimer += 1550;
        }

        if (this.ability?.id === 'destructiveMaw') {
            const inRange = new Set();

            for (const enemy of this.main.area.enemies) {
                if (
                    !enemy ||
                    enemy.hp <= 0 ||
                    enemy.invulnerable ||
                    enemy.dying ||
                    !enemy.hasEnteredCanvas ||
                    (enemy.invisible && !this.revealInvisible && this.targetMode !== 'invisible')
                ) continue;

                const distance = Math.hypot(enemy.center.x - this.center.x, enemy.center.y - this.center.y);
                if (distance > this.range) continue;

                inRange.add(enemy);

                if (enemy.hp < enemy.hpMax * 0.5 && !this.destructiveMawTriggered.has(enemy)) {
                    this.destructiveMawTriggered.add(enemy);
                    this.fireDestructiveMaw(enemy);
                }
            }

            for (const enemy of this.destructiveMawTriggered) {
                if (!inRange.has(enemy) || enemy.hp >= enemy.hpMax * 0.5 || enemy.hp <= 0) {
                    this.destructiveMawTriggered.delete(enemy);
                }
            }
        }

        if (this.explosionBurst) {
            this.explosionBurst.elapsed += simDelta;

            if (this.explosionBurst.elapsed >= this.explosionBurst.duration) {
                this.explosionBurst = null;
            }
        }

        if (this.pokemon.specie.id === 133) {
            const magnetHolder = this.main.area.towers.find(t => t.pokemon?.item?.id === 'magnet');

            const cw = this.width || 24;
            const ch = this.height || 24;
            let targetX, targetY;

            if (magnetHolder) {
                this.isMagnetized = true;
                const homeX = this.tile.position.x + cw / 2;
                const homeY = this.tile.position.y + ch / 2;

                const ddx = homeX - magnetHolder.center.x;
                const ddy = homeY - magnetHolder.center.y;
                const ddist = Math.hypot(ddx, ddy) || 1;

                targetX = magnetHolder.center.x + (ddx / ddist) * 20;
                targetY = magnetHolder.center.y + (ddy / ddist) * 20;
            } else {
                this.isMagnetized = false;
                targetX = this.tile.position.x + cw / 2;
                targetY = this.tile.position.y + ch / 2;
            }

            const followSpeed = 150; 
            const curX = this.position.x + cw / 2;
            const curY = this.position.y + ch / 2;

            const dx = targetX - curX;
            const dy = targetY - curY;
            const dist = Math.hypot(dx, dy);

            if (dist > 1) {
                const step = Math.min(dist, followSpeed * (simDelta / 1000));
                const nx = dx / dist;
                const ny = dy / dist;

                this.position.x += nx * step;
                this.position.y += ny * step;
                this.center = { x: this.position.x + cw / 2, y: this.position.y + ch / 2 };
                this.x = this.position.x;
                this.y = this.position.y;
            }
        }

        if (this.directionalAreaEffects.length > 0) {
            const now = Date.now();

            for (let i = this.directionalAreaEffects.length - 1; i >= 0; i--) {
                const effect = this.directionalAreaEffects[i];
                const config = effect.config;

                const elapsed = now - effect.start;

                if (elapsed >= config.duration) {
                    this.directionalAreaEffects.splice(i, 1);
                    continue;
                }

                if (elapsed <= config.hitboxDuration) {
                    for (const enemy of this.main.area.enemies) {
                        if (
                            !enemy ||
                            enemy.hp <= 0 ||
                            enemy.invulnerable ||
                            effect.hitEnemies.has(enemy)
                        ) continue;

                        if (
                            enemy.invisible &&
                            !(
                                this.revealInvisible ||
                                this.targetMode === 'invisible'
                            )
                        ) continue;

                        if (
                            this.isPointInDirectionalArea(
                                enemy.center.x,
                                enemy.center.y,
                                effect.baseAngle,
                                effect.radius,
                                config.halfAngle
                            )
                        ) {
                            effect.hitEnemies.add(enemy);

                            this.dealDirectDamage(enemy);
                        }
                    }
                }
            }
        }

        if (['discharge', 'flameBody', 'discharge'].includes(this.ability?.id)) {
            const enemiesNearby = [];
            const enemiesFar = [];

            for (const enemy of this.main.area.enemies) {
                if (!enemy || enemy.hp <= 0) continue;
                const dist = Math.hypot(enemy.center.x - this.center.x, enemy.center.y - this.center.y);
                if (dist <= this.range) enemiesNearby.push(enemy);
                else if (this.ability?.id === 'discharge') enemiesFar.push(enemy);
            }

            if (this.ability?.id === 'flameBody') {
                for (const enemy of enemiesNearby) {
                    if (enemy.canBurn && !enemy.isBurned && !enemy.invisible) {
                        if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
                        else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
                        else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);
                    }
                }
            }

            if (this.ability?.id === 'discharge') {
                for (const enemy of enemiesNearby) {
                    if (enemy.dischargeStunned) continue;

                    enemy.dischargeTimer = (enemy.dischargeTimer || 0) + simDelta;

                    if (enemy.dischargeTimer >= 3000 && enemy.canStun) {
                        if (this.pokemon?.item?.id === 'lightClay') {
                            enemy.applyStatusEffect({ type: 'stun', duration: 2.2 }, this.pokemon);
                        } else {
                            enemy.applyStatusEffect({ type: 'stun', duration: 2 }, this.pokemon);
                        }

                        enemy.dischargeStunned = true;
                    }
                }

                for (const enemy of enemiesFar) {
                    if (enemy.dischargeTimer) enemy.dischargeTimer = 0;
                }
            }
        }

        if (this.pokemon.specie.key === 'durant' || this.pokemon.specie.key === 'heatmor') {
            const comboActive = this.main.area.towers.some(t => t.pokemon?.specie?.key === 'durant') &&
                this.main.area.towers.some(t => t.pokemon?.specie?.key === 'heatmor');

            if (comboActive !== this.durantHeatmorComboActive) {
                this.durantHeatmorComboActive = comboActive;
                if (comboActive) {
                    this.updateTowerSprite(this.pokemon.sprite.imageBonus, this.pokemon.sprite.framesBonus);
                } else {
                    this.updateTowerSprite(this.pokemon.sprite.image, this.pokemon.sprite.frames);
                }
            }
        }
        if (this.ability?.id === 'bulletPunch' || this.ability?.id === 'bulletPunchMega') {

            if (!this.bulletPunchBurst) {
                this.bulletPunchTimer += simDelta;
                while (this.bulletPunchTimer >= this.speed) {
                    this.bulletPunchTimer -= this.speed;

                    if (this.ability?.id === 'bulletPunchMega' && this.bulletPunchCharges < 5) this.bulletPunchCharges++;
                    else if (this.ability?.id === 'bulletPunch' && this.bulletPunchCharges < 10) this.bulletPunchCharges++;
                }

                if ((this.bulletPunchCharges >= 10 && this.ability?.id === 'bulletPunch') || (this.bulletPunchCharges >= 5 && this.ability?.id === 'bulletPunchMega')) {
                    const target = (this.target && this.target.hp > 0)
                        ? this.target
                        : this.findClosestEnemy({ center: this.center }, this.range);

                    if (target && target.hp > 0) {
                        this.bulletPunchCharges = 0; 

                        this.bulletPunchBurst = {
                            target,
                            remaining: (this.ability?.id == 'bulletPunchMega') ? 5 : 10,
                            timer: 0,
                            interval: 90
                        };
                    }
                }
            }

            if (this.bulletPunchBurst) {
                const burst = this.bulletPunchBurst;

                if (!burst.target || burst.target.hp <= 0) {

                    this.bulletPunchBurst = null;
                } else {
                    burst.timer += simDelta;

                    while (burst.timer >= burst.interval && burst.remaining > 0) {
                        burst.timer -= burst.interval;

                        if (!burst.target || burst.target.hp <= 0) {
                            burst.remaining = 0;
                            break;
                        }

                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const proj = new Projectile(
                            this.position.x - 6,
                            this.position.y + spawnOffsetY - 6,
                            burst.target,
                            this.ctx,
                            { ...this.projectile },
                            this
                        );
                        this.projectiles.push(proj);

                        if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');

                        burst.remaining--;
                    }

                    if (burst.remaining <= 0) {
                        this.bulletPunchBurst = null;
                    }
                }
            }
        }

        if (this.pokemon.attackType === 'bombardment' && this.bombardZone) {
            if (this.main.area.waveActive) {
                this.bombardCooldown -= simDelta;

                if (this.bombardCooldown <= 0) {
                    this.bombardCooldown = this.speed;

                    let shotCount = (this.ability?.id === 'dragonDarts') ? 2 : 
                                    (this.ability?.id === 'volcanicKaboom') ? 3 :
                                    (this.ability?.id === 'rockThrow') ? this.main.player.fossilInTeam : 1

                    if (this.ability?.id === 'wildboltStorm') shotCount = Math.floor(Math.random()*5) + 3;
                    if (this.pokemon?.item?.id == 'zoomLens') shotCount++;
                    if (this.pokemon?.item?.id == 'choiceScarf') shotCount = 1;

                    if (this.ability?.id === 'wildboltStorm' && this.main.area.weather != 'thunderStorm') shotCount = 0;

                    const isLightning = this.ability?.id === 'wildboltStorm';

                    for (let i = 0; i < shotCount; i++) {
                        let targetX, targetY;

                    if (this.ability?.id === 'rockThrow') {
                        const bombardmentArea = this.pokemon.bombardmentArea ?? 0;
                        const angle = Math.atan2(
                        this.bombardZone.y - this.center.y,
                        this.bombardZone.x - this.center.x
                    ) + Math.PI / 2;

                        const localX = (Math.random() - 0.5) * bombardmentArea * 5;
                        const localY = (Math.random() - 0.5) * bombardmentArea;

                        targetX = this.bombardZone.x
                            + localX * Math.cos(angle)
                            - localY * Math.sin(angle);

                        targetY = this.bombardZone.y
                            + localX * Math.sin(angle)
                            + localY * Math.cos(angle);
                    } else {
                        const angle = Math.random() * Math.PI * 2;
                        const r = this.bombardZone.radius * Math.sqrt(Math.random());

                        targetX = this.bombardZone.x + Math.cos(angle) * r;
                        targetY = this.bombardZone.y + Math.sin(angle) * r;
                    }

                        let from, duration, boltPoints = null;

                        if (isLightning) {
                            from = { x: targetX, y: targetY - 260 };
                            duration = 150;

                            const segments = 6;
                            boltPoints = [];
                            for (let s = 0; s <= segments; s++) {
                                const t = s / segments;
                                const baseX = from.x + (targetX - from.x) * t;
                                const baseY = from.y + (targetY - from.y) * t;
                                const jitter = (s === 0 || s === segments) ? 0 : (Math.random() - 0.5) * 18;
                                boltPoints.push({ x: baseX + jitter, y: baseY });
                            }
                        } else {
                            from = { x: this.center.x, y: this.center.y };
                            duration = 500;
                        }

                        this.bombardShells.push({
                            from,
                            to: { x: targetX, y: targetY },
                            progress: 0,
                            duration,
                            impacted: false,
                            isLightning,
                            boltPoints
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

                    let splashRadius = this.pokemon.bombardmentSplash / 2;
                    let splashRadiusBonus = 0;
                    if (this.pokemon?.ability?.id == 'diamondStorm') {
                        const carbink = this.main.area.towers.find(t => t.pokemon?.specie?.key === 'carbink');
                        if (carbink) splashRadiusBonus = splashRadius * 2;
                        else splashRadiusBonus = splashRadius * this.main.area.heartScale * 4 / 10;
                    }

                    splashRadius += splashRadiusBonus;

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

        if (this.pokemon?.ability?.id === 'slowStart' && this.main.area.waveActive && this.slowStartTimer < 60000) {
            this.slowStartTimer += simDelta;
        }

        if (this.salacBerryTimer > 0) this.salacBerryTimer -= simDelta
        if (this.liechiBerryTimer > 0) this.liechiBerryTimer -= simDelta
        if (this.lansatBerryTimer > 0) this.lansatBerryTimer -= simDelta
        if (this.starfBerryTimer > 0) this.starfBerryTimer -= simDelta
        if (this.luckyPunchTimer > 0) {
            this.luckyPunchTimer -= simDelta
            if (this.luckyPunchTimer <= 0) this.luckyPunchStack = 0;
        }

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

        if (this.stickyWebTransition) {
            const cw = this.width || 24;
            const ch = this.height || 24;

            const transition = this.stickyWebTransition;
            transition.elapsed += simDelta;

            const t = Math.min(1, transition.elapsed / transition.duration);
            const eased = t * t * (3 - 2 * t);

            const finalX = transition.startX + (transition.targetX - transition.startX) * eased;
            const finalY = transition.startY + (transition.targetY - transition.startY) * eased;

            this.position.x = finalX - cw / 2;
            this.position.y = finalY - ch / 2;

            this.center = { x: finalX, y: finalY };

            this.x = this.position.x;
            this.y = this.position.y;

            if (t >= 1) this.stickyWebTransition = null;
        }

        if (this.nudgeTransition) {
            const tileSize = this.tile?.size ?? 24;
            const tileCenterOffset = tileSize / 2;
            const passengerOffset = this.isPassenger ? (this.passengerYOffset ?? 0) : 0;

            const transition = this.nudgeTransition;
            transition.elapsed += simDelta;

            const t = Math.min(1, transition.elapsed / transition.duration);
            const eased = t * t * (3 - 2 * t);

            const finalX = transition.startX + (transition.targetX - transition.startX) * eased;
            const finalY = transition.startY + (transition.targetY - transition.startY) * eased;

            this.position.x = finalX - tileCenterOffset;
            this.position.y = finalY - tileCenterOffset - passengerOffset;

            this.center = { x: finalX, y: finalY };

            this.x = this.position.x;
            this.y = this.position.y;

            if (t >= 1) this.nudgeTransition = null;
        }

        if (this.lastStickyWeb && !this.lastStickyWeb.active && !this.stickyWebTransition) {
            this.lastStickyWeb = null;

            this.stickyWebTransition = {
                startX: this.center.x,
                startY: this.center.y,
                targetX: this.tile.center.x,
                targetY: this.tile.center.y,
                elapsed: 0,
                duration: 300
            };

            if (!this.main.mute[1]) playSound('teleport', 'effect');
        }

        if (this.fireLashEffect) {
            this.fireLashEffect.elapsed += simDelta;
            if (this.fireLashEffect.elapsed >= this.fireLashEffect.duration) {
                this.fireLashEffect = null;
            }
        }

        if (this.uTurnTransition) {
            const cw = this.width || 24;
            const ch = this.height || 24;

            const transition = this.uTurnTransition;
            transition.elapsed += simDelta;

            const t = Math.min(1, transition.elapsed / transition.duration);
            const eased = t * t * (3 - 2 * t);

            const finalX = transition.startX + (transition.targetX - transition.startX) * eased;
            const finalY = transition.startY + (transition.targetY - transition.startY) * eased;

            this.position.x = finalX - cw / 2;
            this.position.y = finalY - ch / 2;

            this.center = { x: finalX, y: finalY };

            this.x = this.position.x;
            this.y = this.position.y;

            if (t >= 1) {
                this.uTurnTransition = null;

                if (this.uTurnState?.phase === 'moving') {
                    this.uTurnState = { phase: 'waiting', timer: 0, visited: this.uTurnState.visited };
                } else if (this.uTurnState?.phase === 'returning') {
                    this.uTurnState = null;
                    this.uTurnBonus = 0;
                    this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
                }
            }
        }

        if (this.uTurnState?.phase === 'waiting' && !this.uTurnTransition) {
            this.uTurnState.timer += simDelta;

            if (this.uTurnState.timer >= 300) {
                const visited = this.uTurnState.visited;

                let next = null;
                let bestDist = Infinity;

                for (const e of this.main.area.enemies) {
                    if (!e || e.hp <= 0 || e.invulnerable || (e.invisible && !this.revealInvisible) || visited.has(e)) continue;

                    const d = Math.hypot(e.center.x - this.center.x, e.center.y - this.center.y);
                    if (d <= this.range && d < bestDist) {
                        bestDist = d;
                        next = e;
                    }
                }

                if (next) {
                    this.uTurnBonus++;
                    this.dealDirectDamage(next);
                    visited.add(next);

                    const canvas = this.main.game.canvas;
                    const margin = (this.width || 24) / 2;
                    const clampedX = Math.min(canvas.width - margin, Math.max(margin, next.center.x));
                    const clampedY = Math.min(canvas.height - margin, Math.max(margin, next.center.y));

                    this.uTurnTransition = {
                        startX: this.center.x,
                        startY: this.center.y,
                        targetX: clampedX,
                        targetY: clampedY,
                        elapsed: 0,
                        duration: 250
                    };
                    this.uTurnState = { phase: 'moving', visited };
                    if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');
                } else {
                    const cw = this.width || 24;
                    const ch = this.height || 24;

                    this.uTurnTransition = {
                        startX: this.center.x,
                        startY: this.center.y,
                        targetX: this.tile.position.x + cw / 2,
                        targetY: this.tile.position.y + ch / 2,
                        elapsed: 0,
                        duration: 250
                    };
                    this.uTurnState = { phase: 'returning' };
                }
            }
        }

        if (this.pokemon?.ability?.id === 'aerialAce') {
            const cw = this.width || 24;
            const ch = this.height || 24;

            this.aerialAceOrbitSpeed = (this.pokemon?.item?.id == 'inverter') ? -1 : 1;
            this.aerialAceOrbitAngle += this.aerialAceOrbitSpeed * (simDelta / 1000);

            const orbitX =  this.aerialAceOrbitCenter.x + Math.cos(this.aerialAceOrbitAngle) * this.aerialAceOrbitRadius;
            const orbitY = this.aerialAceOrbitCenter.y + Math.sin(this.aerialAceOrbitAngle) * this.aerialAceOrbitRadius;

            this.position.x = orbitX - cw / 2;
            this.position.y = orbitY - ch / 2;

            this.center.x = orbitX;
            this.center.y = orbitY;

            this.x = this.position.x;
            this.y = this.position.y;
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

            const rangeNeeded = (this.pokemon.ability?.id == 'nocturnal') ? 100 : 150;

            const inRange = closestSolrock && closestDist <= rangeNeeded;

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

                this.lunatoneOrbitAngle += this.lunatoneOrbitSpeed * (simDelta / 1000);

                if (this.lastSolrock?.item?.id === 'lustrousOrb') this.lunatoneOrbitAngle += this.lunatoneOrbitSpeed * (simDelta / 1000);

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
            for (const b of this.beams) {
                if (b && b.active && b.isAnchorChain && typeof b.draw === 'function') b.draw();
            }

            if (this.relicSongSpin > 0) {
                const spinSpeed = Math.PI * 16; 
                this.relicSongSpin = Math.max(0, this.relicSongSpin - spinSpeed * (simDelta / 1000));
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
            return;
        }

        if (this.pokemon?.item?.id === 'wacanBerry' && this.pokemon.specie.key == 'charjabug') {
            let auraRange = this.range;
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
            if (this.pokemon?.item?.id == 'tropicalPetal') auraRange -= 20;
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
        if (this.attackType === 'stream') this.updateStream(simDelta);

        if (this.pokemon?.ability?.id === 'stalwart') {
            const cw = this.width || 24;
            const ch = this.height || 24;

            const candidates = this.main.area.enemies.filter(enemy => {
                if (!enemy || enemy.hp <= 0 || enemy.invulnerable) return false;
                if (!this.revealInvisible && this.targetMode !== 'invisible' && enemy.invisible) return false;
                return true;
            });

            const ordered = this.getOrderedEnemies(candidates);
            const target = ordered[0] || null;

            if (target !== this.stalwartTarget) {
                this.stalwartTarget = target;

                if (target) {
                    const dx = this.center.x - target.center.x;
                    const dy = this.center.y - target.center.y;

                    if (Math.hypot(dx, dy) > 0.001) {
                        this.stalwartOrbitAngle = Math.atan2(dy, dx);
                    } else {
                        this.stalwartOrbitAngle = Math.random() * Math.PI * 2;
                    }
                }
            }

            if (this.stalwartTarget && this.stalwartTarget.hp > 0) {
                const targetX = this.stalwartTarget.center.x;
                const targetY = this.stalwartTarget.center.y;

                const orbitX = targetX + Math.cos(this.stalwartOrbitAngle) * this.stalwartOrbitRadius;
                const orbitY = targetY +  Math.sin(this.stalwartOrbitAngle) * this.stalwartOrbitRadius;

                const currentX = this.position.x + cw / 2;
                const currentY = this.position.y + ch / 2;

                const dx = orbitX - currentX;
                const dy = orbitY - currentY;
                const dist = Math.hypot(dx, dy);

                const orbitLinearSpeed =  this.stalwartOrbitRadius * this.stalwartOrbitSpeed;
                const moveSpeed = orbitLinearSpeed * 2;

                if (dist > 1) {
                    const step = Math.min(dist, moveSpeed * (simDelta / 1000));

                    this.position.x += (dx / dist) * step;
                    this.position.y += (dy / dist) * step;
                } else {
                    this.stalwartOrbitAngle += this.stalwartOrbitSpeed * (simDelta / 1000);
                }

                this.center.x = this.position.x + cw / 2;
                this.center.y = this.position.y + ch / 2;

                this.x = this.position.x;
                this.y = this.position.y;
            }
        }

        if (this.psychoCutWaves.length > 0) {
            for (let wi = this.psychoCutWaves.length - 1; wi >= 0; wi--) {
                const w = this.psychoCutWaves[wi];

                w.traveled += w.speed * frameFactor;

                for (const enemy of this.main.area.enemies) {
                    if (
                        !enemy ||
                        enemy.hp <= 0 ||
                        enemy.invulnerable ||
                        w.hitEnemies.has(enemy)
                    ) continue;

                    const currentX = w.originX + w.dirX * w.traveled;
                    const currentY = w.originY + w.dirY * w.traveled;

                    const dx = enemy.center.x - currentX;
                    const dy = enemy.center.y - currentY;
                    const distance = Math.hypot(dx, dy);

                    const angle = Math.atan2(dy, dx);

                    let diff = angle - w.dirAngle;

                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;

                    const radialDifference = Math.abs(distance - w.arcRadius);

                    if (
                        radialDifference <= w.thickness &&
                        Math.abs(diff) <= w.arcHalfAngle
                    ) {
                        w.hitEnemies.add(enemy);

                        this.dealDirectDamage(enemy);

                        if (this.ability?.id === 'psychoCutMega') {
                            this.psychoCutRangeBonus += 60;
                            w.maxDist += 60;
                        }
                    }
                }

                if (w.traveled >= w.maxDist) {
                    this.psychoCutWaves.splice(wi, 1);
                }
            }
        }

        if (this.sandsearWaves.length > 0) {
            for (let wi = this.sandsearWaves.length - 1; wi >= 0; wi--) {
                const w = this.sandsearWaves[wi];

                w.traveled += w.speed * frameFactor;

                for (const enemy of this.main.area.enemies) {
                    if (!enemy || enemy.hp <= 0 || (enemy.invisible && !this.revealInvisible) ||w.hitEnemies.has(enemy)) continue;

                    const ex = enemy.center.x - w.originX;
                    const ey = enemy.center.y - w.originY;

                    const along = ex * w.dirX + ey * w.dirY; 
                    const perp = Math.abs(ex * -w.dirY + ey * w.dirX);

                    if (perp <= w.bandHalfWidth && along <= w.traveled && along >= -w.bandHalfWidth) {
                        w.hitEnemies.add(enemy);
                        this.dealDirectDamage(enemy);
                    }
                }

                if (w.traveled >= w.maxDist) {
                    this.sandsearWaves.splice(wi, 1);
                }
            }
        }

        if (['drumBeating', 'boomburst', 'liquidVoice', 'originPulse', 'charmedCharm', 'emptyLight', 'laundryGoRound'].includes(this.ability?.id)) {
            if (validEnemies.length > 0 && this.attackCooldown <= 0) {
                if (!this.main.mute[3]) {
                   (this.ability.id === 'drumBeating') ? playSound('rillaboom', 'effect') : 
                   (this.ability.id === 'originPulse') ? playSound('kyogre', 'effect') :
                   (this.ability.id === 'laundryGoRound') ? playSound('pull', 'effect') :
                   playSound('chimecho', 'effect');
                }

                const waveSpeed = this.range / 50;
                const waveDelay = 450;
                const waveWidth = 6;

                let boomburstWavesNumber = 
                    (['boomburst', 'originPulse'].includes(this.ability?.id)) ? 3 :
                    (['liquidVoice', 'charmedCharm', 'emptyLight'].includes(this.ability?.id)) ? 2 : 1;

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
                if (this.ability?.id === 'laundryGoRound') this.laundryStacks++;
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

                        if (this.pokemon?.ability?.id == 'charmedCharm') {
                            bbWaveDamage += (bbWaveDamage * this.main.area.heartScale * 0.05);
                        }

                        // CRITICAL
                        let isCritical = false;
                        let critical = this.critical;

                        if (this.isMounted && (this.pokemon.id == 114 || this.pokemon?.adn?.id == 114)) critical += 30;
                        if (this.criticalAura) critical += 20;
                        if (this.genesisAura) critical += 5;
                        if (this.pokemon?.item?.id == 'direHit') critical += 25;
                        if (this.pokemon?.item?.id == 'expertBelt' || this.pokemon?.item?.id == 'iron') critical += 10;
                        if ((this.pokemon?.item?.id == 'lansatBerry' || this.pokemon?.item?.id == 'berryPouch') && this.lansatBerryTimer > 0) {
                            if (this.ability?.id == 'ripen') critical += (this.main.area.unnerve) ? 132 : 120;
                            else critical += (this.main.area.unnerve) ? 66 : 60;
                        }

                        if ((Math.random() * 100) < critical && this.tower?.pokemon?.item?.id != 'blueBandana') {
                            isCritical = true;
                            let multiplier = (this.ability?.id === 'superCritical') ? 2.0 : 1.5;
                            if (this.criticalDamageAura) multiplier *= 1.5;
                            if (this.pokemon?.item?.id == 'clover') multiplier *= 1.3;
     
                            if (this.main?.area?.weather == 'hail') {
                                if (this.main.area.iceBodyActivated && this.main.area.iceBody) multiplier *= 1.5;
                                else multiplier *= 1.25;
                            }

                            if (this.ability?.id === 'waterCompaction' && ['rain', 'thunderStorm', 'sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)) multiplier *= 1.3;
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

                        if (this.ability?.id === 'originPulse' && enemy.canStun && enemy.statusEffects.some(e => e.type === 'slow' && e.duration > 0))  {
                            if (this.pokemon?.item?.id === 'lightClay') {
                                enemy.applyStatusEffect({ type: 'stun', duration: 2.2 }, this.pokemon);
                            } else {
                                enemy.applyStatusEffect({ type: 'stun', duration: 2 }, this.pokemon);
                            }
                        }

                        if (this.ability?.id === 'emptyLight')  {
                            if (enemy.canStun && (Math.random() < (this.main.area.defeatedEnemiesWaveByUB/50))) {
                                if (this.pokemon?.item?.id === 'lightClay') {
                                    enemy.applyStatusEffect({ type: 'stun', duration: 1.1 }, this.pokemon);
                                } else {
                                    enemy.applyStatusEffect({ type: 'stun', duration: 1 }, this.pokemon);
                                }
                            }

                            if (enemy.canPoison && Math.random() < 0.2) {
                                enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.pokemon);
                                 if (this.pokemon?.item?.id == 'toxicOrb' || (this.pokemon?.item?.id == 'poisonBarb' && Math.random() < 0.5)) enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.pokemon);
                            }
                        }

                        if (enemy.canSlow && (
                            (this.ability?.id === 'originPulse' && Math.random() < 0.15) || 
                            (this.ability?.id === 'liquidVoice' && Math.random() < 0.25) || 
                            this.ability?.id === 'drumBeating')

                        ) {
                            if (this.pokemon?.item?.id === 'lightClay') {
                                enemy.applyStatusEffect({ type: 'slow', duration: 2.2, slowPercent: 0.5 }, this.pokemon);
                            } else {
                                enemy.applyStatusEffect({ type: 'slow', duration: 2, slowPercent: 0.5 }, this.pokemon);
                            }
                        }

                        if (this.ability?.id === 'boomburst' && enemy.canStun && Math.random() < 0.10) {
                            if (this.pokemon?.item?.id === 'lightClay') {
                                enemy.applyStatusEffect({ type: 'stun', duration: 1.65 }, this.pokemon);
                            } else {
                                enemy.applyStatusEffect({ type: 'stun', duration: 1.5 }, this.pokemon);
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
                    this.ctx.globalAlpha *= this.getEffectOpacity('waves');
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
            const areaAttackSpeed = Math.max(0.01, this.speed * (this.snowCloakNear ? 1.5 : 1));
            let explosionAttack = false;
            if (this.ability?.id === 'explosion') {
                if (this.explosionCharge > 0) {
                    if (validEnemies.length >= 5) {
                        this.explosionCharge = Math.max(
                            0,
                            this.explosionCharge - simDelta
                        );
                    } else {
                        this.explosionCharge = Math.max(
                            1000,
                            this.explosionCharge - simDelta
                        );
                    }

                    if (this.explosionCharge > 0) {
                        return;
                    }

                    explosionAttack = true;
                } else if (this.attackCooldown <= 0) {
                    this.explosionCharge = 3000;
                    return;
                }
            }

            while (validEnemies.length > 0 && this.attackCooldown <= 0 && areaAttacksThisFrame < 50) {
                if (areaAttacksThisFrame === 0 && !this.main.mute[3]) playSound(this.projectile.effect, 'effect');

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

                    if (enemy?.passive?.id === 'relicSong') {
                        if (Math.random() < 0.3) {
                            playSound('dance', 'effect');
                            this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
                            this.relicSongSpin = Math.PI * 2;
                            return;
                        }
                    }
                }

                if (this.ability.id === 'explosion') {
                    let damp = false;
                    damp = this.main.area.towers.find(t => t.pokemon?.ability?.id === 'damp');

                    if (!damp) {
                        if (this.main.autoReset == 0) {
                            this.main.player.getDamaged(2);
                            this.main.area.hitsReceived++;
                            if (this.main.player.health[this.main.area.routeNumber] == 0 && !this.main.player.secrets.wooper) {
                                this.main.player.secrets.wooper = true;
                                this.main.UI.getSecret('wooper');
                            }
                        } else {
                            if (this.main.player.health[this.main.area.routeNumber] <= 2 && !this.main.player.secrets.wooper) {
                                this.main.player.secrets.wooper = true;
                                this.main.UI.getSecret('wooper');
                            }
                            this.main.player.getDamaged(2);
                            this.main.area.hitsReceived++;
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

                if (this.ability?.id === 'precipiceBlades') {
                    const pos = { x: this.center.x, y: this.center.y };
                    this.main.area.createSpikeZone(pos, this, {
                        radius: this.range,
                        innerRadius: this.innerRange,
                        duration: 1500,
                        tickRate: 450,
                        dedupDistance: 32,
                        dedupTime: 250,
                        magma: true,
                        burn: true
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

                    if (this.ability?.id === 'slowStart' && this.slowStartTimer >= 60000) {
                        finalDamage = Math.ceil(finalDamage * 2);
                    }

                    if (this.tower?.pokemon?.item?.id === 'ancientShield' || (this.tower?.pokemon?.item?.id == 'eviolite')) {
                        finalDamage = Math.ceil(finalDamage * 1.2);
                    }

                    if ([165, 175, 176, 233].includes(this.pokemon.id)) {
                        if (this.main.area.swordsDance) finalDamage = Math.ceil(finalDamage * 1.2);
                        //if (this.main.area.sacredSword) finalDamage = Math.ceil(finalDamage * 1.1);
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
                    if (this.pokemon?.item?.id == 'expertBelt' || this.pokemon?.item?.id == 'iron') critical += 10;

                    if ((this.pokemon?.item?.id == 'lansatBerry' || this.pokemon?.item?.id == 'berryPouch') && this.lansatBerryTimer > 0) {
                            if (this.ability?.id == 'ripen') critical += (this.main.area.unnerve) ? 132 : 120;
                            else critical += (this.main.area.unnerve) ? 66 : 60;
                        }

                    if ([165, 175, 176, 233].includes(this.pokemon.id)) {
                        if (this.main.area.heartOfSteel) critical += (this.main.area.hitsReceived > 0) ? 15 : 5;
                        //if (this.main.area.sacredSword) critical += Math.ceil(critical * 1.1);
                    }

                    if (this.ability?.id === 'waterCompaction' && ['rain', 'thunderStorm', 'sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)) { 
                        finalDamage = Math.ceil(finalDamage * 1.3);
                        critical += 30;
                    }

                    if ((Math.random() * 100) < critical && this.tower?.pokemon?.item?.id != 'blueBandana') {
                        isCritical = true;
                        let multiplier = (this.ability?.id === 'superCritical' || this.ability?.id === 'piercingDrill') ? 2.0 : 1.5;
                        if (this.criticalDamageAura) multiplier *= 1.5;
                        if (this.pokemon?.item?.id == 'clover') multiplier *= 1.3;
                        if (this.main?.area?.weather == 'hail') {
                            if (this.main.area.iceBodyActivated && this.main.area.iceBody) multiplier *= 1.5;
                            else multiplier *= 1.25;
                        }
                        if (this.ability?.id === 'waterCompaction' && ['rain', 'thunderStorm', 'sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)) multiplier *= 1.3;
                        finalDamage = Math.ceil(finalDamage * multiplier);
                    }

                    if (
                        this.main.area.weather == 'rain' && 
                        (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform')
                    ) {
                        finalDamage = Math.ceil(finalDamage * 1.2);
                    }

                    if (
                        this.main.area.weather == 'thunderStorm' && 
                        (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform')
                    ) {
                        finalDamage = Math.ceil(finalDamage * 1.25);
                    }

                    if (
                        this.main.area.weather == 'heavyRain' && this.pokemon?.item?.id != 'safetyGoggles' &&
                        (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform')
                    ) {
                        if (!this.main.area.cloudNine) {
                            finalDamage = Math.ceil(finalDamage * 0.5);
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

                    if (enemy.canStun && this.ability && this.ability.id === 'explosion') {
                        (this.pokemon?.item?.id == 'lightClay') ? enemy.applyStatusEffect({ type: 'stun', duration: 3.3 }) : enemy.applyStatusEffect({ type: 'stun', duration: 3 });
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

                if (explosionAttack) {
                    const particleCount = 20;

                    this.explosionBurst = {
                        elapsed: 0,
                        duration: 500,
                        maxRadius: Math.max(40, this.range),
                        particles: Array.from({ length: particleCount }, (_, i) => ({
                            angle: (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.25,
                            speed: 0.8 + Math.random() * 0.5,
                            size: 1.5 + Math.random() * 2.5
                        }))
                    };

                    if (!this.main.mute[3]) {
                        playSound('explosion', 'effect');
                    }
                }

                this.pulse.active = true;
                this.pulse.radius = 0;
                this.pulse.alpha = 0.7;
                this.pulse.maxRadius = this.range;
                this.pulse.speed = this.range / 15;
                areaAttacksThisFrame++;
                this.attackCooldown += areaAttackSpeed;
                if (explosionAttack) break;
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

                this.pulse.radius += this.pulse.speed * frameFactor * this.getEffectOpacity('areas');
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
        const attackSpeed = Math.max(0.01, this.speed * (this.snowCloakNear ? 1.5 : 1));
        while (
            this.target && !isOrbitalTower && validEnemies.length > 0 && shotsThisFrame < 50 &&
            this.attackCooldown <= 0 && 
            this.pokemon.attackType !== 'orbital' && 
            this.pokemon.attackType !== 'aura' && 
            this.pokemon.attackType !== 'stream' && 
            !this.uTurnState &&
            (
                this.ability?.id !== 'bleakwindStorm' ||
                this.main.area.weather === 'strongWinds'
            )
        ) {
            let maxShots =
                this.ability && this.ability.id === 'cradily' ? this.main.player.fossilInTeam :
                this.ability && (this.ability.id === 'quadraShot' || this.ability.id === 'quadraShotSand') ? 4 :
                this.ability && (this.ability.id === 'tripleShot' || this.ability.id === 'supremeCommanders') ? 3 :
                this.ability && this.ability.id === 'octaShot' ? 8 :
                this.ability && (
                    this.ability.id === 'doubleShot' || 
                    this.ability.id === 'whiteRay' || 
                    this.ability.id === 'burnDoubleShot' || this.ability.id === 'spicySpray' || 
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
            if (this.ability.id === 'seedFlare') maxShots = Math.min(3, this.main.area.heartScale);

            const orderedAll = this.getOrderedEnemies(validEnemies);

            let filteredOrderedAll = orderedAll;
            let filteredTarget = this.target;

            if (this.ability?.id === 'anchorShot' || this.ability?.id === 'signalBeam' || this.ability?.id === 'cryogenicCannon') {
                const anchoredEnemies = new Set(
                    this.beams
                        .filter(b => (b.isAnchorChain || b.isSignalBeam || b.isCryogenicCannon) && b.active && b.attachedEnemy)
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

                if (cand?.passive?.id === 'relicSong') {
                    if (Math.random() < 0.3) {
                        playSound('dance', 'effect');
                        this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
                        this.relicSongSpin = Math.PI * 2;
                        return;
                    }
                }
            }

            if (this.ability.id == 'amnesia' && (this.pokemon?.item?.id == 'laggingTail' || Math.random() < 0.5)) {
                this.amnesiaStacks++;
                skipAttack = true;
            }

            if (skipAttack) {
                if (this.ability.id !== 'uTurn') this.attackCooldown += attackSpeed;
                break;
            } else {
                let soundActivated = false;
                targets.forEach(tgt => {
                    if (!tgt) return;
                    if (["secretSword", "ceaselessEdge"].includes(this.ability?.id)) {
                        this.secretSwordAttack(tgt);
                        return;
                    }
                    if (['icyWind', 'dazzlingGleam'].includes(this.ability?.id)
                    ) {
                        this.directionalAreaAttack(
                            tgt,
                            this.ability.id
                        );
                        return;
                    }
                    if (this.ability?.id === 'fairySingularity') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;

                        const proj = new Projectile(
                            this.position.x - 6,
                            this.position.y + spawnOffsetY - 6,
                            tgt,
                            this.ctx,
                            {
                                ...this.projectile,
                                fairySingularity: {
                                    waitDuration: 1000,
                                    pullDuration: 450,
                                    radius: 90,
                                    pullSpeed: 220
                                }
                            },
                            this
                        );

                        this.projectiles.push(proj);
                        
                        if (!this.main.mute[3]) {
                            playSound(this.projectile.effect, 'effect');
                        }

                        return;
                    }
                    if (['soulHeartReactor', 'solarBeam', 'steelBeam'].includes(this.ability.id)) {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 48 : 24;     
                        const beamDuration = 260;  
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound(this.projectile.effect, 'effect');
                    } else if (this.ability.id === 'psybeam') {
                        const dx = tgt.center.x - this.center.x;
                        const dy = tgt.center.y - this.center.y;
                        const baseAngle = Math.atan2(dy, dx);

                        const angles = [
                            baseAngle,                  // hacia el objetivo
                            baseAngle + Math.PI / 2,    // 90°
                            baseAngle + Math.PI,        // 180°
                            baseAngle - Math.PI / 2     // 270°
                        ];

                        angles.forEach(angle => {
                            const from = { x: this.center.x, y: this.center.y };
                            const to = { x: this.center.x + Math.cos(angle), y: this.center.y + Math.sin(angle) };
                            const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 40 : 20;  

                            const beam = new Beam(from, to, this, {
                                width: beamWidth,
                                duration: 260,
                                hitCooldown: 140,
                                extend: this.range
                            });
                            this.beams.push(beam);
                        });
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound(this.projectile.effect, 'effect');
                    } else if (this.ability?.id === 'bleakwindStorm') {
                        const target = this.target;

                        if (target && target.center) {
                            const dx = target.center.x - this.center.x;
                            const dy = target.center.y - this.center.y;

                            const angle = Math.atan2(dy, dx);

                            const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;

                            const proj = new Projectile(
                                this.position.x - 6,
                                this.position.y + spawnOffsetY - 6,
                                null,
                                this.ctx,
                                {
                                    ...this.projectile,
                                    bleakwindStorm: {
                                        angle,
                                        amplitude: 32,
                                        wavelength: 95,
                                        hitCooldown: 300
                                    }
                                },
                                this
                            );

                            this.projectiles.push(proj);
                        }
                    } else if (this.ability.id === 'steamEruption') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 30 : 15;
                        const beamDuration = 220;
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);

                        const trailEnd = beam.extendedTo;
                        const trailRadius = 22;
                        const spacing = trailRadius * 1.5;
                        const totalDist = Math.hypot(trailEnd.x - from.x, trailEnd.y - from.y);
                        const steps = Math.max(1, Math.ceil(totalDist / spacing));
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound(this.projectile.effect, 'effect');
                        for (let i = 0; i <= steps; i++) {
                            const t = i / steps;
                            const pos = {
                                x: from.x + (trailEnd.x - from.x) * t,
                                y: from.y + (trailEnd.y - from.y) * t
                            };

                            this.main.area.createSpikeZone(pos, this, {
                                radius: trailRadius,
                                duration: 3000,
                                tickRate: 500,
                                dedupDistance: 0,
                                slow: true,
                                slowFactor: 0.5,
                                smoke: true
                            });
                        }
                    } else if (this.ability.id === 'hyperBeam' && (this.hitCount === 4 || (this.pokemon?.item?.id === "powerHerb" && this.hitCount === 2))) {     
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 100 : 50;     
                        const beamDuration = 260;  
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);
                        this.hitCount = 0;
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound('beam1', 'effect');
                    } else if (this.ability.id === 'iceBeam' && (this.hitCount === 4 || (this.pokemon?.item?.id === "powerHerb" && this.hitCount === 2))) {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 40 : 20;     
                        const beamDuration = 260;  
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);
                        this.hitCount = 0;
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound('beam1', 'effect');
                    } else if (this.ability.id === 'machBolt' && (this.hitCount === 39 || (this.pokemon?.item?.id === "powerHerb" && this.hitCount === 37))) {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 40 : 20;     
                        const beamDuration = 260;  
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);
                        this.hitCount = 0;
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound('beam1', 'effect');
                    } else if (this.ability.id === 'zapCannon' || this.ability.id === 'meteorBeam') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };
                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 16 : 8;     
                        const beamDuration = 260;  
                        const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                        this.beams.push(beam);
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound(this.projectile.effect, 'effect');
                    } else if (this.ability.id === 'hydroCannon') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };

                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 36 : 18;        
                        const beamDuration = 4000;   
                        const hitCooldown = 390;       
                        const beamOpts = {
                            width: beamWidth,
                            duration: beamDuration,       
                            hitCooldown: hitCooldown,
                            extend: Math.max(this.range, 100),
                            attachedEnemy: tgt,
                            persistOnDeath: true   
                        };

                        const hydro = new Beam(from, to, this, beamOpts);
                        this.beams.push(hydro);
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound(this.projectile.effect, 'effect');
                    } else if (this.ability.id === 'moongeistBeam') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                        const from = { x: this.center.x, y: this.center.y };

                        const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                        const beamWidth = (this.pokemon?.item?.id == 'terrainExtender') ? 28 : 14;        
                        const beamDuration = 4000;   
                        const hitCooldown = 390;        
                        const beamOpts = {
                            width: beamWidth,
                            duration: beamDuration,       
                            hitCooldown: hitCooldown,
                            extend: Math.max(this.range, 100),
                            attachedEnemy: tgt,
                            persistOnDeath: true   
                        };

                        const hydro = new Beam(from, to, this, beamOpts);
                        this.beams.push(hydro);
                        soundActivated = true;
                        if (!this.main.mute[4]) playSound(this.projectile.effect, 'effect');
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
                            soundActivated = true;
                            if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');
                        }
                    } else if (this.ability.id === 'signalBeam') {
                        const activeBeams = this.beams.filter(b => b.isSignalBeam && b.active);
                        const alreadyBeaming = activeBeams.some(b => b.attachedEnemy === tgt);

                        if (!alreadyBeaming && activeBeams.length < 1) {
                            const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                            const from = { x: this.center.x, y: this.center.y };
                            const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                            const beam = new Beam(from, to, this, {
                                width: 5,
                                duration: Infinity,
                                hitCooldown: 250,
                                attachedEnemy: tgt,
                                persistOnDeath: false,
                                detachDistance: this.range + 20,
                                onlyAttachedEnemy: true
                            });
                            beam.isSignalBeam = true;

                            this.beams.push(beam);
                            soundActivated = true;
                            if (!this.main.mute[4]) playSound(this.projectile.effect, 'effect');
                        }
                    } else if (this.ability.id === 'cryogenicCannon') {
                        const activeBeams = this.beams.filter(b => b.isCryogenicCannon && b.active);
                        const alreadyBeaming = activeBeams.some(b => b.attachedEnemy === tgt);

                        if (!alreadyBeaming && activeBeams.length < 1) {
                            const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                            const from = { x: this.center.x, y: this.center.y };
                            const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                            const beam = new Beam(from, to, this, {
                                width: 3,
                                duration: Infinity,
                                hitCooldown: 500,
                                attachedEnemy: tgt,
                                persistOnDeath: false,
                                detachDistance: this.range + 20,
                                onlyAttachedEnemy: true
                            });
                            beam.isCryogenicCannon = true;

                            this.beams.push(beam);
                            soundActivated = true;
                            if (!this.main.mute[4]) playSound(this.projectile.effect, 'effect');
                        }
                    } else if (this.ability.id === 'bonemerang') {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;

                        const proj = new Projectile(
                            this.position.x - 6,
                            this.position.y + spawnOffsetY - 6,
                            tgt,
                            this.ctx,
                            {
                                ...this.projectile,
                                bonemerang: true
                            },
                            this
                        );
                        this.projectiles.push(proj);

                        if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');
                    } else if (this.ability?.id === 'sandsearStorm') {
                        if (this.main.area.weather === 'sandAvalanche') {
                            const dx = tgt.center.x - this.center.x;
                            const dy = tgt.center.y - this.center.y;
                            const dist = Math.hypot(dx, dy) || 1;

                            const canvas = this.main.game.canvas;

                            this.sandsearWaves.push({
                                originX: this.center.x,
                                originY: this.center.y,
                                dirX: dx / dist,
                                dirY: dy / dist,
                                traveled: 0,
                                speed: 2.2, 
                                maxDist: Math.hypot(canvas.width, canvas.height),
                                bandHalfWidth: 80, 
                                alpha: 0.85,
                                hitEnemies: new Set()
                            });

                            this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
                            soundActivated = true;
                            if (!this.main.mute[0]) playSound('area2', 'effect');
                        }
                    } else if (['psychoCut', 'psychoCutMega'].includes(this.ability?.id)) {
                        const dx = tgt.center.x - this.center.x;
                        const dy = tgt.center.y - this.center.y;
                        const dist = Math.hypot(dx, dy) || 1;

                        const dirX = dx / dist;
                        const dirY = dy / dist;

                        const arcRadius = 45;

                        this.psychoCutWaves.push({
                            originX: this.center.x,
                            originY: this.center.y,

                            dirX,
                            dirY,

                            dirAngle: Math.atan2(dirY, dirX),

                            traveled: 0,

                            // El arco completo se mantiene dentro del range
                            maxDist: Math.max(0, this.range - arcRadius),

                            speed: 5,

                            arcRadius,
                            arcHalfAngle: Math.PI * 0.32,
                            thickness: 12,

                            hitEnemies: new Set()
                        });

                        this.attackCooldown = this.speed * (this.snowCloakNear ? 1.5 : 1);
                        soundActivated = true;
                        if (!this.main.mute[0]) {
                            playSound(this.projectile.effect, 'effect');
                        }
                    } else if (this.ability.id === 'uTurn') {
                        this.dealDirectDamage(tgt);

                        const canvas = this.main.game.canvas;
                        const margin = (this.width || 24) / 2;
                        const clampedX = Math.min(canvas.width - margin, Math.max(margin, tgt.center.x));
                        const clampedY = Math.min(canvas.height - margin, Math.max(margin, tgt.center.y));

                        this.uTurnTransition = {
                            startX: this.center.x,
                            startY: this.center.y,
                            targetX: clampedX,
                            targetY: clampedY,
                            elapsed: 0,
                            duration: 250
                        };
                        this.uTurnState = { phase: 'moving', visited: new Set([tgt]) };
                        soundActivated = true;
                        if (!this.main.mute[0]) playSound(this.projectile.effect, 'effect');
                    } else if (this.ability.id === 'fireLash') {
                        const baseAngle = Math.atan2(tgt.center.y - this.center.y, tgt.center.x - this.center.x);
                        const halfAngle = Math.PI / 2; // 90° a cada lado = 180° de barrido (semicono)

                        const hits = this.main.area.enemies.filter(e => {
                            if (!e || e.hp <= 0 || e.invulnerable) return false;

                            const dx = e.center.x - this.center.x;
                            const dy = e.center.y - this.center.y;
                            const dist = Math.hypot(dx, dy);
                            if (dist > this.range) return false;

                            const angleToE = Math.atan2(dy, dx);
                            let diff = Math.abs(angleToE - baseAngle);
                            if (diff > Math.PI) diff = Math.PI * 2 - diff;

                            return diff <= halfAngle;
                        });

                        hits.forEach(e => this.dealDirectDamage(e));

                        this.fireLashEffect = {
                            angle: baseAngle,
                            halfAngle,
                            radius: this.range,
                            elapsed: 0,
                            duration: 400
                        };
                        soundActivated = true;
                        if (!this.main.mute[3]) playSound(this.projectile.effect, 'effect');
                    } else {
                        const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;

                        if (['bubbleBeam', 'hyperDrill', 'icicleSpear', 'twineedle', 'twineedleMega'].includes(this.pokemon?.ability?.id)) {

                            let amount = this.pokemon?.ability?.id === 'hyperDrill' ? 3
                                : this.pokemon?.ability?.id === 'bubbleBeam' ? 8
                                : this.pokemon?.ability?.id === 'twineedleMega' ? 3
                                : this.pokemon?.ability?.id === 'twineedle' ? 2
                                : Math.floor(Math.random() * 4) + 2;

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
                                    soundActivated = true;
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
                                    soundActivated = true;
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
                            soundActivated = true;
                            if (!this.main.mute[4]) playSound('beam1', 'effect');
                            const spawnOffsetY = this.isPassenger ? this.passengerYOffset : 0;
                            const from = { x: this.center.x, y: this.center.y };
                            const to = { x: tgt.center.x, y: tgt.center.y + spawnOffsetY };

                            const beamWidth = 25;     
                            const beamDuration = 260;  
                            const beam = new Beam(from, to, this, { width: beamWidth, duration: beamDuration, hitCooldown: 140 });
                            this.beams.push(beam);

                        } else { // PROJECTILES NORMALES 
                            if (['hyperBeam', 'iceBeam', 'machBolt'].includes(this.pokemon?.ability?.id)) {
                                this.hitCount++;
                            }
                            if (this.pokemon?.ability?.id == 'bulkUp') this.main.area.bulkUpUsers[this.pokemon.id].paused = true;
                            if (this.pokemon?.ability?.id === 'meteorMash' && (this.main.area.meteorMashUsers[this.pokemon.id] < 6 || this.main.area.meteorMashUsers[this.pokemon.id] == undefined)) {
                                this.meteorMashCount++;
                                if (this.meteorMashCount % 5 === 0) {
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

                if (shotsThisFrame === 0 && !this.main.mute[0] && !soundActivated) {
                    if (this.pokemon?.item?.id == 'subwoofer') {
                        let bark = Math.floor(Math.random() * 4) + 1;
                        playSound(`dog${bark}`, 'effect');
                    } else playSound(this.projectile.effect, 'effect');
                }

                if (['voltSurge', 'cryogenicCannon'].includes(this.ability.id)) {
                    this.main.area.towers
                        .filter(t => t.ability?.id === "aggressiveNature")
                        .forEach(t => t.attackCooldown -= 99999);
                }
                
                shotsThisFrame++;
                if (this.ability.id !== 'uTurn') {
                    if (this.ceaselessEdgeAttack) {
                        this.attackCooldown += 100;
                        this.ceaselessEdgeAttack = false;
                    } else {
                        this.attackCooldown += attackSpeed;
                    }
                }
            }
        }

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

            if (isOrbitalTower || p.orbit || p.bonemerang || p.bleakwindStorm) {

            } else if (!p.enemy || p.enemy.hp <= 0 || (p.enemy.invisible && !(p.tower?.revealInvisible || p.tower?.targetMode === 'invisible'))) {
                const fallbackSource = p.enemy ? p.enemy : { center: p.position };
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

        if (this.fireLashEffect) {
            const fx = this.fireLashEffect;
            const t = Math.min(1, fx.elapsed / fx.duration);
            const fadeOut = 1 - Math.max(0, (t - 0.7) / 0.3);

            const startAngle = fx.angle - fx.halfAngle;
            const endAngle = fx.angle + fx.halfAngle;
            const sweepAngleNow = startAngle + t * (endAngle - startAngle);

            const tipX = this.center.x + Math.cos(sweepAngleNow) * fx.radius;
            const tipY = this.center.y + Math.sin(sweepAngleNow) * fx.radius;

            this.ctx.save();
            this.ctx.globalCompositeOperation = 'lighter';

            const dx = tipX - this.center.x;
            const dy = tipY - this.center.y;
            const dist = Math.hypot(dx, dy);

            const perpX = -dy / dist;
            const perpY = dx / dist;

            const whipSegments = 10;

            //this.ctx.shadowBlur = 3;
            this.ctx.shadowColor = `rgba(92, 18, 0, ${0.35 * fadeOut})`;

            this.ctx.strokeStyle = `rgba(92, 18, 0, ${0.55 * fadeOut})`;
            this.ctx.lineWidth = 8;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.ctx.beginPath();

            for (let i = 0; i <= whipSegments; i++) {
                const p = i / whipSegments;

                const x = this.center.x + dx * p;
                const y = this.center.y + dy * p;

                const curve = Math.sin(p * Math.PI) * dist * 0.15;
                const wave = Math.sin(p * Math.PI * 2.5) * dist * 0.03;

                const offset = curve + wave;

                const px = x + perpX * offset;
                const py = y + perpY * offset;

                if (i === 0) {
                    this.ctx.moveTo(px, py);
                } else {
                    this.ctx.lineTo(px, py);
                }
            }

            this.ctx.stroke();

            const trailSegments = 10;

            for (let trail = 1; trail <= trailSegments; trail++) {
                const trailOffset = trail / trailSegments;

                const trailT = Math.max(0, t - trailOffset * 0.12);

                const trailTipX =
                    this.center.x +
                    Math.cos(
                        startAngle + trailT * (endAngle - startAngle)
                    ) * fx.radius;

                const trailTipY =
                    this.center.y +
                    Math.sin(
                        startAngle + trailT * (endAngle - startAngle)
                    ) * fx.radius;

                const trailDx = trailTipX - this.center.x;
                const trailDy = trailTipY - this.center.y;
                const trailDist = Math.hypot(trailDx, trailDy);

                const trailPerpX = -trailDy / trailDist;
                const trailPerpY = trailDx / trailDist;

                const alpha =
                    (1 - trailOffset) * 0.45 * fadeOut;

                this.ctx.strokeStyle =
                    `rgba(196, 58, 18, ${alpha})`;

                this.ctx.lineWidth =
                    6 * (1 - trailOffset * 0.5);

                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';

                this.ctx.beginPath();

                for (let i = 0; i <= whipSegments; i++) {
                    const p = i / whipSegments;

                    const x =
                        this.center.x +
                        trailDx * p;

                    const y =
                        this.center.y +
                        trailDy * p;

                    const curve =
                        Math.sin(p * Math.PI) *
                        trailDist * 0.15;

                    const wave =
                        Math.sin(p * Math.PI * 2.5) *
                        trailDist * 0.03;

                    const offset = curve + wave;

                    const px = x + trailPerpX * offset;
                    const py = y + trailPerpY * offset;

                    if (i === 0) {
                        this.ctx.moveTo(px, py);
                    } else {
                        this.ctx.lineTo(px, py);
                    }
                }

                this.ctx.stroke();
            }

            this.ctx.restore();
        }
    }

    findClosestEnemy(fromEnemy, maxDist = 1000) {
        let closest = null;
        let minDist = maxDist * maxDist;
        for (const e of this.main.area.enemies) {
            if (!e || e === fromEnemy || e.hp <= 0) continue;
            if (e.center.x < 0 || e.center.x > this.main.game.canvas.width || e.center.y < 0 || e.center.y > this.main.game.canvas.height) continue;
            const dx = e.center.x - fromEnemy.center.x;
            const dy = e.center.y - fromEnemy.center.y;
            const d = dx * dx + dy * dy;
            if (d < minDist) {
                minDist = d;
                closest = e;
            }
        }
        return closest;
    }

    criticalCalculator() {
        let critical = this.critical ?? 0;

        if (this.criticalAura) critical += 20;
        if (this.genesisAura) critical += 5;
        if (this.pokemon?.item?.id == 'direHit') critical += 25;
        if (this.pokemon?.item?.id == 'expertBelt') critical += 10;

        if ((this.pokemon?.item?.id == 'lansatBerry' || this.pokemon?.item?.id == 'berryPouch') && this.lansatBerryTimer > 0) {
            if (this.ability?.id == 'ripen') critical += (this.main.area.unnerve) ? 132 : 120;
            else critical += (this.main.area.unnerve) ? 66 : 60;
        }

        if ([165, 175, 176, 233].includes(this.pokemon.id)) {
            if (this.main.area.heartOfSteel) critical += (this.main.area.hitsReceived > 0) ? 15 : 5;
            //if (this.main.area.sacredSword) critical += Math.ceil(critical * 1.1);
        }

        if (this.ability?.id === 'ceaselessEdge') critical = Math.min(90, critical);

        if ((Math.random() * 100) < critical && this.pokemon?.item?.id != 'blueBandana') {
            return true;
        }
        return false;
    }

    dealDirectDamage(enemy, source = 'physical', forcedCritical = null, damageMultiplier = 1) { 
        if (!enemy || enemy.hp <= 0) return;

        let finalDamage = this.projectile.power;

        if (this.ability?.id === 'moongeistBeam' && this.pokemon?.item?.id == 'silphScope') finalDamage += 175;

        if (this.ability?.id === 'cryogenicCannon') {
            const hits = this.cryogenicCannonHits.get(enemy) || 0;

            finalDamage += hits * (50 * this.main.player.pastInTeam);

            this.cryogenicCannonHits.set(enemy, hits + 1);
        }

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
        let isCritical = (forcedCritical != null) ? forcedCritical : this.criticalCalculator();
        
        if (this.ability?.id === 'moongeistBeam') {
            if (
                [
                    "ditto", "kecleon", "absol", "lunala", "froslass", "mimikyu", "huntail", "octillery",
                    "zorua", "zoroark", "mimeJr", "mrMime", "scraggy", "scrafty", "nickit", "thievul", "sableye",
                    "marshadow", "mew", "duskull", "dusclops", "dusknoir", "spectrier"
                ].includes(enemy.enemy.id))
            finalDamage *= 3
        }

        if (this.ability?.id === 'soulHeartReactor') {
            finalDamage += Math.ceil(finalDamage * this.main.area.heartScale / 10)
        }

        if (this.pokemon?.specie?.key === 'heatmor') {
            const durant = this.main.area.towers.find(t => t.pokemon?.specie?.key === 'durant');
            if (durant) finalDamage += 10 + Math.floor(2.4 * durant.pokemon.lvl);
        }

        if (this.main.area.hugePower && (this.pokemon?.rangeType == 'star' || this.pokemon?.item?.id === 'starPiece')) {
            finalDamage = Math.ceil(finalDamage * 1.15);
        }

        if (isCritical) {
            let multiplier = (this.ability?.id === 'superCritical') ? 2.0 : 1.5;
            if (this.criticalDamageAura) multiplier *= 1.5;
            if (this.pokemon?.item?.id == 'clover') multiplier *= 1.5;
            if (this.main?.area?.weather == 'hail') {
                if (this.main.area.iceBodyActivated && this.main.area.iceBody) multiplier *= 1.5;
                else multiplier *= 1.25;
            }
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

        if ([165, 175, 176, 233].includes(this.pokemon.id)) {
            finalDamage = Math.ceil(finalDamage * 1.2);
            if (this.main.area.swordsDance) finalDamage = Math.ceil(finalDamage * 1.2);
            if (this.main.area.sacredSword) finalDamage = Math.ceil(finalDamage * 1.1);
        }

        if (this.uTurnBonus > 0) finalDamage += Math.ceil(finalDamage * this.uTurnBonus * 0.05)

        // WEATHER / TERRAIN
        if (
            this.main.area.weather == 'rain' &&
            (this.tile?.land == 3 || (this.tile?.land == 1 && this.pokemon?.item?.id == 'squirtBottle'))
        ) {
            finalDamage = Math.ceil(finalDamage * 1.2);
        }

        if (['sandstorm', 'sandAvalanche'].includes(this.main?.area?.weather)) {
            if (this.pokemon.ability?.id  === 'stoneEdge') finalDamage = Math.ceil(finalDamage * 1.2);  
            if (this.pokemon.ability?.id  === 'stoneEdgeMega')  finalDamage = Math.ceil(finalDamage * 1.25);   
        }

        if (
            this.main.area.weather == 'thunderStorm' &&
            (this.tile?.land == 3 || (this.tile?.land == 1 && this.pokemon?.item?.id == 'squirtBottle'))
        ) {
            finalDamage = Math.ceil(finalDamage * 1.25);
        }

        if (
            this.main.area.weather == 'heavyRain' && this.pokemon?.item?.id != 'safetyGoggles' &&
            (this.tile.land == 3 || (this.tile.land == 1 && this.pokemon?.item?.id == 'squirtBottle') || this.carriedBy == 'icePlatform')
        ) {
            if (!this.main.area.cloudNine) {
                finalDamage = Math.ceil(finalDamage * 0.5);
            }
        }

        if (this.pokemon?.item?.id === 'amuletCoin') {
            let g = Math.ceil(finalDamage * 0.0005 * this.main.player.stars);
            this.main.area.goldWave += g;
            this.main.player.changeGold(g);
        }

        // ESTADOS
        if ((enemy.canBurn && this.pokemon.ability?.id === 'flameWheel' && Math.random() < 0.5) || enemy.canBurn && this.pokemon.ability?.id === 'sacredFire') {
            if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
            else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
            else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);     
        }

        if (this.ability?.id === 'supersonic' && enemy.canStun && Math.random() < 0.10) {
            enemy.applyStatusEffect({ type: 'stun', duration: 1.5 }, this.pokemon);
        }

        if ((this.pokemon.ability?.id === 'iceBeam' || this.pokemon.ability?.id === 'machBolt') && enemy.canStun) {
            if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'stun', duration: 2.2 });
            else enemy.applyStatusEffect({ type: 'stun', duration: 2 });
        }

        if (this.pokemon.ability?.id === 'steamEruption' && enemy.canBurn) {
            if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
            else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
            else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);    
        }

        if (this.pokemon.ability?.id === 'triAttack' && Math.random() < 0.3) {
            let triAttackStatus = Math.floor(Math.random()*3);

            if (triAttackStatus === 0 && enemy.canBurn) {
                if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
                else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
                else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);    
            }  

            if (triAttackStatus === 1 && enemy.canSlow) {
                if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2.2 }) 
                else enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
            } 

            if (triAttackStatus === 2 && enemy.canStun) {
                if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'stun', duration: 1.65 });
                else enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
            } 
        }

        if (enemy.canBurn && ['volcanicKaboom', 'lavaPlume', 'fireLash'].includes(this.pokemon.ability?.id)) {
            if (this.pokemon?.item?.id == 'magmaStone') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
            else if (this.pokemon?.item?.id == 'falmeOrb') enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
            else enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);     
        }

        if (enemy.canPoison && this.pokemon.ability?.id === 'sludgeBomb') {
            enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.pokemon);   
            if (this.pokemon?.item?.id  == 'toxicOrb' || (this.pokemon?.item?.id == 'poisonBarb' && Math.random() < 0.5)) enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.pokemon);
        }

        if (this.pokemon.ability?.id === 'shadowBall') {
            enemy.applyStatusEffect({ type: 'nightmare', damage: null, stacks: 1 }, this.pokemon);
        }

        if (enemy.canSlow && ['waterBubble', 'icyWind'].includes(this.pokemon.ability?.id)) {
            if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2.2 }) 
            else enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
        }

        if (enemy.canStun && ['volcanicKaboom'].includes(this.pokemon.ability?.id) && Math.random() < 0.3) {
            if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'stun', duration: 1.65 });
            else enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
        }

        if (enemy.canStun && ['zapCannon'].includes(this.pokemon.ability?.id) && Math.random() < 0.3) {
            if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'stun', duration: 2.2 });
            else enemy.applyStatusEffect({ type: 'stun', duration: 2 });
        }

        if (enemy.canStun && ['dazzlingGleam'].includes(this.pokemon.ability?.id) && Math.random() < 0.25) {
            if (this.pokemon?.item?.id == 'lightClay') enemy.applyStatusEffect({ type: 'stun', duration: 1.1 });
            else enemy.applyStatusEffect({ type: 'stun', duration: 1 });
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

        if (damageMultiplier != 1) finalDamage = Math.floor(finalDamage * damageMultiplier)
        // aplicar daño con el método del enemigo
        enemy.getDamaged(finalDamage, source, this.pokemon.ability, isCritical, new Set(), this.pokemon, this);

        if (!this.main.mute[0] && this.pokemon.ability?.id === 'sacredFire') playSound(this.projectile.effect, 'effect');
    }

    drawVoltSurgeChain(points, alpha) {
        if (!this.ctx || !points || points.length < 2) return;
        const ctx = this.ctx;
        const now = Date.now();

        ctx.save();
        ctx.globalAlpha *= this.tower?.getEffectOpacity('beams') ?? 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < points.length - 1; i++) {
            const from = points[i];
            const to = points[i + 1];

            //ctx.shadowBlur = 4;
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

    createSupersonicWaves(enemy) {
        if (!enemy) return;
        if (!this.main.mute[3])  playSound('chimecho', 'effect');

        const speed = this.range / 50;

        for (let i = 0; i < 3; i++) {
            this.supersonicWaves.push({
                originX: enemy.center.x,
                originY: enemy.center.y,
                radius: 0,
                alpha: 0.9,
                speed,
                maxRadius: this.range,
                width: 6,
                delay: i * 450,
                elapsed: 0,
                hitEnemies: new Set()
            });
        }
    }

    updateSupersonicWaves(simDelta, frameFactor, shouldDraw = true) {
        for (let i = this.supersonicWaves.length - 1; i >= 0; i--) {
            const wave = this.supersonicWaves[i];

            wave.elapsed += simDelta;
            if (wave.elapsed < wave.delay) continue;

            wave.radius += wave.speed * frameFactor;
            wave.alpha -= 0.018 * frameFactor;

            for (const enemy of this.main.area.enemies) {
                if (!enemy || enemy.hp <= 0 || enemy.invulnerable || wave.hitEnemies.has(enemy)) continue;
                if (enemy.invisible && !this.revealInvisible && this.targetMode !== 'invisible') continue;

                const distance = Math.hypot(
                    enemy.center.x - wave.originX,
                    enemy.center.y - wave.originY
                );

                if (distance <= wave.radius && distance >= wave.radius - wave.width) {
                    wave.hitEnemies.add(enemy);
                    this.dealDirectDamage(enemy);
                }
            }

            if (shouldDraw && wave.alpha > 0) {
                const hex = (this.pokemon.specie.color || '#e85e29').replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) || 255;
                const g = parseInt(hex.substring(2, 4), 16) || 255;
                const b = parseInt(hex.substring(4, 6), 16) || 255;

                this.ctx.save();
                this.ctx.globalAlpha *= this.getEffectOpacity('waves');
                this.ctx.globalCompositeOperation = 'lighter';

                this.ctx.beginPath();
                this.ctx.arc(wave.originX, wave.originY, wave.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(${r},${g},${b},${wave.alpha * 0.3})`;
                this.ctx.lineWidth = wave.width * 2.2;
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.arc(wave.originX, wave.originY, wave.radius, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(${r},${g},${b},${wave.alpha})`;
                this.ctx.lineWidth = wave.width * 0.7;
                this.ctx.stroke();

                const innerRadius = wave.radius - wave.width * 0.25;

                if (innerRadius > 0) {
                    this.ctx.beginPath();
                    this.ctx.arc(wave.originX, wave.originY, innerRadius, 0, Math.PI * 2);
                    this.ctx.strokeStyle = `rgba(255,255,255,${wave.alpha * 0.55})`;
                    this.ctx.lineWidth = wave.width * 0.2;
                    this.ctx.stroke();
                }

                this.ctx.restore();
            }

            if (wave.radius >= wave.maxRadius || wave.alpha <= 0) this.supersonicWaves.splice(i, 1);
        }
    }

    createShadowTag(enemy) {
        if (!enemy) return;

        this.shadowTagZones.push({
            target: enemy,
            x: enemy.center.x,
            y: enemy.center.y,
            elapsed: 0,
            duration: 2000,
            radius: 0,
            maxRadius: 60
        });
    }

    updateShadowTagZones(simDelta) {
        for (let i = this.shadowTagZones.length - 1; i >= 0; i--) {
            const shadow = this.shadowTagZones[i];
            shadow.elapsed += simDelta;

            if (shadow.target?.hp > 0) {
                shadow.x = shadow.target.center.x;
                shadow.y = shadow.target.center.y;
            }

            shadow.radius = Math.min(shadow.maxRadius, shadow.maxRadius * (shadow.elapsed / shadow.duration));

            for (const enemy of this.main.area.enemies) {
                if (!enemy || enemy.hp <= 0 || enemy.invulnerable) continue;

                const distance = Math.hypot(
                    enemy.center.x - shadow.x,
                    enemy.center.y - shadow.y
                );

                if (distance <= shadow.radius && enemy.canSlow) {
                    enemy.applyStatusEffect({
                        type: 'shadowTagSlow',
                        slowPercent: 0.5,
                        duration: 0.1
                    }, this.pokemon);
                }
            }

            if (shadow.elapsed >= shadow.duration) {
                for (const enemy of this.main.area.enemies) {
                    if (!enemy || enemy.hp <= 0 || enemy.invulnerable) continue;

                    const distance = Math.hypot(
                        enemy.center.x - shadow.x,
                        enemy.center.y - shadow.y
                    );

                    if (distance <= shadow.radius) {
                        this.dealDirectDamage(enemy);

                        for (let j = 0; j < 2; j++) { // numero de nightmares
                            enemy.applyStatusEffect({
                                type: 'nightmare',
                                damage: null,
                                stacks: 1
                            }, this.pokemon);
                        }

                        enemy.statusEffects = enemy.statusEffects.filter(
                            e => e.type !== 'shadowTagSlow'
                        );
                    }
                }

                if (!this.main.mute[3]) playSound('area2', 'effect');
                this.shadowTagZones.splice(i, 1);
                this.shadowTagExplosions.push({
                    x: shadow.x,
                    y: shadow.y + 8,
                    elapsed: 0,
                    duration: 450,
                    radius: shadow.radius
                });
            }
        }
    }

    drawShadowTagZones() {
        const time = performance.now();

        for (const shadow of this.shadowTagZones) {
            const progress = shadow.radius / shadow.maxRadius;
            const pulse = 1 + Math.sin(time / 180) * 0.035;

            const outerX = shadow.radius * pulse;
            const outerY = shadow.radius * 0.42 * pulse;

            this.ctx.save();
            const gradient = this.ctx.createRadialGradient(
                shadow.x,
                shadow.y + 8,
                0,
                shadow.x,
                shadow.y + 8,
                outerX
            );

            gradient.addColorStop(0, `rgba(2, 1, 4, ${0.95 + progress * 0.03})`);
            gradient.addColorStop(0.45, `rgba(7, 3, 12, ${0.9 + progress * 0.05})`);
            gradient.addColorStop(0.75, `rgba(15, 6, 25, ${0.7 + progress * 0.08})`);
            gradient.addColorStop(1, 'rgba(35, 10, 50, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.ellipse(
                shadow.x,
                shadow.y + 8,
                outerX,
                outerY,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.fill();

            this.ctx.beginPath();

            const points = 32;

            for (let i = 0; i <= points; i++) {
                const angle = (i / points) * Math.PI * 2;

                const wave = Math.sin(angle * 3 + time / 260) * 0.06 + Math.sin(angle * 7 - time / 330) * 0.035;

                const radiusX = outerX * (0.93 + wave);
                const radiusY = outerY * (0.93 + wave);

                const x = shadow.x + Math.cos(angle) * radiusX;
                const y = shadow.y + 8 + Math.sin(angle) * radiusY;

                if (i === 0) this.ctx.moveTo(x, y);
                else this.ctx.lineTo(x, y);
            }

            this.ctx.closePath();
            this.ctx.strokeStyle = `rgba(45, 15, 65, ${0.3 + progress * 0.15})`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();

            // Pequeñas ondas oscuras
            for (let j = 0; j < 3; j++) {
                const ringProgress = ((shadow.elapsed / 650 + j / 3) % 1);
                const ringRadius = outerX * (0.25 + ringProgress * 0.7);
                const alpha = (1 - ringProgress) * 0.16;
                this.ctx.strokeStyle = `rgba(65, 25, 90, ${alpha})`;
                this.ctx.lineWidth = 1.2;

                this.ctx.beginPath();
                this.ctx.ellipse(
                    shadow.x,
                    shadow.y + 8,
                    ringRadius,
                    ringRadius * 0.38,
                    0,
                    0,
                    Math.PI * 2
                );
                this.ctx.stroke();
            }

            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2 + Math.sin(time / 900 + j) * 0.12;
                const length = outerX * (0.10 + Math.sin(time / 350 + j * 2) * 0.05);
                const startX = shadow.x + Math.cos(angle) * outerX * 0.55;
                const startY = shadow.y + 8 + Math.sin(angle) * outerY * 0.55;
                const endX = startX + Math.cos(angle) * length;
                const endY = startY + Math.sin(angle) * length * 0.45;

                this.ctx.strokeStyle = `rgba(15, 5, 25, ${0.35 + progress * 0.15})`;
                this.ctx.lineWidth = 2;

                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.quadraticCurveTo(
                    startX + Math.cos(angle + 0.5) * length * 0.5,
                    startY + Math.sin(angle + 0.5) * length * 0.25,
                    endX,
                    endY
                );
                this.ctx.stroke();
            }

            this.ctx.restore();
        }
    }

    drawShadowTagExplosions(simDelta) {
        const time = performance.now();

        for (let i = this.shadowTagExplosions.length - 1; i >= 0; i--) {
            const explosion = this.shadowTagExplosions[i];
            explosion.elapsed += simDelta;

            const progress = Math.min(1, explosion.elapsed / explosion.duration);
            const ease = 1 - Math.pow(1 - progress, 3);

            const radius = explosion.radius * (0.25 + ease * 0.9);
            const alpha = 1 - progress;

            this.ctx.save();

            const gradient = this.ctx.createRadialGradient(
                explosion.x,
                explosion.y,
                0,
                explosion.x,
                explosion.y,
                radius
            );

            gradient.addColorStop(0, `rgba(0, 0, 0, ${alpha * 0.95})`);
            gradient.addColorStop(0.35, `rgba(8, 3, 14, ${alpha * 0.8})`);
            gradient.addColorStop(0.7, `rgba(35, 10, 50, ${alpha * 0.35})`);
            gradient.addColorStop(1, 'rgba(60, 15, 80, 0)');

            this.ctx.fillStyle = gradient;

            this.ctx.beginPath();
            this.ctx.ellipse(
                explosion.x,
                explosion.y,
                radius,
                radius * 0.42,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.fill();

            this.ctx.strokeStyle = `rgba(70, 25, 95, ${alpha * 0.45})`;
            this.ctx.lineWidth = 2.5 * (1 - progress * 0.5);

            this.ctx.beginPath();
            this.ctx.ellipse(
                explosion.x,
                explosion.y,
                radius * 0.9,
                radius * 0.36,
                0,
                0,
                Math.PI * 2
            );
            this.ctx.stroke();

            for (let j = 0; j < 8; j++) {
                const angle = (j / 8) * Math.PI * 2 + j * 0.35;
                const distance = radius * (0.35 + progress * 0.7);

                const startX = explosion.x + Math.cos(angle) * radius * 0.15;
                const startY = explosion.y + Math.sin(angle) * radius * 0.06;

                const endX = explosion.x + Math.cos(angle) * distance;
                const endY = explosion.y + Math.sin(angle) * distance * 0.35;

                this.ctx.strokeStyle = `rgba(12, 4, 20, ${alpha * 0.7})`;
                this.ctx.lineWidth = 2 + Math.sin(j) * 0.5;

                this.ctx.beginPath();
                this.ctx.moveTo(startX, startY);
                this.ctx.quadraticCurveTo(
                    explosion.x + Math.cos(angle + 0.25) * distance * 0.55,
                    explosion.y + Math.sin(angle + 0.25) * distance * 0.2,
                    endX,
                    endY
                );
                this.ctx.stroke();
            }

            this.ctx.restore();

            if (explosion.elapsed >= explosion.duration) {
                this.shadowTagExplosions.splice(i, 1);
            }
        }
    }

    isPointInDirectionalArea(x, y, angle, radius, halfAngle) {
        const hitRadius = radius + 10;

        const dx = x - this.center.x;
        const dy = y - this.center.y;

        const distance = Math.hypot(dx, dy);

        if (distance > hitRadius) return false;

        const pointAngle = Math.atan2(dy, dx);

        let diff = pointAngle - angle;

        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        return Math.abs(diff) <= halfAngle;
    }

    getDirectionalAreaConfig(abilityId) {
        const configs = {
            icyWind: {
                duration: 520,
                hitboxDuration: 500,

                halfAngle: Math.PI / 4,
                radius: this.range,

                particleCount: 18,
                particleType: 'circle',

                color: {
                    start: 'rgba(20, 170, 255, 0.78)',
                    middle: 'rgba(5, 130, 245, 0.68)',
                    end: 'rgba(0, 95, 220, 0.55)'
                },

                borderColor: 'rgba(40, 160, 255, 0.95)',
                borderWidth: 2.5,

                particleColor: 'rgba(90, 190, 255, 0.8)',
                particleMinSize: 1,
                particleMaxSize: 3.5,

                blendMode: 'lighter'
            },

            dazzlingGleam: {
                duration: 520,
                hitboxDuration: 500,

                halfAngle: Math.PI / 4,
                radius: this.range,

                particleCount: 24,
                particleType: 'sparkle',

                color: {
                    start: 'rgba(255, 210, 255, 0.85)',
                    middle: 'rgba(255, 130, 225, 0.68)',
                    end: 'rgba(225, 70, 190, 0.35)'
                },

                borderColor: 'rgba(255, 180, 245, 0.95)',
                borderWidth: 2.5,

                particleColor: 'rgba(255, 225, 250, 0.9)',
                particleMinSize: 1,
                particleMaxSize: 3,

                blendMode: 'lighter'
            }
        };

        return configs[abilityId];
    }

    directionalAreaAttack(target, abilityId) {
        const config = this.getDirectionalAreaConfig(abilityId);

        if (!config || !target) return;

        const baseAngle = Math.atan2(
            target.center.y - this.center.y,
            target.center.x - this.center.x
        );

        const particles = [];

        for (let i = 0; i < config.particleCount; i++) {
            particles.push({
                distance: Math.random(),
                offset: (Math.random() * 2 - 1) * 0.85,
                size:
                    config.particleMinSize +
                    Math.random() *
                    (config.particleMaxSize - config.particleMinSize),
                speed: 0.7 + Math.random() * 0.7,
                wave: Math.random() * Math.PI * 2,
                opacity: 0.35 + Math.random() * 0.4,
                rotation: Math.random() * Math.PI * 2
            });
        }

        this.directionalAreaEffects.push({
            abilityId,
            config,

            baseAngle,
            radius: config.radius,

            start: Date.now(),

            hitEnemies: new Set(),

            particles
        });
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

        this.secretSwordEffects.push({
            baseAngle,
            direction: this.secretSwordSide,
            start: Date.now(),
            duration: 300,
            ability: this.ability?.id
        });

        this.secretSwordSide *= -1;

        const dirX = Math.cos(baseAngle);
        const dirY = Math.sin(baseAngle);

        const bladeWidth = 50;

        let slashCritical = this.criticalCalculator();

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

            this.dealDirectDamage(enemy, 'physical', slashCritical);

            if (slashCritical === null && typeof hitCritical === 'boolean') slashCritical = hitCritical;
               
        }

        if (this.ability?.id === 'ceaselessEdge' &&  slashCritical === true) {
            this.ceaselessEdgeAttack = true;
        }
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

    jumpToStickyWeb(pos) {
        this.stickyWebTransition = {
            startX: this.center.x,
            startY: this.center.y,
            targetX: pos.x,
            targetY: pos.y,
            elapsed: 0,
            duration: 300
        };

        if (!this.main.mute[1]) playSound('teleport', 'effect');
    }

    nudgeToClick(clickX, clickY) {
        const tileSize = this.tile?.size ?? 24;
        const tileCenterOffset = tileSize / 2;
        const passengerOffset = this.isPassenger ? (this.passengerYOffset ?? 0) : 0;
        const centerX = this.center?.x ?? this.position.x + tileCenterOffset;
        const centerY = this.center?.y ?? this.position.y + tileCenterOffset + passengerOffset;

        const homeX = this.tile?.center?.x ?? this.tile.position.x + tileCenterOffset;
        const homeY = (this.tile?.center?.y ?? this.tile.position.y + tileCenterOffset) + passengerOffset;

        const dx = clickX - homeX;
        const dy = clickY - homeY;
        const dist = Math.hypot(dx, dy);

        if (dist === 0) return;

        const maxOffset = 40;
        const step = Math.min(dist, maxOffset);

        const nx = dx / dist;
        const ny = dy / dist;

        const targetX = homeX + nx * step;
        const targetY = homeY + ny * step;

        this.nudgeTransition = {
            startX: centerX,
            startY: centerY,
            targetX,
            targetY,
            elapsed: 0,
            duration: 200
        };

        if (!this.main.mute[1]) playSound('equip', 'ui');
    }

    getSkatesOffset() {
        const tileSize = this.tile?.size ?? 24;
        const tileCenterOffset = tileSize / 2;
        const passengerOffset = this.isPassenger ? (this.passengerYOffset ?? 0) : 0;
        const homeX = this.tile?.center?.x ?? this.tile.position.x + tileCenterOffset;
        const homeY = (this.tile?.center?.y ?? this.tile.position.y + tileCenterOffset) + passengerOffset;
        const currentX = this.position.x + tileCenterOffset;
        const currentY = this.position.y + tileCenterOffset + passengerOffset;

        return { x: currentX - homeX, y: currentY - homeY };
    }

    restoreSkatesOffset(offset) {
        if (!this.tile || !Number.isFinite(offset?.x) || !Number.isFinite(offset?.y)) return;

        const tileSize = this.tile.size ?? 24;
        const tileCenterOffset = tileSize / 2;
        const passengerOffset = this.isPassenger ? (this.passengerYOffset ?? 0) : 0;
        const homeX = this.tile.center?.x ?? this.tile.position.x + tileCenterOffset;
        const homeY = (this.tile.center?.y ?? this.tile.position.y + tileCenterOffset) + passengerOffset;

        this.position.x = homeX - tileCenterOffset;
        this.position.y = homeY - tileCenterOffset - passengerOffset;
        this.center = { x: homeX, y: homeY };
        this.x = this.position.x;
        this.y = this.position.y;

        if (offset.x === 0 && offset.y === 0) return;

        this.nudgeTransition = {
            startX: homeX,
            startY: homeY,
            targetX: homeX + offset.x,
            targetY: homeY + offset.y,
            elapsed: 0,
            duration: 200
        };
    }

    rerollBombardZone() {
        const zoneRadius = this.pokemon?.bombardmentArea / 2;
        let x, y;

        if (this.rangeType === 'cross') {
            const dist = (Math.random() * 2 - 1) * this.range; 

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

        const isRockThrow = this.ability?.id === 'rockThrow';

        this.bombardZone = {
            x,
            y,
            radius: zoneRadius,
            ...(isRockThrow ? {
                width: this.pokemon.bombardmentArea * 5,
                height: this.pokemon.bombardmentArea
            } : {})
        };

        this.bombardShells = [];
        this.bombardCooldown = 0;
    }

    getEffectOpacity(category) {
        const value = Number(
            this.main?.effectOpacity?.[category] ?? 100
        );

        return Math.max(0, Math.min(100, value)) / 100;
    }

	refreshOrbitalProjectiles() {
        this.projectiles = this.projectiles.filter(p => !p?.orbit);
        this.spawnOrbitales();
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

        this.hitScanTimer = 0;

        this.width = options.width ?? 10;
        this.duration = options.duration ?? 260;
        this.elapsed = 0;
        this.alpha = 1;
        this.hitCooldown = options.hitCooldown ?? 300;
        this.maxExtend = options.extend ?? 2000;
        this.active = true;
        this.simulatedTime = 0;

        this.perEnemyLastHit = new WeakMap();
        this.hitEnemiesSet = new Set();
        this._steelBeamLogged = false;
        this.pairKey = options.pairKey ?? null;
        this._lockedToLastPos = false;

        this.detachDistance = options.detachDistance ?? null; 
        this.onlyAttachedEnemy = options.onlyAttachedEnemy ?? false; 

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

        // this._recomputeDirection();
        // if (!this.active) return;

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
                    this.hitEnemiesSet.add(e);
                }
            }

            if (this.tower?.ability?.id === 'steelBeam' && !this._steelBeamLogged && this.hitEnemiesSet.size > 5) {
                this._steelBeamLogged = true;
                if (this.main.player.health[this.main.area.routeNumber] > 1) {
                    this.main.player.getDamaged(1);
                    this.main.area.hitsReceived++;
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

        this._recomputeDirection();

        if (!this.active) return;

        this.hitScanTimer -= delta;

        if (this.hitScanTimer <= 0) {
            this.applyHits();
            this.hitScanTimer = 50;
        }

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
        ctx.globalAlpha *= this.tower?.getEffectOpacity('beams') ?? 1;
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

        if (['solarBeam', 'zapCannon', 'hyperBeam', 'meteorBeam', 'iceBeam', 'steelBeam', 'machBolt', 'steamEruption', 'soulHeartReactor'].includes(this.tower.ability.id) || this.tower?.pokemon?.item?.id === 'revysBook') {
            const currentWidth = this.width * (0.5 + this.alpha * 0.5);

            //ctx.shadowBlur = 5 * this.alpha;
            ctx.shadowColor = `rgba(${r},${g},${b}, ${0.9 * this.alpha})`;
            ctx.strokeStyle = `rgba(${r},${g},${b}, ${0.35 * this.alpha})`;
            ctx.lineWidth = currentWidth * 2.5;
            this.drawPath(ctx);

            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(${r},${g},${b}, ${0.95 * this.alpha})`;
            ctx.lineWidth = currentWidth;
            this.drawPath(ctx);

            ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * this.alpha})`;
            ctx.lineWidth = currentWidth * 0.4;
            this.drawPath(ctx);

        } else if (this.tower.ability.id === 'psybeam') {
            const drawBeamPath = () => {
                ctx.beginPath();
                ctx.moveTo(this.from.x, this.from.y);
                ctx.lineTo(this.extendedTo.x, this.extendedTo.y);
                ctx.stroke();
            };

            const currentWidth = this.width * (0.6 + this.alpha * 0.4);

            ctx.globalCompositeOperation = 'lighter';

            ctx.shadowColor = `rgba(230, 100, 255, ${0.8 * this.alpha})`;
            ctx.strokeStyle = `rgba(200, 80, 255, ${0.35 * this.alpha})`;
            ctx.lineWidth = currentWidth * 2.2;
            drawBeamPath();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(230, 120, 255, ${0.9 * this.alpha})`;
            ctx.lineWidth = currentWidth;
            drawBeamPath();

            ctx.strokeStyle = `rgba(255, 220, 255, ${0.9 * this.alpha})`;
            ctx.lineWidth = currentWidth * 0.35;
            drawBeamPath();
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
                
                for (let i = 0; i <= dist; i += 15) {
                  
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
        } else if (this.tower.ability.id === 'moongeistBeam') {
            const t = Date.now() / 100;

            const dx = this.extendedTo.x - this.from.x;
            const dy = this.extendedTo.y - this.from.y;
            const dist = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);

            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const getPoint = (distance, offset = 0) => {
                return {
                    x: this.from.x + Math.cos(angle) * distance
                        - Math.sin(angle) * offset,
                    y: this.from.y + Math.sin(angle) * distance
                        + Math.cos(angle) * offset
                };
            };

            // Glow exterior
            ctx.beginPath();
            ctx.strokeStyle = `rgba(100, 30, 180, ${0.35 * this.alpha})`;
            ctx.lineWidth = this.width * 2.2 * this.alpha;
            this.drawPath(ctx);

            // Main irregular beam
            ctx.beginPath();
            ctx.strokeStyle = `rgba(150, 60, 220, ${0.75 * this.alpha})`;
            ctx.lineWidth = this.width * 0.9 * this.alpha;

            for (let i = 0; i <= dist; i += 12) {
                const wave =
                    Math.sin(i * 0.09 - t * 1.5) * 5 +
                    Math.sin(i * 0.035 + t * 0.8) * 4;

                const p = getPoint(i, wave);

                i === 0
                    ? ctx.moveTo(p.x, p.y)
                    : ctx.lineTo(p.x, p.y);
            }

            ctx.stroke();

            // Bright central beam
            ctx.globalCompositeOperation = 'lighter';

            ctx.beginPath();
            ctx.strokeStyle = `rgba(235, 190, 255, ${0.8 * this.alpha})`;
            ctx.lineWidth = Math.max(2, this.width * 0.3) * this.alpha;

            for (let i = 0; i <= dist; i += 12) {
                const wave = Math.sin(i * 0.12 - t * 2) * 2.5;
                const p = getPoint(i, wave);

                i === 0
                    ? ctx.moveTo(p.x, p.y)
                    : ctx.lineTo(p.x, p.y);
            }

            ctx.stroke();

            // Floating particles
            if (this.tower.main.particles) for (let i = 0; i < dist; i += 48) {
                const progress = (i + t * 18) % (dist + 25);

                const offset =
                    Math.sin(t * 0.05 + i) * 12;

                const p = getPoint(progress, offset);

                const size =
                    (1.5 + Math.sin(t * 0.1 + i) * 1) * this.alpha;

                ctx.beginPath();
                ctx.fillStyle = `rgba(245, 220, 255, ${0.7 * this.alpha})`;
                ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                ctx.fill();
            }

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
        } else if (this.tower.ability.id === 'signalBeam') {
            const drawBeamPath = () => {
                ctx.beginPath();
                ctx.moveTo(this.from.x, this.from.y);
                ctx.lineTo(this.to.x, this.to.y);
                ctx.stroke();
            };

            const t = Date.now() / 300;
            const hue = (t * 40) % 360;
            const currentWidth = this.width * (0.6 + this.alpha * 0.4);

            ctx.globalCompositeOperation = 'lighter';

            //ctx.shadowBlur = 3 * this.alpha;
            ctx.shadowColor = `hsla(${hue}, 100%, 65%, ${0.8 * this.alpha})`;
            ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.3 * this.alpha})`;
            ctx.lineWidth = currentWidth * 2.2;
            drawBeamPath();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = `hsla(${hue}, 100%, 55%, ${0.9 * this.alpha})`;
            ctx.lineWidth = currentWidth;
            drawBeamPath();

            ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * this.alpha})`;
            ctx.lineWidth = currentWidth * 0.35;
            drawBeamPath();
        } else if (this.tower.ability.id === 'cryogenicCannon') {
            const drawBeamPath = () => {
                ctx.beginPath();
                ctx.moveTo(this.from.x, this.from.y);
                ctx.lineTo(this.to.x, this.to.y);
                ctx.stroke();
            };

            const currentWidth = this.width * (0.6 + this.alpha * 0.4);

            ctx.globalCompositeOperation = 'lighter';

            //ctx.shadowBlur = 3 * this.alpha;
            ctx.shadowColor = `rgba(80, 190, 255, ${0.9 * this.alpha})`;
            ctx.strokeStyle = `rgba(70, 170, 255, ${0.3 * this.alpha})`;
            ctx.lineWidth = currentWidth * 2.2;
            drawBeamPath();

            ctx.shadowBlur = 0;
            ctx.strokeStyle = `rgba(40, 140, 255, ${0.9 * this.alpha})`;
            ctx.lineWidth = currentWidth;
            drawBeamPath();

            ctx.strokeStyle = `rgba(220, 250, 255, ${0.9 * this.alpha})`;
            ctx.lineWidth = currentWidth * 0.35;
            drawBeamPath();
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
        const beamOpacity = this.fromTower?.getEffectOpacity('beams') ?? 1;

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

        //ctx.shadowBlur = 3; 
        ctx.shadowColor = shift > 0.5 ? `rgba(${colorMinun.r},${colorMinun.g},${colorMinun.b}, 0.4)` : `rgba(${colorPlusle.r},${colorPlusle.g},${colorPlusle.b}, 0.4)`;
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.width * 1.5;
        ctx.globalAlpha = 0.3 * beamOpacity;
        this.drawZappedLine(ctx, this.from, this.to, 3, now);

        ctx.shadowBlur = 0; 
        ctx.globalAlpha = 0.8 * beamOpacity;
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
        this.slow = options.slow ?? false;

        this.slowFactor = options.slowFactor ?? 0.5;

        this.magma = options.magma ?? false;
        this.burn = options.burn ?? false;
        this.innerRadius = options.innerRadius ?? 0;
        this.smoke = options.smoke ?? false;

        this.active = true;
    }

    _inRange(enemy) {
        const dx = enemy.center.x - this.x;
        const dy = enemy.center.y - this.y;
        const dist = Math.hypot(dx, dy);
        return dist >= this.innerRadius && dist <= this.radius;
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

        this.tickAccum %= this.tickRate;

        const enemies = this.tower.main.area.enemies;
        for (const e of enemies) {
            if (!e || e.hp <= 0 || e.invulnerable) continue;
            if (e.invisible && !(this.tower.revealInvisible || this.tower.targetMode === 'invisible')) continue;
            if (!this._inRange(e)) continue;

            if (!this.smoke) this.tower.dealDirectDamage(e);

            if (this.burn) {
                if (e.canBurn && !e.isBurned) {
                    if (this.pokemon?.item?.id == 'magmaStone') e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.pokemon);
                    else if (this.pokemon?.item?.id == 'falmeOrb') e.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.pokemon);
                    else e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.pokemon);
                }
            }
        }
    }

    draw() {
        if (!this.active || !this.ctx) return;

        const lifeRatio = Math.max(0, this.remaining / this.totalDuration);
        const elapsedRatio = 1 - lifeRatio;

        const fadeIn = Math.min(1, elapsedRatio / 0.15);
        const fadeOut = lifeRatio > 0.1 ? 1.0 : lifeRatio / 0.1;
        const alpha = Math.min(fadeIn, fadeOut);

        const now = Date.now();

        this.ctx.save();
        this.ctx.translate(this.x, this.y);

        if (!this.smoke) {
            const bounceScale = 1 + Math.sin(now / 800) * 0.01;
            this.ctx.scale(bounceScale, bounceScale);
            this.ctx.rotate((now / 6000) % (Math.PI * 2));
        }

        if (this.slow && this.smoke) {
            this._drawSmoke(alpha, now);
        } else if (this.slow) {
            this._drawWeb(alpha, now);
        } else if (this.magma) {
            this._drawMagmaSpikes(alpha, now);
        } else {
            this._drawSpikes(alpha, now);
        }

        this.ctx.restore();
    }

    _drawSpikes(alpha, now) {
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
    }

    _drawSmoke(alpha, now) {
        const life = this.totalDuration - this.remaining;
        const lifeProgress = Math.min(1, life / this.totalDuration);

        const currentRadius =
            this.radius * (0.35 + lifeProgress * 0.65);

        const time = now * 0.001;

        const seed =
            Math.abs(
                Math.sin(
                    this.x * 12.9898 +
                    this.y * 78.233
                ) * 43758.5453
            ) % 1000;

        const puffs = 6;

        const globalFadeIn = Math.min(1, lifeProgress * 6);

        for (let i = 0; i < puffs; i++) {
            const s = seed + i * 17.31;

            const angle =
                (i / puffs) * Math.PI * 2 +
                Math.sin(s) * 0.5;

            const baseDistance =
                currentRadius *
                (0.10 + (Math.sin(s * 4.1) * 0.5 + 0.5) * 0.35);

            const phase =
                time * (0.7 + (Math.sin(s * 2.7) * 0.5 + 0.5) * 0.5) +
                s;

            const rise =
                (Math.sin(phase) * 0.5 + 0.5) *
                currentRadius *
                0.65;

            const driftX =
                Math.sin(time * 1.1 + s) *
                currentRadius *
                0.10;

            const driftX2 =
                Math.sin(time * 0.47 + s * 2) *
                currentRadius *
                0.06;

            const driftY =
                Math.cos(time * 0.7 + s) *
                currentRadius *
                0.035;

            const px =
                Math.cos(angle) * baseDistance +
                driftX +
                driftX2;

            const py =
                Math.sin(angle) * baseDistance -
                rise +
                driftY;

            const sizeFactor =
                0.55 +
                (Math.sin(s * 5.3) * 0.5 + 0.5) * 0.35;

            const puffSize =
                currentRadius *
                (0.28 + sizeFactor * 0.18);

            const pulse =
                0.92 +
                Math.sin(time * 1.4 + s) * 0.08;

            const localFade =
                0.75 +
                Math.sin(time * 0.8 + s * 1.7) * 0.15;

            this.ctx.globalAlpha =
                alpha *
                globalFadeIn *
                localFade;

            this.ctx.drawImage(
                smokeTexture,
                px - puffSize * pulse,
                py - puffSize * pulse,
                puffSize * 2 * pulse,
                puffSize * 2 * pulse
            );
        }

        this.ctx.globalAlpha =
            alpha *
            globalFadeIn *
            0.38;

        const coreSize =
            currentRadius * 1.15;

        this.ctx.drawImage(
            smokeTexture,
            -coreSize,
            -coreSize,
            coreSize * 2,
            coreSize * 2
        );

        const pulse =
            0.85 +
            Math.sin(time * 2) * 0.08;

        this.ctx.globalAlpha =
            alpha *
            0.45 *
            pulse;

        this.ctx.strokeStyle = 'rgba(170, 170, 178, 1)';
        this.ctx.lineWidth = 2;

        this.ctx.beginPath();
        this.ctx.arc(
            0,
            0,
            currentRadius,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();

        this.ctx.globalAlpha =
            alpha * 0.18;

        this.ctx.lineWidth = 4;

        this.ctx.beginPath();
        this.ctx.arc(
            0,
            0,
            currentRadius + 2,
            0,
            Math.PI * 2
        );
        this.ctx.stroke();

        this.ctx.globalAlpha = 1;
    }

    _drawMagmaSpikes(alpha, now) {
        const outerR = this.radius;
        const innerR = this.innerRadius;
        const spikeHeight = 9;
        const innerSpikeHeight = spikeHeight * 0.7;
        const pulse = 0.5 + 0.5 * Math.sin(now / 500);

        this.ctx.save();
        this.ctx.globalAlpha *= this.tower?.getEffectOpacity('special') ?? 1;
        this.ctx.globalCompositeOperation = 'lighter';

        const numTriangles = 20;
        const numInnerTriangles = 14;

        const outerPath = new Path2D();
        for (let i = 0; i < numTriangles; i++) {
            const angle = (i * Math.PI * 2) / numTriangles;
            const nextAngle = ((i + 1) * Math.PI * 2) / numTriangles;
            const midAngle = (angle + nextAngle) / 2;
            const tx = Math.cos(midAngle) * (outerR + spikeHeight);
            const ty = Math.sin(midAngle) * (outerR + spikeHeight);
            const bx = Math.cos(nextAngle) * outerR;
            const by = Math.sin(nextAngle) * outerR;

            if (i === 0) outerPath.moveTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR);
            outerPath.lineTo(tx, ty);
            outerPath.lineTo(bx, by);
        }
        outerPath.closePath();

        const innerPath = new Path2D();
        if (innerR > 0) {
            for (let i = 0; i < numInnerTriangles; i++) {
                const angle = (i * Math.PI * 2) / numInnerTriangles;
                const nextAngle = ((i + 1) * Math.PI * 2) / numInnerTriangles;
                const midAngle = (angle + nextAngle) / 2;
                const tx = Math.cos(midAngle) * (innerR - innerSpikeHeight);
                const ty = Math.sin(midAngle) * (innerR - innerSpikeHeight);
                const bx = Math.cos(nextAngle) * innerR;
                const by = Math.sin(nextAngle) * innerR;

                if (i === 0) innerPath.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR);
                innerPath.lineTo(tx, ty);
                innerPath.lineTo(bx, by);
            }
            innerPath.closePath();
        }

        const donutPath = new Path2D();
        donutPath.addPath(outerPath);
        if (innerR > 0) donutPath.addPath(innerPath);

        const bgGrad = this.ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR + spikeHeight);
        bgGrad.addColorStop(0, `rgba(255, 210, 80, ${alpha * (0.08 + pulse * 0.01)})`);
        bgGrad.addColorStop(0.5, `rgba(255, 120, 25, ${alpha * 0.2})`);
        bgGrad.addColorStop(1, `rgba(170, 30, 10, ${alpha * 0.3})`);
        this.ctx.fillStyle = bgGrad;
        this.ctx.fill(donutPath, 'evenodd');

        this.ctx.strokeStyle = `rgba(255, 150, 40, ${alpha})`;
        this.ctx.lineWidth = 2.5;
        this.ctx.stroke(outerPath);

        if (innerR > 0) {
            this.ctx.strokeStyle = `rgba(255, ${170 + Math.floor(pulse * 20)}, 60, ${alpha * (0.8 + pulse * 0.15)})`;
            this.ctx.lineWidth = 2.5;
            this.ctx.stroke(innerPath);
        }

        const numEmbers = 14;
        const bandWidth = Math.max(1, outerR - innerR);
        if (this.tower?.main?.particles) for (let i = 0; i < numEmbers; i++) {
            const seed = i * 12.9898;
            const rand = (n) => {
                const x = Math.sin(n) * 43758.5453;
                return x - Math.floor(x);
            };

            const emberAngle = rand(seed) * Math.PI * 2;
            const cycle = 1200 + rand(seed + 1) * 600;
            const t = ((now + rand(seed + 2) * cycle) % cycle) / cycle;

            const emberRadius = innerR + bandWidth * (0.15 + t * 0.8);
            const emberAlpha = Math.sin(t * Math.PI) * alpha;

            const ex = Math.cos(emberAngle) * emberRadius;
            const ey = Math.sin(emberAngle) * emberRadius;
            const size = 1.5 + rand(seed + 3) * 1.5;

            this.ctx.fillStyle = `rgba(255, ${190 + Math.floor(rand(seed + 4) * 60)}, 90, ${emberAlpha})`;
            this.ctx.beginPath();
            this.ctx.arc(ex, ey, size, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    _drawWeb(alpha, now) {
        const numRadials = 10;
        const numRings = 4;

        const bgGrad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        bgGrad.addColorStop(0, `rgba(220, 225, 230, 0)`);
        bgGrad.addColorStop(0.8, `rgba(200, 205, 215, ${alpha * 0.12})`);
        bgGrad.addColorStop(1, `rgba(180, 185, 195, ${alpha * 0.2})`);

        this.ctx.beginPath();
        this.ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = bgGrad;
        this.ctx.fill();

        const random = (seed) => {
            const x = Math.sin(seed * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };

        const radialAngles = [];
        const anchorLengths = [];

        for (let i = 0; i < numRadials; i++) {
            const angle = (i * Math.PI * 2) / numRadials;

            // Pequeña variación en el ángulo
            const angleJitter = (random(i + 10) - 0.5) * 0.06;
            radialAngles.push(angle + angleJitter);

            // Pequeña variación en la longitud
            const lengthJitter = (random(i + 20) - 0.5) * 0.25;
            anchorLengths.push(this.radius * (1 + lengthJitter));
        }

        // Radios
        for (let i = 0; i < numRadials; i++) {
            const angle = radialAngles[i];
            const len = anchorLengths[i];

            const shimmer = 0.6 + 0.4 * Math.sin(angle * 3 + now / 500);

            this.ctx.strokeStyle = `rgba(230, 235, 240, ${alpha * shimmer})`;
            this.ctx.lineWidth = 1.2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, 0);

            // Pequeña curvatura aleatoria
            const bend = (random(i + 30) - 0.5) * this.radius * 0.08;
            const cx = Math.cos(angle) * len * 0.5 - Math.sin(angle) * bend;
            const cy = Math.sin(angle) * len * 0.5 + Math.cos(angle) * bend;

            this.ctx.quadraticCurveTo(
                cx,
                cy,
                Math.cos(angle) * len,
                Math.sin(angle) * len
            );

            this.ctx.stroke();
        }

        // Anillos
        for (let r = 1; r <= numRings; r++) {
            const ringAlpha = alpha * (0.35 + 0.15 * Math.sin(now / 600 + r));
            const isOuter = r === numRings;

            this.ctx.strokeStyle = isOuter
                ? `rgba(200, 205, 215, ${alpha * 0.5})`
                : `rgba(210, 215, 225, ${ringAlpha})`;

            this.ctx.lineWidth = isOuter ? 1.5 : 1;
            this.ctx.beginPath();

            for (let i = 0; i <= numRadials; i++) {
                const idx = i % numRadials;
                const angle = radialAngles[idx];

                // Cada punto del anillo tiene una distancia ligeramente diferente
                const jitter = 1 + (random(r * 100 + idx) - 0.5) * 0.15;
                const ringRadius = (anchorLengths[idx] * r / numRings) * jitter;

                const x = Math.cos(angle) * ringRadius;
                const y = Math.sin(angle) * ringRadius;

                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    const prevIdx = (i - 1) % numRadials;
                    const prevAngle = radialAngles[prevIdx];
                    const prevRadius =
                        (anchorLengths[prevIdx] * r / numRings) *
                        (1 + (random(r * 100 + prevIdx) - 0.5) * 0.15);

                    const px = Math.cos(prevAngle) * prevRadius;
                    const py = Math.sin(prevAngle) * prevRadius;

                    const midAngle = (prevAngle + angle) / 2;
                    const midRadius = ((prevRadius + ringRadius) / 2) *
                        (1 + (random(r * 200 + idx) - 0.5) * 0.12);

                    const cx = Math.cos(midAngle) * midRadius;
                    const cy = Math.sin(midAngle) * midRadius;

                    this.ctx.quadraticCurveTo(cx, cy, x, y);
                }
            }

            this.ctx.stroke();
        }
    }
}

function _randomRevysSprite() {
    return _REVYS_SPRITES[Math.floor(Math.random() * _REVYS_SPRITES.length)].sprite;
}

const smokeTexture = (() => {
    const size = 96;

    const canvas = typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(size, size)
        : document.createElement('canvas');

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');

    const center = size / 2;

    // Una única textura de humo reutilizable.
    const gradient = ctx.createRadialGradient(
        center,
        center,
        2,
        center,
        center,
        size * 0.48
    );

    gradient.addColorStop(0, 'rgba(145, 145, 150, 0.75)');
    gradient.addColorStop(0.35, 'rgba(120, 120, 126, 0.58)');
    gradient.addColorStop(0.7, 'rgba(90, 90, 98, 0.30)');
    gradient.addColorStop(1, 'rgba(60, 60, 68, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(center, center, size * 0.46, 0, Math.PI * 2);
    ctx.fill();

    // Pequeñas deformaciones para que no sea un círculo perfecto.
    ctx.globalCompositeOperation = 'source-over';

    const blobs = [
        [-18, -8, 20],
        [14, -12, 18],
        [20, 10, 21],
        [-12, 17, 18],
        [0, 0, 24]
    ];

    for (const [x, y, r] of blobs) {
        ctx.fillStyle = 'rgba(115, 115, 122, 0.10)';
        ctx.beginPath();
        ctx.arc(center + x, center + y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    return canvas;
})();

const streamPalettes = {
    flamethrower: {
        outer: [
            [255, 245, 190],
            [255, 210, 80],
            [255, 125, 20],
            [255, 65, 0],
            [255, 30, 0]
        ],
        core: [
            [255, 255, 255],
            [255, 245, 170],
            [255, 190, 50],
            [255, 90, 0]
        ],
        tongue: [
            [255, 245, 150],
            [255, 145, 30]
        ],
        edge: [255, 100, 20],
        heat: [
            [255, 255, 255],
            [255, 235, 130],
            [255, 120, 0]
        ],
        ember: [255, 210, 90]
    },

    berserk: {
        outer: [
            [225, 250, 255],
            [120, 220, 255],
            [50, 160, 255],
            [30, 95, 230],
            [20, 55, 170]
        ],
        core: [
            [255, 255, 255],
            [210, 245, 255],
            [100, 195, 255],
            [40, 110, 235]
        ],
        tongue: [
            [210, 245, 255],
            [70, 175, 255]
        ],
        edge: [40, 125, 255],
        heat: [
            [255, 255, 255],
            [190, 235, 255],
            [50, 145, 255]
        ],
        ember: [100, 200, 255]
    },

    berserkMega: {
        outer: [
            [135, 150, 153],
            [72, 132, 153],
            [30, 96, 153],
            [18, 57, 138],
            [12, 33, 102]
        ],
        core: [
            [153, 153, 153],
            [126, 147, 153],
            [60, 117, 153],
            [24, 66, 141]
        ],
        tongue: [
            [126, 147, 153],
            [42, 105, 153]
        ],
        edge: [24, 75, 153],
        heat: [
            [153, 153, 153],
            [114, 141, 153],
            [30, 87, 153]
        ],
        ember: [60, 120, 153]
    },
};
