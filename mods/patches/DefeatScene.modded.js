import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { saveData } from '../../file/data.js';
import { playSound } from '../../file/audio.js';

const CHALLENGES_LIST = ['lvlCap', 'slotLimit', 'toughEnemies', 'draft', 'noItems', 'permadeath'];

export class DefeatScene extends GameScene {
	constructor(main) {
		super(340, 300);
		this.main = main;
		
		this.header.removeChild(this.closeButton);
		this.render();
		this.saveWaveRetry = [25, 50, 75]; // Base checkpoints, extended dynamically for endless
		this.savedWave = 0;
	}

	render() {
		this.title.innerHTML = text.defeat.title[this.main.lang].toUpperCase();

		this.prompt = new Element(this.container, { className: 'defeat-scene-prompt' }).element;
		this.image = new Element(this.container, { className: 'defeat-scene-image' }).element;
		this.restartButton = new Element(this.container, { className: 'defeat-restart-button' }).element;
		this.restartButton.addEventListener('click', () => this.restart());
		this.restartButton.addEventListener('mouseenter', () => { playSound('open', 'ui') });

		this.retryButton = new Element(this.container, { className: 'defeat-retry-button' }).element;
		this.retryButton.addEventListener('click', () => this.retry());
		this.retryButton.addEventListener('mouseenter', () => { playSound('open', 'ui') });

		this.info = new Element(this.container, { className: 'defeat-scene-info' }).element;

		this.challengeContainer = new Element(this.container, { className: 'final-challenge-container' }).element;
		this.challengeContainer.style.display = 'none';
		this.challengeContainer.style.top = '299px'
		this.challenge = [];
	}

	update() {
		this.savedWave = 0;
		this.challengeContainer.style.display = 'none';

		this.title.innerHTML = text.defeat.title[this.main.lang].toUpperCase();
		this.prompt.innerHTML = `${text.defeat.prompt[this.main.lang].toUpperCase()} ${this.main.area.waveNumber - 1} ${text.map.waves[this.main.lang].toUpperCase()}`;
		this.restartButton.innerText = text.defeat.restart[this.main.lang].toUpperCase();
		this.retryButton.innerText = text.defeat.retry[this.main.lang].toUpperCase();

		if (this.main.area.waveNumber > 25 || this.main.area.endlessMode) {
			this.getRetryWave();
			this.retryButton.style.filter = 'revert-layer';
			this.retryButton.style.pointerEvents = 'revert-layer';
			this.info.innerHTML = this.getRetryText(this.main.lang).toUpperCase();
		} else {
			this.retryButton.style.filter = 'brightness(0.8)';
			this.retryButton.style.pointerEvents = 'none';
			this.info.innerHTML = text.defeat.cantRetry[this.main.lang].toUpperCase();
		}

		if (this.main.area.inChallenge.permadeath) {
			this.main.game.chrono.stop();
			this.challengeContainer.innerHTML = "";
			this.challengeContainer.style.display = 'revert-layer';

			this.info.innerHTML = text.defeat.promptChallengeLost[this.main.lang].toUpperCase();

			if (this.main.area.inChallenge) {
			    CHALLENGES_LIST.forEach((key, i) => {
			        const value = this.main.area.inChallenge[key];

			        this.challenge[i] = new Element(
			            this.challengeContainer,
			            { className: 'final-challenge' }
			        ).element;

			        let display = "";

			        if (value === false)  display = text.challenge.off[this.main.lang].toUpperCase();
			        
			        else if (key === 'lvlCap' && typeof value === 'number') {
			            display = `LEVEL ${value}`;
			        } else if (key === 'slotLimit' && typeof value === 'number') {
			            display = `${value} SLOTS`;
			        } else if (key === 'toughEnemies' && typeof value === 'number') {
			            display = `+${value}%`;
			        }

			        else if (key === 'draft' || key === 'noItems' || key === 'permadeath') {
			            display = value
			                ? text.challenge.on[this.main.lang].toUpperCase()
			                : text.challenge.off[this.main.lang].toUpperCase();
			        } else {
			            display = text.challenge[key].title[this.main.lang].toUpperCase();
			        }

			        this.challenge[i].innerText =
			            `${text.challenge[key].title[this.main.lang].toUpperCase()} — ${display}`;

			        this.challenge[i].style.color = (value && value !== false) ? '#ebbe35' : '#666';
		    	});
			}
		}
	}

