import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGearEngine,validateGear,eligibleAffixes,gearCalculationOverride,gearPresentation} from '../features/character/gear-model.js';
const data=JSON.parse(readFileSync(new URL('../../crafting-data/repoe-poe1.json',import.meta.url),'utf8')),engine=createGearEngine(data.mods),base=data.bases.find(base=>base.name==='Plate Vest');
const fresh=()=>({baseId:base.id,itemLevel:85,mods:[]});
const roll=mod=>({id:mod.id,values:Object.fromEntries(mod.stats.map(stat=>[stat.id,stat.min]))});
test('tooltip card properties and magic names use actual base data and local defence calculation',()=>{
 const sources=JSON.parse(readFileSync(new URL('../calculation-data.json',import.meta.url),'utf8'));
 const row=validateGear(engine,data.bases,{...fresh(),mods:[roll(engine.mods.find(mod=>mod.id==='IncreasedLife0'))]});
 const view=gearPresentation(engine,base,row,sources.bases[base.id]);
 assert.equal(view.title,'Hale Plate Vest');assert.ok(view.properties.includes('Armour: 23'));assert.match(view.requirements,/12 Str/);
 const sword=data.bases.find(base=>base.name==='Rusted Sword');const weapon=gearPresentation(engine,sword,null,sources.bases[sword.id]);assert.ok(weapon.properties.includes('Physical Damage: 4–9'));assert.ok(weapon.properties.includes('Attacks per Second: 1.55'));
});
test('rarity derives from prefix/suffix arrangement, not just total modifier count',()=>{
 const row=fresh();assert.equal(validateGear(engine,data.bases,row).rarity,'normal');
 row.mods.push(roll(eligibleAffixes(engine,data.bases,row).find(mod=>mod.id==='IncreasedLife0')));assert.equal(validateGear(engine,data.bases,row).rarity,'magic');
 row.mods.push(roll(eligibleAffixes(engine,data.bases,row).find(mod=>mod.affix==='suffix')));assert.equal(validateGear(engine,data.bases,row).rarity,'magic');
 row.mods.push(roll(eligibleAffixes(engine,data.bases,row).find(mod=>mod.affix==='prefix')));assert.equal(validateGear(engine,data.bases,row).rarity,'rare');
});
test('real base, item level, duplicate and conflict checks are enforced on every edit',()=>{
 const row=fresh(),life=engine.mods.find(mod=>mod.id==='IncreasedLife0');row.mods=[roll(life)];
 assert.throws(()=>validateGear(engine,data.bases,{...row,mods:[...row.mods,...row.mods]}));
 assert.throws(()=>validateGear(engine,data.bases,{...row,mods:[...row.mods,roll(engine.mods.find(mod=>mod.id==='IncreasedLife1'))]}));
 assert.throws(()=>validateGear(engine,data.bases,{...row,mods:[{...roll(life),values:{base_maximum_life:1000}}]}));
 assert.throws(()=>validateGear(engine,data.bases,{...row,itemLevel:0}));
 assert.ok(eligibleAffixes(engine,data.bases,{...fresh(),itemLevel:1}).every(mod=>mod.requiredLevel<=1));
});
test('affix pool closes each prefix side at three while leaving eligible suffixes',()=>{
 const row=fresh();for(let i=0;i<3;i++)row.mods.push(roll(eligibleAffixes(engine,data.bases,row).find(mod=>mod.affix==='prefix')));
 assert.ok(eligibleAffixes(engine,data.bases,row).every(mod=>mod.affix!=='prefix'));assert.ok(eligibleAffixes(engine,data.bases,row).some(mod=>mod.affix==='suffix'));
});
test('calculation override preserves exact rolled values and independent caller data',()=>{
 const row=fresh();row.mods=[roll(engine.mods.find(mod=>mod.id==='IncreasedLife0'))];const before=JSON.stringify(row),override=gearCalculationOverride(engine,data.bases,row);
 assert.equal(override.rawStats.base_maximum_life,3);assert.equal(JSON.stringify(row),before);
});
