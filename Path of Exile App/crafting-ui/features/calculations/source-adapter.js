import {calculateBuild,compareBuilds,assembleSkill,translateEffects} from '../../../calculation-engine/src/index.ts';
import {compatibility} from '../skills/skills-model.js';
import {validEquipment} from '../character/character-data.js';

export const midpointText = text => String(text).replace(/\((-?\d+(?:\.\d+)?)[–-](-?\d+(?:\.\d+)?)\)/g,(_,a,b)=>String((Number(a)+Number(b))/2));
const endpointText = (text,max) => String(text).replace(/\((-?\d+(?:\.\d+)?)[–-](-?\d+(?:\.\d+)?)\)/g,(_,a,b)=>max?b:a);
const rawStats={base_maximum_life:['life','BASE'],base_maximum_mana:['mana','BASE'],additional_strength:['strength','BASE'],additional_dexterity:['dexterity','BASE'],additional_intelligence:['intelligence','BASE'],local_accuracy_rating:['accuracy','BASE'],'spell_damage_+%':['spellDamage','INC'],'fire_damage_+%':['fireDamage','INC'],'base_fire_damage_resistance_%':['fireResistance','BASE'],'base_cold_damage_resistance_%':['coldResistance','BASE'],'base_lightning_damage_resistance_%':['lightningResistance','BASE'],'base_chaos_damage_resistance_%':['chaosResistance','BASE']};
const weaponLocalStats={'local_physical_damage_+%':'increasedPhysicalDamage','local_attack_speed_+%':'increasedAttackSpeed','local_critical_strike_chance_+%':'increasedCriticalChance'};
const localAddedPhysical={local_minimum_added_physical_damage:'min',local_maximum_added_physical_damage:'max'};

function equipmentInput(slot,base,override) {
  const p=base.properties,defence={},localModifiers=[],globalLines=[],unsupported=[],modifiers=[],weaponLocal={},addedPhysicalEndpoints=new Set();
  for(const stat of ['armour','evasion','energy_shield']) {const range=p[stat];if(range)defence[stat==='energy_shield'?'energyShield':stat]=(range.min+range.max)/2;}
  const lines=override?.lines??base.implicits.map(mod=>midpointText(mod.text));
  for(const text of lines) {
    if(p.attack_time) {
      const local=/^([\d.]+)% increased (Physical Damage|Attack Speed|Critical Strike Chance)$/.exec(text);
      if(local) {const key={'Physical Damage':'increasedPhysicalDamage','Attack Speed':'increasedAttackSpeed','Critical Strike Chance':'increasedCriticalChance'}[local[2]];weaponLocal[key]=(weaponLocal[key]??0)+Number(local[1]);continue;}
      const added=/^Adds ([\d.]+) to ([\d.]+) Physical Damage$/.exec(text);
      if(added) {weaponLocal.addedDamage={...(weaponLocal.addedDamage??{}),physical:{min:(weaponLocal.addedDamage?.physical?.min??0)+Number(added[1]),max:(weaponLocal.addedDamage?.physical?.max??0)+Number(added[2])}};addedPhysicalEndpoints.add('min');addedPhysicalEndpoints.add('max');continue;}
    }
    const local=/^([\d.]+)% increased (Armour|Evasion Rating|Energy Shield)$/.exec(text);
    if(local && defence[{Armour:'armour','Evasion Rating':'evasion','Energy Shield':'energyShield'}[local[2]]]) {
      localModifiers.push({id:`local:${localModifiers.length}`,stat:{Armour:'armour','Evasion Rating':'evasion','Energy Shield':'energyShield'}[local[2]],kind:'INC',value:Number(local[1])});
    } else globalLines.push(text);
  }
  const localDefence={'local_physical_damage_reduction_rating_+%':['armour','INC'],'local_evasion_rating_+%':['evasion','INC'],'local_energy_shield_+%':['energyShield','INC'],'local_base_physical_damage_reduction_rating':['armour','BASE'],'local_base_evasion_rating':['evasion','BASE'],'local_energy_shield':['energyShield','BASE']};
  for(const [id,value] of Object.entries(override?.rawStats??{})) {
    const mapped=rawStats[id],local=localDefence[id];
    if(local&&Number.isFinite(value))localModifiers.push({id:`raw:${id}`,stat:local[0],kind:local[1],value});
    else if(p.attack_time&&weaponLocalStats[id]&&Number.isFinite(value))weaponLocal[weaponLocalStats[id]]=(weaponLocal[weaponLocalStats[id]]??0)+value;
    else if(p.attack_time&&localAddedPhysical[id]&&Number.isFinite(value)) {
      const endpoint=localAddedPhysical[id];
      weaponLocal.addedDamage={...(weaponLocal.addedDamage??{}),physical:{...(weaponLocal.addedDamage?.physical??{min:0,max:0}),[endpoint]:(weaponLocal.addedDamage?.physical?.[endpoint]??0)+value}};
      addedPhysicalEndpoints.add(endpoint);
    }
    else if(mapped&&Number.isFinite(value))modifiers.push({id:`raw:${id}`,stat:mapped[0],kind:mapped[1],value});
    else unsupported.push(`Unmapped crafted stat ${id}: ${value}`);
  }
  if(addedPhysicalEndpoints.size && (addedPhysicalEndpoints.size!==2
    || !Number.isFinite(weaponLocal.addedDamage?.physical?.min) || !Number.isFinite(weaponLocal.addedDamage?.physical?.max)
    || weaponLocal.addedDamage.physical.min<0 || weaponLocal.addedDamage.physical.max<weaponLocal.addedDamage.physical.min)) {
    unsupported.push('Local added physical weapon damage lacks a complete sane minimum/maximum range');delete weaponLocal.addedDamage;
  }
  if(p.movement_speed)unsupported.push(`Movement speed ${p.movement_speed}% is not calculated`);
  const effects=translateEffects(`equipment:${slot}`, 'equipment',globalLines);
  const weapon=p.attack_time?{id:base.id,damage:{physical:{min:p.physical_damage_min,max:p.physical_damage_max}},attacksPerSecond:1000/p.attack_time,criticalChance:p.critical_strike_chance/100,local:weaponLocal}:undefined;
  return {item:{id:slot,slot,defence,localModifiers,modifiers:[...effects.source.modifiers,...modifiers],unsupported:[...effects.source.unsupported,...unsupported]},conversion:effects.conversion,weapon};
}

