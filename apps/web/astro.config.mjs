// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
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
    server: { host: true },
  },
  server: { port: 4321, host: true },
});
