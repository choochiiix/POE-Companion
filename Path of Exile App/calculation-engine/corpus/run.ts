import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { assembleTrial } from '../trial/adapter.ts';
import type { TrialScenario } from '../trial/adapter.ts';

export function compareCorpus() {
  const load = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
  const cases: TrialScenario[] = load('./cases.json');
  const capture = load('../reference/corpus-capture.json');
  const pin = load('../reference/pin.json');
  const hash = (path: string) => createHash('sha256').update(readFileSync(new URL(path, import.meta.url))).digest('hex');
  if (capture.archiveSha256 !== pin.sha256 || capture.kind !== 'executed-pob-headless-build'
    || capture.trialScriptSha256 !== hash('../reference/corpus.lua') || capture.runnerSha256 !== hash('../reference/run-build-trial.py')) throw new Error('Stale corpus tooling');
  for (const [path, expected] of Object.entries(capture.localSourceHashes)) if (hash('../../' + path) !== expected) throw new Error('Stale corpus source: ' + path);
  if (capture.result.cases.length !== cases.length) throw new Error('Incomplete corpus capture');
  const results = cases.map((definition, index) => {
    const reference = capture.result.cases[index];
    if (JSON.stringify(definition) !== JSON.stringify(reference.definition)) {
      if (Object.keys(definition).some(key => JSON.stringify(definition[key as keyof TrialScenario]) !== JSON.stringify(reference.definition[key]))) throw new Error('Stale fixture definition');
    }
    const {assembled, result} = assembleTrial(definition);
    const offence = result.offence!;
    const actual: Record<string, number> = {
      Str: assembled.attributes.strength.value, Dex: assembled.attributes.dexterity.value, Int: assembled.attributes.intelligence.value,
      Life: result.defence.pools.life.value, Mana: result.defence.pools.mana.value, Armour: result.defence.pools.armour.value,
      Evasion: result.defence.pools.evasion.value, EnergyShield: result.defence.pools.energyShield.value,
      FireResist: result.defence.resistances.fire.effective, ColdResist: result.defence.resistances.cold.effective,
      LightningResist: result.defence.resistances.lightning.effective, ChaosResist: result.defence.resistances.chaos.effective,
      Speed: offence.rate, CritChance: offence.effectiveCriticalChance, CritMultiplier: offence.criticalMultiplier / 100,
      HitChance: offence.chanceToHit, AverageDamage: offence.averageHit * offence.chanceToHit / 100, TotalDPS: offence.dps,
    };
    const comparisons = Object.entries(actual).map(([stat,value]) => ({stat,actual:value,expected:reference.output[stat],matches:Number.isFinite(reference.output[stat]) && Math.abs(value-reference.output[stat])<=1e-8}));
    return {id:definition.id, allMatch:comparisons.every(row=>row.matches), comparisons,diagnostics:result.diagnostics};
  });
  return {schemaVersion:1,archiveSha256:capture.archiveSha256,allMatch:results.every(result=>result.allMatch),fixtureCount:results.length,comparisonCount:results.reduce((sum,result)=>sum+result.comparisons.length,0),results};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const report=compareCorpus();writeFileSync(new URL('./report.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({fixtures:report.fixtureCount,comparisons:report.comparisonCount,allMatch:report.allMatch,differences:report.results.flatMap(result=>result.comparisons.filter(row=>!row.matches).map(row=>({id:result.id,...row})))},null,2));
  if(!report.allMatch)process.exitCode=1;
}
