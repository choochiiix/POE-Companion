import { ASSUMPTION_CONFIG, createEngine, createItem } from '../src/index.ts';
import type { BaseItem, EngineConfig, ModDef } from '../src/index.ts';
/** Entirely invented data. No game-data format is assumed here. */
export const fakeBase: BaseItem = {
  id: 'fake-wand',
  tags: ['wand'],
  modDomain: 'item',
};
export const fakeMods: readonly ModDef[] = [
  {
    id: 'life-low',
    affix: 'prefix',
    domain: 'item',
    groups: ['life'],
    requiredLevel: 1,
    spawnWeights: [
      { tag: 'blocked', weight: 0 },
      { tag: 'wand', weight: 1 },
      { tag: 'default', weight: 99 },
    ],
    stats: [{ id: 'life', min: 1, max: 2 }],
    tags: ['life'],
    tier: 2,
  },
  {
    id: 'life-high',
    affix: 'prefix',
    domain: 'item',
    groups: ['life'],
    requiredLevel: 10,
    spawnWeights: [{ tag: 'default', weight: 1 }],
    stats: [{ id: 'life', min: 3, max: 4 }],
    tags: ['life'],
    tier: 1,
  },
  {
    id: 'mana',
    affix: 'prefix',
    domain: 'item',
    groups: ['mana'],
    requiredLevel: 1,
    spawnWeights: [{ tag: 'default', weight: 2 }],
    stats: [{ id: 'mana', min: 5, max: 5 }],
    tags: ['mana'],
  },
  {
    id: 'speed',
    affix: 'suffix',
    domain: 'item',
    groups: ['speed'],
    requiredLevel: 1,
    spawnWeights: [{ tag: 'default', weight: 2 }],
    stats: [{ id: 'speed', min: 1, max: 2 }],
    tags: ['speed'],
    tier: 1,
  },
  {
    id: 'resist',
    affix: 'suffix',
    domain: 'item',
    groups: ['resist'],
    requiredLevel: 1,
    spawnWeights: [{ tag: 'default', weight: 1 }],
    stats: [{ id: 'resist', min: 7, max: 7 }],
    tags: ['resistance'],
  },
  {
    id: 'wrong-domain',
    affix: 'prefix',
    domain: 'map',
    groups: [],
    requiredLevel: 1,
    spawnWeights: [{ tag: 'default', weight: 1000 }],
    stats: [],
    tags: [],
  },
];
export const config: EngineConfig = {
  ...ASSUMPTION_CONFIG,
  counts: {
    transmutation: [{ count: 1, weight: 1 }],
    alteration: [{ count: 1, weight: 1 }],
    alchemy: [{ count: 4, weight: 1 }],
    chaos: [{ count: 4, weight: 1 }],
  },
};
export const engine = createEngine(fakeMods, config);
export const normal = createItem(fakeBase, 10);
