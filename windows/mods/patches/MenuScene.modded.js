import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { playSound, setVolume } from '../../file/audio.js';
import { Input } from '../../utils/Input.js';

const OPTION = {
	language: ['English', 'Español', 'Français', 'Português', 'Italiano', 'Deutsch', '日本語', '한국어', '繁體中文', 'Polski'],
 	audio: Array.from({ length: 21 }, (_, i) => (i * 5).toString()),
 	reset: [0, 1, 2]
}

const CREDITS = {
	developer: {
		label: ['Developer', 'Desarrollador', 'Développeur', 'Desenvolvedor', 'Sviluppatore', 'Entwickler', '開発者', '개발자', '开发者', 'Programista'],
		content: '<a href="https://x.com/khydra98" target="_blank" class="link-red">KHYDRA</a>'
	},
	mapArtist: {
		label: ['Map Artist', 'Artista de mapas', 'Artiste des cartes', 'Artista de mapas', 'Artista di mappe', 'Kartenkünstler', 'マップアーティスト', '지도 아티스트', '地图绘师', 'Twórca Map'],
		content: '<a href="https://bsky.app/profile/elle-loves-hugs.bsky.social" target="_blank" class="link-red">NOELLE</a>'
	},
	contributors: {
		label: [
			"Contributors",
			"Colaboradores",
			"Contributeurs",
			"Contribuidores",
			"Contributori",
			"Mitwirkende",
			"貢献者",
			"기여자",
			"贡献者",
			"Współautorzy"
		],
		content: '<a href="https://x.com/gaudesp" target="_blank" class="link-red">Nox</a> <br> AncestralZ'
	},
	balance: {
		label: [
			"game balance",
			"balance de juego",
			"équilibrage du jeu",
			"balanceamento do jogo",
			"bilanciamento del gioco",
			"Spielbalance",
			"ゲームバランス",
			"게임 밸런스",
			"游戏平衡性",
			"balans rozgrywki"
		],
		content: `Mitsue <br> Sabry <br> Khaotik <br> Quinn <br> Roses <br> TaejaMyungsik <br> 
				<a href="https://github.com/innerthunder" target="_blank" class="link-red">Innerthunder</a> <br> 
				Skrubboi <br> Segmental
		`
	},
	testers: {
		label: ['Testers', 'Testers', 'Testeurs', 'Testadores', 'Tester', 'Tester', 'テスター', '테스터', '测试员', 'Testerzy'],
		content: '<a href="https://www.youtube.com/@KhytrayerDofus/videos" target="_blank" class="link-red">KHYTRAYER</a><br> SINGA'
	},
	traductions: {
		title: ["translations", "traducciones", "traductions", "traduções", "traduzioni", "Übersetzungen", "翻訳", "번역", '翻译', 'tłumaczenia'],
		label: {
			0: ["Korean", "Coreano", "Coréen", "Coreano", "Coreano", "Koreanisch", "韓国語", "한국어", '韩语', 'Koreański'],
			1: ["Polish", "Polaco", "Polonais", 'Polonês', "Polacco", "Polnisch", "ポーランド語", "폴란드어", "波兰语", "Polski"],
			2: ["German", "Alemán", "Allemand", "Alemão", "Tedesco", "Deutsch", "ドイツ語", "독일어", '德语', 'Niemiecki'],
			3: ["French", "Francés", "Français", "Francês", "Francese", "Französisch", "フランス語", "프랑스어", '法语', 'Francuski'],
		},
		content: {
			0: 'NamedHwi',
			1: 'MaxBurnHeart',
			2: '<a href="https://www.twitch.tv/tsukiya__" target="_blank" class="link-red">TSUKIYA</a> <br> Khaotik',
			3: 'Lugiadrien <br>Pistol <br>Ymass <br>Erose <br>Gamonymous <br>Wololo <br>RoRoSoK <br>Cam <br>TaejaMyungsik',
		}
	},
	official: {
		label: {
			0: [
				"Official Website",
				"Web oficial",
				"Site officiel",
				"Site oficial",
				"Sito ufficiale",
				"Offizielle Webseite",
				"公式ウェブサイト",
				"공식 웹사이트",
				"官方网站",
				"Oficjalna strona internetowa"
			],
			1: [
				"Community Discord",
				"Discord de la comunidad",
				"Discord de la communauté",
				"Discord da comunidade",
				"Discord della comunità",
				"Community-Discord",
				"コミュニティのDiscord",
				"커뮤니티 디스코드",
				"社区Discord",
				"Discord społeczności"
			],
			2: ['itch.io', 'itch.io', 'itch.io', 'itch.io', 'itch.io', 'itch.io', 'itch.io', 'itch.io', 'itch.io', 'itch.io']
		},
		content: {
			0: '<a href="https://pokepath.gg/en/play" target="_blank" class="link-red">PokePath.gg</a>',
			1: '<a href="https://discord.com/invite/PjuyEjGp7r" target="_blank" class="link-red">PokéPath TD</a>',
			2: '<a href="https://khydra98.itch.io/pokepath" target="_blank" class="link-red">khydra98</a>'
		}
		
	},
	assets: {
		title: ['Assets', 'Recursos', 'Ressources', 'Recursos', 'Risorse', 'Assets', 'アセット', '자산', '资源', 'Zasoby'],
		label: {
			0: ['Projectiles', 'Proyectiles', 'Projectiles', 'Projéteis', 'Proiettili', 'Projektile', '弾', '투사체', '投射物', 'Pociski'],
			1: ['Icons (menu)', 'Iconos (menú)', 'Icônes (menu)', 'Ícones (menu)', 'Icone (menu)', 'Symbole (Menü)', 'アイコン（メニュー）', '아이콘(메뉴)', '图标（菜单', 'Ikony (menu)'],
			2: ['Icons (flags)', 'Iconos (banderas)', 'Icônes (drapeaux)', 'Ícones (bandeiras)', 'Icone (bandiere)', 'Symbole (Flaggen)', 'アイコン（旗）', '아이콘(깃발)', '图标（旗帜', 'Ikony (flagi)'],
			3: ['Music', 'Música', 'Musique', 'Música', 'Musica', 'Musik', '音楽', '음악', '音乐', 'Muzyka'],
			4: ["Items", "Objetos", "Objets", "Itens", "Oggetti", "Gegenstände", "アイテム", "아이템", '物品', 'Przedmioty'],
			5: ['Tileset', 'Tileset', 'Tileset', 'Tileset', 'Tileset', 'Tileset', 'タイルセット', '타일셋', '图块集', 'Zestaw kafelków'],
			6: ['Sprites', 'Sprites', 'Sprites', 'Sprites', 'Sprites', 'Sprites', 'スプライト', '스프라이트', '精灵', 'Sprite'],
		},
		content: {
			0: '<a href="https://bdragon1727.itch.io/free-effect-bullet-impact-explosion-32x32" target="_blank" class="link-red">BDRAGON1727</a>',
			1: '<a href="https://www.flaticon.com/authors/kiranshastry/solid?author_id=257&type=standard" target="_blank" class="link-red">KIRANSHASTRY</a>',
			2: '<a href="https://www.flaticon.com/authors/freepik" target="_blank" class="link-red">FREEPIK</a>',
			3: '<a href="https://downloads.khinsider.com/game-soundtracks/album/pokemon-firered-leafgreen-music-super-complete" target="_blank" class="link-red">MEDIA FACTORY</a>',
			4: '<a href="https://msikma.github.io/pokesprite/overview/inventory.html" target="_blank" class="link-red">PokéSprite</a>',
			5: `Anonalpaca<br> Aveontrainer<br> Beta-SP<br> Ekat<br> Elinthind<br> Farore<br> Heartlessdragoon<br> Idilio<br> KingTapir<br> LunaMaddalena<br> Noelle<br> Pokémon Alexandrite<br> 
				Pokémon Halcyon<br> Pokémon Nightshade<br> Ross-Hawkins<br> Shyinn<br> Skidmarc25<br> <span style="font-size: 12px;">TheDeadHeroAlistair</span><br> Vurtax<br> Zein<br> Zeo`,
			6: `<a href="https://sprites.pmdcollab.org/" target="_blank" class="link-red">PMD COLLAB</a><br>
				◥θ┴θ◤ <br> 0palite <br> 3Monika4 <br> 3P1C <br> A_Lettuce <br> Adrian <br> AikoMaiko 
				<br> Akai <br> AlexGroeger <br> AllPatchedUp <br> Angels-Snack <br> Anon <br> Anonymous <br> Ariakyu 
				<br> Atwer <br> Audino <br> avalancheman <br> Avery <br> Aviivix <br> Axcel <br> Azifel <br> baronessfaron 
				<br> Blanca <br> Blanky <br> <span style="font-size: 12px;">Bluetails_the_Buizel</span> <br> brookriver <br> bwappi <br> C_Pariah <br> Caitemis 
				<br> CamusZekeSirius <br> CeleryGuy <br> Chesyon <br> Chi <br> chikorene <br> Child-Of-Hades <br> chime 
				<br> CHUNSOFT <br> CinderedPhoenix <br> Cloudy <br> Cocosquid. <br> Coksi <br> Colistan <br> cosmosully <br> cyboy_bit 
				<br> dariosparks <br> Darkrai <br> Dasawkem <br> DasK <br> Davilos <br> DavKriz <br> Ddragon <br> dede6giu 
				<br> Deeshura <br> Dejais <br> Deleca7755 <br> deltaflare <br> DeltaL <br> Deltex12 <br> distress <br> dmDash 
				<br> drawsstuff <br> Dutch-Spaniard <br> <span style="font-size: 12px;">EeveeandVulpix2000</span> <br> El_Pangoro_Parse <br> electronvolt <br>ElGian <br> Eliza   
				<br> Emboarger <br> Emitone <br> Emmuffin <br> eon <br> ErrantWitch <br> estelstarlight <br> EzerArt <br> Fable 
				<br> FalafelPorpoise <br> Fearless-Quit <br> Felis-Licht <br> FerMrack <br> Fingernails <br> Fire_Scyther <br> FissionCube 
				<br> fledermaus <br> FlowerSnek <br> FrivolousAqua <br> Frostdrop1 <br> G〜 <br> Gayschlatt <br> Gelius <br> Ginnie 
				<br> Giru <br> Grimlin <br> gromchurch <br> Gust <br> GustavoMusinTG <br> Hanbei <br> Hemlock <br> <span style="font-size: 12px;">HopeBurnsBright2008 </span>
				<br> Ichor <br> Inv3rse <br> <span style="font-size: 10px;">jackolanternjackalope</span> <br> Jarleypeño <br> Jelly <br> JemDragons <br> JFain <br> Jhony-Rex 
				<br> JkKU　(Jenrikku) <br> JuanmaSG <br> JustAGunk <br> Katach314 <br> Kawaiitron <br> KCN015 <br> Keldaan <br> Kevin0itachi 
				<br> LazerBlitz <br> leafia_barrett <br> LegendaryPhoenix <br> Leif <br> lemongrass <br> LightBlueBlaze <br> Limomon <br> lokatts 
				<br> LornaWR <br> lovefulpup <br> Lovi <br> LT <br> Luca <br> LuchuIsASquirrel <br> Luna-Alex <br> Magu <br> Maruvert 
				<br> MeepTheMareep02 <br> Meganai <br> metalbear <br> Michael12 <br> Miju <br> MilesFarber <br> mixy:3 <br> Mojo <br> Mond 
				<br> MonochromeKirby <br> Moo <br> Mooncaller <br> Morei <br> mothbeanie <br> motherhenna Helen <br> Mr_L <br> mucrush <br> namu 
				<br> nataniel-sama <br> Neat_Neato <br> NeonCityRain <br> NeroIntruder <br> NikolaP <br> Noivern <br> NOLASMOR <br> Noo <br> Novie 
				<br> Okami <br> Orange <br> Palika <br> Pencil <br> PhillipsYoung <br> pi3.14 <br> PikaNiko <br> Pink_no_tori <br> PinkKecleon <br>
				PixlHoopa <br> Pokejavi. <br> Pokenoice <br> PoliteHoppip <br> powercristal <br> Precascer <br> Prismatic <br> <span style="font-size: 12px;">programmedsleepstate </span>
				<br> RacieB <br> RaoKurai <br> Ray2064 <br> Reimu_needs_$$$ <br> RelicCipher <br> Reppamon <br> rhys <br> RibbonDove <br> 
				Richelieu <br> Riodise <br> RoyalRust <br> Rudy <br> Rustnuttie <br> Sceptile <br> Scizivire <br> Semilia <br> SethY <br> 
				Shadowcrafts <br> Sharpen <br> shimx <br> Shitpost_Sunkern <br> ShyStarryRain <br> SilverDeoxys563 <br> silverfox88 <br> 
				SingingMudkip <br> SirViolet <br> SkeleJ64 <br> SKREE <br> skygummi <br> Smalusion <br> smartini <br> smbmaster99 <br> Smingle <br> 
				snarbs <br> Sonikku_A <br> Soulja <br> SpectrumStars <br> Spikey-Valentine <br> stressparticles <br> Sugi <br> Sunny <br> 
				SuperFabbioGuy <br> SuperLean23 <br> Tacocoa <br> Tainted#3886 <br> TawnySoup <br> TaylorTrap622 <br> teddg <br> Top_Kec <br>
				Uni <br> Vendily <br> VersuS <br> CelestialDrago <br> Vex <br> VOID <br> Vynnyal <br> Waffluffe <br> Wyvernagon <br> XModxGodX <br>
				Xrit63 <br> XxWindpawxX <br> Yari <br> YoukaiMinori <br> ZacianSword <br> ZoroarkDX <br> ZoZoBab <br>
			`,
		}
	},
	disclaimer: [
		`
		This is a non-profit fangame created by a single person, and it is not affiliated with, sponsored by, or approved by Nintendo, Game Freak, or The Pokémon Company. <br><br>
		All characters, items, sprites, music, and other materials related to Pokémon are the property of their respective owners: © Nintendo, Game Freak, Creatures Inc.`,
		`
		Este es un juego fangame sin fines de lucro creado por una sola persona, y no está afiliado, patrocinado ni aprobado por Nintendo, Game Freak o The Pokémon Company. <br><br> 
		Todos los personajes, objetos, sprites, música y demás materiales relacionados con Pokémon son propiedad de sus respectivos dueños: © Nintendo, Game Freak, Creatures Inc.`,
		`
		Ceci est un fangame à but non lucratif créé par une seule personne, et il n’est affilié, parrainé ni approuvé par Nintendo, Game Freak ou The Pokémon Company. <br><br>
		Tous les personnages, objets, sprites, musiques et autres éléments liés à Pokémon sont la propriété de leurs détenteurs respectifs : © Nintendo, Game Freak, Creatures Inc.`,
		`
		Este é um fangame sem fins lucrativos criado por uma única pessoa, e não é afiliado, patrocinado ou aprovado pela Nintendo, Game Freak ou The Pokémon Company. <br><br>
		Todos os personagens, itens, sprites, músicas e outros materiais relacionados a Pokémon são propriedade de seus respectivos donos: © Nintendo, Game Freak, Creatures Inc.`,
		`
		Questo è un fangame no-profit creato da una sola persona, e non è affiliato, sponsorizzato o approvato da Nintendo, Game Freak o The Pokémon Company. <br><br>
		Tutti i personaggi, oggetti, sprite, musiche e altri materiali relativi a Pokémon sono di proprietà dei rispettivi proprietari: © Nintendo, Game Freak, Creatures Inc.`,
		`
		Dies ist ein Non-Profit-Fangame, erstellt von einer einzelnen Person, und es ist weder mit Nintendo, Game Freak noch The Pokémon Company verbunden, gesponsert oder genehmigt. <br><br>
		Alle Charaktere, Gegenstände, Sprites, Musik und andere Pokémon-bezogene Materialien sind Eigentum ihrer jeweiligen Besitzer: © Nintendo, Game Freak, Creatures Inc.`,
		`
		これは個人が作成した非営利のファンゲームであり、Nintendo、Game Freak、またはポケモン社とは提携しておらず、承認もされていません。<br><br>
		ポケモンに関連するすべてのキャラクター、アイテム、スプライト、音楽、その他の素材は、それぞれの所有者に帰属します: © Nintendo, Game Freak, Creatures Inc.`,
		`
		이것은 개인이 만든 비영리 팬게임이며, Nintendo, Game Freak 또는 포켓몬 컴퍼니와 제휴하거나 후원받거나 승인받은 것이 아닙니다. <br><br>
		포켓몬 관련 모든 캐릭터, 아이템, 스프라이트, 음악 및 기타 자료는 각 소유자에게 속합니다: © Nintendo, Game Freak, Creatures Inc.`,
		`
		这是由个人制作的非营利同人游戏，与任天堂、Game Freak 或宝可梦公司无关，也未获得其赞助或批准。<br><br>
		所有与宝可梦相关的角色、道具、精灵图像、音乐及其他素材均为其各自版权所有者所有：© 任天堂, Game Freak, Creatures Inc.`
	],
}

