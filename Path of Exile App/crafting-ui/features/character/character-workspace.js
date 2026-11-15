import {classPortraitPath,ascendancyPortraitPath} from './character-data.js';
import {enhanceCharacterDropdowns,mountBubbleDialog} from '../../shared/ui/spring-dropdown.js';
import {mountPlanSwitch} from '../../shared/ui/plan-switch.js';
import {createElementFactory} from '../../shared/ui/dom.js';

// Character owns its layout. The calculation controller supplies values and actions.
export function mountCharacterWorkspace(){
 const panel=document.querySelector('#characterPanel'),oldClass=panel.querySelector('.character-creator'),loadout=panel.querySelector('.loadout-panel');
 const root=document.createElement('section');root.className='calculation-section character-workspace';root.setAttribute('aria-label','Build calculations');
 const el=createElementFactory(root);
 const banner=el('div','');banner.className='character-banner';const bannerArt=el('img','',banner);bannerArt.className='character-banner-art';bannerArt.alt='';bannerArt.hidden=true;const header=el('header','',banner);header.className='calculation-header';const heading=el('div','',header);el('small','CHARACTER / OVERVIEW',heading);el('h2','Character',heading);
 const open=el('button','Combat assumptions',header);open.type='button';
 const identity=el('div','',banner);identity.className='calculation-identity';
 const portrait=el('span','',identity);portrait.className='calculation-portrait';portrait.setAttribute('aria-hidden','true');
 const identityText=el('div','',identity),identityName=el('h3','',identityText),identityDescription=el('p','',identityText),identitySkill=el('div','',identity);identitySkill.className='calculation-identity-skill';
 const editCharacter=el('button','Edit character',identity);editCharacter.type='button';
 const characterEditor=document.createElement('dialog');characterEditor.className='calculation-dialog character-design-dialog character-identity-editor';characterEditor.setAttribute('aria-label','Edit character');document.body.append(characterEditor);characterEditor.append(oldClass);
 const picker=oldClass.querySelector('.class-picker'),nativeLabel=picker.querySelector('label');nativeLabel.hidden=false;picker.querySelector('#classChoices').remove();picker.querySelector('.field-caption').remove();nativeLabel.querySelector('select').hidden=false;oldClass.querySelector('h2').textContent='Edit character';oldClass.querySelector('.section-description').textContent='Manage your class, ascendancy and progression. Changes save automatically.';
 const preview=oldClass.querySelector('.character-summary');oldClass.querySelector('.character-controls').before(preview);const previewImage=document.createElement('img');previewImage.alt='';previewImage.className='character-editor-art';previewImage.hidden=true;const previewFrame=document.createElement('span');previewFrame.className='character-editor-portrait';previewFrame.append(previewImage);preview.prepend(previewFrame);
 const progression=el('div','',oldClass);progression.className='character-progression';const characterLevel=el('input','',el('label','Character level',progression));characterLevel.type='number';characterLevel.min='1';characterLevel.max='100';characterLevel.step='1';characterLevel.required=true;const campaignPenalty=el('select','',el('label','Campaign resistance penalty',progression));for(const [v,t]of [['0','Before Act 5 · no penalty'],['-30','After Act 5 · −30%'],['-60','After Act 10 · −60%']])campaignPenalty.add(new Option(t,v));el('p','Level updates your build statistics. Class and ascendancy keep their own passive-tree selections.',oldClass).className='character-editor-hint';const editorStatus=el('p','',oldClass);editorStatus.setAttribute('role','status');editorStatus.id='characterContextStatus';oldClass.append(oldClass.querySelector('small'));
 const footer=el('div','',characterEditor);footer.className='character-editor-footer';el('span','Changes apply immediately',footer);const finishEdit=el('button','Return to character',footer);const bubble=mountBubbleDialog(characterEditor,editCharacter);finishEdit.onclick=bubble.close;editCharacter.onclick=bubble.open;
 const views=el('nav','');views.className='calculation-view-tabs';views.setAttribute('aria-label','Character views');const overview=el('button','Character overview',views);overview.type='button';overview.setAttribute('aria-pressed','true');const compareView=el('button','Equipment comparison',views);compareView.type='button';
 const workspace=el('div','');workspace.className='calculation-main-grid';const main=el('div','',workspace);main.className='character-stat-column';
 const statsPanel=el('section','',main);statsPanel.className='character-panel';el('h3','Core statistics',statsPanel);const summary=el('div','',statsPanel);summary.className='calculation-summary';
 const attributesPanel=el('section','',main);attributesPanel.className='character-panel character-attributes';el('h3','Attributes',attributesPanel);const attributeValues=el('dl','',attributesPanel);attributeValues.className='character-attribute-values';
 const details=el('details','',main);details.className='calculation-detail';el('summary','Stat breakdown',details);const inspector=el('div','',details);details.open=false;
 loadout.querySelector('h2').textContent='Equipment';workspace.append(loadout);
 const flaskDetails=el('details','',loadout);flaskDetails.className='calculation-flasks';el('summary','Flasks · not yet calculated',flaskDetails);loadout.querySelector('h3')?.remove();flaskDetails.append(loadout.querySelector('.flask-slots'));loadout.append(flaskDetails);
 const bottom=el('div','');bottom.className='calculation-bottom-grid';const resistPanel=el('section','',bottom);el('h3','Resistances',resistPanel);const resistValues=el('div','',resistPanel);resistValues.className='calculation-resist-values';const skillsPanel=el('section','',bottom);el('h3','Skill setup',skillsPanel);const skillSetup=el('p','',skillsPanel);const chooseSkill=el('button','Choose skill / combat context',skillsPanel);chooseSkill.onclick=()=>open.click();
 const notice=el('p','Loading local calculation sources…');notice.className='calculation-notice';notice.setAttribute('role','status');const comparisonPanel=el('section','');comparisonPanel.className='calculation-comparison-view';comparisonPanel.hidden=true;
 const availableArt=new Set(['Ascendant','Assassin','Berserker','Champion','Chieftain','Deadeye','Elementalist','Gladiator','Guardian','Hierophant','Inquisitor','Juggernaut','Necromancer','Occultist','Pathfinder','Saboteur','Slayer','Trickster','Warden']);
 function updateCharacterArtwork(character){
  const name=character.ascendancy,available=availableArt.has(name);banner.dataset.ascendancy=name||'';
  if(!available){previewImage.hidden=false;previewImage.src=classPortraitPath(character.characterClass);bannerArt.hidden=true;bannerArt.removeAttribute('src');const baseIcon=document.createElement('img');baseIcon.src=classPortraitPath(character.characterClass);baseIcon.alt='';portrait.replaceChildren(baseIcon);portrait.classList.add('has-art');return;}
  const source=name==='Ascendant'?ascendancyPortraitPath(name):`/assets/ascendancies/${name.toLowerCase()}.png`;
  if(bannerArt.getAttribute('src')!==source){bannerArt.src=source;const icon=document.createElement('img');icon.src=ascendancyPortraitPath(name);icon.alt='';portrait.replaceChildren(icon);}
  portrait.classList.add('has-art');bannerArt.hidden=false;previewImage.src=ascendancyPortraitPath(name);previewImage.hidden=false;
  bannerArt.onerror=()=>{bannerArt.hidden=true;portrait.textContent=character.characterClass[0];portrait.classList.remove('has-art');};
 }
 panel.replaceChildren(root);panel.classList.add('calculation-workbench');mountPlanSwitch(views);enhanceCharacterDropdowns();
 return {root,el,open,portrait,identityName,identityDescription,identitySkill,summary,details,inspector,workspace,bottom,resistValues,skillSetup,overview,compareView,comparisonPanel,notice,attributeValues,updateCharacterArtwork,characterLevel,campaignPenalty};
}
