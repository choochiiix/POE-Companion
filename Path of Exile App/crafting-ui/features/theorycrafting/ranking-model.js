import { shortestPath } from '../tree/tree-model.js';
import { compatibility } from '../skills/skills-model.js';
import { compareTheorycraftingUnique } from './calculation-compare.js';
import { matchesRule } from './index-model.js';

// Theorycrafting deliberately keeps retrieval and scoring separate from the React
// screen.  The index is a small, source-backed snapshot prepared by index-model;
// these accessors also make the analyser tolerant of the first and future index
// shapes (arrays, Maps, and keyed records).
const asArray = value => value instanceof Map ? [...value.values()] : Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
const textOf = value => [value?.name, value?.description, value?.tagString, ...(value?.tags ?? []), ...(value?.stats ?? []), ...(value?.masteryEffects ?? []).flatMap(effect => effect?.stats ?? []), ...(value?.explicit ?? []).map(x => x.text), ...(value?.implicit ?? []).map(x => x.text), ...(value?.tooltip?.statLines ?? [])].filter(Boolean).join(' ');
const lower = value => String(value ?? '').toLowerCase();
const stable = (a, b) => lower(a.name).localeCompare(lower(b.name)) || String(a.id ?? '').localeCompare(String(b.id ?? ''));
const unique = values => [...new Set(values.filter(Boolean).map(String))];
const rankAndLimit = (rows, limit) => rows.sort((a, b) => (b._score ?? 0) - (a._score ?? 0) || stable(a, b)).slice(0, limit);

function sourceIds(value, fallback) {
  return unique([...(value?.sourceIds ?? []), value?.sourceId, value?.id ?? fallback]);
}

function getCollections(index) {
  const skillRecords = index?.skills?.records ?? index?.skills?.active ?? index?.skills;
  const supportRecords = index?.supports?.records ?? index?.supports;
  const uniqueRecords = index?.uniques?.records ?? index?.uniques;
  const treeRecords = index?.tree?.records ?? index?.tree?.nodes ?? index?.nodes;
  const rawNodes = treeRecords instanceof Map ? [...treeRecords.entries()] : Array.isArray(treeRecords) ? treeRecords.map(node => [node.id, node]) : Object.entries(treeRecords ?? {});
  const nodes = new Map(rawNodes.map(([id, node]) => [String(id), { ...node, id: String(node?.id ?? id) }]));
  return {
    skills: asArray(skillRecords).filter(row => row?.type !== 'support'),
    supports: asArray(supportRecords).filter(row => row?.type === 'support' || row?.kind === 'support'),
    uniques: asArray(uniqueRecords),
    nodes,
    classes: asArray(index?.classes ?? index?.tree?.classes),
  };
}

function normalizeScenario(scenario = {}) {
  const allocated = unique(scenario.allocatedNodeIds ?? scenario.selected ?? scenario.passives ?? []);
  const selectedAscendancy = scenario.ascendancy ?? scenario.ascendancyName ?? '';
  const ascendancy = selectedAscendancy === 'None' ? '' : selectedAscendancy;
  return {
    ...scenario,
    level: Number.isFinite(scenario.level) ? scenario.level : 90,
    characterClass: scenario.characterClass ?? scenario.className ?? 'Witch',
    ascendancy,
    ascendancyName: ascendancy,
    passivePoints: Number.isFinite(scenario.passivePoints) ? scenario.passivePoints : 113,
    ascendancyPoints: Number.isFinite(scenario.ascendancyPoints) ? scenario.ascendancyPoints : 8,
    allocatedNodeIds: new Set(allocated),
    masteries: scenario.masteries ?? {},
    roots: unique(scenario.roots ?? scenario.rootIds ?? []),
    enemyResistance: Number.isFinite(scenario.enemyResistance) ? scenario.enemyResistance : 0,
    gemEndpoint: scenario.gemEndpoint ?? 'maximum',
  };
}

