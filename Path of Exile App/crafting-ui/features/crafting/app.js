import {
  ASSUMPTION_CONFIG,
  CraftSession,
  SeededRng,
  createEngine,
  createItem,
  updateItem,
  currencyPlan,
  nextModOdds,
  definition,
  capsFor,
  affixCount,
  meetsGoal,
  attemptEconomics,
  modsForBase,
} from '/src/index.ts';
import { fakeMods, fakeBase, config as fixtureConfig } from '/test/fixtures.ts';
const $ = (id) => document.getElementById(id);
const currencies = [
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
];
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const option = (value, text) => {
  const el = document.createElement('option');
  el.value = value;
  el.textContent = text;
  return el;
};
const paragraph = (text, className) => {
  const el = document.createElement('p');
  el.textContent = text;
  if (className) el.className = className;
  return el;
};
const nameOf = (mod) => `${mod.name || mod.id} — ${mod.description || mod.id} [${mod.id}]`;
const fakeBases = [
  fakeBase,
  {
    ...fakeBase,
    id: 'fake-small-base',
    name: 'Fake small base',
    affixCaps: { rare: { prefix: 1, suffix: 1 } },
  },
];
let pack, engine, session, worker;
for (const c of currencies) $('oddsCurrency').append(option(c, capitalize(c)));
function numeric(id, min, max) {
  const n = Number($(id).value);
  if ($(id).value.trim() === '' || !Number.isFinite(n) || n < min || n > max)
    throw new Error(`Enter ${id} between ${min} and ${max}.`);
  return n;
}
function guard(action) {
  try {
    action();
  } catch (error) {
    $('message').textContent = error.message;
  }
}
function cancelOdds() {
  worker?.terminate();
  worker = undefined;
  $('analyze').textContent = 'Calculate odds';
}
function setupClasses() {
  $('itemClass').replaceChildren();
  const classes =
    $('dataset').value === 'real'
      ? [...new Set(pack.bases.map((b) => b.itemClass))].sort()
      : ['Fake fixtures'];
  for (const c of classes) $('itemClass').append(option(c, c));
  if (classes.includes('Wand')) $('itemClass').value = 'Wand';
  setupBases();
}
function setupBases() {
  $('base').replaceChildren();
  const bases =
    $('dataset').value === 'real'
      ? pack.bases.filter((b) => b.itemClass === $('itemClass').value)
      : fakeBases;
  for (const b of [...bases].sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id)))
    $('base').append(
      option(
        b.id,
        `${b.name || b.id}${b.dropLevel !== undefined ? ' · drop level ' + b.dropLevel : ''}`,
      ),
    );
  const imbued = bases.find((b) => b.name === 'Imbued Wand');
  if (imbued) $('base').value = imbued.id;
}
function fillTargets() {
  const previous = $('target').value,
    search = $('targetSearch').value.toLowerCase();
  $('target').replaceChildren();
  for (const m of engine.mods
    .filter(
      (m) => m.requiredLevel <= session.item.itemLevel && nameOf(m).toLowerCase().includes(search),
    )
    .sort((a, b) => nameOf(a).localeCompare(nameOf(b))))
    $('target').append(option(m.id, `${capitalize(m.affix)} · ${nameOf(m)}`));
  if ([...$('target').options].some((o) => o.value === previous)) $('target').value = previous;
  fillStats();
}
function fillStats() {
  const previous = $('targetStat').value;
  $('targetStat').replaceChildren();
  if ($('target').value)
    for (const s of definition(engine, $('target').value).stats)
      $('targetStat').append(option(s.id, `${s.id} (${s.min}–${s.max}, raw)`));
  if ([...$('targetStat').options].some((o) => o.value === previous))
    $('targetStat').value = previous;
  render();
}
function goal() {
  if (!$('target').value)
    throw new Error('Choose a target modifier. Clear the filter if there are no matches.');
  const mod = { id: $('target').value };
  if ($('threshold').value === '') return { kind: 'has', mod };
  if (!$('targetStat').value) throw new Error('This modifier has no numeric stat.');
  return {
    kind: 'value',
    mod,
    stat: $('targetStat').value,
    min: numeric('threshold', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER),
  };
}
function reset() {
  const level = numeric('level', 1, 100),
    seed = numeric('seed', 0, 4294967295);
  if (!Number.isInteger(level) || !Number.isInteger(seed))
    throw new Error('Level and seed must be integers.');
  const real = $('dataset').value === 'real',
    base = (real ? pack.bases : fakeBases).find((b) => b.id === $('base').value);
  if (!base) throw new Error('Select a supported base.');
  engine = createEngine(
    real ? modsForBase(pack.mods, base) : fakeMods,
    $('rules').value === 'fixture' ? fixtureConfig : ASSUMPTION_CONFIG,
  );
  session = new CraftSession(
    engine,
    updateItem(createItem(base, level, $('rarity').value), {
      corrupted: $('corrupted').checked,
    }),
    new SeededRng(seed),
  );
  $('dataStatus').textContent = real
    ? `RePoE PoE 1 · snapshot ${pack.sourceVersion} · ${pack.bases.length} bases · ${pack.mods.length} candidate mods · ${engine.mods.length} candidates for this base`
    : 'FAKE fixture data · for deterministic testing only';
  $('message').textContent =
    level < (base.dropLevel ?? 0)
      ? `Created debug item below this base's drop level (${base.dropLevel}).`
      : 'New session created.';
  $('targetSearch').value = '';
  $('threshold').value = '';
  fillTargets();
}
function render() {
  cancelOdds();
  const item = session.item,
    caps = capsFor(engine, item);
  $('item').replaceChildren(
    paragraph(`${capitalize(item.rarity)} ${item.base.name || item.base.id}`, 'item-name'),
    paragraph(
      `Level ${item.itemLevel} · Prefixes ${affixCount(engine, item, 'prefix')}/${caps.prefix} · Suffixes ${affixCount(engine, item, 'suffix')}/${caps.suffix}${item.corrupted ? ' · Corrupted' : ''}`,
    ),
  );
  if (item.base.implicits?.length) {
    const block = document.createElement('details'),
      summary = document.createElement('summary');
    summary.textContent = 'Base implicits · source ranges only';
    block.append(summary);
    for (const m of item.base.implicits) block.append(paragraph(m.description || m.id));
    block.append(
      paragraph(
        'Implicit values are not rolled in this prototype and do not occupy explicit slots.',
        'badge',
      ),
    );
    $('item').append(block);
  }
  if (!item.mods.length) $('item').append(paragraph('No explicit modifiers.'));
  const compare=document.createElement('button');compare.type='button';compare.textContent='Compare crafted item with build';compare.onclick=()=>document.dispatchEvent(new CustomEvent('calculation:compare',{detail:{baseId:item.base.id,name:`Crafted ${item.base.name||item.base.id}`,lines:(item.base.implicits??[]).map(mod=>(mod.description||mod.id).replace(/\((-?\d+(?:\.\d+)?)[–-](-?\d+(?:\.\d+)?)\)/g,(_,a,b)=>String((Number(a)+Number(b))/2))),rawStats:Object.fromEntries([...new Set(item.mods.flatMap(mod=>Object.keys(mod.values)))].map(id=>[id,item.mods.reduce((sum,mod)=>sum+(mod.values[id]??0),0)]))}}));$('item').append(compare);
  for (const mod of item.mods) {
    const def = definition(engine, mod.id),
      row = document.createElement('div'),
      title = document.createElement('strong');
    row.className = 'mod';
    title.textContent = def.name || mod.id;
    title.title = mod.id;
    row.append(
      title,
      paragraph(
        `${capitalize(def.affix)} · ${def.tier ? 'Tier ' + def.tier : 'Tier unknown'} · required level ${def.requiredLevel} · ${mod.id}`,
        'badge',
      ),
    );
    if (def.description) row.append(paragraph(`Source range: ${def.description}`, 'badge'));
    for (const [stat, n] of Object.entries(mod.values))
      row.append(paragraph(`${stat}: ${n} (raw exported units)`));
    for (const e of def.grantedEffects ?? [])
      row.append(paragraph(`Granted effect: ${e.id} · level ${e.level}`, 'badge'));
    $('item').append(row);
  }
  $('currencies').replaceChildren();
  for (const c of currencies) {
    const b = document.createElement('button'),
      plan = currencyPlan(engine, item, c),
      icon = document.createElement('img'),
      label = document.createElement('span');
    icon.src = `/assets/currency/${c}.webp`;
    icon.alt = '';
    icon.width = 32;
    icon.height = 32;
    label.textContent = capitalize(c);
    b.append(icon, label);
    b.disabled = !plan.ok;
    b.title = plan.ok ? `Apply ${capitalize(c)}` : plan.reason;
    b.onclick = () =>
      guard(() => {
        const result = session.apply(c);
        $('message').textContent = result.ok ? `Applied ${capitalize(c)}.` : result.reason;
        render();
      });
    $('currencies').append(b);
  }
  $('undo').disabled = session.history.length === 0;
  $('spent').textContent =
    Object.entries(session.spent)
      .map(([c, n]) => `${capitalize(c)}: ${n}`)
      .join(' · ') || 'No currency spent.';
  $('history').replaceChildren();
  session.history.forEach((entry) => {
    const li = document.createElement('li');
    li.textContent = `${capitalize(entry.currency)} → ${entry.after.mods.map((m) => definition(engine, m.id).name || m.id).join(', ') || 'No mods'}`;
    $('history').append(li);
  });
  const pool = nextModOdds(engine, item);
  $('pool').replaceChildren();
  if (!pool.length) $('pool').textContent = 'No eligible next modifiers.';
  else {
    const table = document.createElement('table');
    for (const p of [...pool].sort((a, b) => b.probability - a.probability)) {
      const tr = document.createElement('tr');
      for (const text of [
        nameOf(definition(engine, p.id)),
        `${(100 * p.probability).toFixed(3)}%`,
      ]) {
        const td = document.createElement('td');
        td.textContent = text;
        tr.append(td);
      }
      table.append(tr);
    }
    $('pool').append(table);
  }
  $('analyze').disabled = !$('target').value;
  $('goalState').textContent = !$('target').value
    ? 'No target matches the filter.'
    : meetsGoal(engine, item, goal())
      ? 'Target currently met.'
      : 'Target not yet met.';
  $('odds').textContent = 'Calculate odds for the current item.';
}
$('reset').onclick = () => guard(reset);
$('dataset').onchange = () => guard(setupClasses);
$('itemClass').onchange = () => guard(setupBases);
$('undo').onclick = () =>
  guard(() => {
    session.undo();
    $('message').textContent = 'Undid last currency and restored RNG state.';
    render();
  });
