import { useEffect, useId, useMemo, useState } from 'react';
import type { BaseItem, ModDef } from '../../../../crafting-engine/src/model.ts';
import { createGearEngine, eligibleAffixes, validateGear } from '@legacy/features/character/gear-model.js';
import { basesForSlot } from '@legacy/features/character/character-data.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SpringSelect } from '@/components/ui/spring-select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { LiquidGlassLayer } from './LiquidGlassLayer';

type GearRoll = { id: string; values: Record<string, number> };
export interface GearRow {
  baseId: string;
  itemLevel: number;
  rarity?: string;
  mods: GearRoll[];
}

const armourGroups: Record<string, string> = {
  str: 'Armour', dex: 'Evasion', int: 'Energy Shield',
  dex_str: 'Armour + Evasion', int_str: 'Armour + Energy Shield',
  dex_int: 'Evasion + Energy Shield', dex_int_str: 'Armour + Evasion + Energy Shield',
};
const weaponGroups: Record<string, string> = {
  'One Hand Axe': 'One-Handed Axes', 'Two Hand Axe': 'Two-Handed Axes',
  'One Hand Sword': 'One-Handed Swords', 'Thrusting One Hand Sword': 'One-Handed Swords',
  'Two Hand Sword': 'Two-Handed Swords', 'One Hand Mace': 'One-Handed Maces',
  'Two Hand Mace': 'Two-Handed Maces', Staff: 'Staves', Warstaff: 'Staves',
  Bow: 'Bows', Wand: 'Wands', Claw: 'Claws', Dagger: 'Daggers', 'Rune Dagger': 'Rune Daggers',
  Sceptre: 'Sceptres', Quiver: 'Quivers', Shield: 'Shields',
};

function groupBases(bases: BaseItem[]) {
  const groups = new Map<string, BaseItem[]>();
  for (const base of bases) {
    const tag = base.tags.find(value => /^(str|dex|int)(_(str|dex|int))*_armour$/.test(value));
    const family = tag?.slice(0, -7).split('_').sort().join('_');
    const itemClass = base.itemClass ?? 'Other';
    const label = (family && armourGroups[family]) || weaponGroups[itemClass] || itemClass;
    const items = groups.get(label) ?? [];
    items.push(base);
    groups.set(label, items);
  }
  for (const items of groups.values()) {
    items.sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));
  }
  return groups;
}

