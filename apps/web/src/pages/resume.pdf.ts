/**
 * GET /resume.pdf — render a print HTML résumé and convert it to PDF via the
 * self-hosted Gotenberg container (Chromium). Content comes from PB when up,
 * else a static fallback so the route always produces a sensible PDF. If
 * Gotenberg is unreachable, fall back to serving the HTML (browser can print).
 */
import type { APIRoute } from 'astro';
import { serverClient } from '@/lib/pb/client';

export const prerender = false;

const GOTENBERG = process.env.GOTENBERG_URL || 'http://gotenberg:3000';

function resumeHtml(sections: { title: string; body: string }[]): string {
  const blocks = sections
    .map((s) => `<section><h2>${s.title}</h2>${s.body}</section>`)
    .join('\n');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { margin: 2cm; }
    body { font-family: -apple-system, Inter, system-ui, sans-serif; color:#111; line-height:1.5; }
    h1 { font-size: 28px; margin:0 0 4px; }
    .sub { color:#555; margin:0 0 24px; }
    h2 { font-size: 14px; text-transform:uppercase; letter-spacing:.05em; color:#c0392b; border-bottom:1px solid #eee; padding-bottom:4px; margin:20px 0 8px; }
    section p { margin:.4rem 0; }
  </style></head><body>
    <h1>Angelo Yang</h1>
    <p class="sub">Rengang "Angelo" Yang · Software Engineer &amp; Self-Hoster · ryang.dev</p>
    ${blocks}
  </body></html>`;
}

export const GET: APIRoute = async () => {
  // gather content (fail-soft to a sensible default résumé)
  let sections: { title: string; body: string }[];
  try {
    const pb = await serverClient();
    const rows = await pb.collection('recruiter_content').getFullList({ filter: 'visible = true', sort: 'order' });
    sections = rows.length
      ? rows.map((r: any) => ({ title: r.title, body: r.body ?? '' }))
      : [];
  } catch {
    sections = [];
  }
  if (sections.length === 0) {
    sections = [
      { title: 'Summary', body: '<p>Software engineer focused on fast, durable, self-hosted systems.</p>' },
      { title: 'Selected Work', body: '<p>Homelab Mesh — 3-node self-hosted orchestration. VROOM — vehicle cost tracker (1700+ tests). angryang.dev — this site.</p>' },
      { title: 'Contact', body: '<p>ryang.dev/contact</p>' },
    ];
  }

  const html = resumeHtml(sections);

  // Gotenberg Chromium HTML→PDF: multipart with an index.html file
  try {
    const fd = new FormData();
    fd.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
    const r = await fetch(`${GOTENBERG.replace(/\/$/, '')}/forms/chromium/convert/html`, {
      method: 'POST',
      body: fd,
    });
    if (!r.ok) throw new Error(`gotenberg ${r.status}`);
    const pdf = await r.arrayBuffer();
    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="angelo-yang-resume.pdf"',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    // Gotenberg down → serve the print HTML; the browser's Print-to-PDF works.
    return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};
