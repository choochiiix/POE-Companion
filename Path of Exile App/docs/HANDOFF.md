# Current handoff — November 16, 2026

## Current state

- The React 19 / TypeScript renderer is the production frontend. The normal local app serves `renderer/dist` at **http://127.0.0.1:4317/**; the React preview on **4321** uses separate browser storage.
- `renderer/src/` owns screen composition. Reuse shared controls and design tokens for app-wide changes. `crafting-ui/features/` retains domain models/adapters and selected styles imported by React; the old vanilla shell and screen controllers are removed.
- `SpringSelect` is the shared dropdown used across screens. Recent work reduced dropdown motion and tightened the option highlight response.
- UI icons use `lucide-react` through `renderer/src/components/ui/icons.ts`. Keep future generic interface icons on this shared entry point. Preserve game-specific tree symbols and PoE artwork.
- The user prefers a compact, restrained interface and dislikes blocky panels and strong/violent motion. Keep motion modest and respect reduced-motion preferences, keyboard access, focus behavior, narrow screens, and offline use.
- The Character route currently has the generated ASCII aurora background, matching green/teal UI palette, and React Bits GlassSurface WebGL layers on its sidebar and main panels. Glass uses distortion scale `-28`, zero RGB offsets, `displace={2}` for subtle diffusion, and `blur={17}` for the displacement map. See [renderer README](../renderer/README.md) for ownership and tuning notes.
- Character overview layout: wide Equipment workspace beside a narrower right statistics rail for core stats, attributes, and breakdown. Resistance and skill context remain in lower support panels; the areas stack below 1050px. The aurora is fixed behind the full scrolling Character page.
- Current glass settings: distortion scale `-28`, zero RGB offsets, `displace={3.5}`, and `blur={22}`. Glass text is neutral white/gray; green/teal stays for accents. Panel borders and glow rings are minimized while keyboard focus remains visible.
- The shared workspace breadcrumb/header was removed from the app shell; route content now begins directly below the shell top. Navigation, route content, and storage behavior are unchanged.

## Preservation rules

- Keep using `127.0.0.1:4317` for existing saved data. `localhost` and port 4321 are separate origins.
- Do not reset or automatically migrate browser saves. Preserve existing keys and JSON formats for Character, equipment/gear, Skills, tree, Settings, themes, and calculation context.
- Crafting history is session-only and is lost on refresh. Avoid refreshing the user's active browser when a crafting session may be in progress.
- Preserve local-first runtime behavior, source uncertainty/unsupported-mechanics notices, generated datasets, artwork, raw sources, archives, provenance, and licenses. Keep game calculations in the engine packages.
- Preserve existing uncommitted work. Do not commit or push unless asked.

## Verification boundary

The full Node suite was **128/130 before the vanilla UI cleanup**; the two failures were stale pinned-PoB capture/tooling checks. The requested engine/data hash comparison is blocked because its baseline manifest is absent. The full suite has not been rerun since the cleanup, and broad release acceptance is not claimed. See [React migration](REACT-MIGRATION.md) and [React QA](REACT-QA.md) for details.

Most recent UI work arranged Character equipment beside a right statistics rail, tuned glass darkness/softness, standardized neutral text, reduced panel borders/glows, and extended the aurora behind the full page. A production Vite build succeeded; tests were not run for these visual changes. Review the full-page background and layout in the browser before release.

## Working tree

The checkout has a large set of uncommitted changes from the React UI cutover, theme/background work, GlassSurface integration, generated build assets, and other recent UI work. Preserve this combined work. Inspect `git status` before editing; do not assume every pending change belongs to the next request.

## Next chat

Read [README](../README.md), [renderer README](../renderer/README.md), [START-HERE](../START-HERE.md), and [NEXT-TASK](NEXT-TASK.md), then inspect `git status` before editing. The current browser page is `http://127.0.0.1:4317/#character`. Continue UI work from the user's next request without reverting the existing uncommitted workspace changes.
