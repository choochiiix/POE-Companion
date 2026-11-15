# Ordinary skill assembly

`src/skill.ts` exposes `resolveWeapon(WeaponInput)` and `assembleSkill(SkillAssemblyInput)`. All inputs are normalized numerical source data, not description strings. The returned `skill` and `sources` plug into `CalculationInput` or `assembleBuild`; root exports may expose these helpers as well.

Local physical weapon damage is `(base + local added) × (1 + local increased / 100) × (1 + quality / 100)`, rounded to integer endpoints. Local attack speed rounds to two decimal places; local critical chance is resolved before global critical modifiers. These ordinary formulas were checked against the preserved PoB `src/Classes/Item.lua`. Global weapon modifiers must not repeat local values.

Skill damage uses `source base × baseMultiplier + external added × addedDamageEffectiveness`, matching the separation in `CalcOffence.lua`. Factors use decimal multipliers, e.g. 4.8 for 480% effectiveness. Spell source damage/time/critical chance come from caller-selected gem level; attack source values come from the resolved weapon. Assemble external added ranges before global damage modifiers so min/max remain distinct.

Support compatibility uses caller-provided compatible attack/spell kinds and all-required/excluded tags. It is a limited normalized policy, not a translation of every PoB skill-type expression. Applied support modifiers are scoped to the exact assembled skill ID. Duplicate support IDs throw; explicitly incompatible supports are listed in `rejectedSupports`. Adapters should show these rejections and must not treat rejected effects as active. Skill/support `unsupported` descriptions become normal source diagnostics and mark calculations partial.

Tests exercise the actual Rusted Sword base in the preserved RePoE snapshot and Fireball level-20 reference endpoints/effectiveness in the existing gem catalog. Fireball's ignite is explicitly unsupported. These are source-backed hand calculations, not a full PoB differential comparison. The attack fixture's support is an explicit synthetic modifier, not a claim that a particular real support gem has that effect.

Not handled here: automatic gem level lookup, parsing skill descriptions/Lua, weapon restrictions beyond caller policy, alternate-quality weapon effects, local elemental weapon modifiers, attack-time overrides, weapon-specific skill transformations, repeats, support transformations, cooldowns/costs, socket/link validation or full build import. Caller adapters must declare unresolved mechanics rather than silently omit them.
