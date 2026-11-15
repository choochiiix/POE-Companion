import {readFile,writeFile} from 'node:fs/promises';
const load=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
const [raw,mods,craft,constants]=await Promise.all(['data-sources/repoe-poe1/base_items.json','data-sources/repoe-poe1/mods.json','crafting-data/repoe-poe1.json','calculation-engine/trial/source-constants.json'].map(load));
const bases=Object.fromEntries(craft.bases.map(base=>[base.id,{id:base.id,name:base.name,itemClass:base.itemClass,properties:raw[base.id].properties,requirements:raw[base.id].requirements,
  implicits:(raw[base.id].implicits??[]).map(id=>({id,text:mods[id]?.text??id,stats:mods[id]?.stats??[]}))}]));
await writeFile(new URL('../crafting-ui/calculation-data.json',import.meta.url),JSON.stringify({version:1,source:'Preserved offline PoB/RePoE snapshots; base ranges use explicit midpoint estimates',constants:constants.values,bases}));
console.log(`Calculation source data: ${Object.keys(bases).length} bases`);
