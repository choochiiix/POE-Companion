import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {themePresets} from '../crafting-ui/features/settings/theme-presets.js';
const server=spawn(process.execPath,['renderer/server.mjs'],{env:{...process.env,RENDERER_PORT:'4328'},stdio:'ignore'});
process.on('exit',()=>server.kill());
await new Promise(r=>setTimeout(r,1000));
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(theme=>localStorage.setItem('poe-companion.theme.v1',JSON.stringify(theme)),themePresets[1].theme);
await page.goto('http://127.0.0.1:4328/');
for(const name of ['Character','Crafting','Skill tree','Skills','Item library','Compendium','Settings']) {await page.getByRole('button',{name,exact:true}).click(); assert.equal(await page.getByRole('button',{name,exact:true}).getAttribute('aria-current'),'page'); assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name);}
await page.getByRole('button',{name:'Character',exact:true}).click();
const trigger=page.getByRole('button',{name:'Open dialog'});await trigger.click();assert.equal(await page.getByRole('dialog').count(),1); console.log('theme backgrounds',await page.locator('.ui-panel').evaluate(e=>getComputedStyle(e).backgroundColor),await page.getByRole('dialog').evaluate(e=>getComputedStyle(e).backgroundColor));await page.keyboard.press('Escape');await page.waitForTimeout(200);assert.equal(await trigger.evaluate(e=>e===document.activeElement),true);
await mkdir('docs/previews/react-migration',{recursive:true});await page.screenshot({path:'docs/previews/react-migration/foundation-mobile.png'});
console.log('navigation mobile, dialog Escape/focus, overflow, errors:',errors);await browser.close(); server.kill();



