import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeServer } from '../crafting-ui/server.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = makeServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1680, height: 1000 } });
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (!route.request().url().startsWith(origin)) {
      external.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await page.goto(origin);
  await page.locator('#classChoices button').first().waitFor();
  for (const name of ['Skills', 'Item library', 'Compendium', 'Character', 'Crafting', 'Skill tree', 'Compendium']) {
    await page.locator('.workspace-tabs').getByRole('button', { name, exact: true }).click();
    assert.equal(await page.locator('.workspace-tabs button[aria-pressed=true]').count(), 1);
    assert.equal(await page.locator('#workspaceLocation').innerText(), name);
  }
  await page.locator('#compendiumPanel .inspector-tools button').click();
  await page.locator('#compendiumPanel .show-inspector').click();
  assert.equal(await page.locator('#compendiumPanel .inspector-tools button').evaluate(node => node === document.activeElement), true);
  await page.locator('#skillsTab').click();
  await page.locator('#skillsPanel input[type=search]').fill('Blade Blast');
  const card = page.locator('.gem-card').first();
  await card.locator('.definition-term').first().waitFor();
  const geometry = await card.evaluate(node => {
    const term = node.querySelector('.definition-term');
    const text = node.querySelector('.gem-description');
    const art = node.querySelector('.gem-card-art');
    return { minHeight: getComputedStyle(term).minHeight, lineHeight: parseFloat(getComputedStyle(text).lineHeight), artAbove: art.compareDocumentPosition(text) & Node.DOCUMENT_POSITION_FOLLOWING, color: getComputedStyle(text).color };
  });
  assert.equal(geometry.minHeight, '0px');
  assert.ok(geometry.lineHeight <= 18);
  assert.ok(geometry.artAbove);
  assert.equal(geometry.color, 'rgb(26, 162, 155)');
  await page.screenshot({ path: 'docs/previews/ui-cohesion.png' });
  // A failed optional library must leave core character/navigation usable.
  const failure = await browser.newPage();
  await failure.route('**/catalog-data.json', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  const failureErrors = [];
  failure.on('pageerror', error => failureErrors.push(error.message));
  await failure.goto(origin);
  await failure.locator('#classChoices button').first().waitFor();
  await failure.getByRole('button', { name: 'Item library', exact: true }).click();
  await failure.locator('#catalogPanel [role=alert]').waitFor();
  await failure.locator('#skillsTab').click();
  await failure.locator('#skillsPanel .gem-card').first().waitFor();
  assert.deepEqual(failureErrors, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log('UI cohesion passed: six-screen navigation, inspector focus, compact inline terms, preserved palette, isolated data-load failure, no external requests.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
