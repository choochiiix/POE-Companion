# First source-to-build trial

This is a deliberately narrow integration experiment, not the application-wide data adapter. No UI, routes, live saves or source data are changed.

The trial reads existing local RePoE base/mod records, the PoB tree JSON and generated gem tooltip data. It assembles a level-20 Witch with two connected passives (57264 and 33296), level-1 zero-quality Fireball and Elemental Focus, an ordinary Rusted Sword with its 40% global accuracy implicit, and a zero-quality Plate Vest at the midpoint of its base armour range (23). The sword is equipped but does not supply the spell's damage; its local weapon values are compared separately.

`adapter.ts` translates only the exact stat forms used by this fixture. It reads level-1 endpoints, cast time and crit chance from gem records, translates the support's 20% more elemental damage and the two passives' 28% increased spell damage / 16 flat mana, and resolves base class attributes and equipment. Unsupported passive lines remain source diagnostics. Elemental Focus disables ailments in PoB, so ignite is excluded by the scenario. Plate Vest movement speed, mana costs and projectile/AoE behavior are declared out of scope, keeping the result partial.

`source-constants.json` contains four raw character constants captured from pinned PoB's data table, not calculated build outputs. The life/mana level offsets 38/34 follow `CalcSetup.lua`; the adapter applies the per-level constants and ordinary attribute bonuses independently. Enemy elemental resistances and player campaign penalty are explicitly zero. Evade chance, enemy physical mitigation and survivability are not compared.

## Actual reference execution

`../reference/run-build-trial.py` verifies the preserved archive hash, extracts code/data/native runtime into a checked disposable workspace directory, and boots the actual `HeadlessWrapper.lua`. A loader removes the runtime's `#@` file headers; headless graphics stubs are upstream. Background scripts, process launches, URL opening and interactive prompts are disabled. The reference runs its own item parsing, passive allocation, gem/support construction and build calculator. Temporary source changes never touch the preserved archive. No installer, dependency or network download is required.

`../reference/trial.lua` defines the equivalent build and captures selected outputs, modifier totals and raw source values. The small `build-capture.json` records the archive, runner, trial-script and local-source hashes. Tests reject stale capture/tool/source combinations. Headless execution is a Windows development tool; normal tests compare the saved capture without loading DLLs.

From the app directory, using an installed compatible Windows Python interpreter (not the Windows Store alias):

```powershell
python calculation-engine/reference/run-build-trial.py --output calculation-engine/reference/build-capture.json
node --experimental-strip-types calculation-engine/trial/run.ts
node --experimental-strip-types --test calculation-engine/test/trial.test.ts
```

The Node command writes `report.json`; `npm run calculations:trial` is equivalent. Recreating the capture after changing raw character constants also requires explicitly updating `source-constants.json` from the captured raw constants, never from calculated output stats.

## Result and correction

All **26 selected comparisons match within 1e-9**: attributes, pools, armour/evasion, resistances, weapon base damage/rate, spell base range, increased/more totals, average normal/critical expectation, cast rate, hit/crit chance and hit DPS. Representative values: 285 life, 186 mana, 23 armour, 15 evasion, 18 normal average fire damage, 18.45 average hit including critical expectation, and 24.6 hit DPS.

The experiment exposed the original continuous engine's rounding difference. Explicit `CalculationInput.rounding: 'pob'` now rounds final per-type hit endpoints and defensive pools to nearest integers; omitted/continuous keeps existing callers unchanged. This policy matches this trial's ordinary mechanics, not every rounding site in PoB. Tests retain the continuous-mode difference rather than changing expected outputs to fit our engine.

This verifies one simple actual build through local source adapters and the independent engine. It does not establish general gem-level interpolation, arbitrary description parsing, complete support matching, passive legality, cost sustain, ailment calculations or broader PoB parity. Expand fixture coverage before connecting the full application.
