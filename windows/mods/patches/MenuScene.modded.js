import { SectionScene } from '../../utils/SectionScene.js';
import { GameScene } from '../../utils/GameScene.js';
import { Element } from '../../utils/Element.js';
import { text } from '../../file/text.js';
import { playSound, setVolume } from '../../file/audio.js';
import { Input } from '../../utils/Input.js';
import { featureRequiresPlayerCode, getRedeemFeature, resolveRedeemCodeFeature, validateRedeemCode } from '../../utils/Redeem.js';
import { pokemonData } from '../data/pokemonData.js';
import { isSaveExportDisabled } from '../../config.js';
import { applyUITheme, getUIThemeName } from '../controller/ThemeController.js';

const OPTION = {
    language: ['English', 'Español', 'Français', 'Português', 'Italiano', 'Deutsch', '日本語', '한국어', '繁體中文', 'Polski'],
    theme: ['Original', 'Classic', 'Monochrome', 'Halloween'],
    font: ['PressStart2P', 'Rubik', 'Lexend', 'DynaPuff', 'Unown'],
    audio: Array.from({ length: 21 }, (_, i) => (i * 5).toString()),
    reset: [0, 1, 2]
}

const CREDITS = {
	developer: {
		label: ['Developers', 'Desarrolladores', 'Développeurs', 'Desenvolvedores', 'Sviluppatori', 'Entwickler', '開発者', '개발자', '开发者', 'Programiści'],
		content: '<a href="https://x.com/khydra98" target="_blank" class="link-red">KHYDRA</a> <br> <a href="https://x.com/gaudesp" target="_blank" class="link-red">Nox</a> <br> Raguto'
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
		content: 'AncestralZ<br> Irec<br> Revy<br> Sokudo<br> Segmental <br> Artemis'
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
				Skrubboi 
		`
	},
	testers: {
		label: ['Testers', 'Testers', 'Testeurs', 'Testadores', 'Tester', 'Tester', 'テスター', '테스터', '测试员', 'Testerzy'],
		content: '<a href="https://www.youtube.com/@KhytrayerDofus/videos" target="_blank" class="link-red">KHYTRAYER</a><br> SINGA <br> Juiz <br> Schmu <br> Cipo'
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
				"Oficjalna internetowa"
			],
			1: [
				"Community Discord",
				"Discord",
				"Discord",
				"Discord da comunidade",
				"Discord",
				"Community-Discord",
				"コミュニティのDiscord",
				"커뮤니티 디스코드",
				"社区Discord",
				"Discord"
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
				Pokémon Halcyon<br> Pokémon Nightshade<br> Ross-Hawkins<br> Shyinn<br> Skidmarc25<br> TheDeadHeroAlistair<br> Vurtax<br> Zein<br> Zeo`,
			6: ` Sokudo <br> <a href="https://sprites.pmdcollab.org/" target="_blank" class="link-red">PMD COLLAB</a><br>
				◥θ┴θ◤ <br> 0palite <br> 3Monika4 <br> 3P1C <br> A_Lettuce <br> Adrian <br> AikoMaiko 
				<br> Akai <br> AlexGroeger <br> AllPatchedUp <br> Angels-Snack <br> Anon <br> Anonymous <br> Ariakyu 
				<br> Atwer <br> Audino <br> avalancheman <br> Avery <br> Aviivix <br> Axcel <br> Azifel <br> baronessfaron 
				<br> Blanca <br> Blanky <br> Bluetails_the_Buizel <br> brookriver <br> bwappi <br> C_Pariah <br> Caitemis 
				<br> CamusZekeSirius <br> CeleryGuy <br> Chesyon <br> Chi <br> chikorene <br> Child-Of-Hades <br> chime 
				<br> CHUNSOFT <br> CinderedPhoenix <br> Cloudy <br> Cocosquid. <br> Coksi <br> Colistan <br> cosmosully <br> cyboy_bit 
				<br> dariosparks <br> Darkrai <br> Dasawkem <br> DasK <br> Davilos <br> DavKriz <br> Ddragon <br> dede6giu 
				<br> Deeshura <br> Dejais <br> Deleca7755 <br> deltaflare <br> DeltaL <br> Deltex12 <br> distress <br> dmDash 
				<br> drawsstuff <br> Dutch-Spaniard <br>EeveeandVulpix2000<br> El_Pangoro_Parse <br> electronvolt <br>ElGian <br> Eliza   
				<br> Emboarger <br> Emitone <br> Emmuffin <br> eon <br> ErrantWitch <br> estelstarlight <br> EzerArt <br> Fable 
				<br> FalafelPorpoise <br> Fearless-Quit <br> Felis-Licht <br> FerMrack <br> Fingernails <br> Fire_Scyther <br> FissionCube 
				<br> fledermaus <br> FlowerSnek <br> FrivolousAqua <br> Frostdrop1 <br> G〜 <br> Gayschlatt <br> Gelius <br> Ginnie 
				<br> Giru <br> Grimlin <br> gromchurch <br> Gust <br> GustavoMusinTG <br> Hanbei <br> Hemlock <br> HopeBurnsBright2008
				<br> Ichor <br> Inv3rse <br> jackolanternjackalope <br> Jarleypeño <br> Jelly <br> JemDragons <br> JFain <br> Jhony-Rex 
				<br> JkKU　(Jenrikku) <br> JuanmaSG <br> JustAGunk <br> Katach314 <br> Kawaiitron <br> KCN015 <br> Keldaan <br> Kevin0itachi 
				<br> LazerBlitz <br> leafia_barrett <br> LegendaryPhoenix <br> Leif <br> lemongrass <br> LightBlueBlaze <br> Limomon <br> lokatts 
				<br> LornaWR <br> lovefulpup <br> Lovi <br> LT <br> Luca <br> LuchuIsASquirrel <br> Luna-Alex <br> Magu <br> Maruvert 
				<br> MeepTheMareep02 <br> Meganai <br> metalbear <br> Michael12 <br> Miju <br> MilesFarber <br> mixy:3 <br> Mojo <br> Mond 
				<br> MonochromeKirby <br> Moo <br> Mooncaller <br> Morei <br> mothbeanie <br> motherhenna Helen <br> Mr_L <br> mucrush <br> namu 
				<br> nataniel-sama <br> Neat_Neato <br> NeonCityRain <br> NeroIntruder <br> NikolaP <br> Noivern <br> NOLASMOR <br> Noo <br> Novie 
				<br> Okami <br> Orange <br> Palika <br> Pencil <br> PhillipsYoung <br> pi3.14 <br> PikaNiko <br> Pink_no_tori <br> PinkKecleon <br>
				PixlHoopa <br> Pokejavi. <br> Pokenoice <br> PoliteHoppip <br> powercristal <br> Precascer <br> Prismatic <br> programmedsleepstate 
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
		5: ['Z', 'Z', 'W', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z', 'Z'],
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

const settingData = [
	{
		key: 'showDamage',
		options: [0, 1]
	},
	{
		key: 'autoStop',
		options: [0, 1]
	},
	{
		key: 'autoStopBoss',
		options: [0, 1]
	},
	{
		key: 'autoReset',
		options: [0, 1, 2, 3]
	},
	{
		key: 'displayHealth',
		options: [0, 1, 2]
	},
	{
		key: 'mapEffects',
		options: [0, 1, 2]
	},
	{
		key: 'indicatorField',
		options: [0, 1]
	},
	{
		key: 'indicatorShape',
		options: [0, 1]
	},
	{
		key: 'fastTarget',
		options: [0, 1]
	},
	{
		key: 'durationCC',
		options: [0, 1]
	},	
	{
		key: 'particles',
		options: [0, 1]
	},
	{
		key: 'disableTagColors',
		options: [0, 1]
	},

];

const audioKeys = ['master', 'music', 'ui', 'effects'];
const MUTE_ROW_ORDER = [0, 3, 4, 1, 2];
const MUTE_LABELS = {
	3: [
        'Mute Areas',
        'Silenciar áreas',
        'Silencier zones',
        'Silenciar áreas',
        'Silenziare aree',
        'Flächengeräusche stumm',
        '範囲攻撃音をミュート',
        '범위 공격 소리 음소거',
        '靜音範圍攻擊音效',
        'Wycisz dźwięki obszarów'
    ],
    4: [
	    'Mute Beams',
	    'Silenciar rayos',
	    'Couper le son des rayons',
	    'Silenciar raios',
	    'Silenziare i raggi',
	    'Strahlen stummschalten',
	    'ビーム技の音をミュート',
	    '빔 공격 소리 음소거',
	    '靜音光線招式音效',
	    'Wycisz dźwięki promieni'
	],
};

const effectOpacityKeys = [
    'projectiles',
    'areas',
    'beams',
    'waves',
    'auras',
    'bombardment',
    'special'
];

const effectOpacityDefaults = {
    projectiles: 100,
    areas: 100,
    beams: 100,
    waves: 100,
    auras: 50,
    bombardment: 100,
    special: 100
};

const effectOpacityLabels = {
    projectiles: [
        'Projectile Opacity', 'Opacidad proyectiles', 'Opacité projectiles', 'Opacidade projéteis',
        'Opacità dei proiettili', 'Projektil-Deckkraft', '飛び道具の不透明度', '투사체 불투명도', '投射物不透明度', 'Krycie pocisków'
    ],
    areas: [
        'Area Opacity', 'Opacidad áreas', 'Opacité zones', 'Opacidade áreas',
        'Opacità aree', 'Flächen-Deckkraft', '範囲の不透明度', '영역 불투명도', '范围不透明度', 'Krycie obszarów'
    ],
    beams: [
	    'Beam Opacity', 'Opacidad de los rayos', 'Opacité des rayons', 'Opacidade dos raios',
	    'Opacità dei raggi', 'Strahlen-Deckkraft', 'ビームの不透明度', '빔 불투명도', '光線不透明度', 'Krycie promieni'
	],
    waves: [
        'Wave Opacity', 'Opacidad ondas', 'Opacité ondes', 'Opacidade ondas',
        'Opacità onde', 'Wellen-Deckkraft', '波の不透明度', '파동 불투명도', '波动不透明度', 'Krycie fal'
    ],
    auras: [
        'Aura Opacity', 'Opacidad de auras', 'Opacité auras', 'Opacidade auras',
        'Opacità aure', 'Aura-Deckkraft', 'オーラの不透明度', '오라 불투명도', '光环不透明度', 'Krycie aur'
    ],
    bombardment: [
        'Bombardment Opacity', 'Opacidad bombardeo', 'Opacité bombardement', 'Opacidade bombardeio',
        'Opacità bombardamento', 'Bombardement-Deckkraft', '爆撃の不透明度', '폭격 불투명도', '轰炸不透明度', 'Krycie bombardowania'
    ],
    special: [
	    'Special Attack Opacity', 'Opacidad ataques especiales', 'Opacité attaques spéciales', 'Opacidade ataques especiais',
	    'Opacità attacchi speciali', 'Deckkraft Spezialattacken', '特殊攻撃の不透明度', '특수 공격 불투명도', '特殊攻击不透明度', 'Krycie specjalnych'
	]
};

export class MenuScene extends SectionScene {
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

    createSection(parent) {
		const section = new Element(parent, { className: 'menu-scene-section stroke' }).element;
		const title = new Element(section, { className: 'menu-scene-section-title stroke' }).element;
		const content = new Element(section, { className: 'menu-scene-section-content stroke' }).element;
		return { section, title, content };
	}

	createArrowRow(parent) {
		const row = new Element(parent, { className: 'menu-scene-row stroke' }).element;
		row.label = new Element(row, { className: 'menu-scene-label stroke' }).element;
		row.prev = new Element(row, { className: 'menu-scene-arrow stroke', text: '<' }).element;
		row.value = new Element(row, { className: 'menu-scene-value stroke' }).element;
		row.next = new Element(row, { className: 'menu-scene-arrow stroke', text: '>' }).element;
		return row;
	}

	createSliderRow(parent) {
		const row = new Element(parent, { className: 'menu-scene-row menu-scene-audio-row' }).element;

		row.label = new Element(row, { className: 'menu-scene-label' }).element;

		row.slider = document.createElement('input');
		row.slider.type = 'range';
		row.slider.min = '0';
		row.slider.max = '20';
		row.slider.step = '1';
		row.slider.className = 'menu-scene-audio-slider';

		row.value = new Element(row, { className: 'menu-scene-value' }).element;

		row.appendChild(row.slider);

		row.slider.addEventListener('input', () => {
			const key = row.audioKey;
			const value = Number(row.slider.value);

			const config = this.getConfig();
			config.audio[key] = value;
			this.saveConfig(config);

			row.value.innerText = value;

			setVolume();
		});

		row.slider.addEventListener('change', () => {
			playSound('option', 'ui');

			const config = this.getConfig();

			if (
				!this.main.player.secrets.chatot &&
				!this.main.area.inChallenge
			) {
				if (
					config.audio.master == 0 &&
					config.audio.music == 4 &&
					config.audio.ui == 4 &&
					config.audio.effects == 1
				) {
					this.main.player.secrets.chatot = true;
					this.main.UI.getSecret('chatot');
				}
			}
		});

		return row;
	}

	createOpacitySliderRow(parent, key) {
	    const row = new Element(parent, {
	        className: 'menu-scene-row menu-scene-audio-row'
	    }).element;

	    row.label = new Element(row, {
	        className: 'menu-scene-label'
	    }).element;

	    row.slider = document.createElement('input');
	    row.slider.type = 'range';
	    row.slider.min = '0';
	    row.slider.max = '100';
	    row.slider.step = '5';
	    row.slider.className = 'menu-scene-audio-slider';

	    row.value = new Element(row, {
	        className: 'menu-scene-value'
	    }).element;

	    row.opacityKey = key;
	    row.appendChild(row.slider);

	    row.slider.addEventListener('input', () => {
	        const value = Number(row.slider.value);
	        const config = this.getConfig();

	        config.effectOpacity = {
	            ...effectOpacityDefaults,
	            ...(config.effectOpacity ?? {}),
	            [key]: value
	        };

	        this.saveConfig(config);

	        this.main.effectOpacity = {
	            ...config.effectOpacity
	        };

	        row.value.innerText = `${value}%`;
	    });

	    row.slider.addEventListener('change', () => {
	        playSound('option', 'ui');
	    });

	    return row;
	}

	createOptionRow(parent, options, cb) {
		const row = new Element(parent, {
			className: 'menu-scene-row menu-scene-option-row'
		}).element;

		row.label = new Element(row, {
			className: 'menu-scene-label'
		}).element;

		row.options = new Element(row, {
			className: 'menu-scene-option-buttons'
		}).element;

		row.buttons = [];

		options.forEach((option, i) => {
	        const button = new Element(row.options, {
	            className: 'menu-scene-option-button'
	        }).element;

	        button.addEventListener('click', () => {
	            cb(i);
	        });

	        button.addEventListener('mouseenter', () => {
	            playSound('hover1', 'ui');
	        });

	        row.buttons.push(button);
	    });

		return row;
	}

	updateSetting = (key, value) => {
	    const config = this.getConfig();

	    config[key] = value;
	    this.saveConfig(config);

	    this.main[key] = value;
	    if (key === 'disableTagColors') {
	        document.body.classList.toggle('disable-tag-colors', Boolean(value));
	    }

	    if (
	        key === 'indicatorField' ||
	        key === 'indicatorShape' ||
	        key === 'fastTarget'
	    ) {
	        this.main.UI.updatePokemon();
	    }

	    this.update();
	    playSound('option', 'ui');
	};

	createLabelValueRow(parent, creditStyle = false) {
		const row = new Element(parent, { className: creditStyle ? 'menu-scene-credit-row' : 'menu-scene-row' }).element;
		row.label = new Element(row, { className: 'menu-scene-label' }).element;
		row.content = new Element(row, { className: 'menu-scene-value-credits' }).element;
		return row;
	}

	bindArrowEvents(row, onPrev, onNext, hoverSound = 'hover1') {
		if (onPrev) row.prev.addEventListener('click', onPrev);
		if (onNext) row.next.addEventListener('click', onNext);
		const hover = () => playSound(hoverSound, 'ui');
		row.prev.addEventListener('mouseenter', hover);
		row.next.addEventListener('mouseenter', hover);
	}

	makeButton(parent, className, onClick, hoverSound = 'hover2') {
		const el = new Element(parent, { className }).element;
		if (onClick) el.addEventListener('click', onClick);
		el.addEventListener('mouseenter', () => playSound(hoverSound, 'ui'));
		return el;
	}

	render() {
		this.menuContainer = new Element(this.container, { className: 'menu-scene-container' }).element;

		this.renderOfficial();
		this.renderSettings();
		this.renderAudio();
		this.renderShortcuts();
		this.renderData();
		this.renderCredits();
	}

	renderOfficial() {
		const { section, title, content } = this.sectionOfficial = this.createSection(this.menuContainer);
		this.titleOfficial = title;
		this.contentOfficial = content;

		this.officialWeb = this.createLabelValueRow(content);
		this.officialDiscord = this.createLabelValueRow(content);
		this.officialItchio = this.createLabelValueRow(content);

		this.officialWeb.content.innerHTML = CREDITS.official.content[0];
		this.officialDiscord.content.innerHTML = CREDITS.official.content[1];
		this.officialItchio.content.innerHTML = CREDITS.official.content[2];
	}

	renderSettings() {
	    const { section, title, content } = this.sectionSettings = this.createSection(this.menuContainer);

	    this.titleSettings = title;
	    this.contentSettings = content;

	    // LANGUAGE
	    this.languageRow = this.createArrowRow(content);

	    this.bindArrowEvents(
	        this.languageRow,
	        () => this.updateLanguage(-1),
	        () => this.updateLanguage(1)
	    );

	    // THEME
		this.themeRow = this.createArrowRow(content);

		this.bindArrowEvents(
		    this.themeRow,
		    () => this.updateTheme(-1),
		    () => this.updateTheme(1)
		);

		// FONT
		this.fontRow = this.createArrowRow(content);

		this.bindArrowEvents(
		    this.fontRow,
		    () => this.updateFont(-1),
		    () => this.updateFont(1)
		);

	    // SETTINGS
	    this.settingsRow = [];

	    settingData.forEach(setting => {
	        const row = this.createOptionRow(
	            content,
	            setting.options,
	            (value) => this.updateSetting(setting.key, value)
	        );

	        row.key = setting.key;
	        row.label.innerHTML = text.menu.settings[row.key].label[this.main.lang].toUpperCase();

	        this.settingsRow.push(row);
	    });

	    this.effectOpacityRow = [];

		effectOpacityKeys.forEach(key => {
		    const row = this.createOpacitySliderRow(content, key);
		    this.effectOpacityRow.push(row);
		});
	}

	renderAudio() {
		const { section, title, content } = this.sectionAudio = this.createSection(this.menuContainer);
		this.titleAudio = title;
		this.contentAudio = content;

		this.audioRow = [];

		for (let i = 0; i < audioKeys.length; i++) {
			const row = this.createSliderRow(content);
			row.audioKey = audioKeys[i];
			this.audioRow.push(row);
		}

		this.main.mute = {
		    0: false, // Projectiles
		    1: false, // Teleport
		    2: false, // Shiny
		    3: false, // Beams
		    4: false, // Areas
		    ...(this.main.mute ?? {})
		};

		this.muteRow = [];

		MUTE_ROW_ORDER.forEach(muteIndex => {
		    const row = this.createOptionRow(
		        content,
		        [0, 1],
		        value => this.muteAudio(muteIndex, value)
		    );

		    row.muteIndex = muteIndex;
		    this.muteRow.push(row);
		});
	}

	renderShortcuts() {
		const { section, title, content } = this.sectionShortcuts = this.createSection(this.menuContainer);
		this.titleShortcuts = title;
		this.contentShortcuts = content;

		this.shortcutRow = [];
		for (let i = 0; i < 13; i++) {
			const row = new Element(content, { className: 'menu-scene-row' }).element;
			row.label = new Element(row, { className: 'menu-scene-label' }).element;
			row.content = new Element(row, { className: 'menu-scene-value-credits' }).element;
			this.shortcutRow.push(row);
		}
	}

	renderData() {
		const { section, title, content } = this.sectionData = this.createSection(this.menuContainer);
		this.titleData = title;
		this.contentData = content;

		const redeemRow = new Element(content, { className: 'menu-scene-redeem-row-data' }).element;
		this.redeemCodeInput = new Input(redeemRow, "text", { className: 'menu-scene-redeem-input-data', maxlength: 64 });
		this.validateRedeemButton = new Element(redeemRow, { className: 'menu-scene-redeem-submit-data' }).element;
		this.validateRedeemButton.addEventListener('click', () => this.handleRedeemCode());
		this.validateRedeemButton.addEventListener('mouseenter', () => playSound('hover2', 'ui'));

		this.redeemCodeMessage = new Element(content, { className: 'menu-scene-redeem-feedback' }).element;

		this.deleteData = this.makeButton(content, 'menu-scene-delete-data', () => this.deleteScene.open());
		this.copyPlayerCodeData = this.makeButton(content, 'menu-scene-copy-player-code', () => this.copyPlayerCode());
		this.exportData = this.makeButton(content, 'menu-scene-export-data', () => {
			if (isSaveExportDisabled()) return;
			this.exportScene.open();
		});
		this.importData = this.makeButton(content, 'menu-scene-import-data stroke', () => this.importScene.open());
		this.syncExportDataButtonState();

		this.version = new Element(section, { className: 'menu-scene-version stroke', text: `v 1.7.0` }).element;
	}

	syncExportDataButtonState() {
		if (!this.exportData) return;

		const isDisabled = isSaveExportDisabled();
		this.exportData.classList.toggle('disabled', isDisabled);
		this.exportData.setAttribute('aria-disabled', isDisabled ? 'true' : 'false');
	}

	makeButton(parent, className, onClick) {
		return this.makeButtonWithHover(parent, className, onClick);
	}

	makeButtonWithHover(parent, className, onClick, hoverSound = 'hover2') {
		const el = new Element(parent, { className }).element;
		if (onClick) el.addEventListener('click', onClick);
		el.addEventListener('mouseenter', () => playSound(hoverSound, 'ui'));
		return el;
	}

	renderCredits() {
		const { section, title, content } = this.sectionCredits = this.createSection(this.menuContainer);
		this.titleCredits = title;
		this.contentCredits = content;

		this.developer = this.createLabelValueRow(content, true);
		this.developer.content.innerHTML = CREDITS.developer.content;

		this.mapArtist = this.createLabelValueRow(content);
		this.mapArtist.content.innerHTML = CREDITS.mapArtist.content;

		this.balance = this.createLabelValueRow(content, true);
		this.balance.content.innerHTML = CREDITS.balance.content;

		this.contributors = this.createLabelValueRow(content, true);
		this.contributors.content.innerHTML = CREDITS.contributors.content;

		this.testers = this.createLabelValueRow(content, true);
		this.testers.content.innerHTML = CREDITS.testers.content;

		this.traductionsContainer = new Element(content, { className: 'menu-scene-credits-container' }).element;
		this.traductionsTitle = new Element(this.traductionsContainer, { className: 'menu-scene-credits-title' }).element;
		this.traductionsList = [];
		for (let i = 0; i < 4; i++) {
			const r = new Element(this.traductionsContainer, { className: 'menu-scene-credit-row' }).element;
			r.label = new Element(r, { className: 'menu-scene-label' }).element;
			r.content = new Element(r, { className: 'menu-scene-value-credits' }).element;
			this.traductionsList.push(r);
			this.traductionsList[i].content.innerHTML = CREDITS.traductions.content[i];
		}

		this.assetsContainer = new Element(content, { className: 'menu-scene-credits-container' }).element;
		this.assetsTitle = new Element(this.assetsContainer, { className: 'menu-scene-credits-title' }).element;
		this.assetsList = [];
		for (let i = 0; i < 7; i++) {
			const r = new Element(this.assetsContainer, { className: 'menu-scene-credit-row' }).element;
			r.label = new Element(r, { className: 'menu-scene-label' }).element;
			r.content = new Element(r, { className: 'menu-scene-value-credits' }).element;
			this.assetsList.push(r);
			this.assetsList[i].content.innerHTML = CREDITS.assets.content[i];
		}

		this.disclaimer = new Element(this.contentCredits, { className: 'menu-credits-disclaimer' }).element;
	}

	update() {
		const data = JSON.parse(window.localStorage.getItem("data"));

		this.titleOfficial.innerHTML = text.menu.official.title[this.main.lang].toUpperCase();
		this.titleSettings.innerHTML = text.menu.settings.title[this.main.lang].toUpperCase();
		this.titleAudio.innerHTML = text.menu.audio.title[this.main.lang].toUpperCase();
		this.titleCredits.innerHTML = text.menu.credits.title[this.main.lang].toUpperCase();
		this.titleShortcuts.innerHTML = text.menu.shortcuts.title[this.main.lang].toUpperCase();
		this.titleData.innerHTML = text.menu.data.title[this.main.lang].toUpperCase();

		this.officialWeb.label.innerHTML = CREDITS.official.label[0][this.main.lang].toUpperCase();
		this.officialDiscord.label.innerHTML = CREDITS.official.label[1][this.main.lang].toUpperCase();
		this.officialItchio.label.innerHTML = CREDITS.official.label[2][this.main.lang].toUpperCase();

		this.languageRow.label.innerText = text.menu.settings.language[this.main.lang].toUpperCase();
		this.languageRow.value.innerText = OPTION.language[this.main.lang].toUpperCase();

		const audioConfig = this.getConfig().audio;

		for (let i = 0; i < this.audioRow.length; i++) {
			const row = this.audioRow[i];
			const value = Number(audioConfig[audioKeys[i]] ?? 20);

			row.label.innerHTML = text.menu.settings.audio[i][this.main.lang].toUpperCase();
			row.slider.value = value;
			row.value.innerText = value;
		}

		for (const row of this.muteRow) {
		    const muteIndex = row.muteIndex;

		    const label = muteIndex < 3
		        ? text.menu.settings.mute[muteIndex][this.main.lang]
		        : MUTE_LABELS[muteIndex][this.main.lang];

		    const isMuted = Boolean(this.main.mute[muteIndex]);

		    row.label.innerHTML = label.toUpperCase();

		    row.buttons.forEach((button, buttonIndex) => {
		        button.innerHTML = buttonIndex === 1 ? 'ON' : 'OFF';

		        button.classList.remove(
		            'selected',
		            'selected-off',
		            'selected-on'
		        );

		        if (buttonIndex === Number(isMuted)) {
		            button.classList.add('selected');
		            button.classList.add(
		                buttonIndex === 0 ? 'selected-off' : 'selected-on'
		            );
		        }
		    });
		}

		const config = this.getConfig();

		this.languageRow.label.innerHTML = text.menu.settings.language[this.main.lang].toUpperCase();
		this.languageRow.value.innerHTML = OPTION.language[this.main.lang];

		this.themeRow.label.innerHTML = text.menu.settings.theme[this.main.lang].toUpperCase();
		this.themeRow.value.innerHTML = text.menu.settings.themes[this.main.uiTheme][this.main.lang].toUpperCase();

		this.themeRow.label.innerHTML = text.menu.settings.theme[this.main.lang].toUpperCase();
		this.themeRow.value.innerHTML = text.menu.settings.themes[this.main.uiTheme][this.main.lang].toUpperCase();

		this.fontRow.label.innerHTML = text.menu.settings.font[this.main.lang].toUpperCase();
		this.fontRow.value.innerHTML = text.menu.settings.fonts[config.font][this.main.lang].toUpperCase();

		this.settingsRow.forEach(row => {
		    const key = row.key;
		    const value = Number(config[key] ?? 0);

		    row.label.innerHTML = text.menu.settings[key].label[this.main.lang].toUpperCase();

		    row.buttons.forEach((button, i) => {
		        button.innerHTML =
		            text.menu.settings[key][i][this.main.lang].toUpperCase();

		        button.classList.remove('selected', 'selected-off', 'selected-on');

		        if (i === value) {
		            button.classList.add('selected');

		            if (i === 0) {
		                button.classList.add('selected-off');
		            } else {
		                button.classList.add('selected-on');
		            }
		        }
		    });
		});

		const opacityConfig = {
		    ...effectOpacityDefaults,
		    ...(config.effectOpacity ?? {})
		};

		this.main.effectOpacity = {
		    ...opacityConfig
		};

		this.effectOpacityRow.forEach(row => {
		    const key = row.opacityKey;

		    row.label.innerText =
		        effectOpacityLabels[key][this.main.lang].toUpperCase();

		    const value = Number(opacityConfig[key] ?? 100);

		    row.slider.value = value;
		    row.value.innerText = `${value}%`;
		});

		for (let i = 0; i < this.shortcutRow.length; i++) {
			this.shortcutRow[i].label.innerHTML = SHORTCUTS.key[i][this.main.lang].toUpperCase();
			this.shortcutRow[i].content.innerHTML = SHORTCUTS.do[i][this.main.lang].toUpperCase();
		}

		this.developer.label.innerHTML = CREDITS.developer.label[this.main.lang].toUpperCase();
		this.mapArtist.label.innerHTML = CREDITS.mapArtist.label[this.main.lang].toUpperCase();
		this.contributors.label.innerHTML = CREDITS.contributors.label[this.main.lang].toUpperCase();
		this.balance.label.innerHTML = CREDITS.balance.label[this.main.lang].toUpperCase();
		this.testers.label.innerHTML = CREDITS.testers.label[this.main.lang].toUpperCase();

		this.traductionsTitle.innerHTML = CREDITS.traductions.title[this.main.lang].toUpperCase();
		for (let i = 0; i < this.traductionsList.length; i++) {
			this.traductionsList[i].label.innerHTML = CREDITS.traductions.label[i][this.main.lang].toUpperCase();
		}

		this.assetsTitle.innerHTML = CREDITS.assets.title[this.main.lang].toUpperCase();
		for (let i = 0; i < this.assetsList.length; i++) {
			this.assetsList[i].label.innerHTML = CREDITS.assets.label[i][this.main.lang].toUpperCase();
		}

		this.disclaimer.innerHTML = CREDITS.disclaimer[this.main.lang];

		this.deleteData.innerHTML = text.menu.data.delete[this.main.lang].toUpperCase();
		this.exportData.innerHTML = text.menu.data.export[this.main.lang].toUpperCase();
		this.importData.innerHTML = text.menu.data.import[this.main.lang].toUpperCase();
		this.copyPlayerCodeData.innerHTML = text.menu.data.copyPlayerCode[this.main.lang].toUpperCase();
		this.syncExportDataButtonState();
		this.validateRedeemButton.innerHTML = text.menu.data.validateRedeem[this.main.lang].toUpperCase();
		this.redeemCodeInput.value.placeholder = text.menu.data.redeemCodePlaceholder[this.main.lang].toUpperCase();
		this.redeemCodeMessage.innerText = '';
	}

	updateLanguage = (dir) => {
		let pos = this.main.lang + dir;
		if (pos < 0) pos = 9;
		else if (pos == 10) pos = 0;

		// if (pos == 6) document.body.style.fontFamily = 'PixelMPlus';
		// else if (pos == 7) document.body.style.fontFamily = 'NGC';
		// else  document.body.style.fontFamily = 'PressStart2P';
		this.main.lang = pos;

        this.update();
        this.main.updateLanguage();

		const data = JSON.parse(window.localStorage.getItem("data"));
        data.config.language = pos;
        window.localStorage.setItem("data", JSON.stringify(data));
        playSound('option', 'ui');
  	}

  	updateTheme = (dir) => {
	    let pos = Number(this.main.uiTheme) + dir;

	    if (pos < 0) pos = OPTION.theme.length - 1;
	    else if (pos >= OPTION.theme.length) pos = 0;

	    this.main.uiTheme = pos;

	    const data = JSON.parse(window.localStorage.getItem("data"));
	    data.config.uiTheme = pos;
	    window.localStorage.setItem("data", JSON.stringify(data));

	    applyUITheme(getUIThemeName(pos));

	    this.update();
	    this.main.UI.update();
	    playSound('option', 'ui');
	};

	updateFont = (dir) => {
	    const config = this.getConfig();

	    let pos = Number(config.font ?? 0) + dir;

	    if (pos < 0) pos = OPTION.font.length - 1;
	    else if (pos >= OPTION.font.length) pos = 0;

	    config.font = pos;
	    this.main.font = pos;
	    this.saveConfig(config);

	    this.applyFont();

	    this.update();
	    playSound('option', 'ui');
	};

	applyFont = () => {
	    const config = this.getConfig();
	    const font = OPTION.font[Number(config.font ?? 0)];
	    document.body.dataset.font = font;
	    document.body.style.fontFamily = `'${font}'`;
	};

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
			!this.main.area.inChallenge
        ) {
        	if (config.audio['master'] == 0 && config.audio['music'] == 4 && config.audio['ui'] == 4 && config.audio['effects'] == 1) {
        		this.main.player.secrets.chatot = true;
        		this.main.UI.getSecret('chatot');
        	}
        }
    };

    muteAudio = (pos, value) => {
	    this.main.mute[pos] = Number(value) === 1;

	    const data = JSON.parse(window.localStorage.getItem('data'));

	    data.config.mute = {
	        0: false,
	        1: false,
	        2: false,
	        3: false,
	        4: false,
	        ...(data.config.mute ?? {}),
	        ...this.main.mute
	    };

	    this.main.mute = data.config.mute;

	    window.localStorage.setItem('data', JSON.stringify(data));

	    this.update();
	    playSound('option', 'ui');
	};

	open() {
		if (this.isOpen) return this.close();
		this.main?.sections.forEach(section => {
			if (section?.isOpen && section != this) section.close();
		})
		
		super.open();
		this.update();
		this.main.UI.section['menu'].classList.add('is-selected');
		if (this.main.game.deployingUnit != undefined) this.main.game.cancelDeployUnit()
		if (this.main.UI.fastScene.isOpen) this.main.UI.fastScene.close();
	}

	close() {
		super.close();
		this.main.UI.section['menu'].classList.remove('is-selected');
	}

	async copyPlayerCode() {
		const playerCode = await this.main.player.getPlayerCode();
		if (!playerCode) return;

		let copied = false;
		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(playerCode);
				copied = true;
			}
		} catch (err) {
			copied = false;
		}

		if (!copied) {
			const tempInput = document.createElement('textarea');
			tempInput.value = playerCode;
			document.body.appendChild(tempInput);
			tempInput.select();
			try {
				document.execCommand('copy');
				copied = true;
			} catch (err) {
				copied = false;
			}
			document.body.removeChild(tempInput);
		}

		playSound('key1', 'ui');
		const previous = text.menu.data.copyPlayerCode[this.main.lang].toUpperCase();
		this.copyPlayerCodeData.innerText = copied
			? text.menu.data.codeCopied[this.main.lang].toUpperCase()
			: previous;
		setTimeout(() => {
			this.copyPlayerCodeData.innerText = previous;
		}, 1200);
	}


	playerHasPokemon(pokemonKey) {
	    const specie = pokemonData[pokemonKey];
	    if (!specie) return false;

	    const pokemonId = specie.id;
	    if (typeof pokemonId !== "number") return false;

	    const playerPokemon = [
	        ...this.main.team.pokemon,
	        ...this.main.box.pokemon
	    ];

	    return playerPokemon.some(poke =>
	        poke?.id === pokemonId ||
	        poke?.specie?.id === pokemonId
	    );
	}
	setRedeemMessage(message, ok = false) {
		this.redeemCodeMessage.style.color = ok ? 'var(--green)' : 'var(--red)';
		this.redeemCodeMessage.innerText = message.toUpperCase();
	}

	redeemReward(featureId) {
		const feature = getRedeemFeature(featureId);
		if (!feature) {
			return { ok: false, message: text.menu.data.redeemUnavailable[this.main.lang] };
		}

		if (this.main.player.hasRedeemedReward(feature.id)) {
			return { ok: false, message: text.menu.data.redeemAlreadyOwned[this.main.lang] };
		}

		const reward = feature.reward;
		if (reward.kind === 'pokemon') {
			if (!pokemonData[reward.key]) {
				return { ok: false, message: text.menu.data.redeemUnavailable[this.main.lang] };
			}
			if (this.playerHasPokemon(reward.key)) {
				this.main.player.markRewardAsRedeemed(feature.id);
				return { ok: false, message: text.menu.data.redeemAlreadyOwned[this.main.lang] };
			}
			this.main.UI.getSecret(reward.key);
		} else if (reward.kind === 'currency' && reward.currency === 'gold') {
			this.main.player.changeGold(reward.amount);
		} else if (reward.kind === 'map') {
			this.main.player.secretMaps[reward.secret] = true;
			this.main.UI.getSecretMap(reward.id); 
		} else {
			return { ok: false, message: text.menu.data.redeemUnavailable[this.main.lang] };
		}

		this.main.player.markRewardAsRedeemed(feature.id);
		return { ok: true, message: text.menu.data.redeemSuccess[this.main.lang] };
	}

	async handleRedeemCode() {
		const redeemCode = this.redeemCodeInput.value.value.trim().toUpperCase();
		if (!redeemCode) {
			playSound('pop0', 'ui');
			this.setRedeemMessage(text.menu.data.redeemInvalidFormat[this.main.lang], false);
			return;
		}

		const resolvedFeature = resolveRedeemCodeFeature(redeemCode);
		if (!resolvedFeature.ok) {
			playSound('pop0', 'ui');
			if (resolvedFeature.reason === 'invalid_format') {
				this.setRedeemMessage(text.menu.data.redeemInvalidFormat[this.main.lang], false);
			} else {
				this.setRedeemMessage(text.menu.data.redeemUnavailable[this.main.lang], false);
			}
			return;
		}

		const featureId = resolvedFeature.featureId;
		let playerCode = null;
		if (featureRequiresPlayerCode(featureId)) {
			playerCode = await this.main.player.getPlayerCode();
			if (!playerCode) {
				playSound('pop0', 'ui');
				this.setRedeemMessage(text.menu.data.redeemUnavailable[this.main.lang], false);
				return;
			}
		}

		const validation = await validateRedeemCode(featureId, playerCode, redeemCode);
		if (!validation.ok) {
			playSound('pop0', 'ui');
			if (validation.reason === 'invalid_format') {
				this.setRedeemMessage(text.menu.data.redeemInvalidFormat[this.main.lang], false);
			} else if (validation.reason === 'invalid_feature' || validation.reason === 'unknown_feature') {
				this.setRedeemMessage(text.menu.data.redeemUnavailable[this.main.lang], false);
			} else {
				this.setRedeemMessage(text.menu.data.redeemInvalidProfile[this.main.lang], false);
			}
			return;
		}

		const redeemResult = this.redeemReward(featureId);

		if (!redeemResult.ok) {
			playSound('pop0', 'ui');
			this.setRedeemMessage(redeemResult.message, false);
			return;
		}

		playSound('purchase', 'ui');
		this.redeemCodeInput.value.value = '';
		this.setRedeemMessage(redeemResult.message, true);
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
		this.prompt = new Element(this.container, { className: 'defeat-scene-prompt stroke' }).element;
		
		this.yesButton = new Element(this.container, { className: 'delete-scene-yes-button stroke' }).element;
		this.noButton = new Element(this.container, { className: 'delete-scene-no-button stroke' }).element;

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
		if (this.main.font === 4) return playSound('pop0', 'ui');
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
	    this.uploadButton.className = 'export-scene-button stroke';
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

		this.prompt = new Element(this.container, { className: 'defeat-scene-prompt stroke' }).element;
		this.importButton = new Element(this.container, { className: 'export-scene-button stroke' }).element;
		this.importMessage = new Element(this.container, { className: 'export-scene-message stroke' }).element;
		this.codeInput = new Input(
			this.container, 
			"text", 
			{ 
				className: "import-export-code stroke",  
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
		if (this.main.font === 4) return playSound('pop0', 'ui');
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
		this.prompt = new Element(this.container, { className: 'defeat-scene-prompt stroke' }).element;
		this.exportButton = new Element(this.container, { className: 'export-scene-button stroke' }).element;
		this.downloadButton = new Element(this.container, { className: 'export-scene-button stroke' }).element; 

		this.codeInput = new Input(
			this.container, 
			"text", 
			{ 
				className: "import-export-code stroke",  
				readonly: true
			}
		);
		this.exportMessage = new Element(this.container, { className: 'import-scene-message stroke' }).element;
		this.exportButton.addEventListener('mouseenter', () => { playSound('hover2', 'ui') })
		this.exportButton.addEventListener('click', () => {
			if (isSaveExportDisabled()) return;
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
	    	if (isSaveExportDisabled()) return;
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
		if (this.main.font === 4) return playSound('pop0', 'ui');
		if (isSaveExportDisabled()) return;
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
