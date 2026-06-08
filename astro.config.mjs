// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://ipoviews.com',
  // Static by default (fast + SEO). Pages opt into SSR with `export const prerender = false`
  // — used by /admin and the homepage so Google-Sheets GMP edits appear live.
  output: 'static',
  adapter: vercel(),
  integrations: [sitemap()],
  vite: {
    // Cast: @tailwindcss/vite and astro can resolve slightly different vite
    // Plugin types depending on hoisting; the plugin is valid at runtime.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});
