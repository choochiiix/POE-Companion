# Calculation engine

The [PoB 2.68.1 comparison](reference/v2.68.1/README.md) records the latest calculation coverage, executable fixtures, and source snapshot limits. Run it with `npm run calculations:release`.

Latest: the production app now consumes this library through `crafting-ui/features/calculations/` using the shared snapshot API. It integrates Character, saved Skills, tree selections and Catalog/Crafting comparisons without adding DOM/storage dependencies here. See `docs/CALCULATIONS-UI.md` for source-adapter coverage, partial-result semantics and separate context persistence. Latest full regression:124 tests passed; live calculation, Settings and Skills browser suites passed. This supersedes historical no-UI statements below.

Latest expansion: [16-build actual PoB corpus](corpus/README.md), **288 matching selected comparisons**, reusable conservative stat/effect adapters, and shared `calculateBuild` / `compareBuilds` snapshot APIs for future screen integration. UI designs are separate under `prototypes/calculations/` for user review; no production integration. Full parity remains incomplete.

Latest verification supersedes historical counts below: **120 full regression tests passed**, including 46 calculation tests. Prototype desktop/mobile interaction checks passed. Static tsc checking remains unavailable.

Independent offline TypeScript library, under the hood only. No UI, browser save, route, source-data or artwork integration. The public API is `src/index.ts`; implementation modules have no network/storage dependencies. Existing direct `calculate(CalculationInput)` callers remain supported.

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

Hits use accuracy and critical confirmation, separate normal/critical average-hit armour mitigation, and effective enemy resistances. DPS assumes one hit per activation and sufficient resources. Physical mitigation uses average hits, not integration over the random damage range. Default resistance maximum is 75%, hard maximum 90%, minimum -200%; campaign penalty is explicit. Attributes require explicit base values; keystone replacements require specialized adapters.

Conversion, gain-as-extra and explicit incoming-hit scenarios are described in [advanced calculations](ADVANCED-CALCULATIONS.md). Conversion above 100% rejects until adapter priority resolution. Incoming-hit expectation is not effective health, maximum survivable hit or recovery simulation. Actor trigger rate can differ from self-cast rate; supplied trap/mine rates require external deployment/uptime resolution.

Still unsupported: automatic source-stat/text translation, general support compatibility, ailments/DoT, penetration/exposure, impale, recovery/leech/recharge, reservation and resource constraints, complete charges/buff stacking, special keystones and unique rules, multi-spell/shared-cooldown trigger simulation, minion AI/lifetimes and many skill-specific exceptions. Do not label this full PoB parity. See [parity gates](PARITY.md).

## Reference and verification

The preserved user-supplied PoB ZIP is pinned by hash; manifest identifies 2.67.2, not current live-game compatibility. No Lua runtime is required by the application. Development tooling executed actual archived accuracy/armour Lua helpers using the archive runtime: eight of nine compared cases match; zero accuracy plus zero evasion is an explicit known difference (PoB 100%, engine 5%). Rounded armour capture is additional evidence, not a continuous-output comparison. See [reference instructions](reference/README.md), `reference-manifest.json`, and `POB-LICENSE.md`.

Run `npm run test:calculations` or `node --experimental-strip-types --test calculation-engine/test/*.test.ts`. Root `npm test` includes this engine. `npm run calculations:compare` compares captured Lua helpers; `npm run calculations:trial` runs the source-to-build trial. Fresh build capture instructions are in trial/README.md. Latest full suite: **117 passed**, including 43 calculation tests. Broader headless build coverage remains pending. Tests against hand-derived examples and one actual build do not establish whole-build parity. Strict tsconfig is included; static compiler checking remains unavailable because tsc is not installed.
