// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import svelte from '@astrojs/svelte';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// SSR mode: the recruiter gate + server-token PB reads require a server.
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://ryang.dev',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [svelte(), mdx(), sitemap()],
  // The site sits behind the router's Caddy; trust forwarded headers so
  // Astro.url / cookie Secure flag reflect the public HTTPS origin.
  vite: {
    server: { host: true },
  },
  server: { port: 4321, host: true },
});
