import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {makeServer} from '../crafting-ui/server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
 browser=await chromium.launch({channel:'msedge',headless:true});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const baseline=await browser.newPage({viewport:{width:1440,height:1000}});
 const pilot=await browser.newPage({viewport:{width:1440,height:1000}});
 await baseline.route('**/character-workspace.css',route=>route.fulfill({contentType:'text/css',body:''}));
 await Promise.all([baseline.goto(origin),pilot.goto(origin)]);
 for(const page of [baseline,pilot])await page.waitForFunction(()=>document.querySelectorAll('.calculation-stat').length===5&&document.querySelector('[aria-controls="catalogPanel"]'));
 const sample=page=>page.evaluate(()=>{
  const keys=['fontFamily','fontSize','fontWeight','padding','margin','borderRadius','backgroundColor','color','display','gap','gridTemplateColumns'];
  return [...document.querySelectorAll('.app-sidebar, .workspace-bar, [id$="Panel"]:not([hidden]):not(#characterPanel), [id$="Panel"]:not([hidden]):not(#characterPanel) button, [id$="Panel"]:not([hidden]):not(#characterPanel) input')].slice(0,100).map(node=>{const style=getComputedStyle(node);return Object.fromEntries(keys.map(key=>[key,style[key]]));});
 });
 for(const name of ['Crafting','Skill tree','Skills','Item library','Compendium']) {
  for(const page of [baseline,pilot])await page.getByRole('button',{name,exact:true}).click();
  // Feature loading can settle after navigation; wait for the same data-driven controls.
  await Promise.all([baseline.waitForLoadState('networkidle'),pilot.waitForLoadState('networkidle')]);
  assert.deepEqual(await sample(pilot),await sample(baseline),`${name} styling must remain unchanged`);
 }
 await pilot.getByRole('button',{name:'Character',exact:true}).click();
 const switcher=pilot.locator('.plan-switch');
 await switcher.getByRole('button',{name:'Equipment comparison',exact:true}).click();
 await pilot.waitForFunction(()=>{const b=document.querySelector('.plan-switch button[aria-pressed=true]'),h=document.querySelector('.plan-switch-highlight');return Math.abs(h.getBoundingClientRect().left-b.getBoundingClientRect().left)<.1;});
 assert.equal(await pilot.locator('.calculation-comparison-view').isVisible(),true);
 await switcher.getByRole('button',{name:'Equipment comparison',exact:true}).press('ArrowLeft');
 assert.equal(await switcher.getByRole('button',{name:'Character overview',exact:true}).getAttribute('aria-pressed'),'true');
 assert.equal(await pilot.locator('.calculation-main-grid').isVisible(),true);
 await pilot.emulateMedia({reducedMotion:'reduce'});
 await pilot.waitForFunction(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 await switcher.getByRole('button',{name:'Equipment comparison',exact:true}).click();
 await pilot.waitForFunction(()=>{const b=document.querySelector('.plan-switch button[aria-pressed=true]'),h=document.querySelector('.plan-switch-highlight');return Math.abs(h.getBoundingClientRect().left-b.getBoundingClientRect().left)<.1;});
 await switcher.getByRole('button',{name:'Character overview',exact:true}).click();
 assert.equal(await pilot.locator('.calculation-section').evaluate(node=>getComputedStyle(node).borderRadius),'12px');
 assert.equal(await pilot.locator('.calculation-view-tabs button').first().evaluate(node=>getComputedStyle(node).borderTopWidth),'0px');
 const specification=await pilot.evaluate(()=>{
  const style=selector=>getComputedStyle(document.querySelector(selector));
  return {
   canvas:style('#characterPanel').backgroundColor,
   card:style('.character-panel').backgroundColor,
   cardRadius:style('.character-panel').borderRadius,
   cardPadding:style('.character-panel').padding,
   primary:style('.calculation-header>button').backgroundColor,
   controlRadius:style('.calculation-header>button').borderRadius,
   attributes:document.querySelectorAll('.character-attribute-values dd').length,
   equipmentLayout:style('.equipment-body').display,
  };
 });
 assert.deepEqual(specification,{canvas:'rgb(8, 9, 10)',card:'rgb(15, 16, 17)',cardRadius:'6px',cardPadding:'16px',primary:'rgb(228, 242, 34)',controlRadius:'6px',attributes:3,equipmentLayout:'flex'});
 await pilot.locator('.calculation-detail').evaluate(node=>node.open=false);
 await pilot.screenshot({path:'docs/previews/character-design-desktop.png',fullPage:true});
 await pilot.setViewportSize({width:390,height:844});
 assert.ok(await pilot.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await pilot.screenshot({path:'docs/previews/character-design-mobile.png',fullPage:true});
 console.log('Character-only styling verified: all five other screens and shared shell unchanged; pilot tokens, tabs and narrow reflow pass.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
