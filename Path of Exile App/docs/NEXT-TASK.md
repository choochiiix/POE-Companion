# Next-task guide

This file is a start point for the next requested change, not a feature request. The user has not specified what to build next.

## On the next request

1. Read the project [README](../README.md) and [current handoff](HANDOFF.md); inspect `git status` and preserve all existing edits.
2. Identify the affected React screen, shared component, domain model, save key, and data/source boundaries before editing.
3. Prefer shared components for changes that should apply across screens. Use `lucide-react` via `renderer/src/components/ui/icons.ts` for all future generic UI icons.
4. Keep the UI compact and calm. Avoid blocky layouts and forceful motion. Respect reduced motion, accessibility, small viewports, and the local-only runtime.
5. Preserve saved-data keys/formats, engines, datasets, artwork, provenance, and licenses unless the user explicitly requests a change.
6. Update `renderer/dist/` with a production build when changing the React source. Do not commit, push, or reset user data unless asked.

Ask for clarification only when the user's requested behavior cannot be inferred safely from the app or prior directions. Do not invent a major task from this handoff.

## Current checks and known limits

- Renderer typecheck/build: run from `renderer/` (`pnpm typecheck`, `pnpm build`).
- Current React browser checks: `scripts/test-react-*.mjs`.
- Latest recorded full Node regression: 145 passing tests on November 21, including 57 calculation-engine tests. The archived trial/corpus comparisons also passed; this supersedes the migration-era 128/130 result. See [PoB comparison evidence](../calculation-engine/reference/v2.68.1/README.md).
- [React QA](REACT-QA.md) separates historical browser checks from later evidence. The original preservation baseline remains absent; do not claim broad release acceptance from targeted checks.
- Keep browser QA in isolated profiles/servers. Do not use tests that modify the user's live browser storage.
