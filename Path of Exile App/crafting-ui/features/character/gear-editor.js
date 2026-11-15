import {mountSpringDisclosure} from '../../shared/ui/spring-dropdown.js';
import {createGearEngine,gearStorageKey,validateGear,eligibleAffixes,modifierLabel,gearCalculationOverride,gearPresentation} from './gear-model.js';
import {basesForSlot,equipmentSlots} from './character-data.js';
import {createElementFactory} from '../../shared/ui/dom.js';

export function mountGearEditor({bases,mods,sourceBases={},getEquipment,setBase,status}){
 const engine=createGearEngine(mods),rows={},cards={};
 try{const stored=JSON.parse(localStorage.getItem(gearStorageKey));if(stored?.version===1)for(const [slot,row]of Object.entries(stored.items??{}))if(Object.hasOwn(equipmentSlots,slot)){try{rows[slot]=validateGear(engine,bases,row);}catch{status.textContent='Some saved gear could not be validated; its base selection is preserved.';}}}catch{}
 const dialog=document.createElement('dialog');dialog.className='calculation-dialog gear-editor character-design-dialog';dialog.setAttribute('aria-label','Create equipment');document.body.append(dialog);
 const el=createElementFactory(dialog),heading=el('h2','Create equipment'),notice=el('p','Ordinary equipment only. Eligibility uses the local crafting snapshot; special crafting systems are not included.'),form=el('div','');form.className='calculation-controls';
 const baseSelect=el('select','',el('label','Equipment base',form)),level=el('input','',el('label','Item level',form));level.type='number';level.min='1';level.max='100';level.value='85';
 baseSelect.setAttribute('aria-label','Equipment base');level.setAttribute('aria-label','Item level');
 const rarity=el('p',''),selected=el('div',''),filters=el('div','');filters.className='calculation-controls';
 const side=el('select','',el('label','Affix type',filters));for(const value of ['prefix','suffix'])side.add(new Option(value,value));
 const search=el('input','',el('label','Search available affixes',filters));search.type='search';
 search.placeholder='Name, effect, or source ID';
 const candidates=el('select','',el('label','Available affix',dialog)),add=el('button','Add affix');add.type='button';
 side.setAttribute('aria-label','Affix type');search.setAttribute('aria-label','Search available affixes');candidates.setAttribute('aria-label','Available affix');
 const matchStatus=el('p','');matchStatus.className='gear-affix-matches';matchStatus.setAttribute('role','status');
 const clearSearch=el('button','Clear search');clearSearch.type='button';clearSearch.onclick=()=>{search.value='';refresh();search.focus();};
 const clearAffixes=el('button','Clear draft affixes');clearAffixes.type='button';clearAffixes.onclick=()=>{draft.mods=[];message.textContent='Draft affixes cleared. Your equipped item is unchanged until Save.';refresh();};
 const message=el('p','');message.setAttribute('role','status');const save=el('button','Save and equip item');save.type='button';const cancel=el('button','Cancel');cancel.type='button';
 let slot,draft,opener;
 const persist=()=>{try{localStorage.setItem(gearStorageKey,JSON.stringify({version:1,items:rows}));return true;}catch{status.textContent='Storage unavailable. Gear changes last for this session.';return false;}};
 const dispatch=()=>document.dispatchEvent(new CustomEvent('build:change'));
 function renderCards(){let pruned=false;for(const slot of Object.keys(rows))if(rows[slot].baseId!==getEquipment()[slot]){delete rows[slot];pruned=true;}if(pruned)persist();for(const [slot,content]of Object.entries(cards)){
   const id=getEquipment()[slot],base=bases.find(base=>base.id===id),row=rows[slot]?.baseId===id?rows[slot]:null;
   content.replaceChildren();const host=content.parentElement;host.dataset.rarity=row?.rarity??'normal';host.classList.toggle('has-base',Boolean(base));
   if(base){const view=gearPresentation(engine,base,row,sourceBases[base.id]);const card=document.createElement('article');card.className='equipped-gear-card unique-card';card.setAttribute('aria-label',`${view.rarity} ${base.name}`);card.dataset.rarity=view.rarity;
    const header=document.createElement('header');header.className='equipped-gear-header';const name=document.createElement('h4');name.textContent=view.title;header.append(name);if(view.title!==base.name){const subtitle=document.createElement('p');subtitle.textContent=base.name;header.append(subtitle);}card.append(header);
    const body=document.createElement('div');body.className='equipped-gear-body unique-card-body';for(const text of view.properties){const line=document.createElement('p');line.className='gear-property';line.textContent=text;body.append(line);}const requirements=document.createElement('p');requirements.className='gear-requirements';requirements.textContent=view.requirements;body.append(requirements);
    if(base.implicits?.length){const implicit=document.createElement('div');implicit.className='gear-mod-block';for(const mod of base.implicits){const line=document.createElement('p');line.textContent=mod.description||mod.id;implicit.append(line);}body.append(implicit);}
    if(row?.mods.length){const explicit=document.createElement('div');explicit.className='gear-mod-block';for(const mod of row.mods){const line=document.createElement('p');line.textContent=modifierLabel(engine,mod);explicit.append(line);}body.append(explicit);}
    const note=document.createElement('small');note.className='gear-source-note';note.textContent=`${view.rarity} · ${row?`Item level ${row.itemLevel} · `:''}Base ranges: midpoint · quality 0`;body.append(note);card.append(body);const disclosure=document.createElement('details');disclosure.className='character-item-detail';const toggle=document.createElement('summary');toggle.textContent=view.title;toggle.title='Inspect item';disclosure.append(toggle,card);content.append(disclosure);mountSpringDisclosure(disclosure);}
   const button=document.createElement('button');button.type='button';button.textContent=base?'Edit item':'Add item';button.setAttribute('aria-label',`${base?'Edit':'Add'} ${slot} item`);button.disabled=!basesForSlot(bases,slot,bases.find(base=>base.id===getEquipment()['main-hand'])).length;button.onclick=()=>open(slot,button);content.append(button);
   if(base){const remove=document.createElement('button');remove.type='button';remove.textContent='Remove';remove.setAttribute('aria-label',`Remove ${slot} item`);remove.onclick=()=>{delete rows[slot];persist();setBase(slot,'');renderCards();dispatch();cards[slot].querySelector(':scope > button')?.focus();};content.append(remove);}
 }}
 function open(target,button){slot=target;opener=button;heading.textContent=`Create / edit ${target.replaceAll('-',' ')} equipment`;const options=basesForSlot(bases,target,bases.find(base=>base.id===getEquipment()['main-hand']));baseSelect.replaceChildren(new Option('Choose a base',''));for(const base of options)baseSelect.add(new Option(`${base.itemClass} · ${base.name}`,base.id));const current=getEquipment()[target];draft=rows[target]?.baseId===current?structuredClone(rows[target]):{baseId:current||'',itemLevel:85,mods:[]};baseSelect.value=draft.baseId;level.value=draft.itemLevel;search.value='';message.textContent='';refresh();dialog.showModal();}
 function refresh(){
   selected.replaceChildren();candidates.replaceChildren();save.disabled=true;add.disabled=true;matchStatus.textContent='';clearAffixes.disabled=!draft.mods.length;clearSearch.disabled=!search.value;
   if(!draft.baseId){rarity.textContent='Choose an equipment base.';return;}
   try{draft=validateGear(engine,bases,draft);save.disabled=false;}catch(error){message.textContent=error.message;return;}
   const counts={prefix:0,suffix:0};for(const rolled of draft.mods){const def=engine.mods.find(mod=>mod.id===rolled.id);counts[def.affix]++;const section=el('section','',selected);el('strong',`${def.affix} · ${def.name||'Unnamed affix'}`,section);el('p',def.description||'Source description unavailable',section);
     for(const stat of def.stats){const input=el('input','',el('label',`${stat.id} · ${stat.min}–${stat.max} source units`,section));input.type='number';input.min=stat.min;input.max=stat.max;input.step='1';input.value=rolled.values[stat.id];input.onchange=()=>{if(!input.checkValidity()||!Number.isSafeInteger(Number(input.value))){input.reportValidity();input.value=rolled.values[stat.id];return;}rolled.values[stat.id]=Number(input.value);refresh();};}
     const remove=el('button','Remove affix',section);remove.type='button';remove.onclick=()=>{const next={...draft,mods:draft.mods.filter(mod=>mod!==rolled)};try{draft=validateGear(engine,bases,next);message.textContent='';refresh();}catch(error){message.textContent=`Cannot remove this affix while another depends on it. ${error.message}`;}};
   }
   rarity.textContent=`${draft.rarity.toUpperCase()} · ${counts.prefix}/3 prefixes · ${counts.suffix}/3 suffixes. Magic needs at most one of each; extra affixes make it rare.`;
   const words=search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);for(const mod of eligibleAffixes(engine,bases,draft).filter(mod=>mod.affix===side.value&&words.every(word=>`${mod.name} ${mod.description} ${mod.id}`.toLowerCase().includes(word))))candidates.add(new Option(`${mod.name||mod.id} · ${mod.description||mod.id} · iLvl ${mod.requiredLevel}`,mod.id));add.disabled=!candidates.options.length;
   candidates.disabled=add.disabled;
   matchStatus.textContent=counts[side.value]>=3?`All three ${side.value} slots are filled.`:candidates.options.length?`${candidates.options.length} eligible ${side.value} options${search.value?' match your search':''}.`:`No eligible ${side.value} options${search.value?' match this search. Clear the search or try fewer words.':' remain for this base, item level and affixes.'}`;
 }
 baseSelect.onchange=()=>{draft={baseId:baseSelect.value,itemLevel:Number(level.value),mods:[]};message.textContent='Base changed; explicit affixes cleared.';refresh();};level.onchange=()=>{if(!level.checkValidity()){level.reportValidity();return;}const next={...draft,itemLevel:Number(level.value)};try{draft=validateGear(engine,bases,next);message.textContent='';refresh();}catch(error){level.value=draft.itemLevel;message.textContent=`Item level change refused: ${error.message}`;}};side.onchange=refresh;search.oninput=refresh;
 add.onclick=()=>{const def=eligibleAffixes(engine,bases,draft).find(mod=>mod.id===candidates.value);if(!def)return;draft.mods.push({id:def.id,values:Object.fromEntries(def.stats.map(stat=>[stat.id,Math.floor((stat.min+stat.max)/2)]))});message.textContent='';refresh();};
 save.onclick=()=>{try{const item=validateGear(engine,bases,draft);if(!basesForSlot(bases,slot,bases.find(base=>base.id===getEquipment()['main-hand'])).some(base=>base.id===item.baseId))throw Error('This slot is no longer compatible.');setBase(slot,item.baseId);rows[slot]=item;const stored=persist();renderCards();dispatch();if(stored)status.textContent='Equipment saved with validated affixes.';dialog.close();}catch(error){message.textContent=error.message;}};
 cancel.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{const button=cards[slot]?.querySelector(':scope > button');(button??opener)?.focus();});
 search.addEventListener('keydown',event=>{if(event.key==='Enter'&&!add.disabled){event.preventDefault();add.click();search.focus();}});
 for(const slot of Object.keys(equipmentSlots)){const host=document.querySelector(`.gear-slot.${slot}`);host.querySelector('select').hidden=true;const content=document.createElement('div');content.className='gear-card-content';host.append(content);cards[slot]=content;}
 renderCards();
 return {render:renderCards,clear(slot){delete rows[slot];persist();renderCards();},getOverrides(){const result={};for(const [slot,row]of Object.entries(rows))if(row.baseId===getEquipment()[slot])result[slot]=gearCalculationOverride(engine,bases,row);return result;}};
}



