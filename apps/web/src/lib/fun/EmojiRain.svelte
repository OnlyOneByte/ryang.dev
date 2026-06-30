<script lang="ts">
  /**
   * Type a tech name anywhere (not in an input) and it rains the matching
   * mascot: rust→🦀, postgres→🐘, docker→🐳, go→a tiny SVG gopher (no Unicode
   * gopher exists), etc. A rolling keystroke buffer matches the trigger words.
   *
   * Respects prefers-reduced-motion (no animation — a brief centered glyph
   * instead), mirroring UnlockToast's confetti guard. Pure whimsy, no deps.
   */
  import { onMount } from 'svelte';

  // trigger word → mascot (emoji string, or 'gopher' for the inline SVG)
  const TRIGGERS: Record<string, string> = {
    rust: '🦀',
    postgres: '🐘',
    postgresql: '🐘',
    docker: '🐳',
    go: 'gopher',
    golang: 'gopher',
    bun: '🥟',
    svelte: '🧡',
    astro: '🚀',
    typescript: '🔷',
    linux: '🐧',
    coffee: '☕',
  };
  const MAX_TRIGGER_LEN = Math.max(...Object.keys(TRIGGERS).map((k) => k.length));

  // base64 of a tiny gopher-ish SVG (Go blue), used as a falling <img>.
  const GOPHER =
    'data:image/svg+xml;base64,' +
    btoa(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">` +
        `<ellipse cx="16" cy="18" rx="9" ry="11" fill="#00ADD8"/>` +
        `<circle cx="9" cy="6" r="3.5" fill="#00ADD8"/><circle cx="23" cy="6" r="3.5" fill="#00ADD8"/>` +
        `<circle cx="12" cy="14" r="3" fill="#fff"/><circle cx="20" cy="14" r="3" fill="#fff"/>` +
        `<circle cx="12.5" cy="14.5" r="1.3" fill="#000"/><circle cx="20.5" cy="14.5" r="1.3" fill="#000"/>` +
        `<rect x="14" y="17" width="4" height="3" rx="1.5" fill="#fff"/>` +
      `</svg>`
    );

  let reduced = false;

  function rain(mascot: string) {
    if (reduced) {
      // reduced-motion: a single brief centered glyph, no falling animation
      const tag = document.createElement('div');
      tag.setAttribute('aria-hidden', 'true');
      tag.style.cssText =
        'position:fixed;inset:0;display:grid;place-items:center;pointer-events:none;z-index:200;font-size:64px;opacity:.9';
      tag.append(glyph(mascot, 64));
      document.body.appendChild(tag);
      setTimeout(() => tag.remove(), 900);
      return;
    }
    const n = 24;
    const root = document.createElement('div');
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:200;overflow:hidden';
    for (let i = 0; i < n; i++) {
      const el = glyph(mascot, 22 + (i % 4) * 8) as HTMLElement;
      const left = (i / n) * 100 + (i % 3);
      const delay = (i % 8) * 60;
      const dur = 1600 + (i % 6) * 220;
      el.style.cssText +=
        `;position:absolute;top:-40px;left:${left}vw;` +
        `animation:confetti-fall ${dur}ms ${delay}ms ease-in forwards`;
      root.appendChild(el);
    }
    document.body.appendChild(root);
    setTimeout(() => root.remove(), 3200);
  }

  function glyph(mascot: string, size: number): HTMLElement {
    if (mascot === 'gopher') {
      const img = document.createElement('img');
      img.src = GOPHER;
      img.width = size; img.height = size;
      return img;
    }
    const span = document.createElement('span');
    span.textContent = mascot;
    span.style.fontSize = `${size}px`;
    span.style.lineHeight = '1';
    return span;
  }

  onMount(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let buf = '';
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.length !== 1 || !/[a-z]/i.test(e.key)) return;
      buf = (buf + e.key.toLowerCase()).slice(-MAX_TRIGGER_LEN);
      for (const word of Object.keys(TRIGGERS)) {
        if (buf.endsWith(word)) {
          rain(TRIGGERS[word]);
          buf = ''; // consume so "postgresql" doesn't also fire "postgres"+"go"
          break;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>
