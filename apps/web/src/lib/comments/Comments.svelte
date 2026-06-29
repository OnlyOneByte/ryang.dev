<script lang="ts">
  /**
   * Blog comments. Reads approved comments for this post from Pocketbase and
   * lets visitors submit one (moderated server-side → approved=false until you
   * approve in the PB admin UI). Fail-soft: if PB is unreachable, shows a
   * friendly notice instead of erroring.
   */
  import { onMount } from 'svelte';
  import PocketBase from 'pocketbase';

  let { postSlug } = $props<{ postSlug: string }>();

  // public PB URL (browser-side); falls back to same-origin /pb proxy if unset
  const PB = (import.meta.env.PUBLIC_PB_URL as string) || 'https://pb.ryang.dev';

  type Comment = { id: string; author: string; body: string; created: string };
  let comments = $state<Comment[]>([]);
  let state = $state<'loading' | 'ready' | 'offline'>('loading');
  let author = $state('');
  let body = $state('');
  let submitting = $state(false);
  let submitted = $state(false);

  const pb = new PocketBase(PB);

  async function load() {
    try {
      const list = await pb.collection('comments').getList(1, 50, {
        filter: pb.filter('postSlug = {:slug} && approved = true', { slug: postSlug }),
        sort: 'created',
      });
      comments = list.items as unknown as Comment[];
      state = 'ready';
    } catch {
      state = 'offline';
    }
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (!author.trim() || !body.trim()) return;
    submitting = true;
    try {
      await pb.collection('comments').create({ postSlug, author, body });
      submitted = true; // it's now pending moderation
      author = ''; body = '';
    } catch {
      state = 'offline';
    } finally {
      submitting = false;
    }
  }

  onMount(load);
</script>

<section class="font-mono">
  <h2 class="text-sm uppercase tracking-wider" style="color:var(--accent)">Comments</h2>

  {#if state === 'loading'}
    <p class="mt-3 text-sm" style="color:var(--muted)">Loading…</p>
  {:else if state === 'offline'}
    <p class="mt-3 text-sm" style="color:var(--muted)">Comments are offline right now — check back later.</p>
  {:else}
    {#if comments.length === 0}
      <p class="mt-3 text-sm" style="color:var(--muted)">No comments yet. Be the first.</p>
    {:else}
      <ul class="mt-4 space-y-3">
        {#each comments as c (c.id)}
          <li class="rounded-theme border p-3" style="background:var(--panel);border-color:var(--border)">
            <div class="text-xs" style="color:var(--accent)">{c.author}</div>
            <div class="mt-1 text-sm" style="color:var(--text)">{c.body}</div>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}

  {#if state !== 'offline'}
    {#if submitted}
      <p class="mt-4 rounded-theme border px-3 py-2 text-sm"
         style="border-color:var(--ok);color:var(--ok)">
        Thanks! Your comment is pending moderation.
      </p>
    {:else}
      <form onsubmit={submit} class="mt-4 flex flex-col gap-2">
        <input bind:value={author} placeholder="name" maxlength="60" required
               class="rounded-theme border px-3 py-2 text-sm"
               style="background:var(--bg);border-color:var(--border);color:var(--text)" />
        <textarea bind:value={body} placeholder="say something…" maxlength="1000" required rows="3"
                  class="rounded-theme border px-3 py-2 text-sm"
                  style="background:var(--bg);border-color:var(--border);color:var(--text)"></textarea>
        <button type="submit" disabled={submitting}
                class="self-start rounded-theme px-4 py-2 text-sm font-semibold"
                style="background:var(--accent);color:var(--accent-ink)">
          {submitting ? 'posting…' : 'post comment'}
        </button>
      </form>
    {/if}
  {/if}
</section>
