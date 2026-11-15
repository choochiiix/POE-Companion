import {useLayoutEffect,useRef,type CSSProperties} from 'react';

type Option={value:string;label:string};
type Props={value:string;onValueChange:(value:string)=>void;options:Option[];ariaLabel?:string;className?:string};
const transform=(left:number,right:number)=>`translateX(${left}px) scaleX(${Math.max(0,right-left)/100})`;
/** Reference Plan Switch springs, sampled in wall-clock time; no requestAnimationFrame driver. */
export function PlanSwitch({value,onValueChange,options,ariaLabel='Views',className=''}:Props){
 const container=useRef<HTMLDivElement>(null),thumb=useRef<HTMLSpanElement>(null);
 const synchronize=useRef<()=>void>(()=>{});
 const state=useRef({initialized:false,left:0,right:0,animation:null as Animation|null});
 useLayoutEffect(()=>{
  const root=container.current!,highlight=thumb.current!,media=matchMedia('(prefers-reduced-motion: reduce)');
  const sync=()=>{
   const active=root.querySelector<HTMLButtonElement>('button[aria-pressed=true]');if(!active||!active.offsetWidth)return;
   const parent=root.getBoundingClientRect(),bounds=active.getBoundingClientRect(),left=bounds.left-parent.left-root.clientLeft,right=left+bounds.width;
   const s=state.current,reduce=media.matches||document.documentElement.dataset.motion==='reduced';
   if(s.initialized&&Math.abs(left-s.left)<.05&&Math.abs(right-s.right)<.05){if(reduce){s.animation?.cancel();s.animation=null;}return;}
   const current=highlight.getBoundingClientRect(),fromLeft=s.initialized?current.left-parent.left-root.clientLeft:left,fromRight=s.initialized?current.right-parent.left-root.clientLeft:right,movingRight=left>s.left;
   s.animation?.cancel();s.animation=null;s.left=left;s.right=right;highlight.style.transform=transform(left,right);
   if(s.initialized&&!reduce&&typeof highlight.animate==='function'){
    const edge=(x:number,t:number,k:number,c:number)=>({x,t,k,c,v:0});
    const l=edge(fromLeft,left,movingRight?190:620,movingRight?19:36),r=edge(fromRight,right,movingRight?620:190,movingRight?36:19);
    const frames:Keyframe[]=[{transform:transform(l.x,r.x),offset:0}],duration=650,count=39,dt=duration/1000/count/4;
    for(let f=1;f<=count;f++){for(let step=0;step<4;step++)for(const e of [l,r]){e.v+=(-e.k*(e.x-e.t)-e.c*e.v)*dt;e.x+=e.v*dt;}frames.push({transform:f===count?transform(left,right):transform(l.x,r.x),offset:f/count});}
    const running=highlight.animate(frames,{duration,easing:'linear'});s.animation=running;running.finished.then(()=>{if(s.animation===running){s.animation=null;running.cancel();}},()=>{});
   }
   s.initialized=true;
  };
  synchronize.current=sync;
  const size=new ResizeObserver(sync),motion=new MutationObserver(sync);size.observe(root);motion.observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});media.addEventListener('change',sync);sync();
  return()=>{size.disconnect();motion.disconnect();media.removeEventListener('change',sync);state.current.animation?.cancel();state.current.animation=null;};
 },[]);
 useLayoutEffect(()=>synchronize.current(),[value,options]);
 const style:CSSProperties={position:'relative',isolation:'isolate',display:'flex',width:'fit-content',maxWidth:'100%',padding:3,gap:0,background:'var(--bg-secondary)',border:'1px solid var(--line)',borderRadius:10};
 return <div ref={container} role="group" aria-label={ariaLabel} className={`plan-switch ${className}`} style={style} onKeyDown={event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const buttons=[...container.current!.querySelectorAll('button')],index=buttons.indexOf(document.activeElement as HTMLButtonElement),next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next]?.click();buttons[next]?.focus();
 }}><span ref={thumb} aria-hidden="true" className="plan-switch-highlight" style={{position:'absolute',left:0,top:3,bottom:3,width:100,borderRadius:7,background:'var(--surface)',pointerEvents:'none',zIndex:0,transformOrigin:'0 50%'}}/>{options.map(option=><button key={option.value} type="button" aria-pressed={value===option.value} onClick={()=>onValueChange(option.value)} style={{position:'relative',zIndex:1,minHeight:30,padding:'6px 12px',border:0,borderRadius:7,background:'transparent',color:value===option.value?'var(--text)':'var(--text-muted)',font:'400 12px/1.4 var(--font-ui)',whiteSpace:'nowrap'}}>{option.label}</button>)}</div>;
}


