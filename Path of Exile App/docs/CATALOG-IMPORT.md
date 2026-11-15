# Offline item library

Current handoff: November 14, 2026. README.md takes priority.

## Sources and coverage

`scripts/build-catalog.mjs` parses static Lua long strings from selected PoB source extracts without executing Lua, joins existing RePoE base/item-class exports and downloaded unique identity/flavor records, and writes `crafting-ui/catalog-data.json`. Sources and reports live in `resources/`; preserve the original archive in `references/`.

Stored: 1,307 definition families, 3,250 variants, 1,300 distinct names. Display: one preferred Current/non-legacy version per family, falling back to the last variant for legacy-only items. No historical selector. Only preferred records are searched. Search matches every entered word across names, bases, classes, modifiers, variants and flavor. Grouping is category then item class. First 120 matches render; no pagination. Filters cover category/class, required attribute, maximum level and normalized stat. Stat sorting compares first-range maximum within type groups.

329 diagnostics retain item names/raw lines; 338 stored variants lack matched flavor text. Dynamic Special Lua definitions are excluded. Unsupported annotations remain visible. Base implicit IDs are retained but not translated. Requirements are base requirements, not recalculated for unique modifiers. `Item Class: Jewels` appears to be a malformed parsed record. These counts do not establish live-game completeness. Production parsing currently lives in the build script; catalog source-adapter files in crafting-ui are fixture-only remnants.

## Presentation

285px minimum card columns, 14px modifier text, orange unique headers and blue mod lines. Underlined modifier buttons open an absolute floating bubble on hover/click/focus; no icon/helper cue, no layout expansion. Animation is 140ms fade/slide with reduced-motion fallback; Escape dismisses. Source lacks affix names/tiers, so unavailable values are explicit. Do not infer tiers.

Images have uniform 160px centered areas, proportional containment up to 128px height, lazy loading, fixed header minimum heights and missing-art fallback. `unique-art.json` maps 1,299 names to local PNGs. Sole unmatched record: `Item Class: Jewels`. `resources/unique-art-report.json` contains original URLs, hashes, dimensions and failures. Artwork remains GGG copyright. Runtime makes only local requests.

Explicit online updater: `node scripts/download-unique-art.mjs`; reuses cache and serializes shared replica-image reads. Catalog rebuild is offline: `node scripts/build-catalog.mjs`.

## Verification

Browser checks exercised name/mod searches, category/level filters, reset, one-card grouping, earlier version switching (since removed), floating bubble/Escape and equal-height loaded artwork. Node assertions exercised grouping preference and numeric parsing. All downloaded PNG entries were signature checked before final cache reconciliation. Full game-data and accessibility validation remain outstanding.
