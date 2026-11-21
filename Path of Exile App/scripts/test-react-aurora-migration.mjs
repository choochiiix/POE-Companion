import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { makeServer } from '../crafting-ui/server.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const phase = process.argv[2] || 'after';
assert.ok(['before', 'foundation', 'after'].includes(phase));
const evidence = resolve('.validation', 'aurora-migration', phase);
const overlaysOnly = process.argv.includes('--overlays-only');
const routes = [
  ['character', 'Character', '#characterPanel', '.loadout-panel'],
  ['crafting', 'Crafting', '#craftingPanel', '#dataStatus'],
  ['tree', 'Skill tree', '#treePanel', 'canvas'],
  ['skills', 'Skills', '#skillsPanel', '.gem-card'],
  ['items', 'Item library', '#catalogPanel', '.unique-card'],
  ['compendium', 'Compendium', '#compendiumPanel', 'tbody tr'],
];
const colors = ['emerald', 'violet', 'rosegold'];
const accents = { emerald: '#7be1c7', violet: '#d3b8ef', rosegold: '#f3b4a0' };
const auroraKey = 'poe-companion.aurora-background.v1';
const profile = {
  'poe-companion.character.v1': { characterClass: 'Ranger', ascendancy: 'Deadeye' },
  'poe-companion.calculation.v1': { version: 1, level: 42, penalty: -30, enemyResistance: 25 },
};
const application = makeServer();
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const types = { js: 'text/javascript', css: 'text/css', png: 'image/png', jpg: 'image/jpeg', html: 'text/html' };
  if (phase === 'before' && (path === '/' || /^\/assets\/[a-zA-Z0-9._-]+$/.test(path) || path === '/devault-ascii-gradient.jpg')) {
    const name = path === '/' ? 'index.html' : path.slice(1);
    try {
      const body = await readFile(resolve(evidence, 'dist', name));
      response.writeHead(200, { 'Content-Type': types[name.split('.').pop()], 'Cache-Control': 'no-store' });
      response.end(body);
      return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  application.emit('request', request, response);
});