function findByIdOrName(rows, id) {
  const key = lower(id);
  return rows.find(row => String(row.id) === String(id)) ?? rows.find(row => lower(row.name) === key);
}

function skillProfile(skill) {
  const tags = new Set((skill?.tags ?? []).map(lower));
  const rules = skill?.rules ?? {};
  const types = new Set((rules.skillTypes ?? []).map(lower));
  const spell = tags.has('spell') || types.has('spell');
  const attack = tags.has('attack') || types.has('attack');
  const damageType = ['fire', 'cold', 'lightning', 'chaos', 'physical'].find(tag => tags.has(tag) || types.has(tag)) ?? '';
  const directHit = skill?.mechanics ? skill.mechanics.isDirectHit === true && skill.mechanics.isDamageOverTime !== true : types.has('damage') && !types.has('damageovertime') && !tags.has('aura') && !tags.has('curse') && !tags.has('minion') && !tags.has('totem') && !tags.has('channelling') && !rules.isTrigger;
  return { tags, types, spell, attack, damageType, directHit };
}

function supportMatches(skill, support) {
  const profile = skillProfile(skill);
  const rules = support?.rules ?? {};
  if (support?.type && support.type !== 'support') return false;
  if (rules.unsupported || rules.weaponTypes || rules.isTrigger) return false;
  if (profile.spell && /attack damage|attack speed|melee/i.test(textOf(support)) && !/spell/i.test(textOf(support))) return false;
  if (profile.attack && /spell damage|cast speed/i.test(textOf(support)) && !/attack/i.test(textOf(support))) return false;
  const types = [...profile.types];
  const expression = rules.requireSkillTypes;
  const excluded = rules.excludeSkillTypes;
  // Full PoB expressions are evaluated by the skills feature.  For this ranking
  // pass only reject an explicit single-token exclusion; unknown expressions are
  // conditional rather than silently treated as a match.
  if (Array.isArray(excluded) && excluded.length === 1 && types.includes(lower(excluded[0]))) return false;
  if (Array.isArray(expression) && expression.length === 1 && !types.includes(lower(expression[0]))) return false;
  return true;
}

function graphFor(nodes) {
  const graph = new Map();
  for (const [id, node] of nodes) {
    const links = new Set([...(node.links instanceof Set ? node.links : node.links ?? []), ...(node.out ?? []), ...(node.in ?? [])].map(String));
    graph.set(String(id), links);
  }
  for (const [id, links] of graph) for (const next of links) if (graph.has(next)) graph.get(next).add(id);
  return graph;
}

function rootsFor(index, nodes, scenario) {
  if (scenario.roots.length) return scenario.roots.filter(id => nodes.has(id));
  const roots = [];
  if (scenario.ascendancy) for (const [id, node] of nodes) if (node.isAscendancyStart && node.ascendancyName === scenario.ascendancy) roots.push(id);
  for (const [id, node] of nodes) {
    if (node.className === scenario.characterClass || node.character === scenario.characterClass || node.classStartIndex !== undefined && node.className === scenario.characterClass) roots.push(id);
    if (node.classStartIndex !== undefined && !node.ascendancyName && (index?.classRoots?.[scenario.characterClass] ?? []).includes(id)) roots.push(id);
  }
  const cls = asArray(index?.classes ?? index?.tree?.classes).find(row => row.name === scenario.characterClass);
  for (const id of cls?.rootIds ?? cls?.roots ?? []) roots.push(id);
  // PoB snapshots identify class starts by classStartIndex, not class name.
  const classOrder = ['Scion', 'Marauder', 'Ranger', 'Witch', 'Duelist', 'Templar', 'Shadow'];
  const classIndex = classOrder.indexOf(scenario.characterClass);
  for (const [id, node] of nodes) if (node.classStartIndex === classIndex) roots.push(id);
  return unique(roots).filter(id => nodes.has(id));
}

function nodeAllowed(node, scenario, target) {
  if (!node) return false;
  if (node.ascendancyName) return !!scenario.ascendancy && node.ascendancyName === scenario.ascendancy;
  if (node.isMastery && String(node.id) !== String(target)) return true;
  return node.classStartIndex === undefined || node.className === scenario.characterClass || node.character === scenario.characterClass;
}

