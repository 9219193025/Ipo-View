/**
 * Pure derivation + formatting helpers. No side effects, safe at build time.
 * These encode the brief's "better than competitor" feature logic.
 */
import type { IPO, GmpPoint, IpoStatus } from './types';

/* ------------------------------------------------------------------ *
 * Formatting (Indian numbering, ₹, mono-friendly)
 * ------------------------------------------------------------------ */

/** ₹ with Indian digit grouping. `rupee(12500)` → "₹12,500". */
export function rupee(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? '+' : '';
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return `${n < 0 ? '−' : sign}₹${formatted}`;
}

/** Subscription multiple, e.g. 42.317 → "42.32x". */
export function times(n: number): string {
  return `${n.toFixed(2)}x`;
}

/** Signed percent, e.g. 12.5 → "+12.5%". */
export function pct(n: number, digits = 1): string {
  const s = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${s}${Math.abs(n).toFixed(digits)}%`;
}

/** "12 Jun 2026" from ISO. Returns "—" for falsy. */
export function fmtDate(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "12 Jun" short form. */
export function fmtDateShort(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

/* ------------------------------------------------------------------ *
 * Feature #2 — Smart Listing Estimator
 * Formula: Issue Price (cap) + GMP = Estimated Listing.
 * Min/Max derived from recent GMP volatility; "most likely" = cap + current GMP.
 * ------------------------------------------------------------------ */

export interface ListingEstimate {
  base: number; // issue price (upper band)
  gmp: number;
  min: number;
  max: number;
  likely: number;
  gainPct: number; // expected listing gain % at "likely"
}

export function listingEstimate(ipo: IPO): ListingEstimate {
  const base = ipo.priceBand.max;
  const gmp = ipo.gmp;
  const history = ipo.gmpHistory.map((p) => p.gmp);
  const lo = history.length ? Math.min(...history, gmp) : gmp;
  const hi = history.length ? Math.max(...history, gmp) : gmp;
  // Conservative band: blend current GMP with observed extremes.
  const min = base + Math.round((lo + gmp) / 2 * 0.85);
  const max = base + Math.round((hi + gmp) / 2 * 1.1);
  const likely = base + gmp;
  const gainPct = base > 0 ? ((likely - base) / base) * 100 : 0;
  return { base, gmp, min, max, likely, gainPct };
}

/** GMP as % of issue price (upper band). */
export function gmpPct(ipo: IPO): number {
  return ipo.priceBand.max > 0 ? (ipo.gmp / ipo.priceBand.max) * 100 : 0;
}

/* ------------------------------------------------------------------ *
 * Feature #3 — GMP trend (rising/falling + % change)
 * ------------------------------------------------------------------ */

export interface GmpTrend {
  direction: 'up' | 'down' | 'flat';
  changePct: number; // vs earliest point in window
  changeAbs: number;
  arrow: '▲' | '▼' | '—';
}

export function gmpTrend(history: GmpPoint[]): GmpTrend {
  if (history.length < 2) return { direction: 'flat', changePct: 0, changeAbs: 0, arrow: '—' };
  const first = history[0].gmp;
  const last = history[history.length - 1].gmp;
  const changeAbs = last - first;
  const changePct = first !== 0 ? (changeAbs / Math.abs(first)) * 100 : 0;
  const direction = changeAbs > 0 ? 'up' : changeAbs < 0 ? 'down' : 'flat';
  return {
    direction,
    changePct,
    changeAbs,
    arrow: direction === 'up' ? '▲' : direction === 'down' ? '▼' : '—',
  };
}

/* ------------------------------------------------------------------ *
 * Feature #9 — GMP Sentiment Badge
 * Combines GMP magnitude (% of price) with short-term trend direction.
 * ------------------------------------------------------------------ */

export type SentimentKey = 'hot' | 'rising' | 'cooling' | 'weak';

export interface Sentiment {
  key: SentimentKey;
  label: string;
  emoji: string;
  tone: 'pos' | 'warn' | 'neg';
}

export function sentiment(ipo: IPO): Sentiment {
  const p = gmpPct(ipo);
  const t = gmpTrend(ipo.gmpHistory);
  if (p < 5 || ipo.gmp <= 0) return { key: 'weak', label: 'Weak', emoji: '❌', tone: 'neg' };
  if (p >= 25 && t.direction !== 'down') return { key: 'hot', label: 'Hot', emoji: '🔥', tone: 'pos' };
  if (t.direction === 'down') return { key: 'cooling', label: 'Cooling', emoji: '⚠️', tone: 'warn' };
  return { key: 'rising', label: 'Rising', emoji: '📈', tone: 'pos' };
}

/* ------------------------------------------------------------------ *
 * Feature #1 — GMP Accuracy Score
 * For listed IPOs: how close was (issue price + last-GMP estimate) to the
 * actual listing price? 100% = perfect. Lower as the miss grows.
 * ------------------------------------------------------------------ */

export interface AccuracyResult {
  estimated: number;
  actual: number;
  errorPct: number; // |est-actual| / actual
  score: number; // 0..100
}

export function gmpAccuracy(ipo: IPO): AccuracyResult | null {
  if (ipo.status !== 'listed' || ipo.listingPrice == null) return null;
  // Use the GMP closest to listing (last history point or current).
  const lastGmp = ipo.gmpHistory.length
    ? ipo.gmpHistory[ipo.gmpHistory.length - 1].gmp
    : ipo.gmp;
  const estimated = ipo.priceBand.max + lastGmp;
  const actual = ipo.listingPrice;
  const errorPct = actual > 0 ? Math.abs(estimated - actual) / actual : 1;
  const score = Math.max(0, Math.round((1 - errorPct) * 100));
  return { estimated, actual, errorPct: errorPct * 100, score };
}

/** Actual listing gain % for a listed IPO. */
export function listingGain(ipo: IPO): number | null {
  if (ipo.listingPrice == null) return null;
  const base = ipo.priceBand.max;
  return base > 0 ? ((ipo.listingPrice - base) / base) * 100 : null;
}

/** Site-wide average accuracy across all listed IPOs. */
export function siteAccuracy(ipos: IPO[]): { score: number; count: number } {
  const results = ipos.map(gmpAccuracy).filter((r): r is AccuracyResult => r != null);
  if (!results.length) return { score: 0, count: 0 };
  const score = Math.round(results.reduce((a, r) => a + r.score, 0) / results.length);
  return { score, count: results.length };
}

/* ------------------------------------------------------------------ *
 * Market sentiment (homepage) — Bullish / Neutral / Bearish from avg GMP%
 * ------------------------------------------------------------------ */

export type MarketMood = 'Bullish' | 'Neutral' | 'Bearish';

export function marketSentiment(ipos: IPO[]): { mood: MarketMood; avgGmpPct: number; tone: 'pos' | 'warn' | 'neg' } {
  const active = ipos.filter((i) => i.status === 'open' || i.status === 'upcoming' || i.status === 'closed');
  const pool = active.length ? active : ipos;
  const avg = pool.length ? pool.reduce((a, i) => a + gmpPct(i), 0) / pool.length : 0;
  if (avg >= 18) return { mood: 'Bullish', avgGmpPct: avg, tone: 'pos' };
  if (avg < 7) return { mood: 'Bearish', avgGmpPct: avg, tone: 'neg' };
  return { mood: 'Neutral', avgGmpPct: avg, tone: 'warn' };
}

/* ------------------------------------------------------------------ *
 * Market hours indicator (IST). NSE/BSE: Mon–Fri 09:15–15:30 IST.
 * Computed at request/build time. For static build this reflects build time;
 * a tiny client script in Header re-evaluates live.
 * ------------------------------------------------------------------ */

export function isMarketOpenIST(now: Date = new Date()): boolean {
  // Convert to IST regardless of server tz.
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay(); // 0 Sun .. 6 Sat
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

/* ------------------------------------------------------------------ *
 * Status helpers + tone mapping
 * ------------------------------------------------------------------ */

export const STATUS_LABEL: Record<IpoStatus, string> = {
  upcoming: 'Upcoming',
  open: 'Open',
  closed: 'Closed',
  allotment: 'Allotment',
  listed: 'Listed',
};

export function statusTone(s: IpoStatus): 'info' | 'brand' | 'warn' | 'muted' {
  switch (s) {
    case 'open': return 'info';
    case 'upcoming': return 'brand';
    case 'closed':
    case 'allotment': return 'warn';
    case 'listed': return 'muted';
  }
}

/* ------------------------------------------------------------------ *
 * Feature #10 — Registrar direct links (auto-detect)
 * ------------------------------------------------------------------ */

export interface Registrar {
  name: string;
  url: string;
}

const REGISTRAR_LINKS: { match: RegExp; name: string; url: string }[] = [
  { match: /kfin/i, name: 'KFin Technologies', url: 'https://ipostatus.kfintech.com/' },
  { match: /link\s*intime|linkintime/i, name: 'Link Intime', url: 'https://linkintime.co.in/initial_offer/public-issues.html' },
  { match: /bigshare/i, name: 'Bigshare Services', url: 'https://ipo.bigshareonline.com/ipo_status.html' },
  { match: /maashitla/i, name: 'Maashitla Securities', url: 'https://maashitla.com/allotment-status/public-issues' },
  { match: /cameo/i, name: 'Cameo Corporate', url: 'https://ipo.cameoindia.com/' },
  { match: /skyline/i, name: 'Skyline Financial', url: 'https://www.skylinerta.com/ipo.php' },
];

export function registrarLink(registrar: string): Registrar {
  const hit = REGISTRAR_LINKS.find((r) => r.match.test(registrar));
  return hit
    ? { name: hit.name, url: hit.url }
    : { name: registrar, url: 'https://www.google.com/search?q=' + encodeURIComponent(registrar + ' IPO allotment status') };
}

/** All registrars for the allotment page directory. */
export function allRegistrars(): Registrar[] {
  return REGISTRAR_LINKS.map((r) => ({ name: r.name, url: r.url }));
}

/* ------------------------------------------------------------------ *
 * Feature #6 — Broker apply deep links
 * ------------------------------------------------------------------ */

export interface Broker {
  name: string;
  url: string;
  color: string; // brand color for the chip border/text
}

export const BROKERS: Broker[] = [
  { name: 'Zerodha', url: 'https://zerodha.com/open-account/?utm_source=ipoviews', color: '#387ED1' },
  { name: 'Groww', url: 'https://groww.in/ipo?utm_source=ipoviews', color: '#00D09C' },
  { name: 'Upstox', url: 'https://upstox.com/open-account/?utm_source=ipoviews', color: '#8B5CF6' },
  { name: 'Angel One', url: 'https://www.angelone.in/ipo?utm_source=ipoviews', color: '#E03C31' },
];

/* ------------------------------------------------------------------ *
 * Sorting / grouping convenience
 * ------------------------------------------------------------------ */

export function byGmpDesc(a: IPO, b: IPO): number {
  return b.gmp - a.gmp;
}

export function totalSubscriptionSum(ipos: IPO[]): number {
  const open = ipos.filter((i) => i.status === 'open');
  return open.reduce((a, i) => a + i.subscription.total, 0);
}
