import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { addGem, compatibility, filterGems, gemCategories, inGemCategory, skillsStorageKey, typeExpression, validateGroups } from '../features/skills/skills-model.js';
const { gems } = JSON.parse(await readFile(new URL('../skills-data.json', import.meta.url), 'utf8'));
const gem = name => { const result = gems.find(g => g.name === name); assert.ok(result, name); return result; };

test('real gem snapshot classifies by source support tag, including granted skills', () => {
  assert.equal(gems.length, 822);
  assert.equal(gems.filter(g => g.type === 'support').length, 263);
  assert.equal(gem('Fireball').type, 'active');
  assert.equal(gem('Faster Attacks').type, 'support');
  assert.ok(gems.every(g => (g.type === 'support') === g.tags.includes('support')));
  assert.equal(new Set(gems.map(g => g.id)).size, gems.length);
  assert.equal(gem('Fireball').requirements.maximum.intelligence, 155);
  assert.ok(gem('Arc').description.includes('lightning'));
});

test('search covers words across names, classification, tags and descriptions', () => {
  assert.ok(filterGems(gems, {search:'active fireball'}).some(g => g.name === 'Fireball'));
  assert.ok(filterGems(gems, {search:'secondary arc', type:'active', tag:'lightning'}).some(g => g.name === 'Arc'));
  const supports = filterGems(gems, {search:'SUPPORT attack',type:'support'});
  assert.ok(supports.length > 0);
  assert.ok(supports.every(g => g.type === 'support'));
  assert.equal(filterGems(gems, {search:'nonexistentzzzzz'}).length, 0);
});

test('category tabs use explicit source tags, allow overlap and isolate supports', () => {
  assert.equal(filterGems(gems,{category:'all'}).length,822);
  assert.equal(filterGems(gems,{category:'support'}).length,263);
  for (const category of gemCategories.filter(c => !['all','support'].includes(c.id))) {
    const matches = filterGems(gems,{category:category.id});
    assert.ok(matches.length>0,category.label);
    assert.ok(matches.every(g => g.type==='active' && g.tags.includes(category.id)),category.label);
  }
  const overlap = gems.find(g => g.type==='active' && g.tags.includes('aura') && g.tags.includes('spell'));
  assert.ok(overlap);
  assert.ok(inGemCategory(overlap,'aura') && inGemCategory(overlap,'spell'));
  assert.equal(inGemCategory(gem('Faster Attacks'),'attack'),false);
  assert.equal(inGemCategory(gem('Fireball'),'totem'),false); // Totemable is compatibility, not a totem gem.
  assert.ok(filterGems(gems,{category:'spell',search:'blade blast',tag:'physical'}).some(g=>g.name==='Blade Blast'));
  assert.equal(filterGems(gems,{category:'unknown'}).length,0);
});

test('PoB postfix type expressions use implicit OR and refuse malformed rules', () => {
  assert.equal(typeExpression(['Attack','Spell'], ['Spell']), true);
  assert.equal(typeExpression(['Attack','Spell','AND'], ['Spell']), false);
  assert.equal(typeExpression(['Attack','NOT','Spell','AND'], ['Spell']), true);
  assert.equal(typeExpression(['AND'], []), null);
  assert.equal(typeExpression(null, []), null);
});

test('compatibility warns only from reliable rules and preserves uncertainty', () => {
  assert.equal(compatibility(gem('Fireball'), gem('Faster Attacks')).state, 'incompatible');
  assert.equal(compatibility(gem('Leap Slam'), gem('Faster Attacks')).state, 'unverified');
  assert.equal(compatibility(gem('Vaal Fireball'), gem('Faster Attacks')).state, 'unknown');
  assert.equal(compatibility(gem('Fireball'), gem('Faster Attacks'), [{rules:{addSkillTypes:['Attack']}}]).state, 'unknown');
  assert.equal(compatibility({...gem('Fireball'),rules:{}}, gem('Faster Attacks')).state, 'unknown');
  assert.equal(compatibility({...gem('Fireball'),rules:{cannotBeSupported:true}}, gem('Faster Attacks')).state, 'incompatible');
  const support = {...gem('Faster Attacks'), rules:{requireSkillTypes:[],excludeSkillTypes:['Spell'],addSkillTypes:[]}};
  assert.equal(compatibility(gem('Fireball'), support).state, 'incompatible');
});

