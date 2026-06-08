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
import type { IPO, GlobalIPO } from './types';
import { ipos as seedIpos } from './ipos';
import { getGmpMap, getGmpEntries } from './sheets';

import globalRaw from '../../data/global-ipos.json';

const globalData = globalRaw as { generatedAt: string | null; ipos: GlobalIPO[] };

/* ------------------------------------------------------------------ *
 * Apply live Google-Sheets GMP on top of the seed (async).
 * ------------------------------------------------------------------ */
async function applyGmp(list: IPO[]): Promise<IPO[]> {
  const gmpMap = await getGmpMap();
  if (gmpMap.size === 0) return list;
  return list.map((ipo) => {
    const g = gmpMap.get(ipo.slug) ?? gmpMap.get('name:' + ipo.name.toLowerCase());
    if (!g) return ipo;
    const next: IPO = { ...ipo, gmp: g.gmp, gmpLastUpdated: g.lastUpdated || ipo.gmpLastUpdated };
    if (g.kostak) next.kostak = g.kostak;
    // Keep the trend chart honest: append today's GMP point if it moved.
    if (next.gmpHistory.length) {
      const last = next.gmpHistory[next.gmpHistory.length - 1];
      if (last.gmp !== g.gmp) {
        const today = new Date().toISOString().slice(0, 10);
        next.gmpHistory =
          last.date === today
            ? [...next.gmpHistory.slice(0, -1), { date: today, gmp: g.gmp }]
            : [...next.gmpHistory, { date: today, gmp: g.gmp }];
      }
    }
    return next;
  });
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
