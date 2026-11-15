# Character design pilot — structural rewrite

Current: Character-only presentation rebuilt after the user rejected the first cosmetic pass and explicitly required DESIGN.md to be followed to a T. This supersedes the first pilot description and its retained-colors interpretation.

## Controlling reference

references/DESIGN.md is the design specification. The supplied compendium screenshots are secondary when they conflict. Character uses the specified #08090a canvas, #0f1011 cards, #161718 elevated surfaces, #23252a dividers, white/grey text and #e4f222 primary action. Controls use 6px corners; panels use 12px corners and 24px padding. The view uses two columns, compact stat rows, restrained weights, underlined navigation and a 96px gap before the next major section. Typography uses the specified Inter/system fallback stack locally; no remote fonts are fetched. Marketing-only signup/customer/hero content is not added to the companion.

## Structural ownership

features/character/character-workspace.js now owns Character markup and composition. The previous calculations.js block that repurposed the old Character columns was replaced with a view mount and references. calculations.js still owns live values and actions. New attribute rows read the actual assembled build attributes.

Equipment is a compact slot list with expandable game tooltips and the existing Add/Edit/Remove actions. Tooltip palette/fonts remain fixed by the existing game-reference requirement. No models, rules, data sources or save schemas were replaced. Other tabs, shared navigation and Settings retain their existing appearance.

## Verification

130 Node regressions pass. Browser suites pass for live calculations, gear editing, fixed item-card styling across all 11 themes/fonts, narrow reflow and other-screen isolation. The isolation suite also checks exact reference colors, 12px panels, 24px padding, 6px primary control and the new attributes/equipment structure. No full accessibility or PoB parity claim. Static tsc remains unavailable.

Review previews: ../previews/character-design-desktop.png and ../previews/character-design-mobile.png. Calculation drilldown previews remain character-pilot-desktop.png and character-pilot-mobile.png. Previews use isolated test data, never the user's saves.

Runtime requires a restart for the new character-workspace.js route. Refreshing clears crafting session history; persistent saves remain on the same origin. Verify current server identity before stopping it.

Runtime verified: prior process 34288 restarted as 33488; new module returns HTTP 200 on 127.0.0.1:4317. Browser untouched. Recheck identity before future stops.

## Density refinement after user review

User accepted the direction as a close start but found it blocky and oversized. Their latest preference supersedes the original fixed spacious dimensions: panels now use 16px padding/6px corners, rows are 34–36px, headings and avatar are smaller, the identity strip has no enclosing box, Attributes and lower sections use dividers, major gap is 24px instead of 96px, equipment actions sit inline on desktop, and breakdown starts collapsed. Typography/palette and Character-only scope remain. Desktop/mobile isolation and gear-editor suites passed after the changes; updated previews use character-design-* filenames.

## Organic Plan Switch motion

Character overview / Equipment comparison now uses the Design Bookmark Plan Switch's stretchy two-edge highlight. Source files read before implementation: https://designbookmark.com/motion-src/plan-switch/index.html, plan.css, plan.js and shared/tokens.css, base.css, motion.js. Adaptation lives in shared/ui/plan-switch.js, uses native ES modules and scoped Character CSS, retains leading 620/36 and trailing 190/19 springs with four integration substeps, and adds arrow/Home/End keyboard support. No pricing/upgrade demo text, auto-switching, remote fonts, analytics, global theme changes or dependencies were imported. Reduced motion follows both system and app preferences. Animation runs only while settling.

Plan Switch verification passed: click/view changes, arrow-key selection, settled highlight alignment, system reduced motion, desktop/mobile reflow and unchanged other screens. Verified project server restarted as process 31844 for new module route; browser not refreshed.

## Sidebar cohesion and switch corners

User browser comments requested matching sidebar styling and slightly rounded Character views. Character-visible sidebar now uses the pilot's neutral surfaces, compact rows, typography and restrained lime selection marker. Styles use body:has(#characterPanel:not([hidden])) so other screens retain their presentation. Switch outer radius is 10px with 7px inner corners; spring behavior unchanged. Browser suite verifies switching, reduced motion, mobile reflow and other-screen isolation.

## Spring dropdowns

Character-owned dialogs now enhance single-select controls using shared/ui/spring-dropdown.js and scoped Character CSS. Source HTML/CSS/JS and shared tokens/base/motion files from https://designbookmark.com/motion-src/spring-dropdown/ were read first. Native selects retain values, labels and input/change contracts, with custom top-layer menus, spring height/opacity/chevron/value motion, staggered rows, stretchy hover and selection checks. Source constants retained: height300/23, row300/24, opacity400/34, chevron300/18, trigger500/18, value340/26, highlight lead620/36 and trail200/20; four integration substeps. No idle demo/autoplay, analytics, remote fonts or theme side effects imported. The form trigger stays in place for stable form layout. Long lists are searchable (first200 matches shown; search refines the list). Menus stay inside viewport, follow system/app reduced motion, and close on Escape/outside press/dialog close. Other tabs and Settings are untouched.

