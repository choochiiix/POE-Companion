import {mountCharacterWorkspace} from '../character/character-workspace.js';
import {assembleWorkspace,compareWorkspace,midpointText} from './source-adapter.js';
import {getCalculationGroups} from '../skills/skills.js';
import {getCalculationTreeSelection} from '../tree/tree.js';
import {basesForSlot} from '../character/character-data.js';

const contextKey='poe-companion.calculation.v1';
const defaults={version:1,level:1,groupId:'',gemEndpoint:'first',penalty:0,enemyResistance:0,enemyArmour:0,enemyEvasion:0,enemyAccuracy:0,incomingHit:100,overrides:{}};
export function validContext(value){
  const result={...defaults,overrides:{}};
  if(value?.version!==1)return result;
  for(const [key,min,max] of [['level',1,100],['penalty',-60,0],['enemyResistance',-200,90],['enemyArmour',0,1e9],['enemyEvasion',0,1e9],['enemyAccuracy',0,1e9],['incomingHit',0,1e9]])if(Number.isFinite(value[key])&&value[key]>=min&&value[key]<=max&&(key!=='level'||Number.isInteger(value[key])))result[key]=value[key];
  result.groupId=typeof value.groupId==='string'?value.groupId.slice(0,100):'';
  result.gemEndpoint=value.gemEndpoint==='maximum'?'maximum':'first';
  for(const [slot,item] of Object.entries(value.overrides??{}))if(item&&typeof item.baseId==='string'&&typeof item.name==='string'&&Array.isArray(item.lines)&&item.lines.length<=100){result.overrides[slot]={baseId:item.baseId,name:item.name.slice(0,200),lines:item.lines.filter(text=>typeof text==='string').map(text=>text.slice(0,500)),rawStats:Object.fromEntries(Object.entries(item.rawStats??{}).filter(([,value])=>Number.isFinite(value)))};}
  return result;
}
export async function startCalculations(api){
  const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/features/calculations/calculations.css';document.head.append(sheet);
  const characterSheet=document.createElement('link');characterSheet.rel='stylesheet';characterSheet.href='/features/character/character-workspace.css';document.head.append(characterSheet);
  const {root,el,open,portrait,identityName,identityDescription,identitySkill,summary,details,inspector,workspace,bottom,resistValues,skillSetup,overview,compareView,comparisonPanel,notice,attributeValues,updateCharacterArtwork,characterLevel,campaignPenalty}=mountCharacterWorkspace();
  overview.onclick=()=>{workspace.hidden=false;bottom.hidden=false;summary.hidden=false;comparisonPanel.hidden=true;overview.setAttribute('aria-pressed','true');compareView.setAttribute('aria-pressed','false');};
  compareView.onclick=()=>{workspace.hidden=true;bottom.hidden=true;summary.hidden=true;comparisonPanel.hidden=false;comparisonPanel.replaceChildren();el('h3','Compare equipment against your build',comparisonPanel);el('p','Choose an item from the Item library or your current craft. The comparison uses this same skill, tree and combat context.',comparisonPanel);const browse=el('button','Choose from Item library',comparisonPanel);browse.onclick=()=>document.querySelector('[aria-controls="catalogPanel"]').click();if(candidate){const compareAgain=el('button',`Compare ${candidate.name} again`,comparisonPanel);compareAgain.onclick=()=>{renderComparison();comparison.showModal();};}compareView.setAttribute('aria-pressed','true');overview.setAttribute('aria-pressed','false');};
  const dialog=el('dialog','',document.body);dialog.className='calculation-dialog character-design-dialog';dialog.setAttribute('aria-label','Combat assumptions');el('h2','Combat assumptions',dialog);
  el('p','Changes update this build immediately. Calculation preferences are saved separately from character, tree and skill saves.',dialog);
  const controls=el('div','',dialog);controls.className='calculation-controls';
  let context;try{context=validContext(JSON.parse(localStorage.getItem(contextKey)));}catch{context=validContext(null);}
  let storageIssue='',sources,last,selectedStat='hitDps',candidate;
  const fields={};
  function select(key,label,options){const node=el('select','',el('label',label,controls));for(const [value,text]of options)node.add(new Option(text,value));fields[key]=node;node.value=context[key];return node;}
  function number(key,label,min,max){const node=el('input','',el('label',label,controls));node.type='number';node.min=min;node.max=max;node.step='1';node.value=context[key];fields[key]=node;return node;}
  const groupPicker=select('groupId','Damage skill / saved group',[['','No damage skill'],['default-attack','Default weapon attack']]);
  select('gemEndpoint','Gem level endpoint',[['first','Level 1 · quality 0'],['maximum','Natural maximum · quality 0']]);
  number('level','Character level',1,100);select('penalty','Campaign resistance penalty',[['0','None'],['-30','After Act 5 · −30%'],['-60','After Act 10 · −60%']]);
  number('enemyResistance','Enemy effective resistance · all types',-200,90);number('enemyArmour','Enemy armour',0,1e9);number('enemyEvasion','Enemy evasion',0,1e9);number('enemyAccuracy','Enemy accuracy',0,1e9);number('incomingHit','Incoming physical hit',0,1e9);
  el('p','Base equipment uses midpoint ranges and zero quality. Socket/link legality, sustain, recovery, ailments and special rules remain incomplete. Values are partial estimates, not a full PoB simulation.',dialog);
  const close=el('button','Return to build',dialog);close.type='button';close.onclick=()=>dialog.close();
  open.onclick=()=>dialog.showModal();dialog.addEventListener('close',()=>open.focus());
  function save(){try{localStorage.setItem(contextKey,JSON.stringify(context));storageIssue='';}catch{storageIssue='Storage unavailable; calculation preferences last for this session.';}}
  controls.addEventListener('change',event=>{const node=event.target;if(!node.checkValidity()){node.reportValidity();return;}const next={...context};for(const [key,node]of Object.entries(fields))next[key]=['groupId','gemEndpoint'].includes(key)?node.value:Number(node.value);context=validContext(next);save();render();});
  function syncCharacterContext(){document.querySelector('#characterIdentity').textContent=`${api.getCharacter().characterClass} · Level ${context.level}`;characterLevel.value=context.level;campaignPenalty.value=context.penalty;campaignPenalty.dispatchEvent(new Event('spring-select:sync'));for(const [key,node]of Object.entries(fields)){node.value=context[key];if(node.tagName==='SELECT')node.dispatchEvent(new Event('spring-select:sync'));}const status=document.querySelector('#characterContextStatus');if(status)status.textContent=storageIssue;}
  for(const [node,key]of [[characterLevel,'level'],[campaignPenalty,'penalty']])node.addEventListener('change',()=>{if(!node.checkValidity()||!Number.isInteger(Number(node.value))){node.reportValidity();return;}context=validContext({...context,[key]:Number(node.value)});save();syncCharacterContext();render();});
  syncCharacterContext();
  const comparison=el('dialog','',document.body);comparison.className='calculation-dialog';comparison.setAttribute('aria-label','Equipment comparison');const compareBody=el('div','',comparison);
  const target=el('select','',el('label','Target equipment slot',comparison));const apply=el('button','Equip for calculations',comparison);apply.type='button';const dismiss=el('button','Close comparison',comparison);dismiss.type='button';dismiss.onclick=()=>comparison.close();
  let returnFocus;
  comparison.addEventListener('close',()=>returnFocus?.isConnected&&returnFocus.focus());
  const format=value=>value===null||value===undefined?'Pending':Number(value).toLocaleString(undefined,{maximumFractionDigits:2});
  function sourceName(id){
    if(id.startsWith('passive:'))return sources?.tree.nodes[id.slice(8)]?.name??'Passive node';
    if(id.startsWith('support:')||id.startsWith('skill:'))return sources?.gems.find(gem=>gem.id===id.slice(id.indexOf(':')+1))?.name??'Selected skill';
    if(id==='derived:ordinary-attributes')return 'Attribute bonuses';
    if(id.startsWith('equipment')){const slot=id.slice(id.indexOf(':')+1);return context.overrides[slot]?.name??sources?.data.bases[api.getEquipment()[slot]]?.name??slot;}
    return id==='calculation-coverage'?'Calculation coverage':id;
  }
  function input(){
    const character=api.getCharacter(),equipment=api.getEquipment(),cls=sources.tree.classes.find(row=>row.name===character.characterClass);
    const asc=cls.ascendancies.find(row=>row.name===character.ascendancy)?.id??'';
    const key=`poe.tree.3_29.${cls.name}.${asc}`;let selection=getCalculationTreeSelection(key);
    if(!selection){try{selection=JSON.parse(localStorage.getItem(key));}catch{}selection??={selected:[],masteries:{}};}
    return {character,equipment,selection,groups:getCalculationGroups(),context,overrides:{...context.overrides,...api.getDetailedEquipment?.()},...sources};
  }
  function inspect(){
    inspector.replaceChildren();if(!last)return;
    const result=last.calculation,stats={life:'Life',mana:'Mana',armour:'Armour',evasion:'Evasion',hitDps:'Hit DPS'};el('h3',stats[selectedStat],inspector);
    const dl=el('dl','',inspector);const row=(name,value)=>{el('dt',name,dl);el('dd',value,dl);};
    if(selectedStat==='hitDps'){
      const offence=result.offence;if(!offence)row('Damage skill','Pending · select a supported skill');else{
        row('Selected skill',last.skillLabel);row('Average landed hit incl. crits',format(offence.averageHit));row('Hit chance',format(offence.chanceToHit)+'%');row('Actions / second',format(offence.rate));row('Hit DPS',format(offence.dps));row('Effective critical chance',format(offence.effectiveCriticalChance)+'%');
        for(const part of offence.damage)if(part.average)row(`${part.type} damage`,`${format(part.min.value)}–${format(part.max.value)}`);
      }
    }else{const breakdown=result.defence.pools[selectedStat];row('Base incl. flat additions',format(breakdown.base));row('Increased / reduced',format(breakdown.increased)+'%');row('More / less multiplier',format(breakdown.more));row('Final · snapshot rounding',format(breakdown.value));}
    const total=el('div','',inspector);total.className='calculation-selected-total';total.textContent=format(selectedStat==='hitDps'?result.offence?.dps:result.defence.pools[selectedStat].value);inspector.insertBefore(total,dl);
    el('h4','Modifier sources',inspector);const list=el('ul','',inspector);list.className='calculation-breakdown-list';
    const contributions=selectedStat==='hitDps'?(result.offence?.damage.flatMap(part=>part.min.contributions)??[]):result.defence.pools[selectedStat].contributions;
    for(const mod of [...new Map(contributions.map(mod=>[`${mod.sourceId}:${mod.id}`,mod])).values()])el('li',`${sourceName(mod.sourceId)} · ${mod.stat.replace(/([A-Z])/g,' $1').toLowerCase()} · ${{BASE:'flat',INC:'increased/reduced',MORE:'more/less'}[mod.kind]} ${mod.value}`,list);
    if(!contributions.length)el('li','No applicable modifiers.',list);
    const coverage=el('details','',inspector);el('summary','Coverage and unresolved effects',coverage);const issues=el('ul','',coverage);issues.className='calculation-breakdown-list';for(const diagnostic of result.diagnostics)el('li',`${sourceName(diagnostic.sourceId)}: ${diagnostic.effect}`,issues);
    for(const assumption of result.assumptions)el('p',assumption,coverage);
  }
  function render(){syncCharacterContext();
    if(!sources)return;
    const groups=getCalculationGroups();groupPicker.replaceChildren(new Option('No damage skill',''),new Option('Default weapon attack','default-attack'));for(const group of groups)groupPicker.add(new Option(group.name,group.id));groupPicker.value=context.groupId;
    summary.replaceChildren();
    try{
      last=assembleWorkspace(input());notice.textContent=`Partial build calculation · ${last.skillLabel} · level ${context.level}. ${storageIssue} Midpoint base rolls; unsupported effects are listed below.`;
      const character=api.getCharacter();updateCharacterArtwork(character);identityName.textContent=`${character.characterClass} · Level ${context.level}`;identityDescription.textContent=character.ascendancy||'No ascendancy';identitySkill.textContent=`SELECTED SKILL · ${last.skillLabel}`;skillSetup.textContent=`${last.skillLabel} · ${context.gemEndpoint==='maximum'?'Natural maximum':'Level 1'} · Quality 0`;
      attributeValues.replaceChildren();for(const [name,value] of Object.entries(last.assembly.attributes)){el('dt',name,attributeValues);el('dd',format(value.value),attributeValues);}
      resistValues.replaceChildren();for(const [type,res]of Object.entries(last.calculation.defence.resistances)){const cell=el('div','',resistValues);el('span',type,cell);el('strong',`${format(res.effective)}%`,cell);}
      const result=last.calculation;for(const [stat,label,value]of [['hitDps','Hit DPS',result.offence?.dps??null],['life','Life',result.defence.pools.life.value],['mana','Mana',result.defence.pools.mana.value],['armour','Armour',result.defence.pools.armour.value],['evasion','Evasion',result.defence.pools.evasion.value]]){const button=el('button','',summary);button.type='button';button.className='calculation-stat';button.setAttribute('aria-pressed',String(selectedStat===stat));el('span',label,button);el('strong',format(value),button);button.onclick=()=>{selectedStat=stat;details.open=true;inspect();for(const b of summary.children)b.setAttribute('aria-pressed',String(b===button));};}
      inspect();if(comparison.open)renderComparison();
    }catch(error){last=null;inspector.replaceChildren();notice.textContent=`Calculation unavailable: ${error.message}. Existing character and equipment selections remain available.`;}
  }
  function renderComparison(){
    compareBody.replaceChildren();apply.disabled=true;if(!candidate||!last)return;
    el('h2',`Compare ${candidate.name}`,compareBody);
    try{const result=compareWorkspace(input(),target.value,candidate);const table=el('table','',compareBody);const head=el('tr','',el('thead','',table));for(const label of ['Stat','Current','Candidate','Change'])el('th',label,head);const body=el('tbody','',table);
      for(const change of result.changes){const row=el('tr','',body);for(const value of [change.stat,format(change.before),format(change.after),change.delta===null?'Pending':`${change.delta>0?'+':''}${format(change.delta)}`])el('td',value,row);}
      el('p','Partial comparison · unresolved effects can change the outcome. Equipping keeps the base selection in Equipment and detailed modifiers in separate calculation preferences.',compareBody);
      const list=el('ul','',compareBody);list.className='calculation-breakdown-list';for(const issue of result.candidate.calculation.diagnostics)el('li',`${sourceName(issue.sourceId)}: ${issue.effect}`,list);
      apply.disabled=false;
    }catch(error){el('p',`Comparison unavailable: ${error.message}`,compareBody);}
  }
  target.onchange=renderComparison;
  apply.onclick=()=>{if(!candidate)return;context.overrides[target.value]=structuredClone(candidate);save();api.equip(target.value,candidate.baseId);comparison.close();render();};
  document.addEventListener('calculation:compare',event=>{
    if(!sources){notice.textContent='Calculation sources are still loading.';return;}
    candidate=structuredClone(event.detail);const base=sources.data.bases[candidate.baseId];if(!base){window.alert('This item base is outside the supported equipment dataset.');return;}
    target.replaceChildren();for(const [slot,classes]of Object.entries(api.slots))if(classes.includes(base.itemClass)&&basesForSlot(Object.values(sources.data.bases),slot,sources.data.bases[api.getEquipment()['main-hand']]).some(row=>row.id===base.id))target.add(new Option(slot,slot));if(!target.options.length)return;
    returnFocus=document.activeElement;renderComparison();comparison.showModal();
  });
  document.addEventListener('build:change',()=>queueMicrotask(render));
  document.addEventListener('equipment:editor-change',event=>{if(context.overrides[event.detail.slot]){delete context.overrides[event.detail.slot];save();}});
  document.addEventListener('calculation:select-group',event=>{context.groupId=event.detail.groupId;save();render();document.querySelector('#characterTab').click();details.open=true;});
  document.addEventListener('change',event=>{const container=event.target.closest('.gear-slot');if(!container)return;const slot=Object.keys(api.slots).find(slot=>container.classList.contains(slot));if(slot&&context.overrides[slot]){delete context.overrides[slot];save();render();}});
  window.addEventListener('storage',()=>{try{context=validContext(JSON.parse(localStorage.getItem(contextKey)));}catch{}for(const [key,node]of Object.entries(fields))node.value=context[key];render();});
  try{const files=await Promise.all(['/calculation-data.json','/tree-data/tree-view.json','/skills-data.json'].map(async path=>{const response=await fetch(path);if(!response.ok)throw Error(`Local source unavailable: ${path}`);return response.json();}));sources={data:files[0],tree:files[1],gems:files[2].gems};render();}catch(error){notice.textContent=`Calculations could not load: ${error.message}. Reload to retry.`;open.disabled=true;}
}

