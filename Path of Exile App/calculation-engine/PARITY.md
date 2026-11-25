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

The production workspace adapter now integrates Character, saved Skills, selected passives and item comparisons. The [PoB Community 2.68.1 comparison](reference/v2.68.1/README.md) records 190 selected matches across seven executable fixtures covering rolled weapon stats, accuracy, resistance stages, conversion, resource outputs and deterministic defensive scenarios. Its coverage matrix states the remaining limits and older source snapshots.

The November 21 verification records 145 passing Node tests, including 57 calculation tests, plus successful typechecks and targeted browser checks. The archived [16-build corpus](corpus/README.md) and [source-backed trial](trial/README.md) matched 288 comparisons and 26 fields respectively. Earlier 114/117-test milestones and unavailable-compiler notes are historical.

The archived helper comparison retains the documented zero-accuracy/zero-evasion difference (PoB 100%, engine 5%). Actor/trigger orchestration remains a separate normalized API. Ailments, advanced sustain and special mechanics remain incomplete; the latest coverage matrix is authoritative for the supported subset.

## Remaining parity gate

Before calling this full PoB parity, run the actual reference build calculator against an extensive build corpus, compare intermediate modifier totals as well as final results, resolve mismatches, and publish a coverage matrix. Include character level/attributes, items and local modifiers, passive/mastery/jewel combinations, gem levels/quality/support rules, encounters and configuration, resource constraints and conditional feedback. Test ordinary builds and special mechanics independently.

Helper-function comparisons are useful evidence only for those helpers. Manually normalized example builds do not establish automatic catalog/passive/gem integration. Generic actor aggregation does not implement every minion or triggered skill. Explicit unsupported diagnostics are part of the public contract.
