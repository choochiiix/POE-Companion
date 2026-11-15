// Isolated UI migration verification: never connects to the user's live origin.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { makeServer } from '../crafting-ui/server.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = makeServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const output = new URL('../docs/previews/ui-migration/', import.meta.url);
await mkdir(output, { recursive: true });
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (!route.request().url().startsWith(origin + '/')) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.goto(origin);
  await page.locator('#characterPanel .plan-switch').waitFor();
  await page.evaluate(() => localStorage.setItem('ui-migration-preservation-sentinel', 'unchanged'));
  const skills = page.locator('#skillsPanel');
  await page.locator('#skillsTab').click();
  await skills.getByRole('heading', { name: 'Gem library', exact: true }).waitFor();
  await skills.getByRole('textbox', { name: 'New group name', exact: true }).fill('Migration check');
  await skills.getByRole('button', { name: 'Create group', exact: true }).click();
  await skills.getByRole('searchbox').fill('Fireball');
  const fireball = skills.getByRole('article').filter({ has: page.getByRole('heading', { name: 'Fireball', exact: true }) });
  await fireball.locator('button[data-gem]').click();
  await fireball.getByRole('button', { name: 'Inspect gem', exact: true }).click();
  assert.equal(await skills.locator('.library-inspector .gem-card').count(), 1);
  await skills.getByRole('button', { name: 'Skill setup', exact: true }).click();
  assert.equal(await skills.getByRole('button', { name: 'Remove active gem', exact: true }).isVisible(), true);
  const savedSkills = await page.evaluate(() => localStorage.getItem('poe-companion.skills.v1'));
  await page.getByRole('button', { name: 'Item library', exact: true }).click();
  const catalog = page.locator('#catalogPanel');
  await catalog.getByRole('button', { name: 'Inspect item', exact: true }).first().click();
  assert.equal(await catalog.locator('.library-inspector .unique-card').count(), 1);
  assert.ok(await catalog.locator('.library-inspector img').count());
  await catalog.getByRole('button', { name: 'Hide inspector', exact: true }).click();
  await catalog.getByRole('button', { name: 'Show inspector', exact: true }).click();
  assert.equal(await catalog.getByRole('button', { name: 'Hide inspector', exact: true }).evaluate(node => node === document.activeElement), true);
  await page.locator('#compendiumTab').click();
  const compendium = page.locator('#compendiumPanel');
  await compendium.getByRole('button', { name: 'Buffs & effects', exact: true }).click();
  await compendium.getByRole('searchbox').fill('Tailwind');
  await compendium.locator('button[data-id="buff:tailwind"]').click();
  await compendium.getByText('template: DeadeyeTailwind', { exact: true }).click();
  assert.ok((await compendium.innerText()).includes('8% increased Action Speed'));
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const name of ['Character', 'Crafting', 'Skill tree', 'Skills', 'Item library', 'Compendium']) {
      await page.locator('.workspace-tabs').getByRole('button', { name, exact: true }).click();
      assert.equal(await page.locator('.workspace-tabs button[aria-pressed=true]').count(), 1);
      assert.equal(await page.locator('#workspaceLocation').innerText(), name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow at ${width}px`);
      await page.screenshot({ path: fileURLToPath(new URL(`${name.toLowerCase().replaceAll(' ', '-')}-${width}.png`, output)), fullPage: false });
    }
  }
  assert.equal(await page.evaluate(() => localStorage.getItem('poe-companion.skills.v1')), savedSkills);
  assert.equal(await page.evaluate(() => localStorage.getItem('ui-migration-preservation-sentinel')), 'unchanged');
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log('Migration UI passed: saved group, reference inspectors/focus, buff variants, six screens at desktop/mobile, unchanged storage, offline requests.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

