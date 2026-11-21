import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/index.ts';
import { convertDamage, validateConversions } from '../src/conversion.ts';
import { calculateIncomingHit, calculateSurvivability, validateDefenceConfiguration, validateIncomingHit } from '../src/advanced-defence.ts';
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

test('resource reservation leaves total pool values compatible and exposes unreserved amounts', () => {
  const input = { version: 1 as const, pools: { life: 1000, mana: 500, energyShield: 200, armour: 0, evasion: 0 },
    resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 }, resistancePenalty: 0,
    enemy: { armour: 0, evasion: 0, accuracy: 0, resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 } },
    incomingPhysicalHit: 0, sources: [], defenceConfig: { reservation: { life: { percent: 10 }, mana: { flat: 100 }, energyShield: { flat: 50 } } } };
  const out = calculate(input).defence;
  assert.equal(out.pools.life.value, 1000); assert.equal(out.pools.life.reserved, 100); assert.equal(out.pools.life.unreserved, 900);
  assert.equal(out.pools.mana.unreserved, 400); assert.equal(out.pools.energyShield.unreserved, 150);
  const { defenceConfig: configured, ...unconfigured } = input;
  void configured;
  const baseline = calculate({ ...unconfigured, pools: { ...input.pools, mana: 50 }, rounding: 'pob' }).defence;
  assert.equal(baseline.recovery.manaPerSecond, 0.9);
  assert.equal(baseline.energyShieldRecharge.ratePerSecond, 67);
  assert.equal(baseline.energyShieldRecharge.delaySeconds, 2);
  const noEs = calculate({ ...unconfigured, pools: { ...input.pools, energyShield: 0 }, rounding: 'pob' }).defence.energyShieldRecharge;
  assert.equal(noEs.ratePerSecond, 0); assert.equal(noEs.delaySeconds, 2);
  const recovered = calculate({ ...input, pools: { ...input.pools, mana: 170, energyShield: 18 }, rounding: 'pob',
    defenceConfig: { recovery: { mana: { flat: 2.9 } } } }).defence;
  assert.equal(recovered.recovery.manaPerSecond, 5.9);
  assert.equal(recovered.energyShieldRecharge.ratePerSecond, 6);
  assert.equal(recovered.energyShieldRecharge.delaySeconds, 2);
});

test('typed max hits respect resistance, armour, ES routing, chaos bypass and survive/lethal boundary', () => {
  const pools = { life: { value: 1000, reserved: 0, unreserved: 1000 }, mana: { value: 500, reserved: 0, unreserved: 500 },
    energyShield: { value: 200, reserved: 0, unreserved: 200 }, armour: { value: 0 }, evasion: { value: 0 } };
  const resolved = { pools, resistances: { fire: { effective: 75 }, cold: { effective: 75 }, lightning: { effective: 75 }, chaos: { effective: 0 } } };
  const out = calculateSurvivability({ kind: 'attack', damage: { physical: 100 } }, resolved);
  assert.equal(out.ehp.hitsToDeplete, 12); assert.equal(out.ehp.timeToDeplete, null);
  assert.equal(out.maxHit.physical.value, 1200);
  assert.equal(out.maxHit.fire.value, 4800);
  assert.equal(out.maxHit.chaos.value, 1000);
  const lethal = calculateIncomingHit({ kind: 'attack', damage: { fire: 4801 } }, resolved);
  const boundary = calculateIncomingHit({ kind: 'attack', damage: { fire: 4800 } }, resolved);
  const survivable = calculateIncomingHit({ kind: 'attack', damage: { fire: 4799 } }, resolved);
  const budget = pools.life.unreserved + pools.energyShield.unreserved;
  assert.ok(lethal.expectedTaken > budget);
  assert.equal(boundary.expectedTaken, budget);
  assert.ok(survivable.expectedTaken < budget);
});

