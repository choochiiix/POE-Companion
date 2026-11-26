import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { makeServer } from '../crafting-ui/server.mjs';
import { indexTree, shortestPath } from '../crafting-ui/features/tree/tree-model.js';

const data = JSON.parse(await (await import('node:fs/promises')).readFile(
  new URL('../data-sources/pob-tree-3_29/tree-view.json', import.meta.url), 'utf8',
));
const nodes = indexTree(data);
const rootsFor = classIndex => [...nodes.values()]
  .filter(node => node.classStartIndex === classIndex).map(node => node.id);
const allowedFor = classIndex => node => Boolean(node && Number.isFinite(node.x) &&
  !node.isMastery && !node.ascendancyName &&
  (node.classStartIndex === undefined || node.classStartIndex === classIndex));

function masteryFor(classIndex) {
  const roots = rootsFor(classIndex);
  const candidates = [];
  for (const [id, node] of nodes) {
    if (!node.isMastery || !node.masteryEffects?.length) continue;
    const notable = [...nodes.values()].find(candidate =>
      candidate.group === node.group && candidate.isNotable);
    if (!notable) continue;
    const path = shortestPath(nodes, roots, notable.id, allowedFor(classIndex));
    if (path) candidates.push({ masteryId: id, notableId: notable.id,
      effect: node.masteryEffects[0].effect, pathLength: path.length });
  }
  candidates.sort((left, right) => left.pathLength - right.pathLength);
  assert.ok(candidates.length, `No allocatable mastery found for class index ${classIndex}`);
  return candidates[0];
}

function ordinaryNodeFor(classIndex) {
  const roots = rootsFor(classIndex);
  const candidates = [];
  for (const node of nodes.values()) {
    if (node.classStartIndex !== undefined || node.isMastery || node.isAscendancyStart) continue;
    const path = shortestPath(nodes, roots, node.id, allowedFor(classIndex));
    if (path && path.length > 1) candidates.push({ id: node.id, pathLength: path.length });
  }
  candidates.sort((left, right) => left.pathLength - right.pathLength);
  assert.ok(candidates.length, `No allocatable passive found for class index ${classIndex}`);
  return candidates[0].id;
}

const marauderIndex = data.classes.findIndex(characterClass => characterClass.name === 'Marauder');
const rangerIndex = data.classes.findIndex(characterClass => characterClass.name === 'Ranger');
assert.ok(marauderIndex >= 0 && rangerIndex >= 0, 'Expected Marauder and Ranger classes');
const mastery = masteryFor(marauderIndex);
const rangerNode = '39821';
assert.ok(nodes.has(rangerNode) && shortestPath(nodes, rootsFor(rangerIndex), rangerNode,
  allowedFor(rangerIndex)), 'Expected Ranger test passive #39821 to be reachable');
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const outputDir = join(tmpdir(), 'poe-companion-tree-qa', new Date().toISOString().replaceAll(':', '-') + '-' + randomUUID().slice(0, 8));
await mkdir(outputDir, { recursive: true });
const server = makeServer();
let browser;

