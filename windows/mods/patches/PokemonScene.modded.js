import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { playSound } from '../../file/audio.js';
import { pokemonData } from '../data/pokemonData.js';
import { Input } from '../../utils/Input.js';
import { ChangePokemonName } from './ChangePokemonName.js';

const DATA = [
	'power', 'speed', 'critical', 'range', 'rangeType', 'terrain', 'attackType'
]

const TERRAINS = {
	1: ['Field', 'Campo', 'Champ', 'Campo', 'Campo', 'Feld', '野原', '들판', '野原', 'Pole'],
	2: ['Grass', 'Hierba', 'Herbe', 'Grama', 'Erba', 'Gras', '草', '풀', '草', 'Trawa'],
	3: ['Water', 'Agua', 'Eau', 'Água', 'Acqua', 'Wasser', '水', '물', '水', 'Woda'],
	4: ['Mountain', 'Montaña', 'Montagne', 'Montanha', 'Montagna', 'Berg', '山', '산', '山', 'Góry'],
	5: ['All', 'Todo', 'Tout', 'Tudo', 'Tutto', 'Alle', 'すべて', '모두', '全部', 'Wszystkie']
}

const TARGET_MODES = [
	'first', 'last', 'highHP', 'lowHP', 'highArmor', 'noArmor', 'faster', 'slower', 'poisoned', 'notPoisoned',
	'burned', 'notBurned', 'stuned', 'notStuned', 'slowed', 'notSlowed', 'cursed', 'curseable', 'nightmared', 'random', 'invisible',
	//'highTotal', 'lowTotal',
]

const TARGET_MODES_TRADUCTIONS = {
	area: ['Area', 'Área', 'Zone', 'Área', 'Area', 'Fläche', 'エリア', '지역', '区域', 'Obszar'],
	aura: ['Aura', 'Aura', 'Aura', 'Aura', 'Aura', 'Aura', 'オーラ', '오라', '气场', 'Aura'],
	bombardment: ['Bombardment', 'Bombardeo', 'Bombardement', 'Bombardeio', 'Bombardamento', 'Bombardement', 'じゅうたん爆撃', '융단폭격', '轰炸', 'Bombardowanie'],
	allies: ['Aura', 'Aura', 'Aura', 'Aura', 'Aura', 'Aura', 'オーラ', '오라', '气场', 'Aura'],
	orbital: ['Orbital', 'Orbital', 'Orbitale', 'Orbital', 'Orbitale', 'Orbital', '軌道', '궤도', '軌道', 'Orbital'],
	available: ['Available', 'Disponibles', 'Disponibles', 'Disponíveis', 'Disponibili', 'Verfügbar', '利用可能', '이용 가능', '可用', 'Dostępne'],

	first: ['First', 'Primero', 'Premier', 'Primeiro', 'Primo', 'Erster', '最初', '첫 번째', '第一个', 'Pierwszy'],
	last: ['Last', 'Último', 'Dernier', 'Último', 'Ultimo', 'Letzter', '最後', '마지막', '最后一个', 'Ostatni'],

	faster: ['Faster', 'Más rápido', 'Plus rapide', 'Mais rápido', 'Più veloce', 'Schneller', 'より速い', '더 빠름', '更快', 'Szybszy'],
	slower: ['Slower', 'Más lento', 'Plus lent', 'Mais lento', 'Più lento', 'Langsamer', 'より遅い', '더 느림', '更慢', 'Wolniejszy'],

	highArmor: ['High Armor', 'Más armadura', 'Haute armure', 'Mais armadura', 'Alta armatura', 'Hohe Rüstung', '高防御', '높은 방어', '高护甲', 'Wysoki Pancerz'],
	noArmor: ['No Armor', 'Sin armadura', 'Pas d’armure', 'Sem armadura', 'Senza armatura', 'Keine Rüstung', '無防御', '방어 없음', '无护甲', 'Bez Pancerza'],

	highHP: ['High HP', 'Mas PS', 'Le plus de PV', 'HP alto', 'Alta salute', 'Hohe KP', '高HP', '높은 HP', '高生命值', 'Wysokie HP'],
	lowHP: ['Low HP', 'Menos PS', 'Le moins de PV', 'HP baixo', 'Bassa salute', 'Niedrige KP', '低HP', '낮은 HP', '低生命值', "Niskie HP"],

	poisoned: ['Poisoned', 'Envenenado', 'Empoisonné', 'Envenenado', 'Avvelenato', 'Vergiftet', '毒状態', '독 중독', '中毒', 'Zatruty'],
	notPoisoned: ['Not Poisoned', 'No envenenado', 'Non empoisonné', 'Não envenenado', 'Non avvelenato', 'Nicht vergiftet', '未毒', '비중독', '未中毒', 'Nie Zatruty'],

	burned: ['Burned', 'Quemado', 'Brulé', 'Queimado', 'Scottato', 'Verbrannt', '火傷', '화상', '灼伤', 'Oparzony'],
	notBurned: ['Not Burned', 'No quemado', 'Non brulé', 'Não queimado', 'Non scottato', 'Nicht verbrannt', '未火傷', '비화상', '未灼伤', 'Nie Oparzony'],

	stuned: ['Stunned', 'Aturdido', 'Étourdi', 'Atordoado', 'Stordito', 'Betäubt', '気絶', '기절', '眩晕', 'Ogłuszony'],
	notStuned: ['Not Stunned', 'No aturdido', 'Non étourdí', 'Não atordoado', 'Non stordito', 'Nicht betäubt', '未気絶', '비기절', '未眩晕', 'Nie Ogłuszony'],

	slowed: ['Slowed', 'Ralentizado', 'Ralenti', 'Lento', 'Rallentato', 'Verlangsamt', '減速', '감속', '减速', 'Spowolniony'],
	notSlowed: ['Not Slowed', 'No ralentizado', 'Non ralenti', 'Não lento', 'Non rallentato', 'Nicht verlangsamt', '未減速', '비감속', '未减速', 'Nie Spowolniony'],

	cursed: ["Cursed", "Maldito", "Maudit", "Amaldiçoado", "Maledetto", "Verflucht", "呪われた", "저주받은", "被诅咒的", "Przeklęty"],
	curseable: ['Curseable', 'Maldecible', 'Maudissable', 'Amaldiçoável', 'Maledicibile', 'Verfluchbar', '呪われ得る', '저주 가능', '可被诅咒', 'Możliwy do Przeklęcia'],

	nightmared: ["Nightmare'd", "Con pesadilla", "Cauchemarde", "Com pesadelo", "Con incubo", "Mit Albtraum", "悪夢を伴う", "악몽을 동반한", "带着噩梦的", "Ma Koszmar"],

	random: ['Random', 'Aleatorio', 'Aléatoire', 'Aleatório', 'Casuale', 'Zufällig', 'ランダム', '무작위', '随机', 'Losowy'],
	invisible: ['Invisible', 'Invisible', 'Invisible', 'Invisível', 'Invisibile', 'Unsichtbar', '透明', '투명', '隐形', 'Niewidzialny']
}

export class PokemonScene extends GameScene {
	constructor(main) {
		super(560, 550);
		this.main = main;

		this.pos;
		this.pokemon;
		this.boxArray;

		this.render();
		this.nameChange = new ChangePokemonName(this.main);
		this.itemWindow = new ItemWindow(this.main);
		this.isBlocked = false;
	}

	setBlocked(flag) {
		this.isBlocked = !!flag;

		if (this.container) {
			this.container.style.pointerEvents = this.isBlocked ? 'none' : 'revert-layer';
			this.container.style.filter = this.isBlocked ? 'grayscale(60%) brightness(0.95)' : 'revert-layer';
			this.container.querySelectorAll('button, a, [tabindex], input, [role="button"]').forEach(el => {
				if (this.isBlocked) {
					if (el.hasAttribute('tabindex')) el.setAttribute('data-prev-tabindex', el.getAttribute('tabindex'));
					el.setAttribute('tabindex', '-1');
				} else {
					if (el.hasAttribute('data-prev-tabindex')) {
						el.setAttribute('tabindex', el.getAttribute('data-prev-tabindex'));
						el.removeAttribute('data-prev-tabindex');
					} else {
						el.removeAttribute('tabindex');
					}
				}
			});
		}

		if (this.background) this.background.style.pointerEvents = 'revert-layer';
		if (this.closeButton) {
			this.closeButton.style.pointerEvents = 'revert-layer';
			this.closeButton.style.filter = 'revert-layer';
		}
	}

