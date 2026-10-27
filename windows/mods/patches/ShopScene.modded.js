import { GameScene } from '../../utils/GameScene.js';
import { SectionScene } from '../../utils/SectionScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { playSound } from '../../file/audio.js';

export class ShopScene extends SectionScene {
	constructor(main) {
		super();
		this.main = main;

		this.displayPokemon = new DisplayPokemon(this.main);
		this.displayItem = new DisplayItem(this.main)	

		this.render();
	}

	render() {
		this.container.className = 'section-scene-container section-scene-container-shop';

		this.itemContainer = new Element(this.container, { className: 'shop-scene-item-container' }).element;
		this.egg = new Element(this.itemContainer, { className: 'shop-scene-item shop-scene-egg' }).element;
		this.purchaseEgg = new Element(this.egg, { className: 'shop-scene-purchase stroke' }).element;

		this.egg.addEventListener('click', () => { this.main.shop.buyEgg(); });
		this.egg.addEventListener('mouseenter', () => { playSound('hover3', 'ui'); });

		this.itemSlot = [];

		for (let i = 0; i < 10; i++) {
			this.itemSlot[i] = new Element(this.itemContainer, { className: 'shop-scene-item' }).element;

			this.itemSlot[i].image = new Element(this.itemSlot[i], {
				className: 'shop-scene-item-image'
			}).element;

			this.itemSlot[i].purchaseButton = new Element(this.itemSlot[i], {
				className: 'shop-scene-purchase stroke'
			}).element;

			this.itemSlot[i].addEventListener('mouseenter', () => {
				playSound('hover3', 'ui');
			});

			this.itemSlot[i].addEventListener('click', () => {
				this.main.shop.buyItem(i);
			});
		}
	}

	update() {
		this.updateEgg();
		this.updateItems();
	}

	updateEgg() {
		this.purchaseEgg.innerHTML = `$${this.main.utility.numberDot(Math.min(50000, this.main.shop.eggPrice), this.main.lang)}`
		this.main.tooltip.bindTo(this.egg, { name: text.shop.eggName, description: text.shop.egg }, 'item', 'var(--tierPokemon)');

		if (this.main.player.gold >= Math.min(50000, this.main.shop.eggPrice) && this.main.shop.eggList.length > 0) {
			this.egg.style.filter = 'revert-layer';
		} else {
			this.egg.style.filter = 'brightness(0.8)';
			if (this.main.shop.eggList.length === 0) {
				this.purchaseEgg.innerHTML = text.shop.sold[this.main.lang].toUpperCase();
				this.main.tooltip.unbindTo(this.egg);
				this.egg.style.pointerEvents = 'none';
			}
		}
	}

	updateItems() {
		this.itemSlot.forEach((item, i) => {
			item.style.backgroundImage = `url("./src/assets/images/items/poke.png")`;
			item.purchaseButton.innerHTML = text.shop.sold[this.main.lang].toUpperCase();
			item.style.filter = 'brightness(0.8)';

			const shopItem = this.main.shop.itemStock[i];

			if (shopItem != null) {
				item.style.backgroundImage = `url(${shopItem.sprite})`;
				const tierColor = this.main.utility.colorTier(shopItem.tier);
				item.purchaseButton.innerHTML = `$${this.main.utility.numberDot(shopItem.price, this.main.lang)}`;
				this.main.tooltip.bindTo(item, shopItem, 'item', this.main.utility.colorTier(shopItem.tier));

				if (this.main.player.gold >= shopItem.price) {
					item.style.filter = 'revert-layer';
				}
			} else {
				item.style.pointerEvents = 'none'
				this.main.tooltip.unbindTo(item);
			}
		});
	}

	open() {
		if (this.main.game.stopped) return playSound('pop0', 'ui');
		if (this.isOpen) return this.close();
		
		this.main.sections.forEach(section => {
			if (section.isOpen && section != this) section.close();
		})
		
		super.open();
		this.update();
		this.main.UI.section['shop'].classList.add('is-selected');
		if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}

	close() {
		super.close();
		this.main.UI.section['shop'].classList.remove('is-selected');
		this.main.tooltip.hide();
	}
}

class DisplayPokemon extends GameScene {
	constructor(main) {
		super(200, 200);
		this.main = main;
		this.pokemon;
		this.isShinyReveal = false;
		this.secretTextValue = undefined;
		
		this.header.removeChild(this.closeButton);
		this.render();
	}

