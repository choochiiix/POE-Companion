# AGENTS.md — POE Companion

Repository-wide instructions for coding agents. Apply these rules from the repository root into `Path of Exile App/`; use more specific instructions if an `AGENTS.md` is later added within a subdirectory. **The Git repository root is not the application root.** Use the exact, case-sensitive filename `AGENTS.md`.

## Mission and working order

Make the smallest correct, verifiable change that satisfies the user's request. Prioritize correctness, saved-data safety, offline behavior, and existing code ownership over broad refactors or cosmetic churn.

1. Read the root `README.md`, then `Path of Exile App/README.md`, `START-HERE.md`, and `docs/HANDOFF.md`. Consult `docs/NEXT-TASK.md` for the current workflow; treat archived design notes as history, not current architecture.
2. Inspect `git status --short` and the relevant diff before editing. Preserve all uncommitted work, even if it is unrelated.
3. Identify the owning screen, shared component, domain adapter, engine, data source, and persistence boundary. Read only relevant files first; search with scoped paths rather than dumping the entire tree.
4. Implement a focused change, add or adapt the smallest useful regression check, and run the checks appropriate to the touched area.
5. Report what changed, the exact checks run and results, and anything untested or blocked. Never present historical QA as a fresh pass.

Do not invent features from a handoff document. If a requirement is genuinely ambiguous and choosing incorrectly risks data or behavior, ask one targeted question; otherwise make and state a conservative assumption.

## Directory map (high-level, not every generated file)

```text
POE-Companion/                         # Git repository root
├── AGENTS.md                          # These repository-wide agent rules
├── README.md                          # Root entry point and startup guidance
└── Path of Exile App/                 # ACTUAL application root; run root npm scripts here
    ├── README.md                      # Architecture, preservation, and contributor guidance
    ├── START-HERE.md                  # Initial reading and runtime notes
    ├── package.json                   # Node/server, engine, test, and Electron scripts
    ├── Start Crafting.cmd             # Normal Windows launcher
    ├── Start React Preview.cmd        # Separate React preview launcher
    ├── desktop/
    │   └── main.cjs                   # Electron desktop entry point
    ├── renderer/                      # PRODUCTION React 19 / TypeScript frontend
    │   ├── README.md                  # Renderer-specific setup and UI ownership
    │   ├── package.json               # Vite, React, typecheck, and build scripts
    │   ├── server.mjs                 # Optional standalone preview server (port 4321)
    │   ├── scripts/
    │   │   └── generate-aurora.mjs    # Source of generated Character aurora/palette
    │   ├── src/                       # EDIT frontend source here
    │   │   ├── App.tsx                # React app / screen composition
    │   │   ├── components/ui/         # Shared UI primitives, icons, dropdown, glass
    │   │   │   ├── icons.ts           # Shared lucide-react icon imports
    │   │   │   ├── spring-select.tsx  # Shared dropdown
    │   │   │   └── GlassSurface.jsx   # Shared glass implementation (with CSS)
    │   │   └── features/              # Screen-owned presentation and interactions
    │   │       ├── character/         # Character, gear, aurora, related styling
    │   │       ├── crafting/          # Crafting UI and odds workflow
    │   │       ├── tree/              # Passive tree canvas/allocation UI
    │   │       ├── skills/            # Skills UI
    │   │       ├── items/             # Item library UI
    │   │       ├── compendium/        # Compendium UI
    │   │       └── settings/          # Settings dialog and preferences
    │   └── dist/                      # GENERATED production bundle; never hand-edit
    ├── crafting-ui/
    │   ├── server.mjs                 # Normal local server (127.0.0.1:4317)
    │   ├── features/                  # Retained shared domain models/adapters
    │   ├── shared/                    # Retained shared logic consumed by React
    │   ├── styles/                    # Shared tokens and selected imported styles
    │   ├── assets/                    # Local artwork
    │   ├── test/                      # Server/domain integration tests
    │   └── *.json                     # Offline datasets used by the app
    ├── crafting-engine/               # Pure crafting mechanics and tests
    ├── calculation-engine/            # Pure calculations, tests, reference/trial/corpus
    ├── crafting-data/                 # Generated crafting data and tests
    ├── glossary/                      # Offline glossary / master data
    ├── data-sources/                  # Game/source snapshots (including tree data)
    ├── scripts/                       # Data generators and React browser QA scripts
    ├── docs/
    │   ├── HANDOFF.md                # Current implementation state and constraints
    │   ├── NEXT-TASK.md              # Next-request workflow; not a feature request
    │   ├── FILE-ORGANIZATION.md      # More detailed ownership map
    │   ├── UI-STANDARDIZATION.md     # UI rules and Character glass readability
    │   ├── REACT-QA.md               # Test evidence, blockers, and QA boundaries
    │   └── REACT-MIGRATION.md        # Migration history and acceptance limits
    ├── prototypes/                    # Review-only concepts, not live UI
    ├── resources/                     # Reference/source resources and provenance
    ├── references/                    # Preserved upstream reference material
    ├── vendor/                        # Vendored upstream sources and licenses
    └── release/                       # Built installer artifacts; not source
```

