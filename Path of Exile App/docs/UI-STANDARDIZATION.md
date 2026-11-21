# Application UI standardization

## Canonical reference and scope

The November 14, 2026 application-wide task supersedes the prior Character-only rollout restriction. The current Character page is the canonical reference, including its later compact density and softened motion refinements. Preserve its exact composition, portrait framing, interactions and fixed game colors.

### Live glass standard

Glass surfaces use the shared `LiquidGlassLayer` / `GlassSurface` structure and native `backdrop-filter` blur, so each layer samples the browser's currently rendered pixels directly behind its bounds. Keep the page background (including the Character aurora image) as a separate, replaceable backdrop; do not copy it into a WebGL texture or bake it into a card. The backdrop may be a bitmap, video, animation, or other page content: the glass samples whatever is rendered there at that moment.

The generated `.character-glass-layer.glass-surface--svg` tint is controlled by `renderer/scripts/generate-aurora.mjs` and emitted to `renderer/src/features/character/aurora-palette.generated.css`. Its current tint stops are 11%, 8%, and 5%. Settings uses the same layer with its card-specific selector in `renderer/src/features/settings/settings.css`. Keep card base fills low enough that they do not hide the sampled backdrop, and keep text readable over the brightest background areas. When changing glass, inspect the actual rendered page and computed `backdrop-filter`; do not judge transparency from the CSS tint alone. Respect reduced-motion settings for any animated backdrop. See [renderer glass tuning](../renderer/README.md#glass-readability-and-tuning).

The React renderer is served locally by the app and uses feature-owned CSS, shared controls, independent calculation/crafting engines, and offline datasets. Aurora background preferences remain local and separate from character/build saves.

## Inventory and ownership

| Area | Existing behavior to preserve | Owner |
| --- | --- | --- |
| Character/reference | Identity/editor, progression sync, comparison, gear drafts, portraits, spring motion | Sol foundation |
| Shared foundation/shell | Tokens, navigation, theme persistence, controls, overlays, focus, reduced motion | Sol foundation |
| Skills | Group CRUD, filters, supports, compatibility, inspectors, calculation handoff | Sol migration |
| Item library | Cascading filters, variants, inspectors, compare/equip, complete metadata | Sol migration |
| Compendium | Collections, search, effects, definitions, variants, sources/licenses | Sol migration |
| Crafting | Seeded operations, undo/RNG, session history, spending, worker odds, compare/equip | Sol foundation |
| Skill tree | Pan/zoom, search, paths/refunds, masteries, class-specific saves, export | Sol foundation |
| Settings | Immediate preferences, all 11 palettes/fonts, density/text/motion, scoped reset | Sol foundation |
| Independent review | Foundation gate, waves, integration and additional post-fix pass | Terra QA |

Shared ownership: foundation owns tokens/global styles, shared motion, Character, shell/index and route registration. Migration owns skills/items/compendium views plus shared library-layout/workbench. Coordinate shared contract changes through foundation. Models, engines, adapters, workers, raw datasets, archives, artwork, licenses and route aliases are preserved.

## Plan and acceptance gates

1. Audit before changes; extract only reusable Character conventions. Foundation primitives cover compact surfaces, typography, controls, navigation, dialogs and existing spring utilities. Keep page-specific compositions and game-reference cards feature-owned.
2. Terra reviews shared infrastructure and isolated Character fidelity before broad migration.
3. Parallel migration: library-oriented screens and specialized Crafting/tree/Settings. Preserve workflows and information architecture; do not force identical layouts.
4. Terra reviews waves with actionable severity/ownership/evidence. Owners correct issues and Terra rechecks.
5. Cross-screen functional, visual, responsive, theme, keyboard, overflow and motion verification, followed by another independent review after fixes. Do not mark complete with known critical/major issues.

## Design decisions

- Character’s Equipment surface defines the thin workspace panel, with 12px corners, a 14px/34px shadow and neutral foreground, secondary and muted text. Its editors define 40px fields, 8px corners, 13px field text, 12px labels, 6px label gaps and a 2px focus outline. Compact controls use 34px height. The shell retains 36px desktop navigation. Repeated catalog rows and semantic cards retain their own density.
- Character remains theme-invariant to preserve reference fidelity. Other screens retain saved theme/font overrides. No existing light theme exists; validate the actual 11 palettes rather than inventing another aesthetic.
- Preserve unique/item/gem semantic palettes, tree category meanings, data-rich tooltips and artwork/provenance.
- Reuse spring dropdown, disclosure, bubble-dialog and browser-managed Plan Switch motion; preserve native event contracts, backdrop/Escape handling and reduced motion.
- Existing Character-only isolation expectations must become explicit rollout checks, without removing Character fidelity or functional coverage.

## Verification record

Pre-change baseline: all 130 Node regressions passed. Initial sandbox execution passed 128 and denied loopback access for two HTTP tests; rerunning with loopback permission passed all 130. Browser verification uses ephemeral servers and isolated storage, never the active user session. Further results and independent findings are recorded as implementation completes.

React migration's latest feature-level QA is recorded in REACT-QA.md. The six-screen renderer checks and focused workflows pass, but its original ignored engine/data hash manifest is missing, two current PoB capture checks are stale, and independent post-fix review remains open. The React preview has not replaced the existing application entrypoint.

### Aurora theme variants

The Character backdrop choice is independent from the color-theme and font controls. The local preference key is `poe-companion.aurora-background.v1`; absent or invalid values use Emerald. Each bundled background must keep the established quantized, dithered aurora treatment and its flowing base pattern, while its interface accents and focus/selection colors remain readable and coordinated with the selected palette. Update the generated palette roles and shell backdrop together, then verify the Character page, Settings dialog, sidebar, dropdowns, and live glass sampling for all three choices. Do not couple a background choice to theme/font selection or write to Character/build save data.

Settings uses the same shared `SpringSelect` dropdown as the rest of the app. Keep changes to its outer glass container and inner preference cards distinguishable, maintain live backdrop sampling, and verify contrast against each available aurora.
