import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CompendiumIcon, SkillTreeIcon, CraftingIcon, ItemLibraryIcon, SettingsIcon, SkillsIcon, TheorycraftingIcon, CharacterIcon, SidebarCollapseIcon, SidebarExpandIcon } from '@/components/ui/icons';
import { readAurora, auroraStorageKey, type AuroraChoice } from '@/adapters/aurora';
import { applyAppearance } from '@/adapters/appearance';
import CharacterPage from '@/features/character/CharacterPage';
import { LiquidGlassLayer } from '@/components/ui/LiquidGlassLayer';
import auroraEmerald from '@/features/character/aurora-emerald.png';
import auroraViolet from '@/features/character/aurora-violet.png';
import auroraRoseGold from '@/features/character/aurora-rosegold.png';
import SkillsPage from '@/features/skills/SkillsPage';
import CompendiumPage from '@/features/compendium/CompendiumPage';
import SettingsPage from '@/features/settings/SettingsPage';
import CraftingPage from '@/features/crafting/CraftingPage';
import ItemsPage from '@/features/items/ItemsPage';
import TreePage from '@/features/tree/TreePage';
import TheorycraftingPage from '@/features/theorycrafting/TheorycraftingPage';
export const routes = [ ['character','Character',CharacterIcon],['crafting','Crafting',CraftingIcon],['tree','Skill tree',SkillTreeIcon],['skills','Skills',SkillsIcon],['theorycrafting','Theorycrafting',TheorycraftingIcon],['items','Item library',ItemLibraryIcon],['compendium','Compendium',CompendiumIcon],['settings','Settings',SettingsIcon] ] as const;
export type Route = typeof routes[number][0];
const readRoute = (): Route => {const requested=location.hash.slice(1)||new URLSearchParams(location.search).get('screen');return routes.find(([id]) => id === (requested==='catalog'?'items':requested))?.[0] || 'character';};
const auroraArt={emerald:auroraEmerald,violet:auroraViolet,rosegold:auroraRoseGold} as const;
class FeatureBoundary extends Component<{children:ReactNode}, {error:string}> {
  state = {error:''};
  static getDerivedStateFromError(error:Error) { return {error:error.message}; }
  componentDidCatch(error:Error, info:ErrorInfo) { console.error(error,info); }
  render() { return this.state.error ? <Panel title="This view could not load"><p role="alert">{this.state.error}</p><Button onClick={()=>this.setState({error:''})}>Try again</Button></Panel> : this.props.children; }
}
export function App() {
 const [route,setRoute] = useState<Route>(()=>readRoute()==='settings'?'character':readRoute()),[settingsOpen,setSettingsOpen]=useState(()=>readRoute()==='settings'),[sidebarCollapsed,setSidebarCollapsed]=useState(()=>{try{return localStorage.getItem('poe-companion-sidebar-collapsed')==='true';}catch{return false;}}),[aurora,setAurora]=useState<AuroraChoice>(readAurora);

 useEffect(()=>{applyAppearance();const sync=()=>applyAppearance();const syncAurora=()=>setAurora(readAurora());const hash=()=>{const next=readRoute();if(next==='settings')setSettingsOpen(true);else setRoute(next);};const storage=(event:StorageEvent)=>{sync();if(!event.key||event.key===auroraStorageKey)syncAurora();};window.addEventListener('storage',storage);window.addEventListener('appearance:change',sync);window.addEventListener('aurora:change',syncAurora);window.addEventListener('hashchange',hash);return()=>{window.removeEventListener('storage',storage);window.removeEventListener('appearance:change',sync);window.removeEventListener('aurora:change',syncAurora);window.removeEventListener('hashchange',hash);};},[]);
 useEffect(()=>{document.dispatchEvent(new CustomEvent('workspace:change',{detail:{panelId:route==='items'?'catalogPanel':route+'Panel'}}));},[route]);
 return <div className="app-shell" data-route={route} data-sidebar-collapsed={sidebarCollapsed} data-aurora={aurora} style={{ backgroundImage: `url(${auroraArt[aurora]})` }}><a className="skip-link" href="#workspace-content">Skip to content</a><aside className="app-sidebar"><LiquidGlassLayer borderRadius={0}/><header><span className="eyebrow">PATH OF EXILE 1</span><strong>Exile companion</strong></header><Button variant="ghost" className="sidebar-toggle" aria-label={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'} title={sidebarCollapsed?'Expand sidebar':'Collapse sidebar'} onClick={()=>setSidebarCollapsed(value=>{const next=!value;try{localStorage.setItem('poe-companion-sidebar-collapsed',String(next));}catch{}return next;})}><span className="sidebar-toggle-glyph" aria-hidden="true">{sidebarCollapsed?<SidebarExpandIcon size={18}/>:<SidebarCollapseIcon size={18}/>}</span></Button><nav aria-label="App sections">{routes.map(([id,label,Icon])=><Button key={id} variant="ghost" className="nav-item" title={sidebarCollapsed?label:undefined} aria-label={label} aria-current={route===id?'page':undefined} onClick={()=>{if(id==='settings'){setSettingsOpen(true);return;}location.hash=id;setRoute(id);}}><span aria-hidden="true"><Icon size={16} strokeWidth={1.8}/></span><span className="nav-label">{label}</span></Button>)}</nav><p className="sidebar-note"><span className="connection-dot"/><span className="sidebar-note-label">Personal workspace<small>Stored on this device</small></span></p></aside><div className="workspace"><main id="workspace-content" className="workspace-content" tabIndex={-1}><div hidden={route!=='character'}><FeatureBoundary><CharacterPage active={route==='character'}/></FeatureBoundary></div><div hidden={route!=='crafting'}><FeatureBoundary><CraftingPage/></FeatureBoundary></div><div hidden={route!=='skills'}><FeatureBoundary><SkillsPage/></FeatureBoundary></div><div hidden={route!=='theorycrafting'}><FeatureBoundary><TheorycraftingPage/></FeatureBoundary></div><div hidden={route!=='items'}><FeatureBoundary><ItemsPage/></FeatureBoundary></div><div hidden={route!=='compendium'}><FeatureBoundary><CompendiumPage/></FeatureBoundary></div><div hidden={route!=='tree'}><FeatureBoundary><TreePage active={route==='tree'}/></FeatureBoundary></div></main></div><Dialog open={settingsOpen} onOpenChange={setSettingsOpen}><DialogContent variant="settings" className="settings-dialog"><DialogHeader><DialogTitle>Settings</DialogTitle><DialogDescription>Preferences apply immediately; character and build saves are kept separately.</DialogDescription></DialogHeader><SettingsPage/></DialogContent></Dialog></div>;
}
