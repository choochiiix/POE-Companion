import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { assembleWorkspace } from '../../../crafting-ui/features/calculations/source-adapter.js';
import { translateEffects } from '../../src/index.ts';

const here = new URL('./', import.meta.url);
const app = new URL('../../../', here);
const readJson = (path, root = here) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const textHash = (path, root) => createHash('sha256')
  .update(readFileSync(new URL(path, root), 'utf8').replaceAll('\r\n', '\n'))
  .digest('hex');

function checkHashes(paths, hashes, root) {
  if (Object.keys(hashes).length !== paths.length) throw new Error('Incomplete reference hashes');
  for (const path of paths) {
    if (textHash(path, root) !== hashes[path]) throw new Error(`Stale reference input: ${path}`);
  }
}

function checkedReference(fixtures) {
  const pin = readJson('pin.json');
  const capture = readJson('capture.json');
  if (capture.schemaVersion !== 1 || capture.kind !== 'executed-pob-headless-build'
    || capture.version !== pin.version || capture.revision !== pin.revision
    || capture.archiveSha256 !== pin.archiveSha256) {
    throw new Error('Reference capture does not match its PoB pin');
  }
  if (Object.keys(capture.upstreamHashes).length !== pin.upstreamFiles.length
    || pin.upstreamFiles.some(path => !/^[0-9a-f]{64}$/.test(capture.upstreamHashes[path]))) {
    throw new Error('Incomplete upstream source metadata');
  }
  checkHashes(['capture.py', 'fixtures.json', 'fixtures.lua'], capture.toolingHashes, here);
  checkHashes(pin.localSources, capture.localSourceHashes, app);
  if (capture.cases.length !== fixtures.length) throw new Error('Incomplete reference fixtures');
  fixtures.forEach((fixture, index) => {
    const reference = capture.cases[index];
    if (reference.id !== fixture.id || reference.treeVersion !== (fixture.treeVersion ?? capture.latestTreeVersion)
      || reference.mode !== 'EFFECTIVE' || reference.skillPart !== 1) {
      throw new Error(`Reference fixture configuration changed: ${fixture.id}`);
    }
  });
  return capture;
}

function exactFireball(fixture, gem) {
  // The bundled tooltip identifies the two endpoints exactly; the middle levels are absent.
  const line = gem.tooltip.statLines.find(text => text.startsWith('Deals '));
  const match = /^Deals \((\d+)–(\d+)\) to \((\d+)–(\d+)\) Fire Damage$/.exec(line);
  if (!match || fixture.gemLevel !== 1 || fixture.gemQuality !== 0 || fixture.supportLevel !== 1) {
    throw new Error('Fireball fixture must use the verified first endpoint at zero quality');
  }
  const property = name => gem.tooltip.properties.find(row => row.label === name).value;
  return {
    gemId: gem.id, level: fixture.gemLevel, quality: fixture.gemQuality,
    sourceId: 'skills-data:fireball:level-1',
    damage: { fire: { min: Number(match[1]), max: Number(match[3]) } },
    baseTime: parseFloat(property('Cast time')), baseCritChance: parseFloat(property('Critical strike chance')),
  };
}

function workspaceInput(fixture, sources) {
  const { data, gems } = sources;
  const baseId = name => {
    const base = Object.values(data.bases).find(row => row.name === name);
    if (!base) throw new Error(`Fixture item unavailable: ${name}`);
    return base.id;
  };
  const equipment = {};
  const overrides = {};
  if (fixture.sword) {
    equipment['main-hand'] = baseId('Rusted Sword');
    overrides['main-hand'] = {
      baseId: equipment['main-hand'], name: 'Rusted Sword',
      // Match gearCalculationOverride: text holds base implicits and raw stats hold explicit rolls.
      lines: [fixture.sword.implicit], rawStats: fixture.sword.rawStats,
    };
  }
  if (fixture.robe) {
    equipment['body-armour'] = baseId('Simple Robe');
    const energyShield = data.bases[equipment['body-armour']].properties.energy_shield;
    if ((energyShield.min + energyShield.max) / 2 !== fixture.robe.baseEnergyShield) {
      throw new Error('Robe roll differs from the local base midpoint');
    }
  }
  const fireball = fixture.skill === 'fireball' ? gems.find(gem => gem.name === 'Fireball') : undefined;
  const elementalFocus = fireball ? gems.find(gem => gem.name === 'Elemental Focus') : undefined;
  const translated = translateEffects(`fixture:${fixture.id}`, 'configuration', (fixture.mods ?? []).filter(line =>
    !/Exposure|Penetrates|Suppress/.test(line),
  ));
  if (translated.source.unsupported?.length) {
    throw new Error(`Untranslated fixture effect: ${translated.source.unsupported.join(', ')}`);
  }
  const enemy = fixture.enemy;
  return {
    ...sources, equipment, overrides,
    character: { characterClass: fixture.character },
    selection: { selected: fixture.passives ?? [], masteries: {} },
    groups: fireball ? [{ id: fixture.skill, activeId: fireball.id, supportIds: [elementalFocus.id] }] : [],
    context: {
      level: fixture.level, groupId: fixture.skill ?? '', gemEndpoint: 'first', penalty: fixture.penalty,
      enemyArmour: enemy.armour, enemyEvasion: enemy.evasion, enemyAccuracy: enemy.accuracy,
      enemyResistance: enemy.fireResistance ?? 0, incomingHit: fixture.incoming?.damage.physical ?? 100,
    },
    calculation: {
      sources: [translated.source],
      conversion: translated.conversion,
      enemy: {
        resistances: { fire: enemy.fireResistance ?? 0, cold: 0, lightning: 0, chaos: 0 },
        exposure: enemy.fireExposure === undefined ? undefined : { fire: enemy.fireExposure },
        penetration: enemy.firePenetration === undefined ? undefined : { fire: enemy.firePenetration },
      },
      skill: fireball ? exactFireball(fixture, fireball) : undefined,
      incomingHit: fixture.incoming,
      defenceConfig: fixture.manaReservation === undefined ? undefined : {
        reservation: { mana: { flat: fixture.manaReservation } },
        recovery: { mana: { flat: fixture.manaRegeneration } },
      },
    },
  };
}