This is a navigation map, not an exhaustive manifest. For finer ownership, read `Path of Exile App/docs/FILE-ORGANIZATION.md`. Avoid searching `renderer/dist/`, `release/`, `vendor/`, large datasets, and archives unless the task specifically involves them.

## Ownership and implementation boundaries

- **Frontend:** The retired vanilla frontend is not the app. Implement screen changes in `renderer/src/features/`, shared control changes in `renderer/src/components/ui/`, and cross-screen composition in `renderer/src/App.tsx`. Reuse existing primitives and tokens instead of duplicating UI logic.
- **Shared domain logic:** Existing character, gear, skills, tree, settings, and calculation adapters may live in `crafting-ui/features/` and selected `crafting-ui/shared/` files. Trace their consumers before changing contracts.
- **Game rules:** Put crafting probabilities, game formulas, and calculation semantics in `crafting-engine/` or `calculation-engine/`, not React components. Preserve deterministic behavior and existing uncertainty/unsupported-mechanics notices.
- **Offline data:** Treat `crafting-data/`, `glossary/`, `data-sources/`, `crafting-ui/*.json`, artwork, source archives, and license/provenance files as protected inputs or generated artifacts. Trace the generating script and source before editing; do not silently replace or delete them.
- **Server and desktop:** Keep the normal server in `crafting-ui/server.mjs`, and desktop lifecycle/packaging in `desktop/`. The app has no cloud backend; do not introduce network dependencies or external runtime calls.
- **Generated UI:** `renderer/dist/` is served by the normal app and bundled by Electron. Change `renderer/src/`, run the renderer build, and keep generated output consistent when source changes require it. Never patch minified/built files directly.

## UI, accessibility, and data safety

- Keep layouts compact and restrained, with modest motion. Respect reduced-motion preferences, keyboard/focus interactions, small viewports, and offline operation.
- Use `lucide-react` for generic UI icons through `renderer/src/components/ui/icons.ts`. Preserve Path of Exile artwork and game-specific tree symbols.
- Use the shared `SpringSelect` for dropdown behavior. For Character aurora and glass, read `renderer/README.md` and `docs/UI-STANDARDIZATION.md`: edit `renderer/scripts/generate-aurora.mjs`, regenerate the palette/background, build, and inspect real rendered glass contrast. Do not assume changing the underlying panel background changes the visible tint.
- **Preserve saves:** The normal app lives at `http://127.0.0.1:4317/`. `localhost` and port `4321` have distinct browser storage. Do not reset, migrate, rename, or overwrite existing local-storage keys or JSON formats without explicit approval.
- Character, equipment, skills, tree, settings, themes, and calculation context are persisted locally; crafting history is session-only and disappears on refresh. Avoid refreshing or running tests against the user's live browser session.
- Keep credentials, personal saves, machine-specific paths, temporary captures, and QA profile data out of commits.

## Commands and verification

Run commands from the directory shown, not from the Git repository root. Use Node.js **22.18+** and the project's existing package managers and lockfiles.

```sh
# From "Path of Exile App/"
npm start                     # Normal local server: http://127.0.0.1:4317/
npm run typecheck             # Crafting/data/calculation TypeScript projects
npm run test:calculations     # Calculation-engine tests
npm test                      # Broader Node regression suite

# From "Path of Exile App/renderer/"
pnpm install --frozen-lockfile
pnpm typecheck
pnpm build                    # Typecheck + Vite build into renderer/dist
```

For changed React behavior, run relevant isolated checks under `Path of Exile App/scripts/test-react-*.mjs` (for example, `node scripts/test-react-crafting-qa.mjs` from the app root), and manually inspect affected desktop/mobile interactions when visual behavior changes. Use isolated browser profiles and test servers, **never** the user's saved-data origin/profile. For changes to engines or data, run focused tests first and broaden to relevant suites.

`docs/REACT-QA.md` documents historical test results, two stale pinned-PoB reference/capture checks, and a blocked baseline engine/data hash comparison. These are **known limitations, not permission to skip new checks**. Record actual command output and distinguish new results from past evidence. Never claim complete mechanical parity or release readiness from partial QA.

## Efficient agent behavior and completion contract

- Prefer `rg` in the owning directory, exact file reads, and existing docs over repository-wide or generated-output scans. Check call sites and persistence contracts before changing exported behavior.
- Avoid speculative cleanup, unrelated dependency upgrades, blanket formatting, generated-file churn, and duplicated components. Keep patches reviewable.
- Add focused tests when behavior changes; use real commands rather than assumed success. If a tool or platform is unavailable, state the limitation instead of simulating the result.
- Check the final diff for accidental edits to save formats, data, licenses, generated output, and existing user changes.
- **Do not commit, push, tag, publish, build a release installer, reset saves, or remove user files unless explicitly requested.**
- Finish with a short change summary, touched paths, exact validation results (pass/fail/not run), and any residual risk. Do not claim release approval without user sign-off.
