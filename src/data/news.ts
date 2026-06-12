/**
 * Latest IPO / market news from free RSS feeds (Improvement #3).
 *
 * Server-side only (called from .astro frontmatter). Tries each feed in priority
 * order and returns the first that parses; if all fail, returns [] so the caller
 * can hide the section silently. Results are cached in-module for 30 minutes to
 * avoid hammering the feeds on every SSR request.
 *
 * No XML library — feeds are small and regular, so a tolerant regex parser keeps
 * us dependency-free (DESIGN.md: zero-JS / minimal footprint ethos).
 */

export interface NewsItem {
  title: string;
  link: string;
  pubDate: string; // raw RSS date string
  description: string; // first ~120 chars, plain text
  source: string; // human label, e.g. "ET Markets"
}

interface Feed {
  url: string;
  source: string;
}

// All feeds are aggregated (not first-wins) so one slow/dead source can't blank
// the section. India has no reliable IPO-only public RSS feed anymore (the old
// ET `/markets/ipos/rss` 404s and Moneycontrol's `ipo.xml` 502s), so we pull the
// markets feeds below and filter to IPO-relevant headlines in getNews(), backfilling
// with general market news so the section is never empty.
const FEEDS: Feed[] = [
  { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'ET Markets' },
  { url: 'https://www.moneycontrol.com/rss/latestnews.xml', source: 'Moneycontrol' },
  { url: 'https://www.livemint.com/rss/markets', source: 'Mint' },
];

// Headlines mentioning these are treated as IPO news and floated to the top.
const IPO_RE =
  /\bIPO\b|\bIPOs\b|grey market|\bGMP\b|listing gain|lists? on|market debut|stock debut|subscri\w*|anchor investor|allotment|red herring|\bDRHP\b|mainboard|\bSME\b/i;

function isIpoRelevant(n: NewsItem): boolean {
  return IPO_RE.test(n.title) || IPO_RE.test(n.description);
}

const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
let cache: { at: number; items: NewsItem[] } | null = null;

/** Strip CDATA wrappers and HTML tags, collapse whitespace, decode basic entities. */
function clean(raw: string): string {
  let s = raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
    .replace(/\s+/g, ' ')
    .trim();
  return s;
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? m[1] : '';
}

function parseRss(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = clean(tag(block, 'title'));
    // <link> may be a text node or (Atom) an href attribute.
    let link = clean(tag(block, 'link'));
    if (!link) {
      const m = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      if (m) link = m[1];
    }
    if (!title || !link) continue;
    const desc = clean(tag(block, 'description') || tag(block, 'summary'));
    items.push({
      title,
      link,
      pubDate: clean(tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'dc:date')),
      description: desc.length > 120 ? desc.slice(0, 120).trimEnd() + '…' : desc,
      source,
    });
  }
  return items;
}

/** Fetch + parse a single feed; returns [] on any failure. */
async function fetchFeed(feed: Feed): Promise<NewsItem[]> {
  try {
    const res = await fetch(feed.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IPOViews/1.0; +https://ipoviews.com)' },
      // Astro/Vite respects standard fetch cache hints during SSR.
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRss(xml, feed.source);
  } catch {
    return [];
  }
}

/**
 * Latest news items. Fetches every feed in parallel, dedupes by title, sorts
 * newest-first, then ranks IPO-relevant headlines ahead of general market news
 * (so the homepage "IPO News" section is IPO-led but never empty). Cached for
 * 30 minutes. Returns [] only if every feed fails.
 */
export async function getNews(limit = 6): Promise<NewsItem[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.items.slice(0, limit);
  }

  const settled = await Promise.allSettled(FEEDS.map(fetchFeed));
  const all = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));

  // Dedupe by normalized title (same story syndicated across feeds).
  const seen = new Set<string>();
  const unique = all.filter((n) => {
    const key = n.title.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Newest first; items with an unparseable date sink to the bottom.
  const ts = (d: string) => {
    const t = Date.parse(d);
    return Number.isNaN(t) ? 0 : t;
  };
  unique.sort((a, b) => ts(b.pubDate) - ts(a.pubDate));

  // IPO-relevant headlines first (date-sorted), then general market news to fill.
  const ipo = unique.filter(isIpoRelevant);
  const rest = unique.filter((n) => !isIpoRelevant(n));
  const ranked = [...ipo, ...rest];

  if (ranked.length) cache = { at: Date.now(), items: ranked };
  return ranked.slice(0, limit);
}

/** Relative/short date: "2 hours ago" / "Yesterday" / "12 Jun". */
export function timeAgo(pubDate: string, now: Date = new Date()): string {
  const t = Date.parse(pubDate);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  const diffMs = now.getTime() - t;
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  // Same-calendar-yesterday check.
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
