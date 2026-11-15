import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { compareCapture } from '../reference/compare.ts';

test('pinned executed PoB Lua captures match supported helper semantics with explicit known boundary difference', () => {
  const capture = JSON.parse(fs.readFileSync(new URL('../reference/capture.json', import.meta.url), 'utf8'));
  const results = compareCapture(capture);
  assert.equal(results.length, 9);
  assert.equal(results.filter(row => row.matches).length, 8);
  const differences = results.filter(row => !row.matches);
  assert.equal(differences.length, 1);
  assert.equal(differences[0]!.id, 'accuracy-zero');
  assert.ok(differences[0]!.knownDifference);
  assert.equal(results.filter(row => !row.matches && !row.knownDifference).length, 0);
  assert.throws(() => compareCapture({ ...capture, archiveSha256: 'untrusted' }));
});
