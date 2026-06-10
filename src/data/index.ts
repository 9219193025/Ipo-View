/**
 * Unified data layer.
 *
 * India strategy: **Google Sheets only.**
 *   - Structural data (dates, price band, lot, subscription, GMP history, lead
 *     managers) comes from the static seed in `src/data/ipos.ts`.
 *   - Live GMP / Kostak / sub2 / last_updated come from your Google Sheet at runtime
 *     (10-min cache; see sheets.ts). A missing/failed Sheet fetch falls back to seed.
 *   (NSE/BSE auto-scraping was removed — their endpoints block cloud/CI IPs.)
 *
 * Global strategy: SEC EDGAR (US) + HKEX (HK) via the GitHub Actions scraper, read
 * from data/global-ipos.json at build time.
 *
 * Exports: getIndiaIPOs(), getGlobalIPOs(), getIPOBySlug(), getSyncMeta(), getGmpFreshness().
 * `getIPOs()` is kept as an alias of getIndiaIPOs().
 */
import type { IPO, IpoType, Exchange, IpoStatus, GlobalIPO } from './types';
import { ipos as seedIpos } from './ipos';
import { getGmpMap, getGmpEntries, type GmpEntry } from './sheets';

import globalRaw from '../../data/global-ipos.json';

const globalData = globalRaw as { generatedAt: string | null; ipos: GlobalIPO[] };

/* ------------------------------------------------------------------ *
 * Sheet → IPO field coercion helpers.
 * ------------------------------------------------------------------ */
const VALID_TYPES: IpoType[] = ['mainboard', 'sme'];
const VALID_EXCHANGES: Exchange[] = ['NSE', 'BSE', 'NSE+BSE'];
const VALID_STATUSES: IpoStatus[] = ['upcoming', 'open', 'closed', 'allotment', 'listed'];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function coerceType(v: string, fallback: IpoType): IpoType {
  const t = v.toLowerCase();
  return (VALID_TYPES as string[]).includes(t) ? (t as IpoType) : fallback;
}
function coerceExchange(v: string, fallback: Exchange): Exchange {
  const hit = VALID_EXCHANGES.find((e) => e.toLowerCase() === v.toLowerCase());
  return hit ?? fallback;
}
function coerceStatus(v: string, fallback: IpoStatus): IpoStatus {
  const s = v.toLowerCase();
  return (VALID_STATUSES as string[]).includes(s) ? (s as IpoStatus) : fallback;
}

/** Append today's GMP point to a history array if the value moved. */
function withTodayGmp(history: IPO['gmpHistory'], gmp: number): IPO['gmpHistory'] {
  if (!history.length) return [{ date: new Date().toISOString().slice(0, 10), gmp }];
  const last = history[history.length - 1];
  if (last.gmp === gmp) return history;
  const today = new Date().toISOString().slice(0, 10);
  return last.date === today
    ? [...history.slice(0, -1), { date: today, gmp }]
    : [...history, { date: today, gmp }];
}

/** Merge a Sheet row onto an existing seed IPO — Sheet values win when present. */
function mergeOntoSeed(ipo: IPO, g: GmpEntry): IPO {
  const next: IPO = {
    ...ipo,
    gmp: g.gmp,
    gmpLastUpdated: g.lastUpdated || ipo.gmpLastUpdated,
  };
  if (g.kostak) next.kostak = g.kostak;
  if (g.sub2) next.subscription = { ...ipo.subscription, total: g.sub2 };
  if (g.type) next.type = coerceType(g.type, ipo.type);
  if (g.exchange) next.exchange = coerceExchange(g.exchange, ipo.exchange);
  if (g.priceMin != null) next.priceBand = { ...next.priceBand, min: g.priceMin };
  if (g.priceMax != null) next.priceBand = { ...next.priceBand, max: g.priceMax };
  if (g.lotSize != null) next.lotSize = g.lotSize;
  if (g.openDate) next.openDate = g.openDate;
  if (g.closeDate) next.closeDate = g.closeDate;
  if (g.allotmentDate) next.allotmentDate = g.allotmentDate;
  if (g.listingDate) next.listingDate = g.listingDate;
  if (g.status) next.status = coerceStatus(g.status, ipo.status);
  if (g.registrar) next.registrar = g.registrar;
  next.gmpHistory = withTodayGmp(ipo.gmpHistory, g.gmp);
  return next;
}

