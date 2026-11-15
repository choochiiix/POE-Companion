export interface EffectVariant {
  source: string; name?: string; id: string; template?: string; item?: string; radiusMetres?: number;
  lines?: string[]; stats?: Record<string, unknown>;
}
export interface GlossaryEntry {
  id: string; name: string; aliases: string[]; definition: string; kind: string; status: string;
  category?: string; icon?: string; buffId?: string; invisible?: boolean; stackLimit?: number;
  statIds?: string[]; stats?: string[]; effectVariants?: EffectVariant[];
  references: { surface: string; record: string; field: string }[];
  sources: { url?: string; path?: string; record?: string; revision?: number; license?: string }[];
  wikiContext?: { revision?: number; title: string; summary: string; mechanics?: string[]; url: string; license: string };
}
export interface GlossaryData { entries: GlossaryEntry[] }
