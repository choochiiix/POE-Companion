import { createThemeController } from '@legacy/features/settings/theme-controller.js';
import { settingsStorageKey, validateSettings } from '@legacy/features/settings/settings-model.js';
import {readSave} from './storage';
let controller:ReturnType<typeof createThemeController>|undefined;
export function getAppearanceController(){return controller??=createThemeController({root:document.documentElement});}
export function applyAppearance() {
  const controller = getAppearanceController();
  const settings = readSave(settingsStorageKey,validateSettings);
  document.documentElement.dataset.density = settings.density;
  document.documentElement.dataset.textSize = settings.textSize;
  document.documentElement.dataset.motion = settings.motion;
  return controller;
}
