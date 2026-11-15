# Offline RePoE integration

Generated from the supplied English PoE 1 export snapshot **3.29.3.6**, with 40,355 mod and 5,461 base records. The adapter currently imports **2,721** candidate ordinary-equipment affixes and **929** released supported bases. Candidates are further filtered by actual base tags, item level, groups, affix slots and weights on every draw.

`import-report.json` includes the source provenance/hash manifest and the id of every excluded record, grouped by reason. Influence-only candidates need matching tags and are not enabled on the normal bases offered by the UI. The scope is deliberately smaller than everything in the export.

Rebuild from the project root with `node --experimental-strip-types scripts/build-data.mjs`. No download is performed. Source mods/base hashes are checked before conversion; changing source files requires explicitly updating source provenance. The exact pinned source files are included for reproducibility.

The adapter is `crafting-engine/src/repoe.ts` and accepts unknown JSON values rather than trusting a cast. Supported records are validated, including numeric ranges, weights, tag arrays, groups, ids and effect metadata. Unsupported scopes are logged and excluded. Missing implicit references fail import. Output is deeply immutable in memory and versioned `poe1-crafting-data-v1` on disk.

Mapping: `generation_type` → affix; `required_level` → requiredLevel; ordered `spawn_weights` and `generation_weights` → corresponding weight lists; `implicit_tags` → descriptive goal tags; `adds_tags` → tags granted during subsequent rolls. Base domains and original ids are preserved. Implicit granted tags are merged into the base's effective tags, while their source references/ranges remain separate from explicit modifiers.

The engine uses `spawnWeight × firstMatchingGenerationWeight/100`, preserving fractional effective weights. An empty generation list has no effect. The no-match fallback is explicitly assumed to be 100%; every nonempty imported list in this snapshot has a default entry. Supporting arbitrary future exports still requires checking that assumption. This interpretation follows the supplied RePoE docs and the first-match explanation in [PoECraft's author documentation](https://github.com/NickRyder/PoECraft#affix-weights); it is not a claim that the author documentation independently verifies live game behavior.

`modsForBase` builds a safe candidate superset from tags that base and its reachable affixes can grant. It preserves mods which become blocked only after another mod is added. The full engine still performs exact eligibility checks on every draw. This optimization is for fixed base tags without arbitrary extra tags; use the full mod list if the caller will inject other tags. Regression tests compare specialized vs full-dataset seeded crafts on four real bases.

No tier is inferred. No unique, influence, bench, essence, fossil, fractured, Harvest, jewel, flask or map mechanics are introduced by this import. Implicit values and full human-readable rolled stat translations are not simulated. Source range descriptions and raw rolled units are shown separately so percentages and scaled integers are not confused.

Validation: **40 tests passed**, including 37 standalone engine/adapter tests, 2 real-snapshot tests and 1 HTTP integration test. Strict TypeScript checking covers the engine, adapter and real-snapshot tests. Browser QA is recorded in the project's delivery notes.

Game data/artwork belong to Grinding Gear Games, as credited by the supplied RePoE README. RePoE source: https://github.com/repoe-fork/repoe . No data-generation scripts from the archive were executed.
