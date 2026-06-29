#!/usr/bin/env bun
/**
 * WCAG contrast gate. Parses src/styles/tokens.css, and for every theme block
 * checks the load-bearing color pairs against WCAG AA:
 *   - text   on bg     >= 4.5  (normal body text)
 *   - text   on panel  >= 4.5
 *   - muted  on bg     >= 3.0  (secondary/large text — relaxed to AA-large)
 *   - accent-ink on accent >= 4.5  (button label legibility — the footgun)
 *
 * Exits non-zero (failing CI/build) if any pair is below threshold, printing
 * exactly which theme/pair/ratio failed. rgba()/color-mix tokens are skipped
 * with a logged note (can't statically resolve alpha over an unknown backdrop).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = join(here, '..', 'src', 'styles', 'tokens.css');
const css = readFileSync(cssPath, 'utf8');

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB | null {
  const h = hex.trim().replace('#', '');
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16),
    ];
  }
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  return null;
}

function luminance([r, g, b]: RGB): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function ratio(a: RGB, b: RGB): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Parse each [data-theme='id'] { ... } block (and the :root cyberpunk default).
const blocks = [...css.matchAll(/(?:\[data-theme='([\w-]+)'\][^{]*|:root[^{]*)\{([^}]+)\}/g)];

interface Pair { fg: string; bg: string; min: number; }
const PAIRS: Pair[] = [
  { fg: 'text', bg: 'bg', min: 4.5 },
  { fg: 'text', bg: 'panel', min: 4.5 },
  { fg: 'muted', bg: 'bg', min: 3.0 },
  { fg: 'accent-ink', bg: 'accent', min: 4.5 },
];

let failures = 0;
let skipped = 0;
const seen = new Set<string>();

for (const [, idMaybe, body] of blocks) {
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    vars[m[1].trim()] = m[2].trim();
  }
  // The :root block has no capture group 1; it's the cyberpunk default.
  const id = idMaybe || 'cyberpunk';
  if (seen.has(id)) continue;
  seen.add(id);

  for (const { fg, bg, min } of PAIRS) {
    const fgv = vars[fg];
    const bgv = vars[bg];
    if (!fgv || !bgv) continue;
    const fgRgb = hexToRgb(fgv);
    const bgRgb = hexToRgb(bgv);
    if (!fgRgb || !bgRgb) {
      // rgba()/color-mix/var() — can't statically resolve; note and skip.
      skipped++;
      continue;
    }
    const r = ratio(fgRgb, bgRgb);
    if (r < min) {
      failures++;
      console.error(
        `✘ ${id}: ${fg}-on-${bg} = ${r.toFixed(2)} (needs >= ${min})`
      );
    }
  }
}

console.log(
  `contrast gate: ${seen.size} themes checked, ${failures} failure(s), ${skipped} pair(s) skipped (non-hex tokens)`
);
process.exit(failures > 0 ? 1 : 0);
