<script lang="ts">
  /**
   * Reactions — 👍🔥❤️ tallies for a target (post/project). v1 = STATIC counts
   * (read on load, optimistic bump on click; realtime deferred). Dedup is
   * enforced server-side by a unique (sessionHash,targetId,emoji) index; we
   * also remember locally so the UI reflects "already reacted". Fail-soft.
   */
  import { onMount } from 'svelte';

  let { targetType = 'post', targetId } = $props<{ targetType?: string; targetId: string }>();

  // Talks to the same-origin proxy (/api/reactions), NOT Pocketbase directly —
  // PB is private. The server stamps the real per-user sessionHash (from the
  // forwarded client IP), so dedup is server-owned; localStorage just reflects
  // "already reacted" in this browser's UI.
  const EMOJIS = [
    { key: 'thumbsup', char: '👍', label: 'thumbs up' },
    { key: 'fire', char: '🔥', label: 'fire' },
    { key: 'heart', char: '❤️', label: 'love' },
  ];

  let counts = $state<Record<string, number>>({ thumbsup: 0, fire: 0, heart: 0 });
  let mine = $state<Set<string>>(new Set());
  let ready = $state(false);

  const q = () => `targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`;

  async function load() {
    try {
      const r = await fetch(`/api/reactions?${q()}`);
      if (!r.ok) throw new Error(`reactions ${r.status}`);
      counts = (await r.json()).counts as Record<string, number>;
      mine = new Set(JSON.parse(localStorage.getItem(`ryang.react.${targetId}`) || '[]'));
      ready = true;
    } catch { ready = false; }
  }

  async function react(emoji: string) {
    if (mine.has(emoji)) return;
    counts = { ...counts, [emoji]: (counts[emoji] ?? 0) + 1 }; // optimistic
    mine = new Set([...mine, emoji]);
    localStorage.setItem(`ryang.react.${targetId}`, JSON.stringify([...mine]));
    try {
      const r = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, emoji }),
      });
      if (!r.ok) throw new Error(`reactions ${r.status}`);
    } catch {
      // revert optimistic bump on failure (offline/backend)
      counts = { ...counts, [emoji]: Math.max(0, (counts[emoji] ?? 1) - 1) };
    }
  }

  onMount(load);
</script>

<div class="flex gap-2 font-mono">
  {#each EMOJIS as e (e.key)}
    <button type="button" onclick={() => react(e.key)} disabled={mine.has(e.key)}
            aria-label={`React ${e.label} (${counts[e.key] ?? 0})`}
            aria-pressed={mine.has(e.key)}
            class="rounded-theme border px-3 py-1.5 text-sm transition hover:opacity-80"
            style="background:var(--panel);border-color:{mine.has(e.key) ? 'var(--accent)' : 'var(--border)'};color:var(--text)">
      <span aria-hidden="true">{e.char}</span> <span style="color:var(--muted)">{counts[e.key] ?? 0}</span>
    </button>
  {/each}
</div>
