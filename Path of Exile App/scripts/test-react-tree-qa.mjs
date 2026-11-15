import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {indexTree,shortestPath} from '../crafting-ui/features/tree/tree-model.js';

const data=JSON.parse(await readFile(new URL('../data-sources/pob-tree-3_29/tree-view.json',import.meta.url),'utf8'));
const nodes=indexTree(data);
function rootsFor(classIndex){return [...nodes.values()].filter(node=>node.classStartIndex===classIndex).map(node=>node.id);}
function allowedFor(classIndex){return node=>Boolean(node&&Number.isFinite(node.x)&&!node.isMastery&&!node.ascendancyName&&(node.classStartIndex===undefined||node.classStartIndex===classIndex));}
function masteryFor(classIndex){
 const roots=rootsFor(classIndex),candidates=[];
 for(const [id,node] of nodes){
  if(!node.isMastery||!node.masteryEffects?.length)continue;
  const notable=[...nodes.values()].find(candidate=>candidate.group===node.group&&candidate.isNotable);
  if(!notable)continue;
  const path=shortestPath(nodes,roots,notable.id,allowedFor(classIndex));
  if(path)candidates.push({masteryId:id,effect:node.masteryEffects[0].effect,notableId:notable.id,pathLength:path.length});
 }
 candidates.sort((left,right)=>left.pathLength-right.pathLength);
 assert.ok(candidates.length,`No allocatable mastery found for class index ${classIndex}`);
 return candidates[0];
}
function ordinaryNodeFor(classIndex){
 const roots=rootsFor(classIndex),candidates=[];
 for(const node of nodes.values()){
  if(node.classStartIndex!==undefined||node.isMastery||node.isAscendancyStart)continue;
  const path=shortestPath(nodes,roots,node.id,allowedFor(classIndex));
  if(path&&path.length>1)candidates.push({id:node.id,pathLength:path.length});
 }
 candidates.sort((left,right)=>left.pathLength-right.pathLength);
 assert.ok(candidates.length,`No allocatable passive found for class index ${classIndex}`);
 return candidates[0].id;
}

const marauderIndex=data.classes.findIndex(characterClass=>characterClass.name==='Marauder');
const rangerIndex=data.classes.findIndex(characterClass=>characterClass.name==='Ranger');
assert.ok(marauderIndex>=0&&rangerIndex>=0);
const mastery=masteryFor(marauderIndex);
const rangerNode=ordinaryNodeFor(rangerIndex);
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=spawn(process.execPath,['renderer/server.mjs'],{env:{...process.env,RENDERER_PORT:'4333'},stdio:'ignore'});
let browser;
try{
 await new Promise(resolve=>setTimeout(resolve,1000));
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[],external=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',request=>request.request().url().startsWith('http://127.0.0.1:4333/')?request.continue():(external.push(request.request().url()),request.abort()));
 await page.goto('http://127.0.0.1:4333/');
 await page.getByRole('button',{name:'Skill tree',exact:true}).click();
 await page.locator('#treeCanvas').waitFor();
 await page.waitForFunction(()=>document.querySelector('#treeCanvas')?.width>0);
 await mkdir('docs/previews/react-migration',{recursive:true});
 await page.screenshot({path:'docs/previews/react-migration/tree-desktop.png'});

 const find=page.getByLabel('Find a node');
 async function inspect(id){
  await find.fill(String(id));
  await page.getByRole('button',{name:'Next match'}).click();
  await page.waitForFunction(expected=>document.querySelector('#nodeMeta')?.textContent.includes(`#${expected}`),String(id));
 }
 await inspect(mastery.notableId);
 await page.locator('#allocateNode').click();
 const marauderKey='poe.tree.3_29.Marauder.';
 let marauderSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),marauderKey);
 assert.ok(marauderSave.selected.length>1,'Notable path was allocated');
 assert.ok(marauderSave.selected.includes(mastery.notableId),'Expected notable is selected');
 await inspect(mastery.masteryId);
 await page.locator('#masteryChoice').selectOption(String(mastery.effect),{force:true});
 await page.locator('#allocateNode').click();
 marauderSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),marauderKey);
 assert.equal(marauderSave.masteries[mastery.masteryId],String(mastery.effect),'Mastery effect is persisted');

 await page.locator('#treeUndo').click();
 marauderSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),marauderKey);
 assert.equal(marauderSave.masteries[mastery.masteryId],undefined,'Undo restores mastery selection');
 await page.locator('#masteryChoice').selectOption(String(mastery.effect),{force:true});
 await page.locator('#allocateNode').click();
 marauderSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),marauderKey);
 assert.equal(marauderSave.masteries[mastery.masteryId],String(mastery.effect));

 await page.getByRole('button',{name:'Character',exact:true}).click();
 await page.getByRole('button',{name:'Edit character'}).click();
 await page.locator('select[aria-label="Character class"]').selectOption('Ranger',{force:true});
 await page.getByRole('button',{name:'Return to character'}).click();
 await page.getByRole('button',{name:'Skill tree',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#treeCharacter')?.textContent.includes('Ranger'));
 await inspect(rangerNode);
 await page.locator('#allocateNode').click();
 const rangerKey='poe.tree.3_29.Ranger.';
 const rangerSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),rangerKey);
 assert.ok(rangerSave.selected.length>1,'Ranger allocation is saved independently');
 marauderSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),marauderKey);
 assert.equal(marauderSave.masteries[mastery.masteryId],String(mastery.effect),'Marauder mastery remains isolated');

 await page.getByRole('button',{name:'Character',exact:true}).click();
 await page.getByRole('button',{name:'Edit character'}).click();
 await page.locator('select[aria-label="Character class"]').selectOption('Marauder',{force:true});
 await page.getByRole('button',{name:'Return to character'}).click();
 await page.getByRole('button',{name:'Skill tree',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#treeCharacter')?.textContent.includes('Marauder'));
 marauderSave=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),marauderKey);
 assert.equal(marauderSave.masteries[mastery.masteryId],String(mastery.effect));
 assert.ok(await page.evaluate(key=>Boolean(localStorage.getItem(key)),rangerKey));
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 console.log(`PASS tree allocation, mastery save/undo, class-specific saves and offline navigation (${mastery.pathLength}-node mastery path).`);
}finally{
 await browser?.close();
 server.kill();
}
