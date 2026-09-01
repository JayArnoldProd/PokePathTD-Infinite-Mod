import { Sprite } from '../../utils/Sprite.js';
import { SpikeZone } from './Tower.js';
import { playSound } from '../../file/audio.js';

export class Projectile extends Sprite {
    constructor(x, y, enemy, ctx, projectile, tower, isRicochet = false) {
        super(x, y, ctx, projectile.sprite.image, projectile.sprite.frames);

        const rawSpeed = projectile.speed ?? 5;
        let baseSpeed = rawSpeed <= 30 ? rawSpeed * 60 : rawSpeed;

        if (tower?.speed && tower.speed < 500) {
            const t = (500 - tower.speed) / 450;
            baseSpeed *= (1 + t);
        }

        this.speed = baseSpeed;
        this.velocity = { x: 0, y: 0 };
        this.enemy = enemy;
        this.ctx = ctx;
        this.tower = tower;
        this.isRicochet = isRicochet;

        this.power = projectile.power ?? 1;
        this.critical = tower?.critical ?? 0;
        this.ricochetsLeft = projectile.ricochetsLeft ?? 0;

        this.markedForDeletion = false;

        this.lifeTime = 5000;
        this.age = 0;

        this.pulse = {
            active: false,
            x: 0,
            y: 0,
            radius: 0,
            alpha: 0,
            maxRadius: 0,
            speed: 0,
            color: '#ffffff'
        };
        this.impacting = false;

        this.orbit = projectile.orbit ?? null;
        this.simulatedTime = 0;

        // Spiral movement for revysBook
        this.spiral = null;
        if (tower?.pokemon?.item?.id === 'revysBook' && enemy) {
            this.spiral = {
                originX: x + (this.width ? this.width / 2 : 0),
                originY: y + (this.height ? this.height / 2 : 0),
                angle: Math.random() * Math.PI * 2, // random start angle for variety
                angularSpeed: (Math.random() < 0.5 ? 1 : -1) * (Math.PI * 6), // ~3 full spins
                radius: 10 + Math.random() * 5,    // spiral amplitude (px)
                progress: 0
            };
        }

        if (this.orbit) {
            this.angle = this.orbit.startAngle ?? 0;
            this.orbitRadius = this.orbit.radius ?? 28;
            this.angularSpeed = this.orbit.angularSpeed ?? (Math.PI * 2);
            this.orbitDuration = this.orbit.duration ?? Infinity;
            this.orbitHitCooldown = this.orbit.hitCooldown ?? 300;
            this.perEnemyLastHit = new WeakMap();

            this.lifeTime = Infinity;
            this.enemy = null;
        }

        this.forcedSplash = (this.tower?.pokemon?.item?.id === 'revysBook' && Math.random() < 0.15) ? true : false;
        if (this.tower?.pokemon?.item?.id === 'revysBook' && Math.random() < 0.15) this.ricochetsLeft += 2;
    }

    update(deltaTime = 1000 / 60, shouldDraw = true) {
        const simDelta = deltaTime;
        const frameFactor = simDelta / (1000 / 60);
        const secs = simDelta / 1000;

        if (this.orbit) {
            this.age += simDelta;
            this.simulatedTime += simDelta;

            if (!this.tower || !this.tower.center) {
                this.markedForDeletion = true;
                return;
            }

            if (this.tower?.pokemon?.item?.id == 'inverter') this.angularSpeed = -1 * Math.abs(this.angularSpeed);
            else this.angularSpeed = Math.abs(this.angularSpeed);

            const arcPerFrame = Math.abs(this.angularSpeed) * secs * this.orbitRadius;
            const MAX_ARC_PER_STEP = 4;
            const steps = Math.max(1, Math.ceil(arcPerFrame / MAX_ARC_PER_STEP));
            const subSecs = secs / steps;

            const cx = this.tower.center.x;
            const cy = this.tower.center.y;
            const hitRadius = Math.max(6, (this.width || 6) / 2) + 2;
            const enemies = this.tower.main.area.enemies;

            for (let s = 0; s < steps; s++) {
                this.angle += this.angularSpeed * subSecs;

                this.position.x = cx + Math.cos(this.angle) * this.orbitRadius - (this.width ? this.width / 2 : 0);
                this.position.y = cy + Math.sin(this.angle) * this.orbitRadius - (this.height ? this.height / 2 : 0);
                this.center = {
                    x: this.position.x + (this.width ? this.width / 2 : 0),
                    y: this.position.y + (this.height ? this.height / 2 : 0)
                };

                for (const e of enemies) {
                    if (!e || e.hp <= 0 || e.invulnerable) continue;
                    if (e.invisible && !(this.tower.revealInvisible || this.tower.targetMode === 'invisible')) continue;

                    const dx = e.center.x - this.center.x;
                    const dy = e.center.y - this.center.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist <= hitRadius) {
                        const last = this.perEnemyLastHit.get(e) || 0;
                        // ← usar simulatedTime en vez de Date.now()
                        if (this.simulatedTime - last >= this.orbitHitCooldown) {
                            this.tower.dealDirectDamage(e);
                            this.perEnemyLastHit.set(e, this.simulatedTime);
                        }
                    }
                }
            }

            if (shouldDraw && !this.tower?._skipDraw) this.draw();

            if (this.orbitDuration !== Infinity && this.age >= this.orbitDuration) {
                this.markedForDeletion = true;
            }
            return;
        }

        if ((!this.enemy || this.enemy.hp <= 0) && this.tower) {
            // MOD: Retarget from the tower position within its actual range.
            const towerRange = this.tower.range || 100;
            const newTarget = this.tower.findClosestEnemy(this.tower, towerRange);
            if (newTarget) {
                this.enemy = newTarget;
            } else {
                this.markedForDeletion = true;
                return;
            }
        }

        if (!this.enemy || this.enemy.hp <= 0) {
            this.markedForDeletion = true;
            return;
        }

