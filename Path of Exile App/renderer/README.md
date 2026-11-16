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

## Character aurora glass

The Character route uses the generated ASCII aurora background and its matching green/teal palette. `scripts/generate-aurora.mjs` generates `src/features/character/ascii-aurora-emerald-balanced.png` and `src/features/character/aurora-palette.generated.css`; edit the generator palette and parameters rather than the generated CSS. The aurora stays fixed behind the full Character page as it scrolls. The shell shares the backdrop image ref with the Character page, while GlassSurface is limited to the Character sidebar and panels.

The Character overview places the wide Equipment workspace beside a narrower right statistics rail with core stats, attributes, and breakdown. Resistance and skill context remain in supporting lower panels. Below 1050px, the areas stack into one column.

`src/components/ui/GlassSurface.jsx` and its CSS are the React Bits JS-CSS GlassSurface source. `src/features/character/CharacterPage.tsx` owns the shared `LiquidGlassLayer` settings. The current WebGL treatment uses distortion scale `-28`, zero RGB offsets, `displace={3.5}`, and `blur={22}`. `displace` controls WebGL backdrop diffusion sampling; `blur` smooths the displacement map. Glass text is neutral white/gray; green/teal stays reserved for accents.

## UI icon standard

Use `lucide-react` for UI icons and import them through `src/components/ui/icons.ts`. Keep icon sizing and stroke weight consistent with nearby controls. Do not add hand-drawn SVGs or text glyphs for generic UI actions. Preserve Path of Exile-specific artwork and game-semantic node symbols, since they represent source data rather than interface decoration.

## Skill tree rendering

The passive tree is drawn to canvas in `src/features/tree/tree-canvas.ts`. Nodes use circular marks sized by type; the **Highlight nodes** list emphasizes a selected category while dimming the rest. Matching nodes use a pointer-responsive orange-to-purple rim gradient. Adjust its colors, stops, glow, and pointer response in the `TREE_BEAM_STYLE` constant near the top of `tree-canvas.ts`. The animation is pointer-driven and respects reduced-motion preferences. Keep allocation and saved-tree behavior in `TreePage.tsx` and its existing adapters.
