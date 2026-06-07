// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://ipoviews.com',
  integrations: [sitemap()],
  vite: {
    // Cast: @tailwindcss/vite and astro can resolve slightly different vite
    // Plugin types depending on hoisting; the plugin is valid at runtime.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});
