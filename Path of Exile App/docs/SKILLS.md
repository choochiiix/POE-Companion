# Skills library and setup planner

The model, data build, and source-coverage notes below remain relevant. The previous vanilla Skills screen and its browser script were removed; the React screen is in `renderer/src/features/skills/` and its cross-screen workflow is checked by `scripts/test-react-wave-qa.mjs`.

The Skills screen uses the user-provided `references/path-of-building/PathOfBuilding-dev.zip`. The original archive is preserved. SHA-256: `6ea36e73649da26741fd0c1c3bd57a99e589db84191f0e0578f320b1921cc34b`.

## Data and build

Run from the existing project root:

```powershell
python scripts/build-skills.py
python scripts/test-skills.py
node --experimental-strip-types --test crafting-engine/test/*.test.ts crafting-data/test/*.test.ts crafting-ui/test/*.test.mjs
```

Python 3 is needed only to rebuild. Pillow is needed only when an authoritative gem atlas mapping is provided for cropping. The checked-in JSON runs without Python or package installation. The importer reads ZIP members directly, tokenizes Lua as text and parses a restricted literal grammar. It never starts Lua, evaluates expressions, imports archive code or extracts arbitrary archive paths to disk.

Sources: `src/Data/Gems.lua` supplies gem identities, names, support tags, attribute scaling weights and natural maximum levels. `src/Data/Skills/*.lua` supplies descriptions, character-level requirements and explicit skill-type support expressions. Only selected top-level metadata is read; modifier functions/calculation code are skipped. Requirements use `getGemStatRequirement` from `src/Modules/CalcTools.lua`, including the below-14 cutoff and separate active/support multipliers. UI values refer to gem level 1 and natural maximum; the raw scaling percentages are not presented as required attributes. Missing values display `?` or unavailable. Source hashes, counts, diagnostics and missing art IDs are recorded in `resources/gem-import-report.json`. License is retained in `resources/pob-gems-LICENSE.md`; gem data and game artwork belong to Grinding Gear Games. PoB's dev branch label does not identify a release or guarantee current live-game coverage.

## Artwork: blocked by source coverage

The supplied ZIP contains **no gem inventory sprite atlas, individual gem inventory images, or gem sprite coordinates**. Its `TreeData/*/skills-*.jpg` and `sprites.lua` are passive-tree art, not gem inventory art. `Assets/itemsheadergem*.png` are tooltip decorations. Neither is substituted for gem art. Current import: **822 gems, zero gem PNGs**. The illustrated-library requirement remains incomplete pending the correct source artwork. No images were downloaded or generated.

The explicit build step supports cropping real archive sprites if authoritative coordinates become available in `references/path-of-building/gem-art.json`. Do not fabricate a mapping or use passive icons. The map is keyed by exact `Gems.lua` identity, with values of this form:

```json
{"Metadata/Items/Gems/SkillGemFireball": {"sprite": "exact ZIP member path", "x": 0, "y": 0, "w": 48, "h": 48}}
```

This documents the schema, not actual coordinates. The importer validates integer rectangles against image bounds, writes each crop as `crafting-ui/assets/gems/<identity-sha256-prefix>.png`, and records source/map hashes. It only reads the existing archive. If the artwork arrives separately, the importer must be extended to read that supplied source without replacing the original archive. Runtime routes accept only local 24-character hex PNG names; the UI never uses remote image URLs. Existing unique artwork and its pipeline remain intact.

## Gem tooltip references

The original request deferred damage, mana costs and quality. The user's subsequent tooltip request expands that scope to **displaying unmodified gem reference values**, without character simulation or planner level/quality configuration. `scripts/gem_tooltips.py` reads the selected literal level rows, numeric stats, constant stats, quality scaling and translation tables from the archive. `skills-data.json` is now schema version 2; the separate saved-group schema/key stays version 1.

Properties include resource costs/reservations, support cost/reservation multipliers, cast/cooldown/attack times, stored uses, Vaal soul costs/prevention, attack speed/damage percentages, critical strike chance and added-damage effectiveness when supplied. Unit names/divisors come from `Data/Costs.lua`. Cost multipliers are source offsets plus 100. Omitted neutral entries in otherwise-present baseMultiplier/damageEffectiveness rows use 1 (CalcOffence.lua); omitted support multiplier offsets use 0 (neutral 100%). Entirely absent properties remain absent. Attack skills do not display their internal castTime as a spell cast time.

Level ranges sample all supplied gem levels 1 through natural maximum, excluding overleveled rows. Static stats use their literal values. Mode-3 damage stats use CalcTools.lua's effectiveness formula and the two constants in Data/Misc.lua, with nearest-integer rounding. Mode-2 interpolation remains unsupported because PoB itself labels its behavior uncertain; unsupported or nonliteral values remain diagnostic data. No modifier functions or Lua are executed. Function bodies are structurally skipped and nonliteral expressions are not partially accepted.

