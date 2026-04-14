import { GameScene } from '../../utils/GameScene.js';
import { SectionScene } from '../../utils/SectionScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { playSound } from '../../file/audio.js';
import { Input } from '../../utils/Input.js';
import { ChangePokemonName } from './ChangePokemonName.js';
import { abilityData } from '../data/abilityData.js';
import { allPokemon } from '../data/pokemonData.js';

const sort = ['team', 'alphabetical', 'level', 'ability', 'grass', 'water', 'mountain', 'power', 'speed', 'critical', 'range', 'shiny', 'attackType']
const TAB_CONTENT = ['allTab', 'grassTab', 'waterTab', 'mountainTab', 'fossilTab']

export class BoxScene extends SectionScene {
	constructor(main) {
		super();
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
		this.unitSelectedName = new Element(this.container, { className: 'box-scene-unit-selected-name' }).element;

		this.unitSelectedName.addEventListener('click', () => {
			this.nameChange.open(this.selected);
		})

		this.favoriteButton = new Element(this.container, { className: 'box-scene-favorite-button', text: '⭐' }).element;

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

		this.dataUnit.addEventListener('click', () => { this.main.pokemonScene.open(this.selected, this.selectedPos, this.searchPokemon) });
		this.addUnit.addEventListener('click', () => { 
			playSound('equip', 'ui');
			this.addButton();
		});
		this.removeUnit.addEventListener('click', () => {
			this.removeButton();
		});
		this.removeAll.addEventListener('click', () => {
			this.removeAllButton();
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
			    
			    this.units.forEach(unit => unit.classList.remove('is-selected'));
			    this.units[i].classList.add('is-selected');

			    this.selected = this.searchPokemon[i];
			    this.selectedPos = i;
			    this.displayPokemon();
			});
			this.units[i].addEventListener('dblclick', () => {
				this.selected = this.searchPokemon[i];
				if (this.selected.inGroup) {
					if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit();

					if (this.selected.isDeployed) {
						this.main.game.deployingUnit = this.selected;
						this.main.game.retireUnit();
					} else {
						playSound('unequip', 'ui');
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
			});
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
			this.tabs[i].addEventListener('click', () => {
			    this.tabs.forEach(tab => tab.classList.remove('is-active'));
			    this.tabs[i].classList.add('is-active');
			    this.applyTabEffect(i);
			});
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

		this.setupUnitDragAndDrop();
	}

	update() {
		this.displayUnits();
		if (this.selected === undefined) this.selected = this.pokemon[0];
		this.displayPokemon();

		this.dataUnit.innerHTML = text.ui.info[this.main.lang].toUpperCase();
		this.addUnit.innerHTML = text.box.add[this.main.lang].toUpperCase();
		this.removeUnit.innerHTML = text.box.remove[this.main.lang].toUpperCase();
		this.removeAll.innerHTML = text.box.removeAll[this.main.lang].toUpperCase();
		const sortLabel = sort[this.sorted] === 'attackType'
			? 'Attack Type'
			: (text.box[sort[this.sorted]]?.[this.main.lang] || sort[this.sorted]);
		this.sortValue.innerHTML = sortLabel.toUpperCase();

		this.tabs.forEach((tab, i) => {
	        tab.innerHTML = text.box[TAB_CONTENT[i]][this.main.lang].toUpperCase();  
	        (this.tabSelected === i) ? tab.classList.add('is-active') : tab.classList.remove('is-active');
	    });
	}

	searchByName() {
		const searchValue = this.search.value.value.toLowerCase(); 

		this.searchPokemon = this.pokemon.filter(poke => {
	        const normalizedName =
	            poke.name && poke.name[this.main.lang]
	                ? poke.name[this.main.lang]
	                      .toLowerCase()
	                      .replace(/^m-/, '') 
	                : '';

	        return (
	            (normalizedName.includes(searchValue)) ||
	            (poke.alias && poke.alias.toLowerCase().includes(searchValue)) ||
	            (poke.ability && poke.ability.name[this.main.lang].toLowerCase().includes(searchValue)) ||
	            (searchValue === "shiny" && poke.isShiny === true) ||
	            ((searchValue === "area" || searchValue === "aoe") && poke.attackType === 'area') ||
	            (searchValue === "x" && poke.rangeType === 'xShape') ||
	            ((searchValue === "cross" || searchValue === "+") && poke.rangeType === 'cross') ||
	            (searchValue === "stun" && (poke.id === 72 || poke.id === 13)) ||
	            (searchValue === "slow" && (poke.id === 80 || poke.id === 64)) ||
	            (searchValue === "curse" && poke.id === 16)
	        );
	    });

	    this.displayUnits();
	}

	displayUnits() {
		this.sortUnits();

		for (let i = 0; i < 200; i++) {
			const unit = this.units[i];
			const poke = this.searchPokemon[i];
			unit.classList.remove('is-selected');

			if (poke) {
				if (this.selected && poke === this.selected) unit.classList.add('is-selected');
           
				if (poke.favorite) this.units[i].fav.innerHTML = "⭐"; 
				else this.units[i].fav.innerHTML = "";

				if (poke?.item?.id == 'inverter') this.units[i].style.transform = `scale(1, -1)`;
				else this.units[i].style.transform = `revert-layer`;

				this.units[i].shiny.style.display = (poke.isShiny) ? 'revert-layer' : 'none';
				this.units[i].text.innerHTML = "";
				if (this.sorted <= 1 || this.sorted == 11) this.units[i].text.innerHTML = poke.name[this.main.lang];
				else if (this.sorted == 12) {
					const typeLabels = { 'area': 'AOE', 'aura': 'Aura', 'single': 'Single' };
					const typeColors = { 'area': '#e94560', 'aura': '#a855f7', 'single': '#38bdf8' };
					const label = typeLabels[poke.attackType] || poke.attackType;
					const color = typeColors[poke.attackType] || '#fff';
					this.units[i].text.innerHTML = `<span style="color: ${color}; font-size: 7px;">${label}</span>`;
				}
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
				if (this.sorted == 9) this.units[i].text.innerHTML = `${poke.critical.toFixed(1)}%`
				if (this.sorted == 10) this.units[i].text.innerHTML = poke.range
					
				unit.style.display = 'revert-layer';
				unit.style.backgroundImage = `url("${poke.sprite.base}")`;
				unit.style.pointerEvents = 'all';
				unit.style.filter = 'revert-layer';

				if (this.main.team.pokemon.includes(poke)) {
				    unit.classList.add('unit-in-team');
				    (poke.id == 70) ? unit.classList.add('unit-special') : unit.classList.remove('unit-special');
				} else {
				    unit.classList.remove('unit-in-team', 'unit-special');
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
							if (![58, 59, 63, 64, 65, 66, 94, 140, 136].includes(poke.id)) unit.style.filter = 'brightness(0.3)';
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
	    playSound('option', 'ui');
	    this.tabSelected = tab;

	    if (!this.searchPokemon) return;

	    for (let i = 0; i < this.units.length; i++) {
	        const poke = this.searchPokemon[i]; 
	        if (!poke) {
	            this.units[i].style.filter = 'brightness(0.5)'; 
	            continue;
	        }

	        this.units[i].style.filter = 'revert-layer';
	        switch (tab) {
	            case 1:
	                if (!poke.tiles.includes(2)) this.units[i].style.filter = 'brightness(0.3)';
	                break;
	            case 2:
	                if (!poke.tiles.includes(3)) this.units[i].style.filter = 'brightness(0.3)';
	                break;
	            case 3:
	                if (!poke.tiles.includes(4)) this.units[i].style.filter = 'brightness(0.3)';
	                break;
	            case 4:
	                if (![58, 59, 63, 64, 65, 66, 94, 140, 136].includes(poke.id)) this.units[i].style.filter = 'brightness(0.3)';
	                break;
	        }
	    }
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
		if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit();

		if (this.selected.isDeployed) {
			this.main.game.deployingUnit = this.selected;
			this.main.game.retireUnit();
		} else {
			playSound('unequip', 'ui');
		}

		this.main.box.addPokemon(this.selected);
		this.main.team.removePokemon(this.selected);

		this.main.area.checkWeather();
		this.update();
		this.main.UI.update();
	}

	removeAllButton() {
		playSound('unequip', 'ui');
		const teamCopy = [...this.main.team.pokemon];

		for (const pokemon of teamCopy) {

			if (pokemon.isDeployed) {
				if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit();
				this.main.game.deployingUnit = pokemon;
				this.main.game.retireUnit();
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
			        const nameA = a.ability?.name?.[this.main.lang] ?? '';
			        const nameB = b.ability?.name?.[this.main.lang] ?? '';
			        return nameA.localeCompare(nameB);
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
		    case 'critical':
		        this.searchPokemon.sort((a, b) => {
		            if (a.favorite && !b.favorite) return -1;
		            if (!a.favorite && b.favorite) return 1;
		            return b.critical - a.critical;
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
		    case 'attackType':
		        {
		            const typeOrder = { 'area': 0, 'aura': 1, 'single': 2 };
		            this.searchPokemon.sort((a, b) => {
		                if (a.favorite && !b.favorite) return -1;
		                if (!a.favorite && b.favorite) return 1;
		                return (typeOrder[a.attackType] ?? 3) - (typeOrder[b.attackType] ?? 3);
		            });
		        }
		        break;
		}
	}

	changesort(value) {
		this.sorted += value;
		if (this.sorted > 12) this.sorted = 0;
		else if (this.sorted < 0) this.sorted = 12;
		this.main.player.sortedBox = this.sorted;
		this.update();
		playSound('option', 'ui');
	}

	open() {
		if (this.main.area.inChallenge.draft) return;
		if (this.main.game.stopped) return playSound('pop0', 'ui');
		if (this.isOpen) return this.close();
		
		this.main.sections.forEach(section => {
			if (section.isOpen && section != this) section.close();
		})

		super.open();
		this.search.value.value = "";
		this.tabSelected = 0;
		if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit()
		this.sorted = this.main.player.sortedBox;
		this.pokemon = [...this.main.team.pokemon, ...this.main.box.pokemon];
		this.searchPokemon = this.pokemon;
		this.update();
		this.main.UI.section['box'].classList.add('is-selected');
		
		if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}

	close() {
		super.close();
		this.main.UI.section['box'].classList.remove('is-selected');
	}

	toggleFavorite() {
		(this.selected.favorite == true) ? this.selected.favorite = false : this.selected.favorite = true;
		this.update();
	}


	setupUnitDragAndDrop() {
	    if (this._unitDragSetup) return;
	    this._unitDragSetup = true;
	    this.isDragging = false;

	    const THRESHOLD = 6; 
	    let draggedIndex = null;
	    let clone = null;
	    let activePointerId = null;
	    let originatingUnit = null;
	    let originBgSaved = null;
		let originTransformSaved = null;

	    const clearDragState = () => {
	        if (clone && typeof clone.remove === 'function') { clone.remove(); clone = null; }
	        if (originatingUnit && activePointerId != null) {
	            try { originatingUnit.releasePointerCapture(activePointerId); } catch (e) {}
	        }

	        if (originatingUnit) {
	        	originatingUnit.classList.remove('is-dragging');
			    if (originBgSaved !== null) {

			        originatingUnit.style.backgroundImage = originBgSaved;
			        originBgSaved = null;
			    }
			    if (originTransformSaved !== null) {
			        originatingUnit.style.transform = originTransformSaved;
			        originTransformSaved = null;
			    }
			}
	        draggedIndex = null;
	        activePointerId = null;
	        originatingUnit = null;
	        this.isDragging = false;

	        if (this.main?.game?.mouse) {
	            this.main.game.mouse.x = undefined;
	            this.main.game.mouse.y = undefined;
	            try { this.main.game.animate(performance.now()); } catch (err) {}
	        }

	        this.pokemon.forEach(s => { if (s && s.classList) s.classList.remove('drag-over'); });

	        document.body.style.cursor = '';
	    };

	    const onPointerMoveDuringDrag = (e) => {
	        if (this.main.game.stopped) return playSound('pop0', 'ui');
	        if (!clone) return;
	        clone.style.left = `${e.pageX - clone.offsetWidth / 2}px`;
	        clone.style.top = `${e.pageY - clone.offsetHeight / 2}px`;

	        clone.style.display = 'none';
	        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
	        clone.style.display = 'block';

	        const targetSlot = targetElement?.closest('.ui-pokemon');
	        this.pokemon.forEach(s => { if (s && s.classList) s.classList.remove('drag-over'); });
	        if (targetSlot && parseInt(targetSlot.dataset.index) !== draggedIndex) {
	            targetSlot.classList.add('drag-over');
	        }

	        try {
	            const canvasEl = this.main.game.canvas;
	            const rect = canvasEl.getBoundingClientRect();

	            if (
	                e.clientX >= rect.left && e.clientX <= rect.right &&
	                e.clientY >= rect.top && e.clientY <= rect.bottom
	            ) {
	                const scaleX = canvasEl.width / rect.width;
	                const scaleY = canvasEl.height / rect.height;
	                const canvasX = (e.clientX - rect.left) * scaleX;
	                const canvasY = (e.clientY - rect.top) * scaleY;

	                this.main.game.mouse.x = canvasX;
	                this.main.game.mouse.y = canvasY;
	            } else {
	                this.main.game.mouse.x = undefined;
	                this.main.game.mouse.y = undefined;
	            }
	        } catch (err) {}

	        try { this.main.game.animate(performance.now()); } catch (err) {}
	    };

	    const onPointerUpDuringDrag = (e) => {
	        if (this.main.game.stopped) return playSound('pop0', 'ui');

	        window.removeEventListener('pointermove', onPointerMoveDuringDrag);
	        window.removeEventListener('pointerup', onPointerUpDuringDrag);

	        if (clone && typeof clone.remove === 'function') clone.remove();

	        const canvasEl = this.main.game.canvas;
	        let tile = null;
	        if (canvasEl) {
	            const rect = canvasEl.getBoundingClientRect();
	            const cx = e.clientX;
	            const cy = e.clientY;

	            if (
	                cx >= rect.left && cx <= rect.right &&
	                cy >= rect.top && cy <= rect.bottom &&
	                draggedIndex != null
	            ) {
	                const scaleX = canvasEl.width / rect.width;
	                const scaleY = canvasEl.height / rect.height;
	                const canvasX = (cx - rect.left) * scaleX;
	                const canvasY = (cy - rect.top) * scaleY;

	                tile = this.main.area.placementTiles.find(t =>
	                    canvasX > t.position.x &&
	                    canvasX < t.position.x + t.size &&
	                    canvasY > t.position.y &&
	                    canvasY < t.position.y + t.size
	                );
	            }
	        }
	        if (tile && draggedIndex != null) {
	            const pokemon = this.searchPokemon[draggedIndex];
	            if (!pokemon) {
	                clearDragState();
	                return;
	            }

	            const clickedPokemon = tile.tower || null;

	            this.main.game.tryDeployUnit(draggedIndex, true);

	            if (!this.main.game.deployingUnit) this.main.game.deployingUnit = pokemon;

	            if (clickedPokemon === this.main.game.deployingUnit) {
	                this.main.game.cancelDeployUnit();
	            } else {
	                const canPlace = tile?.canPlacePokemonHere 
	                    ? tile.canPlacePokemonHere(this.main.game.deployingUnit)
	                    : (
	                        this.main.game.deployingUnit.tiles.includes(tile.land) ||
	                        (this.main.game.deployingUnit?.item?.id == 'airBalloon' && tile.land == 4) ||
	                        (this.main.game.deployingUnit?.item?.id == 'heavyDutyBoots' && tile.land == 2) ||
	                        (this.main.game.deployingUnit?.item?.id == 'assaultVest' && tile.land == 2) ||
	                        (this.main.game.deployingUnit?.item?.id == 'dampMulch' && tile.land == 1) ||
	                        (this.main.game.deployingUnit?.item?.id == 'subwoofer' && tile.land == 3 && [76, 86, 120].includes(this.main.game.deployingUnit.id))
	                    );

	                if (!canPlace) {
	                    this.main.game.cancelDeployUnit();
	                } else {
	                    if (!clickedPokemon) {
	                        this.main.game.moveUnitToTile(tile);
	                    } else {
	                        if (this.main.game.deployingUnit.isDeployed) {
	                            const sourceTile = this.main.area.placementTiles.find(t => t.tower === this.main.game.deployingUnit);
	                            if (sourceTile) {
	                                this.main.game.swapUnits(sourceTile, this.main.game.deployingUnit, tile, clickedPokemon);
	                            } else {
	                                this.main.game.retireUnit();
	                                this.main.game.moveUnitToTile(tile);
	                            }
	                            this.main.game.cancelDeployUnit();
	                            playSound('equip', 'ui');
	                            if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	                            if (!this.main.area.waveActive) {
	                                this.main.UI.revertUI();
	                                this.main.UI.nextWave.style.filter = 'revert-layer';
	                                this.main.UI.nextWave.style.pointerEvents = 'revert-layer';
	                            }
	                        } else {
	                            this.main.game.moveUnitToTile(tile);
	                        }
	                    }
	                }
	            }
	            this.update();
	            if (this.main.UI) this.main.UI.updatePokemon();
	            clearDragState();
	            return;
	        }

	        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
	        const targetSlot = targetElement?.closest('.ui-pokemon');

	        if (targetSlot && draggedIndex != null) {
			    const toIndex = parseInt(targetSlot.dataset.index);
			    const fromIndex = draggedIndex;

			    if (isNaN(toIndex) || toIndex >= this.main.player.teamSlots) {
			        playSound('pop0', 'ui');
			        clearDragState();
			        return;
			    }

			    const pokemonToAdd = this.searchPokemon?.[fromIndex];
			    if (!pokemonToAdd) { clearDragState(); return; }

			    if (pokemonToAdd.inGroup || this.main.team.pokemon.includes(pokemonToAdd)) {
			        playSound('pop0', 'ui');
			        if (this.main.game?.deployingUnit && !this.main.game.deployingUnit.isDeployed) {
			            this.main.game.deployingUnit = undefined;
			        }
			        clearDragState();
			        return;
			    }

			    const existing = this.main.team.pokemon[toIndex];
			    if (existing && existing !== pokemonToAdd) {
			        if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit();

			        if (existing.isDeployed) {
			            this.main.game.deployingUnit = existing;
			            this.main.game.retireUnit();
			        } else {
			            playSound('unequip', 'ui');
			        }

			        this.main.box.addPokemon(existing);
			        this.main.team.removePokemon(existing);
			    }

			    if (
			        typeof this.main.area.inChallenge.slotLimit == 'number' &&
			        this.main.team.pokemon.length >= this.main.area.inChallenge.slotLimit
			    ) {
			        playSound('pop0', 'ui');
			        clearDragState();
			        return;
			    }

			    this.main.team.addPokemon(pokemonToAdd);
			    this.main.box.removePokemon(pokemonToAdd);

			    const teamArr = this.main.team.pokemon;
			    const currentPos = teamArr.indexOf(pokemonToAdd);
			    if (currentPos !== -1 && currentPos !== toIndex) {
			        teamArr.splice(currentPos, 1);
			        const insertIndex = Math.min(Math.max(0, toIndex), teamArr.length);
			        teamArr.splice(insertIndex, 0, pokemonToAdd);
			        this.main.team.pokemon = teamArr;
			    }
			    this.update();
			    if (this.main.UI) this.main.UI.updatePokemon();
			    playSound('equip', 'ui');

			    clearDragState();
			    return;
			}
	        clearDragState();
	    };

	    const startDragActual = (e, index, originatingSlot) => {
		    if (this.main.game.stopped) return playSound('pop0', 'ui');
		    if (!this.searchPokemon || !this.searchPokemon[index]) { clearDragState(); return; }

		    const pokemon = this.searchPokemon[index];
		    draggedIndex = index;
		    originatingUnit = originatingSlot;
		    document.body.style.cursor = 'grabbing';

		    originBgSaved = originatingSlot.style.backgroundImage || '';
			originTransformSaved = originatingSlot.style.transform || '';
			originatingSlot.style.backgroundImage = 'none';
			originatingSlot.style.transform = 'revert-layer';

		    clone = document.createElement('div');
		    clone.className = 'box-drag-sprite-clone';
		    clone.style.position = 'absolute';
		    clone.style.zIndex = '10000';
		    clone.style.pointerEvents = 'none'; 

		    const spriteUrl = pokemon?.sprite?.base || '';
		    clone.style.backgroundImage = `url("${spriteUrl}")`;
		    clone.style.backgroundRepeat = 'no-repeat';
		    clone.style.backgroundPosition = 'center';
		    clone.style.scale = '1.2';
		    clone.style.imageRendering = 'pixelated';
		    clone.style.width = `60px`;
		    clone.style.height = `60px`;
		    clone.style.filter = `drop-shadow(6px 6px 2px #222)`;

		    document.body.appendChild(clone);

		    originatingSlot.classList.add('is-dragging');
		    this.isDragging = true;
		    
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

	        if (e.target.closest('.box-scene-unit-fav') || e.target.closest('.box-scene-unit-shiny')) return;

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

	    for (let i = 0; i < this.units.length; i++) {
	        const unitEl = this.units[i];
	        if (!unitEl) continue;
	        if (unitEl._boxDragSetup) continue;
	        unitEl._boxDragSetup = true;

	        unitEl.dataset.index = i;

	        unitEl.addEventListener('pointerdown', (e) => onPointerDownCandidate.call(unitEl, e));
	        unitEl.addEventListener('dragstart', (e) => e.preventDefault());
	    }
	}

}

