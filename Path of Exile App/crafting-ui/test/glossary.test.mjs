import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createGlossary} from '../shared/definitions/glossary-model.js';
const data=JSON.parse(await readFile(new URL('../../glossary/master.json',import.meta.url),'utf8'));
test('glossary matches only reviewed terms on supported tooltip surfaces',()=>{
 const glossary=createGlossary(data);
 const line='Unaffected by Burning Ground; +30% to Fire Resistance';
 assert.deepEqual(glossary.match(line,{surface:'item-modifier'}).map(m=>m.id),['term:unaffected','term:burning-ground','term:fire-resistance']);
 assert.equal(glossary.match(line,{surface:'navigation'}).length,0);
 assert.equal(glossary.match('Movement Speeder',{surface:'tree-stat'}).length,0);
 assert.equal(glossary.match('Recently',{surface:'skill-tooltip'})[0].id,'term:recently');
});
test('longest phrases, contextual entries and ambiguity are handled conservatively',()=>{
 const entry=(id,alias,extra={})=>({id,name:alias,aliases:[alias],definition:'definition',status:'reviewed',tooltipEligible:true,contexts:['item-modifier'],...extra});
 const glossary=createGlossary({entries:[entry('a','Fire'),entry('b','Fire Resistance'),entry('c','Nearby',{recordIds:['special']})]});
 assert.equal(glossary.match('Fire Resistance',{surface:'item-modifier'})[0].id,'b');
 assert.equal(glossary.match('Nearby',{surface:'item-modifier'}).length,0);
 assert.equal(glossary.match('Nearby',{surface:'item-modifier',record:'special'}).length,1);
 assert.equal(createGlossary({entries:[entry('a','Fire'),entry('b','Fire')]}).match('Fire',{surface:'item-modifier'}).length,0);
});
test('every definition retains provenance; unreviewed records cannot activate matching',()=>{
 assert.equal(new Set(data.entries.map(e=>e.id)).size,data.entries.length);
 assert.ok(data.entries.every(e=>e.sources.length));
 assert.ok(data.entries.filter(e=>e.tooltipEligible).every(e=>e.status==='reviewed'));
 assert.ok(data.entries.some(e=>e.kind==='granted-skill'));
 for (const [id,index] of Object.entries(data.indexes.byId)) assert.equal(data.entries[index].id,id);
 for (const [alias,ids] of Object.entries(data.indexes.byAlias)) for (const id of ids) assert.ok(data.entries[data.indexes.byId[id]].aliases.some(a=>a.toLowerCase()===alias));
});

test('card index covers Snowblind annotations and separates support names from ordinary stats',async()=>{
 const index=JSON.parse(await readFile(new URL('../tooltip-data.json',import.meta.url),'utf8'));
 const glossary=createGlossary(index),context={surface:'item-modifier'};
 for(const text of ['increased Dexterity','increased Evasion Rating','to maximum Life','increased Arctic Armour Buff Effect','Arctic Armour has no Reservation'])assert.ok(glossary.match(text,context).length,text);
 assert.ok(glossary.match('Arctic Armour has no Reservation',context).some(m=>m.id==='phrase:no-reservation'));
 assert.ok(glossary.match('increased Frenzy Charges',context).some(m=>m.text.toLowerCase()==='frenzy charges'));
 const supports=index.entries.filter(e=>e.namedSkillOnly);
 assert.ok(supports.length>100);
 const support=supports.find(e=>e.name==='Faster Attacks');
 assert.ok(!glossary.match('Faster Attacks',context).some(m=>m.id===support.id));
 assert.ok(glossary.match('Grants Level 20 Faster Attacks Skill',context).some(m=>m.id===support.id));
});
