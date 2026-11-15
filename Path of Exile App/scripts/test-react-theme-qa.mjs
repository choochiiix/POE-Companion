import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {presetFontStyles,themePresets} from '../crafting-ui/features/settings/theme-presets.js';

const server=spawn(process.execPath,['renderer/server.mjs'],{env:{...process.env,RENDERER_PORT:'4334'},stdio:'ignore'});
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
let browser;
try{
 await new Promise(resolve=>setTimeout(resolve,1000));
 browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage();
 const errors=[],external=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:4334/')?route.continue():(external.push(route.request().url()),route.abort()));
 await page.goto('http://127.0.0.1:4334/');
 const nav=page.getByRole('navigation',{name:'App sections'});
 const characterBackground=await page.locator('#characterPanel').evaluate(element=>getComputedStyle(element).backgroundColor);
 await nav.getByRole('button',{name:'Settings',exact:true}).click();
 const settings=page.getByRole('dialog',{name:'Settings'});
 await settings.waitFor();
 for(const preset of themePresets){
  await page.locator('#colorTheme').selectOption(preset.id);
  assert.equal(await page.locator('#characterPanel').evaluate(element=>getComputedStyle(element).backgroundColor),characterBackground,preset.id);
 }
 await page.locator('#themeFont').selectOption('mono');
 await page.reload();
 await nav.getByRole('button',{name:'Settings',exact:true}).click();
 await settings.waitFor();
 assert.equal(await page.locator('#themeFont').inputValue(),'mono','Font preference survives reload');
 await page.getByRole('button',{name:'Restore original theme'}).click();
 assert.equal(await page.locator('#colorTheme').inputValue(),'ayu-aurora');
 await page.keyboard.press('Escape');
 await settings.waitFor({state:'hidden'});

 async function verifyCard(locator,label,verifyAppTheme=true){
  await locator.waitFor();
  const capture=()=>locator.evaluate(element=>{
   const style=node=>{if(!node)return null;const computed=getComputedStyle(node);return {backgroundColor:computed.backgroundColor,backgroundImage:computed.backgroundImage,color:computed.color,borderColor:computed.borderColor,fontFamily:computed.fontFamily,fontSize:computed.fontSize};};
   return {card:style(element),header:style(element.querySelector('header')),title:style(element.querySelector('header h4')),body:style(element.querySelector('.equipped-gear-body,.unique-card-body,.gem-card-body')),modifier:style(element.querySelector('.gear-mod-block p,.item-mod-normal,.gem-value'))};
  });
  const reference=await capture(),backgrounds=new Set();
  await nav.getByRole('button',{name:'Settings',exact:true}).click();
  await settings.waitFor();
  for(const preset of themePresets){
   await page.locator('#colorTheme').selectOption(preset.id);
   backgrounds.add(await page.locator('.app-sidebar').evaluate(element=>getComputedStyle(element).backgroundColor));
   assert.deepEqual(await capture(),reference,`${label} reference card changed under ${preset.id}`);
  }
  for(const font of ['theme',...Object.keys(presetFontStyles)]){
   await page.locator('#themeFont').selectOption(font);
   assert.deepEqual(await capture(),reference,`${label} reference card changed under font ${font}`);
  }
  if(verifyAppTheme)assert.ok(backgrounds.size>1,'Application palette still changes outside the fixed game-reference card');
  await page.getByRole('button',{name:'Restore original theme'}).click();
  await page.keyboard.press('Escape');
  await settings.waitFor({state:'hidden'});
 }

 await nav.getByRole('button',{name:'Character',exact:true}).click();
 await page.getByRole('button',{name:'Add helmet item'}).click();
 const gearDialog=page.getByRole('dialog');
 const equipmentBase=gearDialog.locator('select[aria-label="Equipment base"]');
 await equipmentBase.selectOption(await equipmentBase.locator('option').nth(1).getAttribute('value'),{force:true});
 await gearDialog.getByRole('button',{name:'Save and equip item'}).click();
 await page.locator('.gear-slot.helmet summary').click();
 await verifyCard(page.locator('.equipped-gear-card').first(),'Equipped item',false);

 await nav.getByRole('button',{name:'Item library',exact:true}).click();
 const uniqueCard=page.locator('article.unique-card').filter({has:page.locator('.item-mod-normal')}).first();
 await verifyCard(uniqueCard,'Unique item');
 await nav.getByRole('button',{name:'Skills',exact:true}).click();
 await page.getByLabel('Search gems, tags, descriptions and effects',{exact:true}).fill('Fireball');
 const gemCard=page.locator('article.gem-card').filter({hasText:'Fireball'}).first();
 await verifyCard(gemCard,'Gem');
 assert.deepEqual(errors,[]);
 assert.deepEqual(external,[]);
 console.log(`PASS ${themePresets.length} palettes and ${Object.keys(presetFontStyles).length} font styles; item and gem reference cards remain fixed while the application theme changes.`);
}finally{
 await browser?.close();
 server.kill();
}
