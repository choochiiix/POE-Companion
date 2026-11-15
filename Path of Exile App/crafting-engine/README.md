# Offline Path of Exile 1 crafting engine

Standalone TypeScript logic with a pure RePoE adapter. No app or runtime dependencies are required by this package. All engine unit-test fixtures are invented; the sibling `crafting-data/` folder supplies separate real-snapshot integration tests and data. **This is not yet a verified reproduction of live PoE probabilities.**

## Run

Install Node.js 22.18+ (Node 24 LTS recommended). In this folder:

```powershell
node --experimental-strip-types --test test/*.test.ts
```

Tests need no install. For the separate strict TypeScript check, install development tools once:

```powershell
npm install
npm run typecheck
npm test
```

`npm install` uses the internet for development tools; the engine and tests make no network requests. There is no build step. Later, import `src/index.ts` from your app or compile/package it with your app's toolchain. This package deliberately ships source, not a compiled JavaScript distribution.

## Try the fake data

Save this as `example.ts` in this folder and run `node --experimental-strip-types example.ts`:

```ts
import {
  CraftSession, SeededRng, currencyOdds, attemptEconomics,
  createItem, linearSteps, simulateStrategy
} from './src/index.ts';
import type { Goal } from './src/index.ts';
import { engine, fakeBase, normal } from './test/fixtures.ts';

const session = new CraftSession(engine, normal, new SeededRng(42));
const result = session.apply('transmutation');
if (!result.ok) console.log(result.reason);
console.log(session.item, session.spent);
session.undo(); // also restores RNG state, so reapplying reproduces the roll

const goal: Goal = { kind: 'has', mod: { id: 'life-low' } };
const odds = currencyOdds(engine, normal, 'transmutation', goal, {
  rng: new SeededRng(42), maxNodes: 50_000, samples: 20_000
});
console.log(odds);
// Independent attempts from a fresh normal item: include your reset/base cost yourself.
console.log(attemptEconomics(odds.probability, { transmutation: 1 }, { transmutation: 0.1 }));

const policy = linearSteps([
  { currency: 'alteration', until: goal, maxApplications: 100 },
  { currency: 'augmentation' },
  { currency: 'regal' }
]);
// This goal needs both a life prefix and two suffixes. Some regals will fail it.
const finalGoal: Goal = { kind: 'and', goals: [goal,
  { kind: 'affixCount', affix: 'suffix', min: 2 }
] };
const report = simulateStrategy(engine, createItem(fakeBase, 10, 'magic'), finalGoal, policy, {
  runs: 1000, maxApplications: 103, rng: new SeededRng(42),
  prices: { alteration: 0.1, augmentation: 0.1, regal: 1 }
});
console.log(report.successRate, report.costPercentiles, report.costPerSuccess);
```

The fixture configuration forces one mod on transmutation/alteration to make tests easy to calculate. That is fake test behavior. When creating your own engine, pass a configuration explicitly:

```ts
import { createEngine, ASSUMPTION_CONFIG } from './src/index.ts';
// createEngine(yourModDefinitions, yourVerifiedConfig)
// ASSUMPTION_CONFIG is an explicitly provisional starting point, not game truth.
```

## How the pieces fit

