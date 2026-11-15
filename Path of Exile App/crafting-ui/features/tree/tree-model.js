export function indexTree(data){
 const nodes=new Map();const angles16=[0,30,45,60,90,120,135,150,180,210,225,240,270,300,315,330];const angles40=[0,10,20,30,40,45,50,60,70,80,90,100,110,120,130,135,140,150,160,170,180,190,200,210,220,225,230,240,250,260,270,280,290,300,310,315,320,330,340,350];
 for(const [id,n] of Object.entries(data.nodes)){if(id==='root')continue;const g=data.groups[n.group];let x,y;if(g){const count=data.constants.skillsPerOrbit[n.orbit],degrees=(count===16?angles16[n.orbitIndex]:count===40?angles40[n.orbitIndex]:360*n.orbitIndex/count);const a=degrees*Math.PI/180,r=data.constants.orbitRadii[n.orbit];x=g.x+Math.sin(a)*r;y=g.y-Math.cos(a)*r;}nodes.set(id,{...n,id,x,y,links:new Set(),search:[id,n.name,...n.stats??[],...(n.masteryEffects??[]).flatMap(e=>e.stats)].join(' ').toLowerCase()});}
 for(const n of nodes.values())for(const id of [...n.out??[],...n.in??[]]){const other=nodes.get(String(id));if(other){n.links.add(other.id);other.links.add(n.id);}}
 return nodes;
}
export function shortestPath(nodes, roots, target, allowed){const queue=[...roots],prev=new Map(queue.map(id=>[id,null]));for(let i=0;i<queue.length;i++){const id=queue[i];if(id===target){const path=[];for(let at=id;at!==null;at=prev.get(at))path.unshift(at);return path;}for(const next of nodes.get(id)?.links??[]){const n=nodes.get(next);if(!prev.has(next)&&allowed(n)){prev.set(next,id);queue.push(next);}}}return null;}
export function reachable(nodes,roots,selected){const seen=new Set(roots),q=[...roots];for(let i=0;i<q.length;i++)for(const id of nodes.get(q[i])?.links??[]){if(selected.has(id)&&!seen.has(id)&&!nodes.get(id).isMastery){seen.add(id);q.push(id);}}return seen;}

// Visual categories are presentation hints, not a stat-calculation engine.
export function nodeVisual(n) {
  if (n.classStartIndex !== undefined || n.isAscendancyStart) return {label:'Start',symbol:'S',color:'#E6E1D9',shape:'hex'};
  if (n.isKeystone) return {label:'Keystone',symbol:'K',color:'#E6B450',shape:'diamond'};
  if (n.isMastery) return {label:'Mastery',symbol:'M',color:'#59C2FF',shape:'hex'};
  if (n.isJewelSocket) return {label:'Jewel socket',symbol:'O',color:'#E6B450',shape:'square'};
  if (n.isNotable) return {label:'Notable',symbol:'N',color:'#E6B450',shape:'hex'};
  const name=(n.name||'').toLowerCase(),text=(n.stats||[]).join(' ').toLowerCase();
  if (/^(strength|dexterity|intelligence)( and (strength|dexterity|intelligence))+$/.test(name)) return {label:'Hybrid attribute',symbol:'+',color:'#E6E1D9',shape:'circle'};
  if (name==='strength') return {label:'Strength',symbol:'S',color:'#FFB454',shape:'circle'};
  if (name==='dexterity') return {label:'Dexterity',symbol:'D',color:'#AAD94C',shape:'circle'};
  if (name==='intelligence') return {label:'Intelligence',symbol:'I',color:'#59C2FF',shape:'circle'};
  if (/life|regenerat.*life/.test(name)) return {label:'Life',symbol:'L',color:'#FFB454',shape:'circle'};
  if (/mana/.test(name)) return {label:'Mana',symbol:'M',color:'#59C2FF',shape:'circle'};
  if (/armour|evasion|energy shield|block|suppression/.test(name)) return {label:'Defence',symbol:'B',color:'#AAD94C',shape:'square'};
  if (/damage|attack|cast|critical|speed/.test(name)) return {label:'Offence / speed',symbol:'A',color:'#FFB454',shape:'circle'};
  return {label:'Other passive',symbol:'+',color:'#B3B1AD',shape:'circle'};
}
