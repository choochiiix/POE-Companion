import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { basesForSlot, validEquipment } from '../features/character/character-data.js';
const { bases } = JSON.parse(await readFile(new URL('../../crafting-data/repoe-poe1.json', import.meta.url), 'utf8'));
const baseOf = (itemClass) => bases.find((base) => base.itemClass === itemClass);
test('equipment slots filter real bases and both rings share the ring pool', () => {
  for (const [slot, itemClass] of [['helmet', 'Helmet'], ['boots', 'Boots'], ['body-armour', 'Body Armour'], ['amulet', 'Amulet'], ['belt', 'Belt'], ['gloves', 'Gloves'], ['ring-one', 'Ring'], ['ring-two', 'Ring']]) {
    const pool = basesForSlot(bases, slot);
    assert.ok(pool.length > 0);
    assert.ok(pool.every((base) => base.itemClass === itemClass));
  }
  assert.deepEqual(basesForSlot(bases, 'ring-one'), basesForSlot(bases, 'ring-two'));
  assert.ok(basesForSlot(bases, 'main-hand').every((base) => !['Shield', 'Quiver', 'Helmet'].includes(base.itemClass)));
});
test('main hand constrains ordinary off-hand bases and invalid selections are cleared', () => {
  assert.ok(basesForSlot(bases, 'off-hand', baseOf('Bow')).every((base) => base.itemClass === 'Quiver'));
  assert.equal(basesForSlot(bases, 'off-hand', baseOf('Staff')).length, 0);
  assert.ok(basesForSlot(bases, 'off-hand', baseOf('Wand')).every((base) => ['Wand', 'Shield'].includes(base.itemClass)));
  assert.ok(basesForSlot(bases, 'off-hand', baseOf('Claw')).every((base) => !['Wand', 'Quiver'].includes(base.itemClass)));
  const gear = validEquipment({'main-hand': baseOf('Bow').id, 'off-hand': baseOf('Shield').id, boots: baseOf('Boots').id, helmet: 'unknown'}, bases);
  assert.equal(gear['off-hand'], '');
  assert.equal(gear.helmet, '');
  assert.equal(gear.boots, baseOf('Boots').id);
  assert.equal(validEquipment(null, bases).boots, '');
  assert.equal(validEquipment({'main-hand': baseOf('Helmet').id}, bases)['main-hand'], '');
});
