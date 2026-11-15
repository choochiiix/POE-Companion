import '../../shared/layout/navigation.js';
import { createElementFactory } from '../../shared/ui/dom.js';
import { installInspector } from '../../shared/layout/library-layout.js';
import {indexItems,groupVariants} from './catalog-model.js';
const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/catalog.css';document.head.append(stylesheet);
const root=document.createElement('div');root.id='catalogPanel';root.hidden=true;document.querySelector('.workspace').append(root);
const tab=document.createElement('button');tab.textContent='Item library';tab.type='button';tab.setAttribute('aria-pressed','false');tab.setAttribute('aria-controls',root.id);document.querySelector('.workspace-tabs').append(tab);
const loading = document.createElement('p');loading.textContent = 'Loading local item data…';loading.setAttribute('role', 'status');root.append(loading);
async function initializeCatalog() {
const catalog=await fetch('/catalog-data.json').then(r=>{if(!r.ok)throw new Error('Unable to load offline item index');return r.json();});
const artwork=await fetch('/unique-art.json').then(r=>r.ok?r.json():{items:{}}).catch(()=>({items:{}}));
const diagnostics=catalog.report.diagnostics,bases=indexItems(catalog.bases),uniques=indexItems(groupVariants(catalog.uniques).map(g=>g.item));
loading.remove();
const el = createElementFactory(root);
el('h2','Item library');el('p',`${catalog.report.definitions.toLocaleString()} PoB unique definitions · ${uniques.length.toLocaleString()} variants · Offline source snapshot`);
const controls=el('div','');controls.className='catalog-filters';
function select(label,values){const l=el('label',label,controls),s=el('select','',l);for(const [v,t]of values)s.add(new Option(t,v));return s;}
const mode=select('Browse',[['unique','Unique catalog'],['base','Base browser']]),category=select('Category',[['','All types'],...Array.from(new Set(uniques.map(i=>i.category))).sort().map(k=>[k,k])]);
const sl=el('label','Search name, base or mods',controls),search=el('input','',sl);search.type='search';search.placeholder='Search items…';sl.className='catalog-search';
const cls=select('Item class',[['','All'],...bases.map(i=>[i.itemClass,i.itemClass])]),attr=select('Required attribute',[['','Any'],...['strength','dexterity','intelligence'].map(a=>[a,a])]);
const ll=el('label','Maximum required level',controls),level=el('input','',ll);level.type='number';level.min='0';level.step='1';level.placeholder='Any level';
const mods=i=>[...i.implicit,...i.explicit];
const stat=select('Stat',[['','Any'],...Array.from(new Set([...bases,...uniques].flatMap(i=>mods(i).map(m=>m.key)))).map(k=>[k,k])]),sort=select('Sort',[['name','Name'],['level','Level'],['stat','First stat range maximum, descending']]);
const pl=el('label','Category / class / base'),picker=el('select','',pl),status=el('p',''),detail=el('section','');detail.dataset.definitionSurface='item-modifier';status.setAttribute('role','status');let visible=[];
function show(i){detail.className=mode.value==='unique'?'unique-results':'';pl.hidden=mode.value==='unique';detail.replaceChildren();if(mode.value==='unique'){renderCards(i?.id);return;}if(!i)return;el('h3',i.name,detail);el('p',`${i.category} / ${i.itemClass} / ${i.baseType} · Level ${i.level}`,detail);el('p',JSON.stringify(i.requirements),detail);if(i.variant)el('p',`Selected: ${i.variant} · ${i.legacy?'Legacy':'Non-legacy'}`,detail);for(const k of ['implicit','explicit']){el('h4',`${k} mods`,detail);if(!i[k].length)el('p','None',detail);for(const m of i[k]){el('p',m.text,detail);el('small',`${m.key} | ${JSON.stringify(m.ranges)}${m.unparsed?' UNPARSED':''}`,detail);}}if(!i.baseId)for(const [k,v]of Object.entries(i.stats))el('p',`${k}: ${v}`,detail);
function link(label,target,m){const b=el('button',label,detail);b.onclick=()=>{mode.value=m;category.value='';search.value='';cls.value='';attr.value='';stat.value='';level.value='';render(target.id);};}
if(i.baseId){link('View base',bases.find(b=>b.id===i.baseId),'base');for(const v of uniques.filter(u=>u.family===i.family))link(`${v.id===i.id?'✓ Selected: ':''}${v.variant}`,v,'unique');}else{el('h4','Uniques using this base',detail);const matches=uniques.filter(u=>u.baseId===i.id);if(!matches.length)el('p','None in fixture data',detail);for(const u of matches)link(`${u.name} / ${u.variant}`,u,'unique');}}
function render(id){
 const val=i=>mods(i).find(m=>m.key===stat.value)?.ranges[0]?.max??-Infinity;
 const words=search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
 visible=(mode.value==='base'?bases:uniques).filter(i=>(!category.value||i.category===category.value)&&words.every(w=>i.search.includes(w))&&(!cls.value||cls.value===i.itemClass)&&(!attr.value||i.requirements[attr.value]>0)&&(level.value===''||i.level<=Number(level.value))&&(!stat.value||mods(i).some(m=>m.key===stat.value))).sort((a,b)=>a.category.localeCompare(b.category)||a.itemClass.localeCompare(b.itemClass)||(sort.value==='level'?a.level-b.level:sort.value==='stat'?(val(a)===val(b)?0:val(a)>val(b)?-1:1):0)||a.name.localeCompare(b.name));
 picker.replaceChildren();const groups=new Map();
 for(const i of visible){const k=`${i.category} / ${i.itemClass}`;if(!groups.has(k)){const g=document.createElement('optgroup');g.label=k;picker.append(g);groups.set(k,g);}groups.get(k).append(new Option(`${i.baseType} — ${i.name}${i.variant?' / '+i.variant:''}`,i.id));}
 if(id&&visible.some(i=>i.id===id))picker.value=id;
 status.textContent=mode.value==='unique'?`${groupVariants(visible).length.toLocaleString()} uniques · ${visible.length.toLocaleString()} matching versions · Sorted by type`:`${visible.length.toLocaleString()} matching bases · Sorted by type`;
 show(visible.find(i=>i.id===picker.value));
}
const reset=el('button','Clear filters',controls);reset.type='button';reset.className='catalog-reset';
function clearFilters(){category.value=mode.value==='base'?'Armour':'';search.value='';cls.value='';attr.value='';level.value='';stat.value='';sort.value='name';}
reset.onclick=()=>{clearFilters();updateOptions();render();};
function replaceOptions(select,values){const previous=select.value;select.replaceChildren(...values.map(([value,text])=>new Option(text,value)));if(values.some(([value])=>value===previous))select.value=previous;}
function updateOptions(){
 const source=mode.value==='base'?bases:uniques;
 category.options[0].disabled=mode.value==='base';
 if(mode.value==='base'&&!category.value)category.value='Armour';
 const scoped=source.filter(i=>!category.value||i.category===category.value);
 replaceOptions(cls,[['','All item classes'],...Array.from(new Set(scoped.map(i=>i.itemClass))).sort().map(k=>[k,k])]);
 const classItems=scoped.filter(i=>!cls.value||i.itemClass===cls.value);
 replaceOptions(stat,[['','Any modifier'],...Array.from(new Set(classItems.flatMap(i=>mods(i).map(m=>m.key)))).sort().map(k=>[k,k])]);
 sort.options[2].disabled=!stat.value;
 if(!stat.value&&sort.value==='stat')sort.value='name';
}
controls.addEventListener('input',event=>{if(event.target===mode)clearFilters();updateOptions();render();});
picker.onchange=()=>show(visible.find(i=>i.id===picker.value));updateOptions();render();
const layout=el('div','');layout.className='library-workspace';
const categories=el('nav','',layout);categories.className='library-categories';categories.setAttribute('aria-label','Item categories');
const center=el('div','',layout);center.className='library-results';for(const node of [controls,pl,status,detail])center.append(node);
const inspector=installInspector(layout,'Item inspector');
for(const value of ['',...new Set(uniques.map(i=>i.category))]){const b=el('button',value||'All items',categories);b.type='button';b.setAttribute('aria-pressed',String(value===''));b.onclick=()=>{category.value=value;updateOptions();render();for(const n of categories.children)n.setAttribute('aria-pressed',String(n===b))};}
const importNote=el('details','');el('summary',`${diagnostics.length} source diagnostics · import coverage`,importNote);el('p',catalog.report.limitations.join(' '),importNote);el('p',`${catalog.report.missingFlavor} variant records have no matched flavor text. Missing text is explicitly marked. Full item/raw-line report: resources/catalog-import-report.json.`,importNote);
function renderCards(selected){
 if(!visible.length){el('p','No uniques match these filters.',detail);return;}
 let group='';let list;
 const families=groupVariants(visible);
 for(const {item,variants} of families.slice(0,120)){
  const key=`${item.category} / ${item.itemClass}`;
  if(key!==group){group=key;el('h3',key,detail).className='unique-group-heading';list=el('div','',detail);list.className='unique-card-list';}
  const card=el('article','',list);card.className='unique-card';card.dataset.record=item.id;card.setAttribute('aria-label',`${item.name}, ${item.variant}`);
  const head=el('div','',card);head.className='unique-card-header';el('h4',item.name,head);el('p',item.baseType,head);
  const art=el('div','',card);art.className='unique-card-art';
  const imageInfo=artwork.items[item.name];
  if(imageInfo){const img=document.createElement('img');img.src=imageInfo.file;img.alt=`${item.name} inventory artwork`;img.loading='lazy';img.decoding='async';img.width=imageInfo.width;img.height=imageInfo.height;img.onerror=()=>{img.remove();el('span','Artwork unavailable',art);};art.append(img);}
  else el('span','Artwork unavailable',art);
  const body=el('div','',card);body.className='unique-card-body';el('p',item.itemClass,body).className='item-properties';
  const base=bases.find(b=>b.id===item.baseId);
  const requirements=Object.entries(item.requirements).filter(([,v])=>v>0).map(([k,v])=>`${v} ${ {strength:'Str',dexterity:'Dex',intelligence:'Int'}[k]}`);
  el('p',`${item.requirementsKnown?'Base requirements:':'Requirements unknown · source level:'} Level ${item.level}${requirements.length?', '+requirements.join(', '):''}`,body).className='item-requirements';
  for(const field of ['implicit','explicit']){
   if(!item[field].length)continue;
   const block=el('div','',body);block.className='item-mod-block';block.setAttribute('aria-label',`${field} modifiers`);
   for(const mod of item[field]){
    const row=el('div','',block);row.className='mod-detail-row';
    const line=el('p',mod.text,row);line.className='item-mod item-mod-normal';
   }
  }
  el('p',item.flavorText||'Flavor text unavailable in this source record.',body).className='item-flavor';
  const footer=el('div','',card);footer.className='unique-card-footer';
  const inspect=el('button','Inspect item',footer);inspect.type='button';inspect.onclick=()=>inspector.inspect(card,inspect);
  const compare=el('button','Compare with build',footer);compare.type='button';compare.disabled=!item.baseId;compare.onclick=()=>document.dispatchEvent(new CustomEvent('calculation:compare',{detail:{baseId:item.baseId,name:item.name,lines:[...item.implicit,...item.explicit].map(mod=>mod.text.replace(/\((-?\d+(?:\.\d+)?)[–-](-?\d+(?:\.\d+)?)\)/g,(_,a,b)=>String((Number(a)+Number(b))/2)))}}));
  if(item.legacy)el('small','Legacy-only item',footer);
  const jump=el('button','View base',footer);jump.type='button';jump.disabled=!base;jump.onclick=()=>{mode.value='base';category.value=base.category;search.value='';cls.value='';attr.value='';stat.value='';level.value='';updateOptions();render(item.baseId);};
 }
 if(families.length>120)el('p',`Showing the first 120 of ${families.length} uniques. Refine search or filters to find any indexed unique.`,detail);
}


}
initializeCatalog().catch(() => {loading.textContent = 'Item library could not load. Reload to retry the local data file.';loading.setAttribute('role', 'alert');root.prepend(loading);});
