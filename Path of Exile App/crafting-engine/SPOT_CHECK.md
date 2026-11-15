# Verify before using real crafting odds

All standalone unit-test fixtures are FAKE. The project now imports the supplied RePoE PoE 1 snapshot labeled 3.29.3.6 using its inspected schema. This checklist keeps remaining unverified mechanics visible. The snapshot label has not been verified against the live patch.

## Explicit ASSUMPTION configuration

`src/engine.ts` exports `ASSUMPTION_CONFIG`. `createEngine` requires a config argument, so adopting these defaults is explicit. The `assumptions` block names the additional provisional algorithms below. Those string-literal settings currently support one implementation each; they are disclosures, not switches to unimplemented variants. Changing their algorithm requires updating the shared plan helpers (or tier matching) and the config type together.

| Setting | Provisional behavior | What to verify |
| --- | --- | --- |
| Magic counts | Transmutation and alteration: 1 or 2 mods, equal weight | Actual weights, any differences between currencies/base families, and how the game chooses affix side |
| Rare counts | Alchemy and chaos: 4, 5 or 6 mods, equal weight | Actual count weights and whether both currencies use the same distribution |
| Ordinary caps | Magic 1 prefix/1 suffix; rare 3/3; normal 0/0 | Ordinary equipment and every special base family |
| Per-base caps | `base.affixCaps.magic` and `.rare` override each separately | Jewel and other special caps; provide explicit caps per base, with no hardcoded jewel detection |
| Count vs cap | Requested count clamped to total slots; weights are not renormalized | Real behavior on bases with fewer available affixes |
| Exhausted pool | Stop early and return the partial roll | Real behavior with low item levels, group conflicts or unusually small eligible pools |
| Stat values | Each stat independently uniform over its inclusive integer range | Correlated stats, shared interpolation, stepped/scaled ranges and rounding rules |

`test/fixtures.ts` intentionally overrides the count distributions to fixed counts. These fixture settings are not recommended game defaults.

## Other modeled assumptions to check

- **Generation-weight fallback:** the first matching generation-weight percentage multiplies the spawn weight. An empty list has no effect. `assumptions.generationWeightFallback` explicitly names the no-match assumption (100%). Every imported nonempty generation list in the supplied snapshot contains a default entry, so this last fallback is not needed by that dataset.
- **Imported scope:** ordinary released equipment only. Royale ids, special classes/bases, essence-only mods and non-random affix types are excluded with reasons. Verify any future expansion rather than silently using ordinary 3/3 caps. Imported implicit granted tags are effective item tags; implicit numeric values remain unsimulated reference ranges.

- **Affix selection process:** choose from all currently eligible mods together, weighted by their spawn weights, then recalculate after each mod. Verify whether real generation first chooses counts/sides or uses a different sequence. Counts alone may be insufficient to reproduce the game's generator. Any correction belongs in the plan-building helpers, so sampling and enumeration keep agreeing.
- **Group exclusion:** any shared group excludes the candidate; duplicate ids cannot spawn twice even with no groups. Verify the adapter's interpretation of groups and any exceptions.
- **Spawn tag behavior:** first matching entry wins, `default` matches everything, first matching zero blocks, no match blocks. This is implemented as requested. Confirm real adapter order and tag semantics. Mod descriptive tags do not become item tags. Supply `addsTags` only when actual mechanics justify it.
- **Tier ranking:** the engine has no derivation rule. `tier` is explicit optional metadata supplied by a future adapter, with 1 best. Confirm how to rank mods per base/domain/group when levels or families overlap. Missing tier metadata must stay unknown rather than being guessed.
- **Annulment:** uniform selection among present random explicit mods; rarity unchanged even after removing the last mod. Check empty magic/rare state behavior and no-op applicability.
- **Divine:** rerolls all modeled random explicit values inside the existing mod definitions; no tier change. Fixed-value mods are accepted even if the result cannot change. Confirm game applicability for items containing only fixed rolls, stat correlations and special mods. Implicits and unique items are outside this model.
- **Regal/augmentation/exalted:** require at least one eligible additional mod; otherwise return a refusal. Check full affix slots, unusual bases and exhausted pools, especially whether regal can still upgrade when no mod can be added.
- **Scouring:** removes all modeled random explicit mods and makes a supported item normal. Implicits are not represented; this engine has no rules for bench-protected, fractured or otherwise persistent mods.
- **Corruption:** all ten supported currencies refuse corrupted items. No special enabling mechanics exist in this scope.
- **Supported targets:** ordinary normal/magic/rare items only. Unique, mirrored, fractured, influenced, crafted, locked and special mechanic states are not modeled. Do not encode these states as ordinary items and expect correct rules.

## Suggested checks

1. Start with actual item/currency tooltip behavior and small in-game examples for applicability and rarity changes.
2. Supply tomorrow's data-format report before writing an adapter. Confirm domains, required levels, ordered weights, mod groups, stat scaling and base tags.
3. Verify distributions from reliable game data or sufficient measured evidence. A few manual rolls cannot establish count weights or exact odds.
4. Update config and tests with known examples. If the random process itself differs, update its plan constructor rather than adding separate odds code.
5. Keep uncertainty notes until each assumption has evidence. Agreement between this engine's exact and Monte Carlo results is a software check, not independent evidence of game accuracy.
