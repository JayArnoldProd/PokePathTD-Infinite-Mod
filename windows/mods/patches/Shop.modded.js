import { Pokemon, findSpecieInCatalog } from '../component/Pokemon.js';
import { saveData } from '../../file/data.js';
import { itemData, itemListData, itemBackup } from '../data/itemData.js';
import { pokemonData, eggListData } from '../data/pokemonData.js';	
import { playSound } from '../../file/audio.js';

export class Shop {
	constructor(main, shopData) {
		this.main = main;
		this.eggPrice = shopData.eggPrice;
		this.eggList = shopData.eggList;

		this.itemList = Array.isArray(shopData.itemList) ? [...shopData.itemList] : [...itemListData];
		this.itemStock = Array.isArray(shopData.itemStock) ? [...shopData.itemStock] : [];

		for (let i = 0; i < this.itemStock.length; i++) {
			const entry = this.itemStock[i];
			if (!entry) continue;
			if (typeof entry === 'string') {
				this.itemStock[i] = itemData[entry] ?? null;
			} else if (entry.id && itemData[entry.id]) {
				this.itemStock[i] = itemData[entry.id];
			} else {
				this.itemStock[i] = null;
			}
		}

		// Eliminar duplicados iniciales entre itemStock e itemList
		this.dedupeInitialLists();

		this.itemBackup = Array.isArray(itemBackup) ? [...itemBackup] : [];
		this.restoreItemBackup();

		this.ownedBaseKeys = new Set();
		for (const poke of [...(this.main.team?.pokemon || []), ...(this.main.box?.pokemon || [])]) {
			if (!poke?.specie) continue;
			let base = poke.specie;
			while (base.preEvolution && pokemonData[base.preEvolution]) base = pokemonData[base.preEvolution];
			for (const key in pokemonData) {
				if (pokemonData[key] === base) {
					this.ownedBaseKeys.add(key);
					break;
				}
			}
		}

		this.generateStock();
		this.removeOwnedItems();
		this.removeGimmighoulIfGholdengo();

		this.updateEggList();
		if (this.eggList.length == 0) this.main.player.unlockAchievement(0);
	}

	getSaveData() {
		return {
			eggPrice: this.eggPrice,
			eggList: this.eggList,
			itemList: this.itemList,
			itemStock: this.itemStock
		};
	}

	buyEgg() {
		if (this.eggList.length <= 0 || this.main.player.gold < Math.min(50000, this.eggPrice)) return;

		playSound('purchase', 'ui');

		let index = Math.floor(Math.random() * this.eggList.length);

		if (this.eggList.length == 108) index = Math.floor(Math.random() * 3) + 2;
		
		let egg = this.eggList[index];
		let pokemon;

		const isShinyEgg = Math.random() < (1 / 30);

		if (typeof egg === "string" || egg instanceof String) pokemon = pokemonData[egg];
		else {
			let pk = findSpecieInCatalog(egg)
			pokemon = pk;
		}

		if (this.main.team.pokemon.length < this.main.player.teamSlots && typeof this.main.area.inChallenge.slotLimit != 'number') {
			const newPokemon = new Pokemon(pokemon, 1, null, this.main);
			if (isShinyEgg) {
				newPokemon.isShiny = true;
				newPokemon.setShiny();
			}
			this.main.team.addPokemon(newPokemon);
			this.main.shopScene.displayPokemon.open(this.main.team.pokemon.at(-1), isShinyEgg)
		} else {
			const newPokemon = new Pokemon(pokemon, 1, null, this.main);
			if (isShinyEgg) {
				newPokemon.isShiny = true;
				newPokemon.setShiny();
			}
			this.main.box.addPokemon(newPokemon);
			this.main.shopScene.displayPokemon.open(this.main.box.pokemon.at(-1), isShinyEgg)
		}

		this.main.player.stats.pokemonOwned++;

		this.main.player.stats.totalPokemonLevel++;
		this.main.player.achievementProgress.evolutionCount++;

		this.main.player.changeGold(-Math.min(50000, this.eggPrice));
		this.eggList.splice(index, 1);
		this.eggPrice = Math.min(50000, Math.ceil(this.eggPrice * 1.12 + 35));
		this.main.shopScene.update();
		this.main.UI.update();	
		
		if (this.eggList.length === 0) this.main.player.unlockAchievement(0);
		if (this.main.player.achievementProgress.evolutionCount === 210) this.main.player.unlockAchievement(1);

		if (!this.main.area.waveActive) saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
	}

	buyItem(i) {
	    const itemBought = itemData[this.itemStock[i]?.id];
	    if (!itemBought || this.main.player.gold < itemBought.price) return;

	    playSound('purchase', 'ui');
	    this.main.player.changeGold(-itemBought.price);
	   
	    if (itemBought.isEquipable) {
	    	this.main.player.obtainItem(itemBought);
	    	this.main.player.itemAmount++;
	    } 

	    // Reemplazar el slot i con el siguiente elemento válido de itemList (no duplicado)
	    this.itemStock[i] = this.getNextNonDuplicateFromList();

	    this.main.shopScene.update();
	    this.main.tooltip.hide();
	    
	    if (itemBought.id == 'bicycle') {
	    	this.main.player.hasBike = true;
	    	this.main.UI.update();
	    } else if (itemBought.id == "gimmighoul") {
	    	this.main.UI.getSecret('gholdengo');
	    }
	}

	generateStock() {
	    for (let i = 0; i < 8; i++) {
	        if (!this.itemStock[i]) { 
	            // tomamos el siguiente id válido desde itemList evitando duplicados
	            this.itemStock[i] = this.getNextNonDuplicateFromList();
	        }
	    }
	}