async function paint(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.allSettled([...document.images]
      .filter(image => image.getBoundingClientRect().height > 0 && image.loading !== 'lazy')
      .map(image => image.decode()));
    await Promise.allSettled(document.getAnimations()
      .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function capture(page, name, statistics) {
  await paint(page);
  const metrics = await page.evaluate(() => {
    function role(node) {
      if (!node) return null;
      const style = getComputedStyle(node);
      const { x, y, width, height } = node.getBoundingClientRect();
      const keys = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color',
        'outlineColor', 'outlineOffset', 'outlineWidth', 'outlineStyle', 'padding', 'gap', 'borderRadius',
        'borderColor', 'borderWidth', 'backgroundColor', 'backgroundImage', 'boxShadow', 'backdropFilter',
        'transitionTimingFunction', 'transitionDuration', 'transform', 'objectFit', 'objectPosition'];
      const variables = ['--accent', '--text', '--text-muted', '--line', '--control-border', '--selection-bg',
        '--control-hover', '--font-ui'];
      return {
        bounds: [x, y, width, height].map(value => Math.round(value * 10) / 10),
        ...Object.fromEntries(keys.map(key => [key, style[key]])),
        ...Object.fromEntries(variables.map(key => [key, style.getPropertyValue(key).trim()])),
      };
    }
    const shell = document.querySelector('.app-shell');
    const route = document.querySelector('#workspace-content > div:not([hidden])');
    const dialog = document.querySelector('[role=dialog][data-state=open]');
    const menu = document.querySelector('.spring-dropdown-menu:popover-open');
    const app = shell.querySelector('.app-sidebar');
    const glass = scope => role(scope?.querySelector('.glass-surface'));
    const representative = route?.querySelector('.loadout-panel, .ui-panel, .library-inspector, .tree-stage');
    const backdrop = shell.querySelector('.character-glass-backdrop, .aurora-backdrop');
    return {
      route: shell.dataset.route, aurora: shell.dataset.aurora, width: innerWidth,
      documentWidth: document.documentElement.scrollWidth, dpr: devicePixelRatio, scrollY,
      workspaceColumns: getComputedStyle(shell).gridTemplateColumns,
      characterColumns: route?.querySelector('.calculation-main-grid')
        ? getComputedStyle(route.querySelector('.calculation-main-grid')).gridTemplateColumns
        : null,
      shell: role(shell), sidebar: role(app), sidebarGlass: glass(app),
      nav: role(app.querySelector('[aria-current=page]')),
      backdrop: role(backdrop), backdropSource: backdrop?.getAttribute('src'),
      heading: role(route?.querySelector('h1, h2')), panel: role(representative),
      liveGlassCount: route?.querySelectorAll('.glass-surface--svg').length,
      panelGlass: glass(representative), control: role(route?.querySelector('button')),
      disabled: role(route?.querySelector('button:disabled')),
      input: role(route?.querySelector('input:not([type=hidden]), select')),
      portrait: role(route?.querySelector('.calculation-portrait img')),
      banner: role(route?.querySelector('.character-banner-art')),
      switchThumb: role(route?.querySelector('.plan-switch-highlight')),
      stats: route?.querySelector('.character-stat-column')?.innerText,
      equipment: route?.querySelector('.equipment-body')?.innerText,
      dialog: role(dialog), dialogGlass: glass(dialog),
      settingsCard: role(dialog?.querySelector('.settings-card')),
      settingsGlass: glass(dialog?.querySelector('.settings-card')),
      inspector: role(route?.querySelector('.library-inspector')),
      inspectorGlass: glass(route?.querySelector('.library-inspector')),
      focused: role(document.querySelector(':focus-visible')),
      dialogControl: role(dialog?.querySelector('input, select')),
      menu: role(menu), menuSelected: role(menu?.querySelector('[aria-selected=true]')),
    };
  });
  statistics[name] = metrics;
  assert.ok(metrics.documentWidth <= metrics.width, `${name} horizontal overflow ${metrics.documentWidth}`);
  if (phase === 'after') {
    assert.match(metrics.shell.backgroundImage, new RegExp(`aurora-${metrics.aurora}[^"]+\\.png`), name);
    assert.equal(metrics.nav['--accent'], accents[metrics.aurora], `${name} navigation accent`);
    assert.match(metrics.sidebarGlass.backdropFilter, /blur\(4px\)/, `${name} navigation glass`);
    if (!metrics.dialog && !metrics.menu) assert.ok(metrics.liveGlassCount > 0, `${name} route glass`);
    if (metrics.dialog) assert.equal(metrics.dialog['--accent'], accents[metrics.aurora], `${name} dialog accent`);
    if (metrics.menu) assert.equal(metrics.menu['--accent'], accents[metrics.aurora], `${name} menu accent`);
  }
  await page.screenshot({ path: resolve(evidence, `${name}.png`), animations: 'allow', timeout: 30000 });
}

async function showSettings(page) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.waitFor();
  return settings;
}

async function closeDialog(page, dialog) {
  await page.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
}

