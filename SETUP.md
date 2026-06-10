# IPO Views — Setup Guide

Live data pipeline: **India = Google Sheets** (manual GMP, fetched live) +
**Global = SEC/HKEX scraper** (GitHub Actions) → merged in Astro → deployed on **Vercel**.

> **India is Google-Sheets-only.** NSE/BSE auto-scraping was removed because their
> APIs block cloud/CI IP ranges. The Google Sheet is the source of truth for the
> **full** IPO record — add, edit, and delete IPOs entirely from `/admin` (which
> writes to the Sheet via Apps Script). The seed file `src/data/ipos.ts` provides
> initial/fallback data and rich fields (about, lead managers, day-wise subscription,
> GMP history); a matching Sheet row overrides its scalar fields, and a Sheet row with
> no seed match becomes a brand-new IPO. India-facing pages are server-rendered, so
> changes appear site-wide within the 10-minute Sheet cache — no rebuild needed.

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
2. Row 1 — create these **exact** column headers (lowercase). Column **order is
   flexible** and extra columns are ignored; the Apps Script also auto-creates any
   missing columns the first time you add/edit an IPO:

   | name | slug | type | exchange | price_min | price_max | lot_size | open_date | close_date | allotment_date | listing_date | gmp | kostak | sub2 | status | registrar | sentiment | last_updated |
   |------|------|------|----------|-----------|-----------|----------|-----------|------------|----------------|--------------|-----|--------|------|--------|-----------|-----------|--------------|

   - `name` is the only required field per row (e.g. `Zenith Solar Energy`).
   - `slug` matches the URL slug (e.g. `zenith-solar-energy`); auto-derived from `name` if blank.
   - `type` = `mainboard` | `sme`. `exchange` = `NSE` | `BSE` | `NSE+BSE`.
   - `status` = `upcoming` | `open` | `closed` | `allotment` | `listed`.
   - `price_min`, `price_max`, `lot_size`, `gmp`, `kostak`, `sub2` are numbers.
   - dates are ISO `YYYY-MM-DD`. `sentiment` is free text. `last_updated` is set
     automatically by the Apps Script.

3. You normally never edit this sheet by hand — use `/admin` to **add, edit, and
   delete** IPOs. A row that matches a seed IPO (by slug, else name) overrides its
   fields; a row with no seed match becomes a brand-new IPO on the site.

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

- [x] Google Sheet headers: `name | slug | type | exchange | price_min | price_max | lot_size | open_date | close_date | allotment_date | listing_date | gmp | kostak | sub2 | status | registrar | sentiment | last_updated`
- [x] Apps Script — `scripts/apps-script.gs` (+ below)
- [x] India data = Google Sheets only (no NSE/BSE scraper)
- [x] `scripts/scrape-global.py`  (SEC + HKEX → global-ipos.json)
- [x] `.github/workflows/scrape-data.yml` (global only) + `deploy.yml`
- [x] `src/data/sheets.ts` + `src/data/index.ts`
- [x] `src/pages/admin.astro` (password-protected, SSR — add / edit / delete IPOs)
- [x] `src/pages/global.astro` (US + HK, in nav)
- [x] `.env.example`
- [x] this guide

---

## Appendix — Apps Script

The full, current script lives in **`scripts/apps-script.gs`** — copy that file's
contents into `Extensions → Apps Script` (it's the single source of truth, so it
isn't duplicated here to avoid drift). It handles four actions:

| action      | what it does                                              |
|-------------|-----------------------------------------------------------|
| `updateGMP` | set `gmp` / `kostak` / `sub2` on an existing row (by name) |
| `addIPO`    | append a new IPO row (rejects duplicate name/slug)        |
| `updateIPO` | overwrite all provided fields on a row (by slug, then name)|
| `deleteIPO` | remove a row (by slug, then name)                         |

The `/admin` page sends the right action for each form; an absent/`update` action is
treated as `updateGMP` for backward compatibility. `addIPO`/`updateIPO` auto-create
any missing columns, so an old GMP-only sheet upgrades itself on first use.

**Deploy:** Script Property `ADMIN_PASSWORD` → `Deploy → New deployment → Web app →
Execute as: Me, Who has access: Anyone` → copy URL into `SHEETS_WEBHOOK_URL`.
**Re-deploy a new version whenever you change the script** (`Manage deployments → Edit
→ Version: New`).