const damageTypes = ['Physical', 'Lightning', 'Cold', 'Fire', 'Chaos'];

function metricDefinitions(fixture) {
  const metrics = [];
  const add = (stat, unit, read, { absolute = 0, relative = 0 } = {}) =>
    metrics.push({ stat, unit, read, absolute, relative });
  const floating = { absolute: 1e-10, relative: 1e-10 };
  for (const [key, attr] of [['Str', 'strength'], ['Dex', 'dexterity'], ['Int', 'intelligence']]) {
    add(key, 'rating', result => result.assembly.attributes[attr].value);
  }
  for (const [key, pool] of [['Life', 'life'], ['Mana', 'mana'], ['EnergyShield', 'energyShield'],
    ['Armour', 'armour'], ['Evasion', 'evasion']]) {
    add(key, 'points', result => result.calculation.defence.pools[pool].value);
  }
  for (const type of damageTypes.slice(1)) {
    add(`${type}Resist`, 'percent', result => result.calculation.defence.resistances[type.toLowerCase()].effective);
  }
  add('ManaRegenRecovery', 'mana/s', result => result.calculation.defence.recovery?.manaPerSecond, floating);

  if (fixture.skill) {
    const offence = result => result.calculation.offence;
    const part = (result, type) => offence(result)?.damage.find(entry => entry.type === type.toLowerCase());
    add('Accuracy', 'rating', result => offence(result)?.accuracy.value);
    add('HitChance', 'percent', result => offence(result)?.chanceToHit);
    add('CritChance', 'percent', result => offence(result)?.effectiveCriticalChance, floating);
    add('CritMultiplier', 'multiplier', result => offence(result)?.criticalMultiplier / 100, floating);
    add('Speed', 'actions/s', result => offence(result)?.rate, floating);
    add('Time', 'seconds/action', result => offence(result)?.actionTime, floating);
    add('AverageHit', 'damage/landed hit', result => offence(result)?.averageHit, floating);
    add('AverageDamage', 'damage/action', result => offence(result)?.averageDamagePerUse
      ?? (offence(result) && offence(result).averageHit * offence(result).chanceToHit / 100), floating);
    add('TotalDPS', 'damage/s', result => offence(result)?.effectiveHitDps ?? offence(result)?.dps, floating);
    const skill = result => result.assembly.input.skill;
    if (fixture.sword) {
      add('WeaponPhysicalMin', 'damage', result => skill(result)?.damage.physical?.min);
      add('WeaponPhysicalMax', 'damage', result => skill(result)?.damage.physical?.max);
      add('WeaponAttackRate', 'attacks/s', result => skill(result) && 1 / skill(result).baseTime, floating);
      add('WeaponCritChance', 'percent', result => skill(result)?.baseCritChance, floating);
      for (const type of ['Physical', 'Lightning', 'Cold']) {
        add(`${type}Min`, 'damage', result => part(result, type)?.min.value);
        add(`${type}Max`, 'damage', result => part(result, type)?.max.value);
      }
    } else {
      add('EnemyFireResistAfterExposure', 'percent', result => part(result, 'Fire')?.enemyResistance);
      add('FireEffMult', 'multiplier', result => part(result, 'Fire')?.mitigation, floating);
      // PoB's Calcs per-type endpoints include the normal-hit mitigation multiplier.
      for (const [suffix, endpoint] of [['Min', 'min'], ['Max', 'max']]) {
        add(`Fire${suffix}`, 'damage', result => {
          const fire = part(result, 'Fire');
          const multiplier = fire?.mitigation ?? (fire && 1 - fixture.enemy.fireResistance / 100);
          return fire && fire[endpoint].value * multiplier;
        }, floating);
      }
    }
  }

  if (fixture.incoming) {
    add('FireResistTotal', 'percent', result => result.calculation.defence.resistances.fire.uncapped);
    add('totalTakenHit', 'damage', result => result.calculation.incomingHit?.expectedTaken, floating);
    for (const type of Object.keys(fixture.incoming.damage)) {
      const label = type[0].toUpperCase() + type.slice(1);
      add(`${label}TakenHit`, 'damage', result =>
        result.calculation.incomingHit?.damage.find(part => part.type === type)?.expectedTaken, floating);
    }
    if (fixture.incoming.suppressionChance !== undefined) {
      add('SpellSuppressionChance', 'percent', result => result.calculation.incomingHit?.avoidance.suppressionChance);
      add('SpellSuppressionEffect', 'percent', result => result.calculation.incomingHit?.avoidance.suppressionEffect);
    }
    for (const type of damageTypes) {
      // PoB exposes a rounded integer; Companion keeps the continuous lethal boundary.
      add(`${type}MaximumHitTaken`, 'damage', result =>
        result.calculation.survivability?.maxHit[type.toLowerCase()].value, { absolute: 0.5, relative: 1e-12 });
    }
    add('TotalEHP', 'raw damage budget', result => result.calculation.survivability?.ehp.value, floating);
    add('NumberOfDamagingHits', 'hits', result => result.calculation.survivability?.ehp.hitsToDeplete, floating);
    if (fixture.incoming.hitsPerSecond !== undefined) {
      add('EHPSurvivalTime', 'seconds', result => result.calculation.survivability?.ehp.timeToDeplete, floating);
    }
  }
  if (fixture.manaReservation !== undefined) {
    add('ManaReserved', 'mana', result => result.calculation.defence.pools.mana.reserved);
    add('ManaUnreserved', 'mana', result => result.calculation.defence.pools.mana.unreserved);
    add('EnergyShieldRecharge', 'ES/s', result => result.calculation.defence.energyShieldRecharge?.ratePerSecond, floating);
    add('EnergyShieldRechargeDelay', 'seconds', result => result.calculation.defence.energyShieldRecharge?.delaySeconds);
  }
  return metrics;
}

