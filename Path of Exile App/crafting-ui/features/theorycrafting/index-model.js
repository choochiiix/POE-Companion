/**
 * Source-backed index for the first Theorycrafting milestone.
 *
 * The index deliberately contains records and declarative predicates, not
 * ranking or calculation results.  Consumers shortlist records using `rules`
 * and then apply their own tree-cost/calculation policy.  Every record keeps a
 * stable source id and a `provenance` object so a recommendation can explain
 * which pinned snapshot supplied it.
 *
 * Shape:
 *   {
 *     sources: { skills, catalog, tree },
 *     skills: { records, active, byId },
 *     supports: { records, byId },
 *     uniques: { records, families, byId },
 *     tree: { records, notables, keystones, masteries, ascendancies, byId, ... },
 *     rules: Rule[]
 *   }
 *
 * A Rule has `{ id, target, relation, match, conditions, explanation,
 * evidence, provenance }`. `match` is intentionally plain data so it can be
 * inspected or serialized by the renderer. `matchesRule` is the small,
 * conservative evaluator for the predicates used by this milestone.
 */

const SKILLS_FILE = 'crafting-ui/skills-data.json';
const CATALOG_FILE = 'crafting-ui/catalog-data.json';
const TREE_FILE = 'data-sources/pob-tree-3_29/tree.json';
const POB_VERSION = '2.67.2';
const POB_ARCHIVE_SHA256 = '6ea36e73649da26741fd0c1c3bd57a99e589db84191f0e0578f320b1921cc34b';
const CATALOG_VERSION = '3.29.3.6';
const TREE_VERSION = '3.29';

function array(value) {
  return Array.isArray(value) ? value : [];
}

function sourceRef(source, recordIds = []) {
  return { ...source, recordIds: [...recordIds] };
}

function textOf(item) {
  return [
    item.name,
    item.baseType,
    item.itemClass,
    ...array(item.implicit).map(modifier => modifier?.text || modifier?.raw || ''),
    ...array(item.explicit).map(modifier => modifier?.text || modifier?.raw || ''),
  ].filter(Boolean).join(' ');
}

function identity(record, kind) {
  return {
    kind,
    id: record.id,
    sourceId: record.id,
    name: record.name || '',
    family: record.family || null,
    variant: record.variant || null,
    legacy: record.legacy === true,
  };
}

function normalizeGem(gem, source) {
  const rules = gem.rules && typeof gem.rules === 'object' ? gem.rules : {};
  const skillTypes = array(rules.skillTypes);
  const tags = array(gem.tags);
  return {
    ...gem,
    tags: [...tags],
    skillTypes: [...skillTypes],
    identity: identity(gem, gem.type === 'support' ? 'support' : 'skill'),
    mechanics: {
      isActive: gem.type === 'active',
      isSupport: gem.type === 'support',
      isSpell: tags.includes('spell') || skillTypes.includes('Spell'),
      isDirectHit: skillTypes.includes('Damage') && !skillTypes.includes('DamageOverTime'),
      damageTypes: ['fire', 'cold', 'lightning', 'chaos', 'physical'].filter(type => tags.includes(type) || skillTypes.includes(type[0].toUpperCase() + type.slice(1))),
      isDamageOverTime: skillTypes.includes('DamageOverTime'),
      rules: { ...rules, skillTypes: [...skillTypes] },
    },
    provenance: sourceRef(source, [gem.id]),
  };
}

function variantRank(item) {
  // Current non-legacy is preferred. Some records are non-legacy historical
  // variants without the literal Current label; retain those after Current.
  if (!item.legacy && item.variant === 'Current') return 0;
  if (!item.legacy) return 1;
  return 2;
}

