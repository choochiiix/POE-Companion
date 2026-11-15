# Current handoff — November 14, 2026

All requested work is complete. The user asked to tidy, wrap up and move to a new chat in preparation for a major task. Its scope has not been provided. Read this and NEXT-TASK.md, acknowledge readiness, then wait. Do not invent work, refresh the browser, rebuild data or start a migration.

## Workspace and runtime

- Only root: C:/Users/wshan/Documents/ChatGPT/Path of Exile App. No Git repository; do not initialize one, create a worktree or copy the project.
- Existing app: http://127.0.0.1:4317/. Last verified project server: process22132, running Node crafting-ui/server.mjs. Always verify listener/process command before stopping it. Source/CSS edits generally need browser refresh; new routes require restart.
- Reloading clears session-only crafting history. Do not casually refresh the user's browser. localhost and127.0.0.1 have different persistent storage; stay on the existing origin.
- Bundled runtime: C:/Program Files/WindowsApps/OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt/dependencies/. Node: node/bin/node.exe; Python: python/python.exe; Playwright: node/node_modules/playwright. Browser scripts use PLAYWRIGHT_MODULE and headless Edge. Local HTTP/browser tests may require elevated execution. No dependencies added; tsc remains unavailable.

## Current UI and user preferences

Only Character has been redesigned. The user first required docs/ui-overhaul/references/DESIGN.md (Linear reference) and supplied compendium screenshots; later explicit requests refined that specification. Preserve the result, not the rejected first cosmetic pass or older body-slot layout.

- Compact, neutral dark surfaces, small controls, restrained type, narrow dividers, modest corners and lime primary action. User dislikes large/blocky panels and violent motion. Do not spread this design to other screens without instruction.
- Current Character: artwork-backed identity header; spring overview/comparison switch; core stats, attributes and breakdown on the left, compact equipment list on the right; resistances and skill setup below.
- Selected ascendancy has a portrait and faded banner. Seven real base-class face portraits and18 dedicated ascendancy icons replace miniature emblems/discs; Warden uses its own archived art, never Raider. Ascendant's archive disc is blank, so its real portrait is used. Reliquarian/Luminary have no matching art and use documented base-class fallback. All19 available banners were reviewed individually.
- Edit character is a bubble-animated modal with image dropdowns for class/ascendancy, level1–100 and campaign penalty. Level/penalty share existing calculation context and synchronize with Combat assumptions. Original saves stay unchanged. Class/ascendancy trees keep separate selections.
- Plan Switch uses source spring samples via Element.animate, not a live requestAnimationFrame loop. This fixes crawling/stalls when the embedded browser throttles frames. Resting transform is always the selected view; rapid reversals and stopped-rAF behavior are tested.
- Spring dropdowns have gentle paired lift, rolling values, staggered rows, check animation and hover highlight. User explicitly softened source damping/travel. Scrollbars are hidden while long lists remain searchable/scrollable. One active menu at a time; interrupted label rolls settle. Native select/input/change contracts are retained.
- Equipment disclosures open/close on a softened spring. Item cards use UI-fitting typography, simple rarity edge and compact readable metadata. Every property, base requirement, implicit, explicit and source note remains. Normal/magic/rare/property/modifier colors stay fixed across themes; unique-library styling is preserved.
- All native modal dialogs dismiss on backdrop click through the Escape/cancel pathway; inside clicks and inside-to-outside drags do not dismiss. Gear drafts are discarded without saving. Focus returns to opener. Existing auto-saved settings/context keep their immediate-apply behavior.
- Respect reduced motion, keyboard behavior, narrow layout, forced colors and offline runtime.

## Code ownership

- crafting-ui/features/character/character-workspace.js and character-workspace.css own Character composition/pilot styles. character.js owns class/equipment state; character-data.js maps validated names to local portraits.
- gear-model.js uses actual crafting-engine modPool validation; gear-editor.js owns manual gear drafts/cards/modal.
- crafting-ui/features/calculations/calculations.js owns context, values, breakdowns and compare/equip actions; source-adapter.js assembles engine input. Pure formulas stay in calculation-engine/.
- crafting-ui/shared/ui/plan-switch.js owns browser-managed view-switch animation. spring-dropdown.js owns enhanced selects, inline equipment disclosures and bubble modal animation. dom.js installs one delegated backdrop-dismiss handler per document.
- server.mjs serves the app/engine/data/artwork; server/routes.mjs explicitly maps UI modules and preserves aliases.
- assets/classes/ and assets/ascendancies/ contain preserved unmodified art plus source notes and hash manifests. New portrait PNGs are cached from the original reference image links on PoEDB; full archive artwork/emblems remain. No generated or runtime-downloaded art.

## Preservation and calculation limits

Keep all archives, raw sources, data, artwork, licenses, historical prototypes and URL aliases. Preserve original character/equipment/tree/skills/settings/theme keys. Manual gear remains poe-companion.gear.v1; base equipment remains poe-companion.equipment.v1; level/penalty/context/overrides remain poe-companion.calculation.v1. Do not reset or migrate the user's data without a concrete need.

Live calculations connect class, gear, selected passives/masteries and saved skills. Skills Calculate this group and Crafting/library compare/equip work.16 pinned PoB build fixtures match288 selected comparisons plus the original26-value trial; full PoB parity is NOT achieved. Unsupported skills/effects remain Pending/diagnostic. Do not imply complete weapon/special/ailment/resource coverage.

## Verification and previews

Root package.json defines the130-test Node regression suite. Focused browser suites cover the editor, dropdowns, motion, backdrop, artwork and cross-screen calculations. See NEXT-TASK.md for verification entrypoints and the wrap-up results; previous counts in root README are historical. Tests use isolated browser storage and temporary local servers, not the user's active session.

Current visual references: docs/previews/portrait-crop-review.png (seven base classes +19 ascendancy icon comparisons), ascendancy-banner-review.png (all19 headers), ascendancy-review/ (individual headers), character-editor-progression.png and character-class-dropdown.png. These are test builds, not the user's saved values.

Detailed evolution: docs/ui-overhaul/CHARACTER-PILOT.md. Earlier handoff preserved in docs/archive/HANDOFF-before-major-task-2026-11-14.md; it is historical and contains superseded layouts/counts.
