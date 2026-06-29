/**
 * GitHub activity — server-side fetch, cached. Uses GITHUB_TOKEN if present
 * (higher rate limit + private events), else anonymous public API. Returns a
 * compact summary for the home/colophon widgets. Fail-soft: returns null on
 * any error so the widget can hide gracefully.
 */
import { cached } from './cache';

const USER = process.env.GITHUB_USER || 'OnlyOneByte';
const TOKEN = process.env.GITHUB_TOKEN;
const TTL = 30 * 60 * 1000; // 30 min

export interface GithubSummary {
  user: string;
  publicRepos: number;
  followers: number;
  topRepos: { name: string; description: string | null; stars: number; language: string | null }[];
  recentPushes: { repo: string; when: string }[];
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'ryang.dev-widget',
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

export async function getGithubSummary(): Promise<GithubSummary | null> {
  try {
    return await cached('gh:summary', TTL, async () => {
      const [profileR, reposR, eventsR] = await Promise.all([
        fetch(`https://api.github.com/users/${USER}`, { headers: headers() }),
        fetch(`https://api.github.com/users/${USER}/repos?sort=pushed&per_page=100`, { headers: headers() }),
        fetch(`https://api.github.com/users/${USER}/events/public?per_page=30`, { headers: headers() }),
      ]);
      if (!profileR.ok || !reposR.ok) throw new Error(`gh ${profileR.status}/${reposR.status}`);
      const profile: any = await profileR.json();
      const repos: any[] = await reposR.json();
      const events: any[] = eventsR.ok ? await eventsR.json() : [];

      const topRepos = repos
        .filter((r) => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 4)
        .map((r) => ({ name: r.name, description: r.description, stars: r.stargazers_count, language: r.language }));

      const recentPushes = events
        .filter((e) => e.type === 'PushEvent')
        .slice(0, 5)
        .map((e) => ({ repo: e.repo?.name ?? '', when: e.created_at }));

      return {
        user: profile.login,
        publicRepos: profile.public_repos ?? 0,
        followers: profile.followers ?? 0,
        topRepos,
        recentPushes,
      };
    });
  } catch {
    return null;
  }
}
