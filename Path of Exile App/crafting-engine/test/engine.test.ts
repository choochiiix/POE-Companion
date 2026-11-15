import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSUMPTION_CONFIG,
  CraftSession,
  SeededRng,
  affixCount,
  analyzePlan,
  applyCurrency,
  attemptEconomics,
  attemptsForConfidence,
  choice,
  createEngine,
  createItem,
  currencyOdds,
  currencyPlan,
  done,
  enumerate,
  expectedAttempts,
  linearSteps,
  meetsGoal,
  modHitProbability,
  modPool,
  nextModOdds,
  openSlots,
  range,
  sample,
  simulateStrategy,
  spawnWeight,
  tallyCost,
  updateItem,
  wilson95,
} from '../src/index.ts';
import type { Currency, Goal, Item, ModDef } from '../src/index.ts';
import { config, engine, fakeBase, fakeMods, normal } from './fixtures.ts';

const rng = (): SeededRng => new SeededRng(12345);
const hasLife: Goal = { kind: 'has', mod: { group: 'life' } };
function craft(item: Item, currency: Currency, seed = 1): Item {
  const result = applyCurrency(engine, item, currency, new SeededRng(seed));
  if (!result.ok) assert.fail(result.reason);
  return result.item;
}
const magic = updateItem(normal, {
  rarity: 'magic',
  mods: [{ id: 'life-low', values: { life: 1 } }],
});
const rare = updateItem(magic, { rarity: 'rare' });

