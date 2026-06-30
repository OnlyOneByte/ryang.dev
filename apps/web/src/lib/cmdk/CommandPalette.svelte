<script lang="ts">
  /**
   * ⌘K / Ctrl-K command palette. Two command groups:
   *   - Navigation (static routes)
   *   - "Theme: <name>" actions for every currently-usable theme
   * Simple substring fuzzy filter; arrow keys + enter; esc/backdrop closes.
   */
  import { onMount } from 'svelte';
  import { visibleThemes } from '@/styles/themes';
  import { setTheme } from '@/lib/theme/store';
  import { getUnlocked } from '@/lib/theme/konami';

  interface Cmd {
    id: string;
    label: string;
    hint?: string;
    run: () => void;
  }

  let open = $state(false);
  let query = $state('');
  let active = $state(0);
  let unlocked = $state(new Set<string>());

  const NAV: Cmd[] = [
    { id: 'nav-home', label: 'Home', hint: '/', run: () => go('/') },
    { id: 'nav-work', label: 'Work', hint: '/work', run: () => go('/work') },
    { id: 'nav-experience', label: 'Experience', hint: '/experience', run: () => go('/experience') },
    { id: 'nav-blog', label: 'Blog', hint: '/blog', run: () => go('/blog') },
    { id: 'nav-uses', label: 'Uses', hint: '/colophon#uses', run: () => go('/colophon#uses') },
    { id: 'nav-colophon', label: 'Colophon', hint: '/colophon', run: () => go('/colophon') },
    { id: 'nav-unlock', label: 'Recruiter mode', hint: '/unlock', run: () => go('/unlock') },
  ];

  function go(path: string) {
    window.location.href = path;
  }

  const commands = $derived<Cmd[]>([
    ...NAV,
    ...visibleThemes(unlocked).map((t) => ({
      id: `theme-${t.id}`,
      label: `Theme: ${t.name}`,
      hint: 'theme',
      run: () => { setTheme(t.id); open = false; },
    })),
  ]);

  const filtered = $derived(
    query.trim() === ''
      ? commands
      : commands.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
  );

  function onKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggle();
      return;
    }
    if (!open) return;
    if (e.key === 'Escape') { open = false; }
    else if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, filtered.length - 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[active]?.run(); }
  }

  function toggle() {
    open = !open;
    query = '';
    active = 0;
    unlocked = getUnlocked();
  }

  onMount(() => {
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  });
</script>

{#if open}
  <!-- backdrop -->
  <div
    class="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
    style="background:rgba(0,0,0,0.5)"
    onclick={() => (open = false)}
    onkeydown={() => {}}
    role="presentation"
  >
    <!-- panel -->
    <div
      class="w-[90vw] max-w-lg overflow-hidden rounded-theme border border-border"
      style="background:var(--panel)"
      onclick={(e) => e.stopPropagation()}
      onkeydown={() => {}}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <!-- svelte-ignore a11y_autofocus -->
      <input
        autofocus
        bind:value={query}
        oninput={() => (active = 0)}
        placeholder="Type a command or theme…"
        class="w-full border-b border-border bg-transparent px-4 py-3 font-mono text-text outline-none"
      />
      <ul class="max-h-72 overflow-auto py-1">
        {#each filtered as c, i (c.id)}
          <li>
            <button
              type="button"
              onclick={c.run}
              onmouseenter={() => (active = i)}
              class="flex w-full items-center justify-between px-4 py-2 text-left font-mono text-sm"
              style={i === active
                ? 'background:var(--panel-2);color:var(--accent)'
                : 'color:var(--text)'}
            >
              <span>{c.label}</span>
              {#if c.hint}<span class="text-xs" style="color:var(--muted)">{c.hint}</span>{/if}
            </button>
          </li>
        {:else}
          <li class="px-4 py-3 font-mono text-sm" style="color:var(--muted)">No matches.</li>
        {/each}
      </ul>
    </div>
  </div>
{/if}
