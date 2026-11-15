export interface ItemModifier { text: string; key: string; ranges: { min: number; max: number }[]; unparsed?: boolean }
export interface CatalogItem {
  id: string; name: string; baseType: string; category: string; itemClass: string;
  family: string; baseId?: string; level: number; variant?: string; legacy?: boolean;
  requirementsKnown?: boolean; requirements: Record<string, number>;
  implicit: ItemModifier[]; explicit: ItemModifier[]; stats: Record<string, string | number>;
  flavorText?: string; search?: string;
}
export interface CatalogData {
  bases: CatalogItem[]; uniques: CatalogItem[];
  report: { definitions: number; diagnostics: unknown[]; limitations: string[]; missingFlavor: number };
}
export interface ArtworkData { items: Record<string, { file: string; width: number; height: number }> }
