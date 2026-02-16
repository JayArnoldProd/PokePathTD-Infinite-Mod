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
		super(440, 230);
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
		            `${text.challenge[key].title[this.main.lang].toUpperCase()} ΓÇö ${display}`;

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
	}

	close() {
		super.close();

		if (this.main.area.inChallenge) this.main.challengeScene.cancelChallenge();

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
		    `Has derrotado a ${this.boss.name[lang]} y le has demostrado qui├⌐n manda`,
		    `Vous avez vaincu ${this.boss.name[lang]} et montr├⌐ qui est le patron,`,
		    `Voc├¬ derrotou ${this.boss.name[lang]} e mostrou quem manda, parab├⌐ns!`,
		    `Hai sconfitto ${this.boss.name[lang]} e hai dimostrato chi comanda`,
		    `Du hast ${this.boss.name[lang]} besiegt und gezeigt, wer der Boss ist`,
		    `${this.boss.name[lang]}πéÆσÇÆπüùπüªπâ£πé╣πü«σ║ºπéÆΦªïπü¢πüñπüæπüƒπÇüτÑ¥τªÅπüùπü╛πüÖ∩╝ü`,
		    `${this.boss.name[lang]}δÑ╝ δ¼╝δª¼∞╣ÿΩ│á δêäΩ░Ç δ│┤∞èñ∞¥╕∞ºÇ δ│┤∞ù¼∞ñ¼δïñ, ∞╢òφòÿφò┤!`,
		    `Σ╜áσç╗Φ┤ÑΣ║å${this.boss.name[lang]}∩╝îσÉæΣ╗ûσ▒òτñ║Σ║åΦ░üµëìµÿ»ΦÇüσñº∩╝îµü¡σû£∩╝ü`,
			`Pokona┼ée┼¢ ${this.boss.name[lang]} i pokaza┼ée┼¢, kto tu rz─àdzi ΓÇö gratulacje!`,
		]
		return text[lang];
	}
}
