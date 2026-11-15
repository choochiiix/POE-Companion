export interface GemRequirements {
  level: number | null;
  strength: number | null;
  dexterity: number | null;
  intelligence: number | null;
}
export interface GemTooltip {
  name?: string;
  description?: string;
  properties?: { label: string; value: string }[];
  statLines?: string[];
  qualityLines?: string[];
  qualityStatus?: string;
  diagnostics?: { section: string; stat: string; reason: string; values?: unknown[] }[];
}
export interface Gem {
  id: string;
  name: string;
  type: 'active' | 'support';
  tags: string[];
  tagString: string;
  maxLevel: number;
  description: string;
  art?: string;
  requirements: { first: GemRequirements; maximum: GemRequirements };
  rules?: Record<string, unknown>;
  secondaryEffect?: string;
  tooltip?: GemTooltip;
  secondaryTooltip?: GemTooltip;
}
export interface SkillGroup { id: string; name: string; activeId: string; supportIds: string[] }
export interface SkillGroupsSave { version: 1; groups: SkillGroup[] }
export interface SkillsData { gems: Gem[]; artworkStatus: string }
