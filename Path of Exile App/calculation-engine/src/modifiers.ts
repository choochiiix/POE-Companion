import type { Breakdown, CalculationInput, Contribution, Stat } from './model.ts';

export function prepareModifiers(input: CalculationInput): readonly Contribution[] {
  const conditions = new Set(input.conditions ?? []);
  return input.sources.flatMap(source => source.modifiers
    .filter(mod => (mod.conditions ?? []).every(condition => conditions.has(condition))
      && (mod.notConditions ?? []).every(condition => !conditions.has(condition)))
    .map(mod => ({ ...mod, conditions: [...(mod.conditions ?? [])], notConditions: [...(mod.notConditions ?? [])], sourceId: source.id })));
}

export function evaluate(modifiers: readonly Contribution[], stats: readonly Stat[], base: number, skillId?: string): Breakdown {
  const contributions = modifiers.filter(mod => stats.includes(mod.stat) && (!mod.skillId || mod.skillId === skillId));
  const flat = contributions.filter(mod => mod.kind === 'BASE').reduce((sum, mod) => sum + mod.value, base);
  const increased = contributions.filter(mod => mod.kind === 'INC').reduce((sum, mod) => sum + mod.value, 0);
  const more = contributions.filter(mod => mod.kind === 'MORE').reduce((product, mod) => product * (1 + mod.value / 100), 1);
  const value = Math.max(0, flat * Math.max(0, 1 + increased / 100) * more);
  if (!Number.isFinite(value)) throw new RangeError('Calculation overflow');
  return { base: flat, increased, more, value, contributions };
}
