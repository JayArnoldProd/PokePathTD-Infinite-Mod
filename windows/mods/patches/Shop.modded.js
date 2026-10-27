import { Pokemon, findSpecieInCatalog } from '../component/Pokemon.js';
import { saveData } from '../../file/data.js';
import { itemData, itemListData, itemBackup, normalPool, luxuryPool, adminPool } from '../data/itemData.js';
import { pokemonData, eggListData, forcedInitialPool, forcedSecondaryPool } from '../data/pokemonData.js';
import { playSound } from '../../file/audio.js';

export class Shop {
	constructor(main, shopData) {
		this.main = main;
		this.eggPrice = shopData.eggPrice;
		this.eggList = shopData.eggList;

		if (
			Array.isArray(shopData.normalItemList) ||
			Array.isArray(shopData.luxuryItemList) ||
			Array.isArray(shopData.adminItemList)
		) {
			this.itemLists = {
				normal: Array.isArray(shopData.normalItemList) ? [...shopData.normalItemList] : [...normalPool],
				luxury: Array.isArray(shopData.luxuryItemList) ? [...shopData.luxuryItemList] : [...luxuryPool],
				admin: Array.isArray(shopData.adminItemList) ? [...shopData.adminItemList] : [...adminPool]
			};
		} else {
			// Save antiguo: itemList contenía todos los objetos juntos.
			const oldItemList = Array.isArray(shopData.itemList)
				? [...shopData.itemList]
				: [...itemListData];

			this.itemLists = {
				normal: [],
				luxury: [],
				admin: []
			};

			for (const id of oldItemList) {
				if (!id) continue;

				if (normalPool.includes(id)) {
					this.itemLists.normal.push(id);
				} else if (luxuryPool.includes(id)) {
					this.itemLists.luxury.push(id);
				} else if (adminPool.includes(id)) {
					this.itemLists.admin.push(id);
				}
			}
		}

		this.itemStock = Array.isArray(shopData.itemStock)
			? [...shopData.itemStock]
			: [];

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

		const usingLegacyItemList =
			!Array.isArray(shopData.normalItemList) &&
			!Array.isArray(shopData.luxuryItemList) &&
			!Array.isArray(shopData.adminItemList);

		if (usingLegacyItemList) {
			this.migrateLegacyItemStock();
		}

		this.dedupeInitialLists();

		this.itemBackup = Array.isArray(itemBackup) ? [...itemBackup] : [];
		this.restoreItemBackup();

		this.generateStock();
		this.removeOwnedItems();
		this.removeGimmighoulIfGholdengo();

		this.updateEggList();
	}

	getSaveData() {
		return {
			eggPrice: this.eggPrice,
			eggList: this.eggList,

			// Nuevo formato
			normalItemList: this.itemLists.normal,
			luxuryItemList: this.itemLists.luxury,
			adminItemList: this.itemLists.admin,

			// Formato antiguo, para que versiones anteriores
			// puedan seguir leyendo este save.
			itemList: [
				...this.itemLists.normal,
				...this.itemLists.luxury,
				...this.itemLists.admin
			],

			itemStock: this.itemStock
		};
	}

