import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { assembleTrial } from './adapter.ts';

export function compareTrial() {
  const capture = JSON.parse(readFileSync(new URL('../reference/build-capture.json', import.meta.url), 'utf8'));
  const pin = JSON.parse(readFileSync(new URL('../reference/pin.json', import.meta.url), 'utf8'));
  if (capture.kind !== 'executed-pob-headless-build' || capture.archiveSha256 !== pin.sha256) throw new Error('Invalid trial oracle');
  const hash = (path: URL) => createHash('sha256').update(readFileSync(path)).digest('hex');
  if (hash(new URL('../reference/trial.lua', import.meta.url)) !== capture.trialScriptSha256
    || hash(new URL('../reference/run-build-trial.py', import.meta.url)) !== capture.runnerSha256) throw new Error('Reference tooling changed; recapture PoB trial');
  for (const [path, expected] of Object.entries(capture.localSourceHashes)) {
    if (hash(new URL('../../' + path, import.meta.url)) !== expected) throw new Error('Local source changed: ' + path);
  }
  const sourceConstants = JSON.parse(readFileSync(new URL('./source-constants.json', import.meta.url), 'utf8'));
  if (sourceConstants.archiveSha256 !== pin.sha256
    || Object.keys(sourceConstants.values).length !== Object.keys(capture.result.constants).length
    || Object.entries(sourceConstants.values).some(([key,value]) => capture.result.constants[key] !== value)) throw new Error('Source constants changed');
  const trial = assembleTrial();
  const { result, assembled, weapon } = trial;
  const out = capture.result.output;
  const fire = result.offence!.damage.find(part => part.type === 'fire')!;
  const pairs: [string, number, number][] = [
    ['strength', assembled.attributes.strength.value, out.Str], ['dexterity', assembled.attributes.dexterity.value, out.Dex],
    ['intelligence', assembled.attributes.intelligence.value, out.Int], ['life', result.defence.pools.life.value, out.Life],
    ['mana', result.defence.pools.mana.value, out.Mana], ['armour', result.defence.pools.armour.value, out.Armour],
    ['evasion', result.defence.pools.evasion.value, out.Evasion], ['energyShield', result.defence.pools.energyShield.value, out.EnergyShield],
    ['baseFireMin', assembled.input.skill!.damage.fire!.min, out.FireMinBase], ['baseFireMax', assembled.input.skill!.damage.fire!.max, out.FireMaxBase],
    ['normalFireAverage', fire.average, capture.result.hit.FireHitAverage], ['averageHit', result.offence!.averageHit, out.AverageHit],
    ['castsPerSecond', result.offence!.rate, out.Speed], ['critChance', result.offence!.criticalChance, out.CritChance],
    ['critMultiplier', result.offence!.criticalMultiplier / 100, out.CritMultiplier], ['hitChance', result.offence!.chanceToHit, out.HitChance],
    ['hitDps', result.offence!.dps, out.TotalDPS],
    ['weaponPhysicalMin', weapon.damage.physical!.min, capture.result.weapon.PhysicalMin],
    ['weaponPhysicalMax', weapon.damage.physical!.max, capture.result.weapon.PhysicalMax],
    ['weaponAttackRate', weapon.attacksPerSecond, capture.result.weapon.AttackRate],
    ['spellIncreased', fire.min.increased, capture.result.modifiers.spellIncreased], ['elementalMore', fire.min.more, capture.result.modifiers.elementalMore],
  ];
  for (const type of ['fire','cold','lightning','chaos'] as const) pairs.push([`${type}Resistance`, result.defence.resistances[type].effective, out[`${type[0]!.toUpperCase()}${type.slice(1)}Resist`]]);
  const comparisons = pairs.map(([stat, actual, expected]) => ({ stat, actual, expected, matches: Number.isFinite(expected) && Math.abs(actual - expected) <= 1e-9 }));
  return { schemaVersion: 1, scope: 'One level-20 Witch, Fireball 1 / Elemental Focus 1, ordinary sword/vest, two passives; hit calculations only',
    archiveSha256: capture.archiveSha256, allMatch: comparisons.every(row => row.matches), comparisons,
    status: result.status, diagnostics: result.diagnostics,
    excluded: ['Movement speed, mana sustain/costs, AoE/projectile behavior, evade chance, physical enemy mitigation and survivability are outside this trial.',
      'Ailments disabled by Elemental Focus. Equipped sword local stats are compared separately; spell damage does not use its attack damage.'], records: trial.records };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = compareTrial();
  writeFileSync(new URL('./report.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (!report.allMatch) process.exitCode = 1;
}
