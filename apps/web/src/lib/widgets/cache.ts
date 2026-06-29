/**
 * Tiny in-process TTL cache for server-side widget fetches. Keeps API tokens on
 * the server and avoids hammering upstreams on every render. Process-local;
 * fine for a single-box self-host.
 */
type Entry<T> = { value: T; until: number };
const store = new Map<string, Entry<unknown>>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.until > now) return hit.value;
  const value = await fn();
  store.set(key, { value, until: now + ttlMs });
  return value;
}
