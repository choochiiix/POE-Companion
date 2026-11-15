# Inspected RePoE PoE 1 snapshot

**Integration update:** the initial inspection below is retained for provenance. The adapter and UI integration are now implemented; see `../../crafting-data/README.md`. Original raw exports in this folder remain unchanged.

Selected English JSON exports copied from the user-provided `repoe-fork.github.io-master.zip`. No scripts from the archive were executed. The original archive was not modified. These are raw source exports, not yet adapted engine data.

The archive README identifies its root exports as PoE 1. Both `version.txt` and `exported-version.txt` declare **3.29.3.6**. This records the supplied snapshot's label; it does not assert that it matches the current live game patch. `provenance.json` records archive and file SHA-256 hashes for reproducibility.

## Findings

- `mods.json`: **40,355** records, including unique, corrupted, enchantment, monster and other unsupported types. Do not import every record into an ordinary affix pool.
- **4,369** records have generation type prefix/suffix and domain `item`. This is a candidate set, not the number eligible for any particular base. Further filtering by spawn weights, level, essence flags and supported mechanics is required.
- `base_items.json`: **5,461** records across equipment, currencies, gems, maps and other classes. Only a supported equipment subset should be offered initially. Filter release state and special base families explicitly.
- Among all prefix/suffix records across all domains, **668** have nonempty `generation_weights` and **458** are marked essence-only. These totals overlap and are not ordinary-equipment eligible counts.
- Mod records include `implicit_tags` (descriptive crafting tags), `adds_tags` (tags granted to the item), ordered `spawn_weights`, stat ranges, groups, domain and generation type. These separate tag roles match the engine's intended separation.
- There is no explicit tier field in the inspected mod record/schema. Tier derivation still needs a justified rule; do not infer it from a numeric suffix in an id.
- Stat translations and per-mod range text are present. Per-mod `text` is a range description, not a formatter for arbitrary rolled values.

## Concrete examples read from this snapshot

- `IncreasedLife1`: prefix, group `IncreasedLife`, required level **5**, `base_maximum_life` range **10–24**; first matching weapon/fishing-rod weight is 0, fallback default weight is 1000.
- `Metadata/Items/Weapons/OneHandWeapons/Wands/Wand13`: **Imbued Wand**, domain `item`, drop level **59**, released, with wand/weapon/default tags and an implicit mod reference.

## Adapter work required

Map `generation_type` → `affix`, `required_level` → `requiredLevel`, `spawn_weights` → `spawnWeights` (preserve order), `implicit_tags` → `tags`, `adds_tags` → `addsTags`, and base `domain` → `modDomain`. Preserve source ids. Exclude essence-only and unsupported domains/types from ordinary currency rolls.

The engine currently lacks generation-weight multipliers. Extend its shared eligibility logic with verified matching/percentage semantics before treating real-mod odds as supported. Preserve granted-effect metadata for supported mods or explicitly diagnose unsupported records; some real affixes are not fully described by numeric stats alone.

Base implicit references and readable display names need presentation/metadata support; do not include implicits in the random explicit-affix list. Special base caps, currency mod-count distributions, independent stat rolls, and tier derivation remain separate accuracy questions that this export does not automatically settle.

At the time of this initial inspection, the UI still used fake fixtures. The subsequent integration now defaults to the generated real-data bundle; see the update above.

## Attribution

RePoE export supplied by the user; archive README credits Grinding Gear Games for game data, PyPoE, Project PoE Wiki and Path of Exile Tool Devs. Source project: https://github.com/repoe-fork/repoe . Game-data contents belong to Grinding Gear Games, as stated by that README.
