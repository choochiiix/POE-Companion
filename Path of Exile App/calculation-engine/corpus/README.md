# Pinned PoB build corpus

Sixteen fixtures execute actual archived PoB headless builds. All **288 selected comparisons** match within 1e-8. These are scoped comparisons, not a claim of full PoB parity.

Full regression after integration: **120 tests passed**, including 46 calculation tests. Static compiler verification remains unavailable because tsc is absent. Original trial still matches all26 selected values.

`cases.json` is the explicit fixture input. `reference/corpus.lua` reads it, constructs each equivalent build using PoB's own item parser/tree allocation/gem support/configuration/calculator, and captures outputs. `corpus-capture.json` pins the archive, runner, Lua script and source-data hashes. `run.ts` rejects stale definitions/tooling/sources and independently assembles our inputs from local records. Expected calculation outputs never feed our adapter.

| Fixtures | What is exercised |
| --- | --- |
| spell-baseline, spell-level20 | Fireball level 1 and 20 source endpoints; Elemental Focus 1 |
| spell-resistant-enemy, spell-negative-resistance | Explicit positive/negative enemy fire resistance |
| spell-speed-critical | Cast speed, crit increases and additive spell damage |
| defensive-pools, resistance-overcap, attributes | Life/mana/armour, campaign penalty/caps, derived attribute bonuses |
| attack-baseline, attack-evasion, attack-speed-crit | Ordinary sword default attack, hit and crit confirmation, speed and physical scaling |
| attack-armour | Separate player/enemy physical reduction caps and critical mitigation |
| attack-conversion, attack-gain | Partial conversion and gain-as-extra |
| attack-conversion-scaling, attack-conversion-chain | Original/destination type scaling and ordered physical/lightning/cold paths |

Every fixture compares attributes, five defensive pools, four resistances, action rate, effective crit chance/multiplier, hit chance, average damage per activation including misses, and hit DPS. PoB's attack output does not expose the same `AverageHit` field as spells: we explicitly compare its `AverageDamage` to our conditional average hit multiplied by hit probability. This is a unit/meaning mapping, not a missing value replaced with zero.

The trial adapter now accepts explicit fixture scenarios, still restricted to this class/equipment/passive setup and gem endpoint levels. The shared `src/adapters/stat-lines.ts` conservatively translates supported ordinary lines and ordered conversion/gain effects, preserving unrecognized lines as diagnostics. It is not a complete description parser. Add stat recognition, source examples, normalized contracts and real PoB cases together.

Two source-backed corrections emerged: enemy physical damage reduction caps at 75% in this snapshot (player cap remains 90%); and PoB rounding precedes removal of outgoing converted damage. Fractional retained portions must not be rounded again. These corrections retain the independent oracle values.

## Reproduce

```powershell
python calculation-engine/reference/run-build-trial.py --script calculation-engine/reference/corpus.lua --output calculation-engine/reference/corpus-capture.json
node --experimental-strip-types calculation-engine/corpus/run.ts
node --experimental-strip-types --test calculation-engine/test/corpus.test.ts
```

Use bundled Python from docs/HANDOFF.md when the Windows Store alias is unavailable. The Node report command is also `npm run calculations:corpus`. The original 26-value trial remains separate; changes to the shared runner require refreshing both captures.

## Application integration boundary

`calculateBuild(BuildInput)` is the shared normalized snapshot entrypoint for future Character/tree/Skills consumers. `compareBuilds(before, after)` calculates two complete independent snapshots, returns source breakdowns/diagnostics and selected deltas, and never equips items or writes saves. Percentage change is null for zero baselines; missing skill DPS remains null. Consumers must preserve one explicit combat context when constructing item alternatives. Existing save shapes are not these engine contracts; dedicated source/save adapters remain required.

## Still outside differential coverage

Arbitrary classes/gear/passive legality, interpolated gem levels/quality, general support-expression matching, charges/flasks/conditional feedback, unique exceptions, ailments/DoT/impale, recovery/reservation/resource sustain, minion/trigger full builds, and EHP/max-hit simulation remain pending. Block/suppression/taken-as currently have unit cases, not these full-build comparisons. UI prototypes are separate review artifacts, never evidence of implemented mechanics. Coverage is per fixture/stat, never a blanket badge on arbitrary builds.
