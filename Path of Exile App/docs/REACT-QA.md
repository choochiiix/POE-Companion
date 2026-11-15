# React migration independent QA checkpoint

Status: **in progress; not accepted for release**. These checks use separate renderer servers and fresh browser profiles; they do not connect to the user's live origin or saved data.

## Baseline and foundation

- Fresh bundled Node regression: 130/130 passed with loopback access. In the sandbox, 128/130 passed and the two local HTTP tests failed with EACCES; the elevated rerun passed.
- Foundation gate conditionally accepted for feature migration only. At 390px seven-route navigation, no horizontal overflow, dialog Escape and return focus, and uncaught errors passed. Desktop Skills, mobile Skills and mobile Compendium screenshots were inspected in `docs/previews/react-migration/`.
- Resolved on recheck: excessive empty mobile navigation space and Character dialog inheriting saved theme background. Character shell background inheritance was also reported; final recheck remains pending.
- Engine/data SHA-256 preservation check is maintained separately by `scripts/check-react-engine-preservation.mjs` against the pre-migration snapshot; run again after implementation.

## Findings needing resolution or recheck

- **Major — session storage failure** (foundation): denying `Storage.setItem` while changing class to Ranger and level to 42 returns the display to Marauder level 1, even though the UI says changes last for this session. Reproduction: `scripts/test-react-storage-qa.mjs`. Write denial and read/write denial retested: Ranger level 42 remains applied with session-only notice. Calculations and gear under denial still need verification.
- **Major — transient navigation state** (foundation): search Fireball in Skills, choose Calculate this group, return to Skills: search resets. Crafting session history/RNG and tree viewport/selection also need preservation checks after those pages land. Skills search survives navigation after the mounted-page fix. Crafting Transmutation item and history survive navigation, and Undo restores spending; tree and seeded RNG checks remain.
- **Major — SpringSelect parity** (foundation, reported by root): current implementation approximates required legacy motion/interaction rather than preserving paired lift, height, chevron, rows/check/rolling values, confirmation timing, Home/End/typeahead and one active menu. Recheck actual Character interaction after implementation.
- **Minor — mobile Skills category layout** (features): the category rail stacked taller than the initial viewport before search and results. Owner reports a responsive fix; visual recheck pending.
- **Pending — Settings**: currently routed as a page; existing modal workflow must be restored, including backdrop/focus and saved settings.
- **Pending — integration**: Crafting, tree and Items not yet reviewed; no claim of full workflow or visual parity. Verify actual controls, persistence, offline requests, desktop/mobile and post-fix independent pass.

## First-wave evidence

In isolated Playwright: Skills group creation, Fireball search and add, Calculate this group to Character showing Fireball, and Compendium loading passed without uncaught page errors. Skills and Compendium did not horizontally overflow at 390px. These are smoke checks, not full feature acceptance. `scripts/test-react-wave-qa.mjs` records this early pass; selectors and expected transient state must be updated once fixes land.


## Latest independent retest

- Storage denial: both write denial and read/write denial retained Ranger level 42 and displayed the session-only notice. Gear and calculation effects under denial remain untested.
- Navigation: Skills search and Crafting item/spending/history survive switching away and back; Crafting Undo removed the tested spend. Seeded replay and odds worker remain untested.
- Mobile Skills categories now wrap compactly; the rebuilt screenshot was inspected. Shared outline token fix is in source but computed-style recheck is pending.
- Settings: all 11 presets retained Character panel background; Palenight and mono persisted after reload; theme reset returned Ayu Aurora; Escape closed the modal. Card palettes and backdrop/focus remain untested.
- Latest feature-owned workflow independently rerun: Skills CRUD/compatibility/inspect/session, Items base handoff, Compendium Onslaught, Settings theme, mobile Skills, tree neighbor allocation/undo/export/pan passed with no page errors. Tree desktop canvas screenshot was inspected; mastery and class-specific saves remain untested.
- Still open for final acceptance: real SpringSelect interactions and DOM lifecycle after port, six-screen desktop/mobile review, Character gear drafts and progression synchronization, Crafting deterministic replay/odds, Items compare/equip, all theme properties/fixed card palettes, and independent post-fix pass. No release acceptance is implied by these partial checks.

## Final checkpoint update

- Independent six-screen sweep passed at 1440px and 390px without horizontal overflow, uncaught page errors, or external requests. Inspected mobile Character, Crafting, Tree, Items, Skills and Compendium; desktop Skills and Tree also inspected. This covers the visible viewport, not every scroll position.
- The current dropdown adapter changed after earlier checks; write-denied and read/write-denied Character class/level were rechecked successfully on the latest build. Root's separate visual sweep reports keyboard End/Enter selection and nested Escape behavior; the complete spring animation and lifecycle still warrant continued regression coverage.
- Previously reported mobile categories, session navigation and class/level storage denial are fixed for tested flows. The original pending entries above document discovery history, not current failures. Root reports full 130/130 regression and 78/78 engine/data hashes unchanged after migration.
- Not independently completed: gear draft save/dismiss and storage-denied gear, deterministic craft RNG/odds, item compare/equip, mastery/class-specific tree saves, fixed reference card palettes, and all dialog backdrop/focus cases. No blanket workflow-parity claim is supported by this checkpoint.
