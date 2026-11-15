import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const server = spawn(process.execPath, ['renderer/server.mjs'], {
  env: { ...process.env, RENDERER_PORT: '4336' },
  stdio: 'ignore',
});
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE);
let browser;

try {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4336/#items');
  await page.getByLabel('Search name, base or mods').fill('Tabula Rasa');
  await page.locator('.unique-card').first().waitFor();
  await page.getByRole('button', { name: 'Compare with build' }).first().click();

  const comparison = page.getByRole('dialog', { name: 'Compare Tabula Rasa' });
  await comparison.waitFor();
  assert.equal(await comparison.getByLabel('Target equipment slot', { exact: true }).inputValue(), 'body-armour');
  const energyShield = comparison.locator('tbody tr').filter({ hasText: 'energyShield' });
  assert.deepEqual(await energyShield.locator('td').allInnerTexts(), ['energyShield', '0', '17', '+17']);

  const equip = comparison.getByRole('button', { name: 'Equip for calculations' });
  assert.equal(await equip.isEnabled(), true);
  await equip.click();
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await page.waitForTimeout(500);
  assert.match(await page.locator('#equipmentStatus').innerText(), /Equipment saved on this device/);
  assert.match(await page.evaluate(() => localStorage.getItem('poe-companion.equipment.v1')), /Body/);
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  server.kill();
}
