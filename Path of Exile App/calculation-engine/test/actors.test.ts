import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateActors, calculateTriggerSchedule } from '../src/actors.ts';
import type { ActorInput } from '../src/actors.ts';
import type { CalculationInput } from '../src/model.ts';

function fixture(): CalculationInput {
  const res = { fire: 0, cold: 0, lightning: 0, chaos: 0 };
  return { version: 1, sources: [], pools: { life: 100, mana: 100, energyShield: 0, armour: 0, evasion: 0 },
    resistances: res, resistancePenalty: 0, enemy: { armour: 0, evasion: 0, accuracy: 100, resistances: res }, incomingPhysicalHit: 100,
    skill: { id: 'spell', kind: 'spell', damage: { fire: { min: 100, max: 100 } }, baseTime: 0.5, baseCritChance: 0, critMultiplier: 150, accuracy: 0 } };
}
function actor(overrides: Partial<ActorInput> = {}): ActorInput {
  return { id: 'actor', kind: 'self', input: fixture(), delivery: { mode: 'continuous' }, count: 1, included: true, ...overrides };
}
test('independent minion modifiers do not inherit player sources; selected actors aggregate', () => {
  const player = fixture();
  const result = calculateActors({ actors: [actor({ id: 'player', input: { ...player, sources: [{ id: 'playerBuff', kind: 'buff', modifiers: [{ id: 'damage', stat: 'damage', kind: 'MORE', value: 100 }] }] } }),
    actor({ id: 'minions', kind: 'minion', count: 3 }), actor({ id: 'alternate', included: false })] });
  assert.equal(result.actors[0]!.contribution, 400); assert.equal(result.actors[1]!.contribution, 600);
  assert.equal(result.actors[2]!.contribution, 0); assert.equal(result.totalDps, 1000);
});
test('trigger cadence accounts for skipped opportunities and cooldown recovery', () => {
  const base = calculateTriggerSchedule({ sourceRate: 5, cooldown: 0.3 });
  assert.equal(base.opportunitiesPerActivation, 2); assert.equal(base.activationsPerSecond, 2.5);
  assert.equal(calculateTriggerSchedule({ sourceRate: 5, cooldown: 0.3, increasedCooldownRecovery: 50 }).activationsPerSecond, 5);
  assert.equal(calculateTriggerSchedule({ sourceRate: 10, cooldown: 0.1, tickDuration: 0.033 }).activationsPerSecond, 5);
  assert.equal(calculateTriggerSchedule({ sourceRate: 0, cooldown: 0 }).activationsPerSecond, 0);
});
test('triggered skills use explicit source cadence instead of self cast speed', () => {
  const result = calculateActors({ actors: [actor({ kind: 'trigger', delivery: { mode: 'trigger', sourceRate: 5, cooldown: 0.3 } })] });
  assert.equal(result.totalDps, 250); assert.equal(result.actors[0]!.offence.rate, 2);
});
test('traps and mines require explicit sustained delivery rate', () => {
  assert.throws(() => calculateActors({ actors: [actor({ kind: 'trap' })] }));
  assert.equal(calculateActors({ actors: [actor({ kind: 'mine', delivery: { mode: 'fixed', activationsPerSecond: 1.5 }, count: 2 })] }).totalDps, 300);
});
test('exclusive groups, duplicate IDs, counts and invalid scheduling reject', () => {
  assert.throws(() => calculateActors({ actors: [actor({ id: 'a', exclusiveGroup: 'main' }), actor({ id: 'b', exclusiveGroup: 'main' })] }));
  assert.throws(() => calculateActors({ actors: [actor(), actor()] }));
  assert.throws(() => calculateActors({ actors: [actor({ count: 0.5 })] }));
  assert.throws(() => calculateTriggerSchedule({ sourceRate: Infinity, cooldown: 1 }));
  assert.throws(() => calculateTriggerSchedule({ sourceRate: 1, cooldown: 1, increasedCooldownRecovery: -100 }));
});
test('unique interactions remain explicit source modifiers or unsupported diagnostics', () => {
  const input = fixture();
  const result = calculateActors({ actors: [actor({ input: { ...input, sources: [{ id: 'unique-item', kind: 'equipment', modifiers: [], unsupported: ['minion explosion'] }] }, unsupported: ['shared trigger cooldown'] })] });
  assert.equal(result.status, 'partial'); assert.equal(result.diagnostics.length, 2);
  assert.equal(result.diagnostics[0]!.sourceId, 'unique-item');
});
test('actor calculation is deterministic, side-effect free and handles empty selection', () => {
  const input = { actors: [actor()] }; const before = JSON.stringify(input);
  assert.deepEqual(calculateActors(input), calculateActors(input)); assert.equal(JSON.stringify(input), before);
  assert.equal(calculateActors({ actors: [] }).totalDps, 0);
});
