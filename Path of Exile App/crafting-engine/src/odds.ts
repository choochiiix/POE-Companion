import { currencyPlan } from './engine.ts';
import type { Currency, Engine } from './engine.ts';
import { meetsGoal } from './goals.ts';
import type { Goal } from './goals.ts';
import { enumerate, EnumerationLimit, sample } from './plan.ts';
import type { Plan } from './plan.ts';
import { integer } from './model.ts';
import type { Item } from './model.ts';
import type { Rng } from './rng.ts';

export interface Interval {
  readonly low: number;
  readonly high: number;
}
export interface Outcome {
  readonly item: Item;
  readonly probability: number;
}
export type Odds =
  | {
      readonly method: 'exact';
      readonly probability: number;
      readonly outcomes: readonly Outcome[];
    }
  | {
      readonly method: 'monte-carlo';
      readonly probability: number;
      readonly confidence95: Interval;
      readonly samples: number;
      readonly hits: number;
    };
export interface OddsOptions {
  readonly rng: Rng;
  readonly maxNodes?: number;
  readonly samples?: number;
}
/** Wilson score interval, including meaningful bounds when zero/all trials hit. */
export function wilson95(hits: number, trials: number): Interval {
  integer(trials, 'trials', 1);
  integer(hits, 'hits');
  if (hits > trials) throw new Error('hits cannot exceed trials');
  const z = 1.959963984540054,
    p = hits / trials,
    d = 1 + (z * z) / trials;
  const center = (p + (z * z) / (2 * trials)) / d;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + (z * z) / (4 * trials * trials))) / d;
  return {
    low: hits === 0 ? 0 : Math.max(0, center - half),
    high: hits === trials ? 1 : Math.min(1, center + half),
  };
}
function outcomeKey(item: Item): string {
  // Mod insertion order is not part of outcome identity. Values and mod identities are.
  return JSON.stringify({
    ...item,
    mods: [...item.mods]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((m) => ({
        id: m.id,
        values: Object.fromEntries(Object.entries(m.values).sort(([a], [b]) => a.localeCompare(b))),
      })),
  });
}
export function analyzePlan(
  plan: Plan<Item>,
  predicate: (item: Item) => boolean,
  options: OddsOptions,
): Odds {
  const samples = options.samples ?? 10_000;
  integer(samples, 'samples', 1);
  try {
    const merged = new Map<string, Outcome>();
    for (const leaf of enumerate(plan, options.maxNodes ?? 50_000)) {
      const key = outcomeKey(leaf.value),
        previous = merged.get(key);
      merged.set(key, {
        item: leaf.value,
        probability: (previous?.probability ?? 0) + leaf.probability,
      });
    }
    const outcomes = [...merged.values()];
    const p = outcomes.reduce((sum, o) => sum + (predicate(o.item) ? o.probability : 0), 0);
    return {
      method: 'exact',
      probability: Math.max(0, Math.min(1, p)),
      outcomes,
    };
  } catch (error: unknown) {
    if (!(error instanceof EnumerationLimit)) throw error;
  }
  // Clone: asking for odds does not advance a craft/session RNG.
  const rng = options.rng.clone();
  let hits = 0;
  for (let n = 0; n < samples; n++) if (predicate(sample(plan, rng))) hits++;
  return {
    method: 'monte-carlo',
    probability: hits / samples,
    hits,
    samples,
    confidence95: wilson95(hits, samples),
  };
}
export function currencyOdds(
  engine: Engine,
  item: Item,
  currency: Currency,
  goal: Goal,
  options: OddsOptions,
): Odds {
  const result = currencyPlan(engine, item, currency);
  if (!result.ok) throw new Error(result.reason);
  return analyzePlan(result.plan, (output) => meetsGoal(engine, output, goal), options);
}
/** Presence after the currency, including retained existing mods; not next-slot odds. */
export function modHitProbability(
  engine: Engine,
  item: Item,
  currency: Currency,
  id: string,
  options: OddsOptions,
): Odds {
  return currencyOdds(engine, item, currency, { kind: 'has', mod: { id } }, options);
}