const SHORTCUTS = {
	key: {
		0: ['0–9', '0–9', '0–9', '0–9', '0–9', '0–9', '0-9', '0–9', '0–9', '0-9'],
		1: ['Q', 'Q', 'A', 'Q', 'Q', 'Q', 'Q', 'Q', 'Q', 'Q'],
		2: ['W', 'W', 'Z', 'W', 'W', 'W', 'W', 'W', 'W', 'W'], 
		3: ['E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E', 'E'],
		4: ['S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S', 'S'],
		5: ['Z', 'Z', 'W', 'Z', 'Z', 'Y', 'Z', 'Z', 'Z', 'Z'],
		6: ['X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X', 'X'],
		7: ['Esc', 'Esc', 'Échap', 'Esc', 'Esc', 'Esc', 'Esc', 'Esc', 'Esc', 'Esc'],
		8: ['Space', 'Espacio', 'Espace', 'Espaço', 'Spazio', 'Leertaste', 'スペース', '스페이스', '空格', 'Spacja'],
		9: ['Shift', 'Shift', 'Maj', 'Shift', 'Shift', 'Shift', 'Shift', 'Shift', 'Shift', 'Shift'],
		10: ['Ctrl + (1-5)', 'Ctrl + (1-5)', 'Ctrl + (1-5)', 'Ctrl + (1-5)', 'Ctrl + (1-5)', 'Ctrl + (1-5)', 'Ctrl + (1-5)', 'Ctrl + (1-5)', 'Ctrl + (1-5)', 'Ctrl + (1-5)'],
		11: ['F1-F5', 'F1-F5', 'F1-F5', 'F1-F5', 'F1-F5', 'F1-F5', 'F1-F5', 'F1-F5', 'F1-F5', 'F1-F5'],
		12: ['F11', 'F11', 'F11', 'F11', 'F11', 'F11', 'F11', 'F11', 'F11', 'F11'],
	},
	do: {
		0: ['Place Pokémon', 'Colocar Pokémon', 'Placer un Pokémon', 'Colocar Pokémon', 'Posiziona Pokémon', 'Pokémon platz.', 'ポケモンを配置', '포켓몬 배치', '放置宝可梦', 'Umieść Pokémona'],
		1: ['Profile', 'Perfil', 'Profil', 'Perfil', 'Profilo', 'Profil', 'プロフィール', '프로필', '个人资料', 'Profil'],
		2: ['Map', 'Mapa', 'Carte', 'Mapa', 'Mappa', 'Karte', 'マップ', '맵', '地图', 'Mapa'],
		3: ['Box', 'Caja', 'Boite', 'Caixa', 'Box', 'Box', 'ボックス', '박스', '箱子', 'Box'],
		4: ['Shop', 'Tienda', 'Boutique', 'Loja', 'Negozio', 'Laden', 'ショップ', '상점', '商店', 'Sklep'],
		5: ['Graphic Mode', 'Modo gráfico', 'Mode graphique', 'Modo gráfico', 'Modalità grafica', 'Graphmodus', 'グラフィックモード', '그래픽 모드', '图形模式', 'Tryb Graficzny'],
		6: ["Show ranges", "Mostrar rangos", "Afficher portées", "Most. intervalos", "Mostra intervalli",  "Reichweite zeigen", "範囲を表示", "범위 표시", '顯示範圍', 'Pokaż Zasięgi'],
		7: ['Close window', 'Cerrar ventana', 'Fermer la fenêtre', 'Fechar janela', 'Chiudi finestra', 'Schließen', 'ウィンドウを閉じる', '창 닫기', '关闭窗口', 'Zamknij Okno'],
		8: ['Next wave', 'Siguiente oleada', 'Vague suivante', 'Próxima onda', 'Ondata successiva', 'Nächste Welle', '次のウェーブ', '다음 웨이브', '下一波', 'Następna Fala'],
		9: ["Toggle Speed", "Cambiar Velocidad", "Modifier Vitesse", "Alternar Velocidade", "Cambia Velocità", "Geschw. wechseln",  "速度切替", "속도 전환", "切換速度", 'Przełącz Szybkość'],
		10: ["Save Team", "Guardar equipo", "Enreg. l'équipe", "Salvar equipe", "Salva squadra", "Team speichern", "チームを保存", "팀 저장", "保存队伍", "Zapisz Drużynę"],
		11: ["Load Team","Cargar equipo","Charger l'équipe","Carregar equipe","Carica squadra","Team laden","チームを読み込む","팀 불러오기","加载队伍", "Wczytaj Drużynę"],
		12: ["Full Screen", "Pantalla completa", "Plein écran", "Tela cheia", "Schermo intero", "Vollbild", "全画面", "전체 화면", '全螢幕', "Pełny Ekran"],
	}
}

