import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { LiquidGlassLayer } from '@/features/character/CharacterPage';
import { getAppearanceController } from '@/adapters/appearance';
import { readSave, writeSave } from '@/adapters/storage';
import {
  themePresets,
  presetFontStyles,
  identifyPreset,
  identifyFontStyle,
  choosePreset,
} from '@legacy/features/settings/theme-presets.js';
import {
  defaultSettings,
  settingsStorageKey,
  validateSettings,
} from '@legacy/features/settings/settings-model.js';
import type { SettingsSave } from './types';
import './settings.css';

const auroraStorageKey = 'poe-companion.aurora-background.v1';
const auroraChoices = ['emerald', 'violet', 'rosegold'] as const;
function readAuroraChoice() {
  try {
    const choice = localStorage.getItem(auroraStorageKey);
    return auroraChoices.includes(choice as typeof auroraChoices[number]) ? choice! : 'emerald';
  } catch { return 'emerald'; }
}

export default function SettingsPage() {
  const [controller] = useState(getAppearanceController);
  const [initial] = useState(() => {
    let error = '';
    try {
      localStorage.getItem(settingsStorageKey);
    } catch {
      error = 'Storage unavailable. Preferences may not persist after reload.';
    }
    return { value: readSave(settingsStorageKey, validateSettings) as SettingsSave, error };
  });
  const [settings, setSettings] = useState(initial.value);
  const [status, setStatus] = useState(initial.error || controller.getError());
  const [theme, setTheme] = useState(controller.getTheme());
  const [aurora, setAurora] = useState(readAuroraChoice);
  const palette = identifyPreset(theme);
  const font = identifyFontStyle(theme);

  function save(next: SettingsSave) {
    setSettings(next);
    document.documentElement.dataset.density = next.density;
    document.documentElement.dataset.textSize = next.textSize;
    document.documentElement.dataset.motion = next.motion;
    setStatus(
      writeSave(settingsStorageKey, next)
        ? 'Storage unavailable. Preferences apply until this page is reloaded.'
        : 'Preferences saved on this device.',
    );
  }

  function saveTheme(next: ReturnType<typeof controller.getTheme>) {
    const result = controller.save(next);
    setTheme(result.theme);
    setStatus(result.persisted ? 'Theme saved on this device.' : result.error);
    window.dispatchEvent(new Event('appearance:change'));
  }

  return (
    <div id="settingsPanel" className="settings-panel">
      <section className="settings-card" aria-labelledby="settings-appearance-title">
        <LiquidGlassLayer className="character-glass-layer settings-glass-layer" />
        <h2 id="settings-appearance-title">Appearance</h2>
        <div className="form-grid settings-appearance-grid">
          <label>
            Color theme
            <Select
              id="colorTheme"
              value={palette}
              onChange={event => saveTheme(choosePreset(event.target.value, font, theme))}
            >
              <option value="custom" disabled>Custom theme</option>
              {themePresets.map(preset => (
                <option key={preset.id} value={preset.id}>{preset.label}</option>
              ))}
            </Select>
          </label>
          <label>
            Font style
            <Select
              id="themeFont"
              value={font}
              onChange={event => saveTheme(
                palette === 'custom'
                  ? { ...theme, fonts: presetFontStyles[event.target.value as keyof typeof presetFontStyles]?.fonts || theme.fonts }
                  : choosePreset(palette, event.target.value, theme),
              )}
            >
              <option value="theme">Theme default</option>
              {Object.entries(presetFontStyles).map(([id, style]) => (
                <option key={id} value={id}>{style.label}</option>
              ))}
              <option value="custom" disabled>Custom fonts</option>
            </Select>
          </label>
        </div>
        <label className="settings-aurora-picker">
          Aurora background
          <Select id="auroraBackground" value={aurora} onChange={event => {
            const next = event.target.value;
            if (!auroraChoices.includes(next as typeof auroraChoices[number])) return;
            setAurora(next);
            try { localStorage.setItem(auroraStorageKey, next); } catch { /* Keep the current session choice. */ }
            window.dispatchEvent(new Event('aurora:change'));
          }}>
            <option value="emerald">Aurora — Emerald</option>
            <option value="violet">Aurora — Violet</option>
            <option value="rosegold">Aurora — Rose Gold</option>
          </Select>
          <small>Changes the local background and matching interface accents.</small>
        </label>
        <p className="settings-note">
          Themes change colors and fonts only. Equipped and unique item cards keep their game-reference colors and typography. Fonts use local installations with system fallbacks; nothing is downloaded.
        </p>
        <div className="settings-actions">
          <Button
            variant="outline"
            onClick={() => {
              const result = controller.reset();
              setTheme(result.theme);
              setStatus(result.persisted ? 'Original theme restored.' : result.error);
              window.dispatchEvent(new Event('appearance:change'));
            }}
          >
            Restore original theme
          </Button>
        </div>
      </section>

      <section className="settings-card" aria-labelledby="settings-display-title">
        <LiquidGlassLayer className="character-glass-layer settings-glass-layer" />
        <h2 id="settings-display-title">Display preferences</h2>
        <div className="form-grid settings-display-grid">
          {([
            ['Display density', 'density', [['standard', 'Standard'], ['compact', 'Compact']], 'Compact reduces gaps in library panels and glossary rows.'],
            ['Text size', 'textSize', [['standard', 'Standard'], ['large', 'Large']], 'Larger text for controls and reference cards. Browser zoom is also supported.'],
            ['Motion', 'motion', [['system', 'Follow system'], ['reduced', 'Reduce motion']], 'Your operating system’s reduced-motion preference is always respected.'],
          ] as const).map(([label, key, choices, hint]) => (
            <label key={key}>
              {label}
              <Select
                value={settings[key]}
                aria-describedby={`settings-${key}-hint`}
                onChange={event => save({ ...settings, [key]: event.target.value })}
              >
                {choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </Select>
              <small id={`settings-${key}-hint`}>{hint}</small>
            </label>
          ))}
        </div>
        <div className="settings-actions">
          <Button variant="outline" onClick={() => save({ ...defaultSettings } as SettingsSave)}>
            Reset preferences
          </Button>
        </div>
        <p className="settings-note">
          Resets only these preferences. Your saved characters, equipment, skill groups and tree are preserved.
        </p>
      </section>
      <p className="settings-status" role="status">{status}</p>
    </div>
  );
}
