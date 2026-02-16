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
	    this.speedFactor = 0.8;
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

	    // --- ELIMINAMOS EL setInterval ANTIGUO ---
	    // if (this.loopId) clearInterval(this.loopId);
	    // this.loopId = setInterval(() => this.animate(performance.now()), this.frameDuration);
	    
	    // --- NUEVO SISTEMA CON WEB WORKER ---
	    
	    // 1. Si ya existe un worker previo, lo terminamos para no duplicar
	    if (this.gameWorker) {
	        this.gameWorker.terminate();
	    }

	    // 2. Creamos el c├│digo del worker en un Blob (un archivo virtual en memoria)
	    // Este c├│digo vive en su propio hilo y NO se duerme en el background.
	    const workerCode = `
	        let timerId;
	        const interval = ${this.frameDuration}; // Pasamos tu frameDuration (aprox 16.6ms)

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

	    // 3. Creamos el Worker
	    const blob = new Blob([workerCode], { type: 'application/javascript' });
	    this.gameWorker = new Worker(URL.createObjectURL(blob));

	    // 4. Cuando el worker diga "tick", ejecutamos animate
	    this.gameWorker.onmessage = () => {
	        // Ejecutamos tu l├│gica del juego
	        this.animate(performance.now());
	    };

	    // 5. Arrancamos el worker
	    this.gameWorker.postMessage('start');

	    // --- Resto de tu configuraci├│n ---
	    this.setEvents();
	    this.chrono = this.main.utility.chrono(1, () => !this.stopped);
	}

	animate(time) {
		if (this.stopped) return;
	    if (!this.lastTime) this.lastTime = time;
    
	    // Calculamos el tiempo real que pas├│
	    let delta = time - this.lastTime;
	    
	    // Si es demasiado r├ípido, no hacemos nada (l├¡mite de FPS)
	    if (delta < this.frameDuration) return;

	    // --- PROTECCI├ôN CR├ìTICA ---
	    // Si por alguna raz├│n el navegador se cuelga y delta es 500ms,
	    // mentimos y decimos que solo han pasado 60ms como m├íximo.
	    // Esto evita que los enemigos atraviesen paredes si hay lag.
	    if (delta > 60) delta = 60; 
	    // ---------------------------

	    this.lastTime = time - (delta % this.frameDuration);

	    if (this.ctx) {
	        if (this.canvasBackground.complete && this.canvasBackground.naturalWidth !== 0) {
	            this.ctx.drawImage(this.canvasBackground, 0, 0, this.canvas.width, this.canvas.height);
	        } else {
	            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	        }
	    }

	    // --- AQU├ì EST├ü EL CAMBIO IMPORTANTE ---
    
	    // 1. Definimos un l├¡mite m├íximo de tiempo por frame (ej. 60ms o 100ms).
	    // Esto previene que los objetos den saltos gigantes si la pesta├▒a se duerme.
	    const maxDelta = 60; // Equivalente a bajar a ~16 FPS como m├¡nimo aceptable
	    
	    // 2. Usamos el menor valor entre el delta real y el m├íximo permitido
	    const safeDelta = Math.min(delta, maxDelta);

	    // 3. Usamos safeDelta para los c├ílculos f├¡sicos
	    const scaledDelta = this.stopped ? 0 : delta * this.speedFactor;

	    if (this.canvasShake.active) {
	        this.canvasShake.elapsed += safeDelta;

	        const progress = Math.min(1, this.canvasShake.elapsed / this.canvasShake.duration);
	        const ease = 1 - Math.pow(progress, 2);
	        const intensity = this.canvasShake.intensity * ease;

	        const dx = (Math.random() - 0.75) * 2 * intensity;
	        const dy = (Math.random() - 0.75) * 2 * intensity;

	        this.canvas.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

	        if (progress >= 1) {
	            this.canvasShake.active = false;
	            this.canvas.style.transform = `translate(-50%, -50%)`;
	        }
	    }

	    this.main.area.placementTiles.forEach(tile => tile.update(this.mouse));

	    for (let i = this.main.area.enemies.length - 1; i >= 0; i--) {
	        const enemy = this.main.area.enemies[i];
	        enemy.update(scaledDelta);
	        if (this.main.area.enemies.indexOf(enemy) === -1) continue;

	        if (!this.stopped) {
	            if (enemy.waypoints.length === enemy.waypointIndex + 1) {
	                if (
	                    enemy.position.x > this.canvas.width ||
	                    enemy.position.x < -30 ||
	                    enemy.position.y - 20 > this.canvas.height ||
	                    enemy.position.y < -20
	                ) {
	                    playSound('hit2', 'effect');
	                    this.main.player.getDamaged(enemy.power);
	                    const idx = this.main.area.enemies.indexOf(enemy);
	                    if (idx !== -1) this.main.area.enemies.splice(idx, 1);
	                    continue;
	                }
	            }
	        }
	    }

	    this.main.area.towers.forEach(tower => {
	        let enemiesInRange = [];
	        if (!this.stopped) {
	            enemiesInRange = this.main.area.enemies.filter(enemy => {
	                const insideCanvas = (
	                    enemy.center.x >= 0 && enemy.center.x <= this.canvas.width &&
	                    enemy.center.y >= 0 && enemy.center.y <= this.canvas.height
	                );
	                return insideCanvas && this.isEnemyInRange(tower, enemy) && !enemy.dying;
	            });
	        }
	        tower.update(enemiesInRange, scaledDelta);
	    });

	    if (!this.stopped) {
	        if (this.main.area.waveActive && this.main.area.enemies.length === 0) {
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
	        this.main.area.placementTiles.forEach(tile => {
	            if (tile.tower) {
	                tile.drawRange(tile.tower.range, tile.tower.rangeType, tile.tower.innerRange, tile.tower.ability, tile.tower.item, true);
	            }
	        });
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
	}

  	tryDeployUnit(pos, ui) {
  		if (this.stopped) return playSound('pop0', 'ui');
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
	    if (!this.deployingUnit || !newTile) return;

	    const pokemon = this.deployingUnit;

	    // Validaci├│n terreno
	    // Validaci├│n terreno (usar helper de PlacementTile si existe)
		if (typeof newTile.canPlacePokemonHere === 'function') {
		    if (!newTile.canPlacePokemonHere(pokemon)) return;
		} else {
		    // fallback a la l├│gica antigua por compatibilidad
		    if (
		        !pokemon.tiles.includes(newTile.land) &&
		        !(pokemon?.item?.id == 'airBalloon' && newTile.land == 4) &&
		        !(pokemon?.item?.id == 'heavyDutyBoots' && newTile.land == 2) &&
		        !(pokemon?.item?.id == 'assaultVest' && newTile.land == 2) &&
		        !(pokemon?.item?.id == 'dampMulch' && newTile.land == 1) &&
		        !(pokemon?.item?.id == 'subwoofer' && newTile.land == 3 && pokemon.id == 76)
		    ) return;
		}

	    if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();

	    // --- CLAVE: si ya est├í desplegado, RETIRARLO antes de cualquier colocaci├│n ---
	    if (pokemon.isDeployed) {
	        // retireUnit usa this.deployingUnit, as├¡ que aseg├║rate de setearlo
	        this.deployingUnit = pokemon;
	        this.retireUnit();
	        // ahora pokemon.isDeployed === false y ya no est├í en main.area.towers
	        // volver a ponerlo como deployingUnit para continuar la acci├│n de colocar
	        this.deployingUnit = pokemon;
	    }

	    if (!mute) playSound('equip', 'ui');

	    // --- 1) Tile vac├¡a -> colocar como base ---
	    if (!newTile.tower) {
	        newTile.tower = pokemon;

	        this.main.area.towers.push(
	            new Tower(this.main, newTile.position.x, newTile.position.y, this.ctx, pokemon, newTile)
	        );

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

	    // --- 2) Tile ocupada -> si la base permite passenger -> colocar como passenger ---
	    if (newTile.tower?.ability?.id === 'grassyTerrain') {
	        // SI YA HAY UN PASAJERO: Lo retiramos antes de poner el nuevo
	        if (newTile.passenger) {
	            const oldPassenger = newTile.passenger;
	            // Guardamos temporalmente el que estamos moviendo
	            const movingUnit = this.deployingUnit;
	            
	            // Retiramos al pasajero actual
	            this.deployingUnit = oldPassenger;
	            this.retireUnit();
	            
	            // Restauramos el que queremos poner
	            this.deployingUnit = movingUnit;
	        }

	        // Ahora que el sitio est├í limpio, lo colocamos
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

	    // --- 3) Si no se puede -> bloquear ---
	    playSound('pop0', 'ui');
	}

	findTowerByPokemon(pokemon) {
	    return this.main.area.towers.find(t => t.pokemon === pokemon);
	}

	// helper: coloca un pokemon COMO pasajero sobre una tile que ya tiene torre base
	placeAsPassenger(tile, pokemon, mute = false) {
	    if (!tile || !tile.tower) return false;
	    if (!pokemon) return false;

	    // base debe tener habilidad
	    if (tile.tower?.ability?.id !== 'grassyTerrain') return false;

	    // no puede haber passenger ya
	    if (tile.passenger) return false;

	    // no puede ser el mismo
	    if (tile.tower === pokemon) return false;

	    // Seguridad adicional: si por alg├║n motivo todav├¡a aparece como desplegado, retirar primero
	    if (pokemon.isDeployed) {
	        this.deployingUnit = pokemon;
	        this.retireUnit();
	    }

	    if (!mute) playSound('equip', 'ui');

	    // asignar passenger
	    tile.passenger = pokemon;

	    // marcar pokemon
	    pokemon.isDeployed = true;
	    pokemon.isPassenger = true;
	    pokemon.carriedBy = tile.tower;
	    pokemon.tilePosition = tile.id;

	    // crear tower para passenger (marcada como passenger para dibujo/comportamiento)
	    const passengerTower = new Tower(this.main, tile.position.x, tile.position.y, this.ctx, pokemon, tile);
	    passengerTower.isPassenger = true;
	    passengerTower.castformTransform();

	    this.main.area.towers = this.main.area.towers.filter(t => t.pokemon !== pokemon);
		this.main.area.towers.push(passengerTower);

	    // UI count como torre normal
	    this.main.UI.tilesCountNum[tile.land - 1]++;

	    this.main.area.recalculateAuras();
	    this.main.area.checkWeather();
	    this.main.UI.update();

	    return true;
	}

	swapUnits(tile1, pokemon1, tile2, pokemon2) {
	    if (!tile1 || !tile2 || !pokemon1 || !pokemon2) return;

	    // Si ambos son pasajeros o bases, el proceso de retirar y poner funcionar├í igual
	    // Retiramos ambos de sus posiciones actuales
	    this.deployingUnit = pokemon1;
	    this.retireUnit();

	    this.deployingUnit = pokemon2;
	    this.retireUnit();

	    // Colocamos pokemon1 en el sitio de tile2
	    this.deployingUnit = pokemon1;
	    this.moveUnitToTile(tile2, true);

	    // Colocamos pokemon2 en el sitio de tile1
	    this.deployingUnit = pokemon2;
	    this.moveUnitToTile(tile1, true);

	    this.deployingUnit = undefined;

	    this.main.area.recalculateAuras();
	    this.main.area.checkWeather();
	    this.main.UI.update();
	}

	retireUnit() {
	    if (!this.deployingUnit) return;

	    // marcar como no desplegado (previene loops)
	    this.deployingUnit.isDeployed = false;
	    playSound('unequip', 'ui');

	    const index = this.main.area.towers.findIndex(tower => tower.pokemon == this.deployingUnit);
	    if (index === -1) {
	        // no estaba en la lista de towers
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

	            this.main.UI.tilesCountNum[tile.land - 1]--;
	            this.main.area.towers.splice(index, 1);

	            this.deployingUnit.tilePosition = -1;
	            this.deployingUnit.isPassenger = false;
	            this.deployingUnit.carriedBy = null;

	            this.deployingUnit = undefined;

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
			        this.main.UI.tilesCountNum[tile.land - 1]--;
			        
			        // 3. Resetear flags del Pok├⌐mon pasajero
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
		          return ((Math.abs(Math.abs(dx) - Math.abs(dy)) < 24 && distance <= r) || ((Math.abs(dx) <= 24 && Math.abs(dy) <= r) || (Math.abs(dy) <= 24 && Math.abs(dx) <= r)))
		        } else if (tower.pokemon?.item?.id == 'wideLens') {
		          return ((Math.abs(dx) <= 48 && Math.abs(dy) <= r) || (Math.abs(dy) <= 48 && Math.abs(dx) <= r));
		        } else {
		          return ((Math.abs(dx) <= 24 && Math.abs(dy) <= r) || (Math.abs(dy) <= 24 && Math.abs(dx) <= r));
		        }
	      	case 'xShape':
		        if (tower.pokemon?.item?.id == 'condensedBlizzard') {
		          return distance <= r;
		        } else if (tower.pokemon?.item?.id == 'starPiece') {
		          return ( (Math.abs(Math.abs(dx) - Math.abs(dy)) < 24 && distance <= r) || ((Math.abs(dx) <= 24 && Math.abs(dy) <= r) || (Math.abs(dy) <= 24 && Math.abs(dx) <= r)))
		        } else if (tower.pokemon?.item?.id == 'wideLens') {
		          return (Math.abs(Math.abs(dx) - Math.abs(dy)) < 72 && distance <= r);
		        } else {
		          return (Math.abs(Math.abs(dx) - Math.abs(dy)) < 24 && distance <= r);
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
	    const canPlaceOn = (pokemon, tile) => {
		    if (!pokemon || !tile) return false;
		    // si la tile implementa el helper, usarlo (incluye grassyTerrain)
		    if (typeof tile.canPlacePokemonHere === 'function') return tile.canPlacePokemonHere(pokemon);

		    // fallback a comprobaciones cl├ísicas
		    if (pokemon.tiles && pokemon.tiles.includes(tile.land)) return true;
		    if (pokemon?.item?.id == 'airBalloon' && tile.land == 4) return true;
		    if (pokemon?.item?.id == 'heavyDutyBoots' && tile.land == 2) return true;
		    if (pokemon?.item?.id == 'assaultVest' && tile.land == 2) return true;
		    if (pokemon?.item?.id == 'dampMulch' && tile.land == 1) return true;
		    if (pokemon?.item?.id == 'subwoofer' && tile.land == 3 && pokemon.id == 76) return true;
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

	    this.mapDragging = false;

	    // CLICK NORMAL
	    this.canvas.addEventListener('click', (event) => {
		    if (this.mapDragging) {
		        this.mapDragging = false;
		        return;
		    }

		    if (!this.activeTile) return;

		    // Dos vistas de "capa superior":
		    // - baseFirst: prioriza la torre base (├║til cuando estamos en modo deploy)
		    // - topmost: prioriza el passenger (├║til para selecci├│n simple con click)
		    const clickedTopBaseFirst = this.activeTile.tower || this.activeTile.passenger || null;
		    const clickedTopTopmost = this.activeTile.passenger || this.activeTile.tower || null;

		    // Si hay una unidad en modo deploy, procesamos la colocaci├│n
		    if (this.deployingUnit) {
		        // Guardar referencia estable a la unidad que el jugador est├í intentando colocar
		        const newPokemon = this.deployingUnit;

		        // cancelar si click en mismo pokemon (tanto base como passenger), usando base-first
		        if (clickedTopBaseFirst === newPokemon) {
		            this.cancelDeployUnit();
		            return;
		        }

		        // validaci├│n de terreno con helper canPlaceOn (ya definido en setEvents)
		        const canPlaceDragged = canPlaceOn(newPokemon, this.activeTile);
		        if (!canPlaceDragged) return;

		        // 1) Tile vac├¡a -> mover normalmente
		        if (!this.activeTile.tower) {
		            this.moveUnitToTile(this.activeTile);
		            this.cancelDeployUnit();
		            return;
		        }

		        // 2) Si la base acepta passengers (grassyTerrain)
		        if (this.activeTile.tower?.ability?.id === 'grassyTerrain') {
		            // 2.a) Si NO hay passenger -> place as passenger
		            if (!this.activeTile.passenger) {
		                this.deployingUnit = newPokemon;
		                this.moveUnitToTile(this.activeTile);
		                this.cancelDeployUnit();
		                return;
		            }

		            // 2.b) Existe passenger -> decidir reemplazo o retirar base+passenger
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
		                    (newPokemon?.item?.id == 'subwoofer' && this.activeTile.land == 3 && newPokemon.id == 76)
		                  );

		            if (canBePlacedHere) {
		                // Intento de recolocaci├│n condicional del passenger antiguo a la tile origen del nuevo
		                const newUnit = newPokemon;
		                const originTile = this.main.area.placementTiles.find(
		                    t => t.tower === newUnit || t.passenger === newUnit
		                );

		                if (newUnit.isDeployed && originTile && canPlaceOn(oldPassenger, originTile)) {
		                    // 1) mover passenger antiguo a la tile origen
		                    this.deployingUnit = oldPassenger;
		                    this.moveUnitToTile(originTile);

		                    // 2) colocar el nuevo como passenger en la tile destino
		                    this.deployingUnit = newUnit;
		                    this.moveUnitToTile(this.activeTile);

		                    this.cancelDeployUnit();
		                    return;
		                }

		                // fallback: guardar passenger (comportamiento actual)
		                this.deployingUnit = oldPassenger;
		                this.retireUnit();

		                this.deployingUnit = newUnit;
		                this.moveUnitToTile(this.activeTile);
		                this.cancelDeployUnit();
		                return;
		            } else {
		                // La nueva unidad NO puede ser passenger -> retirar base + passenger y colocar como base
		                const savedNew = newPokemon;

		                // retireUnit sobre la base eliminar├í tambi├⌐n al passenger
		                this.deployingUnit = base;
		                this.retireUnit();

		                // restaurar la unidad que queremos colocar y ponerla como base
		                this.deployingUnit = savedNew;
		                this.moveUnitToTile(this.activeTile);
		                this.cancelDeployUnit();
		                return;
		            }
		        }

		        // 3) Si la base NO permite passengers -> comportamiento cl├ísico (swap o reemplazo)
		        if (newPokemon.isDeployed) {
		            // swap entre tiles (si procede)
		            const sourceTile = this.main.area.placementTiles.find(t => t.tower === newPokemon || t.passenger === newPokemon);
		            if (sourceTile) {
		                this.swapUnits(sourceTile, newPokemon, this.activeTile, this.activeTile.tower);
		            } else {
		                // fallback: retirar la torre objetivo y colocar nueva
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
		            // reemplazar la base directamente (comportamiento cl├ísico)
		            const savedNew = newPokemon;
		            this.deployingUnit = this.activeTile.tower;
		            this.retireUnit();
		            this.deployingUnit = savedNew;
		            this.moveUnitToTile(this.activeTile);
		            this.cancelDeployUnit();
		            return;
		        }
		    } else {
		        // No hay unidad en modo deploy -> seleccionar pokemon en capa superior (prioridad passenger primero)
		        if (clickedTopTopmost) {
		            const index = this.main.team.pokemon.findIndex(pokemon => pokemon === clickedTopTopmost);
		            if (index !== -1) this.tryDeployUnit(index);
		        }
		    }
		});

	    // CLICK DERECHO: abrir escena pokemon (selecciona passenger si existe)
	    this.canvas.addEventListener('contextmenu', (event) => {
	        if (this.activeTile?.tower || this.activeTile?.passenger) {
	            const poke = this.activeTile.passenger || this.activeTile.tower;
	            const index = this.main.team.pokemon.findIndex(pokemon => poke === pokemon);
	            this.main.pokemonScene.open(poke, index);
	        }
	    });

	    // --- DRAG ---
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

	        if (!tile) return;

	        // escogemos la capa superior: pasajero si existe, si no la torre base
	        const topPokemon = tile.passenger || tile.tower;
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

	            // detectar drop sobre UI (retirar)
	            const domTarget = document.elementFromPoint(ev.clientX, ev.clientY);
	            const droppedOnUI = domTarget && domTarget.closest('.ui-player-panel, .ui-pokemon-container, .ui-pokemon');

	            if (droppedOnUI) {
	                this.deployingUnit = pokemon;
	                this.retireUnit();
	                shouldEndDeploy = true;
	            } else if (!targetTile) {
	                // volver a origen
	                this.deployingUnit = pokemon;
	                this.moveUnitToTile(mapDrag.originTile, true);
	                shouldEndDeploy = true;
	            } else {
	                const targetBase = targetTile.tower || null;
	                const targetPassenger = targetTile.passenger || null;

	                // soltar sobre s├¡ mismo (misma capa)
	                if (targetPassenger === pokemon || targetBase === pokemon) {
	                    shouldEndDeploy = true;
	                } else {
	                    const canPlaceDraggedToTarget = canPlaceOn(pokemon, targetTile);

	                    if (!canPlaceDraggedToTarget) {
	                        playSound('pop0', 'ui');
	                        this.deployingUnit = pokemon;
	                        this.moveUnitToTile(mapDrag.originTile);
	                        shouldEndDeploy = true;
	                    } else {
	                        // target vac├¡o -> mover
	                        if (!targetBase) {
	                            this.deployingUnit = pokemon;
	                            this.moveUnitToTile(targetTile);
	                            shouldEndDeploy = true;
	                        }
	                        // target base permite passenger -> delegar a moveUnitToTile (hace retire y place)
	                        else if (targetBase?.ability?.id === 'grassyTerrain') {
	                            this.deployingUnit = pokemon;
	                            this.moveUnitToTile(targetTile);
	                            shouldEndDeploy = true;
	                        }
	                        // target ocupado normal -> swap (solo si ninguno de los tiles tiene passenger)
	                        else {
	                            if (targetTile.passenger || mapDrag.originTile.passenger) {
	                                playSound('pop0', 'ui');
	                                this.deployingUnit = pokemon;
	                                this.moveUnitToTile(mapDrag.originTile);
	                                shouldEndDeploy = true;
	                            } else {
	                                const canPlaceTargetToSource = canPlaceOn(targetBase, mapDrag.originTile);
	                                if (!canPlaceTargetToSource) {
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
	                        }
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
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(34, 197, 94, 1) 25%, rgba(107, 114, 128, 1) 25%)';
	      	//this.main.UI.speedWave.innerText = 'x1.5';
	    } else if (this.speedFactor === 1.2) {
	      	this.speedFactor = 1.7;
	      	//this.main.UI.speedWave.innerText = 'x1.75';
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(59, 130, 246, 1) 50%, rgba(107, 114, 128, 1) 50%)';
	    } else if (this.speedFactor === 1.7) {
	      	this.speedFactor = 2;
	      	//this.main.UI.speedWave.innerText = 'x2';
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(245, 158, 11, 1) 75%, rgba(107, 114, 128, 1) 75%)';
	    } else if (this.speedFactor === 2) {
	      	this.speedFactor = 2.5;
	      	//this.main.UI.speedWave.innerText = 'x2.5';
	      	this.main.UI.speedWave.style.background = 'url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(239, 68, 68, 1) 100%, rgba(107, 114, 128, 1) 100%)';
	    } else {
	      	this.speedFactor = 0.8;
	      	//this.main.UI.speedWave.innerText = 'x1';
	      	this.main.UI.speedWave.style.background = `url("./src/assets/images/textures/texture1.png"), #6B7280`;
	    }
	}

	switchPause() {
	    playSound('option', 'ui');

	    // Si hay un drag/clon activo en DOM, eliminarlo por seguridad
	    const activeClone = document.querySelector('.map-drag-clone');
	    if (activeClone) activeClone.remove();

	    if (!this.stopped) {
	        // PAUSAR: detener ticks del worker / interval y bloquear canvas
	        this.stopped = true;

	        if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();

	        // Detener worker si existe
	        if (this.gameWorker) {
	            try { this.gameWorker.postMessage('stop'); } catch(e) { /* ignore */ }
	        }

	        // Limpiar fallback interval si lo hubiera
	        if (this.loopId) {
	            clearInterval(this.loopId);
	            this.loopId = null;
	        }

	        // Bloquear interacci├│n con el canvas
	        this.canvas.style.pointerEvents = 'none';
	        // Limpiar estados de interacci├│n locales
	        this.deployingUnit = undefined;
	        this.mapDragging = false;
	        this.activeTile = null;
	        this.mouse.x = undefined;
	        this.mouse.y = undefined;

	        this.showPauseOverlay();

	        this.main.UI.pauseWave.style.background = `url("./src/assets/images/textures/texture1.png"), linear-gradient(0deg,rgba(239, 68, 68, 1) 100%, rgba(107, 114, 128, 1) 100%)`;
	    } else {
	        // REANUDAR: reactivar worker / interval y habilitar canvas
	        this.stopped = false;
	        this.lastTime = performance.now();

	        // Reactivar worker o fallback interval
	        if (this.gameWorker) {
	            try { this.gameWorker.postMessage('start'); } catch(e) { /* ignore */ }
	        } else {
	            // fallback por compatibilidad si alguna parte usa loopId
	            if (this.loopId) clearInterval(this.loopId);
	            this.loopId = setInterval(() => this.animate(performance.now()), this.frameDuration);
	        }

	        this.hidePauseOverlay();

	        // Habilitar interacci├│n
	        this.canvas.style.pointerEvents = 'auto';
	        this.main.UI.pauseWave.style.background = `url("./src/assets/images/textures/texture1.png"), #6B7280`;
	    }
	}

	stop() {
	    this.stopped = true;

	    if (this.gameWorker) {
	        try { this.gameWorker.postMessage('stop'); } catch(e) { /* ignore */ }
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
	        try { this.gameWorker.postMessage('start'); } catch(e) { /* ignore */ }
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

	    // Quitar la clase despu├⌐s de que termine la animaci├│n
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
	    overlay.style.fontSize = '32px';
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
}


