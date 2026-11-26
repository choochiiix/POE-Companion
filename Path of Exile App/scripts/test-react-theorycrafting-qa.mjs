import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { makeServer } from '../crafting-ui/server.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const outputDir = join(tmpdir(), 'poe-companion-theorycrafting-qa', `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID().slice(0, 8)}`);
await mkdir(outputDir, { recursive: true });
const server = makeServer();
let browser;

try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  const badResponses = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
  await page.route('**/*', route => {
    if (route.request().url().startsWith(`${origin}/`)) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });

  // Seed non-Theorycrafting data to prove the exploratory screen is read-only.
  await page.addInitScript(() => {
    const sentinel = JSON.stringify({ theorycraftingQa: true, untouched: true });
    for (const key of [
      'poe-companion.character.v1',
      'poe-companion.equipment.v1',
      'poe-companion.skills.v1',
      'poe.tree.3_29.Witch.',
      'theorycrafting-qa-sentinel',
    ]) localStorage.setItem(key, sentinel);
  });
  await page.goto(`${origin}/#theorycrafting`);
  const panel = page.locator('#theorycraftingPanel');
  await panel.waitFor({ state: 'visible' });
  await page.getByLabel('Active skill gem').waitFor({ state: 'visible' });
  assert.equal(await page.getByLabel('Active skill gem').inputValue(), 'Metadata/Items/Gems/SkillGemFireball', 'Fireball remains the starter gem after local data loads');
  await page.getByLabel('Active skill gem').selectOption({ label: 'Fireball' });
  await page.waitForFunction(() => document.querySelector('.theorycrafting-results')?.textContent?.trim() || document.querySelector('.theorycrafting-page [role="alert"]')?.textContent);
  assert.match(await panel.innerText(), /Fireball|connected suggestions|No supported connections/);
  assert.equal(await page.getByText('Heart of Flame', { exact: false }).count() > 0, true, 'Fireball surfaces Heart of Flame when indexed');
  assert.equal(await page.getByText(/30%.*Fire|6%.*penetration/i).count() > 0, true, 'Fireball shows sourced Heart of Flame explanation');
  assert.equal(await page.getByText('Mastermind of Discord', { exact: false }).count() > 0, true, 'Fireball exposes an ascendancy relation when indexed');
  assert.equal(await page.getByText('Shaper of Flames', { exact: false }).count() > 0, true, 'Fireball exposes its source-backed Ignite ascendancy option');
  assert.equal(await page.locator('#theorycrafting-mastery h3').count(), 1, 'Only the directly modeled Fire Mastery effect is shown');
  await page.getByText('Evidence and pinned sources').click();
  assert.equal(await page.getByText(/PoB 3\.29|Path of Building 2\.67\.2|RePoE 3\.29\.3\.6/).count() > 0, true, 'Pinned source versions are disclosed');

  // Righteous Fire is a real local active gem, but it is damage-over-time rather
  // than a direct hit. The milestone must explain that its hit-based index is
  // intentionally unsupported instead of presenting hit suggestions.
  await page.getByLabel('Active skill gem').selectOption({ label: 'Righteous Fire' });
  await page.waitForFunction(() => document.querySelector('.theorycrafting-result-summary')?.textContent?.includes('Righteous Fire'));
  await page.waitForFunction(() => /direct.hit|damage.over.time|No supported connections|unsupported/i.test(document.querySelector('#theorycraftingPanel')?.textContent || ''));
  assert.match(await panel.innerText(), /direct.hit|damage.over.time|No supported connections|unsupported/i, 'Unsupported DoT skill explains direct-hit scope');

  const before = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  await page.getByLabel('Theorycrafting starting point').selectOption('unique');
  await page.getByLabel('Find a unique').fill('Replica Blood Thorn');
  await page.getByLabel('Unique weapon or armour', { exact: true }).selectOption({ index: 0 });
  await page.waitForFunction(() => document.querySelector('.theorycrafting-result-summary')?.textContent?.includes('Replica Blood Thorn'));
  await page.waitForFunction(() => /Calculated/.test(document.querySelector('.theorycrafting-results')?.textContent || ''));
  assert.ok(await page.locator('#theorycrafting-skill h3').count() > 0, 'Replica Blood Thorn has source-matched Fire skill candidates');
  assert.equal(await page.locator('#theorycrafting-skill h3').filter({ hasText: /^Arc$/ }).count(), 0, 'Replica Blood Thorn rejects Lightning-only Arc');
  assert.match(await panel.innerText(), /hit DPS.*\+|without versus with Replica Blood Thorn/i, 'Numeric unique comparison renders with a finite delta');
  await page.getByLabel('Theorycrafting starting point').selectOption('skill');
  await page.getByLabel('Active skill gem').selectOption({ label: 'Righteous Fire' });
  await page.waitForFunction(() => document.querySelector('.theorycrafting-result-summary')?.textContent?.includes('Righteous Fire'));
  await page.waitForFunction(() => document.querySelectorAll('.theorycrafting-group').length === 0);
  assert.match(await panel.innerText(), /outside this milestone's direct.hit scope because its damage is over time/i, 'DoT-only gem is an explicit unsupported empty state');
  await page.getByLabel('Theorycrafting starting point').selectOption('unique');
  await page.getByLabel('Find a unique').fill("Doryani's Prototype");
  assert.ok(await page.getByLabel('Unique weapon or armour', { exact: true }).locator('option').count() <= 5, 'Unique picker is limited to indexed rule-backed variants');
  await page.getByLabel('Unique weapon or armour', { exact: true }).selectOption({ index: 0 });
  await page.waitForFunction(() => document.querySelector('.theorycrafting-page')?.textContent?.includes("Doryani's Prototype"));
  const doryaniText = await panel.innerText();
  assert.match(doryaniText, /Deal no Non-Lightning Damage/i, 'Doryani states its non-Lightning restriction');
  assert.match(doryaniText, /Nearby Enemies have Lightning Resistance equal to yours/i, 'Doryani states the nearby enemy resistance interaction');
  assert.match(doryaniText, /Damage Over Time/i, 'Doryani distinguishes hit damage from damage over time');
  assert.match(doryaniText, /Numeric result suppressed/i, 'Doryani suppresses unsupported numeric comparisons');
  assert.equal(await page.locator('.theorycrafting-comparison').count(), 0, 'No numeric comparison is rendered for Doryani');
  assert.equal(await page.locator('#theorycrafting-skill h3').filter({ hasText: /^Righteous Fire$/ }).count(), 0, 'Doryani rejects a non-hit DoT skill');
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage))), before, 'Changing selection leaves all saves untouched');

  // Keyboard focus and narrow layout are part of the feature contract.
  await page.getByLabel('Scenario level').focus();
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute('aria-label')), 'Scenario level');
  for (const width of [390, 768, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No horizontal overflow at ${width}px`);
    if (width === 390 || width === 1440) await page.screenshot({ path: join(outputDir, `theorycrafting-${width}.png`), fullPage: true });
  }
  await page.screenshot({ path: join(outputDir, 'theorycrafting-result.png'), fullPage: true });

  // Empty/unsupported states should remain understandable when the model reports no connection.
  await page.getByLabel('Theorycrafting starting point').selectOption('skill');
  await page.getByLabel('Active skill gem').selectOption({ label: 'Fireball' });
  await page.waitForFunction(() => document.querySelector('.theorycrafting-page')?.textContent?.includes('Conditions') || document.querySelector('.theorycrafting-page')?.textContent?.includes('No supported connections'));
  assert.equal(await page.locator('#theorycraftingPanel').getByText(/No locally supported suggestions|Conditions and diagnostics/).count() > 0, true);
  assert.deepEqual(errors, [], 'No uncaught page errors');
  assert.deepEqual(external, [], 'No external requests');
  assert.deepEqual(badResponses, [], 'No failed local data responses');
  console.log(`PASS Theorycrafting QA: skill/unique flows, keyboard mode activation, immutable saves, unsupported/empty messaging and 390/768/1440px layouts. Screenshots: ${outputDir}`);
} finally {
  await browser?.close();
  server.close();
}