function targetCost(index, node, scenario) {
  const nodes = index.nodes instanceof Map ? index.nodes : new Map(Object.entries(index.nodes ?? index.tree?.nodes ?? {}));
  const targetId = String(node.id);
  const allocated = scenario.allocatedNodeIds;
  if (allocated.has(targetId)) return { reachable: true, path: [], passivePoints: 0, ascendancyPoints: 0, reason: 'Already allocated' };
  const graph = graphFor(nodes);
  const roots = rootsFor(index, nodes, scenario);
  const start = unique([...roots, ...allocated]).filter(id => nodes.has(id));
  const allowed = candidate => nodeAllowed(candidate, scenario, targetId) && (!candidate.isAscendancyStart || candidate.ascendancyName === scenario.ascendancy);
  // shortestPath accepts the indexed links.  Use a temporary index so that the
  // function remains useful when index-model has not attached `links` yet.
  const withLinks = new Map([...nodes].map(([id, value]) => [id, { ...value, links: graph.get(id) ?? new Set() }]));
  const path = shortestPath(withLinks, start, targetId, allowed);
  if (!path) return { reachable: false, path: [], passivePoints: 0, ascendancyPoints: 0, reason: 'No legal path from the selected class roots' };
  const rootSet = new Set(roots.map(String));
  const ids = path.filter(id => !allocated.has(String(id)) && !rootSet.has(String(id)));
  // A mastery is only legal after a neighbouring ordinary node in its cluster
  // is allocated.  A path ending at the mastery itself is not enough.
  if (node.isMastery) {
    const neighbour = [...(graph.get(targetId) ?? [])].map(id => nodes.get(id)).find(item => item && !item.isMastery);
    const hasClusterPrerequisite = neighbour && (allocated.has(String(neighbour.id)) || ids.some(id => String(id) === String(neighbour.id)));
    if (!hasClusterPrerequisite) return { reachable: false, path: [], passivePoints: 0, ascendancyPoints: 0, reason: 'Mastery requires an allocated node in its cluster' };
  }
  const ascendancy = ids.every(id => nodes.get(String(id))?.ascendancyName);
  const passivePoints = ascendancy ? 0 : ids.length;
  const ascendancyPoints = ascendancy ? ids.length : 0;
  const budget = ascendancy ? scenario.ascendancyPoints : scenario.passivePoints;
  const cost = ascendancy ? ascendancyPoints : passivePoints;
  if (cost > budget) return { reachable: false, path: [], passivePoints: 0, ascendancyPoints: 0, reason: `Path requires ${cost} ${ascendancy ? 'ascendancy' : 'passive'} points but only ${budget} remain in this scenario` };
  return {
    reachable: true,
    path: ids,
    passivePoints,
    ascendancyPoints,
  };
}

function relationForNode(skill, node) {
  const profile = skillProfile(skill);
  const text = lower(textOf(node));
  const reasons = [];
  if (profile.damageType && text.includes(`${profile.damageType} damage`)) reasons.push(`${profile.damageType} damage`);
  if (profile.spell && /spell damage|spell critical|cast speed|cast time|elemental damage|exposure|penetrat(?:e|es|ion)/.test(text)) reasons.push('spell-hit scaling');
  if (profile.attack && /attack|weapon|melee/.test(text)) reasons.push('attack scaling');
  if (profile.tags.has('projectile') && /projectile/.test(text)) reasons.push('projectile scaling');
  if (profile.tags.has('area') && /area|aoe/.test(text)) reasons.push('area scaling');
  return reasons;
}

