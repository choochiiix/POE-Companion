import { createElementFactory } from '../../shared/ui/dom.js';

// Source-specific effects remain distinct; no universal values are inferred.
export function renderBuffEffects(entry, parent) {
  if (!entry.buffId) return;
  const el = createElementFactory(parent);
  el('h4', 'Mechanical effects');
  const variants = (entry.effectVariants || []).filter(variant => variant.lines?.length || Object.keys(variant.stats || {}).length);
  el('p', variants.length
    ? `${variants.length} source-specific variants. Values below apply to their listed source, not every use of this effect.`
    : 'Fixed effect values are not supplied for this record. Values may depend on the skill, source, stacks or level.');

  for (const variant of variants) {
    const details = el('details');
    el('summary', `${variant.source}: ${variant.name || variant.id}`, details);
    if (variant.template) el('p', `Uses template: ${variant.template}`, details);
    if (variant.item) el('p', `Item: ${variant.item}`, details);
    if (variant.radiusMetres != null) el('p', `Aura radius: ${variant.radiusMetres} m`, details);
    for (const line of variant.lines || []) el('p', line, details);
    const raw = el('details', '', details);
    el('summary', 'Exact source stat values', raw);
    for (const [stat, value] of Object.entries(variant.stats || {})) el('p', `${stat}: ${value}`, raw);
  }
  if (entry.stackLimit != null) el('p', `Source stack limit: ${entry.stackLimit}`);
  const ids = el('details');
  el('summary', 'Stats affected by this record', ids);
  for (const stat of entry.statIds || entry.stats || []) el('p', stat, ids);

  const wiki = entry.wikiContext?.revision ? entry.wikiContext : null;
  if (!wiki) {
    el('p', 'No unambiguous wiki article linked.');
    return;
  }
  el('h4', 'Wiki mechanic context');
  el('p', 'Related article matched by name/redirect; not a verified mapping of every source variant.');
  el('p', wiki.summary);
  for (const paragraph of wiki.mechanics || []) el('p', paragraph);
  const link = el('a', wiki.title);
  link.href = wiki.url;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.className = 'compendium-sources';
  el('p', `Wiki revision ${wiki.revision} · ${wiki.license}`);
}
