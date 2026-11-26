# React renderer

The React 19 / TypeScript app is the normal frontend. The regular launcher serves the built files from `renderer/dist` at `http://127.0.0.1:4317/`, keeping the established browser origin and saved data. The local server continues to provide offline data, artwork, and engine-source endpoints.

## Build

From this directory, run:

```powershell
pnpm install --frozen-lockfile
pnpm build
```

Then restart the normal app (`npm start` from the project root or `Start Crafting.cmd`) to serve the updated bundle.

## Development preview

`Start React Preview.cmd` starts `server.mjs` at `http://127.0.0.1:4321/`. That separate port has separate browser storage. For Vite hot reload, start the combined preview server on 4321, then run `pnpm dev` on 4320; Vite proxies local data and artwork requests to the preview server. `pnpm typecheck` checks the renderer.

The renderer uses bundled shadcn-style components and Radix primitives. Shared domain models and selected styles are imported from `crafting-ui/`; pure crafting/calculation engines remain in their own packages. The pinned shadcn license is retained in this directory.

## Workspace Aurora glass

All routes share the sidebar and selected fixed Aurora background. Settings stores the plain string `emerald`, `violet`, or `rosegold` under `poe-companion.aurora-background.v1`. Emerald is the default. The Aurora adapter keeps the selection for the current session if storage is unavailable. A change updates the current screen and open menus immediately.

### Glass readability and tuning

`src/components/ui/LiquidGlassLayer.tsx` wraps GlassSurface for native live backdrop sampling. The image belongs to the shell. The SVG-capable layer uses `var(--filter-id) blur(4px) saturate(112%)` and an 11% / 8% / 5% tint gradient. GlassSurface supplies the fallback. Edit `scripts/generate-aurora.mjs` and run `pnpm generate:aurora` when changing generated rules. Rebuild the renderer after source changes.

Use the shared Panel for a workspace panel. Semantic containers such as a navigation region or inspector can use `.workspace-glass` and one decorative LiquidGlassLayer. Keep long rows, game cards and canvas contents lightweight. Settings uses a near-opaque outer dialog with no backdrop filter and lightweight tinted preference cards without LiquidGlassLayer. DialogContent uses explicit surface variants, including for portals opened while another screen is active.

Aurora supplies the backdrop, chrome, selection and focus. Color themes supply text and inset surfaces in migrated workspaces. The font selector controls interface and reference font roles where applicable. Character retains its reference typography and composition, including its 1050px Equipment and statistics breakpoint. Item rarity, equipped cards, gem treatments, portraits and tree symbols retain their game-specific styling.

## UI icon standard

Use `lucide-react` for UI icons and import them through `src/components/ui/icons.ts`. Keep icon sizing and stroke weight consistent with nearby controls. Do not add hand-drawn SVGs or text glyphs for generic UI actions. Preserve Path of Exile-specific artwork and game-semantic node symbols, since they represent source data rather than interface decoration.

## Skill tree rendering

The Skill tree draws from the full local 3.29 snapshot and the sprite rectangles in sprites.json. The canvas uses the bundled background, cluster art, frames, node icons and connectors. The **Highlight nodes** filter uses static outlines, and the inspector distinguishes hover previews from pinned nodes. Allocation and saved-tree behavior still use TreePage.tsx and the existing adapters. Character shares the same cached snapshot, while the artwork loads when the Skill tree opens.
