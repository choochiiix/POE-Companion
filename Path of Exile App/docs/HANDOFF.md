# Current handoff — November 15, 2026

## Current state

- The React 19 / TypeScript renderer is the production frontend. The normal local app serves `renderer/dist` at **http://127.0.0.1:4317/**; the React preview on **4321** uses separate browser storage.
- `renderer/src/` owns screen composition. Reuse shared controls and design tokens for app-wide changes. `crafting-ui/features/` retains domain models/adapters and selected styles imported by React; the old vanilla shell and screen controllers are removed.
- `SpringSelect` is the shared dropdown used across screens. Recent work reduced dropdown motion and tightened the option highlight response.
- UI icons use `lucide-react` through `renderer/src/components/ui/icons.ts`. Keep future generic interface icons on this shared entry point. Preserve game-specific tree symbols and PoE artwork.
- The user prefers a compact, restrained interface and dislikes blocky panels and strong/violent motion. Keep motion modest and respect reduced-motion preferences, keyboard access, focus behavior, narrow screens, and offline use.

## Preservation rules

- Keep using `127.0.0.1:4317` for existing saved data. `localhost` and port 4321 are separate origins.
- Do not reset or automatically migrate browser saves. Preserve existing keys and JSON formats for Character, equipment/gear, Skills, tree, Settings, themes, and calculation context.
- Crafting history is session-only and is lost on refresh. Avoid refreshing the user's active browser when a crafting session may be in progress.
- Preserve local-first runtime behavior, source uncertainty/unsupported-mechanics notices, generated datasets, artwork, raw sources, archives, provenance, and licenses. Keep game calculations in the engine packages.
- Preserve existing uncommitted work. Do not commit or push unless asked.

## Verification boundary

The full Node suite was **128/130 before the vanilla UI cleanup**; the two failures were stale pinned-PoB capture/tooling checks. The requested engine/data hash comparison is blocked because its baseline manifest is absent. The full suite has not been rerun since the cleanup, and broad release acceptance is not claimed. See [React migration](REACT-MIGRATION.md) and [React QA](REACT-QA.md) for details.

Most recent UI work added Lucide icons, ran renderer TypeScript checking and a production Vite build, and loaded the rebuilt preview. The build completes; Vite reports the main chunk at about 502 kB, just over its 500 kB advisory threshold. The automated test suite was not run for that icon change.

## Working tree

The checkout has uncommitted changes from the React cutover cleanup (retired vanilla UI files and scripts removed, server/docs updated), recent shared dropdown-motion tuning, the Lucide icon integration and rebuilt `renderer/dist`, plus this handoff refresh. Preserve this combined work. Inspect `git status` before editing; do not assume every pending change belongs to the next request.

## Next chat

Read [README](../README.md), [START-HERE](../START-HERE.md), and [NEXT-TASK](NEXT-TASK.md), then inspect `git status` before editing. No new feature request has been supplied yet; acknowledge readiness and wait for the user's scope. Do not continue the previous task speculatively.
