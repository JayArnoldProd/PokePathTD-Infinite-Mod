import { Element } from '../utils/Element.js';
import { text } from '../file/text.js';
import { playSound, playMusic } from '../file/audio.js';
import { GameScene } from '../utils/GameScene.js';
import { pokemonData } from './data/pokemonData.js';
import { Pokemon } from './component/Pokemon.js';
import { weatherData } from './data/weatherData.js';
import { saveData } from '../file/data.js';
import { songData } from './data/songData.js';

const SECTIONS = ['profile', 'box', 'shop', 'map', 'challenge', 'damageDealt', 'menu'];

export class UI {
	constructor(main) {
		this.main = main;
		this.render();

		this.damageDealtDisplay = false;
		this.damageDealtType = 'trueDamage';  // RESTORED: Vanilla damage type toggle
		this.enemyPositionDisplay = 0;
		this.tileTerrainHover = null;
		
		// ENDLESS MOD: Wave Info Panel (bottom-left) - default off
		this.waveInfoDisplay = false;

		this.fastScene = new FastScene(this.main, this);
	}

	render() {
		this.topBar = new Element(this.main.scene, { className: 'ui-top-bar' }).element;

		this.saveTeamButtonContainer = new Element(this.topBar, { className: 'ui-save-team-button-container' }).element;

		this.saveTeamButton = [];
		for (let i = 0; i < 5; i++) {
			this.saveTeamButton[i] = new Element(this.saveTeamButtonContainer, { className: 'ui-save-team-button', text: `#${i+1}` }).element;
			this.saveTeamButton[i].addEventListener('mouseenter', () => { 
				playSound('open', 'ui');
				if (this.main.tooltip) this.main.tooltip.showText('Save');
			})
			this.saveTeamButton[i].addEventListener('mouseleave', () => { 
				if (this.main.tooltip) this.main.tooltip.hide();
			})
			this.saveTeamButton[i].addEventListener('click', () => { 
				this.saveTeamButtonHandle(i);
			});
		}

		this.importTeamButtonContainer = new Element(this.topBar, { className: 'ui-import-team-button-container' }).element;

		this.importTeamButton = [];
		for (let i = 0; i < 5; i++) {
			this.importTeamButton[i] = new Element(this.importTeamButtonContainer, { className: 'ui-import-team-button', text: `#${i+1}` }).element;
			this.importTeamButton[i].addEventListener('mouseenter', () => { 
				playSound('open', 'ui');
				if (this.main.tooltip) this.main.tooltip.showText('Load');
			})
			this.importTeamButton[i].addEventListener('mouseleave', () => { 
				if (this.main.tooltip) this.main.tooltip.hide();
			})
			this.importTeamButton[i].addEventListener('click', () => { 
				this.importTeamButtonHandle(i);
			});
		}

		this.weather = new Element(this.topBar, { className: 'ui-weather' }).element;

		this.mapRoutCointainer = new Element(this.topBar, { className: 'ui-map-route-container' }).element;
		this.mapRoute = new Element(this.mapRoutCointainer, { className: 'ui-map-route' }).element;
		this.mapRecord = new Element(this.mapRoutCointainer, { className: 'ui-map-record' }).element;

		this.bottomBar = new Element(this.main.scene, { className: 'ui-bottom-bar' }).element;
		this.challenge = new Element(this.bottomBar, { className: 'ui-challenge' }).element;
		this.chrono = new Element(this.bottomBar, { id: 'ui-chrono' }).element;

		this.waveSelectorContainer = new Element(this.bottomBar, { className: 'ui-wave-selector-container' }).element;

		this.waveSelectorTenLess = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: '<<' }).element;
		this.waveSelectorOneLess = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: '<' }).element;
		this.waveSelectorLabel = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector-label stroke' }).element;
		this.waveSelectorOneMore = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: '>' }).element;
		this.waveSelectorTenMore = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: '>>' }).element;
		this.waveSelectorBlock = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: 'R' }).element;

		this.waveSelectorTenLess.addEventListener('click', () => { this.main.area.changeWave(-10) });
		this.waveSelectorOneLess.addEventListener('click', () => { this.main.area.changeWave(-1) });
		this.waveSelectorOneMore.addEventListener('click', () => { this.main.area.changeWave(1) });
		this.waveSelectorTenMore.addEventListener('click', () => { this.main.area.changeWave(10) });
		this.waveSelectorBlock.addEventListener('click', () => { this.waveSelectorBlockHandle() });

		this.waveSelectorTenLess.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveSelectorOneLess.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveSelectorOneMore.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveSelectorTenMore.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveSelectorBlock.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });

		// ENDLESS MOD: Wave Info Panel (bottom-left corner)
		this.waveInfoPanel = new Element(this.main.scene, { className: 'ui-wave-info-panel' }).element;
		this.waveInfoPanel.style.cssText = `
			position: absolute;
			bottom: 8px;
			left: 8px;
			background: rgba(0, 0, 0, 0.75);
			border: 2px solid #444;
			border-radius: 6px;
			padding: 8px 12px;
			font-family: 'Pokemon', monospace;
			font-size: 11px;
			color: #fff;
			min-width: 140px;
			display: none;
			z-index: 100;
		`;
		this.waveInfoWave = new Element(this.waveInfoPanel, { className: 'ui-wave-info-row' }).element;
		this.waveInfoWave.style.cssText = 'margin-bottom: 4px; color: #4ecca3; font-weight: bold;';
		this.waveInfoEnemies = new Element(this.waveInfoPanel, { className: 'ui-wave-info-row' }).element;
		this.waveInfoEnemies.style.cssText = 'margin-bottom: 4px;';
		this.waveInfoTime = new Element(this.waveInfoPanel, { className: 'ui-wave-info-row' }).element;
		this.waveInfoTime.style.cssText = 'color: #888;';

		this.tilesCountContainer = new Element(this.bottomBar, { className: 'ui-tiles-count-container' }).element;
		this.tilesCount = [];
		this.tilesCountNum = [0, 0, 0, 0];
		
		for (let i = 0; i < 4; i++) {
			this.tilesCount[i] = new Element(this.tilesCountContainer, { className: 'ui-tiles-count' }).element;
			this.tilesCount[i].addEventListener('mouseenter', () => {
				this.tileTerrainHover = i+1;
			})
			this.tilesCount[i].addEventListener('mouseleave', () => {
				this.tileTerrainHover = null;
			})
		}

		this.playerPanel = new Element(this.main.scene, { className: 'ui-player-panel' }).element;
		this.playerPortrait = new Element(this.playerPanel, { className: 'ui-player-portrait' }).element;
		this.playerName = new Element(this.playerPanel, { className: 'ui-player-name' }).element;
		this.playerHealth = new Element(this.playerPanel, { className: 'ui-player-health' }).element;
		this.hearts = [];
		this.playerGold = new Element(this.playerPanel, { className: 'ui-player-gold' }).element;
		this.playerStars = new Element(this.playerPanel, { className: 'ui-player-stars' }).element;
		this.playerRibbons = new Element(this.playerPanel, { className: 'ui-player-ribbons' }).element;
		this.playerRibbonsIcon = new Element(this.playerRibbons, { className: 'ui-player-ribbons-icon' }).element;
		this.playerRibbonsText = new Element(this.playerRibbons, { className: 'ui-player-ribbons-text' }).element;

		this.playerLimitLine = new Element(this.playerPanel, { className: 'ui-player-limit-line' }).element;

		this.pokemonContainer = new Element(this.playerPanel, { className: 'ui-pokemon-container' }).element;
		this.pokemon = [];

		for (let i = 0; i < 10; i++) {
			this.pokemon[i] = new Element(this.pokemonContainer, { className: 'ui-pokemon' }).element;
			this.pokemon[i].name = new Element(this.pokemon[i], { className: 'ui-pokemon-name' }).element;
			this.pokemon[i].sprite = new Element(this.pokemon[i], { className: 'ui-pokemon-sprite' }).element;
			this.pokemon[i].shiny = new Element(this.pokemon[i], { className: 'ui-pokemon-shiny' }).element;
			this.pokemon[i].level = new Element(this.pokemon[i], { className: 'ui-pokemon-level' }).element;
			this.pokemon[i].stars = new Element(this.pokemon[i], { className: 'ui-pokemon-stars' }).element;
			this.pokemon[i].dittoBg = new Element(this.pokemon[i], { className: 'ui-pokemon-ditto-bg' }).element;

			this.pokemon[i].buttonContainer = new Element(this.pokemon[i], { className: 'ui-pokemon-button-container' }).element;
			this.pokemon[i].deploy = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button' }).element;
			this.pokemon[i].info = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button', text: 'i' }).element;
			this.pokemon[i].levelUp = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button', text: '+1' }).element;
			this.pokemon[i].item = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button', text: '+' }).element;
			this.pokemon[i].noPokemon = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button', text: '+' }).element;

			this.pokemon[i].deploy.addEventListener('mouseenter', () => { playSound('hover3', 'ui') });
			this.pokemon[i].deploy.addEventListener('click', () => this.main.game.tryDeployUnit(i, true));

			this.pokemon[i].info.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
			this.pokemon[i].info.addEventListener('click', () => this.main.pokemonScene.open(this.main.team.pokemon[i], i));

			this.pokemon[i].levelUp.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
			this.pokemon[i].levelUp.addEventListener('click', () => {
				const pokemon = this.main.team.pokemon[i];
				// Only shiny Pokemon can level past 100
				if (pokemon.lvl >= 100 && !pokemon.isShiny) return;
				if (this.main.player.gold >= pokemon.cost) {
					this.main.player.changeGold(-pokemon.cost);
					pokemon.levelUp();
					this.updatePokemon();
					playSound('obtain', 'ui');
					if (this.fastScene.isOpen) this.fastScene.close();
				}
			});

			this.pokemon[i].item.addEventListener('mouseenter', () => { playSound('hover3', 'ui') });
			this.pokemon[i].item.addEventListener('click', () => { this.fastScene.open('item', i) });

			this.pokemon[i].noPokemon.addEventListener('mouseenter', () => { playSound('hover3', 'ui') });
			this.pokemon[i].noPokemon.addEventListener('click', () => { this.fastScene.open('pokemon', i) });

			this.pokemon[i].sprite.addEventListener('dblclick', () => {
				if (this.main.team.pokemon[i] != undefined && !this.main.area.inChallenge.draft) {
					if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit();
					if (this.main.team.pokemon[i].isDeployed) {
						this.main.team.pokemon[i].isDeployed = false;
					
						// RETIRAR TORRE
						const index = this.main.area.towers.findIndex((tower) => tower.pokemon == this.main.team.pokemon[i]);
						this.tilesCountNum[this.main.area.towers[index].tile.land-1]--;
						this.main.area.towers[index].tile.tower = false;
						this.main.area.towers.splice(index, 1)
					}
					playSound('unequip', 'ui');
					this.main.box.addPokemon(this.main.team.pokemon[i]);
					this.main.team.removePokemon(this.main.team.pokemon[i]);
					this.main.area.checkWeather();
					this.update();
					if (this.fastScene.isOpen) this.fastScene.close();
				}
			})

			this.pokemon[i].shiny.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
			this.pokemon[i].shiny.addEventListener('click', () => {
				if (this.main.team.pokemon[i] != undefined) {
					if (this.main.team.pokemon[i].isShiny) {
						this.main.team.pokemon[i].toggleShiny();
						this.update();
						playSound('option', 'ui');
					}
				}
			})
		}

		this.pokemon[6].stars.innerHTML = `<span class="lock">🔒</span><br><span class="msrre">⭐</span>40`;
		this.pokemon[7].stars.innerHTML = `<span class="lock">🔒</span><br><span class="msrre">⭐</span>160`;
		this.pokemon[8].stars.innerHTML = `<span class="lock">🔒</span><br><span class="msrre">⭐</span>320`;
		this.pokemon[9].stars.innerHTML = `<span class="lock">🔒</span><br><span class="msrre">⭐</span>540`;

		this.mapPanel = new Element(this.main.scene, { className: 'ui-map-panel' }).element;

		this.sectionContainer = new Element(this.mapPanel, { className: 'ui-section-container' }).element;
		this.section = [];

		SECTIONS.forEach(section =>  {
			this.section[section] = new Element(this.sectionContainer, { className: 'ui-section' }).element;
			this.section[section].img = new Element(this.section[section], { className: 'ui-section-img', image: `./src/assets/images/icons/${section}.png` }).element;
			this.section[section].addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		}) 

		this.section['profile'].addEventListener('click', () => { this.main.profileScene.open() });
		this.section['box'].addEventListener('click', () => { this.main.boxScene.open() });
		this.section['shop'].addEventListener('click', () => { this.main.shopScene.open() });
		this.section['map'].addEventListener('click', () => { this.main.mapScene.open() });
		this.section['challenge'].addEventListener('click', () => { this.main.challengeScene.open()  });
		this.section['damageDealt'].addEventListener('click', () => { this.damageDealtSwitch() });
		this.section['menu'].addEventListener('click', () => { this.main.menuScene.open() });
		
		this.mapPanelBackground = new Element(this.mapPanel, { className: 'ui-map-panel-background' }).element;
		this.mapWavePokemonContainer = new Element(this.mapPanelBackground, { className: 'ui-map-wave-pokemon-container' }).element;
		this.mapWavePokemon = [];

		this.infoContainer = new Element(this.mapPanelBackground, { className: 'ui-info-container' }).element;
		this.infoName = new Element(this.infoContainer, { className: 'ui-info-name' }).element;
		this.infoStatContainer = new Element(this.infoContainer, { className: 'ui-info-stat-container' }).element;
		this.infoHealth = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoArmor = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoSpeed = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoPower = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoRegen = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoStun = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoSlow = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoBurn = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoPoison = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoInvisible = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoGold = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;

		this.infoPassive = new Element(this.mapPanel, { className: 'ui-info-passive' }).element;
		this.infoPassive.name = new Element(this.infoPassive, { className: 'ui-info-passive-name' }).element;
		this.infoPassive.description = new Element(this.infoPassive, { className: 'ui-info-passive-description' }).element;

		this.waveButtonBackground = new Element(this.mapPanel, { className: 'ui-wave-button-background' }).element;

		this.musicContainer = new Element(this.mapPanel, { className: 'ui-wave-music-container' }).element;
		this.musicPrev = new Element(this.musicContainer, { className: 'ui-wave-music-arrow', text: '<' }).element;
		this.musicName = new Element(this.musicContainer, { className: 'ui-wave-music-name' }).element;
		this.musicNext = new Element(this.musicContainer, { className: 'ui-wave-music-arrow', text: '>' }).element;

		this.musicPrev.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.musicPrev.addEventListener('click', () => this.changeMusic(-1));

		this.musicNext.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.musicNext.addEventListener('click', () => this.changeMusic(1));

		this.nextWave = new Element(this.mapPanel, { className: 'ui-next-wave' }).element;
		this.nextWave.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.nextWave.addEventListener('click', () => this.main.area.newWave());

		this.pauseWave = new Element(this.mapPanel, { className: 'ui-pause-wave', text: '||' }).element;
		this.pauseWave.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.pauseWave.addEventListener('click', () => { this.main.game.switchPause(); });

		this.autoWave = new Element(this.mapPanel, { className: 'ui-auto-wave' }).element;
		this.autoWave.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.autoWave.addEventListener('click', () => this.main.area.switchAutoWave());

		this.speedWave = new Element(this.mapPanel, { className: 'ui-speed-wave', text: '🚀' }).element;
		this.speedWave.addEventListener('mouseenter', () => { playSound('open', 'ui') });
		this.speedWave.addEventListener('click', () => { this.main.game.toggleSpeed() });

		this.damageDealtContainer = new Element(this.mapPanel, { className: 'ui-damage-dealt-container' }).element;
		// RESTORED: Vanilla damage type toggle button
		this.damageDealtButton = new Element(this.mapPanel, { className: 'ui-damage-dealt-button' }).element;
		this.damageDealtButton.addEventListener('mouseenter', () => { playSound('open', 'ui') });
		this.damageDealtButton.addEventListener('click', () => { this.changeDamageType() });

		this.damageDealtUnit = [];

		for (let i = 0; i < 10; i++) {
			this.damageDealtUnit[i] = new Element(this.damageDealtContainer, { className: 'ui-damage-dealt-unit' }).element;
			this.damageDealtUnit[i].sprite = new Element(this.damageDealtUnit[i], { className: 'ui-damage-dealt-unit-sprite' }).element;
			this.damageDealtUnit[i].number = new Element(this.damageDealtUnit[i], { className: 'ui-damage-dealt-unit-number' }).element;
			this.damageDealtUnit[i].barContainer = new Element(this.damageDealtUnit[i], { className: 'ui-damage-dealt-unit-bar-container' }).element;
			this.damageDealtUnit[i].barPrevious = new Element(this.damageDealtUnit[i].barContainer, { className: 'ui-damage-dealt-unit-bar-previous' }).element;
			this.damageDealtUnit[i].bar = new Element(this.damageDealtUnit[i].barContainer, { className: 'ui-damage-dealt-unit-bar' }).element;
		}	

		this.secretCacnea = new Element(this.main.scene, { className: 'secret-cacnea' }).element;
		this.secretCacnea.addEventListener('click', () => { 
			this.secretCacnea.style.pointerEvents = 'none';
			this.main.player.secrets.cacnea = true;
			this.getSecret('cacnea');
		});
		this.secretGreavard = new Element(this.main.scene, { className: 'secret-greavard' }).element;
		this.secretGreavard.addEventListener('click', () => { 
			this.secretGreavard.style.pointerEvents = 'none';
			this.main.player.secrets.greavard = true;
			this.getSecret('greavard'); 
		});
		// this.secretAipom = new Element(this.main.scene, { className: 'secret-aipom' }).element;
		// this.secretAipom.addEventListener('click', () => { 
		// 	this.secretAipom.style.pointerEvents = 'none';
		// 	this.main.player.secrets.greavard = true;
		// 	this.getSecret('aipom'); 
		// });
	}

	update() {
		this.updatePlayer();
		this.updatePokemon();
		this.updateMap();

		// ENDLESS MODE: Get wave preview safely for any wave number
		let wavePreview;
		if (this.main.area.waveNumber <= 100 && this.main.area.waves[this.main.area.waveNumber]) {
			wavePreview = this.main.area.waves[this.main.area.waveNumber].preview;
		} else {
			// Endless mode - use template
			const templateWaveNum = ((this.main.area.waveNumber - 1) % 99) + 1;
			wavePreview = this.main.area.waves[templateWaveNum]?.preview || this.main.area.waves[1].preview;
		}
		this.displayEnemyInfo(wavePreview[this.enemyPositionDisplay], this.enemyPositionDisplay);

		this.waveSelectorContainer.style.display = 'none';
		this.waveSelectorLabel.innerText = text.ui.waveManager[this.main.lang].toUpperCase();
		// ENDLESS MODE: Show wave selector if record >= 100 (not just exactly 100)
		if (!this.main.area.inChallenge && this.main.player.records[this.main.area.map.id] >= 100 && this.main.player.hasBike) this.waveSelectorContainer.style.display = 'revert-layer';
		
		this.musicContainer.style.display = 'none';
		if (this.main.player.hasSubwoofer) {
			this.musicContainer.style.display = 'revert-layer';
			this.musicName.innerHTML = `♪ ${this.main.area.music.name[this.main.lang].toUpperCase()}`
		}

		this.mapRoute.innerHTML = `${this.main.area.map.name[this.main.lang].toUpperCase()} <br>${text.map.wave[this.main.lang].toUpperCase()} ${this.main.area.waveNumber}`;
		this.tilesCount.forEach((tc, i) => { tc.innerHTML = `${this.tilesCountNum[i]}/${this.main.area.map.tilesNum[i]}`});

		if (
			this.main.player.stars >= 540 &&
			this.main.player.records[this.main.area.map.id] === 100 &&
			(this.main.team.pokemon.length + this.main.box.pokemon.length) > 30
		) {
			this.section['challenge'].style.opacity = 1;
			this.section['challenge'].style.pointerEvents = 'revert-layer';	
		} else {
			this.section['challenge'].style.opacity = 0.4;
			this.section['challenge'].style.pointerEvents = 'none';
		}

		if (this.main.area.inChallenge) {
			this.challenge.style.display = 'revert-layer';
			this.section['map'].style.opacity = 0.4;
			this.section['map'].style.pointerEvents = 'none';

			this.section['box'].style.opacity = (this.main.area.inChallenge.draft) ? 0.4 : 1;
			this.section['box'].style.pointerEvents = (this.main.area.inChallenge.draft) ? 'none' : 'revert-layer';

			this.chrono.style.display = 'revert-layer';
			this.challenge.innerText = text.challenge.label[this.main.lang].toUpperCase();
		} else {
			this.challenge.style.display = 'none';
			this.chrono.style.display = 'none';
			this.section['map'].style.opacity = 1;
			this.section['map'].style.pointerEvents = 'revert-layer';
			this.section['box'].style.opacity = 1;
			this.section['box'].style.pointerEvents = 'revert-layer';
		}

		if (!this.main.area.inChallenge) {
			this.main.teamManager.teams.forEach((team, i) => {
				if (team[this.main.area.routeNumber].length == 0) {
					this.importTeamButton[i].style.pointerEvents = 'none';
					this.importTeamButton[i].style.filter = 'brightness(0.7)';
				} else {
					this.importTeamButton[i].style.pointerEvents = 'revert-layer';
					this.importTeamButton[i].style.filter = 'revert-layer';
				}
			})
		} else {
			this.main.teamManager.teamChallenge.forEach((team, i) => {
				if (team.length == 0) {
					this.importTeamButton[i].style.pointerEvents = 'none';
					this.importTeamButton[i].style.filter = 'brightness(0.7)';
				} else {
					this.importTeamButton[i].style.pointerEvents = 'revert-layer';
					this.importTeamButton[i].style.filter = 'revert-layer';
				}
			})
		}

		if (
			this.main.area.routeNumber == 4 && 
			//!this.main.area.waveActive &&
			!this.main.area.inChallenge &&
			!this.main.player.secrets.cacnea
		) {
			this.secretCacnea.style.pointerEvents = 'revert-layer';
		} else {
			this.secretCacnea.style.pointerEvents = 'none';
		} 

		if (
			this.main.area.routeNumber == 2 && 
			//!this.main.area.waveActive &&
			!this.main.area.inChallenge &&
			!this.main.player.secrets.greavard
		) {
			this.secretGreavard.style.pointerEvents = 'revert-layer';
		} else {
			this.secretGreavard.style.pointerEvents = 'none';
		}

		// ENDLESS MOD: Update wave info panel
		this.updateWaveInfo();

		this.displayWeather();
	}

	// ENDLESS MOD: Update wave info panel display
	updateWaveInfo() {
		if (!this.waveInfoDisplay) {
			this.waveInfoPanel.style.display = 'none';
			return;
		}
		
		this.waveInfoPanel.style.display = 'block';
		
		// Wave number
		const waveNum = this.main.area.waveNumber;
		const isEndless = waveNum > 100;
		this.waveInfoWave.innerHTML = `WAVE ${waveNum}${isEndless ? ' <span style="color:#e94560;">(∞)</span>' : ''}`;
		
		// Enemies remaining
		const enemiesRemaining = this.main.area.enemies?.length || 0;
		const waveActive = this.main.area.waveActive;
		if (waveActive) {
			this.waveInfoEnemies.innerHTML = `Enemies: <span style="color:#ff6b6b;">${enemiesRemaining}</span>`;
		} else {
			this.waveInfoEnemies.innerHTML = `<span style="color:#666;">Wave Complete</span>`;
		}
		
		// Time elapsed (if wave is active)
		if (waveActive && this.main.area.waveStartTime) {
			const elapsed = Math.floor((Date.now() - this.main.area.waveStartTime) / 1000);
			const mins = Math.floor(elapsed / 60);
			const secs = elapsed % 60;
			this.waveInfoTime.innerHTML = `Time: ${mins}:${secs.toString().padStart(2, '0')}`;
		} else {
			this.waveInfoTime.innerHTML = '';
		}
	}

	// ENDLESS MOD: Toggle wave info panel
	toggleWaveInfo() {
		this.waveInfoDisplay = !this.waveInfoDisplay;
		this.updateWaveInfo();
	}

	displayWeather() {
		if (!this.main.area.weather) {
			this.weather.style.display = 'none';
		} else {
			this.weather.style.display = 'block';
			this.weather.style.backgroundImage = `url("${weatherData[this.main.area.weather].sprite}")`;
			this.main.tooltip.bindTo(this.weather, { name: weatherData[this.main.area.weather].name, description: weatherData[this.main.area.weather].description }, 'item');
		}
	}

	updatePlayer() {
		this.playerPortrait.style.backgroundImage = `url("./src/assets/images/portraits/${this.main.player.portrait}.png")`;
		this.playerName.innerText = this.main.player.name.toUpperCase();
		this.playerGold.innerText = `$${this.main.utility.numberDot(this.main.player.gold)}`;
		// ENDLESS MODE: No cap on star display
		this.playerStars.innerHTML = `<span class="msrre">⭐</span>${this.main.player.stars}`;
		this.playerRibbonsText.innerHTML = `${this.main.player.ribbons}`;

		this.playerHealth.innerHTML = '';
		this.hearts = []
		for (let i = 0; i < 14; i++) {
			if (this.main.player.health[this.main.area.map.id] > i) this.hearts[i] = new Element(this.playerHealth, { className: 'ui-player-heart-on' }).element;
			else this.hearts[i] = new Element(this.playerHealth, { className: 'ui-player-heart-off' }).element;
		}
	}

	updatePokemon() {
		for (let i = 0; i < 10; i++) {
			this.pokemon[i].name.innerText = text.ui.empty[this.main.lang].toUpperCase();

			this.pokemon[i].style.background = 'revert-layer';
			this.pokemon[i].name.style.color = '#888';
			this.pokemon[i].level.innerText = '';
			this.pokemon[i].shiny.style.display = 'none';
			this.pokemon[i].sprite.style.backgroundImage = '';
			this.pokemon[i].sprite.style.cursor = "";
			this.pokemon[i].style.transform = `revert-layer`
			this.pokemon[i].sprite.style.transform = `revert-layer`
			
			this.pokemon[i].item.style.background = "revert-layer";
			this.pokemon[i].item.style.pointerEvents = 'none';
			this.pokemon[i].item.style.display = 'none';
			this.pokemon[i].item.style.filter = 'revert-layer'
			this.pokemon[i].item.innerText = '+';

			this.pokemon[i].deploy.style.background = 'revert-layer';
			this.pokemon[i].deploy.style.pointerEvents = 'none';
			this.pokemon[i].deploy.style.display = 'none';
			this.pokemon[i].deploy.style.paddingTop = 'revert-layer';
			this.pokemon[i].deploy.style.filter = 'revert-layer';
			this.pokemon[i].deploy.style.boxShadow = 'revert-layer';

			this.pokemon[i].info.style.pointerEvents = 'none';
			this.pokemon[i].info.style.display = 'none';

			this.pokemon[i].levelUp.style.pointerEvents = 'none';
			this.pokemon[i].levelUp.style.display = 'none';
			this.pokemon[i].levelUp.style.filter = 'brightness(0.6)';

			this.pokemon[i].noPokemon.style.display = 'revert-layer';

			this.pokemon[i].stars.style.display = 'none';
			this.pokemon[i].dittoBg.style.display = 'none';

			this.damageDealtUnit[i].sprite.style.display = 'none';
			this.damageDealtUnit[i].number.style.display = 'none';
			this.damageDealtUnit[i].barContainer.style.display = 'none';
			this.damageDealtUnit[i].bar.style.display = 'none';
		}

		this.main.team.pokemon.forEach((pokemon, i) => {
			this.pokemon[i].noPokemon.style.display = 'none';
			this.pokemon[i].name.innerText = (pokemon.alias != undefined) ? pokemon.alias.toUpperCase() : pokemon.name[this.main.lang].toUpperCase();
			
			if (pokemon.id == 70) this.pokemon[i].dittoBg.style.display = 'revert-layer';
	
			if (typeof this.main.area.inChallenge.lvlCap == 'number') {
				this.pokemon[i].level.innerText = `Lv ${this.main.area.inChallenge.lvlCap}`;
			} else this.pokemon[i].level.innerText = `Lv ${pokemon.lvl}`;
			
			this.pokemon[i].sprite.style.backgroundImage = `url("${pokemon.sprite.base}")`;
			if (pokemon.item != undefined) {
				this.pokemon[i].item.innerText = '';
				this.pokemon[i].item.style.background = `url("${pokemon.item.sprite}") center/contain no-repeat, linear-gradient(180deg,rgba(251, 205, 43, 1) 0%, rgba(217, 175, 30, 1) 100%)`;
				if (pokemon.item.id == 'inverter') {
					if (pokemon.ability.id != 'defiant') this.pokemon[i].style.transform = `scale(1, -1)`;
					else this.pokemon[i].sprite.style.transform = `translate(-50%, 0) scale(1, -1)`;
				}
			}
			if (pokemon.isShiny) this.pokemon[i].shiny.style = 'revert-layer';
			
			this.pokemon[i].sprite.style.cursor = "grab";
			this.damageDealtUnit[i].sprite.style.display = 'revert-layer';
			this.damageDealtUnit[i].number.style.display = 'revert-layer';
			this.damageDealtUnit[i].barContainer.style.display = 'revert-layer';
			this.damageDealtUnit[i].bar.style.display = 'revert-layer';

			this.damageDealtUnit[i].sprite.style.backgroundImage = `url("${pokemon.sprite.base}")`;
			this.damageDealtUnit[i].bar.style.backgroundColor = pokemon.specie.color;
			this.damageDealtUnit[i].barPrevious.style.backgroundColor = `${pokemon.specie.color}4D`;

			this.pokemon[i].name.style.color = pokemon.specie.color;
			this.pokemon[i].style.background = `linear-gradient(30deg, ${pokemon.specie.color}2D 0%, ${pokemon.specie.color}5D 100%)`;

			this.pokemon[i].deploy.style.pointerEvents = 'all';
			this.pokemon[i].deploy.style.filter = 'revert-layer';
			this.pokemon[i].deploy.style.display = 'revert-layer';

			this.pokemon[i].info.style.pointerEvents = 'all';
			this.pokemon[i].info.style.filter = 'revert-layer';
			this.pokemon[i].info.style.display = 'revert-layer';

			this.pokemon[i].item.style.display = 'revert-layer';
			this.pokemon[i].item.style.pointerEvents = 'all';

			if (typeof this.main.area.inChallenge.lvlCap !== 'number') {
				// Only shiny Pokemon can level past 100
				if (pokemon.lvl >= 100 && !pokemon.isShiny) {
					this.pokemon[i].levelUp.style.display = 'none';
					this.pokemon[i].levelUp.style.pointerEvents = 'none';
				} else {
					this.pokemon[i].levelUp.style.display = 'revert-layer';
					if (this.main.player.gold >= pokemon.cost) {
						this.pokemon[i].levelUp.style.pointerEvents = 'all';
						this.pokemon[i].levelUp.style.filter = 'revert-layer';
					}
				}
			}	

			if (pokemon.isDeployed) {
				// RESTORED: silphScope added back to vanilla disabled items list
				if (['silphScope', 'airBalloon', 'heavyDutyBoots', 'dampMulch', 'assaultVest', 'twistedSpoon', 'ejectButton'].includes(pokemon?.item?.id)) {
					this.pokemon[i].item.style.pointerEvents = 'none';
					this.pokemon[i].item.style.filter = 'brightness(0.6)'
				}
				this.pokemon[i].deploy.style.background = 
					`url("./src/assets/images/icons/pokeball-open.png") center / 50% no-repeat, linear-gradient(180deg,rgba(178, 61, 39, 1) 0%, rgba(157, 56, 41, 1) 100%)`
			}
		})

		for (let i = 9; i > this.main.player.teamSlots - 1; i--) {
			this.pokemon[i].noPokemon.style.display = 'none';
			this.pokemon[i].style.background = 'rgba(0, 0, 0, 0.55)';
			this.pokemon[i].name.innerText = text.ui.locked[this.main.lang].toUpperCase();
			this.pokemon[i].stars.style.display = 'revert-layer';		
		}

		if (typeof this.main.area.inChallenge.slotLimit == 'number') {
			for (let i = 9; i >= this.main.area.inChallenge.slotLimit; i--) {
				this.pokemon[i].style.background = 'rgba(140, 0, 0, 0.55)';
			}
		}

		this.pokemon.forEach((slot, i) => {
	        slot.dataset.index = i;  
	    });

	    this.setupPokemonDragAndDrop();
	}

 	setupPokemonDragAndDrop() {
	    if (this.main.area.inChallenge?.draft) return;

	    // Forzar pointer-events
	    this.playerPanel.style.pointerEvents = 'all';
	    this.pokemonContainer.style.pointerEvents = 'auto';
	    this.pokemon.forEach(slot => slot.style.pointerEvents = 'auto');

	    const THRESHOLD = 5; // px para distinguir click de drag

	    // Estado del drag
	    let draggedIndex = null;
	    let clone = null;
	    let activePointerId = null;
	    let slotElement = null;

	    const clearDragState = () => {
	        if (clone) {
	            clone.remove();
	            clone = null;
	        }
	        if (slotElement && activePointerId != null) {
	            try { slotElement.releasePointerCapture(activePointerId); } catch (e) {}
	        }
	        draggedIndex = null;
	        activePointerId = null;
	        slotElement = null;
	    };

	    const onPointerMoveDuringDrag = (e) => {
	        if (!clone) return;
	        clone.style.left = `${e.pageX - clone.offsetWidth / 2}px`;
	        clone.style.top = `${e.pageY - clone.offsetHeight / 2}px`;

	        // detectar target sin que el clone interfiera
	        clone.style.display = 'none';
	        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
	        clone.style.display = 'block';

	        const targetSlot = targetElement?.closest('.ui-pokemon');
	        this.pokemon.forEach(s => s.classList.remove('drag-over'));
	        if (targetSlot && parseInt(targetSlot.dataset.index) !== draggedIndex) {
	            targetSlot.classList.add('drag-over');
	        }
	    };

	    const onPointerUpDuringDrag = (e) => {
	        window.removeEventListener('pointermove', onPointerMoveDuringDrag);
	        window.removeEventListener('pointerup', onPointerUpDuringDrag);

	        if (clone) clone.remove();

	        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
	        const targetSlot = targetElement?.closest('.ui-pokemon');

	        if (targetSlot && draggedIndex != null) {
	            const toIndex = parseInt(targetSlot.dataset.index);
	            if (toIndex !== draggedIndex && toIndex < this.main.player.teamSlots) {
	                const team = this.main.team.pokemon;

	                const firstBefore = team[0];

	                const temp = team[draggedIndex];
	                if (!team[toIndex]) {
	                    team[toIndex] = temp;
	                    team[draggedIndex] = undefined;
	                    this.main.team.pokemon = team.filter(p => p !== undefined);
	                } else {
	                    team[draggedIndex] = team[toIndex];
	                    team[toIndex] = temp;
	                }

	                this.updatePokemon();
	                playSound('click1', 'ui');

	                if (this.main.team.pokemon[0] !== firstBefore) {
		                const ditto = this.main.team.pokemon.find(p => p.id === 70);
		                if (ditto != undefined && !ditto.isDeployed) {
							playSound('teleport', 'effect')

							if ([58, 59, 63, 64, 65, 66, 94].includes(ditto.adn.id)) this.main.player.fossilInTeam--;
							ditto.adn = this.main.team.pokemon[0].specie;
							if ([58, 59, 63, 64, 65, 66, 94].includes(ditto.adn.id)) this.main.player.fossilInTeam++;
							ditto.transformADN();
							this.main.UI.updatePokemon();
							this.update();
						}
		            }
	            }
	        }

	        this.pokemon.forEach(s => s.classList.remove('drag-over'));
	        clearDragState();

	        this.pokemon.forEach(slot => {
			    const sprite = slot.querySelector('.ui-pokemon-sprite');
			    if (sprite) sprite.style.opacity = '1';
			});

	        document.body.style.cursor = '';
	    };

	    const startDragActual = (e, index, originatingSlot) => {
	        if (!this.main.team.pokemon[index] || index >= this.main.player.teamSlots) {
	            clearDragState();
	            return;
	        }

	        if (this.fastScene.isOpen) this.fastScene.close();

	        draggedIndex = index;
	        slotElement = originatingSlot;
	        document.body.style.cursor = 'grabbing';

	        const spriteEl = this.pokemon[index].querySelector('.ui-pokemon-sprite');
	        clone = spriteEl ? spriteEl.cloneNode(true) : this.pokemon[index].cloneNode(true);

	        clone.style.position = 'absolute';
	        clone.style.zIndex = '10000';
	        clone.style.opacity = '0.9';
	        clone.style.pointerEvents = 'none';
	        clone.classList.add('dragging');
	        document.body.appendChild(clone);

	        spriteEl.style.opacity = '0%';

	        clone.style.width = `${spriteEl ? spriteEl.offsetWidth : this.pokemon[index].offsetWidth}px`;
	        clone.style.height = `${spriteEl ? spriteEl.offsetHeight : this.pokemon[index].offsetHeight}px`;

	        const setClonePos = (pageX, pageY) => {
	            clone.style.left = `${pageX - clone.offsetWidth / 2}px`;
	            clone.style.top = `${pageY - clone.offsetHeight / 2}px`;
	        };
	        setClonePos(e.pageX, e.pageY);

	        playSound('hover3', 'ui');

	        try {
	            originatingSlot.setPointerCapture(e.pointerId);
	            activePointerId = e.pointerId;
	        } catch (err) {
	            activePointerId = null;
	        }

	        window.addEventListener('pointermove', onPointerMoveDuringDrag);
	        window.addEventListener('pointerup', onPointerUpDuringDrag);
	    };

	    const onPointerDownCandidate = function(e) {
	        if (!e.isPrimary) return;

	        if (e.target.closest('.ui-pokemon-button') || e.target.closest('.ui-pokemon-button-container') || e.target.closest('.fast-scene-container')) {
	            return;
	        }

	        const originatingSlot = this;
	        const index = parseInt(originatingSlot.dataset.index);

	        let startX = e.clientX;
	        let startY = e.clientY;

	        const onMoveCheck = (ev) => {
	            const dx = ev.clientX - startX;
	            const dy = ev.clientY - startY;
	            if (Math.hypot(dx, dy) > THRESHOLD) {
	                window.removeEventListener('pointermove', onMoveCheck);
	                window.removeEventListener('pointerup', onCancel);
	                startDragActual(ev, index, originatingSlot);
	            }
	        };

	        const onCancel = () => {
	            window.removeEventListener('pointermove', onMoveCheck);
	            window.removeEventListener('pointerup', onCancel);
	        };

	        e.preventDefault();

	        window.addEventListener('pointermove', onMoveCheck);
	        window.addEventListener('pointerup', onCancel);
	    };

	    this.pokemon.forEach((slot, index) => {
	        if (slot._dragSetup) return;
	        slot._dragSetup = true;

	        slot.dataset.index = index;

	        const sprite = slot.sprite;
	        if (!sprite) return;

	        sprite.addEventListener('pointerdown', (e) => onPointerDownCandidate.call(slot, e));
	        sprite.addEventListener('dragstart', (e) => e.preventDefault());

	        slot.addEventListener('dragstart', (e) => e.preventDefault());
	    });
	}

	displayEnemyInfo(enemy, pos) {
		if (pos >= this.mapWavePokemon.length) {
			const wavePreview = this.main.area.waves[this.main.area.waveNumber].preview;
			enemy = wavePreview[0];
			pos = 0;
		}
		
		this.mapWavePokemon.forEach((pokemon, i) => {
			pokemon.style.filter = `brightness(0.8)`;
			if (pos === i) pokemon.style.filter = `brightness(1) drop-shadow(0 0 1px white)`;
		})

		const wave = this.main.area.waveNumber;
		const bonusSteps = Math.floor((wave-1) / 5);

		let hp = enemy.hp;
		let armor = enemy.armor;
		let gold = enemy.gold + this.main.player.extraGold;

		// ENDLESS MODE: Use power budget system for waves > 100
		if (wave > 100 && wave % 100 !== 0) {
			// Match spawnEndlessWave calculation exactly
			const wavesPast100 = wave - 100;
			const baseBudget = 160000;
			let hpMult;
			if (wave < 200) {
				hpMult = 1 + wavesPast100 * 0.115;
			} else {
				hpMult = wave / 16;
			}
			const powerBudget = Math.floor(baseBudget * hpMult);
			const totalEnemyCount = Math.floor(20 + wavesPast100 * 1.2);
			
			// Get wave preview (same as spawning)
			const templateWaveNum = ((wave - 1) % 99) + 1;
			const waveData = this.main.area.waves[templateWaveNum] || this.main.area.waves[1];
			const endlessPreview = waveData?.preview || [enemy];
			
			// Calculate inverse HP distribution (same as spawning)
			const hpValues = endlessPreview.map(p => p.hp || 100);
			const inverseHp = hpValues.map(h => 1 / h);
			const totalInverse = inverseHp.reduce((a, b) => a + b, 0);
			const enemyCounts = inverseHp.map(inv => Math.max(1, Math.floor(totalEnemyCount * (inv / totalInverse))));
			
			// Calculate total base HP of all enemies that will spawn
			let totalBaseHp = 0;
			endlessPreview.forEach((p, idx) => {
				totalBaseHp += (p.hp || 100) * enemyCounts[idx];
			});
			
			// HP scale factor (same as spawning)
			const hpScaleFactor = powerBudget / totalBaseHp;
			
			// Apply to this specific enemy
			hp = Math.floor(Math.max(enemy.hp, enemy.hp * hpScaleFactor));
			
			// Armor scales with wave
			armor = Math.floor((enemy.armor || 0) * (1 + 0.05 * wavesPast100));
			
			// Gold scales linearly: 100x at wave 1000
			gold = Math.floor(gold * (1 + wavesPast100 * 0.11));
		} else if (wave % 100 === 0 && wave > 100) {
			// Boss waves: show boss HP with multiplier
			const bossCount = Math.floor(wave / 100);
			let hpMult = 1 + 0.02 * bonusSteps;
			hpMult *= Math.pow(2, (wave - 100) / 50);
			hp = Math.floor(enemy.hp * hpMult * 2); // Boss bonus
			armor = Math.floor((enemy.armor || 0) * (1 + 0.05 * (wave - 100)));
			gold = Math.floor(gold * (1 + (wave - 100) * 0.11));
		} else if (bonusSteps > 0) {
			// Waves 1-100: Original scaling
			let hpMult = 1 + 0.02 * bonusSteps;
			let armorMult = 1 + 0.01 * bonusSteps;
			let goldMult = 1 + 0.15 * bonusSteps;
			
			hp = Math.floor(enemy.hp * hpMult);
			armor = Math.floor(enemy.armor * armorMult);
			gold = Math.floor(gold * goldMult);
		}

		if (typeof this.main.area.inChallenge.toughEnemies == 'number') {
			hp += Math.floor(hp * (this.main.area.inChallenge.toughEnemies / 100));
			armor += Math.floor(armor * (this.main.area.inChallenge.toughEnemies / 100));
		}

		this.infoName.innerHTML = enemy.name[this.main.lang].toUpperCase(); 
		this.infoHealth.innerHTML = `${text.ui.health[this.main.lang].toUpperCase()} <span class="pos-right">${hp}</span>`;
		this.infoArmor.innerHTML =`${text.ui.armor[this.main.lang].toUpperCase()} <span class="pos-right">${armor || 0}</span>`;
		this.infoSpeed.innerHTML =`${text.ui.speed[this.main.lang].toUpperCase()} <span class="pos-right">${enemy.speed}</span>`;
		this.infoPower.innerHTML = `${text.ui.power[this.main.lang].toUpperCase()} <span class="pos-right">${enemy.power}</span>`;
		this.infoRegen.innerHTML = `${text.ui.regen[this.main.lang].toUpperCase()} <span class="pos-right">${enemy.regeneration}/s</span>`;
		this.infoStun.innerHTML = `${text.ui.stun[this.main.lang].toUpperCase()}`;
		this.infoSlow.innerHTML = `${text.ui.slow[this.main.lang].toUpperCase()}`;
		this.infoBurn.innerHTML = `${text.ui.burn[this.main.lang].toUpperCase()}`;
		this.infoPoison.innerHTML = `${text.ui.poison[this.main.lang].toUpperCase()}`;
		this.infoInvisible.innerHTML = `${text.ui.invisible[this.main.lang].toUpperCase()} <span class="pos-right">${(enemy.invisible) ? text.ui.yes[this.main.lang].toUpperCase() : text.ui.no[this.main.lang].toUpperCase()}</span>`;
		this.infoGold.innerHTML = `${text.ui.gold[this.main.lang].toUpperCase()} <span class="pos-right">$${gold}</span>`;

		if ([6,7,8].includes(this.main.lang)) {
			this.infoStatContainer.style.lineHeight = '10px'
		} else {
			this.infoStatContainer.style.lineHeight = 'revert-layer'
		}

		if (enemy.passive != undefined) {
			this.infoPassive.style.display = 'block';
			this.infoPassive.name.innerHTML = enemy.passive.name[this.main.lang].toUpperCase();
			this.infoPassive.description .innerHTML= enemy.passive.description[this.main.lang].toUpperCase();
		} else {
			this.infoPassive.style.display = 'none';
		}
		
		this.infoStun.innerHTML += (enemy.canStun) ? `<span class="pos-right">${text.ui.vulnerable[this.main.lang].toUpperCase()}</span>` : `<span class="pos-right">${text.ui.resistant[this.main.lang].toUpperCase()}</span>`
		this.infoSlow.innerHTML += (enemy.canSlow) ? `<span class="pos-right">${text.ui.vulnerable[this.main.lang].toUpperCase()}</span>` : `<span class="pos-right">${text.ui.resistant[this.main.lang].toUpperCase()}</span>`
		this.infoBurn.innerHTML += (enemy.canBurn) ? `<span class="pos-right">${text.ui.vulnerable[this.main.lang].toUpperCase()}</span>` : `<span class="pos-right">${text.ui.resistant[this.main.lang].toUpperCase()}</span>`
		this.infoPoison.innerHTML += (enemy.canPoison) ? `<span class="pos-right">${text.ui.vulnerable[this.main.lang].toUpperCase()}</span>` : `<span class="pos-right">${text.ui.resistant[this.main.lang].toUpperCase()}</span>`	

		this.enemyPositionDisplay = pos;
	}

	updateMap() {
		// ENDLESS MODE: No cap on star display
		this.mapRecord.innerHTML = `<span class="msrre">⭐</span>${this.main.player.records[this.main.area.map.id]}`;

		// ENDLESS MODE: Get wave data (use templates for waves > 100)
		let waveData, wavePreview;
		if (this.main.area.waveNumber <= 100 && this.main.area.waves[this.main.area.waveNumber]) {
			waveData = this.main.area.waves[this.main.area.waveNumber];
			wavePreview = waveData.preview;
		} else {
			// Endless mode - use template wave
			const templateWaveNum = ((this.main.area.waveNumber - 1) % 99) + 1;
			waveData = this.main.area.waves[templateWaveNum] || this.main.area.waves[1];
			wavePreview = waveData.preview;
			
			// Boss wave override (every 100 waves)
			if (this.main.area.waveNumber % 100 === 0 && this.main.area.waveNumber > 100) {
				const BOSS_KEYS = ['shaymin', 'celebi', 'lunala', 'moltres', 'regirock', 'groudon', 
					'registeel', 'regice', 'regigigas', 'zapdos', 'hooh', 'articuno'];
				const bossKey = BOSS_KEYS[this.main.area.routeNumber] || 'shaymin';
				const boss = this.main.area.main.area.waves[100]?.preview?.[0]; // Use wave 100 boss
				if (boss) wavePreview = [boss];
			}
		}
		let pokemonCount = this.countPokemon(waveData);
		
		// ENDLESS MODE: Override enemy count for waves > 100
		const wave = this.main.area.waveNumber;
		if (wave > 100) {
			const wavesPast100 = wave - 100;
			// Boss waves (200, 300, etc.) show boss count
			if (wave % 100 === 0) {
				const bossCount = Math.floor(wave / 100);
				pokemonCount = wavePreview.map(() => bossCount);
			} else {
				// Regular endless waves: 20 + wavesPast100 * 1.2
				const totalEnemies = Math.floor(20 + wavesPast100 * 1.2);
				// Distribute count inversely by HP (more weak enemies, fewer strong ones)
				const hpValues = wavePreview.map(p => p.hp || 100);
				const inverseHp = hpValues.map(hp => 1 / hp);
				const totalInverse = inverseHp.reduce((a, b) => a + b, 0);
				pokemonCount = inverseHp.map(inv => Math.max(1, Math.floor(totalEnemies * (inv / totalInverse))));
			}
		}

		this.mapWavePokemonContainer.innerHTML = "";
		this.mapWavePokemon = [];
		wavePreview.forEach((pokemon, i) => {
			this.mapWavePokemon[i] = new Element(this.mapWavePokemonContainer, { className: 'ui-map-wave-pokemon', image: pokemon.sprite.base }).element;
			this.mapWavePokemon[i].addEventListener('click', () => { 
				playSound('click1', 'ui');
				this.displayEnemyInfo(pokemon, i);
			})
			this.mapWavePokemon[i].addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
			// ENDLESS MODE: Don't subtract 1 for endless waves (already exact count), hide 0 counts
			const displayCount = wave > 100 ? pokemonCount[i] : pokemonCount[i] - 1;
			this.mapWavePokemon[i].count = new Element(this.mapWavePokemon[i], { className: 'stroke', text: displayCount > 0 ? `x${displayCount}` : '' }).element;
			this.mapWavePokemon[i].count.style.position = 'absolute';
			this.mapWavePokemon[i].count.style.color = 'var(--white)';
			this.mapWavePokemon[i].count.style.width = '100%';
			this.mapWavePokemon[i].count.style.textAlign = 'center';
			this.mapWavePokemon[i].count.style.fontSize = '8px';
			this.mapWavePokemon[i].count.style.bottom = '-5px';
		})

		this.autoWave.innerHTML = text.ui.autoWave[this.main.lang].toUpperCase();
		this.nextWave.innerText = text.ui.nextWave[this.main.lang].toUpperCase();
	
		this.autoWave.style.filter = `revert-layer`;
		this.autoWave.style.pointerEvents = `revert-layer`;
		this.speedWave.style.filter = `revert-layer`;
		this.speedWave.style.pointerEvents = `revert-layer`;	

		if (this.main.area.waveActive) {
			this.nextWave.style.filter = `brightness(0.8)`;
			this.nextWave.style.pointerEvents = 'none';
		} else {
			this.nextWave.style.filter = `revert-layer`;
			this.nextWave.style.pointerEvents = 'all';
		}
	}

	countPokemon(grupo) {
	    const res = {};

	    const arrayCount = (arr) => {
	        arr.forEach(pokemon => {
	            if (pokemon !== null) {
	                const id = pokemon.id;
	                res[id] = (res[id] || 0) + 1;
	            }
	        });
	    };

	    arrayCount(grupo.preview);
	    arrayCount(grupo.wave);

	    return grupo.preview.map(pokemon => res[pokemon.id]);
	}

	updateDamageDealt() {
		this.main.team.pokemon.forEach((pokemon, i) => {
			if (pokemon.damageDealt > 0) {
				const per = Math.ceil((pokemon.damageDealt/this.main.area.totalDamageDealt)*100)
				this.damageDealtUnit[i].number.innerHTML = `
					${this.main.utility.numberDot(pokemon.damageDealt, this.main.lang)} 
					<span style="position: absolute; right: 0px; top: 2px; font-size: 8px; text-align: right">(${per}%)</span>
				`;
				this.damageDealtUnit[i].bar.style.width = `${per}%`;
			} else {
				this.damageDealtUnit[i].number.innerHTML = `0 <span style="position: absolute; right: 0px; top: 2px; font-size: 8px; text-align: right">(0%)</span>`;
				this.damageDealtUnit[i].bar.style.width = '0%';
			}
			if (pokemon.id == 19 || pokemon.id == 83 || pokemon.id == 101) {
				this.damageDealtUnit[i].number.innerHTML = `${text.ui.helping[this.main.lang]} <span style="position: absolute; right: 0px; top: 2px; font-size: 8px; text-align: right">:)</span>`;
			}
		});
	}

	refreshDamageDealt(force = false) {	
		for (let i = 0; i < 10; i++) {
			if (this.main.team.pokemon[i]) this.main.team.pokemon[i].damageDealt = 0;
			this.damageDealtUnit[i].number.innerHTML = `0 <span style="position: absolute; right: 0px; top: 2px; font-size: 8px; text-align: right">(0%)</span>`;
			this.damageDealtUnit[i].barPrevious.style.width = (force) ? '0%' : this.damageDealtUnit[i].bar.style.width;
			this.damageDealtUnit[i].bar.style.width = '0%';
		}
	}

	damageDealtSwitch() {
		playSound('option', 'ui');
		this.damageDealtDisplay =! this.damageDealtDisplay;
		if (this.damageDealtDisplay) this.damageDealtContainer.style.display = 'block';
		else this.damageDealtContainer.style.display = 'none';
	}

	blockRightUI() {
		this.mapPanel.style.pointerEvents = 'none';
		this.mapPanel.style.filter = 'brightness(0.8)';
		this.nextWave.style.pointerEvents = 'none';
		this.mapWavePokemonContainer.style.pointerEvents = 'all';
	}

	blockLeftUI() {
		this.playerPanel.style.pointerEvents = 'none';
		this.playerPanel.style.filter = 'brightness(0.8)';
		this.playerPanel.querySelectorAll('*').forEach(el => el.style.pointerEvents = 'none');
	}

	blockAllUI() {
		this.blockRightUI();
		this.blockLeftUI();
	}

	blockMenuUI() {
		SECTIONS.forEach(section =>  {
			this.section[section].style.pointerEvents = 'none';
			this.section[section].img.style.backgroundSize = '17px';
			this.section[section].img.style.opacity = '0.8'
		})
	}

	revertUI() {
		this.mapPanel.style.pointerEvents = 'all';
		this.playerPanel.style.pointerEvents = 'all';
		this.mapPanel.style.filter = 'revert-layer';
		this.playerPanel.style.filter = 'revert-layer';
		this.nextWave.style.pointerEvents = 'all';

		SECTIONS.forEach(section =>  {
			this.section[section].style.pointerEvents = 'all';
			this.section[section].img.style.backgroundSize = 'revert-layer';
			this.section[section].img.style.opacity = 'revert-layer';
		})
	}

	getSecret(poke) {
		const pokemon = pokemonData[poke];

		if (this.main.team.pokemon.length < this.main.player.teamSlots) {
			this.main.team.addPokemon(new Pokemon(pokemon, 1, null, this.main));
			this.main.shopScene.displayPokemon.open(this.main.team.pokemon.at(-1))
		} else {
			this.main.box.addPokemon(new Pokemon(pokemon, 1, null, this.main));
			this.main.shopScene.displayPokemon.open(this.main.box.pokemon.at(-1))
		}

		this.main.player.stats.pokemonOwned++;
		this.main.player.stats.totalPokemonLevel++;
		this.main.player.achievementProgress.evolutionCount++;
		
		if (this.main.player.achievementProgress.evolutionCount === 210) this.main.player.unlockAchievement(1);

		saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
		this.main.UI.update();	
	}

	importTeamButtonHandle(i) {
		if (!this.main.area.inChallenge && this.main.teamManager.teams[i][this.main.area.routeNumber].length == 0) return
		if (this.main.area.inChallenge && this.main.teamManager.teamChallenge[i].length == 0) return
			
		const msg = new Element(this.main.scene, {
			className: 'team-saved-message',
			text: text.ui.loadTeam[this.main.lang].toUpperCase()
		}).element;

		msg.style.opacity = 0;
		setTimeout(() => {
			msg.style.opacity = 1;
		}, 0);

		setTimeout(() => {
			msg.style.opacity = 0;
			setTimeout(() => msg.remove(), 500);
		}, 1500);

		if (this.main.area.inChallenge) this.main.teamManager.importTeam(i, true); 
		else this.main.teamManager.importTeam(i); 
	}

	saveTeamButtonHandle(i) {
		const msg = new Element(this.main.scene, {
			className: 'team-saved-message',
			text: text.ui.savedTeam[this.main.lang].toUpperCase()
		}).element;

		msg.style.opacity = 0;
		setTimeout(() => {
			msg.style.opacity = 1;
		}, 0);

		setTimeout(() => {
			msg.style.opacity = 0;
			setTimeout(() => msg.remove(), 500);
		}, 1500);

		if (this.main.area.inChallenge) this.main.teamManager.saveTeam(i, true); 
		else this.main.teamManager.saveTeam(i); 
	}

	waveSelectorBlockHandle() {
		this.main.area.repeat = !this.main.area.repeat;
		playSound('option', 'ui');
		if (this.main.area.repeat) {
			this.waveSelectorBlock.style.background = 'var(--green)';
		} else {
			this.waveSelectorBlock.style.background = 'revert-layer';
		}
	}

	changeMusic(dir) {
   	 	playSound('option', 'ui');

	    let currentIndex = songData.findIndex(s => s.id === this.main.area.music.id);
	    currentIndex += dir;

	    if (currentIndex < 0) currentIndex = songData.length - 1;
	    else if (currentIndex >= songData.length) currentIndex = 0;

	    this.main.area.music = songData[currentIndex];
	    this.musicName.innerHTML = `♪ ${this.main.area.music.name[this.main.lang].toUpperCase()}`;

	    playMusic(this.main.area.music.song);
	}

	// RESTORED: Vanilla damage type toggle method
	changeDamageType() {
		this.damageDealtType = (this.damageDealtType == 'trueDamage') ? 'overdamage' : 'trueDamage';
		playSound('option', 'ui');
		this.damageDealtButton.innerHTML = text.ui[this.damageDealtType][this.main.lang].toUpperCase();
		this.updateDamageDealt();
	}
}

