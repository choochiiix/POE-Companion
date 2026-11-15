import type { GlossaryEntry } from './types.ts';
export const collections = [
  ['reviewed', 'Reviewed definitions'], ['', 'All records'], ['source-extracted', 'Drafts'],
  ['needs-extraction', 'Needs extraction'], ['buff', 'Buffs & effects'], ['debuff', 'Debuffs'],
  ['flask', 'Flask effects'], ['skill', 'Gems'], ['granted-skill', 'Granted skills'],
] as const;
export function filterDefinitions(entries: GlossaryEntry[], collection: string, search: string): GlossaryEntry[] {
  const words = search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return entries.filter(entry => {
    const inCollection = !collection || entry.status === collection || entry.kind === collection
      || (collection === 'debuff' && entry.category === 'Debuff') || (collection === 'flask' && entry.category === 'Flask');
    const text = [entry.name, ...entry.aliases, entry.definition, ...(entry.statIds || []), ...(entry.effectVariants || []).flatMap(variant => variant.lines || [])].join(' ').toLowerCase();
    return inCollection && words.every(word => text.includes(word));
  }).sort((a, b) => a.name.localeCompare(b.name));
}
