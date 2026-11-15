import { readFileSync } from 'node:fs';
import { assembleBuild, assembleSkill, resolveWeapon, calculate } from '../src/index.ts';
import type { Modifier, ModifierSource } from '../src/index.ts';
import { translateEffects } from '../src/adapters/stat-lines.ts';
export interface TrialScenario {
  readonly id: string; readonly skill: 'fireball' | 'attack'; readonly gemLevel: 1 | 20;
  readonly penalty: number; readonly resistance: number; readonly armour: number; readonly evasion: number; readonly mods: readonly string[];
}

export const trialDefinition = Object.freeze({ level: 20, classIndex: 3, passiveIds: [57264, 33296], gemLevel: 1, quality: 0 });
const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

/** Deliberately narrow translation: known ordinary stat lines only; unknown lines remain diagnostic. */
export function translatePassive(id: number, stats: readonly string[]): ModifierSource {
  const modifiers: Modifier[] = [];
  const unsupported: string[] = [];
  stats.forEach((line, index) => {
    const spell = /^(\d+)% increased Spell Damage$/.exec(line);
    const mana = /^\+(\d+) to maximum Mana$/.exec(line);
    if (spell) modifiers.push({ id: `line:${index}`, stat: 'spellDamage', kind: 'INC', value: Number(spell[1]) });
    else if (mana) modifiers.push({ id: `line:${index}`, stat: 'mana', kind: 'BASE', value: Number(mana[1]) });
    else unsupported.push(line);
  });
  return { id: `passive:${id}`, kind: 'passive', modifiers, unsupported };
}

/** Reads existing local records, never reference calculation outputs or live UI state. */
export function assembleTrial(scenario?: TrialScenario) {
  const tree = load('../../data-sources/pob-tree-3_29/tree.json');
  const bases = load('../../data-sources/repoe-poe1/base_items.json');
  const mods = load('../../data-sources/repoe-poe1/mods.json');
  const gems = load('../../crafting-ui/skills-data.json').gems;
  const constants = load('./source-constants.json').values;
  const character = tree.classes[trialDefinition.classIndex];
  if (character.name !== 'Witch') throw new Error('Trial class source changed');
  const fireball = gems.find((gem: { name: string }) => gem.name === 'Fireball');
  const support = gems.find((gem: { name: string }) => gem.name === 'Elemental Focus');
  const damage = /^Deals \((\d+)–(\d+)\) to \((\d+)–(\d+)\) Fire Damage$/.exec(fireball.tooltip.statLines[0]);
  const more = /^Supported Skills deal \((\d+)–\d+\)% more Elemental Damage$/.exec(support.tooltip.statLines[0]);
  const property = (label: string) => fireball.tooltip.properties.find((entry: { label: string }) => entry.label === label)?.value;
  if (!damage || !more || !support.tooltip.statLines.includes('Supported Skills cannot inflict Elemental Ailments')) throw new Error('Trial gem schema changed');
  const castTime = /^([\d.]+) sec$/.exec(property('Cast time'));
  const crit = /^([\d.]+)%$/.exec(property('Critical strike chance'));
  if (!castTime || !crit) throw new Error('Trial gem properties changed');
  const spellSkill = assembleSkill({ definition: { id: fireball.id, kind: 'spell', tags: ['spell', 'fire', 'projectile'],
    damage: { fire: { min: Number(damage[scenario?.gemLevel === 20 ? 2 : 1]), max: Number(damage[scenario?.gemLevel === 20 ? 4 : 3]) } }, baseTime: Number(castTime[1]), baseCritChance: Number(crit[1]),
    unsupported: ['Fireball resource costs and projectile/AoE behavior are outside this trial comparison'] },
    accuracy: constants.accuracy_rating_per_level * (trialDefinition.level - 1), supports: [{ id: support.id, compatibleKinds: ['spell'],
      requiredTags: ['fire'], modifiers: [{ id: 'elemental-more', stat: 'elementalDamage', kind: 'MORE', value: Number(more[1]) }] }] });
  const swordId = 'Metadata/Items/Weapons/OneHandWeapons/OneHandSwords/OneHandSword1';
  const bodyId = 'Metadata/Items/Armours/BodyArmours/BodyStr1';
  const sword = bases[swordId], body = bases[bodyId];
  if (sword.name !== 'Rusted Sword' || body.name !== 'Plate Vest' || body.implicits.length || sword.implicits.join() !== 'AccuracyPercentImplicitSword1') throw new Error('Trial equipment source changed');
  const implicit = mods[sword.implicits[0]].stats[0];
  if (implicit.id !== 'accuracy_rating_+%' || implicit.min !== implicit.max) throw new Error('Trial sword implicit changed');
  const weapon = resolveWeapon({ id: swordId, damage: { physical: { min: sword.properties.physical_damage_min, max: sword.properties.physical_damage_max } },
    attacksPerSecond: 1000 / sword.properties.attack_time, criticalChance: sword.properties.critical_strike_chance / 100 });
  const assembledSkill = scenario?.skill === 'attack' ? assembleSkill({ definition: { id: 'default-attack', kind: 'attack', tags: ['melee'] },
    weapon: { id: swordId, damage: weapon.damage, attacksPerSecond: weapon.attacksPerSecond, criticalChance: weapon.criticalChance },
    accuracy: constants.accuracy_rating_per_level * (trialDefinition.level - 1) }) : spellSkill;
  const armour = Math.round((body.properties.armour.min + body.properties.armour.max) / 2);
  const effects = scenario ? translateEffects(`configuration:${scenario.id}`, 'configuration', scenario.mods) : undefined;
  const assembled = assembleBuild({ version: 1, rounding: 'pob', attributes: { strength: character.base_str, dexterity: character.base_dex, intelligence: character.base_int },
    pools: { life: 38 + constants.life_per_level * trialDefinition.level, mana: 34 + constants.mana_per_level * trialDefinition.level,
      armour: 0, energyShield: 0, evasion: constants.base_evasion_rating },
    equipment: [{ id: swordId, slot: 'Weapon 1', modifiers: [{ id: 'implicit:accuracy_rating_+%', stat: 'accuracy', kind: 'INC', value: implicit.min }] }, { id: bodyId, slot: 'Body Armour', defence: { armour }, modifiers: [],
      unsupported: ['Plate Vest movement-speed penalty is outside this trial comparison'] }],
    passives: trialDefinition.passiveIds.map(id => translatePassive(id, tree.nodes[id].stats)), gems: assembledSkill.sources,
    skill: assembledSkill.skill, skillTags: scenario?.skill === 'attack' ? ['melee'] : ['spell', 'fire', 'projectile'], resistancePenalty: scenario?.penalty ?? 0,
    configuration: effects ? [effects.source] : [],
    ...(effects ? {conversion:effects.conversion} : {}),
    resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 },
    enemy: { armour: scenario?.armour ?? 0, evasion: scenario?.evasion ?? 0, accuracy: 0, resistances: { fire: scenario?.resistance ?? 0, cold: 0, lightning: 0, chaos: 0 } }, incomingPhysicalHit: 100,
  });
  return { assembled, weapon, result: calculate(assembled.input), records: { swordId, bodyId, fireballId: fireball.id, supportId: support.id } };
}
