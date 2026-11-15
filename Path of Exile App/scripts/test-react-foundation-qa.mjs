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
const errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',request=>request.request().url().startsWith('http://127.0.0.1:4328/')?request.continue():(external.push(request.request().url()),request.abort()));
await page.addInitScript(theme=>localStorage.setItem('poe-companion.theme.v1',JSON.stringify(theme)),themePresets[1].theme);
await page.goto('http://127.0.0.1:4328/');
const nav=page.getByRole('navigation',{name:'App sections'});
for(const name of ['Character','Crafting','Skill tree','Skills','Item library','Compendium']) {const button=nav.getByRole('button',{name,exact:true});await button.click();assert.equal(await button.getAttribute('aria-current'),'page',name);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,name);}
const settings=nav.getByRole('button',{name:'Settings',exact:true});await settings.click();const settingsDialog=page.getByRole('dialog',{name:'Settings'});await settingsDialog.waitFor();assert.equal(await page.locator('.app-sidebar button[aria-current="page"]').innerText(),'Compendium','Settings remains a modal');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Settings modal');await page.keyboard.press('Escape');await settingsDialog.waitFor({state:'hidden'});assert.equal(await settings.evaluate(element=>element===document.activeElement),true,'Settings focus return');
await page.getByRole('button',{name:'Character',exact:true}).click();
const trigger=page.getByRole('button',{name:'Edit character'});await trigger.click();const dialog=page.getByRole('dialog',{name:'Edit character'});await dialog.waitFor();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(element=>element===document.activeElement),true,'Escape returns focus to dialog opener');
await trigger.click();await dialog.waitFor();await page.locator('.dialog-overlay').click({position:{x:4,y:4}});await dialog.waitFor({state:'hidden'});assert.equal(await trigger.evaluate(element=>element===document.activeElement),true,'Backdrop dismissal returns focus to opener');
await trigger.click();await dialog.waitFor();const bounds=await dialog.boundingBox();assert.ok(bounds);await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await page.mouse.down();await page.mouse.move(4,4);await page.mouse.up();assert.equal(await dialog.isVisible(),true,'Dragging from inside to the backdrop does not dismiss');await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
await mkdir('docs/previews/react-migration',{recursive:true});await page.screenshot({path:'docs/previews/react-migration/foundation-mobile.png'});
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('PASS six-page mobile navigation, Settings modal, Escape/backdrop focus, drag dismissal, overflow, and offline requests.');await browser.close(); server.kill();



