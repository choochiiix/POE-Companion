import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import './library.css';
export function LibraryLayout({categories,children,inspector,title,tools}:{categories:ReactNode;children:ReactNode;inspector:ReactNode;title:string;tools?:ReactNode}) {
 const [visible,setVisible]=useState(true);const show=useRef<HTMLButtonElement>(null),hide=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const open=(event:Event)=>{if((event as CustomEvent).detail===title){setVisible(true);requestAnimationFrame(()=>hide.current?.focus());}};document.addEventListener('inspector:open',open);return()=>document.removeEventListener('inspector:open',open);},[title]);
 return <>{!visible&&<Button ref={show} variant="outline" size="sm" onClick={()=>{setVisible(true);requestAnimationFrame(()=>hide.current?.focus());}}>Show inspector</Button>}<div className={`library-workspace${visible?'':' inspector-hidden'}`}><nav className="library-categories" aria-label={`${title} categories`}>{categories}</nav><div className="library-results">{children}</div>{visible&&<aside className="library-inspector" aria-label={title}><h2>{title}</h2><div className="inspector-tools">{tools}<Button ref={hide} variant="outline" size="sm" onClick={()=>{setVisible(false);requestAnimationFrame(()=>show.current?.focus());}}>Hide inspector</Button></div>{inspector}</aside>}</div></>;
}
export function revealInspector(title:string){document.dispatchEvent(new CustomEvent('inspector:open',{detail:title}));}
