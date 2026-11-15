import { damageTypes } from './model.ts';
import type { Breakdown, Contribution, DamageType, SkillInput, Stat } from './model.ts';
import { evaluate } from './modifiers.ts';

export interface DamageConversion {
  readonly sourceId: string;
  readonly from: DamageType;
  readonly to: DamageType;
  readonly percent: number;
  readonly kind: 'convert' | 'gain';
}
export function validateConversions(rules: readonly DamageConversion[]): void {
  const totals = new Map<DamageType, number>();
  for (const rule of rules) {
    if (typeof rule.sourceId !== 'string' || !rule.sourceId.trim() || !['convert', 'gain'].includes(rule.kind)
      || !damageTypes.includes(rule.from) || !damageTypes.includes(rule.to)
      || damageTypes.indexOf(rule.to) <= damageTypes.indexOf(rule.from)) throw new TypeError('Invalid ordered damage conversion');
    if (!Number.isFinite(rule.percent) || rule.percent < 0) throw new RangeError('Invalid conversion percentage');
    if (rule.kind === 'convert') totals.set(rule.from, (totals.get(rule.from) ?? 0) + rule.percent);
  }
  for (const total of totals.values()) if (total > 100 + 1e-10) throw new RangeError('Conversion exceeds 100%; resolve skill/global priority in adapter');
}
export interface ConversionPath {
  readonly type: DamageType;
  readonly history: readonly DamageType[];
  readonly sourceIds: readonly string[];
  readonly fraction: number;
  readonly min: Breakdown;
  readonly max: Breakdown;
}

/** Split unscaled base damage into ordered paths; apply eligible modifiers once per path. */
export function convertDamage(skill: SkillInput, mods: readonly Contribution[], rules: readonly DamageConversion[]) {
  validateConversions(rules);
  const paths: ConversionPath[] = [];
  const scoped = mods.filter(mod => !mod.skillId || mod.skillId === skill.id);
  const walk = (type: DamageType, min: number, max: number, fraction: number, history: readonly DamageType[], sourceIds: readonly string[], flatContributions: readonly Contribution[]): void => {
    const outgoing = rules.filter(rule => rule.from === type);
    const retained = Math.max(0, 1 - outgoing.filter(rule => rule.kind === 'convert').reduce((sum, rule) => sum + rule.percent / 100, 0));
    const stats = new Set<Stat>(['damage', skill.kind === 'attack' ? 'attackDamage' : 'spellDamage']);
    for (const previous of history) {
      stats.add(`${previous}Damage`);
      if (previous !== 'physical' && previous !== 'chaos') stats.add('elementalDamage');
    }
    if (retained > 0 && fraction > 0) {
      const scaling = scoped.filter(mod => mod.kind !== 'BASE');
      const endpoint = (base: number): Breakdown => {
        const detail = evaluate(scaling, [...stats], base * fraction * retained, skill.id);
        return { ...detail, contributions: [...flatContributions, ...detail.contributions] };
      };
      paths.push({ type, history, sourceIds, fraction: fraction * retained,
        min: endpoint(min), max: endpoint(max) });
    }
    for (const rule of outgoing) if (rule.percent > 0) walk(rule.to, min, max, fraction * rule.percent / 100, [...history, rule.to], [...sourceIds, rule.sourceId], flatContributions);
  };
  for (const type of damageTypes) {
    const range = skill.damage[type] ?? { min: 0, max: 0 };
    const added = scoped.filter(mod => mod.stat === `${type}Damage` && mod.kind === 'BASE');
    const flat = added.reduce((sum, mod) => sum + mod.value, 0);
    if (range.min + flat !== 0 || range.max + flat !== 0) walk(type, Math.max(0, range.min + flat), Math.max(0, range.max + flat), 1, [type], [], added);
  }
  return damageTypes.map(type => {
    const matching = paths.filter(path => path.type === type);
    const sum = (endpoint: 'min' | 'max'): Breakdown => {
      const contributions = [...new Map(matching.flatMap(path => path[endpoint].contributions).map(mod => [`${mod.sourceId}\0${mod.id}`, mod])).values()];
      return { base: matching.reduce((value, path) => value + path[endpoint].base, 0), increased: 0, more: 1,
        value: matching.reduce((value, path) => value + path[endpoint].value, 0), contributions };
    };
    return { type, min: sum('min'), max: sum('max'), paths: matching };
  });
}
