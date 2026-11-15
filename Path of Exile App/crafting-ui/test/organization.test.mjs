import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { uiRoutes } from '../server/routes.mjs';
import { makeServer } from '../server.mjs';
import { conciseDefinition } from '../shared/definitions/glossary-model.js';

test('all route aliases and relative module imports resolve after organization', async () => {
  for (const file of new Set(Object.values(uiRoutes))) {
    const url = new URL('../' + file, import.meta.url);
    await access(url);
    if (!file.endsWith('.js')) continue;
    const source = await readFile(url, 'utf8');
    const imports = source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g);
    for (const [, specifier] of imports) await access(new URL(specifier, url));
  }
});

test('missing allowlisted files respond cleanly and leave the server usable', async () => {
  const server = makeServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const path of ['/assets/buffs/000000000000000000000000.png', '/tree-data/does-not-exist.json']) {
      assert.equal((await fetch(origin + path)).status, 404);
      assert.equal((await fetch(origin + '/')).status, 200);
    }
    for (const [path, file] of Object.entries(uiRoutes)) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200, path);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      if (path === '/character.js') {
        assert.match(await response.text(), /from '\/features\/tree\/tree.js'/);
      }
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
