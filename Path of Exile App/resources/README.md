# Catalog resources

User-supplied reference: https://repoe-fork.github.io/poe1.html (source label 3.29.3.6, retrieved November 14, 2026).

- `uniques.json`, `flavour.json`: downloaded RePoE identity/flavor exports. Base/class exports and provenance remain in `data-sources/repoe-poe1/`.
- `path-of-building/`: selected unique/base Lua and licenses from the preserved user archive. PoB code is MIT licensed; item data/art remain Grinding Gear Games copyright.
- `catalog-import-report.json`: source hashes, counts, raw-line diagnostics and coverage limits.
- `unique-art-report.json`: image source URLs, hashes, dimensions and missing matches. Final result: 1,299 matched names; one unmatched malformed-looking `Item Class: Jewels` record.

Runtime images are in `crafting-ui/assets/uniques/`, with manifest `crafting-ui/unique-art.json`. RePoE PNGs were downloaded from `https://repoe-fork.github.io/Art/2DItems/` using identity paths. No remote artwork is requested at runtime.

Rebuild catalog offline with `node scripts/build-catalog.mjs`. Explicit online artwork refresh: `node scripts/download-unique-art.mjs`. Preserve source files, original archive, licenses, reports and artwork.