function normalizeUniques(records, source, baseSource) {
  const normalized = records.map(item => ({
    ...item,
    implicit: array(item.implicit).map(modifier => ({ ...modifier })),
    explicit: array(item.explicit).map(modifier => ({ ...modifier })),
    identity: identity(item, 'unique'),
    text: textOf(item),
    // The variant text and legacy/current identity come from the pinned PoB
    // unique definitions. Base requirements/class metadata are a separate
    // RePoE source and must not be attributed to PoB.
    provenance: sourceRef(source, [item.id]),
    baseProvenance: sourceRef(baseSource, [item.baseId || item.baseType || item.id]),
  }));
  const families = new Map();
  for (const item of normalized) {
    const key = item.family || item.name || item.id;
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(item);
  }
  const familyRecords = [...families.entries()].map(([family, variants]) => {
    const sorted = [...variants].sort((a, b) => variantRank(a) - variantRank(b) || a.id.localeCompare(b.id));
    const selected = sorted[0];
    return {
      family,
      name: selected.name,
      defaultVariantId: selected.id,
      variants: sorted.map(item => ({ ...item, isDefaultVariant: item.id === selected.id })),
      provenance: sourceRef(source, sorted.map(item => item.id)),
      baseProvenance: sourceRef(baseSource, [...new Set(sorted.map(item => item.baseId || item.baseType || item.id))]),
    };
  });
  const recordsWithDefaults = normalized.map(item => {
    const family = familyRecords.find(group => group.family === (item.family || item.name || item.id));
    return { ...item, isDefaultVariant: family?.defaultVariantId === item.id, defaultVariantId: family?.defaultVariantId || item.id };
  });
  return {
    records: recordsWithDefaults,
    families: familyRecords,
    byId: Object.fromEntries(recordsWithDefaults.map(item => [item.id, item])),
  };
}

function normalizeNode(id, node, source) {
  const masteryEffects = array(node.masteryEffects).map(effect => ({
    ...effect,
    stats: array(effect.stats),
    reminderText: array(effect.reminderText),
  }));
  return {
    ...node,
    id: String(id),
    out: array(node.out).map(String),
    in: array(node.in).map(String),
    stats: array(node.stats),
    masteryEffects,
    identity: { kind: node.isMastery ? 'mastery' : node.isKeystone ? 'keystone' : node.isNotable ? 'notable' : 'passive', id: String(id), sourceId: String(id), name: node.name || '' },
    mechanics: {
      isNotable: node.isNotable === true,
      isKeystone: node.isKeystone === true,
      isMastery: node.isMastery === true,
      isAscendancy: Boolean(node.ascendancyName),
      ascendancyName: node.ascendancyName || null,
      searchableText: [node.name, ...array(node.stats), ...masteryEffects.flatMap(effect => effect.stats)].filter(Boolean).join(' '),
    },
    provenance: sourceRef(source, [String(id)]),
  };
}

function normalizeTree(treeData, source) {
  const records = Object.entries(treeData?.nodes || {})
    .filter(([id]) => id !== 'root')
    .map(([id, node]) => normalizeNode(id, node, source));
  const byId = Object.fromEntries(records.map(node => [node.id, node]));
  const ascendancies = {};
  for (const node of records) if (node.ascendancyName) {
    if (!ascendancies[node.ascendancyName]) ascendancies[node.ascendancyName] = [];
    ascendancies[node.ascendancyName].push(node);
  }
  return {
    snapshot: TREE_VERSION,
    tree: treeData?.tree || 'Default',
    records,
    byId,
    notables: records.filter(node => node.isNotable),
    keystones: records.filter(node => node.isKeystone),
    masteries: records.filter(node => node.isMastery),
    ascendancies,
    classes: array(treeData?.classes).map(classData => ({ ...classData, ascendancies: array(classData.ascendancies).map(ascendancy => ({ ...ascendancy })) })),
    alternateAscendancies: array(treeData?.alternate_ascendancies).map(ascendancy => ({ ...ascendancy })),
    groups: treeData?.groups || {},
    constants: treeData?.constants || {},
    points: treeData?.points || {},
    bounds: { minX: treeData?.min_x, minY: treeData?.min_y, maxX: treeData?.max_x, maxY: treeData?.max_y },
    provenance: sourceRef(source),
  };
}

