import { GameScene } from '../../utils/GameScene.js';
import { SectionScene } from '../../utils/SectionScene.js';

import { Element } from '../../utils/Element.js';
import { Input } from '../../utils/Input.js';
import { text } from '../../file/text.js';
import { playSound } from '../../file/audio.js';

import { pokemonData, eggListData } from '../data/pokemonData.js';
import { itemData } from '../data/itemData.js';
import { routeData } from '../data/routeData.js';
import { achievementData } from '../data/achievementData.js';


const CHALLENGE_REWARD_RIBBON_COSTS = [2, 3, 5, 1];
const SECRET_POKEMON_KEYS = ['greavard', 'cacnea', 'ducklett', 'sandygast', 'luvdisc', 'chatot', 'shedinja', 'gholdengo', 'stakataka', 'missingNo'];

const PROFILE_STAT_FALLBACK_TEXT = {
	19: [
		'Max Gold/Wave',
		'Oro máx./Oleada',
		'Or max./Vague',
		'Ouro máx./Onda',
		'Oro max./Ondata',
		'Max. Gold/Welle',
		'最大ゴールド／ウェーブ',
		'최대 골드/웨이브',
		'最大金币/波次',
		'Maks. złota/fala',
	],
	20: [
		'Max Gold/Time',
		'Oro máx./Tiempo',
		'Or max./Temps',
		'Ouro máx./Tempo',
		'Oro max./Tempo',
		'Max. Gold/Zeit',
		'最大ゴールド／時間',
		'최대 골드/시간',
		'最大金币/时间',
		'Maks. złota/czas',
	],
	21: [
		'Shiny Enemies Defeated',
		'Enemigos shiny derrotados',
		'Ennemis shiny vaincus',
		'Inimigos shiny derrotados',
		'Nemici shiny sconfitti',
		'Besiegte Shiny-Feinde',
		'撃破した色違い敵',
		'처치한 색이 다른 적',
		'击败的闪光敌人',
		'Pokonani wrogowie shiny',
	],
};

