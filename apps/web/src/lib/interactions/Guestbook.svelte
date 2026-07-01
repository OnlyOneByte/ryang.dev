<script lang="ts">
  /**
   * Guestbook — reads approved entries, lets visitors sign (moderated: the
   * server hook forces approved=false). Honeypot field + client length guard
   * deter low-effort spam. Fail-soft if PB is unreachable.
   */
  import { onMount } from 'svelte';

  // Talks to the same-origin proxy (/api/guestbook), NOT Pocketbase directly —
  // PB is private on the compose network. Reads + writes go through the server.
  type Entry = { id: string; name: string; message: string; website?: string; created: string };
  let entries = $state<Entry[]>([]);
  let mode = $state<'loading' | 'ready' | 'offline'>('loading');
  let name = $state(''), message = $state(''), website = $state('');
  let trap = $state(''); // honeypot — real users never fill this
  let submitting = $state(false), done = $state(false);

  async function load() {
    try {
      const r = await fetch('/api/guestbook');
      if (!r.ok) throw new Error(`guestbook ${r.status}`);
      entries = (await r.json()).entries as Entry[];
      mode = 'ready';
    } catch { mode = 'offline'; }
  }

  async function sign(e: Event) {
    e.preventDefault();
    if (trap) return;                         // bot filled the honeypot
    if (!name.trim() || !message.trim()) return;
    submitting = true;
    try {
      const r = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, message, website, trap }),
      });
      if (!r.ok) throw new Error(`guestbook ${r.status}`);
      done = true; name = ''; message = ''; website = '';
    } catch { mode = 'offline'; }
    finally { submitting = false; }
  }

  onMount(load);
</script>

<section class="font-mono">
  <p class="text-sm" style="color:var(--accent)">$ cat ~/guestbook</p>
  <h1 class="mt-2 text-3xl font-extrabold" style="color:var(--text-strong)">Guestbook</h1>

  {#if mode === 'offline'}
    <p class="mt-3 text-sm" style="color:var(--muted)">Guestbook is offline right now — check back later.</p>
  {:else}
    {#if done}
      <p class="mt-4 rounded-theme border px-3 py-2 text-sm" style="border-color:var(--ok);color:var(--ok)">
        Signed! Your note is pending moderation.
      </p>
    {:else}
      <form onsubmit={sign} class="mt-4 flex flex-col gap-2">
        <input bind:value={name} placeholder="name" maxlength="60" required
               class="rounded-theme border px-3 py-2 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)" />
        <textarea bind:value={message} placeholder="leave a note…" maxlength="500" rows="2" required
                  class="rounded-theme border px-3 py-2 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)"></textarea>
        <input bind:value={website} placeholder="website (optional)" type="url"
               class="rounded-theme border px-3 py-2 text-sm" style="background:var(--bg);border-color:var(--border);color:var(--text)" />
        <!-- honeypot: visually hidden, bots fill it -->
        <input bind:value={trap} tabindex="-1" autocomplete="off" aria-hidden="true"
               style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0" />
        <button type="submit" disabled={submitting}
                class="self-start rounded-theme px-4 py-2 text-sm font-semibold"
                style="background:var(--accent);color:var(--accent-ink)">
          {submitting ? 'signing…' : 'sign guestbook'}
        </button>
      </form>
    {/if}

    <ul class="mt-8 space-y-3">
      {#each entries as e (e.id)}
        <li class="rounded-theme border p-3" style="background:var(--panel);border-color:var(--border)">
          <div class="text-xs" style="color:var(--accent)">
            {#if e.website}<a href={e.website} rel="noopener">{e.name}</a>{:else}{e.name}{/if}
          </div>
          <div class="mt-1 text-sm" style="color:var(--text)">{e.message}</div>
        </li>
      {:else}
        {#if mode === 'ready'}<li class="text-sm" style="color:var(--muted)">No entries yet — be the first.</li>{/if}
      {/each}
    </ul>
  {/if}
</section>
