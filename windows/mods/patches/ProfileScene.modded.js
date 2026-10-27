import { GameScene } from '../../utils/GameScene.js';
import { SectionScene } from '../../utils/SectionScene.js';

import { Element } from '../../utils/Element.js';
import { Input } from '../../utils/Input.js';
import { text } from '../../file/text.js';
import { playSound } from '../../file/audio.js';

import { pokemonData, eggListData } from '../data/pokemonData.js';
import { itemData } from '../data/itemData.js';
import { routeData } from '../data/routeData.js';
import { achievementReworkData } from '../data/achievementReworkData.js';


const CHALLENGE_REWARD_RIBBON_COSTS = [2, 3, 5, 1];
// Every obtainable secret line in the 1.7.0 pokemonData secretPokemon export.
// Cacturne is represented by its unlock-time base form, Cacnea.
const SECRET_POKEMON_KEYS = [
	//achievements
	'shaymin', 'celebi', 'lunala', 'zapdos', 'moltres', 'articuno', 'regirock', 'groudon', 'hooh', 'registeel', 'regice', 'regigigas', 
	'kyogre', 'thundurus', 'tapuFini', 'nihilego', 'tapuKoko', 'tapuBulu', 'tapuLele', 'keldeo', 'heatran', 'landorus', 'volcanion', 'pheromosa', 
	'cobalion', 'stakataka', 'tornadus', 'magearna', 'diancie', 'terrakion', 'virizion', 

	'shedinja', 'gholdengo', 'unown',

	'greavard', 'cacnea', 'dhelmise', 'manaphy', 'phione', 'marshadow', 'ducklett', 'sandygast', 'victini', 'bronzor', 'spiritomb', 'farfetchdGalar', 'calyrex',

	'chatot', 'luvdisc', 'tyrunt', 
	'corsolaGalar', 'sneaselHisui', 'samurottHisui', 'wooper', 'minior', 'mew',

	'pumpkaboo', 'spectrier', 
	// codes
	'ironThorns', 'sandyShocks', 'ironBundle', 'flutterMane','missingNo',
];

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
	findHiddenItem: ["Click the hidden item on {route}, outside challenges with no wave active.","Haz clic en el objeto oculto de {route}, fuera de desafíos y sin oleadas activas.","Cliquez sur l’objet caché de {route}, hors défi et sans vague active.","Clique no item escondido em {route}, fora de desafios e sem onda ativa.","Clicca sull’oggetto nascosto in {route}, fuori dalle sfide e senza ondate attive.","Klicke auf das versteckte Item auf {route}, außerhalb von Herausforderungen und ohne aktive Welle.","チャレンジ外でウェーブがない時に、{route}の隠された道具をクリックする。","챌린지 밖에서 웨이브가 없을 때 {route}의 숨겨진 도구를 클릭하세요.","在非挑战模式且没有波次进行时，点击{route}的隐藏道具。","Kliknij ukryty przedmiot na {route}, poza wyzwaniem i bez aktywnej fali."],
	wooperExplosion: ["Let an Explosion user reduce your health to zero (or trigger the auto-reset threshold).","Deja que un usuario de Explosión reduzca tu salud a cero (o active el reinicio automático).","Laissez un utilisateur d’Explosion réduire vos PV à zéro (ou déclencher le redémarrage automatique).","Deixe um usuário de Explosão reduzir sua vida a zero (ou acionar o reinício automático).","Lascia che un utilizzatore di Esplosione riduca la salute a zero (o attivi il riavvio automatico).","Lass einen Explosions-Nutzer deine Gesundheit auf null senken (oder den automatischen Neustart auslösen).","だいばくはつで体力を0にする（または自動リセットの条件を満たす）。","대폭발로 체력을 0으로 만들거나 자동 재시작 조건을 발동시키세요.","让大爆炸使用者将生命降至零，或触发自动重置阈值。","Pozwól użytkownikowi Eksplozji obniżyć zdrowie do zera lub uruchomić automatyczny reset."],
	unownConversation: ["Open Unown’s Compendium entry and answer its five questions using the search box. Progress: {count}/5.","Abre la entrada de Unown en el compendio y responde sus cinco preguntas en el buscador. Progreso: {count}/5.","Ouvrez la fiche d’Unown dans le compendium et répondez aux cinq questions dans la recherche. Progression : {count}/5.","Abra a entrada de Unown no compêndio e responda às cinco perguntas na busca. Progresso: {count}/5.","Apri la voce di Unown nel compendio e rispondi alle cinque domande nella ricerca. Progresso: {count}/5.","Öffne Unowns Kompendium-Eintrag und beantworte die fünf Fragen im Suchfeld. Fortschritt: {count}/5.","図鑑のアンノーンの項目を開き、検索欄で5つの質問に答える。進行度：{count}/5。","도감에서 안농 항목을 열고 검색창으로 다섯 질문에 답하세요. 진행: {count}/5.","打开图鉴的未知图腾条目，在搜索框回答五个问题。进度：{count}/5。","Otwórz wpis Unowna w kompendium i odpowiedz na pięć pytań w polu wyszukiwania. Postęp: {count}/5."],
	clickSecretsTutorial: ["Click the image in the Compendium’s Secrets tutorial.","Haz clic en la imagen del tutorial de secretos del compendio.","Cliquez sur l’image du tutoriel des secrets dans le compendium.","Clique na imagem do tutorial de segredos do compêndio.","Clicca sull’immagine del tutorial sui segreti nel compendio.","Klicke auf das Bild im Geheimnis-Tutorial des Kompendiums.","図鑑のシークレット解説の画像をクリックする。","도감의 비밀 튜토리얼 이미지를 클릭하세요.","点击图鉴中秘密教程的图片。","Kliknij obraz w poradniku o sekretach w kompendium."],
	solveWebPuzzle: ["Solve the official web puzzle and redeem its player-specific code from the Menu.","Resuelve el puzle web oficial y canjea su código personal desde el menú.","Résolvez l’énigme web officielle et utilisez son code personnel depuis le menu.","Resolva o quebra-cabeça oficial na web e resgate o código pessoal no menu.","Risolvi l’enigma web ufficiale e riscatta il codice personale dal menu.","Löse das offizielle Web-Rätsel und löse deinen persönlichen Code im Menü ein.","公式ウェブパズルを解き、プレイヤー専用コードをメニューで入力する。","공식 웹 퍼즐을 풀고 플레이어 전용 코드를 메뉴에서 입력하세요.","解开官方网页谜题，在菜单中兑换玩家专属代码。","Rozwiąż oficjalną zagadkę internetową i wpisz osobisty kod w menu."],
	redeemNamedCode: ["Redeem {code} from the Menu.","Canjea {code} desde el menú.","Utilisez {code} depuis le menu.","Resgate {code} no menu.","Riscatta {code} dal menu.","Löse {code} im Menü ein.","メニューで{code}を入力する。","메뉴에서 {code}를 입력하세요.","在菜单中兑换{code}。","Wpisz {code} w menu."],
	achievementReward: ["Complete this achievement, then defeat the boss again if the reward is still locked.","Completa este logro y vuelve a derrotar al jefe si la recompensa sigue bloqueada.","Terminez ce succès, puis battez à nouveau le boss si la récompense reste verrouillée.","Conclua esta conquista e derrote o chefe novamente se a recompensa ainda estiver bloqueada.","Completa questo obiettivo, poi sconfiggi di nuovo il boss se la ricompensa è ancora bloccata.","Schließe diesen Erfolg ab und besiege den Boss erneut, falls die Belohnung noch gesperrt ist.","この実績を達成する。報酬が未入手なら、もう一度ボスを倒す。","이 업적을 달성하고 보상이 잠겨 있으면 보스를 다시 쓰러뜨리세요.","完成此成就；若奖励仍未解锁，再次击败首领。","Ukończ to osiągnięcie, a jeśli nagroda jest nadal zablokowana, ponownie pokonaj bossa."],
	achievementState: ["Achievement complete: {count}/1.","Logro completado: {count}/1.","Succès accompli : {count}/1.","Conquista concluída: {count}/1.","Obiettivo completato: {count}/1.","Erfolg abgeschlossen: {count}/1.","実績達成：{count}/1。","업적 달성: {count}/1.","成就完成：{count}/1。","Ukończone osiągnięcie: {count}/1."],
	findHiddenBoardRoom: ["Find the hidden Board Room entrance on {route}, outside challenges with no wave active.", "Encuentra la entrada oculta a la sala del tablero en {route}, fuera de desafíos y sin oleadas activas.", "Trouvez l’entrée cachée de la salle du plateau sur {route}, hors défi et sans vague active.", "Encontre a entrada escondida da sala do tabuleiro em {route}, fora dos desafios e sem onda ativa.", "Trova l’ingresso nascosto della stanza della scacchiera su {route}, fuori dalle sfide e senza ondate attive.", "Finde den versteckten Eingang zum Schachraum auf {route}, außerhalb von Herausforderungen und ohne aktive Welle.", "チャレンジ外でウェーブがない時に、{route}の隠されたボードルーム入口を見つける。", "챌린지 밖에서 웨이브가 진행 중이 아닐 때 {route}의 숨겨진 보드 룸 입구를 찾으세요.", "在非挑战模式且没有波次进行时，找到{route}隐藏的棋盘房间入口。", "Znajdź ukryte wejście do pokoju z planszą na {route}, poza wyzwaniem i bez aktywnej fali."],
	unlockCalyrex: ["In {map}, deploy {pieces} on squares that light up chess pieces. More active pieces increase damage. Defeat {pokemon}.", "En {map}, coloca {pieces} en casillas que activen las piezas. Más piezas activas aumentan el daño. Derrota a {pokemon}.", "Dans {map}, placez {pieces} sur les cases qui activent les pièces. Plus de pièces actives augmentent les dégâts. Battez {pokemon}.", "Em {map}, posicione {pieces} nas casas que ativam as peças. Mais peças ativas aumentam o dano. Derrote {pokemon}.", "In {map}, schiera {pieces} sulle caselle che attivano i pezzi. Più pezzi attivi aumentano i danni. Sconfiggi {pokemon}.", "Platziere in {map} {pieces} auf Feldern, die Schachfiguren aktivieren. Mehr aktive Figuren erhöhen den Schaden. Besiege {pokemon}.", "{map}で{pieces}を駒が光るマスに配置する。有効な駒が多いほどダメージが増える。{pokemon}を倒す。", "{map}에서 {pieces}를 체스 말이 활성화되는 칸에 배치하세요. 활성화된 말이 많을수록 피해가 증가합니다. {pokemon}를 쓰러뜨리세요.", "在{map}将{pieces}部署到能点亮棋子的格子上。激活的棋子越多，伤害越高。击败{pokemon}。", "W {map} rozstaw {pieces} na polach aktywujących figury. Więcej aktywnych figur zwiększa obrażenia. Pokonaj {pokemon}."],
	chessProgress: ["Current board: {count}/{total} active pieces.", "Tablero actual: {count}/{total} piezas activas.", "Plateau actuel : {count}/{total} pièces actives.", "Tabuleiro atual: {count}/{total} peças ativas.", "Scacchiera attuale: {count}/{total} pezzi attivi.", "Aktuelles Brett: {count}/{total} aktive Figuren.", "現在の盤面：有効な駒 {count}/{total}。", "현재 보드: 활성화된 말 {count}/{total}.", "当前棋盘：已激活{count}/{total}个棋子。", "Bieżąca plansza: {count}/{total} aktywnych figur."],

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
	defeatManaphyInSecretMap: ['Defeat Manaphy in {route}', 'Derrota a Manaphy en {route}', 'Battez Manaphy dans {route}', 'Derrote Manaphy em {route}', 'Sconfiggi Manaphy in {route}', 'Besiege Manaphy in {route}', '{route}でマナフィを倒す', '{route}에서 마나피를 쓰러뜨리기', '在{route}击败玛纳霏', 'Pokonaj Manaphy w {route}'],
	deployTwoManaphyOrDittoInSecretMap: ['On {route}, deploy exactly two Manaphy or Ditto', 'En {route}, despliega exactamente dos Manaphy o Ditto', 'Dans {route}, déployez exactement deux Manaphy ou Ditto', 'Em {route}, posicione exatamente dois Manaphy ou Ditto', 'In {route}, schiera esattamente due Manaphy o Ditto', 'Platziere in {route} genau zwei Manaphy oder Ditto', '{route}でマナフィまたはメタモンをちょうど2体配置', '{route}에서 마나피 또는 메타몽을 정확히 2마리 배치', '在{route}部署正好两只玛纳霏或百变怪', 'Na {route} rozstaw dokładnie dwa Manaphy lub Ditto'],
	redeemSecretCodeFromMenu: ['Redeem a secret code from the Menu', 'Canjea un código secreto desde el menú', 'Utilisez un code secret depuis le menu', 'Resgate um código secreto no menu', 'Riscatta un codice segreto dal menu', 'Löse einen geheimen Code im Menü ein', 'メニューでシークレットコードを入力', '메뉴에서 비밀 코드를 입력', '在菜单中兑换秘密代码', 'Wpisz tajny kod w menu'],
	deployPokemonNearPokemon: ['Deploy {pokemon1} near {pokemon2}', 'Despliega a {pokemon1} cerca de {pokemon2}', 'Déployez {pokemon1} près de {pokemon2}', 'Posicione {pokemon1} perto de {pokemon2}', 'Schiera {pokemon1} vicino a {pokemon2}', 'Platziere {pokemon1} in der Nähe von {pokemon2}', '{pokemon2}の近くに{pokemon1}を配置', '{pokemon2} 근처에 {pokemon1} 배치', '在{pokemon2}附近部署{pokemon1}', 'Rozstaw {pokemon1} w pobliżu {pokemon2}'],
	equipItemToPokemon: ['Equip {item} to {pokemon}', 'Equipa {item} a {pokemon}', 'Équipez {pokemon} avec {item}', 'Equipe {item} em {pokemon}', 'Assegna {item} a {pokemon}', 'Rüste {pokemon} mit {item} aus', '{pokemon}に{item}を持たせる', '{pokemon}에게 {item} 장착', '给{pokemon}装备{item}', 'Wyposaż {pokemon} w {item}'],
	ringBellRhythmOnWaveOutsideChallenge: ['On {route} at wave {wave}, click the bell in groups of {rhythm} outside Challenge', 'En {route}, en la oleada {wave}, toca la campana en grupos de {rhythm} fuera de Desafío', 'Sur {route}, à la vague {wave}, cliquez sur la cloche par groupes de {rhythm} hors Défi', 'Em {route}, na onda {wave}, toque o sino em grupos de {rhythm} fora do Desafio', 'Su {route}, all’ondata {wave}, suona la campana in gruppi di {rhythm} fuori dalla Sfida', 'Klicke auf {route} in Welle {wave} außerhalb der Herausforderung in Gruppen von {rhythm} auf die Glocke', '{route}のウェーブ{wave}で、チャレンジ外にベルを{rhythm}のまとまりで鳴らす', '{route} 웨이브 {wave}에서 챌린지 외부에 종을 {rhythm} 묶음으로 클릭', '在{route}第{wave}波时，于挑战外按{rhythm}的分组点击铃铛', 'Na {route}, podczas fali {wave}, klikaj dzwon grupami {rhythm} poza wyzwaniem'],
	findAndVisitRandomMap: ['Open the Map until {route} appears (1% chance each time), then visit it', 'Abre el mapa hasta que aparezca {route} (1 % de probabilidad cada vez) y visítala', 'Ouvrez la carte jusqu’à ce que {route} apparaisse (1 % de chance à chaque fois), puis visitez-la', 'Abra o mapa até {route} aparecer (1% de chance a cada vez) e visite-a', 'Apri la mappa finché non appare {route} (1% di probabilità ogni volta), poi visitala', 'Öffne die Karte, bis {route} erscheint (jeweils 1 % Chance), und besuche sie', 'マップを開いて{route}を出現させ（毎回1%）、そこを訪れる', '지도를 열어 {route}이(가) 나타날 때까지 기다린 뒤(매번 1% 확률) 방문', '打开地图直到{route}出现（每次1%概率），然后前往', 'Otwieraj mapę, aż pojawi się {route} (za każdym razem 1% szans), a następnie ją odwiedź'],
	defeatPokemonInMap: ['Defeat {pokemon} in {route}', 'Derrota a {pokemon} en {route}', 'Battez {pokemon} dans {route}', 'Derrote {pokemon} em {route}', 'Sconfiggi {pokemon} in {route}', 'Besiege {pokemon} in {route}', '{route}で{pokemon}を倒す', '{route}에서 {pokemon} 쓰러뜨리기', '在{route}击败{pokemon}', 'Pokonaj {pokemon} w {route}'],
	unlockCastleRoom: ['On {route} wave 50, let Klefki reach the goal; then find the hidden room while no wave is active', 'En la oleada 50 de {route}, deja que Klefki llegue a la meta; después encuentra la sala oculta cuando no haya oleada activa', 'À la vague 50 de {route}, laissez Trousselin atteindre l’arrivée ; trouvez ensuite la salle cachée quand aucune vague n’est active', 'Na onda 50 de {route}, deixe Klefki chegar ao objetivo; depois encontre a sala escondida quando nenhuma onda estiver ativa', 'All’ondata 50 di {route}, lascia che Klefki raggiunga il traguardo; poi trova la stanza nascosta quando nessuna ondata è attiva', 'Lass Clavion in Welle 50 auf {route} das Ziel erreichen; finde danach den versteckten Raum, wenn keine Welle aktiv ist', '{route}のウェーブ50でクレッフィをゴールさせ、ウェーブがない時に隠し部屋を見つける', '{route} 웨이브 50에서 클레피가 목표에 도달하게 한 뒤, 웨이브가 없을 때 숨겨진 방 찾기', '在{route}第50波让钥圈儿到达终点；然后在无波次进行时找到隐藏房间', 'Na fali 50 na {route} pozwól Klefkiemu dotrzeć do celu; następnie znajdź ukryty pokój, gdy żadna fala nie jest aktywna'],
	goldWelcomeGift: ['25,000 Gold Gift', 'Regalo de 25.000 de oro', 'Cadeau de 25 000 pièces d’or', 'Presente de 25.000 de ouro', 'Regalo di 25.000 oro', '25.000-Gold-Geschenk', '25,000ゴールドギフト', '25,000 골드 선물', '25,000金币礼物', 'Prezent: 25 000 złota'],
	redeemWelcomeGiftCode: ['Redeem WELCOME_GIFT_25 from the Menu', 'Canjea WELCOME_GIFT_25 desde el menú', 'Utilisez WELCOME_GIFT_25 depuis le menu', 'Resgate WELCOME_GIFT_25 no menu', 'Riscatta WELCOME_GIFT_25 dal menu', 'Löse WELCOME_GIFT_25 im Menü ein', 'メニューでWELCOME_GIFT_25を入力', '메뉴에서 WELCOME_GIFT_25 입력', '在菜单中兑换WELCOME_GIFT_25', 'Wpisz WELCOME_GIFT_25 w menu'],
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
		this.portrait.addEventListener('click', () => this.togglePortraitPicker());

		this.avatarPicker = new Element(this.playerContainer, { className: 'profile-scene-avatar-picker' }).element;
		this.avatarOptions = [];
		for (let portrait = 0; portrait <= 79; portrait++) {
			const option = new Element(this.avatarPicker, {
				className: 'profile-scene-avatar-option'
			}).element;
			option.style.backgroundImage = `url("./src/assets/images/portraits/${portrait}.png")`;
			option.addEventListener('click', () => this.selectPortrait(portrait));
			option.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
			this.avatarOptions.push(option);
		}


		this.avatarPrev = new Element(this.playerContainer, { className: 'profile-scene-avatar-arrow-prev stroke', text: '<' }).element;
		this.avatarNext = new Element(this.playerContainer, { className: 'profile-scene-avatar-arrow-next stroke', text: '>' }).element;
		this.avatarPrev.addEventListener('click', () => { this.changePortrait(-1) });
		this.avatarNext.addEventListener('click', () => { this.changePortrait(1) });
		this.avatarPrev.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });
		this.avatarNext.addEventListener('mouseenter', () => { playSound('hover1', 'ui') });

		this.name = new Input(
			this.playerContainer,
			'text',
			{
				className: 'profile-scene-name stroke',
				maxlength: 11,
				cb: () => { this.changeName() }
			}
		);

		this.achievementsContainer = new Element(this.container, { className: 'profile-scene-achievements-container' }).element;
		this.achievement = [];
		for (let i = 0; i < achievementReworkData.length; i++) {
			this.achievement[i] = new Element(this.achievementsContainer, { className: 'profile-scene-achievement' }).element;
		}

		const achievementOrder = Array.from({ length: 39 }, (_, i) => i);

		const index38 = achievementOrder.indexOf(38);
		const index21 = achievementOrder.indexOf(21);

		achievementOrder.splice(index38, 1);
		achievementOrder.splice(index21, 0, 38);

		achievementOrder.forEach(i => {
			this.achievementsContainer.appendChild(this.achievement[i]);
		});

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
			this.stats[i] = new Element(this.statsContainer, { className: 'profile-stat stroke' }).element;
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

		this.achievement[7].addEventListener('click', () => {
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

		const resolveCanonicalKey = (candidate) => {
			if (!candidate) return null;
			if (pokemonData?.[candidate]) return candidate;
			const normalized = String(candidate).toLowerCase();
			const caseInsensitiveMatch = Object.keys(pokemonData || {}).find((key) => key.toLowerCase() === normalized);
			if (caseInsensitiveMatch) return caseInsensitiveMatch;
			const compact = normalized.replace(/[^a-z0-9]/g, '');
			return Object.keys(pokemonData || {}).find((key) => key.toLowerCase().replace(/[^a-z0-9]/g, '') === compact) ?? null;
		};

		if (typeof pokemon?.specie == 'string') {
			const specieKey = resolveCanonicalKey(pokemon.specie);
			if (specieKey) return specieKey;
		}

		const directKey = pokemon?.specie?.key ?? pokemon?.specieKey ?? pokemon?.key ?? null;
		const canonicalDirectKey = resolveCanonicalKey(directKey);
		if (canonicalDirectKey) return canonicalDirectKey;

		const id = pokemon?.id ?? pokemon?.specie?.id;
		if (id == undefined || id == null) return null;

		const matched = Object.keys(pokemonData || {}).find((key) => pokemonData?.[key]?.id === id);
		return matched ?? null;
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

	getBasePokemonKey(key) {
		if (!key) return null;

		const formToMain = {
			appletun: 'flapple',
			aegislashSword: 'aegislash',
			lycanrocNight: 'lycanrocDay',
			megaAbsol: 'absol',
			megaCharizardX: 'charizard',
			megaSceptile: 'sceptile',
			megaAlakazam: 'alakazam',
		};

		let current = formToMain[key] ?? key;
		if (current.startsWith('mega') && current !== 'meganium') {
			const fallback = current[4]?.toLowerCase() + current.slice(5);
			if (pokemonData?.[fallback]) current = fallback;
		}

		const reverse = {};
		Object.keys(pokemonData || {}).forEach((k) => {
			const evoTo = pokemonData?.[k]?.evolution?.pokemon;
			if (evoTo) reverse[evoTo] = k;
		});

		while (reverse[current]) current = reverse[current];
		return current;
	}

	getOwnershipKey(key, obtainable) {
		if (!key) return null;

		// Profile ownership is base-form centric for many lines.
		// Prioritize base key so evolved forms (e.g. cacturne)
		// satisfy base-counted ownership entries (e.g. cacnea).
		const baseKey = this.getBasePokemonKey(key);
		if (baseKey && obtainable.has(baseKey)) return baseKey;
		if (obtainable.has(key)) return key;
		return null;
	}

	getOwnershipDebugSnapshot() {
		const owned = new Set();
		const obtainable = this.getObtainablePokemonKeys();
		this.getPlayerPokemon().forEach((pokemon) => {
			const key = this.getPokemonKey(pokemon);
			const ownershipKey = this.getOwnershipKey(key, obtainable);
			if (ownershipKey) owned.add(ownershipKey);
		});

		const missingKeys = [...obtainable].filter((key) => !owned.has(key)).sort();
		return {
			ownedCount: owned.size,
			totalCount: obtainable.size,
			missingKeys,
		};
	}

	countUniqueSpecies() {
		return this.getOwnershipDebugSnapshot().ownedCount;
	}

	countTotalSpecies() {
		return this.getOwnershipDebugSnapshot().totalCount;
	}

	countUniqueShinySpecies() {
		const shinies = new Set();
		const obtainable = this.getObtainablePokemonKeys();
		this.getPlayerPokemon().forEach((pokemon) => {
			if (!pokemon?.isShiny) return;
			const key = this.getPokemonKey(pokemon);
			const ownershipKey = this.getOwnershipKey(key, obtainable);
			if (ownershipKey) shinies.add(ownershipKey);
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
		const secretRoute15 = this.getRouteName(15);
		const secretRoute26 = this.getRouteName(26);
		const secretRoute27 = this.getRouteName(27);
		const secretRoute28 = this.getRouteName(28);
		const secretRoute29 = this.getRouteName(29);
		const manaphyCaveRoute = this.getRouteName(20);
		const mirageIslandRoute = this.getRouteName(30);
		const victiniCaveRoute = this.getRouteName(31);
		const marshadowCaveRoute = this.getRouteName(32);
		const castleRoomRoute = this.getRouteName(33);
		const lang = clampLang(this.main.lang);
		const achievementRequirement = (id, fallback) => localized(
			achievementReworkData.find((achievement) => achievement?.id === id)?.description,
			lang
		) || fallback;
		const defeatPokemonInMap = (pokemonKey, routeName) => formatTemplate(
			getProfileUnlockableText('defeatPokemonInMap', lang, 'Defeat {pokemon} in {route}'),
			{ pokemon: localized(pokemonData?.[pokemonKey]?.name, lang), route: routeName }
		);

		entries.push(
			{
				id: 'secret-board-room',
				order: 10350,
				name: this.getRouteName(35),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenBoardRoom', lang), { route: this.getRouteName(34) }),
				icon: routeData[35].background,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secretMaps?.secretChess,
			},
			{
				id: 'secret-calyrex',
				order: 10355,
				name: localized(pokemonData.calyrex.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('unlockCalyrex', lang), {
					map: this.getRouteName(35), pokemon: localized(pokemonData.calyrex.name, lang),
					pieces: ['kingdra', 'vespiquen', 'pawniard', 'bisharp', 'kingambit', 'stakataka'].map(key => localized(pokemonData[key].name, lang)).join(', '),
				}) + (this.main.area?.map?.id === 35 ? ' ' + formatTemplate(getProfileUnlockableText('chessProgress', lang), {
					count: this.main.area.activePieces || 0, total: this.main.area.chessPieces?.length || 0,
				}) : ''),
				icon: pokemonData.calyrex.sprite.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.calyrex || this.hasPokemonKey('calyrex'),
			},
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
				unlockText: achievementRequirement(25, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[25]?.status ? 1 : 0}),
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
				id: 'secret-manaphy',
				order: 10145,
				name: localized(pokemonData.manaphy?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: formatTemplate(getProfileUnlockableText('defeatManaphyInSecretMap', clampLang(this.main.lang), 'Defeat Manaphy in {route}'), { route: manaphyCaveRoute }),
				icon: pokemonData.manaphy?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.manaphy || this.hasPokemonKey('manaphy'),
			},
			{
				id: 'secret-phione',
				order: 10147,
				name: localized(pokemonData.phione?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: formatTemplate(getProfileUnlockableText('deployTwoManaphyOrDittoInSecretMap', clampLang(this.main.lang), 'On {route}, deploy exactly two Manaphy or Ditto'), { route: manaphyCaveRoute }),
				icon: pokemonData.phione?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.phione || this.hasPokemonKey('phione'),
			},
			{
				id: 'secret-missingno',
				order: 10999,
				name: localized(pokemonData.missingNo?.name, clampLang(this.main.lang)),
				lockedName: getProfileUnlockableText('hiddenName', clampLang(this.main.lang), '???'),
				unlockText: getProfileUnlockableText('redeemSecretCodeFromMenu', clampLang(this.main.lang), 'Redeem a secret code from the Menu'),
				icon: pokemonData.missingNo?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => this.hasPokemonKey('missingNo') || !!this.main.player?.hasRedeemedReward?.('missingno'),
			},
			{
				id: 'secret-dhelmise',
				order: 10200,
				name: localized(pokemonData.dhelmise?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenSecretOnRouteOutsideChallenge', lang, 'Find the hidden secret on {route} outside Challenge'), { route: secretRoute11 }),
				icon: pokemonData.dhelmise?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.dhelmise || this.hasPokemonKey('dhelmise'),
			},
			{
				id: 'secret-spiritomb',
				order: 10210,
				name: localized(pokemonData.spiritomb?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenSecretOnRouteOutsideChallenge', lang, 'Find the hidden secret on {route} outside Challenge'), { route: secretRoute28 }),
				icon: pokemonData.spiritomb?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.spiritomb || this.hasPokemonKey('spiritomb'),
			},
			{
				id: 'secret-bronzor',
				order: 10220,
				name: localized(pokemonData.bronzor?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('ringBellRhythmOnWaveOutsideChallenge', lang, 'On {route} at wave {wave}, click the bell in groups of {rhythm} outside Challenge'), {
					route: secretRoute27,
					wave: 50,
					rhythm: '1-3-1-2-1-4-2-4-1',
				}),
				icon: pokemonData.bronzor?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.bronzor || this.hasPokemonKey('bronzor'),
			},
			{
				id: 'secret-minior',
				order: 10230,
				name: localized(pokemonData.minior?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('deployPokemonNearPokemon', lang, 'Deploy {pokemon1} near {pokemon2}'), {
					pokemon1: localized(pokemonData.lunatone?.name, lang),
					pokemon2: localized(pokemonData.solrock?.name, lang),
				}),
				icon: pokemonData.minior?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.minior || this.hasPokemonKey('minior'),
			},
			{
				id: 'secret-corsola-galar',
				order: 10240,
				name: localized(pokemonData.corsolaGalar?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('equipItemToPokemon', lang, 'Equip {item} to {pokemon}'), {
					item: localized(itemData.strangeIdol?.name, lang),
					pokemon: localized(pokemonData.corsola?.name, lang),
				}),
				icon: pokemonData.corsolaGalar?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.corsolaGalar || this.hasPokemonKey('corsolaGalar'),
			},
			{
				id: 'secret-keldeo',
				order: 10250,
				name: localized(pokemonData.keldeo?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: achievementRequirement(19, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[19]?.status ? 1 : 0}),
				icon: pokemonData.keldeo?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.keldeo || this.hasPokemonKey('keldeo'),
			},
			{
				id: 'secret-victini-cave',
				order: 10260,
				name: localized(routeData?.[31]?.name, lang) || getProfileUnlockableText('secretMap', lang, 'Secret Map'),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenCaveOnRouteWhileNoWave', lang, 'Find the hidden cave on {route} while no wave is active'), { route: secretRoute26 }),
				icon: routeData?.[31]?.background,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secretMaps?.victiniCave,
			},
			{
				id: 'secret-victini',
				order: 10265,
				name: localized(pokemonData.victini?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: defeatPokemonInMap('victini', victiniCaveRoute),
				icon: pokemonData.victini?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.victini || this.hasPokemonKey('victini'),
			},
			{
				id: 'secret-mirage-island',
				order: 10270,
				name: localized(routeData?.[30]?.name, lang) || getProfileUnlockableText('secretMap', lang, 'Secret Map'),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findAndVisitRandomMap', lang, 'Open the Map until {route} appears (1% chance each time), then visit it'), { route: mirageIslandRoute }),
				icon: routeData?.[30]?.background,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.mirageIslandDiscovered,
			},
			{
				id: 'secret-mew',
				order: 10275,
				name: localized(pokemonData.mew?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: defeatPokemonInMap('mew', mirageIslandRoute),
				icon: pokemonData.mew?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.mew || this.hasPokemonKey('mew'),
			},
			{
				id: 'secret-marshadow-cave',
				order: 10280,
				name: localized(routeData?.[32]?.name, lang) || getProfileUnlockableText('secretMap', lang, 'Secret Map'),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('findHiddenCaveOnRouteWhileNoWave', lang, 'Find the hidden cave on {route} while no wave is active'), { route: secretRoute15 }),
				icon: routeData?.[32]?.background,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secretMaps?.marshadowCave,
			},
			{
				id: 'secret-marshadow',
				order: 10285,
				name: localized(pokemonData.marshadow?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: defeatPokemonInMap('marshadow', marshadowCaveRoute),
				icon: pokemonData.marshadow?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.marshadow || this.hasPokemonKey('marshadow'),
			},
			{
				id: 'secret-terrakion',
				order: 10290,
				name: localized(pokemonData.terrakion?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: achievementRequirement(26, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[26]?.status ? 1 : 0}),
				icon: pokemonData.terrakion?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.terrakion || this.hasPokemonKey('terrakion'),
			},
			{
				id: 'secret-cobalion',
				order: 10300,
				name: localized(pokemonData.cobalion?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: achievementRequirement(23, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[23]?.status ? 1 : 0}),
				icon: pokemonData.cobalion?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.cobalion || this.hasPokemonKey('cobalion'),
			},
			{
				id: 'secret-castle-room',
				order: 10310,
				name: localized(routeData?.[33]?.name, lang) || getProfileUnlockableText('secretMap', lang, 'Secret Map'),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: formatTemplate(getProfileUnlockableText('unlockCastleRoom', lang, 'On {route} wave 50, let Klefki reach the goal; then find the hidden room while no wave is active'), { route: secretRoute29 }),
				icon: routeData?.[33]?.background,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secretMaps?.secretCastle,
			},
			{
				id: 'secret-farfetchd-galar',
				order: 10315,
				name: localized(pokemonData.farfetchdGalar?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: defeatPokemonInMap('sirfetchd', castleRoomRoute),
				icon: pokemonData.farfetchdGalar?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.secrets?.farfetchdGalar || this.hasPokemonKey('farfetchdGalar'),
			},
			{
				id: 'secret-sandy-shocks',
				order: 10320,
				name: localized(pokemonData.sandyShocks?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: getProfileUnlockableText('redeemSecretCodeFromMenu', lang, 'Redeem a secret code from the Menu'),
				icon: pokemonData.sandyShocks?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => this.hasPokemonKey('sandyShocks') || !!this.main.player?.hasRedeemedReward?.('sandyShocks'),
			},
			{
				id: 'secret-iron-thorns',
				order: 10330,
				name: localized(pokemonData.ironThorns?.name, lang),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: getProfileUnlockableText('redeemSecretCodeFromMenu', lang, 'Redeem a secret code from the Menu'),
				icon: pokemonData.ironThorns?.sprite?.base,
				secretLevel: 'normal',
				isUnlocked: () => this.hasPokemonKey('ironThorns') || !!this.main.player?.hasRedeemedReward?.('ironThorns'),
			},
			{
				id: 'secret-gold25k',
				order: 10340,
				name: getProfileUnlockableText('goldWelcomeGift', lang, '25,000 Gold Gift'),
				lockedName: getProfileUnlockableText('hiddenName', lang, '???'),
				unlockText: getProfileUnlockableText('redeemWelcomeGiftCode', lang, 'Redeem WELCOME_GIFT_25 from the Menu'),
				icon: itemData.nugget?.sprite,
				secretLevel: 'normal',
				isUnlocked: () => !!this.main.player?.hasRedeemedReward?.('gold25k'),
			}
		);

		
        entries.push({id: 'secret-shaymin', order: 10400, name: localized(pokemonData.shaymin.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(0, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[0]?.status ? 1 : 0}), icon: pokemonData.shaymin.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.shaymin || this.hasPokemonKey('shaymin') });

        entries.push({id: 'secret-celebi', order: 10401, name: localized(pokemonData.celebi.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(1, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[1]?.status ? 1 : 0}), icon: pokemonData.celebi.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.celebi || this.hasPokemonKey('celebi') });

        entries.push({id: 'secret-lunala', order: 10402, name: localized(pokemonData.lunala.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(2, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[2]?.status ? 1 : 0}), icon: pokemonData.lunala.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.lunala || this.hasPokemonKey('lunala') });

        entries.push({id: 'secret-zapdos', order: 10403, name: localized(pokemonData.zapdos.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(3, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[3]?.status ? 1 : 0}), icon: pokemonData.zapdos.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.zapdos || this.hasPokemonKey('zapdos') });

        entries.push({id: 'secret-moltres', order: 10404, name: localized(pokemonData.moltres.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(4, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[4]?.status ? 1 : 0}), icon: pokemonData.moltres.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.moltres || this.hasPokemonKey('moltres') });

        entries.push({id: 'secret-regirock', order: 10405, name: localized(pokemonData.regirock.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(5, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[5]?.status ? 1 : 0}), icon: pokemonData.regirock.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.regirock || this.hasPokemonKey('regirock') });

        entries.push({id: 'secret-groudon', order: 10406, name: localized(pokemonData.groudon.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(6, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[6]?.status ? 1 : 0}), icon: pokemonData.groudon.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.groudon || this.hasPokemonKey('groudon') });

        entries.push({id: 'secret-hooh', order: 10407, name: localized(pokemonData.hooh.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(7, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[7]?.status ? 1 : 0}), icon: pokemonData.hooh.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.hooh || this.hasPokemonKey('hooh') });

        entries.push({id: 'secret-registeel', order: 10408, name: localized(pokemonData.registeel.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(8, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[8]?.status ? 1 : 0}), icon: pokemonData.registeel.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.registeel || this.hasPokemonKey('registeel') });

        entries.push({id: 'secret-regice', order: 10409, name: localized(pokemonData.regice.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(9, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[9]?.status ? 1 : 0}), icon: pokemonData.regice.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.regice || this.hasPokemonKey('regice') });

        entries.push({id: 'secret-regigigas', order: 10410, name: localized(pokemonData.regigigas.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(10, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[10]?.status ? 1 : 0}), icon: pokemonData.regigigas.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.regigigas || this.hasPokemonKey('regigigas') });

        entries.push({id: 'secret-articuno', order: 10411, name: localized(pokemonData.articuno.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(11, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[11]?.status ? 1 : 0}), icon: pokemonData.articuno.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.articuno || this.hasPokemonKey('articuno') });

        entries.push({id: 'secret-kyogre', order: 10412, name: localized(pokemonData.kyogre.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(12, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[12]?.status ? 1 : 0}), icon: pokemonData.kyogre.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.kyogre || this.hasPokemonKey('kyogre') });

        entries.push({id: 'secret-thundurus', order: 10413, name: localized(pokemonData.thundurus.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(13, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[13]?.status ? 1 : 0}), icon: pokemonData.thundurus.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.thundurus || this.hasPokemonKey('thundurus') });

        entries.push({id: 'secret-tapu-fini', order: 10414, name: localized(pokemonData.tapuFini.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(14, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[14]?.status ? 1 : 0}), icon: pokemonData.tapuFini.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.tapuFini || this.hasPokemonKey('tapuFini') });

        entries.push({id: 'secret-nihilego', order: 10415, name: localized(pokemonData.nihilego.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(15, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[15]?.status ? 1 : 0}), icon: pokemonData.nihilego.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.nihilego || this.hasPokemonKey('nihilego') });

        entries.push({id: 'secret-tapu-koko', order: 10416, name: localized(pokemonData.tapuKoko.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(16, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[16]?.status ? 1 : 0}), icon: pokemonData.tapuKoko.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.tapuKoko || this.hasPokemonKey('tapuKoko') });

        entries.push({id: 'secret-tapu-bulu', order: 10417, name: localized(pokemonData.tapuBulu.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(17, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[17]?.status ? 1 : 0}), icon: pokemonData.tapuBulu.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.tapuBulu || this.hasPokemonKey('tapuBulu') });

        entries.push({id: 'secret-tapu-lele', order: 10418, name: localized(pokemonData.tapuLele.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(18, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[18]?.status ? 1 : 0}), icon: pokemonData.tapuLele.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.tapuLele || this.hasPokemonKey('tapuLele') });

        entries.push({id: 'secret-heatran', order: 10419, name: localized(pokemonData.heatran.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(20, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[20]?.status ? 1 : 0}), icon: pokemonData.heatran.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.heatran || this.hasPokemonKey('heatran') });

        entries.push({id: 'secret-volcanion', order: 10420, name: localized(pokemonData.volcanion.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(21, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[21]?.status ? 1 : 0}), icon: pokemonData.volcanion.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.volcanion || this.hasPokemonKey('volcanion') });

        entries.push({id: 'secret-pheromosa', order: 10421, name: localized(pokemonData.pheromosa.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(22, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[22]?.status ? 1 : 0}), icon: pokemonData.pheromosa.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.pheromosa || this.hasPokemonKey('pheromosa') });

        entries.push({id: 'secret-tornadus', order: 10422, name: localized(pokemonData.tornadus.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(24, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[24]?.status ? 1 : 0}), icon: pokemonData.tornadus.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.tornadus || this.hasPokemonKey('tornadus') });

        entries.push({id: 'secret-magearna', order: 10423, name: localized(pokemonData.magearna.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(27, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[27]?.status ? 1 : 0}), icon: pokemonData.magearna.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.magearna || this.hasPokemonKey('magearna') });

        entries.push({id: 'secret-diancie', order: 10424, name: localized(pokemonData.diancie.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(28, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[28]?.status ? 1 : 0}), icon: pokemonData.diancie.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.diancie || this.hasPokemonKey('diancie') });

        entries.push({id: 'secret-virizion', order: 10425, name: localized(pokemonData.virizion.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(32, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[32]?.status ? 1 : 0}), icon: pokemonData.virizion.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.virizion || this.hasPokemonKey('virizion') });

        entries.push({id: 'secret-landorus', order: 10426, name: localized(pokemonData.landorus.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: achievementRequirement(38, '') + ' ' + getProfileUnlockableText('achievementReward', lang) + ' ' + formatTemplate(getProfileUnlockableText('achievementState', lang), {count: this.main.player?.achievementsRework?.[38]?.status ? 1 : 0}), icon: pokemonData.landorus.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.landorus || this.hasPokemonKey('landorus') });

        entries.push({id: 'secret-sneasel-hisui', order: 10427, name: localized(pokemonData.sneaselHisui.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: formatTemplate(getProfileUnlockableText('equipItemToPokemon', lang), {item: localized(itemData.poisonBarb.name, lang), pokemon: localized(pokemonData.weavile.name, lang)}), icon: pokemonData.sneaselHisui.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.sneaselHisui || this.hasPokemonKey('sneaselHisui') });

        entries.push({id: 'secret-samurott-hisui', order: 10428, name: localized(pokemonData.samurottHisui.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: formatTemplate(getProfileUnlockableText('equipItemToPokemon', lang), {item: localized(itemData.ancientSword.name, lang), pokemon: localized(pokemonData.samurott.name, lang)}), icon: pokemonData.samurottHisui.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.samurottHisui || this.hasPokemonKey('samurottHisui') });

        entries.push({id: 'secret-iron-bundle', order: 10429, name: localized(pokemonData.ironBundle.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: getProfileUnlockableText('solveWebPuzzle', lang), icon: pokemonData.ironBundle.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.hasRedeemedReward?.('ironBundle') || this.hasPokemonKey('ironBundle') });

        entries.push({id: 'secret-flutter-mane', order: 10430, name: localized(pokemonData.flutterMane.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: getProfileUnlockableText('solveWebPuzzle', lang), icon: pokemonData.flutterMane.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.hasRedeemedReward?.('flutterMane') || this.hasPokemonKey('flutterMane') });

        entries.push({id: 'secret-pumpkaboo', order: 10431, name: localized(pokemonData.pumpkaboo.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: formatTemplate(getProfileUnlockableText('redeemNamedCode', lang), {code: 'BOOPKABOO'}), icon: pokemonData.pumpkaboo.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.hasRedeemedReward?.('pumpkaboo') || this.hasPokemonKey('pumpkaboo') });

        entries.push({id: 'secret-spectrier', order: 10432, name: localized(pokemonData.spectrier.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: defeatPokemonInMap('spectrier', this.getRouteName(46)), icon: pokemonData.spectrier.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.spectrier || this.hasPokemonKey('spectrier') });

        entries.push({id: 'secret-tyrunt', order: 10433, name: localized(pokemonData.tyrunt.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: getProfileUnlockableText('clickSecretsTutorial', lang), icon: pokemonData.tyrunt.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.tyrunt || this.hasPokemonKey('tyrunt') });

        entries.push({id: 'secret-unown', order: 10434, name: localized(pokemonData.unown.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: formatTemplate(getProfileUnlockableText('unownConversation', lang), {count: Math.min(5, this.main.player?.unownState ?? 0)}), icon: pokemonData.unown.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.unown || this.hasPokemonKey('unown') });

        entries.push({id: 'secret-wooper', order: 10435, name: localized(pokemonData.wooper.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: getProfileUnlockableText('wooperExplosion', lang), icon: pokemonData.wooper.sprite.base, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secrets?.wooper || this.hasPokemonKey('wooper') });

        entries.push({id: 'secret-halloween-2026', order: 10500, name: this.getRouteName(46), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: formatTemplate(getProfileUnlockableText('redeemNamedCode', lang), {code: 'HALLOWEEN_2026'}), icon: routeData[46].background, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secretMaps?.halloween2026});

        entries.push({id: 'secret-item-beedrillite', order: 10510, name: localized(itemData.beedrillite.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: formatTemplate(getProfileUnlockableText('findHiddenItem', lang), {route: this.getRouteName(39)}), icon: itemData.beedrillite.sprite, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secretItems?.beedrillite});

        entries.push({id: 'secret-item-gengarite', order: 10510, name: localized(itemData.gengarite.name, lang), lockedName: getProfileUnlockableText('hiddenName', lang), unlockText: formatTemplate(getProfileUnlockableText('findHiddenItem', lang), {route: this.getRouteName(6)}), icon: itemData.gengarite.sprite, secretLevel: 'normal', isUnlocked: () => !!this.main.player?.secretItems?.gengarite});

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
		this.updatePortraitOptions();

		this.achievement.forEach((achievement, i) => {
			this.achievement[i].style.backgroundImage = `url("${achievementReworkData[i].image}")`;
			this.achievement[i].style.filter = (this.main.player.achievementsRework[i].status)
				? 'drop-shadow(2px 2px black) brightness(1)'
				: 'drop-shadow(1px 1px black) grayscale(1) brightness(0.5)';
			this.main.tooltip.bindTo(this.achievement[i], achievementReworkData[i], 'item');
		});

		for (let i = 0; i < 22; i++) {
			const statLabel = getProfileStatLabel(i, this.main.lang);
			this.stats[i].label.innerText = statLabel.toUpperCase();
		}

		this.stats[0].value.innerText = this.main.utility.minutsToTime(this.main.player.stats.timePlayed);
		this.stats[1].value.innerText = `${this.main.utility.numberDot(this.main.player.stars, this.main.lang)}`;
		const ownershipDebug = this.getOwnershipDebugSnapshot();
		const uniqueOwned = ownershipDebug.ownedCount;
		const totalSpecies = ownershipDebug.totalCount;
		this.stats[2].value.innerText = `${uniqueOwned}/${totalSpecies}`;
		const uniqueShinies = this.countUniqueShinySpecies();
		this.stats[3].value.innerText = `${uniqueShinies}/${totalSpecies}`;
		this.stats[4].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.highestPokemonLevel, this.main.lang)}`;
		this.stats[5].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.totalPokemonLevel, this.main.lang)}`;
		this.stats[6].value.innerText = `$${this.main.utility.numberDot(this.main.player.stats.totalGold, this.main.lang)}`;
		this.stats[7].value.innerText = `${this.main.player.itemAmount}/177`;
		this.stats[8].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.wavesCompleted, this.main.lang)}`;
		this.stats[9].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.highestHit, this.main.lang)}`;
		this.stats[10].value.innerText = `${this.main.utility.numberDot(this.main.player.stats.defeatedEnemies, this.main.lang)}`;
		this.stats[11].value.innerText = `${this.main.player.enemyDefeatedAmount}/345`;
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

		if (pos < 0) pos = 79;
		else if (pos > 79) pos = 0

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
		this.avatarPicker.classList.remove('is-open');
		this.main.tooltip.hide();
		this.main.UI.section['profile'].classList.remove('is-selected');
		this.saveProfile();
	}

	togglePortraitPicker() {
		this.avatarPicker.classList.toggle('is-open');
	}

	updatePortraitOptions() {
		this.avatarOptions.forEach((option, portrait) => {
			const selected = portrait === this.main.player.portrait;
			option.classList.toggle('is-selected', selected);
		});
	}

	selectPortrait(portrait) {
		this.main.player.portrait = portrait;
		this.update();
		this.main.UI.updatePlayer();
		this.avatarPicker.classList.remove('is-open');
		this.saveProfile();
		playSound('option', 'ui');
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
