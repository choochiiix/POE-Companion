import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LiquidGlassLayer } from '@/components/ui/LiquidGlassLayer';
import { Select } from '@/components/ui/select';
import { getAppearanceController } from '@/adapters/appearance';
import { auroraStorageKey, isAuroraChoice, readAurora, saveAurora } from '@/adapters/aurora';
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
  const [aurora, setAurora] = useState(readAurora);
  const [resetOpen, setResetOpen] = useState(false);
  const palette = identifyPreset(theme);
  const font = identifyFontStyle(theme);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (!event.key || event.key === auroraStorageKey) setAurora(readAurora());
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function save(next: SettingsSave) {
    setSettings(next);
    setStatus(
      writeSave(settingsStorageKey, next)
        ? 'Storage unavailable. Preferences apply until this page is reloaded.'
        : 'Preferences saved on this device.',
    );
    window.dispatchEvent(new Event('appearance:change'));
  }

  function saveTheme(next: ReturnType<typeof controller.getTheme>) {
    const result = controller.save(next);
    setTheme(result.theme);
    setStatus(result.persisted ? 'Theme saved on this device.' : result.error);
    window.dispatchEvent(new Event('appearance:change'));
  }

  return (
    <div id="settingsPanel" className="settings-panel">
      <section className="settings-card workspace-glass" aria-labelledby="settings-appearance-title">
        <LiquidGlassLayer />
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
            if (!isAuroraChoice(next)) return;
            setAurora(next);
            setStatus(saveAurora(next)
              ? 'Aurora saved on this device.'
              : 'Storage unavailable. Aurora applies until this page is reloaded.');
          }}>
            <option value="emerald">Aurora — Emerald</option>
            <option value="violet">Aurora — Violet</option>
            <option value="rosegold">Aurora — Rose Gold</option>
          </Select>
          <small>Changes the local background and matching interface accents.</small>
        </label>
        <p className="settings-note">
          Color themes and local fonts style workspace text and inset surfaces. Aurora controls the backdrop and interface accents.
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

      <section className="settings-card workspace-glass" aria-labelledby="settings-display-title">
        <LiquidGlassLayer />
        <h2 id="settings-display-title">Display preferences</h2>
        <div className="form-grid settings-display-grid">
          {([
            ['Display density', 'density', [['standard', 'Standard'], ['compact', 'Compact']], 'Compact reduces spacing in controls and panels.'],
            ['Text size', 'textSize', [['standard', 'Standard'], ['large', 'Large']], 'Larger text for controls and reference cards.'],
            ['Motion', 'motion', [['system', 'Follow system'], ['reduced', 'Reduce motion']], 'Your operating system’s reduced-motion preference is always respected.'],
          ] as const).map(([label, key, choices, hint]) => (
            <label key={key}>
              {label}
              <Select
                value={settings[key]}
                aria-label={label}
                aria-describedby={`settings-${key}-hint`}
                onChange={event => save({ ...settings, [key]: event.target.value })}
              >
                {choices.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
              </Select>
              <small id={`settings-${key}-hint`}>{hint}</small>
            </label>
          ))}
        </div>
        <Dialog open={resetOpen} onOpenChange={setResetOpen}>
          <div className="settings-actions">
            <DialogTrigger asChild>
              <Button variant="outline">Reset preferences</Button>
            </DialogTrigger>
          </div>
          <DialogContent className="settings-reset-dialog">
            <DialogHeader>
              <DialogTitle>Reset display preferences?</DialogTitle>
              <DialogDescription>Restore the defaults for display density, text size, and motion.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild><Button variant="ghost">Cancel</Button></DialogClose>
              <Button onClick={() => {
                save({ ...defaultSettings } as SettingsSave);
                setResetOpen(false);
              }}>Reset preferences</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
      <p className="settings-status" role="status">{status}</p>
    </div>
  );
}
