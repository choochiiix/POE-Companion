# File organization

## Upcoming UI iteration

- docs/ui-overhaul/: overhaul brief, screen/dependency inventory and release checklist.
- prototypes/ui-overhaul/: new review-only designs, separate from historical concepts.
- Existing production feature/shared/style boundaries stay in place. Create components for actual consumers; do not duplicate the app, engines or data.
- Calculations are now integrated into the live UI; historical under-the-hood descriptions below are superseded by the current handoff.


This workspace has no Git repository, so verified filesystem moves replace `git mv`. Existing HTTP URLs are preserved by the explicit allowlist in `crafting-ui/server/routes.mjs`.

- `crafting-ui/features/`: character, crafting, tree, items, skills, compendium, settings (view, model, feature CSS).
- `crafting-ui/shared/`: definitions, layout, tags and UI helpers shared across features.
- `crafting-ui/styles/`: design tokens and app styles.
- `crafting-ui/server/`: HTTP route mapping; `server.mjs` remains the launch entrypoint.
- `crafting-ui/test/`: UI model and HTTP regression tests.
- `crafting-engine/src/`, `crafting-data/`: existing independent engine and data boundaries.
- `calculation-engine/`: independent under-the-hood stat library; `src/` separates model/validation, modifiers, build/skill assembly, snapshot rules, offence/conversion, defence/advanced scenarios, shared core coordinator, actors and public exports. `test/` holds formula/reference/composition cases; `reference/` holds pinned executable Lua helper tooling and captures. README, per-track docs, reference hashes and PoB license stay with this boundary. Future source-text/save adapters remain separate from pure formulas. Live source assembly and UI integration are in crafting-ui/features/calculations/; pure formulas remain in this library.
- `scripts/`: explicit offline build/import tools and browser/Python verification entrypoints.
- `docs/`, `prototypes/`: documentation/previews and retained design concepts.
- Generated JSON, local assets, glossary records, `resources/`, `data-sources/` and `references/` retain their existing paths and formats.

Source filenames/CSS classes use kebab-case; JavaScript functions/variables use camelCase and types/classes use PascalCase. Python tools retain established entrypoints and snake_case. Public exports, game stat IDs, DOM IDs, JSON fields, saves/config keys and hashed asset names retain their existing spelling.

## Continuation

Manual gear: `crafting-ui/features/character/gear-model.js` (pure validation/rarity/engine adapter), `gear-editor.js` (UI/drafts/cards), `crafting-ui/test/gear-model.test.mjs`, `scripts/test-gear-editor-ui.mjs`, `docs/GEAR-EDITOR.md`. Source eligibility stays in crafting-engine; no parallel algorithm. Detailed saves use separate gearv1, original equipment IDs unchanged.

Live integration: `crafting-ui/features/calculations/{calculations.js,calculations.css,source-adapter.js}` owns presentation/context and source assembly. `crafting-ui/calculation-data.json` is the compact generated source snapshot; `scripts/build-calculation-ui.mjs` rebuilds it offline. `scripts/test-calculations-ui.mjs` and `crafting-ui/test/calculations-adapter.test.mjs` verify integration. Pure formulas remain in `calculation-engine/src/`; server access uses an explicit engine module allowlist, not arbitrary filesystem serving.

`calculation-engine/corpus/` owns the expanded case definitions, comparator and saved report; `reference/corpus.lua` and `corpus-capture.json` own independent PoB execution evidence. `src/adapters/` owns conservative source translation; `src/snapshot.ts` owns shared build/alternative comparison APIs. `prototypes/calculations/` contains review-only Character stats/comparison/config designs and preview images, separate from production UI.

`calculation-engine/trial/` holds the restricted source-data adapter, raw constant snapshot, report runner and saved report for the first PoB build trial. `calculation-engine/reference/run-build-trial.py`, `trial.lua` and `build-capture.json` own independent actual PoB execution/capture. Temporary extracted runtimes are removed automatically; raw source folders and the archive remain untouched.

`README.md` is the master source of current status. `docs/HANDOFF.md` is the concise new-chat brief; `START-HERE.md` covers launch and directory orientation. Source palettes and licenses for theme presets are in `resources/theme-presets/`; production theme validation/controller/presets remain together in `features/settings/`.

Current continuation: docs/HANDOFF.md and docs/NEXT-TASK.md. Character pilot history: docs/ui-overhaul/CHARACTER-PILOT.md. Shared motion/backdrop helpers live in crafting-ui/shared/ui/; class/ascendancy artwork and hash provenance in crafting-ui/assets/{classes,ascendancies}/. docs/archive/ preserves superseded handoffs.
