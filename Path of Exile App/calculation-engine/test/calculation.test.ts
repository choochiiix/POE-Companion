import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/index.ts';
import type { CalculationInput, Modifier } from '../src/index.ts';
import { armourReduction, hitChance } from '../src/rules.ts';

const res = { fire: 0, cold: 0, lightning: 0, chaos: 0 };
function fixture(modifiers: readonly Modifier[] = []): CalculationInput {
  return { version: 1, sources: [{ id: 'test', kind: 'configuration', modifiers }],
    pools: { life: 100, mana: 50, energyShield: 20, armour: 5000, evasion: 0 }, resistances: { ...res }, resistancePenalty: 0,
    enemy: { armour: 0, evasion: 0, accuracy: 100, resistances: { ...res } }, incomingPhysicalHit: 1000,
    skill: { id: 'hit', kind: 'spell', damage: { fire: { min: 100, max: 200 } }, baseTime: 0.5, baseCritChance: 10, critMultiplier: 150, accuracy: 100 } };
}
test('spell range, critical expectation and sustained hit DPS hand example', () => {
  const out = calculate(fixture()).offence!;
  assert.equal(out.averageHit, 157.5); assert.equal(out.rate, 2); assert.equal(out.dps, 315);
});
test('increased adds while separate more/less modifiers multiply, with provenance', () => {
  const out = calculate(fixture([
    { id: 'a', stat: 'damage', kind: 'INC', value: 50 },
    { id: 'b', stat: 'fireDamage', kind: 'INC', value: 50 },
    { id: 'c', stat: 'elementalDamage', kind: 'MORE', value: 50 },
    { id: 'd', stat: 'spellDamage', kind: 'MORE', value: -20 },
  ])).offence!;
  assert.ok(Math.abs(out.damage.find(d => d.type === 'fire')!.min.value - 240) < 1e-10);
  assert.equal(out.damage.find(d => d.type === 'fire')!.min.contributions[0]!.sourceId, 'test');
});
test('conditions and skill scopes require an explicit match', () => {
  const input = fixture([{ id: 'buff', stat: 'damage', kind: 'MORE', value: 100, conditions: ['active'], skillId: 'hit' }]);
  assert.equal(calculate(input).offence!.dps, 315);
  assert.equal(calculate({ ...input, conditions: ['active'] }).offence!.dps, 630);
  assert.equal(calculate({ ...input, conditions: ['other'] }).offence!.dps, 315);
});
test('attack accuracy applies to hits and critical confirmation independently', () => {
  const input = fixture();
  const out = calculate({ ...input, enemy: { ...input.enemy, evasion: 10000 }, skill: { ...input.skill!, kind: 'attack', accuracy: 100 } }).offence!;
  assert.equal(out.chanceToHit, hitChance(10000, 100));
  assert.equal(out.effectiveCriticalChance, 10 * out.chanceToHit / 100);
  assert.ok(Math.abs(out.dps - 150 * (1 + out.effectiveCriticalChance / 200) * out.chanceToHit / 100 * 2) < 1e-10);
});
test('armour depends on hit size and caps at 90 percent', () => {
  assert.equal(armourReduction(5000, 1000), 50);
  assert.equal(armourReduction(5000, 100), 90);
  assert.equal(armourReduction(0, 0), 0);
  const out = calculate(fixture()).defence;
  assert.equal(out.physicalHitTaken, 500); assert.equal(out.evadeChance, 0);
});
test('resistance penalty, overcap, negative resistance and maximum caps', () => {
  const input = fixture([{ id: 'max', stat: 'fireMaximumResistance', kind: 'BASE', value: 50 }]);
  const out = calculate({ ...input, resistances: { ...res, fire: 200, cold: -300 }, resistancePenalty: -60 }).defence.resistances;
  assert.equal(out.fire.uncapped, 140); assert.equal(out.fire.maximum, 90); assert.equal(out.fire.effective, 90);
  assert.equal(out.cold.effective, -200);
});
test('enemy resistance mitigates elemental damage and negative resistance amplifies', () => {
  const input = fixture();
  assert.equal(calculate({ ...input, enemy: { ...input.enemy, resistances: { ...res, fire: 75 } } }).offence!.dps, 78.75);
  assert.equal(calculate({ ...input, enemy: { ...input.enemy, resistances: { ...res, fire: -50 } } }).offence!.dps, 472.5);
});
test('speed and action speed multiply; life scaling is independent', () => {
  const out = calculate(fixture([{ id: 's', stat: 'castSpeed', kind: 'INC', value: 50 }, { id: 'a', stat: 'actionSpeed', kind: 'INC', value: 20 }, { id: 'l', stat: 'life', kind: 'BASE', value: 50 }, { id: 'i', stat: 'life', kind: 'INC', value: 100 }]));
  assert.ok(Math.abs(out.offence!.rate - 3.6) < 1e-10); assert.equal(out.defence.pools.life.value, 300);
});
test('defence-only runs and unsupported adapter effects are explicit', () => {
  const { skill, ...input } = fixture();
  const out = calculate({ ...input, sources: [{ id: 'item', kind: 'equipment', modifiers: [], unsupported: ['damage conversion'] }] });
  assert.equal(out.offence, null); assert.equal(out.status, 'partial'); assert.equal(out.diagnostics[0]!.sourceId, 'item');
});
test('rejects invalid numbers, ranges, unsupported stats, duplicate IDs and invalid scopes', () => {
  const input = fixture();
  assert.throws(() => calculate({ ...input, incomingPhysicalHit: NaN }));
  assert.throws(() => calculate({ ...input, skill: { ...input.skill!, baseTime: 0 } }));
  assert.throws(() => calculate({ ...input, skill: { ...input.skill!, damage: { fire: { min: 20, max: 10 } } } }));
  assert.throws(() => calculate(fixture([{ id: 'x', stat: 'unknown', kind: 'BASE', value: 1 }] as unknown as Modifier[])));
  assert.throws(() => calculate({ ...input, sources: [...input.sources, ...input.sources] }));
  assert.throws(() => calculate(fixture([{ id: 'x', stat: 'life', kind: 'MORE', value: -101 }])));
  assert.throws(() => calculate(fixture([{ id: 'x', stat: 'fireResistance', kind: 'INC', value: 10 }])));
  assert.throws(() => calculate(fixture([{ id: 'x', stat: 'life', kind: 'BASE', value: 10, skillId: 'hit' }])));
});
test('deterministic, does not mutate inputs, and results do not share mutable input arrays', () => {
  const input = fixture([{ id: 'x', stat: 'damage', kind: 'INC', value: 20, conditions: [] }]);
  const before = JSON.stringify(input);
  const first = calculate(input); assert.deepEqual(first, calculate(input)); assert.equal(JSON.stringify(input), before);
  assert.notEqual(first.offence!.damage[0]!.min.contributions[0]!.conditions, input.sources[0]!.modifiers[0]!.conditions);
});
test('zero accuracy, zero damage, zero action rate and overflow remain well defined', () => {
  assert.equal(hitChance(0, 0), 5);
  assert.equal(calculate(fixture([{ id: 'stop', stat: 'castSpeed', kind: 'MORE', value: -100 }])).offence!.dps, 0);
  assert.throws(() => calculate(fixture([{ id: 'huge', stat: 'life', kind: 'MORE', value: Number.MAX_VALUE }, { id: 'huge2', stat: 'life', kind: 'MORE', value: Number.MAX_VALUE }])));
});
