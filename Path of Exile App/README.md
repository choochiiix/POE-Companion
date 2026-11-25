# POE Companion

Local-first Path of Exile 1 workspace for Character builds, Crafting, Skill tree, Skills, Item library and Compendium. React 19 and TypeScript provide the interface; a loopback Node server serves the built renderer, offline data, artwork and engine modules. Electron wraps the same server and renderer on Windows.

## Run

Use Node.js 22.18 or newer. From this directory, run `npm start` or open `Start Crafting.cmd`, then visit **http://127.0.0.1:4317/**. The tracked `renderer/dist/` is the production UI. Keep this origin for existing browser saves; localhost and other ports have separate storage. Crafting history is session-only and clears on refresh.

## Develop and verify

Install dependencies with `pnpm install --frozen-lockfile` in this directory and separately in `renderer/`; each has its own lockfile.

| Directory | Command | Purpose |
| --- | --- | --- |
| App | `npm run typecheck` | Crafting engine, crafting data and calculation engine TypeScript |
| App | `npm test` | Full Node regression suite |
| App | `npm run test:calculations` | Calculation engine tests |
| App | `npm run calculations:release` | Captured PoB Community 2.68.1 comparison |
| App | `node renderer/server.mjs` | Built preview plus data/artwork on port 4321 |
| `renderer/` | `pnpm dev` | Vite on port 4320; start the 4321 server first for proxies |
| `renderer/` | `pnpm typecheck` / `pnpm build` | Check types / check types and rebuild tracked `dist/` |
| `renderer/` | `pnpm generate:aurora` | Regenerate Aurora CSS after generator changes |
| App | `pnpm desktop:dev` | Launch Electron |

React browser checks live in `scripts/test-react-*.mjs`; use isolated storage and ports. See the [renderer guide](renderer/README.md) for preview details. Installer builds (`pnpm desktop:dist`), commits, pushes, tags and publishing require explicit authorization. Source package version is 0.3.0; the checked-in installer remains 0.2.0.

## Current evidence and limits

The November 21 calculation upgrade records 145 passing Node tests, including 57 calculation tests, and 190 matching selected values across seven PoB Community 2.68.1 fixtures. These are recorded results, not a fresh run. Calculation coverage remains partial and the app retains older pinned item, gem and tree snapshots. See the [comparison coverage](calculation-engine/reference/v2.68.1/README.md).

The original React migration preservation baseline is missing; that historical SHA-256 comparison remains unverified. See [QA evidence](docs/REACT-QA.md) for dated results and release boundaries.

## Guides and ownership

Start with [START-HERE](START-HERE.md), the [current handoff](docs/HANDOFF.md), [file organization](docs/FILE-ORGANIZATION.md), [UI standard](docs/UI-STANDARDIZATION.md), and [next-task guide](docs/NEXT-TASK.md). Pure mechanics belong in `crafting-engine/` and `calculation-engine/`; retained shared data adapters live in `crafting-ui/`. Preserve saved keys/formats, offline behavior, source hashes, artwork, archives and licenses. Historical design and migration records describe earlier implementations where explicitly labeled.
