# Preparation for the next major task

Status: ready. The user has not supplied the next task yet. Read HANDOFF.md, acknowledge readiness and await scope. Do not implement speculative features or automatically roll out the Character pilot across the app.

## Start once the task is supplied

1. Identify the affected feature and existing models, routes, save keys and source assets. Read feature documentation before editing.
2. Keep presentation in feature/shared UI modules and mechanics in existing engines. Reuse validated crafting/calculation adapters.
3. Preserve saves, offline behavior and all archives/artwork/provenance. Avoid browser reload while a crafting session may be active.
4. For a major visual change, make the design concrete and reviewable using local previews; apply the user's latest approved direction and scope.
5. Run the affected checks. Report material unsupported behavior honestly; do not turn selected parity tests into a broad PoB claim.

## Verification entrypoints

- Full Node regression: node --experimental-strip-types --test crafting-engine/test/*.test.ts crafting-data/test/*.test.ts crafting-ui/test/*.test.mjs calculation-engine/test/*.test.ts
- Character editor/progression: scripts/test-character-editor-ui.mjs
- Artwork selection/mobile: scripts/test-character-art-ui.mjs
- All classes/ascendancy portrait and banner review: scripts/test-portrait-review-ui.mjs
- Icon contact sheet: scripts/preview-portrait-crops.mjs (review renderer, not a mechanics test)
- Plan switch with deliberately stopped rAF, disclosure reversal/card preservation: scripts/test-character-motion-ui.mjs
- Dropdown pointer/keyboard/search/mobile: scripts/test-spring-dropdown-ui.mjs
- All modal backdrops/draft isolation/focus: scripts/test-dialog-backdrop-ui.mjs
- Existing cross-screen calculations: scripts/test-calculations-ui.mjs
- Existing gear editor/themes: scripts/test-gear-editor-ui.mjs and scripts/test-gear-themes-ui.mjs

Set PLAYWRIGHT_MODULE to the bundled runtime's node/node_modules/playwright. Use installed Edge headless. These scripts create isolated servers/profiles; do not run against or reset the user's live saves. Static tsc remains unavailable.

## Wrap-up checkpoint

Final results are recorded here after the tidy checks. Baseline feature-specific checks already passed all7 base-class selections,19 available ascendancy headers, missing-art fallbacks, editor level/penalty validation and synchronization, persistence/mobile behavior, artwork source hashes and local-only requests. No new major task is underway.

Final wrap-up checks on November14,2026: all130 Node tests passed; Character editor/progression, motion with stopped-rAF, all five modal backdrops, current document links and every class/ascendancy asset hash manifest passed. Existing artwork, dropdown and cross-screen calculation checks passed during the completed icon/editor work. Full portrait gallery recheck is recorded below after completion. Local server process22132 was reverified without stopping/reloading it. No dependency installs, data rebuilds, save migrations or user-browser refresh occurred during wrap-up.

Final full portrait sweep also passed after preview-route cleanup: seven base classes,19 available ascendancy headers, all image requests successful, correct missing-art fallbacks and refreshed review captures. Wrap-up complete; await the next major task.
