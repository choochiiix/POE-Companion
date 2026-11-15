# Offline 3.29 tree viewer

Read the root README.md first. It is the current project handoff and takes precedence over historical screenshots or delivery notes.

## Source and rebuild

Source: the user-provided `references/path-of-building/PathOfBuilding-dev.zip`, `src/TreeData/3_29`. Original Lua, local artwork, hashes and upstream license remain in `data-sources/pob-tree-3_29/`. The folder label has not been independently verified against the official export or current live patch.

Run `node scripts/build-tree.mjs` to regenerate the JSON. The converter parses literal Lua data tables; it does not execute Lua. `tree.json` preserves full node data; `tree-view.json` omits artwork metadata for the runtime viewer. There are 3,396 indexed nodes plus the synthetic root. Positions follow source group/orbit metadata, including special 16/40-node orbit angles.

The viewer does not load sprite JSON, sprite images, or CDN resources. Original artwork remains as historical/reference material. Keep it distinct from runtime dependencies.

## Current interaction

- Full-width canvas; no left node list. Pan/zoom by pointer or canvas keyboard controls.
- Search node IDs, names, stats and mastery effects above the map. Enter / Next match cycles all matching records without a 150-result truncation.
- Hover details; click to pin. Escape / Close dismisses details. Search pins details for keyboard access.
- Canvas symbols and SVG legend share `nodeVisual`. Structural flags determine shapes; names provide presentation categories. Source stats are authoritative, not the visual category.
- Class/primary ascendancy views, ordinary shortest-path allocation, user passive budget, eight ascendancy points, branch refunds and undo.
- Masteries require a cluster notable and disallow duplicate effects.
- Local saves by class/ascendancy; JSON selection export. No import workflow yet.

## Limits

Special multiple-choice ascendancy allocation, Scion alternate starts/extra-point mechanics, bloodline allocation, cluster expansion, tattoos, anoints and build-stat calculations are not implemented. Multiple-choice allocations are refused. Alternate ascendancy/bloodline views are reference-only. Primary ascendancy allocation requires selecting it in Character.

Budget is user-configured, not level/quest-derived; reducing it does not automatically rebuild the allocation. Some source-only records have no static position; search can inspect them, but they cannot be allocated as ordinary map nodes. Connections are straight segments, not original orbit arcs. No in-game validation or official-export comparison is complete.

## Visual requirements

Use the Ayu Aurora tokens and palette specified in README.md. Earlier pastel, red/violet, sprite-based or sidebar-search screenshots are superseded. Keep matching legend symbols, filled allocated nodes and outer rings so color is not the only cue. Keep tooltips readable and their controls reachable by pointer and keyboard. Preserve offline operation and existing saved selections.
