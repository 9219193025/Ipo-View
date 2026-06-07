# IPO Views — Design System

> The brief referenced `DESIGN.md` as the single source of truth but shipped no actual
> spec. This file is that spec, derived strictly from the brief's inline UI rules
> (dark navy `#0F172A`, JetBrains Mono for all financial numbers, green/red GMP,
> mobile-first, no popups, Lighthouse 95+). Every token here maps 1:1 to a CSS custom
> property in `src/styles/global.css` (Tailwind v4 `@theme`). **Change tokens here and
> in `global.css` together.**

---

## 1. Design Principles

1. **Mobile-first.** Design at 360px, enhance up. Most Indian retail investors are on phones.
2. **Numbers are the UI.** GMP, subscription, gain % are the product. They get the mono
   font, the most contrast, and the color semantics. Everything else recedes.
3. **Calm dark surface, loud data.** The navy field is quiet; green/red/amber only ever
   carry financial meaning — never decoration.
4. **Zero-JS by default.** Static Astro. Interactivity (filters, compare, calculator) is
   progressive enhancement with tiny vanilla scripts. Charts are inline SVG, 0 KB JS.
5. **No dark patterns.** No popups, no cookie wall, no fake-live flashing. "Live feel"
   comes from a real market-hours indicator and honest timestamps.

---

## 2. Color Tokens

### Surfaces (dark navy theme)

| Token              | Hex        | Use                                              |
| ------------------ | ---------- | ------------------------------------------------ |
| `--color-bg`       | `#0F172A`  | App background (brief-mandated)                  |
| `--color-surface`  | `#1E293B`  | Cards, header, primary panels                    |
| `--color-surface-2`| `#334155`  | Nested panels, table header rows, hover wells    |
| `--color-border`   | `#2A3A50`  | Hairline dividers, card borders (1px)            |
| `--color-border-strong` | `#3E5170` | Focused/active borders                       |

### Text

| Token                 | Hex       | Use                                  |
| --------------------- | --------- | ------------------------------------ |
| `--color-text`        | `#F1F5F9` | Primary text, headings               |
| `--color-text-muted`  | `#94A3B8` | Labels, secondary, table captions    |
| `--color-text-faint`  | `#64748B` | Disabled, placeholder, fine print    |

### Financial semantics (the only "loud" colors)

| Token                 | Hex       | Meaning                                       |
| --------------------- | --------- | --------------------------------------------- |
| `--color-pos`         | `#22C55E` | Positive GMP / gain (brief: green)            |
| `--color-pos-soft`    | `#16341F` | Positive background fill (badges, bar track)  |
| `--color-neg`         | `#EF4444` | Negative GMP / loss (brief: red)              |
| `--color-neg-soft`    | `#3A1A1C` | Negative background fill                       |
| `--color-warn`        | `#F59E0B` | Cooling / neutral-caution / close-soon        |
| `--color-warn-soft`   | `#3A2A0E` | Warn background fill                           |
| `--color-info`        | `#38BDF8` | Neutral data accent, links, "open" status     |

### Brand / accent

| Token                 | Hex       | Use                                           |
| --------------------- | --------- | --------------------------------------------- |
| `--color-brand`       | `#6366F1` | Primary CTA (Apply), active nav, focus ring   |
| `--color-brand-hover` | `#818CF8` | CTA hover                                      |

### Sentiment / status helpers (badges)

- **Bullish** → `--color-pos` on `--color-pos-soft`
- **Neutral** → `--color-warn` on `--color-warn-soft`
- **Bearish** → `--color-neg` on `--color-neg-soft`
- IPO status `open` → info · `upcoming` → brand · `closed`/`allotment` → warn · `listed` → muted

> **Rule:** green and red are reserved for money direction. Do not use them for
> generic success/error UI chrome. Use `--color-info` / `--color-brand` for that.

### Light mode (token re-map)

Dark is the default. Light mode re-maps the **same** semantic tokens (so every
`bg-bg` / `text-text` / `border-pos` utility switches with no per-element `dark:`
variants). Toggled by `data-theme` on `<html>`.

