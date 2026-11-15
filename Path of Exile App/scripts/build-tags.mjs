import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function buildTagCatalog(tags, sources, gems) {
  if (!Array.isArray(tags) || tags.some(t => typeof t !== 'string' || !t) || new Set(tags).size !== tags.length) throw Error('Invalid RePoE tag registry');
  const entries = new Map(), missing = [];
  function define(namespace, id) {
    const key = `${namespace}:${id}`;
    if (!entries.has(key)) entries.set(key, {key, namespace, id, references: []});
    return entries.get(key);
  }
  tags.forEach(id => define('repoe', id));
  function reference(namespace, id, reference) {
    if (typeof id !== 'string' || !id) throw Error('Invalid tag reference');
    const key = `${namespace}:${id}`;
    if (namespace === 'repoe' && !entries.has(key)) { missing.push({id, ...reference}); return; }
    define(namespace, id).references.push(reference);
  }
  for (const [file, records] of Object.entries(sources)) for (const [record, data] of Object.entries(records)) {
    function visit(value, path = '') {
      if (!value || typeof value !== 'object') return;
      for (const [field, child] of Object.entries(value)) {
        const next = path ? `${path}.${field}` : field;
        if (field === 'influence_tags' && child && typeof child === 'object') Object.entries(child).forEach(([influence,id]) => reference('repoe',id,{file,record,field:`${next}.${influence}`}));
        else if (['tags', 'implicit_tags', 'adds_tags'].includes(field) && Array.isArray(child)) child.forEach((id, index) => reference('repoe', id, {file, record, field:next, index}));
        else if (field === 'tag' && typeof child === 'string') reference('repoe', child, {file, record, field:next});
        else visit(child, next);
      }
    }
    visit(data);
  }
  for (const gem of gems) {
    gem.tags.forEach(id => reference('pob-gem', id, {file:'skills-data.json', record:gem.id, field:'tags'}));
    for (const field of ['skillTypes','minionSkillTypes','requireSkillTypes','excludeSkillTypes','addSkillTypes']) {
      for (const id of gem.rules[field] || []) if (!['AND','OR','NOT'].includes(id)) reference('pob-skill-type', id, {file:'skills-data.json',record:gem.id,field});
    }
  }
  if (missing.length) throw Error(`Unknown RePoE tag references: ${JSON.stringify(missing.slice(0,20))} (${missing.length} total)`);
  return {version:1, tags:[...entries.values()].sort((a,b)=>a.key.localeCompare(b.key))};
}

export async function buildTags() {
  const root = new URL('../', import.meta.url), hashes = {};
  async function read(path) {
    const raw = await readFile(new URL(path, root));
    hashes[path] = createHash('sha256').update(raw).digest('hex');
    return JSON.parse(raw.toString('utf8').replace(/^\uFEFF/,''));
  }
  const provenance = await read('data-sources/repoe-poe1/provenance.json');
  const tags = await read('data-sources/repoe-poe1/tags.json'), sources = {};
  for (const name of ['base_items','mods','mod_types','item_classes']) sources[`${name}.json`] = await read(`data-sources/repoe-poe1/${name}.json`);
  for (const [path, hash] of Object.entries(hashes)) {
    if (!path.startsWith('data-sources/repoe-poe1/') || path.endsWith('provenance.json')) continue;
    const entry = provenance.files.find(f => f.file === path.split('/').pop());
    if (!entry || entry.sha256.toLowerCase() !== hash) throw Error(`Source hash mismatch: ${path}`);
  }
  const skills = await read('crafting-ui/skills-data.json');
  const catalog = {...buildTagCatalog(tags,sources,skills.gems), sources:hashes};
  await writeFile(new URL('crafting-ui/tag-data.json',root),JSON.stringify(catalog));
  const report = {version:1,sources:hashes,namespaces:Object.fromEntries(['repoe','pob-gem','pob-skill-type'].map(ns=>[ns,{tags:catalog.tags.filter(t=>t.namespace===ns).length,references:catalog.tags.filter(t=>t.namespace===ns).reduce((n,t)=>n+t.references.length,0)}])),unreferencedRePoETags:catalog.tags.filter(t=>t.namespace==='repoe'&&!t.references.length).map(t=>t.id),missingReferences:[]};
  await writeFile(new URL('resources/tag-import-report.json',root),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.namespaces));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await buildTags();
