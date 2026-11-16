import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../server.mjs';
test('React shell serves offline data and engine modules while blocking retired UI files', async () => {
  const server = makeServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    const url = `http://127.0.0.1:${server.address().port}`;
    const shell = await fetch(url + '/');
    assert.equal(shell.status, 200);
    assert.match(shell.headers.get('content-type'), /text\/html/);
    const html = await shell.text();
    assert.match(html, /<div id="root"><\/div>/);
    const jsAsset = html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
    const cssAsset = html.match(/href="(\/assets\/[^"]+\.css)"/)?.[1];
    assert.ok(jsAsset);
    assert.ok(cssAsset);
    for (const path of [jsAsset, cssAsset, '/src/index.ts', '/src/model.ts', '/src/repoe.ts', '/test/fixtures.ts']) {
      const response = await fetch(url + path);
      assert.equal(response.status, 200, path);
      const body = await response.text();
      assert.ok(body.length > 0);
      if (path.endsWith('.ts')) {
        assert.match(response.headers.get('content-type'), /javascript/);
        assert.ok(!body.includes('export interface'));
      }
    }
    for (const path of ['/app.js', '/character.js', '/odds-worker.js', '/style.css', '/features/character/character.js']) {
      assert.equal((await fetch(url + path)).status, 404, path);
    }
    const dataset = await fetch(url + '/data/repoe-poe1.json');
    assert.equal(dataset.status, 200);
    assert.equal(dataset.headers.get('content-type'), 'application/json');
    const pack = await dataset.json();
    assert.equal(pack.sourceVersion, '3.29.3.6');
    assert.equal(pack.bases.length, 929);
    assert.equal((await fetch(url + '/package.json')).status, 404);
    const skills = await fetch(url + '/skills-data.json');
    assert.equal(skills.headers.get('content-type'), 'application/json');
    assert.equal((await skills.json()).gems.length, 822);
    const tags = await fetch(url + '/tag-data.json');
    assert.equal(tags.status,200);
    assert.equal((await tags.json()).tags.filter(t=>t.namespace==='repoe').length,1389);
    const glossary = await fetch(url + '/glossary-data.json');
    assert.equal(glossary.status,200);
    assert.ok((await glossary.json()).entries.length > 1000);
    const definitions = await fetch(url + '/tooltip-data.json');
    assert.equal(definitions.status,200);
    assert.ok((await definitions.json()).entries.length>1000);
    const buffs = await fetch(url+'/buff-data.json');
    const buffData=await buffs.json();assert.equal(buffData.entries.length,2814);
    const icon=await fetch(url+buffData.entries.find(e=>e.icon).icon);assert.equal(icon.headers.get('content-type'),'image/png');assert.equal(icon.status,200);
    assert.equal((await fetch(url + '/assets/gems/not-a-local-hash.png')).status, 404);
    for (const currency of [
      'transmutation',
      'alteration',
      'augmentation',
      'regal',
      'alchemy',
      'chaos',
      'exalted',
      'annulment',
      'scouring',
      'divine',
    ]) {
      const response = await fetch(`${url}/assets/currency/${currency}.webp`);
      assert.equal(response.status, 200, currency);
      assert.equal(response.headers.get('content-type'), 'image/webp');
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    }
    assert.equal((await fetch(url + '/src/../../crafting-engine/package.json')).status, 404);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
