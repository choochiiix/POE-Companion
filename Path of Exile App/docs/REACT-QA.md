# React QA evidence

## Latest recorded verification — November 21, 2026

The calculation upgrade records **145 passing Node tests**, including 57 calculation-engine tests, 190 selected matching PoB Community 2.68.1 values across seven fixtures, and passing archived trial/corpus comparisons (26 fields / 288 comparisons). Renderer typecheck/build, isolated Edge smoke at 1440px and 390px, and the ten-slot gear-editor regression passed. See the [reproduction and coverage guide](../calculation-engine/reference/v2.68.1/README.md). These recorded results supersede the stale capture failures below; no fresh execution is claimed by this documentation update.

The original migration SHA baseline remains missing. Later calculation changes intentionally modify engines, so current files cannot establish equality to the pre-migration state. Broad release acceptance and full PoB parity remain unclaimed.

## Historical migration QA

Status: **React is now the default UI; broad release acceptance is not claimed**. The user directed the same-origin cutover with open acceptance gates waived. Historical checks below use isolated React builds, temporary local servers, and fresh browser profiles. The vanilla screen code and its browser scripts were removed after those runs; the full Node suite had not yet been rerun after cleanup at the time of this record.

## Migration-era blockers and preservation

- The requested SHA-256 comparison cannot run: `.validation/react-engines-before.json` is absent from this isolated worktree, and `scripts/check-react-engine-preservation.mjs` exits with `ENOENT`. The user chose to leave the check blocked rather than stage a copy; the manifest was not recreated. The migration diff at that time contained no engine/data paths, but this does not prove equality to the pre-migration baseline.
- Full Node regression rerun after these fixes: **128/130**. The failures are unchanged: `sixteen independent pinned PoB builds match 288 intermediate/final comparisons` throws `Stale corpus tooling` from `calculation-engine/corpus/run.ts:14`, and `local source adapters match 26 fields from an actually executed pinned PoB build` throws `Reference tooling changed; recapture PoB trial` from `calculation-engine/trial/run.ts:12`. The other 128 tests pass, including route-alias/import validation and local engine-serving restrictions. No engine/data changes were made to bypass the stale captures.
- The normal entrypoint in `crafting-ui/server.mjs` serves `renderer/dist` at the established `127.0.0.1:4317` origin. The standalone renderer server remains at port 4321. No automatic save migration occurred.
- Independent post-fix QA was pending at cutover. Only entries marked **Retested** ran in the latest documented QA round; earlier passing results are labeled **Prior pass** and are not the independent review.
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
| Retired legacy dropdown/dialog checks | Historical pass; scripts removed | Covered the previous vanilla interface only and are no longer part of the current frontend workflow. |

Renderer `tsc --noEmit` and Vite production build passed. Visual captures were inspected at `docs/previews/react-migration/final/`; the dropdown and Settings captures wait for animations to settle. The screenshots are representative viewport captures, not a review of every scroll position.

## Acceptance boundary

Tested flows cover the migration findings that were previously open: Character progression/gear drafts, deterministic crafting replay and odds, Items compare/equip, mastery/class-specific tree saves, palettes and fixed card colors, dialog/backdrop/focus, storage-denied behavior, reduced motion and responsive overflow. Automated checks and representative captures do not establish full PoB mechanics parity, full visual equivalence, or release acceptance.

The normal launcher now serves the built React entry and assets from `renderer/dist` at the existing `127.0.0.1:4317` origin. Other requests go through the narrow data, engine-source, and artwork routes in `crafting-ui/server.mjs`; legacy screen-module aliases were removed. The user directed this cutover and waived its outstanding gates. The engine/data SHA comparison remains blocked, the two PoB reference-capture checks were stale in the migration-era run, and independent post-fix QA was pending at cutover. Existing save keys and formats were retained; no save migration or reset occurred. The cutover was manually confirmed in the browser, but the open gates mean broad release acceptance is not claimed.

## Character Defence verification — November 25, 2026

Fresh verification for the Defence addition (separate from the historical migration evidence): app engine/data typechecks and renderer typecheck passed; the production renderer was rebuilt. Full Node regression passed 145/145 with loopback access. The initial sandbox run passed 143/145, with the two server tests blocked by loopback EACCES; both passed on rerun. Vite retained its existing module-directive and bundle-size warnings.

The focused browser check is `node scripts/test-react-character-defence-qa.mjs`, with `PLAYWRIGHT_MODULE` pointing to an available Playwright module. It uses headless Edge, an ephemeral server port and isolated browser storage. Captures belong under ignored `.validation/character-defence/`, preserving historical reference captures. Coverage includes baseline outputs, scenario validation and zero-damage reasons, amount/type changes, keyboard focus/selection, build-level recalculation, unchanged saves during scenario changes, reload reset, desktop/narrow layouts, reduced motion and all three Aurora palettes. These checks do not establish full PoB parity or release acceptance.

Final rebuilt-bundle Edge checks passed: `test-react-character-defence-qa.mjs` and `test-react-gear-editor-qa.mjs` (all ten slots). All six Defence captures were refreshed; desktop/narrow views were inspected, including inline checkbox layout and distinct palette focus colors. No horizontal overflow or page errors occurred. Scenario interactions left saves unchanged, and reload reset the scenario while retaining the saved build level.

Defence copy refinement: longer explanations now live in a hover/focus tooltip using Lucide `InfoIcon` through the shared icon entry point. The panel retains the short higher-is-better heading; assumptions stay collapsed. Renderer typecheck/build and isolated Character Defence QA passed again, including tooltip hover and Escape dismissal, three palettes and narrow layouts.