test('save validation migrates arrays, removes stale IDs, wrong types and duplicate supports', () => {
  const active = gem('Fireball'), support = gem('Faster Attacks');
  const rows = [{ id:'one',name:' Main skill ',activeId:active.id,supportIds:[support.id,support.id,active.id,'stale'] },
    { id:'one',name:'',activeId:support.id,supportIds:null }, null];
  const value = validateGroups(rows,gems);
  assert.equal(value.version,1);
  assert.equal(value.groups[0].name,'Main skill');
  assert.deepEqual(value.groups[0].supportIds,[support.id]);
  assert.equal(value.groups[1].activeId,'');
  assert.notEqual(value.groups[1].id,'one');
  assert.deepEqual(validateGroups(value,gems),value);
  for (const bad of [null,{},'bad',{version:99,groups:rows}]) assert.deepEqual(validateGroups(bad,gems).groups,[]);
  assert.equal(skillsStorageKey,'poe-companion.skills.v1');
  const collision = validateGroups([{id:'group-2'},{id:'group-2'}],gems);
  assert.equal(new Set(collision.groups.map(g => g.id)).size,2);
});

test('adding a gem replaces only the active or appends a distinct support', () => {
  const first = {id:'a',name:'Movement',activeId:gem('Fireball').id,supportIds:[]};
  const next = addGem(first,gem('Faster Attacks'));
  assert.equal(first.supportIds.length,0);
  assert.deepEqual(addGem(next,gem('Faster Attacks')),next);
  assert.equal(addGem(next,gem('Leap Slam')).activeId,gem('Leap Slam').id);
  assert.deepEqual(addGem(next,gem('Leap Slam')).supportIds,next.supportIds);
});

test('Blade Blast reference reproduces supplied tooltip without character calculations', () => {
  const blade = gem('Blade Blast');
  assert.deepEqual(blade.tooltip.properties, [
    {label:'Cost',value:'(6–16) Mana'},
    {label:'Cast time',value:'0.50 sec'},
    {label:'Critical strike chance',value:'10.00%'},
    {label:'Effectiveness of added damage',value:'70%'},
  ]);
  assert.deepEqual(blade.tooltip.statLines,['Deals (11–309) to (17–464) Physical Damage','Base radius is 1.5 metres']);
  assert.deepEqual(blade.tooltip.qualityLines,['Base radius is (0.005–0.1) metres']);
  assert.deepEqual(blade.requirements,{first:{level:16,strength:0,dexterity:41,intelligence:0},maximum:{level:70,strength:0,dexterity:155,intelligence:0}});
});

test('support, Vaal and fractional quality references retain source semantics', () => {
  assert.deepEqual(gem('Faster Attacks').tooltip.qualityLines,['Supported Skills have (0.5–10)% increased Attack Speed']);
  assert.deepEqual(gem('Added Fire Damage').tooltip.statLines,['Supported Skills gain (25–39)% of Physical Damage as Extra Fire Damage']);
  assert.ok(gem('Vaal Fireball').tooltip.properties.some(p => p.label==='Soul cost' && p.value==='30 Souls Per Use'));
  assert.equal(gem('Vaal Fireball').secondaryTooltip.name,'Fireball');
  assert.ok(gem('Vaal Fireball').secondaryTooltip.statLines.includes('Deals (9–1883) to (14–2825) Fire Damage'));
  assert.equal(gems.filter(g => g.tooltip.statLines.length).length,818);
  assert.equal(gems.filter(g => g.tooltip.qualityLines.length).length,806);
  assert.ok(gems.every(g => g.tooltip && !JSON.stringify(g.tooltip).includes('NaN')));
  assert.ok(filterGems(gems,{search:'0.005 physical',type:'active'}).some(g => g.name==='Blade Blast'));
});
