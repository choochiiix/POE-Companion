# Isolated shadcn Button proof of concept

Standalone React/Tailwind preview; no application pages, server routes, save keys, models or engines were changed. The source repository is fully cloned (not shallow) at ../../vendor/shadcn-ui with Git history and MIT license preserved. Pinned source commit: e62c9435fff729a175f38983dee73b2cb4f6a069, https://github.com/shadcn-ui/ui.git.

src/button.tsx is copied from apps/v4/registry/new-york-v4/ui/button.tsx; only its cn import points to a local helper. LICENSE-shadcn.md preserves upstream terms. The vendor checkout is reference material, not a runtime dependency. Its workspace packages were not installed.

## Run

From this directory, using pnpm:

```text
pnpm install --frozen-lockfile
pnpm build
pnpm preview --port 4318 --strictPort
```

Open http://127.0.0.1:4318/. Existing application port 4317 is untouched. Alternatively use the bundled Node runtime to execute pnpm/bin/pnpm.cjs; npm is not available on this machine's PATH. Dependencies and the lockfile are local to this prototype, not the root application.

## Isolation and appearance

The real React Button mounts into a Shadow DOM root. Compiled Tailwind theme/utilities stay inside it; no global Preflight or shadcn base styles are injected. Locally namespaced tokens and compact overrides match the existing secondary control. No new accent palette is imposed: active buttons use neutral charcoal, while the unused primary token follows the current source default. A future application adapter must read the selected theme, including purple presets, before production use. This preview does not claim production theme synchronization or Electron compatibility.

Actions update only in-memory counters. Reload resets them. No storage/network API or app data integration exists. Disabled and keyboard-focus states are demonstrated. The entire app has not been migrated to React.

## Verification

TypeScript noEmit passed; Vite production build passed. Build warnings report ignored `use client` directives in Radix dependency modules (client-only bundle). pnpm initially returned ERR_PNPM_IGNORED_BUILDS for esbuild's lifecycle script; its platform binary was available and the actual build succeeded without enabling lifecycle scripts.

Run `node test.mjs` with PLAYWRIGHT_MODULE set to the bundled Playwright path. Isolated Edge test passed: mouse/Enter activation, disabled state, unchanged legacy counter, matching font/line-height/radius/height, hostile global CSS cannot enter the shadow root, document control styles remain intact, 390px no horizontal overflow, no localStorage writes, uncaught errors or remote requests. Desktop screenshot visually inspected; desktop/mobile captures are preview-desktop.png and preview-mobile.png. The full application regression suite was not rerun because production sources were untouched.
