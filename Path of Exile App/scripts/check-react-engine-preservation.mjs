// Validate the explicit no-engine-changes constraint against the pre-migration snapshot.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url);
const snapshot=JSON.parse((await readFile(new URL('.validation/react-engines-before.json',root),'utf8')).replace(/^\uFEFF/,''));
const mismatches=[];
for(const file of snapshot){
 try{
  const contents=await readFile(new URL(file.path.replaceAll('\\','/'),root));
  const actual=createHash('sha256').update(contents).digest('hex').toUpperCase();
  if(actual!==file.sha256)mismatches.push(file.path);
 }catch{mismatches.push(`${file.path} (missing/unreadable)`);}
}
assert.deepEqual(mismatches,[],'Engine/data files changed since the React migration baseline');
console.log(`PASS: all ${snapshot.length} engine/data files match the pre-migration SHA256 baseline.`);
