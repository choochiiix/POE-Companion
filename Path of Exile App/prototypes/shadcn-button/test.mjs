import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {preview} from 'vite';
import {fileURLToPath} from 'node:url';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await preview({root:fileURLToPath(new URL('.',import.meta.url)),preview:{host:'127.0.0.1',port:0,open:false}});
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1100,height:800}}),errors=[],external=[];
 page.on('pageerror',e=>errors.push(e.message));
 const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():(external.push(r.request().url()),r.abort()));
 await page.goto(origin);
 const legacy=page.locator('#legacy'),button=page.locator('#proof').getByRole('button',{name:'Secondary action',exact:true});
 await button.click();await page.locator('#proof').getByRole('status').filter({hasText:'Activated 1 times'}).waitFor();
 assert.equal(await page.locator('#legacy-status').innerText(),'Activated 0 times');
 await button.focus();await page.keyboard.press('Enter');await page.locator('#proof').getByRole('status').filter({hasText:'Activated 2 times'}).waitFor();
 assert.ok(await page.locator('#proof').getByRole('button',{name:'Unavailable'}).isDisabled());
 const css=n=>{const s=getComputedStyle(n),r=n.getBoundingClientRect();return [s.fontSize,s.lineHeight,s.borderRadius,r.height]};
 assert.deepEqual(await button.evaluate(css),await legacy.evaluate(css));
 await page.evaluate(()=>{const s=document.createElement('style');s.textContent='body button{background:rgb(255,0,0)!important}';document.head.append(s)});
 assert.equal(await legacy.evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 0, 0)');
 assert.notEqual(await button.evaluate(n=>getComputedStyle(n).backgroundColor),'rgb(255, 0, 0)');
 await page.evaluate(()=>document.head.lastElementChild.remove());
 await page.screenshot({path:'preview-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.emulateMedia({reducedMotion:'reduce'});await page.screenshot({path:'preview-mobile.png'});
 assert.deepEqual(await page.evaluate(()=>Object.keys(localStorage)),[]);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
 console.log('PASS: pointer/keyboard counter, disabled state, matching control geometry, two-way style isolation, 390px layout, no storage/errors/external requests.');
}finally{await browser?.close();await new Promise(r=>server.httpServer.close(r));}

