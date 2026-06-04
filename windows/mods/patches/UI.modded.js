import { Element } from '../utils/Element.js';
import { text } from '../file/text.js';
import { playSound, playMusic } from '../file/audio.js';
import { GameScene } from '../utils/GameScene.js';
import { pokemonData } from './data/pokemonData.js';
import { itemData } from './data/itemData.js';
import { Pokemon } from './component/Pokemon.js';
import { weatherData } from './data/weatherData.js';
import { saveData } from '../file/data.js';
import { songData } from './data/songData.js';

const SECTIONS = ['profile', 'box', 'inventory', 'shop', 'map', 'challenge', 'damageDealt', 'menu'];
const SECTION_TOOLTIPS = {
	profile: { name: ['Character'], description: ['Open your character profile.'] },
	box: { name: ['Pokeboxes'], description: ['Open your Pokemon boxes.'] },
	inventory: { name: ['Inventory'], description: ['Open your inventory.'] },
	shop: { name: ['Shop'], description: ['Open the shop.'] },
	map: { name: ['Map'], description: ['Open map and route selection.'] },
	challenge: { name: ['Challenges'], description: ['Open challenge selection.'] },
	damageDealt: { name: ['Damage Graph'], description: ['Show or hide damage graph overlay.'] },
	menu: { name: ['Options'], description: ['Open game options menu.'] }
};

const TARGET_MODES = [
	'first', 'last', 'highHP', 'lowHP', 'highArmor', 'noArmor', 'faster', 'slower', 'poisoned', 'notPoisoned', 
	'burned', 'notBurned', 'stuned', 'notStuned', 'slowed', 'notSlowed', 'cursed', 'curseable', 'nightmared', 'random', 'invisible'
]

