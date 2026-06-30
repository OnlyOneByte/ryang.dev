/**
 * Single source of truth for the scavenger-hunt fragments (egg #5).
 *
 * Imported by EVERY discovery surface, the completion check, the /secret gate,
 * and the regression test — so the set is defined ONCE (same discipline as the
 * resume public-section allowlist). Changing this list changes the whole hunt.
 *
 * Fragment ids are short, stable tokens. They are NOT secret (they ship in the
 * client) — the hunt is honor-system whimsy, not a security boundary.
 */
export const FRAGMENT_IDS = [
  'console', // devtools console banner
  'colophon', // hidden node in the colophon diagram
  'terminal', // `find flag` / `cat /flag` in the shell
  'game404', // beat a score in the 404 mini-game
  'konami', // unlock the fun themes
  'selection', // zero-width run in a blog post, revealed by selecting text
  'header', // X-Egg response header
] as const;

export type FragmentId = (typeof FRAGMENT_IDS)[number];

export const FRAGMENT_COUNT = FRAGMENT_IDS.length;

/**
 * Claim tokens for the PASSIVE-discovery fragments — you find a token (printed
 * in the console, carried in a response header) and claim it by typing
 * `egg <token>` in the shell. The ACTION fragments (terminal/colophon/game404/
 * konami/selection) auto-claim when you do the thing, so they're not here.
 * Tokens are deliberately guessable-ish words; the hunt is for fun, not secrecy.
 */
export const CLAIM_TOKENS: Record<string, FragmentId> = {
  inspect: 'console', // printed in the devtools console banner
  forwarded: 'header', // value of the X-Egg response header
};

/** True only when every fragment id has been collected. */
export function isComplete(found: Iterable<string>): boolean {
  const set = found instanceof Set ? found : new Set(found);
  return FRAGMENT_IDS.every((id) => set.has(id));
}