const numeric = value => Number.isFinite(value) ? value : null;

export function compareRelease(baselineAssemble) {
  const fixtures = readJson('fixtures.json');
  const capture = checkedReference(fixtures);
  const sources = {
    data: readJson('crafting-ui/calculation-data.json', app),
    tree: readJson('data-sources/pob-tree-3_29/tree-view.json', app),
    gems: readJson('crafting-ui/skills-data.json', app).gems,
  };
  const results = fixtures.map((fixture, index) => {
    const input = workspaceInput(fixture, sources);
    const result = assembleWorkspace(input);
    const baseline = baselineAssemble?.(input);
    const reference = capture.cases[index].output;
    const comparisons = metricDefinitions(fixture).map(metric => {
      const after = numeric(metric.read(result));
      const before = baseline ? numeric(metric.read(baseline)) : null;
      const pob = numeric(reference[metric.stat]);
      const delta = after === null || pob === null ? null : after - pob;
      const tolerance = metric.absolute + metric.relative * Math.abs(pob ?? 0);
      return { metric: metric.stat, unit: metric.unit, before, after, pob, delta, tolerance,
        matches: delta !== null && Math.abs(delta) <= tolerance };
    });
    return { id: fixture.id, comparisons };
  });
  const rows = results.flatMap(result => result.comparisons);
  return {
    version: capture.version, revision: capture.revision, runtime: capture.runtime, latestTreeVersion: capture.latestTreeVersion,
    fixtures: results.length, comparisons: rows.length, matched: rows.filter(row => row.matches).length, results,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { values } = parseArgs({ options: { 'baseline-app': { type: 'string' }, all: { type: 'boolean' } } });
  const baseline = values['baseline-app'] && (await import(pathToFileURL(resolve(
    values['baseline-app'], 'crafting-ui/features/calculations/source-adapter.js',
  )).href)).assembleWorkspace;
  const { results, ...summary } = compareRelease(baseline);
  console.log(JSON.stringify({ ...summary,
    ...(values.all ? { results } : { differences: results.flatMap(({ id, comparisons }) =>
      comparisons.filter(row => !row.matches).map(row => ({ id, ...row })),
    ) }),
  }, null, 2));
  if (summary.matched !== summary.comparisons) process.exitCode = 1;
}