130 Node tests and gear-editor/dropdown browser suites pass, covering selection via pointer/keyboard, searchable bases, save, exact rolls, persistence, focus, reduced motion and390px bounds. Preview: ../previews/spring-dropdown.png. Current server20944; verify identity before stopping. User browser not refreshed.

Live calculation browser suite also passed after dropdown enhancement; new module verified on the running origin.

## Dropdown reference correction

User rejected the first dropdown interpretation. Corrected missing source motion: pair lift260/24, two simultaneous outgoing/incoming value slots340/26, drawn SVG selection check260/26 and240ms confirmation before folding. Trigger/menu use quiet borderless surfaces and a proper SVG chevron, retaining compact project sizing. Field caption fades during lift so it does not show between the floating trigger and menu. Removed the prior fixed-trigger interpretation. Dropdown browser interaction suite passed after correction; pointer, keyboard, Escape, searchable bases, save, reduced motion and mobile bounds verified. User browser remains untouched; no route changes/restart needed.

## Softer dropdown motion

User approved the corrected reference behavior and requested refinement with less violent animation. Retained stiffness and interaction structure, increased damping for lift30, height32, chevron30, trigger38, value34, rows32 and hover edges44/28. Lift now uses quarter menu height capped32px; value roll12px, row entrance6px, width reveal96–100%, press scale98.5–98.8%. Original reference constants above are provenance; these explicit user-directed tuning values supersede them. Reduced-motion behavior unchanged.

Dropdown scrollbar chrome hidden at user request; wheel/touch/keyboard scrolling retained. Menu height includes its full12px padding so short lists fit without overflow.

## View-switch stability, equipment disclosure motion and card cohesion

User requested smoother Character view switching, spring motion for equipped-item disclosures and UI-fitting cards with all information/colors retained. Plan switch now uses fixed100px geometry plus translate/scale transforms rather than frame-by-frame layout width writes; unchanged resize/ARIA targets do not retune live springs. Character-only scrollbar gutter remains stable across overview/comparison changes. Hover fills no longer compete with the moving highlight.

Equipped disclosures use mountSpringDisclosure in shared/ui/spring-dropdown.js (softened height300/32, short4px entrance, reversible open/close, native summary keyboard activation, immediate reduced motion). Cards retain every existing property/requirements/implicit/explicit/source note; presentation uses6px corners, neutral border, a rarity-colored header edge, sentence-case system typography and left-aligned readable details. Fixed normal/magic/rare and modifier/property colors remain independent of app themes; library cards are untouched.

New test-character-motion-ui.mjs passed rapid switch reversals/precise settlement, transform-only rendering, item disclosure open/close/reversal, unchanged card text, reduced motion and390px. All11 theme/font card invariance browser checks pass. Preview: ../previews/character-item-refined.png. No new routes, server restart or save changes. Refresh loads updates and clears session crafting history.

## View switch frame-throttling correction

User still observed a lagging/stuck highlight. Replaced the live requestAnimationFrame integration loop with precomputed source-spring keyframes played through Element.animate (transform only). The old loop capped simulation time to33ms per delivered frame, stretching wall-clock duration when frames were delayed. New playback is650ms wall-clock; resting transform is set immediately beneath the animation so cancellation cannot strand it mid-track. New transitions start from the current displayed geometry, support rapid reversals, and honor app/system reduced motion. Spring stiffness/damping remain the original leading620/36 and trailing190/19. No other components changed. Expanded motion test deliberately disables window.requestAnimationFrame and checks both switch directions still settle exactly.

## Ascendancy portrait and faded banner

User requested a chosen-ascendancy icon replacing the class initial and faded matching artwork behind the existing Character header, following their reference composition. Header/identity are grouped in character-banner; actual matching unmodified archive PNGs supply both portrait and softly masked decorative background. Artwork is local-only under assets/ascendancies/, with exact archive paths/SHA-256 evidence in provenance.json and source notes in README.md.19 supported ascendancy images are available, including Warden. No substitute art for unascended characters or absent Reliquarian/Luminary assets: clean initial/no-banner fallback. Decorative images have empty alt text; visible identity text supplies the name. Selection reacts to build changes and persists through existing saves. No save/engine/data-source rebuilds.

New test-character-art-ui.mjs passed Trickster/Necromancer selection, image loading, reload persistence, fallback,390px reflow and local-only requests. All130 Node regressions pass. Desktop/mobile previews: character-ascendancy-trickster.png, character-ascendancy-necromancer.png, character-ascendancy-mobile.png under docs/previews/. Browser not refreshed; new image route requires server restart.

## Portrait framing and Edit character overhaul

User requested properly fitted header icon and a bubble-like Edit character opening. Header portrait now crops into the subject with CSS positioning instead of showing a miniature whole circular art plate; Trickster/Necromancer use explicit subject focal points. Original image files unchanged.

