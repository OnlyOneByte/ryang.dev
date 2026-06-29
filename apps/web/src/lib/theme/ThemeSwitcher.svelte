<script lang="ts">
  /**
   * Theme switcher dropdown. Lists themes the visitor can use (core always;
   * fun/mode only after Konami unlock). Persists choice via the store; listens
   * for 'themes-unlocked' so newly unlocked themes appear without reload.
   */
  import { onMount } from 'svelte';
  import { THEMES, visibleThemes, type Theme } from '@/styles/themes';
  import { getTheme, setTheme } from './store';
  import { getUnlocked, initKonami } from './konami';

  let current = $state('cyberpunk');
  let unlocked = $state(new Set<string>());
  let open = $state(false);

  const list = $derived<Theme[]>(visibleThemes(unlocked));

  onMount(() => {
    current = getTheme();
    unlocked = getUnlocked();
    const cleanupKonami = initKonami();
    const onUnlock = (e: Event) => {
      unlocked = new Set((e as CustomEvent<string[]>).detail);
    };
    window.addEventListener('themes-unlocked', onUnlock);
    return () => {
      cleanupKonami();
      window.removeEventListener('themes-unlocked', onUnlock);
    };
  });

  function choose(id: string) {
    setTheme(id);
    current = id;
    open = false;
  }

  function label(id: string): string {
    return THEMES.find((t) => t.id === id)?.name ?? id;
  }
</script>

<div class="relative inline-block text-sm">
  <button
    type="button"
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open = !open)}
    class="rounded-theme border border-border px-3 py-1.5 font-mono text-text"
    style="background:var(--panel)"
  >
    🎨 {label(current)}
  </button>

  {#if open}
    <ul
      role="listbox"
      class="absolute right-0 z-50 mt-1 max-h-80 w-56 overflow-auto rounded-theme border border-border py-1"
      style="background:var(--panel)"
    >
      {#each list as t (t.id)}
        <li role="option" aria-selected={t.id === current}>
          <button
            type="button"
            onclick={() => choose(t.id)}
            class="flex w-full items-center justify-between px-3 py-1.5 text-left font-mono hover:opacity-80"
            style={t.id === current ? 'color:var(--accent)' : 'color:var(--text)'}
          >
            <span>{t.name}</span>
            {#if t.id === current}<span>●</span>{/if}
          </button>
        </li>
      {/each}
      {#if list.length < THEMES.length}
        <li class="px-3 py-1.5 font-mono text-xs" style="color:var(--muted)">
          // {THEMES.length - list.length} more — find the code 👀
        </li>
      {/if}
    </ul>
  {/if}
</div>
