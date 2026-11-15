# Exile Companion UI

Production browser app: Character, Crafting, Skill tree, Skills, Item library and Compendium, with Settings in a modal. Read the root [project handoff](../README.md) for current status and limitations.

Run from the root using npm start or Start Crafting.cmd with Node 22.18+. Existing origin: http://127.0.0.1:4317/. Normal use requires no installation or network. Verify an existing server before starting/stopping one. Reload clears crafting history; localhost has separate saved data.

## Source ownership

- index.html: initial shell/static markup; feature modules also build runtime UI.
- features/: screen presentation, models and styles, including calculations.
- shared/ui/: reusable DOM/control helpers.
- shared/layout/: navigation, shared cards and inspectors.
- shared/definitions/ and shared/tags/: shared reference behavior.
- styles/: design tokens/global styles.
- server/: explicit UI URL map; server.mjs remains the entrypoint.
- test/: model/integration/HTTP checks; browser suites live in root scripts/.
- Generated JSON and assets/: preserved offline data/artwork.

Pure mechanics stay in sibling engine directories; source preparation stays outside presentation code. Preserve legacy URLs and storage contracts when replacing screens.

Upcoming work starts at [the overhaul workspace](../docs/ui-overhaul/README.md). New experiments belong in prototypes/ui-overhaul/; production remains here. See [file organization](../docs/FILE-ORGANIZATION.md).
