<script lang="ts">
  /**
   * Build-info footer. The status dot doubles as the MOBILE Konami fallback:
   * tap it 7× (within 1.5s windows) to unlock the fun themes on touch devices.
   */
  import { tapUnlock } from '@/lib/theme/konami';

  // These are injected at build time (see vite define in astro.config); fall
  // back to dev placeholders so the component renders standalone.
  const sha = (import.meta.env.PUBLIC_BUILD_SHA as string) || 'dev';
  const services = '9/9';
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
