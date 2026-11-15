import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {indexTree,shortestPath,reachable} from '../features/tree/tree-model.js';
const data=JSON.parse(await readFile(new URL('../../data-sources/pob-tree-3_29/tree.json',import.meta.url)));
const nodes=indexTree(data);
test('3.29 index preserves every source node and computes finite static positions',()=>{assert.equal(nodes.size,Object.keys(data.nodes).length-1);for(const n of nodes.values()){if(data.groups[n.group])assert.ok(Number.isFinite(n.x)&&Number.isFinite(n.y));for(const id of n.links)assert.ok(nodes.get(id).links.has(n.id));}});
test('ranger allocation path and refund connectivity use real graph',()=>{const root=[...nodes.values()].find(n=>n.classStartIndex===2);const target=[...root.links][0];const path=shortestPath(nodes,[root.id],target,n=>!n.ascendancyName&&!n.isMastery&&(n.classStartIndex===undefined||n.classStartIndex===2));assert.deepEqual(path,[root.id,target]);assert.ok(reachable(nodes,[root.id],new Set(path)).has(target));assert.ok(!reachable(nodes,[root.id],new Set([root.id])).has(target));});
test('search indexes mastery effects and stable ids',()=>{const n=[...nodes.values()].find(n=>n.isMastery);assert.ok(n.search.includes(n.id));assert.ok(n.search.includes(n.masteryEffects[0].stats[0].toLowerCase()));});

test('symbol categories distinguish attributes and structural node types', async()=>{
 const {nodeVisual}=await import('../features/tree/tree-model.js');
 assert.equal(nodeVisual({name:'Strength'}).symbol,'S');
 assert.equal(nodeVisual({name:'Dexterity'}).symbol,'D');
 assert.equal(nodeVisual({name:'Intelligence'}).symbol,'I');
 assert.equal(nodeVisual({name:'Strength',isNotable:true}).shape,'hex');
 assert.equal(nodeVisual({isKeystone:true}).shape,'diamond');
 assert.equal(nodeVisual({isJewelSocket:true}).shape,'square');
 const lean=JSON.parse(await readFile(new URL('../../data-sources/pob-tree-3_29/tree-view.json',import.meta.url)));
 const leanIndex=indexTree(lean);
 assert.equal(leanIndex.size,nodes.size);
 for(const [id,node] of nodes){assert.equal(leanIndex.get(id).search,node.search);assert.deepEqual(leanIndex.get(id).links,node.links);assert.equal(leanIndex.get(id).icon,undefined);}
});
