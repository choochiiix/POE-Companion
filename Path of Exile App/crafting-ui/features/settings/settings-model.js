export const settingsStorageKey = 'poe-companion.settings.v1';
export const defaultSettings = Object.freeze({ version: 1, density: 'standard', textSize: 'standard', motion: 'system' });

export function validateSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return { ...defaultSettings };
  return {
    version: 1,
    density: ['standard', 'compact'].includes(value.density) ? value.density : defaultSettings.density,
    textSize: ['standard', 'large'].includes(value.textSize) ? value.textSize : defaultSettings.textSize,
    motion: ['system', 'reduced'].includes(value.motion) ? value.motion : defaultSettings.motion,
  };
}
