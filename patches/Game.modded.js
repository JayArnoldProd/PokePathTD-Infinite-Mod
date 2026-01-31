import { Tower } from './component/Tower.js';
import { text } from '../file/text.js';
import { playSound } from '../file/audio.js';

export class Game {
	constructor(main) {
	    this.main = main;
	    this.canvas = document.createElement('canvas');
	    this.canvas.width = 720;
	    this.canvas.height = 624;
	    this.ctx = this.canvas.getContext('2d');
	    this.canvasBackground = new Image();
	    this.canvasEffect = new Image();
	    this.effectEnabled = false;
	    this.effectTime = 0;
	    document.getElementById('screen').appendChild(this.canvas);
	    this.deployingUnit = undefined;
	    this.stopped = false;
	    this.activeTile = undefined;
	    this.mouse = { x: undefined, y: undefined };
	    this.FPS = 60;
	    this.frameDuration = 1000 / this.FPS;
	    this.lastTime = 0;
	    this.loopId = null;
	    this.animate = this.animate.bind(this);
	    this.ranges = false;
	    this.speedFactor = 1;
	    this.chrono;

	    this.canvasShake  = {
		  	active: false,
		  	intensity: 0,  
		  	duration: 0, 
		  	elapsed: 0  
		};
	}

  	load() {
	    this.stopped = false;
	    this.lastTime = performance.now();
	    if (this.loopId) clearInterval(this.loopId);
	    this.loopId = setInterval(() => this.animate(performance.now()), this.frameDuration);
	    this.setEvents();
	    this.chrono = this.main.utility.chrono(1);
  	}

