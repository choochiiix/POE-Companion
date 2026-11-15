import '../../shared/layout/navigation.js';
import { createElementFactory } from '../../shared/ui/dom.js';
import { renderBuffEffects } from './buff-effects-ui.js';
import { conciseDefinition } from '../../shared/definitions/glossary-model.js';
import { installInspector } from '../../shared/layout/library-layout.js';

const workspace = document.querySelector('.workspace');
const root = document.createElement('div');
root.id = 'compendiumPanel';
root.hidden = true;
workspace.append(root);
const el = createElementFactory(root);
const tab = document.createElement('button');
tab.type = 'button';
tab.id = 'compendiumTab';
tab.textContent = 'Compendium';
tab.setAttribute('aria-pressed', 'false');
tab.setAttribute('aria-controls', root.id);
document.querySelector('.workspace-tabs').append(tab);

el('h2', 'Compendium');
el('p', 'The master glossary · mechanics, skills and modifier language. Draft definitions remain marked for review.');
const layout = el('div');
layout.className = 'library-workspace';
const nav = el('nav', '', layout);
nav.className = 'library-categories';
nav.setAttribute('aria-label', 'Glossary collections');
const center = el('div', '', layout);
center.className = 'library-results';
const inspector = installInspector(layout, 'Definition inspector').body;
const controls = el('div', '', center);
controls.className = 'compendium-controls';
const label = el('label', 'Search definitions', controls);
const search = el('input', '', label);
search.type = 'search';
const status = el('p', 'Loading local glossary…', center);
status.setAttribute('role', 'status');
const table = el('table', '', center);
table.className = 'compendium-table';
const head = el('thead', '', table);
const headings = el('tr', '', head);
for (const title of ['Term', 'Review status', 'Type']) el('th', title, headings).scope = 'col';
const body = el('tbody', '', table);
const more = el('button', 'Show more', center);
more.type = 'button';
more.hidden = true;
let entries = [];
let filter = new URLSearchParams(location.search).get('collection') === 'buff' ? 'buff' : 'reviewed';
let limit = 50;
let selected = '';
const statusLabels = { reviewed: 'Reviewed', 'source-extracted': 'Source extracted', 'needs-extraction': 'Needs extraction' };

function renderSources(entry) {
  el('h4', 'Sources', inspector);
  for (const source of entry.sources) {
    if (!source.url) {
      el('p', `${source.path} · ${source.record}`, inspector).className = 'compendium-sources';
      continue;
    }
    const link = el('a', source.url, inspector);
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.className = 'compendium-sources';
    el('p', `${source.revision != null ? 'Revision ' + source.revision : 'Source record ' + source.record} · ${source.license}`, inspector);
  }
  const details = el('details', '', inspector);
  el('summary', 'Record identity and source references', details);
  el('p', entry.id, details);
  for (const reference of entry.references.slice(0, 20)) el('p', `${reference.surface} · ${reference.record} · ${reference.field}`, details);
  if (entry.references.length > 20) el('p', `${entry.references.length - 20} additional references in master.json`, details);
}

function show(entry) {
  selected = entry.id;
  inspector.replaceChildren();
  el('h3', entry.name, inspector);
  if (entry.icon) {
    const image = el('img', '', inspector);
    image.src = entry.icon;
    image.alt = entry.name + ' status icon';
    image.className = 'buff-inspector-icon';
    image.width = 96;
    image.height = 96;
  }
  const badge = entry.buffId
    ? (entry.definition ? 'RePoE status effect · ' + entry.category : 'Source description unavailable')
    : entry.status === 'reviewed' ? 'Reviewed starter definition' : 'Draft · needs review';
  el('p', badge, inspector).className = 'compendium-badge';
  const short = conciseDefinition(entry.definition);
  el('p', short || 'No description supplied by source.', inspector).className = 'compendium-definition';
  if (short !== entry.definition) {
    const full = el('details', '', inspector);
    el('summary', 'Full definition', full);
    el('p', entry.definition, full);
  }
  renderBuffEffects(entry, inspector);
  if (entry.buffId) el('p', `Category: ${entry.category}${entry.invisible ? ' · hidden effect in source' : ''}`, inspector);
  if (entry.buffId && !entry.icon) el('p', 'No local icon available for this source record.', inspector);
  el('p', `Aliases: ${entry.aliases.join(', ')}`, inspector);
  el('p', `${entry.references.length} source references · ${entry.kind}`, inspector);
  renderSources(entry);
  for (const button of body.querySelectorAll('button')) button.setAttribute('aria-pressed', String(button.dataset.id === selected));
}