function rule({ id, target, relation, match, conditions, explanation, evidence = 'rule-based', provenance, exampleSkillIds = [] }) {
  return { id, target, relation, match: { ...match }, conditions: [...conditions], explanation, evidence, provenance: { ...provenance }, exampleSkillIds: [...exampleSkillIds] };
}

function makeRules(sources, skills, uniques, tree) {
  const fireball = skills.byId['Metadata/Items/Gems/SkillGemFireball'];
  const lightningSkills = skills.active.filter(skill => skill.tags.includes('lightning') && skill.mechanics.isDirectHit && skill.mechanics.isSpell);
  const heart = tree.byId['60501'];
  const mastermind = tree.byId['61259'];
  const corrosiveElements = tree.byId['2306'];
  const shaperOfFlames = tree.byId['53123'];
  const fireMastery = tree.masteries.find(node => array(node.masteryEffects).some(effect => effect.effect === 24180));
  const doryani = uniques.records.find(item => item.name === "Doryani's Prototype" && item.isDefaultVariant) || uniques.records.find(item => item.name === "Doryani's Prototype");
  const provenance = (source, ids) => sourceRef(sources[source], ids);
  const rules = [];

  rules.push(rule({
    id: 'skill.direct-hit.fire', target: 'skill', relation: 'fire-hit-synergy',
    match: { allTags: ['fire', 'spell'], allSkillTypes: ['Spell', 'Damage'], excludeSkillTypes: ['DamageOverTime'] },
    conditions: ['The skill must deal a direct hit; damage-over-time-only skills are excluded.'],
    explanation: 'Fire hit skills can use fire-hit supports, fire passives, and exposure interactions.',
    provenance: provenance('skills', [fireball?.id].filter(Boolean)),
  }));
  rules.push(rule({
    id: 'skill.direct-hit.lightning', target: 'skill', relation: 'lightning-hit-synergy',
    match: { allTags: ['lightning', 'spell'], allSkillTypes: ['Spell', 'Damage'], excludeSkillTypes: ['DamageOverTime'] },
    conditions: ['The skill must deal a direct hit. Lightning damage-over-time or non-spell skills are not implied.'],
    explanation: `Pinned direct-hit lightning examples include ${lightningSkills.slice(0, 4).map(skill => skill.name).join(', ')}.`,
    provenance: provenance('skills', lightningSkills.map(skill => skill.id)),
  }));
  rules.push(rule({
    id: 'node.heart-of-flame', target: 'skill', relation: 'passive-synergy',
    match: { nodeIds: ['60501'], allTags: ['fire'], allSkillTypes: ['Damage'] },
    conditions: ['The allocation must be reachable from the selected class roots; travel nodes cost points.'],
    explanation: `${heart?.name || 'Heart of Flame'} grants exactly: ${array(heart?.stats).join(' ')}.`,
    provenance: provenance('tree', ['60501']),
  }));
  rules.push(rule({
    id: 'node.mastermind-of-discord', target: 'skill', relation: 'ascendancy-synergy',
    match: { nodeIds: ['61259'], allTags: ['fire', 'spell'] },
    conditions: ['The setup must be able to inflict Fire Exposure; this starter scenario does not assume that condition is met.', 'Allocate this node as Elementalist and pay ascendancy points.'],
    explanation: `${mastermind?.name || 'Mastermind of Discord'}: ${array(mastermind?.stats).join(' ')}.`,
    evidence: 'conditional',
    provenance: provenance('tree', ['61259']),
  }));
  rules.push(rule({
    id: 'node.shaper-of-flames', target: 'skill', relation: 'ignite-hit-synergy',
    match: { nodeIds: ['53123'], allTags: ['fire'], allSkillTypes: ['Damage'] },
    conditions: ['The setup must hit with Fire Damage; with this node allocated, hits always Ignite.', 'Allocate this node as Elementalist and pay ascendancy points.'],
    explanation: `${shaperOfFlames?.name || 'Shaper of Flames'} grants exactly: ${array(shaperOfFlames?.stats).join(' ')}.`,
    provenance: provenance('tree', ['53123']),
  }));
  rules.push(rule({
    id: 'mastery.fire-exposure', target: 'skill', relation: 'mastery-synergy',
    match: { masteryEffectIds: [24180], allTags: ['fire'], allSkillTypes: ['Damage'] },
    conditions: ['The Fire Mastery cluster must be allocated before selecting an individual mastery effect.', 'The setup must inflict Fire Exposure for the effect to matter.'],
    explanation: 'Fire Mastery effect 24180 says: Fire Exposure you inflict applies an extra -5% to Fire Resistance.',
    evidence: 'conditional',
    provenance: provenance('tree', [String(fireMastery?.id || '')].filter(Boolean)),
  }));
  if (doryani) rules.push(rule({
    id: 'unique.doryanis-prototype.lightning-hit', target: 'skill', relation: 'unique-synergy',
    match: { uniqueIds: [doryani.id], allTags: ['lightning'], allSkillTypes: ['Spell', 'Damage'], excludeSkillTypes: ['DamageOverTime'] },
    conditions: ['Deal no Non-Lightning Damage.', 'Nearby Enemies have Lightning Resistance equal to yours; this changes enemy resistance for your outgoing lightning damage and is not limited to hits.', 'Armour also applies to Lightning Damage taken from Hits concerns incoming hits only; it does not mitigate lightning Damage over Time.', 'This milestone recommends direct-hit lightning skills; lightning Damage over Time remains a distinct, unsupported candidate rather than being treated as a hit.'],
    explanation: `Doryani's Prototype has separate offence and defence effects: nearby enemies use your Lightning Resistance for your outgoing lightning damage, while Armour applies only to incoming Lightning Damage from Hits (not lightning Damage over Time). The pinned item text is: ${doryani.explicit.map(modifier => modifier.text).join(' | ')}.`,
    evidence: 'conditional',
    provenance: provenance('uniqueDefinitions', [doryani.id]),
  }));
  const replicaBloodThorn = uniques.records.find(item => item.name === 'Replica Blood Thorn' && item.isDefaultVariant);
  if (replicaBloodThorn) rules.push(rule({
    id: 'unique.replica-blood-thorn.fire-hit', target: 'skill', relation: 'unique-synergy',
    match: { uniqueIds: [replicaBloodThorn.id], allTags: ['fire', 'spell'], allSkillTypes: ['Spell', 'Damage'], excludeSkillTypes: ['DamageOverTime'] },
    conditions: ['The comparison assumes a Fire direct-hit skill and the staff is equipped.', '100% increased Fire Damage applies to the outgoing Fire hit.', 'Attack Speed is outside this spell-hit comparison.', 'Flammability on Block and Reflected Fire Damage on Block require a block trigger and are outside the comparison conditions.'],
    explanation: `Replica Blood Thorn contributes 100% increased Fire Damage to the Fire hit. Its block-triggered curse and reflect, plus attack speed, are not included in this spell-hit comparison: ${replicaBloodThorn.explicit.map(modifier => modifier.text).join(' | ')}.`,
    evidence: 'conditional',
    provenance: provenance('uniqueDefinitions', [replicaBloodThorn.id]),
    exampleSkillIds: [fireball?.id].filter(Boolean),
  }));
  const agnerod = uniques.records.find(item => item.name === 'Agnerod West' && item.isDefaultVariant);
  if (agnerod) rules.push(rule({
    id: 'unique.agnerod-west.lightning-spells', target: 'skill', relation: 'unique-synergy',
    match: { uniqueIds: [agnerod.id], allTags: ['lightning', 'spell'], allSkillTypes: ['Spell', 'Damage'] },
    conditions: ['The staff must be equipped; its level and resistance modifiers are not simulated by this rule.'],
    explanation: `Agnerod West includes: ${agnerod.explicit.map(modifier => modifier.text).join(' | ')}.`,
    provenance: provenance('uniqueDefinitions', [agnerod.id]),
  }));
  const inpulsa = uniques.records.find(item => item.name === "Inpulsa's Broken Heart" && item.isDefaultVariant);
  if (inpulsa) rules.push(rule({
    id: 'unique.inpulsa.shock', target: 'skill', relation: 'unique-synergy',
    match: { uniqueIds: [inpulsa.id], allTags: ['lightning'], allSkillTypes: ['Damage'] },
    conditions: ['The setup must shock an enemy and the enemy must be killed for the explosion text to apply.'],
    explanation: `Inpulsa's Broken Heart includes: ${inpulsa.explicit.map(modifier => modifier.text).join(' | ')}.`,
    evidence: 'conditional',
    provenance: provenance('uniqueDefinitions', [inpulsa.id]),
  }));
  const threeDragons = uniques.records.find(item => item.name === 'The Three Dragons' && item.isDefaultVariant);
  if (threeDragons) rules.push(rule({
    id: 'unique.three-dragons.elemental-ailments', target: 'skill', relation: 'unique-synergy',
    match: { uniqueIds: [threeDragons.id], allSkillTypes: ['Damage'] },
    conditions: ['The alternate elemental ailment rules are conditional on damage type and are not calculated by this index.'],
    explanation: `The Three Dragons includes: ${threeDragons.explicit.map(modifier => modifier.text).join(' | ')}.`,
    evidence: 'conditional',
    provenance: provenance('uniqueDefinitions', [threeDragons.id]),
  }));
  rules.push(rule({
    id: 'support.active-direct-hit', target: 'support', relation: 'support-compatibility',
    match: { activeSkill: { type: 'active', allSkillTypes: ['Damage'], excludeSkillTypes: ['DamageOverTime'] }, supportGem: { type: 'support' } },
    conditions: ['Use the support gem rule expressions to reject explicit exclusions or unmet required skill types.', 'A matching tag alone does not certify full compatibility.'],
    explanation: 'Supports are shortlisted by tags and then checked against their imported PoB skill-type expressions.',
    evidence: 'conditional',
    provenance: provenance('skills'),
  }));
  rules.push(rule({
    id: 'node.corrosive-elements.exposure', target: 'skill', relation: 'exposure-source',
    match: { nodeIds: ['2306'], allTags: ['fire', 'spell'], allSkillTypes: ['Damage'] },
    conditions: ['Corrosive Elements grants a 25% chance for Fire Skills to apply Fire Exposure on Hit; this is rule-based, not a calculated result.', 'Node 2306 has no links in the pinned main-tree graph, so the analyzer cannot price an ordinary passive path to this source.'],
    explanation: `${corrosiveElements?.name || 'Corrosive Elements'}: ${array(corrosiveElements?.stats).join(' ')} Reminder: ${array(corrosiveElements?.reminderText).join(' ')}`,
    evidence: 'conditional',
    provenance: provenance('tree', ['2306']),
  }));
  return rules;
}

