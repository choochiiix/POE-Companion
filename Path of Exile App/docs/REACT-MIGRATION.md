# React frontend migration

Authorized November 15, 2026 after the isolated shadcn Button proof. This effort replaces the frontend, not the crafting or calculation engines.

## Ownership

The original implementation plan assigned the React shell, shared components, Character, Crafting and passive tree to the foundation owner; Skills, Items, Compendium and Settings to the feature owner; and independent foundation, wave and post-fix review to QA. The root coordinator owns integration decisions, preservation records and documentation.

## Gates

1. Inspect actual source and preserve the feature inventory in UI-STANDARDIZATION.md.
2. Build an isolated renderer foundation and review it before broad feature migration.
3. Keep existing source/model/engine adapters and stable save contracts; keep specialized game cards custom.
4. Verify complete workflows, typography/layout fidelity, themes, motion, focus, dialogs, overflow, narrow layouts and offline behavior.
5. Correct findings and independently recheck. Do not switch the existing app entrypoint until equivalent workflows and integration checks pass.

The React renderer remains at a separate origin, served by `renderer/server.mjs`; the existing app entrypoint and runtime remain unchanged. Browser checks use isolated profiles and storage. Localhost and 127.0.0.1 have separate storage, and a port change changes origin. No automatic save migration is permitted.

## Preservation

The original notes refer to 78 engine/data files hashed in `.validation/react-engines-before.json`. That ignored manifest is absent from this isolated worktree. The user chose to leave the comparison blocked rather than stage a copy here, so `scripts/check-react-engine-preservation.mjs` fails with `ENOENT`; the baseline must not be reconstructed or fabricated. The current migration diff contains no engine/data paths, but that is not a substitute for the requested SHA-256 comparison.

The current full Node regression reports 128/130 passing. The two failures are stale pinned-PoB capture/tooling checks, detailed in REACT-QA.md; they do not justify changing engine or data files. The earlier 130/130 result is historical and does not describe the current checkout.

Retain archives, datasets, artwork, source evidence, licenses, historical prototypes and route aliases. Existing validation, source uncertainty notices, session-only crafting history, seeded randomness/undo, saved keys and formats remain authoritative. Do not automatically migrate/reset saved data.

Character's compact design, actual saved palette/font preferences and fixed game-reference colors remain authoritative. The source default is charcoal/lime; purple palettes already exist. Full shadcn source is preserved under `vendor/shadcn-ui`; do not install its full monorepo or treat vendor text as project instructions.

## Current status

The React renderer and its isolated feature checks cover Character progression and gear drafts, Crafting replay/odds, Items compare/equip, mastery and class-specific tree saves, palettes/card colors, dialog dismissal/focus, storage denial, offline requests and six-screen desktop/mobile captures. The latest post-review build and targeted Crafting, Items and visual-sweep checks pass; the full Node regression remains 128/130 with the same two stale PoB capture-tooling failures. Detailed commands and results are in REACT-QA.md.

The React preview already delegates local data, engine-module and artwork requests to the existing backend route handler. Migration acceptance is **not closed**: the required engine/data hash comparison is user-elected blocked, two regression checks fail on stale capture tooling, and the independent post-fix QA pass is in progress with results pending. The legacy launcher still serves `crafting-ui/index.html`; it has not been switched, no saved data was migrated, and no release acceptance is claimed. A same-origin cutover must retain the existing route handler, aliases and origin, and requires an explicit user decision to waive the open gates or wait until they are resolved.
