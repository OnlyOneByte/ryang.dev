/**
 * Konami-code detector + sticky unlock for the "fun" themes.
 *
 * Desktop: ↑ ↑ ↓ ↓ ← → ← → B A
 * Mobile:  tap the footer status dot 7× (wire tapUnlock() to that element)
 *
 * On unlock: persists to localStorage and dispatches a 'themes-unlocked'
 * CustomEvent that the ThemeSwitcher listens for to re-render its list.
 */
import { FUN_THEME_IDS } from '@/styles/themes';

const KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];
const LS_KEY = 'ryang.unlocked';

export function getUnlocked(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(LS_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function persist(set: Set<string>): void {
  localStorage.setItem(LS_KEY, JSON.stringify([...set]));
  window.dispatchEvent(new CustomEvent('themes-unlocked', { detail: [...set] }));
}

/** Unlock every fun theme at once. Idempotent. */
export function unlockFunThemes(): void {
  const set = getUnlocked();
  let changed = false;
  for (const id of FUN_THEME_IDS) {
    if (!set.has(id)) { set.add(id); changed = true; }
  }
  if (changed) persist(set);
}

/** Attach the keyboard listener. Returns a cleanup fn. */
export function initKonami(): () => void {
  let buf: string[] = [];
  const onKey = (e: KeyboardEvent) => {
    buf.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (buf.length > KONAMI.length) buf = buf.slice(-KONAMI.length);
    if (buf.length === KONAMI.length && KONAMI.every((k, i) => buf[i] === k)) {
      unlockFunThemes();
      buf = [];
    }
  };
  window.addEventListener('keydown', onKey);
  // Console breadcrumb for the curious.
  console.log('%c// try the classic code ↑↑↓↓←→←→ B A', 'color:#00e5ff');
  return () => window.removeEventListener('keydown', onKey);
}

/** Mobile fallback: call on each tap of the footer status dot. */
let taps = 0;
let tapTimer: ReturnType<typeof setTimeout> | undefined;
export function tapUnlock(): void {
  taps += 1;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => (taps = 0), 1500);
  if (taps >= 7) {
    unlockFunThemes();
    taps = 0;
  }
}
