import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';

const server = spawn(process.execPath, ['renderer/server.mjs'], {
  env: { ...process.env, RENDERER_PORT: '4332' },
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
  await page.addInitScript(() => {
    const NativeWorker = window.Worker;
    window.Worker = new Proxy(NativeWorker, {
      construct(target, args) {
        const worker = Reflect.construct(target, args);
        if (String(args[0]).includes('odds.worker')) {
          const postMessage = worker.postMessage.bind(worker);
          worker.postMessage = (payload, ...transfer) => {
            window.__oddsPayload = structuredClone(payload);
            return postMessage(payload, ...transfer);
          };
        }
        return worker;
      },
    });
  });
  await page.goto('http://127.0.0.1:4332/');
  await page.getByRole('button', { name: 'Crafting', exact: true }).click();
  await page.getByRole('button', { name: 'Create / reset' }).waitFor({ state: 'visible' });
  await page.waitForFunction(
    () => !document.querySelector('#craftingPanel button:disabled') ||
      document.querySelector('#dataStatus')?.textContent.includes('bases'),
  );
  await page.getByRole('button', { name: 'Create / reset' }).click();
  const currency = page.locator('.craft-currencies button:not(:disabled)').first();
  await page.getByLabel('Monte Carlo samples').fill('100');
  await page.getByRole('button', { name: 'Calculate odds' }).click();
  await page.waitForFunction(() => document.querySelector('.craft-goal pre')?.textContent.includes('Hit probability:'));

  const workerOddsText = await page.locator('.craft-goal pre').innerText();
  const mainThreadOdds = await page.evaluate(async () => {
    const input = window.__oddsPayload;
    if (!input) throw new Error('Odds worker request was not captured.');
    const { createEngine, currencyOdds, SeededRng } = await import('/crafting-engine/src/index.ts');
    const engine = createEngine(input.mods, input.config);
    const result = currencyOdds(engine, input.item, input.currency, input.goal, {
      rng: new SeededRng(2026),
      maxNodes: 2000,
      samples: input.samples,
    });
    return result.method === 'exact'
      ? { method: result.method, probability: result.probability, outcomeCount: result.outcomes.length }
      : result;
  });
  const displayedProbability = /Hit probability: ([\d.]+)%/.exec(workerOddsText)?.[1];
  assert.ok(displayedProbability, `Worker odds did not display a probability: ${workerOddsText}`);
  assert.equal(displayedProbability, (mainThreadOdds.probability * 100).toFixed(3));
  assert.match(workerOddsText, mainThreadOdds.method === 'exact' ? /Exact enumeration/ : /Monte Carlo estimate/);
  if (mainThreadOdds.method === 'exact') {
    assert.match(workerOddsText, new RegExp(`Distinct outcomes: ${mainThreadOdds.outcomeCount}`));
  } else {
    const interval = /95% interval: ([\d.]+)[–-]([\d.]+)% \((\d+) samples\)/.exec(workerOddsText);
    assert.ok(interval, `Worker odds did not display the confidence interval: ${workerOddsText}`);
    assert.equal(interval[1], (mainThreadOdds.confidence95.low * 100).toFixed(3));
    assert.equal(interval[2], (mainThreadOdds.confidence95.high * 100).toFixed(3));
    assert.equal(Number(interval[3]), mainThreadOdds.samples);
  }

  await currency.click();
  const item = await page.locator('.craft-current-item').innerText();
  const history = await page.locator('.craft-lower').innerText();
  await page.getByRole('button', { name: 'Skills', exact: true }).click();
  await page.getByRole('button', { name: 'Crafting', exact: true }).click();
  assert.equal(await page.locator('.craft-current-item').innerText(), item);
  assert.equal(await page.locator('.craft-lower').innerText(), history);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.match(await page.locator('.craft-lower').innerText(), /No currency spent/);
  await currency.click();
  assert.equal(await page.locator('.craft-current-item').innerText(), item, 'undo restores RNG');
  assert.deepEqual(errors, []);
} finally {
  await browser?.close();
  server.kill();
}
