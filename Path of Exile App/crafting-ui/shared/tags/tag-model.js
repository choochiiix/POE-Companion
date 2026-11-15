// Source namespaces are deliberately distinct. No implicit cross-source aliases.
export function indexTags(catalog) {
  const entries = new Map(catalog.tags.map(tag => [tag.key, tag]));
  return {
    get: (namespace, id) => entries.get(`${namespace}:${id}`),
    search: (query = '', namespace = '') => catalog.tags.filter(tag =>
      (!namespace || tag.namespace === namespace) &&
      query.toLowerCase().trim().split(/\s+/).every(word => `${tag.id} ${tag.namespace}`.toLowerCase().includes(word))),
  };
}
