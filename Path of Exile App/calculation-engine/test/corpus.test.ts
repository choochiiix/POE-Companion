import test from 'node:test';
import assert from 'node:assert/strict';
import { compareCorpus } from '../corpus/run.ts';
import { translateStatLines, compareBuilds } from '../src/index.ts';
import { assembleTrial } from '../trial/adapter.ts';

test('sixteen independent pinned PoB builds match 288 intermediate/final comparisons', () => {
  const report = compareCorpus();
  assert.equal(report.fixtureCount, 16); assert.equal(report.comparisonCount, 288);
  assert.equal(report.allMatch, true, JSON.stringify(report.results.filter(result => !result.allMatch)));
});
test('stat adapter preserves source and rejects unknown contextual wording', () => {
  const source = translateStatLines('test', 'equipment', ['+20 to Strength','10% increased Cast Speed','20% less Spell Damage','+30% to Fire Resistance','10% increased Fire Resistance','Nearby enemies take increased damage']);
  assert.equal(source.modifiers.length,4); assert.equal(source.modifiers[2]!.value,-20);
  assert.equal(source.modifiers[2]!.kind,'MORE'); assert.equal(source.unsupported!.length,2);
});

test('stat adapter recognizes the pinned ordinary Accuracy Rating wording', () => {
  const source = translateStatLines('accuracy-fixture', 'equipment', ['+300 to Accuracy Rating']);
  assert.deepEqual(source.modifiers, [{ id: 'line:0', stat: 'accuracy', kind: 'BASE', value: 300 }]);
  assert.deepEqual(source.unsupported, []);
});
test('shared tree and equipment wording routes resistance and paired defence stats', () => {
  const source = translateStatLines('passive:example', 'passive', ['+12% to all Elemental Resistances', '+14% to Cold and Lightning Resistances', '8% increased Armour and Evasion Rating', 'mysterious contextual effect']);
  assert.deepEqual(source.modifiers.map(mod => [mod.stat, mod.kind, mod.value]), [
    ['fireResistance', 'BASE', 12], ['coldResistance', 'BASE', 12], ['lightningResistance', 'BASE', 12],
    ['coldResistance', 'BASE', 14], ['lightningResistance', 'BASE', 14],
    ['armour', 'INC', 8], ['evasion', 'INC', 8],
  ]);
  assert.deepEqual(source.unsupported, ['mysterious contextual effect']);
});
test('comparison boundary calculates complete independent snapshots without mutating saves', () => {
  const {assembled} = assembleTrial();
  const before = { ...assembled.input, attributes: {strength:0,dexterity:0,intelligence:0}, attributeBonuses:false };
  const after = { ...before, configuration:[{id:'preview',kind:'configuration' as const,modifiers:[{id:'life',stat:'life' as const,kind:'BASE' as const,value:50}]}] };
  const serialized = JSON.stringify(before);
  const result = compareBuilds(before,after);
  assert.equal(result.changes.find(change=>change.stat==='life')!.delta,50);
  assert.equal(result.changes.find(change=>change.stat==='energyShield')!.percent,null);
  assert.equal(result.status,'partial'); assert.equal(JSON.stringify(before),serialized);
});
