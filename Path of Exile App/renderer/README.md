# React renderer

Parallel React 19 / TypeScript / shadcn renderer. The existing production app and every engine, dataset, save key, asset and route alias stay in place.

Run `pnpm install --frozen-lockfile` in this directory, then `pnpm build` and `node server.mjs`. Open http://127.0.0.1:4321. Set `RENDERER_PORT` to choose another standalone port. The combined server serves the built renderer and delegates existing offline data/artwork routes to the original server factory without connecting to or restarting the live application.

For development, keep the combined server running on 4321 and run `pnpm dev` (4320). Vite proxies offline resources to the standalone server. `pnpm typecheck` checks the renderer; the existing root regression suite checks engines and source adapters separately.

The current workspace reuses the already installed proof dependencies through a local node_modules junction. The package manifest and frozen lockfile make a normal independent install possible on another machine. The shadcn license is retained alongside the vendor archive.
On Windows, `Start React Preview.cmd` in the project root opens the standalone preview using the bundled runtime. It never rebuilds or restarts the production application.
Shared Button follows the pinned shadcn component source (license retained); Radix supplies dialog/popover accessibility. React adapters preserve the existing dropdown, disclosure and Plan Switch spring samples with explicit lifecycle cleanup. The renderer imports only pure source models/adapters and unchanged crafting/calculation engines. Vite may report ignored upstream Radix use-client directives; these do not affect this browser-only renderer build.