async function characterStates(page, captureState) {
  const overview = page.getByRole('button', { name: 'Character overview', exact: true });
  const comparison = page.getByRole('button', { name: 'Equipment comparison', exact: true });
  await comparison.click();
  await captureState('comparison-view');
  await overview.click();
  await page.locator('.gear-slot.helmet summary').click();
  await page.locator('.gear-slot.helmet .equipped-gear-card').waitFor();
  await page.locator('.gear-slot.helmet .is-springing').waitFor({ state: 'hidden' });
  await captureState('equipment-expanded');
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await captureState('lower-workspace');
  await page.getByRole('button', { name: 'Edit helmet item' }).click();
  const gear = page.getByRole('dialog');
  await captureState('gear-editor');
  await closeDialog(page, gear);
  await page.getByRole('button', { name: 'Calculation settings' }).click();
  const assumptions = page.getByRole('dialog', { name: 'Combat assumptions' });
  await captureState('combat');
  await closeDialog(page, assumptions);
  const identityButton = page.getByRole('button', { name: 'Edit character' });
  await identityButton.click();
  const identity = page.getByRole('dialog', { name: 'Edit character' });
  await captureState('identity');
  await identity.getByLabel('Character class', { exact: true }).click();
  const menu = page.locator('.spring-dropdown-menu:popover-open');
  await menu.getByRole('option').first().waitFor();
  await page.waitForFunction(() => {
    const menu = document.querySelector('.spring-dropdown-menu:popover-open');
    return Number(menu?.style.opacity) > 0.99 &&
      [...menu.querySelectorAll('[role=option]')].every(option => Number(option.style.opacity) > 0.99);
  });
  await captureState('class-dropdown');
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'hidden' });
  assert.ok(await identity.isVisible(), 'Nested Escape preserves identity dialog');
  await closeDialog(page, identity);
  assert.ok(await identityButton.evaluate(button => document.activeElement === button), 'Identity focus return');
}

async function routeOverlays(page, captureState) {
  const nav = page.getByRole('navigation', { name: 'App sections' });
  await nav.getByRole('button', { name: 'Skills', exact: true }).click();
  const gems = page.getByLabel('Search gems, tags, descriptions and effects');
  await gems.fill('Fireball');
  await page.locator('article.gem-card').filter({ has: page.getByRole('heading', { name: 'Fireball', exact: true }) })
    .first().getByRole('button', { name: 'Inspect gem' }).click();
  await page.getByRole('button', { name: 'Hide inspector' }).waitFor();
  await page.waitForFunction(() => document.activeElement?.textContent.includes('Hide inspector'));
  await captureState('skills-inspector');
  await nav.getByRole('button', { name: 'Item library', exact: true }).click();
  await page.getByLabel('Search name, base or mods').fill('Tabula Rasa');
  await page.getByRole('button', { name: 'Compare with build' }).first().click();
  const comparison = page.getByRole('dialog', { name: 'Compare Tabula Rasa', exact: true });
  await comparison.waitFor();
  const slot = comparison.getByLabel('Target equipment slot', { exact: true });
  assert.equal(await slot.inputValue(), 'body-armour');
  assert.deepEqual(await comparison.locator('tbody tr').filter({ hasText: 'energyShield' })
    .locator('td').allInnerTexts(), ['energyShield', '0', '17', '+17']);
  await captureState('items-compare');
  await closeDialog(page, comparison);
  const settings = await showSettings(page);
  await settings.locator('#auroraBackground').click();
  const menu = page.locator('.spring-dropdown-menu:popover-open');
  await menu.getByRole('option', { name: /Rose Gold/ }).waitFor();
  await page.waitForFunction(() => Number(document.querySelector('.spring-dropdown-menu:popover-open')?.style.opacity) > 0.99);
  await captureState('items-settings-aurora-menu');
  await page.keyboard.press('Escape');
  await menu.waitFor({ state: 'hidden' });
  assert.ok(await settings.isVisible(), 'Nested Escape preserves Settings dialog over Item library');
  await closeDialog(page, settings);
}

