import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeServer } from '../crafting-ui/server.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('#settingsButton').waitFor();
  const before=await page.locator('html').evaluate(node=>getComputedStyle(node).getPropertyValue('--radius-sm'));
  await page.evaluate(async()=>{
    const {themeController}=await import('/features/settings/settings.js');
    themeController.save({version:1,colors:{'--bg':'#123456'},fonts:{'--font-ui':'serif'}});
  });
  assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(18, 52, 86)');
  await page.reload();await page.locator('#settingsButton').waitFor();
  assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(18, 52, 86)');
  assert.ok((await page.locator('html').evaluate(node=>getComputedStyle(node).fontFamily)).includes('Georgia'));
  assert.equal(await page.locator('html').evaluate(node=>getComputedStyle(node).getPropertyValue('--radius-sm')),before);
  assert.equal(await page.locator('#settingsDialog select').count(),5);
  await page.evaluate(async()=>{const {themeController}=await import('/features/settings/settings.js');themeController.reset()});
  assert.equal(await page.locator('body').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(10, 14, 20)');
  assert.deepEqual(errors,[]);
  console.log('Theme browser checks passed: actual colors/fonts, reload restoration, reset to Ayu Aurora, unchanged geometry and preset controls.');
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