function candidateTags(candidate) {
  return new Set([...(candidate?.tags || []), ...(candidate?.skillTags || [])].map(value => String(value).toLowerCase()));
}

/** Evaluate the declarative subset used by the milestone rules. */
export function matchesRule(ruleRecord, candidate, context = {}) {
  if (!ruleRecord || !candidate) return false;
  const match = ruleRecord.match || {};
  if (match.activeSkill || match.supportGem) {
    return matchesRule({ match: match.activeSkill || {} }, candidate.activeSkill || candidate) && matchesRule({ match: match.supportGem || {} }, candidate.supportGem || candidate);
  }
  const tags = candidateTags(candidate);
  const types = new Set([...(candidate.skillTypes || []), ...(candidate.mechanics?.rules?.skillTypes || [])].map(value => String(value).toLowerCase()));
  if (match.type && candidate.type !== match.type) return false;
  if (match.allTags?.some(tag => !tags.has(String(tag).toLowerCase()))) return false;
  if (match.anyTags && !match.anyTags.some(tag => tags.has(String(tag).toLowerCase()))) return false;
  if (match.excludeTags?.some(tag => tags.has(String(tag).toLowerCase()))) return false;
  if (match.allSkillTypes?.some(type => !types.has(String(type).toLowerCase()))) return false;
  if (match.excludeSkillTypes?.some(type => types.has(String(type).toLowerCase()))) return false;
  const contextUniqueId = context.uniqueId || context.itemId || context.item?.id;
  const contextNodeId = context.nodeId || context.passiveId || context.node?.id;
  if (match.uniqueIds && !match.uniqueIds.includes(candidate.id) && !match.uniqueIds.includes(contextUniqueId)) return false;
  if (match.nodeIds && !match.nodeIds.includes(String(candidate.id)) && !match.nodeIds.includes(String(contextNodeId))) return false;
  if (match.masteryEffectIds && !array(candidate.masteryEffects).some(effect => match.masteryEffectIds.includes(effect.effect))) return false;
  if (match.ascendancyName && candidate.ascendancyName !== match.ascendancyName) return false;
  if (match.textIncludes && !String(candidate.text || textOf(candidate)).toLowerCase().includes(String(match.textIncludes).toLowerCase())) return false;
  if (context.requireDirectHit && !candidate.mechanics?.isDirectHit) return false;
  return true;
}