await mkdir(evidence, { recursive: true });
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const statistics = {};
const errors = [];
const external = [];
let browser;
try {
  const pack = await (await fetch(`${origin}/data/repoe-poe1.json`)).json();
  const helmet = pack.bases.find(base => base.name === 'Iron Hat');
  assert.ok(helmet, 'Fixture helmet available');
  profile['poe-companion.equipment.v1'] = { helmet: helmet.id };
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  console.log(`${phase} using Edge ${browser.version()} at ${origin}`);
  for (const aurora of phase === 'foundation' ? ['emerald'] : colors) {
    const browserContext = await browser.newContext({ deviceScaleFactor: 1, locale: 'en-US' });
    await browserContext.addInitScript(({ profile, aurora, auroraKey }) => {
      window.qaWorkspacePanels = [];
      document.addEventListener('workspace:change', event => window.qaWorkspacePanels.push(event.detail.panelId));
      if (sessionStorage.getItem('aurora-migration-fixture')) return;
      sessionStorage.setItem('aurora-migration-fixture', 'true');
      Object.entries(profile).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value)));
      if (aurora !== 'emerald') localStorage.setItem(auroraKey, aurora);
    }, { profile, aurora, auroraKey });
    await browserContext.route('**/*', route => {
      if (route.request().url().startsWith(`${origin}/`)) return route.continue();
      external.push(route.request().url());
      return route.abort();
    });
    const page = await browserContext.newPage();
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(12000);
    for (const [width, height] of [[1440, 1000], [390, 844]]) {
      await page.setViewportSize({ width, height });
      await page.goto(origin);
      await page.getByRole('button', { name: 'Edit helmet item' }).waitFor();
      if (overlaysOnly) {
        await routeOverlays(page, name => capture(page, `${aurora}-${width}-${name}`, statistics));
        continue;
      }
      const nav = page.getByRole('navigation', { name: 'App sections' });
      for (const [id, label, selector, content] of routes.filter(([id]) => phase !== 'foundation' || id === 'character')) {
        await nav.getByRole('button', { name: label, exact: true }).click();
        await page.locator(selector).locator(content).first().waitFor();
        await page.waitForFunction(panel => window.qaWorkspacePanels.at(-1) === panel, selector.slice(1));
        assert.equal(new URL(page.url()).hash, `#${id}`);
        await page.evaluate(() => scrollTo(0, 0));
        await capture(page, `${aurora}-${width}-${id}`, statistics);
      }
      if (phase !== 'foundation') {
        const settings = await showSettings(page);
        await capture(page, `${aurora}-${width}-settings-compendium`, statistics);
        await closeDialog(page, settings);
      }
      await nav.getByRole('button', { name: 'Character', exact: true }).click();
      await page.evaluate(() => scrollTo(0, 0));
      const settingsCharacter = await showSettings(page);
      await capture(page, `${aurora}-${width}-settings-character`, statistics);
      await closeDialog(page, settingsCharacter);
      await characterStates(page, name => capture(page, `${aurora}-${width}-character-${name}`, statistics));
      if (phase === 'after') {
        await routeOverlays(page, name => capture(page, `${aurora}-${width}-${name}`, statistics));
        await nav.getByRole('button', { name: 'Character', exact: true }).click();
      }
    }
    if (!overlaysOnly && aurora === 'emerald') {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.getByRole('button', { name: 'Collapse sidebar' }).click();
      await page.evaluate(() => scrollTo(0, 0));
      await capture(page, 'emerald-1440-character-collapsed', statistics);
      await page.getByRole('button', { name: 'Expand sidebar' }).click();
      for (const width of [1051, 1049, 761, 759, 621, 619]) {
        await page.setViewportSize({ width, height: 1000 });
        await capture(page, `emerald-${width}-character`, statistics);
        if (width < 630) {
          await page.getByRole('button', { name: 'Edit character' }).click();
          const identity = page.getByRole('dialog', { name: 'Edit character' });
          await capture(page, `emerald-${width}-character-identity`, statistics);
          await closeDialog(page, identity);
        }
      }
      if (phase === 'after') {
        await page.goto(`${origin}/?screen=catalog`);
        await page.locator('#catalogPanel').waitFor();
        await page.waitForFunction(() => window.qaWorkspacePanels.at(-1) === 'catalogPanel');
        await page.goto(`${origin}/#settings`);
        await page.getByRole('dialog', { name: 'Settings', exact: true }).waitFor();
        assert.equal(await page.locator('.app-shell').getAttribute('data-route'), 'character');
      }
    }
    await browserContext.close();
    console.log(`${phase} captured ${aurora}`);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(`PASS ${Object.keys(statistics).length} states with no page overflow, uncaught errors or external requests`);
} finally {
  const report = overlaysOnly ? 'overlay-computed-styles.json' : 'computed-styles.json';
  await writeFile(resolve(evidence, report), JSON.stringify({ statistics, errors, external }, null, 2));
  await browser?.close();
  server.close();
}
