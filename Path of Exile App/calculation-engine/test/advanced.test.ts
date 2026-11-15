import test from 'node:test';
import assert from 'node:assert/strict';
import { convertDamage, validateConversions } from '../src/conversion.ts';
import { calculateIncomingHit, validateIncomingHit } from '../src/advanced-defence.ts';
import type { Contribution, SkillInput } from '../src/model.ts';

const skill: SkillInput = { id: 'test', kind: 'spell', damage: { physical: { min: 100, max: 100 } },
  baseTime: 1, baseCritChance: 0, critMultiplier: 150, accuracy: 100 };
const mod = (id: string, stat: Contribution['stat'], value: number, kind: Contribution['kind'] = 'INC'): Contribution => ({ id, stat, value, kind, sourceId: 'fixture' });
const value = (parts: ReturnType<typeof convertDamage>, type: string) => parts.find(part => part.type === type)!.min.value;
test('conversion retains original scaling and destination scaling without double generic increases', () => {
  const parts = convertDamage(skill, [mod('p', 'physicalDamage', 100), mod('f', 'fireDamage', 100), mod('g', 'damage', 100)],
    [{ sourceId: 'gem', from: 'physical', to: 'fire', kind: 'convert', percent: 50 }]);
  assert.equal(value(parts, 'physical'), 150); // 50 * (1+1+1)
  assert.equal(value(parts, 'fire'), 200); // 50 * (1+1+1+1), not 50*3*3
});
test('conversion chains remember all prior types and elemental modifiers apply once', () => {
  const parts = convertDamage(skill, [mod('p', 'physicalDamage', 100), mod('l', 'lightningDamage', 100), mod('f', 'fireDamage', 100), mod('e', 'elementalDamage', 100)], [
    { sourceId: 'a', from: 'physical', to: 'lightning', kind: 'convert', percent: 100 },
    { sourceId: 'b', from: 'lightning', to: 'fire', kind: 'convert', percent: 100 },
  ]);
  assert.equal(value(parts, 'physical'), 0); assert.equal(value(parts, 'lightning'), 0); assert.equal(value(parts, 'fire'), 500);
  assert.deepEqual(parts.find(part => part.type === 'fire')!.paths[0]!.history, ['physical', 'lightning', 'fire']);
});
test('gain does not remove source damage and uses pre-conversion source amount', () => {
  const parts = convertDamage(skill, [], [
    { sourceId: 'convert', from: 'physical', to: 'fire', kind: 'convert', percent: 100 },
    { sourceId: 'gain', from: 'physical', to: 'chaos', kind: 'gain', percent: 20 },
  ]);
  assert.equal(value(parts, 'fire'), 100); assert.equal(value(parts, 'chaos'), 20);
});
test('destination flat damage is independent; more factors scale path once', () => {
  const parts = convertDamage(skill, [mod('flat', 'fireDamage', 10, 'BASE'), mod('more', 'damage', 100, 'MORE')],
    [{ sourceId: 'conversion', from: 'physical', to: 'fire', kind: 'convert', percent: 100 }]);
  assert.equal(value(parts, 'fire'), 220);
  assert.equal(parts.find(part => part.type === 'fire')!.paths.length, 2);
});
test('conversion rejects reverse order, cycles, nonfinite and overallocated conversion', () => {
  assert.throws(() => validateConversions([{ sourceId: 'x', from: 'fire', to: 'physical', kind: 'convert', percent: 10 }]));
  assert.throws(() => validateConversions([{ sourceId: 'x', from: 'physical', to: 'fire', kind: 'convert', percent: 101 }]));
  assert.throws(() => validateConversions([{ sourceId: 'x', from: 'physical', to: 'fire', kind: 'gain', percent: NaN }]));
});

const defence = { pools: { armour: { value: 5000 } }, resistances: {
  fire: { effective: 75 }, cold: { effective: 75 }, lightning: { effective: 75 }, chaos: { effective: 0 },
} };
test('taken-as shifts before armour; simultaneous shifts do not chain', () => {
  const out = calculateIncomingHit({ kind: 'attack', damage: { physical: 1000 }, takenAs: [
    { sourceId: 'helmet', from: 'physical', to: 'fire', percent: 50 },
    { sourceId: 'other', from: 'fire', to: 'chaos', percent: 100 },
  ] }, defence);
  assert.equal(out.damage.find(part => part.type === 'fire')!.shifted, 500);
  assert.equal(out.damage.find(part => part.type === 'chaos')!.shifted, 0);
  assert.ok(Math.abs(out.expectedTaken - (500 / 3 + 125)) < 1e-10);
});
test('spell suppression and block combine independent expectations', () => {
  const spell = calculateIncomingHit({ kind: 'spell', damage: { fire: 1000 }, suppressionChance: 100, suppressionEffect: 50, blockChance: 50 }, defence);
  assert.equal(spell.unblocked, 250); assert.equal(spell.suppressed, 125); assert.equal(spell.expectedTaken, 62.5);
  const attack = calculateIncomingHit({ kind: 'attack', damage: { fire: 1000 }, suppressionChance: 100, blockChance: 50, blockedDamagePercent: 65 }, defence);
  assert.equal(attack.expectedTaken, 206.25);
});
test('advanced defence validates percentages, damage and overallocated shifting', () => {
  assert.throws(() => validateIncomingHit({ kind: 'spell', damage: { fire: -1 } }));
  assert.throws(() => validateIncomingHit({ kind: 'spell', damage: {}, suppressionChance: 101 }));
  assert.throws(() => validateIncomingHit({ kind: 'spell', damage: {}, takenAs: [{ sourceId: 'x', from: 'physical', to: 'fire', percent: 101 }] }));
});