try {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const capture = name => page.screenshot({ path: join(outputDir, name), fullPage: true, scale: 'css' });
  const errors = [];
  const external = [];
  const badResponses = [];
  const treeSpriteRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.url().includes('/tree-data/')) treeSpriteRequests.push(request.url());
  });
  page.on('response', response => {
    if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`);
  });
  await page.route('**/*', route => {
    if (route.request().url().startsWith(`${origin}/`)) return route.continue();
    external.push(route.request().url());
    return route.abort();
  });
  await page.goto(`${origin}/#tree`);
  await page.getByRole('button', { name: 'Skill tree', exact: true }).click();
  const canvas = page.locator('#treeCanvas');
  await canvas.waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#treeCanvas')?.width > 0);
  await page.waitForFunction(() => {
    const requests = performance.getEntriesByType('resource').map(entry => entry.name);
    return requests.some(url => url.includes('/tree-data/sprites.json')) &&
      requests.some(url => /\/tree-data\/[^/]+\.(?:png|jpe?g|webp)(?:\?|$)/i.test(url));
  });
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true,
    'Browser reduced-motion preference is active');
  assert.equal(await canvas.evaluate(element => element.width),
    await canvas.evaluate(element => Math.round(element.clientWidth * devicePixelRatio)),
    'Canvas backing store follows DPR 2');

  const find = page.getByLabel('Find a node');
  async function inspect(id) {
    await find.fill(String(id));
    await page.getByRole('button', { name: 'Next match' }).click();
    await page.waitForFunction(expected =>
      document.querySelector('#nodeMeta')?.textContent.includes(`#${expected}`), String(id));
    assert.equal(await page.locator('#closeNode').evaluate(node => node === document.activeElement), true,
      'Search inspection moves focus to the close control');
  }
  const saves = () => page.evaluate(() => Object.fromEntries(
    Object.entries(localStorage).filter(([key]) => key.startsWith('poe.tree.3_29.')),
  ));
  const marauderKey = 'poe.tree.3_29.Marauder.';

  // Search and filter by an indexed node, then verify a real pointer hit pins its details.
  await inspect(mastery.notableId);
  const matchCount = await page.locator('#indexCount').textContent();
  assert.match(matchCount, /\d+ matches|1 \/ \d+/);
  await page.locator('#treeHighlight').selectOption('search');
  assert.equal(await page.locator('#treeHighlight').inputValue(), 'search');
  await page.locator('#treeHighlight').selectOption('notables');
  await page.mouse.move(8, 8);
  const staticHighlight = await canvas.evaluate(element => element.toDataURL());
  await page.waitForTimeout(180);
  assert.equal(await canvas.evaluate(element => element.toDataURL()), staticHighlight,
    'Reduced motion keeps a static highlighted canvas stable without pointer movement');
  await page.locator('#treeHighlight').selectOption('search');
  await page.locator('#closeNode').click();
  const box = await canvas.boundingBox();
  assert.ok(box, 'Tree canvas has a layout box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(expected =>
    document.querySelector('#nodeMeta')?.textContent.includes(`#${expected}`), String(mastery.notableId));
  const hoverCanvas = await canvas.evaluate(element => element.toDataURL());
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForFunction(expected =>
    document.querySelector('#nodeMeta')?.textContent.includes(`#${expected}`), String(mastery.notableId));
  assert.notEqual(await canvas.evaluate(element => element.toDataURL()), hoverCanvas,
    'Pinning a hovered node updates its canvas detail without changing layout');
  await page.keyboard.press('Escape');
  assert.equal(await canvas.evaluate(node => node === document.activeElement), true,
    'Escape closes pinned details and returns focus to the canvas');
  assert.equal(await canvas.evaluate(node => getComputedStyle(node).outlineStyle !== 'none'), true,
    'Canvas keyboard focus has a visible outline');

  // Search-driven allocation, dependent refund, mastery selection, undo, and export.
  await inspect(mastery.notableId);
  await page.locator('#allocateNode').click();
  let marauderSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), marauderKey);
  assert.ok(marauderSave.selected.length > 1, 'Notable path was allocated');
  assert.ok(marauderSave.selected.includes(mastery.notableId), 'Expected notable is selected');
  const allocatedCount = marauderSave.selected.length;
  await page.locator('#allocateNode').click();
  marauderSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), marauderKey);
  assert.equal(marauderSave.selected.includes(mastery.notableId), false, 'Refund removes the selected notable');
  assert.ok(marauderSave.selected.length < allocatedCount, 'Refund reduces the allocated point count');

  await inspect(mastery.notableId);
  await page.locator('#allocateNode').click();
  await inspect(mastery.masteryId);
  await page.locator('#masteryChoice').selectOption(String(mastery.effect));
  await page.locator('#allocateNode').click();
  marauderSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), marauderKey);
  assert.equal(marauderSave.masteries[mastery.masteryId], String(mastery.effect), 'Mastery effect is persisted');
  await page.locator('#treeUndo').click();
  marauderSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), marauderKey);
  assert.equal(marauderSave.masteries[mastery.masteryId], undefined, 'Undo restores prior mastery selection');
  await page.locator('#masteryChoice').selectOption(String(mastery.effect));
  await page.locator('#allocateNode').click();
  await page.locator('#treeExportPanel summary').click();
  await page.locator('#treeExport').click();
  const exported = JSON.parse(await page.locator('#treeTransfer').inputValue());
  assert.ok(exported.selected.includes(mastery.masteryId), 'Export includes the selected mastery');
  assert.equal(exported.masteries[mastery.masteryId], String(mastery.effect), 'Export includes mastery effect');
  await page.locator('#treeHighlight').selectOption('all');
  await inspect(mastery.masteryId);
  await capture('tree-mastery-detail.png');

  // Class changes retain separate saves, including a Character-screen edit.
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await page.getByRole('button', { name: 'Edit character' }).click();
  await page.locator('select[aria-label="Character class"]').selectOption('Ranger', { force: true });
  await page.getByRole('button', { name: 'Return to character' }).click();
  await page.waitForFunction(() => document.querySelector('.calculation-identity h3')?.textContent.includes('Ranger'));
  await page.waitForFunction(() => document.querySelector('.calculation-notice')?.textContent.includes('Partial build calculation'));
  const coreStat = async name => {
    const row = page.locator('.calculation-stat').filter({
      has: page.locator('span').filter({ hasText: new RegExp(`^${name}$`) }),
    });
    const text = await row.locator('strong').textContent();
    return Number((text || '').replace(/[^\d.-]/g, ''));
  };
  const lifeBefore = await coreStat('Life');
  const evasionBefore = await coreStat('Evasion');
  await page.getByRole('button', { name: 'Skill tree', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#treeCharacter')?.textContent.includes('Ranger'));
  await inspect(rangerNode);
  const rangerAscendancy = data.classes[rangerIndex].ascendancies.find(item => item.name === 'Deadeye');
  assert.ok(rangerAscendancy, 'Deadeye is available for the ascendancy reference capture');
  await page.locator('#treeHighlight').selectOption('all');
  await page.locator('#treeView').selectOption(rangerAscendancy.id);
  await page.locator('#treeFit').click();
  await capture('tree-deadeye-ascendancy.png');
  await page.locator('#treeView').selectOption('passive');
  await page.locator('#treeFit').click();
  await inspect(rangerNode);
  await page.locator('#allocateNode').click();
  const rangerKey = 'poe.tree.3_29.Ranger.';
  const rangerSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), rangerKey);
  assert.ok(rangerSave.selected.length > 1, 'Ranger allocation is saved');
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await page.waitForFunction(expected => {
    const rows = [...document.querySelectorAll('.calculation-stat')];
    const text = name => rows.find(row => row.querySelector('span')?.textContent?.trim() === name)
      ?.querySelector('strong')?.textContent?.replace(/[^\d.-]/g, '');
    return Number(text('Life')) === expected.life + 14 && Number(text('Evasion')) > expected.evasion;
  }, { life: lifeBefore, evasion: evasionBefore });
  assert.equal(await coreStat('Life'), lifeBefore + 14, 'Ranger passive #39821 adds 14 life to Character calculations');
  assert.ok(await coreStat('Evasion') > evasionBefore, 'Ranger passive #39821 increases Character evasion');
  await page.getByRole('button', { name: 'Skill tree', exact: true }).click();
  await inspect(rangerNode);
  await page.locator('#allocateNode').click();
  await page.getByRole('button', { name: 'Character', exact: true }).click();
  await page.waitForFunction(expected => {
    const rows = [...document.querySelectorAll('.calculation-stat')];
    const value = name => rows.find(row => row.querySelector('span')?.textContent?.trim() === name)
      ?.querySelector('strong')?.textContent?.replace(/[^\d.-]/g, '');
    return Number(value('Life')) === expected.life && Number(value('Evasion')) === expected.evasion;
  }, { life: lifeBefore, evasion: evasionBefore });
  assert.equal(await coreStat('Life'), lifeBefore, 'Refund returns Character life to baseline');
  assert.equal(await coreStat('Evasion'), evasionBefore, 'Refund returns Character evasion to baseline');
  await page.getByRole('button', { name: 'Skill tree', exact: true }).click();
  marauderSave = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), marauderKey);
  assert.equal(marauderSave.masteries[mastery.masteryId], String(mastery.effect), 'Marauder mastery remains isolated');

  // Mouse pan, wheel zoom, and keyboard pan/zoom must all redraw the canvas.
  await page.locator('#closeNode').click();
  const canvasImage = () => canvas.screenshot();
  const beforeCamera = await canvasImage();
  const currentBox = await canvas.boundingBox();
  await page.mouse.move(currentBox.x + currentBox.width / 2, currentBox.y + currentBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(currentBox.x + currentBox.width / 2 + 48, currentBox.y + currentBox.height / 2 + 24);
  await page.mouse.up();
  await page.mouse.move(currentBox.x + currentBox.width / 2, currentBox.y + currentBox.height / 2);
  await page.mouse.wheel(0, -180);
  const afterCamera = await canvasImage();
  assert.notDeepEqual(afterCamera, beforeCamera, 'Pointer pan and wheel zoom redraw the tree');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('+');
  assert.notDeepEqual(await canvasImage(), afterCamera, 'Keyboard pan and zoom redraw the tree');
  await page.locator('#treeFit').click();
  await inspect(rangerNode);
  const detailBox = await canvas.boundingBox();
  await page.mouse.move(detailBox.x + detailBox.width / 2, detailBox.y + detailBox.height / 2);
  await page.mouse.wheel(0, -900);
  await capture('tree-zoom-detail.png');

  // Verify saved build remains intact as palette, viewport, and motion preferences change.
  await page.locator('#closeNode').click();
  await page.locator('#treeHighlight').selectOption('all');
  await page.locator('#treeFit').click();
  const treeSavesBeforeVisual = await saves();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings' });
  const motion = settings.locator('select[aria-label="Motion"]');
  await motion.selectOption('reduced');
  assert.equal(await motion.inputValue(), 'reduced', 'Reduce motion preference can be selected');
  for (const palette of ['emerald', 'violet', 'rosegold']) {
    await settings.locator('#auroraBackground').selectOption(palette);
    await page.keyboard.press('Escape');
    await settings.waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Skill tree', exact: true }).click();
    await page.waitForFunction(value => document.querySelector('.app-shell')?.getAttribute('data-aurora') === value, palette);
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.waitForFunction(() => {
        const element = document.querySelector('#treeCanvas');
        return element?.width === Math.round(element.clientWidth * devicePixelRatio);
      });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true,
        `${palette} palette has no horizontal page overflow at ${width}px`);
      assert.equal(await canvas.evaluate(node => node.clientWidth > 0 && node.clientHeight > 0), true,
        `Canvas remains visible at ${width}px`);
      await capture(`${palette}-${width}.png`);
    }
    if (palette !== 'rosegold') {
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      await settings.waitFor({ state: 'visible' });
    }
  }
  assert.deepEqual(await saves(), treeSavesBeforeVisual, 'Palette and viewport checks do not change tree saves');
  assert.deepEqual(errors, [], 'No uncaught page errors');
  assert.deepEqual(external, [], 'No external requests');
  assert.deepEqual(badResponses, [], 'No failed local assets or API responses');
  assert.ok(treeSpriteRequests.some(url => url.includes('/tree-data/sprites.json')), 'Tree sprite manifest loaded');
  assert.ok(treeSpriteRequests.some(url => /\/tree-data\/[^/]+\.(?:png|jpe?g|webp)(?:\?|$)/i.test(url)),
    'At least one local tree atlas image loaded');

  const fallbackPage = await context.newPage();
  const failedSprites = [];
  const fallbackErrors = [];
  fallbackPage.on('pageerror', error => fallbackErrors.push(error.message));
  await fallbackPage.route('**/tree-data/*', route => {
    if (/\.(?:png|jpe?g|webp)(?:\?|$)/i.test(route.request().url())) {
      failedSprites.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  await fallbackPage.goto(`${origin}/#tree`);
  await fallbackPage.getByRole('button', { name: 'Skill tree', exact: true }).click();
  const fallbackCanvas = fallbackPage.locator('#treeCanvas');
  await fallbackPage.waitForFunction(() => document.querySelector('#treeCanvas')?.width > 0);
  await fallbackPage.waitForFunction(() => {
    const element = document.querySelector('#treeCanvas');
    return element && element.getContext('2d')?.getImageData(0, 0, element.width, element.height).data.some(Boolean);
  });
  assert.ok(failedSprites.length, 'Fallback fixture blocked tree atlas images');
  assert.deepEqual(fallbackErrors, [], 'Missing atlas images leave the canvas fallback operational');
  assert.ok(await fallbackCanvas.evaluate(element => {
    const {data} = element.getContext('2d').getImageData(0, 0, element.width, element.height);
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4 * 4096) colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    return colors.size > 3;
  }), 'Fallback canvas contains rendered tree art');
  console.log(`PASS tree QA: allocation/refund, mastery/undo/export, Character calculations, search/filter, hit/pan/zoom/focus, DPR 2 backing on resize, image fallback, reduced motion, three palettes and 390/768/1440px. Screenshots: ${outputDir}`);
} finally {
  await browser?.close();
  server.close();
}
