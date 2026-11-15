import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const data=JSON.parse(await readFile('crafting-ui/catalog-data.json','utf8'));
const identities=Object.values(JSON.parse(await readFile('resources/uniques.json','utf8')));
const names=[...new Set(data.uniques.map(i=>i.name))];
const directory='crafting-ui/assets/uniques';await mkdir(directory,{recursive:true});
const manifest={source:'https://repoe-fork.github.io/Art/2DItems/',retrieved:new Date().toISOString(),items:{},missing:[]};
let cursor=0,finished=0;
async function worker(){while(cursor<names.length){const name=names[cursor++];
 const identity=identities.find(i=>i.name===name&&!i.is_alternate_art);
 const path=identity?.visual_identity?.dds_file;
 if(!path?.startsWith('Art/2DItems/')){manifest.missing.push({name,reason:'No matching ordinary-art identity'});continue;}
 const source='https://repoe-fork.github.io/'+path.replace(/\.dds$/i,'.png');
 const filename=createHash('sha256').update(source).digest('hex').slice(0,24)+'.png';
 try{try{await access(`${directory}/${filename}`);}catch{
  const response=await fetch(source,{signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(`HTTP ${response.status}`);
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Response is not PNG');
  await writeFile(`${directory}/${filename}`,bytes);
 }
 const bytes=await readFile(`${directory}/${filename}`);
 manifest.items[name]={file:`/assets/uniques/${filename}`,source,sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
 }catch(error){manifest.missing.push({name,source,reason:error.message});}
 finished++;if(finished%100===0)console.log(`${finished} artwork requests processed`);
}}
// Several replica names share a file; serialize cache access to avoid partial reads.
await worker();
await writeFile('crafting-ui/unique-art.json',JSON.stringify(manifest));
await writeFile('resources/unique-art-report.json',JSON.stringify(manifest,null,2));
console.log(JSON.stringify({matched:Object.keys(manifest.items).length,missing:manifest.missing.length,total:names.length}));
