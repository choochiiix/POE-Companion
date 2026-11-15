# React migration QA

Status: **targeted post-review checks pass; migration is not accepted for release**. Checks use the isolated React renderer, temporary local servers, and fresh browser profiles. They do not connect to or reset the user's live origin or saves.

## Current blockers and preservation

- The requested SHA-256 comparison cannot run: `.validation/react-engines-before.json` is absent from this isolated worktree, and `scripts/check-react-engine-preservation.mjs` exits with `ENOENT`. The user chose to leave the check blocked rather than stage a copy; the manifest was not recreated. The current diff contains no engine/data paths, but this does not prove equality to the pre-migration baseline.
- Full Node regression rerun after these fixes: **128/130**. The failures are unchanged: `sixteen independent pinned PoB builds match 288 intermediate/final comparisons` throws `Stale corpus tooling` from `calculation-engine/corpus/run.ts:14`, and `local source adapters match 26 fields from an actually executed pinned PoB build` throws `Reference tooling changed; recapture PoB trial` from `calculation-engine/trial/run.ts:12`. The other 128 tests pass, including route-alias/import validation and local engine-serving restrictions. No engine/data changes were made to bypass the stale captures.
- The legacy `crafting-ui/index.html` entrypoint and existing runtime remain unchanged. The renderer is still an isolated preview at `renderer/server.mjs`; no automatic save migration occurred.
- Independent post-fix QA is being coordinated separately; final findings are pending. Only entries marked **Retested** below ran in this latest round; earlier passing results are labeled **Prior pass** and are not the independent review.
- The renderer typecheck and production build passed after the latest UI/test changes. The Crafting, Items, and visual-sweep browser suites were rerun and passed. The Settings screenshot was refreshed after verifying the dialog contains exactly one Settings heading.

## Browser results

The latest review fixes were checked against the rebuilt renderer with the Crafting, Items and visual-sweep browser suites. The other results below are from the preceding successful browser run and were not repeated this round.

| Check | Latest status | Evidence |
| --- | --- | --- |
| `test-react-spring-select-qa.mjs` | Prior pass | Pointer/keyboard selection, Home/End/typeahead, single active menu, reduced-motion visibility, nested Escape, focus return and adapter cleanup. Asserts native select text remains hidden beneath the value overlay. |
| `test-react-gear-worker.mjs` | Prior pass | Gear draft discard, validated affix save/equip/card, seeded RNG replay/undo, worker odds and non-mutating spend. |
| `test-react-crafting-qa.mjs` | Retested | Captures the exact payload sent to the odds worker, recomputes it on the main thread with the worker's `SeededRng(2026)`, `maxNodes: 2000`, and identical sample count, then asserts the displayed probability, method and confidence interval/outcome count agree. Odds do not mutate RNG; history and undo work. |
| `test-react-items-qa.mjs` | Retested | Asserts Tabula Rasa is compared in `body-armour`, `energyShield` changes from 0 to 17 (+17), then equips it and verifies the handoff/save. |
| `test-react-tree-qa.mjs` | Prior pass | Mastery allocation/save/undo and independent Marauder/Ranger tree saves. |
| `test-react-storage-qa.mjs` | Prior pass | Under write-only and read/write denial, Ranger level 42 and gear remain in session memory; equipped base changes calculated defence. |
| `test-react-theme-qa.mjs` | Prior pass | All 11 palettes and 5 font styles; item/gem reference colors stay fixed. |
| `test-react-foundation-qa.mjs` | Prior pass | Six-page mobile navigation, Settings as a modal, Escape/backdrop/focus, drag-from-inside protection, overflow and no external requests. |
| `test-react-wave-qa.mjs` | Prior pass | Skills-to-Character calculation handoff and Compendium workflow without page errors. |
| `test-react-plan-switch.mjs` | Prior pass | Stopped-rAF settlement, reversals, unmount/remount, keyboard and reduced motion. |
| `test-react-screens-qa.mjs` | Prior pass | Six screens at desktop/mobile sizes without horizontal overflow, page errors or external requests. |
| `test-react-visual-sweep.mjs` | Retested | Six screens at desktop/mobile sizes without horizontal overflow, page errors or external requests. Character class dropdown End/Enter, confirmation, nested Escape and Settings modal passed; the refreshed Settings capture has one heading. |
| `test-spring-dropdown-ui.mjs`, `test-dialog-backdrop-ui.mjs` | Prior pass | Existing legacy dropdown (including hidden native-label layering) and all five legacy modal backdrop/draft/focus flows remain functional after shared adapter changes. |

Renderer `tsc --noEmit` and Vite production build passed. Visual captures were inspected at `docs/previews/react-migration/final/`; the dropdown and Settings captures wait for animations to settle. The screenshots are representative viewport captures, not a review of every scroll position.

## Acceptance boundary

Tested flows cover the migration findings that were previously open: Character progression/gear drafts, deterministic crafting replay and odds, Items compare/equip, mastery/class-specific tree saves, palettes and fixed card colors, dialog/backdrop/focus, storage-denied behavior, reduced motion and responsive overflow. Automated checks and representative captures do not establish full PoB mechanics parity, full visual equivalence, or release acceptance.

The React preview already runs on the existing local backend: `renderer/server.mjs` serves `renderer/dist` and delegates non-renderer requests to the `makeServer()` handler in `crafting-ui/server.mjs`, which serves the existing data, engine-module and artwork routes. The normal launcher is still the legacy UI at `crafting-ui/index.html`; it is not yet using React at the default origin. Do not cut over: the user elected to leave the authentic engine/data SHA comparison blocked, the two PoB reference-capture tests still fail as described above, and independent post-fix QA is pending. A safe cutover candidate is to serve only the built React entry/assets from the existing launcher server while retaining all existing backend routes/aliases and the `127.0.0.1:4317` origin; validate same-origin save reads, route behavior and rollback before switching. Switching now requires the user's explicit decision to waive those open acceptance gates; otherwise leave the legacy launcher unchanged.
