import { damageTypes } from './model.ts';
import type { DamageType, ResistanceType } from './model.ts';
import { armourReduction } from './rules.ts';

export interface DamageTakenAs {
  readonly sourceId: string;
  readonly from: DamageType;
  readonly to: DamageType;
  readonly percent: number;
}
export interface IncomingHitScenario {
  readonly kind: 'attack' | 'spell';
  readonly damage: Partial<Record<DamageType, number>>;
  /** Final effective probability after caps/overrides, not raw increased chance. */
  readonly blockChance?: number;
  readonly blockedDamagePercent?: number;
  readonly suppressionChance?: number;
  readonly suppressionEffect?: number;
  readonly takenAs?: readonly DamageTakenAs[];
}
export function validateIncomingHit(hit: IncomingHitScenario): void {
  if (!['attack', 'spell'].includes(hit.kind)) throw new TypeError('Invalid incoming hit kind');
  for (const [type, value] of Object.entries(hit.damage)) {
    if (!damageTypes.includes(type as DamageType) || !Number.isFinite(value) || value < 0) throw new RangeError('Invalid incoming damage');
  }
  for (const value of [hit.blockChance ?? 0, hit.blockedDamagePercent ?? 0, hit.suppressionChance ?? 0, hit.suppressionEffect ?? 50]) {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new RangeError('Invalid hit probability/effect');
  }
  const totals = new Map<DamageType, number>();
  for (const rule of hit.takenAs ?? []) {
    if (!rule.sourceId?.trim() || !damageTypes.includes(rule.from) || !damageTypes.includes(rule.to) || rule.from === rule.to
      || !Number.isFinite(rule.percent) || rule.percent < 0) throw new TypeError('Invalid damage taken as');
    totals.set(rule.from, (totals.get(rule.from) ?? 0) + rule.percent);
  }
  for (const total of totals.values()) if (total > 100) throw new RangeError('Damage taken as exceeds 100%');
}
interface ResolvedDefence {
  readonly pools: { readonly armour: { readonly value: number } };
  readonly resistances: Record<ResistanceType, { readonly effective: number }>;
}
/** One already-landed hit. No evade, recovery, guard or resource-pool allocation simulation. */
export function calculateIncomingHit(hit: IncomingHitScenario, defence: ResolvedDefence) {
  validateIncomingHit(hit);
  const shifted = Object.fromEntries(damageTypes.map(type => [type, 0])) as Record<DamageType, number>;
  for (const from of damageTypes) {
    const base = hit.damage[from] ?? 0;
    const rules = (hit.takenAs ?? []).filter(rule => rule.from === from);
    shifted[from] += base * Math.max(0, 1 - rules.reduce((sum, rule) => sum + rule.percent / 100, 0));
    // Taken-as is simultaneous, not recursively converted.
    for (const rule of rules) shifted[rule.to] += base * rule.percent / 100;
  }
  const damage = damageTypes.map(type => {
    const amount = shifted[type];
    const reduction = type === 'physical' ? armourReduction(defence.pools.armour.value, amount) : defence.resistances[type].effective;
    return { type, shifted: amount, reduction, taken: amount * (1 - reduction / 100) };
  });
  const unblocked = damage.reduce((sum, part) => sum + part.taken, 0);
  const suppressionChance = hit.kind === 'spell' ? (hit.suppressionChance ?? 0) / 100 : 0;
  const suppressed = unblocked * (1 - (hit.suppressionEffect ?? 50) / 100);
  const suppressionAverage = unblocked * (1 - suppressionChance) + suppressed * suppressionChance;
  const blockChance = (hit.blockChance ?? 0) / 100;
  const expectedTaken = suppressionAverage * (1 - blockChance + blockChance * (hit.blockedDamagePercent ?? 0) / 100);
  if (![unblocked, suppressed, expectedTaken].every(Number.isFinite)) throw new RangeError('Incoming hit overflow');
  return { damage, unblocked, suppressed, expectedTaken,
    assumptions: ['Already-landed hit; independent block and suppression rolls.', 'Taken-as is applied once before mitigation.', 'Expected damage is not a maximum-hit or effective-health estimate.'] };
}
