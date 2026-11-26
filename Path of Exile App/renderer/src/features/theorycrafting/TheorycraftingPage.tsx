import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/adapters/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Select } from '@/components/ui/select';
import { createTheorycraftingIndex } from '@legacy/features/theorycrafting/index-model.js';
import { analyzeTheorycrafting } from '@legacy/features/theorycrafting/ranking-model.js';
import type { SkillsData } from '@/features/skills/types';
import './theorycrafting.css';

type SelectionKind = 'skill' | 'unique';
type Evidence = 'calculated' | 'conditional' | 'rule-based';
type Selection = { kind: SelectionKind; id: string };
type Scenario = {
  level: number;
  className: string;
  ascendancyName: string;
  allocatedNodeIds: string[];
  masteries: Record<string, string>;
  enemyResistance: number;
};
type Suggestion = {
  id: string;
  kind: 'support' | 'unique' | 'skill' | 'passive' | 'mastery' | 'ascendancy';
  name: string;
  relation: string;
  conditions: string[];
  evidence: Evidence;
  sourceIds: string[];
  explanation?: string;
  provenance?: { file?: string; snapshot?: string; version?: string | null; recordIds?: string[] };
  costs?: { passivePoints: number; ascendancyPoints: number; nodeIds: string[] };
  comparison?: {
    metric: string;
    baseline: number;
    alternative: number;
    delta: number;
    comparator: string;
    assumptions: string[];
  };
};
type Analysis = {
  selection: Selection;
  scenario: Scenario;
  suggestions: Suggestion[];
  diagnostics: string[];
  sources: string[];
};
type CatalogItem = {
  id: string;
  name: string;
  itemClass?: string;
  category?: string;
  baseType?: string;
  family?: string;
  variant?: string;
  legacy?: boolean;
  explicit?: Array<{ text?: string }>;
  implicit?: Array<{ text?: string }>;
};
type CatalogData = { uniques: CatalogItem[]; bases: CatalogItem[]; report?: unknown };
type TreeData = Record<string, unknown>;
type TreeClass = { name: string; ascendancies?: Array<{ id?: string; name: string }> };
type CalculationData = Record<string, unknown>;
type Loaded = { skills: SkillsData; catalog: CatalogData; tree: TreeData; calculationData: CalculationData };

const starterScenario: Scenario = {
  level: 90,
  className: 'Witch',
  ascendancyName: 'Elementalist',
  allocatedNodeIds: [],
  masteries: {},
  enemyResistance: 0,
};

const starterSkills = [
  'Metadata/Items/Gems/SkillGemFireball',
  'Metadata/Items/Gems/SkillGemArc',
  'Metadata/Items/Gems/SkillGemBallLightning',
  'Metadata/Items/Gems/SkillGemSpark',
];

function evidenceLabel(value: Evidence) {
  return value === 'rule-based' ? 'Rule-based' : value === 'conditional' ? 'Conditional' : 'Calculated';
}

