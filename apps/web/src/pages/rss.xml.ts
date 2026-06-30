import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { publicClient } from '@/lib/pb/client';

// RSS mirrors the blog index: git-backed MDX posts (/blog/<slug>) + PocketBase
// published, non-gated posts (/blog/p/<slug>). PB read is fail-soft so the feed
// still builds if PB is down. Gated posts never appear (listRule excludes them).
export const prerender = false; // PB fetch happens at request time

type Item = { title: string; description: string; pubDate: Date; link: string };

export async function GET(context: APIContext) {
  const mdx: Item[] = (await getCollection('blog', ({ data }) => !data.draft)).map((p) => ({
    title: p.data.title,
    description: p.data.description,
    pubDate: p.data.pubDate,
    link: `/blog/${p.slug}/`,
  }));

  let pb: Item[] = [];
  try {
    const client = publicClient();
    const rows = await client.collection('posts').getFullList({
      filter: 'published = true && gated = false',
      sort: '-pubDate',
    });
    pb = rows.map((r: any) => ({
      title: r.title,
      description: r.description ?? '',
      pubDate: r.pubDate ? new Date(r.pubDate) : new Date(0),
      link: `/blog/p/${r.slug}/`,
    }));
  } catch {
    pb = [];
  }

  return rss({
    title: 'Angelo Yang — Blog',
    description: 'Notes on self-hosting, systems, and building things.',
    site: context.site ?? 'https://ryang.dev',
    items: [...mdx, ...pb].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()),
  });
}