function statLabel(id: string) {
  return id.replace(/^(base_|local_)/, '').replace(/_\+%?$/, '').replace(/_%$/, '')
    .replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function AffixRow({ definition, roll, pending = false, onChange, onRemove }: {
  definition: ModDef;
  roll: GearRoll;
  pending?: boolean;
  onChange: (roll: GearRoll) => void;
  onRemove: () => void;
}) {
  const name = definition.name || 'Unnamed affix';
  return (
    <section className="gear-draft-affix" aria-label={`${pending ? 'Selected' : 'Added'} affix: ${name}`}>
      <div className="gear-draft-affix-header">
        <div className="gear-draft-affix-copy">
          <p>{definition.description || name}</p>
          <span className="gear-draft-affix-name">{name}{pending ? ' · Selected' : ''}</span>
        </div>
        <div className="gear-draft-affix-values">
          {definition.stats.map(stat => {
            const value = roll.values[stat.id];
            const label = statLabel(stat.id);
            const inRange = Number.isInteger(value) && value >= stat.min && value <= stat.max;
            return (
              <div className={`gear-draft-value-row ${definition.stats.length === 1 ? 'single' : ''}`} key={stat.id}>
                {definition.stats.length > 1 && <span className="gear-draft-stat-name">{label}</span>}
                <Input
                  type="number"
                  aria-label={`${label} value`}
                  aria-invalid={!inRange}
                  title={`Allowed range: ${stat.min}–${stat.max}`}
                  min={stat.min}
                  max={stat.max}
                  step={1}
                  defaultValue={Number.isNaN(value) ? undefined : value}
                  onChange={event => onChange({
                    ...roll, values: { ...roll.values, [stat.id]: event.currentTarget.valueAsNumber },
                  })}
                />
              </div>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="xs"
          className="gear-draft-affix-remove"
          aria-label={`${pending ? 'Deselect' : 'Remove'} ${name}`}
          onClick={onRemove}
        >
          {pending ? 'Deselect' : 'Remove'}
        </Button>
      </div>
    </section>
  );
}

export function GearEditor({ slot, bases, mods, equipment, current, onClose, onSave }: {
  slot: string;
  bases: BaseItem[];
  mods: ModDef[];
  equipment: Record<string, string>;
  current?: GearRow;
  onClose: () => void;
  onSave: (row: GearRow) => void;
}) {
  const engine = useMemo(() => createGearEngine(mods), [mods]);
  const modDefinitions = useMemo(() => new Map(mods.map(mod => [mod.id, mod])), [mods]);
  const mainHand = equipment['main-hand'];
  const options: BaseItem[] = useMemo(
    () => basesForSlot(bases, slot, bases.find(base => base.id === mainHand)),
    [bases, slot, mainHand],
  );
  const baseGroups = useMemo(() => groupBases(options), [options]);
  const [draft, setDraft] = useState<GearRow>(() => structuredClone(
    current ?? { baseId: equipment[slot] || '', itemLevel: 85, mods: [] },
  ));
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const [pending, setPending] = useState<GearRoll>();

  let valid: GearRow | undefined;
  let eligible: ModDef[] = [];
  let issue = '';
  if (draft.baseId) {
    try {
      valid = validateGear(engine, options, draft);
      eligible = eligibleAffixes(engine, options, valid);
    } catch (error) {
      issue = (error as Error).message;
    }
  }
  const terms = search.toLowerCase().trim().split(/\s+/);
  const matches = eligible.filter(mod => {
    const text = `${mod.name ?? ''} ${mod.description ?? ''} ${mod.id} ilvl ${mod.requiredLevel}`.toLowerCase();
    return terms.every(term => text.includes(term));
  });
  const prefixMatches = matches.filter(mod => mod.affix === 'prefix');
  const suffixMatches = matches.filter(mod => mod.affix === 'suffix');
  const listOptions = [...prefixMatches, ...suffixMatches];
  const activeOptionId = searchOpen && listOptions[activeIndex] ? `${listId}-${activeIndex}` : undefined;
  useEffect(() => {
    if (activeOptionId) document.getElementById(activeOptionId)?.scrollIntoView({ block: 'nearest' });
  }, [activeOptionId]);
  const selected = pending && eligible.find(mod => mod.id === pending.id);
  const pendingDefinition = pending && modDefinitions.get(pending.id);
  const pendingValid = !!(selected && pending && selected.stats.every(stat => {
    const value = pending.values[stat.id];
    return Number.isSafeInteger(value) && value >= stat.min && value <= stat.max;
  }));
  const prefixes = draft.mods.filter(mod => modDefinitions.get(mod.id)?.affix === 'prefix').length;
  const suffixes = draft.mods.length - prefixes;

  function closeSearch() {
    setSearchOpen(false);
    setActiveIndex(-1);
  }

  function selectAffix(mod: ModDef) {
    setPending({
      id: mod.id,
      values: Object.fromEntries(mod.stats.map(stat => [stat.id, Math.floor((stat.min + stat.max) / 2)])),
    });
    setSearch('');
    closeSearch();
  }

  function addAffix() {
    if (!pending || !pendingValid) return;
    setDraft({ ...draft, mods: [...draft.mods, pending] });
    setPending(undefined);
    setSearch('');
  }

  return (
    <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
      <DialogContent className="character-design-dialog character-glass-dialog gear-editor" onEscapeKeyDown={event => {
        if (!searchOpen) return;
        event.preventDefault();
        closeSearch();
      }}>
        <LiquidGlassLayer className="character-glass-layer character-dialog-glass" />
        <DialogHeader>
          <DialogTitle>Create / Edit {slot.replaceAll('-', ' ')} Equipment</DialogTitle>
          <DialogDescription>Ordinary equipment only. Eligibility uses the local crafting snapshot; special crafting systems are not included.</DialogDescription>
        </DialogHeader>
        <div className="form-grid">
          <label>
            Equipment Base
            <SpringSelect aria-label="Equipment Base" value={draft.baseId} onChange={event => {
              if (draft.baseId) setSearch('');
              setDraft({ ...draft, baseId: event.target.value, mods: [] });
              setPending(undefined);
            }}>
              <option value="">Choose a Base</option>
              {[...baseGroups].map(([label, items]) => (
                <optgroup key={label} label={label}>
                  {items.map(base => <option key={base.id} value={base.id}>{base.name ?? base.id}</option>)}
                </optgroup>
              ))}
            </SpringSelect>
          </label>
          <label>
            Item Level
            <Input aria-label="Item Level" type="number" min={1} max={100}
              value={Number.isNaN(draft.itemLevel) ? '' : draft.itemLevel}
              onChange={event => setDraft({ ...draft, itemLevel: event.currentTarget.valueAsNumber })}
            />
          </label>
        </div>
        <p className="muted gear-editor-rarity">
          {draft.baseId
            ? `${valid?.rarity?.toUpperCase() ?? 'DRAFT'} · ${prefixes}/3 Prefixes · ${suffixes}/3 Suffixes. Magic needs at most one of each; extra affixes make it rare.`
            : 'Choose an Equipment Base.'}
        </p>
        <div className="gear-affix-picker">
          <label>
            Search for an affix
            <Input
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={searchOpen}
              aria-controls={searchOpen ? listId : undefined}
              aria-activedescendant={activeOptionId}
              aria-label="Search for an affix"
              placeholder="Search by name or effect"
              autoComplete="off"
              value={search}
              onFocus={() => setSearchOpen(true)}
              onClick={() => setSearchOpen(true)}
              onBlur={closeSearch}
              onChange={event => {
                setSearch(event.target.value);
                setActiveIndex(-1);
                setSearchOpen(true);
              }}
              onKeyDown={event => {
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                  event.preventDefault();
                  setSearchOpen(true);
                  const step = event.key === 'ArrowDown' ? 1 : -1;
                  setActiveIndex(index => index < 0 && step < 0 ? listOptions.length - 1
                    : Math.min(listOptions.length - 1, Math.max(0, index + step)));
                } else if (event.key === 'Enter' && searchOpen && listOptions[activeIndex]) {
                  event.preventDefault();
                  selectAffix(listOptions[activeIndex]);
                }
              }}
            />
          </label>
          {searchOpen && (
            <div className="gear-affix-menu">
              <div id={listId} role="listbox" aria-label="Eligible affixes">
                {([['Prefixes', prefixMatches, 0], ['Suffixes', suffixMatches, prefixMatches.length]] as const)
                  .map(([label, affixes, offset]) => affixes.length > 0 && (
                    <div key={label} role="group" aria-label={label}>
                      <div className="gear-affix-group" aria-hidden="true">{label}</div>
                      {affixes.map((mod, index) => (
                        <div
                          key={mod.id}
                          id={`${listId}-${offset + index}`}
                          role="option"
                          aria-selected={mod.id === pending?.id}
                          className="gear-affix-option"
                          data-active={offset + index === activeIndex}
                          onMouseDown={event => event.preventDefault()}
                          onClick={() => selectAffix(mod)}
                        >
                          <strong>{mod.description || mod.id}</strong>
                          <span>{mod.name || mod.id} · iLvl {mod.requiredLevel}</span>
                        </div>
                      ))}
                    </div>
                  ))}
              </div>
              {!listOptions.length && <p className="gear-affix-empty">
                {!draft.baseId ? 'Choose an Equipment Base first.'
                  : issue ? 'Resolve the draft error to continue.'
                  : eligible.length ? 'No matching affixes.' : 'No eligible affixes remaining.'}
              </p>}
            </div>
          )}
        </div>
        <p className="muted gear-editor-status" role="status">
          {!draft.baseId ? 'Choose an Equipment Base to see eligible affixes.'
            : issue ? 'Resolve the draft error to continue adding affixes.'
            : !eligible.length ? 'No eligible affixes remaining.'
            : !matches.length ? 'No eligible affixes match your search.'
            : `${matches.length} eligible affixes available.`}
        </p>
        {pending && pendingDefinition && (
          <AffixRow key={pending.id} definition={pendingDefinition} roll={pending} pending onChange={setPending}
            onRemove={() => setPending(undefined)} />
        )}
        {!pending && !draft.mods.length && (
          <div className="gear-draft-affix gear-draft-affix-empty">
            <div className="gear-draft-affix-copy">
              <p>No affixes added</p>
              <span className="gear-draft-affix-name">Choose an eligible affix to edit its value.</span>
            </div>
            <Input aria-label="Affix value" type="number" disabled placeholder="Value" />
          </div>
        )}
        {draft.mods.map((roll, index) => (
          <AffixRow key={roll.id} definition={modDefinitions.get(roll.id)!} roll={roll}
            onChange={next => setDraft({ ...draft, mods: draft.mods.map((mod, i) => i === index ? next : mod) })}
            onRemove={() => setDraft({ ...draft, mods: draft.mods.filter((_, i) => i !== index) })}
          />
        ))}
        <div className="actions gear-editor-actions">
          <Button disabled={!pendingValid} onClick={addAffix}>Add Affix</Button>
          <Button variant="ghost" disabled={!draft.mods.length}
            onClick={() => setDraft({ ...draft, mods: [] })}>Clear Draft Affixes</Button>
        </div>
        <p className="gear-editor-error" role="status">
          {issue || (pending && !selected ? 'The selected affix is no longer eligible. Change the item level or deselect it.'
            : pending && !pendingValid ? 'Enter a whole number within the allowed range for each affix value.' : '')}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={!valid || !!pending} onClick={() => { if (valid && !pending) onSave(valid); }}>
            Save and Equip Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
