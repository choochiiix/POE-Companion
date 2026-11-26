import { compareWorkspace, midpointText } from '../calculations/source-adapter.js';

const slots = ['helmet', 'body-armour', 'gloves', 'boots', 'amulet', 'belt', 'ring-one', 'ring-two', 'main-hand', 'off-hand'];
const emptyEquipment = () => Object.fromEntries(slots.map(slot => [slot, '']));
const itemLines = item => [...(item?.implicit ?? []), ...(item?.explicit ?? [])].map(modifier => modifier?.text || modifier?.raw || '').filter(Boolean).map(midpointText);

function itemSlot(item) {
  if (/body armour|armor/i.test(item?.itemClass ?? '')) return 'body-armour';
  if (/helmet/i.test(item?.itemClass ?? '')) return 'helmet';
  if (/gloves/i.test(item?.itemClass ?? '')) return 'gloves';
  if (/boots/i.test(item?.itemClass ?? '')) return 'boots';
  if (/amulet/i.test(item?.itemClass ?? '')) return 'amulet';
  if (/belt/i.test(item?.itemClass ?? '')) return 'belt';
  if (/ring/i.test(item?.itemClass ?? '')) return 'ring-one';
  if (/weapon|wand|staff|sceptre|sword|axe|mace|bow|claw|dagger/i.test(item?.itemClass ?? '')) return 'main-hand';
  return null;
}

function treeInput(index) {
  const records = index?.tree?.records ?? [];
  return {
    classes: index?.tree?.classes ?? [],
    nodes: Object.fromEntries(records.map(node => [String(node.id), { ...node, out: [...(node.out ?? [])], in: [...(node.in ?? [])] }])),
  };
}

function records(index, key) {
  const value = index?.[key];
  return value?.records ?? value?.active ?? (Array.isArray(value) ? value : []);
}

/**
 * Compare a unique in a fresh, read-only starter workspace.  This intentionally
 * accepts the same calculation-data JSON served to the renderer; no character,
 * equipment, skill, tree, or gear saves are read or changed.
 */
export function compareTheorycraftingUnique({ calculationData, index, item, skill, scenario } = {}) {
  if (!calculationData || !index || !item || !skill) return null;
  if (/doryani.?s prototype/i.test(item.name ?? '')) return null;
  const data = calculationData.data ?? calculationData;
  const slot = itemSlot(item);
  if (!slot || !item.baseId || !data.bases?.[item.baseId]) return null;
  const skillRecords = records(index, 'skills');
  const supportRecords = records(index, 'supports');
  const tree = treeInput(index);
  const className = scenario?.characterClass ?? scenario?.className ?? 'Witch';
  const ascendancy = scenario?.ascendancy ?? scenario?.ascendancyName ?? '';
  const context = {
    level: Number.isFinite(scenario?.level) ? scenario.level : 90,
    groupId: 'theorycrafting',
    gemEndpoint: 'maximum',
    penalty: 0,
    enemyResistance: Number.isFinite(scenario?.enemyResistance) ? scenario.enemyResistance : 0,
    enemyArmour: 0,
    enemyEvasion: 0,
    enemyAccuracy: 0,
    incomingHit: 100,
  };
  const input = {
    character: { characterClass: className, ascendancy },
    equipment: emptyEquipment(),
    selection: { selected: [...(scenario?.allocatedNodeIds ?? [])], masteries: scenario?.masteries ?? {} },
    groups: [{ id: 'theorycrafting', name: 'Theorycrafting preview', activeId: skill.id, supportIds: [] }],
    context,
    overrides: {},
    data,
    tree,
    gems: [...skillRecords, ...supportRecords],
  };
  const candidate = { baseId: item.baseId, name: item.name, lines: itemLines(item) };
  const comparison = compareWorkspace(input, slot, candidate);
  const baselineDps = comparison.changes.find(row => row.stat === 'hitDps')?.before;
  const alternativeDps = comparison.changes.find(row => row.stat === 'hitDps')?.after;
  if (!Number.isFinite(baselineDps) || !Number.isFinite(alternativeDps)) return null;
  // The engine marks snapshots partial when an effect changes the metric outside
  // its supported modifier vocabulary.  Do not turn a partial hit result into a
  // numeric recommendation when the selected item's text contains such a rule.
  const unsupportedText = itemLines(item).filter(line => /deal no |cannot|only|trigger|nearby|resistance equal|converted|random|ailment|duration|charges|conditional/i.test(line));
  if (unsupportedText.length && comparison.status === 'partial') return null;
  return {
    metric: 'hit DPS',
    baseline: baselineDps,
    alternative: alternativeDps,
    delta: alternativeDps - baselineDps,
    comparator: `same ${skill.name} hit without versus with ${item.name}`,
    assumptions: ['same gem level and quality', 'same enemy resistance and hit settings', 'midpoint unique rolls', 'no saved gear, passives, or supports'],
    status: comparison.status,
  };
}

export { itemSlot };