	render() {
		this.title.innerHTML = text.shop.pokemon[this.main.lang].toUpperCase();
		this.prompt = new Element(this.container, { className: 'dp-scene-prompt stroke' }).element;
		this.pokemonName = new Element(this.container, { className: 'dp-scene-pokemon-name stroke' }).element;
		this.image = new Element(this.container, { className: 'dp-scene-image' }).element;
		this.image.style.cssText = 'width:96px;height:96px;background-size:contain;image-rendering:pixelated;margin-top:10px;';
		
		this.shinySymbol = new Element(this.container, { className: 'dp-scene-shiny-symbol' }).element;
		this.shinySymbol.innerHTML = '<span class="msrre">⭐</span>';
		this.shinySymbol.style.cssText = 'position:absolute;top:10px;right:10px;font-size:40px;display:none;text-shadow:0 0 10px gold,0 0 20px gold;';
		
		if (!document.getElementById('shinyPulseStyle')) {
			const style = document.createElement('style');
			style.id = 'shinyPulseStyle';
			style.textContent = '@keyframes shinyPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:0.8}}';
			document.head.appendChild(style);
		}
		this.shinySymbol.style.animation = 'shinyPulse 1s ease-in-out infinite';
		

		this.closeButton = new Element(this.container, { className: 'shop-scene-purchase-egg stroke' }).element;

		this.secretText = new Element(this.container, { className: 'dp-scene-secret-text stroke' }).element;

		this.closeButton.addEventListener('click', () => {
			playSound('button2', 'ui'); 
			this.close();
		})
		this.closeButton.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
		this.background.addEventListener('click', (e) => { if (e.target == this.background) this.close() })
	}

	update() {
		this.closeButton.style.background = this.main.utility.darkenColor(this.pokemon.specie.color);
		this.window.style.borderColor = this.main.utility.darkenColor(this.pokemon.specie.color);
		this.header.style.backgroundColor = this.main.utility.darkenColor(this.pokemon.specie.color);

		this.title.innerHTML = text.shop.pokemon[this.main.lang].toUpperCase();
		this.prompt.innerText = text.shop.new[this.main.lang].toUpperCase();
		this.pokemonName.innerHTML = this.pokemon.name[this.main.lang].toUpperCase();
		this.pokemonName.style.color = this.pokemon.specie.color;
		this.shinySymbol.style.display = this.isShinyReveal ? "block" : "none";
		this.image.style.backgroundImage = `url("${this.pokemon.sprite.base}")`;
		this.secretText.innerHTML = (this.secretTextValue == undefined) ? " " : this.secretTextValue[this.main.lang].toUpperCase();
		this.closeButton.innerHTML = 'OK';
	}

	open(pokemon, text = undefined) {
		playSound('results', 'ui');
		this.pokemon = pokemon;
		this.secretTextValue = Array.isArray(text) ? text : undefined;
		this.isShinyReveal = this.pokemon?.isShiny === true;
		super.open();
		this.update();
	}
}

class DisplayItem extends GameScene {
	constructor(main) {
		super(200, 200);
		this.main = main;
		this.item;
		this.secretTextValue = undefined;
		
		this.header.removeChild(this.closeButton);
		this.render();
	}

	render() {
		this.title.innerHTML = text.shop.item[this.main.lang].toUpperCase();

		this.prompt = new Element(this.container, { className: 'dp-scene-prompt stroke' }).element;
		this.itemName = new Element(this.container, { className: 'dp-scene-pokemon-name stroke' }).element;
		this.image = new Element(this.container, { className: 'dp-scene-image' }).element;
		this.closeButton = new Element(this.container, { className: 'shop-scene-purchase-egg stroke' }).element;

		this.secretText = new Element(this.container, { className: 'dp-scene-secret-text stroke' }).element;

		this.closeButton.addEventListener('click', () => {
			playSound('button2', 'ui'); 
			this.close();
		})
		this.closeButton.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
		this.background.addEventListener('click', (e) => { if (e.target == this.background) this.close() })
	}

	update() {
		let itemColor = this.main.utility.darkenColor(this.main.utility.colorTier(this.item.tier), 0.25);

		this.closeButton.style.background = itemColor;
		this.window.style.borderColor = itemColor;
		this.header.style.backgroundColor = itemColor;


		this.title.innerHTML = text.shop.item[this.main.lang].toUpperCase();
		this.prompt.innerText = text.shop.newItem[this.main.lang].toUpperCase();
		this.itemName.innerHTML = this.item.name[this.main.lang].toUpperCase();
		this.itemName.style.color = itemColor;
		this.image.style.backgroundImage = `url("${this.item.sprite}")`;

		this.secretText.innerHTML = (this.secretTextValue == undefined) ? " " : this.secretTextValue[this.main.lang].toUpperCase();
		this.closeButton.innerHTML = 'OK';
	}

	open(item, text = undefined) {
		playSound('results', 'ui');
		this.item = item;
		this.secretTextValue = text;
		super.open();
		this.update();
	}
}