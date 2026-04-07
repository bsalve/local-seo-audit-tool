# Claude Project Memory — Local SEO Audit Tool

Read this file at the start of every session.

---

## What This Project Is

A Node.js tool with two modes:
- **CLI** (`node index.js <url>`): runs audits, prints human report to stderr, JSON to stdout, saves PDF to `/output`
- **Web server** (`npm start` → `node server.js`): Express on port 3000, auto-opens browser, dark UI at `public/index.html`

Audits cover three categories: **SEO** (traditional), **AEO** (Answer Engine Optimization — featured snippets, voice), **GEO** (Generative Engine Optimization — Gemini, ChatGPT, Perplexity).

---

## Project Layout

```
index.js          # CLI entry — auto-loads audits, scores, outputs report + JSON + PDF
server.js         # Express server — GET /, POST /audit, GET /download, static /output
audits/           # One file per check (auto-discovered via readdirSync)
public/
  index.html      # Single-page dark UI (Space Mono, #0b0c0e bg, #4d9fff accent)
utils/
  fetcher.js      # axios + cheerio page fetcher
  score.js        # Shared scoring logic (normalizeScore, calcTotalScore, letterGrade, etc.)
  generatePDF.js  # Handlebars + Puppeteer → /output/seo-report-[domain]-[date].pdf
templates/
  report.hbs      # Handlebars HTML template for the PDF (dark theme, matches web UI)
output/           # Generated PDFs (gitignored)
```

## Audit Modules

### SEO (10 checks)
| File | What it checks |
|---|---|
| `checkSSL.js` | HTTPS + cert validity + expiry |
| `checkMetaTags.js` | Title + meta description length |
| `checkPageSpeed.js` | PageSpeed Insights (returns 2 results: perf + mobile) |
| `checkNAP.js` | Phone + street address in page text |
| `checkCrawlability.js` | robots.txt + sitemap.xml |
| `titleTag.js` | Title tag presence/length (no score field) |
| `metaDescription.js` | Meta description presence/length (no score field) |
| `headings.js` | Exactly one H1 (no score field) |
| `schema.js` | LocalBusiness JSON-LD presence (no score field) |

### AEO (3 checks) — name prefixed `[AEO]`
| File | What it checks |
|---|---|
| `aeoFaqSchema.js` | FAQPage/QAPage/HowTo JSON-LD — scored on entity count (0/40/70/100) |
| `aeoQuestionHeadings.js` | H2/H3 ending in `?`, excludes nav/footer — scored 0/20/60/80/100 |
| `aeoSpeakable.js` | Speakable JSON-LD with resolving CSS selectors — scored 0/50/60/100 |

### GEO (3 checks) — name prefixed `[GEO]`
| File | What it checks |
|---|---|
| `geoEeat.js` | Author byline + date + about link + contact link (25 pts each) |
| `geoEntityClarity.js` | Org/LocalBusiness schema: name(20) description(25) url(15) sameAs(20) logo(20) |
| `geoStructuredContent.js` | Data tables(30) + ordered lists(35) + dl(20) + H2+H3(15) |

## Audit Module Interface

Each audit exports a **synchronous or async** function `($, html, url)` returning:
`{ name, status, score?, maxScore?, message, details?, recommendation? }`
May return an array. Auto-discovered — no changes to `index.js` needed.

**Naming convention:** Prefix `name` with `[AEO]` or `[GEO]` to auto-group in UI and PDF. Unprefixed → SEO section.

## Scoring (`utils/score.js`)

Scoring logic is shared between `index.js` and `server.js` via `utils/score.js`:
- If `score` present: `Math.round((score / (maxScore ?? 100)) * 100)`
- If no `score`: pass=100, warn=50, fail=0
- `totalScore` = arithmetic mean of all normalized scores (all 16 checks)
- Grades: 90→A, 80→B, 70→C, 60→D, <60→F
- Grade labels reference SEO, AEO, and GEO signals (not just SEO)

**⚠ Server caches `score.js` at startup** — changes to grade labels require a server restart to take effect (template re-reads are exempt since `report.hbs` is read fresh each call).

## Web UI (`public/index.html`)

### Design Tokens
```css
--bg: #0b0c0e      /* page background */
--bg2: #111214     /* card/block background */
--border: #1e2025  /* borders */
--dim2: #2a2d35    /* darker accents */
--text: #e4e6ea    /* main text */
--muted: #8892a4   /* secondary text */
--accent: #4d9fff  /* blue — links, highlights, active states */
--warn: #ffb800    /* amber — warnings */
--fail: #ff4455    /* red — failures */
--pass: #34d399    /* green — passes and A-grade scores ONLY */
```

