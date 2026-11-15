/** Runtime adapters stay in their existing modules; engine sources have their own typecheck. */
declare module '@legacy/features/calculations/source-adapter.js' {
 export function assembleWorkspace(input:any):any;
 export function compareWorkspace(input:any,slot:string,candidate:any):any;
 export function midpointText(text:string):string;
}
declare module '@legacy/features/character/gear-model.js' {
 export const gearStorageKey:string;
 export function createGearEngine(mods:any[]):any;
 export function validateGear(engine:any,bases:any[],row:any):any;
 export function eligibleAffixes(engine:any,bases:any[],row:any):any[];
 export function modifierLabel(engine:any,row:any):string;
 export function gearCalculationOverride(engine:any,bases:any[],row:any):any;
 export function gearPresentation(engine:any,base:any,row:any,source:any):any;
}
