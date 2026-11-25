import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { makeServer } from '../crafting-ui/server.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = makeServer();
let browser;
try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/#character`);
  const panel = page.locator('.character-defence');
  const metric = name => panel.locator('dl > div').filter({ has: page.locator('dt', { hasText: new RegExp(`^${name}$`) }) }).locator('dd');
  await metric('physical').filter({ hasText: /\d/ }).waitFor();
  assert.equal(await panel.getByText('Single-hit limit · higher is better', { exact: true }).isVisible(), true);
  const info = panel.getByRole('button', { name: 'About Defence estimates' });
  await info.hover();
  await page.getByRole('tooltip').waitFor();
  assert.match(await page.getByRole('tooltip').textContent(), /More life raises the limits/);
  await info.focus();
  await info.press('Escape');
  await page.getByRole('tooltip').waitFor({ state: 'hidden' });
  const baseline = await metric('physical').textContent();
  for (const type of ['physical', 'fire', 'cold', 'lightning', 'chaos']) {
    assert.match(await metric(type).textContent(), /\d/, type);
  }
  const saves = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const beforeScenario = await saves();
  const toggle = panel.getByRole('checkbox', { name: 'Try an incoming hit' });
  await toggle.focus();
  await toggle.press('Space');
  const amount = panel.getByRole('spinbutton', { name: 'Damage amount' });
  await toggle.press('Tab');
  assert.equal(await amount.evaluate(node => node === document.activeElement), true);
  await amount.fill('0');
  assert.equal(await metric('Damage after defences').textContent(), '0');
  assert.match(await metric('Total incoming damage to depletion').textContent(), /nonzero incoming hit/i);
  await amount.fill('');
  assert.equal(await amount.getAttribute('aria-invalid'), 'true');
  assert.equal(await metric('Damage after defences').textContent(), 'Unavailable');
  await amount.fill('-1');
  assert.equal(await amount.getAttribute('aria-invalid'), 'true');
  await amount.fill('200');
  assert.equal(await metric('Damage after defences').textContent(), '200');
  const type = panel.getByLabel('Incoming damage type', { exact: true });
  await amount.press('Tab');
  assert.equal(await type.evaluate(node => node === document.activeElement), true);
  await type.press('ArrowDown');
  await type.press('End');
  await type.press('Enter');
  assert.equal(await type.inputValue(), 'chaos');
  assert.equal(await type.evaluate(node => node === document.activeElement), true);
  assert.deepEqual(await saves(), beforeScenario, 'Temporary scenario never writes saves');
  await page.getByRole('button', { name: 'Edit character', exact: true }).click();
  const identity = page.getByRole('dialog', { name: 'Edit character', exact: true });
  await identity.getByRole('spinbutton', { name: 'Character level' }).fill('50');
  await identity.getByRole('button', { name: 'Return to character' }).click();
  await page.waitForFunction(previous => {
    const value = document.querySelector('.character-defence dl dd')?.textContent;
    return value && value !== previous;
  }, baseline);
  const afterLevel = await metric('physical').textContent();
  await page.reload();
  await metric('physical').filter({ hasText: /\d/ }).waitFor();
  assert.equal(await toggle.isChecked(), false, 'Scenario resets on reload');
  assert.equal(await metric('physical').textContent(), afterLevel, 'Build level remains saved');
  await mkdir('.validation/character-defence', { recursive: true });
  const focusColors = new Set();
  for (const palette of ['emerald', 'violet', 'rosegold']) {
    await page.evaluate(value => {
      localStorage.setItem('poe-companion.aurora-background.v1', value);
      dispatchEvent(new StorageEvent('storage', { key: 'poe-companion.aurora-background.v1', newValue: value }));
      dispatchEvent(new Event('aurora:change'));
    }, palette);
    assert.equal(await page.locator('.app-shell').getAttribute('data-aurora'), palette);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await toggle.check();
      await panel.scrollIntoViewIfNeeded();
      assert.equal(await panel.evaluate(node => node.scrollWidth <= node.clientWidth + 1), true, `${palette} ${width} panel fits`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${palette} ${width} page fits`);
      await amount.focus();
      assert.equal(await amount.evaluate(node => getComputedStyle(node).outlineStyle !== 'none' || getComputedStyle(node).boxShadow !== 'none'), true, 'Visible keyboard focus');
      focusColors.add(await amount.evaluate(node => getComputedStyle(node).outlineColor));
      await panel.screenshot({ path: `.validation/character-defence/${palette}-${width}.png` });
    }
  }
  assert.equal(focusColors.size, 3, 'Keyboard focus follows each Aurora palette');
  assert.deepEqual(errors, []);
  console.log('PASS Character Defence: baseline, scenario validation and keyboard, build recalculation, temporary storage, three palettes, desktop/narrow, reduced motion');
} finally {
  await browser?.close();
  server.close();
}
