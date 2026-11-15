import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  createEngine,
  modsForBase,
  effectiveWeight,
  currencyPlan,
  createItem,
  sample,
  SeededRng,
  ASSUMPTION_CONFIG,
} from '../../crafting-engine/src/index.ts';
import type { RePoEData } from '../../crafting-engine/src/index.ts';

test('real bundled snapshot: known records, weighted pools and seeded crafting', () => {
  const data = JSON.parse(
    readFileSync(new URL('../repoe-poe1.json', import.meta.url), 'utf8'),
  ) as RePoEData;
  assert.equal(data.sourceVersion, '3.29.3.6');
  assert.equal(data.mods.length, 2721);
  assert.equal(data.bases.length, 929);
  const life = data.mods.find((m) => m.id === 'IncreasedLife1')!;
  assert.equal(life.requiredLevel, 5);
  assert.deepEqual(life.stats, [{ id: 'base_maximum_life', min: 10, max: 24 }]);
  const wand = data.bases.find((b) => b.name === 'Imbued Wand')!;
  assert.equal(wand.dropLevel, 59);
  assert.equal(effectiveWeight(life, new Set(wand.tags)), 0);
  const physical = data.mods.find(
    (m) => m.id === 'LocalIncreasedPhysicalDamagePercentAndAccuracyRating1',
  )!;
  const raw =
    physical.spawnWeights.find((w) => w.tag === 'default' || wand.tags.includes(w.tag))?.weight ??
    0;
  assert.ok(raw > 0);
  assert.equal(effectiveWeight(physical, new Set(wand.tags)), raw * 0.5);
  const engine = createEngine(modsForBase(data.mods, wand), ASSUMPTION_CONFIG);
  const result = currencyPlan(engine, createItem(wand, 85), 'alchemy');
  assert.ok(result.ok);
  assert.deepEqual(sample(result.plan, new SeededRng(44)), sample(result.plan, new SeededRng(44)));
  assert.ok(
    data.bases.every((b) => !['Jewel', 'AbyssJewel', 'LifeFlask'].includes(b.itemClass ?? '')),
  );
  assert.ok(data.mods.every((m) => !/royale/i.test(m.id)));
});

test('base specialization never changes real pool probabilities across sampled histories', () => {
  const data = JSON.parse(
    readFileSync(new URL('../repoe-poe1.json', import.meta.url), 'utf8'),
  ) as RePoEData;
  const full = createEngine(data.mods, ASSUMPTION_CONFIG);
  for (const name of ['Imbued Wand', 'Astral Plate', 'Opal Ring', 'Convoking Wand']) {
    const base = data.bases.find((b) => b.name === name);
    assert.ok(base, name);
    const narrow = createEngine(modsForBase(data.mods, base), ASSUMPTION_CONFIG);
    for (let seed = 0; seed < 30; seed++) {
      const input = createItem(base, 85);
      const a = currencyPlan(full, input, 'alchemy'),
        b = currencyPlan(narrow, input, 'alchemy');
      assert.ok(a.ok && b.ok);
      assert.deepEqual(
        sample(a.plan, new SeededRng(seed)),
        sample(b.plan, new SeededRng(seed)),
        name,
      );
    }
  }
});
