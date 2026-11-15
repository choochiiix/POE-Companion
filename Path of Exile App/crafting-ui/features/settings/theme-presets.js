import { defaultTheme, validateTheme } from './theme-model.js';

// Adapted color roles from upstream VS Code palettes; see resources/theme-presets/README.md.
// These are app adaptations, not VS Code extensions or a live popularity ranking.
const rows = [
  ['github-dark','GitHub Dark (classic)','#24292e','#1b1f23','#2f363d','#e1e4e8','#79b8ff','#ffdf5d','#85e89d','https://github.com/primer/github-vscode-theme'],
  ['one-dark-pro','One Dark Pro','#282c34','#21252b','#1d1f23','#abb2bf','#61afef','#d18f52','#8cc265','https://github.com/Binaryify/OneDark-Pro'],
  ['dracula','Dracula','#282a36','#21222c','#44475a','#f8f8f2','#bd93f9','#f1fa8c','#50fa7b','https://draculatheme.com/spec'],
  ['atom-one-dark','Atom One Dark','#282c34','#21252b','#1b1d23','#abb2bf','#528bff','#e5c07b','#98c379','https://github.com/akamud/vscode-theme-onedark'],
  ['ayu-dark','Ayu Dark','#10141c','#0d1017','#10141c','#fcf8ec','#e6b450','#fdb04c','#70bf56','https://github.com/ayu-theme/vscode-ayu'],
  ['winter-is-coming','Winter is Coming — Dark Blue','#011627','#011627','#0b253a','#a7dbf7','#219fd5','#f7ecb5','#22da6e','https://github.com/johnpapa/vscode-winteriscoming'],
  ['night-owl','Night Owl','#011627','#011627','#0b253a','#d6deeb','#c792ea','#c5e478','#22da6e','https://github.com/sdras/night-owl-vscode-theme'],
  ['tokyo-night','Tokyo Night','#1a1b26','#16161e','#14141b','#a9b1d6','#7aa2f7','#e0af68','#73daca','https://github.com/tokyo-night/tokyo-night-vscode-theme'],
  ['one-monokai','One Monokai','#282c34','#21252b','#1d1f23','#abb2bf','#e5c07b','#e5c07b','#98c379','https://github.com/azemoh/vscode-one-monokai'],
  ['palenight','Palenight','#292d3e','#292d3e','#313850','#bfc7d5','#c792ea','#ffcb6b','#a9c77d','https://github.com/whizkydee/vscode-palenight-theme'],
];
const rgb = hex => hex.slice(1).match(/../g).map(part=>parseInt(part,16));
function mix(a,b,amount) { return '#'+rgb(a).map((value,index)=>Math.round(value+(rgb(b)[index]-value)*amount).toString(16).padStart(2,'0')).join(''); }
export const presetFontStyles = Object.freeze({
  system: { label:'System sans-serif', fonts:{'--font-ui':'system','--font-reference':'system','--font-display':'system'} },
  mono: { label:'Consolas / monospace', fonts:{'--font-ui':'mono','--font-reference':'mono','--font-display':'mono'} },
  'fira-code': { label:'Fira Code (if installed)', fonts:{'--font-ui':'system','--font-reference':'fira-code','--font-display':'fira-code'} },
  'jetbrains-mono': { label:'JetBrains Mono (if installed)', fonts:{'--font-ui':'system','--font-reference':'jetbrains-mono','--font-display':'jetbrains-mono'} },
  serif: { label:'Georgia / serif', fonts:{'--font-ui':'system','--font-reference':'serif','--font-display':'serif'} },
});
function build(row) {
  const [id,label,bg,panel,surface,text,accent,gold,green,source]=row;
  const colors={
    '--bg':bg,'--bg-secondary':panel,'--surface':surface,'--surface-raised':mix(bg,text,.08),
    '--text':text,'--text-secondary':mix(bg,text,.88),'--text-muted':mix(bg,text,.82),'--text-caption':mix(bg,text,.82),
    '--accent':accent,'--accent-hover':mix(accent,text,.2),'--accent-gold':gold,'--accent-blue':accent,'--success':green,
    '--control-border':mix(bg,text,.62),'--selection-bg':mix(bg,accent,.2),'--control-hover':mix(bg,text,.14),
    '--reference-bg':bg,'--reference-value':text,
    '--glow-warm':accent+'1a','--glow-cool':accent+'09',
  };
  return {id,label,source,theme:validateTheme({version:1,colors,fonts:{'--font-ui':'system','--font-reference':'mono','--font-display':'mono'}})};
}
export const themePresets = [{id:'ayu-aurora',label:'Ayu Aurora — original',source:null,theme:defaultTheme()},...rows.map(build)];
export function identifyPreset(theme) {
  return themePresets.find(preset=>JSON.stringify(Object.entries(preset.theme.colors).sort())===JSON.stringify(Object.entries(theme.colors).sort()))?.id || 'custom';
}
export function identifyFontStyle(theme,presetId=identifyPreset(theme)) {
  const match=fonts=>JSON.stringify(Object.entries(fonts).sort())===JSON.stringify(Object.entries(theme.fonts).sort());
  if (match(themePresets.find(preset=>preset.id===presetId)?.theme.fonts||{})) return 'theme';
  return Object.entries(presetFontStyles).find(([,style])=>match(style.fonts))?.[0]||'custom';
}
export function choosePreset(id,fontStyle='theme',current=defaultTheme()) {
  const preset=themePresets.find(value=>value.id===id);
  if (!preset) throw Error('Unknown theme preset.');
  const fonts=fontStyle==='custom'?current.fonts:fontStyle==='theme'?preset.theme.fonts:presetFontStyles[fontStyle]?.fonts;
  if (!fonts) throw Error('Unknown font style.');
  return validateTheme({...preset.theme,fonts});
}
