import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { makeServer } from '../crafting-ui/server.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = resolve('.validation', 'aurora-migration', 'legacy-captures');
const server = makeServer();
let browser;

try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.getByRole('button', { name: 'Edit character' }).click();
  const identity = page.getByRole('dialog', { name: 'Edit character', exact: true });
  await identity.waitFor();
  await page.keyboard.press('Escape');
  await identity.waitFor({ state: 'hidden' });

  const skills = page.getByRole('button', { name: 'Skills', exact: true });
  const search = page.getByLabel('Search gems, tags, descriptions and effects');
  await skills.click();
  await page.getByRole('heading', { name: 'Gem library' }).waitFor();
  await page.getByLabel('New group name').fill('QA test');
  await page.getByRole('button', { name: 'Create group' }).click();
  await search.fill('Fireball');
  const card = page.locator('article.gem-card').filter({
    has: page.getByRole('heading', { name: 'Fireball', exact: true }),
  }).first();
  await card.getByRole('button', { name: 'Add to group' }).click();
  await page.getByRole('button', { name: 'Calculate this group' }).click();
  await page.locator('.calculation-notice').filter({ hasText: /Partial build calculation · Fireball/ }).waitFor();
  await skills.click();
  await page.getByRole('heading', { name: 'Gem library' }).waitFor();
  assert.equal(await search.inputValue(), 'Fireball');

  await mkdir(output, { recursive: true });
  await page.screenshot({ path: resolve(output, 'skills-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  assert.ok(await fits(), 'Skills overflow');
  await page.screenshot({ path: resolve(output, 'skills-mobile.png') });
  await page.getByRole('button', { name: 'Compendium', exact: true }).click();
  await page.getByLabel('Search definitions').fill('Ignite');
  const ignite = page.getByRole('button', { name: 'Ignite', exact: true });
  await ignite.first().click();
  const inspector = page.getByRole('complementary', { name: 'Definition inspector' });
  await inspector.getByRole('heading', { name: 'Ignite', exact: true }).waitFor();
  assert.ok(await fits(), 'Compendium overflow');
  await page.screenshot({ path: resolve(output, 'compendium-mobile.png') });
  assert.deepEqual(errors, []);
  console.log('PASS Fireball calculation handoff, retained gem search, and narrow Skills and Compendium flows.');
} finally {
  await browser?.close();
  server.close();
}