  	animate(time) {
	    if (this.stopped) return;
	    if (!this.lastTime) this.lastTime = time;
	    const delta = time - this.lastTime;
	    if (delta < this.frameDuration) return;
	    
	    this.lastTime = time - (delta % this.frameDuration);

	    // --- DELTA TIME FIX: Sub-stepping for high speed accuracy ---
	    // Calculate total scaled time to simulate this frame
	    const totalScaledDelta = this.frameDuration * this.speedFactor;
	    
	    // Determine number of simulation steps (cap at 100 for CPU safety)
	    // Each step simulates at most 1 frame worth of time (16.67ms)
	    const maxStepMs = this.frameDuration; // 16.67ms at 60fps
	    const numSteps = Math.min(100, Math.max(1, Math.ceil(totalScaledDelta / maxStepMs)));
	    const stepDelta = totalScaledDelta / numSteps;

	    // TERREMOTO (only process once per frame, not per step)
	    if (this.canvasShake.active) {
		    this.canvasShake.elapsed += delta;

		    const progress = Math.min(1, this.canvasShake.elapsed / this.canvasShake.duration);
		    const ease = 1 - Math.pow(progress, 2); // decaimiento suave
		    const intensity = this.canvasShake.intensity * ease;

		    const dx = (Math.random() - 0.5) * 2 * intensity;
		    const dy = (Math.random() - 0.5) * 2 * intensity;

		    this.canvas.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

		    if (progress >= 1) {
		        this.canvasShake.active = false;
		        this.canvas.style.transform = `translate(-50%, -50%)`; // volver a posición original
		    }
		}

	    // --- SUB-STEPPING LOOP ---
	    for (let step = 0; step < numSteps; step++) {
	        const isLastStep = (step === numSteps - 1);
	        
	        // Only render on last step (clear and draw background)
	        if (isLastStep && this.ctx) {
	            if (this.canvasBackground.complete && this.canvasBackground.naturalWidth !== 0) {
	                this.ctx.drawImage(this.canvasBackground, 0, 0, this.canvas.width, this.canvas.height);
	            } else {
	                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	            }
	        }

	        // actualizar enemigos
	        for (let i = this.main.area.enemies.length - 1; i >= 0; i--) {
	          const enemy = this.main.area.enemies[i];
	          // Only draw on last step
	          enemy._skipDraw = !isLastStep;
	          enemy.update(stepDelta);
	          enemy._skipDraw = false;
	          if (this.main.area.enemies.indexOf(enemy) === -1) continue;
	          if (enemy.waypoints.length === enemy.waypointIndex + 1) {
	            if ( enemy.position.x > this.canvas.width || enemy.position.x < -30 || enemy.position.y - 20 > this.canvas.height || enemy.position.y < -20 ) {
	              playSound('hit2', 'effect');
	              this.main.player.getDamaged(enemy.power);
	              const idx = this.main.area.enemies.indexOf(enemy);
	              if (idx !== -1) this.main.area.enemies.splice(idx, 1);
	              continue;
	            }
	          }
	        }
	        
	        // actualizar tiles (only on last step for visuals)
	        if (isLastStep) {
	            this.main.area.placementTiles.forEach(tile => tile.update(this.mouse));
	        }
	        
	        // actualizar torres
	        this.main.area.towers.forEach(tower => {
	          const enemiesInRange = this.main.area.enemies.filter(enemy => {
	            const insideCanvas = ( enemy.center.x >= 0 && enemy.center.x <= this.canvas.width && enemy.center.y >= 0 && enemy.center.y <= this.canvas.height );
	            return insideCanvas && this.isEnemyInRange(tower, enemy) && !enemy.dying;
	          });
	          // Only draw on last step
	          tower._skipDraw = !isLastStep;
	          tower.update(enemiesInRange, stepDelta);
	          tower._skipDraw = false;
	        });
	        
	        // fin de la oleada (check each step)
	        if (this.main.area.waveActive && this.main.area.enemies.length === 0) {
	          this.main.area.endWave();
	          break; // Exit sub-stepping if wave ends
	        }
	    }
	    // --- END SUB-STEPPING LOOP ---
	    
	    this.main.UI.updateDamageDealt();
	    // dibujar textos de daño
	    if (this.main.showDamage) {
	      this.main.area.enemies.forEach(enemy => {
	        enemy.drawFloatingTexts();
	      });
	    }
	    if (this.ranges) {
	      this.main.area.placementTiles.forEach(tile => {
	        if (tile.tower) {
	          tile.drawRange(tile.tower.range, tile.tower.rangeType, tile.tower.innerRange, tile.tower.ability, tile.tower.item, true);
	        }
	      })
	    }

	    if (this.main.mapEffects != 2) {
	    	if (this.effectEnabled) {
			    this.effectTime += scaledDelta;

			    const targetAlpha = (this.main.mapEffects == 1) ? 1 : 0.65 + 0.1 * Math.sin(this.effectTime * 0.001);
			    const targetGlobalAlpha = (this.main.mapEffects == 1) ? 1 : 0.65 + 0.01 * Math.sin(this.effectTime * 0.001);

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

	    this.ctx.restore();
  	}

	stop() {
	    this.stopped = true;
	    if (this.loopId) {
	      	clearInterval(this.loopId);
	      	this.loopId = null;
	    }
	}

  	resume() {
	    if (!this.stopped) return;
	    this.stopped = false;
	    this.lastTime = performance.now();
	    if (this.loopId) clearInterval(this.loopId);
	    this.loopId = setInterval(() => this.animate(performance.now()), this.frameDuration);
  	}

  	tryDeployUnit(pos, ui) {
	    if (this.deployingUnit != undefined) return this.cancelDeployUnit();
	    if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	    this.deployingUnit = this.main.team.pokemon[pos];
	    if (this.main.team.pokemon[pos].isDeployed && ui) {
	      	this.retireUnit();
	      	return;
	    }
	    playSound('click1', 'ui');
	    this.main.UI.nextWave.style.filter = 'brightness(0.8)';
	    this.main.UI.nextWave.style.pointerEvents = 'none';
  	}

  	cancelDeployUnit() {
	    playSound('pop0', 'ui');
	    this.deployingUnit = undefined;
	    this.main.UI.updatePokemon();
	    if (!this.main.area.waveActive) {
	      	this.main.UI.revertUI();
	      	this.main.UI.nextWave.style.filter = 'revert-layer';
	      	this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
	    }
  	}

  	moveUnitToTile(newTile) {
	    if (!this.deployingUnit || !newTile) return;
	    if (
	      	!this.deployingUnit.tiles.includes(newTile.land) &&
	      	!(this.deployingUnit?.item?.id == 'airBalloon' && newTile.land == 4) &&
	      	!(this.deployingUnit?.item?.id == 'heavyDutyBoots' && newTile.land == 2) &&
	      	!(this.deployingUnit?.item?.id == 'assaultVest' && newTile.land == 2) &&
	      	!(this.deployingUnit?.item?.id == 'dampMulch' && newTile.land == 1)
	    ) return;
	    if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	    playSound('equip', 'ui');
	    if (this.deployingUnit.isDeployed) {
	      	const oldTile = this.main.area.placementTiles.find(tile => tile.tower === this.deployingUnit);
	      	if (oldTile) {
	        oldTile.tower = false;
	        const index = this.main.area.towers.findIndex(tower => tower.pokemon === this.deployingUnit);
	        if (index !== -1) {
	          	this.main.area.towers.splice(index, 1);
	        }
	        this.main.UI.tilesCountNum[oldTile.land - 1]--;
	      	}
	    }
	    newTile.tower = this.deployingUnit;
	    this.main.area.towers.push(
	      	new Tower(this.main, newTile.position.x, newTile.position.y, this.ctx, this.deployingUnit, newTile)
	    );
	    this.deployingUnit.tilePosition = newTile.id;
	    this.deployingUnit.isDeployed = true;
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
	}

	swapUnits(tile1, pokemon1, tile2, pokemon2) {
	    const tower1Index = this.main.area.towers.findIndex(t => t.pokemon === pokemon1);
	    const tower2Index = this.main.area.towers.findIndex(t => t.pokemon === pokemon2);
	    tile1.tower = pokemon2;
	    tile2.tower = pokemon1;
	    [pokemon1.tilePosition, pokemon2.tilePosition] = [pokemon2.tilePosition, pokemon1.tilePosition];
	    [this.main.area.towers[tower1Index].position.x, this.main.area.towers[tower2Index].position.x] =
	      [this.main.area.towers[tower2Index].position.x, this.main.area.towers[tower1Index].position.x];
	    [this.main.area.towers[tower1Index].position.y, this.main.area.towers[tower2Index].position.y] =
	      [this.main.area.towers[tower2Index].position.y, this.main.area.towers[tower1Index].position.y];
	    [this.main.area.towers[tower1Index].center.x, this.main.area.towers[tower2Index].center.x] =
	      [this.main.area.towers[tower2Index].center.x, this.main.area.towers[tower1Index].center.x];
	    [this.main.area.towers[tower1Index].center.y, this.main.area.towers[tower2Index].center.y] =
	      [this.main.area.towers[tower2Index].center.y, this.main.area.towers[tower1Index].center.y];
	    [this.main.area.towers[tower1Index].tile, this.main.area.towers[tower2Index].tile] =
	      [this.main.area.towers[tower2Index].tile, this.main.area.towers[tower1Index].tile];
	    this.main.area.recalculateAuras();
	    this.main.area.checkWeather();
	    this.main.UI.update();
	}

	retireUnit() {
	    if (!this.deployingUnit) return;
	    this.deployingUnit.isDeployed = false;
	    playSound('unequip', 'ui');
	    const index = this.main.area.towers.findIndex((tower) => tower.pokemon == this.deployingUnit);
	    if (index !== -1) {
	      	this.main.UI.tilesCountNum[this.main.area.towers[index].tile.land-1]--;
	      	this.main.area.towers[index].tile.tower = false;
	      	this.main.area.towers[index].pokemon.tilePosition = -1;
	      	this.main.area.towers.splice(index, 1);
	    }
	    this.deployingUnit = undefined;
	    this.main.UI.update();
	    this.main.area.checkWeather();
	    this.main.area.recalculateAuras();
	}

  	isEnemyInRange(tower, enemy) {
	    const dx = enemy.center.x - tower.center.x;
	    const dy = enemy.center.y - tower.center.y;
	    const distance = Math.hypot(dx, dy);
	    const r = tower.range;
	    switch (tower.pokemon.rangeType) {
	      	case 'circle':
	        	return distance <= r;
	      	case 'donut':
	        	return distance >= tower.innerRange && distance <= tower.range;
	      	case 'cross':
		        if (tower.pokemon?.item?.id == 'starPiece') {
		          return ( (Math.abs(Math.abs(dx) - Math.abs(dy)) < 24 && distance <= r) || ((Math.abs(dx) <= 24 && Math.abs(dy) <= r) || (Math.abs(dy) <= 24 && Math.abs(dx) <= r)) )
		        } else if (tower.pokemon?.item?.id == 'wideLens') {
		          return ( (Math.abs(dx) <= 36 && Math.abs(dy) <= r) || (Math.abs(dy) <= 36 && Math.abs(dx) <= r) );
		        } else {
		          return ( (Math.abs(dx) <= 24 && Math.abs(dy) <= r) || (Math.abs(dy) <= 24 && Math.abs(dx) <= r) );
		        }
	      	case 'xShape':
		        if (tower.pokemon?.item?.id == 'condensedBlizzard') {
		          return distance <= r;
		        } else if (tower.pokemon?.item?.id == 'starPiece') {
		          return ( (Math.abs(Math.abs(dx) - Math.abs(dy)) < 24 && distance <= r) || ((Math.abs(dx) <= 24 && Math.abs(dy) <= r) || (Math.abs(dy) <= 24 && Math.abs(dx) <= r)) )
		        } else if (tower.pokemon?.item?.id == 'wideLens') {
		          return ( Math.abs(Math.abs(dx) - Math.abs(dy)) < 36 && distance <= r );
		        } else {
		          return ( Math.abs(Math.abs(dx) - Math.abs(dy)) < 24 && distance <= r );
		        }
	      	case 'horizontalLine':
	        	return ( Math.abs(dy) <= 24 && Math.abs(dx) <= r );
	      	case 'verticalLine':
	        	return ( Math.abs(dx) <= 24 && Math.abs(dy) <= r );
	      	default:
	        	return distance <= r;
	    }
	}

  	setEvents() {
    	this.canvas.addEventListener('mousemove', (event) => {
	      	this.mouse.x = event.offsetX;
	      	this.mouse.y = event.offsetY;
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

	    this.canvas.addEventListener('click', (event) => {
	      	if (!this.activeTile) return;
	      	const clickedPokemon = this.activeTile.tower || null;
	      	if (this.deployingUnit) {
		        if (clickedPokemon === this.deployingUnit) {
		          	this.cancelDeployUnit();
		          	return;
		        }
		        const canPlace = this.deployingUnit.tiles.includes(this.activeTile.land) ||
		          	(this.deployingUnit?.item?.id == 'airBalloon' && this.activeTile.land == 4) ||
		          	(this.deployingUnit?.item?.id == 'heavyDutyBoots' && this.activeTile.land == 2) ||
		          	(this.deployingUnit?.item?.id == 'assaultVest' && this.activeTile.land == 2) ||
		          	(this.deployingUnit?.item?.id == 'dampMulch' && this.activeTile.land == 1);
		        if (!canPlace) return;
		        if (!clickedPokemon) {
		          	this.moveUnitToTile(this.activeTile);
		        } else {
		          	if (this.deployingUnit.isDeployed) {
			            const sourceTile = this.main.area.placementTiles.find(tile => tile.tower === this.deployingUnit);
			            const canPlaceTarget = clickedPokemon.tiles.includes(sourceTile.land) ||
			              	(clickedPokemon?.item?.id == 'airBalloon' && sourceTile.land == 4) ||
			              	(clickedPokemon?.item?.id == 'heavyDutyBoots' && sourceTile.land == 2) ||
			              	(clickedPokemon?.item?.id == 'assaultVest' && sourceTile.land == 2) ||
			              	(clickedPokemon?.item?.id == 'dampMulch' && sourceTile.land == 1);
			            if (!canPlaceTarget) return;
			            this.swapUnits(sourceTile, this.deployingUnit, this.activeTile, clickedPokemon);
			            this.deployingUnit = undefined;
			            playSound('equip', 'ui');
			            if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
			            if (!this.main.area.waveActive) {
			              	this.main.UI.revertUI();
			              	this.main.UI.nextWave.style.filter = 'revert-layer';
			              	this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
			            }
			        } else {
			            const tempDeploying = this.deployingUnit;
			            this.deployingUnit = clickedPokemon;
			            this.retireUnit();
			            this.deployingUnit = tempDeploying;
			            this.moveUnitToTile(this.activeTile);
			        }
		        }
		    } else {
		        if (clickedPokemon) {
		          	const index = this.main.team.pokemon.findIndex(pokemon => pokemon === clickedPokemon);
		          	this.tryDeployUnit(index);
		        }
	      	}
	    });

		this.canvas.addEventListener('contextmenu', (event) => {
		    if (this.activeTile?.tower) {
		        const index = this.main.team.pokemon.findIndex(pokemon => this.activeTile.tower === pokemon);
		        this.main.pokemonScene.open(this.activeTile.tower, index);
		      }
	    });
  	}

	toggleSpeed() {
	    playSound('option', 'ui');
	    if (this.speedFactor === 1) {
	      	this.speedFactor = 2;
	      	this.main.UI.speedWave.innerHTML = '2x';
	      	this.main.UI.speedWave.style.background = 'linear-gradient(0deg,rgba(112, 172, 76, 1) 25%, rgba(194, 177, 183, 1) 25%)';
	    } else if (this.speedFactor === 2) {
	      	this.speedFactor = 3;
	      	this.main.UI.speedWave.innerHTML = '3x';
	      	this.main.UI.speedWave.style.background = 'linear-gradient(0deg,rgba(112, 172, 76, 1) 50%, rgba(194, 177, 183, 1) 50%)';
	    } else if (this.speedFactor === 3) {
	      	this.speedFactor = 5;
	      	this.main.UI.speedWave.innerHTML = '5x';
	      	this.main.UI.speedWave.style.background = 'linear-gradient(0deg,rgba(112, 172, 76, 1) 75%, rgba(194, 177, 183, 1) 75%)';
	    } else if (this.speedFactor === 5) {
	      	this.speedFactor = 10;
	      	this.main.UI.speedWave.innerHTML = '10x';
	      	this.main.UI.speedWave.style.background = 'linear-gradient(0deg,rgba(112, 172, 76, 1) 100%, rgba(112, 172, 76, 1) 100%)';
	    } else {
	      	this.speedFactor = 1;
	      	this.main.UI.speedWave.innerHTML = '🚀';
	      	this.main.UI.speedWave.style.background = 'linear-gradient(0deg,rgba(194, 177, 183, 1) 50%, rgba(194, 177, 183, 1) 50%)';
	    }
	}

  	toggleRanges() {
    	this.ranges = !this.ranges;
  	}

  	restoreSpeed() {
    	this.speedFactor = 1;
    	this.main.UI.speedWave.innerHTML = '🚀';
    	this.main.UI.speedWave.style.background = 'linear-gradient(0deg,rgba(194, 177, 183, 1) 50%, rgba(194, 177, 183, 1) 50%)'
  	}

	shakeCanvas(duration = 500) {
	    this.canvas.classList.add('canvas-shake');

	    // Quitar la clase después de que termine la animación
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

}
