import { applyCurrency } from './engine.ts';
import type { Currency, Engine } from './engine.ts';
import { priceOf } from './economics.ts';
import type { PriceSheet, Tally } from './economics.ts';
import { meetsGoal } from './goals.ts';
import type { Goal } from './goals.ts';
import { immutable, integer } from './model.ts';
import type { Item } from './model.ts';
import { wilson95 } from './odds.ts';
import type { Interval } from './odds.ts';
import type { Rng } from './rng.ts';
export interface PolicyContext {
  readonly engine: Engine;
  readonly item: Item;
  readonly history: readonly Currency[];
  readonly states: readonly Item[];
}
/** Return null to stop. Keep policies stateless; per-run state is in context/history. */
export type Policy = (context: PolicyContext) => Currency | null;
export interface LinearStep {
  readonly currency: Currency;
  readonly until?: Goal;
  readonly maxApplications?: number;
}
export function linearSteps(input: readonly LinearStep[]): Policy {
  const steps = immutable(input);
  for (const step of steps)
    if (step.maxApplications !== undefined) integer(step.maxApplications, 'maxApplications', 1);
  return (context) => linearDecision(steps, context);
}
// A WeakMap would leak run state into a policy. Instead retain full craft state history in the
// simulation context and replay step transitions against those immutable states.
function linearDecision(steps: readonly LinearStep[], context: PolicyContext): Currency | null {
  const states = context.states;
  let stepIndex = 0,
    used = 0;
  for (let turn = 0; turn <= context.history.length; turn++) {
    const item = states[turn];
    if (!item) throw new Error('Incomplete strategy history');
    while (stepIndex < steps.length) {
      const step = steps[stepIndex];
      if (!step) return null;
      const complete =
        step.until !== undefined
          ? meetsGoal(context.engine, item, step.until) ||
            used >= (step.maxApplications ?? Infinity)
          : used >= (step.maxApplications ?? 1);
      if (!complete) break;
      stepIndex++;
      used = 0;
    }
    const step = steps[stepIndex];
    if (turn === context.history.length) return step?.currency ?? null;
    used++;
  }
  return null;
}
export interface StrategyOptions {
  readonly runs: number;
  readonly maxApplications: number;
  readonly prices: PriceSheet;
  readonly rng: Rng;
}
export interface RunResult {
  readonly success: boolean;
  readonly item: Item;
  readonly cost: number;
  readonly applications: number;
  readonly spent: Tally;
  readonly stopReason: string;
}
export interface StrategyReport {
  readonly runs: readonly RunResult[];
  readonly successes: number;
  readonly successRate: number;
  readonly confidence95: Interval;
  readonly averageApplications: number;
  readonly averageCurrencyApplications: Tally;
  /** Percentiles include ALL trials, including capped/unsuccessful ones. */
  readonly costPercentiles: {
    readonly p50: number;
    readonly p90: number;
    readonly p95: number;
  };
  readonly successfulCostPercentiles: {
    readonly p50: number;
    readonly p90: number;
    readonly p95: number;
  } | null;
  /** All trial spend / successful trials; Infinity if none succeeded. */
  readonly costPerSuccess: number;
}
function percentiles(values: readonly number[]): {
  p50: number;
  p90: number;
  p95: number;
} {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number): number => sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)] ?? 0;
  return { p50: q(0.5), p90: q(0.9), p95: q(0.95) };
}
export function simulateStrategy(
  engine: Engine,
  start: Item,
  goal: Goal,
  policy: Policy,
  options: StrategyOptions,
): StrategyReport {
  integer(options.runs, 'runs', 1);
  integer(options.maxApplications, 'maxApplications', 1);
  const rng = options.rng.clone(),
    results: RunResult[] = [];
  const totals: Partial<Record<Currency, number>> = {};
  for (let n = 0; n < options.runs; n++) {
    let item = immutable(start),
      cost = 0,
      stopReason = 'application limit reached';
    const history: Currency[] = [],
      states: Item[] = [item],
      spent: Partial<Record<Currency, number>> = {};
    while (!meetsGoal(engine, item, goal) && history.length < options.maxApplications) {
      const context: PolicyContext = Object.freeze({
        engine,
        item,
        history: Object.freeze([...history]),
        states: Object.freeze([...states]),
      });
      const currency = policy(context);
      if (currency === null) {
        stopReason = 'policy stopped';
        break;
      }
      const price = priceOf(options.prices, currency);
      const result = applyCurrency(engine, item, currency, rng);
      if (!result.ok) {
        stopReason = result.reason;
        break;
      }
      item = result.item;
      states.push(item);
      history.push(currency);
      cost += price;
      spent[currency] = (spent[currency] ?? 0) + 1;
      totals[currency] = (totals[currency] ?? 0) + 1;
    }
    const success = meetsGoal(engine, item, goal);
    results.push(
      immutable({
        success,
        item,
        cost,
        applications: history.length,
        spent,
        stopReason: success ? 'goal reached' : stopReason,
      }),
    );
  }
  const successes = results.filter((r) => r.success);
  const averages: Partial<Record<Currency, number>> = {};
  for (const [currency, count] of Object.entries(totals))
    averages[currency as Currency] = count / options.runs;
  return immutable({
    runs: results,
    successes: successes.length,
    successRate: successes.length / options.runs,
    confidence95: wilson95(successes.length, options.runs),
    averageApplications: results.reduce((s, r) => s + r.applications, 0) / options.runs,
    averageCurrencyApplications: averages,
    costPercentiles: percentiles(results.map((r) => r.cost)),
    successfulCostPercentiles: successes.length ? percentiles(successes.map((r) => r.cost)) : null,
    costPerSuccess: successes.length
      ? results.reduce((s, r) => s + r.cost, 0) / successes.length
      : Infinity,
  });
}