const TARGET_MODES_TRADUCTIONS = {
	area: ['Area', 'Área', 'Zone', 'Área', 'Area', 'Fläche', 'エリア', '지역', '区域', 'Obszar'],
	aura: ['Aura', 'Aura', 'Aura', 'Aura', 'Aura', 'Aura', 'オーラ', '오라', '气场', 'Aura'],
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

const UI_LOCALIZED_LABELS = {
	save: ['Save team', 'Guardar equipo', 'Enregistrer l’équipe', 'Salvar equipe', 'Salvare la squadra', 'Team speichern', 'チームを保存する', '팀 저장', '保存队伍', 'Zapisz drużynę'],
	load: ['Load team', 'Cargar equipo', 'Charger l’équipe', 'Carregar equipe', 'Caricare la squadra', 'Team laden', 'チームを読み込む', '팀 불러오기', '加载队伍', 'Wczytaj drużynę'],
	enemies: ['Enemies', 'Enemigos', 'Ennemis', 'Inimigos', 'Nemici', 'Gegner', '敵', '적', '敌人', 'Wrogowie'],
	waveComplete: ['Wave Complete', 'Oleada completada', 'Vague terminée', 'Onda concluída', 'Ondata completata', 'Welle abgeschlossen', 'ウェーブ完了', '웨이브 완료', '波次完成', 'Fala ukończona'],
	time: ['Time', 'Tiempo', 'Temps', 'Tempo', 'Tempo', 'Zeit', '時間', '시간', '时间', 'Czas'],
	billion: ['Billion', 'Mil millones', 'Milliard', 'Bilhão', 'Miliardo', 'Milliarde', '十億', '십억', '十亿', 'Miliard'],
	trillion: ['Trillion', 'Billón', 'Billion', 'Trilhão', 'Bilione', 'Billion', '兆', '조', '万亿', 'Bilion'],
	quadrillion: ['Quadrillion', 'Mil billones', 'Billiard', 'Quadrilhão', 'Biliardo', 'Billiarde', '京', '경', '千万亿', 'Biliard'],
};

function uiLabel(key, lang = 0, fallback = '') {
	const idx = Number.isInteger(lang) ? Math.max(0, Math.min(9, lang)) : 0;
	return text?.ui?.[key]?.[idx] ?? text?.ui?.[key]?.[0] ?? UI_LOCALIZED_LABELS[key]?.[idx] ?? UI_LOCALIZED_LABELS[key]?.[0] ?? fallback;
}

export class UI {
	constructor(main) {
		this.main = main;
		this.render();

		this.damageDealtDisplay = false;
		this.damageDealtType = 'trueDamage';
		this.enemyPositionDisplay = 0;
		this.tileTerrainHover = null;

		this.waveInfoDisplay = false;

		this.fastScene = new FastScene(this.main, this);
	}

	getEffectiveWP(wavesPast100) {
		if (wavesPast100 <= 900) return wavesPast100;
		return 900 + (wavesPast100 - 900) / 2;
	}

	getCurrentWavePreviewList() {
		const waveNumber = this.main.area.waveNumber;
		if (waveNumber <= 100) {
			return this.main.area.waves[waveNumber]?.preview || [];
		}

		if (waveNumber % 100 === 0) {
			const preview = [];
			const boss = this.main.area.getWavePreview(waveNumber);
			if (boss) preview.push(boss);
			if (waveNumber >= 300 && typeof this.main.area.getEscortTypes === 'function') {
				preview.push(...(this.main.area.getEscortTypes(waveNumber, 3) || []));
			}
			return preview;
		}

		const templateWaveNum = ((waveNumber - 1) % 100) + 1;
		return this.main.area.waves[templateWaveNum]?.preview || [];
	}

	scalePreviewEnemy(enemy, waveNumber) {
		if (!enemy) return enemy;

		let hp = enemy.hp ?? 0;
		let armor = enemy.armor ?? 0;
		let gold = (enemy.gold ?? 0) + this.main.player.extraGold;
		let speed = enemy.speed ?? 0;
		let power = enemy.power ?? 0;
		let regeneration = enemy.regeneration ?? 0;
		let invisible = !!enemy.invisible;

		if (waveNumber > 100) {
			const wavesPast100 = waveNumber - 100;
			const ewp = this.getEffectiveWP(wavesPast100);

			if (waveNumber % 100 === 0) {
				const bossTemplate = this.main.area.getWavePreview(waveNumber);
				const bossCount = Math.floor(waveNumber / 100);
				let bossHpMult = Math.pow(2, ewp / 335);
				if (ewp > 1500) {
					const anchor = Math.pow(2, 1500 / 335);
					const extra = ewp - 1500;
					bossHpMult = anchor * Math.pow(extra / 200 + 1, 0.85);
				}
				const bossCountFactor = 1 / Math.pow(Math.max(1, bossCount), 2 / 3);
				const bossSpeedMult = 1 + 0.3 * Math.log2(1 + ewp / 2500);
				const bossRegenScale = 0.0167 * ewp / (ewp + 3000);
				gold = Math.floor((enemy.gold ?? 0) * (1 + wavesPast100 * 0.11)) + this.main.player.extraGold;

				if (bossTemplate && enemy.id === bossTemplate.id) {
					hp = Math.floor((enemy.hp ?? 0) * bossHpMult * 2 * bossCountFactor * 0.775);
					armor = Math.floor((enemy.armor ?? 0) * (1 + 0.03 * ewp));
					speed = (enemy.speed ?? 0) * bossSpeedMult;
					regeneration = Math.max(enemy.regeneration ?? 0, Math.floor(hp * bossRegenScale));
				} else {
					const escortCount = Math.min(100, Math.floor((waveNumber - 200) / 50) * 5);
					const escortCountFactor = 1 / Math.pow(Math.max(1, escortCount), 0.35);
					hp = Math.floor((enemy.hp ?? 0) * bossHpMult * 0.75 * escortCountFactor * 0.775);
					armor = Math.floor((enemy.armor ?? 0) * (1 + 0.03 * ewp));
					speed = (enemy.speed ?? 0) * bossSpeedMult;
					regeneration = Math.max(enemy.regeneration ?? 0, Math.floor(hp * bossRegenScale));
				}
			} else {
				const wavePreview = this.getCurrentWavePreviewList();
				const baseBudget = 160000;
				let hpMult;
				if (ewp <= 1300) {
					hpMult = Math.pow(1.00558, ewp);
				} else {
					const base = Math.pow(1.00558, 1300);
					const extra = ewp - 1300;
					hpMult = base * Math.pow(extra / 100 + 1, 0.6);
				}
				const powerBudget = Math.floor(baseBudget * hpMult * 0.775);
				const speedMult = 1 + 0.3 * Math.log2(1 + ewp / 2500);
				const regenScale = 0.0333 * ewp / (ewp + 3000);
				const linearCount = Math.floor(20 + wavesPast100 * 1.2);
				const asymptoticCount = Math.floor(200 + 600 * wavesPast100 / (wavesPast100 + 3000));
				const totalEnemyCount = Math.min(linearCount, asymptoticCount, 600);
				const hpValues = wavePreview.map(p => p.hp || 100);
				const inverseHp = hpValues.map(baseHp => 1 / baseHp);
				const totalInverse = inverseHp.reduce((sum, value) => sum + value, 0);
				const enemyCounts = inverseHp.map(inv => Math.max(1, Math.floor(totalEnemyCount * (inv / totalInverse))));
				let totalBaseHp = 0;
				wavePreview.forEach((previewEnemy, idx) => {
					totalBaseHp += (previewEnemy.hp || 100) * enemyCounts[idx];
				});
				const hpScaleFactor = totalBaseHp > 0 ? powerBudget / totalBaseHp : 1;
				const minHpPerEnemy = Math.floor(powerBudget / Math.max(1, totalEnemyCount));
				const invisCap = Math.floor(1000 * wavesPast100 / (wavesPast100 + 6000));
				const enemyIndex = Math.max(0, wavePreview.findIndex(previewEnemy => previewEnemy.id === enemy.id));
				const wouldBeInvisible = wavePreview
					.slice(0, enemyIndex + 1)
					.filter(previewEnemy => previewEnemy.invisible)
					.length;

				hp = Math.floor(Math.max(enemy.hp ?? 0, (enemy.hp ?? 0) * hpScaleFactor, minHpPerEnemy));
				armor = Math.floor((enemy.armor ?? 0) * (1 + 0.03 * ewp));
				if (armor === 0) armor = Math.floor(hp * 0.05);
				speed = (enemy.speed ?? 0) * speedMult;
				regeneration = Math.max(enemy.regeneration ?? 0, Math.floor(hp * regenScale));
				gold = Math.floor((enemy.gold ?? 0) * (1 + wavesPast100 * 0.11)) + this.main.player.extraGold;
				invisible = invisible && wouldBeInvisible <= invisCap;
			}
		}

		if (typeof this.main.area.inChallenge.toughEnemies == 'number') {
			hp += Math.floor(hp * (this.main.area.inChallenge.toughEnemies / 100));
			armor += Math.floor(armor * (this.main.area.inChallenge.toughEnemies / 100));
		}

		return {
			...enemy,
			hp,
			armor,
			gold,
			speed,
			power,
			regeneration,
			invisible,
		};
	}

	formatPreviewStat(value, significantDigits = 2) {
		const numericValue = Number(value);
		if (!Number.isFinite(numericValue) || numericValue === 0) return '0';

		const absValue = Math.abs(numericValue);
		const factor = Math.pow(10, significantDigits - Math.ceil(Math.log10(absValue)));
		const roundedValue = Math.round(numericValue * factor) / factor;
		if (!Number.isFinite(roundedValue) || roundedValue === 0) return '0';

		if (Math.abs(roundedValue) >= 1000 && this.main?.utility?.numberDot) {
			return this.main.utility.numberDot(Math.round(roundedValue));
		}

		return roundedValue.toString();
	}

	render() {
		this.topBar = new Element(this.main.scene, { className: 'ui-top-bar' }).element;

		this.saveTeamButtonContainer = new Element(this.topBar, { className: 'ui-save-team-button-container' }).element;

		this.saveTeamButton = [];
		for (let i = 0; i < 5; i++) {
			this.saveTeamButton[i] = new Element(this.saveTeamButtonContainer, { className: 'ui-save-team-button', text: `#${i+1}` }).element;
			this.saveTeamButton[i].addEventListener('mouseenter', () => {
				playSound('open', 'ui');
				this.showTeamSlotTooltip(i, 'save');
			})
			this.saveTeamButton[i].addEventListener('mouseleave', () => { this.main.tooltip.hide() });
			this.saveTeamButton[i].addEventListener('click', () => { 
				if (this.main.game.stopped) return playSound('pop0', 'ui');
				this.saveTeamButtonHandle(i);
			});
		}

		this.importTeamButtonContainer = new Element(this.topBar, { className: 'ui-import-team-button-container' }).element;

		this.importTeamButton = [];
		for (let i = 0; i < 5; i++) {
			this.importTeamButton[i] = new Element(this.importTeamButtonContainer, { className: 'ui-import-team-button', text: `#${i+1}` }).element;
			this.importTeamButton[i].addEventListener('mouseenter', () => {
				playSound('open', 'ui');
				this.showTeamSlotTooltip(i, 'load');
			})
			this.importTeamButton[i].addEventListener('mouseleave', () => { this.main.tooltip.hide() });
			this.importTeamButton[i].addEventListener('click', () => { 
				if (this.main.game.stopped) return playSound('pop0', 'ui');
				this.importTeamButtonHandle(i);
			});
		}

		this.weather = new Element(this.topBar, { className: 'ui-weather' }).element;

		this.mapRoutCointainer = new Element(this.topBar, { className: 'ui-map-route-container' }).element;
		this.mapRoute = new Element(this.mapRoutCointainer, { className: 'ui-map-route' }).element;
		this.mapRecord = new Element(this.mapRoutCointainer, { className: 'ui-map-record' }).element;

		this.bottomBar = new Element(this.main.scene, { className: 'ui-bottom-bar' }).element;
		this.challenge = new Element(this.bottomBar, { className: 'ui-challenge' }).element;
		this.chrono = new Element(this.bottomBar, { id: 'ui-chrono' }).element;

		this.waveSelectorContainer = new Element(this.bottomBar, { className: 'ui-wave-selector-container' }).element;

		this.waveSelectorTenLess = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: '<<' }).element;
		this.waveSelectorOneLess = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: '<' }).element;
		this.waveSelectorLabel = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector-label stroke' }).element;
		this.waveSelectorOneMore = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: '>' }).element;
		this.waveSelectorTenMore = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: '>>' }).element;
		this.waveSelectorBlock = new Element(this.waveSelectorContainer, { className: 'ui-wave-selector', text: 'R' }).element;

		this.waveSelectorTenLess.addEventListener('click', () => { this.main.area.changeWave(-10) });
		this.waveSelectorOneLess.addEventListener('click', () => { this.main.area.changeWave(-1) });
		this.waveSelectorOneMore.addEventListener('click', () => { this.main.area.changeWave(1) });
		this.waveSelectorTenMore.addEventListener('click', () => { this.main.area.changeWave(10) });
		this.waveSelectorBlock.addEventListener('click', () => { this.waveSelectorBlockHandle() });

		this.waveSelectorTenLess.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveSelectorOneLess.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveSelectorOneMore.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveSelectorTenMore.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveSelectorBlock.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.waveIncome = new Element(this.bottomBar, { className: 'ui-wave-income' }).element;
		this.waveIncomeState = {
			routeKey: '',
			waveKey: '',
			routeStartTime: 0,
			lastGold: 0,
			routeEarned: 0,
			waveEarned: 0,
			lastTime: 0,
			smoothPerSecond: 0
		};
		this.waveIncomeTimer = setInterval(() => {
			this.updateWaveIncome(true);
		}, 200);

		this.waveInfoPanel = new Element(this.main.scene, { className: 'ui-wave-info-panel' }).element;
		this.waveInfoPanel.style.cssText = `
			position: absolute;
			bottom: 8px;
			left: 8px;
			background: rgba(0, 0, 0, 0.75);
			border: 2px solid #444;
			border-radius: 6px;
			padding: 8px 12px;
			font-family: 'Pokemon', monospace;
			font-size: 11px;
			color: #fff;
			min-width: 140px;
			display: none;
			z-index: 100;
		`;
		this.waveInfoWave = new Element(this.waveInfoPanel, { className: 'ui-wave-info-row' }).element;
		this.waveInfoWave.style.cssText = 'margin-bottom: 4px; color: #4ecca3; font-weight: bold;';
		this.waveInfoEnemies = new Element(this.waveInfoPanel, { className: 'ui-wave-info-row' }).element;
		this.waveInfoEnemies.style.cssText = 'margin-bottom: 4px;';
		this.waveInfoTime = new Element(this.waveInfoPanel, { className: 'ui-wave-info-row' }).element;
		this.waveInfoTime.style.cssText = 'color: #888;';

		this.tilesCountContainer = new Element(this.bottomBar, { className: 'ui-tiles-count-container' }).element;
		this.tilesCount = [];
		this.tilesCountNum = [0, 0, 0, 0];
		
		for (let i = 0; i < 4; i++) {
			this.tilesCount[i] = new Element(this.tilesCountContainer, { className: 'ui-tiles-count' }).element;
			this.tilesCount[i].addEventListener('mouseenter', () => {
				this.tileTerrainHover = i+1;
			})
			this.tilesCount[i].addEventListener('mouseleave', () => {
				this.tileTerrainHover = null;
			})
		}

		this.playerPanel = new Element(this.main.scene, { className: 'ui-player-panel' }).element;
		this.playerPortrait = new Element(this.playerPanel, { className: 'ui-player-portrait' }).element;
		this.playerName = new Element(this.playerPanel, { className: 'ui-player-name' }).element;
		this.playerHealth = new Element(this.playerPanel, { className: 'ui-player-health' }).element;
		this.hearts = [];
		this.playerGold = new Element(this.playerPanel, { className: 'ui-player-gold' }).element;
		this.playerStars = new Element(this.playerPanel, { className: 'ui-player-stars' }).element;
		this.playerRibbons = new Element(this.playerPanel, { className: 'ui-player-ribbons' }).element;
		this.playerRibbonsIcon = new Element(this.playerRibbons, { className: 'ui-player-ribbons-icon' }).element;
		this.playerRibbonsText = new Element(this.playerRibbons, { className: 'ui-player-ribbons-text' }).element;

		this.playerLimitLine = new Element(this.playerPanel, { className: 'ui-player-limit-line' }).element;

		this.pokemonContainer = new Element(this.playerPanel, { className: 'ui-pokemon-container' }).element;
		this.pokemon = [];

		for (let i = 0; i < 10; i++) {
			this.pokemon[i] = new Element(this.pokemonContainer, { className: 'ui-pokemon' }).element;
			this.pokemon[i].name = new Element(this.pokemon[i], { className: 'ui-pokemon-name' }).element;
			this.pokemon[i].sprite = new Element(this.pokemon[i], { className: 'ui-pokemon-sprite' }).element;
			this.pokemon[i].shiny = new Element(this.pokemon[i], { className: 'ui-pokemon-shiny' }).element;
			this.pokemon[i].level = new Element(this.pokemon[i], { className: 'ui-pokemon-level' }).element;
			this.pokemon[i].stars = new Element(this.pokemon[i], { className: 'ui-pokemon-stars' }).element;
			this.pokemon[i].attackStyle = new Element(this.pokemon[i], { className: 'ui-pokemon-attack-style' }).element;
			this.pokemon[i].fieldStatus = new Element(this.pokemon[i], { className: 'ui-pokemon-field-status' }).element;
			this.pokemon[i].dittoBg = new Element(this.pokemon[i], { className: 'ui-pokemon-ditto-bg' }).element;
			this.pokemon[i].targetMode = new Element(this.pokemon[i], { className: 'ui-pokemon-target-mode' }).element;
			this.pokemon[i].targetLeft = new Element(this.pokemon[i].targetMode, { className: 'ui-pokemon-target-arrow', text: '<' }).element;
			this.pokemon[i].targetText = new Element(this.pokemon[i].targetMode, { className: 'ui-pokemon-target-text' }).element;
			this.pokemon[i].targetRight = new Element(this.pokemon[i].targetMode, { className: 'ui-pokemon-target-arrow', text: '>' }).element;

			this.pokemon[i].buttonContainer = new Element(this.pokemon[i], { className: 'ui-pokemon-button-container' }).element;
			this.pokemon[i].deploy = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button' }).element;
			this.pokemon[i].info = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button', text: 'i' }).element;
			this.pokemon[i].levelUp = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button', text: '+1' }).element;
			this.pokemon[i].item = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button', text: '+' }).element;
			this.pokemon[i].noPokemon = new Element(this.pokemon[i].buttonContainer, { className: 'ui-pokemon-button', text: '+' }).element;

			this.pokemon[i].deploy.addEventListener('mouseenter', () => { playSound('hover3', 'ui') });
			// this.pokemon[i].deploy.addEventListener('mouseenter', () => { this.showSlotButtonTooltip(i, 'deploy') });
			// this.pokemon[i].deploy.addEventListener('mouseleave', () => { this.main.tooltip.hide() });
			this.pokemon[i].deploy.addEventListener('click', () => {
				this.main.game.tryDeployUnit(i, true)
			});

			this.pokemon[i].info.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
			// this.pokemon[i].info.addEventListener('mouseenter', () => { this.showSlotButtonTooltip(i, 'info') });
			// this.pokemon[i].info.addEventListener('mouseleave', () => { this.main.tooltip.hide() });
			this.pokemon[i].info.addEventListener('click', () => {
				if (!this.main.boxScene.isOpen && !this.main.inventoryScene.isOpen) this.main.pokemonScene.open(this.main.team.pokemon[i], i);
				else this.main.pokemonScene.open(this.main.team.pokemon[i], i, this.main.team.pokemon);
			});

			this.pokemon[i].levelUp.addEventListener('mouseenter', () => { playSound('hover3', 'ui') })
			this.pokemon[i].levelUp.addEventListener('click', () => {
				if (this.main.game.stopped) return playSound('pop0', 'ui');
				if (this.main.team.pokemon[i].lvl < 100 && this.main.player.gold >= this.main.team.pokemon[i].cost) {
					this.main.player.changeGold(-this.main.team.pokemon[i].cost);
					this.main.team.pokemon[i].levelUp();
					this.updatePokemon();
					playSound('obtain', 'ui');
					if (this.fastScene.isOpen) this.fastScene.close();
				}
			});

			this.pokemon[i].item.addEventListener('mouseenter', () => { playSound('hover3', 'ui') });
			// this.pokemon[i].item.addEventListener('mouseenter', () => { this.showSlotButtonTooltip(i, 'item') });
			// this.pokemon[i].item.addEventListener('mouseleave', () => { this.main.tooltip.hide() });
			this.pokemon[i].item.addEventListener('click', () => {
				//this.main.tooltip.hide();
				this.fastScene.open('item', i);
			});

			this.pokemon[i].noPokemon.addEventListener('mouseenter', () => { playSound('hover3', 'ui') });
			this.pokemon[i].noPokemon.addEventListener('click', () => { this.fastScene.open('pokemon', i) });

			this.pokemon[i].fieldStatus.addEventListener('mouseenter', () => {
				const pokemon = this.main.team.pokemon[i];
				if (!pokemon) return;
				this.main.tooltip.showItem(
					pokemon.isDeployed
						? { name: text.ui.fieldStatus.label, description: text.ui.fieldStatus.yes }
						: { name: text.ui.fieldStatus.label, description: text.ui.fieldStatus.no }
				);
			});
			this.pokemon[i].fieldStatus.addEventListener('mouseleave', () => { this.main.tooltip.hide() });

			this.pokemon[i].attackStyle.addEventListener('mouseenter', () => {
				const pokemon = this.main.team.pokemon[i];
				if (!pokemon) return;
				this.main.tooltip.showItem({
					name: ['Attack Shape'],
					description: [this.getAttackStyleTooltip(pokemon)]
				});
			});
			this.pokemon[i].attackStyle.addEventListener('mouseleave', () => { this.main.tooltip.hide() });

			this.pokemon[i].targetLeft.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
			this.pokemon[i].targetRight.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
			this.pokemon[i].targetLeft.addEventListener('click', (e) => {
				e.stopPropagation();
				this.changeSlotTargetMode(i, -1);
			});
			this.pokemon[i].targetRight.addEventListener('click', (e) => {
				e.stopPropagation();
				this.changeSlotTargetMode(i, 1);
			});

			this.pokemon[i].sprite.addEventListener('dblclick', () => {
				if (this.main.game.stopped) return playSound('pop0', 'ui');

				const pokemon = this.main.team.pokemon[i];
				if (!pokemon || this.main.area.inChallenge.draft) return;

				if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit();

				if (pokemon.isDeployed) {
					this.main.game.deployingUnit = pokemon;
					this.main.game.retireUnit();
				} else {
					playSound('unequip', 'ui');
				}

				this.main.box.addPokemon(pokemon);
				this.main.team.removePokemon(pokemon);

				this.main.area.checkWeather();
				this.update();

				if (this.fastScene.isOpen) this.fastScene.close();
			});

			this.pokemon[i].shiny.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
			this.pokemon[i].shiny.addEventListener('click', () => {
				if (this.main.game.stopped) return playSound('pop0', 'ui');
				if (this.main.team.pokemon[i] != undefined) {
					if (this.main.team.pokemon[i].isShiny) {
						this.main.team.pokemon[i].toggleShiny();
						this.update();
						playSound('option', 'ui');
					}
				}
			})
		}

		this.pokemon[6].stars.innerHTML = `<span class="lock">🔒</span><br><span class="msrre">⭐</span>40`;
		this.pokemon[7].stars.innerHTML = `<span class="lock">🔒</span><br><span class="msrre">⭐</span>160`;
		this.pokemon[8].stars.innerHTML = `<span class="lock">🔒</span><br><span class="msrre">⭐</span>320`;
		this.pokemon[9].stars.innerHTML = `<span class="lock">🔒</span><br><span class="msrre">⭐</span>540`;

		this.mapPanel = new Element(this.main.scene, { className: 'ui-map-panel' }).element;

		this.sectionContainer = new Element(this.mapPanel, { className: 'ui-section-container' }).element;
		this.section = [];

		SECTIONS.forEach(section =>  {
			this.section[section] = new Element(this.sectionContainer, { className: 'ui-section' }).element;
			this.section[section].img = new Element(this.section[section], { className: 'ui-section-img', image: `./src/assets/images/icons/${section}.png` }).element;
			this.section[section].addEventListener('mouseenter', () => {
				playSound('hover1', 'ui');
				// const tooltip = SECTION_TOOLTIPS[section];
				// if (tooltip) this.main.tooltip.showItem(tooltip);
			});
			// this.section[section].addEventListener('mouseleave', () => { this.main.tooltip.hide() });
		}) 

		this.section['profile'].addEventListener('click', () => { this.main.profileScene.open() });
		this.section['box'].addEventListener('click', () => { this.main.boxScene.open() });
		this.section['inventory'].addEventListener('click', () => { this.main.inventoryScene.open() });
		this.section['shop'].addEventListener('click', () => { this.main.shopScene.open() });
		this.section['map'].addEventListener('click', () => { this.main.mapScene.open() });
		this.section['challenge'].addEventListener('click', () => { this.main.challengeScene.open()  });
		this.section['damageDealt'].addEventListener('click', () => { this.damageDealtSwitch() });
		this.section['menu'].addEventListener('click', () => { this.main.menuScene.open() });
		
		this.mapPanelBackground = new Element(this.mapPanel, { className: 'ui-map-panel-background' }).element;
		this.mapWavePokemonContainer = new Element(this.mapPanelBackground, { className: 'ui-map-wave-pokemon-container' }).element;
		this.mapWavePokemon = [];

		this.infoContainer = new Element(this.mapPanelBackground, { className: 'ui-info-container' }).element;
		this.infoName = new Element(this.infoContainer, { className: 'ui-info-name' }).element;
		this.infoStatContainer = new Element(this.infoContainer, { className: 'ui-info-stat-container' }).element;
		this.infoHealth = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoArmor = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoSpeed = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoPower = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoRegen = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoStun = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoSlow = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoBurn = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoPoison = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoInvisible = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;
		this.infoGold = new Element(this.infoStatContainer, { className: 'ui-info-stat' }).element;

		this.infoPassive = new Element(this.mapPanel, { className: 'ui-info-passive' }).element;
		this.infoPassive.name = new Element(this.infoPassive, { className: 'ui-info-passive-name' }).element;
		this.infoPassive.description = new Element(this.infoPassive, { className: 'ui-info-passive-description' }).element;

		this.waveButtonBackground = new Element(this.mapPanel, { className: 'ui-wave-button-background' }).element;

		this.musicContainer = new Element(this.mapPanel, { className: 'ui-wave-music-container' }).element;
		this.musicPrev = new Element(this.musicContainer, { className: 'ui-wave-music-arrow', text: '<' }).element;
		this.musicName = new Element(this.musicContainer, { className: 'ui-wave-music-name' }).element;
		this.musicNext = new Element(this.musicContainer, { className: 'ui-wave-music-arrow', text: '>' }).element;

		this.musicPrev.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.musicPrev.addEventListener('click', () => this.changeMusic(-1));

		this.musicNext.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.musicNext.addEventListener('click', () => this.changeMusic(1));

		this.nextWave = new Element(this.mapPanel, { className: 'ui-next-wave' }).element;
		this.nextWave.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.nextWave.addEventListener('click', () => this.main.area.newWave());

		this.pauseWave = new Element(this.mapPanel, { className: 'ui-pause-wave', text: '||' }).element;
		this.pauseWave.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.pauseWave.addEventListener('click', () => { this.main.game.switchPause(); });

		this.autoWave = new Element(this.mapPanel, { className: 'ui-auto-wave' }).element;
		this.autoWave.addEventListener('mouseenter', () => { playSound('open', 'ui') })
		this.autoWave.addEventListener('click', () => this.main.area.switchAutoWave());	

		this.speedWave = new Element(this.mapPanel, { className: 'ui-speed-wave', text: '🚀' }).element;
		this.speedWave.addEventListener('mouseenter', () => { playSound('open', 'ui') });
		this.speedWave.addEventListener('click', () => { this.main.game.toggleSpeed() });

		this.damageDealtContainer = new Element(this.mapPanel, { className: 'ui-damage-dealt-container' }).element;
		this.damageDealtButton = new Element(this.mapPanel, { className: 'ui-damage-dealt-button' }).element;
		this.damageDealtButton.addEventListener('mouseenter', () => { playSound('open', 'ui') });
		this.damageDealtButton.addEventListener('click', () => { this.changeDamageType() });

		this.damageDealtUnit = [];

		for (let i = 0; i < 10; i++) {
			this.damageDealtUnit[i] = new Element(this.damageDealtContainer, { className: 'ui-damage-dealt-unit' }).element;
			this.damageDealtUnit[i].sprite = new Element(this.damageDealtUnit[i], { className: 'ui-damage-dealt-unit-sprite' }).element;
			this.damageDealtUnit[i].number = new Element(this.damageDealtUnit[i], { className: 'ui-damage-dealt-unit-number' }).element;
			this.damageDealtUnit[i].barContainer = new Element(this.damageDealtUnit[i], { className: 'ui-damage-dealt-unit-bar-container' }).element;
			this.damageDealtUnit[i].barPrevious = new Element(this.damageDealtUnit[i].barContainer, { className: 'ui-damage-dealt-unit-bar-previous' }).element;
			this.damageDealtUnit[i].bar = new Element(this.damageDealtUnit[i].barContainer, { className: 'ui-damage-dealt-unit-bar' }).element;
		}	

		this.renderInteractiveMap();
	}

	renderInteractiveMap() {
		this.secretCacnea = new Element(this.main.scene, { className: 'secret-cacnea' }).element;
		this.secretCacnea.addEventListener('click', () => { 
			this.secretCacnea.style.pointerEvents = 'none';
			this.main.player.secrets.cacnea = true;
			this.getSecret('cacnea');
		});

		this.secretGreavard = new Element(this.main.scene, { className: 'secret-greavard' }).element;
		this.secretGreavard.addEventListener('click', () => { 
			this.secretGreavard.style.pointerEvents = 'none';
			this.main.player.secrets.greavard = true;
			this.getSecret('greavard'); 
		});

		this.secretSandygast = new Element(this.main.scene, { className: 'secret-sandygast' }).element;
		this.secretSandygast.addEventListener('click', () => { 
			this.secretSandygast.style.pointerEvents = 'none';
			this.main.player.secrets.sandygast = true;
			this.getSecret('sandygast'); 
		});

		this.secretDucklett = new Element(this.main.scene, { className: 'secret-ducklett' }).element;
		this.secretDucklett.addEventListener('click', () => { 
			this.secretDucklett.style.pointerEvents = 'none';
			this.main.player.secrets.ducklett = true;
			this.getSecret('ducklett'); 
		});

		this.secretManaphyCave = new Element(this.main.scene, { className: 'secret-manaphy-cave' }).element;
		this.secretManaphyCave.addEventListener('click', () => { 
			this.secretManaphyCave.style.pointerEvents = 'none';
			this.main.player.secretMaps.manaphyCave = true;
			this.getSecretMap(20); 
		});
	}

	update() {
		this.updatePlayer();
		this.updatePokemon();
		this.updateMap();

		const wavePreview = this.getCurrentWavePreviewList();
		const previewPos = wavePreview.length > 0 ? Math.min(this.enemyPositionDisplay, wavePreview.length - 1) : 0;
		const previewEnemy = wavePreview[previewPos] || this.main.area.getWavePreview(this.main.area.waveNumber);
		if (previewEnemy) this.displayEnemyInfo(previewEnemy, previewPos);

		this.waveSelectorContainer.style.display = 'none';
		this.waveSelectorLabel.innerText = text.ui.waveManager[this.main.lang].toUpperCase();
		if (!this.main.area.inChallenge && this.main.player.records[this.main.area.map.id] >= 100 && this.main.player.hasBike) this.waveSelectorContainer.style.display = 'revert-layer';
		
		this.musicContainer.style.display = 'none';
		if (this.main.player.hasSubwoofer) {
			this.musicContainer.style.display = 'revert-layer';
			this.musicName.innerHTML = `♪ ${this.main.area.music.name[this.main.lang].toUpperCase()}`
		}

		if (!this.main.area.map.isSecret) this.mapRoute.innerHTML = `${this.main.area.map.name[this.main.lang].toUpperCase()} <br>${text.map.wave[this.main.lang].toUpperCase()} ${this.main.area.waveNumber}`;
		this.tilesCount.forEach((tc, i) => { tc.innerHTML = `${this.tilesCountNum[i]}/${this.main.area.map.tilesNum[i]}`});

		if (
			this.main.player.stars >= 540 &&
			this.main.player.records[this.main.area.map.id] >= 100 &&
			(this.main.team.pokemon.length + this.main.box.pokemon.length) > 30
		) {
			this.section['challenge'].style.opacity = 1;
			this.section['challenge'].style.pointerEvents = 'revert-layer';	
		} else {
			this.section['challenge'].style.opacity = 0.4;
			this.section['challenge'].style.pointerEvents = 'none';
		}

		if (!this.main.area.isCustom) {
			this.main.teamManager.teams.forEach((team, i) => {
				this.importTeamButton[i].style.pointerEvents = 'revert-layer';
				this.importTeamButton[i].style.filter = 'revert-layer';
				this.saveTeamButton[i].style.pointerEvents = 'revert-layer';
				this.saveTeamButton[i].style.filter = 'revert-layer';
			})
		} 

		if (this.main.area.inChallenge) {
			this.challenge.style.display = 'revert-layer';
			this.section['map'].style.opacity = 0.4;
			this.section['map'].style.pointerEvents = 'none';

			this.section['box'].style.opacity = (this.main.area.inChallenge.draft) ? 0.4 : 1;
			this.section['box'].style.pointerEvents = (this.main.area.inChallenge.draft) ? 'none' : 'revert-layer';

			this.section['inventory'].style.opacity = (this.main.area.inChallenge.noItems) ? 0.4 : 1;
			this.section['inventory'].style.pointerEvents = (this.main.area.inChallenge.noItems) ? 'none' : 'revert-layer';

			this.chrono.style.display = 'revert-layer';
			this.challenge.innerText = text.challenge.label[this.main.lang].toUpperCase();
		} else {
			this.challenge.style.display = 'none';
			this.chrono.style.display = 'none';
			this.section['map'].style.opacity = 1;
			this.section['map'].style.pointerEvents = 'revert-layer';
			this.section['box'].style.opacity = 1;
			this.section['box'].style.pointerEvents = 'revert-layer';
			this.section['inventory'].style.opacity = 1;
			this.section['inventory'].style.pointerEvents = 'revert-layer';
		}

		if (!this.main.area.inChallenge && !this.main.area.isCustom) {
			this.main.teamManager.teams.forEach((team, i) => {
				if (team[this.main.area.routeNumber].length == 0) {
					this.importTeamButton[i].style.pointerEvents = 'revert-layer';
					this.importTeamButton[i].style.filter = 'brightness(0.7)';
				} else {
					this.importTeamButton[i].style.pointerEvents = 'revert-layer';
					this.importTeamButton[i].style.filter = 'revert-layer';
				}
			})
		} else {
			for (let i = 0; i < this.importTeamButton.length; i++) {
				const team = this.main.teamManager.getChallengeTeam(i);
				if (team.length == 0) {
					this.importTeamButton[i].style.pointerEvents = 'revert-layer';
					this.importTeamButton[i].style.filter = 'brightness(0.7)';
				} else {
					this.importTeamButton[i].style.pointerEvents = 'revert-layer';
					this.importTeamButton[i].style.filter = 'revert-layer';
				}
			}
		}

		if (this.main.area.isCustom) {
			this.main.teamManager.teams.forEach((team, i) => {
				this.importTeamButton[i].style.pointerEvents = 'none';
				this.importTeamButton[i].style.filter = 'brightness(0.7)';
				this.saveTeamButton[i].style.pointerEvents = 'none';
				this.saveTeamButton[i].style.filter = 'brightness(0.7)';
			})
		} 

		if (
			this.main.area.routeNumber == 4 && 
			!this.main.area.inChallenge &&
			!this.main.player.secrets.cacnea
		) {
			this.secretCacnea.style.pointerEvents = 'revert-layer';
		} else {
			this.secretCacnea.style.pointerEvents = 'none';
		} 

		if (
			this.main.area.routeNumber == 2 && 
			!this.main.area.inChallenge &&
			!this.main.player.secrets.greavard
		) {
			this.secretGreavard.style.pointerEvents = 'revert-layer';
		} else {
			this.secretGreavard.style.pointerEvents = 'none';
		}

		if (
			this.main.area.routeNumber == 16 && 
			!this.main.area.inChallenge &&
			!this.main.player.secrets.sandygast
		) {
			this.secretSandygast.style.pointerEvents = 'revert-layer';
		} else {
			this.secretSandygast.style.pointerEvents = 'none';
		}

		if (
			this.main.area.routeNumber == 13 && 
			!this.main.area.inChallenge &&
			!this.main.player.secrets.ducklett
		) {
			this.secretDucklett.style.pointerEvents = 'revert-layer';
		} else {
			this.secretDucklett.style.pointerEvents = 'none';
		}

		if (
			this.main.area.routeNumber == 11 && 
			!this.main.area.inChallenge &&
			!this.main.area.waveActive
		) {
			this.secretManaphyCave.style.pointerEvents = 'revert-layer';
		} else {
			this.secretManaphyCave.style.pointerEvents = 'none';
		}

		this.updateWaveInfo();
		this.displayWeather();
	}

	updateWaveInfo() {
		if (!this.waveInfoDisplay) {
			this.waveInfoPanel.style.display = 'none';
			return;
		}

		this.waveInfoPanel.style.display = 'block';

		const waveNum = this.main.area.waveNumber;
		const isEndless = waveNum > 100;
		this.waveInfoWave.innerHTML = `${(text.map.wave?.[this.main.lang] ?? text.map.wave?.[0] ?? 'Wave').toUpperCase()} ${waveNum}${isEndless ? ' <span style=\"color:#e94560;\">(∞)</span>' : ''}`;

		const enemiesRemaining = this.main.area.enemies?.length || 0;
		const waveActive = this.main.area.waveActive;
		if (waveActive) {
			this.waveInfoEnemies.innerHTML = `${uiLabel('enemies', this.main.lang, 'Enemies')}: <span style="color:#ff6b6b;">${enemiesRemaining}</span>`;
		} else {
			this.waveInfoEnemies.innerHTML = `<span style="color:#666;">${uiLabel('waveComplete', this.main.lang, 'Wave Complete')}</span>`;
		}

		if (waveActive && this.main.area.waveStartTime) {
			const elapsed = Math.floor((Date.now() - this.main.area.waveStartTime) / 1000);
			const mins = Math.floor(elapsed / 60);
			const secs = elapsed % 60;
			this.waveInfoTime.innerHTML = `${uiLabel('time', this.main.lang, 'Time')}: ${mins}:${secs.toString().padStart(2, '0')}`;
		} else {
			this.waveInfoTime.innerHTML = '';
		}
	}

	toggleWaveInfo() {
		this.waveInfoDisplay = !this.waveInfoDisplay;
		this.updateWaveInfo();
	}

	displayWeather() {
		if (!this.main.area.weather) {
			this.weather.style.display = 'none';
		} else {
			this.weather.style.display = 'block';
			this.weather.style.backgroundImage = `url("${weatherData[this.main.area.weather].sprite}")`;
			this.main.tooltip.bindTo(this.weather, { name: weatherData[this.main.area.weather].name, description: weatherData[this.main.area.weather].description }, 'item');
		}
	}

	updatePlayer() {
		this.playerPortrait.style.backgroundImage = `url("./src/assets/images/portraits/${this.main.player.portrait}.png")`;
		this.playerName.innerText = this.main.player.name.toUpperCase();
		const goldValue = Number(this.main.player.gold);
		const gold = Number.isFinite(goldValue) ? Math.max(0, goldValue) : 0;
		const billion = uiLabel('billion', this.main.lang, 'BILLION').toUpperCase();
		const trillion = uiLabel('trillion', this.main.lang, 'TRILLION').toUpperCase();
		const quadrillion = uiLabel('quadrillion', this.main.lang, 'QUADRILLION').toUpperCase();
		const goldText = gold >= 1e15
			? `$${(gold / 1e15).toFixed(2)} ${quadrillion}`
			: gold >= 1e12
				? `$${(gold / 1e12).toFixed(2)} ${trillion}`
				: gold >= 1e9
					? `$${(gold / 1e9).toFixed(2)} ${billion}`
					: `$${this.main.utility.numberDot(gold)}`;
		this.playerGold.innerText = goldText;
		this.updateWaveIncome();
		this.playerStars.innerHTML = `<span class="msrre">⭐</span>${this.main.player.stars}`;
		this.playerRibbonsText.innerHTML = `${this.main.player.ribbons}`;

		this.playerHealth.innerHTML = '';
		this.hearts = []
		for (let i = 0; i < 14; i++) {
			if (this.main.player.health[this.main.area.map.id] > i) this.hearts[i] = new Element(this.playerHealth, { className: 'ui-player-heart-on' }).element;
			else this.hearts[i] = new Element(this.playerHealth, { className: 'ui-player-heart-off' }).element;
		}
	}

	updateWaveIncome(isLiveTick = false) {
		if (!this.waveIncome) return;
		if (!this.main || !this.main.area || !this.main.player || !this.main.area.map) return;

		const area = this.main.area;
		const player = this.main.player;
		const state = this.waveIncomeState;

		if (area.inChallenge || area.isCustom) {
			this.waveIncome.style.display = 'none';
			return;
		}

		this.waveIncome.style.display = 'revert-layer';

		const now = performance.now();
		const routeKey = `${area.map.id}:${area.inChallenge ? 1 : 0}`;
		const waveKey = `${routeKey}:${area.waveNumber}:${area.waveActive ? 1 : 0}`;

		if (state.lastTime === 0) {
			state.routeKey = routeKey;
			state.waveKey = waveKey;
			state.routeStartTime = now;
			state.lastGold = player.gold || 0;
			state.routeEarned = 0;
			state.waveEarned = 0;
			state.lastTime = now;
			state.smoothPerSecond = 0;
			this.waveIncome.innerText = `WAVE: $0 | $/min: 0`;
			return;
		}

		if (state.routeKey !== routeKey) {
			state.routeKey = routeKey;
			state.waveKey = waveKey;
			state.routeStartTime = now;
			state.lastGold = player.gold || 0;
			state.routeEarned = 0;
			state.waveEarned = 0;
			state.lastTime = now;
			state.smoothPerSecond = 0;
		}

		if (state.waveKey !== waveKey) {
			state.waveKey = waveKey;
			// state.waveEarned = 0;
		}

		const currentGold = player.gold || 0;
		const deltaGold = currentGold - state.lastGold;
		if (deltaGold > 0) state.routeEarned += deltaGold;
		if (area.waveActive && deltaGold > 0) state.waveEarned += deltaGold;
		state.lastGold = currentGold;

		const elapsedSec = Math.max(0.001, (now - state.lastTime) / 1000);
		if (area.waveActive) {
			const instant = Math.max(0, deltaGold) / elapsedSec;
			state.smoothPerSecond = (state.smoothPerSecond * 0.75) + (instant * 0.25);
		} else if (isLiveTick) {
			state.smoothPerSecond *= 0.85;
			if (state.smoothPerSecond < 0.05) state.smoothPerSecond = 0;
		}
		state.lastTime = now;

		const waveEarned = area.waveActive ? state.waveEarned : Math.max(0, area.goldWave || state.waveEarned || 0);
		const routeMinutes = Math.max(1 / 60, (now - state.routeStartTime) / 60000);
		const perMinute = state.routeEarned / routeMinutes;
		this.waveIncome.innerText = `WAVE: $${this.main.utility.numberDot(Math.floor(waveEarned))} | $${this.main.utility.numberDot(Math.floor(perMinute))}/min`;
	}

	getLocalizedValue(values, fallback = '') {
		if (!Array.isArray(values)) return fallback;
		return values[this.main.lang] ?? values[0] ?? fallback;
	}

	getShortTooltipText(textValue, maxLen = 90) {
		if (!textValue) return '';
		const clean = `${textValue}`.replace(/\s+/g, ' ').trim();
		if (clean.length <= maxLen) return clean;
		return `${clean.slice(0, maxLen - 3)}...`;
	}

	showCompactItemTooltip(item) {
		if (!item) return;
		const itemName = this.getLocalizedValue(item.name, 'Item');
		const itemDesc = this.getShortTooltipText(this.getLocalizedValue(item.description, ''), 70) || 'No description.';
		this.main.tooltip.showItem({ name: [itemName], description: [itemDesc] });
	}

	getAttackStyleSymbol(pokemon) {
		if (pokemon?.attackType === 'area') return 'A';
		if (pokemon?.attackType === 'aura') return '~';
		switch (pokemon?.rangeType) {
			case 'cross': return '+';
			case 'xShape': return 'X';
			case 'horizontalLine': return '-';
			case 'donut':
			case 'circle':
			default: return 'O';
		}
	}

	getAttackStyleTooltip(pokemon) {
		const shapeNames = {
			circle: ['Circle range', 'En círculo', 'En cercle', 'Em círculo', 'A cerchio', 'Kreisbereich', '円形', '원형', '圓形', 'Kołowy'],
			donut: ['Ring range', 'En anillo', 'En anneau', 'Em anel', 'A anello', 'Ringbereich', 'ドーナツ型', '도넛형', '環状', 'Pierścieniowy'],
			cross: ['Cross range', 'En cruz', 'En croix', 'Em cruz', 'A croce', 'Kreuzbereich', '十字', '십자', '十字', 'Krzyżowy'],
			xShape: ['X-shaped', 'En X', 'En X', 'Em X', 'A forma di X', 'X-Form', 'X字', 'X자형', 'X字', 'W kształcie X'],
			horizontalLine: ['Line range', 'En horizontal', 'En ligne', 'Em linha', 'In linea', 'Linienbereich', '直線', '직선', '直線', 'Liniowy']
		};
		const targetNames = {
			single: ['single target', 'monobjetivo', 'cible unique', 'alvo único', 'bersaglio singolo', 'einzelziel', '単体', '단일 대상', '單體', 'pojedynczy cel'],
			area: ['area target', 'en area', 'en zone', 'em área', 'ad area', 'flächenschaden', '範囲', '광역', '範疇', 'obszarowy'],
			aura: ['aura', 'aura', 'aura', 'aura', 'aura', 'aura', 'オーラ', '오라', '氣場', 'aura'],
			orbital: ['orbital', 'orbital', 'orbitale', 'orbital', 'orbitale', 'orbital', '軌道', '궤도', '軌道', 'orbital']
		};
		const shape = shapeNames[pokemon?.rangeType][this.main.lang] || 'Circle range';
		const target = targetNames[pokemon?.attackType][this.main.lang] || pokemon?.attackType || 'target';
		return `${shape}, ${target}.`;
	}

	getCompactTargetLabel(pokemon) {
		if (pokemon?.orbital > 0) return TARGET_MODES_TRADUCTIONS['orbital'][this.main.lang];
		return TARGET_MODES_TRADUCTIONS[pokemon?.targetMode][this.main.lang] || pokemon?.targetMode[this.main.lang] || '';
	}

	canChangeSlotTargetMode(pokemon) {
		if (!pokemon) return false;
		if (['quickClaw', 'spindaCocktail', 'silphScope'].includes(pokemon?.item?.id)) return false;
		if ((pokemon?.id == 53 && pokemon?.item?.id !== 'ringTarget') || pokemon?.adn?.id == 53) return false;
		if (pokemon?.orbital > 0) return false;
		return !['area', 'aura', 'allies'].includes(pokemon.targetMode);
	}

	changeSlotTargetMode(index, dir) {
		const pokemon = this.main.team.pokemon[index];
		if (!pokemon || !this.canChangeSlotTargetMode(pokemon)) return playSound('pop0', 'ui');

		let modeIndex = TARGET_MODES.findIndex(mode => mode === pokemon.targetMode);
		if (modeIndex === -1) modeIndex = 0;
		const maxIndex = (pokemon.ability.id == 'frisk' || pokemon.ability.id == 'illuminate' || pokemon.ability.id == 'vigilantFrisk' || pokemon?.item?.id == 'silphScope') ? 20 : 19;

		modeIndex += dir;
		if (modeIndex > maxIndex) modeIndex = 0;
		else if (modeIndex < 0) modeIndex = maxIndex;

		pokemon.changeTargetMode(TARGET_MODES[modeIndex]);
		this.updatePokemon();
		playSound('option', 'ui');
	}

	getSavedTeamSlot(slot) {
		if (this.main.area.inChallenge) {
			const team = this.main.teamManager.getChallengeTeam(slot);
			const slotLimit = this.main.area.inChallenge.slotLimit;
			return typeof slotLimit === 'number' ? team.slice(0, slotLimit) : team;
		}
		const routeNumber = this.main.area.routeNumber;
		return this.main.teamManager.teams?.[slot]?.[routeNumber] || [];
	}

	getMatchingPokemonForTeamEntry(entry, index) {
		if (!entry) return null;
		const itemId = typeof entry.item === 'string' ? entry.item : entry.item?.id;
		const isMatch = pokemon => {
			if (!pokemon || pokemon.id !== entry.id) return false;
			if (!itemId) return true;
			return (pokemon.item?.id || null) === itemId;
		};

		const indexedPokemon = this.main.team.pokemon?.[index];
		if (isMatch(indexedPokemon)) return indexedPokemon;

		const allPokemon = [
			...(this.main.team.pokemon || []),
			...(this.main.box.pokemon || [])
		];
		return allPokemon.find(isMatch) || allPokemon.find(pokemon => pokemon?.id === entry.id) || null;
	}

	getTeamEntryPokemonName(entry, index) {
		if (!entry) return 'Unknown Pokemon';
		const specieByKey = pokemonData[entry.specieKey] || pokemonData[entry.form];
		const matchedPokemon = this.getMatchingPokemonForTeamEntry(entry, index);
		const data = Object.values(pokemonData).find(pokemon => pokemon?.id === entry.id);
		return this.getLocalizedValue(entry.savedName, '')
			|| this.getLocalizedValue(entry.name, '')
			|| this.getLocalizedValue(specieByKey?.name, '')
			|| this.getLocalizedValue(matchedPokemon?.name, '')
			|| this.getLocalizedValue(matchedPokemon?.specie?.name, '')
			|| this.getLocalizedValue(data?.name, `Pokemon #${entry.id ?? '?'}`);
	}

	getTeamEntryItemName(entry) {
		const item = entry?.item;
		if (!item) return 'No Item';
		const itemRecord = typeof item === 'string' ? itemData[item] : itemData[item.id];
		return this.getLocalizedValue(item.name, '')
			|| this.getLocalizedValue(itemRecord?.name, item.id || item || 'Item');
	}

	formatTeamSlotLines(entries) {
		if (!Array.isArray(entries) || entries.length === 0) return ['Empty'];
		return entries.slice(0, 10).map((entry, index) => {
			const pokemonName = this.getTeamEntryPokemonName(entry, index);
			const itemName = this.getTeamEntryItemName(entry);
			const passengerText = entry.isPassenger ? ' (Passenger)' : '';
			return `${index + 1}. ${pokemonName} - ${itemName}${passengerText}`;
		});
	}

	showTeamSlotTooltip(slot, mode) {
		const isChallenge = !!this.main.area.inChallenge;
		const routeText = this.mapRoute?.innerText?.replace(/\s+/g, ' ').trim();
		const routeLabel = isChallenge
			? (this.main.area.inChallenge.draft ? 'Draft Pick Challenge' : 'Challenge')
			: (routeText || `Route ${this.main.area.routeNumber}`);
		const slotLabel = `#${slot + 1}`;
		const entries = mode === 'save'
			? (this.main.team.pokemon || []).filter(Boolean)
			: this.getSavedTeamSlot(slot);
		const lines = this.formatTeamSlotLines(entries);
		const title = mode === 'save' ? `Save Team ${slotLabel}` : `Load Team ${slotLabel}`;
		const slotLimit = this.main.area.inChallenge?.slotLimit;
		const noItemsText = mode === 'load' && this.main.area.inChallenge?.noItems && entries.length > 0
			? '<br>Held items will be ignored for No Items.'
			: '';
		const storedChallengeTeam = this.main.area.inChallenge
			? this.main.teamManager.getChallengeTeam(slot)
			: [];
		const slotLimitText = mode === 'load' && typeof slotLimit === 'number' && storedChallengeTeam.length > slotLimit
			? `<br>Only the first ${slotLimit} Pokemon will load for this slot limit.`
			: '';
		const actionText = mode === 'save'
			? `${text.ui.saveCurrentTeam[this.main.lang]} ${routeLabel}.`
			: (entries.length === 0 ? `${text.ui.noSavedTeamFor[this.main.lang]} ${routeLabel}.` : `${text.ui.savedTeamFor[this.main.lang]} ${routeLabel}:${slotLimitText}${noItemsText}`);
		const description = entries.length === 0 && mode === 'load'
			? actionText
			: `${actionText}<br><br>${lines.join('<br>')}`;

		this.main.tooltip.showItem({ name: [title], description: [description] });
	}

	showSlotButtonTooltip(index, type) {
		const pokemon = this.main.team.pokemon[index];
		if (!pokemon) return;

		if (type === 'deploy') {
			const tooltipData = pokemon.isDeployed
				? { name: ['Remove'], description: ['Remove this Pokemon from the field.'] }
				: { name: ['Add'], description: ['Add this Pokemon to the field and show valid tiles.'] };
			this.main.tooltip.showItem(tooltipData);
			return;
		}

		if (type === 'info') {
			this.main.tooltip.showItem({ name: ['Info'], description: ['Open this Pokemon details panel.'] });
			return;
		}

		if (type === 'item') {
			if (!pokemon.item) {
				this.main.tooltip.showItem({ name: ['Item'], description: ['Open item selection for this Pokemon.'] });
				return;
			}
			const itemName = this.getLocalizedValue(pokemon.item.name, 'Item');
			const itemDesc = this.getShortTooltipText(this.getLocalizedValue(pokemon.item.description, ''), 120) || 'No description.';
			this.main.tooltip.showItem({ name: [itemName], description: [itemDesc] });
		}
	}

	updatePokemon() {
		for (let i = 0; i < 10; i++) {
			this.pokemon[i].name.innerText = text.ui.empty[this.main.lang].toUpperCase();

			this.pokemon[i].style.background = 'revert-layer';
			this.pokemon[i].name.style.color = '#888';
			this.pokemon[i].level.innerText = '';
			this.pokemon[i].shiny.style.display = 'none';
			this.pokemon[i].shiny.classList.remove('is-inline');
			this.pokemon[i].sprite.style.backgroundImage = '';
			this.pokemon[i].sprite.style.cursor = "";
			this.pokemon[i].style.transform = `revert-layer`
			this.pokemon[i].sprite.style.transform = `revert-layer`
			
			this.pokemon[i].item.style.background = "revert-layer";
			this.pokemon[i].item.style.pointerEvents = 'none';
			this.pokemon[i].item.style.display = 'none';
			this.pokemon[i].item.style.filter = 'revert-layer'
			this.pokemon[i].item.innerText = '+';
			this.pokemon[i].item.title = '';

			this.pokemon[i].deploy.style.background = 'revert-layer';
			this.pokemon[i].deploy.style.pointerEvents = 'none';
			this.pokemon[i].deploy.style.display = 'none';
			this.pokemon[i].deploy.style.paddingTop = 'revert-layer';
			this.pokemon[i].deploy.style.filter = 'revert-layer';
			this.pokemon[i].deploy.style.boxShadow = 'revert-layer';
			this.pokemon[i].deploy.title = '';

			this.pokemon[i].info.style.pointerEvents = 'none';
			this.pokemon[i].info.style.display = 'none';
			this.pokemon[i].info.title = '';

			this.pokemon[i].levelUp.style.pointerEvents = 'none';
			this.pokemon[i].levelUp.style.display = 'none';
			this.pokemon[i].levelUp.style.filter = 'brightness(0.6)';

			this.pokemon[i].noPokemon.style.display = 'revert-layer';

			this.pokemon[i].stars.style.display = 'none';
			this.pokemon[i].attackStyle.style.display = 'none';
			this.pokemon[i].attackStyle.classList.remove('is-circle', 'is-donut', 'is-cross', 'is-x-shape', 'is-line');
			this.pokemon[i].attackStyle.innerText = '';
			this.pokemon[i].fieldStatus.style.display = 'none';
			this.pokemon[i].fieldStatus.classList.remove('is-deployed', 'is-undeployed');
			this.pokemon[i].fieldStatus.innerText = '';
			this.pokemon[i].targetMode.style.display = 'none';
			this.pokemon[i].targetMode.classList.remove('is-locked');
			this.pokemon[i].targetText.innerText = '';
			this.pokemon[i].dittoBg.style.display = 'none';

			this.damageDealtUnit[i].sprite.style.display = 'none';
			this.damageDealtUnit[i].number.style.display = 'none';
			this.damageDealtUnit[i].barContainer.style.display = 'none';
			this.damageDealtUnit[i].bar.style.display = 'none';
		}

		this.main.team.pokemon.forEach((pokemon, i) => {
			let lang = this.main.lang;
			if (pokemon.name[lang] == undefined) lang = 0;

			this.pokemon[i].noPokemon.style.display = 'none';
			
			this.pokemon[i].name.innerText = (pokemon.alias != undefined) ? pokemon.alias.toUpperCase() : pokemon.name[lang].toUpperCase();
			
			if (pokemon.id == 70) this.pokemon[i].dittoBg.style.display = 'revert-layer';
	
			if (typeof this.main.area.inChallenge.lvlCap == 'number') {
				this.pokemon[i].level.innerText = `Lv ${Math.min(pokemon.lvl, this.main.area.inChallenge.lvlCap)}`;
			} else this.pokemon[i].level.innerText = `Lv ${pokemon.lvl}`;
			
			this.pokemon[i].sprite.style.backgroundImage = `url("${pokemon.sprite.base}")`;
			if (pokemon.item != undefined) {
				this.pokemon[i].item.innerText = '';
				this.pokemon[i].item.style.background = `url("${pokemon.item.sprite}") center/contain no-repeat, linear-gradient(180deg,rgba(251, 205, 43, 1) 0%, rgba(217, 175, 30, 1) 100%)`;
				if (pokemon.item.id == 'inverter') {
					if (pokemon.ability.id != 'contrary') this.pokemon[i].style.transform = `scale(1, -1)`;
					else this.pokemon[i].sprite.style.transform = `translate(-50%, 0) scale(1, -1)`;
				}
			}
			if (pokemon.isShiny) {
				this.pokemon[i].shiny.style.display = 'revert-layer';
				this.pokemon[i].shiny.classList.add('is-inline');
			}
			
			this.pokemon[i].sprite.style.cursor = "grab";
			this.damageDealtUnit[i].sprite.style.display = 'revert-layer';
			this.damageDealtUnit[i].number.style.display = 'revert-layer';
			this.damageDealtUnit[i].barContainer.style.display = 'revert-layer';
			this.damageDealtUnit[i].bar.style.display = 'revert-layer';

			this.damageDealtUnit[i].sprite.style.backgroundImage = `url("${pokemon.sprite.base}")`;
			this.damageDealtUnit[i].bar.style.backgroundColor = pokemon.specie.color;
			this.damageDealtUnit[i].barPrevious.style.backgroundColor = `${pokemon.specie.color}4D`;

			this.pokemon[i].name.style.color = pokemon.specie.color;
			this.pokemon[i].style.backgroundColor = `${pokemon.specie.color}33`
			this.pokemon[i].attackStyle.style.display = (this.main.indicatorShape) ? 'revert-layer' : 'none';
			this.pokemon[i].attackStyle.innerText = this.getAttackStyleSymbol(pokemon);
			if (pokemon.rangeType === 'circle') {
				switch(pokemon.attackType) {
				case 'area':
					this.pokemon[i].attackStyle.classList.toggle('is-area', true);
					break;
				case 'aura':
					this.pokemon[i].attackStyle.classList.toggle('is-aura', true);
					break;
				default:
					this.pokemon[i].attackStyle.classList.toggle('is-circle', true);
					break
				}
			}
			this.pokemon[i].attackStyle.classList.toggle('is-donut', pokemon.rangeType === 'donut');
			this.pokemon[i].attackStyle.classList.toggle('is-cross', pokemon.rangeType === 'cross');
			this.pokemon[i].attackStyle.classList.toggle('is-x-shape', pokemon.rangeType === 'xShape');
			this.pokemon[i].attackStyle.classList.toggle('is-line', pokemon.rangeType === 'horizontalLine');
			this.pokemon[i].fieldStatus.style.display = (this.main.indicatorField) ? 'revert-layer' : 'none';
			this.pokemon[i].fieldStatus.innerText = pokemon.isDeployed ? '✓' : '✕';
			this.pokemon[i].fieldStatus.classList.toggle('is-deployed', pokemon.isDeployed);
			this.pokemon[i].fieldStatus.classList.toggle('is-undeployed', !pokemon.isDeployed);
			this.pokemon[i].targetMode.style.display = (this.main.fastTarget) ? 'revert-layer' : 'none';
			this.pokemon[i].targetMode.classList.toggle('is-locked', !this.canChangeSlotTargetMode(pokemon));
			this.pokemon[i].targetText.innerText = this.getCompactTargetLabel(pokemon);

			this.pokemon[i].deploy.style.pointerEvents = 'all';
			this.pokemon[i].deploy.style.filter = 'revert-layer';
			this.pokemon[i].deploy.style.display = 'revert-layer';
			this.pokemon[i].deploy.title = '';

			this.pokemon[i].info.style.pointerEvents = 'all';
			this.pokemon[i].info.style.filter = 'revert-layer';
			this.pokemon[i].info.style.display = 'revert-layer';
			this.pokemon[i].info.title = '';

			this.pokemon[i].item.style.display = 'revert-layer';
			this.pokemon[i].item.style.pointerEvents = 'all';
			if (pokemon.item) {
				const itemName = this.getLocalizedValue(pokemon.item.name, 'Item');
				const itemDesc = this.getShortTooltipText(this.getLocalizedValue(pokemon.item.description, ''), 100);
				this.pokemon[i].item.title = '';
			} else {
				this.pokemon[i].item.title = '';
			}

			if (typeof this.main.area.inChallenge.lvlCap !== 'number') {
				if (pokemon.lvl < 100) this.pokemon[i].levelUp.style.display = 'revert-layer';
				if (pokemon.lvl < 100 && this.main.player.gold >= pokemon.cost) {
					this.pokemon[i].levelUp.style.pointerEvents = 'all';
					this.pokemon[i].levelUp.style.filter = 'revert-layer';
				}	
			}	

			if (pokemon.isDeployed) {
				if (
					['silphScope', 'airBalloon', 'heavyDutyBoots', 'dampMulch', 'assaultVest', 
					'twistedSpoon', 'subwoofer', 'ejectButton', 'jadeOrb', 'lustrousOrb', 'mitsuesCocktail',
					'dampRock', 'smoothRock', 'icyRock', 'heatRockWeather', 'charizarditeY'].includes(pokemon?.item?.id)) {
					this.pokemon[i].item.style.pointerEvents = 'none';
					this.pokemon[i].item.style.filter = 'brightness(0.6)'
				}
				this.pokemon[i].deploy.style.background = 
					`url("./src/assets/images/icons/pokeball-open.png") center / 50% no-repeat, linear-gradient(180deg,rgba(178, 61, 39, 1) 0%, rgba(157, 56, 41, 1) 100%)`
			}
		})

		for (let i = 9; i > this.main.player.teamSlots - 1; i--) {
			this.pokemon[i].noPokemon.style.display = 'none';
			this.pokemon[i].style.background = 'rgba(0, 0, 0, 0.55)';
			this.pokemon[i].name.innerText = text.ui.locked[this.main.lang].toUpperCase();
			this.pokemon[i].stars.style.display = 'revert-layer';		
		}

		if (typeof this.main.area.inChallenge.slotLimit == 'number') {
			for (let i = 9; i >= this.main.area.inChallenge.slotLimit; i--) {
				this.pokemon[i].style.background = 'rgba(140, 0, 0, 0.55)';
			}
		}

		this.pokemon.forEach((slot, i) => {
	        slot.dataset.index = i;
	        slot.style.touchAction = 'none';
	    });

	    this.setupPokemonDragAndDrop();
	}


 	setupPokemonDragAndDrop() {
	    if (this.main.area.inChallenge?.draft) return;

	    // Forzar pointer-events
	    this.playerPanel.style.pointerEvents = 'all';
	    this.pokemonContainer.style.pointerEvents = 'auto';
	    this.pokemon.forEach(slot => slot.style.pointerEvents = 'auto');
	    this.isDragging = false;

	    const THRESHOLD = 5; // px para distinguir click de drag

	    // Estado del drag
	    let draggedIndex = null;
	    let clone = null;
	    let activePointerId = null;
	    let slotElement = null;

	    const onPointerCancelDuringDrag = () => {
	        clearDragState();
	    };

	    const clearDragState = () => {
	        window.removeEventListener('pointermove', onPointerMoveDuringDrag);
	        window.removeEventListener('pointerup', onPointerUpDuringDrag);
	        window.removeEventListener('pointercancel', onPointerCancelDuringDrag);
	        if (clone) {
	            clone.remove();
	            clone = null;
	        }
	        if (slotElement && activePointerId != null) {
	            try { slotElement.releasePointerCapture(activePointerId); } catch (e) {}
	        }
	        draggedIndex = null;
	        activePointerId = null;
	        slotElement = null;
	        this.isDragging = false;
	        // limpiar coordenadas del canvas para que las tiles dejen de mostrarse
	        if (this.main?.game?.mouse) {
	            this.main.game.mouse.x = undefined;
	            this.main.game.mouse.y = undefined;
	            // forzar redraw inmediato para que desaparezcan los highlights
	            try { this.main.game.animate(performance.now()); } catch (err) {}
	        }
	        document.body.style.cursor = '';
	    };

	    const onPointerMoveDuringDrag = (e) => {
	        if (!clone) return;
	        clone.style.left = `${e.pageX - clone.offsetWidth / 2}px`;
	        clone.style.top = `${e.pageY - clone.offsetHeight / 2}px`;

	        // detectar target sin que el clone interfiera
	        clone.style.display = 'none';
	        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
	        clone.style.display = 'block';

	        const targetSlot = targetElement?.closest('.ui-pokemon');
	        this.pokemon.forEach(s => s.classList.remove('drag-over'));
	        if (targetSlot && parseInt(targetSlot.dataset.index) !== draggedIndex) {
	            targetSlot.classList.add('drag-over');
	        }

	        // --- NUEVO: actualizar mouse del juego si el cursor está sobre el canvas ---
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

	                // actualizar coordenadas globales del juego para que PlacementTile.update las use
	                this.main.game.mouse.x = canvasX;
	                this.main.game.mouse.y = canvasY;
	            } else {
	                // fuera del canvas -> limpiar coordenadas para que no quede highlight
	                this.main.game.mouse.x = undefined;
	                this.main.game.mouse.y = undefined;
	            }
	        } catch (err) {
	            // si no hay game/canvas, noop
	        }

	        // forzar render (intento inmediato)
	        try { this.main.game.animate(performance.now()); } catch (err) {}
	    };

	    const onPointerUpDuringDrag = (e) => {

	        // quitar listeners de arrastre
	        window.removeEventListener('pointermove', onPointerMoveDuringDrag);
	        window.removeEventListener('pointerup', onPointerUpDuringDrag);
	        window.removeEventListener('pointercancel', onPointerCancelDuringDrag);

	        if (clone) clone.remove();

	        // --- Intentar detectar drop sobre canvas/mapa ---
	        const canvasEl = this.main.game.canvas;
	        const rect = canvasEl.getBoundingClientRect();

	        // comprobamos si el pointer up ocurrió dentro del canvas (cliente)
	        const cx = e.clientX;
	        const cy = e.clientY;

	        let tile = null;
	        if (
	            cx >= rect.left && cx <= rect.right &&
	            cy >= rect.top && cy <= rect.bottom &&
	            draggedIndex != null
	        ) {
	            // convertir a coordenadas de canvas (teniendo en cuenta escalado CSS)
	            const scaleX = canvasEl.width / rect.width;
	            const scaleY = canvasEl.height / rect.height;
	            const canvasX = (cx - rect.left) * scaleX;
	            const canvasY = (cy - rect.top) * scaleY;

	            // buscar tile bajo esas coordenadas
	            tile = this.main.area.placementTiles.find(t =>
	                canvasX > t.position.x &&
	                canvasX < t.position.x + t.size &&
	                canvasY > t.position.y &&
	                canvasY < t.position.y + t.size
	            );
	        }

	        // Si hay tile, intentar desplegar / swap / retirar según corresponda
	        if (tile && draggedIndex != null) {
	            const pokemon = this.main.team.pokemon[draggedIndex];
	            const clickedPokemon = tile.tower || null;

	            // poner el juego en modo deploy (tryDeployUnit puede llamar retireUnit internamente)
	            this.main.game.tryDeployUnit(draggedIndex, true);

	            // si tryDeployUnit retiró la unidad (deployingUnit quedó vacío), reasignar temporalmente
	            if (!this.main.game.deployingUnit) {
	                this.main.game.deployingUnit = pokemon;
	            }

	            // Si el jugador hizo click sobre la misma torre que estaba desplegando -> cancelar
	            if (clickedPokemon === this.main.game.deployingUnit) {
	                this.main.game.cancelDeployUnit();
	            } else {
	                // validar si la unidad puede colocarse en ese tipo de tile
	                const canPlace = tile?.canPlacePokemonHere 
				    ? tile.canPlacePokemonHere(this.main.game.deployingUnit)
				    : (
				        this.main.game.deployingUnit.tiles.includes(tile.land) ||
				        (this.main.game.deployingUnit?.item?.id == 'airBalloon' && tile.land == 4) ||
				        (this.main.game.deployingUnit?.item?.id == 'heavyDutyBoots' && tile.land == 2) ||
				        (this.main.game.deployingUnit?.item?.id == 'assaultVest' && tile.land == 2) ||
				        (this.main.game.deployingUnit?.item?.id == 'dampMulch' && tile.land == 1) ||
				        (this.main.game.deployingUnit?.item?.id == 'mitsuesCocktail' && tile.land == 3) ||
				        (this.main.game.deployingUnit?.item?.id == 'subwoofer' && tile.land == 3 && [76, 86, 120].includes(this.main.game.deployingUnit.id))
				    );

	                if (!canPlace) {
	                    // no se puede colocar ahí -> cancelar deploy
	                    this.main.game.cancelDeployUnit();
	                } else {
	                    if (!clickedPokemon) {
	                        // tile vacío -> desplegar normalmente
	                        this.main.game.moveUnitToTile(tile);
	                    } else {
						    // tile ocupado -> decidir swap o passenger o reemplazo
						    if (this.main.game.deployingUnit.isDeployed) {
						        // la que arrastramos ya estaba desplegada -> swap
						        const sourceTile = this.main.area.placementTiles.find(t => t.tower === this.main.game.deployingUnit);
						        if (sourceTile) {
						            this.main.game.swapUnits(sourceTile, this.main.game.deployingUnit, tile, clickedPokemon);
						        } else {
						            // fallback: retirar la torre objetivo y colocar nueva
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
						        // la que arrastramos no estaba desplegada -> intentar passenger si la base lo permite
						        const base = clickedPokemon; // pokemon que hace de base en la tile
						        const hasPassenger = !!tile.passenger;

						        // helper: comprobar si la unidad arrastrada puede ir sobre esta tile (incluye reglas para grassyTerrain)
						        const canBePlacedHere = tile?.canPlacePokemonHere
						            ? tile.canPlacePokemonHere(this.main.game.deployingUnit)
						            : (
						                this.main.game.deployingUnit.tiles && this.main.game.deployingUnit.tiles.includes(tile.land) ||
						                (this.main.game.deployingUnit?.item?.id == 'airBalloon' && tile.land == 4) ||
						                (this.main.game.deployingUnit?.item?.id == 'heavyDutyBoots' && tile.land == 2) ||
						                (this.main.game.deployingUnit?.item?.id == 'assaultVest' && tile.land == 2) ||
						                (this.main.game.deployingUnit?.item?.id == 'dampMulch' && tile.land == 1) ||
						                (this.main.game.deployingUnit?.item?.id == 'mitsuesCocktail' && tile.land == 3) ||
						                (this.main.game.deployingUnit?.item?.id == 'subwoofer' && tile.land == 3 && [76, 86, 120].includes(this.main.game.deployingUnit.id))
						            );

						        // Si la base permite passenger (grassyTerrain)
						        if (base?.ability?.id === 'grassyTerrain' || base?.ability?.id === 'mount') {
						            if (!hasPassenger) {
						                // no hay pasajero -> moveUnitToTile colocará como passenger
						                this.main.game.moveUnitToTile(tile);
						            } else {
						                // ya hay pasajero: si la unidad arrastrada PUEDE ser passenger -> reemplazar pasajero
						                if (canBePlacedHere) {
						                    const oldPassenger = tile.passenger;
						                    // retirar el pasajero actual: retireUnit usa this.deployingUnit, así que lo ajustamos temporalmente
						                    this.main.game.deployingUnit = oldPassenger;
						                    this.main.game.retireUnit();

						                    // ahora colocar la unidad que arrastramos como passenger
						                    this.main.game.deployingUnit = pokemon; // pokemon es la variable del arrastre
						                    this.main.game.moveUnitToTile(tile);
						                } else {
						                    // no puede ser pasajero -> retirar base (lo que también limpia al pasajero) y colocar como base
						                    const tempDeploying = this.main.game.deployingUnit;
						                    this.main.game.deployingUnit = base;
						                    this.main.game.retireUnit(); // elimina base y pasajero
						                    this.main.game.deployingUnit = tempDeploying;
						                    this.main.game.moveUnitToTile(tile); // ahora la tile está libre, colocará la nueva unidad como base
						                }
						            }
						        } else {
						            // base no permite passenger -> comportamiento clásico: sustituir la base
						            const tempDeploying = this.main.game.deployingUnit;
						            this.main.game.deployingUnit = clickedPokemon;
						            this.main.game.retireUnit();
						            this.main.game.deployingUnit = tempDeploying;
						            this.main.game.moveUnitToTile(tile);
						        }
						    }
						}
	                }
	            }

	            // UI updates y limpieza
	            this.updatePokemon();
	            this.pokemon.forEach(s => s.classList.remove('drag-over'));
	            clearDragState();
	            this.pokemon.forEach(slot => {
	                const sprite = slot.querySelector('.ui-pokemon-sprite');
	                if (sprite) sprite.style.opacity = '1';
	            });

	            // asegurarse de limpiar mouse del juego y forzar redraw final
	            if (this.main?.game?.mouse) {
	                this.main.game.mouse.x = undefined;
	                this.main.game.mouse.y = undefined;
	            }
	            try { this.main.game.animate(performance.now()); } catch (err) {}

	            document.body.style.cursor = '';
	            return; // fin del flujo de drop en mapa
	        }

	        // A la caja
	        const domTarget = document.elementFromPoint(e.clientX, e.clientY);
			const droppedOnBox = domTarget && (
			    domTarget.closest('.box-scene') ||
			    domTarget.closest('.box-scene-unit-container') ||
			    domTarget.closest('.box-scene-unit')
			);

			if (droppedOnBox && draggedIndex != null) {
			    try {
			        if (slotElement) {
			            const originSprite = slotElement.querySelector('.ui-pokemon-sprite');
			            if (originSprite) originSprite.style.opacity = '1';
			            slotElement.classList?.remove('is-dragging', 'drag-over');
			        }
			    } catch (e) {
			       
			    }

			    const pokemon = this.main.team.pokemon[draggedIndex];
			    if (!pokemon) { clearDragState(); return; }

			    if (this.fastScene?.isOpen) this.fastScene.close();

			    if (pokemon.isDeployed) {
			        if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit();
			        this.main.game.deployingUnit = pokemon;
			        this.main.game.retireUnit();
			    } else {
			        playSound('unequip', 'ui');
			    }

			    this.main.box.addPokemon(pokemon);
			    this.main.team.removePokemon(pokemon);

			    if (this.main.area.checkWeather) this.main.area.checkWeather();
			    this.updatePokemon(); 

			    if (this.main.boxScene && this.main.boxScene.isOpen) this.main.boxScene.update();
			    if (this.main.UI) this.main.UI.update();

				try { if (!this.main.area.isCustom) saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager); } catch (err) {}

			    playSound('click1', 'ui');
			    clearDragState();
			    return;
			}

	        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
	        const targetSlot = targetElement?.closest('.ui-pokemon');

	        if (targetSlot && draggedIndex != null) {
	            const toIndex = parseInt(targetSlot.dataset.index);
	            if (toIndex !== draggedIndex && toIndex < this.main.player.teamSlots) {
	                const team = this.main.team.pokemon;

	                const firstBefore = team[0];

	                const temp = team[draggedIndex];
	                if (!team[toIndex]) {
	                    team[toIndex] = temp;
	                    team[draggedIndex] = undefined;
	                    this.main.team.pokemon = team.filter(p => p !== undefined);
	                } else {
	                    team[draggedIndex] = team[toIndex];
	                    team[toIndex] = temp;
	                }

	                this.updatePokemon();
	                playSound('click1', 'ui');

	                if (this.main.team.pokemon[0] !== firstBefore && this.main.team.refreshDittoADN?.('ui-party-reorder')) {
	                    playSound('teleport', 'effect');
	                    this.main.UI.updatePokemon();
	                    this.update();
	                }
	            }
	        }

	        this.pokemon.forEach(s => s.classList.remove('drag-over'));
	        clearDragState();

	        this.pokemon.forEach(slot => {
	            const sprite = slot.querySelector('.ui-pokemon-sprite');
	            if (sprite) sprite.style.opacity = '1';
	        });

	        if (!tile) {
	            // if (this.main.game.deployingUnit && !this.main.game.deployingUnit.isDeployed) {
	            //     this.main.game.deployingUnit = undefined;
	            // }
	            if (this.main.game.deployingUnit) {
			        this.main.game.deployingUnit = undefined;
			    }
	        }

	        if (this.main?.game?.mouse) {
	            this.main.game.mouse.x = undefined;
	            this.main.game.mouse.y = undefined;
	            try { this.main.game.animate(performance.now()); } catch (err) {}
	        }

	        document.body.style.cursor = '';
	    };

	    const startDragActual = (e, index, originatingSlot) => {
	        if (!this.main.team.pokemon[index] || index >= this.main.player.teamSlots) {
	            clearDragState();
	            return;
	        }

	        this.main.game.deployingUnit = this.main.team.pokemon[index];

	        if (this.fastScene.isOpen) this.fastScene.close();

	        draggedIndex = index;
	        slotElement = originatingSlot;
	        document.body.style.cursor = 'grabbing';

	        const spriteEl = this.pokemon[index].querySelector('.ui-pokemon-sprite');
	        clone = spriteEl ? spriteEl.cloneNode(true) : this.pokemon[index].cloneNode(true);

	        clone.style.position = 'absolute';
	        clone.style.zIndex = '10000';
	        clone.style.opacity = '0.9';
	        clone.style.pointerEvents = 'none'; // importante para elementFromPoint
	        clone.classList.add('dragging');
	        document.body.appendChild(clone);

	        spriteEl.style.opacity = '0%';
	        this.isDragging = true;

	        clone.style.width = `${spriteEl ? spriteEl.offsetWidth : this.pokemon[index].offsetWidth}px`;
	        clone.style.height = `${spriteEl ? spriteEl.offsetHeight : this.pokemon[index].offsetHeight}px`;

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
	        window.addEventListener('pointercancel', onPointerCancelDuringDrag);
	    };

	    const onPointerDownCandidate = function(e) {
	        if (!e.isPrimary) return;

	        if (e.target.closest('.ui-pokemon-button') || e.target.closest('.ui-pokemon-button-container') || e.target.closest('.fast-scene-container')) {
	            return;
	        }

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

	    this.pokemon.forEach((slot, index) => {
	        if (slot.dragSetup) return;
	        slot.dragSetup = true;

	        slot.dataset.index = index;

	        const sprite = slot.sprite;
	        if (!sprite) return;

	        sprite.addEventListener('pointerdown', (e) => onPointerDownCandidate.call(slot, e));
	        sprite.addEventListener('dragstart', (e) => e.preventDefault());

	        slot.addEventListener('dragstart', (e) => e.preventDefault());
	    });
	}
	
	displayEnemyInfo(enemy, pos) {
		const wavePreview = this.getCurrentWavePreviewList();
		if (pos >= this.mapWavePokemon.length || !enemy) {
			enemy = wavePreview[0];
			pos = 0;
		}
		if (!enemy) return;

		this.mapWavePokemon.forEach((pokemon, i) => {
			pokemon.style.filter = `brightness(0.8)`;
			if (pos === i) pokemon.style.filter = `brightness(1) drop-shadow(0 0 1px white)`;
		})

		const scaledEnemy = this.scalePreviewEnemy(enemy, this.main.area.waveNumber);

		if (this.main.area.isCustom) {
			gold = 0;
			hp += Math.floor(hp * (this.main.area.customData.health / 100));
			armor += Math.floor(armor * (this.main.area.customData.armor / 100));
		}

		this.infoName.innerHTML = enemy.name[this.main.lang].toUpperCase(); 
		this.infoHealth.innerHTML = `${text.ui.health[this.main.lang].toUpperCase()} <span class="pos-right">${this.formatPreviewStat(scaledEnemy.hp)}</span>`;
		this.infoArmor.innerHTML =`${text.ui.armor[this.main.lang].toUpperCase()} <span class="pos-right">${this.formatPreviewStat(scaledEnemy.armor || 0)}</span>`;
		this.infoSpeed.innerHTML =`${text.ui.speed[this.main.lang].toUpperCase()} <span class="pos-right">${this.formatPreviewStat(scaledEnemy.speed, 3)}</span>`;
		this.infoPower.innerHTML = `${text.ui.power[this.main.lang].toUpperCase()} <span class="pos-right">${this.formatPreviewStat(scaledEnemy.power)}</span>`;
		this.infoRegen.innerHTML = `${text.ui.regen[this.main.lang].toUpperCase()} <span class="pos-right">${this.formatPreviewStat(scaledEnemy.regeneration)}/s</span>`;
		this.infoStun.innerHTML = `${text.ui.stun[this.main.lang].toUpperCase()}`;
		this.infoSlow.innerHTML = `${text.ui.slow[this.main.lang].toUpperCase()}`;
		this.infoBurn.innerHTML = `${text.ui.burn[this.main.lang].toUpperCase()}`;
		this.infoPoison.innerHTML = `${text.ui.poison[this.main.lang].toUpperCase()}`;
		this.infoInvisible.innerHTML = `${text.ui.invisible[this.main.lang].toUpperCase()} <span class="pos-right">${(scaledEnemy.invisible) ? text.ui.yes[this.main.lang].toUpperCase() : text.ui.no[this.main.lang].toUpperCase()}</span>`;
		this.infoGold.innerHTML = `${text.ui.gold[this.main.lang].toUpperCase()} <span class="pos-right">$${this.formatPreviewStat(scaledEnemy.gold)}</span>`;

		if ([6,7,8].includes(this.main.lang)) {
			this.infoStatContainer.style.lineHeight = '10px'
		} else {
			this.infoStatContainer.style.lineHeight = 'revert-layer'
		}

		if (enemy.passive != undefined) {
			this.infoPassive.style.display = 'block';
			this.infoPassive.name.innerHTML = enemy.passive.name[this.main.lang].toUpperCase();
			this.infoPassive.description .innerHTML= enemy.passive.description[this.main.lang].toUpperCase();
		} else {
			this.infoPassive.style.display = 'none';
		}
		
		this.infoStun.innerHTML += (enemy.canStun) ? `<span class="pos-right">${text.ui.vulnerable[this.main.lang].toUpperCase()}</span>` : `<span class="pos-right">${text.ui.resistant[this.main.lang].toUpperCase()}</span>`
		this.infoSlow.innerHTML += (enemy.canSlow) ? `<span class="pos-right">${text.ui.vulnerable[this.main.lang].toUpperCase()}</span>` : `<span class="pos-right">${text.ui.resistant[this.main.lang].toUpperCase()}</span>`
		this.infoBurn.innerHTML += (enemy.canBurn) ? `<span class="pos-right">${text.ui.vulnerable[this.main.lang].toUpperCase()}</span>` : `<span class="pos-right">${text.ui.resistant[this.main.lang].toUpperCase()}</span>`
		this.infoPoison.innerHTML += (enemy.canPoison) ? `<span class="pos-right">${text.ui.vulnerable[this.main.lang].toUpperCase()}</span>` : `<span class="pos-right">${text.ui.resistant[this.main.lang].toUpperCase()}</span>`	

		this.enemyPositionDisplay = pos;
	}

	updateMap() {
		this.mapRecord.innerHTML = `<span class="msrre">⭐</span>${this.main.player.records[this.main.area.map.id]}`;

		const wavePreview = this.getCurrentWavePreviewList();
		const pokemonCount = this.getWavePreviewCounts(wavePreview);

		this.mapWavePokemonContainer.innerHTML = "";
		this.mapWavePokemon = [];
		wavePreview.forEach((pokemon, i) => {
			this.mapWavePokemon[i] = new Element(this.mapWavePokemonContainer, { className: 'ui-map-wave-pokemon', image: pokemon.sprite.base }).element;
			this.mapWavePokemon[i].addEventListener('click', () => { 
				playSound('click1', 'ui');
				this.displayEnemyInfo(pokemon, i);
			})
			this.mapWavePokemon[i].addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
			this.mapWavePokemon[i].count = new Element(this.mapWavePokemon[i], { className: 'stroke', text: `x${pokemonCount[i]}` }).element;
			this.mapWavePokemon[i].count.style.position = 'absolute';
			this.mapWavePokemon[i].count.style.color = 'var(--white)';
			this.mapWavePokemon[i].count.style.width = '100%';
			this.mapWavePokemon[i].count.style.textAlign = 'center';
			this.mapWavePokemon[i].count.style.fontSize = '8px';
			this.mapWavePokemon[i].count.style.bottom = '-5px';
		})

		this.autoWave.innerHTML = text.ui.autoWave[this.main.lang].toUpperCase();
		this.nextWave.innerText = text.ui.nextWave[this.main.lang].toUpperCase();
	
		this.autoWave.style.filter = `revert-layer`;
		this.autoWave.style.pointerEvents = `revert-layer`;
		this.speedWave.style.filter = `revert-layer`;
		this.speedWave.style.pointerEvents = `revert-layer`;	

		if (this.main.area.waveActive) {
			this.nextWave.style.filter = `brightness(0.8)`;
			this.nextWave.style.pointerEvents = 'none';
		} else {
			this.nextWave.style.filter = `revert-layer`;
			this.nextWave.style.pointerEvents = 'all';
		}

		this.damageDealtButton.innerHTML = text.ui[this.damageDealtType][this.main.lang].toUpperCase();

		if (this.main.area.map.isSecret || this.main.area.isCustom) {
			this.mapRecord.innerHTML = `<span class="msrre">⭐</span>???`;
			this.mapRoute.innerHTML = this.main.area.map.name[this.main.lang].toUpperCase()
		}
	}

	getWavePreviewCounts(wavePreview) {
		const waveNumber = this.main.area.waveNumber;
		const countsById = {};

		if (waveNumber <= 100) {
			const actualWave = this.main.area.waves[((waveNumber - 1) % 100) + 1]?.wave || [];
			actualWave.forEach(pokemon => {
				if (!pokemon) return;
				countsById[pokemon.id] = (countsById[pokemon.id] || 0) + 1;
			});
			return wavePreview.map(pokemon => countsById[pokemon.id] || 0);
		}

		if (waveNumber % 100 === 0) {
			const boss = this.main.area.getWavePreview(waveNumber);
			if (boss) countsById[boss.id] = Math.floor(waveNumber / 100);

			if (waveNumber >= 300 && typeof this.main.area.getEscortTypes === 'function') {
				const escortTypes = this.main.area.getEscortTypes(waveNumber, 3) || [];
				const escortCount = Math.min(100, Math.floor((waveNumber - 200) / 50) * 5);
				for (let i = 0; i < escortCount && escortTypes.length > 0; i++) {
					const escort = escortTypes[i % escortTypes.length];
					countsById[escort.id] = (countsById[escort.id] || 0) + 1;
				}
			}

			return wavePreview.map(pokemon => countsById[pokemon.id] || 0);
		}

		const wavesPast100 = waveNumber - 100;
		const linearCount = Math.floor(20 + wavesPast100 * 1.2);
		const asymptoticCount = Math.floor(200 + 600 * wavesPast100 / (wavesPast100 + 3000));
		const totalEnemyCount = Math.min(linearCount, asymptoticCount, 600);
		const hpValues = wavePreview.map(pokemon => pokemon.hp || 100);
		const inverseHp = hpValues.map(hp => 1 / hp);
		const totalInverse = inverseHp.reduce((sum, value) => sum + value, 0);
		const enemyCounts = inverseHp.map(inv => Math.max(1, Math.floor(totalEnemyCount * (inv / totalInverse))));

		wavePreview.forEach((pokemon, idx) => {
			countsById[pokemon.id] = (countsById[pokemon.id] || 0) + enemyCounts[idx];
		});

		return wavePreview.map(pokemon => countsById[pokemon.id] || 0);
	}

	countPokemon(grupo) {
	    const res = {};
	    const arrayCount = (arr) => {
	        arr.forEach(pokemon => {
	            if (pokemon !== null) {
	                const id = pokemon.id;
	                res[id] = (res[id] || 0) + 1;
	            }
	        });
	    };

	    arrayCount(grupo.preview);
	    arrayCount(grupo.wave);

	    return grupo.preview.map(pokemon => res[pokemon.id]);
	}

	updateDamageDealt() {
		this.main.team.pokemon.forEach((pokemon, i) => {
			const totalDamageDealt = (this.damageDealtType == 'trueDamage') ? this.main.area.totalTrueDamageDealt : this.main.area.totalDamageDealt
			const damageDealt = (this.damageDealtType == 'trueDamage') ? pokemon.trueDamageDealt : pokemon.damageDealt;
			if (damageDealt > 0) {
				const per = Math.ceil((damageDealt / totalDamageDealt) * 100)
				this.damageDealtUnit[i].number.innerHTML = `
					${this.main.utility.numberDot(damageDealt, this.main.lang)} 
					<span style="position: absolute; right: 0px; top: 2px; font-size: 8px; text-align: right">(${per}%)</span>
				`;
				this.damageDealtUnit[i].bar.style.width = `${per}%`;
			} else {
				this.damageDealtUnit[i].number.innerHTML = `0 <span style="position: absolute; right: 0px; top: 2px; font-size: 8px; text-align: right">(0%)</span>`;
				this.damageDealtUnit[i].bar.style.width = '0%';
			}
			if (pokemon.id == 19 || pokemon.id == 83 || pokemon.id == 101) {
				this.damageDealtUnit[i].number.innerHTML = `${text.ui.helping[this.main.lang]} <span style="position: absolute; right: 0px; top: 2px; font-size: 8px; text-align: right">:)</span>`;
			}
		});
	}

	refreshDamageDealt(force = false) {	
		for (let i = 0; i < 10; i++) {
			if (this.main.team.pokemon[i]) {
				this.main.team.pokemon[i].damageDealt = 0;
				this.main.team.pokemon[i].trueDamageDealt = 0;
			}
			this.damageDealtUnit[i].number.innerHTML = `0 <span style="position: absolute; right: 0px; top: 2px; font-size: 8px; text-align: right">(0%)</span>`;
			this.damageDealtUnit[i].barPrevious.style.width = (force) ? '0%' : this.damageDealtUnit[i].bar.style.width;
			this.damageDealtUnit[i].bar.style.width = '0%';
		}
	}

	damageDealtSwitch() {
		playSound('option', 'ui');
		this.damageDealtDisplay =! this.damageDealtDisplay;
		if (this.damageDealtDisplay) {
			this.damageDealtContainer.style.display = 'block';
			this.damageDealtButton.style.display = 'block';
		} else {
			this.damageDealtContainer.style.display = 'none';
			this.damageDealtButton.style.display = 'none';
		}
	}

	blockRightUI() {
		this.mapPanel.style.pointerEvents = 'none';
		this.mapPanel.style.filter = 'brightness(0.8)';
		this.nextWave.style.pointerEvents = 'none';
		this.mapWavePokemonContainer.style.pointerEvents = 'all';
	}

	blockLeftUI() {
		this.playerPanel.style.pointerEvents = 'none';
		this.playerPanel.style.filter = 'brightness(0.8)';
		this.playerPanel.querySelectorAll('*').forEach(el => el.style.pointerEvents = 'none');
	}

	blockAllUI() {
		this.blockRightUI();
		this.blockLeftUI();
	}

	blockMenuUI() {
		SECTIONS.forEach(section =>  {
			this.section[section].style.pointerEvents = 'none';
			this.section[section].img.style.backgroundSize = '17px';
			this.section[section].img.style.opacity = '0.8'
		})
	}

	revertUI() {
		this.mapPanel.style.pointerEvents = 'all';
		this.playerPanel.style.pointerEvents = 'all';
		this.mapPanel.style.filter = 'revert-layer';
		this.playerPanel.style.filter = 'revert-layer';
		this.nextWave.style.pointerEvents = 'all';

		SECTIONS.forEach(section =>  {
			this.section[section].style.pointerEvents = 'all';
			this.section[section].img.style.backgroundSize = 'revert-layer';
			this.section[section].img.style.opacity = 'revert-layer';
		})
	}

	getSecret(poke) {
		const pokemon = pokemonData[poke];
		const isShiny = Math.random() < (1 / 30);

		if (this.main.team.pokemon.length < this.main.player.teamSlots) {
			this.main.team.addPokemon(new Pokemon(pokemon, 1, null, this.main, undefined, false, null, undefined, isShiny));
			this.main.shopScene.displayPokemon.open(this.main.team.pokemon.at(-1), isShiny)
		} else {
			this.main.box.addPokemon(new Pokemon(pokemon, 1, null, this.main, undefined, false, null, undefined, isShiny));
			this.main.shopScene.displayPokemon.open(this.main.box.pokemon.at(-1), isShiny)
		}

		this.main.player.stats.pokemonOwned++;
		this.main.player.stats.totalPokemonLevel++;
		this.main.player.achievementProgress.evolutionCount++;
		
		if (this.main.player.achievementProgress.evolutionCount >= 210) this.main.player.unlockAchievement(1);

		if (!this.main.area.isCustom) saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
		this.main.UI.update();	
	}

	getSecretMap(mapId) {
		this.main.area.loadArea(mapId);
		this.main.UI.update();
		if (!this.main.area.isCustom) saveData(this.main.player, this.main.team, this.main.box, this.main.area, this.main.shop, this.main.teamManager);
		const previewEnemy = this.main.area.getWavePreview(this.main.area.waveNumber);
		if (previewEnemy) this.main.UI.displayEnemyInfo(previewEnemy, 0);
		this.main.area.checkWeather();
		playSound('step', 'ui');
	}

	importTeamButtonHandle(i) {
		if (this.main.isSectionOpen()) return playSound('pop0', 'ui');
		if (!this.main.area.inChallenge && this.main.teamManager.teams[i][this.main.area.routeNumber].length == 0) return
		if (this.main.area.inChallenge && this.main.teamManager.getChallengeTeam(i).length == 0) return
			
		const msg = new Element(this.main.scene, {
			className: 'team-saved-message',
			text: text.ui.loadTeam[this.main.lang].toUpperCase()
		}).element;

		msg.style.opacity = 0;
		setTimeout(() => {
			msg.style.opacity = 1;
		}, 0);

		setTimeout(() => {
			msg.style.opacity = 0;
			setTimeout(() => msg.remove(), 500);
		}, 1500);

		if (this.main.area.inChallenge) this.main.teamManager.importTeam(i, true); 
		else this.main.teamManager.importTeam(i); 
	}

	saveTeamButtonHandle(i) {
		const msg = new Element(this.main.scene, {
			className: 'team-saved-message',
			text: text.ui.savedTeam[this.main.lang].toUpperCase()
		}).element;

		msg.style.opacity = 0;
		setTimeout(() => {
			msg.style.opacity = 1;
		}, 0);

		setTimeout(() => {
			msg.style.opacity = 0;
			setTimeout(() => msg.remove(), 500);
		}, 1500);

		if (this.main.area.inChallenge) this.main.teamManager.saveTeam(i, true); 
		else this.main.teamManager.saveTeam(i); 
	}

	waveSelectorBlockHandle() {
		this.main.area.repeat = !this.main.area.repeat;
		playSound('option', 'ui');
		if (this.main.area.repeat) {
			this.waveSelectorBlock.style.background = '#70ac4c';
			this.waveSelectorBlock.style.boxShadow = 'inset 0 2px 0 #99c978, inset 0 -2px 0 #4d7a33';
		} else {
			this.waveSelectorBlock.style.background = 'revert-layer';
			this.waveSelectorBlock.style.boxShadow = 'revert-layer';
		}
	}

	changeMusic(dir) {
   	 	playSound('option', 'ui');

	    let currentIndex = songData.findIndex(s => s.id === this.main.area.music.id);
	    currentIndex += dir;

	    if (currentIndex < 0) currentIndex = songData.length - 1;
	    else if (currentIndex >= songData.length) currentIndex = 0;

	    this.main.area.music = songData[currentIndex];
	    this.musicName.innerHTML = `♪ ${this.main.area.music.name[this.main.lang].toUpperCase()}`;

	    playMusic(this.main.area.music.song);
	}

	changeDamageType() {
		this.damageDealtType = (this.damageDealtType == 'trueDamage') ? 'overdamage' : 'trueDamage';
		playSound('option', 'ui');
		this.damageDealtButton.innerHTML = text.ui[this.damageDealtType][this.main.lang].toUpperCase();
		this.updateDamageDealt();
	}
	
}

