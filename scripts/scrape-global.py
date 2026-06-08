#!/usr/bin/env python3
"""
Scrape upcoming US + HK IPOs from free official sources (Part 4).

  US -> SEC EDGAR full-text search for recent S-1 filings (no API key; needs a
        descriptive User-Agent per SEC fair-access rules).
  HK -> HKEX "upcoming IPO" CSV.

Output (consumed by src/data/index.ts -> getGlobalIPOs()):
  data/global-ipos.json -> { generatedAt, source, ipos: [GlobalIPO] }

GlobalIPO = { country: "US"|"HK", name, filingDate, listingDate, amount,
              industry, exchange, url }

Usage:  python scripts/scrape-global.py
Deps:   requests
"""

import csv
import io
import json
import os
import re
import sys
import time
from datetime import datetime, timezone, timedelta

try:
    import requests
except ImportError:
    print("ERROR: `requests` is not installed. Run: pip install requests", file=sys.stderr)
    sys.exit(1)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(ROOT, "data")

# SEC requires a real, identifying UA. Change the contact to your own.
SEC_UA = "IPO Views (ipoviews.com) contact@ipoviews.com"
SEC_FTS = "https://efts.sec.gov/LATEST/search-index"

HKEX_CSV = "https://www1.hkex.com.hk/hkexwidget/data/getupcomingipodata?lang=eng"
HKEX_CSV_FALLBACK = "https://www.hkex.com.hk/eng/market/sec_tradinfo/stockcode/eisdeqsec_pf.htm"

# Minimal SIC -> industry label map (first 2 digits → broad sector).
SIC_PREFIX = {
    "01": "Agriculture", "10": "Mining", "13": "Oil & Gas", "20": "Food",
    "28": "Pharma / Chemicals", "29": "Energy", "35": "Industrials",
    "36": "Electronics", "37": "Automotive", "38": "Instruments / MedTech",
    "48": "Telecom", "49": "Utilities", "50": "Wholesale", "52": "Retail",
    "60": "Banking", "61": "Finance", "62": "Brokerage", "63": "Insurance",
    "67": "Investment", "73": "Technology / Software", "80": "Healthcare",
    "87": "Professional Services",
}


def log(msg):
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    print(f"[{ts}] {msg}", flush=True)


def sic_to_industry(sic):
    if not sic:
        return "General"
    return SIC_PREFIX.get(str(sic)[:2], "General")


def clean_name(name):
    name = re.sub(r"\s*\(.*?\)\s*$", "", str(name)).strip()
    return re.sub(r"/[A-Z]{2}/?$", "", name).strip()


def get(url, headers, retries=1, timeout=20):
    for attempt in range(retries + 1):
        try:
            r = requests.get(url, headers=headers, timeout=timeout)
            if r.status_code == 200 and r.text.strip():
                return r
            log(f"  {url} -> HTTP {r.status_code}")
        except requests.RequestException as e:
            log(f"  request error: {e}")
        if attempt < retries:
            log("  retrying in 5s ...")
            time.sleep(5)
    return None


# --------------------------------------------------------------------------- #
# US — SEC EDGAR
# --------------------------------------------------------------------------- #
def fetch_us():
    start = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    end = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    params = f'?q=%22initial+public+offering%22&forms=S-1&startdt={start}&enddt={end}'
    url = SEC_FTS + params
    log(f"US (SEC): fetching S-1 filings {start}..{end}")
    r = get(url, headers={"User-Agent": SEC_UA, "Accept": "application/json"}, retries=1)
    if r is None:
        log("US: no response from SEC.")
        return []
    try:
        data = r.json()
    except ValueError:
        log("US: non-JSON from SEC.")
        return []

    hits = (data.get("hits") or {}).get("hits") or []
    out, seen = [], set()
    for h in hits:
        src = h.get("_source", {})
        names = src.get("display_names") or []
        name = clean_name(names[0]) if names else ""
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        cik = ""
        if names:
            m = re.search(r"CIK\s*0*(\d+)", names[0])
            if m:
                cik = m.group(1)
        sics = src.get("sics")
        sic = sics[0] if isinstance(sics, list) and sics else src.get("sic")
        out.append({
            "country": "US",
            "name": name,
            "filingDate": src.get("file_date", ""),
            "listingDate": "",  # not known at S-1 stage
            "amount": "",       # lives inside the filing document, not the FTS index
            "industry": sic_to_industry(sic),
            "exchange": "NASDAQ / NYSE",
            "url": (f"https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK={cik}&type=S-1"
                    if cik else "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=S-1"),
        })
    log(f"US: parsed {len(out)} S-1 filers.")
    return out


