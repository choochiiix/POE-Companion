import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from '../src/index.ts';
import type { CalculationInput } from '../src/model.ts';

const zeroResistances = { fire: 0, cold: 0, lightning: 0, chaos: 0 };
function fixture(overrides: Partial<CalculationInput> = {}): CalculationInput {
  return {
    version: 1,
    sources: [],
    pools: { life: 100, mana: 100, energyShield: 0, armour: 0, evasion: 0 },
    resistances: { ...zeroResistances },
    resistancePenalty: 0,
    enemy: { armour: 0, evasion: 10000, accuracy: 100, resistances: { ...zeroResistances } },
    incomingPhysicalHit: 100,
    skill: {
      id: 'parity-attack',
      kind: 'attack',
      damage: { physical: { min: 100, max: 200 } },
      baseTime: 0.5,
      baseCritChance: 0,
      critMultiplier: 150,
      accuracy: 100,
    },
    ...overrides,
  };
}

test('attack use damage includes misses while conditional hit and action rate stay separate', () => {
  const lowAccuracy = calculate(fixture()).offence!;
  const highAccuracy = calculate({
    ...fixture(),
    enemy: { ...fixture().enemy, evasion: 0 },
  }).offence!;

  assert.equal(lowAccuracy.averageHit, 150);
  assert.equal(lowAccuracy.rate, 2);
  assert.equal(lowAccuracy.actionTime, 0.5);
  assert.equal(lowAccuracy.averageDamagePerUse, 150 * lowAccuracy.chanceToHit / 100);
  assert.equal(lowAccuracy.effectiveHitDps, lowAccuracy.averageDamagePerUse * lowAccuracy.rate);
  assert.equal(lowAccuracy.dps, lowAccuracy.effectiveHitDps);
  assert.ok(highAccuracy.chanceToHit > lowAccuracy.chanceToHit);
  assert.ok(highAccuracy.effectiveHitDps > lowAccuracy.effectiveHitDps);
  assert.equal(calculate({
    ...fixture(),
    sources: [{
      id: 'no-action',
      kind: 'configuration',
      modifiers: [{ id: 'stop', stat: 'attackSpeed', kind: 'MORE', value: -100 }],
    }],
  }).offence!.actionTime, null);
});

test('elemental enemy resistance applies selected exposure and penetration before mitigation', () => {
  const base = fixture({
    enemy: { ...fixture().enemy, evasion: 0, resistances: { ...zeroResistances, fire: 50 } },
    skill: { ...fixture().skill!, kind: 'spell', damage: { fire: { min: 100, max: 200 } } },
  });
  const baseline = calculate(base).offence!;
  const adjusted = calculate({
    ...base,
    enemy: {
      ...base.enemy,
      exposure: { fire: 20 },
      penetration: { fire: 10 },
    },
  }).offence!;
  const fire = adjusted.damage.find(part => part.type === 'fire')!;

  assert.equal(baseline.damage.find(part => part.type === 'fire')!.effectiveResistance, 50);
  assert.equal(fire.effectiveResistance, 20);
  assert.equal(fire.mitigation, 0.8);
  assert.equal(fire.effectiveAverage, 120);
  assert.ok(adjusted.effectiveHitDps > baseline.effectiveHitDps);

  const floor = calculate({
    ...base,
    enemy: {
      ...base.enemy,
      resistances: { ...zeroResistances, fire: -195 },
      exposure: { fire: 20 },
      penetration: { fire: 10 },
    },
  }).offence!.damage.find(part => part.type === 'fire')!;
  assert.equal(floor.enemyResistance, -200);
  assert.equal(floor.effectiveResistance, -210);
  assert.equal(floor.mitigation, 3.1);

  const cap = calculate({
    ...base,
    enemy: {
      ...base.enemy,
      resistances: { ...zeroResistances, fire: 120 },
      penetration: { fire: 10 },
    },
  }).offence!.damage.find(part => part.type === 'fire')!;
  assert.equal(cap.enemyResistance, 90);
  assert.equal(cap.effectiveResistance, 80);
});

test('ordered conversion retains path values and applies destination resistance', () => {
  const base = fixture({
    enemy: {
      ...fixture().enemy,
      evasion: 0,
      resistances: { ...zeroResistances, lightning: 50 },
    },
    conversion: [{ sourceId: 'weapon-conversion', from: 'physical', to: 'lightning', percent: 50, kind: 'convert' }],
  });
  const offence = calculate(base).offence!;
  const physical = offence.damage.find(part => part.type === 'physical')!;
  const lightning = offence.damage.find(part => part.type === 'lightning')!;

  assert.equal(physical.min.value, 50);
  assert.equal(physical.max.value, 100);
  assert.equal(lightning.min.value, 50);
  assert.equal(lightning.max.value, 100);
  assert.equal(lightning.effectiveResistance, 50);
  assert.equal(lightning.mitigation, 0.5);
  assert.equal(lightning.conversionPaths?.[0]?.sourceIds[0], 'weapon-conversion');
});
