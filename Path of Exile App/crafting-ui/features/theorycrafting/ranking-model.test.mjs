import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTheorycraftingIndex } from './index-model.js';
import { analyzeTheorycrafting, targetCost } from './ranking-model.js';

const fireball = { id: 'fireball', name: 'Fireball', type: 'active', tags: ['spell', 'fire', 'projectile'], rules: { skillTypes: ['Spell', 'Damage', 'Fire', 'Projectile'] }, mechanics: { isDirectHit: true, rules: { skillTypes: ['Spell', 'Damage', 'Fire', 'Projectile'] } } };
const spark = { id: 'spark', name: 'Spark', type: 'active', tags: ['spell', 'lightning', 'projectile'], rules: { skillTypes: ['Spell', 'Damage', 'Lightning', 'Projectile'] }, mechanics: { isDirectHit: true, rules: { skillTypes: ['Spell', 'Damage', 'Lightning', 'Projectile'] } } };
const attackSupport = { id: 'attack-support', name: 'Attack Damage Support', type: 'support', rules: {}, stats: ['Supported Skills deal 30% more Attack Damage'] };
const fireSupport = { id: 'fire-support', name: 'Fire Damage Support', type: 'support', rules: {}, stats: ['Supported Skills deal 30% more Fire Damage'] };
const nodes = {
  root: { id: 'root', classStartIndex: 3, out: ['travel'] },
  travel: { id: 'travel', out: ['fire-notable', 'mastery'] },
  'fire-notable': { id: 'fire-notable', isNotable: true, name: 'Heart of Flame', stats: ['20% increased Fire Damage', 'Fire Damage Penetrates 4% Fire Resistance'], in: ['travel'] },
  mastery: { id: 'mastery', isMastery: true, name: 'Fire Mastery', in: ['travel'], masteryEffects: [{ effect: 1, stats: ['Fire Exposure you inflict applies an extra -5% to Resistance'] }] },
  'attack-notable': { id: 'attack-notable', isNotable: true, name: 'Blade Master', stats: ['20% increased Attack Damage'], in: ['root'] },
  'asc-root': { id: 'asc-root', ascendancyName: 'Elementalist', isAscendancyStart: true, out: ['discord'] },
  discord: { id: 'discord', ascendancyName: 'Elementalist', isNotable: true, name: 'Mastermind of Discord', stats: ['Exposure you inflict applies an extra -25% to Resistance'], in: ['asc-root'] },
};
const doryani = {
  id: 'doryani', name: "Doryani's Prototype", itemClass: 'Body Armour', explicit: [
    { text: 'Deal no Non-Lightning Damage' },
    { text: 'Lightning Resistance does not affect Lightning Damage taken' },
    { text: 'Nearby Enemies have Lightning Resistance equal to yours' },
  ],
};
const baseIndex = {
  skills: [fireball, spark],
  supports: [attackSupport, fireSupport],
  uniques: [doryani],
  nodes,
  rules: [
    {
      id: 'test.fire-mastery', target: 'skill', relation: 'mastery-synergy',
      match: { masteryEffectIds: [1], allTags: ['fire'], allSkillTypes: ['Damage'] },
      conditions: ['The Fire Mastery cluster must be allocated first'], evidence: 'conditional',
    },
    {
      id: 'test.doryani-spark', target: 'skill', relation: 'lightning-hit-synergy',
      match: { uniqueIds: ['doryani'], allTags: ['lightning'], allSkillTypes: ['Spell', 'Damage'], excludeSkillTypes: ['DamageOverTime'] },
      conditions: ['Lightning direct hit required'], evidence: 'conditional',
    },
    {
      id: 'test.replica-fireball', target: 'skill', relation: 'fire-hit-synergy', exampleSkillIds: ['fireball'],
      match: { uniqueIds: ['replica'], allTags: ['fire', 'spell'], allSkillTypes: ['Spell', 'Damage'], excludeSkillTypes: ['DamageOverTime'] },
      conditions: ['Fire direct hit required'], evidence: 'conditional',
    },
  ],
};
const scenario = { characterClass: 'Witch', roots: ['root'], allocatedNodeIds: ['root'], passivePoints: 113, ascendancyPoints: 8 };

test('skill ranking rejects attack-only tags and prices Heart of Flame without shared travel totals', () => {
  const result = analyzeTheorycrafting({ index: baseIndex, selection: { kind: 'skill', id: 'fireball' }, scenario });
  assert.ok(result.suggestions.some(row => row.name === 'Fire Damage Support'));
  assert.ok(!result.suggestions.some(row => row.name === 'Attack Damage Support'));
  const heart = result.suggestions.find(row => row.name === 'Heart of Flame');
  assert.deepEqual(heart.costs, { passivePoints: 2, ascendancyPoints: 0, nodeIds: ['travel', 'fire-notable'] });
  assert.equal(heart.evidence, 'rule-based');
});