/** Build a brand-new IPO from a Sheet row that has no seed counterpart. */
function ipoFromSheet(g: GmpEntry): IPO {
  const slug = g.slug || slugify(g.name);
  const min = g.priceMin ?? 0;
  const max = g.priceMax ?? min;
  return {
    slug,
    name: g.name,
    type: coerceType(g.type, 'mainboard'),
    exchange: coerceExchange(g.exchange, 'NSE+BSE'),
    priceBand: { min, max },
    lotSize: g.lotSize ?? 0,
    openDate: g.openDate,
    closeDate: g.closeDate,
    allotmentDate: g.allotmentDate,
    listingDate: g.listingDate,
    gmp: g.gmp,
    gmpHistory: g.gmp ? [{ date: new Date().toISOString().slice(0, 10), gmp: g.gmp }] : [],
    subscription: { qib: 0, nii: 0, rii: 0, total: g.sub2 },
    registrar: g.registrar,
    status: coerceStatus(g.status, 'upcoming'),
    gmpLastUpdated: g.lastUpdated || undefined,
    kostak: g.kostak || undefined,
  };
}

/* ------------------------------------------------------------------ *
 * Apply the live Google-Sheets data on top of the seed (async).
 * Sheet rows that match a seed IPO (by slug, else name) override its fields;
 * unmatched rows become brand-new IPOs. Seed is the fallback when the Sheet
 * is empty/unreachable.
 * ------------------------------------------------------------------ */
async function applyGmp(list: IPO[]): Promise<IPO[]> {
  const gmpMap = await getGmpMap();
  if (gmpMap.size === 0) return list;

  const merged = list.map((ipo) => {
    const g = gmpMap.get(ipo.slug) ?? gmpMap.get('name:' + ipo.name.toLowerCase());
    return g ? mergeOntoSeed(ipo, g) : ipo;
  });

  // Track which Sheet rows were consumed by a seed IPO so the rest become new.
  const usedSlugs = new Set(list.map((i) => i.slug));
  const usedNames = new Set(list.map((i) => i.name.toLowerCase()));

  const entries = await getGmpEntries();
  for (const g of entries) {
    if (!g.name) continue;
    const slug = g.slug || slugify(g.name);
    if (usedSlugs.has(slug) || usedNames.has(g.name.toLowerCase())) continue;
    usedSlugs.add(slug);
    usedNames.add(g.name.toLowerCase());
    merged.push(ipoFromSheet(g));
  }

  return merged;
}

/* ------------------------------------------------------------------ *
 * Public API
 * ------------------------------------------------------------------ */

/** All India IPOs: static seed overlaid with live Google-Sheets GMP. */
export async function getIndiaIPOs(): Promise<IPO[]> {
  return applyGmp(seedIpos.map((i) => ({ ...i })));
}

/** Alias kept for earlier naming. */
export const getIPOs = getIndiaIPOs;

/** A single India IPO by slug. */
export async function getIPOBySlug(slug: string): Promise<IPO | undefined> {
  return (await getIndiaIPOs()).find((i) => i.slug === slug);
}

/** Upcoming US/HK IPOs (global tracker). */
export function getGlobalIPOs(): GlobalIPO[] {
  return globalData.ipos ?? [];
}

/** Global-scraper freshness (used by /global). */
export interface SyncMeta {
  globalGeneratedAt: string | null;
}
export function getSyncMeta(): SyncMeta {
  return { globalGeneratedAt: globalData.generatedAt };
}

/** GMP freshness from the Google Sheet (used by the homepage indicator). */
export interface GmpFreshness {
  configured: boolean; // is a sheet returning rows?
  ageMinutes: number | null; // since the newest last_updated
  stale: boolean; // newest update older than 2 hours
}
export async function getGmpFreshness(): Promise<GmpFreshness> {
  const entries = await getGmpEntries();
  let newest: number | null = null;
  for (const e of entries) {
    const t = Date.parse(e.lastUpdated);
    if (!Number.isNaN(t) && (newest === null || t > newest)) newest = t;
  }
  const ageMinutes = newest != null ? Math.max(0, Math.round((Date.now() - newest) / 60000)) : null;
  return {
    configured: entries.length > 0,
    ageMinutes,
    stale: ageMinutes != null && ageMinutes > 120,
  };
}
