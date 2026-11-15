import type { CalculationInput } from './model.ts';
import { calculate } from './core.ts';

export interface TriggerSchedule {
  /** Evenly spaced, guaranteed successful trigger opportunities per second. */
  readonly sourceRate: number;
  readonly cooldown: number;
  readonly increasedCooldownRecovery?: number;
  /** Explicit server tick duration; omitted means continuous cooldown timing. */
  readonly tickDuration?: number;
}
export type ActorDelivery = { readonly mode: 'continuous' }
  | { readonly mode: 'fixed'; readonly activationsPerSecond: number }
  | ({ readonly mode: 'trigger' } & TriggerSchedule);
export interface ActorInput {
  readonly id: string;
  readonly kind: 'self' | 'minion' | 'totem' | 'trap' | 'mine' | 'trigger';
  /** Entire independent actor input; player modifiers are never inherited implicitly. */
  readonly input: CalculationInput;
  readonly delivery: ActorDelivery;
  /** Simultaneous active instances, not maximum summon/placement count. */
  readonly count: number;
  /** Explicit opt-in prevents automatically adding every available skill. */
  readonly included: boolean;
  /** At most one included actor in each exclusive group. */
  readonly exclusiveGroup?: string;
  readonly unsupported?: readonly string[];
}
export interface ActorCalculationInput { readonly actors: readonly ActorInput[] }
const finite = (value: number, label: string, min = 0) => {
  if (!Number.isFinite(value) || value < min) throw new RangeError(`Invalid ${label}`);
  return value;
};
const identifier = (value: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError('Expected actor identifier');
};

/** One skill, one deterministic trigger source. Not a multi-spell rotation simulation. */
export function calculateTriggerSchedule(input: TriggerSchedule) {
  const sourceRate = finite(input.sourceRate, 'trigger source rate');
  const cooldown = finite(input.cooldown, 'trigger cooldown');
  const recovery = finite(input.increasedCooldownRecovery ?? 0, 'cooldown recovery', -100);
  if (recovery <= -100) throw new RangeError('Cooldown recovery must exceed -100%');
  const tick = input.tickDuration === undefined ? undefined : finite(input.tickDuration, 'tick duration', Number.MIN_VALUE);
  const recoveredCooldown = cooldown / (1 + recovery / 100);
  const effectiveCooldown = tick === undefined ? recoveredCooldown : Math.ceil(recoveredCooldown / tick - 1e-12) * tick;
  const opportunitiesPerActivation = sourceRate === 0 ? 0 : Math.max(1, Math.ceil(effectiveCooldown * sourceRate - 1e-12));
  const activationsPerSecond = opportunitiesPerActivation === 0 ? 0 : sourceRate / opportunitiesPerActivation;
  if (![effectiveCooldown, activationsPerSecond, opportunitiesPerActivation].every(Number.isFinite)) throw new RangeError('Trigger calculation overflow');
  return { sourceRate, recoveredCooldown, effectiveCooldown, opportunitiesPerActivation, activationsPerSecond };
}

export function calculateActors(input: ActorCalculationInput) {
  const ids = new Set<string>();
  const groups = new Set<string>();
  const actors = input.actors.map(actor => {
    identifier(actor.id);
    if (ids.has(actor.id)) throw new TypeError('Duplicate actor id');
    ids.add(actor.id);
    if (!['self', 'minion', 'totem', 'trap', 'mine', 'trigger'].includes(actor.kind)) throw new TypeError('Unsupported actor kind');
    if (typeof actor.included !== 'boolean') throw new TypeError('Actor inclusion must be explicit');
    finite(actor.count, 'actor count');
    if (!Number.isInteger(actor.count)) throw new RangeError('Actor count must be an integer');
    if (actor.exclusiveGroup !== undefined) {
      identifier(actor.exclusiveGroup);
      if (actor.included && groups.has(actor.exclusiveGroup)) throw new TypeError('Mutually exclusive actors cannot both contribute');
      if (actor.included) groups.add(actor.exclusiveGroup);
    }
    if (!actor.input.skill) throw new TypeError('Each damage actor requires a normalized skill');
    const calculation = calculate(actor.input);
    const offence = calculation.offence!;
    const trigger = actor.delivery.mode === 'trigger' ? calculateTriggerSchedule(actor.delivery) : null;
    let rate: number;
    if (trigger) rate = trigger.activationsPerSecond;
    else if (actor.delivery.mode === 'continuous') rate = offence.rate;
    else if (actor.delivery.mode === 'fixed') rate = finite(actor.delivery.activationsPerSecond, 'fixed delivery rate');
    else throw new TypeError('Unsupported actor delivery mode');
    if (['trap', 'mine', 'trigger'].includes(actor.kind) && actor.delivery.mode === 'continuous') throw new TypeError('Trap, mine and trigger actors require explicit delivery rate');
    const diagnostics = calculation.diagnostics.map(diagnostic => ({ ...diagnostic, actorId: actor.id }));
    for (const effect of actor.unsupported ?? []) {
      identifier(effect); diagnostics.push({ actorId: actor.id, sourceId: `actor:${actor.id}`, effect });
    }
    const potentialDps = offence.averageHit * offence.chanceToHit / 100 * rate * actor.count;
    if (!Number.isFinite(potentialDps)) throw new RangeError('Actor calculation overflow');
    return { id: actor.id, kind: actor.kind, included: actor.included, count: actor.count, rate, trigger, offence, calculation,
      potentialDps, contribution: actor.included ? potentialDps : 0, diagnostics };
  });
  const totalDps = actors.reduce((sum, actor) => sum + actor.contribution, 0);
  if (!Number.isFinite(totalDps)) throw new RangeError('Actor total overflow');
  const diagnostics = actors.flatMap(actor => actor.diagnostics);
  return { actors, totalDps, diagnostics, status: diagnostics.length ? 'partial' as const : 'supported-subset' as const,
    assumptions: ['Independent normalized actors; no implicit player modifier inheritance.',
      'Explicit active counts and contribution selection; unlimited resources and permanent uptime.',
      'Fixed rates must already account for trap/mine deployment, detonation and encounter uptime.',
      'Triggers assume one skill and guaranteed periodic opportunities; no random trigger chance, rotation, cost checks or shared cooldown groups.'] };
}
