import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { playSound } from '../../file/audio.js';
import { abilityData } from '../data/abilityData.js';
import { Input } from '../../utils/Input.js';
import { ChangePokemonName } from './ChangePokemonName.js';

const sort = ['team', 'alphabetical', 'level', 'ability', 'grass', 'water', 'mountain', 'power', 'speed', 'range', 'shiny']
const TAB_CONTENT = ['allTab', 'grassTab', 'waterTab', 'mountainTab', 'fossilTab']

export class BoxScene extends GameScene {
	constructor(main) {
		super(560, 500);
		this.main = main;
		this.render();

		this.sorted = 0;
		this.pokemon = [];
		this.searchPokemon;

		this.selected;
		this.selectedPos = 0;
		this.tabSelected = 0;

		this.nameChange = new ChangePokemonName(this.main);
	}

	render() {
		this.title.innerHTML = text.box.title[this.main.lang].toUpperCase();

		this.unitSelectedName = new Element(this.container, { className: 'box-scene-unit-selected-name' }).element;

		this.unitSelectedName.addEventListener('click', () => {
			this.nameChange.open(this.selected);
		})

		this.favoriteButton = new Element(this.container, { className: 'box-scene-favorite-button', text: 'â­' }).element;

		this.favoriteButton.addEventListener('click', () => {
			playSound('hover2', 'ui')
			this.toggleFavorite();
		})

		this.unitContainer = new Element(this.container, { className: 'box-scene-unit-container' }).element;
		this.units = [];

		this.buttonContainer = new Element(this.container, { className: 'box-scene-button-container' }).element;
		this.addUnit = new Element(this.buttonContainer, { className: 'box-scene-button' }).element;
		this.removeUnit = new Element(this.buttonContainer, { className: 'box-scene-button' }).element;
		this.dataUnit = new Element(this.buttonContainer, { className: 'box-scene-button' }).element;
		this.removeAll = new Element(this.buttonContainer, { className: 'box-scene-button' }).element;

		this.dataUnit.addEventListener('click', () => { this.main.pokemonScene.open(this.selected, this.selectedPos, this.pokemon) });
		this.addUnit.addEventListener('click', () => { 
			playSound('equip', 'ui');
			this.addButton();
		});
		this.removeUnit.addEventListener('click', () => {
			playSound('unequip', 'ui');
		 	this.removeButton() 
		});
		this.removeAll.addEventListener('click', () => { 
			playSound('unequip', 'ui');
			this.removeAllButton() 
		});

		this.dataUnit.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
		this.addUnit.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
		this.removeUnit.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
		this.removeAll.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })

		for (let i = 0; i < 200; i++) {
			this.units[i] = new Element(this.unitContainer, { className: 'box-scene-unit' }).element;
			this.units[i].text = new Element(this.units[i], { className: 'box-scene-unit-text stroke' }).element;
			this.units[i].fav = new Element(this.units[i], { className: 'box-scene-unit-fav' }).element;
			this.units[i].shiny = new Element(this.units[i], { className: 'box-scene-unit-shiny' }).element;
			this.units[i].addEventListener('click', () => {
				playSound('click1', 'ui');
				this.selected = this.searchPokemon[i];
				this.selectedPos = i;
				this.displayPokemon();
			})
			this.units[i].addEventListener('dblclick', () => {
				this.selected = this.searchPokemon[i];
				if (this.selected.inGroup) {
					playSound('unequip', 'ui');
					if (this.selected.isDeployed) {
						this.selected.isDeployed = false;
					
						// RETIRAR TORRE
						const index = this.main.area.towers.findIndex((tower) => tower.pokemon == this.selected);
						this.main.UI.tilesCountNum[this.main.area.towers[index].tile.land-1]--;
						this.main.area.towers[index].tile.tower = false;
						this.main.area.towers.splice(index, 1)
					}
					this.main.box.addPokemon(this.selected);
					this.main.team.removePokemon(this.selected);
					this.update();
					this.main.area.checkWeather();
					this.main.UI.update();
				} else if (this.main.team.pokemon.length < this.main.player.teamSlots) {
					if (
						typeof this.main.area.inChallenge.slotLimit == 'number' &&
						this.main.team.pokemon.length >= this.main.area.inChallenge.slotLimit
					) {
						playSound('pop0', 'ui');
						return;
					}
					playSound('equip', 'ui');
					this.main.team.addPokemon(this.selected);
					this.main.box.removePokemon(this.selected);
					this.update();
					this.main.UI.update();
				}
			})
			this.units[i].addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		}

		this.sortContainer = new Element(this.container, { className: 'box-scene-sort-container' }).element;

		this.sortArrowLeft = new Element(this.sortContainer, { className: 'box-scene-sort-arrow', text: '<' }).element;
		this.sortValue = new Element(this.sortContainer, { className: 'box-scene-sort-value' }).element;
		this.sortArrowRight = new Element(this.sortContainer, { className: 'box-scene-sort-arrow', text: '>' }).element;

		this.sortArrowLeft.addEventListener('click', () => { this.changesort(-1) })
		this.sortArrowRight.addEventListener('click', () => { this.changesort(1) })
		
		this.sortArrowLeft.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.sortArrowRight.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.tabContainer = new Element(this.container, { className: 'box-scene-tab-container' }).element;
		this.tabs = [];

		for (let i = 0; i < TAB_CONTENT.length; i++) {
			this.tabs[i] = new Element(this.tabContainer, { className: 'box-scene-tab' }).element;
			this.tabs[i].addEventListener('click', () => this.applyTabEffect(i))
			this.tabs[i].addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		}

		this.search = new Input(
			this.container, 
			"text", 
			{ 
				className: "box-scene-search", 
				maxlength: 10, 
				cb: () => { this.searchByName() } 
			}
		);

		this.background.addEventListener('click', (e) => { if (e.target == this.background) this.close() })
	}

	update() {
		this.title.innerHTML = text.box.title[this.main.lang].toUpperCase();
		this.displayUnits();
		if (this.selected === undefined) this.selected = this.pokemon[0];
		this.displayPokemon();

		this.dataUnit.innerHTML = text.ui.info[this.main.lang].toUpperCase();
		this.addUnit.innerHTML = text.box.add[this.main.lang].toUpperCase();
		this.removeUnit.innerHTML = text.box.remove[this.main.lang].toUpperCase();
		this.removeAll.innerHTML = text.box.removeAll[this.main.lang].toUpperCase();
		this.sortValue.innerHTML = text.box[sort[this.sorted]][this.main.lang].toUpperCase();

		this.tabs.forEach((tab, i) => {
			tab.innerHTML = text.box[TAB_CONTENT[i]][this.main.lang].toUpperCase();
		})
	}

	searchByName() {
		const searchValue = this.search.value.value.toLowerCase(); 

		// RESTORED: Vanilla search with m- prefix normalization for Mega Pokemon
		this.searchPokemon = this.pokemon.filter(poke => {
	        const normalizedName =
	            poke.name && poke.name[this.main.lang]
	                ? poke.name[this.main.lang]
	                      .toLowerCase()
	                      .replace(/^m-/, '') 
	                : '';

	        return (
	            (normalizedName.startsWith(searchValue)) ||
	            (poke.alias && poke.alias.toLowerCase().startsWith(searchValue)) ||
	            (poke.ability && poke.ability.name[this.main.lang].toLowerCase().startsWith(searchValue)) ||
	            (searchValue === "shiny" && poke.isShiny === true) ||
	            ((searchValue === "area" || searchValue === "aoe") && poke.attackType === 'area') ||
	            (searchValue === "x" && poke.rangeType === 'xShape') ||
	            ((searchValue === "cross" || searchValue === "+") && poke.rangeType === 'cross') ||
	            (searchValue === "stun" && poke.id === 72) ||
	            (searchValue === "slow" && (poke.id === 80 || poke.id === 64))
	        );
	    });

	    this.displayUnits();
	}

	displayUnits() {
		this.sortUnits();

		for (let i = 0; i < 200; i++) {
			const unit = this.units[i];
			const poke = this.searchPokemon[i];

			if (poke) {
				if (poke.favorite) this.units[i].fav.innerHTML = "â­"; 
				else this.units[i].fav.innerHTML = "";

				if (poke?.item?.id == 'inverter') this.units[i].style.transform = `scale(1, -1)`;
				else this.units[i].style.transform = `revert-layer`;

				this.units[i].shiny.style.display = (poke.isShiny) ? 'revert-layer' : 'none';
				this.units[i].text.innerHTML = "";
				if (this.sorted <= 1 || this.sorted == 10) this.units[i].text.innerHTML = poke.name[this.main.lang];
				else if (this.sorted == 2) {
					if (this.main.area.inChallenge.lvlCap === 'number') this.units[i].text.innerHTML = `Lv ${this.main.area.inChallenge.lvlCap}`;
					else this.units[i].text.innerHTML = `Lv ${poke.lvl}`;
				}
				else if (this.sorted == 3) this.units[i].text.innerHTML = `<span style="line-height: 7px;">${abilityData[poke.ability.id].name[this.main.lang]}</span>`;
				else if (this.sorted > 3 && this.sorted < 7) {
					poke.tiles.forEach(tile => {
						if (tile == 2) this.units[i].text.innerHTML += `<span style="color: #409552; font-size: 7px; letter-spacing: 2px;">G</span>`
						if (tile == 3) this.units[i].text.innerHTML += `<span style="color: #5ea1d9; font-size: 7px; letter-spacing: 2px;">W</span>`
						if (tile == 4) this.units[i].text.innerHTML += `<span style="color: #b89184; font-size: 7px; letter-spacing: 2px;">M</span>`
					})
				}
				if (this.sorted == 7) this.units[i].text.innerHTML = poke.power;
				if (this.sorted == 8) this.units[i].text.innerHTML = `${(poke.speed/ 1000).toFixed(2)}`;
				if (this.sorted == 9) this.units[i].text.innerHTML = poke.range

				unit.style.display = 'revert-layer';
				unit.style.backgroundImage = `url("${poke.sprite.base}")`;
				unit.style.pointerEvents = 'all';
				unit.style.filter = 'revert-layer';

				if (this.main.team.pokemon.includes(poke)) {
					if (poke.id == 70) unit.style.backgroundColor = 'rgba(215, 148, 223, 0.35)';
					else unit.style.backgroundColor = 'rgba(0, 255, 0, 0.15)';
					unit.style.borderRadius = '50%';

				} else {
					unit.style.backgroundColor = 'transparent';
					unit.style.borderRadius = '0';
				}
				if (this.tabSelected != 0) {
					unit.style.filter = 'revert-layer';
					switch (this.tabSelected) {
						case 1:
							if (!poke.tiles.includes(2)) unit.style.filter = 'brightness(0.3)';
							break;
						case 2:
							if (!poke.tiles.includes(3)) unit.style.filter = 'brightness(0.3)';
							break;
						case 3:
							if (!poke.tiles.includes(4)) unit.style.filter = 'brightness(0.3)';
							break;
						case 4:
							if (![58, 59, 63, 64, 65, 66, 94].includes(poke.id)) unit.style.filter = 'brightness(0.3)';
							break;
					}
				}
			} else {
				unit.style.display = 'none';
				unit.style.backgroundImage = '';
				unit.style.pointerEvents = 'none';
				unit.style.filter = 'brightness(0.5)';
				unit.style.backgroundColor = 'transparent';
			}
		}
	}

	applyTabEffect(tab) {
		playSound('option', 'ui')
		this.tabSelected = tab;
		this.pokemon.forEach((pokemon, i) => {
			this.units[i].style.filter = 'revert-layer';
			switch (tab) {
			case 1:
				if (!pokemon.tiles.includes(2)) this.units[i].style.filter = 'brightness(0.3)';
				break;
			case 2:
				if (!pokemon.tiles.includes(3)) this.units[i].style.filter = 'brightness(0.3)';
				break;
			case 3:
				if (!pokemon.tiles.includes(4)) this.units[i].style.filter = 'brightness(0.3)';
				break;
			case 4:
				if (![58, 59, 63, 64, 65, 66, 94].includes(pokemon.id)) this.units[i].style.filter = 'brightness(0.3)';
				break;
			}
		})
	}

	displayPokemon() {
		this.unitSelectedName.innerText = (this.selected.alias != undefined) ? this.selected.alias.toUpperCase() : this.selected.name[this.main.lang].toUpperCase();
		this.unitSelectedName.innerText += (this.main.area.inChallenge.lvlCap === 'number') ? ` [${this.main.area.inChallenge.lvlCap}]` : ` [${this.selected.lvl}]`;
		this.unitSelectedName.style.color = this.selected.specie.color;
		this.unitSelectedName.style.borderColor = this.selected.specie.color;
		this.favoriteButton.style.filter = (this.selected.favorite) ?  `grayscale(0%)` : `grayscale(100%)`;

		if (this.selected.inGroup) {
			this.addUnit.style.pointerEvents = 'none';
			this.addUnit.style.filter = 'brightness(0.8)';
			this.removeUnit.style.pointerEvents = 'all';
			this.removeUnit.style.filter = 'revert-layer';
		} else {
			this.removeUnit.style.pointerEvents = 'none';
			this.removeUnit.style.filter = 'brightness(0.8)';
			if (this.main.team.pokemon.length < this.main.player.teamSlots) {
				this.addUnit.style.pointerEvents = 'all';
				this.addUnit.style.filter = 'revert-layer';
			} else {
				this.addUnit.style.pointerEvents = 'none';
				this.addUnit.style.filter = 'brightness(0.8)';
			}
		}
	}

	addButton() {
		if (
			typeof this.main.area.inChallenge.slotLimit == 'number' &&
			this.main.team.pokemon.length >= this.main.area.inChallenge.slotLimit
		) {
			playSound('pop0', 'ui');
			return;
		}
		this.main.team.addPokemon(this.selected);
		this.main.box.removePokemon(this.selected);
		this.update();
		this.main.UI.updatePokemon();
	}

	removeButton() {
		if (this.selected.isDeployed) {
			this.selected.isDeployed = false;
		
			// RETIRAR TORRE
			const index = this.main.area.towers.findIndex((tower) => tower.pokemon == this.selected);
			this.main.UI.tilesCountNum[this.main.area.towers[index].tile.land-1]--;
			this.main.area.towers[index].tile.tower = false;
			this.main.area.towers.splice(index, 1)
		}

		this.main.box.addPokemon(this.selected);
		this.main.team.removePokemon(this.selected);
		this.main.area.checkWeather();
		this.update();
		this.main.UI.update();
	}

	removeAllButton() {
		const teamCopy = [...this.main.team.pokemon];

		for (const pokemon of teamCopy) {
			if (pokemon.isDeployed) {
				pokemon.isDeployed = false;

				// retirar torre
				const index = this.main.area.towers.findIndex(tower => tower.pokemon === pokemon);
				if (index !== -1) {
					this.main.UI.tilesCountNum[this.main.area.towers[index].tile.land-1]--;
					this.main.area.towers[index].tile.tower = false;
					this.main.area.towers.splice(index, 1);
				}
			}

			this.main.box.addPokemon(pokemon);
			this.main.team.removePokemon(pokemon);
		}

		if (this.isOpen) this.update();
		this.main.UI.update();
	}

	removeAllItems() {
		this.pokemon = [...this.main.team.pokemon, ...this.main.box.pokemon];
		this.pokemon.forEach(pokemon => pokemon.retireItem());
	}

	sortUnits() {
		if (!this.searchPokemon) return;
		switch (sort[this.sorted]) {
		    case 'team':
		        this.searchPokemon.sort((a, b) => {
			        if (a.inGroup !== b.inGroup) {
			            return a.inGroup ? -1 : 1;
			        }
			        if (a.favorite !== b.favorite) {
			            return a.favorite ? -1 : 1;
			        }
			        return 0;
			    });
		        break;
		    case 'alphabetical':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            return a.name[this.main.lang].localeCompare(b.name[this.main.lang]);
		        });
		        break;
		    case 'level':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            return b.lvl - a.lvl;
		        });
		        break;
		    case 'ability':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            return a.ability.id.localeCompare(b.ability.id);
		        });
		        break;
		    case 'grass':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            const aHas = a.tiles.includes(2) ? 0 : 1; 
		            const bHas = b.tiles.includes(2) ? 0 : 1;
		            return aHas - bHas;
		        });
		        break;
		    case 'water':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            const aHas = a.tiles.includes(3) ? 0 : 1; 
		            const bHas = b.tiles.includes(3) ? 0 : 1;
		            return aHas - bHas;
		        });
		        break;
		    case 'mountain':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            const aHas = a.tiles.includes(4) ? 0 : 1; 
		            const bHas = b.tiles.includes(4) ? 0 : 1;
		            return aHas - bHas;
		        });
		        break;
		    case 'power':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            return b.power - a.power;
		        });
		        break;
		    case 'speed':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            return a.speed - b.speed;
		        });
		        break;
		    case 'range':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            return b.range - a.range;
		        });
		        break;
		    case 'shiny':
		        this.searchPokemon.sort((a, b) => {
		            return b.isShiny - a.isShiny;
		        });
		        break;
		}
	}

	changesort(value) {
		this.sorted += value;
		if (this.sorted > 10) this.sorted = 0;
		else if (this.sorted < 0) this.sorted = 10;
		this.main.player.sortedBox = this.sorted;
		this.update();
		playSound('option', 'ui');
	}

	open() {
		if (this.main.area.inChallenge.draft) return;

		super.open();
		this.search.value.value = "";
		this.tabSelected = 0;
		if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit()
		this.sorted = this.main.player.sortedBox;
		this.pokemon = [...this.main.team.pokemon, ...this.main.box.pokemon];
		this.searchPokemon = this.pokemon;
		this.update();

		if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}

	toggleFavorite() {
		(this.selected.favorite == true) ? this.selected.favorite = false : this.selected.favorite = true;
		this.update();
	}
}



