/**
 * Projects — pulled from GitHub, server-side + cached. Lists every public
 * non-fork repo as a project card linking to its repo (and homepage if set).
 *
 * Curated OVERRIDES let a few flagship repos carry a hand-written summary / tech
 * list / pinned order instead of the bare GitHub description; everything else
 * falls through to the repo's own metadata. Fail-soft → a static fallback list
 * (the known repos) so the Projects section always renders, even offline / in
 * dev without a token.
 *
 * Mirrors lib/widgets/github.ts (same USER/TOKEN/cache plumbing).
 */
import { cached } from './cache';
import { fetchWithTimeout } from './fetch-timeout';

const USER = process.env.GITHUB_USER || 'OnlyOneByte';
const TOKEN = process.env.GITHUB_TOKEN;
const TTL = 30 * 60 * 1000; // 30 min

export interface Project {
  name: string;        // display title
  slug: string;        // repo name, lowercased — stable anchor id
  summary: string;
  tech: string[];
  repoUrl: string;
  homepage?: string;   // live/demo URL if the repo sets one
  stars: number;
}

/**
 * Hand-written polish for flagship repos, keyed by repo name (case-sensitive,
 * as GitHub returns it). `order` pins them to the front; un-curated repos sort
 * after, by stars. Anything omitted here uses the repo's own description/language.
 */
const CURATED: Record<string, { summary?: string; tech?: string[]; order?: number }> = {
  VROOM: {
    summary:
      'Self-hosted vehicle cost tracker — fuel, maintenance, financing, and a TCO analytics engine. Offline-first with conflict-resolving sync; 1700+ backend tests.',
    tech: ['Svelte', 'TypeScript', 'SQLite'],
    order: 0,
  },
  'ryang.dev': {
    summary:
      'This site — a self-hosted Astro portfolio with a 15-theme engine and a Konami-code unlock, backed by Pocketbase.',
    tech: ['Astro', 'Bun', 'Pocketbase'],
    order: 1,
  },
  Encore: {
    summary: 'Simple, fast, self-hosted karaoke app that just works.',
    tech: ['TypeScript'],
    order: 2,
  },
  Conveyor: {
    summary: 'Web-based 3D-printing workflow optimizer.',
    tech: ['TypeScript'],
    order: 3,
  },
  LuceroKeyboard: {
    summary: 'A split ergonomic keyboard — parametric case modeled in OpenSCAD.',
    tech: ['OpenSCAD', 'Hardware'],
    order: 4,
  },
};

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ryang.dev-widget',
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

export async function getProjects(): Promise<Project[]> {
  try {
    return await cached('gh:projects', TTL, async () => {
      const r = await fetchWithTimeout(
        `https://api.github.com/users/${USER}/repos?per_page=100&sort=pushed`,
        { headers: headers() },
      );
      if (!r.ok) throw new Error(`gh repos ${r.status}`);
      const repos: any[] = await r.json();

      const projects = repos
        .filter((repo) => !repo.fork && !repo.archived)
        .map((repo): Project => {
          const c = CURATED[repo.name] ?? {};
          const tech =
            c.tech ?? (repo.language ? [repo.language] : []);
          return {
            name: repo.name,
            slug: String(repo.name).toLowerCase(),
            summary: c.summary ?? repo.description ?? '',
            tech,
            repoUrl: repo.html_url,
            homepage: repo.homepage || undefined,
            stars: repo.stargazers_count ?? 0,
          };
        });

      // Curated `order` first (ascending), then the rest by stars desc.
      return projects.sort((a, b) => {
        const oa = CURATED[a.name]?.order ?? Infinity;
        const ob = CURATED[b.name]?.order ?? Infinity;
        if (oa !== ob) return oa - ob;
        return b.stars - a.stars;
      });
    });
  } catch {
    return FALLBACK;
  }
}

// Static fallback (the known public repos) so the section renders even when the
// GitHub API is unreachable / rate-limited.
const FALLBACK: Project[] = [
  { name: 'VROOM', slug: 'vroom', summary: CURATED.VROOM.summary!, tech: CURATED.VROOM.tech!, repoUrl: 'https://github.com/OnlyOneByte/VROOM', stars: 1 },
  { name: 'ryang.dev', slug: 'ryang.dev', summary: CURATED['ryang.dev'].summary!, tech: CURATED['ryang.dev'].tech!, repoUrl: 'https://github.com/OnlyOneByte/ryang.dev', stars: 0 },
  { name: 'Encore', slug: 'encore', summary: CURATED.Encore.summary!, tech: CURATED.Encore.tech!, repoUrl: 'https://github.com/OnlyOneByte/Encore', stars: 0 },
  { name: 'Conveyor', slug: 'conveyor', summary: CURATED.Conveyor.summary!, tech: CURATED.Conveyor.tech!, repoUrl: 'https://github.com/OnlyOneByte/Conveyor', stars: 0 },
  { name: 'LuceroKeyboard', slug: 'lucerokeyboard', summary: CURATED.LuceroKeyboard.summary!, tech: CURATED.LuceroKeyboard.tech!, repoUrl: 'https://github.com/OnlyOneByte/LuceroKeyboard', stars: 0 },
];
