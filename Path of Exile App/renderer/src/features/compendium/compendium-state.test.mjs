import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { filterDefinitions } from './compendium-state.ts';
const data = await Promise.all(['glossary/master.json','crafting-ui/buff-data.json'].map(async file => JSON.parse(await readFile(new URL('../../../../' + file, import.meta.url), 'utf8'))));
const entries = data.flatMap(data => data.entries);
test('collections preserve all local records and reviewed statuses', () => {
  assert.equal(filterDefinitions(entries, '', '').length, entries.length);
  assert.ok(filterDefinitions(entries, 'reviewed', '').every(entry => entry.status === 'reviewed'));
  assert.ok(filterDefinitions(entries, 'debuff', '').every(entry => entry.category === 'Debuff'));
});
test('effect search includes exact stat IDs and source-specific translated effects', () => {
  const entry = entries.find(entry => entry.statIds?.length && entry.effectVariants?.some(variant => variant.lines?.length));
  assert.ok(entry);
  assert.ok(filterDefinitions(entries, '', entry.statIds[0]).some(result => result.id === entry.id));
  const line = entry.effectVariants.find(variant => variant.lines?.length).lines[0];
  assert.ok(filterDefinitions(entries, '', line).some(result => result.id === entry.id));
});

