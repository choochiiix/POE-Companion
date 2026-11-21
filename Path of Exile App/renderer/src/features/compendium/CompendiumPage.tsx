import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { fetchJson } from '@/adapters/api';
import { LibraryLayout, revealInspector } from '@/features/skills/LibraryLayout';
import { conciseDefinition } from '@legacy/shared/definitions/glossary-model.js';
import { collections, filterDefinitions } from './compendium-state';
import type { GlossaryData, GlossaryEntry } from './types';
import './compendium.css';

const inspectorTitle = 'Definition inspector';
function Definition({entry}:{entry:GlossaryEntry}){
 const short=conciseDefinition(entry.definition),variants=(entry.effectVariants||[]).filter(v=>v.lines?.length||Object.keys(v.stats||{}).length),wiki=entry.wikiContext?.revision?entry.wikiContext:null;
 return <><h3>{entry.name}</h3>{entry.icon&&<img src={entry.icon} alt={`${entry.name} status icon`} width={96} height={96} className="buff-inspector-icon"/>}<p className="compendium-badge">{entry.buffId?(entry.definition?'RePoE status effect · '+entry.category:'Source description unavailable'):entry.status==='reviewed'?'Reviewed starter definition':'Draft · needs review'}</p><p className="compendium-definition">{short||'No description supplied by source.'}</p>{short!==entry.definition&&<details><summary>Full definition</summary><p>{entry.definition}</p></details>}{entry.buffId&&<><h4>Mechanical effects</h4><p>{variants.length?`${variants.length} source-specific variants. Values below apply to their listed source, not every use of this effect.`:'Fixed effect values are not supplied for this record. Values may depend on the skill, source, stacks or level.'}</p>{variants.map((variant,index)=><details key={variant.id+index}><summary>{variant.source}: {variant.name||variant.id}</summary>{variant.template&&<p>Uses template: {variant.template}</p>}{variant.item&&<p>Item: {variant.item}</p>}{variant.radiusMetres!=null&&<p>Aura radius: {variant.radiusMetres} m</p>}{variant.lines?.map((line,i)=><p key={i}>{line}</p>)}<details><summary>Exact source stat values</summary>{Object.entries(variant.stats||{}).map(([stat,value])=><p key={stat}>{stat}: {String(value)}</p>)}</details></details>)}{entry.stackLimit!=null&&<p>Source stack limit: {entry.stackLimit}</p>}<details><summary>Stats affected by this record</summary>{(entry.statIds||entry.stats||[]).map(stat=><p key={stat}>{stat}</p>)}</details>{wiki?<><h4>Wiki mechanic context</h4><p>Related article matched by name/redirect; not a verified mapping of every source variant.</p><p>{wiki.summary}</p>{wiki.mechanics?.map((p,i)=><p key={i}>{p}</p>)}<a href={wiki.url} target="_blank" rel="noreferrer">{wiki.title}</a><p>Wiki revision {wiki.revision} · {wiki.license}</p></>:<p>No unambiguous wiki article linked.</p>}<p>Category: {entry.category}{entry.invisible?' · hidden effect in source':''}</p>{!entry.icon&&<p>No local icon available for this source record.</p>}</>}<p>Aliases: {entry.aliases.join(', ')}</p><p>{entry.references.length} source references · {entry.kind}</p><h4>Sources</h4>{entry.sources.map((source,index)=><div key={index}>{source.url?<><a className="compendium-sources" href={source.url} target="_blank" rel="noreferrer">{source.url}</a><p>{source.revision!=null?'Revision '+source.revision:'Source record '+source.record} · {source.license}</p></>:<p className="compendium-sources">{source.path} · {source.record}</p>}</div>)}<details><summary>Record identity and source references</summary><p>{entry.id}</p>{entry.references.slice(0,20).map((reference,index)=><p key={index}>{reference.surface} · {reference.record} · {reference.field}</p>)}{entry.references.length>20&&<p>{entry.references.length-20} additional references in master.json</p>}</details></>;
}
export default function CompendiumPage(){
 const [entries,setEntries]=useState<GlossaryEntry[]>([]),[error,setError]=useState(''),[loaded,setLoaded]=useState(false),[filter,setFilter]=useState(new URLSearchParams(location.search).get('collection')==='buff'?'buff':'reviewed'),[search,setSearch]=useState(''),[limit,setLimit]=useState(50),[selected,setSelected]=useState('');
 useEffect(()=>{let active=true;Promise.all(['/glossary-data.json','/buff-data.json'].map(path=>fetchJson<GlossaryData>(path))).then(data=>{if(active){setEntries(data.flatMap(d=>d.entries));setLoaded(true);}}).catch(()=>{if(active)setError('Compendium could not load. Reload to retry the local data files.');});return()=>{active=false;};},[]);
 const matches=filterDefinitions(entries,filter,search),entry=matches.find(e=>e.id===selected)||matches[0];
 return (
   <div id="compendiumPanel">
     <div className="page-heading">
       <div>
         <h1>Compendium</h1>
         <p className="muted">The master glossary · mechanics, skills and modifier language. Draft definitions remain marked for review.</p>
       </div>
     </div>
     <LibraryLayout
       title={inspectorTitle}
       categories={collections.map(([value, label]) => (
         <Button key={value} variant="ghost" aria-pressed={filter === value} onClick={() => {
           setFilter(value);
           setLimit(50);
         }}>
           {label}
         </Button>
       ))}
       inspector={entry
         ? <div className="compendium-reference"><Definition entry={entry} /></div>
         : <p>No definitions match these filters.</p>}
     >
       <Panel>
         <label>
           Search definitions
           <Input type="search" value={search} onChange={event => {
             setSearch(event.target.value);
             setLimit(50);
           }} />
         </label>
       </Panel>
       <p className="source-note" role={error ? 'alert' : 'status'}>
         {error || (!loaded ? 'Loading local glossary…' : `${matches.length} matching records · ${Math.min(limit, matches.length)} shown`)}
       </p>
       <div className="compendium-records">
         <table className="data-table compendium-table">
           <thead>
             <tr>{['Term', 'Review status', 'Type'].map(title => <th scope="col" key={title}>{title}</th>)}</tr>
           </thead>
           <tbody>
             {matches.slice(0, limit).map(record => (
               <tr key={record.id}>
                 <td>
                   <Button
                     variant="ghost"
                     className="compendium-record"
                     aria-pressed={record.id === entry?.id}
                     onClick={() => {
                       setSelected(record.id);
                       revealInspector(inspectorTitle);
                     }}
                   >
                     {record.icon && <img src={record.icon} alt="" width={40} height={40} loading="lazy" className="buff-row-icon" />}
                     <span>{record.name}{record.buffId && <small className="buff-source-id">{record.buffId}</small>}</span>
                   </Button>
                 </td>
                 <td>{{ reviewed: 'Reviewed', 'source-extracted': 'Source extracted', 'needs-extraction': 'Needs extraction' }[record.status] || record.status}</td>
                 <td>{record.category || record.kind}</td>
               </tr>
             ))}
           </tbody>
         </table>
       </div>
       {matches.length > limit && <Button className="mt-4" variant="outline" onClick={() => setLimit(limit + 50)}>Show more</Button>}
     </LibraryLayout>
   </div>
 );
}
