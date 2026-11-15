// Adapted from Design Bookmark spring-dropdown/dropdown.js and shared/motion.js.
// Source stiffness retained; gentler damping/travel tuned after user review. Four substeps.
const mounted=new WeakSet();let serial=0,dismissActive=null;
let dropdownObserver=null;
export function enhanceDropdowns(root=document){
 const scan=()=>root.querySelectorAll(':is(.character-design-dialog,.ui-dialog) select:not([hidden]),select.ui-field:not([hidden])').forEach(mount);
 if(!dropdownObserver){dropdownObserver=new MutationObserver(()=>enhanceDropdowns());dropdownObserver.observe(document.body,{childList:true,subtree:true});}
 scan();
}
export const enhanceCharacterDropdowns=enhanceDropdowns;
function mount(select){
 if(mounted.has(select)||select.multiple||select.size>1)return;mounted.add(select);
 const label=select.getAttribute('aria-label')||[...(select.labels?.[0]?.childNodes??[])].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim()||'Choose option';
 select.setAttribute('aria-label',label);const captions=[];for(const node of [...(select.labels?.[0]?.childNodes??[])])if(node.nodeType===3&&node.textContent.trim()){const caption=document.createElement('span');caption.className='spring-dropdown-caption';node.before(caption);caption.append(node);captions.push(caption);}
 const wrap=document.createElement('span');wrap.className='spring-dropdown';select.before(wrap);wrap.append(select);
 const value=document.createElement('span');value.className='spring-dropdown-value';value.setAttribute('aria-hidden','true');const oldValue=document.createElement('span'),newValue=document.createElement('span');value.append(oldValue,newValue);wrap.append(value);
 const chevron=document.createElement('span');chevron.className='spring-dropdown-chevron';chevron.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';chevron.setAttribute('aria-hidden','true');wrap.append(chevron);
 const menu=document.createElement('div');menu.className='spring-dropdown-menu';menu.setAttribute('popover','manual');menu.id=`spring-dropdown-${++serial}`;
 const search=document.createElement('input');search.type='search';search.placeholder='Find an option…';search.setAttribute('aria-label',`Filter ${label}`);menu.append(search);
 const list=document.createElement('div');list.className='spring-dropdown-options';list.setAttribute('role','listbox');list.setAttribute('aria-label',label+' options');list.id=menu.id+'-options';menu.append(list);
 const highlight=document.createElement('span');highlight.className='spring-dropdown-highlight';highlight.setAttribute('aria-hidden','true');list.append(highlight);
 wrap.append(menu);select.setAttribute('aria-controls',list.id);select.setAttribute('aria-expanded','false');
 const media=matchMedia('(prefers-reduced-motion: reduce)'),reduced=()=>media.matches||document.documentElement.dataset.motion==='reduced';
 const S=(x,k,c)=>({x,t:x,v:0,k,c});
 const Y=S(0,260,30),H=S(0,300,32),O=S(0,400,34),C=S(0,300,30),TS=S(1,500,38),R=S(1,340,34),HT=S(4,620,44),HB=S(36,620,44);
 const springs=[Y,H,O,C,TS,R,HT,HB];let rows=[],opened=false,frame=0,last=0,clock=0,hover=-1,fullHeight=0,closing=false,typeText='',typeAt=0,selectedText='',selectedImage='',selectionTimer=0;
 function picture(parent,source){if(!/^\/assets\/(classes|ascendancies)\/[a-z]+\.png$/.test(source??''))return;const img=document.createElement('img');img.src=source;img.alt='';img.className='spring-dropdown-portrait';img.onerror=()=>img.hidden=true;const frame=document.createElement('span');frame.className='spring-dropdown-icon-frame';frame.setAttribute('aria-hidden','true');frame.append(img);parent.append(frame);}
 function slot(parent,text,image){parent.replaceChildren();picture(parent,image);const caption=document.createElement('span');caption.textContent=text;parent.append(caption);}
 function sync(){const option=select.selectedOptions[0],text=option?.textContent??'Choose an option',image=option?.dataset.image??'';if(text!==selectedText||image!==selectedImage){slot(oldValue,selectedText,selectedImage);slot(newValue,text,image);R.x=selectedText?0:1;R.t=1;selectedText=text;selectedImage=image;start();}if(opened)renderRows();}
 function position(){const b=wrap.getBoundingClientRect();menu.style.width=Math.min(Math.max(b.width,220),innerWidth-24)+'px';menu.style.left=Math.max(12,Math.min(b.left,innerWidth-12-parseFloat(menu.style.width)))+'px';const below=innerHeight-b.bottom-12,above=b.top-12;const available=Math.max(80,Math.min(320,Math.max(below,above)));fullHeight=Math.min(available,(search.hidden?0:44)+Math.max(1,Math.min(200,rows.length))*32+12);menu.style.top=(below>=fullHeight||below>=above?b.bottom+6:Math.max(8,b.top-fullHeight-6))+'px';if(opened){H.t=fullHeight;Y.t=-Math.min(32,(fullHeight+8)/4,Math.max(0,b.top-12));}}
 function draw(){captions.forEach(c=>c.style.opacity=1-Math.max(0,Math.min(1,O.x)));menu.style.height=Math.max(0,H.x)+'px';menu.style.opacity=Math.max(0,Math.min(1,O.x));menu.style.transform=`translateY(${Y.x}px) scaleX(${.96+.04*Math.min(1.02,Math.max(0,H.x/(fullHeight||1)))})`;chevron.style.transform=`translateY(${Y.x}px) rotate(${C.x*180}deg)`;select.style.transform=`translateY(${Y.x}px) scale(${TS.x})`;value.style.transform=`translateY(${Y.x}px)`;newValue.style.transform=`translateY(${(1-R.x)*12}px)`;newValue.style.opacity=Math.max(0,Math.min(1,R.x));oldValue.style.transform=`translateY(${-R.x*12}px)`;oldValue.style.opacity=Math.max(0,Math.min(1,1-R.x));highlight.style.top=HT.x+'px';highlight.style.height=Math.max(0,HB.x-HT.x)+'px';highlight.hidden=hover<0;
 rows.forEach(row=>{row.tick.style.strokeDashoffset=22*(1-Math.max(0,Math.min(1,row.check.x)));row.el.style.opacity=Math.min(1,Math.max(0,row.s.x));row.el.style.transform=`translateY(${(row.s.x-1)*6}px)`;});
 }
 function animate(now){frame=0;const dt=Math.min((now-last)/1000,1/30)/4;last=now;clock+=dt*4;
 const all=[...springs,...rows.flatMap(r=>[r.s,r.check])];if(reduced()){all.forEach(s=>{s.x=s.t;s.v=0;});}else for(let i=0;i<4;i++)for(const s of all){s.v+=(-s.k*(s.x-s.t)-s.c*s.v)*dt;s.x+=s.v*dt;}
 rows.forEach((r,i)=>{if(opened&&clock>=.05+Math.min(i,9)*.045)r.s.t=1;});draw();
 if(!reduced()&&(all.some(s=>Math.abs(s.x-s.t)>.01||Math.abs(s.v)>.01)||(opened&&clock<.5)))frame=requestAnimationFrame(animate);
 else if(closing){menu.hidePopover();wrap.style.zIndex='';closing=false;}
 }
 function start(){if(!frame){last=performance.now();frame=requestAnimationFrame(animate);}}
 function hoverRow(i,snap=false){if(!rows.length)return;i=Math.max(0,Math.min(rows.length-1,i));const row=rows[i],down=i>hover;HT.k=down?200:620;HT.c=down?28:44;HB.k=down?620:200;HB.c=down?44:28;HT.t=row.el.offsetTop;HB.t=HT.t+32;if(snap){HT.x=HT.t;HB.x=HB.t;}hover=i;select.setAttribute('aria-activedescendant',row.el.id);search.setAttribute('aria-activedescendant',row.el.id);row.el.scrollIntoView({block:'nearest'});start();}
 function choose(row){if(row.option.disabled)return;select.value=row.option.value;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));sync();for(const r of rows)if(r.option.selected)r.check.x=0;R.x=0;R.t=1;TS.x=.985;clearTimeout(selectionTimer);selectionTimer=setTimeout(close,reduced()?0:240);select.focus();start();}
 function renderRows(){list.querySelector('.spring-dropdown-empty')?.remove();rows.forEach(r=>r.el.remove());rows=[];const query=search.value.toLowerCase();const options=[...select.options].filter(o=>!o.hidden&&o.textContent.toLowerCase().includes(query));search.hidden=select.options.length<12;
 for(const option of options.slice(0,200)){const el=document.createElement('div');el.className='spring-dropdown-option';el.id=`${menu.id}-${rows.length}`;el.setAttribute('role','option');el.setAttribute('aria-selected',String(option.selected));el.setAttribute('aria-disabled',String(option.disabled));picture(el,option.dataset.image);const text=document.createElement('span');text.textContent=option.textContent;el.append(text);const tick=document.createElementNS('http://www.w3.org/2000/svg','svg');tick.setAttribute('viewBox','0 0 24 24');tick.setAttribute('aria-hidden','true');const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M5 12.5l4.5 4.5L19 7.5');tick.append(path);el.append(tick);const row={el,option,tick:path,s:S(1,300,32),check:S(option.selected?1:0,260,26)};el.addEventListener('pointermove',()=>hoverRow(rows.indexOf(row)));el.addEventListener('click',()=>choose(row));list.append(el);rows.push(row);}
 if(!rows.length){const empty=document.createElement('div');empty.className='spring-dropdown-empty';empty.textContent='No matching options';list.append(empty);}search.placeholder=select.options.length>200?'Search '+select.options.length+' options…':'Find an option…';hover=-1;position();if(rows.length)hoverRow(Math.max(0,rows.findIndex(r=>r.option.selected)),true);if(!rows.length){select.removeAttribute('aria-activedescendant');search.removeAttribute('aria-activedescendant');}start();}
 function forceClose(){clearTimeout(selectionTimer);if(frame)cancelAnimationFrame(frame);frame=0;opened=closing=false;for(const s of springs){s.x=s.t;s.v=0;}for(const s of [Y,H,O,C]){s.x=s.t=s.v=0;}menu.hidePopover();menu.inert=true;wrap.style.zIndex='';select.setAttribute('aria-expanded','false');select.removeAttribute('aria-activedescendant');search.removeAttribute('aria-activedescendant');draw();if(dismissActive===forceClose)dismissActive=null;}
 function open(){if(select.disabled||opened)return;dismissActive?.();dismissActive=forceClose;opened=true;closing=false;wrap.style.zIndex='2';menu.inert=false;clock=0;search.value='';menu.showPopover();renderRows();rows.forEach(r=>{r.s.x=0;r.s.t=reduced()?1:0;});H.t=fullHeight;O.t=C.t=1;TS.x=.988;select.setAttribute('aria-expanded','true');start();}
 function close(){clearTimeout(selectionTimer);if(!opened)return;opened=false;closing=true;menu.inert=true;Y.t=H.t=O.t=C.t=0;select.setAttribute('aria-expanded','false');select.removeAttribute('aria-activedescendant');search.removeAttribute('aria-activedescendant');start();}
 select.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();select.focus();opened?close():open();});
 const keys=e=>{if(e.key==='Escape'&&opened){e.preventDefault();e.stopPropagation();close();select.focus();}else if(e.key==='Tab'){close();}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(!opened)open();else hoverRow(e.key==='Home'?0:e.key==='End'?rows.length-1:hover+(e.key==='ArrowDown'?1:-1));}else if((e.key==='Enter'||e.key===' ')&&e.target!==search){e.preventDefault();if(!opened)open();else if(rows[hover])choose(rows[hover]);}else if(e.key==='Enter'&&rows[hover]){e.preventDefault();choose(rows[hover]);}else if(e.target===select&&e.key.length===1&&!e.ctrlKey&&!e.altKey){e.preventDefault();if(!opened)open();const now=performance.now();typeText=now-typeAt>700?e.key:typeText+e.key;typeAt=now;const index=rows.findIndex(r=>r.option.textContent.toLowerCase().startsWith(typeText.toLowerCase()));if(index>=0)hoverRow(index);}};
 select.addEventListener('keydown',keys);search.addEventListener('keydown',keys);search.addEventListener('input',renderRows);search.addEventListener('pointerdown',e=>e.stopPropagation());
 menu.addEventListener('pointerdown',e=>e.preventDefault());search.addEventListener('click',()=>search.focus());
 document.addEventListener('pointerdown',e=>{if(opened&&!wrap.contains(e.target))close();});select.closest('dialog')?.addEventListener('close',()=>{close();menu.hidePopover();});
 select.addEventListener('spring-select:sync',sync);select.addEventListener('change',sync);new MutationObserver(sync).observe(select,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected','label']});
 window.addEventListener('resize',()=>{if(opened){position();start();}});document.addEventListener('scroll',event=>{if(opened&&!menu.contains(event.target)){if(!select.getClientRects().length)forceClose();else{position();start();}}},true);document.addEventListener('workspace:change',forceClose);media.addEventListener('change',start);
 new MutationObserver(()=>{if(opened)start();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion']});sync();
}

// Inline equipment disclosures use the same softened opening spring as selects.
export function mountSpringDisclosure(details){
 const summary=details.querySelector('summary'),card=details.querySelector('article');
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 let target=details.open,frame=0,last=0,x=0,v=0,height=0;
 const reduce=()=>media.matches||document.documentElement.dataset.motion==='reduced';
 const finish=()=>{details.open=target;card.style.height='';card.style.opacity='';card.style.transform='';card.classList.remove('is-springing');};
 function tick(now){frame=0;if(!details.isConnected)return;if(reduce()){finish();return;}
  const dt=Math.min((now-last)/1000,1/30)/4;last=now;
  for(let i=0;i<4;i++){v+=(-300*(x-(target?height:0))-32*v)*dt;x+=v*dt;}
  card.style.height=Math.max(0,x)+'px';card.style.opacity=Math.max(0,Math.min(1,x/(height||1)));card.style.transform=`translateY(${-4*(1-Math.min(1,x/(height||1)))}px)`;
  if(Math.abs(x-(target?height:0))>.1||Math.abs(v)>.1)frame=requestAnimationFrame(tick);else finish();
 }
 summary.addEventListener('click',event=>{event.preventDefault();target=!target;summary.setAttribute('aria-expanded',String(target));
  if(!frame)x=details.open?card.getBoundingClientRect().height:0;
  details.open=true;card.style.height='auto';height=card.getBoundingClientRect().height;
  if(reduce()){finish();return;}
  card.classList.add('is-springing');card.style.height=x+'px';if(!frame){last=performance.now();frame=requestAnimationFrame(tick);}
 });
 summary.setAttribute('aria-expanded',String(details.open));
}

// A small, spring-shaped bubble reveal; the modal retains native focus trapping.
export function mountBubbleDialog(dialog,trigger){
 let animation=null,closing=false;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.dataset.motion==='reduced';
 function open(){if(dialog.open)return;closing=false;dialog.showModal();if(reduced())return;
  const d=dialog.getBoundingClientRect(),b=trigger.getBoundingClientRect();dialog.style.transformOrigin=`${Math.max(0,Math.min(d.width,b.left+b.width/2-d.left))}px ${Math.max(0,Math.min(d.height,b.top+b.height/2-d.top))}px`;
  let x=0,v=0;const frames=[{transform:'translateY(12px) scale(.94)',opacity:0,offset:0}];
  for(let f=1;f<=30;f++){for(let i=0;i<4;i++){v+=(-300*(x-1)-32*v)/240;x+=v/240;}frames.push({transform:f===30?'none':`translateY(${12*(1-x)}px) scale(${.94+.06*x})`,opacity:Math.min(1,x*2),offset:f/30});}
  animation=dialog.animate(frames,{duration:400,easing:'linear'});
 }
 function close(){if(!dialog.open||closing)return;closing=true;animation?.cancel();if(reduced()){dialog.close();closing=false;return;}
  animation=dialog.animate([{transform:'none',opacity:1},{transform:'translateY(6px) scale(.97)',opacity:0}],{duration:160,easing:'ease-out'});
  animation.finished.then(()=>{dialog.close();closing=false;},()=>{closing=false;});
 }
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 dialog.addEventListener('close',()=>{animation?.cancel();closing=false;trigger.focus();});
 return {open,close};
}
