// Editable appearance only: geometry and layout tokens are intentionally excluded.
export const themeStorageKey = 'poe-companion.theme.v1';
export const themeColors = Object.freeze({
  '--bg':'Background', '--bg-secondary':'Panel background', '--surface':'Control background',
  '--surface-raised':'Raised surface', '--text':'Primary text', '--text-secondary':'Secondary text',
  '--text-muted':'Muted text', '--text-caption':'Captions', '--accent':'Accent',
  '--accent-hover':'Accent hover', '--accent-gold':'Gold accent', '--accent-blue':'Blue accent',
  '--success':'Success', '--control-border':'Control border color', '--selection-bg':'Selection background',
  '--control-hover':'Control hover', '--reference-bg':'Reference card background',
  '--reference-value':'Reference values', '--reference-mod':'Reference modifiers',
  '--glow-warm':'Warm background glow', '--glow-cool':'Cool background glow',
  '--gem-color':'Gem text', '--unique-color':'Unique item text',
});
export const themeFonts = Object.freeze({
  'fira-code': "'Fira Code',Consolas,'Courier New',monospace",
  'jetbrains-mono': "'JetBrains Mono',Consolas,'Courier New',monospace",
  system: "'Segoe UI',system-ui,sans-serif",
  serif: "Georgia,'Times New Roman',serif",
  mono: "Consolas,'Courier New',monospace",
});
export const themeFontFields = Object.freeze({ '--font-ui':'Interface font', '--font-reference':'Reference font', '--font-display':'Card title font' });
export function defaultTheme() { return {version:1,colors:{},fonts:{}}; }

export function validateTheme(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) throw Error('Unsupported theme format.');
  if (Object.keys(value).some(key=>!['version','colors','fonts'].includes(key))) throw Error('Unknown theme setting.');
  const result=defaultTheme();
  for (const [section,fields] of [['colors',themeColors],['fonts',themeFontFields]]) {
    const values=value[section] ?? {};
    if (typeof values !== 'object' || Array.isArray(values)) throw Error(`Invalid theme ${section}.`);
    for (const [key,setting] of Object.entries(values)) {
      if (!Object.hasOwn(fields,key)) throw Error(`Theme field is not editable: ${key}`);
      if (section==='colors') {
        if (typeof setting!=='string' || !/^#(?:[a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(setting)) throw Error(`Invalid color: ${key}`);
        result.colors[key]=setting.toLowerCase();
      } else {
        if (!Object.hasOwn(themeFonts,setting)) throw Error(`Unknown local font: ${key}`);
        result.fonts[key]=setting;
      }
    }
  }
  return result;
}
export function importTheme(text) {
  if (typeof text !== 'string' || text.length>16384) throw Error('Theme file is too large or invalid.');
  return validateTheme(JSON.parse(text));
}
export function exportTheme(value) { return JSON.stringify(validateTheme(value),null,2); }
