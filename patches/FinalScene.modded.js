import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { saveData } from '../../file/data.js';
import { playSound } from '../../file/audio.js';
import { enemyData } from '../data/enemyData.js';

const CHALLENGES_LIST = ['lvlCap', 'slotLimit', 'toughEnemies', 'draft', 'noItems', 'permadeath'];

const BOSS = [
	enemyData['shaymin'], enemyData['celebi'], enemyData['lunala'],
	enemyData['moltres'], enemyData['regirock'], enemyData['groudon'], 
	enemyData['registeel'], enemyData['regice'], enemyData['regigigas'], 
	enemyData['zapdos'], enemyData['hooh'], enemyData['articuno'], 
]

export class FinalScene extends GameScene {
	constructor(main) {
		super(440, 280); // Slightly taller for buttons
		this.main = main;
		this.boss;

		this.render();
	}

	render() {
		this.title.innerHTML = text.final.title[this.main.lang].toUpperCase();

		this.prompt = new Element(this.container, { className: 'defeat-scene-prompt' }).element;
		this.image = new Element(this.container, { className: 'final-scene-image' }).element;
		
		this.hofContainer = new Element(this.container, { className: 'final-hof-container' }).element;
		this.hof = [];

		this.info = new Element(this.container, { className: 'defeat-scene-info' }).element;

		this.challengeContainer = new Element(this.container, { className: 'final-challenge-container' }).element;
		this.challenge = [];

		// ENDLESS MODE: Button container
		this.buttonContainer = new Element(this.container, { className: 'final-button-container' }).element;
		this.buttonContainer.style.cssText = 'position:absolute;bottom:45px;left:0;right:0;display:flex;gap:15px;justify-content:center;';

		// Continue button (green - endless mode)
		this.continueButton = new Element(this.buttonContainer, { 
			className: 'final-scene-button', 
			text: 'CONTINUE' 
		}).element;
		this.continueButton.style.cssText = 'padding:12px 25px;cursor:pointer;font-weight:bold;border:none;border-radius:5px;background:linear-gradient(180deg,#70ac4c 0%,#5a8c3c 100%);color:white;font-size:14px;';
		this.continueButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui'); });
		this.continueButton.addEventListener('click', () => this.continueEndless());

		// Restart button (red - back to wave 1)
		this.restartButton = new Element(this.buttonContainer, { 
			className: 'final-scene-button', 
			text: 'RESTART' 
		}).element;
		this.restartButton.style.cssText = 'padding:12px 25px;cursor:pointer;font-weight:bold;border:none;border-radius:5px;background:linear-gradient(180deg,#e06666 0%,#b33333 100%);color:white;font-size:14px;';
		this.restartButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui'); });
		this.restartButton.addEventListener('click', () => this.close());
	}

	update() {
		this.main.game.chrono.stop();

		const routeName = this.main.area.map.name[this.main.lang];
		this.boss = BOSS[this.main.area.routeNumber];

		this.image.style.backgroundImage = `url(${this.boss.sprite.base})`;

		this.hof = [];
		this.hofContainer.innerHTML = "";
		this.main.team.pokemon.forEach((pokemon, i) => {
			this.hof[i] = new Element(this.hofContainer, { className: 'final-hof' }).element;
			this.hof[i].style.backgroundImage = `url(${pokemon.sprite.base})`
		})

		this.prompt.innerHTML = text.final.prompt[this.main.lang].toUpperCase();
		this.info.innerHTML = this.getText(this.main.lang).toUpperCase();

		this.challenge = [];
		this.challengeContainer.innerHTML = "";
		this.challengeContainer.style.display = 'none';
		if (this.main.area.inChallenge) {
			this.main.game.chrono.stop();
			this.challengeContainer.innerHTML = "";
			this.challengeContainer.style.display = 'revert-layer';

			this.main.player.obtainChallengeRibbonsFromObject(
                this.main.area.inChallenge,
                this.main.area.routeNumber
            );

		    CHALLENGES_LIST.forEach((key, i) => {
		        const value = this.main.area.inChallenge[key];

		        this.challenge[i] = new Element(
		            this.challengeContainer,
		            { className: 'final-challenge' }
		        ).element;

		        let display = "";

		        if (value === false) display = text.challenge.off[this.main.lang].toUpperCase();
		        
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

	open() {
		super.open();
		this.update();
		this.main.game.stop();

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
		
		scenes.forEach(scene => {
			if (scene.isOpen) scene.close();
		})

		playSound('results', 'ui');

		// AUTO-RESET: If set to "continue" mode (3), auto-continue to endless
		if (this.main.autoReset === 3) {
			this.continueEndless({ autoWave: this.main.area.autoWave, speedBuff: this.main.game.speedFactor });
		}
	}

	// ENDLESS MODE: Continue to wave 101+
	continueEndless(autoReset = {}) {
		super.close();

		if (this.main.area.inChallenge) this.main.challengeScene.cancelChallenge();

		// Enable endless mode and go to wave 101
		this.main.area.endlessMode = true;
		this.main.area.waveNumber = 101;
		this.main.area.routeWaves[this.main.area.routeNumber] = 101;
		
		this.main.player.getHealed(14);

		this.main.UI.nextWave.style.filter = `revert-layer`;
		this.main.UI.nextWave.style.pointerEvents = 'all';

		this.main.area.autoWave = false;
		this.main.UI.autoWave.style.background = '#2c70e3';
		
		this.main.UI.update();
		this.main.UI.revertUI();
		this.main.game.resume();

		playSound('obtain', 'ui');
		saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);

		// Restore auto-wave if it was on
		if (autoReset.autoWave) this.main.area.switchAutoWave();
	}

	// RESTART: Back to wave 1 (original behavior)
	close() {
		super.close();

		if (this.main.area.inChallenge) this.main.challengeScene.cancelChallenge();

		this.main.area.endlessMode = false; // Disable endless mode
		this.main.area.loadArea(this.main.area.map.id, 1, true);
		this.main.player.getHealed(14);

		this.main.UI.nextWave.style.filter = `revert-layer`;
		this.main.UI.nextWave.style.pointerEvents = 'all';

		this.main.area.autoWave = false;
		this.main.UI.autoWave.style.background = '#2c70e3';

		//this.main.UI.saveTeamButton.style.display = 'revert-layer';
		//this.main.UI.importTeamButton.style.display = 'revert-layer';
		
		this.main.UI.update();
		this.main.UI.revertUI();
		this.main.game.resume();

		playSound('obtain', 'ui');
		saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
	}

	getText(lang) {
		const text = [
			`You defeated ${this.boss.name[lang]} and showed who's boss, congratulations!`,
		    `Has derrotado a ${this.boss.name[lang]} y le has demostrado quién manda`,
		    `Vous avez vaincu ${this.boss.name[lang]} et montré qui est le patron,`,
		    `Você derrotou ${this.boss.name[lang]} e mostrou quem manda, parabéns!`,
		    `Hai sconfitto ${this.boss.name[lang]} e hai dimostrato chi comanda`,
		    `Du hast ${this.boss.name[lang]} besiegt und gezeigt, wer der Boss ist`,
		    `${this.boss.name[lang]}を倒してボスの座を見せつけた、祝福します！`,
		    `${this.boss.name[lang]}를 물리치고 누가 보스인지 보여줬다, 축하해!`,
		    `你击败了${this.boss.name[lang]}，向他展示了谁才是老大，恭喜！`,
			`Pokonałeś ${this.boss.name[lang]} i pokazałeś, kto tu rządzi — gratulacje!`,
		]
		return text[lang];
	}
}
