import { immutable, integer, positive, updateItem } from './model.ts';
import type { Affix, Caps, Item, ModDef, Rarity, RolledMod } from './model.ts';
import { bind, choice, done, range, sample } from './plan.ts';
import type { Plan } from './plan.ts';
import type { Rng } from './rng.ts';

export type Currency =
  | 'transmutation'
  | 'alteration'
  | 'augmentation'
  | 'regal'
  | 'alchemy'
  | 'chaos'
  | 'exalted'
  | 'annulment'
  | 'scouring'
  | 'divine';
export interface CountWeight {
  readonly count: number;
  readonly weight: number;
}
export interface EngineConfig {
  /** ASSUMPTION: named provisional algorithms. Only these variants are implemented today. */
  readonly assumptions: {
    readonly affixSelection: 'weighted-eligible-mods-sequentially';
    readonly countAboveCap: 'clamp';
    readonly annulment: 'uniform-explicit-preserve-rarity';
    readonly fixedValueDivine: 'allow';
    readonly additionWithoutEligibleMod: 'reject-including-regal';
    readonly tierRanking: 'explicit-1-is-best';
    readonly generationWeightFallback: 'unmatched-100-percent';
  };
  /** ASSUMPTION: provisional distributions, not verified game probabilities. */
  readonly counts: Readonly<
    Record<'transmutation' | 'alteration' | 'alchemy' | 'chaos', readonly CountWeight[]>
  >;
  /** ASSUMPTION: override on every special base (including jewels) after verification. */
  readonly caps: Readonly<Record<Rarity, Caps>>;
  /** ASSUMPTION: if the eligible pool runs dry, keep the generated partial item. */
  readonly exhaustedPool: 'stop';
  /** ASSUMPTION: independent uniform integer stat rolls; no correlated stats yet. */
  readonly statRolls: 'independent-uniform-integers';
}
export const ASSUMPTION_CONFIG: EngineConfig = immutable({
  assumptions: {
    affixSelection: 'weighted-eligible-mods-sequentially',
    countAboveCap: 'clamp',
    annulment: 'uniform-explicit-preserve-rarity',
    fixedValueDivine: 'allow',
    additionWithoutEligibleMod: 'reject-including-regal',
    tierRanking: 'explicit-1-is-best',
    generationWeightFallback: 'unmatched-100-percent',
  },
  counts: {
    transmutation: [
      { count: 1, weight: 1 },
      { count: 2, weight: 1 },
    ],
    alteration: [
      { count: 1, weight: 1 },
      { count: 2, weight: 1 },
    ],
    alchemy: [
      { count: 4, weight: 1 },
      { count: 5, weight: 1 },
      { count: 6, weight: 1 },
    ],
    chaos: [
      { count: 4, weight: 1 },
      { count: 5, weight: 1 },
      { count: 6, weight: 1 },
    ],
  },
  caps: {
    normal: { prefix: 0, suffix: 0 },
    magic: { prefix: 1, suffix: 1 },
    rare: { prefix: 3, suffix: 3 },
  },
  exhaustedPool: 'stop',
  statRolls: 'independent-uniform-integers',
});
export interface Engine {
  readonly mods: readonly ModDef[];
  readonly config: EngineConfig;
}
export function createEngine(mods: readonly ModDef[], config: EngineConfig): Engine {
  const ids = new Set<string>();
  for (const m of mods) {
    if (!m.id || ids.has(m.id)) throw new Error(`Duplicate or empty mod id: ${m.id}`);
    ids.add(m.id);
    integer(m.requiredLevel, 'requiredLevel');
    if (m.tier !== undefined) integer(m.tier, 'tier', 1);
    const statIds = new Set<string>();
    for (const stat of m.stats) {
      if (!stat.id || statIds.has(stat.id))
        throw new Error(`Duplicate or empty stat id on ${m.id}`);
      statIds.add(stat.id);
      integer(stat.min, 'stat min', Number.MIN_SAFE_INTEGER);
      integer(stat.max, 'stat max', stat.min);
      integer(stat.max - stat.min + 1, 'stat range width', 1);
    }
    for (const w of [...m.spawnWeights, ...(m.generationWeights ?? [])])
      if (!Number.isFinite(w.weight) || w.weight < 0)
        throw new Error('Invalid spawn/generation weight');
  }
  for (const caps of Object.values(config.caps)) validateCaps(caps);
  for (const counts of Object.values(config.counts)) {
    if (!counts.length) throw new Error('Count distribution cannot be empty');
    for (const c of counts) {
      integer(c.count, 'mod count', 1);
      positive(c.weight, 'count weight');
    }
    positive(
      counts.reduce((s, c) => s + c.weight, 0),
      'total count weight',
    );
  }
  return immutable({ mods, config });
}
function validateCaps(caps: Caps): void {
  integer(caps.prefix, 'prefix cap');
  integer(caps.suffix, 'suffix cap');
}
const modIndexes = new WeakMap<Engine, ReadonlyMap<string, ModDef>>();
export function definition(engine: Engine, id: string): ModDef {
  let index = modIndexes.get(engine);
  if (!index) {
    index = new Map(engine.mods.map((m) => [m.id, m]));
    modIndexes.set(engine, index);
  }
  const mod = index.get(id);
  if (!mod) throw new Error(`Unknown mod id: ${id}`);
  return mod;
}
export function capsFor(engine: Engine, item: Item): Caps {
  const caps =
    item.rarity === 'normal'
      ? engine.config.caps.normal
      : (item.base.affixCaps?.[item.rarity] ?? engine.config.caps[item.rarity]);
  validateCaps(caps);
  return caps;
}
export function affixCount(engine: Engine, item: Item, affix: Affix): number {
  return item.mods.filter((m) => definition(engine, m.id).affix === affix).length;
}
export function openSlots(engine: Engine, item: Item, affix: Affix): number {
  return Math.max(0, capsFor(engine, item)[affix] - affixCount(engine, item, affix));
}
export function spawnWeight(mod: ModDef, tags: ReadonlySet<string>): number {
  return mod.spawnWeights.find((w) => w.tag === 'default' || tags.has(w.tag))?.weight ?? 0;
}
export function effectiveWeight(mod: ModDef, tags: ReadonlySet<string>): number {
  // RePoE: first matching generation entry is a percentage of the spawn weight.
  // ASSUMPTION: no matching generation entry leaves the weight unchanged. The supplied
  // snapshot has a default entry on every imported nonempty generation-weight list.
  const percent =
    mod.generationWeights?.find((w) => w.tag === 'default' || tags.has(w.tag))?.weight ?? 100;
  const weight = spawnWeight(mod, tags) * (percent / 100);
  if (!Number.isFinite(weight)) throw new Error(`Nonfinite effective weight on ${mod.id}`);
  return weight;
}
export function modPool(engine: Engine, item: Item): readonly { mod: ModDef; weight: number }[] {
  const existing = item.mods.map((m) => definition(engine, m.id));
  const groups = new Set(existing.flatMap((m) => m.groups));
  const tags = new Set([
    ...item.base.tags,
    ...item.extraTags,
    ...existing.flatMap((m) => m.addsTags ?? []),
  ]);
  const caps = capsFor(engine, item);
  const counts = { prefix: 0, suffix: 0 };
  for (const mod of existing) counts[mod.affix]++;
  const existingIds = new Set(existing.map((m) => m.id));
  return engine.mods.flatMap((mod) => {
    if (
      mod.domain !== item.base.modDomain ||
      mod.requiredLevel > item.itemLevel ||
      existingIds.has(mod.id) ||
      mod.groups.some((g) => groups.has(g)) ||
      counts[mod.affix] >= caps[mod.affix]
    )
      return [];
    const weight = effectiveWeight(mod, tags);
    return weight > 0 ? [{ mod, weight }] : [];
  });
}
export function nextModOdds(
  engine: Engine,
  item: Item,
): readonly { id: string; probability: number }[] {
  const pool = modPool(engine, item);
  const total = pool.reduce((s, p) => s + p.weight, 0);
  if (pool.length) positive(total, 'total spawn weight');
  return pool.map((p) => ({ id: p.mod.id, probability: p.weight / total }));
}
function rollMod(
  mod: ModDef,
  index = 0,
  values: Readonly<Record<string, number>> = {},
): Plan<RolledMod> {
  const stat = mod.stats[index];
  return stat
    ? range(stat.min, stat.max, (n) => rollMod(mod, index + 1, { ...values, [stat.id]: n }))
    : done(immutable({ id: mod.id, values }));
}
function addMods(engine: Engine, item: Item, count: number): Plan<Item> {
  const pool = modPool(engine, item);
  if (count === 0 || pool.length === 0) return done(item);
  return choice(
    pool.map((p) => ({
      weight: p.weight,
      next: () =>
        bind(rollMod(p.mod), (mod) =>
          addMods(engine, updateItem(item, { mods: [...item.mods, mod] }), count - 1),
        ),
    })),
  );
}
function rerollValues(
  engine: Engine,
  item: Item,
  index = 0,
  mods: readonly RolledMod[] = [],
): Plan<Item> {
  const current = item.mods[index];
  return current
    ? bind(rollMod(definition(engine, current.id)), (m) =>
        rerollValues(engine, item, index + 1, [...mods, m]),
      )
    : done(updateItem(item, { mods }));
}
export type PlanResult =
  | { readonly ok: true; readonly plan: Plan<Item> }
  | { readonly ok: false; readonly reason: string };