const PROFILE_UNLOCKABLE_TEXT = {
	statsTab: ['Stats', 'Estadísticas', 'Statistiques', 'Estatísticas', 'Statistiche', 'Statistiken', '統計', '통계', '统计', 'Statystyki'],
	unlockablesTab: ['Unlockables', 'Desbloqueables', 'Déblocables', 'Desbloqueáveis', 'Sbloccabili', 'Freischaltbares', 'アンロック要素', '잠금 해제', '可解锁内容', 'Odblokowania'],
	locked: ['Locked', 'Bloqueado', 'Verrouillé', 'Bloqueado', 'Bloccato', 'Gesperrt', 'ロック中', '잠김', '已锁定', 'Zablokowane'],
	unlocked: ['Unlocked', 'Desbloqueado', 'Débloqué', 'Desbloqueado', 'Sbloccato', 'Freigeschaltet', 'アンロック済み', '잠금 해제됨', '已解锁', 'Odblokowane'],
	hiddenName: ['???', '???', '???', '???', '???', '???', '???', '???', '???', '???'],
	secretMap: ['Secret Map', 'Mapa secreto', 'Carte secrète', 'Mapa secreto', 'Mappa segreta', 'Geheime Karte', '秘密のマップ', '비밀 맵', '秘密地图', 'Sekretna mapa'],
	challengeRibbon: ['Challenge Ribbon', 'Listón de desafío', 'Ruban défi', 'Fita de desafio', 'Nastro sfida', 'Challenge-Band', 'チャレンジリボン', '챌린지 리본', '挑战缎带', 'Wstążka wyzwania'],
	challengeRibbons: ['Challenge Ribbons', 'Listones de desafío', 'Rubans défi', 'Fitas de desafio', 'Nastri sfida', 'Challenge-Bänder', 'チャレンジリボン', '챌린지 리본', '挑战缎带', 'Wstążki wyzwania'],
	challengeRequirement: ['Earn {count} {ribbons} on {route}', 'Consigue {count} {ribbons} en {route}', 'Obtenez {count} {ribbons} sur {route}', 'Ganhe {count} {ribbons} em {route}', 'Ottieni {count} {ribbons} su {route}', 'Erhalte {count} {ribbons} auf {route}', '{route}で{count}個の{ribbons}を獲得', '{route}에서 {ribbons} {count}개 획득', '在{route}获得{count}个{ribbons}', 'Zdobądź {count} {ribbons} na {route}'],
	findHiddenSecretOnRouteOutsideChallenge: ['Find the hidden secret on {route} outside Challenge', 'Encuentra el secreto oculto en {route} fuera de Desafío', 'Trouvez le secret caché sur {route} hors Défi', 'Encontre o segredo oculto em {route} fora do Desafio', 'Trova il segreto nascosto su {route} fuori dalla Sfida', 'Finde das versteckte Geheimnis auf {route} außerhalb der Herausforderung', 'チャレンジ外で{route}の隠しシークレットを見つける', '챌린지 외부에서 {route}의 숨겨진 비밀 찾기', '在挑战外于{route}找到隐藏秘密', 'Znajdź ukryty sekret na {route} poza wyzwaniem'],
	clickHiddenProfileSecretOutsideChallenge: ['Click the hidden Profile achievement secret outside Challenge', 'Haz clic en el secreto oculto de logro del perfil fuera de Desafío', 'Cliquez sur le secret caché de succès du profil hors Défi', 'Clique no segredo oculto de conquista do perfil fora do Desafio', 'Clicca sul segreto nascosto del profilo fuori dalla Sfida', 'Klicke auf das versteckte Profil-Erfolgsgeheimnis außerhalb der Herausforderung', 'チャレンジ外でプロフィール実績の隠しシークレットをクリック', '챌린지 외부에서 프로필 업적 숨김 비밀 클릭', '在挑战外点击个人资料成就隐藏秘密', 'Kliknij ukryty sekret osiągnięcia profilu poza wyzwaniem'],
	setAudioCodeOutsideChallenge: ['Set audio to Master 0, Music 4, UI 4, Effects 1 outside Challenge', 'Configura audio en Maestro 0, Música 4, UI 4, Efectos 1 fuera de Desafío', 'Réglez l’audio sur Principal 0, Musique 4, UI 4, Effets 1 hors Défi', 'Defina áudio para Master 0, Música 4, UI 4, Efeitos 1 fora do Desafio', 'Imposta audio su Master 0, Musica 4, UI 4, Effetti 1 fuori dalla Sfida', 'Stelle Audio auf Master 0, Musik 4, UI 4, Effekte 1 außerhalb der Herausforderung', 'チャレンジ外で音声を Master 0, Music 4, UI 4, Effects 1 に設定', '챌린지 외부에서 오디오를 Master 0, Music 4, UI 4, Effects 1로 설정', '在挑战外将音频设为 Master 0、Music 4、UI 4、Effects 1', 'Ustaw audio na Master 0, Music 4, UI 4, Effects 1 poza wyzwaniem'],
	evolveNincada: ['Evolve Nincada', 'Evoluciona a Nincada', 'Faites évoluer Nincada', 'Evolua Nincada', 'Fai evolvere Nincada', 'Entwickle Nincada', 'ツチニンを進化させる', '톱치니를 진화시켜라', '让土居忍士进化', 'Ewoluuj Nincadę'],
	buyGimmighoulFromShop: ['Buy Gimmighoul from the Shop', 'Compra a Gimmighoul en la tienda', 'Achetez Gimmighoul dans la boutique', 'Compre Gimmighoul na loja', 'Compra Gimmighoul dal negozio', 'Kaufe Gimmighoul im Shop', 'ショップでコレクレーを購入', '상점에서 꼬마동을 구매', '在商店购买索财灵', 'Kup Gimmighoula w sklepie'],
	type5675OnRouteOutsideChallenge: ['On {route}, type 5675 outside Challenge', 'En {route}, escribe 5675 fuera de Desafío', 'Sur {route}, tapez 5675 hors Défi', 'Em {route}, digite 5675 fora do Desafio', 'Su {route}, digita 5675 fuori dalla Sfida', 'Auf {route}, tippe 5675 außerhalb der Herausforderung', '{route}でチャレンジ外に5675を入力', '{route}에서 챌린지 외부에 5675 입력', '在{route}挑战外输入5675', 'Na {route} wpisz 5675 poza wyzwaniem'],
	findHiddenCaveOnRouteWhileNoWave: ['Find the hidden cave on {route} while no wave is active', 'Encuentra la cueva oculta en {route} cuando no haya oleada activa', 'Trouvez la grotte cachée sur {route} quand aucune vague n’est active', 'Encontre a caverna oculta em {route} quando nenhuma onda estiver ativa', 'Trova la grotta nascosta su {route} quando nessuna ondata è attiva', 'Finde die versteckte Höhle auf {route}, wenn keine Welle aktiv ist', 'ウェーブがない時に{route}の隠し洞窟を見つける', '웨이브가 없을 때 {route}의 숨겨진 동굴 찾기', '在无波次进行时于{route}找到隐藏洞穴', 'Znajdź ukrytą jaskinię na {route}, gdy żadna fala nie jest aktywna'],
	redeemSecretCodeFromMenu: ['Redeem a secret code from the Menu', 'Canjea un código secreto desde el menú', 'Utilisez un code secret depuis le menu', 'Resgate um código secreto no menu', 'Riscatta un codice segreto dal menu', 'Löse einen geheimen Code im Menü ein', 'メニューでシークレットコードを入力', '메뉴에서 비밀 코드를 입력', '在菜单中兑换秘密代码', 'Wpisz tajny kod w menu'],
};

