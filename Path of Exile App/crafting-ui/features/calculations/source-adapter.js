import {calculateBuild,compareBuilds,assembleSkill,translateEffects} from '../../../calculation-engine/src/index.ts';
import {compatibility} from '../skills/skills-model.js';
import {validEquipment} from '../character/character-data.js';

export const midpointText = text => String(text).replace(/\((-?\d+(?:\.\d+)?)[–-](-?\d+(?:\.\d+)?)\)/g,(_,a,b)=>String((Number(a)+Number(b))/2));
const endpointText = (text,max) => String(text).replace(/\((-?\d+(?:\.\d+)?)[–-](-?\d+(?:\.\d+)?)\)/g,(_,a,b)=>max?b:a);
const rawStats={base_maximum_life:['life','BASE'],base_maximum_mana:['mana','BASE'],additional_strength:['strength','BASE'],additional_dexterity:['dexterity','BASE'],additional_intelligence:['intelligence','BASE'],'spell_damage_+%':['spellDamage','INC'],'fire_damage_+%':['fireDamage','INC'],'base_fire_damage_resistance_%':['fireResistance','BASE'],'base_cold_damage_resistance_%':['coldResistance','BASE'],'base_lightning_damage_resistance_%':['lightningResistance','BASE'],'base_chaos_damage_resistance_%':['chaosResistance','BASE']};

function equipmentInput(slot,base,override) {
  const p=base.properties,defence={},localModifiers=[],globalLines=[],unsupported=[],modifiers=[];
  for(const stat of ['armour','evasion','energy_shield']) {const range=p[stat];if(range)defence[stat==='energy_shield'?'energyShield':stat]=(range.min+range.max)/2;}
  const lines=override?.lines??base.implicits.map(mod=>midpointText(mod.text));
  for(const text of lines) {
    if(p.attack_time && /^\d+(?:\.\d+)?% increased (Physical Damage|Attack Speed|Critical Strike Chance)$/.test(text)){unsupported.push(`Local weapon effect not resolved: ${text}`);continue;}
    const local=/^([\d.]+)% increased (Armour|Evasion Rating|Energy Shield)$/.exec(text);
    if(local && defence[{Armour:'armour','Evasion Rating':'evasion','Energy Shield':'energyShield'}[local[2]]]) {
      localModifiers.push({id:`local:${localModifiers.length}`,stat:{Armour:'armour','Evasion Rating':'evasion','Energy Shield':'energyShield'}[local[2]],kind:'INC',value:Number(local[1])});
    } else globalLines.push(text);
  }
  const localDefence={'local_physical_damage_reduction_rating_+%':['armour','INC'],'local_evasion_rating_+%':['evasion','INC'],'local_energy_shield_+%':['energyShield','INC'],'local_base_physical_damage_reduction_rating':['armour','BASE'],'local_base_evasion_rating':['evasion','BASE'],'local_energy_shield':['energyShield','BASE']};
  for(const [id,value] of Object.entries(override?.rawStats??{})) {const mapped=rawStats[id],local=localDefence[id];if(local&&Number.isFinite(value))localModifiers.push({id:`raw:${id}`,stat:local[0],kind:local[1],value});else if(mapped && Number.isFinite(value))modifiers.push({id:`raw:${id}`,stat:mapped[0],kind:mapped[1],value});else unsupported.push(`Unmapped crafted stat ${id}: ${value}`);}
  if(p.movement_speed)unsupported.push(`Movement speed ${p.movement_speed}% is not calculated`);
  const effects=translateEffects(`equipment:${slot}`, 'equipment',globalLines);
  return {item:{id:slot,slot,defence,localModifiers,modifiers:[...effects.source.modifiers,...modifiers],unsupported:[...effects.source.unsupported,...unsupported]},conversion:effects.conversion};
}