for (const [value, name] of [
  ['reviewed', 'Reviewed definitions'], ['', 'All records'], ['source-extracted', 'Drafts'],
  ['needs-extraction', 'Needs extraction'], ['buff', 'Buffs & effects'], ['debuff', 'Debuffs'],
  ['flask', 'Flask effects'], ['skill', 'Gems'], ['granted-skill', 'Granted skills'],
]) {
  const button = el('button', name, nav);
  button.type = 'button';
  button.setAttribute('aria-pressed', String(value === filter));
  button.onclick = () => {
    filter = value;
    limit = 50;
    for (const sibling of nav.children) sibling.setAttribute('aria-pressed', String(sibling === button));
    render();
  };
}

function render() {
  const words = search.value.toLowerCase().trim().split(/\s+/);
  const matches = entries.filter(entry => {
    const inCollection = !filter || entry.status === filter || entry.kind === filter
      || (filter === 'debuff' && entry.category === 'Debuff') || (filter === 'flask' && entry.category === 'Flask');
    const text = [entry.name, ...entry.aliases, entry.definition, ...(entry.statIds || []), ...(entry.effectVariants || []).flatMap(variant => variant.lines || [])].join(' ').toLowerCase();
    return inCollection && words.every(word => text.includes(word));
  }).sort((a, b) => a.name.localeCompare(b.name));
  status.textContent = `${matches.length} matching records · ${Math.min(limit, matches.length)} shown`;
  body.replaceChildren();
  for (const entry of matches.slice(0, limit)) {
    const row = el('tr', '', body);
    const cell = el('td', '', row);
    const button = el('button', entry.name, cell);
    button.type = 'button';
    if (entry.icon) {
      const image = document.createElement('img');
      image.src = entry.icon;
      image.alt = '';
      image.width = 40;
      image.height = 40;
      image.loading = 'lazy';
      image.className = 'buff-row-icon';
      button.prepend(image);
    }
    if (entry.buffId) el('small', entry.buffId, button).className = 'buff-source-id';
    button.dataset.id = entry.id;
    button.setAttribute('aria-pressed', String(entry.id === selected));
    button.onclick = () => show(entry);
    el('td', statusLabels[entry.status] || entry.status, row);
    el('td', entry.category || entry.kind, row);
  }
  more.hidden = matches.length <= limit;
  if (!matches.some(entry => entry.id === selected)) {
    if (matches.length) show(matches[0]);
    else inspector.textContent = 'No definitions match these filters.';
  }
}
search.oninput = () => { limit = 50; render(); };
more.onclick = () => { limit += 50; render(); };
async function loadEntries() {
  const datasets = await Promise.all(['/glossary-data.json', '/buff-data.json'].map(async path => {
    const response = await fetch(path);
    if (!response.ok) throw Error('Local glossary data unavailable');
    return response.json();
  }));
  entries = datasets.flatMap(dataset => dataset.entries);
  render();
}
loadEntries().catch(() => {
  status.setAttribute('role', 'alert');
  more.hidden = true;
  status.textContent = 'Compendium could not load. Reload to retry the local data files.';
});
workspace.append(document.querySelector('.workspace > footer'));
if (new URLSearchParams(location.search).get('screen') === 'compendium') tab.click();
