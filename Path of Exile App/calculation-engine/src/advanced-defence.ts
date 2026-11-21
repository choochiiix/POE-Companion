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
  /** Optional repeat cadence. Used for sustain estimates only. */
  readonly hitsPerSecond?: number;
}

export type DefensiveResource = 'life' | 'mana' | 'energyShield';
export interface RecoveryConfiguration {
  readonly flat?: number;
  readonly percent?: number;
  readonly increasedPercent?: number;
  readonly moreMultiplier?: number;
  readonly recoveryRateMultiplier?: number;
}
export interface DefenceConfiguration {
  readonly reservation?: Partial<Record<DefensiveResource, { readonly flat?: number; readonly percent?: number }>>;
  /** Explicit raw regeneration inputs; flat is per second and percent is a fraction of the total pool. */
  readonly recovery?: Partial<Record<DefensiveResource, RecoveryConfiguration>>;
  /** ES recharge is distinct from regeneration. Defaults use the pinned PoB constants. */
  readonly energyShieldRecharge?: {
    readonly baseRatePercent?: number;
    readonly increasedPercent?: number;
    readonly moreMultiplier?: number;
    readonly recoveryRateMultiplier?: number;
    readonly delaySeconds?: number;
    readonly fasterStartPercent?: number;
  };
  /** Pool routing such as MoM is unsupported unless a future implementation resolves it. */
  readonly unsupportedPoolRouting?: readonly string[];
}

export function validateDefenceConfiguration(config: DefenceConfiguration): void {
  for (const resource of ['life', 'mana', 'energyShield'] as const) {
    const reservation = config.reservation?.[resource];
    if (reservation) {
      for (const value of [reservation.flat ?? 0, reservation.percent ?? 0]) {
        if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid ${resource} reservation`);
      }
      if ((reservation.percent ?? 0) > 100) throw new RangeError(`Invalid ${resource} reservation percent`);
    }
    const recovery = config.recovery?.[resource];
    if (recovery) {
      for (const value of [recovery.flat ?? 0, recovery.percent ?? 0]) {
        if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid ${resource} recovery base`);
      }
      const increased = recovery.increasedPercent ?? 0;
      if (!Number.isFinite(increased) || increased < -100) throw new RangeError(`Invalid ${resource} recovery increase`);
      for (const value of [recovery.moreMultiplier ?? 1, recovery.recoveryRateMultiplier ?? 1]) {
        if (!Number.isFinite(value) || value < 0) throw new RangeError(`Invalid ${resource} recovery multiplier`);
      }
    }
  }
  const recharge = config.energyShieldRecharge;
  if (recharge) {
    if (!Number.isFinite(recharge.baseRatePercent ?? 100 / 3) || (recharge.baseRatePercent ?? 100 / 3) < 0) throw new RangeError('Invalid energy shield recharge base');
    if (!Number.isFinite(recharge.increasedPercent ?? 0) || (recharge.increasedPercent ?? 0) < -100) throw new RangeError('Invalid energy shield recharge increase');
    if (!Number.isFinite(recharge.fasterStartPercent ?? 0) || (recharge.fasterStartPercent ?? 0) <= -100) throw new RangeError('Invalid energy shield recharge delay modifier');
    for (const value of [recharge.moreMultiplier ?? 1, recharge.recoveryRateMultiplier ?? 1]) {
      if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid energy shield recharge multiplier');
    }
    if (!Number.isFinite(recharge.delaySeconds ?? 2) || (recharge.delaySeconds ?? 2) < 0) throw new RangeError('Invalid energy shield recharge delay');
  }
  for (const issue of config.unsupportedPoolRouting ?? []) if (!issue.trim()) throw new TypeError('Invalid unsupported pool routing diagnostic');
}
export function validateIncomingHit(hit: IncomingHitScenario): void {
  if (!['attack', 'spell'].includes(hit.kind)) throw new TypeError('Invalid incoming hit kind');
  for (const [type, value] of Object.entries(hit.damage)) {
    if (!damageTypes.includes(type as DamageType) || !Number.isFinite(value) || value < 0) throw new RangeError('Invalid incoming damage');
  }
  for (const value of [hit.blockChance ?? 0, hit.blockedDamagePercent ?? 0, hit.suppressionChance ?? 0, hit.suppressionEffect ?? 50]) {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new RangeError('Invalid hit probability/effect');
  }
  if (hit.hitsPerSecond !== undefined && (!Number.isFinite(hit.hitsPerSecond) || hit.hitsPerSecond <= 0)) throw new RangeError('Invalid hit cadence');
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
  const blockChance = (hit.blockChance ?? 0) / 100;
  const suppressionMultiplier = 1 - suppressionChance * (hit.suppressionEffect ?? 50) / 100;
  const blockMultiplier = 1 - blockChance + blockChance * (hit.blockedDamagePercent ?? 0) / 100;
  const withExpectation = damage.map(part => ({ ...part, expectedTaken: part.taken * suppressionMultiplier * blockMultiplier }));
  const expectedTaken = withExpectation.reduce((sum, part) => sum + part.expectedTaken, 0);
  if (![unblocked, suppressed, expectedTaken].every(Number.isFinite)) throw new RangeError('Incoming hit overflow');
  return { damage: withExpectation, unblocked, suppressed, expectedTaken,
    avoidance: { blockChance: hit.blockChance ?? 0, suppressionChance: hit.kind === 'spell' ? hit.suppressionChance ?? 0 : 0,
      suppressionEffect: hit.kind === 'spell' ? hit.suppressionEffect ?? 50 : 0 },
    assumptions: ['Already-landed hit; independent block and suppression rolls.', 'Taken-as is applied once before mitigation.'] };
}

