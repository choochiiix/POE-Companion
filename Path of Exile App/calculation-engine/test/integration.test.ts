import test from 'node:test';
import assert from 'node:assert/strict';
import { assembleBuild, assembleSkill, calculate, calculateActors } from '../src/index.ts';

test('public API composes weapon, support, attributes, equipment and passive sources without double local scaling', () => {
  const skill = assembleSkill({
    definition: { id: 'ordinary-melee', kind: 'attack', tags: ['melee'], baseMultiplier: 1 },
    weapon: { id: 'test-weapon', damage: { physical: { min: 100, max: 100 } }, attacksPerSecond: 1, criticalChance: 0, local: { increasedPhysicalDamage: 100 } },
    accuracy: 100,
    supports: [{ id: 'more', compatibleKinds: ['attack'], requiredTags: ['melee'], modifiers: [{ id: 'damage', stat: 'attackDamage', kind: 'MORE', value: 50 }] }],
  });
  const build = assembleBuild({ version: 1, attributes: { strength: 100, dexterity: 0, intelligence: 0 },
    pools: { life: 100, mana: 50, energyShield: 0, armour: 0, evasion: 0 },
    equipment: [{ id: 'body', slot: 'body', defence: { armour: 100 }, localModifiers: [{ id: 'local', stat: 'armour', kind: 'INC', value: 100 }], modifiers: [] }],
    passives: [{ id: 'passive', kind: 'passive', modifiers: [{ id: 'global', stat: 'armour', kind: 'INC', value: 50 }] }],
    gems: skill.sources, skill: skill.skill, skillTags: ['melee'], resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 }, resistancePenalty: 0,
    enemy: { armour: 0, evasion: 0, accuracy: 100, resistances: { fire: 0, cold: 0, lightning: 0, chaos: 0 } }, incomingPhysicalHit: 100,
  });
  const before = JSON.stringify(build.input);
  const result = calculate(build.input);
  assert.equal(result.offence!.dps, 360);
  assert.equal(result.defence.pools.armour.value, 300);
  assert.equal(result.defence.pools.life.value, 150);
  assert.equal(result.status, 'supported-subset');
  assert.equal(JSON.stringify(build.input), before);
  const converted = assembleBuild({ ...build.input, attributes: { strength: 0, dexterity: 0, intelligence: 0 }, attributeBonuses: false,
    conversion: [{ sourceId: 'convert', from: 'physical', to: 'fire', percent: 100, kind: 'convert' }],
    incomingHit: { kind: 'spell', damage: { fire: 100 }, suppressionChance: 100, blockChance: 50 },
  });
  const actors = calculateActors({ actors: [{ id: 'totem', kind: 'totem', input: converted.input, delivery: { mode: 'continuous' }, count: 2, included: true }] });
  assert.equal(actors.totalDps, 720);
  assert.equal(actors.actors[0]!.calculation.incomingHit!.expectedTaken, 25);
  assert.equal(actors.actors[0]!.offence.damage.find(part => part.type === 'physical')!.average, 0);
  assert.throws(() => assembleBuild({ ...build.input, attributes: { strength: 0, dexterity: 0, intelligence: 0 }, conversion: [{ sourceId: 'bad', from: 'fire', to: 'physical', percent: 100, kind: 'convert' }] }));
});
