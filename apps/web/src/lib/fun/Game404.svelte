<script lang="ts">
  /**
   * 404 mini-game: a tiny "catch the falling bytes" game on a canvas. Move with
   * ← → or pointer. Pure client island, no deps. Respects reduced-motion (shows
   * a static message + link instead of animating).
   */
  import { onMount } from 'svelte';
  import { findFragment } from '@/lib/eggs/store';
  import { unlockFunThemes } from '@/lib/theme/konami';

  let canvas: HTMLCanvasElement;
  let score = $state(0);
  let reduced = false;
  const EGG_SCORE = 10; // 🧩 catch this many bytes → claim the game404 fragment
  export const UNLOCK_THRESHOLD = 30; // catch this many → unlock the fun themes
  const SUBMIT_THRESHOLD = 5; // offer leaderboard submission past this

  let unlocked = $state(false);
  let initials = $state('');
  let submitState = $state<'idle' | 'sending' | 'pending' | 'error'>('idle');

  async function submitScore() {
    if (submitState === 'sending') return;
    submitState = 'sending';
    try {
      const r = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initials, score }),
      });
      submitState = r.ok ? 'pending' : 'error';
    } catch {
      submitState = 'error';
    }
  }

  onMount(() => {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const ctx = canvas.getContext('2d')!;
    const W = (canvas.width = 480), H = (canvas.height = 280);
    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue('--accent').trim() || '#00e5ff';
    const accent2 = css.getPropertyValue('--accent-2').trim() || '#ff2e88';
    const text = css.getPropertyValue('--text').trim() || '#fff';

    let paddle = W / 2;
    const drops: { x: number; y: number; v: number }[] = [];
    let raf = 0, last = 0, spawn = 0, alive = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') paddle = Math.max(20, paddle - 24);
      if (e.key === 'ArrowRight') paddle = Math.min(W - 20, paddle + 24);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      paddle = Math.max(20, Math.min(W - 20, ((e.clientX - r.left) / r.width) * W));
    };
    window.addEventListener('keydown', onKey);
    canvas.addEventListener('pointermove', onMove);

    function frame(t: number) {
      if (!alive) return;
      const dt = Math.min(48, t - last); last = t;
      spawn += dt;
      if (spawn > 700) { spawn = 0; drops.push({ x: 20 + Math.random() * (W - 40), y: -10, v: 0.12 + Math.random() * 0.1 }); }
      ctx.clearRect(0, 0, W, H);
      // paddle
      ctx.fillStyle = accent;
      ctx.fillRect(paddle - 28, H - 16, 56, 8);
      // drops
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]; d.y += d.v * dt;
        ctx.fillStyle = accent2;
        ctx.font = '14px monospace';
        ctx.fillText('01', d.x, d.y);
        if (d.y > H - 18 && d.y < H && Math.abs(d.x - paddle) < 34) {
          score += 1;
          if (score === EGG_SCORE) findFragment('game404'); // 🧩
          if (score === UNLOCK_THRESHOLD && !unlocked) { unlocked = true; unlockFunThemes(); } // bonus themes
          drops.splice(i, 1);
        }
        else if (d.y > H) { drops.splice(i, 1); }
      }
      ctx.fillStyle = text;
      ctx.font = '12px monospace';
      ctx.fillText(`caught: ${score}`, 10, 18);
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      alive = false; cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointermove', onMove);
    };
  });
</script>

{#if reduced}
  <p class="font-mono text-sm" style="color:var(--muted)">
    (Animation off — respecting your reduced-motion setting.)
  </p>
{:else}
  <canvas bind:this={canvas}
          class="mt-4 w-full rounded-theme border"
          style="border-color:var(--border);background:var(--panel);touch-action:none;max-width:480px"
          aria-label="Catch the falling bytes mini-game. Move with arrow keys."></canvas>
  <p class="mt-2 font-mono text-xs" style="color:var(--muted)">← → or move your cursor to catch the bytes.</p>

  {#if unlocked}
    <p class="mt-2 font-mono text-xs" style="color:var(--accent)">🎉 bonus themes unlocked! (⌘K → "Theme")</p>
  {/if}

  {#if score >= SUBMIT_THRESHOLD}
    <div class="mt-3 flex flex-wrap items-center gap-2 font-mono text-xs" style="color:var(--muted)">
      {#if submitState === 'pending'}
        <span style="color:var(--ok)">submitted — appears on the board once approved.</span>
      {:else if submitState === 'error'}
        <span style="color:var(--warn)">couldn't submit (backend offline). score still counts locally.</span>
      {:else}
        <span>score {score} — add to the leaderboard:</span>
        <input bind:value={initials} maxlength="3" placeholder="AAA"
               class="w-16 rounded-theme border bg-transparent px-2 py-0.5 uppercase outline-none"
               style="border-color:var(--border);color:var(--text)"
               aria-label="your initials (3 letters)" />
        <button onclick={submitScore} disabled={submitState === 'sending'}
                class="rounded-theme border px-2 py-0.5"
                style="border-color:var(--accent);color:var(--accent)">
          {submitState === 'sending' ? '…' : 'submit'}
        </button>
      {/if}
    </div>
  {/if}
{/if}
