export const skillsStorageKey = 'poe-companion.skills.v1';

export const gemCategories = [
  ['all', 'All gems'], ['support', 'Support'], ['attack', 'Attacks'],
  ['spell', 'Spells'], ['curse', 'Curses'], ['warcry', 'Warcries'],
  ['aura', 'Auras'], ['minion', 'Minions'], ['totem', 'Totems'], ['trap', 'Traps'],
].map(([id, label]) => ({ id, label }));

export function inGemCategory(gem, category = 'all') {
  if (category === 'all') return true;
  if (category === 'support') return gem.type === 'support';
  return gemCategories.some(c => c.id === category) && gem.type === 'active' && gem.tags.includes(category);
}

export function filterGems(gems, { search = '', type = '', tag = '', category = 'all' } = {}) {
  const words = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return gems.filter(gem => inGemCategory(gem, category) && (!type || gem.type === type) && (!tag || gem.tags.includes(tag)) &&
    words.every(word => [gem.name, gem.type, gem.tagString, ...gem.tags, gem.description,
      ...(gem.tooltip?.statLines || []), ...(gem.tooltip?.qualityLines || []),
      ...(gem.tooltip?.properties || []).map(p => `${p.label} ${p.value}`),
      gem.secondaryTooltip?.name, gem.secondaryTooltip?.description,
      ...(gem.secondaryTooltip?.statLines || []), ...(gem.secondaryTooltip?.qualityLines || [])].join(' ').toLocaleLowerCase().includes(word)));
}

// PoB CalcTools.doesTypeExpressionMatch uses postfix operators and an implicit OR
// across remaining stack values. Malformed/unrecognized tokens fail to unknown.
export function typeExpression(expression, types) {
  if (!Array.isArray(expression) || !Array.isArray(types)) return null;
  const stack = [];
  for (const token of expression) {
    if (token === 'NOT') {
      if (!stack.length) return null;
      stack.push(!stack.pop());
    } else if (token === 'AND' || token === 'OR') {
      if (stack.length < 2) return null;
      const b = stack.pop(), a = stack.pop();
      stack.push(token === 'AND' ? a && b : a || b);
    } else if (typeof token === 'string' && /^[A-Za-z]\w*$/.test(token)) stack.push(types.includes(token));
    else return null;
  }
  return stack.some(Boolean);
}

export function compatibility(active, support, peers = []) {
  const unknown = reason => ({ state: 'unknown', message: `Unknown — ${reason}` });
  const incompatible = reason => ({ state: 'incompatible', message: `Warning — ${reason}` });
  if (!active || active.type !== 'active' || support?.type !== 'support') return unknown('choose an active gem and a support gem.');
  const a = active.rules, s = support.rules;
  if (!a || !s) return unknown('source rules are unavailable.');
  if (a.cannotBeSupported || s.unsupported) return incompatible('PoB explicitly disallows this pairing.');
  if (active.secondaryEffect || a.skillTypes?.includes('Minion') || a.minionSkillTypes?.length || s.weaponTypes || s.isTrigger) return unknown('secondary skills, minions, weapons or trigger context need further validation.');
  if (peers.some(g => !Array.isArray(g.rules?.addSkillTypes) || g.rules.addSkillTypes.length)) return unknown('another support may change skill types.');
  if (!Array.isArray(a.skillTypes) || !Array.isArray(s.requireSkillTypes) || !Array.isArray(s.excludeSkillTypes)) return unknown('source type rules are incomplete.');
  const excluded = typeExpression(s.excludeSkillTypes, a.skillTypes);
  const required = s.requireSkillTypes.length ? typeExpression(s.requireSkillTypes, a.skillTypes) : true;
  if (excluded === null || required === null) return unknown('the source expression could not be validated.');
  if (excluded) return incompatible('the active skill matches an excluded PoB skill type.');
  if (!required) return incompatible('the active skill does not meet the required PoB skill types.');
  return { state: 'unverified', message: 'No imported type-rule conflict. Full compatibility is not verified.' };
}

export function validateGroups(saved, gems) {
  const byId = new Map(gems.map(g => [g.id, g]));
  // v0 was the unversioned array form; migrate without touching other app keys.
  const rows = Array.isArray(saved) ? saved : saved?.version === 1 ? saved.groups : [];
  const groups = [];
  if (Array.isArray(rows)) for (const row of rows.slice(0, 100)) {
    if (!row || typeof row !== 'object') continue;
    let id = typeof row.id === 'string' && row.id && row.id.length <= 100 && !groups.some(g => g.id === row.id) ? row.id : `group-${groups.length + 1}`;
    while (groups.some(g => g.id === id)) id += '-migrated';
    const activeId = byId.get(row.activeId)?.type === 'active' ? row.activeId : '';
    const supportIds = Array.isArray(row.supportIds) ? [...new Set(row.supportIds.filter(id => byId.get(id)?.type === 'support'))].slice(0, 50) : [];
    groups.push({ id, name: typeof row.name === 'string' && row.name.trim() ? row.name.trim().slice(0, 80) : 'Skill group', activeId, supportIds });
  }
  return { version: 1, groups };
}

export function addGem(group, gem) {
  return gem.type === 'active' ? { ...group, activeId: gem.id } : { ...group, supportIds: [...new Set([...group.supportIds, gem.id])].slice(0, 50) };
}