function matchingRule(index, target, candidate, context) {
  return (index.rules ?? []).filter(rule => rule.target === target && matchesRule(rule, candidate, context)).sort((a, b) => {
    const score = rule => Object.entries(rule.match ?? {}).reduce((sum, [key, value]) => sum + (['nodeIds', 'uniqueIds', 'masteryEffectIds', 'ascendancyName'].includes(key) ? 20 : Array.isArray(value) ? value.length * 2 : value && typeof value === 'object' ? 3 : 1), 0);
    return score(b) - score(a) || String(a.id).localeCompare(String(b.id));
  })[0];
}

function matchingNodeRule(index, skill, node, effects = node.masteryEffects ?? []) {
  const candidate = effects.length ? { ...skill, masteryEffects: effects } : skill;
  const rule = matchingRule(index, 'skill', candidate, { nodeId: node.id });
  if (!rule) return undefined;
  const nodeMatch = rule.match?.nodeIds?.includes(String(node.id));
  const masteryMatch = rule.match?.masteryEffectIds?.some(id => effects.some(effect => effect.effect === id));
  return nodeMatch || masteryMatch ? rule : undefined;
}

function ruleFields(rule, record) {
  if (!rule) return { conditions: [], evidence: 'rule-based', sourceIds: unique(record?.provenance?.recordIds ?? []), explanation: undefined, provenance: record?.provenance };
  return {
    conditions: [...(rule.conditions ?? [])],
    evidence: rule.evidence ?? 'rule-based',
    explanation: rule.explanation,
    provenance: rule.provenance,
    sourceIds: unique([...(rule.provenance?.recordIds ?? [])]),
  };
}

