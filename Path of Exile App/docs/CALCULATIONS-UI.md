# Live calculation integration

Current presentation: the Character pilot supersedes older layout/card descriptions below. Equipment is a compact right-hand list with softened spring disclosures and simplified UI-fitting cards; stats/attributes/breakdown are left. Full item information and fixed rarity/modifier colors remain. Edit character now includes image dropdowns, level and campaign penalty synchronized with Combat assumptions. See [current handoff](HANDOFF.md) and [pilot details](ui-overhaul/CHARACTER-PILOT.md). Model/save/calculation limitations below remain applicable.


Character now renders live Hit DPS, Life, Mana, Armour and Evasion from the independent calculation engine. Stat buttons open source breakdowns, effective/uncapped resistances, a specified physical-hit estimate, assumptions and unresolved effects. No fixture numbers are displayed as the user's build.

Layout correction after user review: production now follows the approved prototype composition—Character header and build identity strip, overview/comparison navigation, stat cards, equipment on the left with selected-stat breakdown on the right, and separate Resistances/Skill setup cards below. Class/ascendancy controls remain available in Edit character; flasks are collapsed placeholders. Equipment selectors and all calculation actions remain live. Coverage details are expandable rather than a full-width wall of diagnostics. `docs/previews/calculations-approved.png` shows the corrected production layout with the verified example build. Full124 Node tests and the live calculation browser suite pass after this correction, including mobile reflow and edit-dialog access.

## Integration boundaries

- `crafting-ui/features/calculations/source-adapter.js` translates current class, equipment, selected passives/masteries and saved gem groups into normalized engine input. It calls the public snapshot/calculation APIs, not a duplicate formula implementation.
- `calculations.js` owns presentation, context controls, event subscriptions and preview/equip actions. Source labels use game names. DOM text is rendered safely.
- `calculation-data.json` contains compact local base properties/implicit evidence and four pinned raw character constants. Rebuild explicitly with `node scripts/build-calculation-ui.mjs`; it never downloads sources.
- The local server serves an explicit allowlist of engine TypeScript modules as stripped JavaScript, like the existing crafting engine. Calculations execute in the browser; there is no remote API or new dependency.
- `build:change` updates calculations after Character, equipment, Skills and tree actions. In-memory getters preserve current session selections when storage fails. Saved tree keys remain class/ascendancy-specific.
- Skills offers **Calculate this group**. Combat assumptions selects a saved group or default weapon attack, character level, gem level endpoint, campaign penalty, enemy resistance/armour/evasion/accuracy and incoming physical hit.
- Item library and Crafting offer **Compare with build**. The comparison calculates complete current/candidate snapshots with one shared combat context. **Equip for calculations** updates the existing base selection and stores detailed modifier evidence separately. Main/off-hand compatibility still uses existing equipment validation. Preview-only comparisons do not modify saves.

## Persistence

Existing Character, equipment, skill groups and tree schemas/keys are unchanged. Separate `poe-companion.calculation.v1` stores context and source-backed detailed-item overrides. Overrides apply only to the corresponding selected base. Manually changing a base clears that slot's detailed override. Reset appearance preferences/theme does not affect calculation context. Storage failure keeps current calculations in memory with a notice.

## Supported source translation and limits

The engine's UI is integrated, but game-mechanic parity is still incomplete. Ordinary class/level attributes and pool bases, midpoint equipment defences, recognized ordinary global modifiers, selected passive/mastery text, simple direct-damage spell endpoints and compatible normalized supports feed the engine. Default ordinary weapon attacks are available separately. Gem inputs support level1 or natural maximum, quality0; arbitrary gem interpolation/socket modelling is not implemented.

Complex active skills, minions/totems/channelling/secondary effects without a reliable adapter show pending DPS. General attack gems, added-damage effectiveness from arbitrary description text, local weapon modifiers, special unique effects, resource sustain/reservation/recovery, ailments/DoT, flask mechanics and many conditions remain unsupported. Unknown source lines and crafted raw stat units remain diagnostics, never guessed mechanics. Local weapon modifiers are withheld rather than misapplied globally. Simple local armour/evasion/energy-shield increases resolve once before global scaling. Every UI result remains a partial estimate. Base/item range midpoints are assumptions, not actual rolled values.

The unique catalog retains original modifier evidence; numeric ranges are midpoint estimates for comparison. Crafting sends exact rolled explicit stat values; only a conservative unscaled-stat mapping applies, with unknown IDs preserved in diagnostics. Implicit ranges remain midpoint estimates because the crafting engine does not roll them. Equipping a detailed item affects calculations without pretending the base-only equipment dropdown became a complete item editor. Gear/class requirements and unique exceptions remain unvalidated.

## Verification

124 Node regression tests passed, including four live adapter tests. `scripts/test-calculations-ui.mjs` checks that actual saved class/gear/tree/gems reproduce the pinned PoB trial (24.6 hit DPS, 285 life, 186 mana, 23 armour, 15 evasion); changing enemy resistance updates DPS; source drilldowns work; original save keys stay isolated; reloads persist context and detailed items; manual base changes clear overrides; Skills/tree/Crafting/catalog handoffs work; storage failure remains usable; 390px reflow and modal Escape/focus restoration work; all requests stay local. Existing Settings and Skills browser suites also pass. Static TypeScript compiler checking remains unavailable (`tsc` absent). These checks are not a full accessibility audit or full PoB parity certification.

Previews: `docs/previews/calculations-live.png`, `calculations-live-mobile.png`. The earlier designs in `prototypes/calculations/` remain preserved reference artifacts; production uses current app tokens and existing layouts.

Restart the local server after adding these routes, then refresh the browser. Refresh clears session-only crafting history; original persistent saves are preserved. Continue using the same origin (`127.0.0.1` versus localhost have separate storage).
