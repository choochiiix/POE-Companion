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

The Character route supports three locally bundled aurora backgrounds: Emerald (the default), Violet, and Rose Gold. Settings stores the selected background in `poe-companion.aurora-background.v1`; the selection updates both the page background and the `LiquidGlassLayer` backdrop ref. The colors remain independent of the separate color-theme/font preference. `scripts/generate-aurora.mjs` owns the procedural pixel/dither rendering and generated palette CSS. Keep its supersampling, palette quantization, and characteristic flowing diagonal aurora pattern when generating variants.

The Character overview places the wide Equipment workspace beside a narrower right statistics rail with core stats, attributes, and breakdown. Resistance and skill context remain in supporting lower panels. Below 1050px, the areas stack into one column.

`src/components/ui/GlassSurface.jsx` and its CSS are the shared GlassSurface implementation. `src/features/character/CharacterPage.tsx` owns the shared `LiquidGlassLayer`, also used by Settings. Glass layers use native `backdrop-filter: blur(22px) saturate(110%)` to sample the live rendered page directly behind the surface. The background image is not passed as a WebGL texture: replacing the aurora changes what the glass samples without changing the glass component. Glass text is neutral white/gray; green/teal stays reserved for accents.

### Glass readability and tuning

Keep text contrast readable over the aurora. Each glass card has a `.character-glass-layer` above its low-opacity base panel, with content above the glass. The current native backdrop blur samples live pixels; the generated `.character-glass-layer.glass-surface--svg` gradient supplies the colored tint at 24%, 18%, and 12%. Edit that gradient in `scripts/generate-aurora.mjs`, regenerate the CSS, and rebuild rather than hand-editing generated output. Settings has a matching tint rule in `features/settings/settings.css`. When tuning, inspect the rendered cards and computed `backdrop-filter`; verify that changing or replacing the page background changes the sampled appearance. Keep headings, values, and equipment text clear against the brightest parts of the backdrop while preserving the glass effect.

## UI icon standard

Use `lucide-react` for UI icons and import them through `src/components/ui/icons.ts`. Keep icon sizing and stroke weight consistent with nearby controls. Do not add hand-drawn SVGs or text glyphs for generic UI actions. Preserve Path of Exile-specific artwork and game-semantic node symbols, since they represent source data rather than interface decoration.

## Skill tree rendering

The passive tree is drawn to canvas in `src/features/tree/tree-canvas.ts`. Nodes use circular marks sized by type; the **Highlight nodes** list emphasizes a selected category while dimming the rest. Matching nodes use a pointer-responsive orange-to-purple rim gradient. Adjust its colors, stops, glow, and pointer response in the `TREE_BEAM_STYLE` constant near the top of `tree-canvas.ts`. The animation is pointer-driven and respects reduced-motion preferences. Keep allocation and saved-tree behavior in `TreePage.tsx` and its existing adapters.

### Aurora background variants

The three PNG assets (`aurora-emerald.png`, `aurora-violet.png`, `aurora-rosegold.png`) are bundled in `src/features/character/` and switch without a page reload. Matching violet and Rose Gold accent variables live in `src/features/character/character.css`; Emerald uses the generated base palette. The selector changes background art and corresponding interface accents without overwriting independent theme/font settings. The versioned preference defaults to Emerald when absent or invalid. Rebuild `renderer/dist` after changing renderer source because the normal server and Electron package serve that directory.