function passiveSuggestions(index, skill, scenario, diagnostics) {
  const rows = [];
  const profile = skillProfile(skill);
  const candidates = [...index.nodes.values()].filter(node => node.isNotable || node.isKeystone || node.isMastery).filter(node => !node.ascendancyName).filter(node => {
    const relation = relationForNode(skill, node);
    return relation.length && !(profile.spell && /attack|weapon|melee/.test(lower(textOf(node))) && !/spell|elemental|fire|cold|lightning/.test(lower(textOf(node))));
  }).sort((a, b) => {
    const score = node => {
      const sourcedMastery = node.isMastery && (node.masteryEffects ?? []).some(effect => {
        return Boolean(matchingNodeRule(index, skill, node, [effect]));
      });
      return relationForNode(skill, node).length + (node.isMastery ? 1 : 0)
        + (sourcedMastery ? 30 : 0) + (/heart of flame/i.test(node.name ?? '') ? 100 : 0);
    };
    return score(b) - score(a) || stable(a, b);
  }).slice(0, 240);
  for (const node of candidates) {
    if (!node.isNotable && !node.isKeystone && !node.isMastery) continue;
    if (node.ascendancyName) continue;
    if (node.isMastery && !(node.masteryEffects ?? []).some(effect => matchingNodeRule(index, skill, node, [effect]))) continue;
    const relation = relationForNode(skill, node);
    if (!relation.length) continue;
    // Do not leak attack-only notables into a spell-hit result.
    if (profile.spell && /attack|weapon|melee/.test(lower(textOf(node))) && !/spell|elemental|fire|cold|lightning/.test(lower(textOf(node)))) continue;
    const cost = targetCost(index, node, scenario);
    const rule = matchingNodeRule(index, skill, node);
    const fields = ruleFields(rule, node);
    const conditions = [...fields.conditions];
    // The card already reports an unreachable or over-budget target. Avoid
    // repeating every candidate as a page-level diagnostic above the results.
    if (!cost.reachable) conditions.push(cost.reason);
    else if (cost.path.length) conditions.push(`${cost.path.length} point${cost.path.length === 1 ? '' : 's'} on a legal path; travel is priced for this suggestion only`);
    if (node.isMastery) {
      for (const effect of node.masteryEffects ?? []) {
        const effectText = (effect.stats ?? []).join(' ');
        if (profile.directHit && /damage over time|ignite|poison|bleed|burning ground|damage per second/i.test(effectText)) continue;
        if (!relationForNode(skill, { ...node, stats: effect.stats, masteryEffects: [] }).length && !/exposure|penetrat|fire damage|spell damage|lightning damage|elemental damage/i.test(effectText)) continue;
        const effectRule = matchingNodeRule(index, skill, node, [effect]);
        if (!effectRule) continue;
        const effectFields = effectRule ? ruleFields(effectRule, node) : { conditions: [], evidence: 'rule-based', sourceIds: [], provenance: node.provenance };
        rows.push({ id: `${node.id}:mastery:${effect.effect}`, kind: 'mastery', name: effectText || `${node.name} effect ${effect.effect}`, relation: `${node.name} mastery effect`, conditions: [...effectFields.conditions, ...(!cost.reachable ? [cost.reason] : cost.path.length ? [`${cost.path.length} point${cost.path.length === 1 ? '' : 's'} to the cluster; mastery choice is then selected`] : [])], evidence: effectFields.evidence, sourceIds: unique([...sourceIds(node), ...effectFields.sourceIds, String(effect.effect)]), ...(effectFields.explanation ? { explanation: effectFields.explanation } : {}), ...(effectFields.provenance ? { provenance: effectFields.provenance } : {}), ...(cost.reachable ? { costs: { passivePoints: cost.passivePoints, ascendancyPoints: cost.ascendancyPoints, nodeIds: cost.path } } : {}), _reachable: cost.reachable, _score: relation.length + (effectRule ? 8 : 0) + 1 });
      }
      continue;
    }
    const explanation = fields.explanation ?? `${node.name}: ${node.stats.join(' ')} These source stats connect through ${relation.join(', ')} for this direct-hit skill.`;
    rows.push({ id: String(node.id), kind: 'passive', name: node.name, relation: rule?.relation ?? relation.join(', '), conditions, evidence: fields.evidence, sourceIds: unique([...sourceIds(node), ...fields.sourceIds]), explanation, ...(fields.provenance ? { provenance: fields.provenance } : {}), ...(cost.reachable ? { costs: { passivePoints: cost.passivePoints, ascendancyPoints: cost.ascendancyPoints, nodeIds: cost.path } } : {}) , _reachable: cost.reachable, _score: relation.length + (rule ? 8 : 0) + (node.isNotable || node.isKeystone ? 1 : 0) + (/heart of flame/i.test(node.name ?? '') ? 100 : 0) });
  }
  const deduplicated = new Map();
  for (const row of rows) {
    if (row.kind !== 'mastery') {
      deduplicated.set(`${row.kind}:${row.id}`, row);
      continue;
    }
    const effectId = String(row.id).split(':mastery:')[1] ?? row.id;
    const key = `mastery:${effectId}`;
    const current = deduplicated.get(key);
    const cost = row.costs ? row.costs.passivePoints + row.costs.ascendancyPoints : Number.POSITIVE_INFINITY;
    const currentCost = current?.costs ? current.costs.passivePoints + current.costs.ascendancyPoints : Number.POSITIVE_INFINITY;
    if (!current || cost < currentCost || cost === currentCost && stable(row, current) < 0) deduplicated.set(key, row);
  }
  return rankAndLimit([...deduplicated.values()], 16);
}

