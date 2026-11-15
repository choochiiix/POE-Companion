import type { Modifier, ModifierSource, Stat } from '../model.ts';
import { validateConversions } from '../conversion.ts';
import type { DamageConversion } from '../conversion.ts';
import { damageTypes } from '../model.ts';

const names: Readonly<Record<string, Stat>> = {
  'Elemental Damage':'elementalDamage',
  'Spell Damage': 'spellDamage', 'Physical Damage': 'physicalDamage', 'Fire Damage': 'fireDamage',
  'Lightning Damage': 'lightningDamage', 'Cold Damage': 'coldDamage', 'Chaos Damage': 'chaosDamage',
  'Attack Speed': 'attackSpeed', 'Cast Speed': 'castSpeed', 'Critical Strike Chance': 'critChance',
  'Global Accuracy Rating': 'accuracy', 'maximum Life': 'life', 'maximum Mana': 'mana',
  'Armour': 'armour', 'Evasion Rating': 'evasion', 'maximum Energy Shield': 'energyShield',
  'Strength': 'strength', 'Dexterity': 'dexterity', 'Intelligence': 'intelligence',
  'Fire Resistance': 'fireResistance', 'Cold Resistance': 'coldResistance', 'Lightning Resistance': 'lightningResistance', 'Chaos Resistance': 'chaosResistance',
};
/** Conservative ordinary-stat adapter. Unknown/contextual lines retain source diagnostics. */
export function translateStatLines(id: string, kind: ModifierSource['kind'], lines: readonly string[]): ModifierSource {
  const modifiers: Modifier[] = [], unsupported: string[] = [];
  lines.forEach((line, index) => {
    const percent = /^([\d.]+)% (increased|reduced|more|less) (.+)$/.exec(line);
    const flat = /^([+-]?[\d.]+)(%)? to (.+)$/.exec(line);
    const name = percent?.[3] ?? flat?.[3];
    const stat = name ? names[name] : undefined;
    if (!stat || (!percent && !flat) || (stat.endsWith('Resistance') && !flat?.[2]) || (!stat.endsWith('Resistance') && flat?.[2])) {
      unsupported.push(line); return;
    }
    const value = Number(percent?.[1] ?? flat?.[1]) * (percent && ['reduced', 'less'].includes(percent[2]!) ? -1 : 1);
    if (!Number.isFinite(value)) { unsupported.push(line); return; }
    modifiers.push({ id: `line:${index}`, stat, kind: percent ? (['more', 'less'].includes(percent[2]!) ? 'MORE' : 'INC') : 'BASE', value });
  });
  return { id, kind, modifiers, unsupported };
}

/** Adds explicit ordered damage transformations without forcing them into ordinary numeric stats. */
export function translateEffects(id: string, kind: ModifierSource['kind'], lines: readonly string[]) {
  const conversion: DamageConversion[] = [], ordinary: string[] = [];
  for (const line of lines) {
    const converted = /^([\d.]+)% of (Physical|Lightning|Cold|Fire|Chaos) Damage Converted to (Physical|Lightning|Cold|Fire|Chaos) Damage$/.exec(line);
    const gain = /^Gain ([\d.]+)% of (Physical|Lightning|Cold|Fire|Chaos) Damage as Extra (Physical|Lightning|Cold|Fire|Chaos) Damage$/.exec(line);
    const match = converted ?? gain;
    if (!match) { ordinary.push(line); continue; }
    const from = damageTypes.find(type=>type===match[2]!.toLowerCase())!;
    const to = damageTypes.find(type=>type===match[3]!.toLowerCase())!;
    const rule: DamageConversion = {sourceId:id,from,to,percent:Number(match[1]),kind:converted?'convert':'gain'};
    try {validateConversions([...conversion,rule]);conversion.push(rule);} catch {ordinary.push(line);}
  }
  return {source:translateStatLines(id,kind,ordinary),conversion};
}
