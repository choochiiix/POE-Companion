import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {makeServer} from '../crafting-ui/server.mjs';
import {themePresets} from '../crafting-ui/features/settings/theme-presets.js';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=makeServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));const origin=`http://127.0.0.1:${server.address().port}`;await page.route('**/*',r=>{if(!r.request().url().startsWith(origin)){external.push(r.request().url());return r.abort()}return r.continue()});
 await page.goto(origin);await page.getByRole('button',{name:'Settings',exact:true}).click();
 const select=page.locator('#colorTheme'),font=page.locator('#themeFont');
 const original=await page.locator('html').evaluate(n=>['--radius-sm','--space-1','--text-base'].map(k=>getComputedStyle(n).getPropertyValue(k)));
 for(const preset of themePresets){await select.selectOption(preset.id);assert.equal(await select.inputValue(),preset.id);const bg=await page.locator('html').evaluate(n=>n.style.getPropertyValue('--bg'));assert.equal(bg,preset.theme.colors['--bg']||'');assert.deepEqual(await page.locator('html').evaluate(n=>['--radius-sm','--space-1','--text-base'].map(k=>getComputedStyle(n).getPropertyValue(k))),original);}
 await select.selectOption('tokyo-night');await font.selectOption('fira-code');await page.reload();await page.getByRole('button',{name:'Settings',exact:true}).click();assert.equal(await select.inputValue(),'tokyo-night');assert.equal(await font.inputValue(),'fira-code');
 await page.screenshot({path:'docs/previews/theme-presets.png'});
 await page.getByRole('button',{name:'Restore original theme',exact:true}).click();assert.equal(await select.inputValue(),'ayu-aurora');assert.equal(await font.inputValue(),'theme');
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('Preset UI passed: all 11 palettes, independent fonts, persistence, original reset, unchanged geometry, narrow layout and zero remote requests.');
}finally{await browser?.close();await new Promise(r=>server.close(r))}