function ascendancySuggestions(index, skill, scenario) {
  const profile = skillProfile(skill);
  const rows = [];
  const classRecord = index.classes.find(row => row.name === scenario.characterClass);
  const classOptions = new Set((classRecord?.ascendancies ?? []).flatMap(row => [row.name, row.id]).filter(Boolean));
  const names = unique([...index.nodes.values()].filter(node => node.ascendancyName && (!classOptions.size || classOptions.has(node.ascendancyName))).map(node => node.ascendancyName)).filter(name => !scenario.ascendancy || name === scenario.ascendancy);
  for (const ascendancy of names) for (const node of index.nodes.values()) {
    if (!node.ascendancyName || node.ascendancyName !== ascendancy || !node.isNotable) continue;
    const text = lower(textOf(node));
    const relation = [];
    if (profile.damageType && text.includes(`${profile.damageType} damage`)) relation.push(`${profile.damageType} setup`);
    if (profile.spell && /spell damage|spell critical|cast speed|cast time|exposure|penetrat(?:e|es|ion)|ignite/.test(text)) relation.push('spell-hit setup');
    const rule = matchingNodeRule(index, skill, node);
    if (!relation.length && !rule) continue;
    if (rule?.relation) relation.push(rule.relation);
    const roots = [...index.nodes.values()].filter(candidate => candidate.isAscendancyStart && candidate.ascendancyName === ascendancy).map(candidate => candidate.id);
    const candidateScenario = scenario.ascendancy === ascendancy ? scenario : { ...scenario, ascendancy: ascendancy, ascendancyName: ascendancy, roots: roots.length ? roots : scenario.roots };
    const cost = targetCost(index, node, candidateScenario);
    const fields = ruleFields(rule, node);
    const conditions = [...fields.conditions];
    if (scenario.ascendancy !== ascendancy) conditions.unshift(`Choose ${ascendancy}; the starter scenario does not assume an ascendancy.`);
    if (!cost.reachable) conditions.push(cost.reason);
    if (cost.reachable && cost.ascendancyPoints > scenario.ascendancyPoints) conditions.push(`Requires ${cost.ascendancyPoints} ascendancy points; starter budget is ${scenario.ascendancyPoints}.`);
    const explanation = fields.explanation ?? `${node.name}: ${node.stats.join(' ')} This source text connects to the selected direct-hit setup through ${rule?.relation ?? relation.join(', ')}.`;
    rows.push({ id: String(node.id), kind: 'ascendancy', name: node.name, relation: rule?.relation ?? relation.join(', '), conditions, evidence: fields.evidence === 'rule-based' ? 'conditional' : fields.evidence, sourceIds: unique([...sourceIds(node), ...fields.sourceIds]), explanation, ...(fields.provenance ? { provenance: fields.provenance } : {}), ...(cost.reachable ? { costs: { passivePoints: 0, ascendancyPoints: cost.ascendancyPoints, nodeIds: cost.path } } : {}), _reachable: cost.reachable, _score: relation.length + (rule ? 8 : 0) + 1 });
  }
  return rankAndLimit(rows, 8);
}

function uniqueSuggestions(index, skill, selectionUnique, scenario) {
  const rows = [];
  const profile = skillProfile(skill);
  for (const item of index.uniques) {
    const text = lower(textOf(item));
    const itemType = lower(item.itemClass ?? item.category);
    const rule = (index.rules ?? []).filter(candidate => candidate.target === 'skill' && candidate.match?.uniqueIds?.includes(item.id)).sort((a, b) => String(a.id).localeCompare(String(b.id))).find(candidate => matchesRule(candidate, skill, { uniqueId: item.id, itemId: item.id, item, requireDirectHit: true }));
    const relevant = Boolean(rule);
    if (!relevant && item !== selectionUnique) continue;
    if (item !== selectionUnique && /deal no non-lightning damage/.test(text) && profile.damageType !== 'lightning') continue;
    const fields = ruleFields(rule, item);
    const conditions = [...fields.conditions];
    let evidence = 'rule-based';
    let relation = rule?.relation ?? (profile.damageType ? `${profile.damageType} damage interaction` : 'mechanics interaction');
    if (/doryani.?s prototype/.test(lower(item.name))) {
      evidence = 'conditional';
      relation = profile.damageType === 'lightning' ? 'Lightning hits; nearby enemy resistance is set from yours' : 'Non-lightning damage is disabled; lightning resistance interaction applies nearby';
      conditions.push('Requires lightning damage for useful hits; damage over time and non-lightning damage are not represented by the hit comparison');
    } else if (itemType.includes('weapon')) conditions.push(`Requires a compatible ${item.itemClass ?? 'weapon'} slot`);
    rows.push({ id: String(item.id), kind: 'unique', name: item.name, relation, conditions, evidence: fields.evidence === 'calculated' ? 'conditional' : evidence, sourceIds: unique([...sourceIds(item), ...fields.sourceIds]), ...(fields.explanation ? { explanation: fields.explanation } : {}), ...(fields.provenance ? { provenance: fields.provenance } : {}), _score: item === selectionUnique ? 100 : 1 });
  }
  return rankAndLimit(rows, 16);
}

