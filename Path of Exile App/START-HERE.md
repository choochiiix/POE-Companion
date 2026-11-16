# Start here

The production app is the React renderer. For the next task, read the project [README](README.md), then the current [handoff](docs/HANDOFF.md) and [next-task notes](docs/NEXT-TASK.md). The user has not specified the next feature request; do not invent work.

Run the app with **Start Crafting.cmd** or `npm start`, then use **http://127.0.0.1:4317/**. Keep this origin for existing browser saves. The React preview on port 4321 has separate browser storage. Crafting history is session-only and is cleared by refresh.

## Project map

- `renderer/src/`: React screens, shared UI components, and visual system.
- `renderer/dist/`: generated bundle served by the normal local app.
- `crafting-ui/server.mjs`: local server for the React bundle, offline data, artwork, and engine modules.
- `crafting-ui/features/`: retained domain models/adapters and selected styles used by React.
- `crafting-engine/`, `calculation-engine/`: game logic; keep mechanics out of presentation components.
- `crafting-data/`, `crafting-ui/*.json`, `crafting-ui/assets/`, `glossary/`, `data-sources/`: offline datasets and artwork.
- `resources/`, `references/`, `vendor/`: source material, provenance, licenses, and preserved upstream projects.

The old vanilla frontend is retired. See [file organization](docs/FILE-ORGANIZATION.md) for current ownership. Preserve user changes, saved-data keys/formats, offline behavior, source data, artwork, and licenses. Do not commit or push unless the user asks.
