export const auroraStorageKey = 'poe-companion.aurora-background.v1';
export type AuroraChoice = 'emerald' | 'violet' | 'rosegold';
export function isAuroraChoice(value: unknown): value is AuroraChoice {
  return value === 'emerald' || value === 'violet' || value === 'rosegold';
}

let sessionChoice: AuroraChoice | undefined;
window.addEventListener('storage', event => {
  if (!event.key || event.key === auroraStorageKey) sessionChoice = undefined;
});

export function readAurora(): AuroraChoice {
  if (sessionChoice) return sessionChoice;
  try {
    const saved = localStorage.getItem(auroraStorageKey);
    if (isAuroraChoice(saved)) return saved;
  } catch { /* Use the default when storage is unavailable. */ }
  return 'emerald';
}

export function saveAurora(choice: AuroraChoice): boolean {
  sessionChoice = choice;
  let persisted = true;
  try { localStorage.setItem(auroraStorageKey, choice); }
  catch { persisted = false; }
  window.dispatchEvent(new Event('aurora:change'));
  return persisted;
}