function supportSuggestions(index, skill) {
  return rankAndLimit(index.supports.flatMap(support => {
    const imported = compatibility(skill, support);
    if (imported.state === 'incompatible' || !supportMatches(skill, support)) return [];
    const rule = matchingRule(index, 'support', { activeSkill: skill, supportGem: support }, {});
    const fields = ruleFields(rule, support);
    const unverified = imported.state === 'unverified' || imported.state === 'unknown';
    return [{
      id: String(support.id), kind: 'support', name: support.name, relation: rule?.relation ?? `${skill.name} support compatibility`, conditions: [...fields.conditions, ...(unverified ? [imported.message] : [])], evidence: unverified ? 'conditional' : fields.evidence, sourceIds: unique([...sourceIds(support), ...fields.sourceIds]), explanation: fields.explanation ?? support.description ?? `This support is tagged ${support.tagString || support.tags?.join(', ') || 'as a support'} and is shortlisted for ${skill.name} by its imported skill-type rules.`, ...(fields.provenance ? { provenance: fields.provenance } : {}), _score: /spell|elemental|fire|cold|lightning|projectile|area|hit/i.test(textOf(support)) ? 3 : 1,
    }];
  }), 12);
}

function skillSuggestions(index, unique) {
  const rows = index.skills.flatMap(skill => {
    const rule = (index.rules ?? []).find(candidate => candidate.target === 'skill'
      && candidate.match?.uniqueIds?.includes(unique.id)
      && matchesRule(candidate, skill, { uniqueId: unique.id, itemId: unique.id, item: unique, requireDirectHit: true }));
    if (!rule) return [];
    const fields = ruleFields(rule, skill);
    const doryani = /doryani.?s prototype/i.test(unique.name);
    return [{ id: String(skill.id), kind: 'skill', name: skill.name, relation: rule.relation ?? 'matches a source-backed unique interaction', conditions: [...fields.conditions, ...(doryani ? ['Nearby resistance interaction depends on enemy proximity and your lightning resistance'] : [])], evidence: doryani ? 'conditional' : fields.evidence, sourceIds: uniqueIdsFor(skill, fields), ...(fields.explanation ? { explanation: fields.explanation } : {}), ...(fields.provenance ? { provenance: fields.provenance } : {}), _score: rule.exampleSkillIds?.includes(skill.id) ? 100 : doryani ? 4 : 1 }];
  });
  return rankAndLimit(rows, 6);
}

function uniqueIdsFor(record, fields) {
  return unique([...sourceIds(record), ...(fields?.sourceIds ?? [])]);
}

function comparisonForUnique(calculationData, item, skill, scenario) {
  if (/doryani.?s prototype/i.test(item?.name ?? '')) return undefined;
  let local;
  try { local = compareTheorycraftingUnique({ calculationData, index: calculationData?.theorycraftingIndex, item, skill, scenario }); } catch { local = undefined; }
  if (local) return local;
  const compare = calculationData?.compareUnique ?? calculationData?.compareWorkspace;
  if (typeof compare !== 'function') return undefined;
  try {
    const result = compare({ item, skill, scenario, assumptions: ['same gem level and quality', 'same enemy settings', 'midpoint unique rolls'] });
    if (!result || !Number.isFinite(result.baseline) || !Number.isFinite(result.alternative)) return undefined;
    return { metric: result.metric ?? 'hit DPS', baseline: result.baseline, alternative: result.alternative, delta: result.alternative - result.baseline, comparator: result.comparator ?? 'same skill without versus with unique', assumptions: result.assumptions ?? ['same skill level', 'same enemy resistance', 'same roll policy'] };
  } catch { return undefined; }
}

