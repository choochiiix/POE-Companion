import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
const require=createRequire(new URL('../renderer/package.json',import.meta.url));
const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=await createServer({root:fileURLToPath(new URL('../renderer/',import.meta.url)),server:{host:'127.0.0.1',port:0,open:false},logLevel:'error'});await server.listen();
let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
 await page.goto(`http://127.0.0.1:${server.httpServer.address().port}/tests/plan-switch.html`);
 const switcher=page.getByRole('group',{name:'Views'});
 const settle=async()=>{await page.waitForFunction(()=>{const h=document.querySelector('.plan-switch-highlight').getBoundingClientRect(),b=document.querySelector('.plan-switch button[aria-pressed=true]').getBoundingClientRect();return Math.abs(h.left-b.left)<.1&&Math.abs(h.width-b.width)<.1},null,{polling:100});};
 await switcher.getByRole('button',{name:'Equipment comparison'}).click();await settle();
 await switcher.getByRole('button',{name:'Character overview'}).click();await settle();
 for(let i=0;i<8;i++)await switcher.getByRole('button',{name:i%2?'Character overview':'Equipment comparison'}).click();await settle();
 await page.getByRole('button',{name:'Toggle mount'}).click();assert.equal(await switcher.count(),0);await page.getByRole('button',{name:'Toggle mount'}).click();await settle();
 await switcher.getByRole('button',{name:'Character overview'}).focus();await page.keyboard.press('End');assert.equal(await switcher.getByRole('button',{name:'Equipment comparison'}).getAttribute('aria-pressed'),'true');await settle();
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('Home');await settle();
 assert.equal(await page.locator('.plan-switch-highlight').evaluate(n=>n.getAnimations().length),0);
 assert.deepEqual(errors,[]);console.log('PASS: React PlanSwitch settles with stopped rAF, reversals, unmount/remount, keyboard and reduced motion.');
}finally{await browser?.close();await server.close();}

