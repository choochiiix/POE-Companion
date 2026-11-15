import type { CatalogItem } from './types.ts';

export interface CatalogFilters {
  mode: 'unique' | 'base'; category: string; search: string; itemClass: string;
  attribute: string; level: string; stat: string; sort: 'name' | 'level' | 'stat';
}
export const initialFilters: CatalogFilters = { mode: 'unique', category: '', search: '', itemClass: '', attribute: '', level: '', stat: '', sort: 'name' };
export function clearFilters(mode: CatalogFilters['mode']): CatalogFilters {
  return { ...initialFilters, mode, category: mode === 'base' ? 'Armour' : '' };
}
export function filterCatalog(items: CatalogItem[], filters: CatalogFilters): CatalogItem[] {
  const words = filters.search.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const modifiers = (item: CatalogItem) => [...item.implicit, ...item.explicit];
  const value = (item: CatalogItem) => modifiers(item).find(mod => mod.key === filters.stat)?.ranges[0]?.max ?? -Infinity;
  return items.filter(item => (!filters.category || item.category === filters.category)
    && words.every(word => (item.search ?? [item.name, item.baseType, item.itemClass, item.category, item.variant, item.flavorText, ...modifiers(item).map(mod => mod.text)].join(' ').toLowerCase()).includes(word))
    && (!filters.itemClass || item.itemClass === filters.itemClass)
    && (!filters.attribute || item.requirements[filters.attribute] > 0)
    && (filters.level === '' || item.level <= Number(filters.level))
    && (!filters.stat || modifiers(item).some(mod => mod.key === filters.stat)))
    .sort((a, b) => a.category.localeCompare(b.category) || a.itemClass.localeCompare(b.itemClass)
      || (filters.sort === 'level' ? a.level - b.level : filters.sort === 'stat' ? (value(a) === value(b) ? 0 : value(a) > value(b) ? -1 : 1) : 0)
      || a.name.localeCompare(b.name));
}
export function comparisonLines(item: CatalogItem): string[] {
  return [...item.implicit, ...item.explicit].map(mod => mod.text.replace(/\((-?\d+(?:\.\d+)?)[–-](-?\d+(?:\.\d+)?)\)/g, (_, a, b) => String((Number(a) + Number(b)) / 2)));
}