        // MOD: Delete projectile if target enemy is off-screen
        if (this.enemy && !this.enemy.dying && this.tower?.main?.game?.canvas) {
            const c = this.tower.main.game.canvas;
            const ex = this.enemy.center?.x ?? this.enemy.position?.x ?? 0;
            const ey = this.enemy.center?.y ?? this.enemy.position?.y ?? 0;
            if (ex < -50 || ex > c.width + 50 || ey < -50 || ey > c.height + 50) {
                this.markedForDeletion = true;
                return;
            }
        }

        this.age += simDelta;
        if (this.age >= this.lifeTime) {
            this.markedForDeletion = true;
            return;
        }

        // Si ya impactó animar y dibujar el pulso desde el propio proyectil
        if (this.impacting) {
            if (!this.ctx) {
                this.markedForDeletion = true;
                return;
            }

            const sp = this.pulse;
            if (!sp || !sp.active) {
                this.markedForDeletion = true;
                return;
            }

            if (shouldDraw && !this.tower?._skipDraw) {
                this.ctx.save();
                this.ctx.beginPath();
                this.ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);

                const hex = (sp.color || '#ffffff').replace('#', '');
                const r = parseInt(hex.substring(0, 2), 16) || 255;
                const g = parseInt(hex.substring(2, 4), 16) || 255;
                const b = parseInt(hex.substring(4, 6), 16) || 255;

                this.ctx.fillStyle = `rgba(${r},${g},${b},${sp.alpha})`;
                this.ctx.fill();
                this.ctx.restore();
            }

            sp.radius += sp.speed * frameFactor;
            sp.alpha -= 0.04 * frameFactor;

