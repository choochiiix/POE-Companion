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

## UI icon standard

Use `lucide-react` for UI icons and import them through `src/components/ui/icons.ts`. Keep icon sizing and stroke weight consistent with nearby controls. Do not add hand-drawn SVGs or text glyphs for generic UI actions. Preserve Path of Exile-specific artwork and game-semantic node symbols, since they represent source data rather than interface decoration.

## Skill tree rendering

The passive tree is drawn to canvas in `src/features/tree/tree-canvas.ts`. Nodes use circular marks sized by type; the **Highlight nodes** list emphasizes a selected category while dimming the rest. Matching nodes use a pointer-responsive orange-to-purple rim gradient. Adjust its colors, stops, glow, and pointer response in the `TREE_BEAM_STYLE` constant near the top of `tree-canvas.ts`. The animation is pointer-driven and respects reduced-motion preferences. Keep allocation and saved-tree behavior in `TreePage.tsx` and its existing adapters.
