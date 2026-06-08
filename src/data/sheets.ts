/**
 * Google Sheets GMP CMS (Part 1).
 *
 * You maintain GMP by editing a published Google Sheet; the site fetches it.
 * Expected columns (in this order):
 *   name | slug | gmp | kostak | sub2 | sentiment | last_updated
 *
 * Set SHEETS_GMP_URL to EITHER:
 *   - a "Publish to web" CSV URL  (…/pub?gid=0&single=true&output=csv), or
 *   - a gviz JSON URL             (…/gviz/tq?tqx=out:json&sheet=Sheet1)
 * Both are auto-detected.
 *
 * Results are cached in-memory for 10 minutes. NOTE: on serverless (Vercel) the
 * cache lives per warm instance, so cold starts re-fetch — which is fine and keeps
 * data fresh. A failed/empty/missing fetch returns [] so callers fall back silently.
 */

export interface GmpEntry {
  name: string;
  slug: string;
  gmp: number;
  kostak: number;
  sub2: number;
  sentiment: string;
  lastUpdated: string;
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes
let cache: { at: number; data: GmpEntry[] } | null = null;

/** Read SHEETS_GMP_URL. Static import.meta.env access (build/dev) + process.env (runtime). */
function getSheetsUrl(): string | undefined {
  const fromMeta = import.meta.env.SHEETS_GMP_URL as string | undefined;
  const fromProc = (globalThis as any)?.process?.env?.SHEETS_GMP_URL as string | undefined;
  return fromMeta || fromProc || undefined;
}

/** Pull the first number out of a cell like "₹196", "+34", "1.2x", "12,500". */
function num(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim();
}

/** Minimal RFC-4180-ish CSV parser (handles quoted fields and embedded commas). */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field); field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((f) => f.length)) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field.length || row.length) { row.push(field); if (row.some((f) => f.length)) rows.push(row); }
  return rows;
}

// gviz JSON arrives wrapped in a JS callback prefix/suffix; slice to the JSON body.
function parseGviz(text: string): GmpEntry[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) return [];
  const json = JSON.parse(text.slice(start, end + 1));
  const rows: any[] = json?.table?.rows ?? [];
  return rows
    .map((r) => {
      const c = r.c ?? [];
      const cell = (i: number) => (c[i] ? (c[i].v ?? c[i].f) : undefined);
      return {
        name: str(cell(0)),
        slug: str(cell(1)),
        gmp: num(cell(2)),
        kostak: num(cell(3)),
        sub2: num(cell(4)),
        sentiment: str(cell(5)),
        lastUpdated: str(cell(6)),
      };
    })
    .filter((e) => e.name || e.slug);
}

function rowsToEntries(rows: string[][]): GmpEntry[] {
  if (!rows.length) return [];
  // Drop the header row if the first cell looks like a header.
  const first = (rows[0][0] || '').toLowerCase();
  const body = first === 'name' ? rows.slice(1) : rows;
  return body
    .map((r) => ({
      name: str(r[0]),
      slug: str(r[1]),
      gmp: num(r[2]),
      kostak: num(r[3]),
      sub2: num(r[4]),
      sentiment: str(r[5]),
      lastUpdated: str(r[6]),
    }))
    .filter((e) => e.name || e.slug);
}

/**
 * Fetch + parse the GMP sheet. Cached for 10 minutes. Never throws — returns []
 * on any failure (missing URL, network error, bad payload).
 */
export async function getGmpEntries(): Promise<GmpEntry[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.data;

  const url = getSheetsUrl();
  if (!url) return cache?.data ?? [];

  try {
    const res = await fetch(url, {
      headers: { Accept: 'text/csv, application/json, text/plain, */*' },
      // @ts-expect-error - Vercel/undici fetch honors this; ignored elsewhere.
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const looksJson =
      /tqx=out:json|gviz/i.test(url) ||
      text.startsWith('/*O_o*/') ||
      text.includes('google.visualization');

    const data = looksJson ? parseGviz(text) : rowsToEntries(parseCSV(text));
    cache = { at: Date.now(), data };
    return data;
  } catch (err) {
    console.warn('[sheets] GMP fetch failed, using fallback:', (err as Error).message);
    return cache?.data ?? [];
  }
}

/** Convenience: GMP entries keyed by slug (and by lowercased name as backup). */
export async function getGmpMap(): Promise<Map<string, GmpEntry>> {
  const entries = await getGmpEntries();
  const map = new Map<string, GmpEntry>();
  for (const e of entries) {
    if (e.slug) map.set(e.slug, e);
    if (e.name) map.set('name:' + e.name.toLowerCase(), e);
  }
  return map;
}