class FastScene {
	constructor(main, UI) {
		this.main = main;
		this.UI = UI;

		this.scene;
		this.position;

		this.isOpen = false;
		this.pokemonArray = [];
		this.itemArray = [];

		this.render(); 
	}

	render() {
		this.window = document.createElement('div');
		this.window.className = 'item-scene-window';

        this.container = new Element(this.window, { className: 'fast-scene-container' }).element;
        this.prompt = new Element(this.window, { className: 'fast-scene-prompt' }).element; 

        //ITEM
        this.itemSlot = [];

        //POKEMON
        this.pokemonSlot = [];
	}

	open(scene, position) {
		if (this.main.game.stopped) return playSound('pop0', 'ui');
		if (this.isOpen && this.position == position) return this.close();
		if (this.main.area.inChallenge.noItems && scene == 'item') {
			playSound('pop0', 'ui');
			return;
		}
		if (
			scene == 'pokemon' &&
			typeof this.main.area.inChallenge.slotLimit == 'number' &&
			position >= this.main.area.inChallenge.slotLimit
		) {
			playSound('pop0', 'ui');
			return;
		}

		playSound('open', 'ui');

		this.pokemonArray = [];
		this.itemArray = [];
		this.itemSlot = [];
		this.pokemonSlot = [];

		this.scene = scene;
		this.position = position;
		this.UI.pokemon[this.position].appendChild(this.container);
		this.isOpen = true;

		this.container.innerHTML = "";
		this.prompt.innerText = text.ui.empty[this.main.lang].toUpperCase();

		if (this.scene == 'pokemon') this.openPokemonScene()
		else this.openItemScene();
	}

