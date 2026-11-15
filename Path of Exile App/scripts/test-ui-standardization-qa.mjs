import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { makeServer } from '../crafting-ui/server.mjs';
import { themePresets } from '../crafting-ui/features/settings/theme-presets.js';

// Independent smoke test: ephemeral origin and browser profile; no screenshots or live saves.
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = makeServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    if (!route.request().url().startsWith(origin)) { external.push(route.request().url()); return route.abort(); }
    return route.continue();
  });
  await page.goto(origin);
  const characterStyle = () => page.evaluate(() => {
    const keys = ['backgroundColor', 'color', 'fontFamily', 'fontSize', 'padding', 'borderRadius'];
    return ['#characterPanel', '.character-panel', '.calculation-header>button'].map(selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return Object.fromEntries(keys.map(key => [key, style[key]]));
    });
  });
  await page.locator('.character-panel').first().waitFor();
  await page.mouse.move(0, 0);
  const reference = await characterStyle();
  for (const preset of themePresets) {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('#colorTheme').selectOption(preset.id);
    await page.locator('#themeFont').selectOption('mono');
    assert.equal(await page.locator('html').evaluate(node => node.style.getPropertyValue('--bg')), preset.theme.colors['--bg'] || '');
    await page.locator('dialog[open]').press('Escape');
    await page.getByRole('button', { name: 'Character', exact: true }).click();
    await page.mouse.move(0, 0);
    assert.deepEqual(await characterStyle(), reference, `${preset.id}: Character must preserve approved appearance`);
  }
  for (const size of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(size);
    for (const name of ['Character', 'Crafting', 'Skill tree', 'Skills', 'Item library', 'Compendium']) {
      await page.getByRole('button', { name, exact: true }).click();
      await page.waitForLoadState('networkidle');
      assert.equal(await page.locator('.workspace-tabs button[aria-pressed=true]').count(), 1, `${name}: one active view`);
      assert.equal(await page.locator('#workspaceLocation').innerText(), name);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: page overflows at ${size.width}px`);
    }
  }
  assert.deepEqual(errors, [], 'uncaught page errors');
  assert.deepEqual(external, [], 'external requests');
  console.log('Independent UI smoke passed: Character fidelity across 11 palettes and mono font, desktop/mobile navigation, offline requests and page errors.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}

