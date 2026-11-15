import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdir} from 'node:fs/promises';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const origin='http://127.0.0.1:4335',server=spawn(process.execPath,['renderer/server.mjs'],{env:{...process.env,RENDERER_PORT:'4335'},stdio:['ignore','pipe','pipe']});
let browser;
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Renderer startup timed out')),10000);server.stdout.on('data',()=>{clearTimeout(timeout);resolve();});server.on('exit',code=>{clearTimeout(timeout);reject(Error(`Renderer exited ${code}`));});});
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():(external.push(route.request().url()),route.abort()));
 await page.goto(origin);await page.getByRole('button',{name:'Edit character'}).waitFor();
 await mkdir('docs/previews/react-migration/final',{recursive:true});
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:width===390?844:1000});
  for(const name of ['Character','Crafting','Skill tree','Skills','Item library','Compendium']){
   await page.getByRole('navigation',{name:'App sections'}).getByRole('button',{name,exact:true}).click();
   await page.waitForTimeout(200);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow ${width}`);
   await page.screenshot({path:`docs/previews/react-migration/final/${name.toLowerCase().replaceAll(' ','-')}-${width}.png`});
  }
 }
 await page.setViewportSize({width:1100,height:929});await page.getByRole('button',{name:'Character',exact:true}).click();
 await page.getByRole('button',{name:'Edit character'}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('Character class',{exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.spring-dropdown-menu:popover-open [role=option]'));
 assert.equal(await page.locator('.spring-dropdown-menu:popover-open').count(),1);
 await page.waitForFunction(()=>{const menu=document.querySelector('.spring-dropdown-menu:popover-open');return menu&&[...menu.querySelectorAll('.spring-dropdown-option')].every(row=>Number(row.style.opacity)===1)&&[...document.querySelectorAll('.spring-dropdown-value')].every(value=>Number(value.children[0].style.opacity)===0&&Number(value.children[1].style.opacity)===1);});
 await page.screenshot({path:'docs/previews/react-migration/final/character-open-class.png'});
 await dialog.getByLabel('Character class',{exact:true}).press('End');await dialog.getByLabel('Character class',{exact:true}).press('Enter');
 await page.waitForFunction(()=>!document.querySelector('.spring-dropdown-menu:popover-open'),null,{timeout:5000});assert.equal(await page.locator('.spring-dropdown-menu:popover-open').count(),0);
 await dialog.getByLabel('Ascendancy',{exact:true}).click();await page.keyboard.press('Escape');
 assert.equal(await dialog.count(),1,'Escape closes the dropdown before its parent dialog');await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
 await page.getByRole('button',{name:'Settings',exact:true}).click();const settings=page.getByRole('dialog',{name:'Settings'});await settings.waitFor();assert.equal(await settings.getByRole('heading',{name:'Settings',exact:true}).count(),1,'Settings dialog has one heading');await settings.evaluate(async node=>{await Promise.allSettled(node.getAnimations({subtree:true}).map(animation=>animation.finished));});await page.screenshot({path:'docs/previews/react-migration/final/settings.png'});await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: six screens desktop/mobile overflow + captures, class dropdown End/Enter and confirmation close, nested Escape, Settings modal, no page errors/remote requests.');
}finally{await browser?.close();server.kill();}

