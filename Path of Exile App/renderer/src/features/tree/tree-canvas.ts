import type {TreeNode} from './types';
export interface Camera {scale:number;ox:number;oy:number}
const beamAngles=new Map<string,number>();
// Keep the beam palette and pointer response centralized for easy retheming.
export const TREE_BEAM_STYLE={
 colors:['#ffaa40','#ff9e58','#d46bba','#9c40ff','#ffaa40'],
 stops:[0,.27,.58,.82,1],
 glow:'#b45be8',
 influenceDistance:230,
 maxPointerRotation:.32,
 easing:.12,
} as const;
export function nodeRadius(node:TreeNode,scale:number){const start=node.classStartIndex!==undefined||node.isAscendancyStart,size=start?68:node.isKeystone?60:node.isNotable?50:node.isMastery?44:node.isJewelSocket?38:32,min=start?5.5:node.isKeystone?5.1:node.isNotable?4.5:node.isMastery?3.9:node.isJewelSocket?3.3:2.5;return Math.max(min,Math.min(36,size*scale));}
export function fitCamera(canvas:HTMLCanvasElement,nodes:TreeNode[]):Camera {
 const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),w=canvas.clientWidth,h=canvas.clientHeight;
 if(!nodes.length||!w||!h)return {scale:.08,ox:w/2,oy:h/2};
 const scale=Math.min(w/(Math.max(...xs)-Math.min(...xs)+800),h/(Math.max(...ys)-Math.min(...ys)+800));
 return {scale,ox:w/2-(Math.max(...xs)+Math.min(...xs))/2*scale,oy:h/2-(Math.max(...ys)+Math.min(...ys))/2*scale};
}
export function hitNode(list:TreeNode[],x:number,y:number,{scale,ox,oy}:Camera){let closest:TreeNode|undefined,dist=Infinity;for(const node of list){const d=Math.hypot(node.x*scale+ox-x,node.y*scale+oy-y);if(d<=Math.max(7,nodeRadius(node,scale)+4)&&d<dist){closest=node;dist=d;}}return closest;}
type Highlight='all'|'search'|'allocated'|'unallocated'|'notables'|'keystones'|'masteries'|'jewels'|'starts';
export function drawTree(canvas:HTMLCanvasElement,list:TreeNode[],nodes:Map<string,TreeNode>,selected:Set<string>,current:TreeNode|undefined,query:string,{scale,ox,oy}:Camera,highlight:Highlight='all',pointer?:{x:number;y:number}){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const dpr=devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
 const css=getComputedStyle(canvas),color=(name:string,fallback:string)=>css.getPropertyValue(name).trim()||fallback,bg=color('--tree-canvas-bg','#08090a'),nodeFill=color('--tree-node-fill','#161718'),edge=color('--tree-edge','#23252a'),active=color('--tree-active','#e4f222'),label=color('--tree-label','#d0d6e0'),nodeStroke=color('--tree-node-stroke','#68717d'),selectedFill=color('--tree-selected-fill','#aab83d');
 canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
 const ids=new Set(list.map(n=>n.id)),q=query.toLowerCase();
 const matches=(n:TreeNode)=>{switch(highlight){case'search':return !!q&&n.search.includes(q);case'allocated':return selected.has(n.id);case'unallocated':return !selected.has(n.id);case'notables':return !!n.isNotable;case'keystones':return !!n.isKeystone;case'masteries':return !!n.isMastery;case'jewels':return !!n.isJewelSocket;case'starts':return n.classStartIndex!==undefined||!!n.isAscendancyStart;default:return true;}};
 for(const n of list)for(const id of n.links){if(id<n.id||!ids.has(id))continue;const other=nodes.get(id)!;const on=selected.has(id)&&selected.has(n.id),related=matches(n)||matches(other);ctx.globalAlpha=highlight==='all'?1:related?.7:.12;ctx.strokeStyle=on?active:edge;ctx.lineWidth=on?2:1;ctx.beginPath();ctx.moveTo(n.x*scale+ox,n.y*scale+oy);ctx.lineTo(other.x*scale+ox,other.y*scale+oy);ctx.stroke();}ctx.globalAlpha=1;
 for(const node of list){const x=node.x*scale+ox,y=node.y*scale+oy,r=nodeRadius(node,scale),match=matches(node),on=selected.has(node.id);if(x+r<0||x-r>w||y+r<0||y-r>h)continue;ctx.globalAlpha=highlight==='all'||match?1:.16;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=on?selectedFill:nodeFill;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=nodeStroke;ctx.stroke();if(node.classStartIndex!==undefined||node.isAscendancyStart){ctx.globalAlpha=highlight==='all'||match?1:.16;ctx.textAlign='left';ctx.fillStyle=label;ctx.font='12px Segoe UI';ctx.fillText(node.name,x+r+6,y);}if(highlight!=='all'&&match){const base=-Math.PI/2,distance=pointer?Math.hypot(pointer.x-x,pointer.y-y):Infinity,influence=Math.pow(Math.max(0,1-distance/TREE_BEAM_STYLE.influenceDistance),2),pointerAngle=pointer?Math.atan2(pointer.y-y,pointer.x-x):base,direction=Math.atan2(Math.sin(pointerAngle-base),Math.cos(pointerAngle-base)),target=base+direction*TREE_BEAM_STYLE.maxPointerRotation*influence,previous=beamAngles.get(node.id)??base,delta=Math.atan2(Math.sin(target-previous),Math.cos(target-previous)),angle=previous+delta*TREE_BEAM_STYLE.easing;beamAngles.set(node.id,angle);const gradient=ctx.createConicGradient(angle,x,y);TREE_BEAM_STYLE.colors.forEach((beamColor,index)=>gradient.addColorStop(TREE_BEAM_STYLE.stops[index],beamColor));ctx.globalAlpha=1;ctx.beginPath();ctx.arc(x,y,r+1,0,Math.PI*2);ctx.strokeStyle=gradient;ctx.lineWidth=Math.max(1.4,Math.min(2.4,r*.35));ctx.shadowColor=TREE_BEAM_STYLE.glow;ctx.shadowBlur=5+4*influence;ctx.stroke();ctx.shadowBlur=0;}}
 ctx.globalAlpha=1;
}