| Token                   | Dark      | Light     |
| ----------------------- | --------- | --------- |
| `--color-bg`            | `#0F172A` | `#F7F9FC` |
| `--color-surface`       | `#1E293B` | `#FFFFFF` |
| `--color-surface-2`     | `#334155` | `#EEF2F7` |
| `--color-border`        | `#2A3A50` | `#E2E8F0` |
| `--color-border-strong` | `#3E5170` | `#CBD5E1` |
| `--color-text`          | `#F1F5F9` | `#0F172A` |
| `--color-text-muted`    | `#94A3B8` | `#475569` |
| `--color-text-faint`    | `#64748B` | `#64748B` |
| `--color-pos`           | `#22C55E` | `#15803D` |
| `--color-neg`           | `#EF4444` | `#DC2626` |
| `--color-warn`          | `#F59E0B` | `#B45309` |
| `--color-info`          | `#38BDF8` | `#0369A1` |
| `--color-brand`         | `#6366F1` | `#4F46E5` |

> Financial colours are **deepened** in light mode for ≥4.5:1 text contrast on white —
> still unmistakably green/red. The 4px card accent and pill borders inherit these.
> `.hero-surface` is re-tuned per theme (dark dots + pale-navy glow in light).

### Theme toggle (mechanics)

- A sun/moon button in the header flips `data-theme` and persists to `localStorage`.
- **No FOUC:** an inline `<script>` in `<head>` sets `data-theme` *before first paint*
  from `localStorage` → else `prefers-color-scheme` → else dark.
- `color-scheme` and the `theme-color` meta switch with the theme (native controls,
  scrollbars and mobile browser chrome follow).

---

## 3. Typography

### Families

| Token            | Stack                                                        | Use                          |
| ---------------- | ----------------------------------------------------------- | ---------------------------- |
| `--font-serif`   | `"Instrument Serif", Georgia, "Times New Roman", serif`      | **Editorial headings** — hero (`.hero-title`) & page titles (`.page-title`). Weight 400 only. |
| `--font-sans`    | `"DM Sans", system-ui, -apple-system, Segoe UI, Roboto, sans-serif` | All prose, labels, section/card headings |
| `--font-mono`    | `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace` | **All financial numbers** (brief-mandated) |

> Every ₹ value, GMP, %, subscription multiple, lot count, and date-as-number uses
> `.num` (→ `font-mono`, `tabular-nums`, slight negative tracking). This is non-negotiable
> per the brief.

> **Weight contrast is the look.** Pair a thin label (`.label`, weight **400**, wide
> tracking, uppercase, muted) directly against a **bold 700** mono number. The drama of
> light-vs-heavy is intentional — don't normalise them to the same weight.

### Type scale (mobile → desktop via clamp)

| Token / class   | Size (clamp)                         | Family / Weight | Use                     |
| --------------- | ------------------------------------ | --------------- | ----------------------- |
| `.hero-title`   | `clamp(3rem, 6vw, 4.5rem)` (48→72px) | serif / 400     | Homepage hero headline  |
| `.page-title`   | `clamp(2rem, 4vw, 2.75rem)`          | serif / 400     | Inner page titles (h1)  |
| `text-h2`       | `clamp(1.25rem, 3vw, 1.5rem)`        | sans / 600      | Section headers         |
| `text-h3`       | `1.125rem`                           | sans / 600      | Card titles             |
| `text-body`     | `0.9375rem` (15px)                   | sans / 400      | Default body            |
| `text-sm`       | `0.8125rem` (13px)                   | sans / 400      | Labels, meta, nav links |
| `text-xs`       | `0.6875rem` (11px)                   | sans / 400–500  | Badges, table micro-copy, "updated" timestamps |

Line-height: `1.02` hero, `1.06` page titles, `1.2` other headings, `1.55` body. Numbers: `1.1`.
The emphasised phrase in the hero is set in serif *italic* (no colour) — never a gradient fill.

