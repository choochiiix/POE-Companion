import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adaptRePoE,
  modsForBase,
  createEngine,
  createItem,
  modPool,
  effectiveWeight,
  ASSUMPTION_CONFIG,
  updateItem,
  currencyPlan,
  enumerate,
  SeededRng,
  sample,
} from '../src/index.ts';
import type { ModDef, RePoEData } from '../src/index.ts';

const mod = (patch: Readonly<Record<string, unknown>> = {}): Record<string, unknown> => ({
  domain: 'item',
  generation_type: 'prefix',
  is_essence_only: false,
  name: 'Healthy',
  text: '+(10-24) to maximum Life',
  required_level: 5,
  groups: ['Life'],
  adds_tags: ['has_life'],
  implicit_tags: ['life'],
  spawn_weights: [
    { tag: 'weapon', weight: 0 },
    { tag: 'default', weight: 1000 },
  ],
  generation_weights: [],
  stats: [{ id: 'life', min: 10, max: 24 }],
  grants_effects: [],
  ...patch,
});
const base = (patch: Readonly<Record<string, unknown>> = {}): Record<string, unknown> => ({
  domain: 'item',
  name: 'Test Ring',
  item_class: 'Ring',
  release_state: 'released',
  drop_level: 1,
  tags: ['ring', 'default'],
  implicits: [],
  ...patch,
});
const imported = (): RePoEData => adaptRePoE({ Life: mod() }, { Ring: base() }, 'test-version');

