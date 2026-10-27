// Read-only tests of the installed scripts, with in-memory saves and Pokemon.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const root = path.resolve(process.argv[2]);
const allowDupes = process.argv.includes('--allow-dupes');
(async () => {
    const {pokemonData:p, eggListData:eggs, forcedInitialPool, forcedSecondaryPool} = await import(pathToFileURL(path.join(root,'src/js/game/data/pokemonData.js')));
    function evaluate(file, expression, globals={}) {
        const code = fs.readFileSync(path.join(root,'src/js/game',file),'utf8')
            .replace(/^import [^\n]*$/gm,'').replace(/^export /gm,'');
        return vm.runInNewContext(code+'\n'+expression, {pokemonData:p,eggListData:eggs,...globals});
    }
    const safety = evaluate('core/EggShopSafety.js','({eggSpecies,reconcileEggList})');
    const makeShop = (owned, list=eggs) => ({main:{team:{pokemon:owned},box:{pokemon:[]}},eggList:[...list],eggPrice:50000});
    let checks=0;
    for (const [key,specie] of Object.entries(p)) {
        for (const owned of [{specie,id:specie.id},{specieKey:key},{specie:{id:specie.id}},{specie:key}]) {
            const shop=makeShop([owned],[...eggs,...eggs,null,{key:'pikachu'},{id:p.pikachu.id},'missingNo','bogus']);
            const before=JSON.stringify(shop.main);
            safety.reconcileEggList(shop);
            assert(!shop.eggList.some(k=>p[k].id===specie.id),key);
            assert(shop.eggList.every(k=>eggs.includes(k)));
            assert.equal(new Set(shop.eggList.map(k=>p[k].id)).size,shop.eggList.length);
            assert.equal(JSON.stringify(shop.main),before,'roster mutated');
            assert.equal(shop.eggPrice,50000);
            const stable=JSON.stringify(shop.eggList);safety.reconcileEggList(shop);
            assert.equal(JSON.stringify(shop.eggList),stable,'not idempotent');checks++;
        }
    }
    const oldOwned=eggs.filter(k=>!['piplup','grookey','weedle'].includes(k)).map(k=>({specie:p[k]}));
    const upgrade=makeShop(oldOwned,[]);safety.reconcileEggList(upgrade);
    assert.deepEqual([...upgrade.eggList].sort(),['grookey','piplup','weedle']);
    class Pokemon {
        constructor(specie,lvl,item,main){Object.assign(this,{specie,id:specie.id,lvl,main});}
        static fromOriginalData(data,main){return Object.assign(new Pokemon(p[data.specieKey],data.lvl,null,main),data);}
        setShiny(){}
    }
    const main={player:{teamSlots:10,gold:1e9,stats:{pokemonOwned:0,totalPokemonLevel:0},changeGold(n){this.gold+=n;}},
        area:{heavyMetal:false,inChallenge:false,waveActive:false},UI:{update(){},fastScene:{isOpen:false}},
        shopScene:{update(){},displayPokemon:{open(){}}}};
    const Team=evaluate('core/Team.js','Team',{Pokemon});
    const Box=evaluate('core/Box.js','Box',{Pokemon});
    const records=[{specieKey:'raichu',lvl:100,isShiny:true},{specieKey:'pikachu',lvl:55}];
    main.team=new Team(main,records);main.box=new Box(main,[{specieKey:'raichu',lvl:5000,isShiny:true}]);
    assert.equal(main.team.pokemon.length+main.box.pokemon.length,3,'saved copies deleted');
    const existing=main.box.pokemon[0];main.team.addPokemon(existing);main.box.removePokemon(existing);
    assert(main.team.pokemon.includes(existing),'existing copy transfer rejected');
    main.box.addPokemon(existing);main.team.removePokemon(existing);
    assert(main.box.pokemon.includes(existing),'return transfer rejected');
    main.team.addPokemon(new Pokemon(p.pikachu,1,null,main));
    assert.equal(main.team.pokemon.length,allowDupes?3:2,'new duplicate policy');
    const Shop=evaluate('core/Shop.js','Shop',{Pokemon,forcedInitialPool,forcedSecondaryPool,...safety,playSound(){},saveData(){},findSpecieInCatalog:e=>safety.eggSpecies(e)});
    const shop=Object.assign(Object.create(Shop.prototype),{main,eggList:['pikachu','missingNo','bogus'],eggPrice:50000});
    // Mark all vanilla egg lines owned: even a stale direct buy must cost nothing.
    main.team.pokemon=eggs.map(k=>new Pokemon(p[k],100,null,main));main.box.pokemon=[];
    const beforeGold=main.player.gold,beforeCount=main.team.pokemon.length;
    shop.buyEgg();assert.equal(shop.eggList.length,0);assert.equal(main.player.gold,beforeGold);
    assert.equal(main.team.pokemon.length,beforeCount);
    // The pool must drain without reintroducing evolved, shiny or purchased lines.
    main.team.pokemon=[new Pokemon(p.raichu,100,null,main)];main.team.pokemon[0].isShiny=true;
    shop.eggList=['pikachu',...eggs];safety.reconcileEggList(shop);const count=shop.eggList.length;
    for(let i=0;i<count;i++)shop.buyEgg();
    assert.equal(shop.eggList.length,0);assert.equal(main.player.stats.pokemonOwned,count);
    assert.equal(main.player.gold,beforeGold-count*50000);
    const roster=[...main.team.pokemon,...main.box.pokemon];
    assert.equal(new Set(roster.map(x=>x.id)).size,roster.length,'duplicate egg acquired');
    const saved=[...main.team.pokemon,...main.box.pokemon].map(x=>({specieKey:x.specie.key,lvl:x.lvl,isShiny:!!x.isShiny}));
    main.team=new Team(main,saved.slice(0,10));main.box=new Box(main,saved.slice(10));
    assert.equal(main.team.pokemon.length+main.box.pokemon.length,saved.length,'reload lost Pokemon');
    console.log(`PASS egg shop: ${checks} ownership cases; stale queues, new eggs, drain/prices, reload, transfers; allow_dupes=${allowDupes}`);
})().catch(e=>{console.error(e);process.exitCode=1;});
