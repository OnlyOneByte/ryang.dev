<script lang="ts">
  /**
   * Reactions — 👍🔥❤️ tallies for a target (post/project). v1 = STATIC counts
   * (read on load, optimistic bump on click; realtime deferred). Dedup is
   * enforced server-side by a unique (sessionHash,targetId,emoji) index; we
   * also remember locally so the UI reflects "already reacted". Fail-soft.
   */
  import { onMount } from 'svelte';
  import PocketBase from 'pocketbase';
  import { publicEnv } from '@/lib/runtime-env';

  let { targetType = 'post', targetId } = $props<{ targetType?: string; targetId: string }>();

  // Runtime config (from /env.js → container env); build-time + hardcoded fallback.
  const PB = publicEnv('PUBLIC_PB_URL', 'https://pb.ryang.dev');
  const pb = new PocketBase(PB);
  const EMOJIS = [
    { key: 'thumbsup', char: '👍', label: 'thumbs up' },
    { key: 'fire', char: '🔥', label: 'fire' },
    { key: 'heart', char: '❤️', label: 'love' },
  ];

  let counts = $state<Record<string, number>>({ thumbsup: 0, fire: 0, heart: 0 });
  let mine = $state<Set<string>>(new Set());
  let ready = $state(false);

  // a stable-ish per-browser id for client dedup + sessionHash
  function sessionId(): string {
    let id = localStorage.getItem('ryang.sid');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('ryang.sid', id); }
    return id;
  }

  async function load() {
    try {
      const list = await pb.collection('reactions').getFullList({
        filter: pb.filter('targetType = {:tt} && targetId = {:tid}', { tt: targetType, tid: targetId }),
      });
      const c: Record<string, number> = { thumbsup: 0, fire: 0, heart: 0 };
      for (const r of list as any[]) c[r.emoji] = (c[r.emoji] ?? 0) + 1;
      counts = c;
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
      await pb.collection('reactions').create({ targetType, targetId, emoji, sessionHash: sessionId() });
    } catch {
      // revert on failure (e.g. dedup 400 or offline)
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
