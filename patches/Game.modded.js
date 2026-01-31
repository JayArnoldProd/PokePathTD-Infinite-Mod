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
	    this.mapDragging = false; // 1.4.1: Track drag state to prevent click after drag

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
	    this.main.area.damageText.forEach((damageText, index) => {
	      	damageText.update();
	      	if (damageText.opacity <= 0.1) {
	        	this.main.area.damageText.splice(index, 1);
	      	}
	    });

	    // EFECTO MAPA
	    if (this.effectEnabled && this.ctx) {
	        this.effectTime += 0.03; 
	        let opacity = (Math.sin(this.effectTime * 1) + 1) / 2 * 0.6;
	        this.ctx.globalAlpha = opacity;
	        this.ctx.drawImage(this.canvasEffect, 0, 0, this.canvas.width, this.canvas.height);
	        this.ctx.globalAlpha = 1;
	    }
  	}

  	stop() {
    	this.stopped = true;
    	if (this.loopId) clearInterval(this.loopId);
    	this.loopId = null;
    	this.chrono.stop()
  	}

  	cancelDeployUnit() {
	    playSound('pop0', 'ui');
	    this.deployingUnit = undefined;
	    if (!this.main.area.waveActive) {
	      	this.main.UI.revertUI();
	      	this.main.UI.nextWave.style.filter = 'revert-layer';
	      	this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
	    }
  	}

  	tryDeployUnit(index) {
    	if (this.main.team.pokemon.length-1 < index) return;
	    this.deployingUnit = this.main.team.pokemon[index];
	    this.main.UI.fastScene.open(index);
	    this.main.UI.nextWave.style.filter = 'saturate(0)';
	    this.main.UI.nextWave.style.pointerEvents = 'none';
  	}

  	// 1.4.1: Added mute parameter for drag operations
  	moveUnitToTile(newTile, mute = false) {
	    if (!this.deployingUnit || !newTile) return;
	    if (
	      	!this.deployingUnit.tiles.includes(newTile.land) &&
	      	!(this.deployingUnit?.item?.id == 'airBalloon' && newTile.land == 4) &&
	      	!(this.deployingUnit?.item?.id == 'heavyDutyBoots' && newTile.land == 2) &&
	      	!(this.deployingUnit?.item?.id == 'assaultVest' && newTile.land == 2) &&
	      	!(this.deployingUnit?.item?.id == 'dampMulch' && newTile.land == 1)
	    ) return;
	    if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	    
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
	    
	    // 1.4.1: Respect mute parameter for drag operations
	    if (!mute) playSound('equip', 'ui');
	    
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
	    // 1.4.1: Helper function for placement validation
	    const canPlaceOn = (pokemon, tile) => {
	        if (!pokemon || !tile) return false;
	        if (pokemon.tiles && pokemon.tiles.includes(tile.land)) return true;
	        if (pokemon?.item?.id == 'airBalloon' && tile.land == 4) return true;
	        if (pokemon?.item?.id == 'heavyDutyBoots' && tile.land == 2) return true;
	        if (pokemon?.item?.id == 'assaultVest' && tile.land == 2) return true;
	        if (pokemon?.item?.id == 'dampMulch' && tile.land == 1) return true;
	        return false;
	    };

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
	        // 1.4.1: Prevent click handler after drag
	        if (this.mapDragging) { 
	            this.mapDragging = false;
	            return;
	        }

	      	if (!this.activeTile) return;
	      	const clickedPokemon = this.activeTile.tower || null;
	      	if (this.deployingUnit) {
		        if (clickedPokemon === this.deployingUnit) {
		          	this.cancelDeployUnit();
		          	return;
		        }
		        
		        // 1.4.1: Use helper function
		        const canPlaceDragged = canPlaceOn(this.deployingUnit, this.activeTile);
		        if (!canPlaceDragged) return;
		        
		        if (!clickedPokemon) {
		          	this.moveUnitToTile(this.activeTile);
		          	this.cancelDeployUnit();
		        } else {
		          	const sourceTile = this.main.area.placementTiles.find(tile => tile.tower === this.deployingUnit);
		          	if (!sourceTile) return;
		          	
		          	const canPlaceTargetToSource = canPlaceOn(clickedPokemon, sourceTile);
		          	if (!canPlaceTargetToSource) {
		          	    playSound('pop0', 'ui');
		          	    return;
		          	}
		          	
		          	this.swapUnits(sourceTile, this.deployingUnit, this.activeTile, clickedPokemon);
		          	this.cancelDeployUnit();
		          	if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
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

	    // === 1.4.1: NEW DRAG AND DROP SYSTEM ===
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

	        if (!tile || !tile.tower) return;

	        mapDrag.rect = rect;
	        mapDrag.scaleX = scaleX;
	        mapDrag.scaleY = scaleY;
	        mapDrag.originTile = tile;
	        mapDrag.pokemon = tile.tower;
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

	                mapDrag.active = true;
	                this.mapDragging = true;

	                this.deployingUnit = mapDrag.pokemon;

	                const pokemon = mapDrag.pokemon;
	                mapDrag.clone = document.createElement('div');
	                mapDrag.clone.className = 'map-drag-clone';
	                mapDrag.clone.style.position = 'absolute';
	                mapDrag.clone.style.pointerEvents = 'none';
	                mapDrag.clone.style.zIndex = 10000;
	                mapDrag.clone.style.width = '40px';
	                mapDrag.clone.style.height = '40px';
	                mapDrag.clone.style.backgroundImage = `url("${pokemon.sprite?.base || pokemon.sprite || ''}")`;
	                mapDrag.clone.style.backgroundSize = 'contain';
	                mapDrag.clone.style.backgroundRepeat = 'no-repeat';
	                mapDrag.clone.style.transform = 'translate(-50%, -50%)';
	                document.body.appendChild(mapDrag.clone);

	                window.addEventListener('pointermove', onDraggingMove);
	                window.addEventListener('pointerup', onDraggingUp);
	            }
	        };

	        const onCancelStart = () => {
	            window.removeEventListener('pointermove', onMoveCheck);
	            window.removeEventListener('pointerup', onCancelStart);
	            mapDrag = { active: false, originTile: null, pokemon: null, clone: null, rect: null, scaleX: 1, scaleY: 1, startX: 0, startY: 0 };
	        };

	        window.addEventListener('pointermove', onMoveCheck);
	        window.addEventListener('pointerup', onCancelStart);

	        const onDraggingMove = (ev) => {
	            if (!mapDrag.active) return;
	            if (mapDrag.clone) {
	                mapDrag.clone.style.left = `${ev.pageX}px`;
	                mapDrag.clone.style.top = `${ev.pageY}px`;
	            }

	            const canvasX = (ev.clientX - mapDrag.rect.left) * mapDrag.scaleX;
	            const canvasY = (ev.clientY - mapDrag.rect.top) * mapDrag.scaleY;
	            this.mouse.x = canvasX;
	            this.mouse.y = canvasY;
	        };

	        const onDraggingUp = (ev) => {
	            if (mapDrag.clone) mapDrag.clone.remove();
	            window.removeEventListener('pointermove', onDraggingMove);
	            window.removeEventListener('pointerup', onDraggingUp);

	            const canvasX = (ev.clientX - mapDrag.rect.left) * mapDrag.scaleX;
	            const canvasY = (ev.clientY - mapDrag.rect.top) * mapDrag.scaleY;

	            const targetTile = this.main.area.placementTiles.find(t =>
	                canvasX > t.position.x &&
	                canvasX < t.position.x + t.size &&
	                canvasY > t.position.y &&
	                canvasY < t.position.y + t.size
	            );

	            const pokemon = mapDrag.pokemon;

	            // Detect drop on UI panel (retire from map)
	            const domTarget = document.elementFromPoint(ev.clientX, ev.clientY);
	            const droppedOnUI = domTarget && domTarget.closest('.ui-player-panel, .ui-pokemon-container, .ui-pokemon');

	            if (droppedOnUI) {
	                this.deployingUnit = pokemon;
	                this.retireUnit();
	                shouldEndDeploy = true;
	            } else if (!targetTile) {
	                // Return to origin
	                this.deployingUnit = pokemon;
	                this.moveUnitToTile(mapDrag.originTile, true);
	                shouldEndDeploy = true;
	            } else {
	                const clickedPokemon = targetTile.tower || null;

	                if (clickedPokemon === pokemon) {
	                    shouldEndDeploy = true;
	                } else {
	                    const canPlaceDraggedToTarget = canPlaceOn(pokemon, targetTile);

	                    if (!canPlaceDraggedToTarget) {
	                        playSound('pop0', 'ui');
	                        this.deployingUnit = pokemon;
	                        this.moveUnitToTile(mapDrag.originTile);
	                        shouldEndDeploy = true;
	                    } else {
	                        if (!clickedPokemon) {
	                            this.deployingUnit = pokemon;
	                            this.moveUnitToTile(targetTile);
	                            shouldEndDeploy = true;
	                        } else {
	                            const canPlaceTargetToSource = canPlaceOn(clickedPokemon, mapDrag.originTile);

	                            if (!canPlaceTargetToSource) {
	                                playSound('pop0', 'ui');
	                                this.deployingUnit = pokemon;
	                                this.moveUnitToTile(mapDrag.originTile);
	                                shouldEndDeploy = true;
	                            } else {
	                                playSound('equip', 'ui');
	                                const sourceTile = mapDrag.originTile;
	                                this.swapUnits(sourceTile, pokemon, targetTile, clickedPokemon);
	                                shouldEndDeploy = true;
	                            }
	                        }
	                    }
	                }
	            }

	            mapDrag = { active: false, originTile: null, pokemon: null, clone: null, rect: null, scaleX: 1, scaleY: 1, startX: 0, startY: 0 };

	            if (shouldEndDeploy && this.deployingUnit) {
	                this.cancelDeployUnit();
	            } else if (this.deployingUnit) this.cancelDeployUnit();

	            this.activeTile = null;
	            this.mouse.x = undefined;
	            this.mouse.y = undefined;
	            this.mapDragging = false;

	            try {
	                const bounding = this.canvas.getBoundingClientRect();
	                this.mouse.x = Math.max(0, Math.min(this.canvas.width, (ev.clientX - bounding.left) * (this.canvas.width / bounding.width)));
	                this.mouse.y = Math.max(0, Math.min(this.canvas.height, (ev.clientY - bounding.top) * (this.canvas.height / bounding.height)));
	            } catch (err) {
	                // noop
	            }

	            if (this.main && this.main.UI) this.main.UI.update();
	            this.lastTime = 0;
	            this.animate(performance.now());
	        };
	    });
	    // === END 1.4.1 DRAG AND DROP ===
  	}

	// MOD: Extended speed options (5x, 10x) for endless mode
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
