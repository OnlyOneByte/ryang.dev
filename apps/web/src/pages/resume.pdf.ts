/**
 * GET /resume.pdf — render a print HTML résumé and convert it to PDF via the
 * self-hosted Gotenberg container (Chromium). Content comes from PB when up,
 * else a static fallback so the route always produces a sensible PDF. If
 * Gotenberg is unreachable, fall back to serving the HTML (browser can print).
 */
import type { APIRoute } from 'astro';
import { withServerClient } from '@/lib/pb/client';
import { PUBLIC_RESUME_SECTIONS } from '@/lib/resume/public-sections';
import { fetchWithTimeout } from '@/lib/widgets/fetch-timeout';

export const prerender = false;

const GOTENBERG = process.env.GOTENBERG_URL || 'http://gotenberg:3000';

// SECURITY: /resume.pdf is PUBLIC. Only the allowlisted sections may appear;
// salary/references are gated and excluded here. (Single source of truth in
// lib/resume/public-sections.ts, guarded by the leak regression test.)
const PUBLIC_SECTIONS = PUBLIC_RESUME_SECTIONS;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function resumeHtml(sections: { title: string; body: string }[]): string {
  // Titles are escaped; bodies are admin-authored rich HTML (trusted — only the
  // PB superuser can write recruiter_content).
  const blocks = sections
    .map((s) => `<section><h2>${esc(s.title)}</h2>${s.body}</section>`)
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
    // Bind the filter value (no string interpolation) AND hard-filter to the
    // public-section allowlist in code as defense-in-depth — never trust that
    // the query alone keeps salary/references out of a public document.
    const rows = await withServerClient((pb) =>
      pb.collection('recruiter_content').getFullList({ filter: pb.filter('visible = true'), sort: 'order' })
    );
    sections = rows
      .filter((r: any) => PUBLIC_SECTIONS.has(r.section))
      .map((r: any) => ({ title: r.title, body: r.body ?? '' }));
  } catch {
    sections = [];
  }
  if (sections.length === 0) {
    sections = [
      {
        title: 'Summary',
        body: '<p>Software engineer focused on fast, durable, AWS-native and self-hosted systems. Currently building live-sports streaming infrastructure and ML-driven tooling at Amazon Prime Video.</p>',
      },
      {
        title: 'Experience',
        body:
          '<p><strong>Amazon — Prime Video Sports</strong> · Software Engineer II · 2022–present</p>' +
          '<ul>' +
          '<li>Built a scalable VLM-based recognition system for automated event monitoring, deployed across the Prime Video Sports catalog and stress-tested live during Black Friday Football.</li>' +
          '<li>Reclaimed over $350K in underutilized AWS resources in the first year through a targeted cost-optimization effort.</li>' +
          '<li>Shipped a self-service image-slate portal, cutting manual onboarding from two developer-days to none.</li>' +
          '<li>Championed AI-assisted log diagnosis, enabling self-service root-causing for other teams.</li>' +
          '</ul>' +
          '<p><strong>PIMCO — Platform Engineering</strong> · Software Engineer · 2020–2022</p>' +
          '<ul>' +
          '<li>Architected the firm\'s Okta transition with developer-facing abstractions, reducing onboarding from weeks to two days.</li>' +
          '<li>Onboarded Datadog and built migration tooling, cutting mean-time-to-root-cause from 9 days to 2.</li>' +
          '<li>Built CI/CD pipelines that made full Okta + Datadog adoption a one-commit change for most apps firm-wide.</li>' +
          '<li>Drove the on-premise to AWS migration, architecting bespoke solutions for internal teams.</li>' +
          '</ul>',
      },
      {
        title: 'Education',
        body: '<p><strong>Texas A&amp;M University</strong>, College Station — B.S. Computer Science (AI/ML focus), minors in Mathematics &amp; Cybersecurity. <em>Summa Cum Laude.</em></p>',
      },
      {
        title: 'Skills',
        body:
          '<p>Java, Python, TypeScript/JavaScript (React, Angular) · Rust. ' +
          'AWS Certified Developer — Lambda, ECS/Fargate, DynamoDB; Azure familiar. ' +
          'Git, CI/CD (GitHub Actions, GitLab Runners). Microservice &amp; cloud-native architecture.</p>',
      },
      { title: 'Contact', body: '<p>ryang.dev/contact · linkedin.com/in/ryang42</p>' },
    ];
  }

  const html = resumeHtml(sections);

  // Gotenberg Chromium HTML→PDF: multipart with an index.html file
  try {
    const fd = new FormData();
    fd.append('files', new Blob([html], { type: 'text/html' }), 'index.html');
    const r = await fetchWithTimeout(
      `${GOTENBERG.replace(/\/$/, '')}/forms/chromium/convert/html`,
      { method: 'POST', body: fd },
      8000 // PDF render is legitimately slower than a JSON GET
    );
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
