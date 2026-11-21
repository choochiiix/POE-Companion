import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assembleWorkspace,compareWorkspace} from '../features/calculations/source-adapter.js';
const load=path=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
const data=load('../calculation-data.json'),tree=load('../../data-sources/pob-tree-3_29/tree-view.json'),gems=load('../skills-data.json').gems;
function fixture(){return {data,tree,gems,character:{characterClass:'Witch',ascendancy:''},equipment:{'main-hand':'Metadata/Items/Weapons/OneHandWeapons/OneHandSwords/OneHandSword1','body-armour':'Metadata/Items/Armours/BodyArmours/BodyStr1'},selection:{selected:[57264,33296],masteries:{}},groups:[{id:'main',activeId:'Metadata/Items/Gems/SkillGemFireball',supportIds:['Metadata/Items/Gems/SkillGemSupportElementalFocus']}],context:{level:20,groupId:'main',gemEndpoint:'first',penalty:0,enemyResistance:0,enemyArmour:0,enemyEvasion:0,enemyAccuracy:0,incomingHit:100},overrides:{}};}
test('actual live source adapter matches the pinned Witch trial and reacts to selected passives',()=>{
 const input=fixture();const result=assembleWorkspace(input).calculation;
 assert.ok(Math.abs(result.offence.dps-24.6)<1e-9);assert.equal(result.defence.pools.life.value,285);assert.equal(result.defence.pools.mana.value,186);
 const bare=assembleWorkspace({...input,selection:{selected:[],masteries:{}}}).calculation;
 assert.ok(bare.offence.dps<result.offence.dps);assert.equal(bare.defence.pools.mana.value,170);
});
test('unsupported active skills return pending DPS and preserve source diagnostics',()=>{
 const input=fixture();const gem=gems.find(gem=>gem.type==='active'&&gem.tags.includes('minion'));
 input.groups[0].activeId=gem.id;const result=assembleWorkspace(input).calculation;
 assert.equal(result.offence,null);assert.ok(result.diagnostics.some(issue=>issue.effect.includes('Damage calculation pending')));
});
test('detailed equipment comparison applies local armour once and never changes the input',()=>{
 const input=fixture(),serialized=JSON.stringify(input);
 const result=compareWorkspace(input,'body-armour',{baseId:input.equipment['body-armour'],name:'Armour preview',lines:['100% increased Armour']});
 assert.equal(result.changes.find(row=>row.stat==='armour').delta,23);assert.equal(JSON.stringify(input),serialized);
});
test('unmapped crafted stat units remain diagnostic rather than being guessed',()=>{
 const input=fixture();input.overrides['body-armour']={baseId:input.equipment['body-armour'],name:'Crafted armour',lines:[],rawStats:{base_maximum_life:50,unknown_scaled_stat:500}};
 const result=assembleWorkspace(input).calculation;assert.equal(result.defence.pools.life.value,335);assert.ok(result.diagnostics.some(issue=>issue.effect.includes('unknown_scaled_stat')));
});
test('rolled local armour applies per item before global scaling',()=>{
 const input=fixture();input.overrides['body-armour']={baseId:input.equipment['body-armour'],name:'Armour',lines:[],rawStats:{'local_physical_damage_reduction_rating_+%':100}};
 assert.equal(assembleWorkspace(input).calculation.defence.pools.armour.value,46);
});
test('rolled local weapon stats flow through workspace calculation and equipment comparison',()=>{
 const input=fixture();input.groups=[{id:'main',activeId:'',supportIds:[]}];input.context={...input.context,groupId:'default-attack'};
 const slot='main-hand',baseId=input.equipment[slot];
 const rolled={baseId,name:'Rolled Rusted Sword',lines:[],rawStats:{local_minimum_added_physical_damage:2,local_maximum_added_physical_damage:4,'local_physical_damage_+%':20,'local_attack_speed_+%':10,'local_critical_strike_chance_+%':20,local_accuracy_rating:300}};
 const result=assembleWorkspace({...input,overrides:{[slot]:rolled}});
 assert.equal(result.build.skill.id,'default-attack');assert.deepEqual(result.weaponEvidence,{hand:'main-hand',itemId:baseId});
 assert.deepEqual(result.build.skill.damage.physical,{min:7,max:16});
 assert.equal(result.build.skill.baseCritChance,6);
 assert.ok(result.calculation.offence.accuracy.value>result.build.skill.accuracy);
 const comparison=compareWorkspace(input,slot,rolled);
 assert.ok(comparison.changes.find(row=>row.stat==='hitDps').delta>0);
});
test('incomplete local added damage remains diagnostic and explicit encounter fallbacks stay finite',()=>{
 const input=fixture();input.groups=[{id:'main',activeId:'',supportIds:[]}];input.context={...input.context,groupId:'default-attack'};
 const slot='main-hand',baseId=input.equipment[slot];input.overrides[slot]={baseId,name:'Partial local roll',lines:[],rawStats:{local_minimum_added_physical_damage:4}};
 input.calculation={enemy:{armour:undefined,evasion:undefined,accuracy:undefined}};
 const result=assembleWorkspace(input);
 assert.equal(result.build.enemy.armour,0);assert.equal(result.build.enemy.evasion,0);assert.equal(result.build.enemy.accuracy,0);
 assert.ok(result.calculation.diagnostics.some(issue=>issue.effect.includes('complete sane minimum/maximum range')));
});
test('ephemeral exact skill and encounter configuration are forwarded without endpoint interpolation',()=>{
 const input=fixture();input.calculation={conditions:['Onslaught'],sources:[{id:'explicit-source',kind:'configuration',modifiers:[]}],
  buffs:[{id:'explicit-buff',kind:'buff',modifiers:[]}],enemy:{resistances:{fire:35},exposure:{fire:10},penetration:{fire:5}},
  conversion:[{sourceId:'explicit-conversion',from:'physical',to:'fire',percent:25,kind:'convert'}],
  incomingHit:{kind:'spell',damage:{fire:25}},defenceConfig:{reservation:{mana:{percent:20}},recovery:{life:{flat:3,increasedPercent:20}},energyShieldRecharge:{baseRatePercent:33.333,delaySeconds:2}},
  skill:{gemId:'Metadata/Items/Gems/SkillGemFireball',level:7,quality:20,sourceId:'fixture:fireball:7/20',damage:{fire:{min:100,max:200}},baseTime:2,baseCritChance:7,addedDamageEffectiveness:2.5}};
 const result=assembleWorkspace(input);
 assert.deepEqual(result.build.skill.damage.fire,{min:100,max:200});assert.equal(result.build.skill.baseTime,2);assert.equal(result.build.skill.baseCritChance,7);
 assert.deepEqual(result.skillEvidence,{level:7,quality:20,sourceId:'fixture:fireball:7/20'});
 assert.deepEqual(result.build.enemy.resistances,{fire:35,cold:0,lightning:0,chaos:0});assert.equal(result.build.enemy.exposure.fire,10);assert.equal(result.build.enemy.penetration.fire,5);
 assert.deepEqual(result.build.conditions,['Onslaught']);assert.equal(result.build.incomingHit.damage.fire,25);assert.equal(result.build.defenceConfig.reservation.mana.percent,20);assert.equal(result.build.defenceConfig.recovery.life.flat,3);assert.equal(result.build.defenceConfig.energyShieldRecharge.delaySeconds,2);
 assert.equal(result.build.sources[0].id,'explicit-source');assert.equal(result.build.buffs[0].id,'explicit-buff');
 assert.equal(result.build.conversion[0].sourceId,'explicit-conversion');
});
test('selected tree resistance and equipped resistance modifiers reach the visible calculation',()=>{
 const input=fixture();
 input.tree={...input.tree,nodes:{...input.tree.nodes,adapterResistanceFixture:{id:'adapterResistanceFixture',name:'Resistance fixture',stats:['+12% to all Elemental Resistances']}}};
 input.selection={selected:['adapterResistanceFixture'],masteries:{}};
 input.overrides['body-armour']={baseId:input.equipment['body-armour'],name:'Resistant armour',lines:['+18% to Fire Resistance','+14% to Cold and Lightning Resistances']};
 const result=assembleWorkspace(input).calculation.defence.resistances;
 assert.equal(result.fire.effective,30);assert.equal(result.cold.effective,26);assert.equal(result.lightning.effective,26);assert.equal(result.chaos.effective,0);
});