class FastScene {
	constructor(main, UI) {
		this.main = main;
		this.UI = UI;

		this.scene;
		this.position;

		this.isOpen = false;
		this.pokemonArray = [];
		this.itemArray = [];

		this.render(); 
	}

	render() {
		this.window = document.createElement('div');
		this.window.className = 'item-scene-window';

        this.container = new Element(this.window, { className: 'fast-scene-container' }).element;
        this.prompt = new Element(this.window, { className: 'fast-scene-prompt' }).element; 

        //ITEM
        this.itemSlot = [];

        //POKEMON
        this.pokemonSlot = [];
	}

	open(scene, position) {
		if (this.isOpen && this.position == position) return this.close();
		if (this.main.area.inChallenge.noItems && scene == 'item') {
			playSound('pop0', 'ui')
			return;
		}
		if (
			scene == 'pokemon' &&
			typeof this.main.area.inChallenge.slotLimit == 'number' &&
			position >= this.main.area.inChallenge.slotLimit
		) {
			playSound('pop0', 'ui')
			return;
		}

		playSound('open', 'ui')

		this.pokemonArray = [];
		this.itemArray = [];
		this.itemSlot = [];
		this.pokemonSlot = [];

		this.scene = scene;
		this.position = position;
		this.UI.pokemon[this.position].appendChild(this.container);
		this.isOpen = true;

		this.container.innerHTML = "";
		this.prompt.innerText = text.ui.empty[this.main.lang].toUpperCase();

		if (this.scene == 'pokemon') this.openPokemonScene()
		else this.openItemScene();
	}

