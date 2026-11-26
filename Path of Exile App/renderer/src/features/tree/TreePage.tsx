import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {LiquidGlassLayer} from '@/components/ui/LiquidGlassLayer';
import {Select} from '@/components/ui/select';
import {SpringDisclosure} from '@/components/ui/spring-disclosure';
import {DefinitionText} from '@/components/DefinitionText';
import {fetchJson} from '@/adapters/api';
import {setCalculationTreeSelection} from '@/adapters/tree-store';
import {readSave,writeSave} from '@/adapters/storage';
import {indexTree,nodeVisual,reachable,shortestPath} from '@legacy/features/tree/tree-model.js';
import {fitCamera,hitNode,drawTree,zoomCamera} from './tree-canvas';
import type {Camera,Highlight} from './tree-canvas';
import {loadTreeSprites} from './tree-assets';
import type {TreeSprites} from './tree-assets';
import type {TreeData,TreeNode,TreeSnapshot} from './types';
import './tree.css';
interface Session{key:string;selected:Set<string>;masteries:Record<string,string>;roots:string[];classIndex:number;ascId:string;name:string;history:TreeSnapshot[]}
function readCharacter(){return readSave('poe-companion.character.v1',value=>value as {characterClass?:string;ascendancy?:string}|null);}
export default function TreePage({active:visibleRoute}:{active:boolean}){
 const [data,setData]=useState<TreeData>(),[error,setError]=useState(''),[sprite,setSprite]=useState<TreeSprites>();
 useEffect(()=>{
  let active=true;
  fetchJson<TreeData>('/tree-data/tree.json').then(data=>{if(active)setData(data);})
   .catch(error=>{if(active)setError(error.message);});
  return()=>{active=false;};
 },[]);
 useEffect(()=>{
  if(!visibleRoute||sprite)return;
  let active=true;
  void loadTreeSprites().then(sprites=>{if(active)setSprite(()=>sprites);})
   .catch(()=>{/* Keep the canvas fallback available. */});
  return()=>{active=false;};
 },[visibleRoute,sprite]);
 return <div id="treePanel">{data?<TreeWorkspace data={data} sprite={sprite}/>:<p role={error?'alert':'status'}>{error||'Loading offline tree…'}</p>}</div>;
}
function TreeWorkspace({data,sprite}:{data:TreeData;sprite?:TreeSprites}){
 const nodes=useMemo(()=>indexTree(data) as Map<string,TreeNode>,[data]),visible=useMemo(()=>[...nodes.values()].filter(n=>Number.isFinite(n.x)&&!data.groups[n.group]?.isProxy),[nodes,data]);
 const sessions=useRef(new Map<string,Session>()),[session,setSession]=useState<Session>(),[revision,revise]=useState(0),[view,setView]=useState('passive'),[budget,setBudget]=useState('123'),[query,setQuery]=useState(''),[matchIndex,setMatchIndex]=useState(-1),[highlight,setHighlight]=useState<Highlight>('all'),[status,setStatus]=useState(''),[current,setCurrent]=useState<TreeNode>(),[pinned,setPinned]=useState(false),[mastery,setMastery]=useState(''),[exported,setExported]=useState('');
 const canvas=useRef<HTMLCanvasElement>(null),close=useRef<HTMLButtonElement>(null),camera=useRef<Camera>({scale:.08,ox:0,oy:0}),drag=useRef<{x:number;y:number;ox:number;oy:number}|undefined>(undefined),currentRef=useRef(current),pinnedRef=useRef(pinned);
 const fitOnResize=useRef(true),zoomIdle=useRef<ReturnType<typeof setTimeout>|null>(null);
 currentRef.current=current;pinnedRef.current=pinned;
 const active=useMemo(()=>visible.filter(n=>view==='passive'?!n.ascendancyName:n.ascendancyName===view),[visible,view]);
 const matches=useMemo(()=>query.trim()?[...nodes.values()].filter(n=>n.search.includes(query.trim().toLowerCase())):[],[nodes,query]);
 const draw=useCallback(()=>{if(canvas.current&&session)drawTree(canvas.current,{data,list:active,nodes,selected:session.selected,masteries:session.masteries,revision,current,pinned,query,camera:camera.current,highlight,sprite},zoomIdle.current!==null||!!drag.current);},[data,active,nodes,session,current,pinned,query,revision,highlight,sprite]);
 useEffect(()=>{const sync=()=>{const character=readCharacter(),cls=data.classes.find(c=>c.name===character?.characterClass)||data.classes[1],classIndex=data.classes.indexOf(cls),ascId=cls.ascendancies.find(a=>a.name===character?.ascendancy)?.id||'',key=`poe.tree.3_29.${cls.name}.${ascId}`;setSession(previous=>{if(previous?.key===key)return previous;let next=sessions.current.get(key);if(!next){let stored:Partial<TreeSnapshot>={};try{stored=JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{setStatus('Saved tree could not be read. Export your tree to keep this session.');}const roots=[...nodes.values()].filter(n=>n.classStartIndex===classIndex||(n.isAscendancyStart&&n.ascendancyName===ascId)).map(n=>n.id),selected=new Set((Array.isArray(stored.selected)?stored.selected:[]).map(String).filter(id=>nodes.has(id)));roots.forEach(id=>selected.add(id));next={key,selected,masteries:stored.masteries&&typeof stored.masteries==='object'&&!Array.isArray(stored.masteries)?{...stored.masteries}:{},roots,classIndex,ascId,name:`${cls.name}  |  ${character?.ascendancy||'Not ascended'}`,history:[]};sessions.current.set(key,next);}return next;});};sync();document.addEventListener('build:change',sync);window.addEventListener('storage',sync);return()=>{document.removeEventListener('build:change',sync);window.removeEventListener('storage',sync);};},[data,nodes]);
 useEffect(()=>{if(!session)return;setView('passive');setCurrent(undefined);setPinned(false);setMatchIndex(-1);setExported('');setCalculationTreeSelection(session.key,{selected:[...session.selected],masteries:session.masteries});requestAnimationFrame(()=>{if(canvas.current){fitOnResize.current=true;camera.current=fitCamera(canvas.current,visible.filter(n=>!n.ascendancyName));revise(v=>v+1);}});},[session?.key]);
 const drawRef=useRef(draw),pendingDraw=useRef<number|null>(null);
 const scheduleDraw=useCallback(()=>{
  if(pendingDraw.current!==null)return;
  pendingDraw.current=requestAnimationFrame(()=>{
   pendingDraw.current=null;
   drawRef.current();
  });
 },[]);
 const scheduleZoom=useCallback(()=>{
  if(zoomIdle.current!==null)clearTimeout(zoomIdle.current);
  zoomIdle.current=setTimeout(()=>{zoomIdle.current=null;scheduleDraw();},100);
  scheduleDraw();
 },[scheduleDraw]);
 useLayoutEffect(()=>{drawRef.current=draw;scheduleDraw();},[draw,scheduleDraw]);
 useEffect(()=>()=>{if(pendingDraw.current!==null){cancelAnimationFrame(pendingDraw.current);pendingDraw.current=null;}if(zoomIdle.current!==null)clearTimeout(zoomIdle.current);},[]);
 useEffect(()=>{
  const redraw=()=>revise(value=>value+1);
  window.addEventListener('appearance:change',redraw);
  window.addEventListener('aurora:change',redraw);
  window.addEventListener('storage',redraw);
  window.addEventListener('resize',redraw);
  let resolution:MediaQueryList;
  const watchResolution=()=>{
   resolution?.removeEventListener('change',watchResolution);
   resolution=window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
   resolution.addEventListener('change',watchResolution);
   redraw();
  };
  watchResolution();
  return ()=>{
   window.removeEventListener('appearance:change',redraw);
   window.removeEventListener('aurora:change',redraw);
   window.removeEventListener('storage',redraw);
   window.removeEventListener('resize',redraw);
   resolution.removeEventListener('change',watchResolution);
  };
 },[]);
 useEffect(()=>{
  const element=canvas.current;
  if(!element)return;
  const observer=new ResizeObserver(()=>{
   if(!element.clientWidth||!element.clientHeight)return;
   if(fitOnResize.current)camera.current=fitCamera(element,active);
   revise(value=>value+1);
  });
  observer.observe(element);
  return()=>observer.disconnect();
 },[active]);
 useEffect(()=>{if(!canvas.current)return;const element=canvas.current;const wheel=(event:WheelEvent)=>{event.preventDefault();fitOnResize.current=false;const rect=element.getBoundingClientRect(),x=event.clientX-rect.left-element.clientLeft,y=event.clientY-rect.top-element.clientTop;camera.current=zoomCamera(camera.current,Math.exp(-event.deltaY*.001),x,y);if(!pinnedRef.current&&currentRef.current)setCurrent(undefined);scheduleZoom();};element.addEventListener('wheel',wheel,{passive:false});return()=>element.removeEventListener('wheel',wheel);},[scheduleZoom]);
 useEffect(()=>{if(current)setMastery(session?.masteries[current.id]||'');},[current?.id,session?.key,revision]);
 function closePopup(focus=false){setCurrent(undefined);setPinned(false);if(focus)canvas.current?.focus();}
 function fit(nextView=view){if(canvas.current){fitOnResize.current=true;camera.current=fitCamera(canvas.current,visible.filter(n=>nextView==='passive'?!n.ascendancyName:n.ascendancyName===nextView));revise(v=>v+1);}}
 useEffect(()=>{const onWorkspace=(event:Event)=>{if((event as CustomEvent).detail?.panelId==='treePanel')requestAnimationFrame(()=>fit());};document.addEventListener('workspace:change',onWorkspace);return()=>document.removeEventListener('workspace:change',onWorkspace);},[visible,view]);
 function inspect(node:TreeNode,pin:boolean){setCurrent(node);setPinned(pin);setMastery(session?.masteries[node.id]||'');}
 function nextMatch(){if(!matches.length||!canvas.current)return;const index=(matchIndex+1)%matches.length,node=matches[index];setMatchIndex(index);if(Number.isFinite(node.x)){const nextView=node.ascendancyName||'passive';setView(nextView);fitOnResize.current=false;const scale=Math.min(.4,Math.max(.2,canvas.current.clientWidth/2100));camera.current={scale,ox:canvas.current.clientWidth/2-node.x*scale,oy:canvas.current.clientHeight/2-node.y*scale};}else setStatus('Indexed source-only node; no position in this static tree.');inspect(node,true);requestAnimationFrame(()=>close.current?.focus());}
 function counts(){const allocated=[...(session?.selected||[])].map(id=>nodes.get(id)).filter((n):n is TreeNode=>!!n&&!session?.roots.includes(n.id));return {normal:allocated.filter(n=>!n.ascendancyName).length,asc:allocated.filter(n=>n.ascendancyName).length};}
 function checkpoint(){if(session)session.history.push({selected:[...session.selected],masteries:{...session.masteries}});}
 function save(){if(!session)return;setCalculationTreeSelection(session.key,{selected:[...session.selected],masteries:session.masteries});if(writeSave(session.key,{selected:[...session.selected],masteries:session.masteries}))setStatus('Storage unavailable; export your tree to keep it.');revise(value=>value+1);}
 function allocate(){if(!session||!current)return;const node=current;if(node.ascendancyName&&node.ascendancyName!==session.ascId){setStatus('Select this ascendancy in Character before allocating. Alternate trees are reference only.');return;}if(session.roots.includes(node.id))return;checkpoint();if(session.selected.has(node.id)){session.selected.delete(node.id);delete session.masteries[node.id];const reach=reachable(nodes,session.roots,session.selected);for(const id of [...session.selected]){const item=nodes.get(id)!;if(item.isMastery){if(![...session.selected].some(key=>nodes.get(key)?.group===item.group&&nodes.get(key)?.isNotable)){session.selected.delete(id);delete session.masteries[id];}}else if(!reach.has(id)){session.selected.delete(id);delete session.masteries[id];}}setStatus('Refunded node and disconnected dependants.');}else if(node.isMastery){if(!mastery){setStatus('Choose a mastery effect first.');return;}if(Object.values(session.masteries).includes(mastery)){setStatus('This mastery effect is already allocated.');return;}if(![...session.selected].some(id=>nodes.get(id)?.group===node.group&&nodes.get(id)?.isNotable)){setStatus('Allocate a notable in this cluster first.');return;}if(counts().normal>=Number(budget)){setStatus('Passive point budget reached.');return;}session.selected.add(node.id);session.masteries[node.id]=mastery;}else{const allowed=(n:TreeNode)=>n&&Number.isFinite(n.x)&&!n.isMastery&&(view==='passive'?!n.ascendancyName&&(n.classStartIndex===undefined||n.classStartIndex===session.classIndex):n.ascendancyName===view),path=shortestPath(nodes,[...session.selected].filter(id=>!nodes.get(id)?.isMastery),node.id,allowed) as string[]|null;if(!path){setStatus('No connected path from this character start.');return;}const extra=path.filter(id=>!session.selected.has(id)),c=counts();if(c.normal+extra.filter(id=>!nodes.get(id)?.ascendancyName).length>Number(budget)||c.asc+extra.filter(id=>nodes.get(id)?.ascendancyName).length>8){setStatus('Point budget exceeded.');return;}if(extra.some(id=>nodes.get(id)?.isMultipleChoiceOption)){setStatus('This special ascendancy choice is viewable; allocation rules are not yet implemented.');return;}extra.forEach(id=>session.selected.add(id));setStatus(`Allocated ${extra.length} point(s).`);}save();}
 const count=counts(),cls=session?data.classes[session.classIndex]:undefined;
 return <>
  <header className="tree-page-header">
   <div><span className="eyebrow">PASSIVE PLANNER · OFFLINE 3.29</span><h1>Passive skill tree</h1><p className="muted" id="treeCharacter">{session?.name}</p></div>
   <div className="tree-counts" aria-label="Allocated passive points"><div><span>Passives</span><strong>{count.normal}<small> / {budget}</small></strong></div><div><span>Ascendancy</span><strong>{count.asc}<small> / 8</small></strong></div></div>
  </header>
  <section className="tree-control-panel workspace-glass" aria-label="Tree controls">
   <LiquidGlassLayer/>
   <div className="tree-control-primary">
    <label className="tree-search-field">Find a node<Input id="treeSearch" type="search" placeholder="Name, stat or node ID" value={query} onChange={e=>{setQuery(e.target.value);if(!e.target.value.trim()&&highlight==='search')setHighlight('all');setMatchIndex(-1);}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();nextMatch();}}}/></label>
    <div className="tree-search-actions"><Button id="treeNext" variant="outline" disabled={!matches.length} onClick={nextMatch}>Next match</Button><span className="tree-search-count" id="indexCount" role="status">{query?(matchIndex<0?`${matches.length} matches`:`${matchIndex+1} / ${matches.length}`):`${nodes.size.toLocaleString()} nodes`}</span></div>
    <label className="tree-view-field">Tree view<Select id="treeView" value={view} onChange={e=>{setView(e.target.value);closePopup();fit(e.target.value);}}><option value="passive">Passive tree</option>{cls?.ascendancies.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}{data.alternate_ascendancies?.map(a=><option key={a.id} value={a.id}>{a.name} (reference only)</option>)}</Select></label>
    <label className="tree-budget-field">Budget<Input id="passiveBudget" type="number" min={0} max={123} value={budget} onChange={e=>setBudget(e.target.value)}/></label>
   </div>
   <div className="tree-control-secondary"><div className="tree-action-buttons"><Button variant="outline" id="treeFit" onClick={()=>fit()}>Fit view</Button><Button variant="outline" id="treeUndo" disabled={!session?.history.length} onClick={()=>{const old=session?.history.pop();if(old&&session){session.selected=new Set(old.selected);session.masteries=old.masteries;save();}}}>Undo</Button><Button variant="ghost" id="treeReset" onClick={()=>{if(session){checkpoint();session.selected=new Set(session.roots);session.masteries={};save();}}}>Clear allocations</Button></div>{status&&<p className="tree-status" id="treeStatus" role="status">{status}</p>}</div>
  </section>
  <section className="tree-visual-layout" onPointerLeave={()=>{if(!pinned)closePopup();}} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();closePopup(true);}}}>
   <div className="tree-map-panel workspace-glass"><LiquidGlassLayer/><div className="tree-map-hint"><span>Drag to pan · Scroll to zoom <span className="tree-hint-pin">· Click a node to pin details</span></span><label className="tree-highlight-filter">Highlight nodes<Select id="treeHighlight" aria-label="Highlight nodes" value={highlight} onChange={e=>setHighlight(e.target.value as typeof highlight)}><option value="all">All nodes</option><option value="search" disabled={!query.trim()}>Search matches</option><option value="allocated">Allocated</option><option value="unallocated">Unallocated</option><option value="notables">Notables</option><option value="keystones">Keystones</option><option value="masteries">Masteries</option><option value="jewels">Jewel sockets</option><option value="starts">Class and ascendancy starts</option></Select></label></div>
    <canvas id="treeCanvas" ref={canvas} tabIndex={0} aria-label="Passive tree. Drag to pan, scroll to zoom. Arrow keys pan; plus and minus zoom. Search and press Enter or Next match to inspect nodes with the keyboard. Press Escape to close details." onKeyDown={e=>{if(['+','=','-'].includes(e.key)){e.preventDefault();fitOnResize.current=false;camera.current=zoomCamera(camera.current,e.key==='-'?1/1.2:1.2,e.currentTarget.clientWidth/2,e.currentTarget.clientHeight/2);scheduleZoom();}if(e.key.startsWith('Arrow')){e.preventDefault();fitOnResize.current=false;camera.current.ox+=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0;camera.current.oy+=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;scheduleDraw();}}} onPointerDown={e=>{e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.nativeEvent.offsetX,y:e.nativeEvent.offsetY,ox:camera.current.ox,oy:camera.current.oy};}} onPointerMove={e=>{const x=e.nativeEvent.offsetX,y=e.nativeEvent.offsetY;if(drag.current){if(x!==drag.current.x||y!==drag.current.y)fitOnResize.current=false;camera.current.ox=drag.current.ox+x-drag.current.x;camera.current.oy=drag.current.oy+y-drag.current.y;if(!pinnedRef.current&&currentRef.current)setCurrent(undefined);scheduleDraw();return;}if(pinnedRef.current)return;const node=hitNode(active,x,y,camera.current);const cursor=node?'pointer':'grab';if(e.currentTarget.style.cursor!==cursor)e.currentTarget.style.cursor=cursor;if(node){if(node!==currentRef.current)inspect(node,false);}else if(currentRef.current)setCurrent(undefined);}} onPointerUp={e=>{const x=e.nativeEvent.offsetX,y=e.nativeEvent.offsetY;if(drag.current&&Math.hypot(x-drag.current.x,y-drag.current.y)<5){const node=hitNode(active,x,y,camera.current);if(node)inspect(node,true);else closePopup();}drag.current=undefined;scheduleDraw();}} onPointerCancel={()=>{drag.current=undefined;scheduleDraw();}}/>
   </div>
   <aside className={`tree-inspector workspace-glass ${current?'has-node':''}`} aria-label="Node details"><LiquidGlassLayer/>{current?<><div className="tree-inspector-header"><span className="eyebrow">NODE DETAILS</span>{pinned&&<Button ref={close} id="closeNode" variant="ghost" size="sm" aria-label="Close node details" onClick={()=>closePopup(true)}>Close</Button>}</div><h2 id="treeNodeName">{current.name}</h2><p className="tree-node-meta" id="nodeMeta">{nodeVisual(current).label} · {current.ascendancyName||'Passive tree'} · {session?.selected.has(current.id)?'Allocated':'Unallocated'} · #{current.id}</p><div id="nodeStats" className="tree-node-stats">{[...current.stats||[],...current.reminderText||[]].length?[...current.stats||[],...current.reminderText||[]].map((text,index)=><p key={index}><DefinitionText text={text} surface="passive-node" record={current.id}/></p>):<p className="muted">No stat text in this source record.</p>}</div>{current.isMastery&&<Select id="masteryChoice" aria-label="Mastery effect" value={mastery} onChange={e=>setMastery(e.target.value)}><option value="">Choose mastery effect</option>{current.masteryEffects?.map(effect=><option key={effect.effect} value={String(effect.effect)}>{effect.stats.join(' | ')}</option>)}</Select>}<Button id="allocateNode" disabled={session?.roots.includes(current.id)||!Number.isFinite(current.x)} onClick={allocate}>{session?.selected.has(current.id)?'Refund node':'Allocate shortest path'}</Button><small className="tree-inspector-note">{pinned?'Pinned details · Escape or Close to dismiss.':'Preview · click a node to pin details.'}</small></>:<><span className="eyebrow">NODE DETAILS</span><h2>Select a node</h2><p>Hover to preview its stats. Click to pin details and allocate a path from your character start.</p></>}</aside>
  </section>
  <SpringDisclosure id="treeExportPanel" className="tree-source-details tree-disclosure"><summary>Tree data, limitations and export</summary><article><p>Offline 3.29 snapshot. All source nodes are indexed, including those without static map positions. Special multiple-choice ascendancy allocation, alternate starts, cluster jewels, tattoos and anoints are not simulated. See Character for supported passive stat calculations.</p><Button variant="outline" id="treeExport" onClick={()=>session&&setExported(JSON.stringify({version:'3_29',key:session.key,selected:[...session.selected],masteries:session.masteries}))}>Generate export</Button><textarea id="treeTransfer" className="tree-transfer" aria-label="Exported tree selections" readOnly value={exported}/></article></SpringDisclosure>
 </>;
}
