// Inspect a live renderer; --exercise is destructive and restricted to an isolated test install.
const fs=require('node:fs'),assert=require('node:assert/strict');
const port=Number(process.argv[2]||9233), exercise=process.argv.includes('--exercise');
(async()=>{
    const target=(await(await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t=>t.type==='page');
    if(exercise && (!target.url.includes('/context/') || !target.url.includes('/test_game/')))throw Error('Refusing fixtures on a live install');
    const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r,{once:true}));
    let id=0;const pending=new Map(),errors=[];
    ws.addEventListener('message',event=>{const msg=JSON.parse(event.data);if(msg.id){const q=pending.get(msg.id);pending.delete(msg.id);msg.error?q.reject(Error(JSON.stringify(msg.error))):q.resolve(msg.result);}else if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);});
    const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));});
    try{
        await send('Runtime.enable');
        const proto=await send('Runtime.evaluate',{expression:"import('./src/js/game/Main.js').then(m=>m.Main.prototype)",awaitPromise:true});
        const objects=await send('Runtime.queryObjects',{prototypeObjectId:proto.result.objectId});
        const result=await send('Runtime.callFunctionOn',{objectId:objects.objects.objectId,awaitPromise:true,returnByValue:true,arguments:[{value:exercise}],functionDeclaration:`async function(exercise){
            const m=this.find(x=>x.area&&x.shop);if(!m)throw Error('Game not ready');
            const {pokemonData:p,eggListData:eggs}=await import('./src/js/game/data/pokemonData.js');
            const signature=q=>({key:q.specie.key,lvl:q.lvl,shiny:!!q.isShiny,item:q.item?.id||null,alias:q.alias||null,skin:q.skin||null,favorite:!!q.favorite,hideShiny:!!q.hideShiny,isReset:!!q.isReset});
            const roster=[...m.team.pokemon,...m.box.pokemon];
            const owned=new Set(roster.map(q=>q.specie.id));
            const report={roster:roster.map(signature),eggs:m.shop.eggList,ownedEggs:m.shop.eggList.filter(k=>owned.has(p[k]?.id)),invalidEggs:m.shop.eggList.filter(k=>!eggs.includes(k)),gold:m.player.gold,eggPrice:m.shop.eggPrice};
            if(report.ownedEggs.length||report.invalidEggs.length)throw Error('Stale egg pool survived startup');
            if(exercise){
                m.game.stopped=true;m.area.waveActive=false;m.area.heavyMetal=false;m.area.inChallenge=false;
                const {Pokemon}=await import('./src/js/game/component/Pokemon.js');
                m.team.pokemon=[new Pokemon(p.raichu,100,null,m)];m.box.pokemon=[new Pokemon(p.pikachu,55,null,m)];
                m.player.gold=1e9;m.shop.eggPrice=50000;m.shop.eggList=['pikachu',...eggs];m.shop.updateEggList();
                if(m.shop.eggList.includes('pikachu'))throw Error('Raichu failed to exclude Pikachu');
                const before=JSON.stringify([...m.team.pokemon,...m.box.pokemon].map(signature));
                m.shop.updateEggList();if(before!==JSON.stringify([...m.team.pokemon,...m.box.pokemon].map(signature)))throw Error('Roster mutated');
                const count=m.shop.eggList.length;
                for(let i=0;i<count;i++)m.shop.buyEgg();
                const gold=m.player.gold,number=m.team.pokemon.length+m.box.pokemon.length;
                m.shop.buyEgg();if(gold!==m.player.gold||number!==m.team.pokemon.length+m.box.pokemon.length)throw Error('Empty pool charged or granted Pokemon');
                if(m.shop.eggList.length!==0||number!==count+2)throw Error('Egg drain/duplicate retention failed');
                report.exercise={purchases:count,retainedOriginalCopies:2,goldSpent:1e9-gold};
            }
            return report;
        }`});
        if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);
        const report=result.result.value;
        const baselineArg=process.argv.find(x=>x.startsWith('--baseline='));
        if(baselineArg){
            const baseline=JSON.parse(fs.readFileSync(baselineArg.slice(11),'utf8'));
            const sorted=x=>x.map(q=>JSON.stringify(q)).sort();
            assert.deepEqual(sorted(report.roster),sorted(baseline.roster),'A saved Pokemon changed or disappeared');
            assert.equal(report.gold,baseline.gold,'startup changed gold');
            assert.equal(report.eggPrice,baseline.eggPrice,'startup reset egg price');
        }
        assert.equal(errors.length,0,errors.join('\n'));
        console.log('PASS Electron egg hotfix:',JSON.stringify({pokemon:report.roster.length,remainingEggs:report.eggs.length,ownedEggs:report.ownedEggs.length,invalidEggs:report.invalidEggs.length,baselineCompared:!!baselineArg,exercise:report.exercise}));
    }finally{ws.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
