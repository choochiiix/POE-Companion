export type Affix = 'prefix' | 'suffix';
export type Rarity = 'normal' | 'magic' | 'rare';
export interface Caps {
  readonly prefix: number;
  readonly suffix: number;
}
export interface SpawnWeight {
  readonly tag: string;
  readonly weight: number;
}
/** Integer inclusive ranges. Decimal stats must be stored as scaled integers. */
export interface StatRange {
  readonly id: string;
  readonly min: number;
  readonly max: number;
}
export interface ModDef {
  readonly id: string;
  readonly name?: string;
  /** Source range description, not a formatter for rolled values. */
  readonly description?: string;
  readonly affix: Affix;
  readonly domain: string;
  readonly groups: readonly string[];
  readonly requiredLevel: number;
  readonly spawnWeights: readonly SpawnWeight[];
  /** Ordered percentage multipliers, applied after the spawn weight. */
  readonly generationWeights?: readonly SpawnWeight[];
  readonly grantedEffects?: readonly {
    readonly id: string;
    readonly level: number;
  }[];
  readonly stats: readonly StatRange[];
  readonly tags: readonly string[];
  /** Explicit adapter-supplied ranking: 1 is best. Never inferred from level. */
  readonly tier?: number;
  /** Tags granted to the item for subsequent spawn checks; separate from descriptive tags. */
  readonly addsTags?: readonly string[];
}
export interface BaseItem {
  readonly id: string;
  readonly name?: string;
  readonly itemClass?: string;
  readonly dropLevel?: number;
  /** Reference ranges only. Implicits are not part of the rollable explicit affixes. */
  readonly implicits?: readonly {
    readonly id: string;
    readonly description: string;
    readonly stats: readonly StatRange[];
  }[];
  readonly tags: readonly string[];
  readonly modDomain: string;
  readonly affixCaps?: Readonly<Partial<Record<'magic' | 'rare', Caps>>>;
}
export interface RolledMod {
  readonly id: string;
  readonly values: Readonly<Record<string, number>>;
}
export interface Item {
  readonly base: BaseItem;
  readonly itemLevel: number;
  readonly rarity: Rarity;
  readonly mods: readonly RolledMod[];
  readonly extraTags: readonly string[];
  readonly corrupted: boolean;
}
export function integer(n: number, name: string, min = 0): void {
  if (!Number.isSafeInteger(n) || n < min)
    throw new Error(`${name} must be a safe integer >= ${min}`);
}
export function positive(n: number, name: string): void {
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} must be finite and positive`);
}
/** Copy before freezing: callers retain ownership of their input objects. */
export function immutable<T>(input: T): T {
  const copy: T = structuredClone(input);
  const freeze = (value: unknown): void => {
    if (value !== null && typeof value === 'object') {
      for (const child of Object.values(value)) freeze(child);
      Object.freeze(value);
    }
  };
  freeze(copy);
  return copy;
}
export function createItem(base: BaseItem, itemLevel: number, rarity: Rarity = 'normal'): Item {
  integer(itemLevel, 'itemLevel', 1);
  return immutable({
    base,
    itemLevel,
    rarity,
    mods: [],
    extraTags: [],
    corrupted: false,
  });
}
export function updateItem(item: Item, patch: Partial<Item>): Item {
  return immutable({ ...item, ...patch });
}
