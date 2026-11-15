import { assembleBuild } from './build.ts';
import type { BuildInput } from './build.ts';
import { calculate } from './core.ts';

/** Shared application boundary for Character, tree, skills and item-preview consumers. */
export function calculateBuild(build: BuildInput) {
  const assembly = assembleBuild(build);
  return { assembly, calculation: calculate(assembly.input) };
}
export type BuildCalculation = ReturnType<typeof calculateBuild>;

/** Callers supply full alternative snapshots; this function never writes saves or equips items. */
export function compareBuilds(before: BuildInput, after: BuildInput) {
  const baseline = calculateBuild(before), candidate = calculateBuild(after);
  const metrics = (build: BuildCalculation) => ({
    life: build.calculation.defence.pools.life.value,
    mana: build.calculation.defence.pools.mana.value,
    energyShield: build.calculation.defence.pools.energyShield.value,
    armour: build.calculation.defence.pools.armour.value,
    evasion: build.calculation.defence.pools.evasion.value,
    hitDps: build.calculation.offence?.dps ?? null,
  });
  const previous = metrics(baseline), next = metrics(candidate);
  const changes = (Object.keys(previous) as (keyof typeof previous)[]).map(stat => {
    const from = previous[stat], to = next[stat];
    const delta = from === null || to === null ? null : to - from;
    const percent = from === null || from === 0 || delta === null ? null : delta / from * 100;
    if ((delta !== null && !Number.isFinite(delta)) || (percent !== null && !Number.isFinite(percent))) throw new RangeError('Comparison overflow');
    return { stat, before: from, after: to, delta, percent };
  });
  return { baseline, candidate, changes,
    status: baseline.calculation.status === 'partial' || candidate.calculation.status === 'partial' ? 'partial' as const : 'supported-subset' as const };
}
