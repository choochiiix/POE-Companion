import test from 'node:test';
import assert from 'node:assert/strict';
import {themePresets,choosePreset,identifyPreset,identifyFontStyle,presetFontStyles} from '../features/settings/theme-presets.js';
import {validateTheme} from '../features/settings/theme-model.js';
test('ten sourced palettes plus the original theme contain only valid appearance tokens',()=>{
  assert.equal(themePresets.length,11);
  assert.equal(new Set(themePresets.map(p=>p.id)).size,11);
  for(const preset of themePresets){assert.deepEqual(validateTheme(preset.theme),preset.theme);assert.equal(identifyPreset(preset.theme),preset.id);assert.equal(identifyFontStyle(preset.theme),'theme');assert.ok(Object.keys(preset.theme.colors).every(k=>!/(radius|space|size|width|height)/.test(k)));}
  assert.equal(choosePreset('dracula').colors['--bg'],'#282a36');
  assert.equal(choosePreset('tokyo-night').colors['--bg'],'#1a1b26');
  assert.throws(()=>choosePreset('missing'));
});
test('font styles are independent of palettes and switching does not mutate presets',()=>{
  for(const id of Object.keys(presetFontStyles)){
    const changed=choosePreset('night-owl',id);
    assert.equal(identifyPreset(changed),'night-owl');
    assert.equal(identifyFontStyle(changed),id==='system'?'system':id);
  }
  const changed=choosePreset('dracula','mono');changed.colors['--bg']='#000000';
  assert.equal(choosePreset('dracula').colors['--bg'],'#282a36');
  assert.deepEqual(choosePreset('ayu-aurora'),{version:1,colors:{},fonts:{}});
});
