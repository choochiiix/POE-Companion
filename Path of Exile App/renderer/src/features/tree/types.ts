export interface TreeNode {
  id: string;
  name: string;
  x: number;
  y: number;
  group: string;
  orbit?: number;
  links: Set<string>;
  search: string;
  icon?: string;
  inactiveIcon?: string;
  activeIcon?: string;
  activeEffectImage?: string;
  classStartIndex?: number;
  ascendancyName?: string;
  isAscendancyStart?: boolean;
  isNotable?: boolean;
  isMastery?: boolean;
  isKeystone?: boolean;
  isJewelSocket?: boolean;
  isMultipleChoiceOption?: boolean;
  expansionJewel?: {size: number};
  stats?: string[];
  reminderText?: string[];
  masteryEffects?: {effect: number; stats: string[]}[];
}

export interface TreeGroup {
  x: number;
  y: number;
  isProxy?: boolean;
  background?: {image: string; isHalfImage?: boolean};
}

export interface TreeData {
  nodes: Record<string, unknown>;
  groups: Record<string, TreeGroup>;
  constants: {orbitRadii: number[]};
  classes: {name: string; ascendancies: {id: string; name: string}[]}[];
  alternate_ascendancies?: {id: string; name: string}[];
}

export interface TreeSnapshot {selected: string[]; masteries: Record<string, string>}