test('100% spell suppression applies to max hit and EHP; mixed damage retains per-type boundary', () => {
  const pools = { life: { value: 288, reserved: 0, unreserved: 288 }, mana: { value: 0, reserved: 0, unreserved: 0 },
    energyShield: { value: 0, reserved: 0, unreserved: 0 }, armour: { value: 0 }, evasion: { value: 0 } };
  const defence = { pools, resistances: { fire: { effective: 75 }, cold: { effective: 0 }, lightning: { effective: 0 }, chaos: { effective: 0 } } };
  const hit = { kind: 'spell' as const, damage: { physical: 40, fire: 80 }, suppressionChance: 100, suppressionEffect: 40, hitsPerSecond: 2 };
  const out = calculateSurvivability(hit, defence);
  assert.ok(Math.abs(out.maxHit.physical.value! - 480) < 1e-9);
  assert.ok(Math.abs(out.maxHit.fire.value! - 1920) < 1e-9);
  assert.ok(Math.abs(out.ehp.value! - 960) < 1e-9);
  assert.equal(out.ehp.hitsToDeplete, 8); assert.equal(out.ehp.timeToDeplete, 4);
  const incoming = calculateIncomingHit(hit, defence);
  assert.deepEqual(incoming.avoidance, { blockChance: 0, suppressionChance: 100, suppressionEffect: 40 });
});

test('chaos bypass limits EHP to life even when ES remains', () => {
  const pools = { life: { value: 1000, reserved: 0, unreserved: 1000 }, mana: { value: 0, reserved: 0, unreserved: 0 },
    energyShield: { value: 1000, reserved: 0, unreserved: 1000 }, armour: { value: 0 }, evasion: { value: 0 } };
  const defence = { pools, resistances: { fire: { effective: 75 }, cold: { effective: 0 }, lightning: { effective: 0 }, chaos: { effective: 0 } } };
  const out = calculateSurvivability({ kind: 'attack', damage: { chaos: 50, fire: 50 } }, defence);
  assert.equal(out.ehp.value, 2000);
});

test('probabilistic max hit and unsupported routing return explicit missing results', () => {
  const pools = { life: { value: 1000, reserved: 0, unreserved: 1000 }, mana: { value: 0, reserved: 0, unreserved: 0 },
    energyShield: { value: 0, reserved: 0, unreserved: 0 }, armour: { value: 0 } };
  const resolved = { pools, resistances: { fire: { effective: 75 }, cold: { effective: 75 }, lightning: { effective: 75 }, chaos: { effective: 0 } } };
  const blocked = calculateSurvivability({ kind: 'attack', damage: { fire: 100 }, blockChance: 20 }, resolved);
  assert.equal(blocked.maxHit.fire.status, 'unsupported'); assert.equal(blocked.maxHit.fire.value, null);
  const prevented = calculateSurvivability({ kind: 'spell', damage: { fire: 100 }, suppressionChance: 100, suppressionEffect: 100 }, resolved);
  assert.equal(prevented.maxHit.fire.status, 'unsupported'); assert.equal(prevented.maxHit.fire.value, null);
  const routed = calculateSurvivability({ kind: 'attack', damage: { fire: 100 } }, resolved, { unsupportedPoolRouting: ['Mind over Matter'] });
  assert.equal(routed.ehp.status, 'unsupported'); assert.equal(routed.ehp.value, null);
  assert.throws(() => validateDefenceConfiguration({ reservation: { life: { percent: 101 } } }));
  assert.doesNotThrow(() => validateDefenceConfiguration({ recovery: { mana: { increasedPercent: -2 } } }));
  assert.throws(() => validateDefenceConfiguration({ recovery: { mana: { increasedPercent: -101 } } }));
  assert.throws(() => validateDefenceConfiguration({ energyShieldRecharge: { fasterStartPercent: -100 } }));
  assert.throws(() => validateIncomingHit({ kind: 'attack', damage: {}, hitsPerSecond: 0 }));
});
