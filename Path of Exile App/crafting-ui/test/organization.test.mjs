import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { makeServer } from '../server.mjs';
import { conciseDefinition } from '../shared/definitions/glossary-model.js';

test('missing local resources and retired UI routes respond cleanly', async () => {
  const server = makeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/assets/buffs/000000000000000000000000.png', '/tree-data/does-not-exist.json']) {
      assert.equal((await fetch(origin + path)).status, 404);
      assert.equal((await fetch(origin + '/')).status, 200);
    }
    for (const path of ['/app.js', '/character.js', '/features/character/character.js', '/definition-tooltips.js']) {
      assert.equal((await fetch(origin + path)).status, 404, path);
    }
    assert.equal((await fetch(origin + '/server/routes.mjs')).status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('absent or malformed optional definition text produces an empty preview', () => {
  for (const value of [null, undefined, {}, 42]) assert.equal(conciseDefinition(value), '');
});

test('production styles share defined design tokens', async () => {
  const root = new URL('../', import.meta.url);
  const files = (await readdir(root, { recursive: true })).filter(file => file.endsWith('.css'));
  const styles = await Promise.all(files.map(file => readFile(new URL(file.replaceAll('\\', '/'), root), 'utf8')));
  const definitions = new Set(styles.join('\n').matchAll(/(--[\w-]+)\s*:/g).map(match => match[1]));
  for (let index = 0; index < files.length; index++) {
    for (const [, token] of styles[index].matchAll(/var\((--[\w-]+)/g)) {
      assert.ok(definitions.has(token), `${files[index]}: undefined ${token}`);
    }
  }
});
