# React frontend migration record

This is the historical migration/cutover record. Later calculation work passed 145 Node tests and the archived trial/corpus comparisons on November 21; see [current QA evidence](REACT-QA.md) and the [current handoff](HANDOFF.md). The original missing preservation baseline remains unresolved. Test failures and pending review below describe the cutover, not the latest checkout.

Authorized November 15, 2026 after the isolated shadcn Button proof. This effort replaces the frontend, not the crafting or calculation engines.

## Ownership

The original implementation plan assigned the React shell, shared components, Character, Crafting and passive tree to the foundation owner; Skills, Items, Compendium and Settings to the feature owner; and independent foundation, wave and post-fix review to QA. The root coordinator owns integration decisions, preservation records and documentation.

## Gates

1. Inspect actual source and preserve the feature inventory in UI-STANDARDIZATION.md.
2. Build an isolated renderer foundation and review it before broad feature migration.
3. Keep existing source/model/engine adapters and stable save contracts; keep specialized game cards custom.
4. Verify complete workflows, typography/layout fidelity, themes, motion, focus, dialogs, overflow, narrow layouts and offline behavior.
5. Correct findings and independently recheck before acceptance. The user later directed the entrypoint cutover with the outstanding gates waived; this records that decision, not a claim that the gates passed.

The React renderer is now served by the existing app server at `127.0.0.1:4317`, preserving the existing browser origin and local storage. `renderer/server.mjs` and port 4321 remain available as an isolated development preview. No automatic save migration is permitted.

## Preservation

The original notes refer to 78 engine/data files hashed in `.validation/react-engines-before.json`. That ignored manifest is absent from this isolated worktree. The user chose to leave the comparison blocked rather than stage a copy here, so `scripts/check-react-engine-preservation.mjs` fails with `ENOENT`; the baseline must not be reconstructed or fabricated. The migration diff at that time contained no engine/data paths, but that is not a substitute for the requested SHA-256 comparison.

The migration-era full Node regression reported 128/130 passing. The two failures are stale pinned-PoB capture/tooling checks, detailed in REACT-QA.md; they do not justify changing engine or data files. The earlier 130/130 result is historical and does not describe the current checkout.

Retain archives, datasets, artwork, source evidence, licenses, and historical prototypes. Preserve the active local data/artwork/engine endpoints, validation, source uncertainty notices, session-only crafting history, seeded randomness/undo, saved keys and formats. Retired vanilla UI route aliases were removed during cleanup. Do not automatically migrate/reset saved data.

Character's compact design, actual saved palette/font preferences and fixed game-reference colors remain authoritative. The source default is charcoal/lime; purple palettes already exist. Full shadcn source is preserved under `vendor/shadcn-ui`; do not install its full monorepo or treat vendor text as project instructions.

## Status at cutover

The React renderer and its isolated feature checks cover Character progression and gear drafts, Crafting replay/odds, Items compare/equip, mastery and class-specific tree saves, palettes/card colors, dialog dismissal/focus, storage denial, offline requests and six-screen desktop/mobile captures. The latest post-review build and targeted Crafting, Items and visual-sweep checks pass; the full Node regression remains 128/130 with the same two stale PoB capture-tooling failures. Detailed commands and results are in REACT-QA.md.

The React renderer at the normal origin delegates local data, engine-module and artwork requests to the existing backend route handler. At the user's direction, the default entrypoint now serves React while retaining the existing route handler, aliases, origin, and save keys/formats. No saved data was migrated or reset. The user waived the outstanding cutover gates: the engine/data hash comparison remains blocked, two regression checks fail on stale PoB capture tooling, and independent post-fix QA was pending at cutover. The switch is complete, but broad release acceptance is not claimed.