	open() {
		super.open();
		this.update();
		this.main.game.stop();

		if (this.main.area.goldWave > this.main.player.stats.maxGoldPerWave[0]) {
			this.main.player.stats.maxGoldPerWave[0] = this.main.area.goldWave;
			this.main.player.stats.maxGoldPerWave[1] = this.main.area.getRouteTag(this.main.area.routeNumber, this.main.area.waveNumber);
		}
		if (this.main.area.waveStartTime !== null) {
	        this.main.area.waveElapsedTime = Math.floor(
	            (performance.now() - this.main.area.waveStartTime) / 1000
	        ); 
	        this.main.area.waveStartTime = null;
	    }
	    
	    let goldPerSecond = this.main.area.waveElapsedTime > 0 ? Math.round((this.main.area.goldWave / this.main.area.waveElapsedTime) * 100) / 100 : 0;
		if (goldPerSecond > this.main.player.stats.maxGoldPerTime[0]) {
			this.main.player.stats.maxGoldPerTime[0] = goldPerSecond;
			this.main.player.stats.maxGoldPerTime[1] = this.main.area.getRouteTag(this.main.area.routeNumber, this.main.area.waveNumber);
		}

		this.main.area.goldWave = 0;

		const scenes = [
			this.main.boxScene,
			this.main.mapScene,
			this.main.pokemonScene,
			this.main.shopScene,
			this.main.shopScene.displayPokemon,
			this.main.profileScene,
			this.main.challengeScene,
			this.main.menuScene,
			this.main.menuScene.deleteScene,
			this.main.menuScene.importScene,
			this.main.menuScene.exportScene,
			this.main.profileScene.deleteRecord,
			this.main.UI.fastScene,
		]
		
		if (this.main.autoReset == 0) {
			scenes.forEach(scene => {
				if (scene.isOpen) scene.close();
			})
		}
		
		playSound('results', 'ui');

		if (this.main.autoReset == 1 && !this.main.area.inChallenge.permadeath) { this.restart({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor}) } 
		if (this.main.autoReset == 2 && !this.main.area.inChallenge.permadeath) { 
			if (this.main.area.waveNumber > 25) this.retry({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor}) 
			else this.restart({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor})
		}
		// AUTO-RESET "Continue" mode (3): Same as retry in DefeatScene (continue is only for FinalScene)
		if (this.main.autoReset == 3 && !this.main.area.inChallenge.permadeath) { 
			if (this.main.area.waveNumber > 25) this.retry({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor}) 
			else this.restart({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor})
		} 
	}

	restart(autoReset = {}) {
		if (this.main.area.inChallenge.permadeath) this.main.challengeScene.cancelChallenge();
		// ENDLESS MODE: Reset endless mode on restart so popup shows again at wave 100
		this.main.area.endlessMode = false;
		this.main.area.loadArea(this.main.area.map.id, 1, true, this.main.area.inChallenge, true);
		this.main.player.getHealed(14);
		this.close();

		if (autoReset.autoWave) this.main.area.switchAutoWave();
	}

	retry(autoReset = {}) {
		if (this.main.area.inChallenge.permadeath) this.main.challengeScene.cancelChallenge();
		let lives = 7;
		if (this.main.player.stars >= 150) lives++;
		if (this.main.player.stars >= 300) lives++;
		if (this.main.player.stars >= 450) lives++;
		if (this.main.area.waveNumber == 100) lives = 1;
		
		// ENDLESS MODE: Reset endless mode on retry so popup shows again at wave 100
		this.main.area.endlessMode = false;
		this.main.area.loadArea(this.main.area.map.id, this.savedWave, true, this.main.area.inChallenge, true);
		this.main.player.getHealed(lives);
		this.close();

		if (autoReset.autoWave) this.main.area.switchAutoWave();
	}

	close() {
		super.close();
		this.savedWave = 0;

		this.main.UI.nextWave.style.filter = `revert-layer`;
		this.main.UI.nextWave.style.pointerEvents = 'all';

		this.main.area.autoWave = false;
		this.main.UI.autoWave.style.background = '#2c70e3';

		this.main.UI.update();
		this.main.UI.revertUI();
		this.main.game.resume();
		this.main.player.stats.resets++;
		if (this.main.player.stats.resets == 100) this.main.player.unlockAchievement(11);
		
		playSound('button2', 'ui');
		saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
	}

	getRetryWave() {
		// ENDLESS MODE: Dynamic checkpoint calculation
		const wave = this.main.area.waveNumber;
		
		if (wave <= 100) {
			// Vanilla behavior: checkpoints at 25, 50, 75
			for (let i = 0; i < this.saveWaveRetry.length; i++) {
				if (this.saveWaveRetry[i] < wave) {
					this.savedWave = this.saveWaveRetry[i];
				} else {
					break;
				}
			}
		} else {
			// Endless mode: checkpoints every 50 waves starting at 100
			// Die on 101-149 -> 100, 150-199 -> 150, 200-249 -> 200, etc.
			this.savedWave = Math.floor((wave - 1) / 50) * 50;
			// Ensure minimum of 100 for endless mode
			if (this.savedWave < 100) this.savedWave = 100;
		}
	}

	getRetryText(lang) {
		let lives = 7;
		if (this.main.player.stars >= 150) lives++;
		if (this.main.player.stars >= 300) lives++;
		if (this.main.player.stars >= 450) lives++;
		// Boss waves (100, 200, 300...) give only 1 life
		if (this.main.area.waveNumber % 100 === 0 && this.main.area.waveNumber >= 100) {
			lives = 1;
			// savedWave already set by getRetryWave()
		}

		const text = [
			`You can use retry to return to wave ${this.savedWave} with ${lives} lives`,
			`Puedes reintentar y volver a la oleada ${this.savedWave} con ${lives} vidas`,
			`Vous pouvez réessayer et revenir à la vague ${this.savedWave} avec ${lives} vies`,
			`Você pode reiniciar e voltar à onda ${this.savedWave} com ${lives} vidas`,
			`Puoi ritentare e tornare all’ondata ${this.savedWave} con ${lives} vite`,
			`Du kannst mit ${lives} Leben zu Welle ${this.savedWave} zurück.`,
			`リトライを使うと、${lives}ライフの状態でウェーブ${this.savedWave}に戻れます`,
			`재시도를 사용하면 목숨 ${lives}개로 ${this.savedWave}웨이브로 돌아갈 수 있습니다`,
			`你可以使用重试返回到第${this.savedWave}波，并拥有${lives}条生命`,
			`Możesz użyć ponownej próby, aby wrócić do fali ${this.savedWave} z ${lives} życiami`
		]
		return text[lang];
	}
}