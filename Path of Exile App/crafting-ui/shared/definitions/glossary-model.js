// This library is reusable by cards/tree; it does not alter any UI on import.
export function conciseDefinition(text) {
  text=(typeof text === 'string' ? text : '').replace(' This is the base skill description; an item’s granted level and special modifiers can change its values.','').trim();
  const sentences=text.match(/.*?[.!?](?=\s+[A-Z]|$)|.+$/gs)||[text];
  let result=sentences[0]?.trim()||'';
  if(sentences[1] && (result+' '+sentences[1].trim()).length<=340)result+=' '+sentences[1].trim();
  return result;
}
export function createGlossary(data) {
  const byId = new Map();
  for (const entry of data.entries) {
    if (!entry.id || byId.has(entry.id) || !Array.isArray(entry.aliases)) throw Error('Invalid glossary entry');
    byId.set(entry.id,entry);
  }
  const eligible = data.entries.filter(e => (e.status==='reviewed' || ['source-description','source-excerpt'].includes(e.matchingApproval)) && e.tooltipEligible && e.definition);
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const compiled = new Map();
  return {
    get: id => byId.get(id),
    search: query => data.entries.filter(e => [e.name,...e.aliases,e.definition].join(' ').toLowerCase().includes(query.toLowerCase())),
    match(text, context) {
      const hits=[];
      for (const entry of eligible) {
        if (!entry.contexts.includes(context.surface)) continue;
        if (entry.fields && !entry.fields.includes(context.field)) continue;
        if (entry.recordIds && !entry.recordIds.includes(context.record)) continue;
        for (const alias of entry.aliases) {
          if (!alias) continue;
          const regex = compiled.get(alias) || new RegExp(`(?<![\\p{L}\\p{N}_])${escape(alias)}(?![\\p{L}\\p{N}_])`,'giu');
          compiled.set(alias,regex);
          for (const match of text.matchAll(regex)) {
            if(entry.namedSkillOnly && !/grants?(?: level \d+)?\s*$/i.test(text.slice(0,match.index)) && !/^\s+(?:support|skill)\b/i.test(text.slice(match.index+match[0].length)))continue;
            hits.push({start:match.index,end:match.index+match[0].length,id:entry.id,text:match[0]});
          }
        }
      }
      // Prefer the longest overlapping phrase. Equal ambiguous matches are withheld.
      hits.sort((a,b)=>(b.end-b.start)-(a.end-a.start)||a.start-b.start||a.id.localeCompare(b.id));
      const ambiguous=hits.filter(hit=>hits.some(other=>other.id!==hit.id && other.start===hit.start && other.end===hit.end));
      const chosen=[];
      for (const hit of hits) {
        if (ambiguous.some(other=>hit.start<other.end && other.start<hit.end)) continue;
        if (!chosen.some(other=>hit.start<other.end && other.start<hit.end)) chosen.push(hit);
      }
      return chosen.sort((a,b)=>a.start-b.start);
    },
  };
}