function localized(arr, lang = 0) {
	if (!Array.isArray(arr)) return arr ?? '';
	return arr[lang] ?? arr[0] ?? '';
}

function clampLang(lang = 0) {
	return Number.isInteger(lang) ? Math.max(0, Math.min(9, lang)) : 0;
}

function getProfileUnlockableText(key, lang = 0, fallback = '') {
	const idx = clampLang(lang);
	const value = text?.profile?.unlockables?.[key] ?? PROFILE_UNLOCKABLE_TEXT[key];
	if (Array.isArray(value)) return value[idx] ?? value[0] ?? fallback;
	return fallback;
}

function formatTemplate(template, replacements = {}) {
	let result = template ?? '';
	Object.entries(replacements).forEach(([k, v]) => {
		result = result.replaceAll(`{${k}}`, String(v ?? ''));
	});
	return result;
}

function getProfileStatLabel(index, lang = 0) {
	const idx = clampLang(lang);
	const localizedLabel = text?.profile?.stats?.[index];
	if (Array.isArray(localizedLabel)) return localizedLabel[idx] ?? localizedLabel[0] ?? '';
	const fallbackLabel = PROFILE_STAT_FALLBACK_TEXT[index];
	if (Array.isArray(fallbackLabel)) return fallbackLabel[idx] ?? fallbackLabel[0] ?? '';
	return '';
}

export class ProfileScene extends SectionScene {
	constructor(main) {
		super();
		this.main = main;
		this.activeSubview = 'stats';
		this.unlockableEntries = [];
		this.unlockableRows = [];
		this.render();

		this.deleteRecord = new DeleteRecord(this.main);
	}

