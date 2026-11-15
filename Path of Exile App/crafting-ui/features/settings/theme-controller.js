import { defaultTheme, validateTheme, importTheme, exportTheme, themeColors, themeFontFields, themeFonts, themeStorageKey } from './theme-model.js';

// No visible editor yet. The future UI can preview/cancel/save through this controller.
export function createThemeController({ root, getStorage = () => globalThis.localStorage }) {
  let saved=defaultTheme();
  let error='';
  const originals=new Map([...Object.keys(themeColors),...Object.keys(themeFontFields)].map(key=>[key,{value:root.style.getPropertyValue(key),priority:root.style.getPropertyPriority(key)}]));
  function apply(theme) {
    for (const [key,original] of originals) {
      if (original.value) root.style.setProperty(key,original.value,original.priority);
      else root.style.removeProperty(key);
    }
    for (const [key,value] of Object.entries(theme.colors)) root.style.setProperty(key,value);
    for (const [key,value] of Object.entries(theme.fonts)) root.style.setProperty(key,themeFonts[value]);
  }
  try {
    const raw=getStorage().getItem(themeStorageKey);
    if (raw!==null) saved=importTheme(raw);
  } catch { error='Saved theme could not load. Default colors and fonts are in use.'; }
  apply(saved);
  return {
    getTheme:()=>validateTheme(saved),
    getError:()=>error,
    preview(value) { const theme=validateTheme(value);apply(theme);return theme; },
    cancelPreview() { apply(saved); },
    save(value) {
      const theme=validateTheme(value);
      saved=theme;
      apply(saved);
      try { getStorage().setItem(themeStorageKey,exportTheme(saved));error=''; }
      catch { error='Storage unavailable. Theme changes apply only until reload.'; }
      return {theme:validateTheme(saved),persisted:!error,error};
    },
    reset() { return this.save(defaultTheme()); },
    import(text) { return this.preview(importTheme(text)); },
    export:()=>exportTheme(saved),
  };
}
