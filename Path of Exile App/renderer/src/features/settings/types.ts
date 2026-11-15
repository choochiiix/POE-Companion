/** Existing v1 browser preference payload. Theme state has its own independent key. */
export interface SettingsSave {
  version: 1;
  density: 'standard' | 'compact';
  textSize: 'standard' | 'large';
  motion: 'system' | 'reduced';
}
