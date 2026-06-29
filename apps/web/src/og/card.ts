/**
 * Branded OG share-card renderer. satori (JSX-ish object tree → SVG) +
 * @resvg/resvg-js (SVG → PNG). Uses the committed JetBrains Mono TTFs
 * (Fontsource ships woff2-only, which satori can't parse).
 *
 * Cyberpunk-styled to match the site's default theme. 1200x630 (OG standard).
 */
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
// Bundle the TTF BYTES directly (Vite ?arraybuffer) so there is no filesystem
// read at runtime — the font travels inside the server chunk and works
// identically in dev and in the built standalone server.
import regularBuf from './fonts/JetBrainsMono-Regular.ttf?arraybuffer';
import boldBuf from './fonts/JetBrainsMono-ExtraBold.ttf?arraybuffer';

const regular = regularBuf as ArrayBuffer;
const bold = boldBuf as ArrayBuffer;

export interface CardOpts {
  title: string;
  subtitle?: string;
  kicker?: string; // small label, e.g. "$ whoami" or "BLOG"
}

export async function renderOgPng({ title, subtitle, kicker = '$ ryang.dev' }: CardOpts): Promise<Uint8Array> {
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '72px',
          background: '#06080d',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, #16202b 1px, transparent 0)',
          backgroundSize: '32px 32px',
          fontFamily: 'JetBrains Mono',
        },
        children: [
          { type: 'div', props: { style: { color: '#00e5ff', fontSize: 28, marginBottom: 24 }, children: kicker } },
          { type: 'div', props: { style: { color: '#f0f8ff', fontSize: 72, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }, children: title } },
          subtitle
            ? { type: 'div', props: { style: { color: '#7a93a8', fontSize: 32, marginTop: 24, maxWidth: 980 }, children: subtitle } }
            : { type: 'div', props: {} },
          {
            type: 'div',
            props: {
              style: { display: 'flex', marginTop: 'auto', color: '#4d5b6b', fontSize: 24, alignItems: 'center' },
              children: [
                { type: 'div', props: { style: { color: '#ff2e88', marginRight: 12 }, children: '●' } },
                { type: 'div', props: { children: 'ryang.dev · self-hosted' } },
              ],
            },
          },
        ],
      },
    } as any,
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: 'JetBrains Mono', data: regular, weight: 400, style: 'normal' },
        { name: 'JetBrains Mono', data: bold, weight: 800, style: 'normal' },
      ],
    }
  );

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } })
    .render()
    .asPng();
  // Return a plain Uint8Array — directly accepted by the web Response body
  // (a Node Buffer is not assignable to BodyInit in Astro's types).
  return new Uint8Array(png);
}
