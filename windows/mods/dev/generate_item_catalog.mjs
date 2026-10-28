import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(process.argv[2]);
const output=process.argv[3]||path.join(import.meta.dirname,'item_catalog.json');
const {itemData}=await import(pathToFileURL(path.join(root,'src/js/game/data/itemData.js')));
if(Object.entries(itemData).some(([key,item])=>item.id!==key||item.name?.length!==10))throw Error('Invalid item metadata');
fs.writeFileSync(output,JSON.stringify({gameVersion:process.argv[4]||'1.7.1',items:itemData},null,2)+'\n');
console.log('Generated complete item catalog:',Object.keys(itemData).length);
