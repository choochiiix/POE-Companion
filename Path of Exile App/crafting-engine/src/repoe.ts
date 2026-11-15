import { immutable, integer } from './model.ts';
import type { BaseItem, ModDef, SpawnWeight, StatRange } from './model.ts';

/** Explicit scope: special cap/rarity families are not silently treated as normal gear. */
export const EQUIPMENT_CLASSES: readonly string[] = Object.freeze([
  'Wand',
  'Dagger',
  'Rune Dagger',
  'Claw',
  'One Hand Axe',
  'One Hand Sword',
  'Thrusting One Hand Sword',
  'One Hand Mace',
  'Sceptre',
  'Bow',
  'Staff',
  'Warstaff',
  'Two Hand Axe',
  'Two Hand Sword',
  'Two Hand Mace',
  'Ring',
  'Amulet',
  'Belt',
  'Shield',
  'Helmet',
  'Body Armour',
  'Boots',
  'Gloves',
  'Quiver',
]);
export interface ImportReport {
  readonly sourceMods: number;
  readonly sourceBases: number;
  readonly importedMods: number;
  readonly importedBases: number;
  readonly excludedMods: Readonly<Record<string, readonly string[]>>;
  readonly excludedBases: Readonly<Record<string, readonly string[]>>;
}
export interface RePoEData {
  readonly format: 'poe1-crafting-data-v1';
  readonly sourceVersion: string;
  readonly mods: readonly ModDef[];
  readonly bases: readonly BaseItem[];
  readonly report: ImportReport;
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: expected object`);
  return value as Record<string, unknown>;
}
function string(value: unknown, path: string): string {
  if (typeof value !== 'string') throw new Error(`${path}: expected string`);
  return value;
}
function number(value: unknown, path: string, min = 0): number {
  if (typeof value !== 'number') throw new Error(`${path}: expected number`);
  integer(value, path, min);
  return value;
}
function array(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(`${path}: expected array`);
  return value as readonly unknown[];
}
function strings(value: unknown, path: string): readonly string[] {
  return array(value, path).map((v, i) => string(v, `${path}[${i}]`));
}
function weights(value: unknown, path: string): readonly SpawnWeight[] {
  return array(value, path).map((v, i) => {
    const p = `${path}[${i}]`,
      row = record(v, p);
    return {
      tag: string(row.tag, p + '.tag'),
      weight: number(row.weight, p + '.weight'),
    };
  });
}
function stats(value: unknown, path: string): readonly StatRange[] {
  const ids = new Set<string>();
  return array(value, path).map((v, i) => {
    const p = `${path}[${i}]`,
      row = record(v, p);
    const id = string(row.id, p + '.id'),
      min = number(row.min, p + '.min', Number.MIN_SAFE_INTEGER);
    if (!id || ids.has(id)) throw new Error(`${p}: duplicate/empty stat id`);
    ids.add(id);
    const max = number(row.max, p + '.max', min);
    integer(max - min + 1, p + '.width', 1);
    return { id, min, max };
  });
}
function exclude(list: Record<string, string[]>, reason: string, id: string): void {
  (list[reason] ??= []).push(id);
}
/** Pure adapter over the inspected RePoE export shape. No I/O or network access. */
export function adaptRePoE(rawMods: unknown, rawBases: unknown, sourceVersion: string): RePoEData {
  if (!sourceVersion.trim()) throw new Error('A source version is required');
  const sourceMods = record(rawMods, 'mods'),
    sourceBases = record(rawBases, 'bases');
  const mods: ModDef[] = [],
    bases: BaseItem[] = [];
  const excludedMods: Record<string, string[]> = {},
    excludedBases: Record<string, string[]> = {};
  for (const [id, input] of Object.entries(sourceMods)) {
    if (!id.trim()) throw new Error('mods: empty source id');
    const m = record(input, `mods.${id}`),
      p = `mods.${id}`;
    const affix = string(m.generation_type, p + '.generation_type');
    const domain = string(m.domain, p + '.domain');
    if (domain !== 'item') {
      exclude(excludedMods, 'unsupported-domain', id);
      continue;
    }
    if (affix !== 'prefix' && affix !== 'suffix') {
      exclude(excludedMods, 'not-random-affix', id);
      continue;
    }
    // Explicit name marker in the supplied export, not a tier/name heuristic.
    if (/royale/i.test(id)) {
      exclude(excludedMods, 'unsupported-royale-mode', id);
      continue;
    }
    if (typeof m.is_essence_only !== 'boolean')
      throw new Error(`${p}.is_essence_only: expected boolean`);
    if (m.is_essence_only) {
      exclude(excludedMods, 'essence-only', id);
      continue;
    }
    const spawnWeights = weights(m.spawn_weights, p + '.spawn_weights');
    if (!spawnWeights.some((w) => w.weight > 0)) {
      exclude(excludedMods, 'no-positive-spawn-weight', id);
      continue;
    }
    mods.push({
      id,
      affix,
      domain,
      name: string(m.name, p + '.name'),
      description: m.text === null || m.text === undefined ? '' : string(m.text, p + '.text'),
      groups: strings(m.groups, p + '.groups'),
      requiredLevel: number(m.required_level, p + '.required_level'),
      spawnWeights,
      generationWeights: weights(m.generation_weights, p + '.generation_weights'),
      stats: stats(m.stats, p + '.stats'),
      tags: strings(m.implicit_tags, p + '.implicit_tags'),
      addsTags: strings(m.adds_tags, p + '.adds_tags'),
      grantedEffects: array(m.grants_effects, p + '.grants_effects').map((v, i) => {
        const e = record(v, `${p}.grants_effects[${i}]`);
        return {
          id: string(e.granted_effect_id, p + '.granted_effect_id'),
          level: number(e.level, p + '.effect.level', 1),
        };
      }),
    });
  }
  for (const [id, input] of Object.entries(sourceBases)) {
    if (!id.trim()) throw new Error('bases: empty source id');
    const b = record(input, `bases.${id}`),
      p = `bases.${id}`;
    const itemClass = string(b.item_class, p + '.item_class');
    if (b.release_state !== 'released') {
      exclude(excludedBases, 'not-released', id);
      continue;
    }
    if (b.domain !== 'item' || !EQUIPMENT_CLASSES.includes(itemClass)) {
      exclude(excludedBases, 'unsupported-class-or-domain', id);
      continue;
    }
    const baseTags = strings(b.tags, p + '.tags');
    if (
      /royale/i.test(id) ||
      baseTags.some((t) => /talisman|synthesised|fractured|corrupted/.test(t))
    ) {
      exclude(excludedBases, 'unsupported-special-base', id);
      continue;
    }
    const addedTags: string[] = [];
    const implicits = strings(b.implicits, p + '.implicits').map((implicitId) => {
      const m = record(sourceMods[implicitId], `${p}.implicit.${implicitId}`);
      addedTags.push(...strings(m.adds_tags, `${implicitId}.adds_tags`));
      return {
        id: implicitId,
        description: m.text == null ? '' : string(m.text, `${implicitId}.text`),
        stats: stats(m.stats, `${implicitId}.stats`),
      };
    });
    bases.push({
      id,
      name: string(b.name, p + '.name'),
      itemClass,
      dropLevel: number(b.drop_level, p + '.drop_level'),
      modDomain: 'item',
      tags: [...new Set([...baseTags, ...addedTags])],
      implicits,
    });
  }
  return immutable({
    format: 'poe1-crafting-data-v1',
    sourceVersion,
    mods,
    bases,
    report: {
      sourceMods: Object.keys(sourceMods).length,
      sourceBases: Object.keys(sourceBases).length,
      importedMods: mods.length,
      importedBases: bases.length,
      excludedMods,
      excludedBases,
    },
  });
}
/** Safe superset for one base: include every mod reachable through added tags.
 * Ignores level/groups/caps here; the engine still enforces those on every draw.
 * Use the full dataset instead if callers will inject arbitrary extra item tags.
 */
export function modsForBase(mods: readonly ModDef[], base: BaseItem): readonly ModDef[] {
  const tags = new Set(base.tags),
    mandatory = new Set(base.tags),
    included = new Set<string>();
  // Optional tags may be absent in an actual craft. Never let a blocking optional
  // tag in the closure hide a mod which can spawn before that tag is acquired.
  const canBePositive = (weights: readonly SpawnWeight[], emptyDefault: boolean): boolean => {
    if (!weights.length) return emptyDefault;
    for (const w of weights) {
      if (w.tag === 'default' || mandatory.has(w.tag)) return w.weight > 0;
      if (tags.has(w.tag) && w.weight > 0) return true;
    }
    return emptyDefault;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const m of mods) {
      if (
        included.has(m.id) ||
        m.domain !== base.modDomain ||
        !canBePositive(m.spawnWeights, false) ||
        !canBePositive(m.generationWeights ?? [], true)
      )
        continue;
      included.add(m.id);
      changed = true;
      for (const tag of m.addsTags ?? []) tags.add(tag);
    }
  }
  // A positive generation weight may become zero as tags are added; retain earlier candidates.
  return mods.filter((m) => included.has(m.id));
}
