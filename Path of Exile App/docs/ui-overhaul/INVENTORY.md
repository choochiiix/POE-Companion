# Screen and dependency inventory

| Area | Production owner | Carry forward |
| --- | --- | --- |
| Shell | index.html, shared/layout/, styles/ | Six screens, navigation state, Settings modal |
| Character | features/character/ | Class/ascendancy, equipment compatibility, gear Add/Edit/Remove, exact affix rolls |
| Calculations | features/calculations/ | Stat cards, breakdowns, resistances, assumptions, compare/equip, pending diagnostics |
| Crafting | features/crafting/ | Seeded rolls, undo/random state, targets, odds worker, history/spending |
| Skill tree | features/tree/ | Pan/zoom/search, inspect/pin, allocation paths, masteries, saved selections/export |
| Skills | features/skills/ | Browse/details, saved groups, support compatibility, Calculate this group |
| Item library | features/items/ | Search/filter, unique cards, inspectors, compare/equip |
| Compendium | features/compendium/ | Glossary, buffs/debuffs/flasks, source variants and definitions |
| Settings | features/settings/ | Theme/font, density/text size/motion, scoped resets, storage notices |
| Shared references | shared/definitions/, shared/tags/, shared/layout/cards.css | Inline definitions, reference-card styling, focus behavior |

Paths above are relative to crafting-ui/.

## Coupling to resolve deliberately

- index.html contains initial markup; feature modules also construct screens. Static HTML alone does not represent the running layout.
- features/calculations/calculations.js builds Character presentation, moves equipment into its grid and class controls into a dialog, then removes the old wrapper. Coordinate markup replacement with this setup so the new UI has one layout owner.
- gear-editor.js owns drafts/cards/modal; gear-model.js validates through the actual crafting engine. Preserve that boundary.
- build:change connects build consumers. Equipment changes also invalidate comparison overrides. Preserve event/getter contracts or migrate all consumers together.
- server/routes.mjs maps legacy and canonical UI URLs; server.mjs also serves engine/data modules. Check routes and imports when moving files.
- Global and feature styles cooperate today. Establish new ownership, then remove superseded rules instead of accumulating override layers.

## Saves and sources

Preserve all character, equipment, detailed gear, calculation, skill, tree, settings and theme schemas/keys. Detailed gear uses poe-companion.gear.v1; equipment base IDs use poe-companion.equipment.v1; context/overrides use poe-companion.calculation.v1. Tree saves are class/ascendancy-specific. Models remain the schema source of truth.

Crafting history is session-only; reload loses it. Keep http://127.0.0.1:4317/ because localhost stores saves separately. Verify the current server process before stopping it.

Preserve generated JSON, artwork, raw sources, archives, provenance and licenses in place. UI work does not imply data rebuilds or expanded calculation coverage. Unsupported mechanics remain diagnostic; selected PoB comparisons do not establish full parity.
