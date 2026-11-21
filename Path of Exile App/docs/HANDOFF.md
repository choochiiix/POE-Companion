# Current handoff — November 16, 2026

## Current state

- The React 19 / TypeScript renderer is the production frontend. The normal local app serves `renderer/dist` at **http://127.0.0.1:4317/**; the React preview on **4321** uses separate browser storage.
- `renderer/src/` owns screen composition. Reuse shared controls and design tokens for app-wide changes. `crafting-ui/features/` retains domain models/adapters and selected styles imported by React; the old vanilla shell and screen controllers are removed.
- `SpringSelect` is the shared dropdown used across screens. Recent work reduced dropdown motion and tightened the option highlight response.
- UI icons use `lucide-react` through `renderer/src/components/ui/icons.ts`. Keep future generic interface icons on this shared entry point. Preserve game-specific tree symbols and PoE artwork.
- The user prefers a compact, restrained interface and dislikes blocky panels and strong/violent motion. Keep motion modest and respect reduced-motion preferences, keyboard access, focus behavior, narrow screens, and offline use.
- The Character route currently has the generated ASCII aurora background, matching green/teal UI palette, and React Bits GlassSurface WebGL layers on its sidebar and main panels. Glass uses the shared native backdrop filter and live background sampling. See [renderer README](../renderer/README.md) for ownership and tuning notes.
- Character overview layout: wide Equipment workspace beside a narrower right statistics rail for core stats, attributes, and breakdown. Resistance and skill context remain in lower support panels; the areas stack below 1050px. The aurora is fixed behind the full scrolling Character page.
- Current glass settings use native live backdrop filtering with restrained distortion and neutral white/gray text; accents, panel borders, and keyboard focus follow the selected Aurora palette.
- Character-card glass readability is controlled by the generated GlassSurface tint gradient and live backdrop filter. Change it in `renderer/scripts/generate-aurora.mjs`, regenerate, rebuild, and inspect the actual overlay; changing the base panel background alone will not meaningfully change the glass. See [UI standardization](UI-STANDARDIZATION.md#character-glass-readability-standard).
- The shared workspace breadcrumb/header was removed from the app shell; route content now begins directly below the shell top. Navigation, route content, and storage behavior are unchanged.
- Character equipment cards now use rarity-colored item detail layouts. The resistance source disclosure groups modifiers by equipment source, including armor, weapons, jewelry, and passive tree points.
- The equipment editor uses the Character route's liquid-glass treatment, responsive spacing, and Aurora-specific accents. Since its dialog is portaled outside the Character panel, theme tokens are explicitly bound to the dialog for Emerald, Violet, and Rose Gold; input text and placeholder colors follow the selected palette. Labels use consistent Title Case.
- The shared `LiquidGlassLayer` lives in `renderer/src/features/character/LiquidGlassLayer.tsx` so Character, Settings, the app shell, and the gear editor can reuse the same glass implementation.
- Latest editor styling verification: renderer TypeScript check and Vite build pass. Manual desktop and narrow viewport inspection passed. Automated Playwright visual scripts could not start because Playwright is not installed in the app environment.

## Preservation rules

- Keep using `127.0.0.1:4317` for existing saved data. `localhost` and port 4321 are separate origins.
- Do not reset or automatically migrate browser saves. Preserve existing keys and JSON formats for Character, equipment/gear, Skills, tree, Settings, themes, and calculation context.
- Crafting history is session-only and is lost on refresh. Avoid refreshing the user's active browser when a crafting session may be in progress.
- Preserve local-first runtime behavior, source uncertainty/unsupported-mechanics notices, generated datasets, artwork, raw sources, archives, provenance, and licenses. Keep game calculations in the engine packages.
- Preserve existing uncommitted work. Do not commit or push unless asked.

## Verification boundary

The full Node suite was **128/130 before the vanilla UI cleanup**; the two failures were stale pinned-PoB capture/tooling checks. The requested engine/data hash comparison is blocked because its baseline manifest is absent. The full suite has not been rerun since the cleanup, and broad release acceptance is not claimed. See [React migration](REACT-MIGRATION.md) and [React QA](REACT-QA.md) for details.

Most recent UI work added a persisted Aurora selector and palette-matched accents. Renderer TypeScript checking and Vite production build pass. Full app regression tests were not run for these UI changes. Review all three backgrounds before release.

## Working tree

The 0.3.0 release preparation includes the accumulated UI, Settings glass, Aurora backgrounds, accent palettes, renderer build output, and documentation changes since commit `1206fc5`.

## Next chat

Read [README](../README.md), [renderer README](../renderer/README.md), [START-HERE](../START-HERE.md), and [NEXT-TASK](NEXT-TASK.md), then inspect `git status` before editing. The current browser page is `http://127.0.0.1:4317/#character`. Continue UI work from the user's next request without reverting the existing uncommitted workspace changes.

## Release prep — 0.3.0

- The renderer now offers Emerald (default), Violet, and Rose Gold aurora backgrounds in Settings. The selected art updates the page background and live glass sampler together; corresponding accent, focus, and selection colors update with it. The choice is saved locally under `poe-companion.aurora-background.v1`, separately from theme/font preferences and Character saves.
- Settings uses the shared live GlassSurface behavior with a darker frosted outer dialog and lighter green/teal preference cards. The Aurora background dropdown is intentionally available for future variants through the same shared SpringSelect control.
- Source PNGs live in `renderer/src/features/character/`; `renderer/dist/` contains the built renderer served by the normal local app and desktop package.
- Planned source version: 0.3.0. The existing committed setup artifact remains 0.2.0 until the 0.3.0 installer is built and approved for release.
- Release checklist: build/typecheck renderer, inspect each background and accent pairing in the browser, run applicable requested checks, prepare the tagged release summary, and obtain user sign-off before pushing/tagging.