	updateEggList() {
		if (!Array.isArray(eggListData)) return;

		const playerPokemon = [...this.main.team.pokemon, ...this.main.box.pokemon];

		const pidFromEntry = (entry) => {
			if (!entry) return null;

			if (typeof entry === 'string') {
				const pd = pokemonData[entry];
				return pd ? pd.id : null;
			}

			if (entry.id) {
				if (pokemonData[entry.id]) return pokemonData[entry.id].id;
				return entry.id;
			}

			if (entry.species && pokemonData[entry.species]) return pokemonData[entry.species].id;
			if (entry.name && pokemonData[String(entry.name).toLowerCase()]) return pokemonData[String(entry.name).toLowerCase()].id;

			return null;
		};

		const present = new Set();
		for (const e of this.eggList) {
			const pid = pidFromEntry(e);
			if (pid != null) present.add(String(pid));
		}

		const playerHasPid = (pid) => {
			if (pid == null) return false;
			const pidStr = String(pid);
			for (const p of playerPokemon) {
				if (!p) continue;
				if (String(p.id) === pidStr) return true;
			}
			return false;
		};

		for (const entry of eggListData) {
			if (typeof entry === 'string' && this.ownedBaseKeys?.has(entry)) continue;
			if (!entry) continue;

			const pid = pidFromEntry(entry);
			if (pid == null) continue;

			const pidStr = String(pid);
			if (present.has(pidStr)) continue;
			if (playerHasPid(pid)) continue;

			this.eggList.push(entry);
			present.add(pidStr);
		}
	}

	dedupeInitialLists() {
		const seen = new Set();
		// dedupe itemStock: conservar primera aparición, poner null en duplicados
		for (let i = 0; i < this.itemStock.length; i++) {
			const entry = this.itemStock[i];
			if (!entry || !entry.id) {
				this.itemStock[i] = null;
				continue;
			}
			const id = entry.id;
			if (seen.has(id)) {
				this.itemStock[i] = null;
			} else {
				seen.add(id);
			}
		}
		// dedupe itemList: eliminar ids que ya están en seen y eliminar duplicados dentro de itemList
		const newList = [];
		for (const id of this.itemList) {
			if (!id) continue;
			if (!seen.has(id)) {
				seen.add(id);
				newList.push(id);
			}
			// si estaba en seen (ya en stock o ya añadido), se omite => se elimina duplicado
		}
		this.itemList = newList;
	}

	// Devuelve true si itemStock contiene actualmente el id (ignora nulls)
	stockHasId(id) {
		if (!id) return false;
		for (const entry of this.itemStock) {
			if (entry && entry.id === id) return true;
		}
		return false;
	}

	// Extrae del itemList el primer id que no esté presente actualmente en itemStock.
	// Devuelve el objeto itemData[id] o null si no hay ninguno.
	getNextNonDuplicateFromList() {
		while (this.itemList.length > 0) {
			const id = this.itemList.shift();
			if (!id) continue;
			if (!this.stockHasId(id)) {
				return itemData[id] ?? null;
			}
		}
		return null;
	}

	removeOwnedItems() {
	    for (let i = 0; i < this.itemStock.length; i++) {
	        const entry = this.itemStock[i];
	        if (!entry) continue;

	        // Comprobar si el jugador ya posee este item
	        if (this.main.player.hasItem(entry.id)) {
	            // Reemplazar con el siguiente ítem no duplicado y que no tenga el jugador
	            let newItem = null;
	            while (this.itemList.length > 0) {
	                const nextId = this.itemList.shift();
	                if (!nextId) continue;
	                if (!this.stockHasId(nextId) && !this.main.player.hasItem(nextId)) {
	                    newItem = itemData[nextId] ?? null;
	                    break;
	                }
	            }
	            this.itemStock[i] = newItem;
	        }
	    }
	}

	restoreItemBackup() {
		if (!Array.isArray(this.itemBackup) || this.itemBackup.length === 0) return;

		for (const raw of this.itemBackup) {
			const id = (typeof raw === 'string') ? raw : (raw && raw.id);
			if (!id) continue;

			if (this.main.player.hasItem(id)) continue;
			if (this.stockHasId(id)) continue;

			if (this.itemList.includes(id)) continue;

			let placed = false;
			for (let i = 0; i < Math.max(8, this.itemStock.length); i++) {
				if (typeof this.itemStock[i] === 'undefined') this.itemStock[i] = null;

				if (!this.itemStock[i]) {
					this.itemStock[i] = itemData[id] ?? null;
					placed = true;
					break;
				}
			}

			if (!placed) {
				if (itemData[id]) this.itemList.push(id);
			}
		}

		const seen = new Set();
		this.itemList = this.itemList.filter(iid => {
			if (!iid) return false;
			if (!itemData[iid]) return false;
			if (this.stockHasId(iid)) return false; 
			if (seen.has(iid)) return false;
			seen.add(iid);
			return true;
		});
	}

	removeGimmighoulIfGholdengo() {
		let isGholdengo = false;
		const pokemon = [...this.main.team.pokemon, ...this.main.box.pokemon];
		pokemon.forEach(pokemon => {
			if (pokemon.id == 102) isGholdengo = true;
		})
		
		if (!isGholdengo) return;

		for (let i = 0; i < this.itemStock.length; i++) {
			const entry = this.itemStock[i];
			if (entry && entry.id === 'gimmighoul') {
				this.itemStock[i] = null;
			}
		}

		this.itemList = this.itemList.filter(id => id !== 'gimmighoul');

		this.generateStock();
	}
}
