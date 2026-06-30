/**
 * Client-side scavenger-hunt progress (egg #5). localStorage-backed, dispatches
 * events the toast + completion flow listen for. Browser-only — guards for SSR.
 *
 * On full completion it POSTs to /api/egg/complete, which sets a signed cookie
 * the /secret route trusts (localStorage alone isn't trusted server-side).
 */
import { FRAGMENT_IDS, FRAGMENT_COUNT, isComplete, type FragmentId } from './fragments';

const LS_KEY = 'ryang.eggs';

export function foundSet(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

/**
 * Record a fragment find. No-ops if already found or id is unknown. Dispatches
 * 'egg-found' (detail: {id, count, total}); fires 'egg-complete' + notifies the
 * server when the full set is collected.
 */
export function findFragment(id: FragmentId): void {
  if (typeof window === 'undefined') return;
  if (!FRAGMENT_IDS.includes(id)) return; // ignore typos/unknown ids
  const set = foundSet();
  if (set.has(id)) return;
  set.add(id);
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
  window.dispatchEvent(
    new CustomEvent('egg-found', { detail: { id, count: set.size, total: FRAGMENT_COUNT } })
  );
  if (isComplete(set)) {
    window.dispatchEvent(new CustomEvent('egg-complete'));
    // Tell the server so /secret unlocks across reloads (best-effort).
    void fetch('/api/egg/complete', { method: 'POST' }).catch(() => {});
  }
}

export { FRAGMENT_COUNT, isComplete };
