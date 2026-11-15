import { showTree } from '../tree/tree.js';
import '../items/catalog.js';
import '../skills/skills.js';
import '../compendium/compendium.js';
import { classPortraitPath,ascendancyPortraitPath,characterClasses, validCharacter, equipmentSlots, basesForSlot, validEquipment } from './character-data.js';
import { startCalculations } from '../calculations/calculations.js';
import {mountGearEditor} from './gear-editor.js';

const key = 'poe-companion.character.v1';
let character = validCharacter(null);
try { character = validCharacter(JSON.parse(localStorage.getItem(key))); } catch { /* Use defaults. */ }
const classSelect = document.querySelector('#characterClass');
const ascendancySelect = document.querySelector('#characterAscendancy');
for (const name of Object.keys(characterClasses)){const option=new Option(name,name);option.dataset.image=classPortraitPath(name);classSelect.add(option);}

function render() {
  classSelect.value = character.characterClass;
  const unascended=new Option('Not ascended','');unascended.dataset.image=classPortraitPath(character.characterClass);ascendancySelect.replaceChildren(unascended);
  for (const name of characterClasses[character.characterClass]) {
    const option=new Option(name,name);const image=ascendancyPortraitPath(name);option.dataset.image=image||classPortraitPath(character.characterClass);if(!image)option.title='Ascendancy artwork unavailable; showing the base-class icon';ascendancySelect.add(option);
  }
  ascendancySelect.value = character.ascendancy;
  document.querySelector('#characterIdentity').textContent = character.characterClass;
  document.querySelector('#characterSpecialization').textContent = character.ascendancy || 'Not ascended';
}
function save() {
  render();
  document.dispatchEvent(new CustomEvent('build:change'));
  const status = document.querySelector('#characterSaveStatus');
  try {
    localStorage.setItem(key, JSON.stringify(character));
    status.textContent = 'Character saved on this device.';
  } catch { status.textContent = 'Storage unavailable. Your selection lasts until you close or reload this page.'; }
}
classSelect.addEventListener('change', () => {
  character = validCharacter({ characterClass: classSelect.value });
  save();
});
ascendancySelect.addEventListener('change', () => {
  character = validCharacter({ characterClass: classSelect.value, ascendancy: ascendancySelect.value });
  save();
});
document.addEventListener('workspace:change', event => {
  if (event.detail.panelId === 'treePanel') requestAnimationFrame(() => showTree());
});

render();

const gearKey = 'poe-companion.equipment.v1';
const gearStatus = document.querySelector('#equipmentStatus');
const gearSelects = {};
let equipment = {};
let bases = [];
let gearEditor;
for (const slot of Object.keys(equipmentSlots)) {
  const container = document.querySelector(`.gear-slot.${slot}`);
  const heading = container.querySelector('strong');
  const select = document.createElement('select');
  select.setAttribute('aria-label', `${heading.textContent} base`);
  select.disabled = true;
  select.add(new Option('Loading…', ''));
  container.querySelector('span').replaceWith(select);
  gearSelects[slot] = select;
  select.addEventListener('change', () => {
    equipment[slot] = select.value;
    const previousOffHand = equipment['off-hand'];
    equipment = validEquipment(equipment, bases);
    gearEditor?.clear(slot);
    renderEquipment();
    document.dispatchEvent(new CustomEvent('build:change'));
    try {
      localStorage.setItem(gearKey, JSON.stringify(equipment));
      gearStatus.textContent = previousOffHand && !equipment['off-hand']
        ? 'Bases saved. Off hand cleared because it is incompatible with the main hand.'
        : 'Equipment bases saved on this device.';
    } catch { gearStatus.textContent = 'Storage unavailable. Choices will be lost on reload.'; }
  });
}
function renderEquipment() {
  const mainHand = bases.find((base) => base.id === equipment['main-hand']);
  for (const [slot, select] of Object.entries(gearSelects)) {
    const options = basesForSlot(bases, slot, mainHand);
    select.replaceChildren(new Option(options.length ? 'Empty' : 'Unavailable', ''));
    for (const itemClass of new Set(options.map((base) => base.itemClass))) {
      const group = document.createElement('optgroup');
      group.label = itemClass;
      for (const base of options.filter((base) => base.itemClass === itemClass)) {
        group.append(new Option(base.name, base.id));
      }
      select.append(group);
    }
    select.value = equipment[slot];
    select.disabled = options.length === 0;
    select.title = bases.find((base) => base.id === equipment[slot])?.name ||
      (options.length ? 'Choose an equipment base' : 'This main hand uses both hands');
    select.closest('.gear-slot').classList.toggle('has-base', Boolean(equipment[slot]));
  }
  gearEditor?.render();
}
function equipBase(slot,id,clearComparison=true){gearEditor?.clear(slot);equipment=validEquipment({...equipment,[slot]:id},bases);renderEquipment();try{localStorage.setItem(gearKey,JSON.stringify(equipment));}catch{gearStatus.textContent='Equipment updated for this session; storage unavailable.';}if(clearComparison)document.dispatchEvent(new CustomEvent('equipment:editor-change',{detail:{slot}}));document.dispatchEvent(new CustomEvent('build:change'));}
async function loadEquipment() {
  try {
    const response = await fetch('/data/repoe-poe1.json');
    if (!response.ok) throw new Error('Unable to load bases');
    const dataset=await response.json();bases = dataset.bases;
    let saved;
    try { saved = JSON.parse(localStorage.getItem(gearKey)); } catch { /* Use empty slots. */ }
    equipment = validEquipment(saved, bases);
    renderEquipment();
    gearStatus.textContent = 'Add or edit equipment. Affixes follow the base and item level; character requirements are not checked.';
    const presentationSource=await fetch('/calculation-data.json').then(response=>response.ok?response.json():{bases:{}}).catch(()=>({bases:{}}));
    gearEditor=mountGearEditor({bases,mods:dataset.mods,sourceBases:presentationSource.bases,getEquipment:()=>({...equipment}),setBase:equipBase,status:gearStatus});
    document.dispatchEvent(new CustomEvent('build:change'));
  } catch {
    gearStatus.textContent = 'Equipment bases could not load. Reload the page to try again.';
    for (const select of Object.values(gearSelects)) select.replaceChildren(new Option('Unavailable', ''));
  }
}
loadEquipment();
startCalculations({getCharacter:()=>({...character}),getEquipment:()=>({...equipment}),getDetailedEquipment:()=>gearEditor?.getOverrides()??{},equip:(slot,id)=>equipBase(slot,id,false),slots:equipmentSlots});




