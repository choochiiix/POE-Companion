# Exile Companion

Local-first Path of Exile companion app. The React 19 / TypeScript frontend is the production UI. The local Node server supplies its built files, offline data, artwork, and engine modules; no cloud backend is required.

## Run the app

- Double-click **Start Crafting.cmd**, or run `npm start` from this folder.
- Open **http://127.0.0.1:4317/** in your browser.
- Keep using this address to retain the browser storage associated with existing saves. `localhost` and `127.0.0.1` have separate storage.
- **Start React Preview.cmd** runs a separate preview on port 4321, with separate browser storage.

Crafting history is session-only and disappears when the page is refreshed. Character, gear, skills, tree, settings, themes, and calculation context use local browser storage. The app does not automatically reset or migrate saved data.

## Current code ownership

- `renderer/src/` contains the React screens and components for Character, Crafting, Skill tree, Skills, Item library, Compendium, and Settings.
- `renderer/dist/` is the generated production build served by the normal app. From `renderer/`, run `pnpm build` after changing the React source.
- `crafting-ui/server.mjs` is the normal local server. `crafting-ui/features/` and selected `crafting-ui/shared/` and `crafting-ui/styles/` files contain domain models, adapters, and styles still used by React.
- `crafting-engine/` and `calculation-engine/` hold the independent game logic. `crafting-data/`, `crafting-ui/*.json`, `crafting-ui/assets/`, `glossary/`, and `data-sources/` hold generated offline data and artwork.
- `scripts/` contains data tools and current React checks. `resources/`, `references/`, and `vendor/` retain source material, provenance, licenses, and upstream code.

The retired vanilla HTML shell, screen controllers, route aliases, and vanilla UI browser scripts have been removed. Shared models, datasets, artwork, engines, and provenance remain because the React app or data tools use them.

## UI and contributor rules

- Make UI changes in `renderer/src/`. Reuse shared components for consistent app-wide updates instead of editing repeated controls one by one. The shared `SpringSelect` owns dropdown appearance/behavior.
- Use `lucide-react` for generic UI icons and import through `renderer/src/components/ui/icons.ts`. Keep PoE tree symbols and game artwork because they represent game data.
- Keep visual changes compact and restrained; avoid blocky surfaces and forceful motion. Respect reduced-motion settings, focus/keyboard use, narrow layouts, and offline operation.
- Keep mechanics in the crafting/calculation engines and use existing domain adapters. Preserve existing local-storage keys/formats, all source data and licenses, and local-only requests.
- Inspect and preserve existing uncommitted changes. Do not commit, push, reset saves, or migrate saved data unless the user asks.

## Status and project notes

The React cutover is complete at the user's direction. The legacy UI cleanup removed its browser checks, so the full Node suite has not been rerun after cleanup. Before cleanup, the documented full regression was 128/130; two PoB capture checks fail because their reference tooling is stale. The engine/data hash comparison is also blocked because its baseline manifest is absent. See [React migration](docs/REACT-MIGRATION.md) and [React QA](docs/REACT-QA.md) for the evidence and limits; broad release acceptance is not claimed.

See [file organization](docs/FILE-ORGANIZATION.md) for active paths and [handoff](docs/HANDOFF.md) for implementation constraints. Older design and implementation notes are retained as history and may refer to the removed vanilla UI.
