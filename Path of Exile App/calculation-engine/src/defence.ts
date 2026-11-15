import type { Breakdown, CalculationInput, Contribution, ResistanceType } from './model.ts';
import { evaluate } from './modifiers.ts';
import { armourReduction, clamp, hitChance, rules } from './rules.ts';

export function calculateDefence(input: CalculationInput, mods: readonly Contribution[]) {
  const rounded = (detail: Breakdown): Breakdown => input.rounding === 'pob' ? { ...detail, value: Math.round(detail.value) } : detail;
  const pools = {
    life: rounded(evaluate(mods, ['life'], input.pools.life)),
    mana: rounded(evaluate(mods, ['mana'], input.pools.mana)),
    energyShield: rounded(evaluate(mods, ['energyShield'], input.pools.energyShield)),
    armour: rounded(evaluate(mods, ['armour'], input.pools.armour)),
    evasion: rounded(evaluate(mods, ['evasion'], input.pools.evasion)),
  };
  const resistances = Object.fromEntries((['fire', 'cold', 'lightning', 'chaos'] as const).map(type => {
    const contributions = mods.filter(mod => mod.stat === `${type}Resistance` && !mod.skillId);
    const uncapped = contributions.reduce((sum, mod) => sum + mod.value, input.resistances[type]) + input.resistancePenalty;
    const maximum = clamp(evaluate(mods, [`${type}MaximumResistance`], rules.maximumResistance).value, rules.minimumResistance, rules.resistanceCap);
    return [type, { uncapped, maximum, effective: clamp(uncapped, rules.minimumResistance, maximum), contributions }];
  })) as Record<ResistanceType, { uncapped: number; maximum: number; effective: number; contributions: readonly Contribution[] }>;
  const physicalReduction = armourReduction(pools.armour.value, input.incomingPhysicalHit);
  return { pools, resistances, evadeChance: 100 - hitChance(pools.evasion.value, input.enemy.accuracy), physicalReduction,
    physicalHitTaken: input.incomingPhysicalHit * (1 - physicalReduction / 100) };
}