	render() {
		this.title.innerHTML = text.pokemon.title[this.main.lang].toUpperCase();

		this.name = new Element(this.container, { className: 'pokemon-scene-name' }).element;
		this.name.addEventListener('click', () => { this.nameChange.open(this.pokemon); })

		this.arrowPrev = new Element(this.container, { className: 'pokemon-scene-arrow-prev', text: '<' }).element;
		this.arrowNext = new Element(this.container, { className: 'pokemon-scene-arrow-next', text: '>' }).element;

		this.arrowPrev.addEventListener('click', () => { this.changePokemon(-1) })
		this.arrowNext.addEventListener('click', () => { this.changePokemon(1) })
		this.arrowPrev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.arrowNext.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.dataContainer = new Element(this.container, { className: 'pokemon-scene-data-container' }).element;
		this.data = [];

		DATA.forEach(data => {
			this.data[data] = new Element(this.dataContainer, { className: 'pokemon-scene-data' }).element;
			this.data[data].label = new Element(this.data[data], { className: 'pokemon-scene-data-label', text: text.pokemon[data][this.main.lang] }).element;
			if (data != 'attackType') this.data[data].value = new Element(this.data[data], { className: 'pokemon-scene-data-value' }).element;
			else {
				this.data[data].left = new Element(this.data[data], { className: 'pokemon-scene-data-arrow-at', text: '<' }).element;
				this.data[data].value = new Element(this.data[data], { className: 'pokemon-scene-data-value-at' }).element;
				this.data[data].right = new Element(this.data[data], { className: 'pokemon-scene-data-arrow-at', text: '>' }).element;

				this.data[data].left.addEventListener('click', () => { this.changeAttackType(-1) })
				this.data[data].right.addEventListener('click', () => { this.changeAttackType(1) })
				this.data[data].left.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
				this.data[data].right.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
			}
		})

		this.abilityContainer = new Element(this.container, { className: 'pokemon-scene-ability-container' }).element;
		this.abilityName = new Element(this.abilityContainer, { className: 'pokemon-scene-ability-name' }).element;
		this.abilityDescription = new Element(this.abilityContainer, { className: 'pokemon-scene-ability-description' }).element;

		this.itemContainer = new Element(this.container, { className: 'pokemon-scene-item-container' }).element;
		this.itemName = new Element(this.itemContainer, { className: 'pokemon-scene-item-name' }).element;
		this.itemDescription = new Element(this.itemContainer, { className: 'pokemon-scene-item-description' }).element;
		this.itemIcon = new Element(this.itemContainer, { className: 'pokemon-scene-item-icon' }).element;
		this.itemIcon.addEventListener('click' , () => { if (!this.isBlocked) this.itemWindow.open(this.pokemon); });

		this.favoriteItemButton = new Element(this.itemContainer, { className: 'pokemon-scene-favorite-item-button', text: '⭐' }).element;
		this.favoriteItemButton.addEventListener('click', () => {
			playSound('hover2', 'ui')
			//this.toggleFavorite();
		})

		this.favoriteItemButton.addEventListener('click', () => {
			if (!this.pokemon.item) return;

		    this.main.player.toggleFavoriteItem(
		        this.pokemon.specie.id,
		        this.pokemon.item.id
		    );

		    this.update();
		})

		this.levelUpContainer = new Element(this.container, { className: 'pokemon-scene-level-up-container' }).element;
		this.levelUp = new Element(this.levelUpContainer, { className: 'pokemon-scene-level-up' }).element;
		this.levelUp.addEventListener('click', () => {
			// Only shiny Pokemon can level past 100
			if (this.pokemon.lvl >= 100 && !this.pokemon.isShiny) return;
			if (this.main.player.gold >= this.pokemon.cost) {
				this.main.player.changeGold(-this.pokemon.cost);
				this.pokemon.levelUp();
				this.main.UI.updatePokemon();
				this.update();
				this.showLevelUpEffect();
				playSound('obtain', 'ui');
				if (this.main.boxScene.isOpen) this.main.boxScene.update();
			}
		})

		this.levelUpFive = new Element(this.levelUpContainer, { className: 'pokemon-scene-level-up' }).element;
		this.levelUpFive.addEventListener('click', () => {
			// Only shiny Pokemon can level past 100 (x5 would push past 100)
			if (this.pokemon.lvl + 5 > 100 && !this.pokemon.isShiny) return;
			if (this.main.player.gold >= this.pokemon.checkCost(5)) {
				this.main.player.changeGold(-this.pokemon.checkCost(5));
				for (let i = 0; i < 5; i++) this.pokemon.levelUp();
				this.main.UI.updatePokemon();
				this.update();
				this.showLevelUpEffect(5);
				if (this.main.boxScene.isOpen) this.main.boxScene.update();
				playSound('obtain', 'ui');
			}
		})

		this.levelUpTen = new Element(this.levelUpContainer, { className: 'pokemon-scene-level-up' }).element;
		this.levelUpTen.addEventListener('click', () => {
			// Only shiny Pokemon can level past 100 (x10 would push past 100)
			if (this.pokemon.lvl + 10 > 100 && !this.pokemon.isShiny) return;
			if (this.main.player.gold >= this.pokemon.checkCost(10)) {
				this.main.player.changeGold(-this.pokemon.checkCost(10));
				for (let i = 0; i < 10; i++) this.pokemon.levelUp();
				this.main.UI.updatePokemon();
				this.update();
				this.showLevelUpEffect(10);
				if (this.main.boxScene.isOpen) this.main.boxScene.update();
				playSound('obtain', 'ui');
			}
		})

		this.levelUp.addEventListener('mouseover', () => {
			playSound('hover2', 'ui');
			this.showLevelUpEffect()
		})

		this.levelUpFive.addEventListener('mouseover', () => {
			playSound('hover2', 'ui');
			this.showLevelUpEffect(5)
		})

		this.levelUpTen.addEventListener('mouseover', () => {
			playSound('hover2', 'ui');
			this.showLevelUpEffect(10)
		})

		this.levelUp.addEventListener('mouseleave', () => { this.update(); })
		this.levelUpFive.addEventListener('mouseleave', () => { this.update(); })
		this.levelUpTen.addEventListener('mouseleave', () => { this.update(); })

		this.buttonDNA = new Element(this.container, { className: 'pokemon-scene-button-dna' }).element;
		this.buttonDNA.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })
		this.buttonDNA.addEventListener('click', () => {
			const pokemon = this.main.team.pokemon[0];
			if (!this.pokemon.isDeployed) {
				playSound('teleport', 'effect')

				this.main.team.pokemon.splice(0, 1);
				this.main.team.pokemon.push(pokemon);

				if ([58, 59, 63, 64, 65, 66, 94, 140, 136, 151].includes(this.pokemon.adn.id)) this.main.player.fossilInTeam--;
				if ([179].includes(this.pokemon.adn.id)) this.main.player.pastInTeam--;
				if ([178].includes(this.pokemon.adn.id)) this.main.player.futureInTeam--;
				this.pokemon.adn = this.main.team.pokemon[0].specie;
				if ([58, 59, 63, 64, 65, 66, 94, 140, 136, 151].includes(this.pokemon.adn.id)) this.main.player.fossilInTeam++;
				if ([179].includes(this.pokemon.adn.id)) this.main.player.pastInTeam++;
				if ([178].includes(this.pokemon.adn.id)) this.main.player.futureInTeam++;
				const oldTarget = this.pokemon.targetMode;
				this.pokemon.transformADN(oldTarget);
				this.main.UI.updatePokemon();
				this.update();
			}
		})

		this.buttonChangeForm = new Element(this.container, { className: 'pokemon-scene-button-dna' }).element;
		this.buttonChangeForm.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })
		this.buttonChangeForm.addEventListener('click', () => {
			playSound('teleport', 'effect')

			const specieKey = this.pokemon?.specie?.key;
			switch (this.pokemon.id) {
				case 76:
					if (this.pokemon.ability.id == "toughClawsDay") this.pokemon.updateSpecie('lycanrocNight');
					else this.pokemon.updateSpecie('lycanrocDay');
					break;
				case 80:
					if (specieKey == 'aegislash' || this.pokemon.ability.id == 'slow') {
						this.pokemon.updateSpecie('aegislashSword');
						this.pokemon.targetMode = 'first';
						this.pokemon.changeTargetMode(TARGET_MODES[0]);
						if (['softSand', 'ancientShield'].includes(this.pokemon?.item?.id)) this.pokemon.retireItem();
					}
					else {
						this.pokemon.updateSpecie('aegislash');
						this.pokemon.targetMode = 'area';
						this.data['attackType'].style.pointerEvents = 'none';
						this.data['attackType'].style.opacity = '80%';
						if (['sniperScope', 'silphScope', 'bicycle', 'amuletCoin', 'ancientSword'].includes(this.pokemon?.item?.id)) this.pokemon.retireItem();
					}
					break;
				default:
					if (specieKey == 'aegislash' || specieKey == 'aegislashSword') {
						if (specieKey == 'aegislash') {
							this.pokemon.updateSpecie('aegislashSword');
							this.pokemon.targetMode = 'first';
							this.pokemon.changeTargetMode(TARGET_MODES[0]);
							if (['softSand', 'ancientShield'].includes(this.pokemon?.item?.id)) this.pokemon.retireItem();
						} else {
							this.pokemon.updateSpecie('aegislash');
							this.pokemon.targetMode = 'area';
							this.data['attackType'].style.pointerEvents = 'none';
							this.data['attackType'].style.opacity = '80%';
							if (['sniperScope', 'silphScope', 'bicycle', 'amuletCoin', 'ancientSword'].includes(this.pokemon?.item?.id)) this.pokemon.retireItem();
						}
					}
					break;
				case 163:
					if (this.pokemon.specie.key == "jellicentF") this.pokemon.updateSpecie('jellicentM');
					else if (this.pokemon.specie.key == "jellicentM") this.pokemon.updateSpecie('jellicentF');
					else if (this.pokemon.specie.key == "frillishF") this.pokemon.updateSpecie('frillishM');
					else if (this.pokemon.specie.key == "frillishM") this.pokemon.updateSpecie('frillishF');
					break;
			}

			this.main.UI.updatePokemon();
			this.update();
		})

		this.evolutionSprite = new Element(this.container, { className: 'pokemon-scene-evolution-sprite' }).element;
		this.evolutionLevel = new Element(this.evolutionSprite, { className: 'pokemon-scene-evolution-level' }).element;

		this.resetLevelButton = new Element(this.container, { className: 'pokemon-scene-reset-sprite' }).element;
		this.resetLevel = new Element(this.resetLevelButton, { className: 'pokemon-scene-evolution-level' }).element;
		this.resetLevelButton.addEventListener('click', () => {
			this.pokemon.resetPokemon();
			this.main.UI.updatePokemon();
			this.update();
			playSound('obtain', 'ui');
			if (this.main.boxScene.isOpen) this.main.boxScene.update();
		})

		this.skinContainer = new Element(this.container, { className: 'pokemon-scene-skin-container' }).element;
		this.skinSlot = [];

		for (let i = 0; i < 3; i++) {
			this.skinSlot[i] = new Element(this.skinContainer, { className: 'pokemon-scene-skin-slot' }).element;
			this.skinSlot[i].addEventListener('click', () => { this.changeSkin(i) })
		}

		this.background.addEventListener('click', (e) => { if (e.target == this.background)this.close() });

		this.extraContainer = new Element(this.container, { className: 'pokemon-scene-extra-container' }).element;
		this.extraContainerTitle = new Element(this.extraContainer, { className: 'pokemon-scene-extra-title' }).element;
		this.extraContainerDescription = new Element(this.extraContainer, { className: 'pokemon-scene-extra-description' }).element;
		this.extraContainerButton = new Element(this.extraContainer, { className: 'pokemon-scene-extra-button' }).element;
		this.extraContainerButton.addEventListener('click', () => {
			playSound('option', 'ui');
			this.pokemon.extra = !this.pokemon.extra;
			this.update();
		})
	}

	update() {
		this.setBlocked(this.isBlocked);
		DATA.forEach(data => { this.data[data].label.innerText = text.pokemon[data][this.main.lang] });
		this.data['speed'].label.innerText = this.pokemon?.attackType === 'orbital'
			? (text.pokemon.orbitalSpeed?.[this.main.lang] ?? 'Orbital Speed')
			: text.pokemon.speed[this.main.lang];

		if (this.pokemon?.item?.id == 'inverter' && this.pokemon?.ability?.id != 'defiant') {
			this.window.style.transform = `translate(-50%, -50%) scale(1, -1)`;
		} else {
			this.window.style.transform = `revert-layer`;
		}

		this.extraContainer.style.display = 'none';
		this.title.innerHTML = text.pokemon.title[this.main.lang].toUpperCase();

		if (!this.main.area.inChallenge.lvlCap) this.name.innerHTML = (this.pokemon.alias != undefined) ? `${this.pokemon.alias.toUpperCase()} [${this.pokemon.lvl}]` : `${this.pokemon.name[this.main.lang].toUpperCase()} [${this.pokemon.lvl}]`;
		else {
			const displayLvl = Math.min(this.pokemon.lvl, this.main.area.inChallenge.lvlCap);
			this.name.innerHTML = (this.pokemon.alias != undefined) ? `${this.pokemon.alias.toUpperCase()} [${displayLvl}]` : `${this.pokemon.name[this.main.lang].toUpperCase()} [${displayLvl}]`;
		}

		this.data['power'].value.innerHTML = this.formatPanelStat(this.pokemon.power);
		this.data['speed'].value.innerHTML = this.formatSpeedValue(this.pokemon);
		this.data['critical'].value.innerHTML = `${this.pokemon.critical.toFixed(1)}%`;
		this.data['range'].value.innerHTML = `${this.pokemon.range}`;
		this.data['rangeType'].value.innerHTML = `${text.pokemon[this.pokemon.rangeType][this.main.lang]}`;
		this.data['attackType'].value.innerHTML = `${TARGET_MODES_TRADUCTIONS[this.pokemon.targetMode][this.main.lang]}`;

		let lang = this.main.lang;
        if (this.pokemon.ability.name.length <= lang) lang = 0;

		this.abilityName.innerHTML = this.pokemon.ability.name[lang].toUpperCase() ?? 'error';
		this.abilityDescription.innerHTML = this.pokemon.ability.description[lang] ?? 'error';

		if (this.pokemon.id == 64 || this.pokemon?.adn?.id == 64) {
			this.abilityDescription.innerHTML += `<br><br> * ${text.pokemon.current[this.main.lang]} +${this.main.player.fossilInTeam} ${text.pokemon.projectiles[this.main.lang]}`;
		} else if (
			this.pokemon.id == 97 || this.pokemon?.adn?.id == 97 ||
			this.pokemon.id == 2 || this.pokemon?.adn?.id == 2 ||
			this.pokemon.id == 45 || this.pokemon?.adn?.id == 45 ||
			this.pokemon.id == 72 || this.pokemon?.adn?.id == 72) {
			this.abilityDescription.innerHTML += `<br><br> * ${this.pokemon.ricochet} ${text.pokemon.ricochets[this.main.lang]}`;
		} else if (
			this.pokemon?.orbital) {
			this.abilityDescription.innerHTML += `<br><br> * ${this.pokemon.orbital} ${text.pokemon.orbitals[this.main.lang]}`;
		} else if (this.pokemon?.adn?.id == 19 || this.pokemon?.adn?.id == 57) {
			this.abilityDescription.innerHTML += `<br><br> * ${text.pokemon.notStack[this.main.lang]}`;
		}

		this.data['terrain'].value.innerHTML = "";
		if (this.pokemon.tiles.length == 4) this.data['terrain'].value.innerHTML = TERRAINS[5][this.main.lang];
		else {
			this.pokemon.tiles.forEach((tile, i) => {
				this.data['terrain'].value.innerHTML += `${TERRAINS[tile][this.main.lang]}`
				if (this.pokemon.tiles.length > i + 1) this.data['terrain'].value.innerHTML += `, `
			})
		}

		this.name.style.borderColor = this.pokemon.specie.color;
		this.name.style.color = this.pokemon.specie.color;
		this.abilityDescription.style.color = this.pokemon.specie.color;
		this.arrowPrev.style.color = this.pokemon.specie.color;
		this.arrowNext.style.color = this.pokemon.specie.color;

		this.updateLevelButton();

		if (this.pokemon.targetMode == 'area' || this.pokemon.targetMode == 'aura' ||
			this.pokemon.targetMode == 'allies' || this.pokemon.targetMode == 'bombardment' ||
			//(this.pokemon.targetMode == 'available' && this.pokemon?.item?.id != 'choiceScarf') ||
			(this.pokemon.ability.id == 'spinda' && this.pokemon?.item?.id != 'ringTarget')
		) {
			this.data['attackType'].style.pointerEvents = 'none';
			this.data['attackType'].style.opacity = '80%';
		} else {
			this.data['attackType'].style.pointerEvents = 'revert-layer';
			this.data['attackType'].style.opacity = 'revert-layer';
		}

		if (
			(this.pokemon.ability.id == 'spinda' && this.pokemon?.item?.id != 'ringTarget') ||
			(this.pokemon?.item?.id == 'spindaCocktail' && this.pokemon.ability.id != 'defiant')
		) {
			this.data['attackType'].style.pointerEvents = 'none';
			this.data['attackType'].style.opacity = '80%';
			this.pokemon.changeTargetMode(TARGET_MODES[19]);
			this.data['attackType'].value.innerHTML = `${TARGET_MODES_TRADUCTIONS[this.pokemon.targetMode][this.main.lang]}`;
		}

		if (
			this.pokemon?.item?.id == 'silphScope' && this.pokemon.id != 53
		) {
			this.pokemon.changeTargetMode(TARGET_MODES[20]);
			this.data['attackType'].value.innerHTML = `${TARGET_MODES_TRADUCTIONS[this.pokemon.targetMode][this.main.lang]}`;
		} else if (
			this.pokemon?.item?.id != 'silphScope' && this.pokemon.targetMode == 'invisible' && this.pokemon.ability.id != 'frisk' && this.pokemon.ability.id != 'vigilantFrisk' && this.pokemon.ability.id != 'illuminate' && this.pokemon.ability.id != 'illuminateBuff'
		) {
			this.pokemon.changeTargetMode(TARGET_MODES[0]);
			this.data['attackType'].value.innerHTML = `${TARGET_MODES_TRADUCTIONS[this.pokemon.targetMode][this.main.lang]}`;
		}

		if (this.pokemon?.item?.id == 'quickClaw' && this.pokemon?.attackType != 'area') {
			this.data['attackType'].style.pointerEvents = 'none';
			this.data['attackType'].style.opacity = '80%';
			this.pokemon.changeTargetMode(TARGET_MODES[6]);
			this.data['attackType'].value.innerHTML = `${TARGET_MODES_TRADUCTIONS[this.pokemon.targetMode][this.main.lang]}`;
		}

		if (this.pokemon.specie.key == 'cryogonal') {
			if (this.pokemon?.item?.id == 'condensedBlizzard') this.data['rangeType'].value.innerHTML = `${text.pokemon['circle'][this.main.lang]}`;
			else this.data['rangeType'].value.innerHTML = `${text.pokemon[this.pokemon.rangeType][this.main.lang]}`;
		}

		if (this.pokemon.specie.evolution != undefined && this.pokemon.id != 70) {
			this.evolutionSprite.style.display = 'block';
			if (this.pokemon.id != 76) this.evolutionSprite.style.backgroundImage = `url("${pokemonData[this.pokemon.specie.evolution.pokemon].sprite.base}")`;
			else {
				if (this.main.utility.isBetweenHours(8, 18)) this.evolutionSprite.style.backgroundImage = `url("${pokemonData['lycanrocDay'].sprite.base}")`;
				else this.evolutionSprite.style.backgroundImage = `url("${pokemonData['lycanrocNight'].sprite.base}")`;
			}
			this.evolutionLevel.innerHTML = `Lv ${this.pokemon.specie.evolution.level}`;
		} else this.evolutionSprite.style.display = 'none';

		if (this.pokemon.lvl == 100 && this.main.player.hasCocktail) {
			this.resetLevelButton.style.display = 'block';
			this.resetLevelButton.style.backgroundImage = `url("./src/assets/images/items/mitsues_cocktail.png")`;
			this.resetLevel.innerHTML = 'Reset';
		} else this.resetLevelButton.style.display = 'none';

		if (this.pokemon.id == 70 && !this.main.boxScene.isOpen) {
			this.buttonDNA.style.display = 'block';
			this.buttonDNA.style.backgroundImage = `url("${this.pokemon.adn.sprite.base}")`;
			if (this.pokemon.isDeployed) {
				this.buttonDNA.style.pointerEvents = 'none';
				this.buttonDNA.style.filter = 'brightness(0.8)';
			} else {
				this.buttonDNA.style.pointerEvents = 'revert-layer';
				this.buttonDNA.style.filter = 'revert-layer';
			}
		} else this.buttonDNA.style.display = 'none';

		if (
			(this.pokemon.id == 76 && this.pokemon.lvl >= 100) ||
			(this.pokemon.specie.key == 'aegislash' || this.pokemon.specie.key == 'aegislashSword') ||
			(this.pokemon.id == 109  && this.pokemon.lvl >= 40) ||
			this.pokemon.id == 163
		) {
			this.buttonChangeForm.style.display = 'block';

			if (this.pokemon.id == 76) {
				this.buttonChangeForm.style.backgroundImage = (this.pokemon.ability.id == "toughClawsDay") ?
				`url("${pokemonData['lycanrocDay'].sprite.base}")` : `url("${pokemonData['lycanrocNight'].sprite.base}")`
			} else if (this.pokemon.id == 80 || this.pokemon.specie.key == 'aegislash' || this.pokemon.specie.key == 'aegislashSword') {
				this.buttonChangeForm.style.backgroundImage = (this.pokemon.specie.key == 'aegislash' || this.pokemon.ability.id == 'slow') ?
				`url("${pokemonData['aegislash'].sprite.base}")` : `url("${pokemonData['aegislashSword'].sprite.base}")`
			} else if (this.pokemon.id == 109) {
				this.buttonChangeForm.style.backgroundImage = (this.pokemon.specie.key == "armarouge") ?
				`url("${pokemonData['armarouge'].sprite.base}")` : `url("${pokemonData['ceruledge'].sprite.base}")`
			} else if (this.pokemon.id == 163) {
				if (this.pokemon.specie.key == 'frillishF') this.buttonChangeForm.style.backgroundImage = `url("${pokemonData['frillishM'].sprite.base}")`;
				if (this.pokemon.specie.key == 'frillishM') this.buttonChangeForm.style.backgroundImage = `url("${pokemonData['frillishF'].sprite.base}")`;
				if (this.pokemon.specie.key == 'jellicentF') this.buttonChangeForm.style.backgroundImage = `url("${pokemonData['jellicentM'].sprite.base}")`;
				if (this.pokemon.specie.key == 'jellicentM') this.buttonChangeForm.style.backgroundImage = `url("${pokemonData['jellicentF'].sprite.base}")`;
			}

			const allowDeployedFormSwitch = this.pokemon.specie.key == 'aegislash' || this.pokemon.specie.key == 'aegislashSword';
			if (this.pokemon.isDeployed && !allowDeployedFormSwitch) {
				this.buttonChangeForm.style.pointerEvents = 'none';
				this.buttonChangeForm.style.filter = 'brightness(0.8)';
			} else {
				this.buttonChangeForm.style.pointerEvents = 'all';
				this.buttonChangeForm.style.cursor = 'pointer';
				this.buttonChangeForm.style.filter = 'revert-layer';
			}
		} else this.buttonChangeForm.style.display = 'none';

		if (this.itemWindow.isOpen) this.itemWindow.close();
		this.updateItem();
		this.updateStatsChanges();
		this.displaySkins();
		this.checkExtraScenes();
	}

	updateItem() {
		if (this.pokemon.item == undefined) {
			this.itemName.innerHTML = text.pokemon.noItem[this.main.lang].toUpperCase();
			this.itemDescription.innerHTML = text.pokemon.noItemDescription[this.main.lang];
			this.itemIcon.innerHTML = '+';
			this.itemIcon.style.backgroundImage = "";
			this.favoriteItemButton.style.display = 'none';
		} else {
			let lang = this.main.lang;
		if (this.pokemon.item.name.length <= lang) lang = 0;

			this.itemName.innerHTML = this.pokemon.item.name[lang].toUpperCase();
			this.itemDescription.innerHTML = this.pokemon.item.description[lang];
			this.itemIcon.innerHTML = '';
			this.itemIcon.style.backgroundImage = `url("${this.pokemon.item.sprite}")`;
			this.favoriteItemButton.style.display = 'revert-layer';

			if (this.main.player.isFavoriteItem(this.pokemon.specie.id, this.pokemon.item.id)) {
				this.favoriteItemButton.style.filter = 'revert-layer';
			} else {
				this.favoriteItemButton.style.filter = 'grayscale(100%)';
			}
		}

		if (this.pokemon.isDeployed && ['silphScope', 'airBalloon', 'heavyDutyBoots', 'dampMulch', 'assaultVest', 'twistedSpoon', 'subwoofer', 'ejectButton', 'jadeOrb', 'lustrousOrb', 'mitsuesCocktail','dampRock', 'smoothRock', 'icyRock', 'heatRockWeather', 'blimpKeys'].includes(this.pokemon?.item?.id)) {
			this.itemIcon.style.pointerEvents = 'none';
			this.itemIcon.style.outline = "0px";
			this.itemIcon.innerHTML = '';
		} else {
			this.itemIcon.style.pointerEvents = 'all';
			this.itemIcon.style.outline = 'revert-layer';
		}
	}

	changeAttackType(dir) {
		let index = TARGET_MODES.findIndex((targetMode) => targetMode == this.pokemon.targetMode);
		let indexMax = (this.pokemon.ability.id == 'illuminate' || this.pokemon.ability.id == 'illuminateBuff' || this.pokemon.ability.id == 'frisk' || this.pokemon.ability.id == 'vigilantFrisk' || this.pokemon?.item?.id == 'silphScope') ? 20 : 19;
		let indexMin = 0;

		index += dir;
		if (index > indexMax) index = indexMin;
		else if (index < indexMin) index = indexMax;
		this.pokemon.changeTargetMode(TARGET_MODES[index]);
		this.update();
		playSound('option', 'ui');
	}

	formatLevelUpCost(cost) {
		const lang = this.main.lang;
		const units = [
			{ value: 1e15, key: 'quadrillion', fallback: 'QUADRILLION' },
			{ value: 1e12, key: 'trillion', fallback: 'TRILLION' },
			{ value: 1e9, key: 'billion', fallback: 'BILLION' },
		];

		for (const unit of units) {
			if (cost >= unit.value) {
				const scaled = cost / unit.value;
				const formatted = Number.isInteger(scaled)
					? scaled.toString()
					: scaled.toFixed(2).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
				const localizedUnit = (text?.ui?.[unit.key]?.[lang] ?? text?.ui?.[unit.key]?.[0] ?? LARGE_NUMBER_UNITS[unit.key]?.[lang] ?? LARGE_NUMBER_UNITS[unit.key]?.[0] ?? unit.fallback).toUpperCase();
				return `$${formatted} ${localizedUnit}`;
			}
		}

		return `$${this.main.utility.numberDot(cost, lang)}`;
	}

	updateLevelButton() {
		// MOD: During challenge lvlCap, allow leveling freely (stats capped by updateStats)
		const inLvlCapChallenge = typeof this.main?.area?.inChallenge?.lvlCap === 'number';
		// Only shiny Pokemon can level past 100 (x1 would go to 101+)
		if (this.pokemon.lvl >= 100 && !this.pokemon.isShiny && !inLvlCapChallenge) {
			this.levelUp.innerHTML = `MAX`;
			this.levelUp.style.filter = 'brightness(0.8)';
			this.levelUp.style.pointerEvents = 'none';
			this.levelUp.style.lineHeight = '28px';
		} else {
			this.levelUp.style.lineHeight = 'revert-layer';
			this.levelUp.innerHTML = `${text.pokemon.lvlUp[this.main.lang]} <br>(${this.formatLevelUpCost(this.pokemon.cost)})`;
			this.levelUp.style.pointerEvents = 'all';
			if (this.main.player.gold < this.pokemon.cost) {
				this.levelUp.style.filter = 'brightness(0.8)';
			} else {
				this.levelUp.style.filter = 'revert-layer';
			}
		}

		// Only shiny Pokemon can level past 100 (x5 would push past 100)
		if (this.pokemon.lvl + 5 > 100 && !this.pokemon.isShiny && !inLvlCapChallenge) {
			this.levelUpFive.innerHTML = `MAX`;
			this.levelUpFive.style.filter = 'brightness(0.8)';
			this.levelUpFive.style.pointerEvents = 'none';
			this.levelUpFive.style.lineHeight = '28px';
		} else {
			this.levelUpFive.style.lineHeight = 'revert-layer';
			this.levelUpFive.innerHTML = `${text.pokemon.lvlUp[this.main.lang]} x5 <br>(${this.formatLevelUpCost(this.pokemon.checkCost(5))})`;
			this.levelUpFive.style.pointerEvents = 'all';
			if (this.main.player.gold < this.pokemon.checkCost(5)) {
				this.levelUpFive.style.filter = 'brightness(0.8)';
			} else {
				this.levelUpFive.style.filter = 'revert-layer';
			}
		}

		// Only shiny Pokemon can level past 100 (x10 would push past 100)
		if (this.pokemon.lvl + 10 > 100 && !this.pokemon.isShiny && !inLvlCapChallenge) {
			this.levelUpTen.innerHTML = `MAX`;
			this.levelUpTen.style.filter = 'brightness(0.8)';
			this.levelUpTen.style.pointerEvents = 'none';
			this.levelUpTen.style.lineHeight = '28px';
		} else {
			this.levelUpTen.style.lineHeight = 'revert-layer';
			this.levelUpTen.innerHTML = `${text.pokemon.lvlUp[this.main.lang]} x10 <br>(${this.formatLevelUpCost(this.pokemon.checkCost(10))})`;
			this.levelUpTen.style.pointerEvents = 'all';
			if (this.main.player.gold < this.pokemon.checkCost(10)) {
				this.levelUpTen.style.filter = 'brightness(0.8)';
			} else {
				this.levelUpTen.style.filter = 'revert-layer';
			}
		}
	}

	changePokemon(dir) {
		this.pos += dir;
		if (this.main.boxScene.isOpen) {
			if (this.pos >= this.boxArray.length) this.pos = 0;
			else if (this.pos < 0) this.pos = this.boxArray.length - 1;
			this.pokemon = this.boxArray[this.pos];
		} else {
			if (this.pos >= this.main.team.pokemon.length) this.pos = 0;
			else if (this.pos < 0) this.pos = this.main.team.pokemon.length - 1;
			this.pokemon = this.main.team.pokemon[this.pos];
		}
		playSound('option', 'ui');
		this.update();
	}

	open(pokemon, pos, boxArray = [], isBlocked = false) {
		super.open();
		this.background.style.backgroundColor = (this.main.boxScene.isOpen) ? 'rgba(0, 0, 0, 0)' : 'rgba(0, 0, 0, 0.6)'
		this.isBlocked = isBlocked;
		this.setBlocked(this.isBlocked);
		this.pokemon = pokemon;
		this.pos = pos;
		this.boxArray = boxArray;
		this.update();
		if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}

	close() {
		super.close();
		this.setBlocked(false);
		if (this.itemWindow.isOpen) this.itemWindow.close();
	}

	showLevelUpEffect(levels = 1) {
		const specie = (this.pokemon.specie.evolution != undefined && (this.pokemon.lvl >= this.pokemon.specie.evolution.level - levels)) ? pokemonData[this.pokemon.specie.evolution.pokemon] : this.pokemon.specie;
		const newLevel = this.pokemon.lvl + levels;

		const isAOE = specie.attackType === 'area';
		const isOrbital = specie.attackType === 'orbital';
		const newPower = Math.floor(specie.power.base + (specie.power.scale * newLevel));
		const newSpeed = isOrbital
			? this.calculatePreviewOrbitalSpeed(newLevel)
			: this.calculatePreviewSpeed(specie.speed.base, specie.speed.scale, newLevel, isAOE);
		const newCritical = this.calculatePreviewCrit(specie.critical.base, specie.critical.scale, newLevel);
		const newRange = isOrbital
			? this.calculatePreviewOrbitalRange(specie.range.base, specie.range.scale, newLevel)
			: this.calculatePreviewRange(specie.range.base, specie.range.scale, newLevel, isAOE);

		const powerDiff = newPower - this.pokemon.power;
		const speedDiff = isOrbital
			? newSpeed - (this.pokemon.orbitalSpeed ?? 0)
			: Math.abs((newSpeed / 1000).toFixed(2) - (this.pokemon.speed / 1000).toFixed(2)).toFixed(2);
		const criticalDiff = (newCritical.toFixed(1) - this.pokemon.critical.toFixed(1)).toFixed(1);
		const rangeDiff = newRange - this.pokemon.range;

		if (powerDiff > 0) {
			this.data['power'].value.innerHTML = `${this.formatPanelStat(this.pokemon.power)} <span style="color:var(--green)">(+${this.formatPanelStat(powerDiff)})</span>`;
		}
		if (speedDiff > 0) {
			this.data['speed'].value.innerHTML = isOrbital
				? `${this.formatSpeedValue(this.pokemon)} <span style="color:var(--green)">(+${this.formatOrbitalSpeedDiff(speedDiff)})</span>`
				: `${this.formatSpeedValue(this.pokemon)} <span style="color:var(--green)">(-${this.formatPanelStat(speedDiff, 3)}s)</span>`;
		}
		if (criticalDiff > 0) {
			this.data['critical'].value.innerHTML = `${this.pokemon.critical.toFixed(1)}% <span style="color:var(--green)">(+${criticalDiff}%)</span>`;
		}
		if (rangeDiff > 0) {
			this.data['range'].value.innerHTML = `${this.pokemon.range} <span style="color:var(--green)">(+${rangeDiff})</span>`;
		}
	}

	formatPanelStat(value, significantDigits = 2) {
		const numericValue = Number(value);
		if (!Number.isFinite(numericValue) || numericValue === 0) return '0';

		if ([70, 75, 76, 80, 163].includes(this.pokemon.id)) return;
		if (this.pokemon.isMega) return;
		if (!this.main.player.hasSkinator) return;
		if (this.pokemon.lvl < 100 && !this.pokemon.isReset) return;

		if (Math.abs(roundedValue) >= 1000 && this.main?.utility?.numberDot) {
			return this.main.utility.numberDot(Math.round(roundedValue));
		}

		var indx = 0;

		Object.entries(pokemonData).forEach((entries) => {
			if (entries[1].id === this.pokemon.id && entries[1].base === undefined) {

				this.skinSlot[indx].style.display = 'block';
				this.skinSlot[indx].style.backgroundImage = `url("${entries[1].sprite.base}")`;
				indx++;
			}
		})

	formatSpeedValue(pokemon) {
		if (pokemon.attackType === 'orbital') {
			const angularSpeed = pokemon.orbitalSpeed ?? 0;
			return `${this.formatPanelStat((angularSpeed * 180) / Math.PI, 3)}°/s`;
		}
		return `${this.formatPanelStat(pokemon.speed / 1000, 3)}s`;
	}

	formatOrbitalSpeedDiff(angularSpeedDiff) {
		return `${this.formatPanelStat((angularSpeedDiff * 180) / Math.PI, 3)}°/s`;
	}

	calculatePreviewOrbitalSpeed(level) {
		const clampedLevel = Math.max(1, level);
		const degToRad = Math.PI / 180;
		const level1Degrees = 36;
		const level100Degrees = 70;
		const level1000Degrees = 190;
		const level40000Degrees = 980;
		const asymptoticMaxDegrees = 1370;
		const earlyGrowthExponent = 2.07;
		const midGrowthExponent = 1.0;
		const post40000Softness = 2;

		if (clampedLevel <= 100) {
			const t = (clampedLevel - 1) / 99;
			const degrees = level1Degrees + ((level100Degrees - level1Degrees) * t);
			return degrees * degToRad;
		}

		if (clampedLevel <= 1000) {
			const t = Math.max(0, Math.min(1, Math.log(clampedLevel / 100) / Math.log(1000 / 100)));
			const degrees = level100Degrees + ((level1000Degrees - level100Degrees) * Math.pow(t, earlyGrowthExponent));
			return degrees * degToRad;
		}

		if (clampedLevel <= 40000) {
			const t = Math.max(0, Math.min(1, Math.log(clampedLevel / 1000) / Math.log(40000 / 1000)));
			const degrees = level1000Degrees + ((level40000Degrees - level1000Degrees) * Math.pow(t, midGrowthExponent));
			return degrees * degToRad;
		}

		const extraLogLevels = Math.max(0, Math.log2(clampedLevel / 40000));
		const saturation = extraLogLevels / (extraLogLevels + post40000Softness);
		const degrees = level40000Degrees + ((asymptoticMaxDegrees - level40000Degrees) * saturation);
		return degrees * degToRad;
	}

	calculatePreviewOrbitalRange(base, scale, level) {
		if (level <= 100) {
			return Math.floor(base + (scale * level));
		}
		const range100 = base + (scale * 100);
		const capMultiplier = 2.0;
		const maxBonus = capMultiplier - 1;
		const logLevels = Math.max(0, Math.log2(level / 100));
		const saturation = logLevels / (logLevels + 5);
		return Math.floor(range100 * (1 + maxBonus * saturation));
	}

	// Mirror of Pokemon.calculateAsymptoticSpeed — MUST match exactly
	calculatePreviewSpeed(base, scale, level, isAOE = false) {
		if (level <= 100) {
			return Math.floor(base + (scale * level));
		}
		const speed100 = base + (scale * 100);
		const minSpeed = Math.max(50, Math.floor(speed100 * 0.05));
		const excessLevels = level - 100;
		const decayRate = isAOE ? 0.00125 : 0.005;
		const decayFactor = Math.exp(-decayRate * excessLevels);
		const asymptoticSpeed = minSpeed + (speed100 - minSpeed) * decayFactor;
		return Math.max(minSpeed, Math.floor(asymptoticSpeed));
	}

	// Mirror of Pokemon.calculateEndlessRange — MUST match exactly
	calculatePreviewRange(base, scale, level, isAOE = false) {
		if (level <= 100) {
			return Math.floor(base + (scale * level));
		}
		const range100 = base + (scale * 100);
		const scaleFactor = isAOE ? (1 / Math.log2(10)) : (2 / Math.log2(10));
		const rangeMultiplier = 1 + Math.log2(level / 100) * scaleFactor;
		return Math.floor(range100 * rangeMultiplier);
	}

	// Mirror of Pokemon.calculateEndlessCrit — MUST match exactly
	calculatePreviewCrit(base, scale, level) {
		if (level <= 100) {
			return base + (scale * level);
		}
		const periods = (level - 100) / 100;
		const critAt100 = base + (scale * 100);
		const remainingGap = (100 - critAt100) * Math.pow(0.5, periods);
		return 100 - remainingGap;
	}

	updateStatsChanges() {
	    let flatPower = 0;
	    let flatSpeed = 0;
	    let flatCritical = 0;
	    let flatRange = 0;

	    let mulPower = 1;
	    let mulSpeed = 1;
	    let mulCritical = 1;
	    let mulRange = 1;

	    const basePower = this.pokemon.power;
	    const baseSpeed = this.pokemon.speed;
	    const baseCritical = this.pokemon.critical;
	    const baseRange = this.pokemon.range;

	    if (this.pokemon.id == 65 || this.pokemon?.adn?.id == 65) {
	        flatSpeed -= this.main.player.fossilInTeam * 500;
	    }

	    if (this.pokemon?.ability?.id == 'armorCannon') {
		flatSpeed -= (100 * (14 - this.main.player.health[this.main.area.routeNumber]));
	    }

	    if (this.pokemon?.item?.id == 'maliciousArmor') {
		flatSpeed -= (20 * (14 - this.main.player.health[this.main.area.routeNumber]));
	    }

	    if (this.pokemon.isDeployed) {
	        let tower = this.main.area.towers.find(t => t.pokemon === this.pokemon);

	        if (
	            (tower.tile &&
		(tower.tile.land === 2 || (tower.tile.land == 1 && tower.pokemon?.item?.id == 'fertiliser') || tower?.carriedBy == 'grassPlatform' || (tower.tile.land == 3 && tower.pokemon?.item?.id == 'subwoofer')) &&
		(tower.pokemon.ability.id === 'toughClawsNight' || tower.pokemon.ability.id === 'toughClaws')
	            ) ||
	            (tower.tile &&
		((tower.tile.land === 4 || tower.tile.land == 1 && tower.pokemon?.item?.id == 'hikingKit' || ((tower.tile.land == 3 || tower?.carriedBy == 'icePlatform') && tower.pokemon?.item?.id == 'subwoofer')) &&
	            (tower.pokemon.ability.id === 'toughClawsDay')))
	        ) flatCritical = 100 - baseCritical;
	    }

	    switch (this.pokemon?.item?.id) {
	        case 'protein':
	            flatPower += 10;
	            break;

	        case 'xAttack':
	            flatPower += 75;
	            break;

	        case 'oddKeystone':
	            flatPower += 40;
	            break;

	        case 'expertBelt':
	            flatPower += 50;
	            flatCritical += 10;
	            break;

	        case 'bicycle':
	            if (this.pokemon.lvl == 100 && this.pokemon.specie.key == 'chatot' && typeof this.main?.area?.inChallenge.lvlCap !== 'number') {
			flatSpeed -= 4000;
			flatCritical -= 4;
		}
		break;

	        case 'silphScope':
	            if (this.pokemon.ability.id === 'frisk' ||  this.pokemon.ability.id === 'illuminateBuff' || this.pokemon.ability.id === 'illuminate' || this.pokemon.ability.id === 'vigilantFrisk') {
		flatRange += 15;
		flatPower += 175;
		mulSpeed *= 1 - 0.25;
	            }
	            break;

	        case 'ancientSword':
		mulPower *= 1 + 0.2;
	            mulSpeed *= 1 - 0.2;
		break;

	        case 'ancientShield':
		mulPower *= 1 + 0.2;
	            mulRange *= 1 + 0.2;
		break;

	        case 'strangeIdol':
		mulPower *= 1 + 0.5;
		break;

	        case 'inverter':
		if (this.pokemon.specie.key == 'malamar') {
			mulPower *= 1 + 0.5;
			mulSpeed *= 1 - 0.75;
			flatCritical += 15;
		}
		break;

	        case 'wrestlingMask':
		mulSpeed *= 1 - 0.35;
	            flatRange -= 75;
		break;

	        case 'bindingBand':
		flatSpeed += 1500;
		break;

	        case 'shieldBreakerBullet':
		flatSpeed += 2000;
		break;

	        case 'direHit':
		flatCritical += 25;
		break;

	        case 'carbos':
	            mulSpeed *= 1 - 0.15
	            break;

	        case 'cellBattery':
	            mulPower *= 1 + 0.5;
	            break;

	        case 'lifeOrb':
	            mulPower *= 1 + 0.5;
	            mulSpeed *= 1 - 0.5;
	            break;

	        case 'muscleBand':
		mulSpeed *= 1 + 0.25;
		break;

	        case 'choiceScarf':
	            if (this.pokemon.ability.id === 'quadraShot' || this.pokemon.ability.id === 'quadraShotSand') mulSpeed *= 1 - 0.875;
	            else if (this.pokemon.ability.id === 'tripleShot') mulSpeed *= 1 - 0.75;
	            else mulSpeed *= 1 - 0.5;
	            break;

	        case 'oldRod':
	            flatRange += 75;
	            break;

	        case 'softSand':
		mulPower *= 5;
	            break;

	        case 'hardStone':
	            mulPower *= 1 + 0.25;
	            break;

	        case 'condensedBlizzard':
		mulRange /= 2;
		break;

	        case 'starCandy':
	            flatRange += 0.1 * this.main.player.stars;
	            break;

	        case 'prismScale':
	            flatRange += 0.5 * this.main.player.ribbons;
	            break;

	        case 'leek':
	            mulCritical *= 2;
	            break;

	        case 'sokudosPortfolio':
		let speedLimit = Math.min(this.main.player.shinyAmount * 0.05, 0.75);
		mulSpeed *= 1 - speedLimit;
	            mulPower *= (2 * this.main.player.shinyAmount / 100);
	            break;

	        case 'thickClub':
	        case 'lightBall':
	        case 'weaknessPolicy':
	            mulPower *= 2.5;
	            break;

	        case 'clawFossil':
	            flatPower += Math.ceil(basePower * 0.1 * this.main.player.fossilInTeam);
	            break;

	        case 'loadedDice':
	            mulPower *= 1 + 0.5 * (this.pokemon.ricochet || 0);
	            break;

	        case 'quickPowder':
	            mulSpeed *= 1 - 0.25;
	if (this.pokemon.ability.id === 'defiant') mulPower *= 1 + 0.5;
	else mulPower *= 1 - 0.5;
	break;

	        case 'metalPowder':
	            mulPower *= 1 + 0.5;
	            if (this.pokemon.ability.id === 'defiant') mulSpeed *= 1 - 0.25;
				else mulSpeed *= 1 + 0.25;
	            break;

	        case 'domeFossil':
	            flatCritical += (5 * this.main.player.fossilInTeam);
	            break;

	        case 'adrenalineOrb':
	            const aoVal = 0.02 * (14 - this.main.player.health[this.main.area.routeNumber]);
	            mulSpeed *= 1 - aoVal;
	            break;

	        case 'zoomLens':
	            if (this.pokemon.ability.id === 'defiant')  mulPower *= 1 + 0.5;
	            else mulPower *= 1 - 0.5;
	            break;

	        case 'quickClaw':
				mulSpeed *= 1 - 0.5;
	            if (this.pokemon.ability.id === 'defiant') mulPower *= 1 + 0.5;
	            else mulPower *= 1 - 0.5;
				break;

			case 'scovillainSiracha':
	            if (this.pokemon.ability.id === 'contrary') mulPower *= 1 + 0.5;
	            else if (this.pokemon.ability.id === 'defiant') flatPower += 500;
	            else if (this.pokemon.ability.id !== 'burnDoubleShot') mulPower *= 1 - 0.5;
				break;

			case 'laggingTail':
	            if (this.pokemon.ability.id === 'contrary') mulSpeed *= 1 - 0.5;
	            else mulSpeed *= 1 + 0.5;
	            mulPower *= 1 + 0.5;
	            if (this.pokemon.ability.id === 'defiant') flatPower += 500;
				break;

			case 'revelationAroma':
				flatRange += 25;
				break;

			case 'luminousMoss':
				flatRange += 25;
				break;

			case 'sunflowerPetal':
				flatRange -= 50;
				break;

	        case 'blueBandana':
				const critPercentBB = baseCritical + flatCritical;
				mulPower *= 1 + (critPercentBB * 0.01);
				break;

			case 'heartScale':
				if (this.main.area.heartScale) {
					mulSpeed *= 1 - 0.5;
				}
				break;
			case 'koffingJelly':
	            if (this.pokemon.ability.id === 'defiant') flatPower += 500;

				if (this.pokemon.ability.id === 'contrary') flatSpeed -= 1100;
	            else if (this.pokemon.specie.id !== 56) flatSpeed += 1100;
				break;

			case 'helixFossil':
				flatRange += 10 * this.main.player.fossilInTeam;
				break;

			case 'spindaCocktail':
				mulRange *= 1 + 0.25;
				break;

			case 'mitsuesCocktail':
				mulPower *= 1 + 1;
				break;

			case 'poisonBarb':
				mulSpeed *= 1 - 0.2;
				break;

			case 'nanabBerry':
				mulRange *= 1 + 0.3;
				mulPower *= 1 + 0.5;
				mulSpeed *= 1 + 0.25;
				break;

			case 'eviolite':
				mulRange *= 1 + 0.2;
				mulPower *= 1 + 0.2;
				mulSpeed *= 1 - 0.2;
				break;

			case 'tropicalMail':
				flatPower += 20 * this.main.UI.tilesCountNum[1];
				break;

			case 'waveMail':
				mulSpeed -= 0.03 * this.main.UI.tilesCountNum[2];
				break;

			case 'brickMail':
				flatRange += 8 * this.main.UI.tilesCountNum[3];
				break;

			case 'badgeOfHonor':
				let bonusPercent = Math.min(30, (this.main.player.stars / 30)) * 0.01;
			mulPower *= 1 + bonusPercent;
				break;

	        default:
	            break;
	    }

	    if (this.pokemon.ability.id === 'nocturnal' && !this.main.utility.isBetweenHours(8, 20)) {
		mulSpeed *= 1 - 0.25;
	    }

	    if (this.pokemon.ability.id === 'diurnal' && this.main.utility.isBetweenHours(8, 20)) {
		mulPower *= 1 + 0.5;
	    }

	    if (this.pokemon.ability.id === 'simple') {
	        flatPower *= 1.75;
	        flatSpeed *= 1.75;
	        flatCritical *= 1.75;
	        flatRange *= 1.75;

	        mulPower = 1.75 * mulPower - 0.75;
	        mulSpeed = 1.75 * mulSpeed - 0.75;
	        mulCritical = 17.5 * mulCritical - 0.75;
	        mulRange = 1.75 * mulRange - 0.75;
	    }

	    flatPower += this.main.area.honeyGather;

	    if (this.pokemon?.item?.id == 'nectar') {
            for (let i = 0; i < 2; i++) flatPower += this.main.area.honeyGather;
            if (this.pokemon.ability.id === 'simple') flatPower += this.main.area.honeyGather;
        }

        if (this.main.area.anchorShot) mulSpeed *= 1 + 2;

        if ([165, 175, 176].includes(this.pokemon.id) && this.main.area.swordsDance) {
	mulPower *= 1 + 0.2;
        }

        if ([165, 175, 176].includes(this.pokemon.id) && this.main.area.heartOfSteel) {
	flatPower += (this.main.area.hitsReceived > 0) ? 75 : 25;
	flatCritical += (this.main.area.hitsReceived > 0) ? 15 : 5;
        }

	    if (this.main.area.helpingHand && this.pokemon?.item == undefined) flatPower += (50 * this.main.area.helpingHand);

	    if (this.pokemon.id == 66) {
	        const currentHp = this.main.player.health[this.main.area.routeNumber] || 0;
	        const missingHp = Math.max(0, 14 - currentHp);
	        const rate = (this.pokemon?.item?.id === 'rockyHelmet') ? 0.10 : 0.05;
	        mulPower *= 1 + missingHp * rate;
	    }

	    if (this.pokemon.ability.id == 'makeItRain') {
		let goldPerDigit = (this.pokemon?.item?.id == 'amuletCoin') ? 0.15 : 0.075
            let goldValue = this.main.player.stats.totalGold;
            let goldBonus = goldValue.toString().length * goldPerDigit;
            mulPower *= 1 + goldBonus;
        }

        if (this.main.area.shellSmashActive && this.pokemon.ability.id === 'shellSmash') {
            mulPower *= 1 + 0.5;
            mulSpeed *= 1 - 0.25;
        }

        if (this.pokemon.ability.id === 'tailGlow' && this.main.area.heartScale > 0) {
			mulPower *= 1 + 0.75;
		}

		if (this.pokemon.ability.id === 'rageFist') {
	        flatPower += (this.main.area.hitsReceived * 50);
	    }

	    if (this.pokemon.ability.id === 'marvelScale') {
	        flatPower += (this.main.area.inChallenge) ? (this.main.player.ribbons * 3) : this.main.player.ribbons;
	    }

	    if (this.pokemon.ability.id === 'moxie') {
	        let stacks = this.main.area.moxieUsers[this.pokemon.id] || 0;
	        if (this.pokemon?.item?.id === 'blackGlasses') stacks *= 2;
	        mulPower *= 1 + stacks * 0.05;
	    }

	    if (this.pokemon.ability.id === 'speedBoost' || this.pokemon.ability.id === 'strongJaw') {
	        flatSpeed -= (this.main.area.speedBoostUsers[this.pokemon.id] || 0) * 300;
	    }

	    if (this.pokemon.ability.id === 'bulkUp') {
	        flatPower += this.main.area.bulkUpUsers[this.pokemon.id]?.power ?? 0;
	    }

	    if (this.pokemon.isDeployed) {
	        const tower = this.main.area.towers.find(t => t.pokemon === this.pokemon);
	        let cherryFormBonus = false;

	        if (tower) {
		if (tower.isMounted &&  (this.pokemon.id == 114 || this.pokemon?.adn?.id == 114)) {
			mulPower *= 1 + 0.5;
					mulSpeed *= 1 - 0.25;
			flatCritical += 30;
		}

		if (this.pokemon.ability.id === 'teleport') {
			if (tower.teleportBuff != false) {
				if (this.pokemon?.item?.id == 'twistedSpoon') flatPower += (tower.teleportBuff * this.pokemon.power * 0.25);
				else flatPower += (tower.teleportBuff * this.pokemon.power);
			}
		}

		if (this.pokemon.ability.id === 'meteorBeam' && tower.isOrbitingSolrock) {
			mulPower *= 1 + 1;
		}

		if (tower.pokemon?.item?.id == 'fullIncense') {
	                flatPower += Math.floor(tower.incenseBuff)
	            }

	            if (this.pokemon.ability.id === 'meteorMash') {
	                mulPower += (this.main.area.meteorMashUsers[this.pokemon.id] || 0) * 0.2;
	            }

	            if (this.pokemon.ability.id === 'rivalrySpeed' && this.main.area.rivalryAmount >= 2) {
			mulSpeed *= 1 - 0.3;
		}

		if (this.pokemon.ability.id === 'rivalryPower' && this.main.area.rivalryAmount >= 2) {
			mulPower *= 1 + 0.5;
		}

		if (tower.pokemon?.item?.id == 'salacBerry' && tower.salacBerryTimer > 0) {
			if (this.pokemon.ability.id === 'simple') mulSpeed *= 1 - 0.875;
	                else mulSpeed *= 1 - 0.5;
	            }

	            if (tower.pokemon?.item?.id == 'liechiBerry' && tower.liechiBerryTimer > 0) {
	                flatPower += (this.pokemon.ability.id === 'simple') ? 350 : 200;
	            }
	            if (tower.pokemon?.item?.id == 'lansatBerry' && tower.lansatBerryTimer > 0) {
	                flatCritical += (this.pokemon.ability.id === 'simple') ? 105 : 60;
	            }
	            if (tower.pokemon?.item?.id == 'starfBerry' && tower.starfBerryTimer > 0) {
	                flatRange += (this.pokemon.ability.id === 'simple') ? 140 : 80;
	            }

	            const tile = tower.tile;
	            const towerAbility = tower.pokemon?.ability?.id;

	            if (
	                tile && tower.pokemon?.item?.id !== 'mitsuesCocktail' &&
	                (tile.land === 2 || (tile.land === 1 && tower.pokemon?.item?.id === 'fertiliser') || tower?.carriedBy == 'grassPlatform') &&
	                (towerAbility === 'ambusher' || towerAbility === 'castform')
	            ) {
	                mulPower *= 2;
	            }

	            if (
                    this.main.area.weather == 'rain' &&
                    (tile.land == 3 || (tile.land == 1 && tower.pokemon?.item?.id == 'squirtBottle') || tower?.carriedBy == 'icePlatform')
                ) {
                    mulPower *= 1.2;
                }

                if (
                    this.main.area.weather == 'rain' && tower.pokemon?.ability?.id == 'waterCompaction'
                ) {
                    flatCritical += 30;
	mulPower *= 1.3;
                }

                if (
		            this.main.area.weather == 'heavyRain' && tower.pokemon?.item?.id != 'safetyGoggles' &&
		            (tile.land == 3 || (tile.land == 1 && tower.pokemon?.item?.id == 'squirtBottle') || tower?.carriedBy == 'icePlatform')
		        ) {
			if (this.main.area.cloudNine) mulPower *= 0.875;
			        else if (this.main.area.airLock) mulPower *= 1;
				else mulPower *= 0.5;

		        }

                if (
		            this.main.area.weather == 'harshSunlight'
		        ) {
		            if (tile.land == 2 || (tile.land == 1 && tower.pokemon?.item?.id == 'fertiliser') || tower?.carriedBy == 'grassPlatform') mulSpeed *= 1 - 0.15;
				if (towerAbility === 'drySkin')  mulPower *= 2;
		        }

		        if (
		            this.main.area.weather == 'extremelyHarshSunlight' &&
		            (tile.land == 2 || (tile.land == 1 && tower.pokemon?.item?.id == 'fertiliser') || tower?.carriedBy == 'grassPlatform')
		        ) {
			if (((this.pokemon.id == 75 || this.pokemon?.adn?.id == 75) && this.pokemon.lvl > 24) || towerAbility === 'chlorophyll') {

			} else {
			            if (this.main.area.cloudNine && tower.pokemon?.item?.id != 'safetyGoggles') mulSpeed *= 1 + 0.5;
			            else if (this.main.area.airLock) mulSpeed *= 1;
					else if (tower.pokemon?.item?.id != 'safetyGoggles') mulSpeed *= 1 + 2;

					if (towerAbility === 'drySkin')  mulPower *= 3;
				}
		        }

		        if (
			this.main.area.weather == 'harshSunlight' || this.main.area.weather == 'extremelyHarshSunlight'
		        ) {
			if (towerAbility === 'chlorophyll') mulSpeed *= 1 - 0.5;
			if ((this.pokemon.id == 75 || this.pokemon?.adn?.id == 75) && this.pokemon.lvl > 24) {
				cherryFormBonus = true;
					mulSpeed *= 1 - 0.25;
			}
			}

		        if (this.main.area.weather == 'sandstorm' && tower.pokemon?.ability?.id == 'sandRush' ) {
			mulSpeed *= 0.5;
		        }

	            if (
		tile &&
		            this.main.player.health[this.main.area.routeNumber] <= 5 &&
		            towerAbility === 'torrent' &&
		            (tile.land === 3 || (tile.land == 1 && tower.pokemon?.item?.id == 'squirtBottle') || tower?.carriedBy == 'icePlatform')
		        ) {
		            mulPower *= 1.75;
		        }

		        if (
		tile &&
		            this.main.player.health[this.main.area.routeNumber] <= 5 &&
		            towerAbility === 'overgrow' &&
		            (tile.land === 2 || (tile.land == 1 && tower.pokemon?.item?.id == 'fertiliser') || tower?.carriedBy == 'grassPlatform')
		        ) {
		            mulPower *= 1.75;
		        }

	            if (
	                tile &&
	                (tile.land === 2 || (tile.land === 1 && tower.pokemon?.item?.id === 'fertiliser') || tower?.carriedBy == 'grassPlatform' || ((tower.tile.land == 3 || tower?.carriedBy == 'icePlatform') && tower.pokemon?.item?.id == 'subwoofer')) &&
	                towerAbility === 'toughClawsNight'
	            ) {
	                mulPower *= 1.5;
	            }

	            if (
		tile &&
		(tile.land === 4 || tile.land == 1 && tower.pokemon?.item?.id == 'hikingKit' || ((tower.tile.land == 3 || tower?.carriedBy == 'icePlatform') && tower.pokemon?.item?.id == 'subwoofer')) &&
		(towerAbility === 'toughClawsDay' || towerAbility === 'toughClaws')
	            ) {
	                mulPower *= 1.5;
	            }

	            if (
		tile &&
		(tile.land === 4 || tile.land == 1 && tower.pokemon?.item?.id == 'hikingKit') &&
		(towerAbility === 'vigilant' || towerAbility === 'vigilantFrisk' || towerAbility === 'castform')
	            ) {
	                mulRange *= 2;
	            }

	            if (
		tile && tile.land === 4 && towerAbility === 'noGuard'
	            ) {
	                flatRange += 9999;
	            }

	            if ([3,4,5,10].includes(this.main.area.routeNumber) && (towerAbility === 'doubleShotSand' || towerAbility === 'quadraShotSand')) {
	                mulRange *= 2;
	            }

	            if (
	                tile &&
	                (tile.land === 3 || (tile.land === 1 && tower.pokemon?.item?.id === 'squirtBottle') || tower?.carriedBy == 'icePlatform') &&
	                (towerAbility === 'swimmer' || towerAbility === 'castform')
	            ) mulSpeed *= 0.5;

	            if (tower.powerAura) {
	                mulPower *= tower.powerAura;
	                if ((this.pokemon.id == 75 || this.pokemon?.adn?.id == 75) && this.pokemon.lvl > 24 && !cherryFormBonus) mulSpeed *= 1 - 0.25;
	            }

	            if (tower.triageAura) {
	                mulSpeed *= 1 - 0.15;
	            }

	            if (tower.genesisAura) {
		mulPower *= 1 + 0.15;
	                mulSpeed *= 1 - 0.1;
	                flatCritical += 5;
	            }

	            if (tower.illuminateAura && this.pokemon.orbital <= 0) {
	                flatRange += tower.illuminateAura;
	            }

	            if (tower?.carriedBy == 'grassPlatform' || tower?.carriedBy == 'icePlatform') {
	                mulSpeed *= 1 - 0.15;
	            }

	            if (tower.criticalAura) {
	                flatCritical += 20;
	            }
	        }
	    }

	    const powerAfterFlats = (basePower + flatPower) * mulPower;
	    const speedAfterFlats = (baseSpeed + flatSpeed) * mulSpeed;
	    const criticalAfterFlats = (baseCritical + flatCritical) * mulCritical;
	    const rangeAfterFlats = (baseRange + flatRange) * mulRange;

	    const powerGains = Math.round(powerAfterFlats - basePower);
	    const speedGains = Math.round(speedAfterFlats - baseSpeed);
	    const criticalGains = Math.round(criticalAfterFlats - baseCritical);
	    const rangeGains = Math.round(rangeAfterFlats - baseRange);

	    // Include Star ability's direct per-star damage bonus in power preview
	    let starPowerBonus = 0;
	    if (this.pokemon?.ability?.id === 'star') {
		starPowerBonus += this.main.player.stars;
		if (this.pokemon?.favorite) starPowerBonus++;
		if (this.pokemon?.isShiny) starPowerBonus++;
		if (this.pokemon?.item?.id == 'starCandy') starPowerBonus++;
		starPowerBonus += this.main.team.pokemon.filter((poke) => poke.id == 32).length;
	    }
	    const totalPowerGains = powerGains + starPowerBonus;

	if (totalPowerGains != 0) {
			this.data['power'].value.innerHTML += (totalPowerGains > 0) ?
			` <span style="color: var(--green)"> (+${this.formatPanelStat(totalPowerGains)})<span>` :
			` <span style="color: var(--red)"> (${this.formatPanelStat(totalPowerGains)})</span>`;
		}
		if (speedGains !== 0) {
	        const speedSec = this.formatPanelStat(Math.abs(speedGains) / 1000, 3);
	        this.data['speed'].value.innerHTML += (speedGains < 0) ?
	            ` <span style="color: var(--green)">(-${speedSec}s)</span>` :
	            ` <span style="color: var(--red)">(+${speedSec}s)</span>`;
	    }
		if (criticalGains != 0) {
			this.data['critical'].value.innerHTML += (criticalGains > 0) ?
			` <span style="color:var(--green")> (+${criticalGains}%)<span>` :
			` <span style="color:var(--red")> (${criticalGains}%)</span>`;
		}
		if (rangeGains != 0) {
			this.data['range'].value.innerHTML += (rangeGains > 0) ?
			` <span style="color:var(--green")> (+${rangeGains})<span>` :
			` <span style="color:var(--red")> (${rangeGains})</span>`;
		}
	}

	// extras

	checkExtraScenes() {
		switch(this.pokemon.specie.key){
			case 'sharpedo':
				if (this.main.itemController.hasItem('sharpedonite')) this.extraMegaSharpedo();
			break;
		}
	}

	extraMegaSharpedo() {
		this.extraContainer.style.display = 'block';
		this.extraContainerTitle.style.color = this.pokemon.specie.color;
		this.extraContainerTitle.innerHTML = text.pokemon.extra.sharpedo.title[this.main.lang].toUpperCase();
		this.extraContainerDescription.innerHTML = text.pokemon.extra.sharpedo.description[this.main.lang];

		if (this.pokemon.extra) {
			this.extraContainerButton.innerHTML = text.challenge.on[this.main.lang].toUpperCase();
			this.extraContainerButton.style.backgroundColor = 'var(--green)';
		} else {
			this.extraContainerButton.innerHTML = text.challenge.off[this.main.lang].toUpperCase();
			this.extraContainerButton.style.backgroundColor = 'var(--red)';
		}
	}
}

