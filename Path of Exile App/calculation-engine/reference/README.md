# Pinned PoB executable reference harness

`pin.json` pins the preserved source ZIP by SHA-256 and the inspected files independently. Archive manifest identifies **2.67.2**; no Git commit is available, so the archive hash is the authoritative revision, not a claim of current live-patch compatibility. Upstream license remains `../POB-LICENSE.md`.

`run-lua-reference.py` verifies those hashes, extracts only the bundled Windows `lua51.dll` into a private temporary directory, executes exact source slices from CalcDefence.lua and Common.lua, and removes the temporary runtime. It does not launch PoB, execute Launch.lua, load builds, or access the network. It needs Windows, compatible Python, and the existing ZIP. No installed Lua executable or third-party Python package is required. Expected startup runtime absence errors are not replaced with guessed outputs.

From the project root:

```powershell
python calculation-engine/reference/run-lua-reference.py --output calculation-engine/reference/capture.json
node --experimental-strip-types calculation-engine/reference/compare.ts
node --experimental-strip-types --test calculation-engine/test/reference.test.ts
```

Use the bundled Python path from `docs/HANDOFF.md` if `python` resolves to the Windows Store alias. The first command hashes the 640MB ZIP, so it takes longer than ordinary unit tests. The capture is committed as a small offline fixture so ordinary tests do not load DLLs. To validate the engine against fresh actual Lua, rerun the first command before comparing.

## Verified scope and discrepancy

Ten cases execute PoB `hitChance`, raw `armourReductionF`, and rounded `armourReduction`. Nine are compared to the corresponding engine rules. The rounded armour result is retained as evidence, not compared to our intentionally continuous output. Raw PoB armour reduction is explicitly capped at 90% before comparing to the engine's combined armour/cap helper.

Eight compared cases match. **One known difference remains visible**: PoB's bundled Lua evaluates `hitChance(0,0)` as 100 through NaN/min/max behavior; the engine deliberately defines zero accuracy as 5%. `compare.ts` reports `allMatch:false` and the exact difference, while returning a failure exit code only for *unexpected* differences. No test labels this boundary as matching.

## First headless build trial

`run-build-trial.py` now boots the actual archived headless build calculator, with disposable extracted source/runtime and disabled background actions. `trial.lua` creates one restricted Witch/Fireball/Elemental Focus fixture, using real items and passives. `build-capture.json` stores its independently calculated outputs and tooling/source hashes. The local-source adapter matches 26 selected comparisons; see [trial documentation](../trial/README.md) for exact commands, exclusions and rounding correction. This runner loads full code/data to calculate the fixture; it does not make the limited helper runner above a full-build test.

## Broader full-build parity remains pending

The archive contains HeadlessWrapper.lua and extensive upstream specs. The new trial runner bootstraps it using the bundled Lua DLL, without a Lua command on PATH. Coverage beyond this one explicit scenario, XML import/export comparisons and extensive build corpora remain pending. Extend with equivalent reference and local-source fixtures, compare intermediate/final stats, and record unsupported mechanics. Do not label synthetic or manually computed fixtures as PoB outputs.
