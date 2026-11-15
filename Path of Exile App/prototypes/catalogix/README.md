# Catalogix / Exile Compendium — standalone concept

A functional local UI exploration inspired by the supplied orange Catalogix reference. **Not integrated into Exile Companion.** No companion files, routes, navigation, resources or storage keys are changed. Sample glossary definitions are illustrative editorial examples, not production data or independently verified game explanations.

Run from the project root with Node 22.18+:

```powershell
node prototypes/catalogix/server.mjs
```

Open `http://127.0.0.1:4321`. Stop with Ctrl+C. The prototype has no install or build step, CDN, remote images, external fonts, runtime packages or network services. It can also be served by a static server. This is deliberately buildless vanilla HTML/CSS/JS, so its layout and components are straightforward to reuse later if selected.

Working features: catalog table and card layout; full-text search including tags, aliases and custom metadata; status/type/collection filters; sortable columns; pagination; multi-selection; nested collection creation; moving records; bulk status changes; record creation; inspector edits with validation; configurable text/number/URL metadata fields and required rules; tags and aliases; relationships with click-through and removal; per-record activity; archive and restore through Trash; saved filter views; validated JSON snapshot import; complete/selected export; and local persistence using the isolated `exile-companion.catalogix-concept.v1` key. Import replaces prototype data only and includes a concrete confirmation step. Export first to retain the current prototype snapshot.

Reference styling: dark charcoal rail and layered panels, compact dense table rows, orange selected navigation/rows/actions, restrained green status pills, nested collection rail and a right-side metadata inspector. The original chart is intentionally replaced by an honest demo/source notice; all metric values are derived from the actual sample records. Letter tiles are code-rendered record type markers, not substitute game artwork.

Accessibility: native controls and table semantics, labeled inputs, keyboard selection, visible orange focus, dialog Escape, Ctrl+K search, non-color selected states, reduced-motion and forced-colors support. Below 1100px the inspector moves beneath the table; below 750px the layout becomes a single column with wrapping collections and horizontally scrollable navigation.

Limits: browser-local persistence is per browser/origin; no accounts, collaboration, server database, authentication, production glossary feed or workflow automation. Collection rename/reparent/delete and custom field deletion are not exposed in this concept. There are no misleading decorative controls for these absent operations. Import caps are 5,000 records, 200 collections, 30 custom fields and 30 saved views; exports are portable JSON. Edits log local activity but there is no version diff or multi-step undo; archived records can be restored.

Verified November 14, 2026: **4 model tests passed**, covering snapshot validation/dangling relations, collection descendants/cycle rejection, text/filter/trash semantics, and metadata validation. The browser workflow suite passed in local Edge at 1680px and 390px: create/edit, reload persistence, collection creation/moving, relationships, configurable schema, saved views, archive/restore, table/cards, bulk status/activity, JSON export/import roundtrip, taxonomy, narrow reflow and keyboard search. No page errors or external requests were observed. The supplied design was visually compared with `preview.png`; the prototype keeps the same three-rail hierarchy and orange selection treatment without consuming production data.

```powershell
node --test prototypes/catalogix/model.test.mjs
# Requires development-only Playwright and installed Edge:
node prototypes/catalogix/browser-test.mjs
```

Set `PLAYWRIGHT_MODULE` to a locally installed Playwright module path when necessary. Set `CATALOGIX_SCREENSHOT` to a local output path to capture a clean seeded preview. No browser download is required. Loopback/browser QA was run outside the network-restricted sandbox. Comprehensive accessibility conformance and production-scale performance are not established by these targeted checks.