type ResourcePoolResult = { readonly value: number; readonly reserved: number; readonly unreserved: number };
type SurvivabilityDefence = {
  readonly pools: { readonly life: ResourcePoolResult; readonly mana: ResourcePoolResult; readonly energyShield: ResourcePoolResult; readonly armour: { readonly value: number } };
  readonly resistances: Record<ResistanceType, { readonly effective: number }>;
};
type MetricResult = { readonly value: number | null; readonly status: 'supported' | 'unsupported'; readonly reason?: string };

function available(defence: SurvivabilityDefence) {
  return { life: defence.pools.life.unreserved, mana: defence.pools.mana.unreserved,
    energyShield: defence.pools.energyShield.unreserved };
}
function poolCanSurvive(hitDamage: ReturnType<typeof calculateIncomingHit>['damage'], defence: SurvivabilityDefence): boolean {
  const pools = available(defence);
  const chaos = hitDamage.find(part => part.type === 'chaos')?.taken ?? 0;
  const other = hitDamage.filter(part => part.type !== 'chaos').reduce((sum, part) => sum + part.taken, 0);
  // Baseline PoE routing: non-chaos hits deplete ES before life; chaos bypasses ES.
  return chaos < pools.life && other < pools.energyShield + pools.life - chaos;
}
function scaleDamage(hit: IncomingHitScenario, type: DamageType, scale: number): IncomingHitScenario {
  return { ...hit, damage: Object.fromEntries(damageTypes.map(candidate => [candidate, candidate === type ? scale : 0])) };
}
function deterministicTaken(hit: IncomingHitScenario, defence: SurvivabilityDefence, type: DamageType, scale: number) {
  const result = calculateIncomingHit(scaleDamage(hit, type, scale), defence);
  const suppression = hit.kind === 'spell' && (hit.suppressionChance ?? 0) === 100
    ? 1 - (hit.suppressionEffect ?? 50) / 100 : 1;
  return result.damage.map(part => ({ ...part, taken: part.taken * suppression }));
}
function maxRawHit(hit: IncomingHitScenario, type: DamageType, defence: SurvivabilityDefence): number | null {
  if (defence.pools.life.unreserved === 0) return 0;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 1024 && poolCanSurvive(deterministicTaken(hit, defence, type, high), defence); i++) {
    low = high;
    high *= 2;
    if (!Number.isFinite(high)) return null;
  }
  if (!Number.isFinite(high)) return null;
  for (let i = 0; i < 80; i++) {
    const middle = low + (high - low) / 2;
    if (middle === low || middle === high) break;
    if (poolCanSurvive(deterministicTaken(hit, defence, type, middle), defence)) low = middle;
    else high = middle;
  }
  // Match the threshold convention: the boundary hit exhausts life.
  return high;
}