# --------------------------------------------------------------------------- #
# HK — HKEX
# --------------------------------------------------------------------------- #
def fetch_hk():
    log("HK (HKEX): fetching upcoming IPOs ...")
    r = get(HKEX_CSV, headers={
        "User-Agent": "Mozilla/5.0", "Accept": "*/*",
        "Referer": "https://www.hkex.com.hk/",
    }, retries=1)
    if r is None:
        log("HK: no response from HKEX.")
        return []

    text = r.text.strip()
    rows = []

    # The widget endpoint returns JSON; the static export is CSV. Handle both.
    if text.startswith("{") or "ipoData" in text:
        try:
            payload = r.json()
            container = payload.get("data", payload)
            items = container.get("ipoData") if isinstance(container, dict) else None
            items = items or (container if isinstance(container, list) else [])
            for it in items:
                name = it.get("nm") or it.get("name") or it.get("company")
                if not name:
                    continue
                rows.append({
                    "country": "HK", "name": clean_name(name),
                    "filingDate": "", "listingDate": it.get("listingdate") or it.get("ld") or "",
                    "amount": it.get("offersize") or it.get("amount") or "",
                    "industry": it.get("industry") or "General",
                    "exchange": "HKEX",
                    "url": "https://www.hkex.com.hk/eng/market/sec_tradinfo/stockcode/eisdeqsec_pf.htm",
                })
        except ValueError:
            pass
    else:
        try:
            reader = csv.DictReader(io.StringIO(text))
            for it in reader:
                low = {k.lower().strip(): v for k, v in it.items() if k}
                name = (low.get("company name") or low.get("company") or low.get("name") or "")
                if not name:
                    continue
                rows.append({
                    "country": "HK", "name": clean_name(name),
                    "filingDate": "",
                    "listingDate": low.get("listing date") or low.get("listingdate") or "",
                    "amount": low.get("offer price") or low.get("price range") or low.get("offer size") or "",
                    "industry": low.get("industry") or "General",
                    "exchange": "HKEX",
                    "url": "https://www.hkex.com.hk/eng/market/sec_tradinfo/stockcode/eisdeqsec_pf.htm",
                })
        except csv.Error as e:
            log(f"HK: CSV parse error: {e}")

    log(f"HK: parsed {len(rows)} IPOs.")
    return rows


# --------------------------------------------------------------------------- #
def load_existing(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f).get("ipos", [])
    except (OSError, ValueError):
        return []


def main():
    log("=== Global IPO scrape starting ===")
    us = fetch_us()
    hk = fetch_hk()
    ipos = us + hk

    path = os.path.join(DATA_DIR, "global-ipos.json")
    existing = load_existing(path)
    source = "SEC+HKEX"
    if not ipos and existing:
        log(f"  keeping previous global-ipos.json ({len(existing)} items) — scrape was empty.")
        ipos, source = existing, "preserved-previous"

    os.makedirs(DATA_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump({
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "source": source,
            "ipos": ipos,
        }, f, indent=2, ensure_ascii=False)
    log(f"  wrote global-ipos.json ({len(ipos)} items: {len(us)} US + {len(hk)} HK).")
    log("=== done ===")
    return 0


if __name__ == "__main__":
    sys.exit(main())
