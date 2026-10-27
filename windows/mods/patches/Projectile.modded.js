import { Sprite } from '../../utils/Sprite.js';
import { SpikeZone } from './Tower.js';
import { playSound } from '../../file/audio.js';
import { projectileData } from '../data/projectileData.js';

export class Projectile extends Sprite {
    constructor(x, y, enemy, ctx, projectile, tower, isRicochet = false, extra = {}) {
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
        this.extra = extra;
        this.specialEffect = false;

        this.power = projectile.power ?? 1;
        this.critical = tower?.critical ?? 0;
        this.ricochetsLeft = projectile.ricochetsLeft ?? 0;

        this.markedForDeletion = false;

        this.lifeTime = (this.tower?.ability?.id === 'electroBall') ? 40000 : 5000;
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

        this.fairySingularity = null;

        if (projectile.fairySingularity) {
            const singularity = typeof projectile.fairySingularity === 'object'
                ? projectile.fairySingularity
                : {};

            this.fairySingularity = {
                phase: 'travel',

                target: enemy,

                targetX: enemy?.center?.x ?? (x + (this.width ? this.width / 2 : 0)),
                targetY: enemy?.center?.y ?? (y + (this.height ? this.height / 2 : 0)),

                waitTimer: 0,
                pullTimer: 0,

                waitDuration: singularity.waitDuration ?? 1000,
                pullDuration: singularity.pullDuration ?? 450,

                radius: singularity.radius ?? 120,
                pullSpeed: singularity.pullSpeed ?? 220
            };

            this.lifeTime = Infinity;
        }

        this.thunderDrive = (
            this.orbit &&
            this.tower?.ability?.id === 'triAttack' &&
            this.tower?.pokemon?.item?.id === 'thundersDrive'
        );

        if (this.thunderDrive) {
            this.thunderDriveCooldown = 0;
        }

        this.sacredFire = projectile.sacredFire === true;

        if (this.sacredFire) {
            this.sacredFireTarget = null;
            this.sacredFireLastHit = new WeakMap();
        }

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

        this.bonemerang = null;
        if (projectile.bonemerang && enemy) {
            this.bonemerang = {
                phase: 'out',
                target: enemy,
                hitCooldowns: new WeakMap(),
                hitCooldown: 220
            };

            this.simulatedTime = 0;
            this.lifeTime = Infinity;
            this.enemy = null;
        }

        this.bleakwindStorm = null;

        if (projectile.bleakwindStorm) {
            const storm = (typeof projectile.bleakwindStorm === 'object')
                ? projectile.bleakwindStorm
                : {};

            const angle = storm.angle ?? (Math.random() * Math.PI * 2);

            const cx = x + (this.width ? this.width / 2 : 0);
            const cy = y + (this.height ? this.height / 2 : 0);

            this.bleakwindStorm = {
                originX: cx,
                originY: cy,

                dirX: Math.cos(angle),
                dirY: Math.sin(angle),

                perpX: -Math.sin(angle),
                perpY: Math.cos(angle),

                distance: 0,

                amplitude: storm.amplitude ?? 18,
                wavelength: storm.wavelength ?? 95,

                phase: storm.phase ?? (Math.random() * Math.PI * 2),

                hitCooldown: storm.hitCooldown ?? 300,
                hitCooldowns: new WeakMap(),

                knockbacks: new Map()
            };

            this.enemy = null;
            this.lifeTime = Infinity;
        }

        this.forcedSplash = (this.tower?.pokemon?.item?.id === 'revysBook' && Math.random() < 0.15) ? true : false;
        if (this.tower?.pokemon?.item?.id === 'revysBook' && Math.random() < 0.15) this.ricochetsLeft += 2;

        this.trickOrTreat = extra?.trickOrTreat ?? null;

        if (!this.trickOrTreat && this.tower?.pokemon?.ability?.id === 'trickOrTreat') {
            const totProjectile = Math.floor(Math.random() * 100);

            let spriteData;

            if (totProjectile < 40) {
                spriteData = (totProjectile < 20) ? projectileData['candy'].sprite : projectileData['candy1'].sprite;
                this.trickOrTreat = 'curse';
                this.specialEffect = 'curse';
            } else if (totProjectile < 80) {
                spriteData = projectileData['spinarak'].sprite;
                this.trickOrTreat = 'poison';
                this.ricochetsLeft += 2;
            } else {
                spriteData = projectileData['apple'].sprite;
                this.trickOrTreat = 'splash';
            }

            this.frames = {
                max: spriteData.frames,
                current: 0,
                elapsed: 0,
                hold: 5,
                rows: 1,
                direction: 0
            };

            this.loaded = false;

            this.sprite.onload = () => {
                this.width = this.sprite.width / this.frames.max;
                this.height = this.sprite.height / this.frames.rows;
                this.loaded = true;
            };

            this.sprite.src = spriteData.image;
        }
    }

    update(deltaTime = 1000 / 60, shouldDraw = true) {
        shouldDraw = shouldDraw && !this.tower?._skipDraw;
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

            const cx = this.tower.center.x;
            const cy = this.tower.center.y;
            const enemies = this.tower.main.area.enemies;

            if (this.sacredFire) {
                let target = null;
                let minDistance = Infinity;

                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0 || enemy.invulnerable) continue;

                    if (
                        enemy.invisible &&
                        !(this.tower.revealInvisible || this.tower.targetMode === 'invisible')
                    ) {
                        continue;
                    }

                    const distanceToTower = Math.hypot(
                        enemy.center.x - cx,
                        enemy.center.y - cy
                    );

                    if (
                        distanceToTower <= this.tower.range &&
                        distanceToTower < minDistance
                    ) {
                        minDistance = distanceToTower;
                        target = enemy;
                    }
                }

                this.sacredFireTarget = target;

                let targetX;
                let targetY;

                if (!target) {
                    this.angle += this.angularSpeed * secs;

                    targetX = cx + Math.cos(this.angle) * this.orbitRadius;
                    targetY = cy + Math.sin(this.angle) * this.orbitRadius;
                }

                else {
                    targetX = target.center.x;
                    targetY = target.center.y;
                }

                const currentX = this.position.x + (this.width || 16) / 2;
                const currentY = this.position.y + (this.height || 16) / 2;

                const dx = targetX - currentX;
                const dy = targetY - currentY;
                const distance = Math.hypot(dx, dy);

                const moveSpeed = target ? 220 : 120;

                if (distance > 0.1) {
                    const move = Math.min(
                        distance,
                        moveSpeed * secs
                    );

                    this.position.x += (dx / distance) * move;
                    this.position.y += (dy / distance) * move;
                }

                this.center = {
                    x: this.position.x + (this.width || 16) / 2,
                    y: this.position.y + (this.height || 16) / 2
                };

                const maxRadius = Math.max(
                    0,
                    this.tower.range - Math.max(this.width || 16, this.height || 16) / 2
                );

                const fromTowerX = this.center.x - cx;
                const fromTowerY = this.center.y - cy;
                const fromTowerDistance = Math.hypot(
                    fromTowerX,
                    fromTowerY
                );

                if (fromTowerDistance > maxRadius) {
                    const nx = fromTowerX / fromTowerDistance;
                    const ny = fromTowerY / fromTowerDistance;

                    this.center.x = cx + nx * maxRadius;
                    this.center.y = cy + ny * maxRadius;

                    this.position.x =
                        this.center.x - (this.width || 16) / 2;

                    this.position.y =
                        this.center.y - (this.height || 16) / 2;
                }