	buyEgg() {
		if (this.eggList.length <= 0 || this.main.player.gold < Math.min(50000, this.eggPrice)) return;

		playSound('purchase', 'ui');

		const getEggKey = egg => {
			if (typeof egg === 'string') return egg;

			if (egg?.key != null) return egg.key;
			if (egg?.species != null) return egg.species;
			if (egg?.id != null) return egg.id;

			return null;
		};

		const initialIndices = [];
		const secondaryIndices = [];

		for (let i = 0; i < this.eggList.length; i++) {
			const eggKey = getEggKey(this.eggList[i]);

			if (eggKey == null) continue;

			if (forcedInitialPool.includes(eggKey)) {
				initialIndices.push(i);
			} else if (forcedSecondaryPool.includes(eggKey)) {
				secondaryIndices.push(i);
			}
		}

		let index;

		if (initialIndices.length > 0) {
			index = initialIndices[
				Math.floor(Math.random() * initialIndices.length)
			];
		} else if (secondaryIndices.length > 0) {
			index = secondaryIndices[
				Math.floor(Math.random() * secondaryIndices.length)
			];
		} else {
			index = Math.floor(Math.random() * this.eggList.length);
		}

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

		this.main.player.changeGold(-Math.min(50000, this.eggPrice));
		this.eggList.splice(index, 1);
		this.eggPrice = Math.min(50000, Math.ceil(this.eggPrice * 1.12 + 35));
		this.main.shopScene.update();
		this.main.UI.update();

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
	    const poolName = this.getPoolForSlot(i);
		this.itemStock[i] = poolName ? this.getNextNonDuplicateFromList(poolName) : null;

	    this.main.shopScene.update();
	    this.main.tooltip.hide();

	    if (itemBought.id == 'bicycle') {
		this.main.player.hasBike = true;
		this.main.UI.update();
	    } else if (itemBought.id == "gimmighoul") {
		this.main.UI.getSecret('gholdengo');
	    } else if (itemBought.id == "mitsuesCocktail") {
		this.main.player.hasCocktail = true;
	    } else if (itemBought.id == "sokudosPortfolio") {
	    	this.main.player.hasSkinator = true;
	    } else if (itemBought.id == "revysBook") {
	    	this.main.player.hasEditable = true;
	    } else if (itemBought.id == "rosesItem") {
	    	this.main.player.hasRose = true;
	    } else if (itemBought.id == "noxDex") {
	    	this.main.player.hasNox = true;
	    } else if (itemBought.id == "thundersDrive") {
	    	this.main.player.hasThunder = true;
	    }
	}

	generateStock() {
		if (!Array.isArray(this.itemStock)) {
			this.itemStock = [];
		}

		while (this.itemStock.length < 10) {
			this.itemStock.push(null);
		}

		for (let i = 0; i < 10; i++) {
			if (this.itemStock[i]) continue;

			const poolName = this.getPoolForSlot(i);

			if (poolName) {
				this.itemStock[i] = this.getNextNonDuplicateFromList(poolName);
			}
		}
	}

	updateEggList() {
		if (!Array.isArray(eggListData)) return;

		const playerPokemon = [
			...this.main.team.pokemon,
			...this.main.box.pokemon
		];

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

			if (entry.species && pokemonData[entry.species]) {
				return pokemonData[entry.species].id;
			}

			if (entry.name && pokemonData[String(entry.name).toLowerCase()]) {
				return pokemonData[String(entry.name).toLowerCase()].id;
			}

			return null;
		};

		// IDs que actualmente pueden aparecer en huevos
		const allowed = new Set();

		for (const entry of eggListData) {
			const pid = pidFromEntry(entry);

			if (pid != null) {
				allowed.add(String(pid));
			}
		}

		// Pokémon que el jugador ya tiene
		const owned = new Set();

		for (const pokemon of playerPokemon) {
			if (!pokemon) continue;

			const pid = pokemon.id;

			if (pid != null) {
				owned.add(String(pid));
			}
		}

		// Limpiar la lista guardada:
		// - quitar Pokémon eliminados de eggListData
		// - quitar duplicados
		// - quitar Pokémon que ya posee el jugador
		const cleanedEggList = [];
		const present = new Set();

		for (const entry of this.eggList) {
			const pid = pidFromEntry(entry);

			if (pid == null) continue;

			const pidStr = String(pid);

			if (!allowed.has(pidStr)) continue;
			if (owned.has(pidStr)) continue;
			if (present.has(pidStr)) continue;

			cleanedEggList.push(entry);
			present.add(pidStr);
		}

		this.eggList = cleanedEggList;