/** Computes deterministic, explicit-input survivability estimates, separate from expected single-hit damage. */
export function calculateSurvivability(hit: IncomingHitScenario, defence: SurvivabilityDefence, config?: DefenceConfiguration) {
  const unsupported = config?.unsupportedPoolRouting?.[0];
  const probabilistic = (hit.blockChance ?? 0) > 0
    || (hit.kind === 'spell' && (hit.suppressionChance ?? 0) > 0 && (hit.suppressionChance ?? 0) < 100);
  const guaranteedNoDamage = (hit.blockChance ?? 0) >= 100 && (hit.blockedDamagePercent ?? 0) === 0
    || hit.kind === 'spell' && (hit.suppressionChance ?? 0) >= 100 && (hit.suppressionEffect ?? 50) >= 100;
  const maxHit = Object.fromEntries(damageTypes.map(type => {
    if (unsupported) return [type, { value: null, status: 'unsupported', reason: unsupported } satisfies MetricResult];
    if (guaranteedNoDamage) return [type, { value: null, status: 'unsupported', reason: 'The configured defence prevents all damage, so maximum hit is unbounded.' } satisfies MetricResult];
    if (probabilistic) return [type, { value: null, status: 'unsupported', reason: 'Max-hit requires deterministic suppression and a scenario without block.' } satisfies MetricResult];
    const value = maxRawHit(hit, type, defence);
    return [type, value === null
      ? { value: null, status: 'unsupported', reason: 'No finite maximum-hit boundary was found.' } satisfies MetricResult
      : { value, status: 'supported' } satisfies MetricResult];
  })) as Record<DamageType, MetricResult>;
  const amount = damageTypes.reduce((sum, type) => sum + (hit.damage[type] ?? 0), 0);
  let ehp: MetricResult;
  let hitsToDeplete: number | null = null;
  if (unsupported) ehp = { value: null, status: 'unsupported', reason: unsupported };
  else if (amount <= 0) ehp = { value: null, status: 'unsupported', reason: 'A nonzero incoming hit is required.' };
  else if ((hit.blockChance ?? 0) > 0 || (hit.kind === 'spell' && (hit.suppressionChance ?? 0) > 0 && (hit.suppressionChance ?? 0) < 100)) {
    ehp = { value: null, status: 'unsupported', reason: 'Probabilistic block or suppression is not modeled for repeated-hit EHP.' };
  }
  else {
    const suppression = hit.kind === 'spell' && (hit.suppressionChance ?? 0) === 100
      ? 1 - (hit.suppressionEffect ?? 50) / 100 : 1;
    const parts = calculateIncomingHit(hit, defence).damage.map(part => ({ ...part, taken: part.taken * suppression }));
    const chaos = parts.find(part => part.type === 'chaos')?.taken ?? 0;
    const other = parts.filter(part => part.type !== 'chaos').reduce((sum, part) => sum + part.taken, 0);
    const pools = available(defence);
    const total = chaos + other;
    const hitCount = pools.life === 0 ? 0 : Math.min(chaos > 0 ? pools.life / chaos : Number.POSITIVE_INFINITY,
      total > 0 ? (pools.life + pools.energyShield) / total : Number.POSITIVE_INFINITY);
    hitsToDeplete = Number.isFinite(hitCount) ? hitCount : null;
    ehp = hitsToDeplete !== null
      ? { value: amount * hitsToDeplete, status: 'supported' }
      : { value: null, status: 'unsupported', reason: 'Incoming scenario deals no damage or has unbounded survivability.' };
  }
  return { maxHit, ehp: { ...ehp, hitsToDeplete,
    timeToDeplete: hitsToDeplete !== null && hit.hitsPerSecond !== undefined ? hitsToDeplete / hit.hitsPerSecond : null },
    cadence: hit.hitsPerSecond ?? null,
    assumptions: ['Max hit uses deterministic mitigation and baseline ES-before-life routing; mana is not routed without explicit support.',
      'EHP and hits to deplete use deterministic repeated hits; recovery is reported separately and is not simulated.'] };
}
