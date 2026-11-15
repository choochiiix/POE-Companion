import {useEffect,useRef,useState} from 'react';
import {Popover} from 'radix-ui';
import {createGlossary,conciseDefinition} from '@legacy/shared/definitions/glossary-model.js';
import {fetchJson} from '@/adapters/api';
type Glossary=ReturnType<typeof createGlossary>;
let shared:Promise<Glossary>|undefined,dismissCurrent:(()=>void)|undefined;
function DefinitionTerm({entry,text}:{entry:any;text:string}){
 const [open,setOpen]=useState(false),trigger=useRef<HTMLButtonElement>(null),content=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),automatic=useRef(false),suppress=useRef(false);
 const show=()=>{if(suppress.current)return;clearTimeout(timer.current);dismissCurrent?.();const dismiss=()=>{automatic.current=true;setOpen(false);};dismissCurrent=dismiss;automatic.current=false;setOpen(true);};
 const leave=()=>{clearTimeout(timer.current);timer.current=setTimeout(()=>{if(!trigger.current?.matches(':hover')&&!content.current?.matches(':hover')&&document.activeElement!==trigger.current&&!content.current?.contains(document.activeElement)){automatic.current=true;setOpen(false);}},120);};
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 const full=entry.definition.replace(' This is the base skill description; an item’s granted level and special modifiers can change its values.','');
 return <Popover.Root open={open} onOpenChange={setOpen}><Popover.Trigger asChild><button ref={trigger} type="button" className="definition-term" aria-label={`Define ${text}`} onPointerEnter={show} onPointerLeave={leave} onFocus={show} onClick={event=>{event.preventDefault();event.stopPropagation();show();}}>{text}</button></Popover.Trigger><Popover.Portal><Popover.Content ref={content} className="definition-bubble" sideOffset={7} onPointerEnter={()=>clearTimeout(timer.current)} onPointerLeave={leave} onOpenAutoFocus={event=>event.preventDefault()} onEscapeKeyDown={()=>{automatic.current=false;}} onInteractOutside={()=>{automatic.current=true;}} onCloseAutoFocus={event=>{event.preventDefault();if(!automatic.current){suppress.current=true;trigger.current?.focus();setTimeout(()=>{suppress.current=false;},0);}}}><strong>{entry.name}</strong><p>{conciseDefinition(entry.definition)}</p>{conciseDefinition(entry.definition)!==full&&<details><summary>Full definition</summary><p>{full}</p></details>}<small>{entry.status==='reviewed'?'Editorial definition · sourced glossary':entry.matchingApproval==='source-description'?'Path of Building · base skill description':'Wiki source excerpt · editorial review pending'}</small><button type="button" className="definition-close" onClick={()=>{automatic.current=false;setOpen(false);}}>Close definition</button><Popover.Arrow/></Popover.Content></Popover.Portal></Popover.Root>;
}
export function DefinitionText({text,surface,field,record}:{text:string;surface:string;field?:string;record?:string}){
 const [glossary,setGlossary]=useState<Glossary>();
 useEffect(()=>{let mounted=true;shared??=fetchJson('/tooltip-data.json').then(createGlossary);shared.then(value=>{if(mounted)setGlossary(value);}).catch(()=>{});return()=>{mounted=false;};},[]);
 const output=[];let cursor=0;for(const hit of glossary?.match(text,{surface,field,record})??[]){if(hit.start>cursor)output.push(text.slice(cursor,hit.start));output.push(<DefinitionTerm key={`${hit.start}:${hit.id}`} entry={glossary!.get(hit.id)} text={hit.text}/>);cursor=hit.end;}if(cursor<text.length)output.push(text.slice(cursor));return <span>{output}</span>;
}
