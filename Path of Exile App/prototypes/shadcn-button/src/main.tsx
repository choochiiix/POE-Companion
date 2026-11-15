import * as React from 'react';
import {createRoot} from 'react-dom/client';
import {Button} from './button';
import styles from './style.css?inline';
const host=document.querySelector('#proof')!;
const shadow=host.attachShadow({mode:'open'});
const sheet=document.createElement('style');sheet.textContent=styles;
const mount=document.createElement('div');shadow.append(sheet,mount);
function Proof(){const [count,setCount]=React.useState(0);return <><div className="actions"><Button variant="outline" onClick={()=>setCount(n=>n+1)}>Secondary action</Button><Button variant="outline" disabled>Unavailable</Button></div><small className="status" role="status">Activated {count} times</small></>;}
createRoot(mount).render(<Proof/>);
let count=0;document.querySelector('#legacy')!.addEventListener('click',()=>{document.querySelector('#legacy-status')!.textContent=`Activated ${++count} times`;});