                for (const enemy of enemies) {
                    if (!enemy || enemy.hp <= 0 || enemy.invulnerable) continue;

                    if (
                        enemy.invisible &&
                        !(this.tower.revealInvisible || this.tower.targetMode === 'invisible')
                    ) {
                        continue;
                    }

                    const hitRadius =
                        (this.width || 16) / 2 +
                        (enemy.radius ?? 8);

                    const distanceToEnemy = Math.hypot(
                        enemy.center.x - this.center.x,
                        enemy.center.y - this.center.y
                    );

                    if (distanceToEnemy <= hitRadius) {
                        const lastHit =
                            this.sacredFireLastHit.get(enemy) ?? -Infinity;

                        if (
                            this.simulatedTime - lastHit >=
                            this.orbitHitCooldown
                        ) {
                            this.tower.dealDirectDamage(enemy);

                            this.sacredFireLastHit.set(
                                enemy,
                                this.simulatedTime
                            );
                        }
                    }
                }

                if (shouldDraw) this.draw();

                return;
            }

            if (this.tower?.pokemon?.item?.id == 'inverter') this.angularSpeed = -1 * Math.abs(this.angularSpeed);
            else this.angularSpeed = Math.abs(this.angularSpeed);

            const arcPerFrame = Math.abs(this.angularSpeed) * secs * this.orbitRadius;

            const MAX_ARC_PER_STEP = 4;
            const steps = Math.max(
                1,
                Math.ceil(arcPerFrame / MAX_ARC_PER_STEP)
            );

            const subSecs = secs / steps;
            const hitRadius =  Math.max(6, (this.width || 6) / 2) + 2;

            for (let s = 0; s < steps; s++) {
                this.angle += this.angularSpeed * subSecs;

                this.position.x =
                    cx +
                    Math.cos(this.angle) * this.orbitRadius -
                    (this.width ? this.width / 2 : 0);

                this.position.y =
                    cy +
                    Math.sin(this.angle) * this.orbitRadius -
                    (this.height ? this.height / 2 : 0);

                this.center = {
                    x: this.position.x + (this.width ? this.width / 2 : 0),
                    y: this.position.y + (this.height ? this.height / 2 : 0)
                };

                for (const e of enemies) {
                    if (!e || e.hp <= 0 || e.invulnerable) continue;

                    if (this.tower?.ability?.id != 'hiddenPower') {
                        if (
                            e.invisible &&
                            !(this.tower.revealInvisible || this.tower.targetMode === 'invisible')
                        ) {
                            continue;
                        }
                    }

                    const dx = e.center.x - this.center.x;
                    const dy = e.center.y - this.center.y;
                    const dist = Math.hypot(dx, dy);

                    if (dist <= hitRadius) {
                        const last =
                            this.perEnemyLastHit.get(e) || 0;

                        if (
                            this.simulatedTime - last >=
                            this.orbitHitCooldown
                        ) {
                            this.tower.dealDirectDamage(e);
                            this.perEnemyLastHit.set(
                                e,
                                this.simulatedTime
                            );
                        }
                    }
                }
            }

            if (this.thunderDrive) {
                this.thunderDriveCooldown -= simDelta;

                if (this.thunderDriveCooldown <= 0) {
                    let target = null;
                    let minDistance = 150;

                    for (const e of enemies) {
                        if (!e || e.hp <= 0 || e.invulnerable) continue;

                        if (
                            e.invisible &&
                            !(this.tower.revealInvisible || this.tower.targetMode === 'invisible')
                        ) continue;

                        const towerDistance = Math.hypot(
                            e.center.x - cx,
                            e.center.y - cy
                        );

                        if (towerDistance > this.tower.range) continue;

                        const distance = Math.hypot(
                            e.center.x - this.center.x,
                            e.center.y - this.center.y
                        );

                        if (distance <= minDistance) {
                            minDistance = distance;
                            target = e;
                        }
                    }

                    if (target) {
                        this.tower.dealDirectDamage(target, 'physical', 'null', 0.2);

                        this.tower.voltSurgeChains.push({
                            points: [
                                {
                                    x: this.center.x,
                                    y: this.center.y
                                },
                                {
                                    x: target.center.x,
                                    y: target.center.y
                                }
                            ],
                            remaining: 260,
                            duration: 260
                        });

                        this.thunderDriveCooldown = 750;
                        if (!this.tower.main.mute[0]) playSound('paralyzed', 'effect')
                    }
                }
            }

            if (shouldDraw) this.draw();
            if (this.orbitDuration !== Infinity && this.age >= this.orbitDuration) this.markedForDeletion = true;
            return;
        }

        if (this.fairySingularity) {
            this.age += simDelta;
            this.simulatedTime += simDelta;

            if (!this.tower || !this.tower.center) {
                this.markedForDeletion = true;
                return;
            }

            const s = this.fairySingularity;

            if (s.phase === 'travel') {
                if (s.target && s.target.hp > 0) {
                    s.targetX = s.target.center.x;
                    s.targetY = s.target.center.y;
                }

                const currentX = this.position.x + (this.width ? this.width / 2 : 0);
                const currentY = this.position.y + (this.height ? this.height / 2 : 0);

                const dx = s.targetX - currentX;
                const dy = s.targetY - currentY;
                const dist = Math.hypot(dx, dy);

                const move = this.speed * secs;

                if (dist <= Math.max(move, 6)) {
                    this.position.x = s.targetX - (this.width ? this.width / 2 : 0);
                    this.position.y = s.targetY - (this.height ? this.height / 2 : 0);

                    this.center = {
                        x: s.targetX,
                        y: s.targetY
                    };

                    s.phase = 'waiting';
                    s.waitTimer = 0;
                } else {
                    this.position.x += (dx / dist) * move;
                    this.position.y += (dy / dist) * move;

                    this.center = {
                        x: this.position.x + (this.width ? this.width / 2 : 0),
                        y: this.position.y + (this.height ? this.height / 2 : 0)
                    };
                }

                if (shouldDraw) this.draw();

                return;
            }

            if (s.phase === 'waiting') {
                s.waitTimer += simDelta;

                this.center = {
                    x: s.targetX,
                    y: s.targetY
                };

                this.position.x =
                    s.targetX - (this.width ? this.width / 2 : 0);

                this.position.y =
                    s.targetY - (this.height ? this.height / 2 : 0);

                if (shouldDraw) {
                    this.draw();

                    const pulse = 1 + Math.sin(s.waitTimer * 0.012) * 0.12;

                    this.ctx.save();

                    this.ctx.globalCompositeOperation = 'lighter';

                    this.ctx.beginPath();
                    this.ctx.arc(
                        s.targetX,
                        s.targetY,
                        12 * pulse,
                        0,
                        Math.PI * 2
                    );

                    this.ctx.fillStyle = 'rgba(210, 100, 255, 0.20)';
                    this.ctx.fill();

                    this.ctx.beginPath();
                    this.ctx.arc(
                        s.targetX,
                        s.targetY,
                        18 * pulse,
                        0,
                        Math.PI * 2
                    );

                    this.ctx.strokeStyle = 'rgba(245, 180, 255, 0.45)';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();

                    this.ctx.restore();
                }

                if (s.waitTimer >= s.waitDuration) {
                    s.phase = 'pulling';
                    s.pullTimer = 0;
                    if (!this.tower.main.mute[0]) playSound('pull', 'effect')

                    // Explosión inicial
                    this.ctx.save();

                    this.ctx.globalCompositeOperation = 'lighter';

                    this.ctx.beginPath();
                    this.ctx.arc(
                        s.targetX,
                        s.targetY,
                        s.radius,
                        0,
                        Math.PI * 2
                    );

                    this.ctx.fillStyle = 'rgba(210, 100, 255, 0.18)';
                    this.ctx.fill();

                    this.ctx.restore();
                }

                return;
            }

            if (s.phase === 'pulling') {
                s.pullTimer += simDelta;

                const enemies = this.tower.main.area.enemies;

                for (const enemy of enemies) {
                    if (
                        !enemy ||
                        enemy.hp <= 0 ||
                        enemy.dead ||
                        enemy.dying ||
                        enemy.invulnerable ||
                        !enemy.canStun
                    ) {
                        continue;
                    }

                    if (
                        enemy.invisible &&
                        !(
                            this.tower.revealInvisible ||
                            this.tower.targetMode === 'invisible'
                        )
                    ) {
                        continue;
                    }

                    const dx = enemy.center.x - s.targetX;
                    const dy = enemy.center.y - s.targetY;
                    const distance = Math.hypot(dx, dy);

                    if (distance <= s.radius && distance > 2) {
                        const pullAmount = Math.min(
                            distance,
                            s.pullSpeed * secs
                        );

                        enemy.position.x -= (dx / distance) * pullAmount;
                        enemy.position.y -= (dy / distance) * pullAmount;

                        enemy.center.x -= (dx / distance) * pullAmount;
                        enemy.center.y -= (dy / distance) * pullAmount;
                    }
                }

                if (shouldDraw) {
                    this.draw();

                    const progress = Math.min(
                        1,
                        s.pullTimer / s.pullDuration
                    );

                    const radius =
                        s.radius * (1 - progress * 0.35);

                    this.ctx.save();

                    this.ctx.globalCompositeOperation = 'lighter';

                    this.ctx.beginPath();
                    this.ctx.arc(
                        s.targetX,
                        s.targetY,
                        radius,
                        0,
                        Math.PI * 2
                    );

                    this.ctx.strokeStyle =
                        `rgba(210, 100, 255, ${0.45 * (1 - progress)})`;

                    this.ctx.lineWidth = 4;
                    this.ctx.stroke();

                    this.ctx.restore();
                }

                if (s.pullTimer >= s.pullDuration) {
                    const explosionRadius = s.radius;
                    if (!this.tower.main.mute[3]) playSound('area4', 'effect');

                    for (const enemy of this.tower.main.area.enemies) {
                        if (
                            !enemy ||
                            enemy.hp <= 0 ||
                            enemy.dead ||
                            enemy.dying ||
                            enemy.invulnerable
                        ) {
                            continue;
                        }

                        if (
                            enemy.invisible &&
                            !(
                                this.tower.revealInvisible ||
                                this.tower.targetMode === 'invisible'
                            )
                        ) {
                            continue;
                        }

                        const dx = enemy.center.x - s.targetX;
                        const dy = enemy.center.y - s.targetY;
                        const distance = Math.hypot(dx, dy);

                        if (distance <= explosionRadius) {
                            this.tower.dealDirectDamage(enemy);
                        }
                    }

                    this.markedForDeletion = true;
                }

                return;
            }
        }

        if (this.bonemerang) {
            this.age += simDelta;
            this.simulatedTime += simDelta;

            if (!this.tower || !this.tower.center) {
                this.markedForDeletion = true;
                return;
            }

            const b = this.bonemerang;
            const enemies = this.tower.main.area.enemies;

            const stepDist = this.speed * secs;
            const stepSize = 6;
            const steps = Math.max(1, Math.ceil(stepDist / stepSize));
            const subDist = stepDist / steps;

            for (let s = 0; s < steps; s++) {
                if (b.phase === 'out') {
                    if (!b.target || b.target.hp <= 0) {
                        b.phase = 'back';
                    } else {
                        const curX = this.position.x + (this.width ? this.width / 2 : 0);
                        const curY = this.position.y + (this.height ? this.height / 2 : 0);

                        const ddx = b.target.center.x - curX;
                        const ddy = b.target.center.y - curY;
                        const ddist = Math.hypot(ddx, ddy);

                        const arriveRadius = Math.max(
                            (b.target.radius ?? 6) + 2,
                            (b.target.width ?? 16) / 2,
                            8
                        );

                        if (ddist <= arriveRadius) {
                            const dist = ddist || 1;
                            b.phase = 'overshoot';
                            b.overshootDirX = ddx / dist;
                            b.overshootDirY = ddy / dist;
                            b.overshootLeft = 50;
                        } else {
                            const move = Math.min(subDist, ddist);
                            this.position.x += (ddx / ddist) * move;
                            this.position.y += (ddy / ddist) * move;
                        }
                    }
                }

                if (b.phase === 'overshoot') {
                    const move = Math.min(subDist, b.overshootLeft);
                    this.position.x += b.overshootDirX * move;
                    this.position.y += b.overshootDirY * move;
                    b.overshootLeft -= move;

                    if (b.overshootLeft <= 0) b.phase = 'back';
                }

                if (b.phase === 'back') {
                    const curX = this.position.x + (this.width ? this.width / 2 : 0);
                    const curY = this.position.y + (this.height ? this.height / 2 : 0);

                    const ddx = this.tower.center.x - curX;
                    const ddy = this.tower.center.y - curY;
                    const ddist = Math.hypot(ddx, ddy);

                    if (ddist <= 8) {
                        this.markedForDeletion = true;
                        break;
                    }

                    const move = Math.min(subDist, ddist);
                    this.position.x += (ddx / ddist) * move;
                    this.position.y += (ddy / ddist) * move;
                }

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

                    const hitRadius = Math.max(
                        (e.radius ?? 6) + 4,
                        (e.width ?? 16) / 2,
                        10
                    );

                    if (dist <= hitRadius) {
                        const last = b.hitCooldowns.get(e) || 0;
                        if (this.simulatedTime - last >= b.hitCooldown) {
                            this.tower.dealDirectDamage(e);
                            b.hitCooldowns.set(e, this.simulatedTime);
                        }
                    }
                }

                if (this.markedForDeletion) break;
            }

            if (shouldDraw) this.draw();

            if (this.age >= 6000) this.markedForDeletion = true; 

            return;
        }

        if (this.bleakwindStorm) {
            const s = this.bleakwindStorm;

            for (const [enemy, knockback] of s.knockbacks) {
                if (!enemy || enemy.hp <= 0) {
                    s.knockbacks.delete(enemy);
                    continue;
                }

                const pushSpeed = 50; // píxeles por segundo
                const amount = Math.min(
                    knockback.remaining,
                    pushSpeed * secs
                );

                enemy.position.x += knockback.dirX * amount;
                enemy.position.y += knockback.dirY * amount;

                if (enemy.center) {
                    enemy.center.x += knockback.dirX * amount;
                    enemy.center.y += knockback.dirY * amount;
                }

                knockback.remaining -= amount;

                if (knockback.remaining <= 0) {
                    s.knockbacks.delete(enemy);
                }
            }

            this.age += simDelta;
            this.simulatedTime += simDelta;

            const stepDist = this.speed * secs;

            const stepSize = 5;
            const steps = Math.max(1, Math.ceil(stepDist / stepSize));
            const subDist = stepDist / steps;

            const area = this.tower?.main?.area;

            const mapW = area?.width ?? this.ctx?.canvas?.width ?? 720;
            const mapH = area?.height ?? this.ctx?.canvas?.height ?? 624;

            const boundaryMargin = Math.max(
                40,
                s.amplitude + Math.max(this.width || 0, this.height || 0)
            );

            for (let step = 0; step < steps; step++) {
                const prevX = this.center?.x ??
                    (this.position.x + (this.width || 0) / 2);

                const prevY = this.center?.y ??
                    (this.position.y + (this.height || 0) / 2);

                s.distance += subDist;

                const wave = Math.sin(
                    (s.distance / s.wavelength) * Math.PI * 2 + s.phase
                );

                const newX =
                    s.originX +
                    s.dirX * s.distance +
                    s.perpX * s.amplitude * wave;

                const newY =
                    s.originY +
                    s.dirY * s.distance +
                    s.perpY * s.amplitude * wave;

                this.position.x =
                    newX - (this.width ? this.width / 2 : 0);

                this.position.y =
                    newY - (this.height ? this.height / 2 : 0);

                this.center = {
                    x: newX,
                    y: newY
                };

                this.velocity.x = newX - prevX;
                this.velocity.y = newY - prevY;

                const enemies = area?.enemies ?? [];

                for (const e of enemies) {
                    if (!e || e.hp <= 0 || e.invulnerable) continue;

                    if (
                        e.invisible &&
                        !(this.tower?.revealInvisible ||
                          this.tower?.targetMode === 'invisible')
                    ) {
                        continue;
                    }

                    const hitRadius = Math.max(
                        (e.radius ?? 6) + 10,
                        (e.width ?? 16) / 2 + 8,
                        14
                    );

                    const dx = e.center.x - newX;
                    const dy = e.center.y - newY;

                    if (Math.hypot(dx, dy) <= hitRadius) {
                        const lastHit = s.hitCooldowns.get(e) ?? -Infinity;

                        if (this.simulatedTime - lastHit >= s.hitCooldown) {
                            const previousEnemy = this.enemy;

                            this.enemy = e;

                            this.processImpact();

                            if (this.tower?.ability?.id === 'bleakwindStorm') {
                                const moveX = newX - prevX;
                                const moveY = newY - prevY;
                                const moveDist = Math.hypot(moveX, moveY) || 1;

                                const knockbackDirX = moveX / moveDist; // DIRECCION
                                const knockbackDirY = moveY / moveDist; // DIRECCION

                                s.knockbacks.set(e, {
                                    remaining: 15, // EMPUJE
                                    dirX: knockbackDirX,
                                    dirY: knockbackDirY
                                });
                            }

                            this.markedForDeletion = false;
                            this.impacting = false;

                            if (this.pulse) {
                                this.pulse.active = false;
                            }

                            this.velocity.x = newX - prevX;
                            this.velocity.y = newY - prevY;

                            this.enemy = previousEnemy;

                            s.hitCooldowns.set(e, this.simulatedTime);
                        }
                    }
                }

                if (
                    newX < -boundaryMargin ||
                    newX > mapW + boundaryMargin ||
                    newY < -boundaryMargin ||
                    newY > mapH + boundaryMargin
                ) {
                    this.markedForDeletion = true;
                    break;
                }
            }

            if (!this.markedForDeletion && shouldDraw) {
                this.draw();
            }

            return;
        }
        // POR SI ACASO *** < BORRAR EL OTRO DESPUES DE TESTEAR
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

            if (shouldDraw) {
            this.ctx.save();

            this.ctx.beginPath();
            this.ctx.arc(
                sp.x,
                sp.y,
                sp.radius,
                0,
                Math.PI * 2
            );

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

            if (
                sp.radius >= sp.maxRadius ||
                sp.alpha <= 0
            ) {
                this.markedForDeletion = true;
            }

            return;
        }

        if ((!this.enemy || this.enemy.hp <= 0) && this.tower) {
            const fallbackSource = { center: this.position || { x: this.position?.x ?? 0, y: this.position?.y ?? 0 } };
            const newTarget = this.tower.findClosestEnemy(this.tower, this.tower.range || 100);
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

        this.age += simDelta;
        if (this.age >= this.lifeTime) {
            this.markedForDeletion = true;
            return;
        }

        // POR SI ACASO *** 
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

        // if (this.impacting) {
        //     if (!this.ctx) {
        //         this.markedForDeletion = true;
        //         return;
        //     }
            
        //     const sp = this.pulse;
        //     if (!sp || !sp.active) {
        //         this.markedForDeletion = true;
        //         return;
        //     }

        //     this.ctx.beginPath();
        //     this.ctx.arc(sp.x, sp.y, sp.radius, 0, Math.PI * 2);

        //     const hex = (sp.color || '#ffffff').replace('#', '');
        //     const r = parseInt(hex.substring(0, 2), 16) || 255;
        //     const g = parseInt(hex.substring(2, 4), 16) || 255;
        //     const b = parseInt(hex.substring(4, 6), 16) || 255;

        //     this.ctx.fillStyle = `rgba(${r},${g},${b},${sp.alpha})`;
        //     this.ctx.fill();

        //     sp.radius += sp.speed * frameFactor;
        //     sp.alpha -= 0.04 * frameFactor;

        //     if (sp.radius >= sp.maxRadius || sp.alpha <= 0) {
        //         this.markedForDeletion = true;
        //     }
        //     return; 
        // }

        if (this.spiral) {
            const targetX = this.enemy.center.x;
            const targetY = this.enemy.center.y;

            const dx = targetX - this.spiral.originX;
            const dy = targetY - this.spiral.originY;
            const totalDist = Math.hypot(dx, dy) || 1;

            this.spiral.progress = Math.min(1, this.spiral.progress + (this.speed / totalDist) * secs);
            this.spiral.angle += this.spiral.angularSpeed * secs;

            const normX = dx / totalDist;
            const normY = dy / totalDist;

            const axisX = this.spiral.originX + normX * totalDist * this.spiral.progress;
            const axisY = this.spiral.originY + normY * totalDist * this.spiral.progress;

            const perp1X = -normY;
            const perp1Y =  normX;
 
            const dot = normY; 
            let perp2X = 0 - normX * dot;
            let perp2Y = 1 - normY * dot;
            const perp2Len = Math.hypot(perp2X, perp2Y) || 1;
            perp2X /= perp2Len;
            perp2Y /= perp2Len;

            const radius = this.spiral.radius * (1 - this.spiral.progress);

            const cosA = Math.cos(this.spiral.angle);
            const sinA = Math.sin(this.spiral.angle);

            const offX = (perp1X * cosA + perp2X * sinA) * radius;
            const offY = (perp1Y * cosA + perp2Y * sinA) * radius;

            const newX = axisX + offX;
            const newY = axisY + offY;

            this.position.x = newX - (this.width ? this.width / 2 : 0);
            this.position.y = newY - (this.height ? this.height / 2 : 0);
            this.center = { x: newX, y: newY };

            this.velocity.x = newX - (this._lastSpiralX ?? newX);
            this.velocity.y = newY - (this._lastSpiralY ?? newY);
            this._lastSpiralX = newX;
            this._lastSpiralY = newY;

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

        const angle = Math.atan2(
            this.enemy.center.y - (this.center?.y ?? (this.position.y + (this.height ? this.height/2 : 0))),
            this.enemy.center.x - (this.center?.x ?? (this.position.x + (this.width ? this.width/2 : 0)))
        );

        const vx = Math.cos(angle) * this.speed; 
        const vy = Math.sin(angle) * this.speed; 

        const totalDx = vx * secs;
        const totalDy = vy * secs;
        const moveDist = Math.hypot(totalDx, totalDy);

        const hitRadius = Math.max(
            (this.enemy.radius ?? 6) + 2,
            (this.enemy.width ?? 16) / 2,   
            8                                
        );

        const stepSize = Math.max(2, hitRadius * 0.5);

        const steps = Math.max(1, Math.ceil(moveDist / stepSize));

        let collided = false;

        for (let s = 0; s < steps; s++) {
            this.position.x += totalDx / steps;
            this.position.y += totalDy / steps;

            this.center = {
                x: this.position.x + (this.width ? this.width / 2 : 0),
                y: this.position.y + (this.height ? this.height / 2 : 0)
            };

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

        if (!collided && !this.impacting && shouldDraw) {
            this.draw();
        }

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

        this.ctx.save();
        this.ctx.globalAlpha *= this.tower?.getEffectOpacity?.('projectiles') ?? 1;

        this.ctx.translate(
            this.position.x + this.width / 2,
            this.position.y + this.height / 2
        );

        if (!this.bleakwindStorm) {
            const angle = Math.atan2(this.velocity.y, this.velocity.x);
            this.ctx.rotate(angle);
        }

        this.ctx.shadowBlur = 5;
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
        if (this.tower?.ability?.id === 'shadowTag') {
            this.tower.createShadowTag(this.enemy);
            this.markedForDeletion = true;
            if (!this.tower.main.mute[0]) playSound('shadowTag', 'effect');
            return;
        }
        // efectos de impacto
        if (
            this.tower?.ability?.id === 'curse' || 
            this.tower?.ability?.id === 'magicBounce' || 
            this.tower?.ability?.id === 'curseDoubleShot' || 
            this.tower?.ability?.id === 'curseSplash' ||
            this.trickOrTreat === 'curse'
        ) {
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
            let starDamage = this.tower.main.player.stars;
            if (this.tower?.pokemon?.favorite) starDamage++;
            if (this.tower?.pokemon?.isShiny) starDamage++;
            if (this.tower?.pokemon?.item?.id == 'starCandy') starDamage++;
            if (this.tower?.main.area.hugePower) starDamage += 50;
            this.tower.main.team.pokemon.forEach((poke) => {
                if (poke.id == 32) starDamage ++;
                if (poke.id == 148) starDamage ++;
            })
            starDamage = Math.ceil(starDamage * 0.33)

            finalDamage += starDamage;
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

        if (this.tower?.ability?.id === 'focusEnergy') {
            if (this.tower.main.area.focusEnergyUsers[this.tower.pokemon.id] === undefined) this.tower.main.area.focusEnergyUsers[this.tower.pokemon.id] = 1;
            else if (this.tower.main.area.focusEnergyUsers[this.tower.pokemon.id] < 20) this.tower.main.area.focusEnergyUsers[this.tower.pokemon.id]++;

            if (this.tower.main.area.speedBoostUsers[this.tower.pokemon.id] > 20) this.tower.main.area.speedBoostUsers[this.tower.pokemon.id] = 20;
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
                }
            }
        }

        if (this.tower?.pokemon?.item?.id == 'loadedDice') {
            let bonus = 1 + (this.ricochetsLeft * 0.6);
            finalDamage = Math.ceil(finalDamage * bonus);
        }

        if (this.tower?.pokemon?.ability?.id == 'makeItRain') {
            let goldPerDigit = (this.tower?.pokemon?.item?.id == 'amuletCoin') ? 0.15 : 0.075
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

        if (this.tower?.ability?.id === 'meteorMash') {
            let mmBonus = (this.tower.main.area.meteorMashUsers[this.tower.pokemon.id] == undefined) ? 0 : this.tower.main.area.meteorMashUsers[this.tower.pokemon.id];
            finalDamage += Math.floor(finalDamage * mmBonus * 0.2);    
        }

        if (this.tower?.ability?.id === 'electroBall') finalDamage = Math.max(finalDamage, Math.floor(finalDamage * (this.age/2000)));
        if (this.tower?.pokemon?.item?.id == 'hardStone') finalDamage += Math.floor(finalDamage * 0.25);
        if (this.tower?.pokemon?.item?.id == 'clawFossil') finalDamage += Math.floor(finalDamage * (this.tower.main.player.fossilInTeam * 0.1));
        if (this.tower?.pokemon?.item?.id == 'cellBattery') finalDamage += Math.floor(finalDamage * 0.5);

        if (     
            this.tower?.pokemon?.item?.id == 'thickClub' || 
            this.tower?.pokemon?.item?.id == 'lightBall' || 
            this.tower?.pokemon?.item?.id == 'metalPowder' || 
            this.tower?.pokemon?.item?.id == 'lifeOrb' 
        ) finalDamage += Math.ceil(this.power * 0.5);

        if (this.tower?.pokemon?.item?.id ==  'nanabBerry') {
            finalDamage += (this.tower.main.area.unnerve) ? Math.ceil(this.power * 0.55) : Math.ceil(this.power * 0.5);
        }

        if (this.tower?.pokemon?.item?.id == 'eviolite') finalDamage += Math.ceil(this.power / 5);

        if (this.tower?.ability?.id == 'amnesia' && this.tower.amnesiaStacks > 0) {
            finalDamage *= (this.tower.amnesiaStacks + 1);
            this.tower.amnesiaStacks = 0;
        }

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

        if (this.tower?.ability?.id === 'berserk' && this.tower?.main.player.health[this.tower.main.area.routeNumber] <= 7) {
            finalDamage += Math.ceil(finalDamage / 2);
        }

        if (this.tower?.ability?.id === 'berserkMega') {
            finalDamage += Math.ceil(finalDamage * this.tower?.main.area.hitsReceived * 0.2);
        }

        if (this.tower?.main.area.shellSmashActive && this.tower?.ability?.id === 'shellSmash') {
            finalDamage = Math.ceil(finalDamage * 1.5);
        }

        if (this.tower.ability?.id === 'hugePower') {
            finalDamage = Math.ceil(finalDamage * 2);
        }

        if (this.tower?.main.area.hugePower && (this.tower?.pokemon?.rangeType == 'star' || this.tower?.pokemon?.item?.id === 'starPiece')) {
            finalDamage = Math.ceil(finalDamage * 1.15);
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

        if (this.tower?.carriedBy == 'mount' && this.tower?.ability?.id === 'supremeCommanders') {
            finalDamage = Math.ceil(finalDamage * 1.5);
            critical += 30;
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

        if (this.tower?.pokemon?.item?.id == 'rosesItem') critical -= 30;

        if (this.tower?.pokemon?.item?.id == 'noxDex') critical += 1;

        if (this.tower?.ability?.id  === 'sandVeil' && ['sandstorm', 'sandAvalanche'].includes(this.tower?.main?.area?.weather)) {
            critical += critical * 0.15;
        }

        if (this.tower?.ability?.id  === 'grimNeigh' || this.tower?.carriedBy === 'grimNeigh') {
            critical += this.tower?.main?.area?.defeatedEnemiesWave;
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

        if (this.tower?.ability?.id === 'moxie') {
            if (this.tower.main.area.moxieUsers[this.tower.pokemon.id] != undefined) {
                finalDamage += Math.floor(finalDamage * this.tower.main.area.moxieUsers[this.tower.pokemon.id] * 0.05);
                if (this.tower?.pokemon?.item?.id == 'blackGlasses') finalDamage += Math.floor(finalDamage * this.tower.main.area.moxieUsers[this.tower.pokemon.id] * 0.05);        
            }
        }

        if (this.tower?.ability?.id === 'whiteRay') {
            finalDamage += Math.floor(finalDamage * this.tower?.main?.area?.defeatedEnemiesWaveByUB * 0.01);
        }

        if (this.tower?.ability?.id  === 'sandForce' && ['sandstorm', 'sandAvalanche'].includes(this.tower?.main?.area?.weather)) {
            finalDamage = Math.ceil(finalDamage * 1.5);   
        }

        if (this.tower?.ability?.id  === 'sandVeil' && ['sandstorm', 'sandAvalanche'].includes(this.tower?.main?.area?.weather)) {
            finalDamage = Math.ceil(finalDamage * 1.15);  
        }

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

        if (this.tower?.pokemon.ability.id == 'lightningRod') {
            finalDamage += Math.ceil(finalDamage * this.tower.lightningRodCharge/10);
        }

        if (
            this.tower.main.area.weather == 'rain' &&
            (this.tower?.tile.land == 3 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'squirtBottle') || this.tower?.carriedBy == 'icePlatform')
        ) {
            finalDamage = Math.ceil(finalDamage * 1.2);
        }

        if (
            this.tower.main.area.weather == 'thunderStorm' &&
            (this.tower?.tile.land == 3 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'squirtBottle') || this.tower?.carriedBy == 'icePlatform')
        ) {
            finalDamage = Math.ceil(finalDamage * 1.25);
        }

        if (
            this.tower.main.area.weather == 'heavyRain' && this.pokemon?.item?.id != 'safetyGoggles' &&
            (this.tower?.tile.land == 3 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'squirtBottle') || this.tower?.carriedBy == 'icePlatform')
        ) {
            if (!this.tower.main.area.cloudNine) {
                finalDamage = Math.ceil(finalDamage * 0.5);
            }
        }

        if (
            this.tower?.pokemon.ability.id == 'drySkin' &&
            (this.tower.main.area.weather == 'extremelyHarshSunlight' || this.tower.main.area.weather == 'harshSunlight') && 
            (this.tower?.tile.land == 2 || (this.tower?.tile.land == 1 && this.tower?.pokemon?.item?.id == 'fertiliser') || this.tower?.carriedBy == 'grassPlatform')
        ) {
            finalDamage = (this.tower.main.area.weather == 'extremelyHarshSunlight') ? Math.ceil(finalDamage * 3) : Math.ceil(finalDamage * 2)
        }

        if (this.tower?.pokemon?.ability.id === 'supremeOverlord') {
            let soMultiplier = (10 - this.tower.main.team.pokemon.length) * 10;
            finalDamage += Math.ceil((finalDamage * soMultiplier)/100);
            critical += (10 - this.tower.main.team.pokemon.length) * 5;
        }

        if (this.tower.criticalAura) critical += 20;
        if (this.tower.genesisAura) critical += 5;

        if (this.tower?.ability?.id == 'auroraVeil' && this.tower?.main?.area?.weather == 'hail') critical += 40;
        
        if (this.tower?.pokemon?.item?.id == 'direHit') critical += (this.tower?.ability?.id == 'simple') ? 43.8 : 25;
        if (this.tower?.pokemon?.item?.id == 'expertBelt' || this.tower?.pokemon?.item?.id == 'iron') critical += (this.tower?.ability?.id == 'simple') ? 17.5 : 10;
        if ((this.tower?.pokemon?.item?.id == 'lansatBerry' || this.tower?.pokemon?.item?.id == 'berryPouch') && this.tower?.lansatBerryTimer > 0) {
            if (this.tower?.ability?.id == 'simple') {
                critical += (this.tower.main.area.unnerve) ? 116 : 105;
            } else {
                if (this.tower?.ability?.id == 'ripen') critical += (this.tower.main.area.unnerve) ? 132 : 120;
                else critical += (this.tower.main.area.unnerve) ? 66 : 60;
            }
            
        }

        if (this.tower?.ability?.id == 'chatter') {
            if (this.tower?.pokemon?.item?.id == 'bicycle') {
                critical += 40;
            }
            const x = JSON.parse(window.localStorage.getItem("data")).config.audio['effects'];
            const r = 1 - x / 20;
            finalDamage -= Math.floor(finalDamage*r);
        }

        if (this.tower?.ability?.id == 'focusEnergy') critical += (5 * this.tower?.main?.area?.focusEnergyUsers[this.tower?.pokemon?.id]);

        if (this.tower?.ability?.id == 'flowerTrick' || this.tower?.ability?.id == 'armaldo') critical = Math.min(95, critical);

        if ((Math.random() * 100) < critical && (this.tower?.pokemon?.item?.id != 'blueBandana' || this.tower?.ability?.id == 'contrary')) {
            isCritical = true;
            let multiplier = (this.tower?.ability?.id === 'superCritical') ? 2.0 : 1.5;
            if (this.tower?.pokemon?.item?.id === 'leek') multiplier *= 2;
            if (this.tower.criticalDamageAura) multiplier *= 1.5;
            if (this.tower?.pokemon?.item?.id == 'clover') multiplier *= (this.tower?.ability?.id == 'simple') ? 2.625 : 1.5;
            if (this.tower?.main?.area?.weather == 'hail') {
                if (this.tower?.main?.area?.iceBodyActivated && this.tower?.main?.area?.iceBody) multiplier *= 1.5;
                else multiplier *= 1.25;
            }
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

        if (this.extra?.multPower) finalDamage = Math.ceil(finalDamage * this.extra?.multPower);
        
        this.enemy.getDamaged(finalDamage, 'physical', this.tower?.pokemon?.ability, isCritical, new Set(), this.tower.pokemon, this.tower, false, false, this.specialEffect);
        if (this.tower?.ability?.id === 'supersonic') this.tower.createSupersonicWaves(this.enemy);
        // if (this.tower?.ability?.id === 'icyWind') {
        //     const enemies = this.tower.main.area.enemies;

        //     const dx = this.enemy.center.x - this.tower.center.x;
        //     const dy = this.enemy.center.y - this.tower.center.y;
        //     const direction = Math.atan2(dy, dx);

        //     const coneHalfAngle = Math.PI / 4; // 90° total
        //     const revealInvisible =
        //         this.tower.revealInvisible ||
        //         this.tower.targetMode === 'invisible';

        //     for (const enemy of enemies) {
        //         if (
        //             !enemy ||
        //             enemy === this.enemy ||
        //             enemy.hp <= 0 ||
        //             enemy.invulnerable
        //         ) continue;

        //         if (enemy.invisible && !revealInvisible) continue;

        //         const ex = enemy.center.x - this.tower.center.x;
        //         const ey = enemy.center.y - this.tower.center.y;

        //         const distance = Math.hypot(ex, ey);

        //         if (distance > this.tower.range || distance <= 0) continue;

        //         let angle = Math.atan2(ey, ex) - direction;

        //         while (angle > Math.PI) angle -= Math.PI * 2;
        //         while (angle < -Math.PI) angle += Math.PI * 2;

        //         if (Math.abs(angle) <= coneHalfAngle) {
        //             enemy.getDamaged(
        //                 finalDamage,
        //                 'physical',
        //                 this.tower?.pokemon?.ability,
        //                 isCritical,
        //                 new Set(),
        //                 this.tower.pokemon,
        //                 this.tower
        //             );
        //         }
        //     }
        // }
        
        if (this.tower?.pokemon?.item?.id === 'revysBook' && this.enemy) {
            this.enemy.spinRemaining = 400;
            this.enemy.spinAngle = 0;
        }

        if (this.tower?.pokemon?.item?.id === 'amuletCoin') {
            let g = Math.ceil(finalDamage * 0.0005 * this.tower.main.player.stars);
            this.tower.main.area.goldWave += g;
            this.tower.main.player.changeGold(g);
        }

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
            if (this.enemy.canBurn) {
                statusPool.push(() => this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon));
                statusPool.push(() => this.enemy.applyStatusEffect({ type: 'scorch', damagePercent: 0.01, duration: 10 }, this.tower.pokemon));
            }
            if (this.enemy.canStun) {
                statusPool.push(() => {
                    this.enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
                });
            }
            if (this.enemy.canSlow) {
                statusPool.push(() => {
                    this.enemy.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
                });
            }
            statusPool.push(() => this.enemy.applyStatusEffect({ type: 'curse' }));
            statusPool.push(() => this.enemy.applyStatusEffect({ type: 'nightmare', damage: null, stacks: 1 }, this.tower.pokemon));
            if (this.enemy.canPoison) statusPool.push(() => this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon));
            if (statusPool.length === 0) return;
            const randomIndex = Math.floor(Math.random() * statusPool.length);
            statusPool[randomIndex]();
        }

        if (this.tower?.ability?.id === 'fireBlast' || (this.enemy.canBurn && (
            this.tower?.ability?.id === 'burn' || (this.tower?.ability?.id === 'flamethrower' && Math.random() < 0.1) || 
            this.tower?.ability?.id === 'magmaStorm' || 
            this.tower?.ability?.id === 'burnSplash' || 
            this.tower?.ability?.id === 'burnDoubleShot' || 
            this.tower?.pokemon?.item?.id == 'scovillainSiracha' ||
            (this.tower?.ability?.id === 'drought' && Math.random() < 0.1) ||
            (this.tower?.pokemon?.item?.id  == 'koffingJelly' && this.tower?.pokemon?.id === 56)
            ))
        ) {
            if (this.tower?.pokemon?.item?.id == 'magmaStone') this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.tower.pokemon);
            else if (this.tower?.pokemon?.item?.id == 'falmeOrb') this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.tower.pokemon);
            else this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);     
        }

        if (this.enemy.canBurn && this.tower?.ability?.id === 'spicySpray')  {
            if (this.enemy.burnedBy != null) this.enemy.applyStatusEffect({ type: 'scorch', damagePercent: 0.01, duration: 10}, this.tower.pokemon);
            else this.enemy.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);     
        }

        if (this.enemy.canPoison && 
            (
                this.tower?.ability?.id === 'poison' || this.tower?.ability?.id === 'direClaw' || this.trickOrTreat === 'poison' ||
                this.tower?.ability?.id === 'poisonDoubleShot' ||  this.tower?.ability?.id === 'toxic' ||
                this.tower?.pokemon?.item?.id  == 'koffingJelly' ||
                (this.tower?.pokemon?.item?.id  == 'scovillainSiracha' && this.tower?.ability?.id === 'burnDoubleShot')
            )) {
            this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
            if (this.tower?.pokemon?.item?.id  == 'toxicOrb' || (this.tower?.pokemon?.item?.id == 'poisonBarb' && Math.random() < 0.5)) this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
            if (isCritical && this.tower?.ability?.id === 'direClaw')  this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
            if (this.tower?.ability?.id === 'toxic') this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
        }

        if (this.enemy.canPoison && this.tower?.ability?.id === 'twineedle' && Math.random() < 0.5) {
            this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
            if (this.tower?.pokemon?.item?.id  == 'toxicOrb' || (this.tower?.pokemon?.item?.id == 'poisonBarb' && Math.random() < 0.5)) this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
            if (isCritical && this.tower?.ability?.id === 'direClaw')  this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
        }

        if (this.enemy.canPoison && this.tower?.ability?.id === 'twineedleMega' && Math.random() < 0.33) {
            this.enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, this.tower.pokemon);
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

        if (
            (this.enemy.canStun || this.tower?.pokemon?.item?.id === 'bindingBand') && 
            (
                this.tower?.ability?.id === 'electroBall'
            )
        ) {
            (this.tower?.pokemon?.item?.id == 'lightClay') ? this.enemy.applyStatusEffect({ type: 'stun', duration: 2.2 }) : this.enemy.applyStatusEffect({ type: 'stun',  duration: 2 });
        }

        if (this.enemy.canStun && (this.tower?.ability?.id === 'stunMono' || this.tower?.ability?.id === 'icicleSpear')) {
            if (Math.random() < 0.3) {
                (this.tower?.pokemon?.item?.id == 'lightClay') ? this.enemy.applyStatusEffect({ type: 'stun', duration: 2.2 }) : this.enemy.applyStatusEffect({ type: 'stun', duration: 2 });
            }
        }
        if (this.enemy.canStun && this.tower?.ability?.id === 'stunMonoNerf') {
            if (this.tower?.pokemon?.item?.id == 'cellBattery') this.enemy.applyStatusEffect({ type: 'stun', duration: 0.1 });
            else if (Math.random() < 0.05) {
                (this.tower?.pokemon?.item?.id == 'lightClay') ? this.enemy.applyStatusEffect({ type: 'stun', duration: 1.65 }) : this.enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
            }
        }

        if (this.enemy.canStun && this.tower?.ability?.id === 'static') {
            if (Math.random() < 0.075) {
                (this.tower?.pokemon?.item?.id == 'lightClay') ? this.enemy.applyStatusEffect({ type: 'stun', duration: 1.65 }) : this.enemy.applyStatusEffect({ type: 'stun', duration: 1.5 });
            }
        }

        if (this.tower?.ability?.id === 'nightmare') {
            this.enemy.applyStatusEffect({ type: 'nightmare', damage: null, stacks: 1 }, this.tower.pokemon);
        }

        if (this.tower?.ability?.id === 'bugBite') {
            let berryField = null;

            if (this.tower?.pokemon?.item?.id === 'salacBerry') {
                this.tower.salacBerryTimer = (this.tower.main.area.harvest) ? 36000 : 18000;
                berryField = 'salacBerryTimer';
            } else if (this.tower?.pokemon?.item?.id === 'liechiBerry') {
                this.tower.liechiBerryTimer = (this.tower.main.area.harvest) ? 36000 : 18000;
                berryField = 'liechiBerryTimer';
            } else if (this.tower?.pokemon?.item?.id === 'lansatBerry') {
                this.tower.lansatBerryTimer = (this.tower.main.area.harvest) ? 36000 : 18000;
                berryField = 'lansatBerryTimer';
            } else if (this.tower?.pokemon?.item?.id === 'starfBerry') {
                this.tower.starfBerryTimer = (this.tower.main.area.harvest) ? 36000 : 18000;
                berryField = 'starfBerryTimer';
            }

            if (berryField && this.tower.isPassenger) {
                const baseTower = this.tower.main.area.towers.find(bt => bt.tile === this.tower.tile && !bt.isPassenger);
                if (baseTower?.pokemon?.item?.id === 'berryPouch') {
                    baseTower[berryField] = this.tower[berryField];
                }
            }
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
                this.tower?.ability?.id === 'splash' ||  this.tower?.ability?.id === 'naturesJudgement' || this.tower?.ability?.id === 'auraSphere' || 
                this.tower?.ability?.id === 'pollenPuff' || this.tower?.ability?.id === 'slowSplash' || this.tower?.ability?.id === 'hyperDrill' || 
                this.tower?.ability?.id === 'burnSplash' || this.tower?.ability?.id === 'magmaStorm' || this.tower?.ability?.id === 'electroBall' ||
                this.tower?.ability?.id === 'armorBreakSplash' || this.tower?.ability?.id === 'autotomize' ||
                this.tower?.ability?.id === 'synchronySplash' || this.tower?.ability?.id === 'fireBlast' ||
                this.tower?.ability?.id ==='curseSplash' ||
                this.tower?.ability?.id === 'armorCannon' ||
                this.trickOrTreat === 'splash' ||
                this.tower?.pokemon?.item?.id == 'sprayduck' ||
                this.tower?.lightningRodCharge === 10 || 
                this.forcedSplash
            ) && this.tower?.pokemon?.item?.id != "weaknessPolicy"
        ) {
            let splashRadius = 65;

            if (this.tower?.pokemon?.item?.id == "dragonFang") splashRadius = 195;
            if (this.tower?.lightningRodCharge == 10) splashRadius = 150;
            if (this.tower?.ability?.id === 'auraSphere') splashRadius += 6.5 * (Math.abs(this.tower.main.player.health[this.tower.main.area.routeNumber] - 14));
            if (this.tower?.ability?.id === 'pollenPuff') 
                splashRadius += (this.tower?.pokemon?.item?.id == 'nectar') ? this.tower.main.area.honeyGather * 3 : this.tower.main.area.honeyGather;
            if (this.tower?.ability?.id === 'autotomize') 
                splashRadius += this.tower?.main?.area?.defeatedEnemiesWaveByUB * 0.65;

            this.tower.main.area.enemies.forEach(e => {
                if (e !== this.enemy && e.hp > 0) {
                    const dist = Math.hypot(e.center.x - this.enemy.center.x, e.center.y - this.enemy.center.y);
                    if (dist <= splashRadius) {

                        let splashDamage = (this.tower?.pokemon?.item?.id == 'muscleBand' || this.tower?.ability?.id === 'auraSphere') ? finalDamage : Math.ceil(finalDamage * 0.5);
                        e.getDamaged(splashDamage, 'physical', this.tower?.pokemon?.ability, isCritical, new Set(), this.tower.pokemon, this.tower);
                        if (this.tower?.ability?.id === 'fireBlast' || (e.canBurn && (this.tower?.ability?.id === 'burnSplash' || this.tower?.ability?.id === 'magmaStorm'))) {
                            if (this.tower?.pokemon?.item?.id == 'magmaStone') e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.tower.pokemon);
                            else if (this.tower?.pokemon?.item?.id == 'falmeOrb') e.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.tower.pokemon);
                            else e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);     
                        }
                        if (e.canSlow && (this.tower?.ability?.id === 'slowSplash' || this.tower?.ability?.id === 'hyperDrill')) {
                            (this.tower?.pokemon?.item?.id == 'lightClay') ? e.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2.2 }) : e.applyStatusEffect({ type: 'slow', slowPercent: 0.5, duration: 2 });
                        }

                        if (e.canStun && this.tower?.ability?.id === 'electroBall') {
                            (this.tower?.pokemon?.item?.id == 'lightClay') ? e.applyStatusEffect({ type: 'stun', duration: 2.2 }) : e.applyStatusEffect({ type: 'stun', duration: 2 });
                        }

                        if (this.tower?.ability?.id === 'curseSplash') e.applyStatusEffect({ type: 'curse' });
                        if (this.tower?.ability?.id === 'synchronySplash') {
                            this.enemy.statusEffects.forEach(effect => {
                                if (effect.type === 'burn' && e.canBurn) e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);
                                if (effect.type === 'scorch' && e.canBurn) e.applyStatusEffect({ type: 'scorch', damagePercent: 0.005, duration: 10 }, this.tower.pokemon);
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

        if (this.tower?.ability?.id === 'stickyWeb') {
            
            const pos = { x: this.position.x+16, y: this.position.y+16 };

            const web = this.tower.main.area.createSpikeZone(pos, this.tower, {
                radius: 30,
                duration: 4100,
                tickRate: 500,
                dedupDistance: 32,
                dedupTime: 250,
                slow: true,
                slowFactor: 0.5
            });

            this.tower?.main?.area?.towers?.forEach(t => { 
                if (t.pokemon.id === 25) {
                    t.lastStickyWeb = web;
                    t.jumpToStickyWeb(pos);
                }
            });     
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

        if (this.ricochetsLeft > 0 && this.tower && this.tower?.pokemon?.item?.id != 'loadedDice') {
            const next = this.findClosestEnemy(this.enemy, 200);
            if (next) {
                const reducedPower = (this.tower?.pokemon?.item?.id === 'metronome') ? Math.ceil(this.power * 0.875) : Math.ceil(this.power * 0.7); 
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
                    true,
                    {  trickOrTreat: this.trickOrTreat }
                );

                this.tower.projectiles.push(newProj);
            }
        }

        if ((
            this.tower?.pokemon?.item?.id == "maliciousArmor" ||
            (isCritical && this.tower?.pokemon?.item?.id == "crunchies") ||
            this.tower?.ability?.id === 'splash' || this.tower?.ability?.id === 'auraSphere' || this.tower?.ability?.id === 'pollenPuff' ||
            this.tower?.ability?.id === 'slowSplash' || this.tower?.ability?.id === 'hyperDrill' || this.tower?.ability?.id === 'autotomize' ||
            this.tower?.ability?.id === 'burnSplash' || this.tower?.ability?.id === 'magmaStorm' || this.tower?.ability?.id === 'fireBlast' ||
            this.tower?.ability?.id === 'electroBall' || this.tower?.ability?.id === 'naturesJudgement' ||
            this.tower?.ability?.id === 'armorBreakSplash' ||
            this.tower?.ability?.id === 'synchronySplash' ||
            this.tower?.ability?.id === 'curseSplash' ||
            this.tower?.ability?.id === 'armorCannon' ||
            this.tower?.pokemon?.item?.id == 'sprayduck' ||
            this.trickOrTreat === 'splash' ||
            this.tower?.lightningRodCharge === 10 ||
            this.forcedSplash
            ) && this.tower?.pokemon?.item?.id != "weaknessPolicy"
        ) {
            const opacity = this.tower?.getEffectOpacity('areas') ?? 1;
            let pulseRadius = 65;

            if (this.tower?.ability?.id === 'auraSphere') pulseRadius += 6.5 * (Math.abs(this.tower.main.player.health[this.tower.main.area.routeNumber] - 14));
            if (this.tower?.pokemon?.item?.id == "dragonFang") pulseRadius = 195;
            if (this.tower?.lightningRodCharge == 10) {
                pulseRadius = 150;
                this.tower.lightningRodCharge = 0;
            }

            if (this.tower?.ability?.id === 'pollenPuff') 
                pulseRadius += (this.tower?.pokemon?.item?.id == 'nectar') ? this.tower.main.area.honeyGather * 3 : this.tower.main.area.honeyGather;
            if (this.tower?.ability?.id === 'autotomize') 
                pulseRadius += this.tower?.main?.area?.defeatedEnemiesWaveByUB * 0.65;

            this.pulse = {
                active: true,
                x: this.enemy.center.x,
                y: this.enemy.center.y,
                radius: 0,
                alpha: 0.75 * opacity,
                maxRadius: pulseRadius,
                speed: pulseRadius / 12,
                color: this.tower?.pokemon?.specie?.color || '#ffffff'
            };

            this.velocity.x = 0;
            this.velocity.y = 0;
            this.impacting = true;

            return;
        }
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
