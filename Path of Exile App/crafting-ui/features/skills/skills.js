import { createElementFactory } from '../../shared/ui/dom.js';
import { installInspector } from '../../shared/layout/library-layout.js';
import { addGem, compatibility, filterGems, gemCategories, inGemCategory, skillsStorageKey, validateGroups } from './skills-model.js';
let liveGroups=[];
export function getCalculationGroups(){return structuredClone(liveGroups);}

export function mountSkills(root, { gems, artworkStatus }, storage) {
  root.replaceChildren();
  const el = createElementFactory(root);
  function button(text, parent, action) {
    const node = el('button', text, parent); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function select(text, parent, choices) {
    const label = el('label', text, parent), node = el('select', '', label);
    node.setAttribute('aria-label', text);
    for (const [value, name] of choices) { const option = el('option', name, node); option.value = value; }
    return node;
  }
  let saved;
  let storageIssue = '';
  try { storage ??= globalThis.localStorage; saved = JSON.parse(storage.getItem(skillsStorageKey)); }
  catch { storageIssue = 'Saved skills could not be read. Changes last only for this session if storage is unavailable.'; }
  let state = validateGroups(saved, gems), selected = state.groups[0]?.id || '', limit = 60;
  liveGroups=state.groups;
  document.dispatchEvent(new CustomEvent('build:change'));
  const byId = new Map(gems.map(g => [g.id, g]));
  el('h2', 'Skills');
  el('p', 'Browse skill gems and plan named groups. Changes save on this device, independently of Character, Equipment and Skill tree.');
  const limits = el('details', '');
  el('summary', 'Source coverage and future limitations', limits);
  el('p', 'User-provided Path of Building dev archive; snapshot coverage is not a live-patch guarantee. Compatibility warnings use explicit source types only. Minions, secondary skills, weapons, triggers and support transformations can require context this planner does not model.', limits);
  el('p', 'Cards show unmodified gem reference ranges from level 1 to natural maximum and additional effects from 1–20% quality. These are source values, not your character\'s damage, costs or DPS. Quality is informational; groups do not configure gem level or quality. Future work: equipment socket positions, socket colours, links, gem experience, DPS and full build calculations. Character requirements are not checked.', limits);
  el('p', artworkStatus, limits);
  if (!gems.some(g => g.art)) el('p', 'Gem artwork unavailable in this archive. Cards show source data without substitute images. See source coverage above.').className = 'skills-notice';
  const planner = el('section', ''); planner.setAttribute('aria-label', 'Saved skill setup planner');
  el('h3', 'Saved skill groups', planner);
  const newRow = el('div', '', planner); newRow.className = 'row';
  const nl = el('label', 'New group name', newRow), name = el('input', '', nl); name.maxLength = 80; name.placeholder = 'Main skill, Movement, Aura, Utility';
  const status = el('p', storageIssue || 'Create a group, then add gems from the library.', planner); status.setAttribute('role', 'status');
  button('Create group', newRow, () => {
    if (!name.value.trim()) { status.textContent = 'Enter a group name.'; name.focus(); return; }
    if (state.groups.length >= 100) { status.textContent = 'The planner supports up to 100 groups.'; return; }
    selected = globalThis.crypto.randomUUID();
    state.groups.push({ id: selected, name: name.value.trim(), activeId: '', supportIds: [] }); name.value = '';
    save(); renderPlanner(); renderLibrary(); inspector.reset(); groupPicker.focus();
  });
  name.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); newRow.querySelector('button').click(); } });
  const groupPicker = select('Editing group / destination for library gems', planner, []);
  const editor = el('div', '', planner);
  groupPicker.addEventListener('change', () => { selected = groupPicker.value; renderPlanner(); renderLibrary(); });
  function save() {
    liveGroups=state.groups;
    document.dispatchEvent(new CustomEvent('build:change'));
    try { storage.setItem(skillsStorageKey, JSON.stringify(validateGroups(state, gems))); status.textContent = 'Skill groups saved on this device.'; }
    catch { status.textContent = 'Storage unavailable. Changes last until this page closes or reloads.'; }
  }
  function current() { return state.groups.find(g => g.id === selected); }
  function renderPlanner() {
    groupPicker.replaceChildren();
    for (const group of state.groups) { const option = el('option', group.name, groupPicker); option.value = group.id; }
    groupPicker.value = selected; groupPicker.disabled = !state.groups.length;
    editor.replaceChildren();
    const group = current();
    if (!group) { el('p', 'No groups yet. Create your first skill group above.', editor); return; }
    const label = el('label', 'Group name', editor), rename = el('input', '', label); rename.value = group.name; rename.maxLength = 80;
    rename.addEventListener('change', () => { group.name = rename.value.trim() || 'Skill group'; rename.value = group.name; save(); groupPicker.selectedOptions[0].textContent = group.name; });
    button('Delete group', editor, () => {
      state.groups = state.groups.filter(g => g.id !== selected); selected = state.groups[0]?.id || '';
      save(); renderPlanner(); renderLibrary(); (state.groups.length ? groupPicker : name).focus();
    });
    el('h4', 'Active gem', editor);
    button('Calculate this group',editor,()=>document.dispatchEvent(new CustomEvent('calculation:select-group',{detail:{groupId:group.id}})));
    const active = byId.get(group.activeId);
    el('p', active?.name || 'No active gem selected. Add one from the library.', editor);
    if (active) button('Remove active gem', editor, () => { group.activeId = ''; save(); renderPlanner(); renderLibrary(); inspector.reset(); groupPicker.focus(); });
    el('h4', 'Support gems', editor);
    if (!group.supportIds.length) el('p', 'No supports selected.', editor);
    for (const id of group.supportIds) {
      const support = byId.get(id), row = el('div', '', editor); row.className = 'skill-support';
      el('strong', support.name, row);
      const check = compatibility(active, support, group.supportIds.filter(other => other !== id).map(other => byId.get(other)));
      el('p', check.message, row).className = `skill-${check.state}`;
      button(`Remove ${support.name}`, row, () => { group.supportIds = group.supportIds.filter(other => other !== id); save(); renderPlanner(); renderLibrary(); inspector.reset(); groupPicker.focus(); });
    }
  }
  const library = el('section', ''); library.setAttribute('aria-label', 'Gem library');
  el('h3', 'Gem library', library);
  const browser = el('div', '', library); browser.className = 'gem-library-layout';
  const categories = el('div', '', browser); categories.className = 'gem-category-tabs';
  categories.setAttribute('role', 'tablist'); categories.setAttribute('aria-label', 'Gem categories');
  categories.setAttribute('aria-orientation', 'vertical');
  let category = 'all';
  const categoryButtons = gemCategories.map(({ id, label }, index) => {
    const tab = button(label, categories, () => { category = id; limit = 60; renderLibrary(); });
    tab.id = `gem-category-${id}`; tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-label', label);
    tab.setAttribute('aria-controls', 'gem-category-panel');
    const total = el('span', String(gems.filter(g => inGemCategory(g, id)).length), tab);
    total.setAttribute('aria-hidden', 'true');
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowDown') next = (index + 1) % gemCategories.length;
      if (event.key === 'ArrowUp') next = (index + gemCategories.length - 1) % gemCategories.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = gemCategories.length - 1;
      if (next === undefined) return;
      event.preventDefault(); categoryButtons[next].focus(); categoryButtons[next].click();
    });
    return tab;
  });
  const pane = el('div', '', browser); pane.id = 'gem-category-panel'; pane.setAttribute('role', 'tabpanel');
  el('p', 'Active gems can appear in multiple categories based on their source tags. Support gems have their own category.', pane).className = 'gem-category-note';
  const controls = el('div', '', pane); controls.className = 'skills-filters';
  const sl = el('label', 'Search gems, tags, descriptions and effects', controls), search = el('input', '', sl); search.type = 'search';
  const tag = select('Tag', controls, [['', 'All tags'], ...[...new Set(gems.flatMap(g => g.tags))].sort().map(t => [t, t])]);
  button('Clear filters', controls, () => { search.value = ''; category = 'all'; tag.value = ''; limit = 60; renderLibrary(); search.focus(); });
  const count = el('p', '', pane); count.setAttribute('role', 'status');
  const cards = el('div', '', pane); cards.className = 'gem-grid';
  const inspector = installInspector(browser, 'Skill inspector', planner);
  const more = button('Show more gems', pane, () => { limit += 60; renderLibrary(); if (more.hidden) { count.tabIndex = -1; count.focus(); } else more.focus(); });
  function range(first, last) {
    if (first == null || last == null) return '?';
    return first === last ? String(first) : `(${first}–${last})`;
  }
  function renderProperties(tooltip, parent) {
    for (const property of tooltip?.properties || []) {
      const row = el('p', `${property.label}: `, parent); row.className = 'gem-properties';
      el('span', property.value, row).className = 'gem-value';
    }
  }
  function renderStatLines(tooltip, parent) {
    const stats = el('div', '', parent); stats.className = 'gem-stats';
    for (const line of tooltip?.statLines || []) el('p', line, stats);
    if (!tooltip?.statLines?.length) el('small', 'No translated stat lines available in this source record.', stats);
    const quality = el('div', '', parent); quality.className = 'gem-quality';
    el('p', 'Additional effects from 1–20% quality:', quality).className = 'gem-quality-heading';
    for (const line of tooltip?.qualityLines || []) el('p', line, quality);
    if (!tooltip?.qualityLines?.length) el('small', tooltip?.qualityStatus === 'available' ? 'No visible quality stat lines in source.' : 'Quality data not supplied by source.', quality);
    if (tooltip?.diagnostics?.length) {
      const detail = el('details', '', parent); detail.className = 'gem-source-details';
      el('summary', `${tooltip.diagnostics.length} source-only or unsupported fields`, detail);
      el('p', 'These fields have no supported display translation or need additional context. Raw values below are not character results.', detail);
      for (const issue of tooltip.diagnostics) {
        el('strong', `${issue.section}: ${issue.stat}`, detail);
        el('p', issue.reason, detail);
        const values = issue.values?.flat?.(2).filter(v => typeof v === 'number' && Number.isFinite(v));
        if (values?.length) el('p', `Source values: ${range(Math.min(...values), Math.max(...values))}`, detail);
      }
    }
  }
  function renderLibrary() {
    categoryButtons.forEach((tab, index) => {
      const active = gemCategories[index].id === category;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
    });
    pane.setAttribute('aria-labelledby', `gem-category-${category}`);
    const matches = filterGems(gems, { search: search.value, category, tag: tag.value });
    count.textContent = `${matches.length} matching gems · ${Math.min(limit, matches.length)} shown`;
    cards.replaceChildren();
    if (!matches.length) el('p', 'No gems match these filters.', cards);
    for (const gem of matches.slice(0, limit)) {
      const card = el('article', '', cards); card.className = `gem-card gem-${gem.type}`; card.dataset.record = gem.id;
      const header = el('div', '', card); header.className = 'gem-card-header';
      el('h4', gem.name, header);
      el('p', gem.type === 'active' ? 'Active gem' : 'Support gem', header).className = 'gem-kind';
      const body = el('div', '', card); body.className = 'gem-card-body';
      const tagLine=el('p', gem.tagString || gem.tags.join(', '), body);tagLine.className='gem-properties';tagLine.dataset.definitionField='tags';
      const level = el('p', 'Level: ', body); level.className = 'gem-properties';
      el('span', range(1, gem.maxLevel), level).className = 'gem-value';
      renderProperties(gem.tooltip, body);
      const requirements = el('div', '', body); requirements.className = 'gem-requirements';
      const first = gem.requirements.first, maximum = gem.requirements.maximum;
      const row = el('p', 'Requires Level ', requirements);
      el('span', range(first.level, maximum.level), row).className = 'gem-value';
      for (const [attribute, label] of [['strength', 'Str'], ['dexterity', 'Dex'], ['intelligence', 'Int']]) {
        if (first[attribute] === 0 && maximum[attribute] === 0) continue;
        el('span', ', ', row);
        el('span', range(first[attribute], maximum[attribute]), row).className = 'gem-value';
        el('span', ` ${label}`, row);
      }
      const art = el('div', '', body); art.className = 'gem-card-art';
      if (gem.art && /^\/assets\/gems\/[a-f0-9]{24}\.png$/.test(gem.art)) {
        const image = el('img', '', art); image.src = gem.art; image.alt = `${gem.name} gem artwork`; image.loading = 'lazy'; image.decoding = 'async';
        image.onerror = () => { image.remove(); el('span', 'Gem artwork unavailable', art); };
      } else el('span', 'Gem artwork unavailable in source', art);
      el('p', gem.description || 'Description unavailable in source.', body).className = 'gem-description';
      renderStatLines(gem.tooltip, body);
      if (gem.secondaryTooltip) {
        const secondary = el('details', '', body); secondary.className = 'gem-secondary';
        el('summary', `Also grants ${gem.secondaryTooltip.name}`, secondary);
        renderProperties(gem.secondaryTooltip, secondary);
        el('p', gem.secondaryTooltip.description, secondary).className = 'gem-description';
        renderStatLines(gem.secondaryTooltip, secondary);
      }
      el('small', 'Unmodified gem reference · level 1 to natural maximum', body).className = 'gem-reference-note';
      const footer = el('div', '', card); footer.className = 'gem-card-footer';
      const group = current(), already = group && (gem.type === 'active' ? group.activeId === gem.id : group.supportIds.includes(gem.id));
      const add = button(already ? '✓ Added to group' : gem.type === 'active' && group?.activeId ? 'Replace active gem' : 'Add to group', footer, () => {
        const target = current(); if (!target) return;
        if (gem.type === 'support' && target.supportIds.length >= 50) { status.textContent = 'This planner supports up to 50 supports per group. This is a storage limit, not a socket or link model.'; return; }
        Object.assign(target, addGem(target, gem)); save(); renderPlanner();
        for (const node of cards.querySelectorAll('button[data-gem]')) {
          const item = byId.get(node.dataset.gem);
          const added = item.type === 'active' ? target.activeId === item.id : target.supportIds.includes(item.id);
          node.textContent = added ? '✓ Added to group' : item.type === 'active' ? 'Replace active gem' : 'Add to group';
          node.disabled = added;
          node.setAttribute('aria-label', `${node.textContent}: ${item.name}`);
        }
        inspector.reset(); groupPicker.focus();
      });
      add.disabled = !group || already; add.setAttribute('aria-label', `${add.textContent}: ${gem.name}`);
      add.dataset.gem = gem.id;
      const inspect = button('Inspect gem', footer, () => inspector.inspect(card, inspect)); inspect.className = 'inspect-record';
    }
    more.hidden = matches.length <= limit;
  }
  controls.addEventListener('input', () => { limit = 60; renderLibrary(); });
  renderPlanner(); renderLibrary();
}

if (typeof document !== 'undefined' && document.querySelector('#skillsPanel')) {
  const root = document.querySelector('#skillsPanel');
  fetch('/skills-data.json').then(response => { if (!response.ok) throw Error('Local data unavailable'); return response.json(); })
    .then(data => mountSkills(root, data)).catch(() => { root.textContent = 'Skills could not load. Reload to retry the local data file.'; });
}
