# File organization

## Production frontend

- `renderer/src/`: React screens, shared components, presentation styles, and frontend adapters.
- `renderer/dist/`: generated production bundle served by the normal local app. Rebuild it with `pnpm build` from `renderer/` after source changes.
- `renderer/server.mjs`: optional isolated preview server on port 4321.

## Local server, data, and shared domain logic

- `crafting-ui/server.mjs`: normal server entrypoint. It serves the React build at `127.0.0.1:4317`, plus explicit local data, artwork, and engine-source endpoints.
- `crafting-ui/features/`: shared domain logic still imported by React, including character/gear validation, tree/catalog/skills models, settings, and calculation source adapters. Retired vanilla screen controllers were removed.
- `crafting-ui/styles/tokens.css` and selected feature/card styles are imported by the React build.
- `crafting-ui/*.json`, `crafting-ui/assets/`, `glossary/`, `crafting-data/`, and `data-sources/`: generated offline data and artwork. Preserve source records, hashes, and licenses.
- `crafting-ui/test/`: tests for retained domain models and local-server boundaries.

## Engines, sources, and tooling

- `crafting-engine/` and `calculation-engine/`: independent crafting and calculation logic; keep formulas separate from UI presentation.
- `scripts/`: data generation and current React-specific browser checks. Retired vanilla UI browser scripts have been removed.
- `resources/`, `references/`, and `vendor/`: source snapshots, upstream archives, licenses, and preserved vendor code.
- `docs/` and `prototypes/`: current handoffs, limits, design history, and review-only concepts.

Keep saved-data keys and JSON formats stable. Keep ordinary app traffic local and use `127.0.0.1:4317` so existing browser storage remains available.
