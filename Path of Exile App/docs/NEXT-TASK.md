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
- Full Node regression: `npm test` at the project root. It was last documented as 128/130 before the vanilla UI cleanup, with two stale PoB capture/tooling failures. It has not been rerun after cleanup.
- `docs/REACT-QA.md` records the blocked baseline hash comparison and the distinction between prior and retested checks. Do not overstate this evidence as broad release acceptance.
- Keep browser QA in isolated profiles/servers. Do not use tests that modify the user's live browser storage.
