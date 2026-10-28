#!/usr/bin/env node
// Destructive gameplay fixtures: run ONLY against an isolated test install/save.
const fs = require('node:fs');
const port = Number(process.argv[2] || 9233);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const target = targets.find(t => t.type === 'page');
    if (!target?.url.includes('/context/') || !target.url.includes('/test_game/')) {
        throw new Error('Refusing gameplay fixtures outside context/.../test_game. Use a copied save.');
    }
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, {once:true}));
    const pending = new Map(), errors = [];
    let id = 0;
    socket.addEventListener('message', event => {
        const msg = JSON.parse(event.data);
        if (msg.id) {
            const cb = pending.get(msg.id); pending.delete(msg.id);
            if (msg.error) cb.reject(new Error(JSON.stringify(msg.error))); else cb.resolve(msg.result);
        } else if (msg.method === 'Runtime.exceptionThrown') {
            errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
        } else if (msg.method === 'Debugger.scriptFailedToParse') errors.push(msg.params.url);
    });
    const send = (method,params={}) => new Promise((resolve,reject) => {
        const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));
    });
    const evaluate = async expression => {
        const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
        if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    };
    try {
        await send('Runtime.enable'); await send('Debugger.enable');
        const proto = await send('Runtime.evaluate',{expression:"import('./src/js/game/Main.js').then(m=>m.Main.prototype)",awaitPromise:true});
        const objects = await send('Runtime.queryObjects',{prototypeObjectId:proto.result.objectId});
        await send('Runtime.callFunctionOn',{objectId:objects.objects.objectId,functionDeclaration:'function(){globalThis.__compatMain=this.find(m=>m.area && m.game)}'});
        const fixes171 = await evaluate(`(async()=>{
 const m=globalThis.__compatMain,{Pokemon}=await import('./src/js/game/component/Pokemon.js'),{pokemonData:p}=await import('./src/js/game/data/pokemonData.js'),{itemData:items}=await import('./src/js/game/data/itemData.js');
 const assert=(v,s)=>{if(!v)throw Error(s)};m.game.stopped=true;m.area.waveActive=false;m.area.inChallenge=false;m.team.pokemon=[];m.box.pokemon=[];m.area.loadArea(0,1);
 let forms=0;
 for(const shiny of [false,true])for(const level of [1,5000])for(const form of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ!?'){
  const q=new Pokemon(p.unown,level,null,m,undefined,false,null,form,shiny);q.tilePosition=7;
  const r=Pokemon.fromOriginalData(q.getOriginalData(),m);
  assert(r.unownForm===form&&r.isShiny===shiny&&r.lvl===level&&r.tilePosition===7,'Unown roundtrip '+form);
  const stem=form==='!'?'exclamation':form==='?'?'question':form.toLowerCase();
  assert(r.sprite.base.includes('unown-'+stem+'.png'),'Unown sprite '+form);forms++;
 }
 const q=new Pokemon(p.unown,5000,null,m,undefined,false,null,'A',true);m.team.pokemon=[q];m.UI.updatePokemon();
 const tile=m.area.placementTiles.find(t=>q.tiles.includes(t.land)&&!t.tower);m.game.deployingUnit=q;m.game.moveUnitToTile(tile,true);
 m.pokemonScene.nameChange.open(q);m.pokemonScene.nameChange.name.value.value='?';m.pokemonScene.nameChange.acceptButton.click();
 const stored=JSON.parse(localStorage.getItem('data')).save.team.find(x=>x.specieKey==='unown');
 assert(stored.unownForm==='?'&&stored.isShiny&&stored.lvl===5000&&stored.tilePosition===tile.id,'Rename did not save metadata/placement');
 assert(m.area.towers.find(t=>t.pokemon===q),'Deployed renamed Unown missing');
 m.team.pokemon=[];m.area.towers=[];m.box.pokemon=[];m.area.heavyMetal=true;
 const oldRandom=Math.random;Math.random=()=>0;try{m.UI.getSecret('bronzor');}finally{Math.random=oldRandom;}
 assert(m.box.pokemon.length===1&&m.box.pokemon[0].specie.key==='bronzor'&&m.box.pokemon[0].isShiny,'Heavy Metal reward lost');
 m.shopScene.displayPokemon.close();m.area.heavyMetal=false;
 m.player.secrets={bronzor:true,shaymin:true,kyogre:true};m.box.pokemon=[];m.checkLostSecretPokemon();
 assert(['bronzor','shaymin','kyogre'].every(key=>m.box.pokemon.some(q=>q.specie.key===key)),'Missing unlocked secret recovery');
 const count=m.box.pokemon.length;m.checkLostSecretPokemon();assert(m.box.pokemon.length===count,'Recovery repeats existing rewards');
 assert(!m.itemController.canEquip(items.koffingJelly,new Pokemon(p.meowscarada,100,null,m)),'Meowscarada Koffing Jelly');
 assert(!m.itemController.canEquip(items.spindaCocktail,new Pokemon(p.groudon,100,null,m)),'Groudon Spinda Cocktail');
 m.team.pokemon=[];m.box.pokemon=[];m.area.loadArea(0,1);m.area.enemyWeather='rain';m.area.checkWeather();assert(m.area.weather==='rain','Enemy rain');
 m.area.endWave();assert(!m.area.enemyWeather&&!m.area.weather,'Rain persists after wave');
 assert(m.utility.formatGold(1e12,0)==='1.00e+12','Vanilla large gold formatting');
 return {pass:true,unownForms:forms,renamedSavePlacement:true,bronzorHeavyMetal:true,secretRecovery:true,itemRestrictions:true,weatherReset:true};})()`);
        console.log("1.7.1 focused fixes:", JSON.stringify(fixes171));
        const result = await evaluate(`(async()=>{
            const m=globalThis.__compatMain;
            const assert=(ok,message)=>{if(!ok)throw new Error(message)};
            assert(m,'Game instance unavailable');
            const {pokemonData:p}=await import('./src/js/game/data/pokemonData.js');
            const {routeData:r}=await import('./src/js/game/data/routeData.js');
            const {itemData:items}=await import('./src/js/game/data/itemData.js');
            const {Pokemon}=await import('./src/js/game/component/Pokemon.js');
            const {Area}=await import('./src/js/game/core/Area.js');
            const report={};
            m.profileScene.close();m.game.stopped=true;
            m.team.pokemon=[];m.box.pokemon=[];
            m.player.teamSlots=10;m.player.gold=1e12;m.player.stars=3200;
            const keys=["megaStarmie","megaExcadrill","megaGardevoir","gallade","megaGallade","megaGengar","megaMawile","megaTatsugiri","megaHoundoom","megaScovillain","megaDragalge","megaLopunny","megaAerodactyl","megaChimecho","megaCamerupt","volbeat","illumise","spheal","sealeo","walrein","piplup","prinplup","empoleon","gible","gabite","garchomp","grookey","thwackey","rillaboom","sneaselHisui","sneasler","heatmor","durant","scyther","scizor","megaScizor","diglett","dugtrio","snorlax","weedle","kakuna","beedrill","megaBeedrill","bellsprout","weepinbell","victreebel","shellder","cloyster","rattata","raticate","pumpkaboo","gourgeist","shaymin","celebi","lunala","zapdos","moltres","articuno","regirock","groudon","hooh","registeel","regice","regigigas","kyogre","thundurus","tapuFini","nihilego","tapuKoko","tapuBulu","tapuLele","heatran","landorus","volcanion","pheromosa","tornadus","magearna","diancie","virizion","spectrier","samurottHisui","baltoy","claydol","larvitar","pupitar","tyranitar","megaTyranitar","ironBundle","flutterMane","snorunt","glalie","megaGlalie","froslass","wooper","quagsire","skarmory","megaSkarmory","scraggy","scrafty","megaScrafty","onix","steelix","megaSteelix","drampa","megaDrampa","slowpoke","slowbro","megaSlowbro","tyrunt","tyrantrum","unown"];
            for(const key of keys)for(const lvl of [1,100,5000]){
                const poke=new Pokemon(p[key],lvl,null,m,undefined,false,null,undefined,true);
                for(const field of ['power','speed','range','critical'])assert(Number.isFinite(poke[field]),key+' invalid '+field);
                const restored=Pokemon.fromOriginalData(poke.getOriginalData(),m);
                assert(restored.acquisitionDate===poke.acquisitionDate,'Acquisition timestamp lost');
            }
            report.species=keys.length;report.levels=[1,100,5000];
            m.pokemonScene.pokemon=new Pokemon(p.porygon,97,null,m);
            assert(m.pokemonScene.getLevelUpAmount(10)===3,'Near-100 partial level batch');
            m.pokemonScene.pokemon.lvl=5000;m.pokemonScene.pokemon.isShiny=true;
            assert(m.pokemonScene.getLevelUpAmount(10)===10,'Shiny infinite batch');
            assert(m.profileScene.getBasePokemonKey('appletun')==='applin','Appleteun collection ancestry');
            m.game.restoreSpeed();
            for(const speed of [1.5,2,3,5,10,1]){
                m.game.toggleSpeed();assert(m.game.speedFactor===speed,'Speed button cycle '+speed);
            }
            assert(m.UI.speedWave.innerText==='1x','Speed reset label');
            const normal=Object.values(r).filter(x=>!x.isSecret);
            for(const route of normal){
                m.area.loadArea(route.id,100);m.area.spawnEnemies();
                assert(m.area.enemies[0]?.enemy.id===route.waves[100].preview[0].id,'Wrong boss '+route.id);
                assert(m.area.getWavePreview(200).id===route.waves[100].preview[0].id,'Wrong endless preview '+route.id);
            }
            report.bossRoutes=normal.length;
            for(let lang=0;lang<10;lang++){
                m.lang=lang;const entries=m.profileScene.getUnlockableEntries();
                assert(entries.length===233,'Unlockables count '+lang);
                assert(entries.every(e=>e.unlockText && !/undefined|\\{[a-z]+\\}/.test(e.unlockText)),'Missing translation '+lang);
            }
            report.languages=10;m.lang=0;
            const pieces=['h1','h2','q1','p4','p6','p7','b1','b2','k1','t1','t2'].map(chessType=>({chessType,setActive(value){this.active=value}}));
            const fixture={chessPieces:pieces,towers:[['kingdra',17],['vespiquen',10],['pawniard',25],['bisharp',26],['kingambit',24],['stakataka',10]].map(([key,id])=>({pokemon:{specie:p[key]},tile:{id}}))};
            Area.prototype.updateChessPieces.call(fixture);await new Promise(resolve=>setTimeout(resolve,80));
            assert(fixture.activePieces===10,'Chess activation rules');report.chessActive=fixture.activePieces;
            m.area.loadArea(35,1);
            assert(m.area.chessPieces.length>0,'Board pieces missing');
            assert(m.profileScene.getUnlockableEntries().find(e=>e.id==='secret-calyrex').unlockText.includes('Current board:'),'Live chess progress missing');
            report.chessPieces=m.area.chessPieces.length;
            // Exercise real placement, tower update, range rendering and all new held items.
            for(const key of keys){
                m.team.pokemon=[];m.area.loadArea(34,1);
                const poke=new Pokemon(p[key],100,null,m,undefined,false,null,undefined,true);
                m.team.pokemon=[poke];m.UI.updatePokemon();
                let tile=m.area.placementTiles.find(t=>poke.tiles.includes(t.land)&&!t.tower);
                if(!tile)for(const route of normal){m.area.loadArea(route.id,1);tile=m.area.placementTiles.find(t=>poke.tiles.includes(t.land)&&!t.tower);if(tile)break;}
                assert(tile,'No compatible tile '+key);
                m.game.deployingUnit=poke;m.game.moveUnitToTile(tile,true);
                const tower=m.area.towers.find(t=>t.pokemon===poke);assert(tower,'Placement failed '+key);
                for(const item of [null,"iron","zinc","xSpeed","smallBouquet","ruby","aerodactylite","metalCoatReal","thundersDrive","noxDex","rosesItem","luckyPunch","tropicalPetal","scovillainite","cameruptite","dragoninite","metagrossite","glalitite","froslassite","dragalgite","starminite","garchompite","houndoominite","gyaradosite","lopunnite","magearnite","heracronite","gardevoirite","beedrillite","scizorite","galladite","aggronite","tyranitarite","excadrite","chimechite","mawilite","skarmorite","scraftinite","steelixite","tatsugirinite","drampanite","slowbronite","gengarite"]){
                    poke.item=item?items[item]:null;
                    tower.updateStatsFromPokemon();m.area.checkWeather();tower.recalculatePower();
                    tower.update([],1000/60,true);tower.draw();
                    assert(Number.isFinite(tower.power)&&Number.isFinite(tower.speed)&&Number.isFinite(tower.range),'Nonfinite tower '+key+'/'+item);
                }
            }
            report.towerItemCombinations=keys.length*43;
            m.team.pokemon=[];m.area.loadArea(36,101);m.area.endlessMode=true;m.area.spawnEnemies();
            assert(m.area.enemies.length+m.area._spawnQueue.length>0,'Endless spawn empty');
            m.area.loadArea(37,200);m.area.endlessMode=true;m.area.spawnEnemies();
            assert(m.area.enemies.some(e=>e.enemy.id==='zacian'),'New route endless boss missing');
            m.area.loadArea(34,1);m.area.spawnEnemies();m.game.restoreSpeed();
            for(let i=0;i<5;i++)m.game.toggleSpeed();m.game.stopped=false;
            await new Promise(resolve=>setTimeout(resolve,1500));
            m.game.switchPause();assert(m.game.stopped,'Pause toggle');
            const positions=m.area.enemies.map(e=>e.position.x+','+e.position.y).join(';');
            await new Promise(resolve=>setTimeout(resolve,150));
            assert(positions===m.area.enemies.map(e=>e.position.x+','+e.position.y).join(';'),'Simulation moved during pause');
            const poke=new Pokemon(p.grubbin,100,null,m);m.team.pokemon=[poke];m.UI.updatePokemon();
            m.game.tryDeployUnit(0);assert(m.game.deployingUnit===poke,'Pause placement disabled by speed feature');m.game.cancelDeployUnit();
            report.speedAndPause=true;
            m.mapScene.open();m.mapScene.close();m.profileScene.open();m.profileScene.setActiveSubview('unlockables');
            return report;
        })()`);
        await delay(500);
        if(errors.length)throw new Error(errors.join('\n'));
        console.log('1.7.1 isolated gameplay regression passed:',JSON.stringify(result,null,2));
        if(process.argv[3]){
            const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(process.argv[3],Buffer.from(shot.data,'base64'));
        }
    } finally {socket.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
