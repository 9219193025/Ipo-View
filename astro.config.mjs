// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://ipoviews.com',
  // Static by default (fast + SEO). Pages opt into SSR with `export const prerender = false`
  // — used by /admin and the homepage so Google-Sheets GMP edits appear live.
  output: 'static',
  adapter: vercel(),
  // Astro's CSRF guard (`checkOrigin`, on by default) compares the POST `Origin`
  // header against the request host. Behind Vercel's proxy these don't match, so
  // every /admin form POST was rejected with "Cross-site POST form submissions are
  // forbidden". We turn it off because /admin already has its own CSRF protection:
  // the auth cookie is `sameSite: 'strict'`, so it is never sent on a cross-site
  // request and a forged POST can't be authenticated. (/ is the only other SSR
  // route and it processes no POSTs.)
  security: { checkOrigin: false },
  // Sitemap is served by a dynamic SSR endpoint (src/pages/sitemap.xml.ts) instead of
  // @astrojs/sitemap, because the homepage and all /ipo/[slug] pages are SSR
  // (prerender:false) and would be silently omitted from a build-time sitemap.
  integrations: [],
  vite: {
    // Cast: @tailwindcss/vite and astro can resolve slightly different vite
    // Plugin types depending on hoisting; the plugin is valid at runtime.
    plugins: [/** @type {any} */ (tailwindcss())],
  },
});
