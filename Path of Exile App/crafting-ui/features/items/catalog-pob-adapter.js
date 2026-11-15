import {parseMod} from './catalog-model.js';
// Fixture contract only. Real PoB formats await samples.
export function adaptPobFixture(records,diagnostics){return records.map(r=>({...r,...Object.fromEntries(['implicit','explicit'].map(k=>[k,r[k].map(raw=>{if(typeof raw==='string'&&raw.trim()&&!/[{}]/.test(raw))return parseMod(raw);diagnostics.push({item:r.name,raw});return {text:String(raw),key:String(raw),ranges:[],unparsed:true};})]))}));}
