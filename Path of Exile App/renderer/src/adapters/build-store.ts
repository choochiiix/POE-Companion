import type { SkillGroup } from '@/features/skills/types';
let groups: SkillGroup[] = [];
let initialized=false;
export function hasCalculationGroups():boolean{return initialized;}
export function getCalculationGroups(): SkillGroup[] { return groups; }
export function setCalculationGroups(next: SkillGroup[]): void { initialized=true;groups = next.map(group => ({...group,supportIds:[...group.supportIds]})); document.dispatchEvent(new CustomEvent('build:change')); }
