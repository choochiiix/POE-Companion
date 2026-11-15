export interface TreeSelection {selected:(string|number)[];masteries:Record<string,string>}
const trees=new Map<string,TreeSelection>();
export function getCalculationTreeSelection(key:string){return trees.get(key)??null;}
export function setCalculationTreeSelection(key:string,selection:TreeSelection){trees.set(key,structuredClone(selection));document.dispatchEvent(new CustomEvent('build:change'));}
