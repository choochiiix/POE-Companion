# POE Companion

The local-first Path of Exile companion app is in `Path of Exile App/`. It runs on your PC; its Node server serves the UI, data, assets, and engine modules to a local browser. No cloud backend is required.

## Current React migration handoff — November 15, 2026

The React 19 / TypeScript frontend is implemented in `Path of Exile App/renderer/`. The isolated preview uses the existing local backend route handler; it does not replace or rewrite the crafting/calculation engines.

- **Normal app:** from `Path of Exile App/`, run `npm start` (or `Start Crafting.cmd`) to serve the existing frontend at `http://127.0.0.1:4317/`.
- **React preview:** from that same directory, run `Start React Preview.cmd` to serve the already-built renderer at `http://127.0.0.1:4321/`. Build instructions are in `renderer/README.md`; other ports, including a temporary preview, have separate browser storage.
- **Not switched:** the normal app still opens the original `crafting-ui/index.html`. Do not change the default entrypoint until the remaining acceptance gates below are resolved.
- **Preserve user data:** keep the existing origin and saved keys/formats; do not reset or automatically migrate saves. Crafting history is session-only and can be lost on refresh.

### Migration status

The latest renderer typecheck/build and focused Crafting, Items, and responsive visual checks pass; the React preview delegates local data, engine-module, and artwork requests to the existing backend handler. The normal launcher still serves the legacy `crafting-ui/index.html`. The full Node regression is **128/130**: the pinned-PoB corpus test fails with `Stale corpus tooling`, and the local-source trial test fails with `Reference tooling changed; recapture PoB trial`. The required SHA-256 comparison is intentionally blocked by the user's decision. Independent post-fix QA is pending, so the entrypoint remains unchanged and no release acceptance is claimed.

### For the next contributor

1. Read `Path of Exile App/docs/REACT-MIGRATION.md` and `docs/REACT-QA.md` for scope, tested flows, blockers, and exact evidence.
2. Read `Path of Exile App/docs/HANDOFF.md` for current launch/data constraints; its Character-specific notes are explicitly historical.
3. Keep the React preview isolated while resolving the stale capture checks and independent QA. Do not modify engines/data or switch the normal entrypoint as a shortcut.
4. Before integration, serve React at the existing origin while retaining the backend route allowlist and aliases; test saved-key compatibility and rollback without touching the user's live saves.

The older implementation summaries in `Path of Exile App/README.md` are historical checkpoints; use the current migration and QA documents when details differ.