            if (sp.radius >= sp.maxRadius || sp.alpha <= 0) {
                this.markedForDeletion = true;
            }
            return; // no mover ni comprobar colisiones mientras animamos la pulse
        }

        // --- TORNADO MOVEMENT (revysBook) ---
        if (this.spiral) {
            const targetX = this.enemy.center.x;
            const targetY = this.enemy.center.y;

            const dx = targetX - this.spiral.originX;
            const dy = targetY - this.spiral.originY;
            const totalDist = Math.hypot(dx, dy) || 1;

            // Advance progress along the axis and rotate around it
            this.spiral.progress = Math.min(1, this.spiral.progress + (this.speed / totalDist) * secs);
            this.spiral.angle += this.spiral.angularSpeed * secs;

            // Current position along the straight axis (origin → target)
            const normX = dx / totalDist;
            const normY = dy / totalDist;

            const axisX = this.spiral.originX + normX * totalDist * this.spiral.progress;
            const axisY = this.spiral.originY + normY * totalDist * this.spiral.progress;

            // Two truly independent perpendicular vectors to the axis.
            // perp1: rotate axis 90° in XY plane
            const perp1X = -normY;
            const perp1Y =  normX;
            // perp2: cross product of axis with world-Z (0,0,1), projected to screen.
            // In 2D we simulate this as the component of (0,1) orthogonal to the axis.
            const dot = normY; // dot of normXY with (0,1)
            let perp2X = 0 - normX * dot;
            let perp2Y = 1 - normY * dot;
            const perp2Len = Math.hypot(perp2X, perp2Y) || 1;
            perp2X /= perp2Len;
            perp2Y /= perp2Len;

            // Radius shrinks as it approaches the target (tornado funnel shape)
            const radius = this.spiral.radius * (1 - this.spiral.progress);

            const cosA = Math.cos(this.spiral.angle);
            const sinA = Math.sin(this.spiral.angle);

            // True orbit: combine both perpendiculars with cos/sin
            const offX = (perp1X * cosA + perp2X * sinA) * radius;
            const offY = (perp1Y * cosA + perp2Y * sinA) * radius;

            const newX = axisX + offX;
            const newY = axisY + offY;

            this.position.x = newX - (this.width ? this.width / 2 : 0);
            this.position.y = newY - (this.height ? this.height / 2 : 0);
            this.center = { x: newX, y: newY };

            // Velocity for draw() rotation (visual direction)
            this.velocity.x = newX - (this._lastSpiralX ?? newX);
            this.velocity.y = newY - (this._lastSpiralY ?? newY);
            this._lastSpiralX = newX;
            this._lastSpiralY = newY;

            // Hit detection
            const hitRadius = Math.max(
                (this.enemy.radius ?? 6) + 2,
                (this.enemy.width ?? 16) / 2,
                8
            );
            const distToEnemy = Math.hypot(targetX - newX, targetY - newY);
            if (distToEnemy < hitRadius || this.spiral.progress >= 1) {
                this.processImpact();
            } else if (shouldDraw) {
                this.draw();
            }

            // Out of bounds check
            if (this.ctx && this.ctx.canvas) {
                if (
                    this.position.x < -50 || this.position.x > this.ctx.canvas.width + 50 ||
                    this.position.y < -50 || this.position.y > this.ctx.canvas.height + 50
                ) {
                    this.markedForDeletion = true;
                }
            }
            return;
        }
        // --- END TORNADO ---

        const angle = Math.atan2(
            this.enemy.center.y - (this.center?.y ?? (this.position.y + (this.height ? this.height/2 : 0))),
            this.enemy.center.x - (this.center?.x ?? (this.position.x + (this.width ? this.width/2 : 0)))
        );

        const vx = Math.cos(angle) * this.speed; // px/s
        const vy = Math.sin(angle) * this.speed; // px/s

        // desplazamiento total previsto este frame (px)
        const totalDx = vx * secs;
        const totalDy = vy * secs;
        const moveDist = Math.hypot(totalDx, totalDy);

        // radio de impacto basado en enemy (margen pequeño)
        const hitRadius = Math.max(
            (this.enemy.radius ?? 6) + 2,
            (this.enemy.width ?? 16) / 2,
            8
        );

        // tamaño de substep en px: más pequeño que el hitRadius para evitar saltos
        const stepSize = Math.max(2, hitRadius * 0.5);

        const steps = Math.max(1, Math.ceil(moveDist / stepSize));

        let collided = false;

        for (let s = 0; s < steps; s++) {
            // mover una fracción
            this.position.x += totalDx / steps;
            this.position.y += totalDy / steps;

            // actualizar center correctamente (IMPORTANTE: usar center para colisiones)
            this.center = {
                x: this.position.x + (this.width ? this.width / 2 : 0),
                y: this.position.y + (this.height ? this.height / 2 : 0)
            };

            // comprobar colisión contra el objetivo actual
            const dx = this.enemy.center.x - this.center.x;
            const dy = this.enemy.center.y - this.center.y;
            const distance = Math.hypot(dx, dy);

            if (distance < hitRadius) {
                const shouldTerminate = this.processImpact();
                if (shouldTerminate) {
                    collided = true;
                    break;
                } else {
                    collided = true;
                    break;
                }
            }
        }

        // dibujar después de moverse (si no impactó y no está impactando)
        if (!collided && !this.impacting && shouldDraw && !this.tower?._skipDraw) {
            this.draw();
        }

        // si perdió objetivo o salió del canvas, lo limpias como antes
        if (!collided) {
            if (this.ctx && this.ctx.canvas) {
                if (
                    this.position.x < -50 || this.position.x > this.ctx.canvas.width + 50 ||
                    this.position.y < -50 || this.position.y > this.ctx.canvas.height + 50
                ) {
                    this.markedForDeletion = true;
                }
            }
        }
    }

    draw() {
        if (!this.loaded || !this.ctx) return;
        const angle = Math.atan2(this.velocity.y, this.velocity.x);

        this.ctx.save();

        this.ctx.translate(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2
        );
        this.ctx.rotate(angle);

        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = this.color || 'rgba(255, 255, 255, 0.8)';

        this.ctx.drawImage(
            this.sprite,
            this.width * this.frames.current,
            this.height * this.frames.direction,
            this.width,
            this.height,
            -this.width / 2,
            -this.height / 2,
            this.width,
            this.height
        );

        this.ctx.restore();

        this.frames.elapsed++;
        if (this.frames.elapsed % this.frames.hold === 0) {
            this.frames.current++;
            if (this.frames.current >= this.frames.max) this.frames.current = 0;
        }
    }

    processImpact() {
        // efectos de impacto
        if (this.tower?.ability?.id === 'curse' || this.tower?.ability?.id === 'magicBounce' || this.tower?.ability?.id === 'curseDoubleShot' || this.tower?.ability?.id === 'curseSplash') {
            this.enemy.applyStatusEffect({ type: 'curse' });
        }

        // crítico
        let finalDamage = this.power;
        let isCritical = false;
        let critical = this.critical;

        if (this.tower?.pokemon?.item?.id == 'silphScope' && (
            this.tower?.ability?.id == 'frisk' ||
            this.tower?.ability?.id == 'illuminate' ||
            this.tower?.ability?.id == 'illuminateBuff' ||
            this.tower?.ability?.id == 'vigilantFrisk'
        )) finalDamage += 175;

        if (this.tower?.ability?.id === 'star') {
            finalDamage += Math.min(1200, this.tower.main.player.stars);
            if (this.tower?.pokemon?.favorite) finalDamage++;
            if (this.tower?.pokemon?.isShiny) finalDamage++;
            if (this.tower?.pokemon?.item?.id == 'starCandy') finalDamage++;
            this.tower.main.team.pokemon.forEach((poke) => {
                if (poke.id == 32) finalDamage ++;
                if (poke.id == 148) finalDamage ++;
            })
        }

        if (this.tower?.ability?.id === 'scheme') {
            let probs = (this.tower?.pokemon?.item?.id == 'shinyCharm') ? 3000 : 9000;
            const shiny =  Math.floor(Math.random() * probs);
            if (shiny == 0) {
                const pokes = [...this.tower.main.team.pokemon, ...this.tower.main.box.pokemon];
                const noShinyPokes = pokes.filter(pokemon => !pokemon.isShiny && pokemon.specie.evolution === undefined);

                if (noShinyPokes.length > 0 && !this.tower.main.area.isCustom) {
                    const randomPokemon = noShinyPokes[Math.floor(Math.random() * noShinyPokes.length)];
                    randomPokemon.isShiny = true;
                    randomPokemon.setShiny();
                    if (!this.tower.main.mute[2]) playSound('shiny', 'effect');
                    this.tower.main.player.shinyAmount++;
                }
            }
        }

        if (this.tower?.ability?.id === 'speedBoost') {
            if (this.tower.main.area.speedBoostUsers[this.tower.pokemon.id] === undefined) this.tower.main.area.speedBoostUsers[this.tower.pokemon.id] = 1;
            else if (this.tower.main.area.speedBoostUsers[this.tower.pokemon.id] < 10) this.tower.main.area.speedBoostUsers[this.tower.pokemon.id]++;

            if (this.tower.main.area.speedBoostUsers[this.tower.pokemon.id] > 10) this.tower.main.area.speedBoostUsers[this.tower.pokemon.id] = 10;

            if (
                this.tower.main.area.speedBoostUsers[this.tower.pokemon.id] === 10 &&
                this.tower.pokemon.extra &&
                !this.tower.main.area.inChallenge.noItems &&
                this.tower?.pokemon?.item?.id != "dampMulch"
            ) {
                const sharpedonite = this.tower.main.player.items[this.tower.main.itemController.getItemPosition('sharpedonite')]
                if (sharpedonite) {
                    if (this.tower?.pokemon?.recoverTarget) this.tower.pokemon.targetMode = this.tower?.pokemon?.recoverTarget;
                    this.tower.pokemon.recoverItem = this.tower.pokemon.item;
                    this.tower.main.itemController.equip(sharpedonite, this.tower.pokemon);
                    //console.log(this.tower.pokemon.targetMode)
                }
            }
        }

        if (this.tower?.pokemon?.item?.id == 'loadedDice') {
            let bonus = 1 + (this.ricochetsLeft * 0.5);
            finalDamage = Math.ceil(finalDamage * bonus);
        }

        if (this.tower?.pokemon?.ability?.id == 'makeItRain') {
            let goldPerDigit = (this.tower?.pokemon?.item?.id == 'amuletCoin') ? 0.1 : 0.075
            let goldValue = this.tower.main.player.stats.totalGold;
            let goldBonus = goldValue.toString().length * goldPerDigit;
            finalDamage += Math.ceil(finalDamage * goldBonus);
        }

        if (this.tower?.pokemon?.item?.id == 'sharpBeak' && this.tower?.tile.land == 4) {
            let dist = Math.sqrt(Math.pow(this.enemy.position.x - this.tower.position.x, 2) + Math.pow(this.enemy.position.y - this.tower.position.y, 2));
            let bonus = Math.min(1.5, Math.sqrt(this.tower.range / dist, 2));

            finalDamage = Math.floor(finalDamage * bonus);
        }

        if (this.tower?.pokemon?.ability?.id == 'noGuard') {
            let dist = Math.sqrt(Math.pow(this.enemy.position.x - this.tower.position.x, 2) + Math.pow(this.enemy.position.y - this.tower.position.y, 2));
            let bonus = (Math.floor(dist/100) * finalDamage)/20;

            finalDamage = Math.floor(finalDamage + bonus);
        }

        if (this.tower?.pokemon?.item?.id == 'sniperScope') {
            let dist = Math.sqrt(Math.pow(this.enemy.position.x - this.tower.position.x, 2) + Math.pow(this.enemy.position.y - this.tower.position.y, 2));
            let bonus = (dist > 150) ? 1.25 : 0.8;
            if (this.tower?.ability?.id == 'contrary') bonus = 1.25;
            if (this.tower?.ability?.id == 'simple' && bonus > 1) bonus *= 2.1875;
            if (this.tower?.ability?.id == 'simple' && bonus < 1) bonus /= 2.1875;
            finalDamage = Math.floor(finalDamage * bonus);
        }

        if (this.tower?.ability?.id === 'moxie') {
            if (this.tower.main.area.moxieUsers[this.tower.pokemon.id] != undefined) {
                finalDamage += Math.floor(finalDamage * this.tower.main.area.moxieUsers[this.tower.pokemon.id] * 0.05);
                if (this.tower?.pokemon?.item?.id == 'blackGlasses') finalDamage += Math.floor(finalDamage * this.tower.main.area.moxieUsers[this.tower.pokemon.id] * 0.05);
            }
        }

        if (this.tower?.ability?.id === 'meteorMash') {
            let mmBonus = (this.tower.main.area.meteorMashUsers[this.tower.pokemon.id] == undefined) ? 0 : this.tower.main.area.meteorMashUsers[this.tower.pokemon.id];
            finalDamage += Math.floor(finalDamage * mmBonus * 0.2);
        }

        if (this.tower?.pokemon?.item?.id == 'hardStone') finalDamage += Math.floor(finalDamage * 0.25);
        if (this.tower?.pokemon?.item?.id == 'clawFossil') finalDamage += Math.floor(finalDamage * (this.tower.main.player.fossilInTeam * 0.1));
        if (this.tower?.pokemon?.item?.id == 'cellBattery') finalDamage += Math.floor(finalDamage * 0.5);

        if (
            this.tower?.pokemon?.item?.id == 'thickClub' ||
            this.tower?.pokemon?.item?.id == 'lightBall' ||
            this.tower?.pokemon?.item?.id == 'metalPowder' ||
            this.tower?.pokemon?.item?.id == 'lifeOrb' ||
            this.tower?.pokemon?.item?.id ==  'nanabBerry'
        ) finalDamage += Math.ceil(this.power / 2);

        if (this.tower?.pokemon?.item?.id == 'eviolite') finalDamage += Math.ceil(this.power / 5);

        if ( this.tower?.pokemon?.item?.id == 'sokudosPortfolio') {
            finalDamage = Math.ceil(finalDamage *(2 * this.tower.main.player.shinyAmount / 100));
        }

        if (this.tower?.ability?.id === 'diurnal' && this.tower?.main.utility.isBetweenHours(8, 20)) {
            finalDamage += Math.ceil(this.power / 2);
        }

        if (this.tower?.ability?.id === 'rivalryPower' && this.tower?.main.area.rivalryAmount >= 2) {
            finalDamage += Math.ceil(this.power / 2);
        }

        if (this.tower?.ability?.id === 'defeatist' && this.tower?.main.player.health[this.tower.main.area.routeNumber] <= 7) {
            finalDamage = Math.ceil(finalDamage / 2);
        }

        if (this.tower?.main.area.shellSmashActive && this.tower?.ability?.id === 'shellSmash') {
            finalDamage = Math.ceil(finalDamage * 1.5);
        }

        if (
            this.tower?.main.player.health[this.tower.main.area.routeNumber] <= 5 &&
            this.tower?.ability?.id === 'torrent' &&
            (this.tower?.tile.land === 3 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'squirtBottle') || this.tower?.carriedBy == 'icePlatform')
        ) {
            finalDamage = Math.ceil(finalDamage * 1.75);
        }

        if (
            this.tower?.main.player.health[this.tower.main.area.routeNumber] <= 5 &&
            this.tower?.ability?.id === 'overgrow' &&
            (this.tower?.tile.land === 3 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'fertiliser') || this.tower?.carriedBy == 'grassPlatform')
        ) {
            finalDamage = Math.ceil(finalDamage * 1.75);
        }

        if (this.tower?.pokemon?.item?.id == "crunchies") finalDamage -= Math.ceil(this.power * 0.4);

        if (this.tower?.pokemon?.item?.id == 'zoomLens' ||
            this.tower?.pokemon?.item?.id == 'quickPowder' ||
            this.tower?.pokemon?.item?.id == 'quickClaw' ||
            (this.tower?.pokemon?.item?.id == 'scovillainSiracha' && this.tower?.ability?.id !== 'burnDoubleShot')
        ) {
            if (this.tower?.ability?.id != 'contrary' && this.tower?.ability?.id != 'defiant') {
                finalDamage -= (this.tower?.ability?.id == 'simple') ? Math.ceil(this.power * 0.875) : Math.ceil(this.power * 0.5);
            } else if (this.tower?.ability?.id === 'defiant') {
                finalDamage += 500;
            }
            else finalDamage += Math.ceil(this.power / 2);
        }

        if (this.tower?.pokemon?.item?.id == 'laggingTail') {
            if (this.tower?.ability?.id === 'defiant') finalDamage += 750;
            finalDamage += (this.tower?.ability?.id == 'simple') ? Math.ceil(this.power * 0.875) : Math.ceil(this.power * 0.5);
        }

        if (this.tower?.pokemon?.ability?.id === 'tailGlow' && this.tower.main.area.heartScale > 0) {
            finalDamage += Math.ceil(this.power * 0.75);
        }

        if (this.tower?.pokemon?.item?.id == "weaknessPolicy") finalDamage = Math.ceil(finalDamage * 2.5);

        if (this.tower?.pokemon?.item?.id == 'inverter' && this.tower?.pokemon?.specie?.key == 'malamar') {
            critical += 15;
            finalDamage += Math.ceil(finalDamage * 0.5);
        }

        if (this.tower?.ability?.id === 'rampardos') {
            let rampardosBonus = 0;
            if (this.tower?.pokemon?.item?.id == 'rockyHelmet') rampardosBonus = finalDamage * (Math.abs(this.tower.main.player.health[this.tower.main.area.routeNumber] - 14) * 0.1);
            else rampardosBonus = finalDamage * (Math.abs(this.tower.main.player.health[this.tower.main.area.routeNumber] - 14) * 0.05);
            finalDamage += Math.ceil(rampardosBonus)
        }

        if (this.tower.teleportBuff) {
            if (this.tower?.pokemon?.item?.id == 'twistedSpoon') finalDamage += Math.ceil(finalDamage * 0.25 * this.tower.teleportBuff);
            else finalDamage = Math.ceil(finalDamage * this.tower.teleportBuff);
            this.tower.teleportBuff = 0;
        }

        if (this.tower?.pokemon?.item?.id === 'leek') critical *= 2;
        if (this.tower?.pokemon?.item?.id === 'domeFossil') critical += this.tower.main.player.fossilInTeam * 5;

        // rockruff
        if (
            this.tower?.pokemon.ability.id == 'toughClawsNight' &&
            (this.tower?.tile.land == 2 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'fertiliser') || this.tower?.carriedBy == 'grassPlatform') ||
            ((this.tower?.tile.land == 3 || this.tower?.carriedBy == 'icePlatform') && this.tower?.pokemon?.item?.id == 'subwoofer')
        ) {
            finalDamage = Math.ceil(finalDamage * 1.5);
            critical = 100;
        } else if (
            this.tower?.pokemon.ability.id == 'toughClawsDay' &&
            (this.tower?.tile.land == 4 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'hikingKit')) ||
            ((this.tower?.tile.land == 3 || this.tower?.carriedBy == 'icePlatform') && this.tower?.pokemon?.item?.id == 'subwoofer')
        ) {
            finalDamage = Math.ceil(finalDamage * 1.5);
            critical = 100;
        } else if (
            this.tower?.pokemon.ability.id == 'toughClaws' &&
            (this.tower?.tile.land == 2 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'fertiliser') || this.tower?.carriedBy == 'grassPlatform') ||
            ((this.tower?.tile.land == 3 || this.tower?.carriedBy == 'icePlatform') && this.tower?.pokemon?.item?.id == 'subwoofer')
        ) {
            critical = 100;
        } else if (
            this.tower?.pokemon.ability.id == 'toughClaws' &&
            (this.tower?.tile.land == 4 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'hikingKit')) ||
            ((this.tower?.tile.land == 3 || this.tower?.carriedBy == 'icePlatform') && this.tower?.pokemon?.item?.id == 'subwoofer')
        ) {
            finalDamage = Math.ceil(finalDamage * 1.5);
        }

        if (this.tower?.pokemon?.item?.id === 'ancientSword') {
            finalDamage = Math.ceil(finalDamage * 1.2);
        }

        if (
            this.tower.main.area.weather == 'rain' &&
            (this.tower?.tile.land == 3 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'squirtBottle') || this.tower?.carriedBy == 'icePlatform')
        ) {
            finalDamage = Math.ceil(finalDamage * 1.2);
        }

        if (
            this.tower.main.area.weather == 'heavyRain' && this.pokemon?.item?.id != 'safetyGoggles' &&
            (this.tower?.tile.land == 3 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'squirtBottle') || this.tower?.carriedBy == 'icePlatform')
        ) {
            if (!this.tower.main.area.airLock) {
                finalDamage = (this.tower.main.area.cloudNine) ? Math.ceil(finalDamage * 0.875) : Math.ceil(finalDamage * 0.5);
            }
        }

        if (
            this.tower?.pokemon.ability.id == 'drySkin' &&
            (this.tower.main.area.weather == 'extremelyHarshSunlight' || this.tower.main.area.weather == 'harshSunlight') &&
            (this.tower?.tile.land == 2 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'fertiliser') || this.tower?.carriedBy == 'grassPlatform')
        ) {
            finalDamage = (this.tower.main.area.weather == 'extremelyHarshSunlight') ? Math.ceil(finalDamage * 3) : Math.ceil(finalDamage * 2)
        }

        if (this.tower.criticalAura) critical += 20;
        if (this.tower.genesisAura) critical += 5;

        if (this.tower?.pokemon?.item?.id == 'direHit') critical += (this.tower?.ability?.id == 'simple') ? 43.8 : 25;
        if (this.tower?.pokemon?.item?.id == 'expertBelt') critical += (this.tower?.ability?.id == 'simple') ? 17.5 : 10;
        if (this.tower?.pokemon?.item?.id == 'lansatBerry' && this.tower?.lansatBerryTimer > 0) {
            critical += (this.tower?.ability?.id == 'simple') ? 105 : 60;
        }

        if (this.tower?.ability?.id == 'chatter') {
            if (this.tower?.pokemon?.lvl == 100 && this.tower?.pokemon?.item?.id == 'bicycle' && typeof this.tower?.main?.area?.inChallenge.lvlCap !== 'number') {
                finalDamage = Math.ceil(finalDamage * (Math.floor((JSON.parse(window.localStorage.getItem("data")).config.audio['effects'])) / 20));
                critical -= 4;
            }
            else finalDamage *= Math.floor((JSON.parse(window.localStorage.getItem("data")).config.audio['effects'] * 0.2));
        }

        if (this.tower?.ability?.id == 'flowerTrick' || this.tower?.ability?.id == 'armaldo') critical = Math.min(95, critical);

        if ((Math.random() * 100) < critical && (this.tower?.pokemon?.item?.id != 'blueBandana' || this.tower?.ability?.id == 'contrary')) {
            isCritical = true;
            let multiplier = (this.tower?.ability?.id === 'superCritical') ? 2.0 : 1.5;
            if (this.tower?.pokemon?.item?.id === 'leek') multiplier *= 2;
            if (this.tower.criticalDamageAura) multiplier *= 1.5;
            if (this.tower?.pokemon?.item?.id == 'clover') multiplier *= (this.tower?.ability?.id == 'simple') ? 2.625 : 1.5;
            if (this.tower?.main?.area?.weather == 'hail') multiplier *= 1.25;
            finalDamage = Math.ceil(finalDamage * multiplier);
            if (this.tower?.ability?.id === 'armaldo') this.ricochetsLeft++;
        }

        if (this.tower?.pokemon?.item?.id === 'blueBandana') {
            finalDamage = (this.tower?.ability?.id === 'simple') ? Math.ceil(finalDamage * (1 + critical * 0.0175)) : Math.ceil(finalDamage * (1 + critical * 0.01));
        }

        if (this.tower?.ability?.id === 'focus' || this.tower?.pokemon?.item?.id === 'focusBand') {
            let focusBoost = 0;

            if (this.tower.lastTarget === this.enemy) {
                if (this.tower?.ability?.id === 'focus') {
                    focusBoost += 0.075
                }

                if (this.tower?.pokemon?.item?.id === 'focusBand') {
                    focusBoost += (this.tower?.ability?.id == 'simple') ? 0.0875 : 0.05;
                }

                this.tower.damageBoost += focusBoost;
            } else {
                this.tower.damageBoost = 0;
                this.tower.lastTarget = this.enemy;
            }

            finalDamage = Math.ceil(finalDamage * (1+this.tower.damageBoost));
        }

        if (this.tower?.ability?.id === 'firstImpression') {
            if (this.tower.lastTarget !== this.enemy) {
                finalDamage = Math.ceil(finalDamage * 3);
                this.tower.lastTarget = this.enemy;
            }
        }

        if (this.tower?.pokemon?.item?.id === 'ovalCharm') {
            let ovalCharmMultiplier = (10 - this.tower.main.team.pokemon.length) * 12.5;
            finalDamage += Math.ceil((finalDamage * ovalCharmMultiplier)/100);
        }

        if (this.tower?.pokemon?.ability.id == 'sniper') {
            let dist = Math.sqrt(Math.pow(this.enemy.position.x - this.tower.position.x, 2) + Math.pow(this.enemy.position.y - this.tower.position.y, 2));
            let bonus = Math.min(7, (Math.floor(dist/150)));
            for (let i = 0; i < bonus; i++) finalDamage = Math.floor(finalDamage * 2);
        }

        this.enemy.getDamaged(finalDamage, 'physical', this.tower?.pokemon?.ability, isCritical, new Set(), this.tower.pokemon, this.tower);

        // revysBook: trigger 360 spin on hit
        if (this.tower?.pokemon?.item?.id === 'revysBook' && this.enemy) {
            this.enemy.spinRemaining = 400;
            this.enemy.spinAngle = 0;
        }

        if (this.tower?.pokemon?.item?.id === 'amuletCoin') {
            let g = Math.ceil(finalDamage * 0.001 * (Math.min(1200, this.tower.main.player.stars)));
            this.tower.main.area.goldWave += g;
            this.tower.main.player.changeGold(g);
        }

        // voltSurge - cadena eléctrica: golpea hasta 3 enemigos más, encadenando desde el último golpeado, alcance 100px
        if (this.tower?.ability?.id === 'voltSurge' && this.tower.voltSurgeChains) {
            const chainHits = [this.enemy];
            const enemies = this.tower.main.area.enemies;
            const revealInvisible = this.tower.revealInvisible || this.tower.targetMode === 'invisible';
            const chainNumber = 3 + this.tower.main.player.pastInTeam;

            for (let i = 0; i < chainNumber; i++) {
                const from = chainHits[chainHits.length - 1];
                let next = null;
                let minDist = 150;

                for (const e of enemies) {
                    if (!e || e.hp <= 0 || e.invulnerable || chainHits.includes(e)) continue;
                    if (e.invisible && !revealInvisible) continue;

                    const dist = Math.hypot(e.center.x - from.center.x, e.center.y - from.center.y);
                    if (dist <= minDist) {
                        minDist = dist;
                        next = e;
                    }
                }

                if (!next) break;

                next.getDamaged(finalDamage, 'physical', this.tower?.pokemon?.ability, isCritical, new Set(), this.tower.pokemon, this.tower);
                chainHits.push(next);
            }

            if (chainHits.length > 1) {
                this.tower.voltSurgeChains.push({
                    points: chainHits.map(e => ({ x: e.center.x, y: e.center.y })),
                    remaining: 260,
                    duration: 260
                });
            }
        }

        // efectos secundarios
        if (this.enemy.canSlow && this.tower?.pokemon?.item?.id === 'magnet' && this.enemy.armor > 0) {
            if (this.tower?.ability?.id == 'simple') this.enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 1.75 });
            else this.enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 1 });
        }
        if (isCritical && this.tower?.pokemon?.item?.id == 'razorClaw' && this.enemy.canSlow) {
            if (this.tower?.ability?.id == 'simple') this.enemy.applyStatusEffect({ type: 'slow', duration: 0.35, slowPercent: 0.5 })
            else this.enemy.applyStatusEffect({ type: 'slow', duration: 0.2, slowPercent: 0.5 })
        }

        if (this.tower?.ability?.id === 'invalidState' && Math.random() < 0.05) {
            const statusPool = [];
            if (this.enemy.canBurn) statusPool.push(() => this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon));
            if (this.enemy.canStun) {
                statusPool.push(() => {
                    if (this.tower?.pokemon?.item?.id == 'lightClay') this.enemy.applyStatusEffect({ type: 'stun', duration: 1.65 });
                    else this.enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
                });
            }
            if (this.enemy.canSlow) {
                statusPool.push(() => {
                    if (this.tower?.pokemon?.item?.id == 'lightClay') this.enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2.2 });
                    else this.enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
                });
            }
            statusPool.push(() => this.enemy.applyStatusEffect({ type: 'curse' }));
            statusPool.push(() => this.enemy.applyStatusEffect({ type: 'nightmare', damage: null, stacks: 1 }, this.tower.pokemon));
            if (this.enemy.canPoison) statusPool.push(() => this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon));
            if (statusPool.length === 0) return;
            const randomIndex = Math.floor(Math.random() * statusPool.length);
            statusPool[randomIndex]();
        }

        if (this.enemy.canBurn && (
            this.tower?.ability?.id === 'burn' ||
            this.tower?.ability?.id === 'burnSplash' ||
            this.tower?.ability?.id === 'burnDoubleShot' ||
            this.tower?.pokemon?.item?.id == 'scovillainSiracha' ||
            this.tower?.ability?.id === 'drought' ||
            (this.tower?.pokemon?.item?.id  == 'koffingJelly' && this.tower?.pokemon?.id === 56)
            )
        ) {
            if (this.tower?.pokemon?.item?.id == 'magmaStone') this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.tower.pokemon);
            else if (this.tower?.pokemon?.item?.id == 'falmeOrb') this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.tower.pokemon);
            else this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);
        }

        if (this.enemy.canPoison &&
            (
                this.tower?.ability?.id === 'poison' ||
                this.tower?.ability?.id === 'poisonDoubleShot' ||
                this.tower?.pokemon?.item?.id  == 'koffingJelly' ||
                (this.tower?.pokemon?.item?.id  == 'scovillainSiracha' && this.tower?.ability?.id === 'burnDoubleShot')
            )) {
            this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
            if (this.tower?.pokemon?.item?.id  == 'toxicOrb' || (this.tower?.pokemon?.item?.id == 'poisonBarb' && Math.random() < 0.5)) this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
        }

        if (
            (this.enemy.canSlow || this.tower?.pokemon?.item?.id === 'bindingBand') &&
            (
                this.tower?.ability?.id === 'slow' ||
                this.tower?.ability?.id === 'slowRicochet' ||
                this.tower?.ability?.id === 'slowSplash' || this.tower?.ability?.id === 'hyperDrill' ||
                this.tower?.ability?.id === 'cradily'
            )
        ) {
            (this.tower?.pokemon?.item?.id == 'lightClay') ? this.enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2.2 }) : this.enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
        }

        if (this.enemy.canStun && this.tower?.ability?.id === 'stunMono') {
            if (Math.random() < 0.3) {
                (this.tower?.pokemon?.item?.id == 'lightClay') ? this.enemy.applyStatusEffect({ type: 'stun', duration: 2.2 }) : this.enemy.applyStatusEffect({ type: 'stun', duration: 2 });
            }
        }
        if (this.enemy.canStun && (this.tower?.ability?.id === 'stunMonoNerf' || this.tower?.ability?.id === 'static')) {
            if (this.tower?.pokemon?.item?.id == 'cellBattery') this.enemy.applyStatusEffect({ type: 'stun', duration: 0.1 });
            else if (Math.random() < 0.05) {
                (this.tower?.pokemon?.item?.id == 'lightClay') ? this.enemy.applyStatusEffect({ type: 'stun', duration: 1.65 }) : this.enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
            }
        }
        if (this.tower?.ability?.id === 'nightmare') {
            this.enemy.applyStatusEffect({ type: 'nightmare', damage: null, stacks: 1 }, this.tower.pokemon);
        }

        if (this.tower.pokemon?.item?.id == 'spindasSpecialDelivery') {
            let ssdTry = Math.random();
            if (ssdTry <= 0.015 && this.enemy.canBurn) this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);
            else if (ssdTry <= 0.03 && this.enemy.canPoison)  this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
            else if (ssdTry <= 0.045 && this.enemy.canSlow) this.enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
            else if (ssdTry <= 0.06 && this.enemy.canStun) this.enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
        }

        if ((
                this.tower?.pokemon?.item?.id == "maliciousArmor" ||
                (isCritical && this.tower?.pokemon?.item?.id == "crunchies") ||
                this.tower?.ability?.id === 'splash' ||  this.tower?.ability?.id === 'auraSphere' ||
                this.tower?.ability?.id === 'slowSplash' || this.tower?.ability?.id === 'hyperDrill' ||
                this.tower?.ability?.id === 'burnSplash' ||
                this.tower?.ability?.id === 'armorBreakSplash' ||
                this.tower?.ability?.id === 'synchronySplash' ||
                this.tower?.ability?.id ==='curseSplash' ||
                this.tower?.ability?.id === 'armorCannon' ||
                this.tower?.pokemon?.item?.id == 'sprayduck' ||
                this.tower?.lightningRodCharge === 10 ||
                this.forcedSplash
            ) && this.tower?.pokemon?.item?.id != "weaknessPolicy"
        ) {
            let splashRadius = 65;

            if (this.tower?.pokemon?.item?.id == "dragonFang") splashRadius = 130;
            if (this.tower?.lightningRodCharge == 10) splashRadius = 150;
            if (this.tower?.ability?.id === 'auraSphere') splashRadius += 6.5 * (Math.abs(this.tower.main.player.health[this.tower.main.area.routeNumber] - 14));

            this.tower.main.area.enemies.forEach(e => {
                if (e !== this.enemy && e.hp > 0) {
                    const dist = Math.hypot(e.center.x - this.enemy.center.x, e.center.y - this.enemy.center.y);
                    if (dist <= splashRadius) {
                        let splashDamage = (this.tower?.pokemon?.item?.id == 'muscleBand' || this.tower?.ability?.id === 'auraSphere') ? finalDamage : Math.ceil(finalDamage * 0.5);
                        e.getDamaged(splashDamage, 'physical', this.tower?.pokemon?.ability, isCritical, new Set(), this.tower.pokemon, this.tower);
                        if (e.canBurn && this.tower?.ability?.id === 'burnSplash') {
                            if (this.tower?.pokemon?.item?.id == 'magmaStone') e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.tower.pokemon);
                            else if (this.tower?.pokemon?.item?.id == 'falmeOrb') e.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.tower.pokemon);
                            else e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);
                        }
                        if (e.canSlow && (this.tower?.ability?.id === 'slowSplash' || this.tower?.ability?.id === 'hyperDrill')) {
                            (this.tower?.pokemon?.item?.id == 'lightClay') ? e.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2.2 }) : e.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
                        }

                        if (this.tower?.ability?.id === 'curseSplash') e.applyStatusEffect({ type: 'curse' });
                        if (this.tower?.ability?.id === 'synchronySplash') {
                            this.enemy.statusEffects.forEach(effect => {
                                if (effect.type === 'burn' && e.canBurn) e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);
                                if (effect.type === 'poison' && e.canPoison) e.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
                                if (effect.type === 'slow' && e.canSlow) e.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
                                if (effect.type === 'stun' && e.canStun) e.applyStatusEffect({ type: 'stun', duration: 2 });
                                if (effect.type == 'nightmare' && this.tower?.pokemon?.item?.id == 'nightmareCloth') e.applyStatusEffect({ type: 'nightmare', damage: null, stacks: 1 }, this.tower.pokemon);
                            })
                        }
                    }
                }
            });
        }

        // CREAR SPIKES
        if (this.tower?.ability?.id === 'spikyShield') {
            if (Math.random() < this.tower?.spikyShieldChance) {
                this.tower.spikyShieldChance = 0;
                const tr = (this.tower?.pokemon?.item?.id == 'rockyHelmetSpikes') ? 250 : 500;
                const pos = { x: this.position.x+16, y: this.position.y+16 };

                this.tower.main.area.createSpikeZone(pos, this.tower, {
                    radius: 60,
                    duration: 2600,
                    tickRate: tr,
                    dedupDistance: 32,
                    dedupTime: 250
                });
            } else this.tower.spikyShieldChance += 0.25;
        }

        if (this.tower?.pokemon?.item?.id == 'revysBook' && Math.random() < 0.01) {
            const tr = (this.tower?.pokemon?.item?.id == 'rockyHelmetSpikes') ? 250 : 500;
            const pos = { x: this.position.x+16, y: this.position.y+16 };

            this.tower.main.area.createSpikeZone(pos, this.tower, {
                radius: 60,
                duration: 2600,
                tickRate: tr,
                dedupDistance: 32,
                dedupTime: 250
            });
        }

        // rebote
        if (this.ricochetsLeft > 0 && this.tower && this.tower?.pokemon?.item?.id != 'loadedDice') {
            const next = this.findClosestEnemy(this.enemy, 200);
            if (next) {
                const reducedPower = (this.tower?.pokemon?.item?.id === 'metronome') ? Math.ceil(this.power * 0.85) : Math.ceil(this.power * 0.7);
                const sx = this.enemy.center.x + (Math.random() - 0.5) * 6;
                const sy = this.enemy.center.y + (Math.random() - 0.5) * 6;

                const newProj = new Projectile(
                    sx,
                    sy,
                    next,
                    this.ctx,
                    {
                        ...this.tower.projectile,
                        power: reducedPower,
                        ricochetsLeft: Math.max(0, this.ricochetsLeft - 1),
                        speed: this.speed
                    },
                    this.tower,
                    true
                );

                this.tower.projectiles.push(newProj);
            }
        }

        if ((
            this.tower?.pokemon?.item?.id == "maliciousArmor" ||
            (isCritical && this.tower?.pokemon?.item?.id == "crunchies") ||
            this.tower?.ability?.id === 'splash' || this.tower?.ability?.id === 'auraSphere' ||
            this.tower?.ability?.id === 'slowSplash' || this.tower?.ability?.id === 'hyperDrill' ||
            this.tower?.ability?.id === 'burnSplash' ||
            this.tower?.ability?.id === 'armorBreakSplash' ||
            this.tower?.ability?.id === 'synchronySplash' ||
            this.tower?.ability?.id === 'curseSplash' ||
            this.tower?.ability?.id === 'armorCannon' ||
            this.tower?.pokemon?.item?.id == 'sprayduck' ||
            this.tower?.lightningRodCharge === 10 ||
            this.forcedSplash
            ) && this.tower?.pokemon?.item?.id != "weaknessPolicy"
        ) {
            let pulseRadius = 65;

            if (this.tower?.ability?.id === 'auraSphere') pulseRadius += 6.5 * (Math.abs(this.tower.main.player.health[this.tower.main.area.routeNumber] - 14));
            if (this.tower?.pokemon?.item?.id == "dragonFang") pulseRadius = 130;
            if (this.tower?.lightningRodCharge == 10) {
                pulseRadius = 150;
                this.tower.lightningRodCharge = 0;
            }

            this.pulse = {
                active: true,
                x: this.enemy.center.x,
                y: this.enemy.center.y,
                radius: 0,
                alpha: 0.75,
                maxRadius: pulseRadius,
                speed: pulseRadius / 12,
                color: this.tower?.pokemon?.specie?.color || '#ffffff'
            };

            this.velocity.x = 0;
            this.velocity.y = 0;
            this.impacting = true;

            // detener aquí para que empiece la animación
            return;
        }
        // marcar para eliminación
        this.markedForDeletion = true;
        return;
    }

    findClosestEnemy(fromEnemy, maxDist = 200) {
        let closest = null;
        let minDistSq = maxDist * maxDist;
        for (const e of this.tower.main.area.enemies) {
            if (!e || e === fromEnemy || e.hp <= 0 || e.invisible) continue;
            const dx = e.center.x - fromEnemy.center.x;
            const dy = e.center.y - fromEnemy.center.y;
            const distanceSq = dx * dx + dy * dy;
            if (distanceSq < minDistSq) {
                minDistSq = distanceSq;
                closest = e;
            }
        }
        return closest;
    }
}
