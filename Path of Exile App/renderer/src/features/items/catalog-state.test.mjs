import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { clearFilters, comparisonLines, filterCatalog, initialFilters } from './catalog-state.ts';
const catalog = JSON.parse(await readFile(new URL('../../../../crafting-ui/catalog-data.json', import.meta.url), 'utf8'));
test('catalog filters preserve snapshot coverage and combined filters', () => {
  assert.equal(filterCatalog(catalog.uniques, initialFilters).length, catalog.uniques.length);
  const item = catalog.uniques.find(item => item.requirements.strength > 0 && item.explicit.length);
  const filters = { ...initialFilters, category: item.category, itemClass: item.itemClass, search: item.name, attribute: 'strength', level: String(item.level), stat: item.explicit[0].key };
  assert.ok(filterCatalog(catalog.uniques, filters).some(result => result.id === item.id));
  assert.equal(filterCatalog(catalog.uniques, { ...filters, level: '-1' }).length, 0);
  assert.equal(clearFilters('base').category, 'Armour');
});
test('comparison handoff resolves both source range separators to midpoint', () => {
  assert.deepEqual(comparisonLines({ implicit: [{text:'+(10-20) to Life'}], explicit: [{text:'Adds (2–6) to (8-12) Fire Damage'}] }), ['+15 to Life', 'Adds 4 to 10 Fire Damage']);
});

