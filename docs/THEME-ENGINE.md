# Theme Engine

15 visual themes, switchable at runtime. **Cyberpunk is the default** (always —
not OS-derived). 11 are open palette themes; the playful 4 are **Konami-code
unlockable**. The engine is a pure CSS-variable (design-token) swap — switching
themes sets one `data-theme` attribute on `<html>`; no component re-render, no
rebuild.

## 1. Token taxonomy — the contract every theme implements

Every theme MUST define this exact token set. Components read **only** these
variables, never raw hex.

```css
:root {
  /* surface */
  --bg --panel --panel-2 --border
  /* text */
  --text --muted --text-strong
  /* brand */
  --accent --accent-2 --accent-ink   /* --accent-ink = readable text ON --accent */
  /* status */
  --ok --warn --danger --info
  /* shape & motion */
  --radius --border-width --shadow
  --font-sans --font-mono --font-display
  /* effects (opt-in; default neutral) */
  --scanlines --glow
}
```

`--accent-ink` is load-bearing: it prevents "white text on a yellow button" by
letting each theme declare the readable color for its own accent.

## 2. Theme registry

`apps/web/src/styles/themes.ts`:

```ts
export type Tier = 1 | 2 | 3;
export interface Theme {
  id: string; name: string; tier: Tier;
  locked: boolean;            // true → behind Konami
  group: 'core' | 'fun' | 'mode';
}
```

| Theme | tier | locked | group |
|---|---|---|---|
| **cyberpunk** (default) | 1 | no | core |
| dark-dev | 1 | no | core |
| light | 1 | no | core |
| glass | 1 | no | core |
| solarpunk | 1 | no | core |
| blueprint | 2 | no | core |
| brutalist | 2 | no | core |
| neo-brutalist | 2 | no | core |
| **vaporwave** | 1 | yes | fun |
| **y2k** | 2 | yes | fun |
| **claymorphism** | 1 | yes | fun |
| **zine** | 3 | yes | fun |
| tui | 3 | yes | mode |
| bento | 3 | yes | mode |
| editorial | 3 | yes | mode |

Switcher renders `themes.filter(t => !t.locked || unlocked.has(t.id))`.

### Tiers (effort, not quality)

- **Tier 1** — pure palette swap (color/shadow/radius tokens only).
- **Tier 2** — palette + structural tokens (`--border-width`, `--shadow`, fonts).
- **Tier 3** — reshape DOM (layout variants): `tui`, `bento`, `zine`, `editorial`.
  These are "modes", added incrementally post-v1.

**v1 ships Tier 1 + Tier 2** (the 11 palette themes). Tier-3 modes follow later.

## 3. Konami unlock

```
keydown buffer (last 10) === [↑ ↑ ↓ ↓ ← → ← → B A]
   → add all `fun` themes to unlockedSet
   → persist set to localStorage ("ryang.unlocked")
   → toast: "Secret themes unlocked! Open the theme switcher (⌘K)"
   → confetti/glitch (respecting prefers-reduced-motion)
   → switcher re-renders with the new themes visible
```

- **Sticky**: once unlocked, localStorage remembers it forever (per browser).
- **All-at-once**: one code unlocks all fun themes (simpler, more satisfying).
- **Mobile fallback**: Konami needs a keyboard — tap the footer status dot
  (`9/9`) **7×** to unlock on touch devices.
- **Breadcrumb**: a faint `// try the classic code ↑↑↓↓…` console hint.

## 4. Persistence + no-flash SSR

Two storage keys, two jobs:

- **`theme` → cookie** — Astro reads it server-side and renders the correct
  `data-theme` on `<html>` during SSR.
- **`ryang.unlocked` → localStorage** — client-only (SSR doesn't need it).

No-flash inline `<head>` script (runs before first paint):

```html
<script>
  document.documentElement.dataset.theme =
    (document.cookie.match(/(?:^|;\s*)theme=([\w-]+)/)?.[1]) || 'cyberpunk';
</script>
```

Astro already wrote `data-theme` from the cookie server-side; this reconciles
before hydration → correct theme on the first painted frame.

## 5. Edge cases

| Case | Decision |
|---|---|
| Cookie names a locked theme but unlock flag is absent | Fall back to `cyberpunk` |
| `prefers-reduced-motion` | `--scanlines:0`, no confetti, no glow animation |
| First-ever visit | **Always Cyberpunk** (brand), never OS-derived |
| Recruiter `/private` + `/unlock` pages | Locked to a legible theme (cyberpunk/light) so a skin never hurts CV readability |
| Accessibility | Every theme's `--text`/`--bg` pair MUST clear WCAG AA; a build check fails a theme that doesn't |

## 6. Files

```
apps/web/src/styles/tokens.css   :root + [data-theme="…"] blocks (15 sets)
apps/web/src/styles/themes.ts    registry (tier, locked, group)
apps/web/src/lib/theme/store.ts  current theme + unlockedSet, cookie/LS sync
apps/web/src/lib/theme/konami.ts keydown buffer + unlock event
apps/web/src/lib/theme/ThemeSwitcher  nav dropdown (+ ⌘K palette actions)
apps/web/src/layouts/head.astro  the no-flash inline script
```
