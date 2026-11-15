import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {makeServer} from '../crafting-ui/server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],external=[];
 page.on('pageerror',error=>errors.push(error.message));const origin=`http://127.0.0.1:${server.address().port}`;await page.route('**/*',route=>{if(!route.request().url().startsWith(origin)){external.push(route.request().url());return route.abort();}return route.continue();});
 await page.goto(origin);await page.getByRole('button',{name:'Add body-armour item',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Create equipment'});
 await dialog.getByLabel('Equipment base',{exact:true}).selectOption('Metadata/Items/Armours/BodyArmours/BodyStr1');
 await dialog.getByLabel('Search available affixes').fill('no-affix-matches-this-query');assert.match(await dialog.locator('.gear-affix-matches').innerText(),/No eligible/);assert.equal(await dialog.getByRole('button',{name:'Add affix',exact:true}).isDisabled(),true);await dialog.getByRole('button',{name:'Clear search',exact:true}).click();assert.ok(await dialog.getByLabel('Available affix',{exact:true}).locator('option').count()>0);
 await dialog.getByRole('button',{name:'Save and equip item',exact:true}).click();assert.equal(await page.locator('.gear-slot.body-armour').getAttribute('data-rarity'),'normal');
 const lifeBefore=Number(await page.locator('.calculation-stat strong').nth(1).innerText());
 await page.getByRole('button',{name:'Edit body-armour item',exact:true}).click();await dialog.getByLabel('Search available affixes').fill('IncreasedLife0');await dialog.getByRole('button',{name:'Add affix',exact:true}).click();
 await dialog.getByLabel('base_maximum_life',{exact:false}).fill('9');await dialog.getByLabel('base_maximum_life',{exact:false}).press('Tab');await dialog.getByRole('button',{name:'Save and equip item',exact:true}).click();
 assert.equal(await page.locator('.gear-slot.body-armour').getAttribute('data-rarity'),'magic');await page.waitForFunction(value=>Number(document.querySelectorAll('.calculation-stat strong')[1].textContent)===value,lifeBefore+9);
 await page.getByRole('button',{name:'Edit body-armour item',exact:true}).click();await dialog.getByLabel('Search available affixes').fill('');
 const ids=await dialog.getByLabel('Available affix',{exact:true}).locator('option').evaluateAll(nodes=>nodes.map(node=>node.value));assert.ok(!ids.includes('IncreasedLife1'));
 await dialog.getByRole('button',{name:'Add affix',exact:true}).click();await dialog.getByRole('button',{name:'Save and equip item',exact:true}).click();assert.equal(await page.locator('.gear-slot.body-armour').getAttribute('data-rarity'),'rare');
 await page.reload();await page.getByRole('button',{name:'Edit body-armour item',exact:true}).waitFor();assert.equal(await page.locator('.gear-slot.body-armour').getAttribute('data-rarity'),'rare');
 await page.getByRole('button',{name:'Edit body-armour item',exact:true}).click();await dialog.getByRole('button',{name:'Clear draft affixes',exact:true}).click();assert.match(await dialog.innerText(),/NORMAL/);await dialog.getByRole('button',{name:'Cancel',exact:true}).click();assert.equal(await page.locator('.gear-slot.body-armour').getAttribute('data-rarity'),'rare');
 await page.getByRole('button',{name:'Edit body-armour item',exact:true}).click();await dialog.press('Escape');await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Edit body-armour item',{},{timeout:3000});assert.equal(await page.getByRole('button',{name:'Edit body-armour item',exact:true}).evaluate(node=>node===document.activeElement),true);
 await page.screenshot({path:'docs/previews/gear-cards.png',fullPage:true});await page.locator('.loadout-panel').screenshot({path:'docs/previews/gear-tooltip-panel.png'});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.getByRole('button',{name:'Edit body-armour item',exact:true}).click();assert.ok(await dialog.evaluate(node=>node.scrollWidth<=node.clientWidth));await page.screenshot({path:'docs/previews/gear-editor-mobile.png',fullPage:true});await dialog.press('Escape');
 await page.getByRole('button',{name:'Remove body-armour item',exact:true}).click();await page.getByRole('button',{name:'Add body-armour item',exact:true}).waitFor();
 await page.evaluate(()=>{Storage.prototype.setItem=function(){throw Error('disabled');};});await page.getByRole('button',{name:'Add helmet item',exact:true}).click();const first=await dialog.getByLabel('Equipment base',{exact:true}).locator('option').nth(1).getAttribute('value');await dialog.getByLabel('Equipment base',{exact:true}).selectOption(first);await dialog.getByRole('button',{name:'Save and equip item',exact:true}).click();await page.getByRole('button',{name:'Edit helmet item',exact:true}).waitFor();assert.match(await page.locator('#equipmentStatus').innerText(),/Storage unavailable/);
 assert.deepEqual(errors,[]);assert.deepEqual(external,[]);console.log('Gear editor passed: base selection, normal/magic/rare cards, exact life roll calculation, conflict filtering, persistence, cancel focus, removal, mobile reflow, offline.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}