function freshEnemy(context,calculation) {
  const configured=calculation.enemy??{};
  return {...configured,armour:configured.armour??context.enemyArmour,evasion:configured.evasion??context.enemyEvasion,accuracy:configured.accuracy??context.enemyAccuracy,
    resistances:{fire:context.enemyResistance,cold:context.enemyResistance,lightning:context.enemyResistance,chaos:context.enemyResistance,...configured.resistances}};
}

export function assembleWorkspace({character,equipment,selection,groups,context,overrides={},data,tree,gems,calculation={}}) {
  const cls=tree.classes.find(row=>row.name===character.characterClass);
  if(!cls)throw Error('Character class is unavailable in calculation data');
  const c=data.constants,level=context.level,items=[],conversions=[...(calculation.conversion??[])],extra=[],weapons={};
  for(const [slot,id] of Object.entries(equipment))if(id){
    const base=data.bases[id];if(!base){extra.push(`Equipment base unavailable: ${id}`);continue;}
    const resolved=equipmentInput(slot,base,overrides[slot]?.baseId===id?overrides[slot]:undefined);items.push(resolved.item);conversions.push(...resolved.conversion);if(resolved.weapon)weapons[slot]=resolved.weapon;
  }
  const passives=[];
  for(const id of selection.selected??[]){const node=tree.nodes[id];if(!node){extra.push(`Unknown passive ${id}`);continue;}
    const stats=node.isMastery?(node.masteryEffects?.find(effect=>String(effect.effect)===String(selection.masteries?.[id]))?.stats??['Mastery choice unavailable']):(node.stats??[]);
    const effects=translateEffects(`passive:${id}`,'passive',stats);passives.push(effects.source);conversions.push(...effects.conversion);
  }
  if(character.ascendancy)extra.push('Ascendancy special rules may be unsupported; inspect passive diagnostics');
  const group=groups.find(row=>row.id===context.groupId),active=gems.find(gem=>gem.id===group?.activeId);
  let skill,skillEvidence,weaponEvidence,skillSources=[],skillTags=[],skillLabel='No damage skill selected';
  if(active){
    skillLabel=active.name;const max=context.gemEndpoint==='maximum',exact=calculation.skill?.gemId===active.id?calculation.skill:undefined;
    if(calculation.skill&&calculation.skill.gemId!==active.id)extra.push(`Exact skill record ignored: selected gem is ${active.id}`);
    const line=(active.tooltip?.statLines??[]).map(text=>endpointText(text,max)).find(text=>/^Deals [\d.]+ to [\d.]+ (Fire|Cold|Lightning|Physical|Chaos) Damage$/.test(text));
    const match=line?.match(/^Deals ([\d.]+) to ([\d.]+) (Fire|Cold|Lightning|Physical|Chaos) Damage$/);
    const prop=label=>active.tooltip?.properties?.find(row=>row.label===label)?.value;
    const time=Number(String(prop('Cast time')).replace(' sec','')),crit=Number(String(prop('Critical strike chance')).replace('%',''));
    const damage=exact?.damage??(match?{[match[3].toLowerCase()]:{min:Number(match[1]),max:Number(match[2])}}:undefined);
    const baseTime=exact?.baseTime??time,baseCritChance=exact?.baseCritChance??crit;
    if(!exact)extra.push(`Exact level/quality data unavailable for ${active.name}; legacy selected tooltip endpoint retained`);
    if(active.tags.includes('spell')&&!active.secondaryEffect&&!active.tags.some(tag=>['minion','totem','aura','curse','channelling'].includes(tag))&&damage&&Number.isFinite(baseTime)&&baseTime>0&&Number.isFinite(baseCritChance)){
      const supports=[];let ailmentsDisabled=false;
      for(const id of group.supportIds){const support=gems.find(gem=>gem.id===id);if(!support){extra.push(`Missing support ${id}`);continue;}
        const match=compatibility(active,support);
        if(match.state==='incompatible'){extra.push(`Excluded incompatible support: ${support.name}`);continue;}
        if(match.state==='unknown'){extra.push(`Support compatibility unresolved: ${support.name} (${match.message})`);continue;}
        const lines=[],unresolved=[];
        for(const raw of support.tooltip?.statLines??[]){const text=endpointText(raw,max);
          if(text==='Supported Skills cannot inflict Elemental Ailments'){ailmentsDisabled=true;continue;}
          const transformed=text.replace(/^Supported Skills (?:deal |have )?/, '');
          if(/^\d+(?:\.\d+)?% (?:more|less|increased|reduced) /.test(transformed))lines.push(transformed);else unresolved.push(text);
        }
        const effects=translateEffects(`support:${support.id}`,'skill',lines);
        supports.push({id:support.id,compatibleKinds:['spell'],requiredTags:active.tags,modifiers:effects.source.modifiers,unsupported:[...effects.source.unsupported,...unresolved]});
      }
      const unsupported=[`Resource costs, projectile/AoE behavior and special effects of ${active.name} are outside hit calculations`,...(!ailmentsDisabled?['Ailments are not calculated']:[]),...(exact?.unsupported??[])];
      const assembled=assembleSkill({definition:{id:active.id,kind:'spell',tags:active.tags,damage,baseTime,baseCritChance,
        ...(exact?{addedDamageEffectiveness:exact.addedDamageEffectiveness,sourceEvidence:{level:exact.level,quality:exact.quality,sourceId:exact.sourceId}}:{}),unsupported},supports,accuracy:c.accuracy_rating_per_level*(level-1)});
      skill=assembled.skill;skillEvidence=assembled.sourceEvidence;skillSources=[...assembled.sources,...(exact?.qualitySources??[])];skillTags=active.tags;
    }else extra.push(`Damage calculation pending for ${active.name}: requires a supported direct spell range; no substitute DPS shown`);
  } else if(context.groupId==='default-attack'){
    const hand=(calculation.weaponHand??context.weaponHand)==='off-hand'?'off-hand':'main-hand',base=data.bases[equipment[hand]],p=base?.properties;
    if(p?.attack_time&&p.physical_damage_min!==null){
      const weapon=weapons[hand]??{id:base.id,damage:{physical:{min:p.physical_damage_min,max:p.physical_damage_max}},attacksPerSecond:1000/p.attack_time,criticalChance:p.critical_strike_chance/100};
      const assembled=assembleSkill({definition:{id:'default-attack',kind:'attack',tags:base.itemClass==='Bow'||base.itemClass==='Wand'?['attack']:['attack','melee']},weapon,accuracy:c.accuracy_rating_per_level*(level-1)});
      skill=assembled.skill;skillSources=assembled.sources;skillTags=base.itemClass==='Bow'||base.itemClass==='Wand'?['attack']:['attack','melee'];skillLabel='Default weapon attack';weaponEvidence={hand,itemId:base.id};
      if(overrides[hand])extra.push('Item quality is unavailable in saved gear; weapon quality is treated as zero');
      if(equipment['off-hand']&&hand==='main-hand')extra.push('Dual wield/off-hand attack behavior is not calculated');
    }else extra.push('Choose an ordinary weapon base to calculate its default attack');
  }
  const build={version:1,rounding:'pob',attributes:{strength:cls.base_str,dexterity:cls.base_dex,intelligence:cls.base_int},pools:{life:38+c.life_per_level*level,mana:34+c.mana_per_level*level,armour:0,evasion:c.base_evasion_rating,energyShield:0},equipment:items,passives,gems:skillSources,buffs:calculation.buffs,sources:calculation.sources??[],conditions:calculation.conditions,defenceConfig:calculation.defenceConfig,
    configuration:[{id:'calculation-coverage',kind:'configuration',modifiers:[],unsupported:['Equipment ranges use midpoint estimates; requirements are not enforced',...extra]}],
    skillTags,resistancePenalty:context.penalty,resistances:{fire:0,cold:0,lightning:0,chaos:0},enemy:freshEnemy(context,calculation),incomingPhysicalHit:context.incomingHit,
    ...(calculation.incomingHit?{incomingHit:calculation.incomingHit}:{}),conversion:conversions,...(skill?{skill}:{})};
  return {build,...calculateBuild(build),skillLabel,...(skillEvidence?{skillEvidence}:{}),...(weaponEvidence?{weaponEvidence}:{})};
}
export function compareWorkspace(input,slot,candidate){
  const baseline=assembleWorkspace(input);
  const next={...input,equipment:validEquipment({...input.equipment,[slot]:candidate.baseId},Object.values(input.data.bases)),overrides:{...input.overrides,[slot]:candidate}};
  const alternative=assembleWorkspace(next);
  return compareBuilds(baseline.build,alternative.build);
}
