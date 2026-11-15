import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultTheme, validateTheme, importTheme, exportTheme, themeStorageKey } from '../features/settings/theme-model.js';
import { createThemeController } from '../features/settings/theme-controller.js';

function fixture() {
  const values=new Map([['--radius-sm','12px']]);
  const data=new Map([['poe-companion.skills.v1','untouched']]);
  const root={style:{getPropertyValue:key=>values.get(key)||'',getPropertyPriority:()=>'',setProperty:(key,value)=>values.set(key,value),removeProperty:key=>values.delete(key)}};
  const storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
  return {root,values,data,storage};
}
const custom={version:1,colors:{'--accent':'#abcdef','--bg':'#123'},fonts:{'--font-ui':'serif'}};
test('theme imports allow only color and local-font choices, never geometry or CSS',()=>{
  assert.deepEqual(importTheme(exportTheme(custom)),custom);
  for (const value of [null,{version:2},{...custom,spacing:2},{version:1,colors:{'--radius-sm':'#fff'}},{version:1,colors:{'--bg':'url(https://example.com)'}},{version:1,fonts:{'--font-ui':'Arial;display:none'}},{version:1,fonts:{'--font-ui':'constructor'}}]) assert.throws(()=>validateTheme(value));
  assert.throws(()=>importTheme('x'.repeat(16385)));
});
test('theme previews cancel, save persists, reset preserves other keys and geometry',()=>{
  const {root,values,data,storage}=fixture();
  const controller=createThemeController({root,getStorage:()=>storage});
  assert.deepEqual(controller.getTheme(),defaultTheme());
  controller.import(exportTheme(custom));
  assert.equal(values.get('--accent'),'#abcdef');
  assert.equal(data.has(themeStorageKey),false);
  controller.cancelPreview();
  assert.equal(values.has('--accent'),false);
  assert.equal(controller.save(custom).persisted,true);
  const copy=controller.getTheme();copy.colors['--accent']='#000';
  assert.equal(controller.getTheme().colors['--accent'],'#abcdef');
  const restored=createThemeController({root,getStorage:()=>storage});
  assert.deepEqual(restored.getTheme(),custom);
  controller.reset();
  assert.equal(values.has('--accent'),false);
  assert.equal(values.get('--radius-sm'),'12px');
  assert.equal(data.get('poe-companion.skills.v1'),'untouched');
});
test('invalid stored themes and unavailable storage leave a usable default/session theme',()=>{
  const {root,values,storage,data}=fixture();data.set(themeStorageKey,'broken JSON');
  const controller=createThemeController({root,getStorage:()=>storage});
  assert.ok(controller.getError());
  assert.deepEqual(controller.getTheme(),defaultTheme());
  assert.throws(()=>controller.preview({version:1,colors:{'--bg':'red;display:none'}}));
  assert.equal(values.has('--bg'),false);
  const blocked=createThemeController({root,getStorage:()=>{throw Error('denied')}});
  assert.equal(blocked.save(custom).persisted,false);
  assert.equal(values.get('--bg'),'#123');
  blocked.cancelPreview();
  assert.equal(values.get('--bg'),'#123');
});
