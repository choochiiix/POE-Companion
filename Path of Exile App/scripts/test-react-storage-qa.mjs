import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';

const server=spawn(process.execPath,['renderer/server.mjs'],{env:{...process.env,RENDERER_PORT:'4331'},stdio:'ignore'});
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
let browser;
try{
 await new Promise(resolve=>setTimeout(resolve,1000));
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const denial of ['write','readwrite']){
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(mode=>{
   Storage.prototype.setItem=function(){throw new DOMException('Denied','SecurityError');};
   if(mode==='readwrite')Storage.prototype.getItem=function(){throw new DOMException('Denied','SecurityError');};
  },denial);
  await page.goto('http://127.0.0.1:4331/');
  await page.getByRole('button',{name:'Edit character'}).click();
  await page.locator('select[aria-label="Character class"]').selectOption('Ranger',{force:true});
  await page.getByLabel('Character level',{exact:true}).fill('42');
  await page.getByRole('button',{name:'Return to character'}).click();
  await page.waitForFunction(()=>document.querySelector('.calculation-identity h3')?.textContent.includes('Ranger · Level 42'));
  await page.waitForFunction(()=>document.querySelector('.calculation-notice')?.textContent.includes('level 42'));
  const stats=()=>page.locator('.calculation-stat').evaluateAll(elements=>Object.fromEntries(elements.map(element=>[element.querySelector('span')?.textContent.trim(),element.querySelector('strong')?.textContent.trim()])));
  const before=await stats();
  await page.getByRole('button',{name:'Add helmet item'}).click();
  const dialog=page.getByRole('dialog');
  const base=dialog.locator('select[aria-label="Equipment base"]');
  const baseId=await base.locator('option').nth(1).getAttribute('value');
  assert.ok(baseId,'A local helmet base is available');
  await base.selectOption(baseId,{force:true});
  await dialog.getByRole('button',{name:'Save and equip item'}).click();
  await page.waitForFunction(()=>document.querySelector('#equipmentStatus')?.textContent.includes('Storage unavailable'));
  await page.getByRole('button',{name:'Edit helmet item'}).waitFor();
  await page.waitForFunction(()=>document.querySelector('.calculation-notice')?.textContent.includes('level 42'));
  const after=await stats();
  assert.ok(['Armour','Evasion'].some(label=>before[label]!==after[label]),'Equipped local base updates a calculated defence in session memory');
  await page.getByRole('button',{name:'Edit helmet item'}).click();
  assert.equal(await page.getByRole('dialog').locator('select[aria-label="Equipment base"]').inputValue(),baseId,'Gear draft reloads from session memory');
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  assert.match(await page.locator('#equipmentStatus').innerText(),/Storage unavailable.*session/i);
  assert.deepEqual(errors,[]);
  console.log(`${denial}: Ranger level 42, gear persisted in session memory, and equipped base changed a calculated defence.`);
  await page.close();
 }
}finally{
 await browser?.close();
 server.kill();
}
