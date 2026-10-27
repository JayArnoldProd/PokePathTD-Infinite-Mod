import { Sprite } from '../../utils/Sprite.js';
import { playSound } from '../../file/audio.js';
import { enemyData } from '../data/enemyData.js';

const BURN_ABILITIES = [
	'burn', 'flamethrower', 'burnSplash', 'magmaStorm', 'burnDoubleShot', 'flameWheel', 'drought', 'willOWisp', 'triAttack',
	'lavaPlume', 'fireLash', 'steamEruption', 'precipiceBlades', 'sacredFire', 'volcanicKaboom', 'spicySpray', 'fireBlast'
]

const SHOW_ENEMY_SPEED_DEBUG = false;

export class Enemy extends Sprite {
	constructor(x, y, enemy, waypoints, main, ctx) {
		super(x, y, ctx, enemy.sprite.image, enemy.sprite.frames, 8);
		this.main = main;

		const wave = this.main.area.waveNumber;

		this.radius = 4;
		this.waypoints = waypoints;
		this.waypointIndex = 0;

		this.center = {
			x: this.position.x + this.width / 2,
			y: this.position.y + this.height / 2
		};

		this.enemy = enemy;

		if (!this.main.player.enemyStats[enemy.id]) {
			this.main.player.enemyStats[enemy.id] = {
				defeated: 0,
				escaped: 0,
				damage: 0
			};
		}

		this.hp = enemy.hp;
		this.hpMax = enemy.hp;
		this.armor = enemy.armor || 0;
		this.armorMax = enemy.armor || 0;
		this.regeneration = enemy.regeneration || 0;
		this.regenTimer = 0;
		this.speed = enemy.speed;
		this.baseSpeed = this.speed;
		this.power = enemy.power;
		this.gold = enemy.gold + this.main.player.extraGold
		this.invisible = (this.main.area.weather == 'fog') ? true : enemy.invisible;
		this.cursed = false;
		this.invulnerable = false;
		this.healerTimer = 0;

		// passive (general)
		this.passive = enemy.passive;
		this.passiveTimer = 0;
		this.passiveActivated = false;
		this.passiveCharges = 0;

		if (this.passive?.id === 'kingsShield') this.passiveCharges = 4;
		else if (this.passive?.id === 'dauntlessShield') this.passiveCharges = 400;
		else if (this.passive?.id === 'intrepidSword') this.passiveCharges = -100;
		// passive (regenerator)
		this.regeneratorUsed = false;
		this.isRegeneratorReviving = false;
		this.regeneratorReviveTimer = 0;

		// passive (time travel)
		this.timeTravelSpeedTimer = 0;
		this.timeTravelMin = 150;
		this.timeTravelMax = 200;

		// animación
		this.reviveAnimTime = 0;
		this.reviveScale = 1;

		// revysBook 360 spin
		this.spinAngle = 0;
		this.spinRemaining = 0; // ms left in spin

		this.statusEffects = [];
		this.floatingTexts = [];

		const cursePath = './src/assets/images/icons/curse.png';

		let cached = null;
		try {
			if (this.main && this.main.assets && typeof this.main.assets.getImage === 'function') {
				cached = this.main.assets.getImage(cursePath);
			}
			// fallback a main.getImage con helper
			if (!cached && this.main && typeof this.main.getImage === 'function') {
				cached = this.main.getImage(cursePath);
			}
			// también comprobar imageCache directo por compatibilidad
			if (!cached && this.main && this.main.imageCache && this.main.imageCache[cursePath]) {
				cached = this.main.imageCache[cursePath];
			}
		} catch (_) { cached = null; }

		this.curseIcon = cached || null;

		if (!this.curseIcon) {
            this.curseIcon = new Image();
            this.curseIcon.src = './src/assets/images/icons/curse.png';
		}
		// Wave scaling for difficulty (waves 1-100 only)
		// ENDLESS MODE (wave > 100): All scaling handled by Area.js spawnEndlessWave
		if (wave <= 100) {
			const bonusSteps = Math.floor((wave - 1) / 5);
			if (bonusSteps > 0) {
				// Base scaling (waves 1-100): +2% HP, +1% armor per 5 waves
				let hpMult = 1 + 0.02 * bonusSteps;
				let armorMult = 1 + 0.01 * bonusSteps;
				let goldMult = 1 + 0.15 * bonusSteps;

				this.hp = Math.floor(this.hp * hpMult);
				this.hpMax = Math.floor(this.hpMax * hpMult);
				this.armor = Math.floor(this.armor * armorMult);
				this.armorMax = Math.floor(this.armorMax * armorMult);
				this.gold = Math.floor(this.gold * goldMult);

				// Boss wave 100 gets +100% stats
				if (wave === 100) {
					this.hp = Math.floor(this.hp * 2);
					this.hpMax = Math.floor(this.hpMax * 2);
					this.armor = Math.floor(this.armor * 2);
					this.armorMax = Math.floor(this.armorMax * 2);
				}
			}
		}
		// Wave > 100: Enemy receives pre-scaled stats from Area.js, no additional scaling here
		if (typeof this.main.area.inChallenge.toughEnemies == 'number') {
			this.hp += Math.floor(this.hp * (this.main.area.inChallenge.toughEnemies / 100));
			this.hpMax += Math.floor(this.hpMax * (this.main.area.inChallenge.toughEnemies / 100));
			this.armor += Math.floor(this.armor * (this.main.area.inChallenge.toughEnemies / 100));
			this.armorMax += Math.floor(this.armorMax * (this.main.area.inChallenge.toughEnemies / 100));
		}

		if (this.main.area.inChallenge.draft) {
			if (wave === 100) {
				this.hp -= Math.floor(this.hp * (25 / 100));
				this.hpMax -= Math.floor(this.hpMax * (25 / 100));
				this.armor -= Math.floor(this.armor * (25 / 100));
				this.armorMax -= Math.floor(this.armorMax * (25 / 100));
			} else {
				this.hp -= Math.floor(this.hp * (10 / 100));
				this.hpMax -= Math.floor(this.hpMax * (10 / 100));
				this.armor -= Math.floor(this.armor * (10 / 100));
				this.armorMax -= Math.floor(this.armorMax * (10 / 100));
			}
		}

		if (this.main.area.isCustom) {
			this.hp += Math.floor(this.hp * (this.main.area.customData.health / 100));
			this.hpMax += Math.floor(this.hpMax * (this.main.area.customData.health / 100));
			this.armor += Math.floor(this.armor * (this.main.area.customData.armor / 100));
			this.armorMax += Math.floor(this.armorMax * (this.main.area.customData.armor / 100));
		}

		this.dying = false;
		this.opacity = 1;
		this.dyingSpeed = 0.03;

		this.hasEnteredCanvas = false;
		this.distanceTraveled = 0;
		this.stunned = false;

		this.canSlow = enemy.canSlow;
		this.canStun = enemy.canStun;
		this.canBurn = enemy.canBurn;
		this.canPoison = enemy.canPoison;

		this.burnedBy = null;
		this.poisonedBy = null;
		this.nightmaredBy = null;
		this.scorchedBy = null;

		this.weatherTimer = 0;

		if (['drought', 'sunnyDay'].includes(this.passive?.id)) {
			this.main.area.enemyWeather = 'harshSunlight';
			this.main.area.imposedWeather = true;
			if (this.main.area.weather != 'starryNight') {
				this.main.area.weather = 'harshSunlight';
				this.main.UI.displayWeather();
			}
		} else if (this.passive?.id == 'drizzle' ) {
			this.main.area.enemyWeather = 'drizzle';
			this.main.area.imposedWeather = true;
			if (this.main.area.weather != 'starryNight') {
				this.main.area.weather = 'rain';
				this.main.UI.displayWeather();
			}
		}

		// Achievement tracker
		this.achievementTimer = 0;
		this.achievementCount = 0;
	}

	draw() {
		this.ctx.save();

		if (this.passive?.id === 'flameBody') {
			this.ctx.save();
		    const centerX = this.position.x + this.width / 2;
		    const centerY = this.position.y + this.height / 2;
		    const radius = 120;
		    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 500);

		    const grad = this.ctx.createRadialGradient(
		        centerX, centerY, radius * 0.2,
		        centerX, centerY, radius
		    );
		    grad.addColorStop(0, `rgba(255, 75, 25, ${0.16 + pulse * 0.06})`);
		    grad.addColorStop(0.7, `rgba(255, 55, 15, ${0.08 + pulse * 0.04})`);
		    grad.addColorStop(1, 'rgba(255, 45, 10, 0.03)');

		    this.ctx.globalAlpha = 1;
		    this.ctx.fillStyle = grad;
		    this.ctx.beginPath();
		    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		    this.ctx.fill();

		    this.ctx.strokeStyle = `rgba(255, 75, 35, ${0.45 + pulse * 0.2})`;
		    this.ctx.lineWidth = 2;
		    this.ctx.beginPath();
		    this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
		    this.ctx.stroke();

		    const numParticles = 500;

		    if (this.main.particles) for (let i = 0; i < numParticles; i++) {
		        const angle = Math.random() * Math.PI * 2;
		        const r = 70 + Math.random() * 50;
		        const px = centerX + Math.cos(angle) * r;
		        const py = centerY + Math.sin(angle) * r;
		        const size = 2 + Math.random() * 3;

		        const t = Math.random(); 

		        const rColor = Math.floor(255);
		        const gColor = Math.floor(100 + 155 * t);
		        const bColor = 0;

		        this.ctx.globalAlpha = 0.7 + 0.2 * Math.sin(Date.now() / 300);
		        this.ctx.fillStyle = `rgb(${rColor},${gColor},${bColor})`;
		        this.ctx.beginPath();
		        this.ctx.arc(px, py, size, 0, Math.PI * 2);
		        this.ctx.fill();
		    }

		    this.ctx.restore();
		}

		if (this.magmaStormBurst) {
		    const b = this.magmaStormBurst;
		    const t = Math.min(1, b.elapsed / b.duration);
		    const burstAlpha = 1 - t;
		    const burstRadius = b.radius * (0.3 + t * 0.9);

		    const cx = this.position.x + this.width / 2;
		    const cy = this.position.y + this.height / 2;

		    this.ctx.save();
		    this.ctx.globalAlpha = 1;
		    this.ctx.globalCompositeOperation = 'lighter';

		    const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, burstRadius);
		    grad.addColorStop(0, `rgba(255, 220, 140, ${burstAlpha * 0.9})`);
		    grad.addColorStop(0.5, `rgba(255, 120, 30, ${burstAlpha * 0.6})`);
		    grad.addColorStop(1, 'rgba(200, 40, 10, 0)');

		    this.ctx.fillStyle = grad;
		    this.ctx.beginPath();
		    this.ctx.arc(cx, cy, burstRadius, 0, Math.PI * 2);
		    this.ctx.fill();

		    this.ctx.strokeStyle = `rgba(255, 200, 100, ${burstAlpha})`;
		    this.ctx.lineWidth = 2.5;
		    this.ctx.beginPath();
		    this.ctx.arc(cx, cy, burstRadius, 0, Math.PI * 2);
		    this.ctx.stroke();

