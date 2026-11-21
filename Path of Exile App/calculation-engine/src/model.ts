import type { DamageConversion } from './conversion.ts';
import type { DefenceConfiguration, IncomingHitScenario } from './advanced-defence.ts';
export const damageTypes = ['physical', 'lightning', 'cold', 'fire', 'chaos'] as const;
export type DamageType = typeof damageTypes[number];
export type ResistanceType = Exclude<DamageType, 'physical'>;
export type Stat = 'damage' | `${DamageType}Damage` | 'elementalDamage' | 'attackDamage' | 'spellDamage'
  | 'attackSpeed' | 'castSpeed' | 'actionSpeed' | 'accuracy' | 'critChance' | 'critMultiplier'
  | 'life' | 'mana' | 'energyShield' | 'armour' | 'evasion'
  | 'strength' | 'dexterity' | 'intelligence'
  | `${ResistanceType}Resistance` | `${ResistanceType}MaximumResistance`;
/** BASE is flat; INC is additive percent; MORE is multiplicative percent. Reduced/less use negative values. */
export interface Modifier {
  readonly id: string;
  readonly stat: Stat;
  readonly kind: 'BASE' | 'INC' | 'MORE';
  readonly value: number;
  readonly conditions?: readonly string[];
  /** Modifier applies only when none of these explicit conditions are active. */
  readonly notConditions?: readonly string[];
  readonly skillId?: string;
}
export interface ModifierSource {
  readonly id: string;
  readonly kind: 'equipment' | 'passive' | 'buff' | 'skill' | 'configuration';
  readonly modifiers: readonly Modifier[];
  /** Adapter must declare effects it could not normalize. Never silently drop them. */
  readonly unsupported?: readonly string[];
}
export interface SkillInput {
  readonly id: string;
  readonly kind: 'attack' | 'spell';
  /** Final local weapon or gem base values, before global modifiers. */
  readonly damage: Partial<Record<DamageType, { readonly min: number; readonly max: number }>>;
  readonly baseTime: number;
  readonly baseCritChance: number;
  readonly critMultiplier: number;
  readonly accuracy: number;
}
export interface EnemyInput {
  readonly armour: number;
  readonly evasion: number;
  readonly accuracy: number;
  readonly resistances: Record<ResistanceType, number>;
  /** Selected exposure magnitude, in percentage points, after resolving competing sources. */
  readonly exposure?: Partial<Record<ResistanceType, number>>;
  /** Effective hit penetration, in percentage points. */
  readonly penetration?: Partial<Record<ResistanceType, number>>;
}
export interface CalculationInput {
  readonly version: 1;
  /** Explicit snapshot rounding; continuous remains the backward-compatible default. */
  readonly rounding?: 'continuous' | 'pob';
  readonly sources: readonly ModifierSource[];
  readonly conditions?: readonly string[];
  readonly pools: { readonly life: number; readonly mana: number; readonly energyShield: number; readonly armour: number; readonly evasion: number };
  readonly resistances: Record<ResistanceType, number>;
  readonly resistancePenalty: number;
  readonly enemy: EnemyInput;
  readonly incomingPhysicalHit: number;
  readonly conversion?: readonly DamageConversion[];
  readonly defenceConfig?: DefenceConfiguration;
  readonly incomingHit?: IncomingHitScenario;
  readonly skill?: SkillInput;
}
export interface Contribution extends Modifier { readonly sourceId: string }
export interface Breakdown {
  readonly base: number;
  readonly increased: number;
  readonly more: number;
  readonly value: number;
  readonly contributions: readonly Contribution[];
}
