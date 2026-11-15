import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { armourReduction, hitChance } from '../src/rules.ts';

interface ReferenceCapture {
  schemaVersion: number;
  kind: string;
  archiveSha256: string;
  fullBuildParity: boolean;
  results: { id: string; function: string; args: [number, number]; value: number }[];
}
export function compareCapture(capture: ReferenceCapture) {
  if (capture.schemaVersion !== 1 || capture.kind !== 'executed-pob-lua-helpers' || capture.fullBuildParity !== false) throw new TypeError('Unsupported reference capture');
  const pin = JSON.parse(fs.readFileSync(new URL('./pin.json', import.meta.url), 'utf8')) as { sha256: string };
  if (capture.archiveSha256 !== pin.sha256) throw new Error('Capture comes from a different PoB snapshot');
  return capture.results.filter(row => row.function !== 'armourReduction').map(row => {
    // PoB helper returns raw armour reduction; our supported rule includes the 90% physical cap.
    const expected = row.function === 'hitChance' ? row.value : Math.min(90, row.value);
    const actual = row.function === 'hitChance' ? hitChance(...row.args) : armourReduction(...row.args);
    if (!['hitChance', 'armourReductionF'].includes(row.function)) throw new Error('Unknown captured helper');
    const matches = Math.abs(actual - expected) <= 1e-10;
    const knownDifference = row.function === 'hitChance' && row.args[0] === 0 && row.args[1] === 0
      && expected === 100 && actual === 5
      ? 'Zero/zero Lua NaN min/max yields 100; engine deliberately defines zero accuracy as 5%.' : null;
    return { id: row.id, expected, actual, matches, knownDifference };
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const path = process.argv[2] ?? new URL('./capture.json', import.meta.url);
  const rows = compareCapture(JSON.parse(fs.readFileSync(path, 'utf8')) as ReferenceCapture);
  console.log(JSON.stringify({ comparisons: rows, allMatch: rows.every(row => row.matches), unexpectedDifferences: rows.filter(row => !row.matches && !row.knownDifference).length, scope: 'isolated Lua helpers only' }, null, 2));
  if (rows.some(row => !row.matches && !row.knownDifference)) process.exitCode = 1;
}
