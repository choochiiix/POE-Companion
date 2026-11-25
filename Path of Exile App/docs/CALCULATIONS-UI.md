# Live calculation integration

The React Character screen and `renderer/src/adapters/calculations.ts` consume the shared `crafting-ui/features/calculations/source-adapter.js`. The adapter assembles normalized inputs for the public calculation APIs; formulas remain in the calculation engine. The retired vanilla `calculations.js` and its browser script are not current entrypoints.

## Presentation and handoffs

Character places Equipment beside a narrower statistics rail, with resistance and skill context below; the grid stacks below 1050px. Overview/Comparison, source breakdowns, combat assumptions and unsupported-effect diagnostics use live build inputs. Expanded engine outputs are available to callers without implying every output has its own visible panel.

- `build:change` updates calculations after Character, equipment, Skills and tree actions. Session getters retain changes when storage is unavailable; tree keys remain class/ascendancy-specific.
- Skills offers Calculate this group. Combat assumptions selects a saved group or default weapon attack, level, gem endpoint, campaign penalty, enemy defences and incoming physical hit.
- Item library and Crafting offer Compare with build. Candidate and current snapshots use one combat context. Equip for calculations updates base selection and stores detailed evidence separately; preview-only comparisons do not save.
- The local server allowlists engine TypeScript modules as stripped JavaScript. Calculation executes in the browser against offline data, without a remote API.

## Persistence and sources

Character, equipment, skill-group and tree keys/formats remain stable. Separate `poe-companion.calculation.v1` stores combat context and detailed item overrides. Overrides apply only to the corresponding selected base; manually changing a base clears that slot's override. Appearance resets do not reset calculation context. Storage failure retains session state.

`calculation-data.json` contains local base/implicit evidence and pinned character constants. Rebuild explicitly with `node scripts/build-calculation-ui.mjs` from the app directory. The production React adapter merges validated manual gear before assembling the snapshot.

## Supported subset

Ordinary class/level attributes and pools, recognized gear modifiers, selected passive/mastery text, simple direct spell endpoints and compatible normalized supports feed calculations. Selected-weapon default attacks resolve supported rolled local physical damage, attack speed and critical chance. Raw explicit stats preserve actual rolls; base or implicit ranges use midpoint assumptions where exact values are unavailable. Unknown source effects remain diagnostics.

Workspace API callers may supply ephemeral `calculation` overrides for exact per-level skill evidence, hand selection, sources/buffs/conditions, conversions, enemy resistance adjustments, incoming hits and defensive resources. Explicit resource configuration supports reservation, basic recovery and ES recharge; survivability outputs include continuous max-hit thresholds and deterministic repeated-hit budgets. These options do not add new persistent save fields or automatic UI controls for every mechanic.

Ordinary saved gem inputs retain their selected first/natural-maximum tooltip endpoint at quality zero. Arbitrary gem interpolation, general attack gems, complex skill/unique rules, ailments/DoT, automatic avoidance and reservation assembly, advanced sustain and many conditional mechanics remain incomplete. Legal item selection does not establish full calculation coverage. See the [PoB 2.68.1 coverage matrix](../calculation-engine/reference/v2.68.1/README.md) for exact supported fields and source-snapshot limits.

## Verification evidence

The November 21 run records 145 passing Node tests (57 calculation tests), matching archived trial/corpus comparisons, and 190 selected matching values across seven PoB 2.68.1 fixtures. Engine/data and renderer typechecks, renderer build, isolated Edge smoke at 1440px/390px, and the ten-slot gear-editor regression passed. Reproduction commands and limits are in the reference guide above.

Earlier 124-test results, removed vanilla browser scripts and screenshots such as `docs/previews/calculations-live.png` describe historical integration. They are not the current verification command or layout. See [React QA evidence](REACT-QA.md) for the migration record and unresolved preservation-baseline gap. No fresh test run is claimed by this documentation reconciliation.