	close() {
		this.isOpen = false;
		playSound('close', 'ui');
		this.UI.pokemon[this.position].removeChild(this.container);
	}

	openPokemonScene() {
		this.pokemonArray = this.main.box.pokemon;
		this.container.style.background = 'linear-gradient(30deg, rgba(70, 70, 70, 1) 0%, rgba(50, 50, 50, 1) 100%)';
		(this.pokemonArray.length > 0) ? this.prompt.style.display = 'none' : this.prompt.style.display = 'revert-layer';

		this.pokemonArray.forEach((pokemon, i) => {
			this.pokemonSlot[i] = new Element(this.container, { className: 'fast-scene-pokemon-slot' }).element;
			this.pokemonSlot[i].style.backgroundImage = `url("${pokemon.sprite.base}")`;

			this.pokemonSlot[i].addEventListener('click', () => {
				playSound('equip', 'ui');
				this.main.team.addPokemon(pokemon);
				this.main.box.removePokemon(pokemon);
				this.UI.update();
				this.close();
			})
		})
	}

	openItemScene() {
		const pokemon = this.main.team.pokemon[this.position];

		this.itemArray = this.main.player.items.filter(item => this.checkRestriction(item));

		this.container.style.background = `linear-gradient(30deg, ${pokemon.specie.color}2D 100%, ${pokemon.specie.color}5D 100%), #555`;

		this.itemArray.forEach((item, i) => {
			this.itemSlot[i] = new Element(this.container, { className: 'fast-scene-pokemon-item' }).element;
			this.itemSlot[i].style.backgroundImage = `url("${item.sprite}")`;

			// Add tooltip for item info
			this.main.tooltip.bindTo(this.itemSlot[i], item, 'item');

			this.itemSlot[i].addEventListener('click', () => {
				playSound('equip', 'ui');
				this.equipItem(item)
				this.close();
			})
		})
	}

	checkRestriction(item) {
		const pokemon = this.main.team.pokemon[this.position];
		const key = Object.keys(item.restriction)[0];

		switch(key) {
			case 'key':
				if (item.restriction[key] == pokemon.specie.key) return true;
			break;
			case 'id':
				if (item.restriction[key].includes(pokemon.id)) return true;
				break;
			case 'idForbidden':	
				if (!item.restriction[key].includes(pokemon.id)) return true;
				break;
			case 'tile': 
				if (pokemon.id == 70) return false;	
				if (item.restriction[key].some(tile => pokemon.tiles.includes(tile))) return true;
				break;
			case 'tileForbidden':
				if (pokemon.id == 70) return false;	
				if (!item.restriction[key].some(tile => pokemon.tiles.includes(tile)))  return true;
				break;
			case 'attackType':
				if (pokemon.id == 70) return false;	
				if (item.restriction[key] == pokemon.attackType) return true;
				break;
			case 'rangeType':
				if (pokemon.id == 70) return false;	
				if (item.restriction[key] == pokemon.rangeType) return true;
				break;
		}
		return false;
	}

	equipItem(item) {
		const pokemon = this.main.team.pokemon[this.position];

		pokemon.equipItem(item);
		this.UI.update();
	}
}

