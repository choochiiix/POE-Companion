import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { makeServer } from '../crafting-ui/server.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const slots = [
  'helmet', 'amulet', 'off-hand', 'main-hand', 'body-armour',
  'gloves', 'ring-one', 'belt', 'ring-two', 'boots',
];
const server = makeServer();
let browser;

async function choose(page, picker, query) {
  await picker.click();
  const menu = page.locator('.spring-dropdown-menu:popover-open');
  const filter = menu.getByRole('searchbox');
  if (query) await filter.fill(query);
  const option = menu.getByRole('option').first();
  await option.click({ timeout: 6000 });
  await menu.waitFor({ state: 'hidden' });
}

try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1220, height: 939 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  let helmetOrder;
  for (const slot of slots) {
    await page.setViewportSize({ width: 1220, height: 939 });
    await page.getByRole('button', { name: `Add ${slot} item`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: `Create / Edit ${slot.replaceAll('-', ' ')} Equipment` });
    const base = dialog.locator('select[aria-label="Equipment Base"]');
    const search = dialog.getByRole('combobox', { name: 'Search for an affix' });
    const list = dialog.getByRole('listbox', { name: 'Eligible affixes' });
    assert.equal(await search.isVisible(), true, slot);
    assert.equal(await dialog.locator('select').count(), 1, 'Equipment Base is the only separate select');
    await search.click();
    assert.equal(await list.getByRole('option').count(), 0, slot);
    await search.press('Escape');
    assert.equal(await list.isVisible(), false, slot);
    assert.equal(await dialog.isVisible(), true, slot);
    assert.equal(await dialog.getByRole('spinbutton', { name: 'Affix value', exact: true }).isDisabled(), true, slot);
    const baseName = slot === 'main-hand' ? 'Golden Blade'
      : await base.locator('optgroup option').first().textContent();
    await choose(page, base, baseName);
    await search.click();
    assert.equal(await search.getAttribute('aria-expanded'), 'true', slot);
    await list.getByRole('group', { name: 'Prefixes' }).waitFor();
    await list.getByRole('group', { name: 'Suffixes' }).waitFor();
    const firstOption = list.getByRole('option').first();
    const meta = await firstOption.locator('span').textContent();
    const effect = (await firstOption.locator('strong').textContent()).trim().replace(/\s+/g, ' ');
    await search.fill(effect);
    assert.ok(await list.getByRole('option').count() > 0, `${slot}: find an affix by effect`);
    await search.fill('no-affix-matches-this-query');
    assert.equal(await list.getByRole('option').count(), 0, slot);
    await search.fill(slot === 'main-hand' ? 'of the Worthy' : meta.split(' · iLvl ')[0]);
    if (slot === 'helmet') {
      await search.press('ArrowDown');
      assert.ok(await search.getAttribute('aria-activedescendant'));
      await search.press('Enter');
    } else {
      await list.getByRole('option').first().click();
    }
    await list.waitFor({ state: 'hidden' });
    const addAffix = dialog.getByRole('button', { name: 'Add Affix', exact: true });
    const selectedRow = dialog.getByRole('region', { name: /^Selected affix:/ });
    const previewFields = selectedRow.getByRole('spinbutton');
    const values = [];
    await previewFields.first().waitFor();
    if (slot === 'helmet') {
      const itemLevel = dialog.getByRole('spinbutton', { name: 'Item Level' });
      await itemLevel.clear();
      assert.equal(await selectedRow.isVisible(), true, 'Keep the selected affix visible while correcting the draft');
      assert.equal(await addAffix.isDisabled(), true);
      await itemLevel.fill('85');
    }
    for (const field of await previewFields.all()) {
      const min = Number(await field.getAttribute('min'));
      const max = Number(await field.getAttribute('max'));
      assert.ok(min <= max, slot);
      if (slot === 'main-hand') assert.ok(max < 0, 'Exercise typing a signed roll');
      await field.fill(String(max + 1));
      assert.equal(await addAffix.isDisabled(), true, slot);
      await field.fill(String(min));
      assert.equal(await field.inputValue(), String(min), slot);
      await field.clear();
      assert.equal(await field.inputValue(), '', slot);
      assert.equal(await addAffix.isDisabled(), true, slot);
      await field.pressSequentially(String(max));
      assert.equal(await field.inputValue(), String(max), slot);
      values.push(String(max));
    }
    await addAffix.click();
    const fields = dialog.getByRole('region', { name: /^Added affix:/ }).getByRole('spinbutton');
    for (const [index, value] of values.entries()) {
      assert.equal(await fields.nth(index).inputValue(), value, slot);
    }
    await fields.first().clear();
    const save = dialog.getByRole('button', { name: 'Save and Equip Item' });
    assert.equal(await save.isDisabled(), true, slot);
    await fields.first().pressSequentially(values[0]);
    const order = await dialog.evaluate(element => [...element.children].flatMap(child =>
      ['form-grid', 'gear-editor-rarity', 'gear-affix-picker', 'gear-editor-status',
        'gear-draft-affix', 'gear-editor-actions', 'dialog-footer'].filter(name => child.classList.contains(name)),
    ));
    if (slot === 'helmet') {
      helmetOrder = order;
      assert.deepEqual(order, ['form-grid', 'gear-editor-rarity', 'gear-affix-picker',
        'gear-editor-status', 'gear-draft-affix', 'gear-editor-actions', 'dialog-footer']);
    } else {
      assert.deepEqual(order, helmetOrder, slot);
    }
    await save.click();
    await dialog.waitFor({ state: 'hidden' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: `Edit ${slot} item`, exact: true }).click();
    assert.equal(await search.isVisible(), true, slot);
    await search.click();
    await list.getByRole('option').first().waitFor();
    await search.press('Escape');
    for (const [index, value] of values.entries()) {
      assert.equal(await fields.nth(index).inputValue(), value, slot);
    }
    const layout = await dialog.evaluate(element => {
      const grid = element.querySelector('.form-grid');
      return {
        singleColumn: getComputedStyle(grid).gridTemplateColumns.split(' ').length === 1,
        fits: element.scrollWidth <= element.clientWidth + 1,
      };
    });
    assert.deepEqual(layout, { singleColumn: true, fits: true }, slot);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    console.log(`PASS ${slot}: empty editor, visible search, helmet affix layout, roll typing, save and narrow edit`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  server.close();
}
