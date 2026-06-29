// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

/**
 * Inline `*.ttf?arraybuffer` imports as a base64-decoded ArrayBuffer baked into
 * the chunk. Lets the OG card embed fonts with no runtime filesystem read
 * (works identically in dev + the built standalone server).
 */
function ttfArrayBuffer() {
  return {
    name: 'ttf-arraybuffer',
    /** @param {string} code @param {string} id */
    transform(code, id) {
      void code;
      if (!id.endsWith('.ttf?arraybuffer')) return null;
      const file = id.replace(/\?arraybuffer$/, '');
      const b64 = readFileSync(file).toString('base64');
      return {
        code:
          `const b=atob(${JSON.stringify(b64)});` +
          `const a=new Uint8Array(b.length);` +
          `for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);` +
          `export default a.buffer;`,
        map: null,
      };
    },
  };
}
// NOTE: @astrojs/sitemap is added back in M4 (blog). In full `output: 'server'`
// mode with zero prerendered pages it crashes at build:done; it needs
// prerenderable content + per-route prerender config, which lands with the blog.

// SSR mode: the recruiter gate + server-token PB reads require a server.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://ryang.dev',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [svelte(), mdx()],
  // The site sits behind the router's Caddy; trust forwarded headers so
  // Astro.url / cookie Secure flag reflect the public HTTPS origin.
  vite: {
    plugins: [ttfArrayBuffer(), tailwindcss()],
    server: { host: true },
    define: {
      // Surfaced in the build-info footer. CI/deploy can override via env.
      'import.meta.env.PUBLIC_BUILD_SHA': JSON.stringify(
        process.env.PUBLIC_BUILD_SHA || process.env.GIT_SHA || 'dev'
      ),
    },
  },
  server: { port: 4321, host: true },
});
