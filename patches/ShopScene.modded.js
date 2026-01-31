import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { playSound } from '../../file/audio.js';

export class ShopScene extends GameScene {
	constructor(main) {
		super(400, 260);
		this.main = main;

		this.displayPokemon = new DisplayPokemon(this.main);	
		this.render();
	}

	render() {
		this.title.innerHTML = text.shop.title[this.main.lang].toUpperCase();

		//this.prompt = new Element(this.container, { className: 'shop-scene-prompt' }).element;
		this.itemContainer = new Element(this.container, { className: 'shop-scene-item-container' }).element;

		this.egg = new Element(this.itemContainer, { className: 'shop-scene-item shop-scene-egg' }).element;
		this.purchaseEgg = new Element(this.egg, { className: 'shop-scene-purchase' }).element;
		this.egg.addEventListener('click', () => { 
			this.main.shop.buyEgg();
		})

		this.egg.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })

		this.itemSlot = [];
		for (let i = 0; i < 5; i++) {
			this.itemSlot[i] = new Element(this.itemContainer, { className: 'shop-scene-item' }).element;
			this.itemSlot[i].purchaseButton = new Element(this.itemSlot[i], { className: 'shop-scene-purchase' }).element;
			this.itemSlot[i].addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
			this.itemSlot[i].addEventListener('click', () => { this.main.shop.buyItem(i); })
		}	
		
		this.background.addEventListener('click', (e) => { if (e.target == this.background) this.close() })
	}

	update() {
		this.title.innerHTML = text.shop.title[this.main.lang].toUpperCase();
		//this.prompt.innerHTML = text.shop.prompt[this.main.lang].toUpperCase();
		
		this.updateEgg();
		this.updateItems();
	}

	updateEgg() {
		this.purchaseEgg.innerHTML = `$${this.main.utility.numberDot(Math.min(50000, this.main.shop.eggPrice), this.main.lang)}`
		this.main.tooltip.bindTo(this.egg, { name: text.shop.eggName, description: text.shop.egg }, 'item');

		if (this.main.player.gold >= Math.min(50000, this.main.shop.eggPrice) && this.main.shop.eggList.length > 0) {
			//this.egg.style.pointerEvents = 'all';
			this.egg.style.filter = 'revert-layer';
		} else {
			//this.egg.style.pointerEvents = 'none';
			this.egg.style.filter = 'brightness(0.8)';
			if (this.main.shop.eggList.length === 0) {
				//this.prompt.innerHTML = text.shop.prompt[this.main.lang].toUpperCase();
				this.purchaseEgg.innerHTML = text.shop.sold[this.main.lang].toUpperCase();
			}
		}
	}

	updateItems() {
		this.itemSlot.forEach((item, i) => {
			item.style.backgroundImage = `url("./src/assets/images/items/poke.png")`;
			item.purchaseButton.innerHTML = text.shop.sold[this.main.lang].toUpperCase();
			//item.style.pointerEvents = 'none';
			item.style.filter = 'brightness(0.8)';
			if (this.main.shop.itemStock[i] != null) {
				item.style.backgroundImage = `url(${this.main.shop.itemStock[i].sprite})`;
				item.purchaseButton.innerHTML = `$${this.main.utility.numberDot(this.main.shop.itemStock[i].price, this.main.lang)}`;
				if (this.main.shop.itemStock[i].price > 99999999) item.purchaseButton.style.fontSize = '6.5px';
				else if (this.main.shop.itemStock[i].price > 999999) item.purchaseButton.style.fontSize = '8px';
				else  item.purchaseButton.style.fontSize = 'revert-layer';
				this.main.tooltip.bindTo(item, this.main.shop.itemStock[i], 'item');
				if (this.main.player.gold >= this.main.shop.itemStock[i].price) {
					//item.style.pointerEvents = 'all';
					item.style.filter = 'revert-layer';
				}
			}
		})
	}

	open() {
		super.open();
		this.update();
		if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}

	close() {
		super.close();
		this.main.tooltip.hide();
	}
}

class DisplayPokemon extends GameScene {
	constructor(main) {
		super(280, 320);
		this.main = main;
		this.pokemon;
		this.isShinyReveal = false;
		
		this.header.removeChild(this.closeButton);
		this.render();
	}

	render() {
		this.title.innerHTML = text.shop.title[this.main.lang].toUpperCase();
		this.prompt = new Element(this.container, { className: 'dp-scene-prompt' }).element;
		this.pokemonName = new Element(this.container, { className: 'dp-scene-pokemon-name' }).element;
		this.image = new Element(this.container, { className: 'dp-scene-image' }).element;
		// Scale up the Pokemon sprite 6x for better visibility (240px = 40px * 6)
		this.image.style.cssText = 'width:240px;height:240px;background-size:contain;image-rendering:pixelated;';
		
		// Shiny symbol - enlarged star positioned in corner
		this.shinySymbol = new Element(this.container, { className: 'dp-scene-shiny-symbol' }).element;
		this.shinySymbol.innerHTML = '✨';
		this.shinySymbol.style.cssText = 'position:absolute;top:10px;right:10px;font-size:40px;display:none;text-shadow:0 0 10px gold,0 0 20px gold;';
		
		// Add pulse animation keyframe if not exists
		if (!document.getElementById('shinyPulseStyle')) {
			const style = document.createElement('style');
			style.id = 'shinyPulseStyle';
			style.textContent = '@keyframes shinyPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:0.8}}';
			document.head.appendChild(style);
		}
		this.shinySymbol.style.animation = 'shinyPulse 1s ease-in-out infinite';
		
		this.closeButton = new Element(this.container, { className: 'shop-scene-purchase' }).element;

		this.closeButton.addEventListener('click', () => {
			playSound('button2', 'ui'); 
			this.close();
		})
		this.closeButton.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
		this.background.addEventListener('click', (e) => { if (e.target == this.background) this.close() })
	}

	update() {
		this.title.innerHTML = text.shop.title[this.main.lang].toUpperCase();
		this.prompt.innerText = this.isShinyReveal ? '⭐ SHINY! ⭐' : text.shop.new[this.main.lang].toUpperCase();
		this.pokemonName.innerHTML = this.pokemon.name[this.main.lang].toUpperCase();
		this.pokemonName.style.color = this.pokemon.specie.color;
		this.image.style.backgroundImage = `url("${this.pokemon.sprite.base}")`;
		this.closeButton.innerHTML = 'OK';
		
		// Show shiny symbol if it's a shiny reveal
		this.shinySymbol.style.display = this.isShinyReveal ? 'block' : 'none';
	}

	open(pokemon, isShiny = false) {
		playSound('results', 'ui');
		this.pokemon = pokemon;
		this.isShinyReveal = isShiny;

		super.open();
		this.update();
	}
}