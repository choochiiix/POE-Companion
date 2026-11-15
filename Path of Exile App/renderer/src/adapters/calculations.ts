import {useEffect,useState} from 'react';
import {assembleWorkspace,compareWorkspace} from '@legacy/features/calculations/source-adapter.js';
import {validCharacter,validEquipment} from '@legacy/features/character/character-data.js';
import {createGearEngine,gearCalculationOverride,gearStorageKey} from '@legacy/features/character/gear-model.js';
import {fetchJson} from './api';
import {readSave,useBuildRevision,writeSave,buildChanged} from './storage';
import {getCalculationGroups,hasCalculationGroups} from './build-store';
import {getCalculationTreeSelection} from './tree-store';
export const contextKey='poe-companion.calculation.v1';
export interface Override {baseId:string;name:string;lines:string[];rawStats?:Record<string,number>;rarity?:string}
export interface Context {version:1;level:number;groupId:string;gemEndpoint:'first'|'maximum';penalty:number;enemyResistance:number;enemyArmour:number;enemyEvasion:number;enemyAccuracy:number;incomingHit:number;overrides:Record<string,Override>}
export function validContext(input:unknown):Context {
 const value=input as Partial<Context>|null;const result:Context={version:1,level:1,groupId:'',gemEndpoint:'first',penalty:0,enemyResistance:0,enemyArmour:0,enemyEvasion:0,enemyAccuracy:0,incomingHit:100,overrides:{}};
 if(value?.version!==1)return result;
 for(const [key,min,max] of [['level',1,100],['penalty',-60,0],['enemyResistance',-200,90],['enemyArmour',0,1e9],['enemyEvasion',0,1e9],['enemyAccuracy',0,1e9],['incomingHit',0,1e9]] as const){const number=value[key];if(typeof number==='number'&&Number.isFinite(number)&&number>=min&&number<=max&&(key!=='level'||Number.isInteger(number)))result[key]=number;}
 result.groupId=typeof value.groupId==='string'?value.groupId.slice(0,100):'';result.gemEndpoint=value.gemEndpoint==='maximum'?'maximum':'first';
 for(const [slot,item] of Object.entries(value.overrides??{}))if(item&&typeof item.baseId==='string'&&typeof item.name==='string'&&Array.isArray(item.lines)&&item.lines.length<=100)result.overrides[slot]={baseId:item.baseId,name:item.name.slice(0,200),lines:item.lines.filter(text=>typeof text==='string').map(text=>text.slice(0,500)),rawStats:Object.fromEntries(Object.entries(item.rawStats??{}).filter(([,value])=>Number.isFinite(value)))};
 return result;
}
export function saveContext(context:Context){const issue=writeSave(contextKey,validContext(context));buildChanged();return issue;}
export interface Sources {data:any;tree:any;gems:any[];pack:any}
export function loadSources():Promise<Sources>{return Promise.all([fetchJson<any>('/calculation-data.json'),fetchJson<any>('/tree-data/tree-view.json'),fetchJson<any>('/skills-data.json'),fetchJson<any>('/data/repoe-poe1.json')]).then(([data,tree,skills,pack])=>({data,tree,gems:skills.gems,pack}));}
export function calculationInput(sources:Sources,context=readSave(contextKey,validContext)) {
 const character=readSave('poe-companion.character.v1',validCharacter),equipment=readSave('poe-companion.equipment.v1',value=>validEquipment(value,sources.pack.bases)) as Record<string,string>;
 const cls=sources.tree.classes.find((row:any)=>row.name===character.characterClass),asc=cls.ascendancies.find((row:any)=>row.name===character.ascendancy)?.id??'';
 const treeKey=`poe.tree.3_29.${cls.name}.${asc}`;
 const selection=getCalculationTreeSelection(treeKey)??readSave(treeKey,value=>value??{selected:[],masteries:{}});
 const detailed=readSave(gearStorageKey,value=>(value as any)?.version===1?(value as any).items:{}),overrides={...context.overrides};
 const engine=createGearEngine(sources.pack.mods);
 for(const [slot,row]of Object.entries(detailed))if((row as any)?.baseId===equipment[slot])try{overrides[slot]=gearCalculationOverride(engine,sources.pack.bases,row);}catch{/* Invalid saved detail never overwrites valid base. */}
 let groups=getCalculationGroups();if(!hasCalculationGroups())groups=readSave('poe-companion.skills.v1',value=>(value as any)?.version===1&&Array.isArray((value as any).groups)?(value as any).groups:[]);
 return {character,equipment,selection,groups,context,overrides,data:sources.data,tree:sources.tree,gems:sources.gems};
}
export {assembleWorkspace,compareWorkspace};
export function useCalculations(){const revision=useBuildRevision();const [sources,setSources]=useState<Sources>();const [error,setError]=useState('');useEffect(()=>{let alive=true;loadSources().then(value=>{if(alive)setSources(value);}).catch(error=>{if(alive)setError(String(error.message));});return()=>{alive=false;};},[]);let result:ReturnType<typeof assembleWorkspace>|undefined;let input:ReturnType<typeof calculationInput>|undefined;try{if(sources){input=calculationInput(sources);result=assembleWorkspace(input);}}catch(error){if(!error)return {sources,error:'Calculation unavailable',revision};return {sources,error:String((error as Error).message),revision};}return {sources,result,input,error,revision};}
