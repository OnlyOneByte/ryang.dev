<script lang="ts">
  /**
   * Hidden terminal easter egg. Toggle with the backtick (`) key. A few fake
   * commands: whoami, ls, help, theme <id>, sudo hire-me, clear. Pure client
   * island; navigation/theme actions reuse the real site behavior.
   */
  import { onMount } from 'svelte';
  import { setTheme } from '@/lib/theme/store';

  let open = $state(false);
  let input = $state('');
  let lines = $state<string[]>(['ryang.dev shell — type `help`']);

  const COMMANDS: Record<string, (arg?: string) => string | void> = {
    help: () => 'commands: whoami · ls · theme <id> · sudo hire-me · clear · exit',
    whoami: () => 'Angelo Yang — software engineer & self-hoster (Rengang "Angelo" Yang)',
    ls: () => 'work/  blog/  uses/  guestbook/  colophon/  contact/',
    'sudo': (arg) => (arg === 'hire-me' ? '✓ access granted — /contact or /cal 🎉' : 'usage: sudo hire-me'),
    theme: (arg) => { if (arg) { setTheme(arg); return `theme → ${arg}`; } return 'usage: theme <id>'; },
    clear: () => { lines = []; },
    exit: () => { open = false; },
  };

  function run(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    lines = [...lines, `$ ${cmd}`];
    const [name, ...rest] = cmd.split(/\s+/);
    const fn = COMMANDS[name];
    const out = fn ? fn(rest.join(' ')) : `command not found: ${name}`;
    if (typeof out === 'string') lines = [...lines, out];
    input = '';
  }

  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '`' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault(); open = !open;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
</script>

{#if open}
  <div class="fixed bottom-0 left-0 right-0 z-[150] max-h-[50vh] overflow-auto border-t p-3 font-mono text-sm"
       style="background:var(--panel);border-color:var(--accent);color:var(--text)">
    {#each lines as l}<div style="white-space:pre-wrap">{l}</div>{/each}
    <div class="flex gap-2">
      <span style="color:var(--accent)">$</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input autofocus bind:value={input}
             onkeydown={(e) => e.key === 'Enter' && run(input)}
             class="flex-1 bg-transparent outline-none" style="color:var(--text)"
             aria-label="terminal input" />
    </div>
  </div>
{/if}
