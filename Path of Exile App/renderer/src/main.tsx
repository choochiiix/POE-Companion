import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import './features/character/aurora-palette.generated.css';
import './styles/workspace.css';
import './styles/icons.css';
createRoot(document.getElementById('root')!).render(<App/>);