const audioKeys = ['master', 'music', 'ui', 'effects'];

export class MenuScene extends GameScene {
	constructor(main) {
		super();
		this.main = main;
		this.render();

		this.deleteScene = new DeleteData(this.main);
		this.importScene = new ImportData(this.main);
		this.exportScene = new ExportData(this.main);
	}

	getConfig() {
        return JSON.parse(window.localStorage.getItem("data")).config;
    }

    saveConfig(newConfig) {
        let data = JSON.parse(window.localStorage.getItem("data"));
        data.config = newConfig;
        window.localStorage.setItem("data", JSON.stringify(data));
    }

	render() {
		this.title.innerHTML = text.menu.title[this.main.lang].toUpperCase();
		this.menuContainer = new Element(this.container, { className: 'menu-scene-container' }).element;

		// OFFICIAL
		this.sectionOfficial = new Element(this.menuContainer, { className: 'menu-scene-section' }).element;
		this.titleOfficial = new Element(this.sectionOfficial, { className: 'menu-scene-section-title' }).element;
		this.contentOfficial = new Element(this.sectionOfficial, { className: 'menu-scene-section-content' }).element;

		this.officialWeb = new Element(this.contentOfficial, { className: 'menu-scene-row' }).element;
		this.officialWeb.label = new Element(this.officialWeb, { className: 'menu-scene-label' }).element;
		this.officialWeb.content = new Element(this.officialWeb, { className: 'menu-scene-value-credits' }).element;
		this.officialWeb.content.innerHTML = CREDITS.official.content[0];

		this.officialDiscord = new Element(this.contentOfficial, { className: 'menu-scene-row' }).element;
		this.officialDiscord.label = new Element(this.officialDiscord, { className: 'menu-scene-label' }).element;
		this.officialDiscord.content = new Element(this.officialDiscord, { className: 'menu-scene-value-credits' }).element;
		this.officialDiscord.content.innerHTML = CREDITS.official.content[1];

		this.officialItchio = new Element(this.contentOfficial, { className: 'menu-scene-row' }).element;
		this.officialItchio.label = new Element(this.officialItchio, { className: 'menu-scene-label' }).element;
		this.officialItchio.content = new Element(this.officialItchio, { className: 'menu-scene-value-credits' }).element;
		this.officialItchio.content.innerHTML = CREDITS.official.content[2];

		// SETTINGS
		this.sectionSettings = new Element(this.menuContainer, { className: 'menu-scene-section' }).element;
		this.titleSettings = new Element(this.sectionSettings, { className: 'menu-scene-section-title' }).element;
		this.contentSettings = new Element(this.sectionSettings, { className: 'menu-scene-section-content' }).element;

		this.languageRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		this.languageRow.label = new Element(this.languageRow, { className: 'menu-scene-label' }).element;
		this.languageRow.prev = new Element(this.languageRow, { className: 'menu-scene-arrow', text: '<' }).element;
		this.languageRow.value = new Element(this.languageRow, { className: 'menu-scene-value' }).element;
		this.languageRow.next = new Element(this.languageRow, { className: 'menu-scene-arrow', text: '>' }).element;

		this.languageRow.prev.addEventListener('click', () => { this.updateLanguage(-1) })
		this.languageRow.next.addEventListener('click', () => { this.updateLanguage(1) })
		this.languageRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.languageRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.damageRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		this.damageRow.label = new Element(this.damageRow, { className: 'menu-scene-label' }).element;
		this.damageRow.prev = new Element(this.damageRow, { className: 'menu-scene-arrow', text: '<' }).element;
		this.damageRow.value = new Element(this.damageRow, { className: 'menu-scene-value' }).element;
		this.damageRow.next = new Element(this.damageRow, { className: 'menu-scene-arrow', text: '>' }).element;

		this.damageRow.prev.addEventListener('click', () => { this.updateShowDamage() })
		this.damageRow.next.addEventListener('click', () => { this.updateShowDamage() })
		this.damageRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.damageRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
			
		// this.showRouteRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		// this.showRouteRow.label = new Element(this.showRouteRow, { className: 'menu-scene-label' }).element;
		// this.showRouteRow.prev = new Element(this.showRouteRow, { className: 'menu-scene-arrow', text: '<' }).element;
		// this.showRouteRow.value = new Element(this.showRouteRow, { className: 'menu-scene-value' }).element;
		// this.showRouteRow.next = new Element(this.showRouteRow, { className: 'menu-scene-arrow', text: '>' }).element;

		// this.showRouteRow.prev.addEventListener('click', () => { this.updateShowRoute() })
		// this.showRouteRow.next.addEventListener('click', () => { this.updateShowRoute() })
		// this.showRouteRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		// this.showRouteRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		// this.showTCRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		// this.showTCRow.label = new Element(this.showTCRow, { className: 'menu-scene-label' }).element;
		// this.showTCRow.prev = new Element(this.showTCRow, { className: 'menu-scene-arrow', text: '<' }).element;
		// this.showTCRow.value = new Element(this.showTCRow, { className: 'menu-scene-value' }).element;
		// this.showTCRow.next = new Element(this.showTCRow, { className: 'menu-scene-arrow', text: '>' }).element;

		// this.showTCRow.prev.addEventListener('click', () => { this.updateShowTC() })
		// this.showTCRow.next.addEventListener('click', () => { this.updateShowTC() })
		// this.showTCRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		// this.showTCRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.autoStopRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		this.autoStopRow.label = new Element(this.autoStopRow, { className: 'menu-scene-label' }).element;
		this.autoStopRow.prev = new Element(this.autoStopRow, { className: 'menu-scene-arrow', text: '<' }).element;
		this.autoStopRow.value = new Element(this.autoStopRow, { className: 'menu-scene-value' }).element;
		this.autoStopRow.next = new Element(this.autoStopRow, { className: 'menu-scene-arrow', text: '>' }).element;

		this.autoStopRow.prev.addEventListener('click', () => { this.updateAutoStop() })
		this.autoStopRow.next.addEventListener('click', () => { this.updateAutoStop() })
		this.autoStopRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.autoStopRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.autoStopBossRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		this.autoStopBossRow.label = new Element(this.autoStopBossRow, { className: 'menu-scene-label' }).element;
		this.autoStopBossRow.prev = new Element(this.autoStopBossRow, { className: 'menu-scene-arrow', text: '<' }).element;
		this.autoStopBossRow.value = new Element(this.autoStopBossRow, { className: 'menu-scene-value' }).element;
		this.autoStopBossRow.next = new Element(this.autoStopBossRow, { className: 'menu-scene-arrow', text: '>' }).element;

		this.autoStopBossRow.prev.addEventListener('click', () => { this.updateAutoStopBoss() })
		this.autoStopBossRow.next.addEventListener('click', () => { this.updateAutoStopBoss() })
		this.autoStopBossRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.autoStopBossRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.autoResetRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		this.autoResetRow.label = new Element(this.autoResetRow, { className: 'menu-scene-label' }).element;
		this.autoResetRow.prev = new Element(this.autoResetRow, { className: 'menu-scene-arrow', text: '<' }).element;
		this.autoResetRow.value = new Element(this.autoResetRow, { className: 'menu-scene-value' }).element;
		this.autoResetRow.next = new Element(this.autoResetRow, { className: 'menu-scene-arrow', text: '>' }).element;

		this.autoResetRow.prev.addEventListener('click', () => { this.updateAutoReset(-1) })
		this.autoResetRow.next.addEventListener('click', () => { this.updateAutoReset(1) })
		this.autoResetRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.autoResetRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.displayHealthRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		this.displayHealthRow.label = new Element(this.displayHealthRow, { className: 'menu-scene-label' }).element;
		this.displayHealthRow.prev = new Element(this.displayHealthRow, { className: 'menu-scene-arrow', text: '<' }).element;
		this.displayHealthRow.value = new Element(this.displayHealthRow, { className: 'menu-scene-value' }).element;
		this.displayHealthRow.next = new Element(this.displayHealthRow, { className: 'menu-scene-arrow', text: '>' }).element;

		this.displayHealthRow.prev.addEventListener('click', () => { this.updateDisplayHealth(-1) })
		this.displayHealthRow.next.addEventListener('click', () => { this.updateDisplayHealth(1) })
		this.displayHealthRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.displayHealthRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.mapEffectsRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		this.mapEffectsRow.label = new Element(this.mapEffectsRow, { className: 'menu-scene-label' }).element;
		this.mapEffectsRow.prev = new Element(this.mapEffectsRow, { className: 'menu-scene-arrow', text: '<' }).element;
		this.mapEffectsRow.value = new Element(this.mapEffectsRow, { className: 'menu-scene-value' }).element;
		this.mapEffectsRow.next = new Element(this.mapEffectsRow, { className: 'menu-scene-arrow', text: '>' }).element;

		this.mapEffectsRow.prev.addEventListener('click', () => { this.updateMapEffects(-1) })
		this.mapEffectsRow.next.addEventListener('click', () => { this.updateMapEffects(1) })
		this.mapEffectsRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.mapEffectsRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		// ENDLESS MOD: Wave Info Panel setting
		this.waveInfoRow = new Element(this.contentSettings, { className: 'menu-scene-row' }).element;
		this.waveInfoRow.label = new Element(this.waveInfoRow, { className: 'menu-scene-label' }).element;
		this.waveInfoRow.prev = new Element(this.waveInfoRow, { className: 'menu-scene-arrow', text: '<' }).element;
		this.waveInfoRow.value = new Element(this.waveInfoRow, { className: 'menu-scene-value' }).element;
		this.waveInfoRow.next = new Element(this.waveInfoRow, { className: 'menu-scene-arrow', text: '>' }).element;

		this.waveInfoRow.prev.addEventListener('click', () => { this.updateWaveInfo() })
		this.waveInfoRow.next.addEventListener('click', () => { this.updateWaveInfo() })
		this.waveInfoRow.prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		this.waveInfoRow.next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })

		this.sectionAudio = new Element(this.menuContainer, { className: 'menu-scene-section' }).element;
		this.titleAudio = new Element(this.sectionAudio, { className: 'menu-scene-section-title' }).element;
		this.contentAudio = new Element(this.sectionAudio, { className: 'menu-scene-section-content' }).element;

		this.audioRow = [];
	
		for (let i = 0; i < 4; i++) {
			this.audioRow[i] = new Element(this.contentAudio, { className: 'menu-scene-row' }).element;
			this.audioRow[i].label = new Element(this.audioRow[i], { className: 'menu-scene-label' }).element;
			this.audioRow[i].prev = new Element(this.audioRow[i], { className: 'menu-scene-arrow', text: '<' }).element;
			this.audioRow[i].value = new Element(this.audioRow[i], { className: 'menu-scene-value' }).element;
			this.audioRow[i].next = new Element(this.audioRow[i], { className: 'menu-scene-arrow', text: '>' }).element;

			this.audioRow[i].prev.addEventListener('click', () => {this.updateAudio(audioKeys[i], -1)})
			this.audioRow[i].next.addEventListener('click', () => {this.updateAudio(audioKeys[i], 1)})
			this.audioRow[i].prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
			this.audioRow[i].next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		}

		this.muteRow = [];

		for (let i = 0; i < 3; i++) {
			this.muteRow[i] = new Element(this.contentAudio, { className: 'menu-scene-row' }).element;
			this.muteRow[i].label = new Element(this.muteRow[i], { className: 'menu-scene-label' }).element;
			this.muteRow[i].prev = new Element(this.muteRow[i], { className: 'menu-scene-arrow', text: '<' }).element;
			this.muteRow[i].value = new Element(this.muteRow[i], { className: 'menu-scene-value' }).element;
			this.muteRow[i].next = new Element(this.muteRow[i], { className: 'menu-scene-arrow', text: '>' }).element;

			this.muteRow[i].prev.addEventListener('click', () => {this.muteAudio(i)})
			this.muteRow[i].next.addEventListener('click', () => {this.muteAudio(i)})
			this.muteRow[i].prev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
			this.muteRow[i].next.addEventListener('mouseenter', () => { playSound('hover1', 'ui') })
		}

		//SHORTCUTS
		this.sectionShortcuts = new Element(this.menuContainer, { className: 'menu-scene-section' }).element;
		this.titleShortcuts = new Element(this.sectionShortcuts, { className: 'menu-scene-section-title' }).element;
		this.contentShortcuts = new Element(this.sectionShortcuts, { className: 'menu-scene-section-content' }).element;

		this.shortcutRow = [];

		for (let i = 0; i < 13; i++) {
			this.shortcutRow[i] = new Element(this.contentShortcuts, { className: 'menu-scene-row' }).element;
			this.shortcutRow[i].label = new Element(this.shortcutRow[i], { className: 'menu-scene-label' }).element;
			this.shortcutRow[i].content = new Element(this.shortcutRow[i], { className: 'menu-scene-value-credits' }).element;
		}

		// DELETE DATA

		this.sectionData = new Element(this.menuContainer, { className: 'menu-scene-section' }).element;
		this.titleData = new Element(this.sectionData, { className: 'menu-scene-section-title' }).element;
		this.contentData = new Element(this.sectionData, { className: 'menu-scene-section-content' }).element;
		this.deleteData = new Element(this.contentData, { className: 'menu-scene-delete-data' }).element;

		this.deleteData.addEventListener('click', () => { 
			this.deleteScene.open(); 
		})

		this.exportData = new Element(this.contentData, { className: 'menu-scene-export-data' }).element;
		this.exportData.addEventListener('click', () => { 
			this.exportScene.open(); 
		})

		this.importData = new Element(this.contentData, { className: 'menu-scene-import-data' }).element;
		this.importData.addEventListener('click', () => { 
			this.importScene.open(); 
		})

		this.deleteData.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })
		this.exportData.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })
		this.importData.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })

		this.version = new Element(this.sectionData, { className: 'menu-scene-version', text: `v 1.4.0` }).element;
		// CREDITS
		this.sectionCredits = new Element(this.menuContainer, { className: 'menu-scene-section' }).element;
		this.titleCredits = new Element(this.sectionCredits, { className: 'menu-scene-section-title' }).element;
		this.contentCredits = new Element(this.sectionCredits, { className: 'menu-scene-section-content' }).element;

		this.developer = new Element(this.contentCredits, { className: 'menu-scene-row' }).element;
		this.developer.label = new Element(this.developer, { className: 'menu-scene-label' }).element;
		this.developer.content = new Element(this.developer, { className: 'menu-scene-value-credits' }).element;
		this.developer.content.innerHTML = CREDITS.developer.content;

		this.mapArtist = new Element(this.contentCredits, { className: 'menu-scene-row' }).element;
		this.mapArtist.label = new Element(this.mapArtist, { className: 'menu-scene-label' }).element;
		this.mapArtist.content = new Element(this.mapArtist, { className: 'menu-scene-value-credits' }).element;
		this.mapArtist.content.innerHTML = CREDITS.mapArtist.content;

		this.contributors = new Element(this.contentCredits, { className: 'menu-scene-credit-row' }).element;
		this.contributors.label = new Element(this.contributors, { className: 'menu-scene-label' }).element;
		this.contributors.content = new Element(this.contributors, { className: 'menu-scene-value-credits' }).element;
		this.contributors.content.innerHTML = CREDITS.contributors.content;

		this.balance = new Element(this.contentCredits, { className: 'menu-scene-credit-row' }).element;
		this.balance.label = new Element(this.balance, { className: 'menu-scene-label' }).element;
		this.balance.content = new Element(this.balance, { className: 'menu-scene-value-credits' }).element;
		this.balance.content.innerHTML = CREDITS.balance.content;

		this.testers = new Element(this.contentCredits, { className: 'menu-scene-credit-row' }).element;
		this.testers.label = new Element(this.testers, { className: 'menu-scene-label' }).element;
		this.testers.content = new Element(this.testers, { className: 'menu-scene-value-credits' }).element;
		this.testers.content.innerHTML = CREDITS.testers.content;

		this.traductionsContainer = new Element(this.contentCredits, { className: 'menu-scene-credits-container' }).element;
		this.traductionsTitle = new Element(this.traductionsContainer, { className: 'menu-scene-credits-title' }).element;
		this.traductionsList = [];

		for (let i = 0; i < 4; i++) {
			this.traductionsList[i] = new Element(this.traductionsContainer, { className: 'menu-scene-credit-row' }).element;
			this.traductionsList[i].label = new Element(this.traductionsList[i], { className: 'menu-scene-label' }).element;
			this.traductionsList[i].content = new Element(this.traductionsList[i], { className: 'menu-scene-value-credits' }).element;
			this.traductionsList[i].content.innerHTML = CREDITS.traductions.content[i];
		}
		
		this.assetsContainer = new Element(this.contentCredits, { className: 'menu-scene-credits-container' }).element;
		this.assetsTitle = new Element(this.assetsContainer, { className: 'menu-scene-credits-title' }).element;
		this.assetsList = [];

		for (let i = 0; i < 7; i++) {
			this.assetsList[i] = new Element(this.assetsContainer, { className: 'menu-scene-credit-row' }).element;
			this.assetsList[i].label = new Element(this.assetsList[i], { className: 'menu-scene-label' }).element;
			this.assetsList[i].content = new Element(this.assetsList[i], { className: 'menu-scene-value-credits' }).element;
			this.assetsList[i].content.innerHTML = CREDITS.assets.content[i];
		}

		this.disclaimer = new Element(this.contentCredits, { className: 'menu-credits-disclaimer' }).element;

		this.background.addEventListener('click', (e) => { if (e.target == this.background) this.close() })
	}

	update() {
		const data = JSON.parse(window.localStorage.getItem("data"));

		this.title.innerHTML = text.menu.title[this.main.lang].toUpperCase();
		this.titleOfficial.innerHTML = text.menu.official.title[this.main.lang].toUpperCase();
		this.titleSettings.innerHTML = text.menu.settings.title[this.main.lang].toUpperCase();
		this.titleAudio.innerHTML = text.menu.audio.title[this.main.lang].toUpperCase();
		this.titleCredits.innerHTML = text.menu.credits.title[this.main.lang].toUpperCase();
		this.titleShortcuts.innerHTML = text.menu.shortcuts.title[this.main.lang].toUpperCase();
		this.titleData.innerHTML = text.menu.data.title[this.main.lang].toUpperCase();

		// Official
		this.officialWeb.label.innerHTML = CREDITS.official.label[0][this.main.lang].toUpperCase();
		this.officialDiscord.label.innerHTML = CREDITS.official.label[1][this.main.lang].toUpperCase();
		this.officialItchio.label.innerHTML = CREDITS.official.label[2][this.main.lang].toUpperCase();

		//SETINGS

		this.languageRow.label.innerText = text.menu.settings.language[this.main.lang].toUpperCase();
		this.languageRow.value.innerText = OPTION.language[this.main.lang].toUpperCase();

		for (let i = 0; i < 4; i++) {
  			this.audioRow[i].label.innerHTML = text.menu.settings.audio[i][this.main.lang].toUpperCase();
  			this.audioRow[i].value.innerHTML = this.getConfig().audio[audioKeys[i]]
  		}

  		for (let i = 0; i < 3; i++) {
  			this.muteRow[i].label.innerHTML = text.menu.settings.mute[i][this.main.lang].toUpperCase();
  			this.muteRow[i].value.innerHTML = (this.main.mute[i]) ? text.ui.yes[this.main.lang].toUpperCase() : text.ui.no[this.main.lang].toUpperCase();
  		}

  		this.damageRow.label.innerText = text.menu.settings.showDamage[this.main.lang].toUpperCase();
  		this.damageRow.value.innerText = (data.config.showDamage) ? text.ui.yes[this.main.lang].toUpperCase(): text.ui.no[this.main.lang].toUpperCase();

  		// this.showRouteRow.label.innerText = text.menu.settings.showRoute[this.main.lang].toUpperCase();
  		// this.showRouteRow.value.innerText = (data.config.showRoute) ? text.ui.yes[this.main.lang].toUpperCase(): text.ui.no[this.main.lang].toUpperCase();

  		// this.showTCRow.label.innerText = text.menu.settings.showTC[this.main.lang].toUpperCase();
  		// this.showTCRow.value.innerText = (data.config.showTC) ? text.ui.yes[this.main.lang].toUpperCase(): text.ui.no[this.main.lang].toUpperCase();

  		this.autoStopRow.label.innerText = text.menu.settings.autoStop[this.main.lang].toUpperCase();
  		this.autoStopRow.value.innerText = (data.config.autoStop) ? text.ui.yes[this.main.lang].toUpperCase(): text.ui.no[this.main.lang].toUpperCase();

  		this.autoStopBossRow.label.innerText = text.menu.settings.autoStopBoss[this.main.lang].toUpperCase();
  		this.autoStopBossRow.value.innerText = (data.config.autoStopBoss) ? text.ui.yes[this.main.lang].toUpperCase(): text.ui.no[this.main.lang].toUpperCase();

  		this.autoResetRow.label.innerText = text.menu.settings.autoReset[this.main.lang].toUpperCase();
  		if (data.config.autoReset == 1) this.autoResetRow.value.innerText = text.menu.settings.reset[1][this.main.lang].toUpperCase();
  		else if (data.config.autoReset == 2) this.autoResetRow.value.innerText = text.menu.settings.reset[2][this.main.lang].toUpperCase();
  		else if (data.config.autoReset == 3) this.autoResetRow.value.innerText = text.menu.settings.reset[3][this.main.lang].toUpperCase();
  		else this.autoResetRow.value.innerText = text.menu.settings.reset[0][this.main.lang].toUpperCase(); 

  		this.displayHealthRow.label.innerText = text.menu.settings.displayHealth[this.main.lang].toUpperCase();
  		if (data.config.displayHealth == 1) this.displayHealthRow.value.innerText = text.menu.settings.displayHealthOptions[1][this.main.lang].toUpperCase();
  		else if (data.config.displayHealth == 2) this.displayHealthRow.value.innerText = text.menu.settings.displayHealthOptions[2][this.main.lang].toUpperCase();
  		else this.displayHealthRow.value.innerText = text.menu.settings.displayHealthOptions[0][this.main.lang].toUpperCase(); 

  		this.mapEffectsRow.label.innerText = text.menu.settings.mapEffects[this.main.lang].toUpperCase();
  		if (data.config.mapEffects == 1) this.mapEffectsRow.value.innerText = text.menu.settings.mapEffectsOptions[1][this.main.lang].toUpperCase();
  		else if (data.config.mapEffects == 2) this.mapEffectsRow.value.innerText = text.menu.settings.mapEffectsOptions[2][this.main.lang].toUpperCase();
  		else this.mapEffectsRow.value.innerText = text.menu.settings.mapEffectsOptions[0][this.main.lang].toUpperCase(); 

  		// ENDLESS MOD: Wave Info Panel setting
  		this.waveInfoRow.label.innerText = 'WAVE INFO PANEL'; // text.menu.settings.waveInfo
  		this.waveInfoRow.value.innerText = (this.main.UI.waveInfoDisplay) ? text.ui.yes[this.main.lang].toUpperCase() : text.ui.no[this.main.lang].toUpperCase();

  		//SHORTCUTS
  		for (let i = 0; i < 13; i++) {
  			this.shortcutRow[i].label.innerHTML = SHORTCUTS.key[i][this.main.lang].toUpperCase();
  			this.shortcutRow[i].content.innerHTML = SHORTCUTS.do[i][this.main.lang].toUpperCase();
  		}

  		// CREDITS
  		this.developer.label.innerHTML = CREDITS.developer.label[this.main.lang].toUpperCase();
  		this.mapArtist.label.innerHTML = CREDITS.mapArtist.label[this.main.lang].toUpperCase();
  		this.contributors.label.innerHTML = CREDITS.contributors.label[this.main.lang].toUpperCase();
  		this.balance.label.innerHTML = CREDITS.balance.label[this.main.lang].toUpperCase();
  		this.testers.label.innerHTML = CREDITS.testers.label[this.main.lang].toUpperCase();

  		this.traductionsTitle.innerHTML = CREDITS.traductions.title[this.main.lang].toUpperCase();
  		for (let i = 0; i < 4; i++) this.traductionsList[i].label.innerHTML = CREDITS.traductions.label[i][this.main.lang].toUpperCase();

  		this.assetsTitle.innerHTML = CREDITS.assets.title[this.main.lang].toUpperCase();
  		for (let i = 0; i < 7; i++) this.assetsList[i].label.innerHTML = CREDITS.assets.label[i][this.main.lang].toUpperCase();

  		this.disclaimer.innerHTML = CREDITS.disclaimer[this.main.lang]

  		//DATA
  		this.deleteData.innerHTML = text.menu.data.delete[this.main.lang].toUpperCase();
  		this.exportData.innerHTML = text.menu.data.export[this.main.lang].toUpperCase();
		this.importData.innerHTML = text.menu.data.import[this.main.lang].toUpperCase();
	}

	updateLanguage = (dir) => {
		let pos = this.main.lang + dir;
		if (pos < 0) pos = 9;
		else if (pos == 10) pos = 0;

		if (pos == 6) document.body.style.fontFamily = 'PixelMPlus';
		else if (pos == 7) document.body.style.fontFamily = 'NGC';
		else  document.body.style.fontFamily = 'PressStart2P';
		this.main.lang = pos;

        this.update();
        this.main.updateLanguage();

		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.language = pos;
        window.localStorage.setItem("data", JSON.stringify(data));
        playSound('option', 'ui');
  	}

  	updateAudio = (key, dir) => {
  		let value = this.getConfig().audio[key] += dir;
       	if (value < 0) value = 0;
  		else if (value > 20 ) value = 20;

        let config = this.getConfig();
        config.audio[key] = value;
        this.saveConfig(config);
        this.update();
        setVolume();
        playSound('option', 'ui');

        if (
        	!this.main.player.secrets.chatot &&
        	//!this.main.area.waveActive &&
			!this.main.area.inChallenge
        ) {
        	if (config.audio['master'] == 0 && config.audio['music'] == 4 && config.audio['ui'] == 4 && config.audio['effects'] == 1) {
        		this.main.player.secrets.chatot = true;
        		this.main.UI.getSecret('chatot');
        	}
        }
    };

    muteAudio = (pos) => {
    	this.main.mute[pos] = !this.main.mute[pos];

  		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.mute = this.main.mute;
        window.localStorage.setItem("data", JSON.stringify(data));

        this.update();
        playSound('option', 'ui');
    }

    updateAutoReset = (dir) => {
    	let pos = Number(this.main.autoReset) + dir;
		if (pos < 0) pos = 3;
		else if (pos == 4) pos = 0;
		this.main.autoReset = pos;

  		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.autoReset = this.main.autoReset;
        window.localStorage.setItem("data", JSON.stringify(data));

        this.update();
        playSound('option', 'ui');
    };

    updateDisplayHealth = (dir) => {
    	let pos = Number(this.main.displayHealth) + dir;
		if (pos < 0) pos = 2;
		else if (pos == 3) pos = 0;
		this.main.displayHealth = pos;

  		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.displayHealth = this.main.displayHealth;
        window.localStorage.setItem("data", JSON.stringify(data));

        this.update();
        playSound('option', 'ui');
    };

    updateMapEffects = (dir) => {
    	let pos = Number(this.main.mapEffects) + dir;
		if (pos < 0) pos = 2;
		else if (pos == 3) pos = 0;
		this.main.mapEffects = pos;

  		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.mapEffects = this.main.mapEffects;
        window.localStorage.setItem("data", JSON.stringify(data));

        this.update();
        playSound('option', 'ui');
    };

    updateAutoStop = () => {
    	this.main.autoStop = !this.main.autoStop;

  		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.autoStop = this.main.autoStop;
        window.localStorage.setItem("data", JSON.stringify(data));

        this.update();
        playSound('option', 'ui');
    }	

    updateAutoStopBoss = () => {
    	this.main.autoStopBoss = !this.main.autoStopBoss;

  		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.autoStopBoss = this.main.autoStopBoss;
        window.localStorage.setItem("data", JSON.stringify(data));

        this.update();
        playSound('option', 'ui');
    }

    // ENDLESS MOD: Toggle wave info panel
    updateWaveInfo = () => {
    	this.main.UI.toggleWaveInfo();
        this.update();
        playSound('option', 'ui');
    }	

    // updateShowTC = () => {
    // 	this.main.showTC = !this.main.showTC;

  	// 	const data = JSON.parse(window.localStorage.getItem("data"));
    //     data.config.showTC = this.main.showTC;
    //     window.localStorage.setItem("data", JSON.stringify(data));

    //     this.update();
    //     playSound('option', 'ui');
    //     this.main.UI.update();
    // }	

    updateShowDamage = () => {
    	this.main.showDamage = !this.main.showDamage;

  		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.showDamage = this.main.showDamage;
        window.localStorage.setItem("data", JSON.stringify(data));

        this.update();
        playSound('option', 'ui');
    };

    // updateShowRoute = () => {
    // 	this.main.showRoute = !this.main.showRoute;

  	// 	const data = JSON.parse(window.localStorage.getItem("data"));
    //     data.config.showRoute = this.main.showRoute;
    //     window.localStorage.setItem("data", JSON.stringify(data));

    //     this.update();
    //     this.main.UI.update();
    //     playSound('option', 'ui');
    // };

	open() {
		super.open();
		this.update();
		if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}
}

