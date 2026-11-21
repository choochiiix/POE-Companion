import type { Breakdown, CalculationInput, Contribution, ResistanceType } from './model.ts';
import { evaluate } from './modifiers.ts';
import { armourReduction, clamp, hitChance, rules } from './rules.ts';
import type { DefenceConfiguration, DefensiveResource } from './advanced-defence.ts';

export function calculateDefence(input: CalculationInput, mods: readonly Contribution[], config?: DefenceConfiguration) {
  const rounded = (detail: Breakdown): Breakdown => input.rounding === 'pob' ? { ...detail, value: Math.round(detail.value) } : detail;
  const resource = (name: DefensiveResource, detail: Breakdown) => {
    const reservation = config?.reservation?.[name];
    const reserved = Math.min(detail.value, (reservation?.flat ?? 0) + detail.value * (reservation?.percent ?? 0) / 100);
    return { ...detail, reserved, unreserved: detail.value - reserved };
  };
  const pools = {
    life: resource('life', rounded(evaluate(mods, ['life'], input.pools.life))),
    mana: resource('mana', rounded(evaluate(mods, ['mana'], input.pools.mana))),
    energyShield: resource('energyShield', rounded(evaluate(mods, ['energyShield'], input.pools.energyShield))),
    armour: rounded(evaluate(mods, ['armour'], input.pools.armour)),
    evasion: rounded(evaluate(mods, ['evasion'], input.pools.evasion)),
  };
  const resistance = (type: ResistanceType) => {
    const contributions = mods.filter(mod => mod.stat === `${type}Resistance` && !mod.skillId);
    const uncapped = contributions.reduce((sum, mod) => sum + mod.value, input.resistances[type]) + input.resistancePenalty;
    const maximum = clamp(evaluate(mods, [`${type}MaximumResistance`], rules.maximumResistance).value, rules.minimumResistance, rules.resistanceCap);
    return { uncapped, maximum, effective: clamp(uncapped, rules.minimumResistance, maximum), contributions };
  };
  const resistances: Record<ResistanceType, { uncapped: number; maximum: number; effective: number; contributions: readonly Contribution[] }> = {
    fire: resistance('fire'), cold: resistance('cold'), lightning: resistance('lightning'), chaos: resistance('chaos'),
  };
  const physicalReduction = armourReduction(pools.armour.value, input.incomingPhysicalHit);
  const regen = (name: DefensiveResource, pool: number) => {
    const options = config?.recovery?.[name];
    // PoB Data.lua ManaRegenBase is 105% per minute (1.75%/s); CalcDefence.lua applies pool * percent / 100.
    const basePercent = (name === 'mana' ? 105 / 60 : 0) + (options?.percent ?? 0);
    const base = (options?.flat ?? 0) + pool * basePercent / 100;
    const rate = base * (1 + (options?.increasedPercent ?? 0) / 100)
      * (options?.moreMultiplier ?? 1) * (options?.recoveryRateMultiplier ?? 1);
    return input.rounding === 'pob' ? Math.round(rate * 10) / 10 : rate;
  };
  const recharge = config?.energyShieldRecharge;
  // PoB Data.lua EnergyShieldRechargeBase is 2000% per minute; its default delay is 2 seconds.
  const rechargeRate = pools.energyShield.value * (recharge?.baseRatePercent ?? 2000 / 60) / 100
    * (1 + (recharge?.increasedPercent ?? 0) / 100) * (recharge?.moreMultiplier ?? 1)
    * (recharge?.recoveryRateMultiplier ?? 1);
  const rechargeDelay = (recharge?.delaySeconds ?? 2) / (1 + (recharge?.fasterStartPercent ?? 0) / 100);
  return { pools, resistances, evadeChance: 100 - hitChance(pools.evasion.value, input.enemy.accuracy), physicalReduction,
    physicalHitTaken: input.incomingPhysicalHit * (1 - physicalReduction / 100),
    recovery: { lifePerSecond: regen('life', pools.life.value), manaPerSecond: regen('mana', pools.mana.value),
      energyShieldPerSecond: regen('energyShield', pools.energyShield.value) },
    energyShieldRecharge: { ratePerSecond: input.rounding === 'pob' ? Math.round(rechargeRate) : rechargeRate,
      delaySeconds: rechargeDelay } };
}