		    this.ctx.restore();
		}

		if (this.passive?.id === 'tailWind') {
		    const cx = this.position.x + this.width / 2;
		    const cy = this.position.y + this.height / 2;
		    const radius = 75;
		    const now = Date.now();
		    const pulse = 0.5 + 0.5 * Math.sin(now / 500);

		    this.ctx.save();
		    this.ctx.globalAlpha = 1;

		    const grad = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
		    grad.addColorStop(0, `rgba(220, 250, 255, ${0.08 + pulse * 0.05})`);
		    grad.addColorStop(0.75, `rgba(220, 250, 255, ${0.20 + pulse * 0.08})`);
		    grad.addColorStop(1, 'rgba(220, 250, 255, 0)');
		    this.ctx.fillStyle = grad;
		    this.ctx.beginPath();
		    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		    this.ctx.fill();

		    const swooshes = 3;
		    for (let i = 0; i < swooshes; i++) {
		        const angle = (i / swooshes) * Math.PI * 2 + (now / 900);
		        const r = radius * 0.65;

		        const sx = cx + Math.cos(angle) * r;
		        const sy = cy + Math.sin(angle) * r;
		        const ex = cx + Math.cos(angle + 0.9) * r;
		        const ey = cy + Math.sin(angle + 0.9) * r;
		        const midAngle = angle + 0.45;
		        const cxp = cx + Math.cos(midAngle) * (r * 1.25);
		        const cyp = cy + Math.sin(midAngle) * (r * 1.25);

		        this.ctx.strokeStyle = 'rgba(230, 250, 255, 0.75)';
		        this.ctx.lineWidth = 2.5;
		        this.ctx.lineCap = 'round';
		        this.ctx.beginPath();
		        this.ctx.moveTo(sx, sy);
		        this.ctx.quadraticCurveTo(cxp, cyp, ex, ey);
		        this.ctx.stroke();
		    }

		    this.ctx.restore();
		}

		if (this.passive?.id === "snowCloak") {
			const cx = this.position.x + this.width / 2;
			const cy = this.position.y + this.height / 2;

			const radius = 150;
			const pulse = 0.5 + 0.8 * Math.sin(Date.now() / 600);

			// aura circular (siempre visible)
			const grad = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
			grad.addColorStop(0, `rgba(180, 220, 255,${0.35 + pulse * 0.15})`);
			grad.addColorStop(0.7, `rgba(180, 220, 255,${0.15 + pulse * 0.10})`);
			grad.addColorStop(1, `rgba(180, 220, 255, 0.08)`); 

			this.ctx.fillStyle = grad;
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			this.ctx.fill();

			this.ctx.strokeStyle = 'rgba(200, 230, 255, 0.55)';
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			this.ctx.stroke();

			if (this.main.particles) for (let i = 0; i < 50; i++) {
				const angle = Math.random() * Math.PI * 2;
				const r = Math.random() * radius;
				const px = cx + Math.cos(angle) * r;
				const py = cy + Math.sin(angle) * r;
				const size = 1 + Math.random() * 2;

				this.ctx.fillStyle = 'rgba(210, 240, 255, 0.8)';
				this.ctx.beginPath();
				this.ctx.arc(px, py, size, 0, Math.PI * 2);
				this.ctx.fill();
			}
		}

		if (this.passive?.id === "ingrain") {
		    const cx = this.position.x + this.width / 2;
		    const cy = this.position.y + this.height / 2;

		    const radius = 140;
		    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 700);

		    // Aura
		    const grad = this.ctx.createRadialGradient(
		        cx, cy, radius * 0.15,
		        cx, cy, radius
		    );

		    grad.addColorStop(0, `rgba(80,255,120,${0.30 + pulse * 0.15})`);
		    grad.addColorStop(0.65, `rgba(60,220,90,${0.18 + pulse * 0.08})`);
		    grad.addColorStop(1, "rgba(60,220,90,0.03)");

		    this.ctx.fillStyle = grad;
		    this.ctx.beginPath();
		    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		    this.ctx.fill();

		    // Borde
		    this.ctx.strokeStyle = `rgba(120,255,160,${0.55 + pulse * 0.2})`;
		    this.ctx.lineWidth = 2;
		    this.ctx.beginPath();
		    this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
		    this.ctx.stroke();

		    // Partículas flotando
		    if (this.main.particles) for (let i = 0; i < 40; i++) {
		        const seed = i * 987.123;
		        const t = Date.now() * 0.0015 + seed;

		        const angle = (seed * 17) % (Math.PI * 2);
		        const r = (seed * 53) % radius;

		        const drift = Math.sin(t) * 6;

		        const px = cx + Math.cos(angle) * r;
		        const py = cy + Math.sin(angle) * r - drift;

		        const size = 1.5 + ((seed * 13) % 2.5);

		        this.ctx.fillStyle = `rgba(180,255,180,${0.45 + 0.35 * Math.sin(t * 2)})`;

		        this.ctx.beginPath();
		        this.ctx.arc(px, py, size, 0, Math.PI * 2);
		        this.ctx.fill();
		    }

		    // Destellos sobre el borde
		    if (this.main.particles) for (let i = 0; i < 12; i++) {
		        const angle = Date.now() / 1800 + i * (Math.PI * 2 / 12);

		        const px = cx + Math.cos(angle) * radius;
		        const py = cy + Math.sin(angle) * radius;

		        this.ctx.fillStyle = "rgba(220,255,220,0.8)";
		        this.ctx.beginPath();
		        this.ctx.arc(px, py, 2.5, 0, Math.PI * 2);
		        this.ctx.fill();
		    }
		}

		if (this.passive?.id === "static") {
			const cx = this.position.x + this.width / 2;
			const cy = this.position.y + this.height / 2;

			const radius = 115;
			const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);

			const grad = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
			grad.addColorStop(0, `rgba(255, 255, 180,${0.55 + pulse * 0.25})`);
			grad.addColorStop(0.6, `rgba(255, 240, 120,${0.25 + pulse * 0.15})`);
			grad.addColorStop(1, `rgba(255, 240, 120, 0.08)`); 

			this.ctx.fillStyle = grad;
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			this.ctx.fill();

			this.ctx.strokeStyle = 'rgba(255, 240, 120, 0.9)';
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			this.ctx.stroke();

			if (this.main.particles) for (let i = 0; i < 22; i++) {
				const angle = Math.random() * Math.PI * 2;
				const r = radius * (0.55 + Math.random() * 0.45);
				const px = cx + Math.cos(angle) * r;
				const py = cy + Math.sin(angle) * r;

				const length = 14 + Math.random() * 10;
				const segments = 3 + Math.floor(Math.random() * 3);

				let x = px;
				let y = py;

				this.ctx.strokeStyle = `rgba(255, 255, 200, ${0.85 + 0.15 * Math.sin(Date.now() / 100)})`;
				this.ctx.lineWidth = 1.2;

				this.ctx.beginPath();
				this.ctx.moveTo(x, y);

				for (let s = 0; s < segments; s++) {
					const nx = x + (Math.random() - 0.5) * length;
					const ny = y + (Math.random() - 0.5) * length;
					this.ctx.lineTo(nx, ny);
					x = nx;
					y = ny;
				}

				this.ctx.stroke();

				// punto brillante al inicio
				this.ctx.fillStyle = 'rgba(255, 240, 120, 0.95)';
				this.ctx.beginPath();
				this.ctx.arc(px, py, 1.5, 0, Math.PI * 2);
				this.ctx.fill();
			}
		}

		const cx = this.position.x + this.width / 2;
		const cy = this.position.y + this.height / 2;

		this.ctx.translate(cx, cy);

		if (this.isRegeneratorReviving) {
			this.ctx.scale(this.reviveScale, this.reviveScale);
		}

		if (this.spinRemaining > 0) {
			this.ctx.rotate(this.spinAngle);
		}

		this.ctx.translate(-cx, -cy);

		if (this.invisible) this.ctx.globalAlpha = 0.3;

		super.draw();
		this.ctx.restore();

		const barWidth = 40;
		const barHeight = 6;
		const barX = this.position.x + (this.width / 2) - (barWidth / 2);
		const barY = this.position.y - 14;

		this.ctx.save();

		this.ctx.fillStyle = '#222';
		this.ctx.beginPath();
		this.ctx.roundRect(barX, barY, barWidth, barHeight, 3);
		this.ctx.fill();

		const hpPercent = Math.max(this.hp / this.hpMax, 0);
		const healthGradient = this.ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
		if (hpPercent > 0.5) {
			healthGradient.addColorStop(0, '#00ff73');
			healthGradient.addColorStop(1, '#00c04b');
		} else if (hpPercent > 0.25) {
			healthGradient.addColorStop(0, '#ffe600');
			healthGradient.addColorStop(1, '#d4b400');
		} else {
			healthGradient.addColorStop(0, '#ff4c4c');
			healthGradient.addColorStop(1, '#b30000');
		}

		this.ctx.fillStyle = healthGradient;
		this.ctx.beginPath();
		this.ctx.roundRect(barX, barY, barWidth * hpPercent, barHeight, 3);
		this.ctx.fill();

		this.ctx.lineWidth = 1;
		this.ctx.strokeStyle = 'black';
		this.ctx.beginPath();
		this.ctx.roundRect(barX, barY, barWidth, barHeight, 3);
		this.ctx.stroke();

		if (this.main.displayHealth == 2 || (this.main.displayHealth == 1 && this.main.area.waveNumber == 100)) {
			this.ctx.save();
			this.ctx.font = '8px Arial';
			this.ctx.textAlign = 'center';
			this.ctx.textBaseline = 'middle';

			const hpText = (['mew', 'calyrex'].includes(this.enemy.id)) ? '???' : `${this.main.utility.numberDot(Math.max(0, Math.floor(this.hp)), this.main.lang)}`;
			const textX = barX + barWidth / 2;
			const textY = barY + barHeight / 1.5;

			this.ctx.lineWidth = 2;
			this.ctx.strokeStyle = 'black';
			this.ctx.strokeText(hpText, textX, textY);

			this.ctx.fillStyle = 'white';
			this.ctx.fillText(hpText, textX, textY);
			this.ctx.restore();
		}
		
		if (this.armorMax > 0) {
			const armorPercent = Math.max(this.armor / this.armorMax, 0);
			const armorY = barY - barHeight - 2;

			this.ctx.fillStyle = '#222';
			this.ctx.beginPath();
			this.ctx.roundRect(barX, armorY, barWidth, barHeight, 3);
			this.ctx.fill();

			this.ctx.fillStyle = '#66ccff';
			this.ctx.beginPath();
			this.ctx.roundRect(barX, armorY, barWidth * armorPercent, barHeight, 3);
			this.ctx.fill();

			this.ctx.lineWidth = 1;
			this.ctx.strokeStyle = 'black';
			this.ctx.beginPath();
			this.ctx.roundRect(barX, armorY, barWidth, barHeight, 3);
			this.ctx.stroke();
			if (this.main.displayHealth == 2 || (this.main.displayHealth == 1 && this.main.area.waveNumber == 100)) {
				this.ctx.save();
				this.ctx.font = '8px Arial';
				this.ctx.textAlign = 'center';
				this.ctx.textBaseline = 'middle';

				const armorText = `${this.main.utility.numberDot(Math.max(0, Math.floor(this.armor)), this.main.lang)}`;
				const armorTextX = barX + barWidth / 2;
				const armorTextY = armorY + barHeight / 1.5;

				this.ctx.lineWidth = 2;
				this.ctx.strokeStyle = 'black';
				this.ctx.strokeText(armorText, armorTextX, armorTextY);

				this.ctx.fillStyle = 'white';
				this.ctx.fillText(armorText, armorTextX, armorTextY);
				this.ctx.restore();
			}
		}

		if (this.passive?.id === 'ironDefense' || this.passive?.id === 'dauntlessShield' || this.passive?.id === 'intrepidSword') {
		    const idPercent = (this.passive?.id === 'dauntlessShield') ? Math.min(this.passiveCharges, 400) : Math.min(this.passiveCharges, 100);

		    this.ctx.save();
		    this.ctx.font = 'bold 12px Arial';
		    this.ctx.textAlign = 'right';
		    this.ctx.textBaseline = 'middle';

		    const idText = `${idPercent}%`;
		    const idTextX = barX + barWidth + 35;
		    const idTextY = barY - barHeight + 6;

		    this.ctx.lineWidth = 2;
		    this.ctx.strokeStyle = 'black';
		    this.ctx.strokeText(idText, idTextX, idTextY);

		    this.ctx.fillStyle = '#c0c0c0';
		    this.ctx.fillText(idText, idTextX, idTextY);

		    this.ctx.restore();
		}

		// indicador de curse
	    if (this.cursed && this.curseIcon) {
		    const size = 12;
		    const offsetX = barX - size - 2;
		    const offsetY = barY - 2.5;
		    // this.curseIcon puede ser Image, ImageBitmap o Canvas (según preload)
		    this.ctx.drawImage(this.curseIcon, offsetX, offsetY, size, size);
		}

		// efectos visuales
		this.drawStatusEffects();

		if (SHOW_ENEMY_SPEED_DEBUG) {
			const speedText = this.getCurrentMovementSpeed().toFixed(2);
			const speedX = this.position.x + this.width + 3;
			const speedY = this.position.y + this.height / 2;

			this.ctx.save();
			this.ctx.font = 'bold 10px Arial';
			this.ctx.textAlign = 'left';
			this.ctx.textBaseline = 'middle';
			this.ctx.lineWidth = 2;
			this.ctx.strokeStyle = 'black';
			this.ctx.strokeText(speedText, speedX, speedY);
			this.ctx.fillStyle = 'white';
			this.ctx.fillText(speedText, speedX, speedY);
			this.ctx.restore();
		}

		this.ctx.restore(); 
	}

	update(deltaTime = 1000 / 60, shouldDraw = true) {
		// deltaTime ya viene escalado por Game (ms)
		const simDelta = deltaTime;
		const frameFactor = simDelta / (1000 / 60);

		if (this.dying) {
            this.opacity -= this.dyingSpeed * frameFactor;
            if (this.opacity <= 0) {
	            const index = this.main.area.enemies.indexOf(this);
	            if (index > -1) this.main.area.enemies.splice(index, 1);
	            return;
	        }
	    }

	    if (this.magmaStormBurst) {
	        this.magmaStormBurst.elapsed += simDelta;
	        if (this.magmaStormBurst.elapsed >= this.magmaStormBurst.duration) {
	            this.magmaStormBurst = null;
	        }
	    }

		// DELTA TIME FIX: Skip drawing during sub-step simulation
		if (shouldDraw && !this._skipDraw) {
            this.ctx.save();
            this.ctx.globalAlpha = this.opacity;
            this.draw();
            this.ctx.restore();
        }

        if (!this.dying) {
            if (this.isRegeneratorReviving) {
                this.regeneratorReviveTimer -= simDelta;
                this.reviveAnimTime += simDelta;
                this.stunned = true;

                this.opacity = 1 + 0.5 * Math.sin(this.reviveAnimTime / 120);
                this.reviveScale = 1 + 0.05 * Math.sin(this.reviveAnimTime / 150);

                if (this.regeneratorReviveTimer <= 0) {
                    this.isRegeneratorReviving = false;
                    this.stunned = false;

                    this.hp = this.hpMax;
                    this.armor = 0;
                    this.armorMax = 0;
                    this.statusEffects.length = 0;
					this.speed = this.baseSpeed;

                    // reset visual
                    this.opacity = 1;
                    this.reviveScale = 1;
                    this.reviveAnimTime = 0;

                    playSound('regenerator', 'effect');
                }
			}

		if (!this.stunned) {
			    const waypoint = this.waypoints[this.waypointIndex];
			    const yDistance = waypoint.y - this.center.y;
			    const xDistance = waypoint.x - this.center.x;
			    const angle = Math.atan2(yDistance, xDistance);

			    // FIX: mover en substeps para no saltarse waypoints a alta velocidad
			    let remainingMove = this.speed * frameFactor;

			    while (remainingMove > 0) {
			        const wp = this.waypoints[this.waypointIndex];
			        const wdx = wp.x - this.center.x;
			        const wdy = wp.y - this.center.y;
			        const distToWp = Math.hypot(wdx, wdy);

			        let windFactor = this.main.area.getWindFactorAt
			            ? this.main.area.getWindFactorAt(this.center.x, this.center.y, wdx)
			            : 1;

			        let slowFactor = this.main.area.getSlowFactorAt
			            ? this.main.area.getSlowFactorAt(this.center.x, this.center.y)
			            : 1;

			        const spikeSlowFactor = this.main.area.getSpikeZoneSlowFactorAt
			            ? this.main.area.getSpikeZoneSlowFactorAt(this.center.x, this.center.y)
			            : 1;

			        if (this.passive?.id == 'gust' && windFactor === 0.6) windFactor = 2;
			        if (this.passive?.id == 'windRider' && windFactor === 0.6) windFactor = 0.3;
			        if (this.passive?.id == 'windRider' && windFactor === 2) windFactor = 4;
			        if (this.passive?.id == 'hustle' && slowFactor === 0.3) slowFactor = 2;

			        const windedMove = remainingMove * windFactor * slowFactor * spikeSlowFactor;

			        if (distToWp <= windedMove && this.waypointIndex < this.waypoints.length - 1) {
			            // llegar exactamente al waypoint y continuar
			            this.position.x = wp.x - this.width / 2;
			            this.position.y = wp.y - this.height / 2;
			            this.center.x = wp.x;
			            this.center.y = wp.y;
			            // Consume remainingMove proportionally to the distance actually covered
			            remainingMove -= windFactor > 0 ? distToWp / windFactor : distToWp;
			            this.waypointIndex++;
			            if (this.passive?.id === 'transistor' && this.waypointIndex > 1) this.applyStatusEffect({ type: 'stun', duration: 2 }, this);
			        } else {
			            // mover lo que queda en dirección al waypoint actual
			            const wAngle = Math.atan2(wdy, wdx);
			            const stepX = Math.cos(wAngle) * windedMove;
			            const stepY = Math.sin(wAngle) * windedMove;
			            this.position.x += stepX;
			            this.position.y += stepY;
			            remainingMove = 0;
			        }
			    }

			    if (!this.hasEnteredCanvas) {
			        if (
			            this.position.x >= 0 &&
			            this.position.x <= this.main.game.canvas.width &&
			            this.position.y >= -12 &&
			            this.position.y <= this.main.game.canvas.height
			        ) this.hasEnteredCanvas = true;
			    }

			    const totalMove = this.speed * frameFactor;
			    if (this.hasEnteredCanvas) this.distanceTraveled += totalMove;

			    // dirección visual basada en el waypoint actual
			    const currentWp = this.waypoints[this.waypointIndex];
			    const vdx = currentWp.x - this.center.x;
			    const vdy = currentWp.y - this.center.y;
			    const vAngle = Math.atan2(vdy, vdx);

			    if (Math.round(Math.sin(vAngle)) === 0) {
			        if (Math.round(Math.cos(vAngle)) === 1) this.frames.direction = 2;
			        if (Math.round(Math.cos(vAngle)) === -1) this.frames.direction = 6;
			    } else {
			        if (Math.round(Math.sin(vAngle)) === 1) this.frames.direction = 0;
			        if (Math.round(Math.sin(vAngle)) === -1) this.frames.direction = 4;
			    }

			    this.center = {
			        x: this.position.x + this.width / 2,
			        y: this.position.y + this.height / 2
			    };
			}

			if (this.passive?.id === 'ingrain') {
			    this.passiveTimer += simDelta;

			    if (this.passiveTimer >= 250) { // cada 250 ms
			        this.passiveTimer = 0;

			        const enemyX = this.center.x;
				    const nearbyTiles = this.main.area.placementTiles.filter(tile => {
				    if (tile.land !== 2) return false;
				    if (tile.tower) return false;

				    return Math.hypot(
				        tile.center.x - this.center.x,
				        tile.center.y - this.center.y
				    ) <= 150;
				});
			        if (nearbyTiles) this.regeneration = (nearbyTiles.length * 2000);
			        else this.regeneration = 0;
			    }
			}

			if (this.passive?.id === 'dragonsMaw') {
			    this.passiveTimer += simDelta;

			    if (this.passiveTimer >= 1000) {
			        this.passiveTimer = 0;
			        this.passiveCharges++;
			    }
			}

			if (this.passive?.id === 'steamEngine' && this.passiveTimer > 0) {
				this.passiveTimer -= simDelta;
				if (this.passiveTimer <= 0) {
					this.passiveTimer = 0;
					this.speed -= 1;
					this.baseSpeed -= 1;
				}
			}

			if (this.regeneration > 0) {
			    const burnedNearFlameBody = this.statusEffects.some(e => e.type === 'burn') &&
			        this.main.area.towers.some(t => t.ability?.id === 'flameBody' &&
			            Math.hypot(t.center.x - this.center.x, t.center.y - this.center.y) <= t.range);

			    if (!burnedNearFlameBody) {
			        this.regenTimer += simDelta;
			        while (this.regenTimer >= 1000) {
			            this.hp = Math.min(this.hp + this.regeneration, this.hpMax);
			            this.regenTimer -= 1000;

			            if (this.canPoison && this.isInsideAbilityField('corrosionMega')) {
			            	let corrosionUser = undefined;
			            	this.main.area.towers.some(tower => { if (tower?.ability?.id === 'corrosionMega') corrosionUser = tower.pokemon });
			            	this.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, corrosionUser);
					    }
			        }
			    }
			}

			if (this.passive?.id === 'luchadoro' && this.armor === 0) {
				this.baseSpeed = 3.6;
				this.speed = this.baseSpeed;
			}

			if (this.passive?.id == 'slowStart') {
                this.passiveTimer += simDelta;
                while (this.passiveTimer >= 1000) {
                    this.passiveTimer -= 1000;
                    this.baseSpeed += 0.05;
                    this.speed += 0.05;
                }
			}

			if (['groudon', 'kyogre'].includes(this.enemy.id) && this.passiveTimer > 0) {
				this.passiveTimer -= simDelta;
				if (this.passiveTimer <= 0) {
					this.passiveTimer = 0;
					this.stunned = false;
                       this.invulnerable = false;
				}
			}

			// if (this.regeneratorUsed && !this.dying) this.achievementTimer += simDelta;
			if (this.enemy.id === 'heatran' && this.achievementTimer < 6500) this.achievementTimer += simDelta;

			if (this.passive?.id === 'soulHeart' && !this.dying) {
				this.passiveTimer += simDelta;
				this.achievementTimer += simDelta;

				if (this.passiveTimer > 5100) {
					this.passiveTimer = 0;
					playSound('hit2', 'effect');
		            this.main.area.hitsReceived++;
		            this.main.player.getDamaged(1);
				}
			}

			if (
                this.passive?.id === 'timeTravel' &&
                !this.dying &&
                this.waypointIndex > 0
			) {
			    this.passiveTimer += simDelta;
				this.achievementTimer += simDelta;

				if (this.timeTravelSpeedTimer > 0) {
					this.timeTravelSpeedTimer -= simDelta;
					if (this.timeTravelSpeedTimer <= 0) {
						this.speed -= 1;
                        this.baseSpeed -= 1;
                        this.timeTravelSpeedTimer = 0;
					}
				}

                if (this.passiveTimer >= 8000) {
                    this.passiveTimer = 0;

                    const currentWP = this.waypoints[this.waypointIndex];
                    const prevWP = this.waypoints[this.waypointIndex - 1];

                    // vector del segmento
                    const vx = currentWP.x - prevWP.x;
                    const vy = currentWP.y - prevWP.y;
                    const length = Math.hypot(vx, vy) || 1;

                    // dirección hacia atrás
                    const nx = -vx / length;
			        const ny = -vy / length;

			        // distancia aleatoria
			        const randomBack = this.timeTravelMin + Math.random() * (this.timeTravelMax - this.timeTravelMin);

			        let back = randomBack;

					while (back > 0 && this.waypointIndex > 0) {
					    const currentWP = this.waypoints[this.waypointIndex];
                        const prevWP = this.waypoints[this.waypointIndex - 1];

                        const vx = currentWP.x - prevWP.x;
                        const vy = currentWP.y - prevWP.y;
                        const length = Math.hypot(vx, vy) || 1;

                        const nx = -vx / length;
                        const ny = -vy / length;

                        const distToPrev = Math.hypot(this.center.x - prevWP.x, this.center.y - prevWP.y);

                        if (back <= distToPrev) {
                            // cabe dentro del segmento actual
                            this.position.x += nx * back;
                            this.position.y += ny * back;
                            back = 0;
                        } else {
                            // nos pasamos del waypoint anterior: ir al prevWP y seguir retrocediendo
                            this.position.x = prevWP.x - this.width / 2;
                            this.position.y = prevWP.y - this.height / 2;
                            back -= distToPrev;
                            this.waypointIndex--;
                            this.center.x = this.position.x + this.width / 2;
                            this.center.y = this.position.y + this.height / 2;
                        }
					}

                    const startX = this.position.x;
                    const startY = this.position.y;
			        const endX = startX + nx * back;
			        const endY = startY + ny * back;

			        this.statusEffects = this.statusEffects.filter(e => !['burn', 'poison', 'nightmare', 'scorch'].includes(e.type));
				    this.burnedBy = null;
				    this.poisonedBy = null;
				    this.nightmaredBy = null;
				    this.scorchedBy = null;
				    this.hp += 7000;
				    if (this.hp >=  this.hpMax) this.hp = this.hpMax;

                    this.position.x = endX;
                    this.position.y = endY;

                    this.center.x = this.position.x + this.width / 2;
                    this.center.y = this.position.y + this.height / 2;

                    this.distanceTraveled = Math.max(0, this.distanceTraveled - back);

                    this.speed += 1;
                    this.baseSpeed += 1;
                    this.timeTravelSpeedTimer = 1000;

                    if (!this.main.mute[1]) playSound('teleport', 'effect');
                }
			}

			if (this.passive?.id === 'shellSmash' && this.passiveTimer > 0) {
				this.passiveTimer -= simDelta;
				if (this.passiveTimer <= 0) {
					this.passiveTimer = 0;
					this.baseSpeed -= 0.5;
                    this.speed -= 0.5;
	            }
			}

			if (this.passive?.id == 'turboblaze' && this.burnedBy === null && this.main.area.weather != 'rain' && this.main.area.weather != 'heavyRain' && this.main.area.weather != 'thunderStorm') {
				this.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 });
			}

			if (this.passive?.id == 'shadowShield' && !this.invisible) {
				this.passiveTimer += simDelta;
				if (this.passiveTimer >= 4000) {
					this.armor = this.armorMax;
					this.passiveTimer = 0;
					this.invisible = true;
					playSound('invi', 'effect')
	            }
			}

			if (this.passive?.id == "synthesis" && !this.dying && this.hp > 0) {
				this.passiveTimer += simDelta;
			    if (this.passiveTimer >= 1000) {

			    	const burnedNearFlameBody = this.statusEffects.some(e => e.type === 'burn') &&
			        this.main.area.towers.some(t => t.ability?.id === 'flameBody' &&
			            Math.hypot(t.center.x - this.center.x, t.center.y - this.center.y) <= t.range);

				    if (!burnedNearFlameBody) {
				        let synthesisHeal = (['harshSunlight', 'extremelyHarshSunlight'].includes(this.main.area.weather)) ? 5 : 2.5;
				    	this.hp = Math.min(this.hp + (this.hp*synthesisHeal/100), this.hpMax);

				    	if (this.canPoison && this.isInsideAbilityField('corrosionMega')) {
			            	let corrosionUser = undefined;
			            	this.main.area.towers.some(tower => { if (tower?.ability?.id === 'corrosionMega') corrosionUser = tower.pokemon });
			            	this.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, corrosionUser);
					    }
				    }
				    this.passiveTimer = 0;
				}
			}

			// if (this.passive?.id == "withdraw") {
			// 	if (!this.dying && this.hp > 0 && this.armor < Math.floor(this.armor/2)) {
			// 		this.passiveTimer += simDelta;
			// 	    if (this.passiveTimer >= 1000) {
			// 	    	this.armor = Math.min(this.armor+1000, this.armorMax);
			// 	    	this.passiveTimer = 0;
			// 	    }
			// 	}
			// }


			if (this.passive?.id == "naturalCure") {
			    this.passiveTimer += simDelta;

                if (this.passiveTimer >= 5000) {
				    this.passiveTimer = 0;
				    this.statusEffects = this.statusEffects.filter(e => e.type === 'nightmare');
				    this.burnedBy = null;
				    this.scorchedBy = null;
				    this.poisonedBy = null;
				    this.stunned = false;

				    const slowEffects = this.statusEffects.filter(e => ['slow', 'shadowTagSlow'].includes(e.type) && e.duration !== 0);
				    if (slowEffects.length === 0) {
				        this.speed = this.baseSpeed;
				    }

                    playSound('regenerator', 'effect');
				}
			}

			if (this.passive?.id === 'clearBody' && !this.dying && this.hp > 0) {
			    const aliveEnemies = this.main.area.enemies.filter(enemy =>
			        enemy !== this &&
			        !enemy.dying &&
			        enemy.hp > 0
			    ).length;

			    const healAmount = 50 * aliveEnemies * (simDelta / 1000);

			    this.hp = Math.min(this.hp + healAmount, this.hpMax);
			}

			if (this.passive?.id === 'healer' && !this.dying) {
			    const healAmount = 400 * (simDelta / 1000);

			    const pulse = 1 + Math.sin(performance.now() / 300) * 0.08;
			    const radius = 100 * pulse;

			    this.main.area.enemies.forEach(enemy => {
			        if (enemy.dying || enemy.hp <= 0) return;

			        const distance = Math.hypot(
			            enemy.center.x - this.center.x,
			            enemy.center.y - this.center.y
			        );

			        if (distance <= radius) {
			        	const burnedNearFlameBody = enemy.statusEffects.some(e => e.type === 'burn') &&
				        this.main.area.towers.some(t => t.ability?.id === 'flameBody' &&
				            Math.hypot(t.center.x - enemy.center.x, t.center.y - enemy.center.y) <= t.range);

					    if (!burnedNearFlameBody) {
					        enemy.hp = Math.min(enemy.hp + healAmount, enemy.hpMax);

					        if (enemy.canPoison && this.isInsideAbilityField('corrosionMega')) {
				            	let corrosionUser = undefined;
				            	this.main.area.towers.some(tower => { if (tower?.ability?.id === 'corrosionMega') corrosionUser = tower.pokemon });
				            	enemy.applyStatusEffect({ type: 'poison', damagePercent: 0.001, stacks: 1 }, corrosionUser);
						    }
					    }
			        }
			    });

			    this.ctx.save();

			    // Aura exterior
			    this.ctx.beginPath();
			    this.ctx.arc(
			        this.center.x,
			        this.center.y,
			        radius,
			        0,
			        Math.PI * 2
			    );

			    this.ctx.fillStyle = 'rgba(80, 220, 100, 0.08)';
			    this.ctx.fill();

			    // Borde del aura
			    this.ctx.strokeStyle = 'rgba(80, 255, 120, 0.35)';
			    this.ctx.lineWidth = 2;
			    this.ctx.stroke();

			    // Pequeño brillo interior
			    const gradient = this.ctx.createRadialGradient(
			        this.center.x,
			        this.center.y,
			        0,
			        this.center.x,
			        this.center.y,
			        radius
			    );

			    gradient.addColorStop(0, 'rgba(120, 255, 140, 0.12)');
			    gradient.addColorStop(0.7, 'rgba(80, 255, 120, 0.04)');
			    gradient.addColorStop(1, 'rgba(80, 255, 120, 0)');

			    this.ctx.beginPath();
			    this.ctx.arc(
			        this.center.x,
			        this.center.y,
			        radius,
			        0,
			        Math.PI * 2
			    );

			    this.ctx.fillStyle = gradient;
			    this.ctx.fill();

			    this.ctx.restore();
			}

			// revysBook spin update
			if (this.spinRemaining > 0) {
				const SPIN_DURATION = 400; // ms for one full 360
				this.spinAngle += (Math.PI * 2) / SPIN_DURATION * simDelta;
				this.spinRemaining -= simDelta;
				if (this.spinRemaining <= 0) {
					this.spinRemaining = 0;
					this.spinAngle = 0;
				}
			}

			this.updateWeatherEffects(simDelta);
			this.updateStatusEffects(simDelta);

			let speedMultiplier = 1;

			if (this.passive?.id === 'swiftSwim' && (this.main.area.weather === 'rain' || this.main.area.weather === 'thunderStorm') && !this.main.area.cloudNine) {
				speedMultiplier *= 2;
			}

			if (this.passive?.id === 'turboblaze' && this.burnedBy !== null) {
				speedMultiplier *= 3;
			}

			if (this.passive?.id === 'chlorophyll' && this.main.area.weather === 'harshSunlight' && !this.main.area.cloudNine) {
				speedMultiplier *= 2;
			}

			if (this.main.area.weather === 'strongWinds') {
				speedMultiplier *= 0.9;
			}

			if (this.main.area.enemies.some(e =>
				e !== this && e.hp > 0 && e.passive?.id === 'tailWind' &&
				Math.hypot(e.center.x - this.center.x, e.center.y - this.center.y) <= 75
			)) {
				speedMultiplier *= 1.25;
			}

			const blizzardTower = this.main.area.towers.find(t =>
				t.ability?.id === 'blizzard' &&
				Math.hypot(t.center.x - this.center.x, t.center.y - this.center.y) <= t.range
			);
			if (blizzardTower) {
				speedMultiplier *= 0.8;
			}

			const slowEffects = this.statusEffects.filter(e => ['slow', 'shadowTagSlow'].includes(e.type) && e.duration !== 0);

			slowEffects.forEach(e => {
			    let slowMultiplier = e.slowPercent ?? 1;

			    if (this.isInsideAbilityField('spiralDrain')) {
			        const slowAmount = 1 - slowMultiplier;
			        slowMultiplier = Math.max(0, 1 - (slowAmount * 1.2));
			    }

			    speedMultiplier *= slowMultiplier;
			});

			if (speedMultiplier > 1 && this.passive?.id == 'heavyMetal') speedMultiplier *= 1.5;

			this.speed = this.baseSpeed * speedMultiplier;
	    }
		this.updateFloatingTexts(simDelta);
	}

	getDamaged(amount, source = 'physical', ability = null, isCritical = false, alreadyCursed = new Set(), pokemon, tower, ignoreStanceChange = false, fromEonUnion = false, projectileSpecial = false) {
	    if (this.hp <= 0 || this.invulnerable) return;

	    if (pokemon && pokemon.pokemon != undefined) pokemon = pokemon.pokemon; // PARECE UNA GILIPOLLEZ PERO ARREGLA ALGUNOS ESTADOS - ARREGLAR MEJOR EN UN FUTURO Xd

		if (!ignoreStanceChange && source === 'physical') {
		    const absorber = this.main.area.enemies.find(enemy => {
		        if (
		            enemy === this ||
		            enemy.dying ||
		            enemy.hp <= 0 ||
		            enemy.passive?.id !== 'stanceChange'
		        ) return false;

		        if (!enemy.hasEnteredCanvas) return false;

		        return (
		            enemy.center.x >= 0 &&
		            enemy.center.x <= this.main.game.canvas.width &&
		            enemy.center.y >= 0 &&
		            enemy.center.y <= this.main.game.canvas.height
		        );
		    });

		    if (absorber) {
		    	if (this.invisible && source == 'physical') this.invisible = false;
		        absorber.getDamaged(
		            amount,
		            source,
		            ability,
		            isCritical,
		            alreadyCursed,
		            pokemon,
		            tower,
		            true
		        );
		        return;
		    }
		}

	   	if (this.passive?.id == 'herbogenesis' && (
	   		['heal', 'bitterBlade', 'takeHeart', 'soulHeartReactor'].includes(ability?.id) ||
	   		['leftovers', 'shellBell', 'clefairyDoll'].includes(pokemon?.item?.id)
	   	)) {
	   		this.regeneration = Math.max(0, this.regeneration - 1000);
	   		this.achievementCount++;
	   	}

	   	if (this.passive?.id == 'electrogenesis' && !this.stunned && (this.hp > (this.hpMax * 0.5))) return;
	    if (this.passive?.id == 'nebulogenesis' && source == 'physical') {
	    	this.passiveTimer += 1;
	    	if (this.passiveTimer > 8) {
	    		if (this.passiveTimer == 11) this.passiveTimer = 0;
	    		this.achievementCount++;
	    		this.floatingTexts.push({
		            text: `MISS`,
		            timer: 0,
		            duration: 1000,
		            y: this.position.y,     
		            vy: -60,       
		            alpha: 1,
		            color: '#b9c9e0'
		        });
		        return;
	    	}
	    }

	    if (this.passive?.id == 'sweetScent' && source == 'physical') {
	    	let evadeTry = Math.floor(Math.random() * 100);
	    	if (evadeTry < 5) {
	    		this.invisible = true;
	    		this.floatingTexts.push({
		            text: `MISS`,
		            timer: 0,
		            duration: 1000,
		            y: this.position.y,     
		            vy: -60,       
		            alpha: 1,
		            color: '#b9c9e0'
		        });
		        return;
	    	}
	    }
	    	
	    if (this.passive?.id == 'coconutDrop' && source == 'physical') {
	    	this.passiveCharges++;
	    	if (this.passiveCharges === 6) {
	    		this.passiveCharges = 0;
	    		const waypointEnemy = this.waypoints.slice(this.waypointIndex);

		    	this.main.area.enemies.push(
					new Enemy(
						this.center.x + (Math.random()*30)-20,
						this.center.y + (Math.random()*30)-20,
						enemyData.exeggcute,
						waypointEnemy,
						this.main,
						this.main.game.ctx,
					)
				)
	    	}
	    }

	    if (this.enemy.id == 'shaymin' && (pokemon?.item != undefined && pokemon?.specie?.id != 142)) this.achievementCount++;
	    if (this.enemy.id == 'groudon' && tower?.tile?.land === 2) this.achievementCount++;
	    if (this.enemy.id == 'tapuLele' && pokemon?.power > 100) this.achievementCount++;

	    if (this.passive?.id == 'prankster' && ['burn', 'poison',' nightmare'].includes(source)) amount = Math.floor(amount/2);
	    if (this.passive?.id == 'psychogenesis') amount = (pokemon?.item != null && pokemon?.specie?.id != 142) ? Math.floor(amount * 0.65) : Math.floor(amount * 1.15);

	    if (this.passive?.id == 'abyssalBound' && !(tower?.tile?.land == 3 || pokemon?.item?.id == 'squirtBottle' || pokemon?.carriedBy?.ability?.id == 'icePlatform')) return;
	    if (this.passive?.id == 'heavyMetal' && source == 'physical') amount = Math.floor(amount * 0.3);

	    if (this.enemy.id == 'nihilego' && this.achievementCount <= 0) {
	    	if (pokemon?.tiles[0] == 3 && pokemon?.tiles.length == 1) {
	    	} else this.achievementCount++;	
	    }

	   	let cursedDamageSpread = amount;

	    if (pokemon?.item?.id == 'strangeIdol' && ['physical', 'link'].includes(source)) {
	    	let strangeIdolBuff = 50;
	    	this.main.area.enemies.forEach(e => {
	            if (e !== this && e.cursed && e.hp > 0) {
	            	strangeIdolBuff -= 1;
	        	}
		    });
		    if (strangeIdolBuff > 0) amount += Math.ceil(amount * strangeIdolBuff/100);
		}

		if (this.passive?.id == 'fluffy' && ['physical', 'link'].includes(source) && this.statusEffects.some(e => e.type === 'burn')) amount *= 2;

		if (pokemon?.ability?.id == 'waterSpout') {
			let debuff = Math.max(this.hp / this.hpMax, 0);
			amount = Math.ceil(amount * debuff)
		}

		if (pokemon?.ability?.id == 'heatCrash' && ['physical', 'link'].includes(source)) amount = Math.ceil(amount * Math.max(0.1, this.speed));
		if (pokemon?.ability?.id == 'honeyGather' && source == 'physical') this.main.area.honeyGather++;
		if (this.passive?.id == 'honeyGatherBoss' && source == 'physical') this.main.area.honeyGather++;

	    if (pokemon?.item?.id == 'spellTag' && this.statusEffects.length > 0) {
	    	let spellTagBonus = 0
			this.statusEffects.forEach((effect) => {
				if (effect.type != 'nightmare') spellTagBonus += 0.15;
				if (pokemon?.ability?.id == 'simple') spellTagBonus += (0.15 * 0.75);
			})
			amount = Math.ceil(amount * Math.min(1.5, (1 + spellTagBonus)));
		}

		if (pokemon?.item?.id == 'stickyBarb' && this.statusEffects.length > 0) {
			this.statusEffects.forEach((effect) => {
				if ((effect.type == 'stun' || effect.type == 'slow') && ['physical', 'link'].includes(source)) amount = (pokemon?.ability?.id == 'simple') ? Math.ceil(amount * 2.275) : Math.ceil(amount * 1.3);		
			})
		}

		if (pokemon?.ability?.id === 'sacredFire') {
		    const nightmare = this.statusEffects.find(
		        effect => effect.type === 'nightmare'
		    );

		    if (nightmare) {
		        nightmare.stacks = nightmare.stacks ?? 1;

		        amount += Math.floor(amount * nightmare.stacks); 

		        nightmare.stacks--;

		        if (nightmare.stacks <= 0) {
		            this.statusEffects = this.statusEffects.filter(
		                effect => effect !== nightmare
		            );

		            this.nightmaredBy = null;
		        }
		    }
		}

		if (pokemon?.item?.id == 'electirizer' && this.statusEffects.length > 0) {
			this.statusEffects.forEach((effect) => {
				if (effect.type == 'stun' && ['physical', 'link'].includes(source)) amount = Math.ceil(amount * 1.3);		
			})
		}

		if (pokemon?.item?.id == 'magmarizer' && this.statusEffects.length > 0) {
			this.statusEffects.forEach((effect) => {
				if (effect.type == 'burn' && ['physical', 'link'].includes(source)) amount = Math.ceil(amount * 1.3);		
			})
		}

		if ((pokemon?.ability?.id == 'flashFire' || pokemon?.ability?.id == 'solarPower') && this.statusEffects.length > 0) {
			this.statusEffects.forEach((effect) => {
				if (effect.type == 'burn' && ['physical', 'link'].includes(source)) amount = Math.ceil(amount * 2);		
			})
		}

		if (['harshSunlight', 'extremelyHarshSunlight'].includes(this.main.area.weather) && this.main.area.solarPower) {
			if (BURN_ABILITIES.includes(pokemon?.ability?.id) && this.statusEffects.length > 0) {
				this.statusEffects.forEach((effect) => {
					if (effect.type == 'burn' && ['physical', 'link'].includes(source)) amount += Math.ceil(amount * 0.25);		
				})
			}
		}
		
		if (pokemon?.ability?.id == 'venomDrench' && this.statusEffects.length > 0) {
			this.statusEffects.forEach((effect) => {
				if (effect.type == 'poison' && ['physical', 'link'].includes(source)) amount = Math.ceil(amount * 2);		
			})
		}

		if (pokemon?.item?.id == 'badgeOfHonor' && ['physical', 'link'].includes(source)) {
			let maxCap = (pokemon?.ability?.id == 'simple') ? 52.5 : 30;
			let badgeMult = Math.min(maxCap, (this.main.player.stars / 30));
			amount += Math.ceil(amount * (badgeMult / 100));	
		}

		if ((
			ability?.id === 'armorBreak' || ability?.id === 'rageFist' || 
			ability?.id === 'armorBreakSplash' || ability?.id === 'piercingDrill' || 
			ability?.id === 'armorBreakDoubleShot' || 
			pokemon?.item?.id == 'shieldBreakerBullet') && 
			this.armorMax > 0 && source == 'physical' &&
			this.passive?.id !== 'rockHead'
	    ) {
			amount *= 2;
			if (this.passive?.id === 'weakArmor') amount = Math.ceil(amount * 1.5);
		}

		if (ability?.id === 'knockOff' && this.passive != undefined) amount *= 2;

		if (!isCritical && ability?.id === 'icicleSpear' && this.stunned) {
			isCritical = true;
			amount = Math.ceil(amount * 1.5);
		}

		if (ability?.id == 'strongJaw' && this.armorMax > 0) {
			if (this.armor > 0) {
				if (!isCritical) {
					isCritical = true;
					amount = Math.ceil(amount * 1.5);
				}
				if (this.passive?.id === 'weakArmor') amount = Math.ceil(amount * 1.5);
			} else amount *= 2;
		}

		if (isCritical && this.main.area.enemies.some(enemy => {
		    if (
		        enemy.dying ||
		        enemy.hp <= 0 ||
		        enemy.passive?.id !== 'criticalAura'
		    ) return false;

		    if (!enemy.hasEnteredCanvas) return false;

		    return (
		        enemy.center.x >= 0 &&
		        enemy.center.x <= this.main.game.canvas.width &&
		        enemy.center.y >= 0 &&
		        enemy.center.y <= this.main.game.canvas.height
		    );
		})) {
		    isCritical = false;
		}

		if (ability?.id == 'secretSword' && this.regeneration > 0) {
			this.regeneration = Math.max(0, this.regeneration - 10);
			if (this.passive?.id == 'herbogenesis') this.achievementCount++;
		}

		if (
			ability?.id === 'ancientPower' &&
			this.armorMax > 0 && source == 'physical' &&
			this.passive?.id !== 'rockHead'
	    ) amount += Math.floor(amount * (this.main.player.fossilInTeam * 0.15));

		if (
			ability?.id === 'ancientPowerPlus' &&
			this.armorMax > 0 && source == 'physical' &&
			this.passive?.id !== 'rockHead'
	    ) amount += Math.floor(amount * (this.main.player.fossilInTeam * 0.2));

		if (pokemon?.ability?.id === 'corrosion' && this.armor > 0 && source == 'physical') {
	    	amount += Math.ceil(Math.min(this.armor, this.armorMax * 0.05)) 
	    }

	    if (pokemon?.ability?.id === 'corrosionMega' && this.armor > 0 && source == 'physical') {
	    	amount += Math.ceil(Math.min(this.armor, this.armorMax * 0.075)) 
	    }

	    if (pokemon?.ability?.id === 'spiralDrain' && !this.enemy.isBoss) {
			amount += Math.floor(this.hpMax * 0.03);
		}

		if (this.stunned && this.isInsideAbilityField('machBolt')) {
		    amount = Math.ceil(amount * 1.2);
		}

		if (this.armor <= 0 && this.isInsideAbilityField('naturesJudgement')) {
		    amount = Math.ceil(amount * 1.2);
		}

		if (this.isInsideAbilityField('charmedCharm') &&
			(
				['heal', 'bitterBlade', 'takeHeart', 'seedFlare', 'soulHeartReactor'].includes(pokemon?.ability?.id)
			)
		) {
		    amount = Math.ceil(amount * 1.2);
		}

		if (pokemon?.ability?.id === 'hyperCutter' && (this.hp < (this.hpMax * 0.5)) && source == 'physical') amount += Math.ceil(amount * 0.5);
		if (pokemon?.ability?.id === 'destructiveMaw' && (this.hp < (this.hpMax * 0.5)) && source == 'physical') amount += Math.ceil(amount);

		if ((pokemon?.ability?.id == 'technician' || pokemon?.item?.id == 'metalCoatReal') && amount <= 1000 && source == 'physical') amount = Math.ceil(amount * 1.5);

		if (this.passive?.id === 'lightMetal' && amount > 1000) amount = 1000;
		if (this.passive?.id === 'lightMetal' && amount > 500) this.achievementCount++;

		if (this.passive?.id === 'shellSmash' && isCritical) {
			this.baseSpeed += 0.5;
	        this.speed += 0.5;
			this.passiveTimer = 2000;
		}

		if (pokemon?.item?.id == 'luckyPunch' && isCritical) {
			tower.luckyPunchStack = Math.min(5, tower.luckyPunchStack + 1);
        	tower.luckyPunchTimer = 6000;
		}

		if (pokemon?.specie?.key === 'durant') {
            const heatmor = this.main.area.towers.find(t => t.pokemon?.specie?.key === 'heatmor');
            if (heatmor) amount = 1;
        }

		if (this.passive?.id === 'clangingScales') {
			if (this.armor > 0) amount = Math.ceil(amount * 0.5);
			else amount = Math.ceil(amount * 2);
		}

		if (pokemon?.ability?.id == 'flowerTrick' && isCritical) {
			tower.attackCooldown = 0;
		}
		//if (this.passive?.id === 'sturdy' && source == 'physical' && this.hp < this.hpMax * 0.3) amount = 0;
		if (this.passive?.id === 'disguise' && source == 'physical' && this.armor > 0) amount = 0;
		
		if (this.passive?.id === 'sturdy') amount = Math.max(0, amount - 200);
		if (this.passive?.id === 'iceBody' && isCritical) {
			this.achievementCount++;
			amount = 0;
		}

		if (this.passive?.id === 'guardSplit') {
			const missingArmorPercent = 1 - (this.armor / this.armorMax);
			const guardSplitMultiplier = 1 - (missingArmorPercent * 0.5);
			amount = Math.ceil(amount * guardSplitMultiplier);
		}

		if (this.passive?.id === 'clearBody' && isCritical) {
			this.achievementCount++;
		}

		if (this.passive?.id === 'steamEngine' && tower?.tile?.land === 3 && this.passiveTimer == 0) {
			this.speed += 1;
			this.baseSpeed += 1;
			this.passiveTimer = 1000;
		}

		if (this.enemy.id == 'volcanion' && tower?.tile?.land === 3) this.achievementCount += amount;

		if (this.passive?.id === 'sheerForce' && source == 'physical'){
			if (amount < 1000) { amount = 0; }
			else {
				this.passiveActivated = true;
			}
		} 

		if (this.passive?.id === 'pheromoneRush' && this.poisonedBy) {
			this.achievementCount++;
			this.statusEffects.forEach(effect => { 
				if (effect.type === 'poison') amount = Math.floor(amount + (amount * 0.03 * effect.stacks))
			})
		}

		if (this.passive?.id === 'criticalLearning') amount = (isCritical) ? 1 : 0;

		if (this.passive?.id === 'ironDefense') {
			amount = Math.floor(amount - (amount * 0.01 * this.passiveCharges))
			this.passiveCharges = Math.min(100, this.passiveCharges + 1);
			if (this.passiveCharges > 26) this.achievementCount++;
		}

		if (this.passive?.id === 'remoaid' && source == 'physical' && Math.random() < 0.2) {
			const waypointEnemy = (this.main.area.inChallenge.mirror) ?
				this.main.area.map.waypointsMirror[Math.floor(Math.random() * this.main.area.map.waypointsMirror.length)] :
				this.main.area.waypoints[Math.floor(Math.random() * this.main.area.waypoints.length)]

			this.main.area.enemies.push(
				new Enemy(
					waypointEnemy[0].x,
					waypointEnemy[0].y,
					enemyData.remoraid,
					waypointEnemy,
					this.main,
					this.main.game.ctx,
				)
			)
		}

		if (this.passive?.id === 'dragonsMaw') amount += Math.floor(amount * 0.15 * this.passiveCharges);

		if (this.passive?.id === 'kingsShield' && ((this.hp / this.hpMax * 100) < (this.passiveCharges * 20))) {
			this.passiveCharges--;
			const waypointEnemy = (this.main.area.inChallenge.mirror) ?
				this.main.area.map.waypointsMirror[Math.floor(Math.random() * this.main.area.map.waypointsMirror.length)] :
				this.main.area.waypoints[Math.floor(Math.random() * this.main.area.waypoints.length)]

			this.main.area.enemies.push(
				new Enemy(
					waypointEnemy[0].x,
					waypointEnemy[0].y,
					enemyData.aegislash,
					waypointEnemy,
					this.main,
					this.main.game.ctx,
				)
			)
		}

		if (this.passive?.id === 'dauntlessShield' && source == 'physical') {
			this.passiveCharges -= 2;
  			amount = Math.floor(Math.max(0, amount * (1 - this.passiveCharges / 100)));

  			if (this.passiveCharges < 0 && !this.passiveActivated) {
  				this.passiveActivated = true;
  				this.sprite.src = this.enemy.sprite.shield;
  				this.baseSpeed = 0.8;
	    		this.speed = 0.8;
  			}
		}

		if (this.passive?.id === 'intrepidSword' && source == 'physical' && !this.passiveActivated) {
			this.passiveCharges += 2;
  			amount = Math.floor(Math.max(0, amount * (1 - this.passiveCharges / 100)));

  			if (this.passiveCharges >= 100 && !this.passiveActivated) {
  				this.passiveActivated = true;
  				this.sprite.src = this.enemy.sprite.sword;
  				this.baseSpeed = 1.2;
	    		this.speed = 1.2;
	    		this.passiveCharges = 0;
  			}
		}
		
		if (this.passive?.id === 'asOne') amount = Math.ceil(amount * this.main.area.activePieces * 2);

		if (this.passive?.id === 'slackOff' && source == 'physical') this.hp = Math.min(this.hp + 50, this.hpMax);

		if (this.passive?.id === 'flameBody' && source == 'physical') {
			const dx = this.center.x - tower.center.x;
			const dy = this.center.y - tower.center.y;
			const distance = Math.hypot(dx, dy);
			if (distance < 120) {
				amount = Math.floor(amount / 2);
				this.achievementCount += amount;
			}
		}

		if (this.passive?.id === 'luchadoro' && source == 'physical' && this.armor > 0) amount = Math.floor(amount / 2);
		// if (amount >= 9999 && source == 'physical') this.main.player.unlockAchievement(18)
	    if (amount > this.main.player.stats.highestHit && source == 'physical') this.main.player.stats.highestHit = amount;

	    let cursedDamage = amount;
	    let armorDamage = amount;

	    if (pokemon) {
	    	this.main.area.totalDamageDealt += amount;
		    pokemon.damageDealt += amount; 

		    this.main.area.totalTrueDamageDealt += Math.min((this.hp + this.armor), amount);
		    pokemon.trueDamageDealt	+= Math.min((this.hp + this.armor), amount); 
		    pokemon.stadistics['damage'] = (pokemon.stadistics['damage'] ?? 0) + Math.min(this.hp + this.armor, amount);
		    if (amount > (pokemon.stadistics['highestHit'] ?? 0)) pokemon.stadistics['highestHit'] = amount;
	    }

	    this.main.player.recordEnemyDamage(this.enemy.id, Math.min(this.hp + this.armor, amount));

	    let litCoalChance = Math.random();
	    if (pokemon?.item?.id == 'litCoal' && this.canBurn && (litCoalChance < 0.1 || pokemon?.ability?.id == 'simple' && litCoalChance < 0.175)) {
			this.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, pokemon); 
		}

		// HEALS
		this.main.area.healUsed = this.main.area.healUsed || {};
		if (this.passive?.id !== 'healBlock') {
			if ((this.main.player.health?.[this.main.area.map.id] ?? 14) < 14 || (this.main.area.heartScale ?? 0) < 5) {
				if (pokemon?.item?.id == 'leftovers' && Math.random() < 0.01 && !this.main.area.leftoversWaveUsed) {
					playSound('hit3', 'effect');
					this.main.player.getHealed(1);
					this.main.area.leftoversWaveUsed = true;
					this.main.area.heartScale++;
					this.main.area.roomService += 20;
				}

				if (pokemon?.item?.id == 'shellBell' && pokemon?.trueDamageDealt > 50000 && !this.main.area.shellBellWaveUsed) {
					playSound('hit3', 'effect');
					this.main.player.getHealed(1);
					this.main.area.shellBellWaveUsed = true;
					this.main.area.heartScale++;
					this.main.area.roomService += 20;
				}

				if (pokemon?.item?.id == 'clefairyDoll' && pokemon?.trueDamageDealt > 25000 && !this.main.area.clefairyDollUsed) {
					playSound('hit3', 'effect');
					this.main.player.getHealed(1);
					this.main.area.clefairyDollUsed = true;
					this.main.area.heartScale++;
					this.main.area.roomService += 20;
				}
			
				let baseHealChance = 0.05;
				if (['soulHeartReactor', 'bitterBlade'].includes(ability?.id)) baseHealChance = 0.01;
				else if (pokemon?.item?.id == 'seedFlare') baseHealChance = 0.02;
				else if (pokemon?.item?.id == 'auspiciousArmor') baseHealChance = 0.002;

				const uses = this.main.area.healUsed[pokemon?.id] ?? 0;
				const healChance = (ability?.id === 'takeHeart') ? baseHealChance : baseHealChance / Math.pow(2, uses);

			    if (
				    (ability?.id === 'heal' || ability?.id === 'soulHeartReactor' ||ability?.id === 'bitterBlade' || ability?.id === 'seedFlare' || ability?.id === 'takeHeart' || pokemon?.item?.id === 'auspiciousArmor') && 
				    pokemon?.item?.id != 'lifeOrb' && 
				    uses < 3 &&
				    Math.random() < healChance
				) {
					const healValue = (pokemon?.item?.id == 'bigRoot') ? 2 : 1;
					playSound('hit3', 'effect');

					if (pokemon?.item?.id == 'propCase') {
						if (this.main.player.health[this.main.area.routeNumber] > 1) {
							this.main.player.getDamaged(1);
							this.main.area.hitsReceived++;
						}		
						this.main.area.pendingHeal++;
					} else {
				        this.main.player.getHealed(healValue);
					}
			       
			    	if (ability?.id === 'bitterBlade' || pokemon?.item?.id === 'auspiciousArmor') this.main.area.healUsed[pokemon?.id] = 3
			    	else if (['takeHeart', 'soulHeartReactor'].includes(ability?.id)) this.main.area.healUsed[pokemon?.id] = uses + 1.5;
			    	else this.main.area.healUsed[pokemon?.id] = uses + 1;
			    
		   			this.main.area.heartScale += healValue;
		   			this.main.area.roomService += 20;
			    }
		    }
		}
		
	    if (pokemon?.item?.id == 'shellBell' && pokemon?.trueDamageDealt > 50000) this.main.area.shellBellWaveUsed = true;

	    if (ability?.id === 'greed') {
	    	let g = Math.ceil(this.gold * 0.1);
	    	this.main.player.achievementProgress.stolenGold += g;
	    	// if (this.main.player.achievementProgress.stolenGold >= 100000) this.main.player.unlockAchievement(21);
	    	this.main.area.goldWave += g;
	    	this.main.player.changeGold(g);
	    }

	    let armorHit = 0;

	    if (this.invisible && source == 'physical') {
	    	this.invisible = false;
	    	if (this.enemy.id === 'lunala') this.achievementCount++;
	    }

	    // daño a armadura
	    if (this.armor && this.armor > 0) {
	        const remainingArmor = this.armor - armorDamage;
	        if (remainingArmor >= 0) {
	            this.armor = remainingArmor;
	            armorHit = armorDamage;
	            amount = 0;
	        } else {
	            armorHit = this.armor;
	            amount = -remainingArmor;
	            this.armor = 0;
	        }
	    }

	    if (this.passive?.id === 'anchorShot' && this.armor === 0) this.main.area.anchorShot = true;

	    if (this.passive?.id === 'fullMetalBody' && source == 'physical') this.armor += amount

	    this.hp -= amount;

	    if (this.passive?.id === 'eonUnion' && !fromEonUnion && (amount > 0 || armorHit > 0)) {
	        this.main.area.enemies.forEach(e => {
	            if (e !== this && e.hp > 0 && e.passive?.id === 'eonUnion') {
	                e.getDamaged(amount + armorHit, source, ability, isCritical, alreadyCursed, pokemon, tower, ignoreStanceChange, true);
	            }
	        });
	    }

	    if (this.passive?.id === 'klutz') {
	    	if (pokemon?.item?.isRetirable && pokemon?.ability?.id !== 'scrappy') {
	    		pokemon.recoverItem = pokemon.item;
	    		pokemon?.retireItem();
	    	}
	    }

	    if (this.armor <= 0 && this.passive?.id == 'pressure' && !this.passiveActivated) {
	    	this.passiveActivated = true;
			this.main.area.heavyMetal = true;
	    }

	    if (this.hp < this.hpMax * 0.5 && this.passive?.id == "lunarBlessing") {
	    	this.passiveActivated = true;

	    	this.regeneration = 1000;

	    	this.statusEffects = this.statusEffects.filter(e => e.type === 'nightmare');
		    this.burnedBy = null;
		    this.scorchedBy = null;
		    this.poisonedBy = null;
		    this.stunned = false;
		    
		    const slowEffects = this.statusEffects.filter(e => ['slow', 'shadowTagSlow'].includes(e.type) && e.duration !== 0);
		    if (slowEffects.length === 0) {
		        this.speed = this.baseSpeed;
		    }
		    
		    playSound('regenerator', 'effect');
	    }

	    if (this.hp < this.hpMax * 0.5 && ['groudon', 'kyogre'].includes(this.enemy.id) && !this.passiveActivated) {
	    	this.passiveActivated = true;
	    	this.armorMax = 75000;
	    	this.armor = 75000;
	    	this.sprite.src = this.enemy.sprite.primal;

	    	if (this.statusEffects['stun']) {
	    		this.stunned = false;
	    		this.statusEffects['stun'].duration = 0;
	    	}

	    	this.passiveTimer = 3000;
			this.stunned = true;
			this.invulnerable = true;

			playSound('earthquake', 'effect');

			this.main.game.startShake(28, (3000/this.main.game.speedFactor));
	    	if (this.main.area.weather != 'starryNight') this.main.area.weather = (this.enemy.id == 'groudon') ? 'extremelyHarshSunlight' : 'heavyRain';
			this.main.UI.displayWeather();
	    }

	    if (this.passive?.id === 'magmaStorm' && this.hp <= 0 && this.burnedBy === null) this.hp = 1;

	    if (this.hp <= 0 && !this.dying) {
	    	if (this.passive?.id === 'regenerator' && !this.regeneratorUsed) {
			    this.regeneratorUsed = true;
			    this.hp = 1;
			    this.armorMax = 50000;
	    		this.armor = 50000;
			    // preparar resurrección
			    this.isRegeneratorReviving = true;
			    this.regeneratorReviveTimer = 5000 / this.main.game.speedFactor;

			    this.statusEffects.length = 0;
			    this.burnedBy = null;
			    this.scorchedBy = null;
				this.poisonedBy = null;
				this.nightmaredBy = null;
				this.cursed = false;
			    this.stunned = true;
			    //this.invulnerable = true;

			    playSound('hit3', 'effect');
			    return;
			}

			if (this.passive?.id == 'schooling' && !this.passiveActivated) {
		    	this.passiveActivated = true;
		    	const waypointEnemy = this.waypoints.slice(this.waypointIndex);

		    	for (let i = 0; i < 100; i++) {
		    		this.main.area.enemies.push(
						new Enemy(
							this.center.x + (Math.random()*30)-20,
							this.center.y + (Math.random()*30)-20,
							enemyData.wishiwashiSolo,
							waypointEnemy,
							this.main,
							this.main.game.ctx,
						)
					)
		    	}
		    }

		    if (this.passive?.id == 'honeyGather') this.main.area.honeyGather += 5;

		    if (this.passive?.id == 'healer' && !this.passiveActivated) {
		    	this.passiveActivated = true;
		    	playSound('hit3', 'effect');
				this.main.player.getHealed(1);
				this.main.area.heartScale++;
				this.main.area.roomService += 20;
		    }

	    	if (ability?.id === 'moxie') {	    		
	    	 	if (this.main.area.moxieUsers[pokemon?.id] == undefined) this.main.area.moxieUsers[pokemon?.id] = 1;
	    	 	else this.main.area.moxieUsers[pokemon?.id] += 1;
	    	}

	    	if (ability?.id === 'bulletPunchMega') {	    		
	    	 	tower.bulletPunchCharges = 5;
	    	}

	    	this.main.area.goldWave += this.gold;
	        this.main.player.changeGold(this.gold);
	        this.main.player.recordEnemyDefeated(this.enemy.id);

	        if (pokemon) pokemon.stadistics['defeated'] = (pokemon.stadistics['defeated'] ?? 0) + 1;

	        if (typeof this.main.area.triggerStall === 'function') {
			    this.main.area.triggerStall(this);
			}

			if (this.main.area.magmaStorm && this.statusEffects.some(e => e.type === 'burn')) {
				const explosionDamage = Math.ceil(this.hpMax * 0.1);
				const explosionRadius = 50;
				playSound('explosion', 'effect');
				this.main.area.enemies.forEach(e => {
					if (e === this || !e || e.hp <= 0) return;

					const dist = Math.hypot(e.center.x - this.center.x, e.center.y - this.center.y);
					if (dist > explosionRadius) return;

					e.getDamaged(explosionDamage, 'physical', null, false, new Set(), this.main.area.magmaStorm.pokemon, this.main.area.magmaStorm);

					const existingBurn = e.statusEffects.find(se => se.type === 'burn');
					if (e.canBurn) {
						if (this.main?.area?.magmaStorm?.pokemon?.item?.id == 'magmaStone') e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 20 }, this.main?.area?.magmaStorm?.pokemon);
			            else if (this.main?.area?.magmaStorm?.pokemon?.item?.id == 'falmeOrb') e.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, this.main?.area?.magmaStorm?.pokemon);
			            else e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, this.main?.area?.magmaStorm?.pokemon);
					}
				});

				this.magmaStormBurst = { elapsed: 0, duration: 450, radius: explosionRadius };
			}

	        this.dying = true;
	        this.hp = 0;
	        this.main.area.defeatedEnemiesWave++;
	        if (['whiteRay', 'autotomize'].includes(pokemon?.ability?.id)) this.main.area.defeatedEnemiesWaveByUB++;
	        if (this.enemy.id == 'kyogre' && tower?.tile?.land === 1) this.achievementCount++;
	        if (this.enemy.id == 'thundurus' && this.stunned) this.achievementCount++;
	        this.tryAchievementUnlock();
	    }

	    const minSpacing = 12; 
	    const startYOffset = 12; 

	    if (amount > 0) {
	      	const color = isCritical
				? '#ffeb3b'
				: source === 'burn'
				? '#c96937'
				: source === 'scorch'
				? '#87150f'
				: source === 'poison'
				? '#70ac4c'
				: '#e06666';

	        let startY = this.position.y - 10 + startYOffset;

	        for (const ft of this.floatingTexts) {
	            if (Math.abs(startY - ft.y) < minSpacing) {
	                startY = Math.min(startY, ft.y - minSpacing);
	            }
	        }

	        this.floatingTexts.push({
	            text: `-${amount}${isCritical ? '!' : ''}`,
	            timer: 0,
	            duration: 1000,
	            y: startY,     
	            vy: -60,       
	            alpha: 1,
	            color
	        });
	    }

	    if (armorHit > 0) {
	        let startY = this.position.y - 10 + startYOffset;
	        for (const ft of this.floatingTexts) {
	            if (Math.abs(startY - ft.y) < minSpacing) {
	                startY = Math.min(startY, ft.y - minSpacing);
	            }
	        }

	        this.floatingTexts.push({
	            text: `-${armorHit}${isCritical ? '!' : ''}`,
	            timer: 0,
	            duration: 1000,
	            y: startY,
	            vy: -60,
	            alpha: 1,
	            color: isCritical ? '#ffeb3b' : '#66ccff'
	        });
	    }

	    if ((ability?.id === 'curse' || ability?.id === 'curseSplash' || ability?.id === 'magicBounce' || ability?.id === 'willOWisp' || ability?.id === 'curseDoubleShot' ||  projectileSpecial == 'curse') && this.cursed && cursedDamage > 0 && !alreadyCursed.has(this)) {
	        alreadyCursed.add(this);
	        this.main.area.enemies.forEach(e => {
	            if (e !== this && e.cursed && e.hp > 0 && !alreadyCursed.has(e)) {
	                e.getDamaged(cursedDamageSpread, source, ability, false, alreadyCursed, pokemon);
	                if (pokemon?.item?.id === 'amuletCoin') {
			            let cursedGold = Math.ceil(cursedDamageSpread * 0.0005 * this.main.player.stars);
			            this.main.area.goldWave += cursedGold;
			            this.main.player.changeGold(cursedGold);
			        }
	            }
	            if (ability?.id === 'willOWisp' && e.canBurn && e.cursed) {
	            	if (pokemon?.item?.id == 'falmeOrb') e.applyStatusEffect({ type: 'burn', damagePercent: 0.0075, duration: 10 }, pokemon);
                    else e.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, pokemon);
	            }
	        });
	    }
	}

	updateStatusEffects(deltaTime) {
	    if (this.statusEffects.length === 0) return;

	    this.statusEffects.forEach(effect => {
	        effect.timer += deltaTime;
	        const interval = 1000;

	        if (effect.type === 'burn') {
	            while (effect.timer >= interval && effect.duration > 0) {
		if (this.passive?.id == 'flashFire') {
			this.hp = Math.min(this.hp + (this.hpMax * 0.01), this.hpMax);
		} else {
			this.getDamaged(Math.ceil(this.hpMax * effect.damagePercent), 'burn', null, false, new Set(), this.burnedBy);
		}

	                effect.timer -= interval;
	                if (typeof effect.duration === 'number') effect.duration -= 1;
	                if (effect.duration <= 0) this.burnedBy = null;
	            }
	        }

	        if (effect.type === 'scorch') {
				while (effect.timer >= interval && effect.duration > 0) {
					const scorchDamage = Math.ceil(this.armorMax * effect.damagePercent);

					this.getDamaged(scorchDamage, 'scorch', null, false, new Set(), this.scorchedBy);

					effect.timer -= interval;
					if (typeof effect.duration === 'number') effect.duration -= 1;
					if (effect.duration <= 0) this.scorchedBy = null;
				}
			}

	        if (effect.type === 'poison' && this.passive?.id != 'pheromoneRush') {
	            while (effect.timer >= interval) {
	                const stacks = effect.stacks || 1;
	                const poisonDamage = Math.ceil(this.hpMax * effect.damagePercent * stacks);
	                this.getDamaged(poisonDamage, 'poison', null, false, new Set(), this.poisonedBy);
	                effect.timer -= interval;
	            }
	        }

	        if (effect.type === 'nightmare') {
	            while (effect.timer >= interval) {
	                const stacks = effect.stacks || 1;
	                const nightmareDamage = Math.ceil(this.nightmaredBy.power * 0.2 * stacks);
	                this.getDamaged(nightmareDamage, 'nightmare', null, false, new Set(), this.nightmaredBy);
	                effect.timer -= interval;
	            }
	        }

	        if (effect.type === 'slow') {
	            if (!effect.applied) {
	                effect.applied = true;
	            }
	            if (effect.duration !== undefined && effect.timer >= effect.duration * 1000) {
	                effect.duration = 0;
	            }
	        }

	        if (effect.type === 'stun') {
	            this.stunned = true;
	            if (effect.duration !== undefined && effect.timer >= effect.duration * 1000) {
	                this.stunned = false;
	                effect.duration = 0;
	            }
	        }
	    });

	    // Filtrar efectos terminados
	    this.statusEffects = this.statusEffects.filter(e => e.duration === undefined || e.duration > 0);

	    // RECOMPUTAR velocidad según slows activos
	    // const slowEffects = this.statusEffects.filter(e => ['slow', 'shadowTagSlow'].includes(e.type) && e.duration !== 0);
	    // if (slowEffects.length === 0) {
	    //     this.speed = this.baseSpeed;
	    // } else {
	    //     // multiplicar factores de slow
	    //     let factor = 1;
	    //     slowEffects.forEach(e => factor *= (e.slowPercent ?? 1));
	    //     this.speed = this.baseSpeed * factor;
	    // }
	}

	updateWeatherEffects(deltaTime) {
		if (
			this.position.x > this.main.game.canvas.width ||
			this.position.x < -30 ||
			this.position.y - 20 > this.main.game.canvas.height ||
			this.position.y < -20
		) return;

		if (['sandstorm', 'sandAvalanche'].includes(this.main.area.weather) && this.armor <= 0) {
	    	this.weatherTimer += deltaTime;
	        const interval = 1000;

	        if (this.weatherTimer >= interval) {
	        	let weatherDamage = (this.main.area.weather == 'sandstorm') ? 0.003 : 0.005;
	        	let sandstormMultiplier = 1;

	        	for (const tower of this.main.area.towers) {
				    if (!tower || tower.ability?.id === undefined) continue;

				    const distance = Math.hypot(
				        tower.center.x - this.center.x,
				        tower.center.y - this.center.y
				    );

				    if (distance > tower.range) continue;

				    if (tower?.ability?.id === 'sandStreamTyranitar') {
				        sandstormMultiplier *= 1.5;
				    } else if (tower?.ability?.id === 'sandStreamMegaTyranitar') {
				        sandstormMultiplier *= 1.5;
				    }
				}

	        	let damage = Math.ceil(this.hpMax * weatherDamage * sandstormMultiplier);

	        	this.weatherTimer = 0;
	        	if (this.passive?.id === 'asOne') damage = Math.floor(damage/4);
	        	this.getDamaged(damage, 'sandstorm', null, false, new Set(), this.main.area.weatherBy);
	        }
	    }
	}

	drawFloatingTexts() {
        this.floatingTexts.forEach((ft) => {
            const x = this.position.x + this.width / 2;
            const y = ft.y;

            this.ctx.save();
            this.ctx.globalAlpha = ft.alpha ?? 1;

            this.ctx.font = '900 14px Arial';
            this.ctx.lineWidth = 1.5;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';

            this.ctx.strokeStyle = 'black';
            this.ctx.strokeText(ft.text, x, y);

            this.ctx.fillStyle = ft.color || '#c96937';
            this.ctx.fillText(ft.text, x, y);

            this.ctx.restore();
        });
	}

	updateFloatingTexts(deltaTime) {
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.timer += deltaTime;

            ft.y += ft.vy * (deltaTime / 1000);

            const minAlpha = 0.5;
            ft.alpha = Math.max(minAlpha, 1 - 0.4 * (ft.timer / ft.duration));

            if (ft.timer >= ft.duration) {
                this.floatingTexts.splice(i, 1);
            }
        }
	}

	applyStatusEffect(effect, pokemon) {
		if (effect.type != 'nightmare' && effect.type != 'curse') {
			if (this.passive?.id === 'waterVeil' && (this.main.area.weather === 'rain' || this.main.area.weather === 'thunderStorm')) return;
			if (this.passive?.id === 'leafGuard' && this.main.area.weather === 'harshSunlight' && !this.main.area.cloudNine) return;
		}

	    const existing = this.statusEffects.find(e => e.type === effect.type);
	   	if (existing) {
			if (effect.type === 'shadowTagSlow') {
				existing.timer = 0;
				existing.duration = effect.duration;
				existing.slowPercent = effect.slowPercent;
			} else if (effect.type === 'poison') {
				this.poisonedBy = pokemon;
	        	this.main.player.stats.appliedPoisons++;
	            existing.stacks = (existing.stacks || 1) + 1;
	            if (this.enemy.id === 'regirock') this.achievementCount++;
	        } else if (effect.type === 'nightmare') {
		this.nightmaredBy = pokemon;
	            existing.stacks = (existing.stacks || 1) + 1;
	            if (this.enemy.id === 'regirock') this.achievementCount++;
	        }
	    } else {
	    	if (effect.type === 'stun' && this.passive?.id == 'electrogenesis') {
	    		effect.duration *= 2;
			this.achievementCount++;
		}
		if ((effect.type === 'stun' || effect.type === 'slow') && this.passive?.id == 'vCrate') {
			this.baseSpeed -= 0.4;
			return this.speed -= 0.4;
		}

	        this.statusEffects.push({
	            ...effect,
	            timer: 0,
	            stacks: effect.type === 'poison' ? 1 : undefined
	        });
	        if (effect.type === 'stun') {
	        	this.lightningRodSearch();
	        	this.main.player.stats.appliedStuns++;
	        	// if (this.main.player.stats.appliedStuns >= 10000) this.main.player.unlockAchievement(13);
	        	if (this.passive?.id === 'spectralThief') this.invisible = true;
		if (this.enemy.id == 'tornadus') this.achievementCount++;
	        }
	        if (effect.type === 'slow') {
		this.main.player.stats.appliedSlows++;
		// if (this.main.player.stats.appliedSlows >= 10000) this.main.player.unlockAchievement(14);
		if (this.passive?.id === 'spectralThief') this.invisible = true;
		if (this.enemy.id == 'tornadus') this.achievementCount++;
	        }
	        if (effect.type === 'poison') {
		this.poisonedBy = pokemon;
		this.main.player.stats.appliedPoisons++;
		// if (this.main.player.stats.appliedPoisons >= 10000) this.main.player.unlockAchievement(16);
		if (this.enemy.id === 'regirock') this.achievementCount++;
	        }
	        if (effect.type === 'nightmare') {
		this.nightmaredBy = pokemon;
		if (this.enemy.id === 'regirock') this.achievementCount++;
	        }
	        if (effect.type === 'burn') {
		this.burnedBy = pokemon;
		this.main.player.stats.appliedBurns++;
		// if (this.main.player.stats.appliedBurns >= 10000) this.main.player.unlockAchievement(15);
		if (this.passive?.id === 'spectralThief') this.invisible = true;
		if (this.passive?.id === 'magmaStorm') {
			if (this.achievementTimer < 6000) this.achievementCount++;
			this.hpMax += this.armor;
			this.hp += this.armor;
	        	}
	        	if (this.enemy.id === 'regirock') this.achievementCount++;
	        }
	        if (effect.type === 'scorch') {
				this.scorchedBy = pokemon;

				if (this.enemy.id === 'regirock') this.achievementCount++;
			}
	        if (effect.type === 'curse' && this.passive?.id !== 'mummy') {
	        	this.main.player.stats.appliedCurses++;
	        	// if (this.main.player.stats.appliedCurses >= 10000) this.main.player.unlockAchievement(17);
	            this.cursed = true;
	        }
	    }

	    if (this.passive?.id === 'justified' && !['curse', 'nightmare'].includes(effect.type)) {
	        this.armorMax += 5000;
		this.armor += 5000;
		this.passiveActivated = true;
	    }
	}

	drawStatusEffects() {
	    if (this.statusEffects.length === 0) return;

	    const now = Date.now();
	    const centerX = this.position.x + this.width / 2;
	    const centerY = this.position.y + this.height / 2;

	    if (this.main.durationCC) {
	    	this.drawSlowIndicator(centerX);
	    	this.drawStunIndicator(centerX);
	    }
	    if (!this.main.particles) return;

	    this.statusEffects.forEach((effect, index) => {
	        let r, g, b;
	        const numParticles = 6;

	        const effectOffset = (index - (this.statusEffects.length - 1) / 2) * (this.width * 0.15);

	        if (effect.type === 'burn') [r, g, b] = [255, 80, 0];
			else if (effect.type === 'scorch') [r, g, b] = [135, 21, 15];
			else if (effect.type === 'poison') [r, g, b] = [180, 50, 255];
			else if (effect.type === 'nightmare') [r, g, b] = [80, 20, 120];
			else return;

	        for (let i = 0; i < numParticles; i++) {
	            const seed = i * 400;
	            const progress = ((now + seed) % 1500) / 1500;

	            const py = (centerY + this.height * 0.2) - (progress * this.height * 1.6);

	            const drift = Math.sin(now / 400 + i) * (this.width * 0.12);
	            const px = centerX + effectOffset + drift;

	            const size = (1 - progress) * 3.5;
	            const alpha = (1 - progress) * 0.9;

	            this.ctx.save();
	            this.ctx.beginPath();
	            this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;

	            this.ctx.shadowBlur = 5;
	            this.ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;

	            this.ctx.arc(px, py, size, 0, Math.PI * 2);
	            this.ctx.fill();
	            this.ctx.restore();
	        }
	    });
	}

	drawSlowIndicator(centerX) {
	    const slowEffects = this.statusEffects.filter(effect => {
	        return effect.type === 'slow' && typeof effect.duration === 'number' && effect.duration > 0;
	    });
	    if (slowEffects.length === 0) return;

	    const remainingSeconds = Math.max(...slowEffects.map(effect => {
	        return Math.max(0, effect.duration - ((effect.timer || 0) / 1000));
	    }));
	    if (remainingSeconds <= 0) return;

	    const longestDuration = Math.max(...slowEffects.map(effect => effect.duration || remainingSeconds));
	    const fillPercent = Math.max(0, Math.min(1, remainingSeconds / Math.max(0.1, longestDuration)));
	    const barWidth = 28;
	    const barHeight = 8;
	    const x = centerX - barWidth / 2;
	    const y = this.position.y + this.height - 3;
	    const label = `${remainingSeconds.toFixed(1)}s`;

	    this.ctx.save();
	    // Fondo y borde de la barra
	    this.ctx.fillStyle = 'rgba(4, 14, 18, 0.78)';
	    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
	    this.ctx.lineWidth = 1;
	    this.ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
	    this.ctx.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

	    // Progreso de la barra
	    this.ctx.fillStyle = 'rgba(16, 47, 57, 0.92)';
	    this.ctx.fillRect(x, y, barWidth, barHeight);
	    this.ctx.fillStyle = 'rgba(86, 226, 255, 0.95)';
	    this.ctx.fillRect(x, y, barWidth * fillPercent, barHeight);

	    // Configuración del texto
	    this.ctx.font = '10px monospace';
	    this.ctx.textAlign = 'center';
	    this.ctx.textBaseline = 'middle';
	    this.ctx.lineWidth = 2;
	    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';

	    // Dibujado del texto (ajustado +1px hacia abajo)
	    const textY = y + barHeight / 2 + 1;
	    this.ctx.strokeText(label, centerX, textY);
	    this.ctx.fillStyle = '#d6fbff';
	    this.ctx.fillText(label, centerX, textY);

	    this.ctx.restore();
	}

	drawStunIndicator(centerX) {
	    const stunEffects = this.statusEffects.filter(effect => {
	        return effect.type === 'stun' && typeof effect.duration === 'number' && effect.duration > 0;
	    });
	    if (stunEffects.length === 0) return;

	    const remainingSeconds = Math.max(...stunEffects.map(effect => {
	        return Math.max(0, effect.duration - ((effect.timer || 0) / 1000));
	    }));
	    if (remainingSeconds <= 0) return;

	    const longestDuration = Math.max(...stunEffects.map(effect => effect.duration || remainingSeconds));
	    const fillPercent = Math.max(0, Math.min(1, remainingSeconds / Math.max(0.1, longestDuration)));
	    const barWidth = 28;
	    const barHeight = 8;
	    const x = centerX - barWidth / 2;
	    const y = this.position.y + this.height - 3;
	    const label = `${remainingSeconds.toFixed(1)}s`;

	    this.ctx.save();
	    // Fondo y borde de la barra (Oscuro neutro)
	    this.ctx.fillStyle = 'rgba(18, 16, 4, 0.78)';
	    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
	    this.ctx.lineWidth = 1;
	    this.ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
	    this.ctx.strokeRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

	    // Progreso de la barra (Amarillos/Dorados)
	    this.ctx.fillStyle = 'rgba(57, 48, 16, 0.92)'; // Fondo de la barra (Amarillo muy oscuro)
	    this.ctx.fillRect(x, y, barWidth, barHeight);
	    this.ctx.fillStyle = 'rgba(255, 230, 86, 0.95)'; // Barra de carga (Amarillo brillante)
	    this.ctx.fillRect(x, y, barWidth * fillPercent, barHeight);

	    // Configuración del texto
	    this.ctx.font = '10px monospace';
	    this.ctx.textAlign = 'center';
	    this.ctx.textBaseline = 'middle';
	    this.ctx.lineWidth = 2;
	    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';

	    // Dibujado del texto (ajustado +1px hacia abajo)
	    const textY = y + barHeight / 2 + 1;
	    this.ctx.strokeText(label, centerX, textY);
	    this.ctx.fillStyle = '#fff9d6'; // Texto (Blanco amarillento)
	    this.ctx.fillText(label, centerX, textY);

	    this.ctx.restore();
	}

	lightningRodSearch() {
        const towers = this.main.area.towers;
        for (const tower of towers) {
            if (tower?.ability?.id !== 'lightningRod') continue;

            const radius = tower.range;
            const dx = tower.center.x - this.center.x;
	        const dy = tower.center.y - this.center.y;
	        const distance = Math.hypot(dx, dy);

	        if (distance <= radius && tower.lightningRodCharge < 10) {
	        	tower.lightningRodCharge++;
	            break;
	        }
	    }
	}

	isInsideAbilityField(abilityId) {
	    return this.main.area.towers.some(tower => {
	        if (tower?.ability?.id !== abilityId) return false;

	        const dx = tower.center.x - this.center.x;
	        const dy = tower.center.y - this.center.y;

	        return Math.hypot(dx, dy) <= 120;
	    });
	}

	tryAchievementUnlock() {
		if (this.main.area.isCustom) return;
		switch (this.enemy?.id) {
			case 'shaymin':
				if (this.achievementCount === 0) {
		        	this.main.player.unlockAchievement(0);
		        }
		        if (!this.main.player.secrets.shaymin && this.main.player.achievementsRework[0].status) {
	        		this.main.player.secrets.shaymin = true;
	        		this.main.UI.getSecret('shaymin');
	        	}
			break;
			case 'celebi':
				if (this.achievementTimer <= 7500) {
		        	this.main.player.unlockAchievement(1);
		        }
		        if (!this.main.player.secrets.celebi && this.main.player.achievementsRework[1].status) {
		        		this.main.player.secrets.celebi = true;
		        		this.main.UI.getSecret('celebi');
		        	}
			break;
			case 'lunala':
				if (this.achievementCount <= 5) {
		        	this.main.player.unlockAchievement(2);
		        }
		        if (!this.main.player.secrets.lunala && this.main.player.achievementsRework[2].status) {
		        		this.main.player.secrets.lunala = true;
		        		this.main.UI.getSecret('lunala');
		        	}
			break;
			case 'zapdos':
				if (this.achievementCount <= 3) {
		        	this.main.player.unlockAchievement(3);
		        }
		        if (!this.main.player.secrets.zapdos && this.main.player.achievementsRework[3].status) {
		        		this.main.player.secrets.zapdos = true;
		        		this.main.UI.getSecret('zapdos');
		        	}
			break;
			case 'moltres':
				if (this.achievementCount >= (this.hpMax * 0.88)) {
		        	this.main.player.unlockAchievement(4);
		        }
		        if (!this.main.player.secrets.moltres && this.main.player.achievementsRework[4].status) {
	        		this.main.player.secrets.moltres = true;
	        		this.main.UI.getSecret('moltres');
	        	}
			break;
			case 'regirock':
				if (this.achievementCount === 0) {
		        	this.main.player.unlockAchievement(5);
		        }
		        if (!this.main.player.secrets.regirock && this.main.player.achievementsRework[5].status) {
	        		this.main.player.secrets.regirock = true;
	        		this.main.UI.getSecret('regirock');
	        	}
			break;
			case 'groudon':
				if (this.achievementCount === 0) {
		        	this.main.player.unlockAchievement(6);
		        }
		        if (!this.main.player.secrets.groudon && this.main.player.achievementsRework[6].status) {
	        		this.main.player.secrets.groudon = true;
	        		this.main.UI.getSecret('groudon');
	        	}
			break;
			case 'hooh':
				if (this.isRegeneratorReviving) {
		        	this.main.player.unlockAchievement(7);
		        }
		        if (!this.main.player.secrets.hooh && this.main.player.achievementsRework[7].status) {
	        		this.main.player.secrets.hooh = true;
	        		this.main.UI.getSecret('hooh');
	        	}
			break;
			case 'registeel':
				if (this.achievementCount === 0) {
		        	this.main.player.unlockAchievement(8);
		        }
		        if (!this.main.player.secrets.registeel && this.main.player.achievementsRework[8].status) {
	        		this.main.player.secrets.registeel = true;
	        		this.main.UI.getSecret('registeel');
	        	}
			break;
			case 'regice':
				if (this.achievementCount >= 50) {
					this.main.player.unlockAchievement(9);
				}
				if (!this.main.player.secrets.regice && this.main.player.achievementsRework[9].status) {
	        		this.main.player.secrets.regice = true;
	        		this.main.UI.getSecret('regice');
	        	}
			break;
			case 'regigigas':
				if (this.main.area?.inChallenge?.toughEnemies == 50) {
					this.main.player.unlockAchievement(10);
				}
				if (!this.main.player.secrets.regigigas && this.main.player.achievementsRework[10].status) {
	        		this.main.player.secrets.regigigas = true;
	        		this.main.UI.getSecret('regigigas');
	        	}
			break;
			case 'articuno':
				if (this.main.area.weather == 'hail') {
					this.main.player.unlockAchievement(11);
				}
				if (!this.main.player.secrets.articuno && this.main.player.achievementsRework[11].status) {
	        		this.main.player.secrets.articuno = true;
	        		this.main.UI.getSecret('articuno');
	        	}
			break;
			case 'kyogre':
				if (this.achievementCount === 1) {
					this.main.player.unlockAchievement(12);
				}
				if (!this.main.player.secrets.kyogre && this.main.player.achievementsRework[12].status) {
	        		this.main.player.secrets.kyogre = true;
	        		this.main.UI.getSecret('kyogre');
	        	}
			break;
			case 'thundurus':
				if (this.achievementCount === 1) {
					this.main.player.unlockAchievement(13);
				}
				if (!this.main.player.secrets.thundurus && this.main.player.achievementsRework[13].status) {
	        		this.main.player.secrets.thundurus = true;
	        		this.main.UI.getSecret('thundurus');
	        	}
			break;
			case 'tapuFini':
				if (this.achievementCount < 11) {
					this.main.player.unlockAchievement(14);
				}
				if (!this.main.player.secrets.tapuFini && this.main.player.achievementsRework[14].status) {
	        		this.main.player.secrets.tapuFini = true;
	        		this.main.UI.getSecret('tapuFini');
	        	}
			break;
			case 'nihilego':
				if (this.achievementCount === 0) {
					this.main.player.unlockAchievement(15);
				}
				if (!this.main.player.secrets.nihilego && this.main.player.achievementsRework[15].status) {
	        		this.main.player.secrets.nihilego = true;
	        		this.main.UI.getSecret('nihilego');
	        	}
			break;
			case 'tapuKoko':
				if (this.achievementCount < 4) {
					this.main.player.unlockAchievement(16);
				}
				if (!this.main.player.secrets.tapuKoko && this.main.player.achievementsRework[16].status) {
	        		this.main.player.secrets.tapuKoko = true;
	        		this.main.UI.getSecret('tapuKoko');
	        	}
			break;
			case 'tapuBulu':
				if (this.achievementCount === 0) {
					this.main.player.unlockAchievement(17);
				}
				if (!this.main.player.secrets.tapuBulu && this.main.player.achievementsRework[17].status) {
	        		this.main.player.secrets.tapuBulu = true;
	        		this.main.UI.getSecret('tapuBulu');
	        	}
			break;
			case 'tapuLele':
				if (this.achievementCount === 0) {
					this.main.player.unlockAchievement(18);
				}
				if (!this.main.player.secrets.tapuLele && this.main.player.achievementsRework[18].status) {
	        		this.main.player.secrets.tapuLele = true;
	        		this.main.UI.getSecret('tapuLele');
	        	}
			break;
			case 'keldeo':
				if (!this.passiveActivated) {
		        	this.main.player.unlockAchievement(19);
		        }
		        if (!this.main.player.secrets.keldeo && this.main.player.achievementsRework[19].status) {
	        		this.main.player.secrets.keldeo = true;
	        		this.main.UI.getSecret('keldeo');
	        	}
			break;
			case 'heatran':
				if (this.achievementCount > 0) {
					this.main.player.unlockAchievement(20);
				}
				if (!this.main.player.secrets.heatran && this.main.player.achievementsRework[20].status) {
	        		this.main.player.secrets.heatran = true;
	        		this.main.UI.getSecret('heatran');
	        	}
			break;
			case 'volcanion':
				if (this.achievementCount >= (this.hpMax * 0.74)) {
		        	this.main.player.unlockAchievement(21);
		        }
		        if (!this.main.player.secrets.volcanion && this.main.player.achievementsRework[21].status) {
	        		this.main.player.secrets.volcanion = true;
	        		this.main.UI.getSecret('volcanion');
	        	}
			break;
			case 'pheromosa':
				if (this.achievementCount == 0) {
					this.main.player.unlockAchievement(22);
				}
				if (!this.main.player.secrets.pheromosa && this.main.player.achievementsRework[22].status) {
	        		this.main.player.secrets.pheromosa = true;
	        		this.main.UI.getSecret('pheromosa');
	        	}
			break;
			case 'cobalion':
				if (!this.passiveActivated) {
		        	this.main.player.unlockAchievement(23);
		        }
		        if (!this.main.player.secrets.cobalion && this.main.player.achievementsRework[23].status) {
	        		this.main.player.secrets.cobalion = true;
	        		this.main.UI.getSecret('cobalion');
	        	}
			break;
			case 'tornadus':
				if (this.achievementCount === 0) {
					this.main.player.unlockAchievement(24);
				}
				if (!this.main.player.secrets.tornadus && this.main.player.achievementsRework[24].status) {
	        		this.main.player.secrets.tornadus = true;
	        		this.main.UI.getSecret('tornadus');
	        	}
			break;
			case 'stakataka':
				if (this.achievementCount === 0) {
					this.main.player.unlockAchievement(25);
				}
				if (!this.main.player.secrets.stakataka && this.main.player.achievementsRework[25].status) {
		        		this.main.player.secrets.stakataka = true;
		        		this.main.UI.getSecret('stakataka');
		        	}
			break;
			case 'terrakion':
				if (!this.passiveActivated) {
		        	this.main.player.unlockAchievement(26);
		        }
		        if (!this.main.player.secrets.terrakion && this.main.player.achievementsRework[26].status) {
	        		this.main.player.secrets.terrakion = true;
	        		this.main.UI.getSecret('terrakion');
	        	}
			break;
			case 'magearna':
				if (this.achievementTimer > 59500) {
					this.main.player.unlockAchievement(27);
				}
				if (!this.main.player.secrets.magearna && this.main.player.achievementsRework[27].status) {
	        		this.main.player.secrets.magearna = true;
	        		this.main.UI.getSecret('magearna');
	        	}
			break;
			case 'diancie':
				if (this.achievementCount === 0) {
					this.main.player.unlockAchievement(28);
				}
				if (!this.main.player.secrets.diancie && this.main.player.achievementsRework[28].status) {
	        		this.main.player.secrets.diancie = true;
	        		this.main.UI.getSecret('diancie');
	        	}
			break;
			case 'virizion':
				if (!this.passiveActivated) {
		        	this.main.player.unlockAchievement(32);
		        }
		        if (!this.main.player.secrets.virizion && this.main.player.achievementsRework[32].status) {
	        		this.main.player.secrets.virizion = true;
	        		this.main.UI.getSecret('virizion');
	        	}
			break;
			case 'landorus':
				if (!this.passiveActivated) {
		        	this.main.player.unlockAchievement(38);
		        }
		        if (!this.main.player.secrets.landorus && this.main.player.achievementsRework[38].status) {
	        		this.main.player.secrets.landorus = true;
	        		this.main.UI.getSecret('landorus');
	        	}
			break;
		}
	}

	getCurrentMovementSpeed() {
		if (this.dying || this.stunned || this.isRegeneratorReviving) return 0;

		const waypoint = this.waypoints[this.waypointIndex];
		if (!waypoint) return 0;

		const dx = waypoint.x - this.center.x;
		let windFactor = this.main.area.getWindFactorAt
			? this.main.area.getWindFactorAt(this.center.x, this.center.y, dx)
			: 1;
		let slowFactor = this.main.area.getSlowFactorAt
			? this.main.area.getSlowFactorAt(this.center.x, this.center.y)
			: 1;
		const spikeSlowFactor = this.main.area.getSpikeZoneSlowFactorAt
			? this.main.area.getSpikeZoneSlowFactorAt(this.center.x, this.center.y)
			: 1;

		if (this.passive?.id === 'gust' && windFactor === 0.6) windFactor = 2;
		if (this.passive?.id === 'windRider' && windFactor === 0.6) windFactor = 0.3;
		if (this.passive?.id === 'windRider' && windFactor === 2) windFactor = 4;
		if (this.passive?.id === 'hustle' && slowFactor === 0.3) slowFactor = 2;

		return this.speed * windFactor * slowFactor * spikeSlowFactor;
	}
}