Stat descriptions use the local `Data/StatDescriptions/*.lua` scope hierarchy, first-match source limits, numeric transformations, placeholders and hidden descriptors. Each source level chooses its applicable wording before ranges are combined; positive and negative variants are kept separate. Quality lines show additional scaling from **1 to 20 quality**, including fractions (e.g. Blade Blast's 0.005–0.1 m). Positive/negative integer wording limits are used for the sign of fractional quality values, with the actual fraction retained. Source constant flags are available as translation context without emitting base lines in the quality section. Unknown directives, resource types and missing wording remain explicit. No translated text is treated as HTML.

Secondary granted effects (such as Fireball from Vaal Fireball) have their own expandable reference. This does not change compatibility validation. Search indexes base and quality effects, property values and secondary descriptions/effects as well as gem identities/tags.

Coverage: 822 primary references, 818 with translated base stat lines, all 806 source quality records with translated quality lines. Portal, Spectral Throw, Enlighten and Awakened Enlighten have no translated base line, but retain available properties/descriptions/quality. 561 gems have source-only or unsupported fields, mostly untranslated internal flags; raw stat identifiers and value ranges remain in the UI disclosure/report. Complete in-game tooltip coverage is not claimed. Blade Blast's supplied screenshot is covered by an exact known-record test. Blue `#8888FF` stat/quality text follows the unique-library modifier palette; descriptions remain teal. Artwork appears after the reference content to follow the supplied gem-tooltip layout; it is still unavailable.

### Group compatibility and saves

Supports are classified from the gem's `support` tag, including supports that also grant skills. Compatibility implements PoB's postfix `AND`, `OR`, `NOT` expressions and implicit OR across remaining stack entries. Explicit unsupported flags, exclusion matches and missing required types produce warnings. Passing these checks says only “No imported type-rule conflict.” It does not certify full compatibility.

Minion, secondary-effect, weapon and trigger contexts, missing rules, malformed expressions and other supports that change types return unknown. The planner does not infer compatibility from descriptions, tag similarity or gem names. It never automatically removes an incompatible support.

Groups are stored under **`poe-companion.skills.v1`** as `{version:1, groups:[{id,name,activeId,supportIds}]}`. Existing Character, Equipment, Crafting and tree keys are untouched. The validator accepts the unversioned array form as v0; sanitizes names, invalid IDs, wrong gem classifications and duplicate supports; and repairs duplicate group IDs. Unsupported versions fall back to an empty planner. Migration is persisted on the next edit. Corrupt JSON and unavailable/quota-limited storage have visible fallback messages. Limits of 100 groups and 50 supports per group protect storage; these are not game socket/link constraints. Each group has one replaceable active slot and any selected supports within that storage limit.

## Future scope

### Browsing by category

Library tabs: All gems, Support, Attacks, Spells, Curses, Warcries, Auras, Minions, Totems and Traps. All gems retains the complete index, including gems outside the named active categories. Support includes every gem classified as support, even those with attack/spell/aura tags. Remaining categories include active gems with the corresponding literal tag (`attack`, `spell`, `curse`, `warcry`, `aura`, `minion`, `totem`, `trap`). Active gems can appear under multiple tabs. Compatibility types such as Totemable and Trappable are not used to infer gem categories. Counts are totals before search/tag filtering; the result status reports the filtered total.

Category changes retain search and the extra tag filter, reset progressive rendering to 60, and do not change the chosen destination group or its saved contents. Clear filters returns to All gems and clears search/tag. A labeled ARIA tablist controls one shared tabpanel with selected state, a single keyboard tab stop, Up/Down arrow-key activation with wraparound, Home/End, native Enter/Space, visible focus and a non-color selection checkmark. Tabs are stacked vertically in a 168px sidebar beside results; on narrow screens the vertical list moves above results. The tablist declares vertical orientation. The redundant active/support select is removed. All 9 Skills model tests and updated browser checks passed after this change, including keyboard selection, category/source-tag overlap, support isolation, retained search and 390px reflow.

Equipment socket positions, socket colours, links, gem experience, configurable gem level/quality, character damage/cost/DPS and full build calculations are not modeled. Character level/attributes are not checked against gem requirements. Vaal/secondary compatibility, minion skills, support transformations and weapon-specific interactions require more context. Reference stats/costs/quality are displayed as described above. Filters cover type and tag. Cards render 60 at a time with an explicit Show more action, and all matches remain available.

Native buttons/selects/labels, visible shared focus styling and status announcements preserve keyboard access. No animations are introduced; reduced-motion preferences remain respected. New styles reuse Ayu Aurora tokens and collapse filters/cards on narrow screens.

Gem cards now mirror the unique library's 285px minimum columns, 20px grid gaps, 3px corners, centered serif headers, ornamental diamonds, 160px artwork areas, black bodies, divided requirements and action footers. Both active and support gems use the gem teal `#1AA29B` from the supplied PoB `src/Data/Global.lua`; `src/Classes/GemTooltip.lua` applies GEM to names/descriptions. Active/support remain explicit text labels rather than different header colors. Values are white, property labels gray, descriptions teal. Online visual references checked November 14, 2026: [PoEDB gem palette](https://poedb.tw/sp/Wiki_editor), [Fireball tooltip structure](https://poedb.tw/us/Fireball), and [in-game Fireball screenshot on the official forum](https://www.pathofexile.com/forum/view-thread/3351596). These are development references only; no remote resources were added to runtime. No damage/cost/quality values from those references were imported.

## Verification — November 14, 2026

**54 Node regression tests and 13 Python parser/crop/tooltip tests passed** in the historical vanilla UI run, zero failures/skips. Parser tests cover literal strings/tables, executable-input rejection, safe selected-field extraction, function-body skipping, attribute formulas, pixel-preserving PNG crops and bounds rejection. Tooltip tests cover effectiveness scaling, hidden/scope precedence, quality fractions and context, template substitutions, unknown directives, support/attack defaults and resource units. The crop test reads actual archive decoration in memory; it does not assign it to a gem or save substitute artwork. Model tests cover the real snapshot, the supplied Blade Blast values, support/Vaal reference data, search, classification, compatibility uncertainty, migrations and immutable gem assignment. The old `scripts/test-skills-ui.mjs` browser check was removed; React UI checks are listed above. No external requests or page errors were observed in the prior run. Desktop Blade Blast layout was visually reviewed. Deterministic gem JSON rebuild and all 1,133 distinct existing unique PNG hashes were verified; archive hash remains unchanged. These checks do not establish full WCAG conformance or in-game accuracy.