test('RNG seeded sequence, cloning after advancement and input validation', () => {
  const a = rng(),
    b = rng();
  assert.deepEqual(
    Array.from({ length: 20 }, () => a.next()),
    Array.from({ length: 20 }, () => b.next()),
  );
  const c = a.clone();
  assert.equal(a.next(), c.next());
  assert.throws(() => new SeededRng(-1));
  assert.throws(() => sample(range(0, 1, done), { next: () => 1, clone: rng }));
});
test('items are deeply copied and frozen at runtime', () => {
  const base = { ...fakeBase, tags: ['wand'] };
  const item = createItem(base, 10);
  base.tags.push('other');
  assert.deepEqual(item.base.tags, ['wand']);
  assert.ok(Object.isFrozen(item) && Object.isFrozen(item.base.tags) && Object.isFrozen(item.mods));
  assert.throws(() => Object.assign(item, { corrupted: true }), TypeError);
});
test('ordered weights: first match, default matches all, zero blocks, no match blocks', () => {
  const mod = fakeMods[0]!;
  assert.equal(spawnWeight(mod, new Set(['blocked', 'wand'])), 0);
  assert.equal(spawnWeight(mod, new Set(['wand'])), 1);
  assert.equal(spawnWeight(mod, new Set()), 99);
  assert.equal(spawnWeight({ ...mod, spawnWeights: [{ tag: 'wand', weight: 1 }] }, new Set()), 0);
  assert.equal(
    spawnWeight(
      {
        ...mod,
        spawnWeights: [
          { tag: 'default', weight: 3 },
          { tag: 'wand', weight: 9 },
        ],
      },
      new Set(['wand']),
    ),
    3,
  );
});
test('pool filters domain, level, duplicate ids, groups and affix caps', () => {
  const low = createItem(fakeBase, 1, 'rare');
  assert.deepEqual(
    modPool(engine, low).map((p) => p.mod.id),
    ['life-low', 'mana', 'speed', 'resist'],
  );
  assert.deepEqual(
    modPool(engine, magic).map((p) => p.mod.id),
    ['speed', 'resist'],
  );
  assert.deepEqual(
    modPool(engine, rare).map((p) => p.mod.id),
    ['mana', 'speed', 'resist'],
  );
  assert.deepEqual(modPool(engine, normal), []);
});
test('extra and explicitly granted item tags affect subsequent weights', () => {
  const blocked = updateItem(rare, { mods: [], extraTags: ['blocked'] });
  assert.ok(!modPool(engine, blocked).some((p) => p.mod.id === 'life-low'));
  const granting = createEngine(
    fakeMods.map((m) => (m.id === 'mana' ? { ...m, addsTags: ['blocked'] } : m)),
    config,
  );
  const item = updateItem(rare, {
    mods: [{ id: 'mana', values: { mana: 5 } }],
  });
  assert.ok(!modPool(granting, item).some((p) => p.mod.id === 'life-low'));
});
test('base caps override magic and rare separately; no jewel detection is invented', () => {
  const base = {
    ...fakeBase,
    affixCaps: {
      rare: { prefix: 1, suffix: 1 },
      magic: { prefix: 0, suffix: 1 },
    },
  };
  const item = createItem(base, 10, 'rare');
  assert.equal(craft(item, 'chaos').mods.length, 2);
  const restricted = createItem(base, 10, 'magic');
  assert.ok(modPool(engine, restricted).every((p) => p.mod.affix === 'suffix'));
});
test('next-mod probabilities use eligible weights only', () => {
  const odds = nextModOdds(engine, updateItem(normal, { rarity: 'rare' }));
  assert.equal(odds.find((o) => o.id === 'mana')?.probability, 2 / 7);
  assert.equal(odds.find((o) => o.id === 'life-low')?.probability, 1 / 7);
  assert.equal(nextModOdds(engine, normal).length, 0);
});
test('transmutation, alteration, alchemy and chaos replace the expected affixes', () => {
  const transmuted = craft(normal, 'transmutation');
  assert.equal(transmuted.rarity, 'magic');
  assert.equal(transmuted.mods.length, 1);
  assert.equal(craft(magic, 'alteration').mods.length, 1);
  const alched = craft(normal, 'alchemy');
  assert.equal(alched.rarity, 'rare');
  assert.equal(alched.mods.length, 4);
  const chaotic = craft(rare, 'chaos');
  assert.equal(chaotic.mods.length, 4);
  assert.equal(chaotic.itemLevel, rare.itemLevel);
  assert.equal(normal.mods.length, 0);
  assert.equal(magic.mods[0]?.values.life, 1);
});
test('augmentation, regal, exalted preserve existing rolls and add one eligible mod', () => {
  const aug = craft(magic, 'augmentation');
  assert.equal(aug.mods.length, 2);
  assert.deepEqual(aug.mods[0], magic.mods[0]);
  assert.equal(affixCount(engine, aug, 'suffix'), 1);
  const regal = craft(aug, 'regal');
  assert.equal(regal.rarity, 'rare');
  assert.equal(regal.mods.length, 3);
  assert.deepEqual(regal.mods.slice(0, 2), aug.mods);
  const exalted = craft(regal, 'exalted');
  assert.equal(exalted.mods.length, 4);
});
test('annulment removes one mod uniformly and preserves rarity even when empty', () => {
  const aug = craft(magic, 'augmentation');
  const result = currencyPlan(engine, aug, 'annulment');
  assert.ok(result.ok);
  const leaves = enumerate(result.plan);
  assert.equal(leaves.length, 2);
  assert.ok(leaves.every((l) => l.probability === 0.5 && l.value.mods.length === 1));
  const empty = craft(magic, 'annulment');
  assert.equal(empty.mods.length, 0);
  assert.equal(empty.rarity, 'magic');
});
test('scouring removes explicit mods and divine preserves ids/tier and rerolls within ranges', () => {
  const clean = craft(rare, 'scouring');
  assert.equal(clean.rarity, 'normal');
  assert.deepEqual(clean.mods, []);
  const plan = currencyPlan(engine, magic, 'divine');
  assert.ok(plan.ok);
  assert.deepEqual(
    enumerate(plan.plan).map((l) => l.value.mods[0]?.values.life),
    [1, 2],
  );
  assert.ok(enumerate(plan.plan).every((l) => l.value.mods[0]?.id === 'life-low'));
});
test('all ten currencies reject corruption with clear reasons and consume no random draws', () => {
  const currencies: Currency[] = [
    'transmutation',
    'alteration',
    'augmentation',
    'regal',
    'alchemy',
    'chaos',
    'exalted',
    'annulment',
    'scouring',
    'divine',
  ];
  const a = rng(),
    b = a.clone();
  for (const c of currencies) {
    const result = applyCurrency(engine, updateItem(rare, { corrupted: true }), c, a);
    assert.ok(!result.ok);
    assert.match(result.reason, /Can't apply .* because the item is corrupted/);
  }
  assert.equal(a.next(), b.next());
});
test('wrong rarities, empty eligible pools and full caps produce refusal reasons', () => {
  for (const c of [
    'alteration',
    'augmentation',
    'regal',
    'chaos',
    'exalted',
    'annulment',
    'scouring',
    'divine',
  ] as const)
    assert.ok(!currencyPlan(engine, normal, c).ok);
  for (const c of ['transmutation', 'alchemy'] as const)
    assert.ok(!currencyPlan(engine, magic, c).ok);
  const full = craft(magic, 'augmentation');
  assert.ok(!currencyPlan(engine, full, 'augmentation').ok);
  const emptyEngine = createEngine([], config);
  assert.ok(!currencyPlan(emptyEngine, normal, 'alchemy').ok);
});
test('pool exhaustion terminates without exceeding caps or duplicating groups', () => {
  const one = createEngine([fakeMods[0]!], ASSUMPTION_CONFIG);
  const result = applyCurrency(one, normal, 'alchemy', rng());
  assert.ok(result.ok);
  assert.equal(result.item.mods.length, 1);
});
test('invalid data and invalid numeric options fail early', () => {
  assert.throws(() => createEngine([fakeMods[0]!, fakeMods[0]!], config), /Duplicate/);
  assert.throws(() =>
    createEngine([{ ...fakeMods[0]!, spawnWeights: [{ tag: 'default', weight: -1 }] }], config),
  );
  assert.throws(() =>
    createEngine([{ ...fakeMods[0]!, stats: [{ id: 'x', min: 3, max: 2 }] }], config),
  );
  assert.throws(() =>
    createEngine(fakeMods, {
      ...config,
      counts: { ...config.counts, chaos: [] },
    }),
  );
  assert.throws(() => createItem(fakeBase, 0));
  assert.throws(() => range(0, 1.2, done));
  assert.throws(() => choice([]));
  assert.throws(() => choice([{ weight: Infinity, next: () => done(1) }]));
});
test('exact one-affix odds include inclusive value rolls', () => {
  const odds = currencyOdds(
    engine,
    normal,
    'transmutation',
    { kind: 'value', mod: { id: 'life-low' }, stat: 'life', min: 2 },
    { rng: rng() },
  );
  assert.equal(odds.method, 'exact');
  assert.equal(odds.probability, 1 / 14);
  if (odds.method !== 'exact') return;
  assert.ok(Math.abs(odds.outcomes.reduce((s, o) => s + o.probability, 0) - 1) < 1e-12);
  assert.equal(
    modHitProbability(engine, normal, 'transmutation', 'mana', { rng: rng() }).probability,
    2 / 7,
  );
});
test('full enumeration merges paths differing only by mod insertion order', () => {
  const pair: readonly ModDef[] = [
    { ...fakeMods[0]!, stats: [] },
    {
      ...fakeMods[3]!,
      stats: [],
      spawnWeights: [{ tag: 'default', weight: 1 }],
    },
  ];
  const e = createEngine(pair, {
    ...config,
    counts: { ...config.counts, transmutation: [{ count: 2, weight: 1 }] },
  });
  const odds = currencyOdds(
    e,
    normal,
    'transmutation',
    { kind: 'has', mod: { id: 'speed' } },
    { rng: rng() },
  );
  assert.equal(odds.method, 'exact');
  if (odds.method === 'exact') {
    assert.equal(odds.outcomes.length, 1);
    assert.equal(odds.outcomes[0]?.probability, 1);
  }
});
test('count weights and sequential group exclusion affect exact outcomes', () => {
  const e = createEngine(fakeMods, {
    ...config,
    counts: {
      ...config.counts,
      transmutation: [
        { count: 1, weight: 1 },
        { count: 2, weight: 3 },
      ],
    },
  });
  const odds = currencyOdds(
    e,
    normal,
    'transmutation',
    { kind: 'affixCount', affix: 'suffix', min: 1 },
    { rng: rng() },
  );
  assert.ok(Math.abs(odds.probability - (0.75 + (0.25 * 3) / 7)) < 1e-12);
});
test('Monte Carlo fallback is seeded, reports Wilson 95% CI, and leaves supplied RNG unchanged', () => {
  const a = rng(),
    original = a.clone();
  const options = { rng: a, maxNodes: 1, samples: 20_000 };
  const x = modHitProbability(engine, normal, 'transmutation', 'mana', options);
  const y = modHitProbability(engine, normal, 'transmutation', 'mana', options);
  assert.deepEqual(x, y);
  assert.equal(a.next(), original.next());
  assert.equal(x.method, 'monte-carlo');
  if (x.method !== 'monte-carlo') return;
  assert.ok(Math.abs(x.probability - 2 / 7) < 0.015);
  assert.ok(x.confidence95.low <= 2 / 7 && x.confidence95.high >= 2 / 7);
  assert.equal(x.samples, 20_000);
});
test('sampling agrees with exact enumeration for EVERY currency on tiny fixtures', () => {
  const inputs: Record<Currency, Item> = {
    transmutation: normal,
    alteration: magic,
    augmentation: magic,
    regal: magic,
    alchemy: normal,
    chaos: rare,
    exalted: rare,
    annulment: craft(magic, 'augmentation'),
    scouring: rare,
    divine: magic,
  };
  for (const currency of Object.keys(inputs) as Currency[]) {
    const predicate = (item: Item): boolean =>
      meetsGoal(engine, item, {
        kind: 'value',
        mod: { id: 'life-low' },
        stat: 'life',
        min: 2,
      });
    const result = currencyPlan(engine, inputs[currency], currency);
    assert.ok(result.ok);
    const exact = analyzePlan(result.plan, predicate, {
      rng: rng(),
      maxNodes: 200_000,
    });
    assert.equal(exact.method, 'exact', currency);
    const estimated = analyzePlan(result.plan, predicate, {
      rng: rng(),
      maxNodes: 1,
      samples: 4000,
    });
    // Scouring is a deterministic leaf, so it can remain exact at budget 1.
    assert.ok(Math.abs(estimated.probability - exact.probability) < 0.04, currency);
  }
});
test('huge integer range triggers fallback without materializing the range', () => {
  const plan = range(0, 1_000_000_000, (n) =>
    done(updateItem(magic, { mods: [{ id: 'life-low', values: { life: n } }] })),
  );
  const odds = analyzePlan(plan, (item) => item.mods[0]!.values.life! > 500_000_000, {
    rng: rng(),
    maxNodes: 100,
    samples: 1000,
  });
  assert.equal(odds.method, 'monte-carlo');
});
test('confidence intervals are valid for no hits and all hits', () => {
  const zero = wilson95(0, 100),
    all = wilson95(100, 100);
  assert.equal(zero.low, 0);
  assert.ok(zero.high > 0 && zero.high < 0.05);
  assert.equal(all.high, 1);
  assert.ok(all.low > 0.95 && all.low < 1);
});
test('goals support ids, groups, tags, explicit tier, thresholds, boolean combinations and counts', () => {
  assert.ok(meetsGoal(engine, magic, hasLife));
  assert.ok(
    meetsGoal(engine, magic, {
      kind: 'has',
      mod: { id: 'life-low', tag: 'life', maxTier: 2 },
    }),
  );
  assert.ok(!meetsGoal(engine, magic, { kind: 'has', mod: { maxTier: 1 } }));
  const unknownTier = updateItem(magic, {
    mods: [{ id: 'mana', values: { mana: 5 } }],
  });
  assert.ok(!meetsGoal(engine, unknownTier, { kind: 'has', mod: { maxTier: 99 } }));
  assert.ok(
    meetsGoal(engine, magic, {
      kind: 'and',
      goals: [hasLife, { kind: 'not', goal: { kind: 'has', mod: { tag: 'speed' } } }],
    }),
  );
  assert.ok(
    meetsGoal(engine, magic, {
      kind: 'or',
      goals: [{ kind: 'has', mod: { id: 'absent' } }, hasLife],
    }),
  );
  assert.ok(
    meetsGoal(engine, magic, {
      kind: 'value',
      mod: { group: 'life' },
      stat: 'life',
      min: 1,
      max: 1,
    }),
  );
  assert.ok(
    !meetsGoal(engine, magic, {
      kind: 'value',
      mod: {},
      stat: 'absent',
      min: 0,
    }),
  );
  assert.ok(
    meetsGoal(engine, magic, {
      kind: 'affixCount',
      affix: 'prefix',
      min: 1,
      max: 1,
    }),
  );
  assert.ok(meetsGoal(engine, magic, { kind: 'openSlots', affix: 'suffix', min: 1 }));
  assert.equal(openSlots(engine, magic, 'prefix'), 0);
});
test('geometric expectations and manually entered prices handle p=0 and p=1', () => {
  assert.equal(expectedAttempts(0.25), 4);
  assert.equal(attemptsForConfidence(0.25), 9);
  assert.deepEqual(
    attemptEconomics(0.25, { alteration: 1, scouring: 1 }, { alteration: 2, scouring: 3 }),
    { expectedAttempts: 4, costPerAttempt: 5, expectedCost: 20, attempts90: 9 },
  );
  assert.equal(expectedAttempts(0), Infinity);
  assert.equal(attemptsForConfidence(1), 1);
  assert.equal(attemptEconomics(0, {}, {}).expectedCost, Infinity);
  assert.throws(() => tallyCost({ divine: 1 }, {}), /Enter/);
  assert.throws(() => tallyCost({ divine: 1 }, { divine: -1 }));
  assert.throws(() => expectedAttempts(NaN));
  assert.throws(() => attemptsForConfidence(0.2, 1));
});
test('linear strategy: alteration until life, augmentation once, regal once; no state leaks between runs', () => {
  const final: Goal = {
    kind: 'and',
    goals: [
      hasLife,
      { kind: 'affixCount', affix: 'prefix', min: 1 },
      { kind: 'affixCount', affix: 'suffix', min: 2 },
    ],
  };
  // Regal may choose mana or another suffix; only suffix branches meet final goal.
  const policy = linearSteps([
    { currency: 'alteration', until: hasLife },
    { currency: 'augmentation' },
    { currency: 'regal' },
  ]);
  const opts = {
    runs: 80,
    maxApplications: 100,
    prices: { alteration: 1, augmentation: 2, regal: 3 },
    rng: rng(),
  };
  const start = createItem(fakeBase, 10, 'magic');
  const report = simulateStrategy(engine, start, final, policy, opts);
  assert.deepEqual(report, simulateStrategy(engine, start, final, policy, opts));
  assert.ok(report.successRate > 0 && report.successRate < 1);
  assert.ok(report.averageApplications >= 3);
  assert.equal(report.averageCurrencyApplications.augmentation, 1);
  assert.equal(report.averageCurrencyApplications.regal, 1);
  assert.ok(report.costPercentiles.p90 >= report.costPercentiles.p50);
  assert.equal(
    report.costPerSuccess,
    report.runs.reduce((s, r) => s + r.cost, 0) / report.successes,
  );
});
test('strategy stops at goal, policy stop, invalid action, and application limit', () => {
  const impossible: Goal = { kind: 'has', mod: { id: 'never' } };
  const opts = {
    runs: 2,
    maxApplications: 3,
    prices: { alteration: 1 },
    rng: rng(),
  };
  const already = simulateStrategy(engine, magic, hasLife, () => 'alteration', opts);
  assert.equal(already.averageApplications, 0);
  assert.equal(already.successRate, 1);
  assert.equal(already.costPerSuccess, 0);
  const stopped = simulateStrategy(engine, magic, impossible, () => null, opts);
  assert.equal(stopped.runs[0]?.stopReason, 'policy stopped');
  assert.equal(stopped.costPerSuccess, Infinity);
  assert.equal(stopped.successfulCostPercentiles, null);
  const invalid = simulateStrategy(engine, normal, impossible, () => 'alteration', opts);
  assert.equal(invalid.averageApplications, 0);
  assert.match(invalid.runs[0]!.stopReason, /Can't apply/);
  const limited = simulateStrategy(engine, magic, impossible, () => 'alteration', opts);
  assert.equal(limited.averageApplications, 3);
  assert.equal(limited.runs[0]?.stopReason, 'application limit reached');
});
test('linear step maxApplications advances and repeated currencies do not confuse stages', () => {
  const impossible: Goal = { kind: 'has', mod: { id: 'never' } };
  const policy = linearSteps([
    { currency: 'alteration', until: impossible, maxApplications: 2 },
    { currency: 'alteration' },
  ]);
  const report = simulateStrategy(engine, magic, impossible, policy, {
    runs: 2,
    maxApplications: 20,
    prices: { alteration: 1 },
    rng: rng(),
  });
  assert.equal(report.averageApplications, 3);
  assert.equal(report.runs[0]?.stopReason, 'policy stopped');
});
test('session history, undo, active spend and deterministic reapplication', () => {
  const session = new CraftSession(engine, normal, rng());
  assert.equal(session.undo(), false);
  assert.ok(session.apply('transmutation').ok);
  const first = session.item;
  assert.equal(session.spent.transmutation, 1);
  assert.equal(session.history.length, 1);
  assert.ok(!session.apply('alchemy').ok);
  assert.equal(session.history.length, 1);
  assert.ok(session.undo());
  assert.deepEqual(session.item, normal);
  assert.deepEqual(session.spent, {});
  assert.ok(session.apply('transmutation').ok);
  assert.deepEqual(session.item, first);
  assert.ok(Object.isFrozen(session.history));
});
test('lazy currency plans snapshot mutable input', () => {
  const mutable = { ...magic, mods: [{ id: 'life-low', values: { life: 1 } }] };
  const plan = currencyPlan(engine, mutable, 'augmentation');
  assert.ok(plan.ok);
  mutable.mods[0]!.values.life = 900;
  assert.equal(sample(plan.plan, rng()).mods[0]?.values.life, 1);
});
