<script lang="ts">
  /**
   * Listens for the 'themes-unlocked' event (fired by konami.ts) and shows a
   * toast + a lightweight confetti burst. Both respect prefers-reduced-motion:
   * confetti is skipped and the toast simply fades for reduced-motion users.
   */
  import { onMount } from 'svelte';

  let show = $state(false);
  let reduced = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function burst() {
    if (reduced) return;
    const n = 80;
    const root = document.createElement('div');
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText =
      'position:fixed;inset:0;pointer-events:none;z-index:200;overflow:hidden';
    const colors = ['var(--accent)', 'var(--accent-2)', 'var(--ok)', 'var(--warn)'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('span');
      const size = 6 + Math.floor((i % 4) * 2);
      const left = (i / n) * 100;
      const delay = (i % 10) * 30;
      const dur = 1400 + (i % 7) * 160;
      p.style.cssText = `position:absolute;top:-12px;left:${left}vw;width:${size}px;height:${size}px;background:${colors[i % colors.length]};opacity:.9;border-radius:${i % 2 ? '50%' : '1px'};animation:confetti-fall ${dur}ms ${delay}ms ease-in forwards`;
      root.appendChild(p);
    }
    document.body.appendChild(root);
    setTimeout(() => root.remove(), 2800);
  }

  onMount(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onUnlock = () => {
      show = true;
      burst();
      clearTimeout(timer);
      timer = setTimeout(() => (show = false), 5000);
    };
    window.addEventListener('themes-unlocked', onUnlock);
    return () => window.removeEventListener('themes-unlocked', onUnlock);
  });
</script>

{#if show}
  <div
    role="status"
    aria-live="polite"
    class="fixed bottom-24 left-1/2 z-[201] -translate-x-1/2 rounded-theme border px-4 py-3 font-mono text-sm shadow-lg"
    style="background:var(--panel);border-color:var(--accent);color:var(--text);box-shadow:0 0 24px color-mix(in srgb, var(--accent) 40%, transparent)"
  >
    🎉 Secret themes unlocked! Open the theme switcher
    <span style="color:var(--accent)">(⌘K → "Theme")</span>
  </div>
{/if}
