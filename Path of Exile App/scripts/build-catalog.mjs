import {readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {parseMod} from '../crafting-ui/features/items/catalog-model.js';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const rawBases=await read('data-sources/repoe-poe1/base_items.json');
const classes=await read('data-sources/repoe-poe1/item_classes.json');
const identities=Object.values(await read('resources/uniques.json'));
const flavour=await read('resources/flavour.json');
const diagnostics=[];
// RePoE assigns non-item domains to flasks/jewels; include those item classes explicitly.
for(const b of Object.values(rawBases))if(/flask|jewel|tincture|graft/i.test(b.item_class))b.domain='item';
const category=c=>/armour|shield|helmet|boot|glove/i.test(c)?'Armour':/axe|mace|sword|bow|claw|dagger|staff|wand|fishing/i.test(c)?'Weapons':/flask/i.test(c)?'Flasks':/jewel/i.test(c)?'Jewels':/ring|amulet|belt/i.test(c)?'Accessories':/quiver/i.test(c)?'Quivers':c;
const bases=Object.entries(rawBases).filter(([,b])=>b.domain==='item').map(([id,b])=>({id,name:b.name,baseType:b.name,itemClass:b.item_class,category:category(b.item_class),level:b.requirements?.level??b.drop_level??0,requirements:{strength:b.requirements?.strength??0,dexterity:b.requirements?.dexterity??0,intelligence:b.requirements?.intelligence??0},implicit:[],explicit:[],stats:Object.fromEntries(Object.entries(b.properties).filter(([k,v])=>v!==null&&/armour|evasion|energy_shield|ward|block|damage|attack_time|critical_strike/.test(k)).map(([k,v])=>[k,typeof v==='object'?`${v.min}–${v.max}`:v])),implicitIds:b.implicits}));
const byName=new Map(bases.map(b=>[b.name,b]));
const uniques=[];let definitions=0;
const dir='resources/path-of-building/PathOfBuilding-dev/src/Data/Uniques';
const hashes={};
for(const file of (await readdir(dir)).filter(n=>n.endsWith('.lua'))){
 const source=await readFile(`${dir}/${file}`,'utf8');hashes[file]=createHash('sha256').update(source).digest('hex');
 for(const match of source.matchAll(/\[\[([\s\S]*?)\]\]/g)){
  const lines=match[1].trim().split(/\r?\n/).map(s=>s.trim()).filter(Boolean);const name=lines.shift();if(!name)continue;definitions++;
  const variants=lines.filter(l=>l.startsWith('Variant:')).map(l=>l.slice(8).trim());
  for(let vi=1;vi<=Math.max(1,variants.length);vi++){
   const selected=lines.filter(l=>{const m=l.match(/\{variant:([\d,]+)\}/);return !m||m[1].split(',').map(Number).includes(vi);}).map(l=>l.replace(/\{variant:[\d,]+\}/g,''));
   const baseType=selected.shift();const base=byName.get(baseType);
   const family=`${file}:${match.index}`;const variant=variants[vi-1]??'Current';
   const implicit=[],explicit=[],metadata=[];let remaining=0;
   let level=base?.level??0;
   for(const raw of selected){
    if(/^Implicits: \d+$/.test(raw)){remaining=Number(raw.slice(11));continue;}
    if(/^Requires Level \d+$/.test(raw)){level=Number(raw.slice(15));continue;}
    if(/^(Variant:|League:|Source:|Upgrade:|Dropdown:|Selected Variant:|Has Alt Variant:|Selected Alt Variant:|Crafted:|Quality:|Sockets:|Item Level:|Radius:|Limited to:|LevelReq:)/.test(raw)){metadata.push(raw);continue;}
    const text=raw.replace(/\{(?:tags|range):[^}]*\}/g,'');const mod={...parseMod(text),raw};
    if(/[{}]/.test(text)){mod.unparsed=true;diagnostics.push({item:name,variant,raw,reason:'Unsupported annotation retained'});}
    (remaining>0?implicit:explicit).push(mod);if(remaining>0)remaining--;
   }
   if(!base)diagnostics.push({item:name,variant,raw:baseType,reason:'Base not matched; requirements unknown'});
   const identity=identities.find(i=>i.name===name&&!i.is_alternate_art);
   const flavorText=flavour[identity?.visual_identity?.id]??null;
   uniques.push({id:`${family}:${vi}`,family,name,baseType,baseId:base?.id??null,itemClass:base?.itemClass??file.replace('.lua',''),category:base?.category??'Other',level,requirements:base?.requirements??{},requirementsKnown:!!base,implicit,explicit,variant,legacy:/^Pre\b/i.test(variant)||metadata.some(s=>s.includes('No longer obtainable')),flavorText,metadata,source:file});
  }
 }
}
const report={definitions,variantRecords:uniques.length,missingFlavor:uniques.filter(i=>!i.flavorText).length,diagnostics,hashes,limitations:['Static long-string definitions only; dynamically generated Special Lua files are not executed or imported.','Base requirements are unmodified base requirements; unique requirement modifiers are retained as text.','Missing implicit definitions on bases are retained as IDs, not translated.','Snapshot completeness is not live-game completeness.']};
await writeFile('crafting-ui/catalog-data.json',JSON.stringify({bases,uniques,report}));
await writeFile('resources/catalog-import-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({definitions,variants:uniques.length,missingFlavor:report.missingFlavor,diagnostics:diagnostics.length}));
