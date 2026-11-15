import {parseMod} from './catalog-model.js';
// Fixture contract only. Real RePoE formats await samples.
export function adaptRepoeFixture(records,diagnostics){return records.map(r=>({...r,explicit:[],implicit:r.implicit.map(raw=>{if(typeof raw==='string'&&raw.trim())return parseMod(raw);diagnostics.push({item:r.name,raw});return {text:String(raw),key:String(raw),ranges:[],unparsed:true};})}));}