test('adapter preserves source ids, ordered weights, ranges, groups, and separate tag roles', () => {
  const data = imported(),
    m = data.mods[0]!;
  assert.equal(m.id, 'Life');
  assert.equal(m.affix, 'prefix');
  assert.equal(m.requiredLevel, 5);
  assert.deepEqual(m.spawnWeights, [
    { tag: 'weapon', weight: 0 },
    { tag: 'default', weight: 1000 },
  ]);
  assert.deepEqual(m.tags, ['life']);
  assert.deepEqual(m.addsTags, ['has_life']);
  assert.deepEqual(m.stats, [{ id: 'life', min: 10, max: 24 }]);
  assert.equal(m.tier, undefined);
  assert.deepEqual(m.groups, ['Life']);
  assert.equal(data.bases[0]?.modDomain, 'item');
  assert.ok(Object.isFrozen(data.mods[0]?.spawnWeights));
});
test('adapter records exclusions instead of adding unsupported mechanics to ordinary pools', () => {
  const data = adaptRePoE(
    {
      Life: mod(),
      Essence: mod({ is_essence_only: true }),
      Crafted: mod({ domain: 'crafted' }),
      Unique: mod({ generation_type: 'unique' }),
      Disabled: mod({ spawn_weights: [] }),
    },
    {
      Ring: base(),
      Jewel: base({ item_class: 'Jewel' }),
      Legacy: base({ release_state: 'legacy' }),
      RoyaleRing: base(),
      Talisman: base({ tags: ['talisman'] }),
    },
    'test',
  );
  assert.equal(data.mods.length, 1);
  assert.equal(data.bases.length, 1);
  assert.deepEqual(data.report.excludedMods['essence-only'], ['Essence']);
  assert.deepEqual(data.report.excludedBases['unsupported-class-or-domain'], ['Jewel']);
  assert.deepEqual(data.report.excludedBases['unsupported-special-base'], [
    'RoyaleRing',
    'Talisman',
  ]);
  assert.equal(Object.values(data.report.excludedMods).flat().length + data.mods.length, 5);
});
test('adapter preserves implicit references and applies their granted tags without consuming slots', () => {
  const data = adaptRePoE(
    {
      Life: mod(),
      Implicit: mod({ generation_type: 'unique', adds_tags: ['implicit_tag'] }),
    },
    { Ring: base({ implicits: ['Implicit'] }) },
    'test',
  );
  assert.deepEqual(
    data.bases[0]?.implicits?.map((m) => m.id),
    ['Implicit'],
  );
  assert.ok(data.bases[0]?.tags.includes('implicit_tag'));
  const item = createItem(data.bases[0]!, 85);
  assert.equal(item.mods.length, 0);
});
test('granted effects survive import as metadata, without invented numeric stats', () => {
  const data = adaptRePoE(
    {
      Life: mod({
        grants_effects: [{ granted_effect_id: 'SupportTest', level: 12 }],
      }),
    },
    { Ring: base() },
    'test',
  );
  assert.deepEqual(data.mods[0]?.grantedEffects, [{ id: 'SupportTest', level: 12 }]);
});
test('malformed supported records fail with paths rather than being silently coerced', () => {
  for (const patch of [
    { required_level: '5' },
    { stats: [{ id: 'life', min: 20, max: 10 }] },
    { generation_weights: [{ tag: 'default', weight: -1 }] },
    { is_essence_only: 'false' },
    { adds_tags: null },
  ]) {
    assert.throws(
      () => adaptRePoE({ Life: mod(patch) }, { Ring: base() }, 'test'),
      /mods\.Life|generation|stat/,
    );
  }
  assert.throws(
    () => adaptRePoE({ Life: mod() }, { Ring: base({ implicits: ['Missing'] }) }, 'test'),
    /Missing/,
  );
  assert.throws(() => adaptRePoE([], {}, 'test'), /expected object/);
  assert.throws(() => adaptRePoE({ '': mod() }, { Ring: base() }, 'test'), /empty source id/);
  assert.equal(
    adaptRePoE({ TestRoyale: mod() }, { Ring: base() }, 'test').report.excludedMods[
      'unsupported-royale-mode'
    ]?.length,
    1,
  );
});
test('generation multipliers use the first matching tag, preserve fractions, and allow zero', () => {
  const m: ModDef = {
    ...imported().mods[0]!,
    spawnWeights: [{ tag: 'default', weight: 3 }],
    generationWeights: [
      { tag: 'blocked', weight: 0 },
      { tag: 'wand', weight: 50 },
      { tag: 'default', weight: 100 },
    ],
  };
  assert.equal(effectiveWeight(m, new Set(['wand'])), 1.5);
  assert.equal(effectiveWeight(m, new Set(['blocked', 'wand'])), 0);
  assert.equal(effectiveWeight(m, new Set()), 3);
  assert.equal(effectiveWeight({ ...m, generationWeights: [] }, new Set()), 3);
  assert.equal(
    effectiveWeight({ ...m, generationWeights: [{ tag: 'other', weight: 1 }] }, new Set()),
    3,
  );
});
test('subsequent rolls recalculate generation weights from granted tags in the shared plan', () => {
  const data = imported();
  const gate: ModDef = {
    ...data.mods[0]!,
    id: 'gate',
    affix: 'prefix',
    groups: ['gate'],
    spawnWeights: [{ tag: 'default', weight: 1 }],
    stats: [],
    addsTags: ['boost'],
  };
  const a: ModDef = {
    ...gate,
    id: 'a',
    affix: 'suffix',
    groups: ['a'],
    addsTags: [],
    generationWeights: [
      { tag: 'boost', weight: 300 },
      { tag: 'default', weight: 100 },
    ],
  };
  const b: ModDef = { ...a, id: 'b', groups: ['b'], generationWeights: [] };
  const engine = createEngine([gate, a, b], ASSUMPTION_CONFIG);
  const item = updateItem(createItem(data.bases[0]!, 85, 'magic'), {
    mods: [{ id: 'gate', values: {} }],
  });
  const pool = modPool(engine, item);
  assert.deepEqual(
    pool.map((p) => [p.mod.id, p.weight]),
    [
      ['a', 3],
      ['b', 1],
    ],
  );
  const result = currencyPlan(engine, item, 'augmentation');
  assert.ok(result.ok);
  const leaves = enumerate(result.plan);
  assert.equal(leaves.find((l) => l.value.mods[1]?.id === 'a')?.probability, 0.75);
  const rng = new SeededRng(8);
  let hits = 0;
  for (let i = 0; i < 4000; i++) if (sample(result.plan, rng).mods[1]?.id === 'a') hits++;
  assert.ok(Math.abs(hits / 4000 - 0.75) < 0.03);
});
test('base specialization keeps conditionally enabled mods and mods blocked only after another roll', () => {
  const data = imported(),
    common = data.mods[0]!;
  const grant: ModDef = {
    ...common,
    id: 'grant',
    spawnWeights: [{ tag: 'default', weight: 1 }],
    addsTags: ['blocked', 'enabled'],
  };
  const before: ModDef = {
    ...common,
    id: 'before',
    spawnWeights: [
      { tag: 'blocked', weight: 0 },
      { tag: 'default', weight: 1 },
    ],
  };
  const after: ModDef = {
    ...common,
    id: 'after',
    spawnWeights: [
      { tag: 'enabled', weight: 1 },
      { tag: 'default', weight: 0 },
    ],
  };
  const impossible: ModDef = {
    ...common,
    id: 'impossible',
    spawnWeights: [
      { tag: 'weapon', weight: 1 },
      { tag: 'default', weight: 0 },
    ],
  };
  assert.deepEqual(
    modsForBase([grant, before, after, impossible], data.bases[0]!).map((m) => m.id),
    ['grant', 'before', 'after'],
  );
});