---

## 4. Spacing & Layout

4px base grid. Tokens: `--space-1`=4px … through multiples. Use Tailwind's default
spacing scale (which is 0.25rem-based) — it already matches.

| Concept            | Value                                  |
| ------------------ | -------------------------------------- |
| Page gutter (mobile)| `1rem` (16px)                         |
| Page gutter (≥sm)  | `1.5rem` (24px)                        |
| Max content width  | `--container: 1200px`                  |
| Card padding       | `1rem` mobile / `1.25rem` desktop      |
| Card gap (grid)    | `0.75rem` mobile / `1rem` desktop      |
| Section vertical   | `2.5rem` mobile / `4rem` desktop       |
| Radius             | `--radius`=12px cards · 8px controls · 9999px pills |

Breakpoints: Tailwind defaults — `sm 640 · md 768 · lg 1024 · xl 1280`.

Grid: IPO card grids are `grid-cols-1` → `sm:grid-cols-2` → `lg:grid-cols-3`.

---

## 5. Elevation & Borders

- **Cards are flat:** `--color-surface` fill + `1px --color-border`, **no box-shadow, no glow.**
  Depth comes from the border and the dark field, not elevation.
- **Status accent:** interactive IPO cards carry a **4px left border** keyed to status —
  `open`→pos (green), `upcoming`→info (blue), `allotment`/`closed`→warn (amber),
  `listed`→border-strong. (`.accent-l .accent-{status}`.)
- Hover (interactive cards): border → `--color-border-strong` + `translateY(-2px)`,
  transition `150ms ease`. **No shadow on hover.**
- **Hero backdrop** (`.hero-surface`): a CSS-only dot grid (`radial-gradient` dots at
  22px) over a subtle, *non-colourful* navy→lighter-navy radial (`#16233f` → transparent
  at the top). No images.
- Focus-visible: `2px` solid `--color-brand` outline, `2px` offset. Never remove outlines.

---

## 6. Components (spec)

### IpoCard
- Flat surface card, radius 12, **4px status-keyed left accent** (see §5).
- Header row: name (h3, truncates) + stacked status & type pills (right).
- **GMP focal block:** the **percentage is the hero number** (mono, `text-3xl`, bold,
  sign-coloured) with the trend arrow (▲/▼). The ₹ amount is *secondary* — `text-sm`,
  muted, on the line below, alongside the 7-day % change. Emphasis is on **% over ₹**.
- Micro-grid (2-col) of label/value pairs; gaps are intentionally slightly uneven.
- Footer: SentimentBadge (left) + **"Updated Nm ago"** (right, 11px muted mono, stable
  per IPO — not random/flashing).
- Entire card is a link to `/ipo/[slug]`. Min tap target 44px.

### Pills & badges (status, type, sentiment)
- **Border-only**: pill shape, `1px` coloured border at ~50% alpha + matching text colour,
  **no solid background fill**. Applies to StatusPill, type pill and SentimentBadge.

### SentimentBadge
- Border-only pill, `text-xs`, icon + label. Variants map to GMP %/trend:
  `🔥 Hot` (pos, ≥25%) · `📈 Rising` (pos, trend up) · `⚠️ Cooling` (warn, trend down) ·
  `❌ Weak` (neg or <5%). Colour from financial semantics. (Emoji are kept here; they are
  removed from section/page headings.)

### GmpSparkline (inline SVG, 0 KB JS)
- 7-point polyline over `gmpHistory`. Stroke = pos/neg by net change. ~64×24 in cards,
  full-width ~320×120 on detail. `preserveAspectRatio="none"`, `vector-effect non-scaling-stroke`.
- Last point gets a 2px dot. Faint baseline at 0.

### SubscriptionBars
- QIB / NII / RII rows: label + mono multiple (e.g. `42.3x`) + progress bar.
  Bar track `--color-surface-2`; fill `--color-info`, clamped, with ">10x" overflow styling.
- Total row emphasized (bold, larger).

