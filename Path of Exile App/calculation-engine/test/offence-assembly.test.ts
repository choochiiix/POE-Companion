import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assembleSkill, resolveWeapon } from '../src/skill.ts';
import { calculate } from '../src/index.ts';
import type { CalculationInput } from '../src/model.ts';

const resistances = { fire: 0, cold: 0, lightning: 0, chaos: 0 };
function scenario(assembled: ReturnType<typeof assembleSkill>): CalculationInput {
  return { version: 1, pools: { life: 100, mana: 100, energyShield: 0, armour: 0, evasion: 0 },
    resistances, resistancePenalty: 0, enemy: { armour: 0, evasion: 0, accuracy: 100, resistances },
    incomingPhysicalHit: 100, skill: assembled.skill, sources: assembled.sources };
}

test('real Rusted Sword snapshot resolves local weapon values before global attack modifiers', () => {
  const bases = JSON.parse(readFileSync(new URL('../../data-sources/repoe-poe1/base_items.json', import.meta.url), 'utf8'));
  const base = bases['Metadata/Items/Weapons/OneHandWeapons/OneHandSwords/OneHandSword1'];
  assert.equal(base.name, 'Rusted Sword');
  const weapon = { id: 'rusted-sword', damage: { physical: { min: base.properties.physical_damage_min, max: base.properties.physical_damage_max } },
    attacksPerSecond: 1000 / base.properties.attack_time, criticalChance: base.properties.critical_strike_chance / 100,
    local: { addedDamage: { physical: { min: 2, max: 3 } }, increasedPhysicalDamage: 100, quality: 20, increasedAttackSpeed: 10, increasedCriticalChance: 20 } };
  const resolved = resolveWeapon(weapon);
  assert.deepEqual(resolved.damage.physical, { min: 14, max: 29 });
  assert.equal(resolved.attacksPerSecond, 1.71); assert.equal(resolved.criticalChance, 6);
  const assembled = assembleSkill({ definition: { id: 'ordinary-attack', kind: 'attack', tags: ['melee'], baseMultiplier: 2, addedDamageEffectiveness: 2 },
    weapon, accuracy: 100, addedDamage: { fire: { min: 3, max: 5 } },
    supports: [{ id: 'explicit-more', compatibleKinds: ['attack'], requiredTags: ['melee'], modifiers: [{ id: 'more', stat: 'attackDamage', kind: 'MORE', value: 50 }] }] });
  const out = calculate(scenario(assembled)).offence!;
  assert.equal(out.damage.find(part => part.type === 'physical')!.min.value, 42);
  assert.equal(out.damage.find(part => part.type === 'physical')!.max.value, 87);
  assert.equal(out.damage.find(part => part.type === 'fire')!.min.value, 9);
  assert.ok(Math.abs(out.rate - 1.71) < 1e-12);
});

test('Fireball level-20 snapshot assembles base damage, effectiveness and explicit support ranges', () => {
  const gems = JSON.parse(readFileSync(new URL('../../crafting-ui/skills-data.json', import.meta.url), 'utf8'));
  const fireball = gems.gems.find((gem: { name: string }) => gem.name === 'Fireball');
  assert.ok(fireball.tooltip.statLines.includes('Deals (9–1883) to (14–2825) Fire Damage'));
  assert.ok(fireball.tooltip.properties.some((property: { label: string; value: string }) => property.label === 'Effectiveness of added damage' && property.value === '(300–480)%'));
  const assembled = assembleSkill({ definition: { id: fireball.id, kind: 'spell', tags: ['fire', 'projectile'], damage: { fire: { min: 1883, max: 2825 } },
    baseTime: 0.75, baseCritChance: 5, addedDamageEffectiveness: 4.8, unsupported: ['Fireball ignite not calculated'] }, accuracy: 0,
    supports: [{ id: 'normalized-added-fire', compatibleKinds: ['spell'], requiredTags: ['fire'], addedDamage: { fire: { min: 10, max: 20 } }, modifiers: [] }] });
  assert.deepEqual(assembled.skill.damage.fire, { min: 1931, max: 2921 });
  const out = calculate(scenario(assembled));
  assert.equal(out.status, 'partial'); assert.equal(out.offence!.chanceToHit, 100);
  assert.ok(Math.abs(out.offence!.dps - 2426 * 1.025 / 0.75) < 1e-9);
});

test('direct weapon resolution follows PoB endpoint and attack-rate rounding', () => {
  const resolved = resolveWeapon({ id: 'continuous', damage: { physical: { min: 4, max: 9 } }, attacksPerSecond: 1000 / 645,
    criticalChance: 5, local: { increasedPhysicalDamage: 20, increasedAttackSpeed: 10 } });
  assert.equal(resolved.damage.physical!.min, 5);
  assert.equal(resolved.damage.physical!.max, 11);
  assert.equal(resolved.attacksPerSecond, 1.71);
});

test('support assembly rejects explicit incompatibility, scopes modifiers and preserves unsupported diagnostics', () => {
  const out = assembleSkill({ definition: { id: 'spell', kind: 'spell', tags: ['fire'], baseTime: 1, baseCritChance: 0, damage: { fire: { min: 10, max: 10 } } }, accuracy: 0,
    supports: [{ id: 'wrong', compatibleKinds: ['attack'], modifiers: [{ id: 'bad', stat: 'damage', kind: 'MORE', value: 999 }] },
      { id: 'right', compatibleKinds: ['spell'], modifiers: [{ id: 'good', stat: 'damage', kind: 'MORE', value: 50 }], unsupported: ['special repeat not calculated'] }] });
  assert.equal(out.rejectedSupports.length, 1); assert.equal(out.sources[0]!.modifiers[0]!.skillId, 'spell');
  assert.equal(calculate(scenario(out)).offence!.dps, 15); assert.equal(calculate(scenario(out)).status, 'partial');
});

test('assembly validates required weapon/spell fields, damage ranges, duplicate support IDs and invalid local stats', () => {
  assert.throws(() => assembleSkill({ definition: { id: 'a', kind: 'attack', tags: [] }, accuracy: 0 }));
  assert.throws(() => assembleSkill({ definition: { id: 's', kind: 'spell', tags: [] }, accuracy: 0 }));
  assert.throws(() => resolveWeapon({ id: 'w', damage: { physical: { min: 5, max: 4 } }, attacksPerSecond: 1, criticalChance: 5 }));
  assert.throws(() => resolveWeapon({ id: 'w', damage: {}, attacksPerSecond: 1, criticalChance: 5, local: { quality: NaN } }));
  const support = { id: 'x', compatibleKinds: ['spell'] as const, modifiers: [] };
  assert.throws(() => assembleSkill({ definition: { id: 's', kind: 'spell', tags: [], baseTime: 1, baseCritChance: 0 }, accuracy: 0, supports: [support, support] }));
});
