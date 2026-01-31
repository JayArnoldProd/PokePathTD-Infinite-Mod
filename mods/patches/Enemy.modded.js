import { Sprite } from '../../utils/Sprite.js';
import { playSound } from '../../file/audio.js';

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
		this.invisible = enemy.invisible;
		this.cursed = false;
		this.invulnerable = false;

		// passive (general)
		this.passive = enemy.passive;
		this.passiveTimer = 0;
		this.passiveActivated = false;

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

		if (this.passive?.id == 'drought') {
			this.main.area.imposedWeather = true;
			this.main.area.weather = 'harshSunlight';
			this.main.UI.displayWeather();
		}
	}

	draw() {
		this.ctx.save();

		if (this.passive?.id === 'flameBody') {
		    const centerX = this.position.x + this.width / 2;
		    const centerY = this.position.y + this.height / 2;

		    const numParticles = 500;

		    for (let i = 0; i < numParticles; i++) {
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

		if (this.passive?.id === "snowCloak") {
			const cx = this.position.x + this.width / 2;
			const cy = this.position.y + this.height / 2;

			const radius = 150;
			const pulse = 0.5 + 0.8 * Math.sin(Date.now() / 600);

			// aura circular (siempre visible)
			const grad = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
			grad.addColorStop(0, `rgba(180,220,255,${0.35 + pulse * 0.15})`);
			grad.addColorStop(0.7, `rgba(180,220,255,${0.15 + pulse * 0.10})`);
			grad.addColorStop(1, `rgba(180,220,255,0.08)`); 

			this.ctx.fillStyle = grad;
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			this.ctx.fill();

			this.ctx.strokeStyle = 'rgba(200,230,255,0.55)';
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			this.ctx.stroke();

			for (let i = 0; i < 50; i++) {
				const angle = Math.random() * Math.PI * 2;
				const r = Math.random() * radius;
				const px = cx + Math.cos(angle) * r;
				const py = cy + Math.sin(angle) * r;
				const size = 1 + Math.random() * 2;

				this.ctx.fillStyle = 'rgba(210,240,255,0.8)';
				this.ctx.beginPath();
				this.ctx.arc(px, py, size, 0, Math.PI * 2);
				this.ctx.fill();
			}
		}

		if (this.passive?.id === "static") {
			const cx = this.position.x + this.width / 2;
			const cy = this.position.y + this.height / 2;

			const radius = 140;
			const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 200);

			// aura eléctrica (más intensa)
			const grad = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
			grad.addColorStop(0, `rgba(255,255,180,${0.55 + pulse * 0.25})`);
			grad.addColorStop(0.6, `rgba(255,240,120,${0.25 + pulse * 0.15})`);
			grad.addColorStop(1, `rgba(255,240,120,0.08)`); 

			this.ctx.fillStyle = grad;
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			this.ctx.fill();

			// borde eléctrico
			this.ctx.strokeStyle = 'rgba(255,240,120,0.9)';
			this.ctx.lineWidth = 2;
			this.ctx.beginPath();
			this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
			this.ctx.stroke();

			// chispas eléctricas (rayos zigzag)
			for (let i = 0; i < 22; i++) {
				const angle = Math.random() * Math.PI * 2;
				const r = radius * (0.55 + Math.random() * 0.45);
				const px = cx + Math.cos(angle) * r;
				const py = cy + Math.sin(angle) * r;

				const length = 14 + Math.random() * 10;
				const segments = 3 + Math.floor(Math.random() * 3);

				let x = px;
				let y = py;

				this.ctx.strokeStyle = `rgba(255,255,200,${0.85 + 0.15 * Math.sin(Date.now() / 100)})`;
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
				this.ctx.fillStyle = 'rgba(255,240,120,0.95)';
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

			const hpText = `${this.main.utility.numberDot(Math.max(0, Math.floor(this.hp)), this.main.lang)}`;
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
		this.ctx.restore();
		this.ctx.restore(); 
	}

	update(deltaTime = 1000 / 60) {
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

		// DELTA TIME FIX: Skip drawing during sub-step simulation
		if (!this._skipDraw) {
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

				// movimiento speed * frameFactor (speed se interpreta como px por 60fps frame unit)
				const dx = Math.cos(angle) * this.speed * frameFactor;
				const dy = Math.sin(angle) * this.speed * frameFactor;

				this.position.x += dx;
				this.position.y += dy;

				if (!this.hasEnteredCanvas) {
				    if (
				        this.position.x >= 0 &&
				        this.position.x <= this.main.game.canvas.width &&
				        this.position.y >= 0 &&
				        this.position.y <= this.main.game.canvas.height
				    ) this.hasEnteredCanvas = true;
				}

				if (this.hasEnteredCanvas) this.distanceTraveled += Math.hypot(dx, dy);

				if (Math.round(Math.sin(angle)) === 0) {
					if (Math.round(Math.cos(angle)) === 1) this.frames.direction = 2;
					if (Math.round(Math.cos(angle)) === -1) this.frames.direction = 6;
				} else {
					if (Math.round(Math.sin(angle)) === 1) this.frames.direction = 0;
					if (Math.round(Math.sin(angle)) === -1) this.frames.direction = 4;
				}

				this.center = {
					x: this.position.x + this.width / 2,
					y: this.position.y + this.height / 2
				};

				const distance = Math.hypot(waypoint.x - this.center.x, waypoint.y - this.center.y);

				if (distance < this.speed * frameFactor && this.waypointIndex < this.waypoints.length - 1) {
					this.waypointIndex++;
				}
			}

			if (this.regeneration > 0) {
				this.regenTimer += simDelta;
	            if (this.regenTimer >= 1000) { 
	                this.hp = Math.min(this.hp + this.regeneration, this.hpMax);
	                this.regenTimer -= 1000;
	            }
			}

			if (this.passive?.id == 'slowStart') {
				this.passiveTimer += simDelta;
				if (this.passiveTimer >= 1000) { 
					this.passiveTimer = 0;
					this.baseSpeed += 0.05;
	              	this.speed += 0.05;
	            }
			}

			if (this.enemy.id == 'groudon' && this.passiveTimer > 0) {
				this.passiveTimer -= simDelta;
				if (this.passiveTimer <= 0) {
					this.passiveTimer = 0;
					this.stunned = false;
			   		this.invulnerable = false;
				}
			}

			if (
			    this.passive?.id === 'timeTravel' &&
			    !this.dying &&
			    this.waypointIndex > 0
			) {
			    this.passiveTimer += simDelta;

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
			        const randomBack =
			            this.timeTravelMin +
			            Math.random() * (this.timeTravelMax - this.timeTravelMin);

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

			        this.statusEffects = this.statusEffects.filter(e => !['burn', 'poison', 'nightmare'].includes(e.type));
				    this.burnedBy = null;
				    this.poisonedBy = null;
				    this.nightmaredBy = null;
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

			        playSound('teleport', 'effect');
			    }
			}

			if (this.passive?.id === 'iceBody' && this.passiveTimer > 0) {
				this.passiveTimer -= simDelta;
				if (this.passiveTimer <= 0) { 
					this.passiveTimer = 0;
					this.baseSpeed -= 0.5;
	        		this.speed -= 0.5;
	            }
			}

			if (this.passive?.id == 'shadowShield' && !this.invisible) {
				this.passiveTimer += simDelta;
				if (this.passiveTimer >= 3000) { 
					this.armor = this.armorMax;
					this.passiveTimer = 0;
					this.invisible = true;
					playSound('invi', 'effect')
	            }
			}

			if (this.passive?.id == "naturalCure") {
			    this.passiveTimer += simDelta;

			    if (this.passiveTimer >= 5000) { 
			        this.passiveTimer = 0;

			        this.statusEffects = this.statusEffects.filter(e => e.type === 'nightmare');
					this.burnedBy = null;
					this.poisonedBy = null;

			        this.stunned = false;
			        this.speed = this.baseSpeed;

			        playSound('regenerator', 'effect');
			    }
			}

			this.updateStatusEffects(simDelta);
	    }

		this.updateFloatingTexts(simDelta);
	}

	getDamaged(amount, source = 'physical', ability = null, isCritical = false, alreadyCursed = new Set(), pokemon, tower) {
	    if (this.hp <= 0 || this.invulnerable) return;
	   
	    let cursedDamageSpread = amount;

	    if (this.cursed && pokemon?.item?.id == 'strangeIdol') amount = Math.ceil(amount * 1.1);
	    if (pokemon?.item?.id == 'spellTag' && this.statusEffects.length > 0) {
	    	let spellTagBonus = 0
			this.statusEffects.forEach((effect) => {
				if (effect.type != 'nightmare') spellTagBonus += 0.15;
				if (pokemon?.ability?.id == 'simple') spellTagBonus += 8;
			})
			amount = Math.ceil(amount * Math.min(1.5, (1 + spellTagBonus)));
		}

		if (pokemon?.item?.id == 'stickyBarb' && this.statusEffects.length > 0) {
			this.statusEffects.forEach((effect) => {
				if (effect.type == 'stun' || effect.type == 'slow') amount = (pokemon?.ability?.id == 'simple') ? Math.ceil(amount * 1.38) : Math.ceil(amount * 1.25);		
			})
		}

		if (pokemon?.item?.id == 'electirizer' && this.statusEffects.length > 0) {
			this.statusEffects.forEach((effect) => {
				if (effect.type == 'stun') amount = Math.ceil(amount * 1.3);		
			})
		}

		if (pokemon?.item?.id == 'magmarizer' && this.statusEffects.length > 0) {
			this.statusEffects.forEach((effect) => {
				if (effect.type == 'burn') amount = Math.ceil(amount * 1.3);		
			})
		}

		if (pokemon?.item?.id == 'badgeOfHonor') {
			let badgeMult = Math.min(30, (this.main.player.stars / 30));
			amount += Math.ceil(amount * (badgeMult / 100));	
			if (pokemon?.ability?.id == 'simple') amount = Math.ceil(amount * 1.5);
		}

	    if (amount >= 9999 && source == 'physical') this.main.player.unlockAchievement(18)
	    if (amount > this.main.player.stats.highestHit && source == 'physical') this.main.player.stats.highestHit = amount;

		if ((
			ability?.id === 'armorBreak' || 
			ability?.id === 'armorBreakDoubleShot' || 
			pokemon?.item?.id == 'shieldBreakerBullet') && 
			this.enemy?.armor > 0
	    ) amount *= 2;

		if (this.passive?.id === 'lightMetal' && amount > 1000) amount = 1000;
		if (this.passive?.id === 'iceBody' && isCritical) {
			this.baseSpeed += 0.5;
	        this.speed += 0.5;
			this.passiveTimer = 2000;
		}

		if (this.passive?.id === 'sturdy' && source == 'physical' && this.hp < this.hpMax * 0.3) amount = 0;

		if (this.passive?.id === 'flameBody' && source == 'physical') {
			const dx = this.center.x - tower.center.x;
			const dy = this.center.y - tower.center.y;
			const distance = Math.hypot(dx, dy);
			if (distance < 120) amount = Math.floor(amount/2);
		}

	    let cursedDamage = amount;
	    let armorDamage = amount;

	    this.main.area.totalDamageDealt += amount;
	    pokemon.damageDealt += amount; 	

	    if (pokemon?.item?.id == 'litCoal' && this.canBurn && Math.random() < 0.1) {
			this.applyStatusEffect({ type: 'burn', damagePercent: 0.005, duration: 10 }, pokemon); 
		}

	    if (
	    	(pokemon?.item?.id == 'leftovers' && Math.random() < 0.005) ||
	    	((ability?.id === 'heal' && pokemon?.item?.id != 'lifeOrb') && Math.random() < 0.025) ||
	    	(pokemon?.item?.id == 'shellBell' && pokemon.damageDealt > 50000 && !this.main.area.shellBellWaveUsed) ||
	    	(pokemon?.item?.id == 'clefairyDoll' && pokemon.damageDealt > 25000 && !this.main.area.clefairyDollUsed)
	    ) {
	        playSound('hit3', 'effect');
	        let healValue = 1;
	        if (pokemon?.item?.id == 'bigRoot') healValue++;		        
	        this.main.player.getHealed(healValue);
	        this.main.player.achievementProgress.heartRestore += healValue;
	        
	    	if (this.main.player.achievementProgress.heartRestore > 10) this.main.player.unlockAchievement(19);
	    	if (pokemon?.item?.id == 'clefairyDoll' && pokemon.damageDealt > 25000) this.main.area.clefairyDollUsed = true;
	    	if (pokemon?.item?.id == 'shellBell' && pokemon.damageDealt > 50000) this.main.area.shellBellWaveUsed = true;
	    	this.main.area.heartScale = true;
	    }

	    if (pokemon?.item?.id == 'shellBell' && pokemon.damageDealt > 50000) this.main.area.shellBellWaveUsed = true;

	    if (ability?.id === 'greed') {
	    	let g = Math.ceil(this.gold * 0.1);
	    	this.main.player.achievementProgress.stolenGold += g;
	    	if (this.main.player.achievementProgress.stolenGold >= 100000) this.main.player.unlockAchievement(21);
	    	this.main.area.goldWave += g;
	    	this.main.player.changeGold(g);
	    }

	    let armorHit = 0;

	    if (this.invisible && source == 'physical') this.invisible = false;

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

	    this.hp -= amount;

	    if (this.hp < this.hpMax * 0.5 && this.enemy.id == 'groudon' && !this.passiveActivated) {
	    	this.passiveActivated = true;
	    	this.armorMax = 50000;
	    	this.armor = 50000;
	    	this.sprite.src = this.enemy.sprite.primal;

	    	this.passiveTimer = 3000;
			this.stunned = true;
			this.invulnerable = true;

			playSound('earthquake', 'effect');
			this.main.game.startShake(28, 3000);
	    	this.main.area.weather = 'extremelyHarshSunlight';
			this.main.UI.displayWeather();
	    }

	    if (this.hp <= 0 && !this.dying) {
	    	if (this.passive?.id === 'regenerator' && !this.regeneratorUsed) {
			    this.regeneratorUsed = true;
			    this.hp = 1;
			    this.armorMax = 50000;
	    		this.armor = 50000;
			    // preparar resurrección
			    this.isRegeneratorReviving = true;
			    this.regeneratorReviveTimer = 5000; 
			    this.burnedBy = null;
				this.poisonedBy = null;
				this.nightmaredBy = null;
				this.cursed = false;
			    this.stunned = true;
			    //this.invulnerable = true;

			    playSound('hit3', 'effect');
			    return;
			}

	    	if (ability?.id === 'moxie') tower.moxieBuff++;
	    	this.main.player.stats.defeatedEnemies++;
	    	this.main.player.stats.defeatedSpecies.add(this.enemy.id);
	    	if (this.enemy.id == 'delibird') {
	    		this.main.player.achievementProgress.delibirdCount++;
				if (this.main.player.achievementProgress.delibirdCount >= 225) this.main.player.unlockAchievement(10);
	    	}
	    	if (this.main.player.stats.defeatedEnemies == 100000) this.main.player.unlockAchievement(8);
	    	if (this.main.player.stats.defeatedSpecies.size === 100) this.main.player.unlockAchievement(9);
	    	this.main.area.goldWave += this.gold;
	        this.main.player.changeGold(this.gold);
	        this.dying = true;
	        this.hp = 0;
	    }

	    const minSpacing = 12; 
	    const startYOffset = 12; 

	    if (amount > 0) {
	        const color = isCritical
	            ? '#ffeb3b'
	            : source === 'burn'
	            ? '#c96937'
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

	    if ((ability?.id === 'curse' || ability?.id === 'willOWisp' || ability?.id === 'curseDoubleShot') && this.cursed && cursedDamage > 0 && !alreadyCursed.has(this)) {
	        alreadyCursed.add(this);
	        this.main.area.enemies.forEach(e => {
	            if (e !== this && e.cursed && e.hp > 0 && !alreadyCursed.has(e)) {
	                e.getDamaged(cursedDamageSpread, source, ability, false, alreadyCursed, pokemon);
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
	                this.getDamaged(Math.ceil(this.hpMax * effect.damagePercent), 'burn', null, false, new Set(), this.burnedBy);
	                effect.timer -= interval;
	                if (typeof effect.duration === 'number') effect.duration -= 1;
	            }
	        }

	        if (effect.type === 'poison') {
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
	    const slowEffects = this.statusEffects.filter(e => e.type === 'slow' && e.duration !== 0);
	    if (slowEffects.length === 0) {
	        this.speed = this.baseSpeed;
	    } else {
	        // multiplicar factores de slow 
	        let factor = 1;
	        slowEffects.forEach(e => factor *= (e.slowPercent ?? 1));
	        this.speed = this.baseSpeed * factor;
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
	    const existing = this.statusEffects.find(e => e.type === effect.type);
	    if (existing) {
	        if (effect.type === 'poison') {
	        	this.poisonedBy = pokemon;
	        	this.main.player.stats.appliedPoisons++;
	        	if (this.main.player.stats.appliedPoisons >= 10000) this.main.player.unlockAchievement(16);
	            existing.stacks = (existing.stacks || 1) + 1;
	        } else if (effect.type === 'nightmare') {
	        	this.nightmaredBy = pokemon;
	            existing.stacks = (existing.stacks || 1) + 1;
	        } 
	        // else {
	        //     existing.duration = Math.max(existing.duration || 0, effect.duration || 0);
	        // }
	    } else {
	        this.statusEffects.push({
	            ...effect,
	            timer: 0,
	            stacks: effect.type === 'poison' ? 1 : undefined
	        });
	        if (effect.type === 'stun') {
	        	this.main.player.stats.appliedStuns++;
	        	if (this.main.player.stats.appliedStuns >= 10000) this.main.player.unlockAchievement(13);
	        }
	        if (effect.type === 'slow') {
	        	this.main.player.stats.appliedSlows++;
	        	if (this.main.player.stats.appliedSlows >= 10000) this.main.player.unlockAchievement(14);
	        }
	        if (effect.type === 'poison') {
	        	this.poisonedBy = pokemon;
	        	this.main.player.stats.appliedPoisons++;
	        	if (this.main.player.stats.appliedPoisons >= 10000) this.main.player.unlockAchievement(16);
	        }
	        if (effect.type === 'nightmare') {
	        	this.nightmaredBy = pokemon;
	        }
	        if (effect.type === 'burn') {
	        	this.burnedBy = pokemon;
	        	this.main.player.stats.appliedBurns++;
	        	if (this.main.player.stats.appliedBurns >= 10000) this.main.player.unlockAchievement(15);
	        }
	        if (effect.type === 'curse') {
	        	this.main.player.stats.appliedCurses++;
	        	if (this.main.player.stats.appliedCurses >= 10000) this.main.player.unlockAchievement(17);
	            this.cursed = true;
	        }
	    }
	}

	drawStatusEffects() {
		if (this.statusEffects.length === 0) return;

		this.statusEffects.forEach(effect => {
			if (effect.type === 'burn') {
				const numParticles = 5;
				const alphaBase = 0.8;
				const alphaVariation = 0.2;
				const alpha = alphaBase + alphaVariation * Math.sin(Date.now() / 500);

				const centerX = this.position.x + this.width / 2;
				const centerY = this.position.y + this.height / 2;

				for (let i = 0; i < numParticles; i++) {
					const px = centerX + (Math.random() - 0.5) * this.width * 0.6;
					const py = centerY + (Math.random() - 0.5) * this.height * 0.6;
					const size = 1 + Math.random() * 2;

					const r = 255;
					const g = 100 + Math.random() * 100;
					const b = 0;

					this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
					this.ctx.beginPath();
					this.ctx.arc(px, py, size, 0, Math.PI * 2);
					this.ctx.fill();
				}
			}
			if (effect.type === 'poison') {
				const numParticles = 5;
				const alphaBase = 0.8;
				const alphaVariation = 0.2;
				const alpha = alphaBase + alphaVariation * Math.sin(Date.now() / 500);

				const centerX = this.position.x + this.width / 2;
				const centerY = this.position.y + this.height / 2;

				for (let i = 0; i < numParticles; i++) {
					const px = centerX + (Math.random() - 0.5) * this.width * 0.6;
					const py = centerY + (Math.random() - 0.5) * this.height * 0.6;
					const size = 1 + Math.random() * 2;

					const r = 50;
					const g = 255;
					const b = 50;

					this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
					this.ctx.beginPath();
					this.ctx.arc(px, py, size, 0, Math.PI * 2);
					this.ctx.fill();
				}
			}
			if (effect.type === 'nightmare') {
				const numParticles = 5;
				const alphaBase = 0.8;
				const alphaVariation = 0.2;
				const alpha = alphaBase + alphaVariation * Math.sin(Date.now() / 500);

				const centerX = this.position.x + this.width / 2;
				const centerY = this.position.y + this.height / 2;

				for (let i = 0; i < numParticles; i++) {
					const px = centerX + (Math.random() - 0.5) * this.width * 0.6;
					const py = centerY + (Math.random() - 0.5) * this.height * 0.6;
					const size = 1 + Math.random() * 2;

					const r = 160;
					const g = 40;
					const b = 200;

					this.ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
					this.ctx.beginPath();
					this.ctx.arc(px, py, size, 0, Math.PI * 2);
					this.ctx.fill();
				}
			}
		});
	}
}
