export const storageKey = 'exile-companion.catalogix-concept.v1';
export const statuses = ['Draft', 'In review', 'Ready'];
export const types = ['Mechanic', 'Stat', 'Skill', 'Phrase'];
const examples = [
 ['Burning Ground','Mechanic','Ground effect','Fire damage over time from a ground effect. Distinct from ignite.',['fire','ground effect','damage over time'],'In review','ground'],
 ['Chilled Ground','Mechanic','Ground effect','Ground that applies chill while a character stands on it.',['cold','ground effect','ailment'],'Ready','ground'],
 ['Shocked Ground','Mechanic','Ground effect','Ground that applies shock while a character stands on it.',['lightning','ground effect','ailment'],'Ready','ground'],
 ['Unaffected','Phrase','Modifier language','A contextual modifier phrase. Its exact effect needs a source-specific explanation.',['modifier','context required'],'Draft','phrases'],
 ['Movement Speed','Stat','Character stat','Describes how quickly a character moves. Modifiers can increase or reduce movement speed.',['movement','speed'],'Ready','stats'],
 ['Fire Resistance','Stat','Defence','A defensive stat relevant to fire damage. Cap and penetration interactions need a fuller explanation.',['fire','resistance','defence'],'Ready','stats'],
 ['Cold Resistance','Stat','Defence','A defensive stat relevant to cold damage.',['cold','resistance','defence'],'Ready','stats'],
 ['Lightning Resistance','Stat','Defence','A defensive stat relevant to lightning damage.',['lightning','resistance','defence'],'Ready','stats'],
 ['Nearby','Phrase','Modifier language','A contextual distance phrase. The radius varies with the source and should not be assigned a universal value.',['distance','context required'],'In review','phrases'],
 ['Recently','Phrase','Modifier language','A time-window term requiring a verified glossary definition before production use.',['time','modifier'],'Draft','phrases'],
 ['Fireball','Skill','Active skill','A projectile spell whose fireball explodes on impact.',['spell','fire','projectile'],'Ready','skills'],
 ['Blade Blast','Skill','Active skill','Deals area damage and can detonate lingering blades.',['spell','physical','area'],'Ready','skills'],
 ['Ignite','Mechanic','Ailment','A damaging ailment associated with fire damage. Distinct from burning ground.',['fire','ailment','damage over time'],'In review','ailments'],
 ['Chill','Mechanic','Ailment','A cold ailment that slows action speed.',['cold','ailment','action speed'],'Ready','ailments'],
 ['Shock','Mechanic','Ailment','A lightning ailment that increases damage taken.',['lightning','ailment'],'Ready','ailments'],
 ['Grants Level X Skill','Phrase','Granted skill','An item grants a named skill at the stated level. The skill should link to its own glossary record.',['item','granted skill'],'Draft','phrases'],
 ['Armour','Stat','Defence','A defensive rating used in physical damage mitigation.',['physical','defence'],'In review','stats'],
 ['Maximum Life','Stat','Character stat','The upper limit of a character’s life pool.',['life','defence'],'Ready','stats'],
];
export function seed() {
 return {version:1,collections:[{id:'mechanics',name:'Game mechanics',parent:''},{id:'ground',name:'Ground effects',parent:'mechanics'},{id:'ailments',name:'Ailments',parent:'mechanics'},{id:'stats',name:'Character stats',parent:''},{id:'skills',name:'Granted skills',parent:''},{id:'phrases',name:'Modifier phrases',parent:''}],fields:[{id:'reviewer',label:'Reviewer',type:'text',required:false}],views:[],records:examples.map(([title,type,subtitle,definition,tags,status,collection],i)=>({id:`TERM-${String(i+1).padStart(4,'0')}`,title,type,subtitle,definition,tags,status,collection,aliases:[],source:'Demo editorial example',sourceUrl:'',metadata:{reviewer:i%3?'M. Vale':''},relations:i===0?['TERM-0013','TERM-0004']:[],activity:[{text:'Added to concept catalog',at:'2026-11-14T12:00:00Z'}],deleted:false}))};
}
const string = (v,max=5000)=> typeof v==='string'?v.trim().slice(0,max):'';
export function validate(input) {
 if (!input || input.version!==1 || !Array.isArray(input.records) || !Array.isArray(input.collections)) throw Error('Choose a Catalogix concept version 1 snapshot.');
 const ids=new Set(),collections=[];
 for(const c of input.collections.slice(0,200)){const id=string(c?.id,100);if(!id||ids.has(id))throw Error('Collection IDs must be unique.');ids.add(id);collections.push({id,name:string(c.name,80)||'Untitled collection',parent:string(c.parent,100)});}
 for(const c of collections){let p=c.parent,seen=new Set([c.id]);while(p){if(seen.has(p)||!ids.has(p))throw Error('Invalid collection hierarchy.');seen.add(p);p=collections.find(x=>x.id===p).parent;}}
 const fields=(Array.isArray(input.fields)?input.fields:[]).slice(0,30).map(f=>({id:string(f.id,80),label:string(f.label,80),type:['text','number','url'].includes(f.type)?f.type:'text',required:!!f.required}));
 if(fields.some(f=>!f.id||!f.label)||new Set(fields.map(f=>f.id)).size!==fields.length)throw Error('Invalid metadata fields.');
 const records=[],recordIds=new Set();
 for(const r of input.records.slice(0,5000)){const id=string(r?.id,100),title=string(r?.title,160);if(!id||!title||recordIds.has(id))throw Error('Every record needs a unique ID and title.');recordIds.add(id);records.push({id,title,type:types.includes(r.type)?r.type:'Mechanic',subtitle:string(r.subtitle,100),definition:string(r.definition),tags:[...new Set((Array.isArray(r.tags)?r.tags:[]).map(t=>string(t,80)).filter(Boolean))],aliases:(Array.isArray(r.aliases)?r.aliases:[]).map(t=>string(t,100)).filter(Boolean),status:statuses.includes(r.status)?r.status:'Draft',collection:ids.has(r.collection)?r.collection:'',source:string(r.source,300),sourceUrl:string(r.sourceUrl,1000),metadata:Object.fromEntries(fields.map(f=>[f.id,string(r.metadata?.[f.id],500)])),relations:Array.isArray(r.relations)?r.relations.filter(t=>typeof t==='string'):[],activity:(Array.isArray(r.activity)?r.activity:[]).slice(-100).map(a=>({text:string(a.text,300),at:string(a.at,40)})),deleted:!!r.deleted});}
 for(const r of records)r.relations=[...new Set(r.relations.filter(id=>recordIds.has(id)&&id!==r.id))];
 return {version:1,collections,fields,records,views:(Array.isArray(input.views)?input.views:[]).slice(0,30).map(v=>({name:string(v.name,80),search:string(v.search,300),collection:ids.has(v.collection)?v.collection:'',status:statuses.includes(v.status)?v.status:'',type:types.includes(v.type)?v.type:'',sort:['title','id','type','status'].includes(v.sort)?v.sort:'title',direction:v.direction===-1?-1:1}))};
}
export function descendants(collections,id){const result=new Set([id]);let changed=true;while(changed){changed=false;for(const c of collections)if(result.has(c.parent)&&!result.has(c.id)){result.add(c.id);changed=true;}}return result;}
export function query(state,filter){const scope=descendants(state.collections,filter.collection);const words=filter.search.toLowerCase().trim().split(/\s+/).filter(Boolean);return state.records.filter(r=>r.deleted===!!filter.trash&&(!filter.collection||scope.has(r.collection))&&(!filter.status||r.status===filter.status)&&(!filter.type||r.type===filter.type)&&words.every(w=>[r.title,r.id,r.type,r.definition,r.source,...r.tags,...r.aliases,...Object.values(r.metadata)].join(' ').toLowerCase().includes(w))).sort((a,b)=>(a[filter.sort]||'').localeCompare(b[filter.sort]||'')*filter.direction);}
export function errorsFor(record,fields){const errors=[];if(!record.title.trim())errors.push('Title is required.');if(record.sourceUrl&&!/^https?:\/\/[^\s]+$/i.test(record.sourceUrl))errors.push('Source URL must start with https:// or http://.');for(const f of fields){const v=record.metadata[f.id]||'';if(f.required&&!v.trim())errors.push(`${f.label} is required.`);if(v&&f.type==='number'&&!Number.isFinite(Number(v)))errors.push(`${f.label} must be a number.`);if(v&&f.type==='url'&&!/^https?:\/\/[^\s]+$/i.test(v))errors.push(`${f.label} must be a URL.`);}return errors;}