export class DeleteData extends GameScene {
	constructor(main) {
		super(400, 130);
		this.main = main;
		
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
			localStorage.clear();
			window.location.reload();
		})
	}

	update() {
		this.prompt.innerHTML = text.menu.data.deletePrompt[this.main.lang].toUpperCase();;
		this.yesButton.innerText = text.menu.data.delete[this.main.lang].toUpperCase();
		this.noButton.innerText = text.menu.data.cancel[this.main.lang].toUpperCase();
	}

	open() {
		super.open();
		this.update();
	}
}

export class ImportData extends GameScene {
	constructor(main) {
		super(450, 350);
		this.main = main;
		this.newData;
		this.render();
	}

	render() {
		const input = document.createElement("input");
	    input.type = "file";
	    input.accept = ".txt";
	    input.style.display = "none"; 

	    this.uploadButton = document.createElement("button");
	    this.uploadButton.className = 'export-scene-button';
	    this.uploadButton.style.fontFamily ='inherit';
	    this.uploadButton.style.lineHeight ='24px';
	    this.uploadButton.style.height = '26px'

	    this.container.appendChild( this.uploadButton);
	    this.container.appendChild(input);

		this.uploadButton.addEventListener("click", () => input.click());

	    input.addEventListener("change", () => {
		    const archivo = input.files[0];
		    if (!archivo) return;

		    const reader = new FileReader();

		    reader.onload = () => {
		        const texto = reader.result;

		        this.codeInput.value.value = texto;
		    };

		    reader.readAsText(archivo);
		});

		this.prompt = new Element(this.container, { className: 'defeat-scene-prompt' }).element;
		this.importButton = new Element(this.container, { className: 'export-scene-button' }).element;
		this.importMessage = new Element(this.container, { className: 'export-scene-message' }).element;
		this.codeInput = new Input(
			this.container, 
			"text", 
			{ 
				className: "import-export-code",  
			}
		);

		this.importButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })
		this.importButton.addEventListener('click', () => {
			this.newData = decode(this.codeInput.value.value)
			if (this.newData != null) {
				this.main.data = this.newData;
				const data = JSON.parse(window.localStorage.getItem("data"));
			    data.save = {
			        new: false,
			        player: this.newData.player,
			        team: this.newData.team,
			        box: this.newData.box,
			        area: this.newData.area,
			        shop: this.newData.shop,
			        teamManager: this.newData.teamManager,
			    };

			    window.localStorage.setItem("data", JSON.stringify(data));
				window.location.reload();
			} else {
				playSound('pop0', 'ui');
				this.importMessage.innerHTML = text.menu.data.importError[this.main.lang].toUpperCase();
			}
		})
	}

	update() {
		this.prompt.innerHTML = text.menu.data.importPrompt[this.main.lang].toUpperCase();
		this.importButton.innerText = text.menu.data.importButton[this.main.lang].toUpperCase();
		this.uploadButton.textContent = text.menu.data.uploadButton[this.main.lang].toUpperCase();
		this.codeInput.value.value = "";
		this.importMessage.innerHTML = "";
	}

	open() {
		super.open();
		this.update();
	}
}

