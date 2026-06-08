# IPO Views — Setup Guide

Live data pipeline: **India = Google Sheets** (manual GMP, fetched live) +
**Global = SEC/HKEX scraper** (GitHub Actions) → merged in Astro → deployed on **Vercel**.

> **India is Google-Sheets-only.** NSE/BSE auto-scraping was removed because their
> APIs block cloud/CI IP ranges. Structural India data (dates, price band, lot size,
> subscription, GMP history) lives in the seed file `src/data/ipos.ts`; you keep GMP /
> Kostak / sub current by editing the Google Sheet, which the site fetches at runtime.

```
                ┌──────────────────────┐
   you edit ──▶ │  Google Sheet (GMP)  │ ◀── /admin form (POST via Apps Script)
                └──────────┬───────────┘
                           │ published CSV/JSON  (runtime fetch, 10-min cache)
                           ▼
                     ┌─────────────┐   seed: src/data/ipos.ts  (India structure)
   GitHub Actions ──▶│ src/data/   │◀──
   (every 30 min)    │ index.ts    │   data/global-ipos.json   (US/HK, build-time)
   scrape SEC/HKEX   └──────┬──────┘
                            ▼
                    Astro build → Vercel  (homepage + /admin = SSR; rest = static)
```

---

## 0. Prerequisites

- Node 20+ and npm
- A Google account (for the Sheet + Apps Script)
- A Vercel account + this repo on GitHub
- Python 3.11 (only if you want to run the global scraper locally; CI installs it)

## 1. Local development

```bash
npm install
cp .env.example .env      # fill in values (see below) — all are optional for a basic run
npm run dev               # http://localhost:4321
```

Without any env vars the site runs on the bundled seed data. Add env vars to enable
the Sheet feed and `/admin`.

---

## 2. Google Sheet (GMP CMS)

### 2a. Create the sheet

1. New Google Sheet. Rename the first tab to **`GMP`**.
2. Row 1 — create these **exact** column headers (lowercase):

   | name | slug | gmp | kostak | sub2 | sentiment | last_updated |
   |------|------|-----|--------|------|-----------|--------------|

   - `name` must match the IPO name used on the site (e.g. `Zenith Solar Energy`).
   - `slug` is optional but recommended (matches the URL slug, e.g. `zenith-solar-energy`).
   - `gmp`, `kostak`, `sub2` are numbers. `sentiment` is free text. `last_updated` is set
     automatically by the Apps Script.

3. Add a row per IPO you want to override.

### 2b. Publish the sheet (so the site can read it)

`File → Share → Publish to web → (Sheet: GMP, Format: CSV) → Publish`.
Copy that URL → it's your **`SHEETS_GMP_URL`**.
*(A `…/gviz/tq?tqx=out:json&sheet=GMP` URL also works — both are auto-detected.)*

### 2c. Apps Script web app (so `/admin` can write)

1. In the Sheet: `Extensions → Apps Script`.
2. Delete the stub and paste the code from **`scripts/apps-script.gs`** (also reproduced
   at the bottom of this file).
3. `Project Settings → Script Properties → Add`: name `ADMIN_PASSWORD`, value = the same
   password you'll use for the site's `ADMIN_PASSWORD`.
4. `Deploy → New deployment → type: Web app`:
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
   - Deploy, authorize, and copy the **Web app URL** → it's your **`SHEETS_WEBHOOK_URL`**.
5. Re-deploy (`Manage deployments → Edit → Version: New`) whenever you change the script.

> The site's `ADMIN_PASSWORD` and the Script Property `ADMIN_PASSWORD` **must be equal** —
> the server forwards it to the webhook so the password never reaches the browser.

---

## 3. Vercel environment variables

Vercel → Project → **Settings → Environment Variables** (Production + Preview):

| Variable             | Value                                              |
|----------------------|----------------------------------------------------|
| `SHEETS_GMP_URL`     | published CSV/JSON URL from step 2b                 |
| `SHEETS_WEBHOOK_URL` | Apps Script web app URL from step 2c               |
| `ADMIN_PASSWORD`     | your chosen admin password (= Script Property)     |

Redeploy after adding them. `/admin` and `/` are server-rendered, so they read these at
request time.

---

## 4. GitHub Actions (auto-scraping)

### 4a. Add the deploy hook secret