test('mastery requires a cluster prerequisite and reports an allocated target at zero cost', () => {
  const unallocated = analyzeTheorycrafting({ index: baseIndex, selection: { kind: 'skill', id: 'fireball' }, scenario });
  const mastery = unallocated.suggestions.find(row => row.kind === 'mastery');
  assert.equal(mastery.costs.passivePoints, 2);
  const allocated = analyzeTheorycrafting({ index: baseIndex, selection: { kind: 'skill', id: 'fireball' }, scenario: { ...scenario, allocatedNodeIds: ['root', 'travel'] } });
  assert.deepEqual(allocated.suggestions.find(row => row.kind === 'mastery').costs, { passivePoints: 1, ascendancyPoints: 0, nodeIds: ['mastery'] });
});

test('unique-first Doryani selection only suggests lightning hits and suppresses numeric claims', () => {
  const result = analyzeTheorycrafting({ index: baseIndex, selection: { kind: 'unique', id: 'doryani' }, scenario, calculationData: { compareUnique: () => ({ baseline: 10, alternative: 20 }) } });
  assert.deepEqual(result.suggestions.filter(row => row.kind === 'skill').map(row => row.name), ['Spark']);
  assert.equal(result.suggestions.find(row => row.name === 'Spark').comparison, undefined);
  assert.match(result.suggestions.find(row => row.name === 'Spark').conditions.join(' '), /suppressed/i);
});

test('ascendancy pricing uses ascendancy points and stable ordering', () => {
  const result = analyzeTheorycrafting({ index: baseIndex, selection: { kind: 'skill', id: 'fireball' }, scenario: { ...scenario, ascendancy: 'Elementalist', roots: ['root', 'asc-root'] } });
  const discord = result.suggestions.find(row => row.name === 'Mastermind of Discord');
  assert.deepEqual(discord.costs, { passivePoints: 0, ascendancyPoints: 1, nodeIds: ['discord'] });
  const repeat = analyzeTheorycrafting({ index: baseIndex, selection: { kind: 'skill', id: 'fireball' }, scenario: { ...scenario, ascendancy: 'Elementalist', roots: ['root', 'asc-root'] } });
  assert.deepEqual(result.suggestions.map(row => row.id), repeat.suggestions.map(row => row.id));
});

test('unreachable targets are retained with a diagnostic condition and no misleading cost', () => {
  const isolated = { ...baseIndex, nodes: { ...nodes, isolated: { id: 'isolated', isNotable: true, name: 'Fire Isolated', stats: ['10% increased Fire Damage'] } } };
  const result = analyzeTheorycrafting({ index: isolated, selection: { kind: 'skill', id: 'fireball' }, scenario });
  const row = result.suggestions.find(item => item.name === 'Fire Isolated');
  assert.ok(row);
  assert.equal(row.costs, undefined);
  assert.match(row.conditions[0], /No legal path/);
});

test('targetCost does not mutate allocation input', () => {
  const input = { ...scenario, allocatedNodeIds: new Set(['root']) };
  const before = [...input.allocatedNodeIds];
  targetCost({ ...baseIndex, nodes: new Map(Object.entries(nodes)) }, nodes['fire-notable'], input);
  assert.deepEqual([...input.allocatedNodeIds], before);
});

test('over-budget paths are reported as unavailable instead of looking affordable', () => {
  const result = analyzeTheorycrafting({ index: baseIndex, selection: { kind: 'skill', id: 'fireball' }, scenario: { ...scenario, passivePoints: 1 } });
  const heart = result.suggestions.find(row => row.name === 'Heart of Flame');
  assert.equal(heart.costs, undefined);
  assert.match(heart.conditions.join(' '), /only 1 remain/);
});