$('targetSearch').oninput = () => guard(fillTargets);
$('target').onchange = () => guard(fillStats);
for (const id of ['threshold', 'targetStat', 'oddsCurrency', 'samples', 'price'])
  $(id).onchange = () => guard(render);
$('analyze').onclick = () =>
  guard(() => {
    cancelOdds();
    const currency = $('oddsCurrency').value,
      price = numeric('price', 0, Number.MAX_SAFE_INTEGER),
      samples = numeric('samples', 100, 50000),
      target = goal();
    if (!Number.isInteger(samples)) throw new Error('Sample count must be an integer.');
    const plan = currencyPlan(engine, session.item, currency);
    if (!plan.ok) throw new Error(plan.reason);
    const job = new Worker('/odds-worker.js', { type: 'module' });
    worker = job;
    $('analyze').textContent = 'Calculating…';
    $('odds').textContent =
      'Calculating in background. Changing the item or target cancels this result.';
    job.onmessage = ({ data }) => {
      if (worker !== job) return;
      cancelOdds();
      if (!data.ok) {
        $('odds').textContent = data.reason;
        return;
      }
      const r = data.result,
        e = attemptEconomics(r.probability, { [currency]: 1 }, { [currency]: price }),
        fmt = (n) =>
          Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 3 }) : '∞';
      $('odds').textContent =
        `${r.method === 'exact' ? 'Exact enumeration' : 'Monte Carlo estimate'}\nHit probability: ${(r.probability * 100).toFixed(3)}%\n${r.method === 'exact' ? `Distinct outcomes: ${r.outcomeCount}` : `95% interval: ${(r.confidence95.low * 100).toFixed(3)}–${(r.confidence95.high * 100).toFixed(3)}% (${r.samples} samples)`}\nExpected attempts: ${fmt(e.expectedAttempts)}\nExpected cost: ${fmt(e.expectedCost)}\nAttempts for 90% confidence: ${fmt(e.attempts90)}${r.method === 'monte-carlo' && r.hits === 0 ? '\nZero sampled hits does not prove the target is impossible.' : ''}`;
      $('message').textContent = 'Odds calculated without changing the crafting RNG.';
    };
    job.onerror = () => {
      if (worker === job) {
        cancelOdds();
        $('odds').textContent = 'Odds calculation failed. Restart the local server and try again.';
      }
    };
    job.postMessage({
      mods: engine.mods,
      config: engine.config,
      item: session.item,
      currency,
      goal: target,
      samples,
    });
  });
async function boot() {
  try {
    const response = await fetch('/data/repoe-poe1.json');
    if (!response.ok)
      throw new Error(
        'Missing local dataset. Run node scripts/build-data.mjs, then restart the UI server.',
      );
    pack = await response.json();
    if (
      pack.format !== 'poe1-crafting-data-v1' ||
      !Array.isArray(pack.bases) ||
      !Array.isArray(pack.mods)
    )
      throw new Error('Unsupported data bundle format.');
    setupClasses();
    reset();
    $('reset').disabled = false;
  } catch (error) {
    $('dataStatus').textContent = error.message;
    $('message').textContent = error.message;
  }
}
boot();
