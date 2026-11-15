# Calculation integration · design preview

User review artifact only. Open `index.html` directly; no server or installation is required. It reads shared local tokens from `crafting-ui/styles/tokens.css`. The prototype never imports production modules, changes equipment, reads/writes storage or calls calculation APIs. No production UI/routes/save schemas were changed.

## Designs to review

- **Character overview:** selected build/skill/context, partial-coverage notice, five key stat buttons, preserved inventory proportions, and a reusable right-hand source breakdown. Select Life/Mana/Armour/Evasion/Hit DPS to inspect their arithmetic and sources. Narrow screens stack the same components.
- **Equipment comparison:** side-by-side current/candidate item and controlled build-impact inspector. This can be invoked from Character, Crafting or Item library without creating a seventh app screen. Candidate 46 armour is explicitly illustrative; “Equip” is disabled until integrated.
- **Combat assumptions:** accessible native modal for skill/actor, enemy level/type/resistance and campaign penalty. Prototype controls are deliberately not connected. Additional context documents future conditional mechanics.
- **Calculation scope:** separates compared fixture outputs from other calculated subsets and pending mechanics. Missing values show Pending, never guessed zero.

The overview's static 24.6 hit DPS, 285 life, 186 mana, 23 armour, 15 evasion and damage arithmetic come from the existing first source-to-build trial. The current parent task may expand that corpus; the prototype remains explicitly a fixed reference illustration, not a live report of its results or the user's saved build. No fabricated gem artwork: a neutral gem marker is labeled as such; simple equipment silhouettes are prototype placeholders.

## PoB source inspection

Inspected the preserved `PathOfBuilding-dev.zip` (source archive is untouched):

| Source | Input/output concepts found | Proposed app placement |
| --- | --- | --- |
| `src/Classes/CalcsTab.lua` | Socket group, active skill, skill part/stages, mines, minion selection; Unbuffed/Buffed/Combat/Effective modes | Skill context selector and reusable calculation inspector; conditional controls appear only when supported and relevant |
| `src/Modules/ConfigOptions.lua` | Campaign penalty, enemy level/boss/resistances, bandits/pantheon, buffs/charges/conditions, incoming damage, ailment/calculation modes | Combat assumptions modal; future grouped sections stay separate from global appearance Settings |
| `src/Classes/ConfigTab.lua` | Config sets, conditional visibility based on used mechanics, custom modifier blocks | Versioned calculation context separate from appearance prefs and existing saves; source-backed structured controls before free-text modifiers |
| `src/Modules/Build.lua` | Character/class/level/ascendancy, selected socket group/skill/part, stat sidebar and loadouts | Existing Character context; current specialized screens retain ownership of source data |
| `src/Classes/SkillsTab.lua` | Per-slot socket groups, gem levels, active skill and actor selection; Full/Combined/Hit/DoT/ailment DPS and EHP choices | Existing Skills editor supplies normalized skill assembly; only supported result types become selectable |

PoB UI source breadth describes what parity eventually needs; it does not establish those calculations as implemented. Boss presets, reservation/recovery, DoT/ailments, EHP/max-hit, skill-stage/minion/trigger state and custom modifier semantics must gain engine contracts and reference fixtures before they produce UI values.

## Integration boundaries for future work

1. Existing Character/equipment, tree, Skills and explicit combat context supply source records through dedicated adapters. Do not read browser DOM to construct a build or place game formulas in event handlers.
2. A shared build snapshot identifies source revision, character/equipment/tree/skill selection and configuration. Preserve existing save keys/formats; add a separate versioned context or migration when approved later.
3. A calculation service calls the pure engine and returns immutable result, diagnostics, assumptions, source IDs and fixture/coverage metadata. “Compared” is a per-scenario/per-stat claim, not a blanket guarantee for arbitrary builds. The prototype hardcodes the existing reference label only because it is a labeled fixture.
4. Stat summary consumes selected result values. Breakdown consumes modifier contributions and rounding policy. Configuration consumes explicit context with validation. Each screen can use these components without duplicating formulas.
5. Item comparison calculates baseline and candidate against the exact same skill/tree/config snapshot. Pending/unsupported mechanics remain visible in both; changes are preview-only until an explicit equip action. A session calculation ID can prevent stale asynchronous comparisons being applied to changed input.
6. Actor/skill selection must distinguish continuous, fixed-rate and triggered delivery. Do not sum all available skill DPS or inherit player modifiers onto minions automatically. Full/combined DPS requires explicit actor inclusion and coverage.

Appearance remains inherited: Ayu Aurora palette, 12/16/20px radii, 8px spacing, restrained amber/gold actions and secondary blue, local system font stack, visible focus and opaque control surfaces. Existing themes may change color/font families only; the prototype introduces no theme-specific geometry. Settings stays a modal and six working screens remain intact.

## Preview files and verification

- `previews/character-overview.png` · 1440px desktop, full page.
- `previews/equipment-comparison.png` · 1440px desktop, full page.
- `previews/combat-assumptions.png` · 1440px desktop modal.
- `previews/character-mobile.png` · 390px reflow, full page.

`capture.mjs` renders using the bundled Playwright and installed Edge. Set `PLAYWRIGHT_MODULE` to the bundled module path from `docs/HANDOFF.md`, then run `node prototypes/calculations/capture.mjs`. It checks stat selection, view switching, modal Escape and focus restoration, 390px overview/comparison/modal reflow, reduced-motion context, zero page errors and no HTTP requests. All four generated images were visually inspected. The design includes reduced-transparency, increased-contrast and forced-colors fallbacks; this is not a full accessibility audit.

The workspace has no Git repository. These are reviewable files, not a production UI commit. User design review is the next step before integrating the prototypes.
