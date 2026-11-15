export interface TreeNode {
 id:string;name:string;x:number;y:number;group:string;links:Set<string>;search:string;
 classStartIndex?:number;ascendancyName?:string;isAscendancyStart?:boolean;isNotable?:boolean;
 isMastery?:boolean;isKeystone?:boolean;isJewelSocket?:boolean;isMultipleChoiceOption?:boolean;
 stats?:string[];reminderText?:string[];masteryEffects?:{effect:number;stats:string[]}[];
}
export interface TreeData {
 nodes:Record<string,unknown>;groups:Record<string,{isProxy?:boolean}>;
 constants:unknown;classes:{name:string;ascendancies:{id:string;name:string}[]}[];
 alternate_ascendancies?:{id:string;name:string}[];
}
export interface TreeSnapshot {selected:string[];masteries:Record<string,string>}
