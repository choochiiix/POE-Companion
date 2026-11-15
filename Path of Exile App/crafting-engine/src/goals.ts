import { affixCount, definition, openSlots } from './engine.ts';
import type { Engine } from './engine.ts';
import type { Affix, Item, ModDef, RolledMod } from './model.ts';
export interface ModSelector {
  readonly id?: string;
  readonly group?: string;
  readonly tag?: string;
  /** Numeric tier <= maxTier. Unknown tiers do not match. 1 means top tier. */
  readonly maxTier?: number;
}
export type Goal =
  | { readonly kind: 'has'; readonly mod: ModSelector }
  | {
      readonly kind: 'value';
      readonly mod: ModSelector;
      readonly stat: string;
      readonly min?: number;
      readonly max?: number;
    }
  | { readonly kind: 'and' | 'or'; readonly goals: readonly Goal[] }
  | { readonly kind: 'not'; readonly goal: Goal }
  | {
      readonly kind: 'affixCount' | 'openSlots';
      readonly affix: Affix;
      readonly min?: number;
      readonly max?: number;
    };
function matches(mod: ModDef, selector: ModSelector): boolean {
  return (
    (selector.id === undefined || selector.id === mod.id) &&
    (selector.group === undefined || mod.groups.includes(selector.group)) &&
    (selector.tag === undefined || mod.tags.includes(selector.tag)) &&
    (selector.maxTier === undefined || (mod.tier !== undefined && mod.tier <= selector.maxTier))
  );
}
const between = (n: number, min?: number, max?: number): boolean =>
  (min === undefined || n >= min) && (max === undefined || n <= max);
export function meetsGoal(engine: Engine, item: Item, goal: Goal): boolean {
  const selected = (m: RolledMod, selector: ModSelector): boolean =>
    matches(definition(engine, m.id), selector);
  switch (goal.kind) {
    case 'has':
      return item.mods.some((m) => selected(m, goal.mod));
    // Bounds refer to one rolled stat on one matching mod, not a sum across mods.
    case 'value':
      return item.mods.some(
        (m) =>
          selected(m, goal.mod) &&
          m.values[goal.stat] !== undefined &&
          between(m.values[goal.stat]!, goal.min, goal.max),
      );
    case 'and':
      return goal.goals.every((g) => meetsGoal(engine, item, g));
    case 'or':
      return goal.goals.some((g) => meetsGoal(engine, item, g));
    case 'not':
      return !meetsGoal(engine, item, goal.goal);
    case 'affixCount':
      return between(affixCount(engine, item, goal.affix), goal.min, goal.max);
    case 'openSlots':
      return between(openSlots(engine, item, goal.affix), goal.min, goal.max);
  }
}
