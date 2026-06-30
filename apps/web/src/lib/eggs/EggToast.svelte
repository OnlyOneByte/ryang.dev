<script lang="ts">
  /**
   * Scavenger-hunt progress toast. Listens for 'egg-found' (shows 🧩 N/total)
   * and 'egg-complete' (shows the reward link). Reduced-motion safe — it's just
   * a fading toast, no animation beyond opacity. Mirrors UnlockToast.
   */
  import { onMount } from 'svelte';
  import { findFragment } from './store';

  let show = $state(false);
  let msg = $state('');
  let done = $state(false);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function toast(text: string, complete = false) {
    msg = text;
    done = complete;
    show = true;
    clearTimeout(timer);
    timer = setTimeout(() => (show = false), complete ? 8000 : 3500);
  }

  onMount(() => {
    const onFound = (e: Event) => {
      const { count, total } = (e as CustomEvent).detail;
      toast(`🧩 fragment found — ${count}/${total}`);
    };
    const onComplete = () => toast('🧩 all fragments found! visit /secret', true);
    // 🧩 auto-claim on theme unlock (konami). themes-unlocked is fired by konami.ts.
    const onThemes = () => findFragment('konami');
    // 🧩 selection fragment: claim when the user selects text inside a
    // [data-egg="selection"] element (a faint marked sentence in a blog post).
    const onSelect = () => {
      const sel = document.getSelection();
      if (!sel || sel.isCollapsed || !sel.anchorNode) return;
      const el = (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement) as HTMLElement | null;
      if (el?.closest('[data-egg="selection"]')) findFragment('selection');
    };
    window.addEventListener('egg-found', onFound);
    window.addEventListener('egg-complete', onComplete);
    window.addEventListener('themes-unlocked', onThemes);
    document.addEventListener('selectionchange', onSelect);

    return () => {
      window.removeEventListener('egg-found', onFound);
      window.removeEventListener('egg-complete', onComplete);
      window.removeEventListener('themes-unlocked', onThemes);
      document.removeEventListener('selectionchange', onSelect);
    };
  });
</script>

{#if show}
  <div
    role="status"
    aria-live="polite"
    class="fixed bottom-6 left-1/2 z-[201] -translate-x-1/2 rounded-theme border px-4 py-3 font-mono text-sm shadow-lg"
    style="background:var(--panel);border-color:var(--accent);color:var(--text);box-shadow:0 0 24px color-mix(in srgb, var(--accent) 40%, transparent)"
  >
    {msg}
    {#if done}<a href="/secret" class="ml-1 underline" style="color:var(--accent)">open →</a>{/if}
  </div>
{/if}
