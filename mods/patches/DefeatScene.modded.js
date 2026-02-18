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
		// MOD: Endless checkpoints - checkpoints every 50 waves after 100
		this.saveWaveRetry = [25, 50, 75];
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

		if (this.main.area.waveNumber > 25) {
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
			            `${text.challenge[key].title[this.main.lang].toUpperCase()} ΓÇö ${display}`;

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
	        this.main.area.waveElapsedTime = (performance.now() - this.main.area.waveStartTime) / 1000;
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

		// MOD: Auto-reset options - 0=Off, 1=Restart, 2=Retry, 3=Continue
		if (this.main.autoReset == 1 && !this.main.area.inChallenge.permadeath) { 
			this.restart({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor}) 
		} 
		if (this.main.autoReset == 2 && !this.main.area.inChallenge.permadeath) { 
			if (this.main.area.waveNumber > 25) this.retry({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor}) 
			else this.restart({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor})
		}
		// MOD: Auto-continue option (3) - continue from current wave in endless mode
		if (this.main.autoReset == 3 && !this.main.area.inChallenge.permadeath) {
			// In endless mode (wave > 100), continue from checkpoint
			if (this.main.area.waveNumber > 100) {
				this.getRetryWave();
				this.retry({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor});
			} else if (this.main.area.waveNumber > 25) {
				this.retry({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor});
			} else {
				this.restart({autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor});
			}
		}
	}

	restart(autoReset = {}) {
		if (this.main.area.inChallenge.permadeath) this.main.challengeScene.cancelChallenge();
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
		// MOD: In endless mode (wave >= 100), give more lives for retrying
		if (this.main.area.waveNumber >= 100) {
			lives = Math.max(1, 10 - Math.floor((this.main.area.waveNumber - 100) / 50));
		}
		
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

	// MOD: Extended checkpoints for endless mode - every 50 waves after 100
	getRetryWave() {
		// Generate dynamic checkpoints for endless mode
		const wave = this.main.area.waveNumber;
		
		// Build checkpoint list dynamically
		let checkpoints = [25, 50, 75];
		
		// MOD: Add checkpoints every 50 waves for endless mode (100, 150, 200, etc.)
		if (wave > 100) {
			// Add checkpoint at 100
			checkpoints.push(100);
			// Add checkpoints every 50 waves after 100
			let checkpoint = 150;
			while (checkpoint < wave) {
				checkpoints.push(checkpoint);
				checkpoint += 50;
			}
		}
		
		this.savedWave = 0;
	  	for (let i = 0; i < checkpoints.length; i++) {
		    if (checkpoints[i] < wave) {
		      	this.savedWave = checkpoints[i];
		    } else {
		      	break;
	    	}
	    }
	}

	getRetryText(lang) {
		let lives = 7;
		if (this.main.player.stars >= 150) lives++;
		if (this.main.player.stars >= 300) lives++;
		if (this.main.player.stars >= 450) lives++;
		
		// MOD: Special handling for endless mode (wave >= 100)
		if (this.main.area.waveNumber >= 100) {
			lives = Math.max(1, 10 - Math.floor((this.main.area.waveNumber - 100) / 50));
			// Ensure savedWave is calculated
			if (this.savedWave === 0) {
				this.getRetryWave();
			}
		}

		const text = [
			`You can use retry to return to wave ${this.savedWave} with ${lives} lives`,
			`Puedes reintentar y volver a la oleada ${this.savedWave} con ${lives} vidas`,
			`Vous pouvez r├⌐essayer et revenir ├á la vague ${this.savedWave} avec ${lives} vies`,
			`Voc├¬ pode reiniciar e voltar ├á onda ${this.savedWave} com ${lives} vidas`,
			`Puoi ritentare e tornare all'ondata ${this.savedWave} con ${lives} vite`,
			`Du kannst mit ${lives} Leben zu Welle ${this.savedWave} zur├╝ck.`,
			`πâ¬πâêπâ⌐πéñπéÆΣ╜┐πüåπü¿πÇü${lives}πâ⌐πéñπâòπü«τè╢µàïπüºπéªπéºπâ╝πâû${this.savedWave}πü½µê╗πéîπü╛πüÖ`,
			`∞₧¼∞ï£δÅäδÑ╝ ∞é¼∞Ü⌐φòÿδ⌐┤ δ¬⌐∞ê¿ ${lives}Ω░£δí£ ${this.savedWave}∞¢¿∞¥┤δ╕îδí£ δÅî∞òäΩ░ê ∞êÿ ∞₧ê∞è╡δïêδïñ`,
			`Σ╜áσÅ»Σ╗ÑΣ╜┐τö¿ΘçìΦ»òΦ┐öσ¢₧σê░τ¼¼${this.savedWave}µ│ó∩╝îσ╣╢µïÑµ£ë${lives}µ¥íτöƒσæ╜`,
			`Mo┼╝esz u┼╝y─ç ponownej pr├│by, aby wr├│ci─ç do fali ${this.savedWave} z ${lives} ┼╝yciami`
		]
		return text[lang];
	}
}
