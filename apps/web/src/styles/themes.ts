/**
 * Theme registry — single source of truth for the switcher.
 * Tokens themselves live in tokens.css ([data-theme="<id>"] blocks).
 *
 * tier:   1 = pure palette · 2 = palette + structural tokens · 3 = layout mode
 * locked: true → hidden until the Konami code (or 7× footer-dot tap) unlocks it
 * group:  core (always shown) · fun (Konami) · mode (layout reshape, post-v1)
 */
export type Tier = 1 | 2 | 3;
export type ThemeGroup = 'core' | 'fun' | 'mode';

export interface Theme {
  id: string;
  name: string;
  tier: Tier;
  locked: boolean;
  group: ThemeGroup;
}

export const DEFAULT_THEME = 'cyberpunk';

/** All fun themes unlock together on a single Konami code. */
export const THEMES: Theme[] = [
  // --- core (always visible) ---
  { id: 'cyberpunk',     name: 'Cyberpunk',      tier: 1, locked: false, group: 'core' },
  { id: 'dark-dev',      name: 'Dark Dev',       tier: 1, locked: false, group: 'core' },
  { id: 'light',         name: 'Light',          tier: 1, locked: false, group: 'core' },
  { id: 'glass',         name: 'Glass / Aurora', tier: 1, locked: false, group: 'core' },
  { id: 'solarpunk',     name: 'Solarpunk',      tier: 1, locked: false, group: 'core' },
  { id: 'blueprint',     name: 'Blueprint',      tier: 2, locked: false, group: 'core' },
  { id: 'brutalist',     name: 'Brutalist',      tier: 2, locked: false, group: 'core' },
  { id: 'neo-brutalist', name: 'Neo-Brutalist',  tier: 2, locked: false, group: 'core' },

  // --- fun (Konami-unlockable) ---
  { id: 'vaporwave',     name: 'CRT / Vaporwave', tier: 1, locked: true, group: 'fun' },
  { id: 'y2k',           name: 'Y2K / Web 1.0',   tier: 2, locked: true, group: 'fun' },
  { id: 'claymorphism',  name: 'Claymorphism',    tier: 1, locked: true, group: 'fun' },
  { id: 'zine',          name: 'Zine / Cut-Paste', tier: 3, locked: true, group: 'fun' },

  // --- mode (layout reshape; post-v1, also gated) ---
  { id: 'tui',           name: 'Terminal / TUI', tier: 3, locked: true, group: 'mode' },
  { id: 'bento',         name: 'Bento Grid',     tier: 3, locked: true, group: 'mode' },
  { id: 'editorial',     name: 'Editorial',      tier: 3, locked: true, group: 'mode' },
];

export const FUN_THEME_IDS = THEMES.filter((t) => t.group === 'fun').map((t) => t.id);
export const THEME_IDS = THEMES.map((t) => t.id);

export function isValidTheme(id: string | undefined | null): id is string {
  return !!id && THEME_IDS.includes(id);
}

/** Themes the switcher should show given the set of unlocked ids. */
export function visibleThemes(unlocked: Set<string>): Theme[] {
  return THEMES.filter((t) => !t.locked || unlocked.has(t.id));
}