	close() {
		if (this.isOpen) {
			this.isOpen = false;
			playSound('close', 'ui');
			if (this.main.tooltip) this.main.tooltip.hide();
			this.UI.pokemon[this.position].removeChild(this.container);
		}
	}

	openPokemonScene() {
		this.pokemonArray = this.main.box.pokemon;
		this.container.style.background = 'linear-gradient(30deg, rgba(70, 70, 70, 1) 0%, rgba(50, 50, 50, 1) 100%)';
		(this.pokemonArray.length > 0) ? this.prompt.style.display = 'none' : this.prompt.style.display = 'revert-layer';

		this.pokemonArray.forEach((pokemon, i) => {
			this.pokemonSlot[i] = new Element(this.container, { className: 'fast-scene-pokemon-slot' }).element;
			this.pokemonSlot[i].style.backgroundImage = `url("${pokemon.sprite.base}")`;

			this.pokemonSlot[i].addEventListener('click', () => {
				playSound('equip', 'ui');
				this.main.team.addPokemon(pokemon);
				this.main.box.removePokemon(pokemon);
				this.UI.update();
				this.close();
			})
		})
	}

	openItemScene() {
	  	const pokemon = this.main.team.pokemon[this.position];

	  	this.itemArray = this.main.itemController
	    	.getItems()
	    	.filter(item => this.main.itemController.canEquip(item, pokemon));

	  	this.container.style.background = `linear-gradient(30deg, ${pokemon.specie.color}2D 100%, ${pokemon.specie.color}5D 100%), #555`;

		this.container.addEventListener('wheel', (e) => {
		    e.preventDefault();

		    this.container.scrollBy({
		        top: e.deltaY * 0.8,
		        behavior: 'smooth'
		    });
		}, { passive: false });

	  	this.itemArray.forEach((item, i) => {
	    	const slot = new Element(this.container, {
	      		className: 'fast-scene-pokemon-item'
	    	}).element;

		    slot.equiped = new Element(slot, {
		      	className: 'item-scene-slot-equiped stroke'
		    }).element;

	    	slot.style.backgroundImage = `url("${item.sprite}")`;
	    	slot.equiped.innerHTML = this.main.itemController.isEquipped(item) ? 'E' : '';
	    	if (this.main.tooltip) this.main.tooltip.bindTo(slot, item, 'item');

	    	slot.addEventListener('click', () => {
		      	playSound('equip', 'ui');
		      	//this.main.tooltip.hide();
		      	this.main.itemController.equip(item, pokemon);
		      	this.UI.update();
		      	this.close();
		      	if (item.id === 'quickClaw' && pokemon.attackType !== 'area') {
		      		pokemon.changeTargetMode(TARGET_MODES[6]);
		      		this.UI.updatePokemon();
                } else if (item.id === 'spindaCocktail') {
                    pokemon.changeTargetMode(TARGET_MODES[19]);
                    this.UI.updatePokemon();
                } else if (item.id === 'silphScope') {
                    pokemon.changeTargetMode(TARGET_MODES[20]);
                    this.UI.updatePokemon();
                }
	    	});
	  	});

	  	// Remove-item shortcut at end of list.
	  	const removeSlot = new Element(this.container, {
	  		className: 'fast-scene-pokemon-item'
	  	}).element;
	  	removeSlot.textContent = '✕';
	  	removeSlot.style.display = 'flex';
	  	removeSlot.style.alignItems = 'center';
	  	removeSlot.style.justifyContent = 'center';
	  	removeSlot.style.fontWeight = 'bold';
	  	removeSlot.style.fontSize = '14px';
	  	removeSlot.style.color = '#f4f4f4';
	  	removeSlot.style.textShadow = '1px 1px black'

	  	const deployedLockedItems = [
	  		'silphScope', 'airBalloon', 'heavyDutyBoots', 'dampMulch', 'assaultVest',
	  		'twistedSpoon', 'subwoofer', 'ejectButton', 'jadeOrb', 'lustrousOrb',
	  		'dampRock', 'smoothRock', 'icyRock', 'heatRockWeather', 'mitsuesCocktail', 'charizarditeY'
	  	];

	  	const cannotRemoveNow = !pokemon?.item || (pokemon.isDeployed && deployedLockedItems.includes(pokemon?.item?.id));
	  	if (cannotRemoveNow) {
	  		removeSlot.style.filter = 'brightness(0.6)';
	  		removeSlot.style.pointerEvents = 'none';
	  		removeSlot.style.cursor = 'not-allowed';
	  	} else {
	  		removeSlot.style.cursor = 'pointer';
	  		removeSlot.addEventListener('mouseenter', () => { playSound('hover3', 'ui') });
	  		removeSlot.addEventListener('mouseenter', () => {
	  			this.main.tooltip.showItem({ name: text.pokemon.removeItem, description: text.pokemon.removeItemDescription });
	  		});
	  		removeSlot.addEventListener('mouseleave', () => { this.main.tooltip.hide(); });
	  		removeSlot.addEventListener('click', () => {
	  			playSound('unequip', 'ui');
	  			this.main.tooltip.hide();
	  			pokemon.retireItem();
	  			this.UI.update();
	  			this.close();
	  		});
	  	}
	}
}
