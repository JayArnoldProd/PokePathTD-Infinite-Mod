import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { Input } from '../../utils/Input.js';
import { text } from '../../file/text.js';
import { playSound } from '../../file/audio.js';

import { achievementData } from '../data/achievementData.js';
import { pokemonData } from '../data/pokemonData.js';

export class ProfileScene extends GameScene {
	constructor(main) {
		super(520, 620);
		this.main = main;
		this.render();

		this.deleteRecord = new DeleteRecord(this.main);
	}

	render() {
		this.title.innerHTML = text.profile.title[this.main.lang].toUpperCase();

		this.playerContainer = new Element(this.container, { className: 'profile-player-container' }).element;

		this.portrait = new Element(this.playerContainer, { className: 'profile-scene-portrait' }).element;

		this.avatarPrev = new Element(this.playerContainer, { className: 'profile-scene-avatar-arrow-prev', text: '<' }).element;
		this.avatarNext = new Element(this.playerContainer, { className: 'profile-scene-avatar-arrow-next', text: '>' }).element;
		this.avatarPrev.addEventListener('click', () => { this.changePortrait(-1) });
		this.avatarNext.addEventListener('click', () => { this.changePortrait(1) });
		this.avatarPrev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.avatarNext.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.name = new Input(
			this.playerContainer, 
			"text", 
			{ 
				className: "profile-scene-name", 
				maxlength: 11, 
				cb: () => { this.changeName() } 
			}
		);

		this.achievementsContainer = new Element(this.container, { className: 'profile-scene-achievements-container' }).element;
		this.achievement = [];
		
		for (let i = 0; i < 32; i++) {
			this.achievement[i] = new Element(this.achievementsContainer, { className: 'profile-scene-achievement' }).element;
		}

		this.statsContainer = new Element(this.container, { className: 'profile-stats-container' }).element;
		this.stats = [];

		for (let i = 0; i < 21; i++) {
			this.stats[i] = new Element(this.statsContainer, { className: 'profile-stat' }).element;
		 	this.stats[i].label = new Element(this.stats[i], { className: 'profile-stat-label' }).element;
		 	this.stats[i].value = new Element(this.stats[i], { className: 'profile-stat-value' }).element;
		}

		this.stats[19].value.addEventListener('click', () => {this.deleteRecord.open(19)})
		this.stats[20].value.addEventListener('click', () => {this.deleteRecord.open(20)})

		this.achievement[12].addEventListener('click', () => {
			if (
				!this.main.player.secrets.luvdisc &&
				//!this.main.area.waveActive &&
				!this.main.area.inChallenge 
			) {
				this.main.player.secrets.luvdisc = true;
				this.main.UI.getSecret('luvdisc');
			}
		})

		this.achievement[19].addEventListener('click', () => {
			if (
				!this.main.player.secrets.luvdisc &&
				//!this.main.area.waveActive &&
				!this.main.area.inChallenge 
			) {
				this.main.player.secrets.luvdisc = true;
				this.main.UI.getSecret('luvdisc');
			}
		})

		this.background.addEventListener('click', (e) => { if (e.target == this.background) this.close() })
	}

	// ENDLESS MOD: Count unique Pokemon species owned (not duplicates)
	countUniqueSpecies() {
		const owned = new Set();
		
		// Count from team
		if (this.main.team?.pokemon) {
			this.main.team.pokemon.forEach(p => {
				if (p?.specie?.key) owned.add(p.specie.key);
				else if (p?.id !== undefined) owned.add(p.id);
			});
		}
		
		// Count from box
		if (this.main.box?.pokemon) {
			this.main.box.pokemon.forEach(p => {
				if (p?.specie?.key) owned.add(p.specie.key);
				else if (p?.id !== undefined) owned.add(p.id);
			});
		}
		
		return owned.size;
	}

	// ENDLESS MOD: Count total possible Pokemon species
	countTotalSpecies() {
		// Count base forms only (not evolutions that can't be obtained directly)
		// 103 is the vanilla egg pool size
		return 103;
	}

	// ENDLESS MOD: Count unique shiny species owned
	countUniqueShinySpecies() {
		const shinies = new Set();
		
		// Count from team
		if (this.main.team?.pokemon) {
			this.main.team.pokemon.forEach(p => {
				if (p?.isShiny) {
					if (p?.specie?.key) shinies.add(p.specie.key);
					else if (p?.id !== undefined) shinies.add(p.id);
				}
			});
		}
		
		// Count from box
		if (this.main.box?.pokemon) {
			this.main.box.pokemon.forEach(p => {
				if (p?.isShiny) {
					if (p?.specie?.key) shinies.add(p.specie.key);
					else if (p?.id !== undefined) shinies.add(p.id);
				}
			});
		}
		
		return shinies.size;
	}

