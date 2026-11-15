# Independent actors and trigger delivery

`src/actors.ts` exports `calculateActors(ActorCalculationInput)` and `calculateTriggerSchedule(TriggerSchedule)`. This is a normalized orchestration layer, not a complete implementation of every minion, special skill or unique item.

Each actor owns a complete `CalculationInput`, so a minion does not accidentally receive the player's damage modifiers. Supply explicit active instance count, inclusion flag and delivery policy. The engine calculates each actor with the same core coordinator, retains its breakdowns and diagnostics, and sums only explicitly included contributions. Optional exclusive groups reject combinations of mutually exclusive main-skill alternatives. Multiplicity means active damage-producing instances, not the character's maximum summon count.

- `continuous`: use the actor's calculated attack/cast rate (ordinary player, minion or totem).
- `fixed`: caller supplies sustained effective activations per second (e.g. actual trap or mine detonation rate).
- `trigger`: calculate sustained rate for one skill, one periodic source, guaranteed trigger success and a cooldown. Recovery modifies cooldown; optional explicit tick duration rounds cooldown upward; source opportunities that occur before readiness are skipped. The triggered skill's cast speed does not determine its trigger rate.

For example, five source opportunities per second and a 0.3-second cooldown trigger on every second opportunity, giving 2.5 activations/second rather than 3.333. Increasing cooldown recovery by 50% reduces the cooldown to 0.2 seconds, permitting all five opportunities. Startup transients and finite encounter windows are not modeled.

Unique effects expressible by ordinary normalized modifiers can remain source-tagged equipment modifiers in the actor input. Effects requiring new mechanics must be declared in source `unsupported` or actor `unsupported`; these return `partial` and preserve source/actor identifiers. This layer does not infer unique effects from item names. Shared cooldown groups, multi-spell rotations, trigger costs, probabilistic trigger chances, summon lifetimes, AI/target availability, mine chains, trap deployment, resource competition, ailments and explosion mechanics are not implemented here. Caller-defined rates cannot establish parity for those mechanics.

Reference: preserved PoB archive `src/Modules/CalcTriggers.lua`, SHA-256 `2ef5642b26ae28dc0e6413bdd113ba960d117cb81e66683754afcf4e1860eb11`. Its cooldown/recovery packaging and opportunity-based multi-spell simulation informed the separation of skill damage from delivery cadence; this implementation supports only the explicitly described single-skill periodic case. No differential test against PoB's full trigger simulation has been performed. Existing archive/license provenance is retained alongside this library.

Validation: `node --experimental-strip-types --test calculation-engine/test/actors.test.ts` exercises independent modifiers, source selection, cooldown cadence, recovery and tick breakpoints, delivery requirements, exclusive groups, diagnostics and deterministic results.