- `model.ts`: readonly model, immutable item construction and updates. Integer inclusive stat ranges; use scaled integers for decimals. An item contains **ordinary random explicit affixes only**. Implicits, enchantments, crafted/locked mods, influences and unique-item mechanics have no representation yet. Rarity supports normal/magic/rare only.
- `engine.ts`: mod pools, caps, the configuration, and the single commented currency-rule switch. Groups exclude one another if **any** group overlaps. A duplicate mod id is also excluded even if its group list is empty. Eligibility uses domain, level, tags, ordered weights and current affix slots. A missing matching spawn-weight entry means zero weight.
- `rng.ts`: injectable cloneable RNG and seeded Mulberry32 implementation. Seeds are nonnegative safe integers reduced to 32 bits. RNGs return `[0, 1)`. Crafting draws advance the injected RNG; odds, simulation and sessions clone it at their boundary.
- `plan.ts`: a lazy probability tree. A currency describes its random process once. Sampling walks one path; exact enumeration walks all paths. Independent uniform stat rolls and weighted mod choices both use this same tree.
- `odds.ts`: `nextModOdds` (exported from engine), `modHitProbability`, and goal-based `currencyOdds`. Exact results include every distinct final item and its probability, merging mod-order permutations. “Exact” means complete enumeration with JavaScript floating-point arithmetic, not rational arithmetic or verified live-game accuracy. The default 50,000 **visited-node** budget includes intermediate nodes and value rolls. Exceeding it automatically switches to 10,000 Monte Carlo samples (configurable), returning hit count, sample size, and a Wilson 95% interval. No unbounded value-range arrays are created. Monte Carlo does not return a pretend full outcome list. Invalid currency applications throw a descriptive error in odds helpers.
- `goals.ts`: id/group/tag/tier selectors; inclusive per-stat value bounds on a **single matching mod**; and/or/not; affix counts; open slots. Selector fields combine with AND. Tier 1 is best, `maxTier: 2` accepts tiers 1 or 2. Unknown tiers fail tier constraints; no tier is inferred from required level. Empty selector matches any mod; empty AND is true and empty OR is false.
- `economics.ts`: manually entered prices in any consistent unit; missing, negative and nonfinite prices are errors. Expected attempts are `1/p`; 90% attempt count is `ceil(log(0.1)/log(1-p))`. These formulas assume independent, identical attempts from the same starting state. Include reset costs yourself. For p=0 they return Infinity, for p=1 one attempt. A zero Monte Carlo hit estimate does **not** prove impossibility; use its interval before making cost decisions. Economics on an estimated probability is a point estimate, not an exact forecast.
- `strategy.ts`: a policy receives an immutable item, application history and item-state history, then returns a currency or null. Policies should be pure/stateless. Each run starts fresh; the cloned RNG advances continuously across runs. `linearSteps` advances past completed goals; a step without `until` runs once by default. `maxApplications` on a step advances to the next step even if its goal was missed. The overall simulation goal stops a run immediately, including before its first action. To force a final regal, make the final goal require the state you want after regal. Invalid actions stop a trial without charging it. Global application limits keep attempts bounded; limit hits are unsuccessful trials, not estimates of eventual failure. Custom policies can express restart/recovery logic. Reports retain individual results and stop reasons, success rate plus Wilson 95% interval, average applications (total and by currency), nearest-rank cost percentiles for all trials and for successes, and all spending divided by successes. Cost per success is Infinity when there are no successes. Starting bases/items and external reset expenses are not charged automatically.
- `session.ts`: a small stateful convenience wrapper; history entries retain immutable before/after states. Undo restores item **and RNG**, removes an entry and its spending. `spent` is the tally of the current undoable history, not an irreversible real-world expenditure ledger. Failed actions consume neither currency nor random draws. No redo/persistence yet.

`nextModOdds` is conditional on adding one eligible affix in the item's current rarity; normal items have no slots. `modHitProbability` means the mod is **present after** a currency, including a retained preexisting mod. For acquisition-only odds use `analyzePlan` with your own predicate.

## Extension boundary and limitations

Add future currencies to the `Currency` union and rule switch, composing the existing plan primitives. Add mechanic metadata to item/mod models when needed; do not fake bench/locked/fractured behavior with ordinary random mods. Spawn tags are base tags + extra tags + explicit `addsTags` on present mods. Descriptive `ModDef.tags` only serve goal matching and never silently alter subsequent spawn eligibility. `addsTags` is an engine modeling hook, not a claim that real mods grant their descriptive tags.

`createEngine` checks duplicate ids, ranges, levels, tiers, caps and weights. `adaptRePoE` now validates unknown JSON values using the inspected RePoE format and logs unsupported records. Callers importing saved items must still validate their item invariants and mod references; unknown ids throw. The engine does not read files or download data. Jewel category rules, implicit rerolling, correlated stat rolls, and live patch support remain outside scope.

See **SPOT_CHECK.md** before treating results as game odds. All sampling/enumeration agreement tests verify the configured model, not the game's hidden implementation.

## Validation at delivery

Native Node 24.22.1 stripping: **37 standalone tests passed**, with 3 additional dataset/HTTP integration tests in the project. Strict TypeScript is also checked; see the project delivery notes. Tests cover every currency, eligibility, generation multipliers, adapter validation/exclusions, immutability, reproducible RNG/undo, exact probabilities, sampling agreement, fallback intervals, goals, costs and strategies.
