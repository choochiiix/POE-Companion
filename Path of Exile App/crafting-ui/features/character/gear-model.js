import {createEngine,ASSUMPTION_CONFIG,createItem,updateItem,modPool,definition,affixCount} from '../../../crafting-engine/src/index.ts';
import {resolveEquipment} from '../../../calculation-engine/src/build.ts';
import {resolveWeapon} from '../../../calculation-engine/src/skill.ts';

export const gearStorageKey='poe-companion.gear.v1';
export const createGearEngine=mods=>createEngine(mods,ASSUMPTION_CONFIG);
export function gearPresentation(engine,base,row,source){
 const stats={};for(const mod of row?.mods??[])for(const [id,value]of Object.entries(mod.values))stats[id]=(stats[id]??0)+value;
 const rarity=row?.rarity??'normal';const defs=(row?.mods??[]).map(mod=>definition(engine,mod.id));
 const prefix=defs.find(mod=>mod.affix==='prefix')?.name,suffix=defs.find(mod=>mod.affix==='suffix')?.name;
 const title=rarity==='magic'?[prefix,base.name,suffix].filter(Boolean).join(' '):rarity==='rare'?`Rare ${base.name}`:base.name;
 const properties=[base.itemClass],p=source?.properties;
 if(p){
  const localMap={'local_physical_damage_reduction_rating_+%':['armour','INC'],'local_evasion_rating_+%':['evasion','INC'],'local_energy_shield_+%':['energyShield','INC'],'local_base_physical_damage_reduction_rating':['armour','BASE'],'local_base_evasion_rating':['evasion','BASE'],'local_energy_shield':['energyShield','BASE']};
  const localModifiers=Object.entries(stats).filter(([id])=>localMap[id]).map(([id,value])=>({id,stat:localMap[id][0],kind:localMap[id][1],value}));
  const defence=resolveEquipment({id:base.id,slot:'preview',modifiers:[],localModifiers,defence:{armour:p.armour?(p.armour.min+p.armour.max)/2:0,evasion:p.evasion?(p.evasion.min+p.evasion.max)/2:0,energyShield:p.energy_shield?(p.energy_shield.min+p.energy_shield.max)/2:0}});
  for(const [stat,label]of [['armour','Armour'],['evasion','Evasion Rating'],['energyShield','Energy Shield']])if(defence[stat].value)properties.push(`${label}: ${Math.round(defence[stat].value)}`);
  if(p.attack_time){const weapon=resolveWeapon({id:base.id,damage:{physical:{min:p.physical_damage_min,max:p.physical_damage_max}},attacksPerSecond:1000/p.attack_time,criticalChance:p.critical_strike_chance/100,local:{increasedPhysicalDamage:stats['local_physical_damage_+%']??0,increasedAttackSpeed:stats['local_attack_speed_+%']??0,increasedCriticalChance:stats['local_critical_strike_chance_+%']??0}});properties.push(`Physical Damage: ${weapon.damage.physical.min}–${weapon.damage.physical.max}`,`Critical Strike Chance: ${weapon.criticalChance.toFixed(2)}%`,`Attacks per Second: ${weapon.attacksPerSecond.toFixed(2)}`);}
 }
 const req=source?.requirements;const requirements=req?`Base requires Level ${req.level??base.dropLevel??1}${[['strength','Str'],['dexterity','Dex'],['intelligence','Int']].filter(([key])=>req[key]).map(([key,label])=>`, ${req[key]} ${label}`).join('')}`:'Base requirements unavailable';
 return {title,rarity,properties,requirements};
}
export function inferredRarity(engine,item){
  const prefixes=affixCount(engine,item,'prefix'),suffixes=affixCount(engine,item,'suffix');
  return prefixes+suffixes===0?'normal':prefixes<=1&&suffixes<=1?'magic':'rare';
}
/** Replay every choice through the actual crafting pool; no parallel eligibility algorithm. */
export function validateGear(engine,bases,row){
  const base=bases.find(base=>base.id===row?.baseId);
  if(!base)throw Error('Select a supported equipment base.');
  if(!Number.isInteger(row.itemLevel)||row.itemLevel<1||row.itemLevel>100)throw Error('Item level must be 1–100.');
  if(!Array.isArray(row.mods)||row.mods.length>6)throw Error('Invalid modifier list.');
  let item=createItem(base,row.itemLevel,'rare');
  for(const rolled of row.mods){
    const candidate=modPool(engine,item).find(({mod})=>mod.id===rolled.id)?.mod;
    if(!candidate)throw Error('An affix conflicts, exceeds its slots, or cannot appear on this base at this item level.');
    if(!rolled.values||Object.keys(rolled.values).length!==candidate.stats.length)throw Error('Every source stat needs an exact roll.');
    for(const stat of candidate.stats)if(!Number.isSafeInteger(rolled.values[stat.id])||rolled.values[stat.id]<stat.min||rolled.values[stat.id]>stat.max)throw Error('A roll is outside its allowed range.');
    item=updateItem(item,{mods:[...item.mods,{id:rolled.id,values:{...rolled.values}}]});
  }
  item=updateItem(item,{rarity:inferredRarity(engine,item)});
  return {baseId:base.id,itemLevel:item.itemLevel,rarity:item.rarity,mods:item.mods.map(mod=>({id:mod.id,values:{...mod.values}}))};
}
export function eligibleAffixes(engine,bases,row){
  const valid=validateGear(engine,bases,row),base=bases.find(base=>base.id===valid.baseId);
  const item=updateItem(createItem(base,valid.itemLevel,'rare'),{mods:valid.mods});
  return modPool(engine,item).map(({mod})=>mod);
}
const labels={base_maximum_life:['maximum Life','+'],base_maximum_mana:['maximum Mana','+'],additional_strength:['Strength','+'],additional_dexterity:['Dexterity','+'],additional_intelligence:['Intelligence','+'],'base_fire_damage_resistance_%':['Fire Resistance','+%'],'base_cold_damage_resistance_%':['Cold Resistance','+%'],'base_lightning_damage_resistance_%':['Lightning Resistance','+%'],'base_chaos_damage_resistance_%':['Chaos Resistance','+%']};
export function modifierLabel(engine,rolled){const mod=definition(engine,rolled.id);return mod.stats.map(stat=>{const known=labels[stat.id],value=rolled.values[stat.id],local={'local_physical_damage_reduction_rating_+%':'Armour','local_evasion_rating_+%':'Evasion Rating','local_energy_shield_+%':'Energy Shield'}[stat.id];return local?`${value}% increased ${local}`:known?`+${value}${known[1].includes('%')?'%':''} to ${known[0]}`:`${mod.description||mod.name||mod.id} · ${value} source units`;}).join(' · ');}
export function gearCalculationOverride(engine,bases,row){const valid=validateGear(engine,bases,row),base=bases.find(base=>base.id===valid.baseId);return {baseId:base.id,name:base.name,rarity:valid.rarity,lines:(base.implicits??[]).map(mod=>(mod.description||mod.id).replace(/\((-?\d+(?:\.\d+)?)[–-](-?\d+(?:\.\d+)?)\)/g,(_,a,b)=>String((Number(a)+Number(b))/2))),rawStats:Object.fromEntries([...new Set(valid.mods.flatMap(mod=>Object.keys(mod.values)))].map(id=>[id,valid.mods.reduce((sum,mod)=>sum+(mod.values[id]??0),0)]))};}