### Category Colors (not CSS variables — used inline)
- AEO: `#7baeff` (soft blue)
- GEO: `#b07bff` (soft purple)
- SEO: `var(--muted)` (#8892a4)

Font: Space Mono (Google Fonts). The `run` button uses `--accent` background on hover (`#76baff`), NOT green.

### Result Grouping

`renderResults()` in `index.html` sorts results **SEO → AEO → GEO** before rendering. Category is detected from `name.startsWith('[AEO]')` / `name.startsWith('[GEO]')`. Category dividers are injected between groups in both the card strip and detail rows. The `[AEO]`/`[GEO]` prefix is stripped from card display names (redundant once grouped).

### Progress Step List

The loading step list (`STEPS` array in `index.html`) includes 18 steps: 10 `[SEO]` checks, 3 `[AEO]` steps, 3 `[GEO]` steps, score calculation, PDF generation. All 16 check steps carry a category prefix; the final 2 meta-steps do not. `renderStepList()` colorizes prefixes via chained `.replace()`: `[SEO]`→`#8892a4` (muted grey), `[AEO]`→`#7baeff` (soft blue), `[GEO]`→`#b07bff` (soft purple).

## PDF Generation (`utils/generatePDF.js`)

- Reads `templates/report.hbs` **fresh on every call** (no server restart needed after template edits)
- Compiles with Handlebars; helpers: `eq`, `isDefined`
- Adds `meterColor`, `passCount`, `warnCount`, `failCount` to template data
- **Also adds `seoResults`, `aeoResults`, `geoResults`** — pre-grouped and prefix-stripped arrays for the template
- Footer: "Local SEO Audit Tool · date · Page N of M"
- Output filename: `seo-report-[hostname]-[YYYY-MM-DD].pdf`
- Puppeteer launch args required for background rendering on Windows:
  `--force-color-profile=srgb`, `--no-sandbox`, `--disable-setuid-sandbox`, `--run-all-compositor-stages-before-draw`
- Uses `page.goto('file:///abs/path/to/tmp.html')` (NOT `page.setContent`) — required for backgrounds to render
- Uses `page.emulateMediaType('screen')` + `printBackground: true`
- Writes HTML to a temp file (`_tmp_report.html`) and deletes it after PDF is saved

## PDF Template (`templates/report.hbs`)

Dark theme matching the web UI. Three result sections rendered via `{{#each seoResults}}`, `{{#each aeoResults}}`, `{{#each geoResults}}` with color-coded `.cat-header` dividers between them (AEO=#7baeff, GEO=#b07bff). Header includes `SEO · AEO · GEO` category line.

Color tokens are hardcoded (no CSS variables):
- Background: `#0b0c0e`, card bg: `#111214`, borders: `#1e2025`
- Each result row has a colored left border (`2px solid`) based on status: green/amber/red
- Score block has a `3px solid #4d9fff` top border
- `@page { size: A4; margin: 0; }` — page margins are set via Puppeteer's `margin` option instead

## ⚠ PDF Performance Rule — Do Not Regress

**Never use these CSS properties in `report.hbs` — they cause scroll lag in PDF viewers:**
- `box-shadow` → use `border: 1px solid #1e2025` instead
- `opacity` on overlapping elements → use pre-mixed solid colours
- `transition` or `animation` → remove entirely

## ⚠ Color Separation Rule — Do Not Regress

`--accent` (#4d9fff blue) and `--pass` (#34d399 green) serve different purposes:
- `--pass` (green): pass status indicators, A-grade scores — **score/status colors only**
- `--accent` (blue): links, hover states, active UI chrome, score block border, meter fill for B-grade

When changing the accent color, do NOT change pass/fail/warn status colors. They are independent.
Previously broke this by applying a blue accent change to pass-colored score readouts.

**Category colors** (`#7baeff` AEO blue, `#b07bff` GEO purple) are separate from `--accent`. Do not unify them.

## ⚠ Known Mistakes — Do Not Repeat

1. **Run button hover stayed green after accent color change** — `#auditBtn:hover` had a hardcoded old green hex (`#00ffaa`) that was missed during the accent color sweep. Always grep for hardcoded color hex values when changing a theme color.

2. **Pass score color turned blue after accent change** — `gradeColor()` in `index.html` was returning the accent color for scores ≥90, which should always be `--pass` (green). Status colors (pass/warn/fail) must never inherit from the accent color.

3. **PDF dark background not rendering (Puppeteer v24, Windows)** — `printBackground: true` and `print-color-adjust: exact` alone are insufficient. `page.setContent()` strips backgrounds; must use `page.goto('file:///')` with a temp file. Also requires `--force-color-profile=srgb` and `--run-all-compositor-stages-before-draw` launch args. Confirmed working as of current setup.

4. **Category text unreadable on dark background** — AEO/GEO category header colors `#4a5ea8` / `#6a4a98` were too dark against `#0b0c0e`. Use `#7baeff` (AEO) and `#b07bff` (GEO) — these are the confirmed readable values.

5. **Result row bar colour used `gradeColor()` instead of status colour** — The `.row-bar-fill` inline `background` was set via `gradeColor(r.normalizedScore)`, which maps 80–89 to a hardcoded blue (`#00ccff`). AEO/GEO checks scoring 80 showed a blue bar instead of green. Fix: use status colour directly — `r.status === 'pass' ? 'var(--pass)' : r.status === 'warn' ? 'var(--warn)' : 'var(--fail)'`. `gradeColor()` is only appropriate for the overall score meter, not individual result bars.

## Server Notes

- `open` package (v9+) is ESM-only — use `import('open').then(m => m.default(url))`, not `require('open')`
- Template is compiled fresh on every `generatePDF()` call — no restart needed after editing `report.hbs`
- `/download` route serves the most recently modified `.pdf` in `/output`
- Changes to `score.js` require a server restart (module is cached by Node.js `require()`)

## Known Issues

- `titleTag.js`, `metaDescription.js`, and `checkMetaTags.js` overlap (intentional redundancy)
- `utils/reporter.js` is legacy and unused — kept for compatibility
- PSI free tier: ~400 req/day/IP. Set `PAGESPEED_API_KEY` in `.env` to avoid 429s
- JS-rendered SPAs will score poorly — static HTML only

## Global Rules (from ~/.claude/CLAUDE.md)

- Run tests after changes *(no test suite yet — add one)*
- Ask before committing
- Keep code simple