export function assembleWorkspace({character,equipment,selection,groups,context,overrides={},data,tree,gems}) {
  const cls=tree.classes.find(row=>row.name===character.characterClass);
  if(!cls)throw Error('Character class is unavailable in calculation data');
  const c=data.constants,level=context.level,items=[],conversions=[],extra=[];
  for(const [slot,id] of Object.entries(equipment))if(id){
    const base=data.bases[id];if(!base){extra.push(`Equipment base unavailable: ${id}`);continue;}
    const resolved=equipmentInput(slot,base,overrides[slot]?.baseId===id?overrides[slot]:undefined);items.push(resolved.item);conversions.push(...resolved.conversion);
  }
  const passives=[];
  for(const id of selection.selected??[]){const node=tree.nodes[id];if(!node){extra.push(`Unknown passive ${id}`);continue;}
    const stats=node.isMastery?(node.masteryEffects?.find(effect=>String(effect.effect)===String(selection.masteries?.[id]))?.stats??['Mastery choice unavailable']):(node.stats??[]);
    const effects=translateEffects(`passive:${id}`,'passive',stats);passives.push(effects.source);conversions.push(...effects.conversion);
  }
  if(character.ascendancy)extra.push('Ascendancy special rules may be unsupported; inspect passive diagnostics');
  const group=groups.find(row=>row.id===context.groupId);
  const active=gems.find(gem=>gem.id===group?.activeId);
  let skill,skillSources=[],skillTags=[],skillLabel='No damage skill selected';
  if(active){
    skillLabel=active.name;const max=context.gemEndpoint==='maximum';
    const line=(active.tooltip?.statLines??[]).map(text=>endpointText(text,max)).find(text=>/^Deals [\d.]+ to [\d.]+ (Fire|Cold|Lightning|Physical|Chaos) Damage$/.test(text));
    const match=line?.match(/^Deals ([\d.]+) to ([\d.]+) (Fire|Cold|Lightning|Physical|Chaos) Damage$/);
    const prop=label=>active.tooltip?.properties?.find(row=>row.label===label)?.value;
    const time=Number(String(prop('Cast time')).replace(' sec','')),crit=Number(String(prop('Critical strike chance')).replace('%',''));
    if(active.tags.includes('spell')&&!active.secondaryEffect&&!active.tags.some(tag=>['minion','totem','aura','curse','channelling'].includes(tag))&&match&&Number.isFinite(time)&&time>0&&Number.isFinite(crit)){
      const supports=[];let ailmentsDisabled=false;
      for(const id of group.supportIds){const support=gems.find(gem=>gem.id===id);if(!support){extra.push(`Missing support ${id}`);continue;}
        if(compatibility(active,support).state==='incompatible'){extra.push(`Excluded incompatible support: ${support.name}`);continue;}
        const lines=[],unresolved=[];
        for(const raw of support.tooltip?.statLines??[]){const text=endpointText(raw,max);
          if(text==='Supported Skills cannot inflict Elemental Ailments'){ailmentsDisabled=true;continue;}
          const transformed=text.replace(/^Supported Skills (?:deal |have )?/,'');
          if(/^\d+(?:\.\d+)?% (?:more|less|increased|reduced) /.test(transformed))lines.push(transformed);else unresolved.push(text);
        }
        const effects=translateEffects(`support:${support.id}`,'skill',lines);
        supports.push({id:support.id,compatibleKinds:['spell'],modifiers:effects.source.modifiers,unsupported:[...effects.source.unsupported,...unresolved]});
      }
      const assembled=assembleSkill({definition:{id:active.id,kind:'spell',tags:active.tags,damage:{[match[3].toLowerCase()]:{min:Number(match[1]),max:Number(match[2])}},baseTime:time,baseCritChance:crit,
        unsupported:[`Resource costs, projectile/AoE behavior and special effects of ${active.name} are outside hit calculations`,...(!ailmentsDisabled?['Ailments are not calculated']:[])]},supports,accuracy:c.accuracy_rating_per_level*(level-1)});
      skill=assembled.skill;skillSources=assembled.sources;skillTags=active.tags;
    }else extra.push(`Damage calculation pending for ${active.name}: requires a supported direct spell range; no substitute DPS shown`);
  } else if(context.groupId==='default-attack'){
    const base=data.bases[equipment['main-hand']],p=base?.properties;
    if(p?.attack_time&&p.physical_damage_min!==null){
      const assembled=assembleSkill({definition:{id:'default-attack',kind:'attack',tags:base.itemClass==='Bow'||base.itemClass==='Wand'?['attack']:['attack','melee']},weapon:{id:base.id,damage:{physical:{min:p.physical_damage_min,max:p.physical_damage_max}},attacksPerSecond:1000/p.attack_time,criticalChance:p.critical_strike_chance/100},accuracy:c.accuracy_rating_per_level*(level-1)});
      skill=assembled.skill;skillSources=assembled.sources;skillTags=base.itemClass==='Bow'||base.itemClass==='Wand'?['attack']:['attack','melee'];skillLabel='Default weapon attack';
      if(overrides['main-hand'])extra.push('Local weapon modifiers on detailed items are not resolved; attack estimate uses base weapon values');
      if(equipment['off-hand'])extra.push('Dual wield/off-hand attack behavior is not calculated');
    }else extra.push('Choose an ordinary weapon base to calculate its default attack');
  }
  const build={version:1,rounding:'pob',attributes:{strength:cls.base_str,dexterity:cls.base_dex,intelligence:cls.base_int},pools:{life:38+c.life_per_level*level,mana:34+c.mana_per_level*level,armour:0,evasion:c.base_evasion_rating,energyShield:0},equipment:items,passives,gems:skillSources,
    configuration:[{id:'calculation-coverage',kind:'configuration',modifiers:[],unsupported:['Equipment ranges use midpoint estimates, zero quality; requirements are not enforced',...extra]}],
    skillTags,resistancePenalty:context.penalty,resistances:{fire:0,cold:0,lightning:0,chaos:0},enemy:{armour:context.enemyArmour,evasion:context.enemyEvasion,accuracy:context.enemyAccuracy,resistances:{fire:context.enemyResistance,cold:context.enemyResistance,lightning:context.enemyResistance,chaos:context.enemyResistance}},incomingPhysicalHit:context.incomingHit,conversion:conversions,...(skill?{skill}:{})};
  return {build,...calculateBuild(build),skillLabel};
}
export function compareWorkspace(input,slot,candidate){
  const baseline=assembleWorkspace(input);
  const next={...input,equipment:validEquipment({...input.equipment,[slot]:candidate.baseId},Object.values(input.data.bases)),overrides:{...input.overrides,[slot]:candidate}};
  const alternative=assembleWorkspace(next);
  return compareBuilds(baseline.build,alternative.build);
}
