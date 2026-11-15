import {useEffect,useState} from 'react';
const sessionSaves=new Map<string,unknown>();
window.addEventListener('storage',event=>{if(event.key)sessionSaves.delete(event.key);else sessionSaves.clear();});
export function readSave<T>(key:string,validate:(value:unknown)=>T):T { if(sessionSaves.has(key))return validate(structuredClone(sessionSaves.get(key)));try{return validate(JSON.parse(localStorage.getItem(key)||'null'));}catch{return validate(null);} }
export function writeSave(key:string,value:unknown):string {sessionSaves.set(key,structuredClone(value));try{localStorage.setItem(key,JSON.stringify(value));return '';}catch{return 'Storage unavailable. Changes last for this session.';}}
export function useBuildRevision(){const [revision,setRevision]=useState(0);useEffect(()=>{const update=()=>setRevision(value=>value+1);document.addEventListener('build:change',update);window.addEventListener('storage',update);return()=>{document.removeEventListener('build:change',update);window.removeEventListener('storage',update);};},[]);return revision;}
export function buildChanged(){document.dispatchEvent(new CustomEvent('build:change'));}
