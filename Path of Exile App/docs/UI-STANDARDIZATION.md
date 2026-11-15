# Application UI standardization

## Canonical reference and scope

The November 14, 2026 application-wide task supersedes the prior Character-only rollout restriction. The current Character page is the canonical reference, including its later compact density and softened motion refinements. Preserve its exact composition, portrait framing, interactions and fixed game colors.

This is a native ES-module application with feature-owned CSS, explicit server route allowlists, shared DOM/layout utilities, independent calculation/crafting engines and local offline datasets. There is no Git repository. No new dependencies, data rebuilds, save migrations, live browser refreshes or service restarts are part of this rollout.

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

- Reference neutral canvas/surfaces, lime accent, local Inter/system typography, compact rows, 16px panel padding and 6px corners establish defaults.
- Character remains theme-invariant to preserve reference fidelity. Other screens retain saved theme/font overrides. No existing light theme exists; validate the actual 11 palettes rather than inventing another aesthetic.
- Preserve unique/item/gem semantic palettes, tree category meanings, data-rich tooltips and artwork/provenance.
- Reuse spring dropdown, disclosure, bubble-dialog and browser-managed Plan Switch motion; preserve native event contracts, backdrop/Escape handling and reduced motion.
- Existing Character-only isolation expectations must become explicit rollout checks, without removing Character fidelity or functional coverage.

## Verification record

Pre-change baseline: all 130 Node regressions passed. Initial sandbox execution passed 128 and denied loopback access for two HTTP tests; rerunning with loopback permission passed all 130. Browser verification uses ephemeral servers and isolated storage, never the active user session. Further results and independent findings are recorded as implementation completes.
