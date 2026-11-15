# PoB parity work

Parity means matching a pinned PoB revision for specified inputs and outputs. It does not follow from feature names, passing self-authored tests, or having the source archive. This library remains a supported subset until comparisons demonstrate otherwise.

The work is separated into five tracks:

1. Reference pinning and executable comparison tooling.
2. Normalized builds and modifier assembly.
3. Ordinary attack and spell skill assembly/calculations.
4. Conversion, ailments and advanced defensive calculations.
5. Special skill actors, triggers and unique interactions.

Each track must identify supported semantics, reject invalid inputs and report unsupported effects. Pure calculation modules must not fetch data, mutate browser storage or inspect the UI. Adapters resolve source data into normalized inputs; they must not silently treat unknown descriptions as supported modifiers. New source-stat translation coverage requires tests against actual records.

## Integrated result

Latest corpus extends to 16 actual headless PoB builds and 288 selected matching comparisons, covering spell/attack endpoints, attributes/pools, resistances, speed/crits, armour, conversion and gain-as-extra. See [corpus coverage and exclusions](corpus/README.md). Shared normalized snapshot/comparison APIs support future multi-screen integration. PoB UI input/output mapping is documented in `prototypes/calculations/README.md`; those designs await review. Broad source adapters and full mechanics parity remain pending.

**Latest trial:** one actual pinned headless PoB build now compares against local-source item/mod/passive/gem adapters: 26 selected values match within 1e-9. Explicit snapshot rounding corrected the observed continuous-vs-rounded difference. This supersedes the earlier statement that no full headless build had run; broad build coverage remains pending. Full regression now **117 passed**, including 43 calculation tests. See [trial](trial/README.md).

All five tracks delivered scoped implementations and were synthesized through `src/index.ts` and the shared `core.ts` coordinator. Build assembly preserves optional conversion and incoming-hit scenarios; actors use the same validated core; the public composition test combines skill/support, equipment/passive/attribute, conversion, defensive scenario and actor layers. Latest full regression: 114 passed, including 40 calculation tests. Static typechecking remains unavailable (`tsc` absent).

Reference tooling actually executed the pinned Lua accuracy/armour helpers. Eight of nine comparisons match; zero accuracy and zero evasion remains a documented difference (PoB 100%, engine 5%). This is helper evidence, not a full-build comparison. Track 4 implements conversion and advanced hit scenarios but leaves ailments/DoT pending. Track 5 supplies normalized actor/trigger orchestration, not every unique/minion mechanic. Per-track documentation records precise scope.

## Remaining parity gate

Before calling this full PoB parity, run the actual reference build calculator against an extensive build corpus, compare intermediate modifier totals as well as final results, resolve mismatches, and publish a coverage matrix. Include character level/attributes, items and local modifiers, passive/mastery/jewel combinations, gem levels/quality/support rules, encounters and configuration, resource constraints and conditional feedback. Test ordinary builds and special mechanics independently.

Helper-function comparisons are useful evidence only for those helpers. Manually normalized example builds do not establish automatic catalog/passive/gem integration. Generic actor aggregation does not implement every minion or triggered skill. Explicit unsupported diagnostics are part of the public contract.
