# Calculation engine

The [PoB 2.68.1 comparison](reference/v2.68.1/README.md) records the latest calculation coverage, executable fixtures, and source snapshot limits. Run it with `npm run calculations:release`.

The production React app consumes this independent offline TypeScript library through the shared workspace source adapter. Character, saved Skills, passive selections and Item library/Crafting comparisons use the snapshot APIs. The library itself has no DOM, network or storage dependencies. The public API is `src/index.ts`; direct `calculate(CalculationInput)` callers remain supported. See [live integration](../docs/CALCULATIONS-UI.md).

The November 21 verification records **145 passing Node tests**, including 57 calculation tests, successful engine/data and renderer typechecks, and production browser smoke checks. Earlier 117/120/124-test milestones and compiler-unavailable notes are superseded. The archived [trial](trial/README.md) and [16-build corpus](corpus/README.md) remain separate evidence (26 fields / 288 comparisons). Full parity remains incomplete.

## Public workflow

1. `resolveWeapon` / `assembleSkill`: normalize ordinary weapon/gem bases and explicit supports. See [skill assembly](SKILL-ASSEMBLY.md).
2. `assembleBuild`: combine explicit base pools/attributes, local equipment defence and global equipment/passive/buff/gem/configuration sources. See [build inputs](BUILD-INPUTS.md).
3. `calculate`: validate input, prepare active modifiers, calculate offence/defence and optional incoming-hit scenario. Returns breakdowns, assumptions, source-tagged diagnostics and supported-subset/partial status.
4. `calculateActors`: calculate independent selected actors and explicit delivery cadence, retaining each core calculation. See [actors](ACTORS.md).

Complete composing example: `test/integration.test.ts`. This is normalized numerical assembly, not an automatic parser for UI saves, item descriptions, PoB XML or every source record. Callers must declare unresolved effects in source/actor `unsupported`; unknown stat names and invalid numeric inputs reject. Untrusted serialized input still needs adapter-level schema validation.

The first [source-to-build trial](trial/README.md) now reads actual local item/mod/tree/gem records and compares an equivalent build against the actual pinned headless PoB calculator. All 26 selected values match within 1e-9. It remains one restricted spell fixture, not broad build parity. The trial exposed rounding differences: optional `CalculationInput.rounding: 'pob'` rounds final hit endpoints and defensive pools; default/continuous behavior is preserved. No general rounding-site parity is claimed.

## Organization

| Module | Responsibility |
| --- | --- |
| `model.ts`, `validate.ts` | Versioned normalized contracts and validation |
| `modifiers.ts` | Source/condition filtering and shared BASE/INC/MORE evaluation |
| `build.ts` | Attributes and normalized equipment/passive/buff/gem source assembly |
| `skill.ts` | Local weapon values, ordinary skill/support assembly |
| `rules.ts` | Named snapshot assumptions and accuracy/armour helpers |
| `offence.ts`, `conversion.ts` | Hit DPS and ordered conversion/gain paths with inherited-type scaling |
| `defence.ts`, `advanced-defence.ts` | Pools/resistances and explicit landed-hit shifting/block/suppression |
| `core.ts` | Shared single-actor coordinator, diagnostics and overflow checks |
| `actors.ts` | Independent actor aggregation and deterministic periodic trigger cadence |
| `index.ts` | Public API exports |
| `reference/` | Hash-pinned actual Lua helper capture/comparison tooling |
| `test/` | Formula, source-backed fixture, validation and composition tests |

Keep future raw-data translation separate from formulas. Add stat names, validation, formula tests and limitations together. Never apply local item effects again as global effects. Conditions are explicit caller-supplied booleans, not an automatic feedback/dependency solver.

## Semantics and limits

Values use ordinary units, not scaled RePoE integers. Percent values use percentage points; crit multiplier 150 means 1.5 times; baseTime is seconds per action. BASE adds flat values, INC sums increased/reduced percentages, MORE multiplies independent more/less factors. Ambiguous generic BASE damage rejects; use typed ranges or type-specific BASE. Damage-effectiveness applies during assembly; adapters must not add already-scaled damage again. Resistance modifiers accept BASE percentage points only. Normalized pools remain continuous; display/game rounding is not universally implemented.

Explicit enemy resistance reductions and penetration are supported. Hits use accuracy and critical confirmation, separate normal/critical average-hit armour mitigation, and effective enemy resistances. DPS assumes one hit per activation and sufficient resources. Physical mitigation uses average hits, not integration over the random damage range. Default resistance maximum is 75%, hard maximum 90%, minimum -200%; campaign penalty is explicit. Attributes require explicit base values; keystone replacements require specialized adapters.

Conversion, gain-as-extra and explicit incoming-hit scenarios are described in [advanced calculations](ADVANCED-CALCULATIONS.md). Conversion above 100% rejects until adapter priority resolution. Incoming-hit expectation is separate from the resource and survivability outputs. Explicit defensive configuration supports reservation, basic recovery and ES recharge; survivability exposes continuous max-hit thresholds and deterministic repeated-hit budgets with ordinary ES-before-life routing and chaos bypass. These do not implement general sustain or probabilistic survival. Actor trigger rate can differ from self-cast rate; supplied trap/mine rates require external deployment/uptime resolution.

Still unsupported: automatic source-stat/text translation, general support compatibility, ailments/DoT, impale, advanced recovery/leech, automatic reservation assembly and resource sustain, complete charges/buff stacking, special keystones and unique rules, multi-spell/shared-cooldown trigger simulation, minion AI/lifetimes and many skill-specific exceptions. Do not label this full PoB parity. See [parity gates](PARITY.md).

## Reference and verification

The preserved user-supplied PoB ZIP is pinned by hash; manifest identifies 2.67.2, not current live-game compatibility. No Lua runtime is required by the application. Development tooling executed actual archived accuracy/armour Lua helpers using the archive runtime: eight of nine compared cases match; zero accuracy plus zero evasion is an explicit known difference (PoB 100%, engine 5%). Rounded armour capture is additional evidence, not a continuous-output comparison. See [reference instructions](reference/README.md), `reference-manifest.json`, and `POB-LICENSE.md`.

Run `npm run test:calculations` or `node --experimental-strip-types --test calculation-engine/test/*.test.ts` from the app directory. App `npm test` includes this engine; `npm run typecheck` checks engine/data types. Run `npm run calculations:release` for the PoB 2.68.1 capture comparison, `npm run calculations:compare` for archived helpers, and `npm run calculations:trial` / `npm run calculations:corpus` for the archived build comparisons. See the [latest verification commands and coverage](reference/v2.68.1/README.md). Passing a captured comparison does not rerun PoB itself or establish whole-build parity.
