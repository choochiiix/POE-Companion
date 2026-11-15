# Delivery validation

Verified on November 13, 2026:

- Node.js **24.22.1**, native TypeScript stripping: **37 standalone engine/adapter tests passed**, plus **3 project integration tests** (40 total, 0 failures/skips).
- TypeScript **5.8.3**: strict type checks passed for the engine/adapter and real-snapshot test projects. Bundled Node type declarations were supplied through `--typeRoots`; no project runtime dependencies were installed.
- Both interpreters use the same currency plans. Tests compare Monte Carlo sampling with exact enumeration for **all ten currencies** and hand-calculate several tiny fixture probabilities.
- No in-game validation was performed. Counts, special base behavior and other disclosed assumptions still need the checks in `SPOT_CHECK.md`.

Commands (substitute your Node/TypeScript paths, or use package scripts after `npm install`):

```text
node --experimental-strip-types --test test/engine.test.ts
tsc --noEmit
```

The first test run found a floating-point endpoint issue in the Wilson confidence interval at zero successes. Endpoints are now explicitly 0 and 1 at the boundaries, and the complete suite passes after the fix.

Development tooling was used for validation only. The current project zip contains the engine, UI, source exports, generated data, build script, tests and documentation, with no compiler download or node_modules. See `../DELIVERY.md` for the current integration checks.
