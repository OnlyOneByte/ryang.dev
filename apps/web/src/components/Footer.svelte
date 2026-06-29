<script lang="ts">
  /**
   * Build-info footer. The status dot doubles as the MOBILE Konami fallback:
   * tap it 7× (within 1.5s windows) to unlock the fun themes on touch devices.
   */
  import { onMount } from 'svelte';
  import { tapUnlock } from '@/lib/theme/konami';

  // sha is build-time (vite define). Status is fetched CLIENT-SIDE so it never
  // blocks page render; falls back to a neutral placeholder until it resolves.
  const sha = (import.meta.env.PUBLIC_BUILD_SHA as string) || 'dev';
  let services = $state('●');

  onMount(async () => {
    try {
      const r = await fetch('/api/status');
      const s = await r.json();
      services = s && typeof s.up === 'number' ? `${s.up}/${s.total}` : '●';
    } catch {
      services = '●';
    }
  });
</script>

<footer
  class="flex items-center justify-between border-t px-6 py-3 font-mono text-xs"
  style="border-color:var(--border);color:var(--muted)"
>
  <span>built with astro · pocketbase · self-hosted</span>
  <span class="flex items-center gap-2">
    <span>deploy {sha}</span>
    <span>·</span>
    <button
      type="button"
      onclick={tapUnlock}
      title="status"
      aria-label="service status"
      style="color:var(--ok);background:none;border:none;cursor:pointer;padding:0"
    >🟢 {services}</button>
  </span>
</footer>
