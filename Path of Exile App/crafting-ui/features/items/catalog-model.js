export function parseMod(text){const ranges=[];const key=text.replace(/\((-?\d+(?:\.\d+)?)-(-?\d+(?:\.\d+)?)\)|[+-]?\d+(?:\.\d+)?/g,(raw,a,b)=>{ranges.push({min:Number(a??raw),max:Number(b??raw)});return '#';});return {text,key,ranges};}
export function indexItems(items){return items.map(i=>({...i,search:[i.name,i.baseType,i.itemClass,i.category,i.variant,i.flavorText,...i.implicit.map(m=>m.text),...i.explicit.map(m=>m.text)].join(' ').toLowerCase()}));}
export function groupVariants(items, selections = new Map()) {
 const groups = new Map();
 for (const item of items) {
  if (!groups.has(item.family)) groups.set(item.family, []);
  groups.get(item.family).push(item);
 }
 return [...groups.values()].map(variants => ({
  variants,
  item: variants.find(i => i.id === selections.get(i.family))
   ?? variants.find(i => i.variant === 'Current')
   ?? variants.find(i => !i.legacy)
   ?? variants.at(-1),
 }));
}
