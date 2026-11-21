import assert from 'node:assert/strict';
import test from 'node:test';
import { compareRelease } from '../../calculation-engine/reference/v2.68.1/compare.mjs';

test('workspace snapshots match selected values from executable PoB v2.68.1 fixtures', () => {
  const report = compareRelease();
  assert.equal(report.fixtures, 7);
  const failures = report.results.flatMap(({ id, comparisons }) =>
    comparisons.filter(row => !row.matches).map(row => ({ id, ...row })),
  );
  assert.deepEqual(failures, []);
});
