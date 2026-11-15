import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
function parseLua(text){
 let i=0;
 const ws=()=>{while(/\s/.test(text[i]??'')&&i<text.length)i++;};
 function value(){ws();const c=text[i];if(c==='"'){let start=i++;while(i<text.length){if(text[i++]==='\\'){i++;continue;}if(text[i-1]==='"')return JSON.parse(text.slice(start,i));}throw Error('Unterminated string');}
 if(c==='{'){i++;let obj={},list=[],keyed=false;ws();while(text[i]!=='}'){if(text[i]==='['){keyed=true;i++;let k=value();ws();if(text[i++]!==']')throw Error('key');ws();if(text[i++]!=='=')throw Error('equals');obj[k]=value();}else list.push(value());ws();if(text[i]===','){i++;ws();}else if(text[i]!=='}')throw Error('separator '+i);}i++;if(keyed){list.forEach((v,k)=>obj[k+1]=v);return obj;}return list;}
 const m=text.slice(i).match(/^(true|false|nil|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/);if(!m)throw Error('Unsupported Lua at '+i+': '+text.slice(i,i+60));i+=m[0].length;return m[0]==='true'?true:m[0]==='false'?false:m[0]==='nil'?null:Number(m[0]);}
 ws();if(text.slice(i,i+6)!=='return')throw Error('Expected data-only return');i+=6;const result=value();ws();if(i!==text.length)throw Error('Trailing code');return result;
}
for(const name of ['tree','sprites']){const raw=await readFile(`data-sources/pob-tree-3_29/${name}.lua`,'utf8');const data=parseLua(raw);await writeFile(`data-sources/pob-tree-3_29/${name}.json`,JSON.stringify(data));console.log(name,Object.keys(data));if(name==='tree'){const lean=structuredClone(data);for(const n of Object.values(lean.nodes))for(const field of ['icon','inactiveIcon','activeIcon','activeEffectImage'])delete n[field];await writeFile('data-sources/pob-tree-3_29/tree-view.json',JSON.stringify(lean));console.log('nodes',Object.keys(data.nodes).length,JSON.stringify(Object.values(data.nodes).slice(0,4)));}else console.log(Object.keys(data.sprites));}