### StatPill / Hero stat
- Thin label (xs muted, uppercase, tracked) above big bold mono value (`text-3xl`).
- **Hero stats bar:** horizontally scrollable row on mobile (cards `min-w-[150px]`,
  hidden scrollbar), collapsing to a 4-col grid at `sm`. Not a 2×2 grid.

### Buttons
- **Primary (Apply/CTA):** brand fill, white text, radius 8, weight 600.
- **Broker buttons:** outline style, brand-named, in a wrap row. Deep-link hrefs.
- **Secondary/ghost:** transparent, border, muted text → text on hover.
- Min height 44px (mobile tap target).

### Header (sticky)
- `--color-surface` w/ **thin 1px bottom border**, `backdrop-blur`, `sticky; top:0; z-50`, 64px tall.
- **Larger logo** (36px mark + `text-xl` wordmark) left. Nav links are **13px** (`text-[13px]`).
- **Market indicator** far right: dot + "Markets Open/Closed" computed from IST trading
  hours (Mon–Fri, 09:15–15:30). Green dot open, faint dot closed.

### Tables (Listed page)
- `--color-surface` container; header row `--color-surface-2`, muted uppercase xs labels.
- Numbers right-aligned, mono. Gain % colored. Zebra via subtle border only (no fill stripes).
- Horizontal scroll on mobile inside a bordered wrapper.

### Calendar
- Month grid 7-col. Day cell shows date (mono) + up to N event chips, color-coded:
  open=info, close=warn, allotment=brand, listing=pos. Mainboard vs SME via chip style
  (solid vs outlined). Legend above.

---

## 7. Motion

- Durations: `120ms` micro (hover), `200ms` enter. Easing `cubic-bezier(.2,.6,.2,1)`.
- Respect `prefers-reduced-motion: reduce` → disable transforms/transitions.
- No autoplaying, no infinite flashing "live" animation (one calm pulse on the market dot only).

---

## 8. Accessibility

- Contrast: body text ≥ 4.5:1 on its surface; large/number text ≥ 3:1. (Tokens above pass.)
- Color never the *only* signal: GMP sign also shown via ▲/▼ and `+`/`−`; status via text.
- All interactive elements keyboard-reachable, visible focus ring, ≥44px tap target.
- Charts have `role="img"` + `<title>`/`aria-label` summarizing the trend.

---

## 9. SEO / Head (every page)

- Title: `"{IPO Name} GMP Today ₹{amount} | IPO Views"` (pages override the base).
- Meta description includes GMP, subscription, listing date where relevant.
- JSON-LD per IPO (`FinancialProduct`-style) + `WebSite`/`BreadcrumbList` site-wide.
- `@astrojs/sitemap` auto-generates `sitemap-index.xml`. `robots.txt` allows all + sitemap.
- Open Graph + Twitter card tags from the same SEO props.

---

## 10. Responsiveness (mobile-first)

Designed at 360px, enhanced up. Tailwind breakpoints `sm 640 · md 768 · lg 1024`.

- **Header:** full nav at `md+`; below that a hamburger drawer. The market indicator
  collapses to a **dot only** below `sm` (text in `title`) so the bar never overflows on
  small phones; the theme toggle stays visible at every width.
- **Hero:** left-aligned; title clamps **48px → 72px**. Stats bar is a horizontal
  snap-scroll row on mobile → 4-col grid at `sm`.
- **Card grids:** `grid-cols-1 → sm:2 → lg:3`.
- **Tables** (listed, day-wise, recently-listed, compare): each lives in an
  `overflow-x-auto` wrapper and scrolls horizontally on narrow screens — never reflows or
  clips. Compare keeps a sticky first column.
- **Calendar:** 7-col grid with `min-h` cells that shrink gracefully; full chronological
  list below doubles as the small-screen + no-JS view.
- **Detail page:** 3-col layouts collapse to a single stacked column below `lg`; CTA
  cluster stacks on mobile.
- Tap targets ≥44px; `prefers-reduced-motion` honoured.
