# Start here

Upcoming UI overhaul: start at [docs/ui-overhaul/README.md](docs/ui-overhaul/README.md). Production remains in crafting-ui/; new design experiments belong in prototypes/ui-overhaul/.


Read **README.md** for the current master handoff. A concise continuation brief is in [docs/HANDOFF.md](docs/HANDOFF.md).

Double-click **Start Crafting.cmd** in this folder, or run `npm start` with Node 22.18+. Open **http://127.0.0.1:4317/** and leave the server running. Normal use needs no dependency installation and no internet. This is a local browser companion, not a packaged desktop app.

Use the same browser origin for your saves: `localhost` and `127.0.0.1` store data separately. Refreshing clears the current crafting session; character, equipment, skills, tree, settings and themes have separate local persistence.

## Organization

- `crafting-engine/`: standalone TypeScript crafting engine and tests.
- `crafting-data/`: generated crafting bundle and snapshot tests.
- `crafting-ui/features/`: Character, Crafting, tree, item library, Skills, Compendium and Settings source.
- `crafting-ui/shared/`, `styles/`, `server/`, `test/`: shared UI/models, tokens, route map and regression tests.
- `crafting-ui/assets/`: local unique-item, buff and currency artwork; do not remove.
- `scripts/`: explicit offline builds/imports and development checks.
- `glossary/`, `resources/`, `data-sources/`, `references/`: glossary, cached sources/provenance/licenses and original archives; preserve them.
- `docs/`: design, source limits, handoff and preview images.
- `prototypes/catalogix/`: retained historical design concept, separate from production.

The only project root is `C:/Users/wshan/Documents/ChatGPT/Path of Exile App`. No Git repository exists here. Do not create another project copy. See [docs/FILE-ORGANIZATION.md](docs/FILE-ORGANIZATION.md) for conventions and compatibility routes.
