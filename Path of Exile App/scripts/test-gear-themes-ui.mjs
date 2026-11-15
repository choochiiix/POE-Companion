import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {makeServer} from '../crafting-ui/server.mjs';
import {themePresets} from '../crafting-ui/features/settings/theme-presets.js';
import {createGearEngine,validateGear,eligibleAffixes} from '../crafting-ui/features/character/gear-model.js';
const dataset=JSON.parse(readFileSync(new URL('../crafting-data/repoe-poe1.json',import.meta.url),'utf8')),engine=createGearEngine(dataset.mods);
const base=dataset.bases.find(base=>base.name==='Iron Hat');
const rows=[];let draft={baseId:base.id,itemLevel:85,mods:[]};rows.push(validateGear(engine,dataset.bases,draft));
for(let i=0;i<2;i++){const def=eligibleAffixes(engine,dataset.bases,draft).find(mod=>mod.affix==='prefix');draft={...draft,mods:[...draft.mods,{id:def.id,values:Object.fromEntries(def.stats.map(stat=>[stat.id,stat.min]))}]};rows.push(validateGear(engine,dataset.bases,draft));}
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const read=()=>page.locator('.gear-slot.helmet .equipped-gear-card').evaluate(card=>{
  const properties=['color','backgroundColor','backgroundImage','borderTopColor','borderTopWidth','borderRadius','fontFamily','fontSize','padding','boxShadow'];
  return [card,card.querySelector('header'),card.querySelector('h4'),card.querySelector('.equipped-gear-body'),card.querySelector('.gear-property'),card.querySelector('.gear-requirements'),card.querySelector('.gear-source-note')].map(node=>Object.fromEntries(properties.map(key=>[key,getComputedStyle(node)[key]])));
 });
 for(const row of rows){
  await page.evaluate(row=>{localStorage.setItem('poe-companion.equipment.v1',JSON.stringify({helmet:row.baseId}));localStorage.setItem('poe-companion.gear.v1',JSON.stringify({version:1,items:{helmet:row}}));localStorage.removeItem('poe-companion.theme.v1');},row);
  await page.reload();await page.getByRole('button',{name:'Edit helmet item',exact:true}).waitFor();const original=await read();
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  for(const preset of themePresets){await page.locator('#colorTheme').selectOption(preset.id);assert.deepEqual(await read(),original,`${row.rarity}: ${preset.id}`);}
  await page.locator('#themeFont').selectOption('serif');assert.deepEqual(await read(),original,`${row.rarity}: independent app font`);
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
 }
 await page.getByRole('button',{name:'Item library',exact:true}).click();
 const unique=page.locator('#catalogPanel .unique-card').first();await unique.waitFor();
 await page.getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('button',{name:'Restore original theme',exact:true}).click();
 const readUnique=()=>unique.evaluate(card=>{
  const properties=['color','backgroundColor','backgroundImage','borderTopColor','borderTopWidth','borderRadius','fontFamily','fontSize','padding','boxShadow'];
  return [card,card.querySelector('.unique-card-header'),card.querySelector('h4'),card.querySelector('.unique-card-body'),card.querySelector('.item-properties'),card.querySelector('.item-requirements'),card.querySelector('.item-mod-normal'),card.querySelector('.item-flavor')].filter(Boolean).map(node=>Object.fromEntries(properties.map(key=>[key,getComputedStyle(node)[key]])));
 });
 const originalUnique=await readUnique();
 for(const preset of themePresets){await page.locator('#colorTheme').selectOption(preset.id);assert.deepEqual(await readUnique(),originalUnique,`Unique card: ${preset.id}`);assert.equal(await page.locator('html').evaluate(node=>node.style.getPropertyValue('--bg')),preset.theme.colors['--bg']||'');}
 await page.locator('#themeFont').selectOption('serif');assert.deepEqual(await readUnique(),originalUnique,'Unique card: independent app font');
 assert.deepEqual(errors,[]);console.log('Gear and unique themes passed: normal, magic, rare and library unique colors, header gradients, typography and styles stay fixed across all 11 app themes and font changes; app theme still changes.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
