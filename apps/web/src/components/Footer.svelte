<script lang="ts">
  /**
   * Build-info footer. The status dot doubles as the MOBILE Konami fallback:
   * tap it 7× (within 1.5s windows) to unlock the fun themes on touch devices.
   */
  import { tapUnlock } from '@/lib/theme/konami';

  // sha is build-time (vite define). `status` is passed from the server layout
  // (live Uptime Kuma counts) when available, else a static placeholder.
  let { status = '9/9' } = $props<{ status?: string }>();
  const sha = (import.meta.env.PUBLIC_BUILD_SHA as string) || 'dev';
  const services = status;
</script>

<footer
  class="flex items-center justify-between border-t px-6 py-3 font-mono text-xs"
  style="border-color:var(--border);color:var(--muted)"
>
  <span>built with astro · pocketbase · self-hosted ♥</span>
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