	update() {
		this.title.innerHTML = text.profile.title[this.main.lang].toUpperCase();
		this.name.value.placeholder = this.main.player.name;
		this.portrait.style.backgroundImage = `url("./src/assets/images/portraits/${this.main.player.portrait}.png")`;

		this.achievement.forEach((achievement, i) => {
			this.achievement[i].style.backgroundImage = `url("${achievementData[i].image}")`;
			this.achievement[i].style.filter = (this.main.player.achievements[i].status) ? 'brightness(1)' : 'grayscale(1) brightness(0.5)';
			this.main.tooltip.bindTo(this.achievement[i], achievementData[i]);
		})

		for (let i = 0; i < 21; i++) {
		 	this.stats[i].label.innerText = text.profile.stats[i][this.main.lang].toUpperCase();
		}

		// ENDLESS MOD: Updated stats display
		this.stats[0].value.innerText = this.main.utility.minutsToTime(this.main.player.stats.timePlayed);
		
		// Stars: No cap in endless mode
		this.stats[1].value.innerText = `${this.main.utility.numberDot(this.main.player.stars, this.main.lang)}`;
		
		// Pokemon Owned: Show unique species collected / total possible
		const uniqueOwned = this.countUniqueSpecies();
		const totalSpecies = this.countTotalSpecies();
		this.stats[2].value.innerText = `${uniqueOwned}/${totalSpecies}`;
		
		// Shiny Pokemon: Show unique shiny species / total possible
		const uniqueShinies = this.countUniqueShinySpecies();
		this.stats[3].value.innerText = `${uniqueShinies}/${totalSpecies}`;
		
		// Highest Level: Just show the level (no /100 cap)
		this.stats[4].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.highestPokemonLevel, this.main.lang)}`;
		
		// Total Levels: Just show the total (no max cap)
		this.stats[5].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.totalPokemonLevel, this.main.lang)}`;
		
		this.stats[6].value.innerText = `$${this.main.utility.numberDot(this.main.player.stats.totalGold, this.main.lang)}`;
		this.stats[7].value.innerText = `${this.main.player.itemAmount}/91`;
		this.stats[8].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.wavesCompleted, this.main.lang)}`;
		this.stats[9].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.highestHit, this.main.lang)}`;
		this.stats[10].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.defeatedEnemies, this.main.lang)}`;
		this.stats[11].value.innerText = `${this.main.player.stats.defeatedSpecies.size}/127`;
		this.stats[12].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedStuns, this.main.lang)}`;
		this.stats[13].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedSlows, this.main.lang)}`;
		this.stats[14].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedBurns, this.main.lang)}`;
		this.stats[15].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedPoisons, this.main.lang)}`;
		this.stats[16].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedCurses, this.main.lang)}`;
		this.stats[17].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.resets, this.main.lang)}`;
		this.stats[18].value.innerText = `$${this.main.utility.numberDot(this.main.player.achievementProgress.stolenGold, this.main.lang)}`;
		this.stats[19].value.innerText = (this.main.player.stats.maxGoldPerWave[1] == null) ? `$0` : 
			`(${this.main.player.stats.maxGoldPerWave[1]}) $${this.main.utility.numberDot(this.main.player.stats.maxGoldPerWave[0], this.main.lang)}`
		this.stats[20].value.innerText = (this.main.player.stats.maxGoldPerTime[1] == null) ? `$0/s` : 
			`(${this.main.player.stats.maxGoldPerTime[1]}) $${this.main.utility.numberDot(this.main.player.stats.maxGoldPerTime[0], this.main.lang)}/s`
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
	}

	close() {
		this.main.tooltip.hide();
		super.close();
		this.saveProfile();
	}
}

export class DeleteRecord extends GameScene {
	constructor(main) {
		super(400, 130);
		this.main = main;
		this.stat;

		this.header.removeChild(this.closeButton);
		this.render();
	}

	render() {
		this.prompt = new Element(this.container, { className: 'defeat-scene-prompt' }).element;
		
		this.yesButton = new Element(this.container, { className: 'delete-scene-yes-button' }).element;
		this.noButton = new Element(this.container, { className: 'delete-scene-no-button' }).element;

		this.yesButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })
		this.noButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })

		this.noButton.addEventListener('click', () => this.close());
		this.yesButton.addEventListener('click', () => {
			if (this.stat == 19) this.main.player.stats.maxGoldPerWave =  [0, null];
			if (this.stat == 20) this.main.player.stats.maxGoldPerTime =  [0, null];
			
			this.main.profileScene.update();
			this.close();
		})
	}

	update() {
		this.title.innerHTML = text.profile.stats[this.stat][this.main.lang].toUpperCase();
		this.prompt.innerHTML = text.profile.delete[this.main.lang].toUpperCase();;
		this.yesButton.innerText = text.menu.data.delete[this.main.lang].toUpperCase();
		this.noButton.innerText = text.menu.data.cancel[this.main.lang].toUpperCase();
	}

	open(i) {
		super.open();
		this.stat = i;
		this.update();
	}
}
