import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleBuild, resolveEquipment } from '../src/build.ts';
import type { BuildInput } from '../src/build.ts';
import { calculate } from '../src/index.ts';

function fixture(): BuildInput {
  const resistance = { fire: 0, cold: 0, lightning: 0, chaos: 0 };
  return { version: 1, attributes: { strength: 101, dexterity: 51, intelligence: 101 },
    pools: { life: 100, mana: 40, energyShield: 100, armour: 0, evasion: 100 }, resistances: resistance,
    resistancePenalty: 0, incomingPhysicalHit: 1000,
    enemy: { armour: 0, accuracy: 100, evasion: 0, resistances: resistance },
    skill: { id: 'strike', kind: 'attack', damage: { physical: { min: 100, max: 100 } }, baseTime: 1, baseCritChance: 0, critMultiplier: 150, accuracy: 0 } };
}

test('build ordinary attributes follow explicit PoB snapshot bonuses without changing bases', () => {
  const build = fixture();
  const before = JSON.stringify(build);
  const result = assembleBuild(build);
  const out = calculate(result.input);
  assert.equal(out.defence.pools.life.value, 150);
  assert.equal(out.defence.pools.mana.value, 90);
  assert.ok(Math.abs(out.defence.pools.energyShield.value - 110) < 1e-10);
  assert.ok(Math.abs(out.defence.pools.evasion.value - 110) < 1e-10);
  assert.equal(out.offence!.accuracy.value, 102);
  assert.equal(out.offence!.damage[0]!.average, 100);
  assert.equal(JSON.stringify(build), before);
});
test('strength melee bonus is scoped and requires an explicit melee tag', () => {
  const build = assembleBuild({ ...fixture(), skillTags: ['melee'] });
  assert.equal(calculate(build.input).offence!.damage[0]!.average, 120);
});
test('attribute modifiers resolve before derived bonuses and support opt-out', () => {
  const input: BuildInput = { ...fixture(), sources: [{ id: 'passive', kind: 'passive', modifiers: [{ id: 'str', stat: 'strength', kind: 'INC', value: 100 }] }] };
  assert.equal(assembleBuild(input).attributes.strength.value, 202);
  assert.equal(calculate(assembleBuild(input).input).defence.pools.life.value, 201);
  assert.equal(calculate(assembleBuild({ ...input, attributeBonuses: false }).input).defence.pools.life.value, 100);
});
test('equipment local defence resolves once before global modifiers', () => {
  const input = assembleBuild({ ...fixture(), equipment: [{ id: 'body', slot: 'body', defence: { armour: 100 },
    localModifiers: [{ id: 'flat', stat: 'armour', kind: 'BASE', value: 50 }, { id: 'inc', stat: 'armour', kind: 'INC', value: 100 }],
    modifiers: [{ id: 'global', stat: 'armour', kind: 'INC', value: 50 }] }] });
  const out = calculate(input.input);
  assert.equal(input.equipment[0]!.defence.armour.value, 300);
  assert.equal(out.defence.pools.armour.value, 450);
  assert.equal(out.defence.pools.armour.contributions[0]!.sourceId, 'equipment:body');
});
test('source families preserve provenance and unresolved effects mark partial results', () => {
  const assembled = assembleBuild({ ...fixture(), passives: [{ id: 'tree:1', kind: 'passive', modifiers: [{ id: 'life', stat: 'life', kind: 'INC', value: 20 }] }],
    buffs: [{ id: 'buff:1', kind: 'buff', modifiers: [], unsupported: ['conditional damage conversion'] }] });
  assert.deepEqual(assembled.diagnostics, [{ sourceId: 'buff:1', effect: 'conditional damage conversion' }]);
  assert.equal(calculate(assembled.input).status, 'partial');
});
test('negative and positive conditions combine deterministically', () => {
  const input: BuildInput = { ...fixture(), sources: [{ id: 'conditions', kind: 'configuration', modifiers: [{ id: 'buff', stat: 'life', kind: 'BASE', value: 50, conditions: ['enabled'], notConditions: ['disabled'] }] }] };
  assert.equal(calculate(assembleBuild({ ...input, conditions: ['enabled'] }).input).defence.pools.life.value, 200);
  assert.equal(calculate(assembleBuild({ ...input, conditions: ['enabled', 'disabled'] }).input).defence.pools.life.value, 150);
  assert.throws(() => assembleBuild({ ...fixture(), sources: [{ id: 'bad', kind: 'configuration', modifiers: [{ id: 'bad', stat: 'life', kind: 'BASE', value: 1, conditions: ['same'], notConditions: ['same'] }] }] }));
});
test('rejects duplicate equipment slots, attribute overflow and invalid local modifiers', () => {
  const item = { id: 'one', slot: 'body', modifiers: [] };
  assert.throws(() => assembleBuild({ ...fixture(), equipment: [item, { ...item, id: 'two' }] }));
  assert.throws(() => assembleBuild({ ...fixture(), attributes: { strength: Infinity, dexterity: 0, intelligence: 0 } }));
  assert.throws(() => assembleBuild({ ...fixture(), sources: [{ id: 'bad', kind: 'configuration', modifiers: [{ id: 'flat', stat: 'damage', kind: 'BASE', value: 10 }] }] }));
  assert.throws(() => resolveEquipment({ ...item, defence: { armour: -1 } }));
  assert.throws(() => resolveEquipment({ ...item, localModifiers: [{ id: 'bad', stat: 'armour', kind: 'MORE', value: -101 }] }));
  assert.throws(() => resolveEquipment({ ...item, localModifiers: [{ id: 'bad', stat: 'armour', kind: 'BASE', value: 1, conditions: [] }] } as unknown as Parameters<typeof resolveEquipment>[0]));
});
