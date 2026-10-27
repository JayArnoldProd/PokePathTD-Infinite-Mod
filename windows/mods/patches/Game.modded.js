// MOD: INFINITE GAME BASE — shared by speed, pause and delta-time features.
import { Tower } from './component/Tower.js';
import { text } from '../file/text.js';
import { playSound } from '../file/audio.js';

export class Game {
	static CANVAS_W = 720;
	static CANVAS_H = 624;
	static CANVAS_W_XL = 1440;
	static CANVAS_W_XLH = 2160;
	static CANVAS_H_XLV = 1872;

	constructor(main) {
	    this.main = main;

	    this.isXL = false;
		this.isXLV = false;
		this.isXLH = false;
	    this.scrollX = 0;
	    this.scrollY = 0;
	    this.mouseViewX = undefined;
	    this.mouseViewY = undefined;
	    this._scrolling = false;
	    this._panStartX = 0;
	    this._panStartY = 0;
	    this._panStartScrollX = 0;
	    this._panStartScrollY = 0;

	    this.canvas = document.createElement('canvas');
	    this.canvas.width  = Game.CANVAS_W;
	    this.canvas.height = Game.CANVAS_H;
	    this.ctx = this.canvas.getContext('2d');
	    this.canvasBackground = new Image();
	    this.canvasEffect = new Image();
	    this.effectEnabled = false;
	    this.effectTime = 0;

	    this.canvasWrapper = document.createElement('div');
	    this.canvasWrapper.id = 'canvas-wrapper';
	    this.canvasWrapper.appendChild(this.canvas);
	    document.getElementById('screen').appendChild(this.canvasWrapper);

	    this.deployingUnit = undefined;
	    this.stopped = false;
	    this.activeTile = undefined;
	    this.mouse = {
		    x: undefined,
		    y: undefined,
		    clientX: undefined,
		    clientY: undefined
		};
	    this.mouseCanvas = { x: undefined, y: undefined };
	    this.FPS = 60;
	    this.frameDuration = 1000 / this.FPS;
	    this.lastTime = 0;
	    this.loopId = null;
	    this.animate = this.animate.bind(this);
	    this.ranges = false;
	    this.speedFactor = 0.8;
	    this.chrono;

	    this.canvasShake  = {
			active: false,
			intensity: 0,
			duration: 0,
			elapsed: 0
		};
	}

	resizeCanvas(xl = false, xlv = false, xlh = false) {
	    this.isXL  = xl;
	    this.isXLV = xlv;
	    this.isXLH = xlh;

	    this.scrollX = 0;
	    this.scrollY = 0;
	    this.mouseViewX = undefined;
	    this.mouseViewY = undefined;

	    this.canvas.width =
	        xlh ? Game.CANVAS_W_XLH :
	        xl  ? Game.CANVAS_W_XL :
	              Game.CANVAS_W;

	    this.canvas.height = xlv ? Game.CANVAS_H_XLV : Game.CANVAS_H;

	    this.canvasWrapper.classList.toggle('xl-map', xl);
	    this.canvasWrapper.classList.toggle('xlv-map', xlv);
	    this.canvasWrapper.classList.toggle('xlh-map', xlh);

	    if (xl || xlv || xlh) {
	        this._applyScroll();
	    } else {
	        this.canvas.style.left = '';
	        this.canvas.style.transform = 'translate(-50%, -50%)';
	    }
	}

	_applyScroll() {
	    if (!this.isXL && !this.isXLV && !this.isXLH) return;

	    let offsetX = 0, offsetY = 0;

	    if (this.isXL || this.isXLH) {
		    const canvasWidth = this.isXLH
		        ? Game.CANVAS_W_XLH
		        : Game.CANVAS_W_XL;

		    const maxScrollX = canvasWidth - Game.CANVAS_W;

		    this.scrollX = Math.max(0, Math.min(this.scrollX, maxScrollX));

		    offsetX =
		        -this.scrollX +
		        canvasWidth / 2 -
		        Game.CANVAS_W / 2;

		    const pctX = maxScrollX > 0
		        ? this.scrollX / maxScrollX
		        : 0;

		    this.canvasWrapper.style.setProperty(
		        this.isXLH ? '--scroll-pct-h' : '--scroll-pct',
		        pctX.toFixed(4)
		    );
		}

	    if (this.isXLV) {
	        const maxScrollY = Game.CANVAS_H_XLV - Game.CANVAS_H;
	        this.scrollY = Math.max(0, Math.min(this.scrollY, maxScrollY));
	        offsetY = -this.scrollY + Game.CANVAS_H_XLV / 2 - Game.CANVAS_H / 2;
	        const pctY = maxScrollY > 0 ? this.scrollY / maxScrollY : 0;
	        this.canvasWrapper.style.setProperty('--scroll-pct-v', pctY.toFixed(4));
	    }

	    this.canvas.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
	    this.main.UI.secretVictiniCave.style.top =  `${1430 - this.scrollY}px`;
	}

	_clientToCanvasX(clientX) {
	    const rect   = this.canvasWrapper.getBoundingClientRect();
	    const scaleX = Game.CANVAS_W / rect.width;
	    return (clientX - rect.left) * scaleX + this.scrollX;
	}

	_clientToCanvasY(clientY) {
	    const rect   = this.canvasWrapper.getBoundingClientRect();
	    const scaleY = Game.CANVAS_H / rect.height;
	    return (clientY - rect.top) * scaleY + this.scrollY;
	}

	_getBombardZonePosition(tower, targetX, targetY) {
	    const dx = targetX - tower.center.x;
	    const dy = targetY - tower.center.y;
	    const maxDist = tower.tile.computeEffectiveRange(
	        tower,
	        tower.center
	    );

	    let zoneX = targetX;
	    let zoneY = targetY;

	    if (tower.rangeType === 'cross') {
	        const axes = [
	            { x: 1, y: 0 },
	            { x: 0, y: 1 }
	        ];

	        if (tower.pokemon?.item?.id === 'starPiece') {
	            axes.push(
	                { x: Math.SQRT1_2, y: Math.SQRT1_2 },
	                { x: Math.SQRT1_2, y: -Math.SQRT1_2 }
	            );
	        }

	        let bestAxis = axes[0];
	        let bestProj = -Infinity;

	        for (const axis of axes) {
	            const proj = Math.abs(
	                dx * axis.x + dy * axis.y
	            );

	            if (proj > bestProj) {
	                bestProj = proj;
	                bestAxis = axis;
	            }
	        }

	        const signedProj =
	            dx * bestAxis.x + dy * bestAxis.y;

	        const clamped = Math.max(
	            -maxDist,
	            Math.min(maxDist, signedProj)
	        );

	        const perpX = dx - bestAxis.x * signedProj;
	        const perpY = dy - bestAxis.y * signedProj;
	        const perpDist = Math.hypot(perpX, perpY);

	        let maxOffset = tower.pokemon.bombardmentArea / 2;

	        if (tower.pokemon?.item?.id === 'wideLens') {
	            maxOffset *= 2;
	        }

	        if (this.main.area.victoryStar) {
	            maxOffset *= 1.5;
	        }

	        const scale = perpDist > maxOffset
	            ? maxOffset / perpDist
	            : 1;

	        zoneX =
	            tower.center.x +
	            bestAxis.x * clamped +
	            perpX * scale;

	        zoneY =
	            tower.center.y +
	            bestAxis.y * clamped +
	            perpY * scale;
	    } else {
	        const dist = Math.hypot(dx, dy);

	        if (dist > maxDist) {
	            const ratio = maxDist / dist;

	            zoneX = tower.center.x + dx * ratio;
	            zoneY = tower.center.y + dy * ratio;
	        } else if (
	            tower.rangeType === 'donut' &&
	            dist < tower.innerRange
	        ) {
	            const ratio = dist > 0
	                ? tower.innerRange / dist
	                : 1;

	            zoneX = tower.center.x + dx * ratio;
	            zoneY = tower.center.y + dy * ratio;
	        }
	    }

	    return { x: zoneX, y: zoneY };
	}

	_drawBombardmentPreview(tower, targetX, targetY) {
	    if (
	        !Number.isFinite(targetX) ||
	        !Number.isFinite(targetY)
	    ) {
	        return;
	    }

	    const target = this._getBombardZonePosition(
	        tower,
	        targetX,
	        targetY
	    );

	    const area = tower.pokemon?.bombardmentArea ?? 0;
	    if (area <= 0) return;

	    const isRockThrow = tower.ability?.id === 'rockThrow';
	    const color = tower.pokemon?.specie?.color || '#ffffff';

	    const radius = area / 2;
	    const zoneWidth = area * 5;
	    const zoneHeight = area;

	    const angle = Math.atan2(
		    target.y - tower.center.y,
		    target.x - tower.center.x
		);

	    this.ctx.save();

	    this.ctx.fillStyle = color;
	    this.ctx.strokeStyle = color;

	    // Zona de impacto.
	    this.ctx.globalAlpha = 0.2;

	    if (isRockThrow) {
		    this.ctx.save();
		    this.ctx.translate(target.x, target.y);
		    this.ctx.rotate(angle + (Math.PI / 2));

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
		            target.x,
		            target.y,
		            radius,
		            0,
		            Math.PI * 2
		        );
		        this.ctx.fill();
		    }

