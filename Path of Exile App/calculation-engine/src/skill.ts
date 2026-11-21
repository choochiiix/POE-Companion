import { damageTypes } from './model.ts';
import type { DamageType, Modifier, ModifierSource, SkillInput } from './model.ts';

export type DamageRanges = Partial<Record<DamageType, { readonly min: number; readonly max: number }>>;
export interface WeaponInput {
  readonly id: string;
  readonly damage: DamageRanges;
  readonly attacksPerSecond: number;
  readonly criticalChance: number;
  readonly local?: {
    readonly addedDamage?: DamageRanges;
    readonly increasedPhysicalDamage?: number;
    readonly quality?: number;
    readonly increasedAttackSpeed?: number;
    readonly increasedCriticalChance?: number;
    readonly addedCriticalChance?: number;
  };
}
export interface ActiveSkillDefinition {
  readonly id: string;
  readonly kind: 'attack' | 'spell';
  readonly tags: readonly string[];
  readonly damage?: DamageRanges;
  readonly baseTime?: number;
  readonly baseCritChance?: number;
  /** Multipliers, not percentages. Independent base and added-damage factors. */
  readonly baseMultiplier?: number;
  readonly addedDamageEffectiveness?: number;
  /** Selected catalog evidence; numerical definition values must already match this level/quality. */
  readonly sourceEvidence?: { readonly level: number; readonly quality: number; readonly sourceId: string };
  readonly unsupported?: readonly string[];
}
export interface SupportInput {
  readonly id: string;
  readonly compatibleKinds: readonly ('attack' | 'spell')[];
  /** All listed tags must match. Explicit normalized policy, not PoB expression parsing. */
  readonly requiredTags?: readonly string[];
  readonly excludedTags?: readonly string[];
  readonly modifiers: readonly Modifier[];
  readonly addedDamage?: DamageRanges;
  readonly unsupported?: readonly string[];
}
export interface SkillAssemblyInput {
  readonly definition: ActiveSkillDefinition;
  readonly weapon?: WeaponInput;
  readonly addedDamage?: DamageRanges;
  readonly supports?: readonly SupportInput[];
  readonly accuracy: number;
  readonly criticalMultiplier?: number;
}

const finite = (value: number, label: string, min = 0): number => {
  if (!Number.isFinite(value) || value < min) throw new RangeError(`Invalid ${label}`);
  return value;
};
function ranges(input: DamageRanges | undefined): void {
  for (const [type, range] of Object.entries(input ?? {})) {
    if (!damageTypes.includes(type as DamageType)) throw new TypeError('Unknown damage type');
    finite(range.min, 'minimum damage'); finite(range.max, 'maximum damage', range.min);
  }
}

/** Resolve ordinary local weapon values once; global modifiers must not contain these effects again. */
export function resolveWeapon(weapon: WeaponInput) {
  if (!weapon.id.trim()) throw new TypeError('Weapon id required');
  ranges(weapon.damage); ranges(weapon.local?.addedDamage);
  const local = weapon.local ?? {};
  // PoB v2.68.1 Item.lua:2338-2344 applies local physical increase, then quality, then rounds endpoints.
  const physicalFactor = Math.max(0, 1 + finite(local.increasedPhysicalDamage ?? 0, 'local physical increase', -100) / 100)
    * (1 + finite(local.quality ?? 0, 'weapon quality') / 100);
  const attacksPerSecond = Math.round(finite(weapon.attacksPerSecond, 'weapon attack rate', Number.MIN_VALUE)
    * Math.max(0, 1 + finite(local.increasedAttackSpeed ?? 0, 'local attack speed', -100) / 100) * 100) / 100;
  if (attacksPerSecond === 0) throw new RangeError('Weapon attack rate must be positive');
  const criticalChance = Math.min(100, Math.max(0, (finite(weapon.criticalChance, 'weapon critical chance')
    + finite(local.addedCriticalChance ?? 0, 'local added critical chance', -100))
    * (1 + finite(local.increasedCriticalChance ?? 0, 'local critical increase', -100) / 100)));
  const damage: DamageRanges = Object.fromEntries(damageTypes.map(type => {
    const base = weapon.damage[type] ?? { min: 0, max: 0 };
    const added = local.addedDamage?.[type] ?? { min: 0, max: 0 };
    const factor = type === 'physical' ? physicalFactor : 1;
    return [type, { min: Math.round((base.min + added.min) * factor), max: Math.round((base.max + added.max) * factor) }];
  }));
  return { id: weapon.id, damage, attacksPerSecond, criticalChance };
}

