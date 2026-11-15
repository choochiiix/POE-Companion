import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildTagCatalog} from '../../scripts/build-tags.mjs';
import {indexTags} from '../shared/tags/tag-model.js';
test('tag registry preserves unused tags, namespaces and ordered weight references',()=>{
 const data=buildTagCatalog(['fire','unused'],{'mods.json':{a:{spawn_weights:[{tag:'fire',weight:0},{tag:'fire',weight:20}],adds_tags:['fire']}}},[{id:'gem',tags:['fire'],rules:{requireSkillTypes:['Fire','NOT']}}]);
 const index=indexTags(data);
 assert.equal(index.get('repoe','unused').references.length,0);
 assert.equal(index.get('repoe','fire').references.length,3);
 assert.equal(index.get('pob-gem','fire').references.length,1);
 assert.equal(index.get('pob-skill-type','NOT'),undefined);
 assert.equal(index.search('fire').length,3);
 assert.equal(index.get('repoe','fire').references[1].field,'spawn_weights.1.tag');
 assert.throws(()=>buildTagCatalog(['fire'],{bases:{a:{tags:['unknown']}}},[]),/Unknown RePoE/);
 assert.throws(()=>buildTagCatalog(['fire','fire'],{},[]),/Invalid/);
});
test('complete snapshot indexes every RePoE tag and full raw-source references',async()=>{
 const read=async path=>JSON.parse(await readFile(new URL(path,import.meta.url),'utf8'));
 const tags=await read('../../data-sources/repoe-poe1/tags.json');
 const data=await read('../tag-data.json');
 assert.deepEqual(data.tags.filter(t=>t.namespace==='repoe').map(t=>t.id).sort(),tags.slice().sort());
 assert.equal(tags.length,1389);
 assert.ok(data.tags.some(t=>t.references.some(r=>r.field.startsWith('influence_tags.'))));
 assert.ok(data.tags.reduce((n,t)=>n+t.references.length,0)>168000);
});
