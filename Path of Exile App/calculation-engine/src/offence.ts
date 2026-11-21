import { damageTypes } from './model.ts';
import type { CalculationInput, Contribution, Stat } from './model.ts';
import { evaluate } from './modifiers.ts';
import { armourReduction, clamp, hitChance, rules } from './rules.ts';
import { convertDamage } from './conversion.ts';

export function calculateOffence(input: CalculationInput, mods: readonly Contribution[]) {
  const skill = input.skill;
  if (!skill) return null;
  const rawAccuracy = evaluate(mods, ['accuracy'], skill.accuracy, skill.id);
  // CalcOffence's per-hand accuracy pass floors the combined rating before its hit roll.
  const accuracy = input.rounding === 'pob'
    ? { ...rawAccuracy, value: Math.floor(rawAccuracy.value) }
    : rawAccuracy;
  const chanceToHit = skill.kind === 'spell' ? 100 : hitChance(input.enemy.evasion, accuracy.value);
  const criticalChance = clamp(evaluate(mods, ['critChance'], skill.baseCritChance, skill.id).value, 0, 100);
  // Attacks perform a second accuracy check to confirm a critical strike.
  const effectiveCriticalChance = criticalChance * chanceToHit / 100;
  const criticalMultiplier = Math.max(100, evaluate(mods, ['critMultiplier'], skill.critMultiplier, skill.id).value);
  const speed = evaluate(mods, [skill.kind === 'attack' ? 'attackSpeed' : 'castSpeed'], 1, skill.id);
  const actionSpeed = evaluate(mods, ['actionSpeed'], 1, skill.id);
  const rate = speed.value * actionSpeed.value / skill.baseTime;
  const actionTime = rate > 0 ? 1 / rate : null;
  const conversion = input.conversion;
  const converted = conversion?.length ? convertDamage(skill, mods, conversion) : undefined;
  const damage = damageTypes.map(type => {
    const range = skill.damage[type] ?? { min: 0, max: 0 };
    const stats: Stat[] = ['damage', `${type}Damage`, skill.kind === 'attack' ? 'attackDamage' : 'spellDamage'];
    if (type !== 'physical' && type !== 'chaos') stats.push('elementalDamage');
    const convertedPart = converted?.find(part => part.type === type);
    const rawMin = convertedPart?.min ?? evaluate(mods, stats, range.min, skill.id);
    const rawMax = convertedPart?.max ?? evaluate(mods, stats, range.max, skill.id);
    // PoB rounds the whole type's damage before removing outgoing conversion.
    const retained = Math.max(0, 1 - (conversion ?? []).filter(rule=>rule.from===type && rule.kind==='convert').reduce((sum,rule)=>sum+rule.percent/100,0));
    const rounded = (value: number) => retained > 0 ? Math.round(value / retained) * retained : 0;
    const min = input.rounding === 'pob' ? { ...rawMin, value: rounded(rawMin.value) } : rawMin;
    const max = input.rounding === 'pob' ? { ...rawMax, value: rounded(rawMax.value) } : rawMax;
    const average = (min.value + max.value) / 2;
    const critical = average * criticalMultiplier / 100;
    const exposure = type === 'physical' ? 0 : input.enemy.exposure?.[type] ?? 0;
    const penetration = type === 'physical' ? 0 : input.enemy.penetration?.[type] ?? 0;
    // PoB v2.68.1 CalcPerform.lua applies exposure to enemy resistance; CalcOffence.lua
    // calcResistForType clamps that result before the hit pass subtracts penetration.
    const enemyResistance = type === 'physical' ? null
      : clamp(input.enemy.resistances[type] - exposure, -200, 90);
    const effectiveResistance = enemyResistance === null ? null : enemyResistance - penetration;
    const physicalReduction = (hit: number) => Math.min(rules.enemyPhysicalReductionCap,
      armourReduction(input.enemy.armour, hit));
    const mitigation = effectiveResistance === null ? null : 1 - effectiveResistance / 100;
    const mitigate = (hit: number) => type === 'physical'
      ? hit * (1 - physicalReduction(hit) / 100)
      : hit * mitigation!;
    // Armour is evaluated separately for normal and critical average hits.
    const effective = (hit: number) => mitigate(hit) * (1 - effectiveCriticalChance / 100)
      + mitigate(hit * criticalMultiplier / 100) * effectiveCriticalChance / 100;
    const effectiveAverage = effective(average);
    return { type, min, max, average, enemyResistance, penetration,
      effectiveResistance,
      physicalReduction: type === 'physical'
        ? { normal: physicalReduction(average), critical: physicalReduction(critical) }
        : null,
      mitigation, effectiveMin: effective(min.value), effectiveMax: effective(max.value), effectiveAverage,
      ...(convertedPart ? { conversionPaths: convertedPart.paths } : {}) };
  });
  const averageHit = damage.reduce((sum, part) => sum + part.effectiveAverage, 0);
  const averageDamagePerUse = averageHit * chanceToHit / 100;
  const effectiveHitDps = averageDamagePerUse * rate;
  const dps = effectiveHitDps;
  if (!Number.isFinite(dps)) throw new RangeError('Calculation overflow');
  return { accuracy, chanceToHit, criticalChance, effectiveCriticalChance, criticalMultiplier, speed,
    actionSpeed, rate, actionTime, damage, averageHit, averageDamagePerUse, effectiveHitDps, dps };
}
