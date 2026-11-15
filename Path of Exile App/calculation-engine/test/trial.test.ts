import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTrial } from '../trial/run.ts';
import { assembleTrial, translatePassive } from '../trial/adapter.ts';
import { calculate } from '../src/index.ts';

test('local source adapters match 26 fields from an actually executed pinned PoB build', () => {
  const report = compareTrial();
  assert.equal(report.comparisons.length, 26);
  assert.equal(report.allMatch, true);
  assert.equal(report.status, 'partial');
  assert.match(report.diagnostics[0]!.effect, /movement-speed/);
});
test('trial establishes snapshot rounding without changing continuous default semantics', () => {
  const { assembled, result } = assembleTrial();
  const continuous = calculate({ ...assembled.input, rounding: 'continuous' });
  assert.equal(result.defence.pools.evasion.value, 15);
  assert.equal(continuous.defence.pools.evasion.value, 15.3);
  assert.equal(result.offence!.damage.find(part => part.type === 'fire')!.average, 18);
  assert.notEqual(continuous.offence!.dps, result.offence!.dps);
  assert.throws(() => calculate({ ...assembled.input, rounding: 'unknown' } as unknown as typeof assembled.input));
});
test('trial passive translation retains unresolved lines rather than silently dropping them', () => {
  const source = translatePassive(123, ['12% increased Spell Damage', '+16 to maximum Mana', 'Unimplemented special effect']);
  assert.equal(source.modifiers.length, 2);
  assert.deepEqual(source.unsupported, ['Unimplemented special effect']);
});