class ItemWindow {
	constructor(main) {
	    this.main = main;
	    this.isOpen = false;
	    this.pokemon = null;
	    this.render();
	}

	render() {
	    this.window = document.createElement('div');
	    this.window.className = 'item-scene-window';
	    this.window.style.zIndex = '10001';

	    this.container = new Element(this.window, { className: 'item-scene-container' }).element;
	    this.slot = [];

	    for (let i = 0; i < 120; i++) {
		this.slot[i] = new Element(this.container, { className: 'item-scene-slot' }).element;

		this.slot[i].addEventListener('click', () => {
		if (this.slot[i].itemIndex !== undefined && this.slot[i].itemIndex !== null) {
		this.equipItem(this.slot[i].itemIndex);
		}
		});

		this.slot[i].equiped = new Element(this.slot[i], { className: 'item-scene-slot-equiped stroke', text: 'E' }).element;
		this.slot[i].favorite = new Element(this.slot[i], { className: 'item-scene-slot-favorite stroke', text: '★' }).element;
	    }

	render() {
		this.window = document.createElement('div');
		this.window.className = 'item-scene-window';
		this.window.style.overflow = 'hidden';

		this.container = new Element(this.window, { className: 'item-scene-container' }).element;

		this.slot = [];
		for (let i = 0; i < 100; i++) {
			this.slot[i] = new Element(this.container, { className: 'item-scene-slot' }).element;
			this.slot[i].itemRef = undefined;
			this.slot[i].addEventListener('click', () => { this.equipItem(i); });
			this.slot[i].equiped = new Element(this.slot[i], { className: 'item-scene-slot-equiped stroke', text: '' }).element;
		}

		this.removeItem = new Element(this.container, { className: 'item-scene-slot item-scene-slot-x', text: 'X' }).element;
		this.removeItem.addEventListener('click', () => {
			if (!this.pokemon?.item) return;
			this.pokemon.retireItem();
			this.main.UI.update();
			this.main.pokemonScene.update();
			if (this.main.boxScene.isOpen) this.main.boxScene.update();
			this.update();
			playSound('equip', 'ui');
		});
	}

	open(pokemon) {
	if (this.main.area.inChallenge.noItems) {
		playSound('pop0', 'ui');
		return;
	}

	if (!this.isOpen) {
		    playSound('open', 'ui');
		    this.isOpen = true;
		    this.pokemon = pokemon;

		    this.main.pokemonScene.window.appendChild(this.window);
		    this.window.style.display = 'block';
		this.update();
	    } else {
		this.close();
	    }
	}

	close() {
	this.isOpen = false;
	playSound('close', 'ui');
	this.window.style.display = 'none';
	this.main.tooltip.hide();
    }

	update() {
	    this.slot.forEach(slot => {
		slot.style.display = 'none';
		slot.style.backgroundImage = "";
		slot.style.pointerEvents = 'none';
		slot.equiped.innerHTML = "";
		slot.favorite.innerHTML = "";
		slot.style.filter = '';
		slot.itemIndex = null;
	    });

	    const originalItems = this.main.itemController.getItems();
		const items = [...originalItems]; // copia: ya no se toca el array de Player

		const favorites = new Set(
		    this.main.player.favoriteItems[this.pokemon.specie.id] ?? []
		);

		items.sort((a, b) => {
		    const af = favorites.has(a.id);
		    const bf = favorites.has(b.id);

		    if (af !== bf) return bf - af;

		    return 0;
		});

	    let slotIndex = 0;

	    items.forEach((item, i) => {
		    const able = this.main.itemController.canEquip(item, this.pokemon);

		    if (!able) return;
		    if (slotIndex >= this.slot.length) return;

		    const slotEl = this.slot[slotIndex];
		    slotEl.style.display = '';
		    slotEl.itemIndex = originalItems.indexOf(item); // índice real, no el de la copia ordenada


		slotEl.style.backgroundImage = `url(${item.sprite})`;
		slotEl.style.pointerEvents = 'revert-layer';
		this.main.tooltip.bindTo(slotEl, item, 'item');

		if (this.main.itemController.isEquipped(item)) {
		slotEl.equiped.innerHTML = 'E';
		slotEl.style.filter = 'drop-shadow(0 0 2px var(--yellow))';
		} else slotEl.style.filter = 'drop-shadow(0 0 2px var(--white))';

		if (this.main.player.isFavoriteItem(this.pokemon.specie.id, item.id)) {
			slotEl.style.filter = 'drop-shadow(0 0 2px var(--red))';
			slotEl.favorite.innerHTML = '★';
		}
		slotIndex++;
	    });
	}

	close() {
		this.isOpen = false;
		playSound('close', 'ui');
		this.window.style.display = 'none';
		this.main.tooltip.hide();
	}

	getAvailableItems() {
		const itemController = this.main.itemController;
		if (itemController?.getItems && itemController?.canEquip) {
			return itemController.getItems().filter(item => itemController.canEquip(item, this.pokemon));
		}

		// Legacy fallback if itemController is unavailable.
		return this.main.player.items || [];
	}

	isItemEquipped(item) {
		const itemController = this.main.itemController;
		if (itemController?.isEquipped) return itemController.isEquipped(item);
		return item?.equipedBy != undefined;
	}

	update() {
		this.slot.forEach(slot => {
			slot.itemRef = undefined;
			slot.style.display = 'none';
			slot.style.backgroundImage = '';
			slot.style.pointerEvents = 'none';
			slot.style.filter = 'none';
			slot.equiped.innerHTML = '';
		});

		this.itemArray = this.getAvailableItems();

		this.itemArray.forEach((item, i) => {
			if (!this.slot[i]) return;
			this.slot[i].itemRef = item;
			this.slot[i].style.display = 'block';
			this.slot[i].style.backgroundImage = `url(${item.sprite})`;
			this.slot[i].style.pointerEvents = 'revert-layer';
			this.main.tooltip.bindTo(this.slot[i], item, 'item');

			if (this.isItemEquipped(item)) {
				this.slot[i].equiped.innerHTML = 'E';
				this.slot[i].style.filter = 'drop-shadow(0 0 2px var(--yellow))';
			} else {
				this.slot[i].style.filter = 'drop-shadow(0 0 2px var(--white))';
			}
		});

		if (this.pokemon?.item) {
			this.removeItem.style.pointerEvents = 'revert-layer';
			this.removeItem.style.filter = 'none';
		} else {
			this.removeItem.style.pointerEvents = 'none';
			this.removeItem.style.filter = 'brightness(0.45)';
		}
	}

	equipItem(pos) {
		const item = this.slot[pos]?.itemRef;
		if (!item) return;

		const itemController = this.main.itemController;
		if (itemController?.equip) itemController.equip(item, this.pokemon);
		else this.pokemon.equipItem(item);

		this.main.UI.update();
		this.main.pokemonScene.update();
		if (this.main.boxScene.isOpen) this.main.boxScene.update();
		this.update();
		playSound('equip', 'ui');
	}
}

