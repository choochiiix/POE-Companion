import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {PlanSwitch} from '../src/components/ui/plan-switch';
const options=[{value:'overview',label:'Character overview'},{value:'comparison',label:'Equipment comparison'}];
function Test(){const [value,setValue]=useState('overview'),[mounted,setMounted]=useState(true);return <><button onClick={()=>setMounted(!mounted)}>Toggle mount</button>{mounted&&<PlanSwitch value={value} onValueChange={setValue} options={options}/>}</>;}
createRoot(document.getElementById('root')!).render(<Test/>);