		// Añadir Pokémon nuevos que todavía no estén en la lista
		for (const entry of eggListData) {
			if (!entry) continue;

			const pid = pidFromEntry(entry);

			if (pid == null) continue;

			const pidStr = String(pid);

			if (present.has(pidStr)) continue;
			if (owned.has(pidStr)) continue;

			this.eggList.push(entry);
			present.add(pidStr);
		}
	}

	dedupeInitialLists() {
		const seen = new Set();

		// Limpiar itemStock:
		// - eliminar objetos inexistentes
		// - eliminar objetos que ya no pertenecen a ninguna pool
		// - eliminar objetos que estén en un slot incorrecto
		for (let i = 0; i < this.itemStock.length; i++) {
			const entry = this.itemStock[i];

			if (!entry || !entry.id) {
				this.itemStock[i] = null;
				continue;
			}

			const id = entry.id;

			if (!this.isItemInCurrentPools(id)) {
				this.itemStock[i] = null;
				continue;
			}

			if (!this.isItemValidForSlot(id, i)) {
				this.itemStock[i] = null;
				continue;
			}

			if (seen.has(id)) {
				this.itemStock[i] = null;
				continue;
			}

			seen.add(id);
		}

		// Limpiar las listas guardadas de cada pool
		const pools = {
			normal: normalPool,
			luxury: luxuryPool,
			admin: adminPool
		};

		for (const poolName of Object.keys(this.itemLists)) {
			const currentPool = pools[poolName];
			const newList = [];

			for (const id of this.itemLists[poolName]) {
				if (!id) continue;
				if (!itemData[id]) continue;
				if (!currentPool.includes(id)) continue;
				if (seen.has(id)) continue;

				seen.add(id);
				newList.push(id);
			}

			this.itemLists[poolName] = newList;
		}
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
	getNextNonDuplicateFromList(poolName) {
		const list = this.itemLists[poolName];

		if (!list) return null;

		while (list.length > 0) {
			const id = list.shift();

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

			if (this.main.player.hasItem(entry.id)) {
				const poolName = this.getPoolForSlot(i);

				let newItem = null;

				if (poolName) {
					const list = this.itemLists[poolName];

					while (list.length > 0) {
						const nextId = list.shift();

						if (!nextId) continue;
						if (this.stockHasId(nextId)) continue;
						if (this.main.player.hasItem(nextId)) continue;

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
			const id = typeof raw === 'string' ? raw : (raw && raw.id);

			if (!id) continue;
			if (!itemData[id]) continue;
			if (this.main.player.hasItem(id)) continue;
			if (this.stockHasId(id)) continue;

			const poolName = this.getPoolForItem(id);

			if (!poolName) continue;

			const list = this.itemLists[poolName];

			if (!list.includes(id)) {
				list.push(id);
			}
		}
	}

	removeGimmighoulIfGholdengo() {
		let isGholdengo = false;

		const pokemon = [
			...this.main.team.pokemon,
			...this.main.box.pokemon
		];

		pokemon.forEach(pokemon => {
			if (pokemon.id == 102) {
				isGholdengo = true;
			}
		});

		if (!isGholdengo) return;

		// Quitar Gimmighoul del stock actual
		for (let i = 0; i < this.itemStock.length; i++) {
			const entry = this.itemStock[i];

			if (entry && entry.id === 'gimmighoul') {
				this.itemStock[i] = null;
			}
		}

		// Quitar Gimmighoul de todos los pools
		for (const poolName of Object.keys(this.itemLists)) {
			this.itemLists[poolName] = this.itemLists[poolName].filter(
				id => id !== 'gimmighoul'
			);
		}

		this.generateStock();
	}

	getPoolForSlot(i) {
		if (i === 0 || i === 1 || i === 4 || i === 5 || i === 8 || i === 9) {
			return 'normal';
		}

		if (i === 2 || i === 3) {
			return 'luxury';
		}

		if (i === 6 || i === 7) {
			return 'admin';
		}

		return null;
	}

	getPoolForItem(id) {
		if (normalPool.includes(id)) return 'normal';
		if (luxuryPool.includes(id)) return 'luxury';
		if (adminPool.includes(id)) return 'admin';

		return null;
	}

	isItemInCurrentPools(id) {
		return (
			normalPool.includes(id) ||
			luxuryPool.includes(id) ||
			adminPool.includes(id)
		);
	}

	isItemValidForSlot(id, slot) {
		const poolName = this.getPoolForSlot(slot);

		if (!poolName) return false;

		if (poolName === 'normal') return normalPool.includes(id);
		if (poolName === 'luxury') return luxuryPool.includes(id);
		if (poolName === 'admin') return adminPool.includes(id);

		return false;
	}

	migrateLegacyItemStock() {
		const oldStock = [...this.itemStock];

		const slots = {
			normal: [0, 1, 4, 5, 8, 9],
			luxury: [2, 3],
			admin: [6, 7]
		};

		this.itemStock = new Array(10).fill(null);

		const used = new Set();

		for (const entry of oldStock) {
			if (!entry || !entry.id) continue;

			const id = entry.id;

			if (used.has(id)) continue;
			if (!this.isItemInCurrentPools(id)) continue;

			const poolName = this.getPoolForItem(id);
			if (!poolName) continue;

			const targetSlot = slots[poolName].find(
				slot => !this.itemStock[slot]
			);

			if (targetSlot === undefined) continue;

			this.itemStock[targetSlot] = itemData[id];
			used.add(id);
		}
	}
}

