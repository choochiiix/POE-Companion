# UI overhaul release checklist

These are future implementation checks, not completed verification.

- [ ] Establish coherent shell, tokens, typography and shared controls across six screens and Settings.
- [ ] Review desktop/narrow previews and loading, empty, error, selected, disabled, hover and focus states.
- [ ] Give the Character layout one owner; retire old DOM restructuring and superseded CSS together.
- [ ] Preserve theme behavior and fixed game-reference item-card styling.
- [ ] Verify existing saves, reload persistence, storage-failure notices and reset isolation.
- [ ] Verify gear validation, exact rolls, rarity, cancellation, equip and removal.
- [ ] Verify Character/tree/skills calculation updates and Crafting/library compare/equip.
- [ ] Retain pending diagnostics for unsupported mechanics.
- [ ] Verify crafting undo, odds workers, targets and history; tree search/masteries; skill groups and reference inspectors.
- [ ] Preserve URL aliases, engine boundaries, offline assets, sources and licenses.
- [ ] Run the root package.json Node regression suite after production changes.
- [ ] Run affected scripts/test-*-ui.mjs browser suites, including gear/themes and cross-screen calculations where relevant. Preserve behavioral assertions when updating presentation selectors.
- [ ] Verify keyboard navigation, dialog Escape/focus return, inline definitions and status announcements.
- [ ] Check desktop, 390px, zoom/reflow, reduced motion, contrast and applicable forced colors.
- [ ] Confirm runtime requests stay local; fonts/themes download nothing.
- [ ] Report checks actually run and unavailable checks without claiming full accessibility or PoB parity.
- [ ] Update design/feature docs, final previews and handoff; preserve historical prototypes.