/** Currency rules live ONLY here. No second mechanics implementation in the odds code. */
export function currencyPlan(engine: Engine, input: Item, currency: Currency): PlanResult {
  const item = immutable(input); // stabilize lazy plans against caller mutation
  const cannot = (why: string): PlanResult => ({
    ok: false,
    reason: `Can't apply ${currency} because ${why}.`,
  });
  if (item.corrupted) return cannot('the item is corrupted');
  const success = (plan: Plan<Item>): PlanResult => ({ ok: true, plan });
  const add = (rarity: Rarity): PlanResult => {
    const upgraded = updateItem(item, { rarity });
    if (!modPool(engine, upgraded).length)
      return cannot('there is no eligible mod or open affix slot');
    return success(addMods(engine, upgraded, 1));
  };
  const reforge = (rarity: 'magic' | 'rare', kind: keyof EngineConfig['counts']): PlanResult => {
    const blank = updateItem(item, { rarity, mods: [] });
    if (!modPool(engine, blank).length)
      return cannot('there are no eligible mods for this base and item level');
    const caps = capsFor(engine, blank);
    // ASSUMPTION: clamp requested count to base caps, then stop early if the pool exhausts.
    return success(
      choice(
        engine.config.counts[kind].map((c) => ({
          weight: c.weight,
          next: () => addMods(engine, blank, Math.min(c.count, caps.prefix + caps.suffix)),
        })),
      ),
    );
  };
  switch (currency) {
    // Replace all explicit affixes, preserving base, level, extra tags and corruption state.
    case 'transmutation':
      return item.rarity === 'normal'
        ? reforge('magic', currency)
        : cannot('it requires a normal item');
    case 'alteration':
      return item.rarity === 'magic'
        ? reforge('magic', currency)
        : cannot('it requires a magic item');
    case 'alchemy':
      return item.rarity === 'normal'
        ? reforge('rare', currency)
        : cannot('it requires a normal item');
    case 'chaos':
      return item.rarity === 'rare' ? reforge('rare', currency) : cannot('it requires a rare item');
    // Add one mod, recalculating eligibility in the resulting rarity.
    case 'augmentation':
      return item.rarity === 'magic' ? add('magic') : cannot('it requires a magic item');
    case 'regal':
      return item.rarity === 'magic' ? add('rare') : cannot('it requires a magic item');
    case 'exalted':
      return item.rarity === 'rare' ? add('rare') : cannot('it requires a rare item');
    // ASSUMPTION: uniform explicit-mod removal; rarity stays unchanged, even with zero mods.
    case 'annulment':
      if (item.rarity === 'normal' || !item.mods.length)
        return cannot('it requires a magic or rare item with an explicit mod');
      return success(
        range(0, item.mods.length - 1, (n) =>
          done(updateItem(item, { mods: item.mods.filter((_, i) => i !== n) })),
        ),
      );
    case 'scouring':
      return item.rarity === 'normal'
        ? cannot('the item is already normal')
        : success(done(updateItem(item, { rarity: 'normal', mods: [] })));
    // Reroll within the SAME mod definition/tier. Fixed values are valid no-op results.
    case 'divine':
      return item.rarity === 'normal' || !item.mods.length
        ? cannot('it requires a magic or rare item with an explicit mod')
        : success(rerollValues(engine, item));
  }
}
export type ApplyResult =
  | { readonly ok: true; readonly item: Item }
  | { readonly ok: false; readonly reason: string };
export function applyCurrency(
  engine: Engine,
  item: Item,
  currency: Currency,
  rng: Rng,
): ApplyResult {
  const result = currencyPlan(engine, item, currency);
  return result.ok ? { ok: true, item: sample(result.plan, rng) } : result;
}
