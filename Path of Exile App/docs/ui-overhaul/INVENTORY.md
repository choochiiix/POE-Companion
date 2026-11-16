# Feature inventory preserved through the React migration

This is a functional inventory, not a current source-path map. The React implementation is under `renderer/src/`; see [current file organization](../FILE-ORGANIZATION.md).

| Area | User-facing behavior to preserve |
| --- | --- |
| App shell | Six sections, navigation state, and Settings dialog |
| Character | Class/ascendancy, equipment, detailed gear, and calculations |
| Calculations | Stat cards, breakdowns, resistances, assumptions, compare/equip, and pending diagnostics |
| Crafting | Seeded rolls, undo/random state, targets, odds, history, and spending |
| Skill tree | Search, inspection, allocation paths, masteries, saved selections, and export |
| Skills | Browse/details, saved groups, support compatibility, and calculation handoff |
| Item library | Search/filter, unique cards, inspection, compare, and equip |
| Compendium | Glossary, buffs/debuffs/flasks, source variants, and definitions |
| Settings | Theme/font, density, text size, motion, scoped resets, and storage notices |
| Shared reference UI | Inline definitions, fixed game-reference colors, and focus behavior |

Keep user save keys and schemas stable. Crafting history is session-only. Keep unsupported game mechanics visible as diagnostics rather than implying complete calculation coverage. These requirements are also recorded in the current [handoff](../HANDOFF.md) and [calculation limits](../CALCULATIONS-UI.md).
