# AGENTS.md

## Project

POE Companion is a local-first Path of Exile 1 workspace for character builds, crafting, passive trees, skills and item reference. The renderer uses React 19, TypeScript, Vite, Tailwind and Radix. A loopback Node HTTP server serves the built UI and offline data. The Windows Electron app wraps the same server and renderer.

This guide applies repository-wide. Honor more specific `AGENTS.md` files in their subtrees. Run app commands in `Path of Exile App/` unless a different directory is shown. Read the [app README](Path%20of%20Exile%20App/README.md), [start guide](Path%20of%20Exile%20App/START-HERE.md) and [handoff](Path%20of%20Exile%20App/docs/HANDOFF.md). See [file organization](Path%20of%20Exile%20App/docs/FILE-ORGANIZATION.md) for finer ownership. Resolve historical discrepancies using current source and scripts.

## Repository map

Paths below are relative to the app directory.

| Path | Ownership |
| --- | --- |
| `renderer/src/main.tsx`, `renderer/src/App.tsx` | React entry, shell, hash routes and Settings dialog |
| `renderer/src/features/`, `renderer/src/components/ui/`, `renderer/src/adapters/` | Screens with colocated styles and tests, shared controls, and adapters for storage, local data and build calculations |
| `crafting-ui/server.mjs`, `crafting-ui/features/`, `crafting-ui/shared/` | Local HTTP entry, retained game-data adapters and validation used by React |
| `crafting-engine/`, `calculation-engine/` | Pure TypeScript mechanics and colocated `test/` suites |
| `crafting-data/`, `crafting-ui/*.json`, `crafting-ui/assets/`, `glossary/`, `data-sources/` | Offline snapshots, local artwork and source data |
| `crafting-ui/test/`, `scripts/` | Server and domain tests, data generators and browser QA |
| `desktop/main.cjs`, `renderer/dist/`, `release/` | Electron entry, tracked production bundle, and Windows installer artifacts |
| `docs/`, `prototypes/`, `resources/`, `references/`, `vendor/` | Current guidance, historical designs, source material and upstream reference code |

## Development commands

Use Node.js 22.18+ and pnpm. The app and renderer have separate pnpm lockfiles.

| Directory | Command | Use |
| --- | --- | --- |
| App and `renderer/` separately | `pnpm install --frozen-lockfile` | Install the dependencies for each package |
| App | `npm start` or `Start Crafting.cmd` on Windows | Serve the tracked renderer at `http://127.0.0.1:4317/` |
| App | `node renderer/server.mjs` or `Start React Preview.cmd` on Windows | Serve the built preview and local data at port 4321 |
| `renderer/` | `pnpm dev` | Vite hot reload at port 4320. Start the 4321 preview first for data and artwork proxies. |
| `renderer/` | `pnpm typecheck`, `pnpm build` | Check renderer types. Build also checks types and writes `dist/`. |
| App | `npm run typecheck`, `npm test`, `npm run test:calculations` | Check engine/data types, run the Node regression suite, or run calculation tests only |
| App | `npm run data:build` | Regenerate the RePoE crafting snapshot and import report from pinned local sources |
| App | `pnpm desktop:dev`, `pnpm desktop:dist` | Launch Electron or, with release approval, build the Windows x64 NSIS installer from a current renderer build |

The app defines no lint or format script and has no app-level CI workflow. Match surrounding formatting and scope formatter runs to edited files. The app's `.prettierrc.json` sets single quotes, a 100-column print width and trailing commas.

## Coding and architecture

Use PascalCase for React components, camelCase for functions and variables, and the owning directory's naming pattern for files. Keep feature UI under `renderer/src/features/`. Reuse shared controls, including `SpringSelect`, and design tokens in `crafting-ui/styles/tokens.css`. Import Lucide icons via `renderer/src/components/ui/icons.ts` and preserve game artwork and tree symbols. Keep motion restrained and verify keyboard focus, reduced motion and narrow layouts.

Use strict TypeScript, type-only imports for types and existing local aliases. In renderer imports, `@/` resolves to `renderer/src/` and `@legacy/` to the retained `crafting-ui/` modules. Keep Node-loaded TypeScript erasable with explicit `.ts` relative imports. Model and normalize source data in the shared adapters. Keep mechanics in the engines, preserving deterministic crafting, RNG restoration on undo and explicit unsupported-mechanic diagnostics.

Use the renderer's `adapters/api.ts` for retryable same-origin JSON reads. Keep server routes restricted to local data, artwork and the intended engine modules. Validate saved values at the storage/model boundary and preserve the session-memory fallback when storage is denied. Retain the existing `build:change` handoff when editing cross-screen build state.

## Compatibility and generated files

Keep `127.0.0.1:4317` and saved keys/JSON formats stable. `localhost` and preview ports have separate storage. Crafting history lives in memory and clears on refresh. Use isolated browser profiles and ports for QA, and preserve the user's active session. Save resets and migrations require explicit authorization.

Edit renderer source and rebuild `renderer/dist/` whenever renderer inputs change. For aurora or glass changes, use `pnpm generate:aurora` from `renderer/` as applicable and inspect rendered contrast. See the [renderer guide](Path%20of%20Exile%20App/renderer/README.md) and [UI standard](Path%20of%20Exile%20App/docs/UI-STANDARDIZATION.md). Trace data outputs to their generator in `scripts/` before editing. Preserve pinned sources, hashes, assets, licenses and provenance.

## Verification

Add focused coverage when existing tests miss a behavioral change. Run the relevant checks, typecheck and regression suite. For a focused Node test, run `node --experimental-strip-types --test crafting-engine/test/engine.test.ts` from the app directory or substitute the relevant test path. Run colocated renderer tests directly when relevant since `npm test` omits them.

For React changes, build first and run the affected browser checks from the app directory, for example `node scripts/test-react-crafting-qa.mjs`. Set `PLAYWRIGHT_MODULE` to a resolvable Playwright module when required. The React QA scripts launch Edge. Check visual changes at desktop and narrow viewports. The [QA record](Path%20of%20Exile%20App/docs/REACT-QA.md) separates migration-era stale PoB capture checks from later passing verification; the original preservation baseline remains missing. Report new results separately from recorded evidence and leave reference guards intact.

## Agent workflow

Check `git status --short`, existing diffs, call sites and save/data contracts before editing. Preserve existing work and keep edits tied to the request. Update the relevant guide when commands or ownership change. Review the final diff and report the checks run and any blockers. Keep credentials, personal saves and local QA captures out of changes. Commits, pushes, tags, installer builds and publishing require an explicit request.

## Subagent delegation

Delegate well-scoped research, investigation, implementation or verification when it improves efficiency or accuracy. If the parent agent uses any Sol model, regardless of reasoning effort, it may spawn only agents using Luna High. If the parent agent uses a Luna model, it may also spawn only agents using Luna High. When useful, either parent may use all three available subagent slots. Specify each agent's scope and deliverable, and keep concurrent edits disjoint. The primary agent owns coordination, integration, validation and final quality.