test('local calculation sources produce a fixed-assumption numeric unique comparison', async () => {
  const [skillsData, catalogData, treeData, calculationData] = await Promise.all([
    readFile(new URL('../../skills-data.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../catalog-data.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../../data-sources/pob-tree-3_29/tree.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../calculation-data.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);
  const index = createTheorycraftingIndex({ skillsData, catalogData, treeData });
  const item = index.uniques.records.find(row => row.name === 'Replica Blood Thorn' && row.isDefaultVariant) || index.uniques.records.find(row => row.name === 'Replica Blood Thorn');
  const result = analyzeTheorycrafting({ index, selection: { kind: 'unique', id: item.id }, scenario: { level: 90, characterClass: 'Witch', ascendancyName: '', allocatedNodeIds: [], enemyResistance: 0 }, calculationData });
  const fireball = result.suggestions.find(row => row.kind === 'skill' && row.name === 'Fireball');
  assert.ok(fireball?.comparison);
  assert.ok(Number.isFinite(fireball.comparison.delta));
  assert.equal(fireball.comparison.delta, fireball.comparison.alternative - fireball.comparison.baseline);
  assert.ok(fireball.comparison.alternative > fireball.comparison.baseline);
  assert.match(fireball.comparison.comparator, /without versus with Replica Blood Thorn/);
  assert.ok(result.suggestions.filter(row => row.kind === 'skill').every(row => {
    const skill = index.skills.byId[row.id];
    return skill?.tags.includes('fire') && skill?.tags.includes('spell') && skill?.mechanics.isDirectHit;
  }));
  assert.ok(!result.suggestions.some(row => row.kind === 'skill' && row.name === 'Arc'));
});

test('pinned Fireball analysis keeps Elementalist options and rejects Righteous Fire as a hit match', async () => {
  const [skillsData, catalogData, treeData] = await Promise.all([
    readFile(new URL('../../skills-data.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../catalog-data.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../../../data-sources/pob-tree-3_29/tree.json', import.meta.url), 'utf8').then(JSON.parse),
  ]);
  const index = createTheorycraftingIndex({ skillsData, catalogData, treeData });
  const fireball = index.skills.byId['Metadata/Items/Gems/SkillGemFireball'];
  const result = analyzeTheorycrafting({ index, selection: { kind: 'skill', id: fireball.id }, scenario: { level: 90, characterClass: 'Witch', ascendancyName: '', allocatedNodeIds: [], enemyResistance: 0 } });
  for (const name of ['Mastermind of Discord', 'Shaper of Flames']) {
    const row = result.suggestions.find(item => item.name === name);
    assert.ok(row, `${name} should be surfaced`);
    assert.equal(row.costs.passivePoints, 0);
    assert.ok(row.costs.ascendancyPoints > 0);
    assert.match(row.conditions.join(' '), /Choose Elementalist/);
  }
  for (const name of ['Bastion of Elements', 'Liege of the Primordial']) {
    assert.ok(!result.suggestions.some(item => item.name === name), `${name} is not a direct Fireball hit connection`);
  }
  const heart = result.suggestions.find(item => item.name === 'Heart of Flame');
  assert.ok(heart, 'Fireball includes its source-backed fire damage and penetration notable');
  assert.match(heart.explanation, /30% increased Fire Damage.*Damage Penetrates 6% Fire Resistance/);
  assert.equal(heart.costs.passivePoints, 15, 'Witch start includes the 14 travel nodes and Heart of Flame');
  assert.equal(heart.costs.nodeIds.length, 15);
  assert.match(result.suggestions.find(item => item.name === 'Mastermind of Discord').conditions.join(' '), /Exposure/);
  const fireExposureMastery = result.suggestions.find(item => item.kind === 'mastery' && /Fire Exposure you inflict applies an extra -5%/.test(item.name));
  assert.ok(fireExposureMastery, 'Fireball exposes the specific Fire Mastery effect');
  assert.match(fireExposureMastery.conditions.join(' '), /cluster/i);
  assert.equal(fireExposureMastery.costs.passivePoints, 10, 'The legal path includes the mastery cluster prerequisite');
  assert.equal(result.suggestions.filter(item => item.kind === 'mastery').length, 1, 'Only a directly modeled mastery effect is surfaced');
  assert.ok(result.suggestions.filter(item => item.kind === 'support').every(item => item.explanation), 'Support cards explain their source text');
  assert.ok(result.suggestions.filter(item => item.kind === 'passive' && item.name !== 'Corrosive Elements').every(item => item.explanation), 'Passive cards explain their source stats');
  assert.ok(result.suggestions.filter(item => item.kind === 'ascendancy').every(item => item.explanation), 'Ascendancy cards explain their source stats');
  const corrosive = result.suggestions.find(item => item.name === 'Corrosive Elements');
  assert.equal(corrosive.costs, undefined, 'An unlinked source record gets no invented passive cost');
  assert.match(corrosive.conditions.join(' '), /no links in the pinned main-tree graph/i);
  const righteousFire = index.skills.active.find(skill => skill.name === 'Righteous Fire');
  const unsupportedDoT = analyzeTheorycrafting({ index, selection: { kind: 'skill', id: righteousFire.id }, scenario: { level: 90, characterClass: 'Witch', ascendancyName: 'Elementalist' } });
  assert.deepEqual(unsupportedDoT.suggestions, []);
  assert.match(unsupportedDoT.diagnostics.join(' '), /direct.hit scope.*damage is over time/i);
  const prototype = index.uniques.records.find(item => item.name === "Doryani's Prototype" && item.isDefaultVariant) || index.uniques.records.find(item => item.name === "Doryani's Prototype");
  const uniqueResult = analyzeTheorycrafting({ index, selection: { kind: 'unique', id: prototype.id }, scenario: { level: 90, characterClass: 'Witch', ascendancyName: '', allocatedNodeIds: [], enemyResistance: 0 } });
  assert.ok(righteousFire);
  assert.ok(!uniqueResult.suggestions.some(item => item.kind === 'skill' && item.id === righteousFire.id));
});
