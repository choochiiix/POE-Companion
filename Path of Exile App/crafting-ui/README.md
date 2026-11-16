# Local application data and adapters

The production interface is the React app in `../renderer/`. This folder keeps the local HTTP server, offline datasets and artwork, plus selected domain models and styles that React still reuses.

- `server.mjs` serves the built React entry and assets at `127.0.0.1:4317`, then handles local dataset, artwork, and engine-source requests.
- `features/` contains shared data validators, crafting/catalog adapters, calculation assembly, theme models, and a few styles imported by React. Retain files that `renderer/src/` imports.
- `styles/tokens.css`, `shared/layout/cards.css`, and `features/{character,items,skills}/*.css` are still used by the React build.
- JSON datasets and `assets/` are bundled offline data and artwork; preserve them and their provenance.
- `test/` covers the retained data/model/backend code and local HTTP boundary.

The retired vanilla HTML shell and screen controllers were removed. The separate React development preview remains in `../renderer/server.mjs` on port 4321.