/** Assemble one ordinary gem/weapon skill. Unsupported transformations remain explicit diagnostics. */
export function assembleSkill(input: SkillAssemblyInput) {
  const definition = input.definition;
  if (!definition.id.trim() || !['attack', 'spell'].includes(definition.kind)) throw new TypeError('Invalid skill definition');
  if (definition.sourceEvidence && (!definition.sourceEvidence.sourceId.trim()
    || !Number.isInteger(definition.sourceEvidence.level) || definition.sourceEvidence.level < 1
    || !Number.isFinite(definition.sourceEvidence.quality) || definition.sourceEvidence.quality < 0 || definition.sourceEvidence.quality > 100)) {
    throw new TypeError('Invalid active skill source evidence');
  }
  if (definition.kind === 'attack' && !input.weapon) throw new TypeError('Ordinary attack requires weapon');
  if (definition.kind === 'spell' && (definition.baseTime === undefined || definition.baseCritChance === undefined)) throw new TypeError('Spell requires base time and critical chance');
  ranges(definition.damage); ranges(input.addedDamage);
  const weapon = definition.kind === 'attack' ? resolveWeapon(input.weapon!) : undefined;
  const accepted: SupportInput[] = [];
  const rejectedSupports: { id: string; reason: string }[] = [];
  const seen = new Set<string>();
  for (const support of input.supports ?? []) {
    if (!support.id.trim() || seen.has(support.id)) throw new TypeError('Support ids must be unique and nonempty');
    seen.add(support.id); ranges(support.addedDamage);
    if (!support.compatibleKinds.includes(definition.kind)
      || !(support.requiredTags ?? []).every(tag => definition.tags.includes(tag))
      || (support.excludedTags ?? []).some(tag => definition.tags.includes(tag))) {
      rejectedSupports.push({ id: support.id, reason: 'Explicit normalized support compatibility policy does not match' });
    } else accepted.push(support);
  }
  const baseMultiplier = finite(definition.baseMultiplier ?? 1, 'base damage multiplier');
  const effectiveness = finite(definition.addedDamageEffectiveness ?? 1, 'added damage effectiveness');
  const damage: DamageRanges = Object.fromEntries(damageTypes.map(type => {
    const base = (weapon?.damage ?? definition.damage)?.[type] ?? { min: 0, max: 0 };
    const added = [input.addedDamage, ...accepted.map(support => support.addedDamage)]
      .reduce((sum, source) => ({ min: sum.min + (source?.[type]?.min ?? 0), max: sum.max + (source?.[type]?.max ?? 0) }), { min: 0, max: 0 });
    return [type, { min: finite(base.min * baseMultiplier + added.min * effectiveness, 'assembled damage'), max: finite(base.max * baseMultiplier + added.max * effectiveness, 'assembled damage') }];
  }));
  const sources: ModifierSource[] = accepted.map(support => ({ id: `support:${support.id}`, kind: 'skill',
    modifiers: support.modifiers.map(mod => ({ ...mod, skillId: definition.id })), unsupported: [...(support.unsupported ?? [])] }));
  sources.push({ id: `skill:${definition.id}`, kind: 'skill', modifiers: [], unsupported: [...(definition.unsupported ?? [])] });
  const skill: SkillInput = { id: definition.id, kind: definition.kind, damage,
    baseTime: finite(weapon ? 1 / weapon.attacksPerSecond : definition.baseTime!, 'skill base time', Number.MIN_VALUE),
    baseCritChance: finite(weapon?.criticalChance ?? definition.baseCritChance!, 'skill critical chance'),
    critMultiplier: finite(input.criticalMultiplier ?? 150, 'critical multiplier', 100), accuracy: finite(input.accuracy, 'accuracy') };
  if (skill.baseCritChance > 100) throw new RangeError('Critical chance exceeds 100%');
  return { skill, sources, rejectedSupports, weapon, ...(definition.sourceEvidence ? { sourceEvidence: { ...definition.sourceEvidence } } : {}) };
}
