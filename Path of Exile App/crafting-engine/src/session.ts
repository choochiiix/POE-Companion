import { applyCurrency } from './engine.ts';
import type { ApplyResult, Currency, Engine } from './engine.ts';
import type { Tally } from './economics.ts';
import { immutable } from './model.ts';
import type { Item } from './model.ts';
import type { Rng } from './rng.ts';
export interface HistoryEntry {
  readonly currency: Currency;
  readonly before: Item;
  readonly after: Item;
}
/** Stateful convenience shell around pure crafting functions. Owns a private RNG clone. */
export class CraftSession {
  private readonly engine: Engine;
  private rng: Rng;
  private current: Item;
  private entries: HistoryEntry[] = [];
  private snapshots: Rng[] = [];
  constructor(engine: Engine, item: Item, rng: Rng) {
    this.engine = engine;
    this.current = immutable(item);
    this.rng = rng.clone();
  }
  get item(): Item {
    return this.current;
  }
  get history(): readonly HistoryEntry[] {
    return Object.freeze([...this.entries]);
  }
  get spent(): Tally {
    const tally: Partial<Record<Currency, number>> = {};
    for (const entry of this.entries) tally[entry.currency] = (tally[entry.currency] ?? 0) + 1;
    return Object.freeze(tally);
  }
  apply(currency: Currency): ApplyResult {
    const snapshot = this.rng.clone();
    const result = applyCurrency(this.engine, this.current, currency, this.rng);
    if (result.ok) {
      this.entries.push(Object.freeze({ currency, before: this.current, after: result.item }));
      this.snapshots.push(snapshot);
      this.current = result.item;
    }
    return result;
  }
  /** Undo removes that spend from the active-history tally and restores random state. */
  undo(): boolean {
    const entry = this.entries.pop(),
      rng = this.snapshots.pop();
    if (!entry || !rng) return false;
    this.current = entry.before;
    this.rng = rng;
    return true;
  }
}
