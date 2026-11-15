# Current UI design rules

Read HANDOFF.md for the current project state. The Character pilot is implemented and refined; other screens retain the preceding Ayu Aurora design. Do not roll the pilot out without a user request.

## Character pilot

The north-star reference is ui-overhaul/references/DESIGN.md, interpreted through subsequent explicit user refinements. The user rejected cosmetic reskinning, oversized/blocky panels and violent animation. Current density is intentionally tighter than the original reference's large section gaps/card padding.

- Neutral dark canvas #08090a, card #0f1011, elevated #161718, quiet #23252a borders, white/grey text and lime #e4f222 primary action. Local Inter/system fallback; no remote fonts.
- Small controls, mostly6px corners,16px panel padding, compact34–36px rows, modest gaps. Rounded Character view switch uses10px outer/7px inner corners. Sidebar matches only while Character is visible.
- Header: chosen ascendancy portrait plus softly faded art; small icons use dedicated face portraits, banners use reviewed full artwork where available. Original art files/provenance stay preserved. No wrong-ascendancy substitutions.
- Core stats/attributes/breakdown left, compact equipment list right, resistances/skill setup below. Do not restore the old body-shaped equipment composition.
- Edit character: image dropdowns for class/ascendancy, level1–100, campaign penalty and live identity preview. Retain immediate-save notices and context synchronization.
- Browser-managed spring view-switch animation must survive throttled/stopped rAF and rapid reversals. Do not restore the per-frame JS driver that visibly stalled for the user.
- Dropdowns and item disclosures use softened spring motion. Preserve keyboard/search behavior, viewport bounds, reduced motion, one active menu, hidden scrollbar chrome and completed value rolls.
- Modals close via background click, Escape or their close action, with focus return. Inside interactions and drags starting inside do not dismiss. Gear draft dismissal never saves.
- Equipped item cards fit the neutral UI but preserve every property, requirement, implicit/explicit modifier and source note. Normal/magic/rare/property/modifier colors/fonts remain fixed across themes. Unique-library card appearance remains unchanged.

## Scope and accessibility

Other five screens and Settings remain in their established design. Existing themes change those surrounding app colors/fonts; do not remove theme persistence or freeze unrelated screens. Keep offline runtime, readable contrast, labels, keyboard focus, announcements, reduced motion and390px reflow. Test actual rendered backgrounds when adding faded art/transparency. Targeted tests are not a full accessibility audit.

Production ownership and reference previews are documented in FILE-ORGANIZATION.md, HANDOFF.md and ui-overhaul/CHARACTER-PILOT.md. The previous Ayu Aurora guide is preserved in archive/UI-DESIGN-before-major-task-2026-11-14.md for screens that have not been redesigned.
