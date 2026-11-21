# PoB Community 2.68.1 comparison

The production workspace adapter matches 190 selected values across seven independently calculated builds. The capture uses PoB Community 2.68.1 at commit `a41fec6c20f822a658ae5df1273e8c69d5969bac`, in Effective DPS mode with skill part 1. The fixture set tests the API without accessing browser storage. The comparison archives for 2.67.2 remain separately reproducible. [PoB release](https://github.com/PathOfBuildingCommunity/PathOfBuilding/releases/tag/v2.68.1)

## Run the comparison

```powershell
npm run calculations:release
node --experimental-strip-types calculation-engine/reference/v2.68.1/compare.mjs --all
```

To recreate the capture, download the archive at the URL in [pin.json](pin.json) and use 64-bit Python on Windows. The runner checks the archive SHA-256, extracts the required files into a temporary directory, and runs the release's own headless wrapper using its LuaJIT DLL. The executable capture records the runtime, per-fixture tree and mode, upstream code and data hashes, and the Companion source and fixture hashes. Text input hashes normalize line endings. The running Companion app reads its existing local datasets.

```powershell
python calculation-engine/reference/v2.68.1/capture.py --archive .validation/pob-a41fec6.zip
```

PoB defaults to the 3.30 tree. The Fireball fixture selects its bundled 3.29 tree to match Companion's passives. No other fixture allocates passives. Companion equipment uses RePoE export 3.29.3.6 and its gem endpoint records come from the preserved PoB 2.67.2 archive. Each case states its encounter, item rolls and relevant gem levels. The matching rows cover those records and settings. PoB source and runtime distribution remain subject to the [upstream license](../../POB-LICENSE.md).

## Representative results

Before uses the production adapter at `f89602999bb94a2f2ac4b1d138b465c49efc47cc` with the same fixture inputs. Use `compare.mjs --baseline-app <app-folder> --all` with that checkout to reproduce the before column. An em dash indicates an unavailable field in the earlier engine. The comparison requires exact discrete values, uses relative and absolute floating-point tolerances for rates and DPS, and allows half a damage point for PoB's integer max-hit display.

| Fixture | Metric | Before | After | PoB | After − PoB |
| --- | --- | ---: | ---: | ---: | ---: |
| Default Scion | Fire max-hit threshold | — | 37.5 | 38 | −0.5 |
| Rolled Rusted Sword | Local maximum physical damage | 9 | 16 | 16 | 0 |
| Same sword with +300 accuracy | Hit chance | 74% | 100% | 100% | 0 pp |
| Fireball and Elemental Focus | Hit DPS against 75% fire resistance, exposure and penetration | 6.15 | 13.53 | 13.53 | 0 |
| Chained conversion | Cold maximum hit damage | 0 | 3 | 3 | 0 |
| Mixed spell hit | Damage taken after suppression | — | 36 | 36 | 0 |
| Mixed spell hit | Repeated-hit effective pool | — | 960 | 960 | 0 |
| Simple Robe and Clarity | Mana reserved | — | 34 | 34 | 0 |
| Simple Robe and Clarity | ES recharge per second | — | 6 | 6 | 0 |

## Calcs fields and API coverage

| Calcs section | Companion mapping and scope |
| --- | --- |
| Skill hit damage, attack/cast rate, crits and accuracy | `offence.damage` keeps pre-mitigation ranges and modifier contributions, effective ranges, resistance stages and conversion paths. PoB `AverageHit` maps to `averageHit`, its `AverageDamage` maps to `averageDamagePerUse` including misses, and `TotalDPS` maps to `effectiveHitDps`. `dps` remains an alias. `actionTime` is null at zero action rate. `CalcOffence.lua` maps accuracy, normal and critical hits, conversion, penetration and resistance. |
| Attributes, life, mana, ES, armour, evasion and resists | Existing source and pool breakdowns include totals, reserved and unreserved amounts, basic recovery, ES recharge and uncapped, effective and maximum resistance values. Explicit reservation contributions come from the caller. `CalcSetup.lua` and `CalcPerform.lua` establish bases and reservation. `CalcDefence.lua` calculates resistances and recovery. |
| Damage avoidance and damage taken | `defence.evadeChance` remains available. An explicit `incomingHit` provides per-type shifted, mitigated and expected landed damage plus block and suppression inputs. Incoming avoidance probabilities are supplied by the caller. The executable mixed spell fixture verifies guaranteed suppression and capped fire resistance. Dodge, automatic defence chance assembly, and conditional block variants remain open. |
| Maximum hit and effective health | `survivability.maxHit` provides a continuous threshold by incoming damage type. `survivability.ehp` gives the raw repeated-hit budget, count, and time when cadence is provided. This uses ordinary ES-before-life routing and chaos bypass. PoB comparisons cover explicit deterministic spell scenarios with zero block and no sustain. Probabilistic survival, armour rounding equivalence, and special pool routing require further fixtures. |
| Other effects and skill-specific stats | Selected-weapon attacks, linked direct spells and source-tagged ordinary class, gear and tree effects are covered. Unarmed fallback, automatic hand alternation, skill-specific parts and restrictions beyond the supported subset, skill costs, movement speed, stun, range and curse limits remain open. |
| Damage over time and advanced sustain | Ignite, other ailments, advanced recovery and leech, recoup, degens, Ward, guard skills, flask and tincture behaviour, rage and charges remain open. Existing actor and trigger delivery remains a separate API. |

Workspace callers can supply ephemeral `calculation` overrides for exact skill evidence, weapon hand selection, sources, buffs, conditions, conversions, enemy resistance adjustments, incoming hits and defensive resources. Use actual per-level data for exact skill evidence. Existing saves use their selected tooltip endpoint and the item base midpoint where the source only provides a range. Weapon override text supplies the base implicits. Raw stats supply the actual rolled values of explicit affixes. Unsupported source effects are retained in diagnostics. Unsupported survivability metrics carry a null value and a reason.

## Verification commands

Node 24.22.3 ran these checks directly because the local shell lacked npm and pnpm's dependency check hit a sandbox symlink restriction. The full regression used isolated loopback access. It passed 145 tests, including the 57 calculation-engine tests. The archived trial matched 26 fields and the archived corpus matched 288 comparisons. The helper comparison retained the documented zero-accuracy and zero-evasion difference.

```powershell
node --experimental-strip-types --test calculation-engine/test/*.test.ts
node --experimental-strip-types --test crafting-engine/test/*.test.ts crafting-data/test/*.test.ts crafting-ui/test/*.test.mjs calculation-engine/test/*.test.ts
node --experimental-strip-types calculation-engine/reference/compare.ts
node --experimental-strip-types calculation-engine/trial/run.ts
node --experimental-strip-types calculation-engine/corpus/run.ts
node --experimental-strip-types calculation-engine/reference/v2.68.1/compare.mjs
node_modules/.bin/tsc.cmd --project crafting-engine/tsconfig.json
node_modules/.bin/tsc.cmd --project crafting-data/tsconfig.json
node_modules/.bin/tsc.cmd --project calculation-engine/tsconfig.json
node scripts/test-react-gear-editor-qa.mjs
```

From `renderer/`, `node_modules/.bin/tsc.cmd --noEmit` and `node_modules/.bin/vite.cmd build --outDir ../.validation/parity-final-dist --emptyOutDir` passed. The production server smoke used headless Edge and temporary storage at 1440px and 390px. It verified the rolled attack DPS, the alternate equipment comparison, and loading the calculation engine through the local module endpoint. The gear editor regression passed for all ten slots.
