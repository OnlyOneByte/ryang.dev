<script lang="ts">
  /**
   * Hidden terminal easter egg. Toggle with the backtick (`) key.
   *
   * Now backed by a tiny in-memory virtual filesystem so you can actually
   * explore: cd / ls / cat / pwd, hidden dirs (ls -a), and a `find` quest.
   * Plus a few gags: a `sudo` privilege-escalation arc, a `vim` you can't
   * trivially escape, and a time-aware greeting. Pure client island; theme +
   * nav actions reuse real site behavior. No secrets, all whimsy.
   */
  import { onMount } from 'svelte';
  import { setTheme } from '@/lib/theme/store';
  import { findFragment } from '@/lib/eggs/store';
  import { CLAIM_TOKENS } from '@/lib/eggs/fragments';

  let open = $state(false);
  let input = $state('');
  let lines = $state<string[]>([]);
  let cwd = $state('/home/angelo');
  let vim = $state<null | { file: string }>(null); // non-null = trapped in fake vim

  // ---- tiny in-memory VFS. Dirs are objects; files are strings. ----
  type Node = string | { [k: string]: Node };
  const FS: { [k: string]: Node } = {
    home: {
      angelo: {
        'readme.txt': 'You found the shell. Try: ls -a · cd projects · cat .secret · find flag · help',
        'projects': {
          'prime-video.md': 'Orchestration @ Prime Video — thousands of live streams a day. (see /#experience)',
          'homelab.md': 'A Docker box + a router running Caddy. The whole stack is self-hosted.',
        },
        'blog': { 'drafts.md': 'half-written posts live here. someday™.' },
        '.secret': 'praise kier. (psst: type `praise kier` for innie mode — coming soon)',
        '.bashrc': 'alias please="sudo"   # it will not help you',
      },
    },
    etc: {
      'motd': 'ryang.dev — be excellent to each other.',
      'shadow': 'nice try 🙂',
      'sudoers': 'root ALL=(ALL:ALL) ALL\n# angelo is NOT here. obviously.',
    },
    flag: 'You really did `find flag`. 🏁 ok: the konami code unlocks 6 hidden themes. ↑↑↓↓←→←→ B A',
  };

  function resolve(path: string): Node | undefined {
    const abs = path.startsWith('/') ? path : `${cwd}/${path}`;
    const parts = abs.split('/').filter(Boolean);
    const stack: string[] = [];
    for (const p of parts) {
      if (p === '.') continue;
      if (p === '..') { stack.pop(); continue; }
      stack.push(p);
    }
    let node: Node = FS as Node;
    for (const p of stack) {
      if (typeof node === 'string' || node[p] === undefined) return undefined;
      node = node[p];
    }
    return node;
  }

  const isDir = (n: Node | undefined): n is { [k: string]: Node } =>
    typeof n === 'object' && n !== null;

  function listing(node: { [k: string]: Node }, all: boolean): string {
    return Object.keys(node)
      .filter((k) => all || !k.startsWith('.'))
      .map((k) => (isDir(node[k]) ? `${k}/` : k))
      .join('   ') || '(empty)';
  }

  // depth-first search for `find`
  function findIn(node: Node, name: string, path: string, hits: string[]) {
    if (!isDir(node)) return;
    for (const [k, v] of Object.entries(node)) {
      const p = `${path}/${k}`;
      if (k === name) hits.push(p);
      findIn(v, name, p, hits);
    }
  }

  const COMMANDS: Record<string, (arg?: string) => string | void> = {
    help: () =>
      'commands: ls [-a] · cd <dir> · cat <file> · pwd · whoami · find <name> · theme <id> · sudo · vim <file> · egg <token> · clear · exit',
    whoami: () => 'Angelo Yang — software engineer & self-hoster (Rengang "Angelo" Yang)',
    pwd: () => cwd,
    ls: (arg) => {
      const all = arg === '-a' || arg === '-la' || arg === '-al';
      const target = arg && !arg.startsWith('-') ? arg : cwd;
      const node = resolve(target);
      if (node === undefined) return `ls: ${target}: No such file or directory`;
      if (!isDir(node)) return target;
      return listing(node, all);
    },
    cd: (arg) => {
      if (!arg || arg === '~') { cwd = '/home/angelo'; return; }
      const node = resolve(arg);
      if (node === undefined) return `cd: ${arg}: No such file or directory`;
      if (!isDir(node)) return `cd: ${arg}: Not a directory`;
      const abs = arg.startsWith('/') ? arg : `${cwd}/${arg}`;
      const parts = abs.split('/').filter(Boolean);
      const stack: string[] = [];
      for (const p of parts) { if (p === '.') continue; if (p === '..') stack.pop(); else stack.push(p); }
      cwd = '/' + stack.join('/');
    },
    cat: (arg) => {
      if (!arg) return 'usage: cat <file>';
      const node = resolve(arg);
      if (node === undefined) return `cat: ${arg}: No such file or directory`;
      if (isDir(node)) return `cat: ${arg}: Is a directory`;
      if (arg === '/flag' || arg.endsWith('flag')) findFragment('terminal'); // 🧩 auto-claim
      return node;
    },
    find: (arg) => {
      if (!arg) return 'usage: find <name>';
      const hits: string[] = [];
      findIn(FS as Node, arg, '', hits);
      if (arg === 'flag' && hits.length) findFragment('terminal'); // 🧩 auto-claim
      return hits.length ? hits.join('\n') : `find: '${arg}': nothing found`;
    },
    // 🧩 scavenger hunt: claim a passive-discovery fragment by its token.
    egg: (arg) => {
      if (!arg) return 'usage: egg <token>   (tokens hide in plain sight — try the console, or a response header)';
      const id = CLAIM_TOKENS[arg.trim().toLowerCase()];
      if (!id) return `egg: '${arg}' is not a fragment token`;
      findFragment(id);
      return `🧩 fragment claimed: ${id}`;
    },
    theme: (arg) => { if (arg) { setTheme(arg); return `theme → ${arg}`; } return 'usage: theme <id>'; },
    // #2 sudo escalation arc — drops a fake incident report into the VFS.
    sudo: (arg) => {
      (FS.home as any).angelo['incident_report.log'] =
        `[${new Date().toISOString()}] user 'angelo' attempted: sudo ${arg || ''}\n` +
        'verdict: adorable. this incident has been reported to nobody.';
      if (arg === 'hire-me') return '✓ access granted — /contact or /cal 🎉';
      return (
        `[sudo] password for angelo: \n` +
        `angelo is not in the sudoers file. This incident will be reported.\n` +
        `(an incident_report.log appeared in ~ — try \`cat incident_report.log\`)`
      );
    },
    // #9 vim trap
    vim: (arg) => { vim = { file: arg || 'noname' }; },
    vi: (arg) => { vim = { file: arg || 'noname' }; },
    clear: () => { lines = []; },
    exit: () => { open = false; },
  };

  function run(raw: string) {
    const cmd = raw.trim();
    input = '';
    if (!cmd) return;

    // #9 — if trapped in vim, only :wq frees you; the usual escapes mock you.
    if (vim) {
      lines = [...lines, `:${cmd.replace(/^:/, '')}`];
      const c = cmd.replace(/^:/, '');
      if (c === 'wq' || c === 'x') { lines = [...lines, `"${vim.file}" written. you're free. 🫡`]; vim = null; }
      else if (c === 'q' || c === 'q!') lines = [...lines, "E37: no write since last change (try ':wq' — or accept your fate)"];
      else lines = [...lines, "you're in vim. nobody knows how to leave. (hint: :wq)"];
      return;
    }

    lines = [...lines, `${prompt()} ${cmd}`];
    const [name, ...rest] = cmd.split(/\s+/);
    // playful aliases
    if (name === 'praise' && rest[0] === 'kier') { lines = [...lines, 'The work is mysterious and important. 🌀 (innie mode — coming soon)']; return; }
    const fn = COMMANDS[name];
    const out = fn ? fn(rest.join(' ')) : `command not found: ${name}`;
    if (typeof out === 'string') lines = [...lines, out];
  }

  const prompt = () => `angelo@ryang:${cwd.replace('/home/angelo', '~')}$`;

  // #11 time-aware greeting
  function greeting(): string {
    const h = new Date().getHours();
    if (h >= 0 && h < 5) return 'burning the midnight oil too? ☕ — type `help`';
    if (h < 12) return 'good morning. — type `help`';
    if (h < 18) return 'afternoon. — type `help`';
    return 'evening. — type `help`';
  }

  onMount(() => {
    lines = [`ryang.dev shell — ${greeting()}`];
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '`' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        open = !open;
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
      <span style="color:var(--accent)">{vim ? ':' : prompt()}</span>
      <!-- svelte-ignore a11y_autofocus -->
      <input autofocus bind:value={input}
             onkeydown={(e) => e.key === 'Enter' && run(input)}
             class="flex-1 bg-transparent outline-none" style="color:var(--text)"
             aria-label="terminal input" />
    </div>
  </div>
{/if}
