// Plan Switch edge springs, sampled into a compositor animation.
// No per-frame JS: delayed/throttled requestAnimationFrame cannot strand the thumb.
export function mountPlanSwitch(container){
 const buttons=[...container.querySelectorAll('button')];
 const highlight=document.createElement('span');highlight.className='plan-switch-highlight';highlight.setAttribute('aria-hidden','true');container.prepend(highlight);container.classList.add('plan-switch');
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 const reduced=()=>media.matches||document.documentElement.dataset.motion==='reduced';
 let initialized=false,animation=null,targetLeft=0,targetRight=0;
 const transform=(l,r)=>`translateX(${l}px) scaleX(${Math.max(0,r-l)/100})`;
 function sync(){
  const active=buttons.find(b=>b.getAttribute('aria-pressed')==='true')??buttons[0];if(!active||!active.offsetWidth)return;
  const parent=container.getBoundingClientRect(),bounds=active.getBoundingClientRect();
  const nextLeft=bounds.left-parent.left-container.clientLeft,nextRight=nextLeft+bounds.width;
  if(initialized&&Math.abs(nextLeft-targetLeft)<.05&&Math.abs(nextRight-targetRight)<.05){if(reduced()){animation?.cancel();animation=null;}return;}
  const current=highlight.getBoundingClientRect();
  const fromLeft=initialized?current.left-parent.left-container.clientLeft:nextLeft,fromRight=initialized?current.right-parent.left-container.clientLeft:nextRight;
  const movingRight=nextLeft>targetLeft;
  animation?.cancel();animation=null;targetLeft=nextLeft;targetRight=nextRight;
  // The final resting state is always present, even if an animation is canceled.
  highlight.style.transform=transform(nextLeft,nextRight);
  if(initialized&&!reduced()&&typeof highlight.animate==='function'){
   const read=(name,fallback)=>{const values=getComputedStyle(container).getPropertyValue(name).trim().split(/\s+/).map(Number);return values.length===2&&values.every(n=>Number.isFinite(n)&&n>0)?values:fallback;};
   const lead=read('--spring-lead',[620,36]),trail=read('--spring-trail',[190,19]);
   const edge=(x,t,[k,c])=>({x,t,k,c,v:0});const left=edge(fromLeft,nextLeft,movingRight?trail:lead),right=edge(fromRight,nextRight,movingRight?lead:trail);
   const keyframes=[{transform:transform(left.x,right.x),offset:0}];
   const duration=650,frames=39,dt=(duration/1000)/frames/4;
   for(let f=1;f<=frames;f++){for(let sub=0;sub<4;sub++)for(const s of [left,right]){s.v+=(-s.k*(s.x-s.t)-s.c*s.v)*dt;s.x+=s.v*dt;}keyframes.push({transform:f===frames?transform(nextLeft,nextRight):transform(left.x,right.x),offset:f/frames});}
   animation=highlight.animate(keyframes,{duration,easing:'linear'});
   const running=animation;running.finished.then(()=>{if(animation===running){animation=null;running.cancel();}},()=>{});
  }
  initialized=true;
 }
 new MutationObserver(sync).observe(container,{subtree:true,attributes:true,attributeFilter:['aria-pressed']});
 new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});
 new ResizeObserver(sync).observe(container);media.addEventListener('change',sync);
 container.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=buttons.indexOf(document.activeElement);const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next].click();buttons[next].focus();});
 sync();
}
