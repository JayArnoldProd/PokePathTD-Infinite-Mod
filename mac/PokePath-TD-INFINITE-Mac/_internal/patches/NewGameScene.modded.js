import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { Input } from '../../utils/Input.js';
import { text } from '../../file/text.js';
import { saveData } from '../../file/data.js';
import { Pokemon } from '../component/Pokemon.js'; 
import { pokemonData } from '../data/pokemonData.js';
import { playSound, playMusic } from '../../file/audio.js';

const STARTER = [pokemonData['charmander'], pokemonData['treecko'], pokemonData['froaki']]

export class NewGameScene extends GameScene {
	constructor(main) {
		super(432, 400);
		this.main = main;

		this.starterSelected = 0;
		this.languageSelected = 0;
		this.header.removeChild(this.closeButton);
		this.render();
	}

	render() {
		this.title.innerHTML = text.newGame.title[this.main.lang].toUpperCase();

		this.flagContainer = new Element(this.container, { className: 'new-game-flag-container' }).element;
		this.flags = [];

		for (let i = 0; i < 10; i++) {
			this.flags[i] = new Element(this.flagContainer, { className: 'new-game-flag' }).element;
			this.flags[i].addEventListener('click', () => { this.selectLanguage(i) })
			this.flags[i].addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		}

		this.profileContainer = new Element(this.container, { className: 'new-game-starter-profile-container' }).element;

		this.name = new Input(
			this.profileContainer, 
			"text", 
			{ 
				className: "profile-scene-name-ng", 
				maxlength: 11, 
				cb: () => { this.changeName() } 
			}
		);

		this.portrait = new Element(this.profileContainer, { className: 'profile-scene-portrait-ng' }).element;

		this.avatarPrev = new Element(this.profileContainer, { className: 'profile-scene-avatar-arrow-prev-ng', text: '<' }).element;
		this.avatarNext = new Element(this.profileContainer, { className: 'profile-scene-avatar-arrow-next-ng', text: '>' }).element;
		this.avatarPrev.addEventListener('click', () => { this.changePortrait(-1) });
		this.avatarNext.addEventListener('click', () => { this.changePortrait(1) });
		this.avatarPrev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.avatarNext.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.starterName = new Element(this.container, { className: 'new-game-starter-name' }).element;
		this.starterDescription = new Element(this.container, { className: 'new-game-starter-description' }).element;
		this.starterContainer = new Element(this.container, { className: 'new-game-starter-container' }).element;
		this.starters = [];

		STARTER.forEach((starter, i) => {
			this.starters[i] = new Element(this.starterContainer, { className: 'new-game-starter', image: starter.sprite.base }).element;
			this.starters[i].addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
			this.starters[i].addEventListener('click', () => { 
				playSound('click1', 'ui');
				this.selectStarter(i)} 
			)
		})

		this.startButton = new Element(this.container, { className: 'new-game-start-button' }).element;
		this.startButton.addEventListener('click', () => this.close());
		this.startButton.addEventListener('mouseenter', () => { playSound('open', 'ui') })
	}

	update() {
		this.title.innerHTML = text.newGame.title[this.main.lang].toUpperCase();
		this.name.value.placeholder = this.main.player.name;
		this.portrait.style.backgroundImage = `url("./src/assets/images/portraits/${this.main.player.portrait}.png")`;
		this.startButton.innerText = text.newGame.start[this.main.lang].toUpperCase();
		this.selectStarter(this.starterSelected)
	}

	selectStarter(pos) {
		this.starterSelected = pos;
		this.starterName.innerText = STARTER[this.starterSelected].name[this.main.lang].toUpperCase();
		this.starterName.style.color = STARTER[this.starterSelected].color;

		this.starterDescription.innerText = STARTER[this.starterSelected].ability.description[this.main.lang].toUpperCase();
		this.starterDescription.style.color = STARTER[this.starterSelected].color;

		STARTER.forEach((starter, i) => {
			this.starters[i].style.filter = 'revert-layer';
			if (pos == i) this.starters[i].style.filter = `brightness(1) drop-shadow(0 0 4px ${starter.color})`;
		})
	}

	selectLanguage(pos) {
		this.languageSelected = pos;
		this.main.lang = pos;

		this.flags.forEach((flag, i) => {
			flag.style.filter = 'revert-layer';
			if (pos == i) flag.style.filter = `brightness(1) drop-shadow(1px 1px black)`;
		})

		if (pos == 6) document.body.style.fontFamily = 'PixelMPlus';
		else if (pos == 7) document.body.style.fontFamily = 'NGC';
		else if (pos == 8) document.body.style.fontFamily = 'NGC';
		else  document.body.style.fontFamily = 'PressStart2P';

		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.language = pos;
        window.localStorage.setItem("data", JSON.stringify(data));

        this.update();
        this.main.updateLanguage();
        playSound('hover2', 'ui');
	}

	changePortrait(dir) {
		let pos = this.main.player.portrait;
		pos += dir;

		if (pos < 0) pos = 19;
		else if (pos > 19) pos = 0

		this.main.player.portrait = pos;	

		this.update();
		this.main.UI.updatePlayer();
		playSound('option', 'ui');
	}

	changeName() {
		this.main.player.name = this.name.value.value;
		this.main.UI.updatePlayer();
	}

	saveProfile() {
		const data = JSON.parse(window.localStorage.getItem("data"));
        data.save.player.name = this.main.player.name;
        data.save.player.portrait = this.main.player.portrait;
        window.localStorage.setItem("data", JSON.stringify(data));
	}

	open() {
		super.open();
		this.update();
		this.selectLanguage(0);
		this.selectStarter(0);
		playMusic('intro');
	}

	close() {
		super.close();
		// 1 in 30 chance for shiny starter
		const isShiny = Math.random() < (1 / 30);
		this.main.team.addPokemon(new Pokemon(STARTER[this.starterSelected], 1, null, this.main, undefined, false, null, undefined, isShiny));
		this.main.shop.eggList.splice(this.starterSelected, 1);

		this.main.UI.update();
		this.saveProfile();
		saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
		
		this.main.tutorialScene.open();
		playSound('button2', 'ui');
		
	}
}
