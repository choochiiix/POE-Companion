import { damageTypes } from './model.ts';
import type { CalculationInput } from './model.ts';
import { validateConversions } from './conversion.ts';
import { validateIncomingHit } from './advanced-defence.ts';

const stats = new Set(['damage', ...damageTypes.map(type => `${type}Damage`), 'elementalDamage', 'attackDamage', 'spellDamage',
  'attackSpeed', 'castSpeed', 'actionSpeed', 'accuracy', 'critChance', 'critMultiplier', 'life', 'mana', 'energyShield', 'armour', 'evasion', 'strength', 'dexterity', 'intelligence',
  ...['fire', 'cold', 'lightning', 'chaos'].flatMap(type => [`${type}Resistance`, `${type}MaximumResistance`])]);
export function validate(input: CalculationInput): void {
  const finite = (value: number, label: string, min = -Number.MAX_VALUE) => {
    if (!Number.isFinite(value) || value < min) throw new RangeError(`Invalid ${label}`);
  };
  const id = (value: string) => { if (typeof value !== 'string' || !value.trim()) throw new TypeError('Expected nonempty identifier'); };
  if (input.version !== 1) throw new TypeError('Unsupported calculation input version');
  if (input.rounding !== undefined && !['continuous', 'pob'].includes(input.rounding)) throw new TypeError('Unknown rounding policy');
  validateConversions(input.conversion ?? []);
  if (input.incomingHit) validateIncomingHit(input.incomingHit);
  for (const key of ['life', 'mana', 'energyShield', 'armour', 'evasion'] as const) finite(input.pools[key], key, 0);
  for (const type of ['fire', 'cold', 'lightning', 'chaos'] as const) {
    finite(input.resistances[type], 'resistance'); finite(input.enemy.resistances[type], 'enemy resistance');
  }
  finite(input.resistancePenalty, 'resistance penalty');
  for (const key of ['armour', 'evasion', 'accuracy'] as const) finite(input.enemy[key], `enemy ${key}`, 0);
  finite(input.incomingPhysicalHit, 'incoming hit', 0);
  for (const condition of input.conditions ?? []) id(condition);
  const sources = new Set<string>();
  for (const source of input.sources) {
    id(source.id);
    if (sources.has(source.id)) throw new TypeError('Duplicate source id');
    sources.add(source.id);
    if (!['equipment', 'passive', 'buff', 'skill', 'configuration'].includes(source.kind)) throw new TypeError('Unknown source kind');
    const ids = new Set<string>();
    for (const mod of source.modifiers) {
      id(mod.id);
      if (ids.has(mod.id)) throw new TypeError('Duplicate modifier id within source');
      ids.add(mod.id);
      if (!stats.has(mod.stat) || !['BASE', 'INC', 'MORE'].includes(mod.kind)) throw new TypeError('Unsupported modifier');
      finite(mod.value, 'modifier value');
      if (mod.kind === 'BASE' && ['damage', 'elementalDamage', 'attackDamage', 'spellDamage'].includes(mod.stat)) throw new TypeError('Generic flat damage is ambiguous; supply typed ranges or type-specific BASE modifiers');
      if (mod.kind === 'MORE' && mod.value < -100) throw new RangeError('Less multiplier exceeds 100%');
      if (mod.stat.endsWith('Resistance') && mod.kind !== 'BASE') throw new TypeError('Resistance modifiers require BASE percentage points');
      if (mod.skillId !== undefined) {
        id(mod.skillId);
        if (['life','mana','energyShield','armour','evasion','strength','dexterity','intelligence'].includes(mod.stat) || mod.stat.endsWith('Resistance')) throw new TypeError('Defence/attribute modifiers cannot be skill scoped');
      }
      for (const condition of mod.conditions ?? []) id(condition);
      for (const condition of mod.notConditions ?? []) id(condition);
      if ((mod.conditions ?? []).some(condition => mod.notConditions?.includes(condition))) throw new TypeError('Contradictory modifier conditions');
    }
    for (const effect of source.unsupported ?? []) id(effect);
  }
  if (input.skill) {
    const skill = input.skill;
    id(skill.id);
    if (!['attack', 'spell'].includes(skill.kind)) throw new TypeError('Unsupported skill kind');
    finite(skill.baseTime, 'base time', Number.MIN_VALUE);
    finite(skill.baseCritChance, 'critical chance', 0);
    if (skill.baseCritChance > 100) throw new RangeError('Critical chance exceeds 100%');
    finite(skill.critMultiplier, 'critical multiplier', 100); finite(skill.accuracy, 'accuracy', 0);
    for (const [type, range] of Object.entries(skill.damage)) {
      if (!damageTypes.includes(type as typeof damageTypes[number])) throw new TypeError('Unknown damage type');
      finite(range.min, 'minimum damage', 0); finite(range.max, 'maximum damage', range.min);
    }
  }
}
