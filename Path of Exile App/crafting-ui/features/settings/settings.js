import { themePresets, presetFontStyles, identifyPreset, identifyFontStyle, choosePreset } from './theme-presets.js';
import { createThemeController } from './theme-controller.js';
// Internal editor foundation; theme controls will be added separately.
export const themeController = createThemeController({ root: document.documentElement });
import { createElementFactory } from '../../shared/ui/dom.js';
import { defaultSettings, settingsStorageKey, validateSettings } from './settings-model.js';

let settings;
let storageAvailable = true;
try { settings = validateSettings(JSON.parse(localStorage.getItem(settingsStorageKey))); }
catch { settings = { ...defaultSettings }; storageAvailable = false; }
function apply() {
  const root = document.documentElement;
  root.dataset.density = settings.density;
  root.dataset.textSize = settings.textSize;
  root.dataset.motion = settings.motion;
}
apply();

const open = document.createElement('button');
open.type = 'button';
open.id = 'settingsButton';
open.className = 'settings-launcher';
open.textContent = 'Settings';
open.setAttribute('aria-haspopup', 'dialog');
open.setAttribute('aria-controls', 'settingsDialog');
document.querySelector('.sidebar-note').before(open);
const dialog = document.createElement('dialog');
dialog.id = 'settingsDialog';
dialog.className = 'settings-dialog';
dialog.setAttribute('aria-labelledby', 'settingsTitle');
document.body.append(dialog);
const el = createElementFactory(dialog);
const header = el('div');
header.className = 'settings-header';
el('h2', 'Settings', header).id = 'settingsTitle';
const close = el('button', 'Close', header);
close.type = 'button';
close.setAttribute('aria-label', 'Close settings');
el('p', 'Preferences for this browser. Changes apply immediately; character and build saves are kept separately.');
const themeLabel = el('label', 'Color theme');
const themeSelect = el('select', '', themeLabel);
themeSelect.id = 'colorTheme';
for (const preset of [{id:'custom',label:'Custom theme'},...themePresets]) {
  const option = el('option', preset.label, themeSelect); option.value=preset.id;
  if (preset.id==='custom') option.disabled=true;
}
const fontLabel = el('label', 'Font style');
const fontSelect = el('select', '', fontLabel);
fontSelect.id = 'themeFont';
for (const [value,text] of [['theme','Theme default'],...Object.entries(presetFontStyles).map(([id,style])=>[id,style.label]),['custom','Custom fonts']]) {
  const option=el('option',text,fontSelect);option.value=value;if(value==='custom')option.disabled=true;
}
el('small', 'Themes change colors and fonts only. Equipped and unique item cards keep their game-reference colors and typography. Fonts use local installations with system fallbacks; nothing is downloaded.');
function syncThemeControls() {
  const current=themeController.getTheme();themeSelect.value=identifyPreset(current);fontSelect.value=identifyFontStyle(current);
}
syncThemeControls();
function saveTheme() {
  const current=themeController.getTheme();
  const next=themeSelect.value==='custom' ? {...current,fonts:presetFontStyles[fontSelect.value]?.fonts||current.fonts} : choosePreset(themeSelect.value,fontSelect.value,current);
  const result=themeController.save(next);
  syncThemeControls();
  status.textContent=result.persisted?'Theme saved on this device.':result.error;
}
themeSelect.onchange=saveTheme;
fontSelect.onchange=saveTheme;
const restoreTheme=el('button','Restore original theme');restoreTheme.type='button';
restoreTheme.onclick=()=>{const result=themeController.reset();syncThemeControls();status.textContent=result.persisted?'Original theme restored.':result.error;};
const controls = [];
function preference(label, key, choices, hint) {
  const field = el('label', label);
  const select = el('select', '', field);
  const description = el('small', hint, field);
  description.id = `settings-${key}-hint`;
  select.setAttribute('aria-describedby', description.id);
  for (const [value, text] of choices) {
    const option = el('option', text, select);
    option.value = value;
  }
  select.value = settings[key];
  select.onchange = () => { settings[key] = select.value; save(); };
  controls.push([key, select]);
}
preference('Display density', 'density', [['standard', 'Standard'], ['compact', 'Compact']], 'Compact reduces gaps in library panels and glossary rows.');
preference('Text size', 'textSize', [['standard', 'Standard'], ['large', 'Large']], 'Larger text for controls and reference cards. Browser zoom is also supported.');
preference('Motion', 'motion', [['system', 'Follow system'], ['reduced', 'Reduce motion']], 'Your operating system’s reduced-motion preference is always respected.');
const status = el('p');
status.className = 'settings-status';
status.setAttribute('role', 'status');
const reset = el('button', 'Reset preferences');
reset.type = 'button';
el('small', 'Resets only these preferences. Your saved characters, equipment, skill groups and tree are preserved.');
function save() {
  apply();
  try {
    localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    storageAvailable = true;
    status.textContent = 'Preferences saved on this device.';
  } catch {
    storageAvailable = false;
    status.textContent = 'Storage unavailable. Preferences apply until this page is reloaded.';
  }
}
reset.onclick = () => {
  settings = { ...defaultSettings };
  for (const [key, select] of controls) select.value = settings[key];
  save();
};
open.onclick = () => {
  syncThemeControls();
  status.textContent = storageAvailable ? '' : 'Storage unavailable. Preferences may not persist after reload.';
  if (!dialog.open) dialog.showModal();
};
close.onclick = () => dialog.close();
dialog.addEventListener('close', () => open.focus());
