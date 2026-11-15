import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { adaptRePoE } from '../crafting-engine/src/repoe.ts';
import { buildTags } from './build-tags.mjs';

const root = new URL('../', import.meta.url);
const source = new URL('data-sources/repoe-poe1/', root);
const provenance = JSON.parse(
  (await readFile(new URL('provenance.json', source), 'utf8')).replace(/^\uFEFF/, ''),
);
async function read(name) {
  const bytes = await readFile(new URL(name, source));
  const entry = provenance.files.find((f) => f.file === name);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (!entry || hash !== entry.sha256.toLowerCase())
    throw new Error(`Source integrity check failed: ${name}`);
  return JSON.parse(bytes.toString('utf8'));
}
const data = adaptRePoE(
  await read('mods.json'),
  await read('base_items.json'),
  provenance.declaredExportVersion,
);
await buildTags();
await mkdir(new URL('crafting-data/', root), { recursive: true });
await writeFile(new URL('crafting-data/repoe-poe1.json', root), JSON.stringify(data));
await writeFile(
  new URL('crafting-data/import-report.json', root),
  JSON.stringify({ source: provenance, report: data.report }, null, 2),
);
console.log(
  `Built PoE 1 ${data.sourceVersion}: ${data.mods.length} candidate modifiers, ${data.bases.length} supported bases.`,
);
