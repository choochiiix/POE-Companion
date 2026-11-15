const pending = new Map<string, Promise<unknown>>();
/** Same-origin offline resources. Failed reads can be retried; successful datasets are shared. */
export function fetchJson<T>(path: string): Promise<T> {
  if (!pending.has(path)) pending.set(path, fetch(path).then(async response => { if (!response.ok) throw new Error(`Unable to load ${path} (${response.status})`); return response.json(); }).catch(error => { pending.delete(path); throw error; }));
  return pending.get(path) as Promise<T>;
}
