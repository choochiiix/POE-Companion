import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createTheorycraftingIndex, matchesRule } from '../features/theorycrafting/index-model.js';

const read = file => readFile(new URL(file, import.meta.url), 'utf8').then(JSON.parse);
const [skillsData, catalogData, treeData] = await Promise.all([
  read('../skills-data.json'),
  read('../catalog-data.json'),
  read('../../data-sources/pob-tree-3_29/tree.json'),
]);
const index = createTheorycraftingIndex({ skillsData, catalogData, treeData });
const rule = id => index.rules.find(entry => entry.id === id);
const skill = name => index.skills.byId[[...index.skills.active].find(entry => entry.name === name)?.id];

test('index retains pinned source ids, counts and snapshot evidence', () => {
  assert.equal(index.skills.active.length, 559);
  assert.equal(index.supports.records.length, 263);
  assert.equal(index.uniques.records.length, 3250);
  assert.equal(index.sources.skills.version, '2.67.2');
  assert.equal(index.sources.skills.schemaVersion, 2);
  assert.notEqual(index.sources.skills.version, String(index.sources.skills.schemaVersion));
  assert.equal(index.sources.catalog.sources.pob.version, '2.67.2');
  assert.equal(index.sources.catalog.sources.repoe.version, '3.29.3.6');
  assert.equal(index.sources.uniqueDefinitions.version, '2.67.2');
  assert.equal(index.sources.baseMetadata.version, '3.29.3.6');
  assert.match(index.sources.catalog.snapshot, /Mixed PoB static unique definitions \+ RePoE export/);
  assert.equal(index.sources.catalog.version, '3.29.3.6');
  assert.equal(index.sources.tree.version, '3.29');
  assert.equal(index.skills.byId['Metadata/Items/Gems/SkillGemFireball'].provenance.file, 'crafting-ui/skills-data.json');
  assert.equal(index.tree.byId['60501'].provenance.recordIds[0], '60501');
});

test('unique identity keeps every variant and prefers current non-legacy by default', () => {
  const brotherhood = index.uniques.records.filter(item => item.name === 'Call of the Brotherhood');
  assert.equal(brotherhood.length, 2);
  assert.equal(brotherhood.find(item => item.isDefaultVariant).variant, 'Current');
  assert.equal(brotherhood.find(item => item.isDefaultVariant).legacy, false);
  assert.equal(index.uniques.records.find(item => item.name === "Doryani's Prototype").id, 'body.lua:32198:1');
  assert.equal(index.uniques.records.find(item => item.name === "Doryani's Prototype").provenance.version, '2.67.2');
  assert.equal(index.uniques.records.find(item => item.name === "Doryani's Prototype").baseProvenance.version, '3.29.3.6');
  assert.equal(index.uniques.families.find(group => group.name === "Doryani's Prototype").defaultVariantId, 'body.lua:32198:1');
});

test('Fireball finds Heart of Flame and conditional Exposure options with exact pinned text', () => {
  const fireball = skill('Fireball');
  assert.deepEqual(fireball.mechanics.damageTypes, ['fire']);
  assert.equal(fireball.mechanics.isDirectHit, true);
  assert.equal(matchesRule(rule('skill.direct-hit.fire'), fireball), true);
  assert.equal(rule('node.heart-of-flame').evidence, 'rule-based');
  assert.match(rule('node.heart-of-flame').explanation, /30% increased Fire Damage/);
  assert.match(rule('node.heart-of-flame').explanation, /Damage Penetrates 6% Fire Resistance/);
  assert.equal(rule('node.heart-of-flame').provenance.recordIds[0], '60501');
  assert.equal(rule('node.mastermind-of-discord').evidence, 'conditional');
  assert.ok(rule('node.mastermind-of-discord').conditions.some(condition => condition.includes('Fire Exposure')));
  assert.match(rule('node.mastermind-of-discord').explanation, /Exposure you inflict applies an extra -25%/);
  assert.match(rule('node.corrosive-elements.exposure').explanation, /Fire Skills have a 25% chance to apply Fire Exposure on Hit/);
  assert.match(rule('node.corrosive-elements.exposure').explanation, /Fire Exposure applies -10% to Fire Resistance for 4 seconds/);
});