function formatDelta(value: number) {
  if (!Number.isFinite(value)) return 'unavailable';
  return `${value > 0 ? '+' : ''}${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

function isSupportedUnique(item: CatalogItem) {
  return /weapon|armour|armor/i.test(`${item.category || ''} ${item.itemClass || ''}`) && !item.legacy;
}

function uniqueText(item: CatalogItem) {
  return [...(item.implicit || []), ...(item.explicit || [])].map(mod => mod.text || '').join(' ');
}

function failureMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The local Theorycrafting data could not be read.';
}

export default function TheorycraftingPage() {
  const [loaded, setLoaded] = useState<Loaded>();
  const [loadError, setLoadError] = useState('');
  const [kind, setKind] = useState<SelectionKind>('skill');
  const [selectedId, setSelectedId] = useState(starterSkills[0]);
  const [uniqueSearch, setUniqueSearch] = useState('');
  const [scenario, setScenario] = useState(starterScenario);
  const [analysis, setAnalysis] = useState<Analysis>();
  const [analysisError, setAnalysisError] = useState('');

  const theoryIndex = useMemo(() => loaded ? createTheorycraftingIndex({
    skillsData: loaded.skills,
    catalogData: loaded.catalog,
    treeData: loaded.tree,
  }) : undefined, [loaded]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetchJson<SkillsData>('/skills-data.json'),
      fetchJson<CatalogData>('/catalog-data.json'),
      fetchJson<TreeData>('/tree-data/tree.json'),
      fetchJson<CalculationData>('/calculation-data.json'),
    ]).then(([skills, catalog, tree, calculationData]) => {
      if (active) setLoaded({ skills, catalog, tree, calculationData });
    }).catch(error => {
      if (active) setLoadError(failureMessage(error));
    });
    return () => { active = false; };
  }, []);

  const skills = loaded?.skills.gems || [];
  const uniqueOptions = useMemo(() => {
    const query = uniqueSearch.trim().toLowerCase();
    const supportedIds = new Set((theoryIndex?.rules || []).flatMap((rule: { match?: { uniqueIds?: string[] } }) => rule.match?.uniqueIds || []));
    const supported = (loaded?.catalog.uniques || []).filter(item => supportedIds.has(item.id) && isSupportedUnique(item));
    return supported
      .filter(item => !query || `${item.name} ${item.baseType || ''} ${uniqueText(item)}`.toLowerCase().includes(query))
      .sort((a, b) => (a.name === "Doryani's Prototype" ? -1 : b.name === "Doryani's Prototype" ? 1 : a.name.localeCompare(b.name)) || (a.variant || '').localeCompare(b.variant || ''));
  }, [loaded, theoryIndex, uniqueSearch]);
  const skillOptions = useMemo(() => skills.filter(gem => gem.type === 'active' && (starterSkills.includes(gem.id) || gem.tags.includes('spell'))).sort((a, b) => a.name.localeCompare(b.name)), [skills]);
  const ascendancyOptions = useMemo(() => {
    const classes = Array.isArray(loaded?.tree.classes) ? loaded.tree.classes as TreeClass[] : [];
    return classes.find(characterClass => characterClass.name === scenario.className)?.ascendancies || [];
  }, [loaded, scenario.className]);
  const selectedSkill = skills.find(gem => gem.id === selectedId);
  const selectedUnique = loaded?.catalog.uniques.find(item => item.id === selectedId);
  const defaultUniqueId = uniqueOptions.find(item => item.name === "Doryani's Prototype")?.id;

  useEffect(() => {
    if (!loaded) return;
    if (kind === 'skill' && !skillOptions.some(gem => gem.id === selectedId)) setSelectedId(skillOptions[0]?.id || '');
    if (kind === 'unique' && !uniqueOptions.some(item => item.id === selectedId)) setSelectedId(selectedId === '' ? (defaultUniqueId || uniqueOptions[0]?.id || '') : (uniqueOptions[0]?.id || ''));
  }, [defaultUniqueId, kind, loaded, selectedId, skillOptions, uniqueOptions]);

  useEffect(() => {
    if (!loaded) return;
    if (!ascendancyOptions.length) {
      if (scenario.ascendancyName !== 'None') setScenarioField('ascendancyName', 'None');
    } else if (!ascendancyOptions.some(option => option.name === scenario.ascendancyName || option.id === scenario.ascendancyName)) {
      setScenarioField('ascendancyName', ascendancyOptions[0].name);
    }
  }, [ascendancyOptions, loaded, scenario.ascendancyName]);

  useEffect(() => {
    if (!loaded || !selectedId) return;
    setAnalysis(undefined);
    setAnalysisError('');
    try {
      const result = analyzeTheorycrafting({
        index: theoryIndex,
        selection: { kind, id: selectedId },
        // Keep the public starter-scenario names while supplying the legacy
        // adapter aliases during the migration window.
        scenario: {
          ...scenario,
          characterClass: scenario.className,
          ascendancy: scenario.ascendancyName,
        },
        calculationData: loaded.calculationData,
      });
      setAnalysis(result as unknown as Analysis);
    } catch (error) {
      setAnalysisError(failureMessage(error));
    }
  }, [loaded, kind, selectedId, scenario, theoryIndex]);

  function setScenarioField<K extends keyof Scenario>(field: K, value: Scenario[K]) {
    setScenario(current => ({ ...current, [field]: value }));
  }

  const currentName = kind === 'skill' ? selectedSkill?.name : selectedUnique?.name;
  const resultSuggestions = analysis?.suggestions || [];
  const grouped = resultSuggestions.reduce<Record<string, Suggestion[]>>((groups, suggestion) => {
    (groups[suggestion.kind] ||= []).push(suggestion);
    return groups;
  }, {});

  return (
    <div id="theorycraftingPanel" className="theorycrafting-page">
      <div className="page-heading">
        <div>
          <h1>Theorycrafting</h1>
          <p className="muted">Start with a skill or unique and discover mechanics that are worth trying together.</p>
        </div>
      </div>
      <p className="source-note" role={loadError ? 'alert' : 'status'}>
        {loadError || (!loaded ? 'Loading pinned skills, uniques, passive tree and calculation data…' : `Starter scenario · level ${scenario.level} ${scenario.className} / ${scenario.ascendancyName}`)}
      </p>
      {loaded && <>
        <Panel title="Choose a starting point" description="This exploration is read-only. It never changes your Character, Skills, tree or equipment saves.">
          <div className="theorycrafting-controls">
            <label>Start from<Select aria-label="Theorycrafting starting point" value={kind} onChange={event => { setKind(event.target.value as SelectionKind); setSelectedId(''); }}><option value="skill">Active skill gem</option><option value="unique">Unique weapon or armour</option></Select></label>
            {kind === 'skill' ? <label>Active gem<Select aria-label="Active skill gem" value={selectedId} onChange={event => setSelectedId(event.target.value)}>{skillOptions.length ? skillOptions.map(gem => <option key={gem.id} value={gem.id}>{gem.name}</option>) : <option value="">No supported active gems</option>}</Select></label> : <>
              <label>Find a unique<Input aria-label="Find a unique weapon or armour" type="search" value={uniqueSearch} onChange={event => setUniqueSearch(event.target.value)} placeholder="Search name, base or mechanic" /></label>
              <label>Unique variant<Select aria-label="Unique weapon or armour" value={selectedId} onChange={event => setSelectedId(event.target.value)}>{uniqueOptions.length ? uniqueOptions.map(item => <option key={item.id} value={item.id}>{item.name} · {item.variant || 'Source variant'}</option>) : <option value="">No matching weapon or armour uniques</option>}</Select></label>
            </>}
          </div>
          {kind === 'unique' && !uniqueOptions.length && <p className="source-note" role="status">No rule-backed unique matches this search. Other unique records remain reference-only until their mechanics are indexed.</p>}
          <div className="theorycrafting-scenario">
            <h3>Starter scenario</h3>
            <div className="theorycrafting-scenario-grid">
              <label>Level<Input aria-label="Scenario level" type="number" min={1} max={100} value={scenario.level} onChange={event => setScenarioField('level', Math.max(1, Math.min(100, Number(event.target.value) || 1)))} /></label>
              <label>Class<Select aria-label="Scenario class" value={scenario.className} onChange={event => setScenarioField('className', event.target.value)}><option>Witch</option><option>Templar</option><option>Shadow</option><option>Ranger</option><option>Marauder</option><option>Duelist</option><option>Scion</option></Select></label>
              <label>Ascendancy<Select aria-label="Scenario ascendancy" value={scenario.ascendancyName} onChange={event => setScenarioField('ascendancyName', event.target.value)}><option value="None">None</option>{ascendancyOptions.map(option => <option key={option.id || option.name} value={option.name}>{option.name}</option>)}</Select></label>
              <label>Enemy resistance<Input aria-label="Enemy resistance" type="number" min={-200} max={200} value={scenario.enemyResistance} onChange={event => setScenarioField('enemyResistance', Number(event.target.value) || 0)} /></label>
            </div>
            <p className="source-note">No saved character is required. Allocated nodes and mastery choices begin empty, so passive costs and conditions are explicit.</p>
          </div>
        </Panel>
        {analysisError ? <Panel title="Analysis unavailable"><p role="alert">{analysisError}</p><p className="source-note">This selection is not supported by the pinned rules yet. Try Fireball, Arc, Ball Lightning, Spark, or Doryani&apos;s Prototype.</p></Panel> : analysis && <>
          <section className="theorycrafting-result-summary" aria-label="Theorycrafting result summary"><strong>{currentName || 'Selected starting point'}</strong><span>{resultSuggestions.length} connected suggestions</span><span>{analysis.sources.length} pinned source records</span></section>
          {!!analysis.diagnostics.length && <Panel title="Conditions and diagnostics"><ul className="theorycrafting-diagnostics">{analysis.diagnostics.map((diagnostic, index) => <li key={`${diagnostic}-${index}`}>{diagnostic}</li>)}</ul></Panel>}
          <div className="theorycrafting-results">
            {(['skill', 'support', 'unique', 'passive', 'mastery', 'ascendancy'] as const).map(group => <SuggestionGroup key={group} kind={group} suggestions={grouped[group] || []} />)}
          </div>
          {!resultSuggestions.length && <Panel title="No supported connections"><p>No locally supported suggestions were found for this starting point and scenario.</p><p className="source-note">The offline index is deliberately conservative: unsupported mechanics are reported instead of guessed.</p></Panel>}
          <details className="theorycrafting-sources"><summary>Evidence and pinned sources</summary><p>Suggestions retain exact source IDs from the local snapshots. Calculated values use the equivalent baseline and alternative setup shown on each card; conditional and rule-based suggestions do not imply a complete DPS model.</p><p><strong>Pinned snapshots:</strong> skills and unique definitions · Path of Building 2.67.2 archive; bases and catalog · RePoE 3.29.3.6; passive tree · PoB 3.29. These are offline references, not live-patch coverage.</p>{analysis.sources.map(source => <code key={source}>{source}</code>)}</details>
        </>}
      </>}
      {!loaded && loadError && <Panel title="Local data unavailable"><p role="alert">{loadError}</p><Button variant="outline" onClick={() => location.reload()}>Retry local data</Button></Panel>}
    </div>
  );
}

function SuggestionGroup({ kind, suggestions }: { kind: Suggestion['kind']; suggestions: Suggestion[] }) {
  if (!suggestions.length) return null;
  const title = { skill: 'Main skills', support: 'Compatible supports', unique: 'Unique equipment', passive: 'Passives and keystones', mastery: 'Individual masteries', ascendancy: 'Ascendancy options' }[kind];
  return <section className="theorycrafting-group" aria-labelledby={`theorycrafting-${kind}`}><h2 id={`theorycrafting-${kind}`}>{title}</h2><div className="theorycrafting-cards">{suggestions.map(suggestion => <article className="theorycrafting-card" key={`${suggestion.kind}-${suggestion.id}`}><header><div><h3>{suggestion.name}</h3><p className="theorycrafting-relation">{suggestion.relation}</p></div><span className={`theorycrafting-evidence evidence-${suggestion.evidence}`}>{evidenceLabel(suggestion.evidence)}</span></header>{suggestion.explanation && <p className="theorycrafting-explanation">{suggestion.explanation}</p>}{suggestion.conditions.length ? <div className="theorycrafting-conditions"><strong>Conditions</strong><ul>{suggestion.conditions.map((condition, index) => <li key={`${condition}-${index}`}>{condition}</li>)}</ul></div> : <p className="theorycrafting-conditions">No additional condition recorded for this connection.</p>}{suggestion.costs && <p className="theorycrafting-cost">Path cost: {suggestion.costs.passivePoints ? `${suggestion.costs.passivePoints} passive point${suggestion.costs.passivePoints === 1 ? '' : 's'}` : ''}{suggestion.costs.passivePoints && suggestion.costs.ascendancyPoints ? ' · ' : ''}{suggestion.costs.ascendancyPoints ? `${suggestion.costs.ascendancyPoints} ascendancy point${suggestion.costs.ascendancyPoints === 1 ? '' : 's'}` : ''}</p>}{suggestion.comparison && <div className="theorycrafting-comparison"><strong>{suggestion.comparison.metric}: {formatDelta(suggestion.comparison.delta)}</strong><span>{suggestion.comparison.baseline} → {suggestion.comparison.alternative} ({suggestion.comparison.comparator})</span><small>{suggestion.comparison.assumptions.join(' · ')}</small></div>}<footer><small>Source IDs: {suggestion.sourceIds.join(', ') || 'not supplied'}</small>{suggestion.provenance && <small className="theorycrafting-provenance">Pinned {suggestion.provenance.snapshot || suggestion.provenance.file || 'local source'}{suggestion.provenance.version ? ` · ${suggestion.provenance.version}` : ''}</small>}</footer></article>)}</div></section>;
}
