import {nodeVisual} from '@legacy/features/tree/tree-model.js';
import type {TreeNode} from './types';
export interface Camera {scale:number;ox:number;oy:number}
export function nodeRadius(node:TreeNode,scale:number){return Math.max(node.isNotable||node.isMastery||node.isKeystone?4:2.5,Math.min(42,(node.isKeystone?75:node.isNotable||node.isMastery?55:35)*scale));}
export function fitCamera(canvas:HTMLCanvasElement,nodes:TreeNode[]):Camera {
 const xs=nodes.map(n=>n.x),ys=nodes.map(n=>n.y),w=canvas.clientWidth,h=canvas.clientHeight;
 if(!nodes.length||!w||!h)return {scale:.08,ox:w/2,oy:h/2};
 const scale=Math.min(w/(Math.max(...xs)-Math.min(...xs)+800),h/(Math.max(...ys)-Math.min(...ys)+800));
 return {scale,ox:w/2-(Math.max(...xs)+Math.min(...xs))/2*scale,oy:h/2-(Math.max(...ys)+Math.min(...ys))/2*scale};
}
export function hitNode(list:TreeNode[],x:number,y:number,{scale,ox,oy}:Camera){let closest:TreeNode|undefined,dist=Infinity;for(const node of list){const d=Math.hypot(node.x*scale+ox-x,node.y*scale+oy-y);if(d<=Math.max(7,nodeRadius(node,scale)+4)&&d<dist){closest=node;dist=d;}}return closest;}
export function drawTree(canvas:HTMLCanvasElement,list:TreeNode[],nodes:Map<string,TreeNode>,selected:Set<string>,current:TreeNode|undefined,query:string,{scale,ox,oy}:Camera){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const dpr=devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
 canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#0A0E14';ctx.fillRect(0,0,w,h);
 const ids=new Set(list.map(n=>n.id)),q=query.toLowerCase();
 for(const n of list)for(const id of n.links){if(id<n.id||!ids.has(id))continue;const other=nodes.get(id)!;const on=selected.has(id)&&selected.has(n.id);ctx.strokeStyle=on?'#FFB454':'#6C7680';ctx.lineWidth=on?2:1;ctx.beginPath();ctx.moveTo(n.x*scale+ox,n.y*scale+oy);ctx.lineTo(other.x*scale+ox,other.y*scale+oy);ctx.stroke();}
 for(const node of list){const visual=nodeVisual(node),x=node.x*scale+ox,y=node.y*scale+oy,r=nodeRadius(node,scale);if(x+r<0||x-r>w||y+r<0||y-r>h)continue;ctx.beginPath();if(visual.shape==='circle')ctx.arc(x,y,r,0,Math.PI*2);else{const sides=visual.shape==='hex'?6:4,offset=visual.shape==='square'?Math.PI/4:-Math.PI/2;for(let i=0;i<sides;i++){const a=offset+i*2*Math.PI/sides,xx=x+Math.cos(a)*r,yy=y+Math.sin(a)*r;if(i)ctx.lineTo(xx,yy);else ctx.moveTo(xx,yy);}ctx.closePath();}const on=selected.has(node.id);ctx.fillStyle=on?visual.color:'#151B22';ctx.fill();ctx.lineWidth=on?2:1;ctx.strokeStyle=visual.color;ctx.stroke();if(r>=7){ctx.fillStyle=on?'#0A0E14':visual.color;ctx.font=`600 ${Math.max(9,Math.min(17,r))}px Segoe UI`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(visual.symbol,x,y);}if(on||current===node||(q&&node.search.includes(q))){ctx.beginPath();ctx.arc(x,y,r+3,0,Math.PI*2);ctx.strokeStyle=current===node?'#E6E1D9':on?'#FFB454':'#AAD94C';ctx.lineWidth=current===node?2:1;ctx.stroke();}if(node.classStartIndex!==undefined||node.isAscendancyStart){ctx.textAlign='left';ctx.fillStyle='#E6E1D9';ctx.font='12px Segoe UI';ctx.fillText(node.name,x+r+6,y);}}
}
