# Application UI standardization

## Reference and current rollout

Use the current Character page as the visual reference for the React renderer. Preserve its compact Equipment workspace, statistics rail, portrait framing, and Overview and Comparison states. The main grid stacks at 1050px. Apply the same visual roles to Crafting, Skill tree, Skills, Item library, Compendium, Settings, and the shared shell while retaining each screen's layout and workflows.

The shell already selects the Aurora artwork through `App.tsx` and exposes `data-aurora`. Character sidebar glass and several palette and overlay styles are still route-scoped. Settings already uses shared glass for its preference cards. Treat the remaining adoption as rollout work. Trace the CSS cascade through `renderer/src/main.tsx`, `renderer/src/styles/index.css`, `crafting-ui/styles/tokens.css`, the generated palette, and the Character feature styles before moving rules into shared ownership.

## Live glass and Aurora

<<<<<<< HEAD
The generated `.character-glass-layer.glass-surface--svg` tint is controlled by `renderer/scripts/generate-aurora.mjs` and emitted to `renderer/src/features/character/aurora-palette.generated.css`. Its current tint stops are 11%, 8%, and 5%. Settings uses the same layer with its card-specific selector in `renderer/src/features/settings/settings.css`. Keep card base fills low enough that they do not hide the sampled backdrop, and keep text readable over the brightest background areas. When changing glass, inspect the actual rendered page and computed `backdrop-filter`; do not judge transparency from the CSS tint alone. Respect reduced-motion settings for any animated backdrop. See [renderer glass tuning](../renderer/README.md#glass-readability-and-tuning).
=======
`renderer/src/features/character/LiquidGlassLayer.tsx` composes the shared `GlassSurface`. The current wrapper uses native live backdrop sampling through the SVG-enhanced path where supported, with a frosted fallback. It supplies no backdrop texture to the WebGL path. Keep the Aurora artwork as a separate backdrop and put the decorative glass below interactive content, with inherited corners and pointer transparency.
>>>>>>> 24461cac5ed4c778d7cddd33ccf05497894e8714

The Character panel overlay uses tint stops of 11%, 8%, and 5%, with `var(--filter-id) blur(4px) saturate(112%)` on the SVG path. Its rules come from `renderer/scripts/generate-aurora.mjs` and are emitted to `renderer/src/features/character/aurora-palette.generated.css`. Edit the generator for generated values. Settings keeps a deeper dialog treatment with `blur(16px) saturate(124%)` and shallower preference cards with `blur(4px) saturate(112%)` in `features/settings/settings.css`. Check computed styles and visible contrast over light and dark parts of the backdrop, including after scrolling and changing Aurora.

Emerald is the default for absent or invalid values of `poe-companion.aurora-background.v1`. Violet and Rose Gold also have matching accent roles. Keep that preference separate from the existing theme, font and build saves. During rollout, make the selected Aurora drive the shared backdrop, glass chrome and default interaction accents, and keep existing theme and font choices effective in their applicable roles. Verify both change orders and reload. Keep dialogs, definition popovers and SpringSelect menus correctly themed even when they render through a portal or in the browser's top layer.

## Shared design and behavior

Read the effective styles from Character's shell, overview, identity editor, gear editor, and overlays. Map typography, padding, gaps, radii, control heights, borders, shadows and interaction states by role. The Character glass panels use 12px corners, while the gear editor's main inputs use 40px height and 8px corners. Keep room for denser controls and for screen-specific layouts. Preserve item rarity and gem colors, artwork, tree symbols and game-reference card treatments.

Reuse the shared controls and Lucide icons. SpringSelect retains its native select events, keyboard navigation, search and selection feedback. SpringDisclosure and Plan Switch retain their existing motion. Dialogs retain opener-based entry motion, focus restoration, and nested Escape handling. Check both OS and in-app reduced motion. Give shared shell, token, glass and control changes a single owner, keep route composition in feature code, and review Character fidelity before broad adoption.

| Surface | Behavior to preserve |
| --- | --- |
| Character | Identity and progression, portraits, combat assumptions, gear drafts, resistance sources, and compare/equip |
| Crafting | Seeded replay, RNG restoration on undo, session history, spending, worker odds, and compare/equip |
| Skill tree | Pan, zoom and fit, search and highlighting, allocation and refunds, masteries, class-specific saves, and export |
| Skills | Group editing, filters, support compatibility, inspectors, and the Character calculation handoff |
| Item library | Cascading filters, variants, inspector focus, item metadata, and compare/equip |
| Compendium | Collections, search, variants, effect details, definitions, and source links |
| Settings and shell | Immediate appearance changes, scoped resets, navigation and aliases, dialog focus, and local saves |

Keep the mounted route lifecycle, `workspace:change` panel IDs, `build:change`, and the Skills calculation and item comparison handoffs. Keep the normal app at `127.0.0.1:4317` with existing save keys and formats.

<<<<<<< HEAD
- Character’s Equipment surface defines the thin workspace panel, with 12px corners, a 14px/34px shadow and neutral foreground, secondary and muted text. Its editors define 40px fields, 8px corners, 13px field text, 12px labels, 6px label gaps and a 2px focus outline. Compact controls use 34px height. The shell retains 36px desktop navigation. Repeated catalog rows and semantic cards retain their own density.
- Character remains theme-invariant to preserve reference fidelity. Other screens retain saved theme/font overrides. No existing light theme exists; validate the actual 11 palettes rather than inventing another aesthetic.
- Preserve unique/item/gem semantic palettes, tree category meanings, data-rich tooltips and artwork/provenance.
- Reuse spring dropdown, disclosure, bubble-dialog and browser-managed Plan Switch motion; preserve native event contracts, backdrop/Escape handling and reduced motion.
- Existing Character-only isolation expectations must become explicit rollout checks, without removing Character fidelity or functional coverage.
=======
## Verification
>>>>>>> 24461cac5ed4c778d7cddd33ccf05497894e8714

Capture Character before changing shared styles. Compare the same fixture and states before and after, using the same browser version, viewport and preferences. Then compare equivalent components on each migrated route with Character using screenshots and computed styles. Include desktop and narrow views, all three Auroras, the responsive boundaries, a scrolled view, populated equipment, dialogs, and open dropdowns. Verify keyboard and focus behavior, text contrast, reduced motion, glass fallback, absence of page-width overflow, and local-only requests. Use isolated ports and storage and keep captures away from historical QA artifacts.

<<<<<<< HEAD
Pre-change baseline: all 130 Node regressions passed. Initial sandbox execution passed 128 and denied loopback access for two HTTP tests; rerunning with loopback permission passed all 130. Browser verification uses ephemeral servers and isolated storage, never the active user session. Further results and independent findings are recorded as implementation completes.

React migration's latest feature-level QA is recorded in REACT-QA.md. The six-screen renderer checks and focused workflows pass, but its original ignored engine/data hash manifest is missing, two current PoB capture checks are stale, and independent post-fix review remains open. The React preview has not replaced the existing application entrypoint.

### Aurora theme variants

The Character backdrop choice is independent from the color-theme and font controls. The local preference key is `poe-companion.aurora-background.v1`; absent or invalid values use Emerald. Each bundled background must keep the established quantized, dithered aurora treatment and its flowing base pattern, while its interface accents and focus/selection colors remain readable and coordinated with the selected palette. Update the generated palette roles and shell backdrop together, then verify the Character page, Settings dialog, sidebar, dropdowns, and live glass sampling for all three choices. Do not couple a background choice to theme/font selection or write to Character/build save data.

Settings uses the same shared `SpringSelect` dropdown as the rest of the app. Keep changes to its outer glass container and inner preference cards distinguishable, maintain live backdrop sampling, and verify contrast against each available aurora.
=======
Regenerate the palette with `pnpm generate:aurora` when generator-owned rules change. Run the renderer typecheck and build, rebuild the tracked `renderer/dist/`, and run the applicable app regression, colocated renderer, and React browser checks. Use the existing visual sweep, foundation, theme, storage and feature QA scripts as applicable. Record current outcomes separately from the historical runs and known PoB capture and preservation-baseline gaps in [React QA](REACT-QA.md).
>>>>>>> 24461cac5ed4c778d7cddd33ccf05497894e8714
