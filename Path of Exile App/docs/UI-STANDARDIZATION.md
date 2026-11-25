# Application UI standardization

## Reference and shared implementation

Use the current Character page as the visual reference for the React renderer. Preserve its compact Equipment workspace, statistics rail, portrait framing, and Overview and Comparison states. The main grid stacks at 1050px. Apply the same visual roles to Crafting, Skill tree, Skills, Item library, Compendium, Settings, and the shared shell while retaining each screen's layout and workflows.

The shell selects Aurora artwork through `App.tsx` and exposes `data-aurora` across all routes. Shared panels, sidebar and workspace surfaces use the common glass layer. Settings uses lightweight tinted preference cards and a near-opaque outer dialog. Trace the CSS cascade through `renderer/src/main.tsx`, `renderer/src/styles/index.css`, `crafting-ui/styles/tokens.css`, the generated palette, and the Character feature styles before moving rules into shared ownership.

## Live glass and Aurora

`renderer/src/components/ui/LiquidGlassLayer.tsx` composes the shared `GlassSurface`. The current wrapper uses native live backdrop sampling through the SVG-enhanced path where supported, with a frosted fallback. It supplies no backdrop texture to the WebGL path. Keep the Aurora artwork as a separate backdrop and put the decorative glass below interactive content, with inherited corners and pointer transparency.

The Character panel overlay uses tint stops of 11%, 8%, and 5%, with `var(--filter-id) blur(4px) saturate(112%)` on the SVG path. Its rules come from `renderer/scripts/generate-aurora.mjs` and are emitted to `renderer/src/features/character/aurora-palette.generated.css`. Edit the generator for generated values. Settings overrides the generic dialog surface with a 94% dark fill and no backdrop filter; its preference cards use lightweight palette-tinted fills without LiquidGlassLayer in `renderer/src/features/settings/settings.css`. Check computed styles and visible contrast over light and dark parts of the backdrop, including after scrolling and changing Aurora.

Preserve the bundled quantized, dithered Aurora artwork and its flowing base pattern when adding or revising variants.

Emerald is the default for absent or invalid values of `poe-companion.aurora-background.v1`. Violet and Rose Gold also have matching accent roles. Keep that preference separate from the existing theme, font and build saves. The selected Aurora drives the shared backdrop, glass chrome and default interaction accents. Keep existing theme and font choices effective in their applicable roles. Verify both change orders and reload. Keep dialogs, definition popovers and SpringSelect menus correctly themed even when they render through a portal or in the browser's top layer.

## Shared design and behavior

Read the effective styles from Character's shell, overview, identity editor, gear editor, and overlays. Map typography, padding, gaps, radii, control heights, borders, shadows and interaction states by role. The Character glass panels use 12px corners, while the gear editor's main inputs use 40px height and 8px corners. Keep room for denser controls and for screen-specific layouts. Preserve item rarity and gem colors, artwork, tree symbols and game-reference card treatments.

Reuse the shared controls and Lucide icons. SpringSelect retains its native select events, keyboard navigation, search and selection feedback. SpringDisclosure and Plan Switch retain their existing motion. Dialogs retain opener-based entry motion, focus restoration, and nested Escape handling. Check both OS and in-app reduced motion. Give shared shell, token, glass and control changes a single owner, keep route composition in feature code, and review Character fidelity before broad adoption.

| Surface | Behavior to preserve |
| --- | --- |
| Character | Identity and progression, portraits, combat assumptions, gear drafts, resistance sources, and compare/equip |
| Crafting | Seeded replay, RNG restoration on undo, session history, spending, worker odds, and compare/equip |
| Skill tree | Pan, zoom and fit, search and highlighting, allocation and refunds, masteries, class-specific saves, and export |
| Skills | Group editing, filters, support compatibility, inspectors, and the Character calculation handoff |
| Item library | Cascading filters, variants, inspector focus, item metadata, and compare/equip |
| Compendium | Collections, search, variants, effect details, definitions, and source links |
| Settings and shell | Immediate appearance changes, scoped resets, navigation and aliases, dialog focus, and local saves |

Keep the mounted route lifecycle, `workspace:change` panel IDs, `build:change`, and the Skills calculation and item comparison handoffs. Keep the normal app at `127.0.0.1:4317` with existing save keys and formats.

## Verification

Capture Character before changing shared styles. Compare the same fixture and states before and after, using the same browser version, viewport and preferences. Then compare equivalent components on each migrated route with Character using screenshots and computed styles. Include desktop and narrow views, all three Auroras, the responsive boundaries, a scrolled view, populated equipment, dialogs, and open dropdowns. Verify keyboard and focus behavior, text contrast, reduced motion, glass fallback, absence of page-width overflow, and local-only requests. Use isolated ports and storage and keep captures away from historical QA artifacts.

Regenerate the palette with `pnpm generate:aurora` when generator-owned rules change. Run the renderer typecheck and build, rebuild the tracked `renderer/dist/`, and run the applicable app regression, colocated renderer, and React browser checks. Use the existing visual sweep, foundation, theme, storage and feature QA scripts as applicable. Record new outcomes separately from historical runs, dated PoB comparisons and the missing preservation baseline in [React QA](REACT-QA.md).
