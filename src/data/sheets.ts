/**
 * Google Sheets IPO CMS (Part 1).
 *
 * You maintain India IPOs by editing a published Google Sheet; the site fetches it.
 * The Sheet is now the source of truth for the *full* IPO record, not just GMP.
 *
 * Expected columns (header row, lowercase — order is flexible, extras are ignored):
 *   name | slug | type | exchange | price_min | price_max | lot_size |
 *   open_date | close_date | allotment_date | listing_date |
 *   gmp | kostak | sub2 | status | registrar | sentiment | last_updated
 *
 * Only `name` is strictly required per row; every other column is optional and
 * falls back to the code seed (for existing IPOs) or a sensible default (for new ones).
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
  /** '' when the cell was blank — callers treat blanks as "keep seed/default". */
  type: string;
  exchange: string;
  priceMin: number | null;
  priceMax: number | null;
  lotSize: number | null;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listingDate: string;
  gmp: number;
  kostak: number;
  sub2: number;
  status: string;
  registrar: string;
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

/** Pull the first number out of a cell like "₹196", "+34", "1.2x", "12,500". Blank → null. */
function numOrNull(v: unknown): number | null {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  if (!s) return null;
  const m = s.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

/** Like numOrNull but blanks/garbage become 0 (for GMP/kostak/sub where 0 is meaningful). */
function num(v: unknown): number {
  return numOrNull(v) ?? 0;
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

/** Map of normalized header name → column index. */
type ColMap = Record<string, number>;

function headerMap(headerRow: unknown[]): ColMap {
  const map: ColMap = {};
  headerRow.forEach((h, i) => {
    const key = String(h ?? '').trim().toLowerCase();
    if (key && !(key in map)) map[key] = i;
  });
  return map;
}

/** Build a GmpEntry from a row + header map. `cell(i)` reads a raw value by column index. */
function rowToEntry(cols: ColMap, cell: (i: number) => unknown): GmpEntry {
  const get = (name: string): unknown => {
    const i = cols[name];
    return i === undefined ? undefined : cell(i);
  };
  return {
    name: str(get('name')),
    slug: str(get('slug')),
    type: str(get('type')).toLowerCase(),
    exchange: str(get('exchange')),
    priceMin: numOrNull(get('price_min')),
    priceMax: numOrNull(get('price_max')),
    lotSize: numOrNull(get('lot_size')),
    openDate: str(get('open_date')),
    closeDate: str(get('close_date')),
    allotmentDate: str(get('allotment_date')),
    listingDate: str(get('listing_date')),
    gmp: num(get('gmp')),
    kostak: num(get('kostak')),
    sub2: num(get('sub2')),
    status: str(get('status')).toLowerCase(),
    registrar: str(get('registrar')),
    sentiment: str(get('sentiment')),
    lastUpdated: str(get('last_updated')),
  };
}

// gviz JSON arrives wrapped in a JS callback prefix/suffix; slice to the JSON body.
function parseGviz(text: string): GmpEntry[] {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < 0) return [];
  const json = JSON.parse(text.slice(start, end + 1));
  const tableCols: any[] = json?.table?.cols ?? [];
  const rows: any[] = json?.table?.rows ?? [];
  // gviz exposes header labels on cols[].label (falls back to id).
  const cols = headerMap(tableCols.map((c) => c?.label || c?.id || ''));
  return rows
    .map((r) => {
      const c = r.c ?? [];
      return rowToEntry(cols, (i) => (c[i] ? (c[i].v ?? c[i].f) : undefined));
    })
    .filter((e) => e.name || e.slug);
}

function rowsToEntries(rows: string[][]): GmpEntry[] {
  if (!rows.length) return [];
  const cols = headerMap(rows[0]);
  // Only treat row 0 as a header if it actually names columns we know.
  const hasHeader = 'name' in cols || 'slug' in cols;
  const body = hasHeader ? rows.slice(1) : rows;
  const colMap = hasHeader
    ? cols
    : { name: 0, slug: 1, gmp: 2, kostak: 3, sub2: 4, sentiment: 5, last_updated: 6 };
  return body
    .map((r) => rowToEntry(colMap, (i) => r[i]))
    .filter((e) => e.name || e.slug);
}

/**
 * Fetch + parse the IPO sheet. Cached for 10 minutes. Never throws — returns []
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
    console.warn('[sheets] IPO fetch failed, using fallback:', (err as Error).message);
    return cache?.data ?? [];
  }
}

/** Convenience: IPO entries keyed by slug (and by lowercased name as backup). */
export async function getGmpMap(): Promise<Map<string, GmpEntry>> {
  const entries = await getGmpEntries();
  const map = new Map<string, GmpEntry>();
  for (const e of entries) {
    if (e.slug) map.set(e.slug, e);
    if (e.name) map.set('name:' + e.name.toLowerCase(), e);
  }
  return map;
}