	render() {
		this.ensureUnlockablesStyle();

		this.playerContainer = new Element(this.container, { className: 'profile-player-container' }).element;

		this.portrait = new Element(this.playerContainer, { className: 'profile-scene-portrait' }).element;

		this.avatarPrev = new Element(this.playerContainer, { className: 'profile-scene-avatar-arrow-prev', text: '<' }).element;
		this.avatarNext = new Element(this.playerContainer, { className: 'profile-scene-avatar-arrow-next', text: '>' }).element;
		this.avatarPrev.addEventListener('click', () => { this.changePortrait(-1) });
		this.avatarNext.addEventListener('click', () => { this.changePortrait(1) });
		this.avatarPrev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.avatarNext.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });

		this.name = new Input(
			this.playerContainer,
			'text',
			{
				className: 'profile-scene-name',
				maxlength: 11,
				cb: () => { this.changeName() }
			}
		);

		this.achievementsContainer = new Element(this.container, { className: 'profile-scene-achievements-container' }).element;
		this.achievement = [];
		for (let i = 0; i < 32; i++) {
			this.achievement[i] = new Element(this.achievementsContainer, { className: 'profile-scene-achievement' }).element;
		}

		this.subviewTabs = new Element(this.container, { className: 'profile-subview-tabs' }).element;
		this.statsButton = new Element(this.subviewTabs, { className: 'profile-subview-button' }).element;
		this.unlockablesButton = new Element(this.subviewTabs, { className: 'profile-subview-button' }).element;
		this.unlockablesCount = new Element(this.subviewTabs, { className: 'profile-unlockables-count' }).element;

		this.statsButton.addEventListener('click', () => this.setActiveSubview('stats'));
		this.unlockablesButton.addEventListener('click', () => this.setActiveSubview('unlockables'));
		this.statsButton.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.unlockablesButton.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });

		this.statsContainer = new Element(this.container, { className: 'profile-stats-container' }).element;
		this.stats = [];
		for (let i = 0; i < 22; i++) {
			this.stats[i] = new Element(this.statsContainer, { className: 'profile-stat' }).element;
		 	this.stats[i].label = new Element(this.stats[i], { className: 'profile-stat-label' }).element;
		 	this.stats[i].value = new Element(this.stats[i], { className: 'profile-stat-value' }).element;
		}
		this.statsContainer.insertBefore(this.stats[21], this.stats[11]);
		this.statsContainer.style.top = '168px';

		this.unlockablesContainer = new Element(this.container, { className: 'profile-unlockables-container' }).element;
		this.unlockablesHeader = new Element(this.unlockablesContainer, { className: 'profile-unlockables-header' }).element;
		this.unlockablesHeaderTitle = new Element(this.unlockablesHeader, { className: 'profile-unlockables-header-title' }).element;
		this.unlockablesHeaderCount = new Element(this.unlockablesHeader, { className: 'profile-unlockables-header-count' }).element;
		this.unlockablesList = new Element(this.unlockablesContainer, { className: 'profile-unlockables-list' }).element;

		this.buildUnlockablesList();
		this.setActiveSubview(this.activeSubview, true);

		this.stats[19].value.addEventListener('click', () => { this.deleteRecord.open(19) });
		this.stats[20].value.addEventListener('click', () => { this.deleteRecord.open(20) });

		this.achievement[12].addEventListener('click', () => {
			if (
				!this.main.player.secrets.luvdisc &&
				!this.main.area.inChallenge
			) {
				this.main.player.secrets.luvdisc = true;
				this.main.UI.getSecret('luvdisc');
			}
		});

		this.achievement[19].addEventListener('click', () => {
			if (
				!this.main.player.secrets.luvdisc &&
				!this.main.area.inChallenge
			) {
				this.main.player.secrets.luvdisc = true;
				this.main.UI.getSecret('luvdisc');
			}
		});
	}

	ensureUnlockablesStyle() {
		if (document.getElementById('profileUnlockablesStyle')) return;

		const style = document.createElement('style');
		style.id = 'profileUnlockablesStyle';
		style.textContent = `
			.profile-subview-tabs {
				position: absolute;
				top: 140px;
				left: 20px;
				right: 20px;
				height: 22px;
				display: flex;
				align-items: center;
				gap: 6px;
			}

			.profile-subview-button {
				min-width: 110px;
				height: 22px;
				padding: 1px 10px 0;
				display: flex;
				align-items: center;
				justify-content: center;
				background: #3a3a3d;
				border: 1px solid #000;
				box-shadow: 1px 1px 0 #222;
				color: var(--white);
				font-size: 10px;
				font-weight: bold;
				text-transform: uppercase;
				text-shadow: 1px 1px 0 #000;
				cursor: pointer;
				user-select: none;
			}

			.profile-subview-button.is-active {
				background: #7d2026;
				color: #fff3d1;
			}

			.profile-unlockables-count {
				margin-left: auto;
				padding-top: 2px;
				color: #bdbdbd;
				font-size: 10px;
				text-transform: uppercase;
				text-shadow: 1px 1px 0 #000;
			}

			.profile-unlockables-container {
				position: absolute;
				bottom: 15px;
				left: 20px;
				right: 20px;
				top: 168px;
				display: none;
				flex-direction: column;
				overflow: hidden;
				background-color: #2a2a2b;
				border: 1px solid #000;
				box-shadow: 2px 2px 0px #222;
			}

			.profile-unlockables-header {
				display: flex;
				justify-content: space-between;
				align-items: center;
				min-height: 22px;
				padding: 4px 10px 2px;
				background: #343437;
				border-bottom: 1px solid rgba(0,0,0,0.45);
			}

			.profile-unlockables-header-title,
			.profile-unlockables-header-count {
				font-size: 10px;
				text-transform: uppercase;
				text-shadow: 1px 1px 0 #000;
			}

			.profile-unlockables-header-title {
				color: #d8d8d8;
			}

			.profile-unlockables-header-count {
				color: #c9ae73;
			}

			.profile-unlockables-list {
				flex: 1;
				overflow-y: auto;
				padding: 4px;
			}

			.profile-unlockable-row {
				display: flex;
				align-items: center;
				gap: 8px;
				min-height: 46px;
				padding: 4px 8px;
				margin-bottom: 2px;
				background: #3b3b3e;
				border-bottom: 1px solid rgba(0,0,0,0.3);
			}

			.profile-unlockable-row:nth-child(even) {
				background: #333336;
			}

			.profile-unlockable-icon {
				width: 34px;
				height: 34px;
				flex: 0 0 34px;
				background-position: center;
				background-size: contain;
				background-repeat: no-repeat;
				filter: drop-shadow(1px 1px 0 #000);
			}

			.profile-unlockable-info {
				flex: 1;
				min-width: 0;
				display: flex;
				flex-direction: column;
				gap: 2px;
			}

			.profile-unlockable-title-row {
				display: flex;
				align-items: center;
				gap: 6px;
			}

			.profile-unlockable-name {
				font-size: 10px;
				font-weight: bold;
				text-transform: uppercase;
				text-shadow: 1px 1px 0 #000;
				color: var(--white);
				white-space: nowrap;
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.profile-unlockable-state {
				font-size: 10px;
				font-weight: bold;
				text-transform: uppercase;
				text-shadow: 1px 1px 0 #000;
			}

			.profile-unlockable-state.is-unlocked {
				color: var(--green);
			}

			.profile-unlockable-state.is-locked {
				color: #b5b5b5;
			}

			.profile-unlockable-condition {
				font-size: 9px;
				line-height: 1.2;
				text-transform: uppercase;
				text-shadow: 1px 1px 0 #000;
				color: #c9c9c9;
				word-break: break-word;
			}
		`;
		document.head.appendChild(style);
	}

	setActiveSubview(subview, force = false) {
		if (!force && this.activeSubview === subview) return;
		this.activeSubview = subview;

		const statsActive = this.activeSubview === 'stats';
		if (this.statsContainer) this.statsContainer.style.display = statsActive ? 'flex' : 'none';
		if (this.unlockablesContainer) this.unlockablesContainer.style.display = statsActive ? 'none' : 'flex';
		if (this.statsButton) this.statsButton.classList.toggle('is-active', statsActive);
		if (this.unlockablesButton) this.unlockablesButton.classList.toggle('is-active', !statsActive);
	}

	getPokemonKey(pokemon) {
		if (!pokemon) return null;
		return pokemon?.specie?.key ?? pokemon?.specieKey ?? pokemon?.key ?? null;
	}

	getObtainablePokemonKeys() {
		const obtainable = new Set();

		if (Array.isArray(eggListData)) {
			eggListData.forEach((key) => {
				if (pokemonData?.[key]) obtainable.add(key);
			});
		}

		Object.values(routeData || {}).forEach((route) => {
			if (!Array.isArray(route?.challengeReward)) return;
			const pokemonRewardKey = route.challengeReward[1];
			if (pokemonRewardKey && pokemonData?.[pokemonRewardKey]) obtainable.add(pokemonRewardKey);
		});

		SECRET_POKEMON_KEYS.forEach((key) => {
			if (pokemonData?.[key]) obtainable.add(key);
		});

		return obtainable;
	}

	countUniqueSpecies() {
		const owned = new Set();
		const obtainable = this.getObtainablePokemonKeys();
		this.getPlayerPokemon().forEach((pokemon) => {
			const key = this.getPokemonKey(pokemon);
			if (key && obtainable.has(key)) owned.add(key);
		});
		return owned.size;
	}

	countTotalSpecies() {
		return this.getObtainablePokemonKeys().size;
	}

	countUniqueShinySpecies() {
		const shinies = new Set();
		const obtainable = this.getObtainablePokemonKeys();
		this.getPlayerPokemon().forEach((pokemon) => {
			const key = this.getPokemonKey(pokemon);
			if (pokemon?.isShiny && key && obtainable.has(key)) shinies.add(key);
		});
		return shinies.size;
	}

	getPlayerPokemon() {
		return [
			...(this.main.team?.pokemon || []),
			...(this.main.box?.pokemon || []),
		];
	}

	hasPokemonKey(key) {
		if (!key) return false;
		return this.getPlayerPokemon().some((pokemon) => this.getPokemonKey(pokemon) === key);
	}

	getRouteName(routeId) {
		const lang = clampLang(this.main.lang);
		return routeData?.[routeId]?.name?.[lang] ?? routeData?.[routeId]?.name?.[0] ?? `Route ${routeId}`;
	}

	formatRibbonRequirement(count, routeName) {
		const lang = clampLang(this.main.lang);
		const noun = count === 1
			? getProfileUnlockableText('challengeRibbon', lang, 'Challenge Ribbon')
			: getProfileUnlockableText('challengeRibbons', lang, 'Challenge Ribbons');
		const template = getProfileUnlockableText('challengeRequirement', lang, 'Earn {count} {ribbons} on {route}');
		return formatTemplate(template, { count, ribbons: noun.toLowerCase(), route: routeName });
	}

	getUnlockableEntries() {
		const entries = [];
		const routes = Object.values(routeData)
			.filter(route => Array.isArray(route?.challengeReward) && route.challengeReward.length > 0)
			.sort((a, b) => a.order - b.order);

		routes.forEach((route) => {
			const rewardEntries = route.challengeReward.map((rewardId, rewardIndex) => {
				const isPokemonReward = rewardIndex === 1;
				const rewardData = isPokemonReward ? pokemonData?.[rewardId] : itemData?.[rewardId];
				if (!rewardData) return null;

				return {
					id: `route-${route.id}-reward-${rewardIndex}`,
					order: route.order * 10 + CHALLENGE_REWARD_RIBBON_COSTS[rewardIndex],
					name: localized(rewardData.name, clampLang(this.main.lang)),
					lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
					unlockText: this.formatRibbonRequirement(CHALLENGE_REWARD_RIBBON_COSTS[rewardIndex], this.getRouteName(route.id)),
					icon: isPokemonReward ? rewardData?.sprite?.base : rewardData?.sprite,
					secretLevel: 'normal',
					isUnlocked: () => !!this.main.player?.rewards?.[rewardIndex]?.[route.id],
				};
			}).filter(Boolean);

			rewardEntries.sort((a, b) => a.order - b.order);
			entries.push(...rewardEntries);
		});

		const secretRoute11 = this.getRouteName(11);
		const secretRoute13 = this.getRouteName(13);
		const secretRoute16 = this.getRouteName(16);
		const secretRoute8 = this.getRouteName(8);
		const secretRoute4 = this.getRouteName(4);
		const secretRoute2 = this.getRouteName(2);

		entries.push(
			{
				id: 'secret-greavard',
				order: 10000,
				name: localized(pokemonData.greavard?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenSecretOnRouteOutsideChallenge', clampLang(this.main.lang), 'Find the hidden secret on {route} outside Challenge'), { route: secretRoute2 }),
				icon: pokemonData.greavard?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.greavard || this.hasPokemonKey('greavard'),
			},
			{
				id: 'secret-cacnea',
				order: 10010,
				name: localized(pokemonData.cacnea?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenSecretOnRouteOutsideChallenge', clampLang(this.main.lang), 'Find the hidden secret on {route} outside Challenge'), { route: secretRoute4 }),
				icon: pokemonData.cacnea?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.cacnea || this.hasPokemonKey('cacnea'),
			},
			{
				id: 'secret-ducklett',
				order: 10020,
				name: localized(pokemonData.ducklett?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenSecretOnRouteOutsideChallenge', clampLang(this.main.lang), 'Find the hidden secret on {route} outside Challenge'), { route: secretRoute13 }),
				icon: pokemonData.ducklett?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.ducklett || this.hasPokemonKey('ducklett'),
			},
			{
				id: 'secret-sandygast',
				order: 10030,
				name: localized(pokemonData.sandygast?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenSecretOnRouteOutsideChallenge', clampLang(this.main.lang), 'Find the hidden secret on {route} outside Challenge'), { route: secretRoute16 }),
				icon: pokemonData.sandygast?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.sandygast || this.hasPokemonKey('sandygast'),
			},
			{
				id: 'secret-luvdisc',
				order: 10100,
				name: localized(pokemonData.luvdisc?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: getProfileUnlockableText('clickHiddenProfileSecretOutsideChallenge', clampLang(this.main.lang), 'Click the hidden Profile achievement secret outside Challenge'),
				icon: pokemonData.luvdisc?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.luvdisc || this.hasPokemonKey('luvdisc'),
			},
			{
				id: 'secret-chatot',
				order: 10110,
				name: localized(pokemonData.chatot?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: getProfileUnlockableText('setAudioCodeOutsideChallenge', clampLang(this.main.lang), 'Set audio to Master 0, Music 4, UI 4, Effects 1 outside Challenge'),
				icon: pokemonData.chatot?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.chatot || this.hasPokemonKey('chatot'),
			},
			{
				id: 'secret-shedinja',
				order: 10120,
				name: localized(pokemonData.shedinja?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: getProfileUnlockableText('evolveNincada', clampLang(this.main.lang), 'Evolve Nincada'),
				icon: pokemonData.shedinja?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => this.hasPokemonKey('shedinja'),
			},
			{
				id: 'secret-gholdengo',
				order: 10130,
				name: localized(pokemonData.gholdengo?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: getProfileUnlockableText('buyGimmighoulFromShop', clampLang(this.main.lang), 'Buy Gimmighoul from the Shop'),
				icon: pokemonData.gholdengo?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => this.hasPokemonKey('gholdengo'),
			},
			{
				id: 'secret-stakataka',
				order: 10135,
				name: localized(pokemonData.stakataka?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: formatTemplate(getProfileUnlockableText('type5675OnRouteOutsideChallenge', clampLang(this.main.lang), 'On {route}, type 5675 outside Challenge'), { route: secretRoute8 }),
				icon: pokemonData.stakataka?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.stakataka || this.hasPokemonKey('stakataka'),
			},
			{
				id: 'secret-manaphy-cave',
				order: 10140,
				name: routeData?.[20]?.name?.[clampLang(this.main.lang)] ?? getProfileUnlockableText('secretMap', clampLang(this.main.lang), 'Secret Map'),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenCaveOnRouteWhileNoWave', clampLang(this.main.lang), 'Find the hidden cave on {route} while no wave is active'), { route: secretRoute11 }),
				icon: './src/assets/images/maps/manaphy.png',
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secretMaps?.manaphyCave,
			},
			{
				id: 'secret-missingno',
				order: 10150,
				name: localized(pokemonData.missingNo?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: getProfileUnlockableText('redeemSecretCodeFromMenu', clampLang(this.main.lang), 'Redeem a secret code from the Menu'),
				icon: pokemonData.missingNo?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => this.hasPokemonKey('missingNo'),
			}
		);

		return entries.sort((a, b) => a.order - b.order);
	}

	buildUnlockablesList() {
		this.unlockableEntries = this.getUnlockableEntries();
		this.unlockableRows = [];
		this.unlockablesList.innerHTML = '';

		this.unlockableEntries.forEach((entry) => {
			const row = new Element(this.unlockablesList, { className: 'profile-unlockable-row' }).element;
			row.icon = new Element(row, { className: 'profile-unlockable-icon' }).element;
			row.info = new Element(row, { className: 'profile-unlockable-info' }).element;
			row.titleRow = new Element(row.info, { className: 'profile-unlockable-title-row' }).element;
			row.name = new Element(row.titleRow, { className: 'profile-unlockable-name' }).element;
			row.state = new Element(row.titleRow, { className: 'profile-unlockable-state' }).element;
			row.condition = new Element(row.info, { className: 'profile-unlockable-condition' }).element;
			this.unlockableRows.push({ entry, row });
		});
	}

	refreshUnlockablesList() {
		const lang = clampLang(this.main.lang);
		this.unlockableEntries = this.getUnlockableEntries();
		const unlockedCount = this.unlockableEntries.filter((entry) => entry.isUnlocked()).length;
		const totalCount = this.unlockableEntries.length;

		if (this.statsButton) this.statsButton.innerText = getProfileUnlockableText('statsTab', lang, 'Stats').toUpperCase();
		if (this.unlockablesButton) this.unlockablesButton.innerText = getProfileUnlockableText('unlockablesTab', lang, 'Unlockables').toUpperCase();
		if (this.unlockablesCount) this.unlockablesCount.innerText = `${unlockedCount}/${totalCount} ${getProfileUnlockableText('unlockablesTab', lang, 'Unlockables').toUpperCase()}`;
		if (this.unlockablesHeaderTitle) this.unlockablesHeaderTitle.innerText = getProfileUnlockableText('unlockablesTab', lang, 'Unlockables').toUpperCase();
		if (this.unlockablesHeaderCount) this.unlockablesHeaderCount.innerText = `${unlockedCount}/${totalCount}`;

		this.unlockableRows.forEach(({ entry, row }, index) => {
			const freshEntry = this.unlockableEntries[index] ?? entry;
			const unlocked = freshEntry.isUnlocked();
			const isHidden = freshEntry.secretLevel === 'hidden' && !unlocked;
			const name = unlocked ? freshEntry.name : freshEntry.lockedName;
			const conditionText = isHidden ? '???' : freshEntry.unlockText;

			row.icon.style.backgroundImage = freshEntry.icon ? `url("${freshEntry.icon}")` : 'none';
			row.icon.style.filter = unlocked
				? 'drop-shadow(1px 1px 0 #000) brightness(1)'
				: 'drop-shadow(1px 1px 0 #000) brightness(0) saturate(0)';
			row.name.innerText = (name || '???').toUpperCase();
			row.state.innerText = unlocked
				? getProfileUnlockableText('unlocked', lang, 'Unlocked').toUpperCase()
				: getProfileUnlockableText('locked', lang, 'Locked').toUpperCase();
			row.state.classList.toggle('is-unlocked', unlocked);
			row.state.classList.toggle('is-locked', !unlocked);
			row.condition.innerText = (conditionText || '???').toUpperCase();
		});
	}

	update() {
		this.name.value.placeholder = this.main.player.name;
		this.portrait.style.backgroundImage = `url("./src/assets/images/portraits/${this.main.player.portrait}.png")`;

		this.achievement.forEach((achievement, i) => {
			this.achievement[i].style.backgroundImage = `url("${achievementData[i].image}")`;
			this.achievement[i].style.filter = (this.main.player.achievements[i].status)
				? 'drop-shadow(2px 2px black) brightness(1)'
				: 'drop-shadow(1px 1px black) grayscale(1) brightness(0.5)';
			this.main.tooltip.bindTo(this.achievement[i], achievementData[i]);
		});

		for (let i = 0; i < 22; i++) {
			const statLabel = getProfileStatLabel(i, this.main.lang);
		 	this.stats[i].label.innerText = statLabel.toUpperCase();
		}

		this.stats[0].value.innerText = this.main.utility.minutsToTime(this.main.player.stats.timePlayed);
		this.stats[1].value.innerText = `${this.main.utility.numberDot(this.main.player.stars, this.main.lang)}`;
		const uniqueOwned = this.countUniqueSpecies();
		const totalSpecies = this.countTotalSpecies();
		this.stats[2].value.innerText = `${uniqueOwned}/${totalSpecies}`;
		const uniqueShinies = this.countUniqueShinySpecies();
		this.stats[3].value.innerText = `${uniqueShinies}/${totalSpecies}`;
		this.stats[4].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.highestPokemonLevel, this.main.lang)}`;
		this.stats[5].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.totalPokemonLevel, this.main.lang)}`;
		this.stats[6].value.innerText = `$${this.main.utility.numberDot(this.main.player.stats.totalGold, this.main.lang)}`;
		this.stats[7].value.innerText = `${this.main.player.itemAmount}/112`;
		this.stats[8].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.wavesCompleted, this.main.lang)}`;
		this.stats[9].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.highestHit, this.main.lang)}`;
		this.stats[10].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.defeatedEnemies, this.main.lang)}`;
		this.stats[11].value.innerText = `${this.main.player.stats.defeatedSpecies.size}/195`;
		this.stats[12].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedStuns, this.main.lang)}`;
		this.stats[13].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedSlows, this.main.lang)}`;
		this.stats[14].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedBurns, this.main.lang)}`;
		this.stats[15].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedPoisons, this.main.lang)}`;
		this.stats[16].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.appliedCurses, this.main.lang)}`;
		this.stats[17].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.resets, this.main.lang)}`;
		this.stats[18].value.innerText = `$${this.main.utility.numberDot(this.main.player.achievementProgress.stolenGold, this.main.lang)}`;
		this.stats[19].value.innerText = (this.main.player.stats.maxGoldPerWave[1] == null) ? `$0` :
			`(${this.main.player.stats.maxGoldPerWave[1]}) $${this.main.utility.numberDot(this.main.player.stats.maxGoldPerWave[0], this.main.lang)}`;
		this.stats[20].value.innerText = (this.main.player.stats.maxGoldPerTime[1] == null) ? `$0/s` :
			`(${this.main.player.stats.maxGoldPerTime[1]}) $${this.main.utility.numberDot(this.main.player.stats.maxGoldPerTime[0], this.main.lang)}/s`;
		this.stats[21].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.shinyEnemiesDefeated ?? 0, this.main.lang)}`;

		this.refreshUnlockablesList();
	}

	changePortrait(dir) {
		let pos = this.main.player.portrait;
		pos += dir;

		if (pos < 0) pos = 52;
		else if (pos > 52) pos = 0;

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
		const data = JSON.parse(window.localStorage.getItem('data'));
        data.save.player.name = this.main.player.name;
        data.save.player.portrait = this.main.player.portrait;
        window.localStorage.setItem('data', JSON.stringify(data));
	}

	open() {
		if (this.main.game.stopped) return playSound('pop0', 'ui');
		if (this.isOpen) return this.close();

		this.main.sections.forEach(section => {
			if (section.isOpen && section != this) return section.close();
		});

		super.open();
		this.update();
		this._refreshInterval = setInterval(() => this.update(), 500);
		this.main.UI.section['profile'].classList.add('is-selected');
		this.main.game.cancelDeployUnit();
	}

	close() {
		if (this._refreshInterval) {
			clearInterval(this._refreshInterval);
			this._refreshInterval = null;
		}
		super.close();
		this.main.tooltip.hide();
		this.main.UI.section['profile'].classList.remove('is-selected');
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

		this.yesButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui') });
		this.noButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui') });

		this.noButton.addEventListener('click', () => this.close());
		this.yesButton.addEventListener('click', () => {
			if (this.stat == 19) this.main.player.stats.maxGoldPerWave = [0, null];
			if (this.stat == 20) this.main.player.stats.maxGoldPerTime = [0, null];

			this.main.profileScene.update();
			this.close();
		});
	}

	countUniqueSpecies() {
		const owned = new Set();
		if (this.main.team?.pokemon) {
			this.main.team.pokemon.forEach(p => {
				if (p?.specie?.key) owned.add(p.specie.key);
				else if (p?.id !== undefined) owned.add(p.id);
			});
		}
		if (this.main.box?.pokemon) {
			this.main.box.pokemon.forEach(p => {
				if (p?.specie?.key) owned.add(p.specie.key);
				else if (p?.id !== undefined) owned.add(p.id);
			});
		}
		return owned.size;
	}

	countTotalSpecies() {
		return 103;
	}

	countUniqueShinySpecies() {
		const shinies = new Set();
		if (this.main.team?.pokemon) {
			this.main.team.pokemon.forEach(p => {
				if (p?.isShiny) {
					if (p?.specie?.key) shinies.add(p.specie.key);
					else if (p?.id !== undefined) shinies.add(p.id);
				}
			});
		}
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
		this.title.innerHTML = getProfileStatLabel(this.stat, this.main.lang).toUpperCase();
		this.prompt.innerHTML = text.profile.delete[this.main.lang].toUpperCase();
		this.yesButton.innerText = text.menu.data.delete[this.main.lang].toUpperCase();
		this.noButton.innerText = text.menu.data.cancel[this.main.lang].toUpperCase();
	}

	open(i) {
		super.open();
		this.stat = i;
		this.update();
	}
}