Edit character now has a520px responsive dialog, live class/ascendancy preview, compact3-column class choices (2 on small screens), existing spring ascendancy dropdown, accurate immediate-save description and quiet footer. Existing control nodes, handlers, save contracts and storage failure notice retained. mountBubbleDialog in shared/ui/spring-dropdown.js provides a400ms sampled300/32 spring reveal from the opener's direction and gentle160ms close, native focus trapping/Escape, focus return and immediate reduced motion. No global dialog changes, new routes or dependencies.

Expanded artwork/editor browser checks passed class/ascendancy selection, saved reload, opening/closing, Escape focus restoration, reduced motion,390px bounds, fallback and offline requests. Previews: character-editor-bubble.png, character-editor-mobile.png and refreshed character-ascendancy-banner.png. No browser refresh or server restart performed for these file-only changes.

## Consistent backdrop dismissal

At user request, all native modal popups now close when a primary click starts and ends on the dimmed backdrop. Shared DOM helpers install one delegated handler per document, covering current/future dialogs. Uses requestClose/cancel (Escape pathway) so animated Edit character closes gently and existing close/focus handlers run. Inside clicks, dropdown clicks and drags starting inside remain active. Gear drafts are discarded without writing; auto-applied settings retain their existing immediate-save behavior.

New test-dialog-backdrop-ui.mjs passed all five modal types (Edit character, Combat assumptions, Settings, equipment creation, comparison), inside-click protection, gear save isolation, focus return, drag protection and mobile. No new routes/restart; browser not refreshed.

## Character settings and picture dropdowns

User requested a more useful identity editor: class/ascendancy/level, class pictures and consistent animated dropdown specs. Replaced the class button grid with the existing native class select enhanced by the spring dropdown. Each class row and selected value uses its exact archived base-class emblem (center<class>.png); all7 assets/provenance are in assets/classes/. Ascendancy rows use exact matching archived portraits; Not ascended uses the base-class icon, and absent Reliquarian/Luminary artwork uses the base-class fallback with an explicit option title. No invented images. The identity preview includes level.

Added level1–100 and campaign resistance penalty to Edit character, using existing calculation.v1 context with no schema change. Values sync both directions with Combat assumptions, affect live stats, validate integer level bounds and persist with existing storage-error notices. Class-specific passive-tree storage is preserved. Unrelated build data stays intact. Context sync explicitly refreshes custom selected-value labels.

Dropdowns now enforce one active menu and finish interrupted label rolls when another opens, avoiding overlapping menus or stuck old/new labels. Existing gentle motion, keyboard/search, reduced motion and backdrop behavior retained. Base artwork route added to server; prior verified process8220 restarted as22132. Verify identity before future stops; user browser untouched.

130 Node tests pass. New test-character-editor-ui.mjs verifies all7 image rows, ascendancy rows, actual selections, level/penalty calculation changes, two-way context sync, reload persistence, invalid level rejection and390px layout. Existing cross-screen calculation browser suite passes. Previews: character-editor-progression.png, character-class-dropdown.png, character-ascendancy-dropdown.png in docs/previews/.

## Complete portrait/icon repass against user reference

User requested every small icon and ascendancy banner be reviewed against the supplied class/ascendancy portrait reference. Located the original portrait assets linked by https://poedb.tw/us/Character_class and cached unmodified PNGs locally:7 base-class face portraits replace passive-tree emblems;18 ascendancy face-focused portraits replace miniature whole skill-tree discs. Warden retains its own reviewed full artwork and crop; no Raider substitution. Ascendant's archived ClassesAscendant.png is an empty disc, so the real portrait replaces that placeholder (also used as a subdued fallback banner). All original archives, emblems and full artwork remain preserved. Source URLs and SHA-256 hashes are in assets/classes/portrait-provenance.json and assets/ascendancies/portrait-provenance.json; game art belongs to GGG. No runtime network dependency or image generation/editing.

Small portraits apply consistently to the header, editor preview and dropdown rows/selected values. Unascended characters now show their base-class face instead of an initial. Missing Reliquarian/Luminary art still uses clearly documented base-class fallback. Dedicated face portraits are not aggressively magnified. Banner art keeps the larger source with individually reviewed vertical focal positions, notably Slayer/Gladiator/Champion lower figures and Guardian/Hierophant/Assassin/Occultist higher faces. Base-class/ascendancy selection, saves, calculations and animation behavior unchanged.

Visual review artifacts: docs/previews/portrait-crop-review.png shows all7 base classes and19 available ascendancy icon comparisons; docs/previews/ascendancy-banner-review.png shows all19 real rendered headers, with individual captures in docs/previews/ascendancy-review/. scripts/preview-portrait-crops.mjs reproduces the contact sheet; scripts/test-portrait-review-ui.mjs exercises every class/ascendancy and fallback in isolated storage. Editor and artwork/mobile/browser checks pass. Running server22132 already supports these asset paths; no restart/user-browser refresh performed.

Wrap-up checkpoint: docs/HANDOFF.md and docs/NEXT-TASK.md are now the authoritative concise continuation. Stale handoff/design notes were archived; README/current design and feature docs point to the final Character iteration. Full130 Node tests and editor/motion/backdrop/all-portrait checks pass. No pending implementation. Server22132 reverified; user browser untouched.
