import {useState} from 'react';
import {Tooltip} from 'radix-ui';
import {InfoIcon} from '@/components/ui/icons';
import {characterDefence,type calculationInput} from '@/adapters/calculations';
import {Input} from '@/components/ui/input';
import {SpringSelect} from '@/components/ui/spring-select';
import {LiquidGlassLayer} from '@/components/ui/LiquidGlassLayer';
import type {DamageType} from '../../../../calculation-engine/src/model.ts';
import type {calculateSurvivability} from '../../../../calculation-engine/src/advanced-defence.ts';
const types: DamageType[]=['physical','fire','cold','lightning','chaos'];
const format=(value:number)=>value.toLocaleString(undefined,{maximumFractionDigits:2});
type Metric=ReturnType<typeof calculateSurvivability>['maxHit'][DamageType];
function MetricValue({metric}:{metric?:Metric}) {
 return metric?.value!=null?<>{format(metric.value)}</>:<span>Unavailable{metric?.reason&&<small>{metric.reason}</small>}</span>;
}
export function DefencePanel({input,error}:{input?:ReturnType<typeof calculationInput>;error:string}) {
 const [custom,setCustom]=useState(false),[amount,setAmount]=useState('100'),[type,setType]=useState<DamageType>('physical');
 const valid=amount.trim()!==''&&Number.isFinite(Number(amount))&&Number(amount)>=0&&Number(amount)<=1e9;
 let calculation:ReturnType<typeof characterDefence>|undefined;
 let issue=error;
 try {if(input&&(!custom||valid))calculation=characterDefence(input,custom?{kind:'attack',damage:{[type]:Number(amount)}}:undefined);}
 catch(error){issue=(error as Error).message;}
 const survival=calculation?.survivability;
 return <section className="character-panel character-defence" aria-labelledby="defence-heading"><LiquidGlassLayer/>
 <h3 id="defence-heading">Defence <small>Partial estimate</small></h3>
 <div className="defence-limit-heading"><strong>Single-hit limit · higher is better</strong><Tooltip.Provider delayDuration={180}><Tooltip.Root><Tooltip.Trigger asChild><button type="button" className="defence-info" aria-label="About Defence estimates"><InfoIcon size={15} strokeWidth={1.8} aria-hidden="true"/></button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="definition-bubble defence-info-tooltip" side="left" sideOffset={8} collisionPadding={16}><strong>How much damage can you withstand?</strong><p>Each limit is the incoming damage needed to exhaust your life, starting at full life and energy shield. Higher means better protection.</p><p>More life raises the limits. Resistance reduces damage, so it takes a larger hit of that type to defeat you.</p><p>Example: 100 life withstands just under 100 fire damage at 0% resistance, or just under 200 at 50%. A hit at the limit exhausts life.</p><p>For the test hit below, damage after defences is better when lower. Depletion totals are better when higher and assume no healing. Chaos bypasses energy shield.</p><Tooltip.Arrow/></Tooltip.Content></Tooltip.Portal></Tooltip.Root></Tooltip.Provider></div>
 <dl className="defence-values">{types.map(type=><div key={type}><dt>{type}</dt><dd><MetricValue metric={survival?.maxHit[type]}/></dd></div>)}</dl>
 <label className="defence-toggle"><input type="checkbox" checked={custom} onChange={event=>setCustom(event.target.checked)}/>Try an incoming hit</label>
 {custom&&<div className="defence-scenario"><label>Damage amount<Input type="number" min="0" max="1000000000" step="any" value={amount} aria-invalid={!valid} aria-describedby={!valid?'defence-input-error':undefined} onChange={event=>setAmount(event.target.value)}/></label><label>Damage type<SpringSelect aria-label="Incoming damage type" value={type} onChange={event=>setType(event.target.value as DamageType)}>{types.map(type=><option key={type} value={type}>{type[0].toUpperCase()+type.slice(1)}</option>)}</SpringSelect></label></div>}
 {custom&&!valid&&<p id="defence-input-error">Enter damage from 0 to 1,000,000,000.</p>}
 <div aria-live="polite" aria-atomic="true"><p>{custom?'Temporary scenario':`Baseline: ${format(input?.context.incomingHit??100)} physical damage`} · already-landed attack</p>
 <dl className="defence-values"><div><dt>Damage after defences</dt><dd>{calculation?.incomingHit?format(calculation.incomingHit.expectedTaken):'Unavailable'}</dd></div><div><dt>Total incoming damage to depletion</dt><dd><MetricValue metric={survival?.ehp}/></dd></div><div><dt>Hits to depletion · fractional</dt><dd>{survival?.ehp.hitsToDeplete!=null?format(survival.ehp.hitsToDeplete):'Unavailable'}</dd></div></dl></div>
 {!calculation&&<p>{issue?`Defence unavailable: ${issue}`:custom&&!valid?'Scenario results unavailable until damage is valid.':'Loading local calculation sources…'}</p>}
 <details><summary>Assumptions and unsupported effects</summary><p>Full unreserved life and energy shield. Non-chaos damage uses ES before life; chaos bypasses ES. No evasion, block, suppression, recovery, guard skills, Ward, damage over time or special pool routing is applied. Fractional hit counts are a budget, not guaranteed hits survived.</p>{survival?.assumptions.map((text:string)=><p key={text}>{text}</p>)}<p>Equipment base ranges use midpoint rolls. Unsupported build effects can change these estimates.</p><ul>{calculation?.diagnostics.map((issue:{sourceId:string;effect:string},index:number)=><li key={index}>{issue.sourceId}: {issue.effect}</li>)}</ul></details>
 </section>;
}
