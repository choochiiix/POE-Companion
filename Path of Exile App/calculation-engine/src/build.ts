import type { CalculationInput, Modifier, ModifierSource } from './model.ts';
import { evaluate, prepareModifiers } from './modifiers.ts';
import { validate } from './validate.ts';

export interface Attributes { readonly strength: number; readonly dexterity: number; readonly intelligence: number }
export type LocalDefenceStat = 'armour' | 'evasion' | 'energyShield';
/** Explicit local/global separation prevents local armour modifiers being applied twice. */
export interface EquipmentInput {
  readonly id: string;
  readonly slot: string;
  readonly defence?: Partial<Record<LocalDefenceStat, number>>;
  readonly localModifiers?: readonly (Omit<Modifier, 'stat' | 'conditions' | 'notConditions' | 'skillId'> & { readonly stat: LocalDefenceStat })[];
  readonly modifiers: readonly Modifier[];
  readonly unsupported?: readonly string[];
}
export interface BuildInput extends Omit<CalculationInput, 'sources'> {
  /** Base class/level values, before the ordinary attribute bonuses below. */
  readonly attributes: Attributes;
  readonly equipment?: readonly EquipmentInput[];
  readonly passives?: readonly ModifierSource[];
  readonly buffs?: readonly ModifierSource[];
  readonly gems?: readonly ModifierSource[];
  readonly configuration?: readonly ModifierSource[];
  readonly sources?: readonly ModifierSource[];
  readonly skillTags?: readonly string[];
  /** Explicit opt-out for builds whose keystones replace ordinary attribute bonuses. */
  readonly attributeBonuses?: boolean;
}
export interface BuildDiagnostic { readonly sourceId: string; readonly effect: string }

export function resolveEquipment(item: EquipmentInput) {
  if (!item.id.trim() || !item.slot.trim()) throw new TypeError('Equipment id and slot are required');
  const local = item.localModifiers ?? [];
  const seen = new Set<string>();
  for (const mod of local) {
    if (!mod.id.trim() || seen.has(mod.id)) throw new TypeError('Duplicate or empty local modifier id');
    seen.add(mod.id);
    if (!['armour', 'evasion', 'energyShield'].includes(mod.stat) || !['BASE', 'INC', 'MORE'].includes(mod.kind)
      || !Number.isFinite(mod.value) || (mod.kind === 'MORE' && mod.value < -100)) throw new TypeError('Unsupported local defence modifier');
    if ('conditions' in mod || 'skillId' in mod || 'notConditions' in mod) throw new TypeError('Conditional local modifiers require a specialized adapter');
  }
  const resolve = (stat: LocalDefenceStat) => {
    const base = item.defence?.[stat] ?? 0;
    if (!Number.isFinite(base) || base < 0) throw new RangeError('Invalid equipment defence');
    return evaluate(local.map(mod => ({ ...mod, sourceId: item.id })), [stat], base);
  };
  return { armour: resolve('armour'), evasion: resolve('evasion'), energyShield: resolve('energyShield') };
}

/** Normalized build adapter, not an item-description parser or a live-save adapter. */
export function assembleBuild(build: BuildInput) {
  for (const stat of ['strength', 'dexterity', 'intelligence'] as const) {
    const value = build.attributes[stat];
    if (!Number.isFinite(value) || value < 0) throw new RangeError('Invalid base attribute');
  }
  const sources: ModifierSource[] = [];
  const equipmentBreakdowns: { id: string; defence: ReturnType<typeof resolveEquipment> }[] = [];
  const slots = new Set<string>();
  for (const item of build.equipment ?? []) {
    if (slots.has(item.slot)) throw new TypeError('Duplicate equipment slot');
    slots.add(item.slot);
    const defence = resolveEquipment(item);
    equipmentBreakdowns.push({ id: item.id, defence });
    const localBonuses: Modifier[] = (['armour', 'evasion', 'energyShield'] as const).map(stat => ({ id: `local:${stat}`, stat, kind: 'BASE', value: defence[stat].value }));
    // Namespaced generated IDs cannot collide with the caller's own modifier IDs.
    sources.push({ id: `equipment:${item.id}`, kind: 'equipment', modifiers: item.modifiers.map(mod => ({ ...mod, id: `global:${mod.id}` })), unsupported: [...(item.unsupported ?? [])] });
    sources.push({ id: `equipment-local:${item.id}`, kind: 'equipment', modifiers: localBonuses });
  }
  sources.push(...(build.passives ?? []), ...(build.buffs ?? []), ...(build.gems ?? []), ...(build.configuration ?? []), ...(build.sources ?? []));
  const input: CalculationInput = {
    version: build.version, sources, pools: { ...build.pools }, resistances: { ...build.resistances },
    resistancePenalty: build.resistancePenalty, enemy: { ...build.enemy, resistances: { ...build.enemy.resistances } },
    incomingPhysicalHit: build.incomingPhysicalHit,
    ...(build.rounding === undefined ? {} : { rounding: build.rounding }),
    ...(build.conversion === undefined ? {} : { conversion: build.conversion.map(rule => ({ ...rule })) }),
    ...(build.incomingHit === undefined ? {} : { incomingHit: { ...build.incomingHit, damage: { ...build.incomingHit.damage }, ...(build.incomingHit.takenAs === undefined ? {} : { takenAs: build.incomingHit.takenAs.map(rule => ({ ...rule })) }) } }),
    ...(build.conditions === undefined ? {} : { conditions: [...build.conditions] }),
    ...(build.skill === undefined ? {} : { skill: { ...build.skill, damage: Object.fromEntries(Object.entries(build.skill.damage).map(([type, range]) => [type, { ...range }])) } }),
  };
  validate(input);
  const mods = prepareModifiers(input);
  const attributes = {
    strength: evaluate(mods, ['strength'], build.attributes.strength),
    dexterity: evaluate(mods, ['dexterity'], build.attributes.dexterity),
    intelligence: evaluate(mods, ['intelligence'], build.attributes.intelligence),
  };
  if (build.attributeBonuses !== false) {
    const strength = Math.floor(attributes.strength.value), dexterity = Math.floor(attributes.dexterity.value), intelligence = Math.floor(attributes.intelligence.value);
    const bonuses: Modifier[] = [
      { id: 'strength-life', stat: 'life', kind: 'BASE', value: Math.floor(strength / 2) },
      { id: 'dexterity-accuracy', stat: 'accuracy', kind: 'BASE', value: dexterity * 2 },
      { id: 'dexterity-evasion', stat: 'evasion', kind: 'INC', value: Math.floor(dexterity / 5) },
      { id: 'intelligence-mana', stat: 'mana', kind: 'BASE', value: Math.floor(intelligence / 2) },
      { id: 'intelligence-energy-shield', stat: 'energyShield', kind: 'INC', value: Math.floor(intelligence / 10) },
    ];
    if (build.skill && build.skillTags?.includes('melee')) bonuses.push({ id: 'strength-melee', stat: 'physicalDamage', kind: 'INC', value: Math.floor(strength / 5), skillId: build.skill.id });
    sources.push({ id: 'derived:ordinary-attributes', kind: 'configuration', modifiers: bonuses });
  }
  validate(input);
  const diagnostics: BuildDiagnostic[] = sources.flatMap(source => (source.unsupported ?? []).map(effect => ({ sourceId: source.id, effect })));
  return { input, attributes, equipment: equipmentBreakdowns, diagnostics };
}
