import type { APIRoute } from 'astro';
import { getIndiaIPOs } from '../data/index';
import { ARTICLES } from '../data/articles';

// SSR so the homepage and every live /ipo/[slug] page (both prerender:false, and
// therefore invisible to the build-time sitemap integration) are always included.
export const prerender = false;

interface Entry {
  loc: string;          // path, leading slash
  changefreq: string;
  priority: string;
  lastmod?: string;     // YYYY-MM-DD
}

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const GET: APIRoute = async ({ site }) => {
  const base = (site ?? new URL('https://ipoviews.com')).href.replace(/\/$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const entries: Entry[] = [
    { loc: '/', changefreq: 'daily', priority: '1.0', lastmod: today },
    // Core static, indexable routes (excludes /admin, /404, /500).
    { loc: '/listed', changefreq: 'daily', priority: '0.9' },
    { loc: '/calendar', changefreq: 'daily', priority: '0.9' },
    { loc: '/allotment', changefreq: 'daily', priority: '0.8' },
    { loc: '/compare', changefreq: 'weekly', priority: '0.7' },
    { loc: '/news', changefreq: 'daily', priority: '0.7' },
    { loc: '/global', changefreq: 'daily', priority: '0.6' },
    { loc: '/learn', changefreq: 'weekly', priority: '0.7' },
    { loc: '/about', changefreq: 'monthly', priority: '0.4' },
    { loc: '/contact', changefreq: 'yearly', priority: '0.3' },
    { loc: '/privacy-policy', changefreq: 'yearly', priority: '0.2' },
    { loc: '/terms', changefreq: 'yearly', priority: '0.2' },
  ];

  // Education articles.
  for (const a of ARTICLES) {
    entries.push({ loc: `/learn/${a.slug}`, changefreq: 'monthly', priority: '0.6' });
  }

  // Every live India IPO detail page (the most valuable, otherwise-missing URLs).
  try {
    const ipos = await getIndiaIPOs();
    for (const ipo of ipos) {
      const active = ipo.status === 'open' || ipo.status === 'upcoming';
      entries.push({
        loc: `/ipo/${ipo.slug}`,
        changefreq: active ? 'daily' : 'weekly',
        priority: active ? '0.9' : '0.6',
        lastmod: today,
      });
    }
  } catch {
    // If the live data source is unreachable, still serve the static URL set.
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((e) => {
    const lastmod = e.lastmod ? `\n    <lastmod>${e.lastmod}</lastmod>` : '';
    return `  <url>
    <loc>${xmlEscape(base + e.loc)}</loc>${lastmod}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`;
  })
  .join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      // Cache at the CDN edge for an hour; IPO additions appear within that window.
      'Cache-Control': 'public, max-age=0, s-maxage=3600',
    },
  });
};