1. Vercel → Project → **Settings → Git → Deploy Hooks** → create a hook on branch `main`,
   copy the URL.
2. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `VERCEL_DEPLOY_HOOK`
   - Value: the hook URL.

No other secrets are needed — scraping uses public endpoints.

### 4b. What runs

- **`.github/workflows/scrape-data.yml`** — every 30 min (and on push to `main`):
  runs the **global** scraper (`scrape-global.py`), commits a changed
  `data/global-ipos.json` with `[skip ci]`, then pings the deploy hook so Vercel
  rebuilds. (India needs no scraper — GMP is fetched live from the Sheet.)
- **`.github/workflows/deploy.yml`** — fires the deploy hook when a *human* commits
  `data/**` (the bot's `[skip ci]` commits don't double-trigger it).

> Permissions: the scrape workflow needs **Settings → Actions → General → Workflow
> permissions → Read and write** (or it can't push the data commit).

---

## 5. Run the global scraper locally (optional)

```bash
pip install requests
python scripts/scrape-global.py   # → data/global-ipos.json  (US: SEC, HK: HKEX)
```

SEC EDGAR is CI-friendly and returns real S-1 filings. HKEX occasionally rotates its
data URL; if HK comes back empty, update `HKEX_CSV` in `scripts/scrape-global.py`.

> India has no scraper — to update Indian GMP, edit the Google Sheet (or use `/admin`).

---

## 6. Deliverables checklist

- [x] Google Sheet headers: `name | slug | gmp | kostak | sub2 | sentiment | last_updated`
- [x] Apps Script — `scripts/apps-script.gs` (+ below)
- [x] India data = Google Sheets only (no NSE/BSE scraper)
- [x] `scripts/scrape-global.py`  (SEC + HKEX → global-ipos.json)
- [x] `.github/workflows/scrape-data.yml` (global only) + `deploy.yml`
- [x] `src/data/sheets.ts` + `src/data/index.ts`
- [x] `src/pages/admin.astro` (password-protected, SSR)
- [x] `src/pages/global.astro` (US + HK, in nav)
- [x] `.env.example`
- [x] this guide

---

## Appendix — Apps Script (copy into Extensions → Apps Script)

```javascript
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return _json({ error: 'Empty request body.' });
    var body = JSON.parse(e.postData.contents);

    var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
    if (!expected) return _json({ error: 'Server not configured: set ADMIN_PASSWORD script property.' });
    if (String(body.password || '') !== String(expected)) return _json({ error: 'Unauthorized: incorrect password.' });
    if (!body.name) return _json({ error: 'Missing IPO name.' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName('GMP') || ss.getSheets()[0];
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return _json({ error: 'Sheet has no data rows.' });

    var header = data[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var col = {
      name: header.indexOf('name'),
      gmp: header.indexOf('gmp'),
      kostak: header.indexOf('kostak'),
      sub2: header.indexOf('sub2'),
      updated: header.indexOf('last_updated')
    };
    if (col.name < 0) return _json({ error: 'Sheet is missing a "name" column.' });

    var target = String(body.name).trim().toLowerCase();
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][col.name]).trim().toLowerCase() === target) {
        var rowNum = r + 1;
        if (col.gmp >= 0 && body.gmp !== undefined && body.gmp !== '') sheet.getRange(rowNum, col.gmp + 1).setValue(Number(body.gmp));
        if (col.kostak >= 0 && body.kostak !== undefined && body.kostak !== '') sheet.getRange(rowNum, col.kostak + 1).setValue(Number(body.kostak));
        if (col.sub2 >= 0 && body.sub2 !== undefined && body.sub2 !== '') sheet.getRange(rowNum, col.sub2 + 1).setValue(Number(body.sub2));
        if (col.updated >= 0) sheet.getRange(rowNum, col.updated + 1).setValue(new Date().toISOString());
        return _json({ success: true, name: body.name, row: rowNum });
      }
    }
    return _json({ error: 'IPO not found in sheet: ' + body.name });
  } catch (err) {
    return _json({ error: String(err) });
  }
}

function doGet() {
  return _json({ ok: true, service: 'IPO Views GMP webhook' });
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

**Deploy:** Script Property `ADMIN_PASSWORD` → `Deploy → New deployment → Web app →
Execute as: Me, Who has access: Anyone` → copy URL into `SHEETS_WEBHOOK_URL`.