export class ExportData extends GameScene {
	constructor(main) {
		super(450, 350);
		this.main = main;
		this.code;
		this.render();
	}

	render() {
		this.prompt = new Element(this.container, { className: 'defeat-scene-prompt' }).element;
		this.exportButton = new Element(this.container, { className: 'export-scene-button' }).element;
		this.downloadButton = new Element(this.container, { className: 'export-scene-button' }).element; 

		this.codeInput = new Input(
			this.container, 
			"text", 
			{ 
				className: "import-export-code",  
				readonly: true
			}
		);
		this.exportMessage = new Element(this.container, { className: 'import-scene-message' }).element;
		this.exportButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })
		this.exportButton.addEventListener('click', () => {
		    playSound('key1', 'ui');

		    const tempInput = document.createElement('textarea');
		    tempInput.value = this.code;
		    document.body.appendChild(tempInput);
		    tempInput.select();

		    try {
		        document.execCommand('copy'); 
		        this.exportMessage.innerHTML = text.menu.data.codeCopied[this.main.lang].toUpperCase();
		    } catch (err) {
		        this.exportMessage.innerHTML = 'COPY FAILED, TRY CLICK -> CTRL + A -> CTRL + C';
		    }

		    document.body.removeChild(tempInput); 
		});

		this.downloadButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui') });
	    this.downloadButton.addEventListener('click', () => {
	        playSound('key1', 'ui');

	        const blob = new Blob([this.code], { type: 'text/plain' });
	        const url = URL.createObjectURL(blob);
	        const a = document.createElement('a');
	        a.href = url;
	        a.download = 'PokePathSave.txt'; 
	        document.body.appendChild(a);
	        a.click();
	        document.body.removeChild(a);
	        URL.revokeObjectURL(url);
	    });
	}

	update() {
		this.prompt.innerHTML = text.menu.data.exportPrompt[this.main.lang].toUpperCase();;
		this.exportButton.innerText = text.menu.data.exportButton[this.main.lang].toUpperCase();
		this.downloadButton.innerText = text.menu.data.downloadButton[this.main.lang].toUpperCase();

		const data = JSON.parse(window.localStorage.getItem("data")).save;

		this.code = encode(data);
		this.codeInput.value.value = this.code;
		this.exportMessage.innerHTML = "";
	}


	open() {
		super.open();
		this.update();
	}
}

function encode(data) {
    const json = JSON.stringify(
        data,
        (key, value) => {
            if (value instanceof Set) return { __type: "Set", values: [...value] };
            return value;
        }
    );
    return btoa(unescape(encodeURIComponent(json))); 
}

function decode(code) {
     try {
        const json = decodeURIComponent(escape(atob(code)));
        return JSON.parse(json, (key, value) => {
            if (value && value.__type === "Set") return new Set(value.values);
            return value;
        });
    } catch (err) {
        return null; 
    }
}
