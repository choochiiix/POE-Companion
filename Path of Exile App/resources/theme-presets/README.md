# VS Code colorway adaptations

Researched November 14, 2026. These are ten popular openly licensed **color** theme families, selected from the install-ranked list at https://www.pluginstats.com/marketplaces/vscode/categories/themes. Icon packs, bundled language tooling, deprecated Material entries and the commercial Monokai Pro product were excluded. Consequently this is a curated ten, not a claim of the ten largest unfiltered Marketplace entries. The app also retains its original Ayu Aurora default.

The palette roles are adapted to this application, not complete VS Code theme ports. No extension code is installed/executed. Primary background/panel/control/foreground/accent values come from the following upstream sources; secondary text, hover, border and glow shades are derived blends for this app. Ayu's source alpha foreground is made opaque for readability. Game gem/unique semantic colors remain intact. No geometry tokens change.

| App preset | Official source |
| --- | --- |
| GitHub Dark (classic) | https://github.com/primer/github-vscode-theme/tree/main/src/classic |
| One Dark Pro | https://github.com/Binaryify/OneDark-Pro |
| Dracula | https://draculatheme.com/spec |
| Atom One Dark | https://github.com/akamud/vscode-theme-onedark |
| Ayu Dark | https://github.com/ayu-theme/vscode-ayu |
| Winter is Coming (Dark Blue) | https://github.com/johnpapa/vscode-winteriscoming |
| Night Owl | https://github.com/sdras/night-owl-vscode-theme |
| Tokyo Night | https://github.com/tokyo-night/tokyo-night-vscode-theme |
| One Monokai | https://github.com/azemoh/vscode-one-monokai |
| Palenight | https://github.com/whizkydee/vscode-palenight-theme |

Upstream MIT license notices are retained alongside cached palette/generator text. `*-source.json` records source URLs and Git blob IDs when obtained through the GitHub contents API; the manifest records local SHA-256 hashes. Dracula's published specification supplied its palette; its upstream MIT notice is retained. Files are development provenance only and are never served by the companion. Production preset definitions are in `crafting-ui/features/settings/theme-presets.js`.

## Fonts

Color themes do not provide a unique universal font. These adaptations use a VS Code-style combination (local system UI, Consolas/monospace card text). A separate Font style control offers system sans-serif, Consolas, Georgia, and optional locally installed Fira Code / JetBrains Mono. Missing optional fonts fall back to Consolas/Courier New/monospace. No font binaries, font licenses, webfonts, CDNs or network requests are added. The original default restores the app's inherited original fonts.

Presets save the existing version-1 theme shape, without adding a preset ID to saved data; the selected name is identified from the saved colors. Custom colors/fonts remain recognizable as Custom. Reset preferences remains separate; Restore original theme resets only theme appearance. Runtime is fully offline.