/**
 * Build a reusable index from the pinned local snapshots. Inputs are not
 * mutated; callers may pass the server's raw JSON objects directly.
 */
export function createTheorycraftingIndex({ skillsData = {}, catalogData = {}, treeData = {} } = {}) {
  const skillsSource = { key: 'skills', file: SKILLS_FILE, snapshot: skillsData.source || 'User-provided PathOfBuilding-dev.zip', version: POB_VERSION, schemaVersion: skillsData.version || null, archiveSha256: POB_ARCHIVE_SHA256, recordCount: array(skillsData.gems).length };
  const uniqueDefinitionsSource = { key: 'uniqueDefinitions', file: CATALOG_FILE, snapshot: 'PoB static unique definitions', version: POB_VERSION, archiveSha256: POB_ARCHIVE_SHA256, recordCount: array(catalogData.uniques).length };
  const baseMetadataSource = { key: 'baseMetadata', file: 'data-sources/repoe-poe1/base_items.json', snapshot: 'RePoE base item metadata', version: CATALOG_VERSION, currentLivePatchVerified: false };
  const catalogSource = { key: 'catalog', file: CATALOG_FILE, snapshot: 'Mixed PoB static unique definitions + RePoE export', version: CATALOG_VERSION, sources: { pob: { file: CATALOG_FILE, version: POB_VERSION, archiveSha256: POB_ARCHIVE_SHA256 }, repoe: { file: baseMetadataSource.file, version: CATALOG_VERSION } }, recordCount: array(catalogData.uniques).length, currentLivePatchVerified: false };
  const treeSource = { key: 'tree', file: TREE_FILE, snapshot: 'Pinned PoB tree export', version: TREE_VERSION, recordCount: Object.keys(treeData.nodes || {}).length, currentLivePatchVerified: false };
  const sources = { skills: skillsSource, catalog: catalogSource, uniqueDefinitions: uniqueDefinitionsSource, baseMetadata: baseMetadataSource, tree: treeSource };
  const gemRecords = array(skillsData.gems).map(gem => normalizeGem(gem, skillsSource));
  const skills = {
    records: gemRecords.filter(gem => gem.type === 'active'),
    active: gemRecords.filter(gem => gem.type === 'active'),
    byId: Object.fromEntries(gemRecords.filter(gem => gem.type === 'active').map(gem => [gem.id, gem])),
    source: sourceRef(skillsSource),
  };
  const supportRecords = gemRecords.filter(gem => gem.type === 'support');
  const supports = { records: supportRecords, byId: Object.fromEntries(supportRecords.map(gem => [gem.id, gem])), source: sourceRef(skillsSource) };
  const uniques = normalizeUniques(array(catalogData.uniques), uniqueDefinitionsSource, baseMetadataSource);
  const tree = normalizeTree(treeData, treeSource);
  return { sources, skills, supports, uniques, tree, rules: makeRules(sources, skills, uniques, tree) };
}

