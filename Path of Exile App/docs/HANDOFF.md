# Current handoff — documentation reconciled November 25, 2026

## Calculation upgrade

- The production workspace adapter now resolves rolled weapon stats and exposes hit, resource, and survivability breakdowns. Existing screens use the same adapter and save formats. Future panels can read the new outputs directly. Scenario controls can supply optional encounter inputs through the adapter.
- The executable PoB Community 2.68.1 comparison matched 190 selected values across seven fixtures. The full regression passed 145 tests, including 57 calculation-engine tests, and the production bundle passed desktop and narrow Edge smoke checks. See the [reference guide](../calculation-engine/reference/v2.68.1/README.md) for reproduction commands, field mappings, and coverage limits.
- Settings now uses an opaque outer dialog and lightweight preference cards. The rebuilt renderer includes these styles and the calculation upgrade.

## Current state

- The React 19 / TypeScript renderer is the production frontend. The normal local app serves `renderer/dist` at **http://127.0.0.1:4317/**; the React preview on **4321** uses separate browser storage.
- `renderer/src/` owns screen composition. Reuse shared controls and design tokens for app-wide changes. `crafting-ui/features/` retains domain models/adapters and selected styles imported by React; the old vanilla shell and screen controllers are removed.
- `SpringSelect` is the shared dropdown used across screens. Recent work reduced dropdown motion and tightened the option highlight response.
- UI icons use `lucide-react` through `renderer/src/components/ui/icons.ts`. Keep future generic interface icons on this shared entry point. Preserve game-specific tree symbols and PoE artwork.
- The user prefers a compact, restrained interface and dislikes blocky panels and strong/violent motion. Keep motion modest and respect reduced-motion preferences, keyboard access, focus behavior, narrow screens, and offline use.
- All routes use the selected fixed ASCII Aurora background and matching palette (Emerald by default), and shared GlassSurface layers on its sidebar and main panels. Glass uses the shared native backdrop filter and live background sampling. See [renderer README](../renderer/README.md) for ownership and tuning notes.
- Character overview layout: wide Equipment workspace beside a narrower right statistics rail for core stats, attributes, and breakdown. Resistance and skill context remain in lower support panels; the areas stack below 1050px. The aurora is fixed behind the full scrolling Character page.
- Current glass settings use native live backdrop filtering with restrained distortion and neutral white/gray text; accents, panel borders, and keyboard focus follow the selected Aurora palette.
- Character-card glass readability is controlled by the generated GlassSurface tint gradient and live backdrop filter. Change it in `renderer/scripts/generate-aurora.mjs`, regenerate, rebuild, and inspect the actual overlay; changing the base panel background alone will not meaningfully change the glass. See [UI standardization](UI-STANDARDIZATION.md#live-glass-and-aurora).
- The shared workspace breadcrumb/header was removed from the app shell; route content now begins directly below the shell top. Navigation, route content, and storage behavior are unchanged.
- Character equipment cards now use rarity-colored item detail layouts. The resistance source disclosure groups modifiers by equipment source, including armor, weapons, jewelry, and passive tree points.
- The equipment editor uses the Character route's liquid-glass treatment, responsive spacing, and Aurora-specific accents. Since its dialog is portaled outside the Character panel, theme tokens are explicitly bound to the dialog for Emerald, Violet, and Rose Gold; input text and placeholder colors follow the selected palette. Labels use consistent Title Case.
- The shared `LiquidGlassLayer` lives in `renderer/src/components/ui/LiquidGlassLayer.tsx` for shared workspace panels, the app shell and gear editor. Settings uses lightweight cards without decorative glass layers.
- The November 21 calculation upgrade records renderer typecheck/build success, isolated desktop/narrow Edge smoke checks, and a passing gear-editor regression for all ten slots. Earlier missing-Playwright notes describe an older environment, not that run.

## Preservation rules

- Keep using `127.0.0.1:4317` for existing saved data. `localhost` and port 4321 are separate origins.
- Do not reset or automatically migrate browser saves. Preserve existing keys and JSON formats for Character, equipment/gear, Skills, tree, Settings, themes, and calculation context.
- Crafting history is session-only and is lost on refresh. Avoid refreshing the user's active browser when a crafting session may be in progress.
- Preserve local-first runtime behavior, source uncertainty/unsupported-mechanics notices, generated datasets, artwork, raw sources, archives, provenance, and licenses. Keep game calculations in the engine packages.
- Preserve existing uncommitted work. Do not commit or push unless asked.

## Verification boundary

The latest recorded November 21 run passed 145 Node tests, including 57 calculation-engine tests; the archived trial matched 26 fields and the archived corpus matched 288 comparisons. The PoB 2.68.1 comparison matched 190 selected values across seven fixtures. See the [reference guide](../calculation-engine/reference/v2.68.1/README.md) for commands and limits. These results supersede the migration-era 128/130 result and its two stale capture failures; they are not a fresh November 25 test run or full mechanics/release acceptance.

The original pre-migration engine/data SHA-256 baseline remains absent. Do not fabricate it or interpret later authorized engine changes as migration preservation proof. Historical browser runs remain separately recorded in [React QA](REACT-QA.md).

## Repository and release state

At the November 25 documentation review, main was clean and matched the locally recorded origin/main at 5b8b698; no remote fetch was performed. The accumulated UI and calculation work is committed. Source version is 0.3.0; the tracked installer remains 0.2.0. No 0.3.0 installer, tag or publication is established by the source version.

## Next chat

Read [README](../README.md), [renderer README](../renderer/README.md), [START-HERE](../START-HERE.md), and [NEXT-TASK](NEXT-TASK.md), then inspect `git status` before editing. Use `http://127.0.0.1:4317/#character` for the Character route; this is not a claim about an active browser session. Inspect current Git status and preserve any existing work.

## Release prep — 0.3.0

- The renderer now offers Emerald (default), Violet, and Rose Gold aurora backgrounds in Settings. The selected art updates the page background and live glass sampler together; corresponding accent, focus, and selection colors update with it. The choice is saved locally under `poe-companion.aurora-background.v1`, separately from theme/font preferences and Character saves.
- Settings uses a near-opaque dark outer dialog (94% background, no backdrop filter) and lightweight palette-tinted preference cards without LiquidGlassLayer. The Aurora background dropdown is intentionally available for future variants through the same shared SpringSelect control.
- Source PNGs live in `renderer/src/features/character/`; `renderer/dist/` contains the built renderer served by the normal local app and desktop package.
- Current source version: 0.3.0. The existing committed setup artifact remains 0.2.0 until the 0.3.0 installer is built and approved for release.
- Release checklist: build/typecheck renderer, inspect each background and accent pairing in the browser, run applicable requested checks, prepare the tagged release summary, and obtain user sign-off before pushing/tagging.