test('Fire Mastery preserves cluster prerequisite and individual effect evidence', () => {
  const mastery = index.tree.masteries.find(node => node.masteryEffects.some(effect => effect.effect === 24180));
  assert.ok(mastery);
  assert.equal(mastery.name, 'Fire Mastery');
  assert.deepEqual(mastery.masteryEffects.find(effect => effect.effect === 24180).stats, ['Fire Exposure you inflict applies an extra -5% to Fire Resistance']);
  assert.ok(rule('mastery.fire-exposure').conditions.some(condition => condition.includes('cluster')));
  assert.equal(rule('mastery.fire-exposure').provenance.recordIds[0], String(mastery.id));
});

test('Doryani rule uses exact item text and rejects non-lightning or DoT skills', () => {
  const doryani = index.uniques.records.find(item => item.name === "Doryani's Prototype");
  const doryaniRule = rule('unique.doryanis-prototype.lightning-hit');
  assert.equal(doryani.variant, 'Current');
  assert.match(doryani.text, /Deal no Non-Lightning Damage/);
  assert.match(doryani.text, /Nearby Enemies have Lightning Resistance equal to yours/);
  assert.match(doryani.text, /Armour also applies to Lightning Damage taken from Hits/);
  assert.equal(doryaniRule.evidence, 'conditional');
  assert.match(doryaniRule.explanation, /outgoing lightning damage/);
  assert.match(doryaniRule.explanation, /incoming Lightning Damage from Hits \(not lightning Damage over Time\)/);
  assert.ok(doryaniRule.conditions.some(condition => condition.includes('changes enemy resistance for your outgoing lightning damage') && !condition.includes('only')));
  assert.ok(doryaniRule.conditions.some(condition => condition.includes('incoming hits only') && condition.includes('does not mitigate lightning Damage over Time')));
  assert.equal(matchesRule(doryaniRule, skill('Arc'), { uniqueId: doryani.id }), true);
  assert.equal(matchesRule(doryaniRule, skill('Fireball'), { uniqueId: doryani.id }), false);
  assert.equal(matchesRule(doryaniRule, skill('Essence Drain'), { uniqueId: doryani.id }), false);
  assert.ok(doryaniRule.conditions.some(condition => condition.includes('lightning Damage over Time remains')));
});

test('Replica Blood Thorn has a current indexed rule for Fire hits with scoped conditions', () => {
  const replica = index.uniques.records.find(item => item.name === 'Replica Blood Thorn' && item.isDefaultVariant);
  const replicaRule = rule('unique.replica-blood-thorn.fire-hit');
  assert.ok(replica);
  assert.equal(replica.id, 'staff.lua:4156:2');
  assert.equal(replica.variant, 'Current');
  assert.equal(replica.legacy, false);
  assert.ok(replica.explicit.some(modifier => modifier.text === '100% increased Fire Damage'));
  assert.ok(replica.explicit.some(modifier => modifier.text === 'Curse Enemies with Flammability on Block'));
  assert.ok(replica.explicit.some(modifier => modifier.text === 'Reflects (22-44) Fire Damage to Attackers on Block'));
  assert.equal(replicaRule.provenance.recordIds[0], 'staff.lua:4156:2');
  assert.equal(replica.provenance.version, '2.67.2');
  assert.equal(replica.baseProvenance.version, '3.29.3.6');
  assert.equal(replicaRule.provenance.version, '2.67.2');
  assert.equal(matchesRule(replicaRule, skill('Fireball'), { uniqueId: replica.id }), true);
  assert.equal(matchesRule(replicaRule, skill('Essence Drain'), { uniqueId: replica.id }), false);
  assert.match(replicaRule.explanation, /100% increased Fire Damage/);
  assert.ok(replicaRule.conditions.some(condition => condition.includes('Attack Speed is outside')));
  assert.ok(replicaRule.conditions.some(condition => condition.includes('Flammability on Block') && condition.includes('block trigger')));
});

test('lightning examples are direct-hit spells and attack-only candidates do not match', () => {
  for (const name of ['Arc', 'Spark', 'Ball Lightning', 'Lightning Conduit']) {
    const candidate = skill(name);
    assert.ok(candidate, name);
    assert.equal(candidate.mechanics.isDirectHit, true, name);
    assert.equal(matchesRule(rule('skill.direct-hit.lightning'), candidate), true, name);
  }
  const attack = index.skills.active.find(candidate => candidate.tags.includes('attack') && candidate.rules?.skillTypes?.includes('Attack'));
  if (attack) assert.equal(matchesRule(rule('skill.direct-hit.lightning'), attack), false);
});