		    // Contorno.
		    this.ctx.globalAlpha = 0.95;
		    this.ctx.lineWidth = 2;

		    if (isRockThrow) {
		    this.ctx.save();
		    this.ctx.translate(target.x, target.y);
		    this.ctx.rotate(angle + (Math.PI / 2));

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
	            target.x,
	            target.y,
	            radius,
	            0,
	            Math.PI * 2
	        );
	        this.ctx.stroke();
	    }

	    // Marca el centro de impacto.
	    const markerSize = 7;

	    this.ctx.beginPath();
	    this.ctx.moveTo(
	        target.x - markerSize,
	        target.y - markerSize
	    );
	    this.ctx.lineTo(
	        target.x + markerSize,
	        target.y + markerSize
	    );
	    this.ctx.moveTo(
	        target.x + markerSize,
	        target.y - markerSize
	    );
	    this.ctx.lineTo(
	        target.x - markerSize,
	        target.y + markerSize
	    );
	    this.ctx.stroke();
	    this.ctx.restore();
	}

	scrollBy(dx) {
	    this.scrollX += dx;
	    this._applyScroll();
	}

	scrollTo(x) {
	    this.scrollX = x;
	    this._applyScroll();
	}

	scrollByY(dy) {
	    this.scrollY += dy;
	    this._applyScroll();
	}

	scrollToY(y) {
	    this.scrollY = y;
	    this._applyScroll();
	}


	load() {
	    this.stopped = false;
	    this.lastTime = performance.now();

	    if (this.gameWorker) {
	        this.gameWorker.terminate();
	    }

	    const workerCode = `
	        let timerId;
	        const interval = ${this.frameDuration};

	        self.onmessage = function(e) {
	            if (e.data === 'start') {
	                // Iniciamos el reloj en el hilo secundario
	                timerId = setInterval(() => {
	                    self.postMessage('tick');
	                }, interval);
	            } else if (e.data === 'stop') {
	                clearInterval(timerId);
	            }
	        };
	    `;

	    const blob = new Blob([workerCode], { type: 'application/javascript' });
	    this.gameWorker = new Worker(URL.createObjectURL(blob));

	    this.gameWorker.onmessage = () => {
	        this.animate(performance.now());
	    };

	    this.gameWorker.postMessage('start');

	    this.setEvents();
	    this.chrono = this.main.utility.chrono(1, () => !this.stopped);
	}

	animate(time) {
	    if (!this.lastTime) this.lastTime = time;

	    let delta = time - this.lastTime;

	    if (this.stopped) {
	        // Durante la pausa permitimos redibujar el mapa,
	        // pero el tiempo del juego no avanza.
	        delta = 0;
	    } else {
	        if (delta < this.frameDuration) return;
	        if (delta > 60) delta = 60;

	        this.lastTime = time - (delta % this.frameDuration);
	    }

	    if (this.ctx) {
	        if (this.canvasBackground.complete && this.canvasBackground.naturalWidth !== 0) {
	            this.ctx.drawImage(this.canvasBackground, 0, 0, this.canvas.width, this.canvas.height);
	        } else {
	            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	        }
	    }
	    // this.drawSpawnEntryIndicators(time);

	    const scaledDelta = this.stopped ? 0 : delta * this.speedFactor;
	    const safeDelta = Math.min(scaledDelta, 150);

	    if (this.canvasShake.active) {
	        this.canvasShake.elapsed += safeDelta;
	        const progress = Math.min(1, this.canvasShake.elapsed / this.canvasShake.duration);
	        const ease = 1 - Math.pow(progress, 2);
	        const intensity = this.canvasShake.intensity * ease;
	        const sdx = (Math.random() - 0.75) * 2 * intensity;
	        const sdy = (Math.random() - 0.75) * 2 * intensity;
	        if (this.isXL || this.isXLV || this.isXLH) {
	            const baseX = this.isXL
				    ? (-this.scrollX + Game.CANVAS_W_XL / 2 - Game.CANVAS_W / 2)
				    : this.isXLH
				    ? (-this.scrollX + Game.CANVAS_W_XLH / 2 - Game.CANVAS_W / 2)
				    : 0;
	            const baseY = this.isXLV ? (-this.scrollY + Game.CANVAS_H_XLV / 2 - Game.CANVAS_H  / 2) : 0;
	            this.canvas.style.transform = `translate(calc(-50% + ${baseX + sdx}px), calc(-50% + ${baseY + sdy}px))`;
	        } else {
	            this.canvas.style.transform = `translate(calc(-50% + ${sdx}px), calc(-50% + ${sdy}px))`;
	        }
	        if (progress >= 1) {
	            this.canvasShake.active = false;
	            if (this.isXL || this.isXLV || this.isXLH) this._applyScroll();
	            else this.canvas.style.transform = `translate(-50%, -50%)`;
	        }
	    }


	    // if (this.isXL && this.mouseViewX !== undefined) {
	    //     const EDGE  = 80;    // px from the viewport edge that activates pan
	    //     const SPEED = 12;     // max canvas-px scrolled per frame
	    //     const vx = this.mouseViewX;
	    //     if (vx < EDGE) {
	    //         // Left zone: faster the closer to the edge
	    //         const t = 1 - vx / EDGE;              // 0 → 1 as vx → 0
	    //         this.scrollBy(-SPEED * t * t);         // quadratic easing
	    //     } else if (vx > Game.CANVAS_W - EDGE) {
	    //         const t = (vx - (Game.CANVAS_W - EDGE)) / EDGE;
	    //         this.scrollBy(SPEED * t * t);
	    //     }
	    // }
	    // ─────────────────────────────────────────────────────────────────────

	    // ── SUBSTEPS: dividir el frame en pasos de máx 16.6ms ──────────────
	    const MAX_STEP = 1000 / 60;
		const numSteps = Math.max(1, Math.ceil(safeDelta / MAX_STEP));
		const stepDelta = safeDelta / numSteps;

		// PERF: Pre-compute snowCloak positions once per frame for Tower.modded.js.
		const snowCloakEnemies = [];
		for (let i = 0; i < this.main.area.enemies.length; i++) {
            const enemy = this.main.area.enemies[i];
            if (enemy && enemy.hp > 0 && !enemy.invulnerable && enemy.passive?.id === 'snowCloak') {
                snowCloakEnemies.push(enemy);
            }
		}

		for (let step = 0; step < numSteps; step++) {
            const isLastStep = step === numSteps - 1;
			this.main.area.towers.forEach(tower => {
				if (tower.shadowTagZones?.length && isLastStep) tower.drawShadowTagZones();
				if (tower.shadowTagExplosions?.length) tower.drawShadowTagExplosions(stepDelta);
			});

            for (let i = this.main.area.enemies.length - 1; i >= 0; i--) {
                const enemy = this.main.area.enemies[i];
                enemy._skipDraw = !isLastStep;
                enemy.update(stepDelta, isLastStep);
                if (this.main.area.enemies.indexOf(enemy) === -1) continue;
                if (!this.stopped) {
                    if (enemy.waypoints.length === enemy.waypointIndex + 1) {
                        if (
                            enemy.position.x > this.canvas.width ||
                            enemy.position.x < -30 ||
                            enemy.position.y - 20 > this.canvas.height ||
                            enemy.position.y < -20
                        ) {
							if (enemy.enemy.id === 'mew' && enemy.hp === enemy.hpMax && this.main.UI.tilesCountNum) {
								const towersNum = this.main.UI.tilesCountNum.reduce((count, n) => count + n, 0);
								if (towersNum >= 3) enemy.power = 0;
							}
							if (enemy.enemy.id === 'klefki' && !this.main.player.secrets.klefki && !this.main.area.inChallenge && !this.main.area.isCustom) {
								this.main.area.map.background = './src/assets/images/maps/8-1bis.png';
								this.main.game.canvasBackground.src = this.main.area.map.background;
								enemy.power = 0;
								this.main.player.secrets.klefki = true;
								playSound('door', 'effect');
							}
		                    playSound('hit2', 'effect');
		                	this.main.area.hitsReceived++;
		                    this.main.player.getDamaged(enemy.power);
		                    this.main.player.recordEnemyEscaped(enemy.enemy.id);
		                    if (enemy.passive?.id === 'grimNeigh') {
		                        // reinicia el recorrido en vez de eliminarlo: conserva vida y statusEffects
		                        enemy.waypointIndex = 0;
		                        const startWp = enemy.waypoints[0];
		                        enemy.position.x = startWp.x;
		                        enemy.position.y = startWp.y;
		                        enemy.center = {
		                            x: enemy.position.x + enemy.width / 2,
		                            y: enemy.position.y + enemy.height / 2
		                        };
		                        continue;
		                    }

		                    const idx = this.main.area.enemies.indexOf(enemy);
		                    if (idx !== -1) this.main.area.enemies.splice(idx, 1);
		                    continue;
                        }
                    }
                }
            }

            const towersToUpdate = [...this.main.area.towers].sort((a, b) => {
                const aSpectrier = a.pokemon?.specie?.key === 'spectrier';
                const bSpectrier = b.pokemon?.specie?.key === 'spectrier';
                if (aSpectrier !== bSpectrier) return aSpectrier ? 1 : -1;
                return a.position.y - b.position.y;
            });
            towersToUpdate.forEach(tower => {
                let enemiesInRange = [];
                if (!this.stopped) {
                    enemiesInRange = this.main.area.enemies.filter(enemy => {
                        if (!enemy.hasEnteredCanvas) return false;

						const atLastWaypoint = enemy.waypoints.length === enemy.waypointIndex + 1;

						if (atLastWaypoint) {
							const outLeft = enemy.position.x < -enemy.width;
							const outRight = enemy.position.x > this.canvas.width;
							const outTop = enemy.position.y < -enemy.height;
							const outBottom = enemy.position.y > this.canvas.height;
							if (outLeft || outRight || outTop || outBottom) return false;
						}

						
                    const margin = 48;
                        const insideCanvas = (
                            enemy.center.x >= -margin &&
                            enemy.center.x <= this.canvas.width + margin &&
                            enemy.center.y >= -margin &&
                            enemy.center.y <= this.canvas.height + margin
                        );
                        return insideCanvas && this.isEnemyInRange(tower, enemy) && !enemy.dying;
                    });
                }
                tower._skipDraw = !isLastStep;
                tower._isFirstStep = (step === 0);
                tower._snowCloakEnemies = snowCloakEnemies;
                tower.update(enemiesInRange, stepDelta, isLastStep);
            });

            if (this.main.area && typeof this.main.area.updateSpikeZones === 'function') {
                this.main.area.updateSpikeZones(stepDelta);
            }

            // MOD: Tick deferred spawn queue (spawns enemies as wave progresses)
            if (!this.stopped && this.main.area._spawnQueue && this.main.area._spawnQueue.length > 0) {
                this.main.area.tickSpawnQueue(stepDelta);
            }
		}
        // ── FIN SUBSTEPS ────────────────────────────────────────────────────

        this.main.area.placementTiles.forEach(tile => tile.update(this.mouse));
		this.main.area.chessPieces?.forEach(piece => piece.draw());
        this.drawWindCurrents(time);

        if (this.main?.area?.updateLinkBeams) {
            this.main.area.updateLinkBeams(safeDelta);
        }

        if (!this.stopped) {
            if (
                this.main.area.waveActive &&
                this.main.area.enemies.length === 0 &&
                (!this.main.area._spawnQueue || this.main.area._spawnQueue.length === 0)
            ) {
                this.main.area.endWave();
            }
            this.main.UI.updateDamageDealt();
        }

        if (this.main.showDamage) {
            this.main.area.enemies.forEach(enemy => {
                enemy.drawFloatingTexts();
            });
        }

        if (this.ranges) {
			this.main.area.towers.forEach(tower => {
				if (tower) {
					tower.tile.drawRange(tower.tile.computeEffectiveRange(tower), tower.rangeType, tower.innerRange, tower.ability, tower?.pokemon?.item, true);
				}
			});
	    }

		this.main.area.towers.forEach(tower => {
		    if (!tower.awaitingBombardZone) return;

		    tower.tile.drawRange(
		        tower.tile.computeEffectiveRange(tower, tower.center),
		        tower.rangeType,
		        tower.innerRange,
		        tower.ability,
		        tower?.pokemon?.item,
		        true,
		        tower.center
		    );

		    if (
		        Number.isFinite(this.mouse.clientX) &&
		        Number.isFinite(this.mouse.clientY)
		    ) {
		        this._drawBombardmentPreview(
		            tower,
		            this._clientToCanvasX(this.mouse.clientX),
		            this._clientToCanvasY(this.mouse.clientY)
		        );
		    }
		});

	    if (this.main.mapEffects != 0) {
	        if (this.effectEnabled) {
	            this.effectTime += scaledDelta;
	            const targetAlpha = (this.main.mapEffects == 2) ? 1 : 0.65 + 0.1 * Math.sin(this.effectTime * 0.001);
	            const targetGlobalAlpha = (this.main.mapEffects == 2) ? 1 : 0.65 + 0.01 * Math.sin(this.effectTime * 0.001);
	            this.currentAlpha = this.currentAlpha ?? targetAlpha;
	            this.currentGlobalAlpha = this.currentGlobalAlpha ?? targetGlobalAlpha;
	            const lerpFactor = 0.05;
                this.currentAlpha += (targetAlpha - this.currentAlpha) * lerpFactor;
                this.currentGlobalAlpha += (targetGlobalAlpha - this.currentGlobalAlpha) * lerpFactor;
                this.ctx.save();
                this.ctx.globalAlpha = this.currentGlobalAlpha;
                this.ctx.drawImage(this.canvasEffect, 0, 0, this.canvas.width, this.canvas.height);
                this.ctx.restore();
            }
	    }
	}

  	tryDeployUnit(pos, ui) {
  		const pokemon = this.main.team.pokemon[pos];
    	if (this.stopped && !this.canTimeWarpAct(pokemon)) return;
  		if (this.main.isSectionOpen()) return;
	    if (this.deployingUnit != undefined) return this.cancelDeployUnit();
	    if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	    this.deployingUnit = this.main.team.pokemon[pos];
	    if (this.main.team.pokemon[pos].isDeployed && ui) {
		this.retireUnit();
		return;
	    }
	    playSound('click1', 'ui');
	    this.main.UI.nextWave.style.filter = 'brightness(0.75)';
	    this.main.UI.nextWave.style.pointerEvents = 'none';
	}

	cancelDeployUnit() {
	    this.deployingUnit = undefined;
	    this.main.UI.updatePokemon();
	    if (!this.main.area.waveActive) {
		this.main.UI.revertUI();
		this.main.UI.nextWave.style.filter = 'revert-layer';
		this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
	    }
	}

  	moveUnitToTile(newTile, mute = false) {
  		if (this.main.area.heavyMetal) return playSound('pop0', 'ui')
	   	if (!this.deployingUnit || !newTile || this.main.isSectionOpen()) return;
		if (this.stopped && !this.canTimeWarpAct(this.deployingUnit)) return;

	    const pokemon = this.deployingUnit;

		if (typeof newTile.canPlacePokemonHere === 'function') {
            if (!newTile.canPlacePokemonHere(pokemon)) return;
		} else {
		    if (
		        !pokemon.tiles.includes(newTile.land) &&
		        !(pokemon?.item?.id == 'airBalloon' && newTile.land == 4) &&
		        !(pokemon?.item?.id == 'heavyDutyBoots' && newTile.land == 2) &&
		        !(pokemon?.item?.id == 'assaultVest' && newTile.land == 2) &&
		        !(pokemon?.item?.id == 'dampMulch' && newTile.land == 1) &&
		        !(pokemon?.item?.id == 'mitsuesCocktail' && newTile.land == 3) &&
		        !(pokemon?.item?.id == 'subwoofer' && newTile.land == 3 && [76, 86, 120].includes(pokemon.id))
		    ) return;
		}

        if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();

        if (pokemon.isDeployed) {
            this.deployingUnit = pokemon;
            this.retireUnit();
            this.deployingUnit = pokemon;
        }

        if (!mute) playSound('equip', 'ui');

	    if (!newTile.tower) {
	        newTile.tower = pokemon;

	        const newTower = new Tower(this.main, newTile.position.x, newTile.position.y, this.ctx, pokemon, newTile);
	        const tileCenter = { x: newTile.position.x + newTile.size / 2, y: newTile.position.y + newTile.size / 2 };
			newTower.center = tileCenter;
			this.main.area.towers.push(newTower);

			if (this.stopped && this.canTimeWarpAct(pokemon)) {
			    this.switchPause();
			    setTimeout(() => { this.switchPause() }, 50)
			}

			if (newTower.ability.id === 'heavyMetal' && !this.main.area.heavyMetal) {
				if (this.main.area.waveActive) {
					playSound('bell', 'effect');
					const heavyMetalStunDuration = (newTower?.pokemon?.item?.id === 'metalCoat') ? 4 : 2;
					this.main.area.heavyMetal = true;
					this.main.area.enemies.forEach(enemy => {
						if (!enemy.dying) enemy.applyStatusEffect({ type: 'stun', duration: heavyMetalStunDuration });
					});
				}
			}

            pokemon.tilePosition = newTile.id;
            pokemon.isDeployed = true;
            pokemon.isPassenger = false;
            pokemon.carriedBy = null;

            this.main.UI.tilesCountNum[newTile.land - 1]++;

            this.main.area.recalculateAuras();
            this.main.area.checkWeather();
            this.main.UI.update();

            this.deployingUnit = undefined;

            if (!this.main.area.waveActive) {
                this.main.UI.revertUI();
                this.main.UI.nextWave.style.filter = 'revert-layer';
                this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
            }
	        return;
	    }

	    if (newTile.tower?.ability?.id === 'grassPlatform' || newTile.tower?.ability?.id === 'mount' || newTile.tower?.ability?.id === 'grimNeigh' || newTile.tower?.ability?.id === 'rest' || newTile.tower?.ability?.id === 'icePlatform') {
	        if (newTile.passenger) {
	            const oldPassenger = newTile.passenger;
	            const movingUnit = this.deployingUnit;

                this.deployingUnit = oldPassenger;
                this.retireUnit();

                this.deployingUnit = movingUnit;
            }

            const ok = this.placeAsPassenger(newTile, this.deployingUnit, true);
            if (ok) {
                this.deployingUnit = undefined;
                if (!this.main.area.waveActive) {
                    this.main.UI.revertUI();
                    this.main.UI.nextWave.style.filter = 'revert-layer';
                    this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
                }
                return;
            }
        }

        playSound('pop0', 'ui');
	}

	findTowerByPokemon(pokemon) {
	    return this.main.area.towers.find(t => t.pokemon === pokemon);
	}

	placeAsPassenger(tile, pokemon, mute = false) {
	    if (!tile || !tile.tower) return false;
	    if (!pokemon) return false;

	    if (tile.tower?.ability?.id !== 'grassPlatform' && tile.tower?.ability?.id !== 'mount' && tile.tower?.ability?.id !== 'grimNeigh' && tile.tower?.ability?.id !== 'rest' && tile.tower?.ability?.id !== 'icePlatform') return false;

	    if (tile.passenger) return false;

	    if (tile.tower === pokemon) return false;

	    if (pokemon.isDeployed) {
	        this.deployingUnit = pokemon;
	        this.retireUnit();
        }

	    if (!mute) playSound('equip', 'ui');

	    tile.passenger = pokemon;

	    pokemon.isDeployed = true;
	    pokemon.isPassenger = true;
	    pokemon.tilePosition = tile.id;

	    const passengerTower = new Tower(this.main, tile.position.x, tile.position.y, this.ctx, pokemon, tile);
	    passengerTower.isPassenger = true;
        passengerTower.carriedBy = tile.tower.ability.id;
        passengerTower.castformTransform();
        passengerTower.center = { x: tile.position.x + tile.size/2, y: tile.position.y + tile.size/2 };

        this.main.area.towers.forEach(tower => {
            if (tower.pokemon.id == tile.tower.id) tower.isMounted = true;
        });

        this.main.area.towers = this.main.area.towers.filter(t => t.pokemon !== pokemon);
		this.main.area.towers.push(passengerTower);

		if (passengerTower.ability.id === 'heavyMetal' && !this.main.area.heavyMetal) {
			if (this.main.area.waveActive) {
				playSound('bell', 'effect');
				const heavyMetalStunDuration = (passengerTower?.pokemon?.item?.id === 'metalCoat') ? 4 : 2;
				this.main.area.heavyMetal = true;
				this.main.area.enemies.forEach(enemy => {
					if (!enemy.dying) enemy.applyStatusEffect({ type: 'stun', duration: heavyMetalStunDuration });
				});
			}
		}

        // UI count como torre normal
		if (passengerTower.carriedBy === 'icePlatform') this.main.UI.tilesCountNum[2] = (this.main.UI.tilesCountNum[2] || 0) + 1;
		else if (passengerTower.carriedBy === 'grassPlatform') this.main.UI.tilesCountNum[1] = (this.main.UI.tilesCountNum[1] || 0) + 1;
		else this.main.UI.tilesCountNum[tile.land - 1] = (this.main.UI.tilesCountNum[tile.land - 1] || 0) + 1;

        this.main.area.recalculateAuras();
        this.main.area.checkWeather();
        this.main.UI.update();

        return true;
	}

	swapUnits(tile1, pokemon1, tile2, pokemon2) {
	    if (!tile1 || !tile2 || !pokemon1 || !pokemon2) return;

	    this.deployingUnit = pokemon1;
	    this.retireUnit();

	    this.deployingUnit = pokemon2;
	    this.retireUnit();

	    this.deployingUnit = pokemon1;
	    this.moveUnitToTile(tile2, true);

	    this.deployingUnit = pokemon2;
	    this.moveUnitToTile(tile1, true);

        this.deployingUnit = undefined;

        this.main.area.recalculateAuras();
        this.main.area.checkWeather();
        this.main.UI.update();
	}

	retireUnit() {
	    if (!this.deployingUnit) return;

	    this.deployingUnit.isDeployed = false;
	    playSound('unequip', 'ui');

	    const index = this.main.area.towers.findIndex(tower => tower.pokemon == this.deployingUnit);
	    if (index === -1) {
	        this.deployingUnit = undefined;
	        this.main.UI.update();
	        return;
        }

        const towerObj = this.main.area.towers[index];
        const tile = towerObj.tile;

        if (tile) {
            // --- si es passenger ---
            if (tile.passenger === this.deployingUnit) {
                tile.passenger = false;

                this.main.area.towers.splice(index, 1);

                this.deployingUnit.tilePosition = -1;
                this.deployingUnit.isPassenger = false;
                this.deployingUnit.carriedBy = null;

                this.deployingUnit = undefined;

				this.main.area.towers.forEach(tower => {
					if (tower.pokemon.id == tile.tower.id) {
						tower.isMounted = false;
						if (tower.ability.id === 'icePlatform') this.main.UI.tilesCountNum[2]--;
						else if (tower.ability.id === 'grassPlatform') this.main.UI.tilesCountNum[1]--;
						else this.main.UI.tilesCountNum[tile.land - 1]--;
					}
				});

                this.main.UI.update();
                this.main.area.checkWeather();
                this.main.area.recalculateAuras();
                return;
            }

            // --- si es base ---
            if (tile.tower === this.deployingUnit) {

                // eliminar passenger si existe
                if (tile.passenger) {
                    // 1. Identificar al pasajero
                    const passengerPokemon = tile.passenger;
                    const pIndex = this.main.area.towers.findIndex(t => t.pokemon === passengerPokemon);

                    // 2. Limpiar al pasajero ANTES que a la base
                    if (pIndex !== -1) this.main.area.towers.splice(pIndex, 1);
			        if (tile.tower.ability.id === 'icePlatform') {
                        if (!tile.tower.isPassenger) this.main.area.addTiles[2]--;
                        this.main.UI.tilesCountNum[2]--;
			        }
                    else if (tile.tower.ability.id === 'grassPlatform') {
                        if (!tile.tower.isPassenger) this.main.area.addTiles[1]--;
                        this.main.UI.tilesCountNum[1]--;
			    	}
			    	else this.main.UI.tilesCountNum[tile.land - 1]--;

			        passengerPokemon.isDeployed = false;
			        passengerPokemon.isPassenger = false;
			        passengerPokemon.carriedBy = null;
                    passengerPokemon.tilePosition = -1;

                    tile.passenger = false;
                }

                // eliminar base
                this.main.UI.tilesCountNum[tile.land - 1]--;
                tile.tower = false;

                towerObj.pokemon.tilePosition = -1;
                this.main.area.towers.splice(index, 1);
            }
        } else {
            // fallback
            this.main.area.towers.splice(index, 1);
        }

        // limpiar flags residuales
        if (this.deployingUnit) {
            this.deployingUnit.isPassenger = false;
            this.deployingUnit.carriedBy = null;
        }

        this.deployingUnit = undefined;

        this.main.UI.update();
        this.main.area.checkWeather();
        this.main.area.recalculateAuras();
	}

	drawWindCurrents(time) {
	    const area = this.main?.area;
	    const wind = area?.windTiles2D;

	    if (!Array.isArray(wind) || wind.length === 0) return;

	    const ctx = this.ctx;
	    const t = (time || 0) * 0.001;

	    const TILE = 24;
	    const CANVAS_W = Game.CANVAS_W;
	    const CANVAS_H = Game.CANVAS_H;

	    if (
	        !this._windCache ||
	        this._windCache.source !== wind ||
	        this._windCache.rows !== wind.length
	    ) {
	        const tiles = [];
	        const backgroundPath = new Path2D();

	        for (let row = 0; row < wind.length; row++) {
	            const tileRow = wind[row];
	            if (!Array.isArray(tileRow)) continue;

	            const ty = row * TILE;

	            for (let col = 0; col < tileRow.length; col++) {
	                if (tileRow[col] !== 8) continue;

	                const tx = col * TILE;
	                const seed = row * 7.13 + col * 3.71;

	                tiles.push({
	                    x: tx,
	                    y: ty,
	                    seed1: seed,
	                    seed2: seed + 11.7,
	                    alphaSeed: col * 0.5
	                });

	                backgroundPath.rect(tx, ty, TILE, TILE);
	            }
	        }

	        this._windCache = {
	            source: wind,
	            rows: wind.length,
	            tiles,
	            backgroundPath
	        };
	    }

	    const cache = this._windCache;
	    const tiles = cache.tiles;

	    if (tiles.length === 0) return;

	    ctx.save();
	    ctx.globalCompositeOperation = 'lighter';

	    ctx.globalAlpha = 0.05 + 0.02 * Math.sin(t * 2);
	    ctx.fillStyle = 'rgba(200, 230, 255, 1)';
	    ctx.fill(cache.backgroundPath);

	    const streakPath = new Path2D();

	    const movement = t * 60;
	    const laneMovement = t * 1.3;

	    for (let i = 0; i < tiles.length; i++) {
	        const tile = tiles[i];

	        const viewX = (this.isXL || this.isXLH)
			    ? tile.x - this.scrollX
			    : tile.x;

	        const viewY = this.isXLV
	            ? tile.y - this.scrollY
	            : tile.y;

	        if (
	            viewX < -TILE ||
	            viewX > CANVAS_W ||
	            viewY < -TILE ||
	            viewY > CANVAS_H
	        ) {
	            continue;
	        }

	        let localX = (movement + tile.seed1 * 13) % TILE;
	        let laneY = tile.y + 6 + 4 * Math.sin(laneMovement + tile.seed1);

	        if (localX > 0 && localX < TILE) {
	            streakPath.moveTo(tile.x + localX, laneY);
	            streakPath.lineTo(tile.x + localX + 10, laneY);
	        }

	        localX = (movement + tile.seed2 * 13) % TILE;
	        laneY = tile.y + 18 + 4 * Math.sin(laneMovement + tile.seed2);

	        if (localX > 0 && localX < TILE) {
	            streakPath.moveTo(tile.x + localX, laneY);
	            streakPath.lineTo(tile.x + localX + 10, laneY);
	        }
	    }

	    ctx.globalAlpha = 0.35;
	    ctx.strokeStyle = 'rgba(220, 240, 255, 1)';
	    ctx.lineWidth = 1.2;
	    ctx.lineCap = 'round';
	    ctx.stroke(streakPath);

	    ctx.restore();
	}

      isEnemyInRange(tower, enemy) {
        const dx = enemy.center.x - tower.center.x;
        let dy = enemy.center.y - tower.center.y;
        const distance = Math.hypot(dx, dy);
        const r = tower.range;

		if (tower.isPassenger) dy -= 13;

		let valueSmall = 24;
		let valueBig = 48;

		if (tower.pokemon?.item?.id == 'wideLens') {
			valueSmall *= 2;
			valueBig *= 2;
		}
		if (this.main.area.victoryStar) {
			valueSmall *= 1.5;
			valueBig *= 1.5;
		}

        switch (tower.pokemon.rangeType) {
              case 'circle':
                return distance <= r;
              case 'donut':
                return distance >= tower.innerRange && distance <= tower.range;
              case 'cross':
                if (tower.pokemon?.item?.id == 'starPiece') {
                  return ((Math.abs(Math.abs(dx) - Math.abs(dy)) < valueSmall && distance <= r) || ((Math.abs(dx) <= valueSmall && Math.abs(dy) <= r) || (Math.abs(dy) <= valueSmall && Math.abs(dx) <= r)))
                } else {
                  return ((Math.abs(dx) <= valueSmall && Math.abs(dy) <= r) || (Math.abs(dy) <= valueSmall && Math.abs(dx) <= r));
                }
			  case 'vShape': {
				const p0 = { x: 0, y: -r * 0.06 };
				const p1 = { x: -r * 0.7, y: -r * 0.65 };
				const p2 = { x: 0, y: r };
				const p3 = { x: r * 0.7, y: -r * 0.65 };
				const p = { x: dx, y: dy };
				const pointInTriangle = (point, a, b, c) => {
					const area = (pa, pb, pc) =>
						(pb.x - pa.x) * (pc.y - pa.y) - (pb.y - pa.y) * (pc.x - pa.x);
					const d1 = area(point, a, b);
					const d2 = area(point, b, c);
					const d3 = area(point, c, a);
					const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
					const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
					return !(hasNeg && hasPos);
				};
				return pointInTriangle(p, p0, p1, p2) || pointInTriangle(p, p0, p2, p3);
			  }
              case 'xShape':
		        if (tower.pokemon?.item?.id == 'condensedBlizzard') {
		          return distance <= r;
		        } else if (tower.pokemon?.item?.id == 'starPiece') {
		          return ((Math.abs(Math.abs(dx) - Math.abs(dy)) < valueSmall && distance <= r) || ((Math.abs(dx) <= valueSmall && Math.abs(dy) <= r) || (Math.abs(dy) <= valueSmall && Math.abs(dx) <= r)))
		        } else if (tower.pokemon?.item?.id == 'wideLens') {
		          return (Math.abs(Math.abs(dx) - Math.abs(dy)) < (valueSmall + 24) && distance <= r);
		        } else {
		          return (Math.abs(Math.abs(dx) - Math.abs(dy)) < valueSmall && distance <= r);
		        }
		    case 'star':
                return ((Math.abs(Math.abs(dx) - Math.abs(dy)) < valueSmall && distance <= r) || ((Math.abs(dx) <= valueSmall && Math.abs(dy) <= r) || (Math.abs(dy) <= valueSmall && Math.abs(dx) <= r)))
            case 'horizontalLine':
                return ( Math.abs(dy) <= valueSmall && Math.abs(dx) <= r );
            case 'verticalLine':
				return ( Math.abs(dx) <= valueSmall && Math.abs(dy) <= r );
              default:
                return distance <= r;
        }
	}

	setEvents() {
	    const canPlaceOn = (pokemon, tile) => {
		    if (!pokemon || !tile) return false;
		    // si la tile implementa el helper, usarlo (incluye grassPlatform)
		    if (typeof tile.canPlacePokemonHere === 'function') return tile.canPlacePokemonHere(pokemon);

		    // fallback a comprobaciones clásicas
		    if (pokemon.tiles && pokemon.tiles.includes(tile.land)) return true;
		    if (pokemon?.item?.id == 'airBalloon' && tile.land == 4) return true;
		    if (pokemon?.item?.id == 'heavyDutyBoots' && tile.land == 2) return true;
		    if (pokemon?.item?.id == 'assaultVest' && tile.land == 2) return true;
		    if (pokemon?.item?.id == 'dampMulch' && tile.land == 1) return true;
		    if (pokemon?.item?.id == 'mitsuesCocktail' && tile.land == 3) return true;
		    if (pokemon?.item?.id == 'subwoofer' && tile.land == 3 && [76, 86, 120].includes(pokemon.id)) return true;
		    return false;
		};

	    this.canvas.addEventListener('mousemove', (event) => {

	        this.mouse.x = event.offsetX;
	        this.mouse.y = event.offsetY;
	        this.mouse.clientX = event.clientX;
			this.mouse.clientY = event.clientY;
	        this.mouseCanvas.x = this._clientToCanvasX(event.clientX);
			this.mouseCanvas.y = this._clientToCanvasY(event.clientY);

	        if (this.isXL || this.isXLH) {
			    const wrapperRect = this.canvasWrapper.getBoundingClientRect();
			    const scaleX = Game.CANVAS_W / wrapperRect.width;
			    this.mouseViewX = (event.clientX - wrapperRect.left) * scaleX;
			}
	        if (this.isXLV) {
	            const wrapperRect = this.canvasWrapper.getBoundingClientRect();
	            const scaleY = Game.CANVAS_H / wrapperRect.height;
	            this.mouseViewY = (event.clientY - wrapperRect.top) * scaleY;
	        }
	        this.activeTile = null;

	        for (let i = 0; i < this.main.area.placementTiles.length; i++) {
	            const tile = this.main.area.placementTiles[i];
	            if (
	                this.mouse.x > tile.position.x &&
	                this.mouse.x < tile.position.x + tile.size &&
	                this.mouse.y > tile.position.y &&
	                this.mouse.y < tile.position.y + tile.size
	            ) {
	                this.activeTile = tile;
	                break;
	            }
	        }
	    });

	    // Stop edge-pan when cursor leaves the canvas area
	    this.canvas.addEventListener('mouseleave', () => {
	        this.mouseViewX = undefined;
	        this.mouseViewY = undefined;
	        this.mouseCanvas.x = undefined;
			this.mouseCanvas.y = undefined;
	    });

	    this.mapDragging = false;

	    // CLICK NORMAL
	    this.canvas.addEventListener('click', (event) => {
		    if (this.mapDragging) {
		        this.mapDragging = false;
		        return;
		    }

		    const pendingBomber = this.main.area.towers.find(t => t.awaitingBombardZone);

			if (pendingBomber) {
				const clickX = this._clientToCanvasX(event.clientX);
				const clickY = this._clientToCanvasY(event.clientY);

			    const target = this._getBombardZonePosition(
				    pendingBomber,
				    clickX,
				    clickY
				);

				const area = pendingBomber.pokemon.bombardmentArea ?? 0;
				const isRockThrow =
				    pendingBomber.ability?.id === 'rockThrow';

				pendingBomber.bombardZone = {
				    x: target.x,
				    y: target.y,
				    radius: area / 2,
				    ...(isRockThrow
				        ? { width: area * 2, height: area }
				        : {})
				};

				pendingBomber.bombardShells = [];
				//pendingBomber.bombardCooldown = 0;
				pendingBomber.awaitingBombardZone = false;

				return;
			}

			const clickX = this._clientToCanvasX(event.clientX);
			const clickY = this._clientToCanvasY(event.clientY);


			const skateTower = this.main.area.towers.find(t => {
			    if (t.pokemon?.item?.id !== 'pokeSkates') return false;
			    const dx = clickX - t.center.x;
			    const dy = clickY - t.center.y;
			    const halfWidth = (t.width || t.tile?.size || 24) / 2;
			    const halfHeight = (t.height || t.tile?.size || 24) / 2;
			    const clickedSprite = Math.abs(dx) <= halfWidth && Math.abs(dy) <= halfHeight;
			    return Math.hypot(dx, dy) <= 70 || clickedSprite;
			});

			if (skateTower) {
			    skateTower.nudgeToClick(clickX, clickY);
			    return;
			}

		    if (!this.activeTile) return;

		    const clickedTopBaseFirst = this.activeTile.tower || this.activeTile.passenger || null;
		    const clickedTopTopmost = this.activeTile.passenger || this.activeTile.tower || null;

		    if (this.deployingUnit) {
		        const newPokemon = this.deployingUnit;

		        if (
					this.stopped &&
					newPokemon?.ability?.id === 'timeWarp' &&
					(
						this.activeTile.tower ||
						this.activeTile.passenger
					) &&
					this.activeTile.tower !== newPokemon &&
					this.activeTile.passenger !== newPokemon
				) {
					playSound('pop0', 'ui');
					return;
				}

		        if (clickedTopBaseFirst === newPokemon) {
		            this.cancelDeployUnit();
		            return;
		        }

		        const canPlaceDragged = canPlaceOn(newPokemon, this.activeTile);
		        if (!canPlaceDragged) return;

		        if (!this.activeTile.tower) {
		            this.moveUnitToTile(this.activeTile);
		            this.cancelDeployUnit();
		            return;
		        }

		        if (
		        	this.activeTile.tower?.ability?.id === 'grassPlatform' ||
		        	this.activeTile.tower?.ability?.id === 'mount' ||
		        	this.activeTile.tower?.ability?.id === 'grimNeigh' ||
		        	this.activeTile.tower?.ability?.id === 'rest' ||
		        	this.activeTile.tower?.ability?.id === 'icePlatform'
		        ) {
		            if (!this.activeTile.passenger) {
		                this.deployingUnit = newPokemon;
		                this.moveUnitToTile(this.activeTile);
		                this.cancelDeployUnit();
		                return;
		            }

		            const base = this.activeTile.tower;
		            const oldPassenger = this.activeTile.passenger;

		            const canBePlacedHere = (typeof this.activeTile.canPlacePokemonHere === 'function')
		                ? this.activeTile.canPlacePokemonHere(newPokemon)
		                : (
		                    (newPokemon.tiles && newPokemon.tiles.includes(this.activeTile.land)) ||
		                    (newPokemon?.item?.id == 'airBalloon' && this.activeTile.land == 4) ||
		                    (newPokemon?.item?.id == 'heavyDutyBoots' && this.activeTile.land == 2) ||
		                    (newPokemon?.item?.id == 'assaultVest' && this.activeTile.land == 2) ||
		                    (newPokemon?.item?.id == 'dampMulch' && this.activeTile.land == 1) ||
		                    (newPokemon?.item?.id == 'mitsuesCocktail' && this.activeTile.land == 3) ||
		                    (newPokemon?.item?.id == 'subwoofer' && this.activeTile.land == 3 && [76, 86, 120].includes(newPokemon.id))
		                  );

		            if (canBePlacedHere) {
		                const newUnit = newPokemon;
		                const originTile = this.main.area.placementTiles.find(
		                    t => t.tower === newUnit || t.passenger === newUnit
		                );

		                if (newUnit.isDeployed && originTile && canPlaceOn(oldPassenger, originTile)) {
		                    this.deployingUnit = oldPassenger;
		                    this.moveUnitToTile(originTile);

		                    this.deployingUnit = newUnit;
		                    this.moveUnitToTile(this.activeTile);

		                    this.cancelDeployUnit();
		                    return;
		                }

		                this.deployingUnit = oldPassenger;
		                this.retireUnit();

		                this.deployingUnit = newUnit;
		                this.moveUnitToTile(this.activeTile);
		                this.cancelDeployUnit();
		                return;
		            } else {
		                const savedNew = newPokemon;

		                this.deployingUnit = base;
		                this.retireUnit();

		                this.deployingUnit = savedNew;
		                this.moveUnitToTile(this.activeTile);
		                this.cancelDeployUnit();
		                return;
		            }
		        }

		        if (newPokemon.isDeployed) {
		            const sourceTile = this.main.area.placementTiles.find(t => t.tower === newPokemon || t.passenger === newPokemon);
		            if (sourceTile) {
		                this.swapUnits(sourceTile, newPokemon, this.activeTile, this.activeTile.tower);
		            } else {
		                this.deployingUnit = newPokemon;
		                this.retireUnit();
		                this.moveUnitToTile(this.activeTile);
		            }

		            this.cancelDeployUnit();
		            playSound('equip', 'ui');
		            if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
		            if (!this.main.area.waveActive) {
		                this.main.UI.revertUI();
		                this.main.UI.nextWave.style.filter = 'revert-layer';
		                this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
		            }
		            return;
		        } else {
		            const savedNew = newPokemon;
		            this.deployingUnit = this.activeTile.tower;
		            this.retireUnit();
		            this.deployingUnit = savedNew;
		            this.moveUnitToTile(this.activeTile);
		            this.cancelDeployUnit();
		            return;
		        }
		    } else {
		        if (clickedTopTopmost) {
		            const index = this.main.team.pokemon.findIndex(pokemon => pokemon === clickedTopTopmost);
		            if (index !== -1) this.tryDeployUnit(index);
		        }
		    }
		});

	    this.canvas.addEventListener('contextmenu', (event) => {
		    event.preventDefault();

		    const follower = this.main.area.towers.find(t =>
		        t.pokemon?.ability?.id === 'unburden' &&
		        t.pokemon?.item?.id === 'blimpKeys' &&
		        t.isWandering
		    );

		    const clickX = this._clientToCanvasX(event.clientX);
			const clickY = this._clientToCanvasY(event.clientY);

		    if (follower) {
		        if (follower.anchored) {
		            follower.anchored = false;
		            follower.wanderTarget = null;
		        } else {
		            const clickX = this._clientToCanvasX(event.clientX);
		            const clickY = this._clientToCanvasY(event.clientY);

		            follower.wanderTarget = { x: clickX, y: clickY };
		            follower.anchored = true;
		        }
		        return;
		    }

		    if (this.activeTile?.tower || this.activeTile?.passenger) {
		        const poke = this.activeTile.passenger || this.activeTile.tower;
		        const index = this.main.team.pokemon.findIndex(pokemon => poke === pokemon);
		        this.main.pokemonScene.open(poke, index);
		    }
		});

	    let mapDrag = {
	        active: false,
	        originTile: null,
	        pokemon: null,
	        clone: null,
	        rect: null,
	        scaleX: 1,
	        scaleY: 1,
	        startX: 0,
	        startY: 0
	    };

	    this.canvas.addEventListener('pointerdown', (e) => {
	        if (!this.isXL && !this.isXLV && !this.isXLH) return;
	        if (e.button !== 1 && e.button !== 2) return;
	        e.preventDefault();
	        this._scrolling = true;
	        this._panStartX = e.clientX;
	        this._panStartY = e.clientY;
	        this._panStartScrollX = this.scrollX;
	        this._panStartScrollY = this.scrollY;

	        const onPanMove = (ev) => {
	            if (!this._scrolling) return;
	            const rect = this.canvasWrapper.getBoundingClientRect();
	            if (this.isXL || this.isXLH) {
	                const scaleX = Game.CANVAS_W / rect.width;
	                const dx = (this._panStartX - ev.clientX) * scaleX;
	                this.scrollTo(this._panStartScrollX + dx);
	            }
	            if (this.isXLV) {
	                const scaleY = Game.CANVAS_H / rect.height;
	                const dy = (this._panStartY - ev.clientY) * scaleY;
	                this.scrollToY(this._panStartScrollY + dy);
	            }
	        };
	        const onPanUp = () => {
	            this._scrolling = false;
	            window.removeEventListener('pointermove', onPanMove);
	            window.removeEventListener('pointerup',   onPanUp);
	        };
	        window.addEventListener('pointermove', onPanMove);
	        window.addEventListener('pointerup',   onPanUp);
	    });

	    // ── XL map: scroll wheel pans horizontally ─────────────────────────
	    window.addEventListener('wheel', (e) => {
		    if (!this.isXL && !this.isXLV && !this.isXLH) return;

		    const panel = this.main.UI.playerPanel.getBoundingClientRect()

		    const overPanel =
			    e.clientX >= panel.left &&
			    e.clientX <= panel.right &&
			    e.clientY >= panel.top &&
			    e.clientY <= panel.bottom;

			if (overPanel) return;

		    if (this.isXL || this.isXLH) {
		        this.scrollBy(
		            e.deltaY * 0.5 +
		            e.deltaX * 0.5
		        );
		    } else if (this.isXLV) {
		        this.scrollByY(
		            e.deltaY * 0.5 +
		            e.deltaX * 0.5
		        );
		    }
		}, { passive: false });

	    this.canvas.addEventListener('pointerdown', (e) => {
	        if (!e.isPrimary) return;

	        const rect = this.canvas.getBoundingClientRect();
	        const scaleX = this.canvas.width / rect.width;
	        const scaleY = this.canvas.height / rect.height;
	        const canvasX = (e.clientX - rect.left) * scaleX;
	        const canvasY = (e.clientY - rect.top) * scaleY;

	        const tile = this.main.area.placementTiles.find(t =>
	            canvasX > t.position.x &&
	            canvasX < t.position.x + t.size &&
	            canvasY > t.position.y &&
	            canvasY < t.position.y + t.size
	        );

	        const topPokemon = tile ? (tile.passenger || tile.tower) : null;

	        if ((this.isXL || this.isXLV || this.isXLH) && !topPokemon && !this.deployingUnit) {
	            e.preventDefault();

	            const panStartClientX  = e.clientX;
	            const panStartClientY  = e.clientY;
	            const panStartScrollX  = this.scrollX;
	            const panStartScrollY  = this.scrollY;
	            let   hasPanned        = false;
	            const PAN_THRESHOLD    = 4;

	            this.canvas.style.cursor = 'grab';

	            const onPanMove = (ev) => {
	                const dx = (panStartClientX - ev.clientX) * scaleX;
	                const dy = (panStartClientY - ev.clientY) * scaleY;
	                if (!hasPanned && (Math.abs(dx) > PAN_THRESHOLD || Math.abs(dy) > PAN_THRESHOLD)) hasPanned = true;
	                if (!hasPanned) return;
	                this.canvas.style.cursor = 'grabbing';

	                this.mouseViewX = undefined;
	                this.mouseViewY = undefined;
	                if (this.isXL || this.isXLH) this.scrollTo(panStartScrollX + dx);
	                if (this.isXLV) this.scrollToY(panStartScrollY + dy);
	            };

	            const onPanUp = () => {
	                this.canvas.style.cursor = '';
	                this.mouseViewX = undefined;
	                this.mouseViewY = undefined;
	                window.removeEventListener('pointermove', onPanMove);
	                window.removeEventListener('pointerup',   onPanUp);
	                window.removeEventListener('pointercancel', onPanUp);
	            };

	            window.addEventListener('pointermove', onPanMove);
	            window.addEventListener('pointerup',   onPanUp);
	            window.addEventListener('pointercancel', onPanUp);
	            return;
	        }

	        if (!tile) return;

	        if (!topPokemon) return;

	        mapDrag.rect = rect;
	        mapDrag.scaleX = scaleX;
	        mapDrag.scaleY = scaleY;
	        mapDrag.originTile = tile;
	        mapDrag.pokemon = topPokemon;
	        mapDrag.startX = e.clientX;
	        mapDrag.startY = e.clientY;
	        mapDrag.active = false;

	        const MOVETHRESHOLD = 5;
	        let shouldEndDeploy = false;

	        const onMoveCheck = (ev) => {
	            const dx = ev.clientX - mapDrag.startX;
	            const dy = ev.clientY - mapDrag.startY;
	            if (Math.hypot(dx, dy) > MOVETHRESHOLD) {
	                window.removeEventListener('pointermove', onMoveCheck);
	                window.removeEventListener('pointerup', onCancelStart);
	                window.removeEventListener('pointercancel', onCancelStart);

	                mapDrag.active = true;
	                this.mapDragging = true;

	                this.deployingUnit = mapDrag.pokemon;

	                const pokemon = mapDrag.pokemon;
	                mapDrag.clone = document.createElement('div');
	                mapDrag.clone.className = 'map-drag-clone';
	                mapDrag.clone.style.position = 'absolute';
	                mapDrag.clone.style.pointerEvents = 'none';
	                mapDrag.clone.style.zIndex = 10000;
	                mapDrag.clone.style.width = '60px';
	                mapDrag.clone.style.height = '60px';
	                mapDrag.clone.style.scale = '1.2';
	                mapDrag.clone.style.backgroundImage = `url("${pokemon.sprite?.base || pokemon.sprite || ''}")`;
	                mapDrag.clone.style.backgroundPosition = 'center';
	                mapDrag.clone.style.backgroundRepeat = 'no-repeat';
	                mapDrag.clone.style.transform = 'translate(-50%, -50%)';
	                mapDrag.clone.style.filter = `drop-shadow(6px 6px 2px #222)`;

	                document.body.appendChild(mapDrag.clone);

	                window.addEventListener('pointermove', onDraggingMove);
	                window.addEventListener('pointerup', onDraggingUp);
	                window.addEventListener('pointercancel', onDraggingUp);
	            }
	        };

	        const onCancelStart = () => {
	            window.removeEventListener('pointermove', onMoveCheck);
	            window.removeEventListener('pointerup', onCancelStart);
	            window.removeEventListener('pointercancel', onCancelStart);
	            mapDrag = { active: false, originTile: null, pokemon: null, clone: null, rect: null, scaleX: 1, scaleY: 1, startX: 0, startY: 0 };
	        };

	        window.addEventListener('pointermove', onMoveCheck);
	        window.addEventListener('pointerup', onCancelStart);
	        window.addEventListener('pointercancel', onCancelStart);

	        const onDraggingMove = (ev) => {
			    if (!mapDrag.active) return;

			    if (mapDrag.clone) {
			        mapDrag.clone.style.left = `${ev.pageX}px`;
			        mapDrag.clone.style.top = `${ev.pageY}px`;
			        mapDrag.clone.style.opacity = '1';
			    }

			    const canvasX = this._clientToCanvasX(ev.clientX);
			    const canvasY = this._clientToCanvasY(ev.clientY);

			    const directTile = this.main.area.placementTiles.find(t =>
			        canvasX > t.position.x &&
			        canvasX < t.position.x + t.size &&
			        canvasY > t.position.y &&
			        canvasY < t.position.y + t.size
			    );

			    this.mouse.x = canvasX;
			    this.mouse.y = canvasY;
			    this.activeTile = directTile || null;

			    // if (this.deployingUnit) {
			    //     this.main.area.placementTiles.forEach(tile => {
			    //         tile.update(this.mouse);
			    //     });
			    // }

			    // Forzar un redraw inmediato durante la pausa.
			    if (this.stopped) {
			        this.lastTime = 0;
			        this.animate(performance.now());
			    }
			};

	        const onDraggingUp = (ev) => {
	            if (mapDrag.clone) mapDrag.clone.remove();
	            window.removeEventListener('pointermove', onDraggingMove);
	            window.removeEventListener('pointerup', onDraggingUp);
	            window.removeEventListener('pointercancel', onDraggingUp);

	            const canvasX = this._clientToCanvasX(ev.clientX);
	            const canvasY = this._clientToCanvasY(ev.clientY);

	            const targetTile = this.main.area.placementTiles.find(t =>
	                canvasX > t.position.x &&
	                canvasX < t.position.x + t.size &&
	                canvasY > t.position.y &&
	                canvasY < t.position.y + t.size
	            );

	            const pokemon = mapDrag.pokemon;

	            const domTarget = document.elementFromPoint(ev.clientX, ev.clientY);
	            const droppedOnUI = domTarget && domTarget.closest('.ui-player-panel, .ui-pokemon-container, .ui-pokemon');

	            if (this.main.area.heavyMetal) {
		this.deployingUnit = undefined;

			        if (!this.main.area.waveActive) {
			            this.main.UI.revertUI();
			            this.main.UI.nextWave.style.filter = 'revert-layer';
			            this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
			        }
		return playSound('pop0', 'ui')
	            }

	            if (droppedOnUI) {
	                this.deployingUnit = pokemon;
	                this.retireUnit();
	                shouldEndDeploy = true;
	            } else if (!targetTile) {
	                this.deployingUnit = pokemon;
	                this.moveUnitToTile(mapDrag.originTile, true);
	                shouldEndDeploy = true;
	            } else {
				    const targetBase = targetTile.tower || null;
				    const targetPassenger = targetTile.passenger || null;

				    if (
				        this.stopped &&
				        pokemon?.isDeployed &&
				        (targetBase || targetPassenger)
				    ) {
				        playSound('pop0', 'ui');
				        shouldEndDeploy = true;
				    }

				    else if (targetPassenger === pokemon || targetBase === pokemon) {
				        shouldEndDeploy = true;
				    } else {
				        const canPlaceDraggedToTarget = canPlaceOn(pokemon, targetTile);

	                    if (!canPlaceDraggedToTarget) {
	                        playSound('pop0', 'ui');
	                        this.deployingUnit = pokemon;
	                        this.moveUnitToTile(mapDrag.originTile);
	                        shouldEndDeploy = true;
	                    } else {

	                        if (!targetBase) {
	                            this.deployingUnit = pokemon;
	                            this.moveUnitToTile(targetTile);
	                            shouldEndDeploy = true;
	                        }

	                        else if (
	                        	targetBase?.ability?.id === 'grassPlatform' ||
	                        	targetBase?.ability?.id === 'mount' ||
	                        	targetBase?.ability?.id === 'grimNeigh' ||
	                        	targetBase?.ability?.id === 'rest' ||
	                        	targetBase?.ability?.id === 'icePlatform'
	                        ) {
	                            this.deployingUnit = pokemon;
	                            this.moveUnitToTile(targetTile);
	                            shouldEndDeploy = true;
	                        }

	                        else {
	                            if (targetTile.passenger || mapDrag.originTile.passenger) {
	                                playSound('pop0', 'ui');
	                                this.deployingUnit = pokemon;
	                                this.moveUnitToTile(mapDrag.originTile);
	                                shouldEndDeploy = true;
	                            } else {
	                                playSound('equip', 'ui');
	                                const sourceTile = mapDrag.originTile;
	                                this.swapUnits(sourceTile, pokemon, targetTile, targetBase);
	                                shouldEndDeploy = true;
	                            }
	                        }
	                        // else {
	                        //     if (targetTile.passenger || mapDrag.originTile.passenger) {
	                        //         playSound('pop0', 'ui');
	                        //         this.deployingUnit = pokemon;
	                        //         this.moveUnitToTile(mapDrag.originTile);
	                        //         shouldEndDeploy = true;
	                        //     } else {
	                        //         const canPlaceTargetToSource = canPlaceOn(targetBase, mapDrag.originTile);
	                        //         if (!canPlaceTargetToSource) {
	                        //             playSound('pop0', 'ui');
	                        //             this.deployingUnit = pokemon;
	                        //             this.moveUnitToTile(mapDrag.originTile);
	                        //             shouldEndDeploy = true;
	                        //         } else {
	                        //             playSound('equip', 'ui');
	                        //             const sourceTile = mapDrag.originTile;
	                        //             this.swapUnits(sourceTile, pokemon, targetTile, targetBase);
	                        //             shouldEndDeploy = true;
	                        //         }
	                        //     }
	                        // }
	                    }
	                }
	            }

	            mapDrag = { active: false, originTile: null, pokemon: null, clone: null, rect: null, scaleX: 1, scaleY: 1, startX: 0, startY: 0 };

	            if (shouldEndDeploy && this.deployingUnit) {
	                this.cancelDeployUnit();
	            } else if (this.deployingUnit) {
	                this.cancelDeployUnit();
	            }

	            this.activeTile = null;
	            this.mouse.x = undefined;
	            this.mouse.y = undefined;
	            this.mapDragging = false;

	            if (this.main && this.main.UI) this.main.UI.update();
	            this.lastTime = 0;
	            this.animate(performance.now());
	        };
	    });
	}

	toggleSpeed() {
	    playSound('option', 'ui');
	    if (this.speedFactor === 0.8) {
	      	this.speedFactor = 1.2;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg, var(--rocket2) 25%, var(--rocket1) 25%)';
	    } else if (this.speedFactor === 1.2) {
	      	this.speedFactor = 1.7;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg, var(--rocket3) 50%, var(--rocket1) 50%)';
	    } else if (this.speedFactor === 1.7) {
	      	this.speedFactor = 2;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg, var(--rocket4) 75%, var(--rocket1) 75%)';
	    } else if (this.speedFactor === 2) {
	      	this.speedFactor = 2.5;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg, var(--rocket5) 100%, var(--rocket1) 100%)';
	    } else if (this.speedFactor === 2.5 && this.main.player.hasRose) {
	      	this.speedFactor = 5;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg, var(--rocket2) 0%, var(--rocket2) 25%, var(--rocket3) 25%, var(--rocket3) 50%, var(--rocket4) 50%, var(--rocket4) 75%, var(--rocket5) 75%,  var(--rocket5) 100%';
	    } else if (this.speedFactor === 5 && this.main.player.hasRose) {
	      	this.speedFactor = 0.4;
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg, var(--rocket6a) 100%, var(--rocket6b) 100%)';
	    } else {
	      	this.speedFactor = 0.8;
	      	this.main.UI.speedWave.style.background = `url("./src/assets/images/textures/texture1.png"), var(--rocket1)`;
	    }
	}

	switchPause() {
        playSound('option', 'ui');

        const activeClone = document.querySelector('.map-drag-clone');
        if (activeClone) activeClone.remove();

        if (!this.stopped) {
            this.stopped = true;

            if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();

            if (this.gameWorker) {
                try { this.gameWorker.postMessage('stop'); } catch(e) { }
            }

            if (this.loopId) {
                clearInterval(this.loopId);
	            this.loopId = null;
	        }

	        this.canvas.style.pointerEvents = 'auto';

	        this.deployingUnit = undefined;
	        this.mapDragging = false;
            this.activeTile = null;
            this.mouse.x = undefined;
            this.mouse.y = undefined;

	        this.showPauseOverlay();

	        this.main.UI.pauseWave.style.background = `url("./src/assets/images/textures/texture1.png"), var(--rocket5)`;
	    } else {
	        this.stopped = false;
	        this.lastTime = performance.now();


            if (this.gameWorker) {
                try { this.gameWorker.postMessage('start'); } catch(e) { }
            } else {
                if (this.loopId) clearInterval(this.loopId);
                this.loopId = setInterval(() => this.animate(performance.now()), this.frameDuration);
            }

	        this.hidePauseOverlay();

	        this.canvas.style.pointerEvents = 'auto';
	        this.main.UI.pauseWave.style.background = `url("./src/assets/images/textures/texture1.png"), var(--rocket1)`;
	    }
	}

	stop() {
        this.stopped = true;

        if (this.gameWorker) {
            try { this.gameWorker.postMessage('stop'); } catch(e) { }
        }

        if (this.loopId) {
            clearInterval(this.loopId);
            this.loopId = null;
        }

        this.canvas.style.pointerEvents = 'none';
	}

      resume() {
        if (!this.stopped) return;
        this.stopped = false;
        this.lastTime = performance.now();

        if (this.gameWorker) {
            try { this.gameWorker.postMessage('start'); } catch(e) { }
        } else {
            if (this.loopId) clearInterval(this.loopId);
            this.loopId = setInterval(() => this.animate(performance.now()), this.frameDuration);
        }

        this.canvas.style.pointerEvents = 'auto';
	}

      toggleRanges() {
        this.ranges = !this.ranges;
      }

      restoreSpeed() {
        this.speedFactor = 0.8;
        this.main.UI.speedWave.style.background = 'linear-gradient(0deg,rgba(194, 177, 183, 1) 50%, rgba(194, 177, 183, 1) 50%)'
      }

	shakeCanvas(duration = 500) {
        this.canvas.classList.add('canvas-shake');

        setTimeout(() => {
            this.canvas.classList.remove('canvas-shake');
        }, duration);
	}

	startShake(intensity = 20, duration = 800) {
        this.canvasShake.active = true;
        this.canvasShake.intensity = intensity;
        this.canvasShake.duration = duration;
        this.canvasShake.elapsed = 0;
	}

	showPauseOverlay() {
        if (this.pauseOverlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'pause-overlay';
        overlay.textContent = 'GAME PAUSED';

        overlay.style.position = 'absolute';
        overlay.style.left = '50%';
        overlay.style.top = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';

        overlay.style.padding = '20px 40px';
        overlay.style.fontSize = '12px';
        overlay.style.fontWeight = 'bold';
        overlay.style.letterSpacing = '2px';
        overlay.style.textShadow = '2px 2px black';
        overlay.style.color = '#fff';

        overlay.style.background = 'rgba(0, 0, 0, 0.8)';
        overlay.style.border = '2px solid rgba(0, 0, 0, 0.3)';
        overlay.style.boxShadow = '0 0 10px black';
        overlay.style.borderRadius = '8px';

        overlay.style.pointerEvents = 'none';

        const screen = document.getElementById('screen');
        screen.style.position = 'relative';
        screen.appendChild(overlay);

        this.pauseOverlay = overlay;
	}

	hidePauseOverlay() {
        if (!this.pauseOverlay) return;
	    this.pauseOverlay.remove();
	    this.pauseOverlay = null;
	}

	canTimeWarpAct(pokemon = this.deployingUnit) {
	    return pokemon?.ability?.id === 'timeWarp';
	}

	showPlacementTiles() {
	    if (!this.deployingUnit) return;

	    this.main.area.placementTiles.forEach(tile => {
	        tile.update(this.mouse);
	    });

	    this.lastTime = 0;
	    this.animate(performance.now());
	}
}