export function analyzeTheorycrafting({ index, selection, scenario: inputScenario, calculationData } = {}) {
  const collections = getCollections(index ?? {});
  const scenario = normalizeScenario(inputScenario);
  const diagnostics = [];
  const selected = selection ?? {};
  const rows = selected.kind === 'unique' ? collections.uniques : collections.skills;
  const selectedRecord = findByIdOrName(rows, selected.id);
  if (!selectedRecord) return { selection: selected, scenario, suggestions: [], diagnostics: [`Selection is unavailable: ${selected.id ?? '(none)'}`], sources: [] };
  if (selected.kind !== 'unique' && !skillProfile(selectedRecord).directHit) {
    const damageOverTime = skillProfile(selectedRecord).types.has('damageovertime');
    return {
      selection: { kind: selected.kind, id: selectedRecord.id },
      scenario,
      suggestions: [],
      diagnostics: [damageOverTime
        ? `${selectedRecord.name} is outside this milestone's direct-hit scope because its damage is over time.`
        : `${selectedRecord.name} is outside this milestone's supported direct-hit scope.`],
      sources: sourceIds(selectedRecord),
    };
  }
  const normalizedIndex = { ...(index ?? {}), ...collections, nodes: collections.nodes };
  let suggestions = selected.kind === 'unique'
    ? skillSuggestions(normalizedIndex, selectedRecord)
    : [...supportSuggestions(normalizedIndex, selectedRecord), ...uniqueSuggestions(normalizedIndex, selectedRecord), ...passiveSuggestions(normalizedIndex, selectedRecord, scenario, diagnostics), ...ascendancySuggestions(normalizedIndex, selectedRecord, scenario)];
  if (selected.kind === 'unique') {
    const compatibleSkills = suggestions.filter(row => row.kind === 'skill');
    const related = [];
    for (const suggestion of compatibleSkills) {
      const skill = findByIdOrName(collections.skills, suggestion.id);
      const comparison = compatibleSkills.indexOf(suggestion) < 4 ? comparisonForUnique({ ...calculationData, theorycraftingIndex: normalizedIndex }, selectedRecord, skill, scenario) : undefined;
      if (comparison) suggestion.comparison = comparison, suggestion.evidence = 'calculated';
      else if (/doryani.?s prototype/i.test(selectedRecord.name)) suggestion.conditions.push('Numeric result suppressed: the item\'s non-lightning restriction and resistance rule are outside the supported hit calculator');
      // Keep the unique-first result useful beyond the main-skill shortlist:
      // supports/tree/ascendancy suggestions are derived from the same local
      // skill rules and are deduplicated below.
      if (skill && compatibleSkills.indexOf(suggestion) < 3) related.push(...supportSuggestions(normalizedIndex, skill).slice(0, 4), ...passiveSuggestions(normalizedIndex, skill, scenario, diagnostics).slice(0, 8), ...ascendancySuggestions(normalizedIndex, skill, scenario).slice(0, 6));
    }
    const seen = new Set();
    suggestions = [...compatibleSkills, ...related].filter(row => {
      const key = `${row.kind}:${row.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  // Stable, explicit ordering: evidence does not get mixed into a fake numeric
  // score; calculated results are simply displayed before conditional/rule rows.
  suggestions.sort((a, b) => (a.kind === 'skill' ? 0 : a.kind === 'support' ? 1 : a.kind === 'passive' ? 2 : a.kind === 'mastery' ? 3 : 4) - (b.kind === 'skill' ? 0 : b.kind === 'support' ? 1 : b.kind === 'passive' ? 2 : b.kind === 'mastery' ? 3 : 4) || (b._score ?? 0) - (a._score ?? 0) || stable(a, b));
  const clean = suggestions.map(({ _reachable, _score, ...suggestion }) => suggestion);
  const sources = unique(clean.flatMap(row => row.sourceIds));
  return { selection: { kind: selected.kind, id: selectedRecord.id }, scenario, suggestions: clean, diagnostics: unique(diagnostics), sources };
}

export { normalizeScenario, skillProfile, supportMatches, targetCost };
