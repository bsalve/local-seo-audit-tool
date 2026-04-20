# Claude Project Memory — SignalGrade

Read this file at the start of every session.

---

## What This Project Is

**SignalGrade** — a search visibility audit tool. Two modes:
- **CLI** (`node index.js <url>`): runs audits, prints human report to stderr, JSON to stdout, saves PDF to `/output`
- **Web server** (`npm start` → `node server.js`): Express on port 3000, auto-opens browser, dark UI at `public/index.html`

Audits cover four categories: **Technical** (site health & infrastructure), **Content** (marketing & on-page signals), **AEO** (Answer Engine Optimization — featured snippets, voice), **GEO** (Generative Engine Optimization — Gemini, ChatGPT, Perplexity).

**Positioning:** "Score your site across Google, and across AI." — covers traditional SEO + AEO + GEO. Not a "Local SEO" tool.

---

## Project Layout

```
index.js          # CLI entry — auto-loads audits, scores, outputs report + JSON + PDF
server.js         # Express server — GET /, POST /audit, GET /crawl (SSE), GET /download, static /output
audits/           # One file per check (auto-discovered via readdirSync)
public/
  index.html      # Single-page dark UI (Inter body + Space Mono for scores/data, #0b0c0e bg, #4d9fff accent)
utils/
  fetcher.js      # axios + cheerio page fetcher
  score.js        # Shared scoring logic (normalizeScore, calcTotalScore, letterGrade, etc.)
  generatePDF.js  # Handlebars + Puppeteer → /output/signalgrade-report-[domain]-[date].pdf
  crawler.js      # BFS site crawler — crawlSite(), aggregateResults()
templates/
  report.hbs      # Handlebars HTML template for the PDF (dark theme, matches web UI)
output/           # Generated PDFs (gitignored)
```

## Audit Modules

### Technical (30 checks) — name prefixed `[Technical]`
| File | What it checks |
|---|---|
| `checkSSL.js` | HTTPS + cert validity + expiry |
| `checkPageSpeed.js` | PageSpeed Insights (returns 3 results: perf + mobile + Core Web Vitals); details include LCP element snippet |
| `checkCrawlability.js` | robots.txt + sitemap.xml |
| `checkCanonical.js` | `<link rel="canonical">` presence and validity |
| `checkMetaRobots.js` | Detects noindex/nofollow/none meta robots directives |
| `contentInternalLinks.js` | Internal link count — scored 0/50/80/100 by volume |
| `schema.js` | LocalBusiness JSON-LD presence (no score field) |
| `technicalBusinessHours.js` | openingHoursSpecification in LocalBusiness — scored 0/25/60/80/100 |
| `technicalAggregateRating.js` | AggregateRating schema with ratingValue + ratingCount — scored 0/60/100 |
| `technicalGeoCoordinates.js` | GeoCoordinates (lat/long) in LocalBusiness — scored 0/50/100 |
| `technicalHreflang.js` | `<link rel="alternate" hreflang>` tags — presence, x-default, malformed — scored 0/20/50/70/100 |
| `technicalBrokenLinks.js` | HEADs up to 20 internal links for 4xx/5xx — scored 0/20/60/100 |
| `technicalSecurityHeaders.js` | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy (25 pts each) |
| `technicalCompression.js` | gzip/Brotli/zstd via Content-Encoding header — pass/fail |
| `technicalResponseTime.js` | TTFB in ms — Good <800ms, Needs Improvement <1800ms, Poor ≥1800ms |
| `technicalRedirectChain.js` | Follows redirect chain manually — scored by hop count and redirect type |
| `technicalMixedContent.js` | HTTP assets on HTTPS pages (img/script/iframe/link) — scored 0/60/100 |
| `technicalFavicon.js` | `<link rel="icon">` in DOM or /favicon.ico reachable — scored 0/70/100 |
| `technicalImageDimensions.js` | `<img>` missing width+height (CLS risk) — scored by % missing |
| `technicalBreadcrumbSchema.js` | BreadcrumbList JSON-LD with itemListElement — scored 0/50/60/100 |
| `technicalMobileViewport.js` | `<meta name="viewport">` presence + width=device-width — scored 0/50/100 |
| `technicalIndexability.js` | noindex meta/header + canonical-points-elsewhere — scored 0/50/100 |
| `technicalSchemaInventory.js` | Lists all JSON-LD `@type` values found on page — pass/warn/fail |
| `technicalSchemaValidation.js` | Required fields for detected schema types (LocalBusiness, Article, FAQPage, etc.) — scored 0/30/60/100 |
| `technicalLazyLoading.js` | `loading="lazy"` on below-fold images — scored 0/60/100 |
| `technicalHTTPVersion.js` | HTTP/2 or HTTP/3 detection via response headers — scored 0/50/100 |
| `technicalRobotsSafety.js` | Dangerous `Disallow:` rules in robots.txt (blocks entire site or CSS/JS) — scored 0/50/100 |
| `technicalCanonicalChain.js` | Fetches canonical target, checks if it itself canonicalises elsewhere (A→B→C chain) — scored 0/40/50/100 |

**Note:** `utils/fetcher.js` returns `{ html, $, headers, finalUrl, responseTimeMs }`. Audits receive these as a 4th `meta` argument: `($, html, url, meta)`. Existing audits that don't use `meta` are unaffected.

### Content (18 checks) — name prefixed `[Content]`
| File | What it checks |
|---|---|
| `checkMetaTags.js` | Title + meta description length |
| `checkNAP.js` | Phone + street address in page text |
| `checkOpenGraph.js` | og:title, og:description, og:image, og:url, twitter:card — scored 0–100 |
| `checkImageAlt.js` | % of `<img>` tags with alt attributes — scored by coverage |
| `contentWordCount.js` | Body word count — scored 0–100, threshold at 300 words |
| `contentHeadingHierarchy.js` | H2/H3 ordering — no H3 before H2, at least one H2 (no score field) |
| `contentBrandConsistency.js` | Brand name in title/H1/og:title/og:site_name — scored 0–100 |
| `contentSocialLinks.js` | Links to known social platforms — scored 0/40/70/90/100 by platform count |
| `titleTag.js` | Title tag presence/length (no score field) |
| `metaDescription.js` | Meta description presence/length (no score field) |
| `headings.js` | Exactly one H1 (no score field) |
| `contentReadability.js` | Flesch-Kincaid Reading Ease — scored 0/60/100 by FRE band |
| `contentFreshness.js` | Publish/update date via meta, JSON-LD, `<time>`, or text — scored by age |
| `contentOutboundLinks.js` | External links + authority domain links (.gov/.edu/Wikipedia etc.) |
| `contentCallToAction.js` | CTA buttons/links/tel/mailto — scored 0/60/70/100 by type count |
| `contentImageOptimization.js` | WebP/AVIF usage(50) + figcaption(30) + no GIFs(20) — scored 0–100 |
| `contentOGImageCheck.js` | og:image presence + URL reachability via HEAD request — scored 0/50/100 |
| `contentKeywordDensity.js` | Top 15 keyword frequencies from body text — scored 0/60/100 by word count |

### AEO (9 checks) — name prefixed `[AEO]`
| File | What it checks |
|---|---|
| `aeoFaqSchema.js` | FAQPage/QAPage/HowTo JSON-LD — scored on entity count (0/40/70/100) |
| `aeoQuestionHeadings.js` | H2/H3 ending in `?`, excludes nav/footer — scored 0/20/60/80/100 |
| `aeoSpeakable.js` | Speakable JSON-LD with resolving CSS selectors — scored 0/50/60/100 |
| `aeoVideoSchema.js` | VideoObject JSON-LD — key fields: name, description, thumbnailUrl, uploadDate — scored 0/40/70/100 |
| `aeoHowToSchema.js` | HowTo JSON-LD — step count + quality (name+text per step) — scored 0/30/60/100 |
| `aeoFeaturedSnippetFormat.js` | Opening paragraph word count vs 40–60 word ideal — scored 0/40/50/70/100 |
| `aeoArticleSchema.js` | Article/BlogPosting/NewsArticle JSON-LD — headline(25)+author(25)+datePublished(20)+publisher(20)+image(10) |
| `aeoDefinitionContent.js` | `<dl>/<dt>/<dd>` definition lists + `<dfn>` elements — scored 0/50/70/100 |
| `aeoConciseAnswers.js` | Paragraphs in 20–80 word snippet-ready range — scored 0/40/70/100 |

### GEO (11 checks) — name prefixed `[GEO]`
| File | What it checks |
|---|---|
| `geoEeat.js` | Author byline + date + about link + contact link (25 pts each) |
| `geoEntityClarity.js` | Org/LocalBusiness schema: name(20) description(25) url(15) sameAs(20) logo(20) |
| `geoStructuredContent.js` | Data tables(30) + ordered lists(35) + dl(20) + H2+H3(15) |
| `geoPrivacyTrust.js` | Privacy policy link(40) + terms link(35) + cookie/GDPR notice(25) — scored 0–100 |
| `geoGoogleBusinessProfile.js` | GBP URL in sameAs schema(60/warn) or visible page link(100/pass) |
| `geoCitations.js` | Citation style signals: `<cite>`, attributed `<blockquote>`, references heading, numbered refs |
| `geoServiceSchema.js` | Service/Product JSON-LD: name(30)+description(30)+provider(20)+areaServed/offers(20) |
| `geoAuthorSchema.js` | Person JSON-LD: name(30)+jobTitle(25)+sameAs(25)+image/url(20) |
| `geoReviewContent.js` | Visible testimonial signals: blockquote, review classes, star patterns, attributed quotes |
| `geoServiceAreaContent.js` | areaServed in schema + geographic text mentions (state names, location phrases) |
| `geoMultiModal.js` | Embedded video (YouTube/Vimeo/etc. or `<video>`) + `<audio>` element |

## Audit Module Interface

Each audit exports a **synchronous or async** function `($, html, url, meta)` returning:
`{ name, status, score?, maxScore?, message, details?, recommendation? }`
May return an array. Auto-discovered — no changes to `index.js` needed.

`meta` is `{ headers, finalUrl, responseTimeMs }` — HTTP response headers, the final URL after redirects, and TTFB in ms. Existing audits that don't use `meta` are unaffected.

**Naming convention:** Prefix `name` with `[Technical]`, `[Content]`, `[AEO]`, or `[GEO]` to auto-group in UI and PDF. Unprefixed → Technical section.

## Scoring (`utils/score.js`)

Scoring logic is shared between `index.js` and `server.js` via `utils/score.js`:
- If `score` present: `Math.round((score / (maxScore ?? 100)) * 100)`
- If no `score`: pass=100, warn=50, fail=0
- `totalScore` = arithmetic mean of all normalized scores (all 68 checks)
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

### Typography
- **Body/UI font:** Inter (Google Fonts) — all labels, descriptions, recommendations
- **Score/data font:** Space Mono — score numbers, grade letters, stat counts, status line, CLI elements (input prefix, run button, rec buttons)
- Space Mono is applied selectively via targeted CSS overrides after the Inter body declaration

### Category Colors (not CSS variables — used inline)
- Technical: `#8892a4` (`var(--muted)`, grey)
- Content: `#e8a87c` (warm orange)
- AEO: `#7baeff` (soft blue)
- GEO: `#b07bff` (soft purple)

The `run` button uses `--accent` background on hover (`#76baff`), NOT green.

### Audit Mode Toggle
Above the URL input, a **Page Audit / Site Audit** toggle. Page Audit is the default. `setMode('page'|'site')` sets `currentMode`, toggles `.active` class, and shows/hides the crawl limit note.

When **Site Audit** is active, a `#crawlLimitNote` div appears below the toggle: `Up to 50 pages per crawl  FREE`. The `.tier-badge` span (Space Mono, muted border) telegraphs the plan limit. Swap the string when paid tiers exist.

### Customize Report Panel
A collapsed `+ Customize Report` section below the input row. When expanded, shows a **Logo URL** text input. If filled, `logoUrl` is sent with the `/audit` POST body. The server validates it (http/https only) and passes it to `generatePDF()`. When set, the PDF header shows the agency logo + "Powered by SignalGrade" instead of the SIGNALGRADE wordmark.

### Result Grouping

`renderResults()` in `index.html` sorts results **Technical → Content → AEO → GEO** before rendering. Category is detected via `resultCategory()` which checks `name.startsWith('[Technical]')`, `[Content]`, `[AEO]`, `[GEO]`. Category dividers are injected between groups in both the card strip and detail rows. The prefix is stripped from card display names (redundant once grouped).

`CAT_LABELS` maps each category key to `{ short, full }`:
- `technical` → "Technical" / "Site Health & Infrastructure"
- `content` → "Content" / "Marketing & On-Page Signals"
- `aeo` → "AEO" / "Answer Engine Optimization"
- `geo` → "GEO" / "Generative Engine Optimization"

### Loading Progress UI

Both audit modes reuse the same `#statusLine` + `#progressTrack` / `#progressFill` elements. `showProgressUI()` shows them and resets width to 0%.

**Page Audit:** `startSteps()` calls `showProgressUI()` then drives the bar via `STEPS` fake animation. The `STEPS` array has **72 entries**: 29 `[Technical]`, 18 `[Content]`, 9 `[AEO]`, 11 `[GEO]`, + 4 setup/teardown steps. Displayed check count = `STEPS.filter(s => s.startsWith('[')).length` = **68**. Timer: `Math.max(500, Math.round(20000 / STEPS.length))` ms — self-adjusts as checks are added.

**Site Audit:** `runSiteAudit()` calls `showProgressUI()` then drives the bar directly from SSE `progress` events (`crawled / total * 100`). Status text shows the current URL being crawled — no fake animation.

On completion (both modes), bar jumps to 100%, status = "Done.", 600ms pause, then results render. Progress bar CSS: `#progressTrack` (3px, `var(--border)` bg) / `#progressFill` (`var(--accent)`, `transition: width 0.85s ease`).

## PDF Generation (`utils/generatePDF.js`)

- Reads `templates/report.hbs` **fresh on every call** (no server restart needed after template edits)
- Compiles with Handlebars; helpers: `eq`, `isDefined`
- Adds `meterColor`, `passCount`, `warnCount`, `failCount` to template data
- **Also adds `technicalResults`, `contentResults`, `aeoResults`, `geoResults`** — pre-grouped and prefix-stripped arrays for the template
- **Also adds `catScores`** — `{ technical, content, aeo, geo }` each `{ score, grade }` — computed by `calcCatScore()` which averages `normalizedScore` across each group
- **Also adds `top7Fails`, `top7Passes`** — top 7 lowest-scoring issues and top 7 passes for the executive summary section (`.slice(0, 7)`)
- **Also adds `logoUrl`** — passed from `options.logoUrl`; if set, PDF header shows agency logo instead of SIGNALGRADE wordmark
- **Also adds `isSiteReport`** — `!!options.isSiteReport`; when true, score column shows `N%` instead of `N/100` in the PDF template
- No Puppeteer header/footer (`displayHeaderFooter` is off) — avoids white bars on dark background. Page metadata is omitted from the PDF output.
- Output filename: `signalgrade-report-[hostname]-[YYYY-MM-DD].pdf` (page audit) or `signalgrade-site-report-[hostname]-[YYYY-MM-DD].pdf` (site audit, via `options.prefix`)
- Default prefix: `'signalgrade'` — pass `options.prefix` to override (e.g. `'signalgrade-site'`)
- Puppeteer launch args required for background rendering on Windows:
  `--force-color-profile=srgb`, `--no-sandbox`, `--disable-setuid-sandbox`, `--run-all-compositor-stages-before-draw`
- Uses `page.goto('file:///abs/path/to/tmp.html')` (NOT `page.setContent`) — required for backgrounds to render
- Uses `page.emulateMediaType('screen')` + `printBackground: true`
- Writes HTML to a temp file (`_tmp_report.html`) and deletes it after PDF is saved

## PDF Template (`templates/report.hbs`)

Dark theme matching the web UI. Body font is Inter; Space Mono applied to `.doc-meta-label`, `.doc-url`, `.grade-letter`, `.score-number`, `.stat-n`, `.cat-score-num`, `.row-score`.

Structure order:
1. Header (SIGNALGRADE wordmark, or agency logo if `logoUrl` set)
2. Score block (grade letter + score number + meter)
3. Pass/Warn/Fail stats row
4. Category score cards (Technical/Content/AEO/GEO)
5. **Executive summary** — two columns: "Critical Issues" (top7Fails, up to 7 items) and "What's Working" (top7Passes, up to 7 items)
6. Four result sections: Technical → Content → AEO → GEO, each with colored `.section-label` dividers. The Technical section label has `page-break-before:always` and `padding-top:24px` so results always start on page 2 with breathing room.

Color tokens are hardcoded (no CSS variables):
- Background: `#0b0c0e`, card bg: `#111214`, borders: `#1e2025`
- Each result row has a colored left border (`2px solid`) based on status: green/amber/red
- Score block has a `3px solid #4d9fff` top border
- `@page { size: A4; margin: 0; }` — page margins are set via Puppeteer's `margin` option instead

## ⚠ PDF Performance Rule — Do Not Regress

**Never use these CSS properties in `report.hbs` — they cause scroll lag in PDF viewers:**
- `box-shadow` → use `border: 1px solid #1e2025` instead
- `opacity` on overlapping elements → use pre-mixed solid colors
- `transition` or `animation` → remove entirely

## ⚠ Color Separation Rule — Do Not Regress

`--accent` (#4d9fff blue) and `--pass` (#34d399 green) serve different purposes:
- `--pass` (green): pass status indicators, A-grade scores — **score/status colors only**
- `--accent` (blue): links, hover states, active UI chrome, score block border, meter fill for B-grade

When changing the accent color, do NOT change pass/fail/warn status colors. They are independent.
Previously broke this by applying a blue accent change to pass-colored score readouts.

**Category colors** (`#8892a4` Technical grey, `#e8a87c` Content orange, `#7baeff` AEO blue, `#b07bff` GEO purple) are separate from `--accent`. Do not unify them.

## ⚠ Known Mistakes — Do Not Repeat

1. **Run button hover stayed green after accent color change** — `#auditBtn:hover` had a hardcoded old green hex (`#00ffaa`) that was missed during the accent color sweep. Always grep for hardcoded color hex values when changing a theme color.

2. **Pass score color turned blue after accent change** — `gradeColor()` in `index.html` was returning the accent color for scores ≥90, which should always be `--pass` (green). Status colors (pass/warn/fail) must never inherit from the accent color.

3. **PDF dark background not rendering (Puppeteer v24, Windows)** — `printBackground: true` and `print-color-adjust: exact` alone are insufficient. `page.setContent()` strips backgrounds; must use `page.goto('file:///')` with a temp file. Also requires `--force-color-profile=srgb` and `--run-all-compositor-stages-before-draw` launch args. Confirmed working as of current setup.

4. **Category text unreadable on dark background** — AEO/GEO category header colors `#4a5ea8` / `#6a4a98` were too dark against `#0b0c0e`. Use `#7baeff` (AEO) and `#b07bff` (GEO) — these are the confirmed readable values.

5. **Result row bar color used `gradeColor()` instead of status color** — The `.row-bar-fill` inline `background` was set via `gradeColor(r.normalizedScore)`, which maps 80–89 to a hardcoded blue (`#00ccff`). AEO/GEO checks scoring 80 showed a blue bar instead of green. Fix: use status color directly — `r.status === 'pass' ? 'var(--pass)' : r.status === 'warn' ? 'var(--warn)' : 'var(--fail)'`. `gradeColor()` is only appropriate for the overall score meter, not individual result bars.

6. **Puppeteer `displayHeaderFooter` creates white bars on dark PDFs** — even with `background:#0b0c0e` set in the footer template, Puppeteer renders header/footer in a separate context where the dark background does not apply. Result: white bars at top and bottom of every page. Fix: disable `displayHeaderFooter` entirely (`displayHeaderFooter: false` or omit it). Page metadata (date, page numbers) is omitted as a result — embed it in the HTML body if needed instead.

7. **New audit files not appearing in results after adding them** — `server.js` calls `readdirSync` once at startup and caches the audit list. Adding new `/audits/*.js` files while the server is running has no effect until the server is restarted. Always restart the server after adding new audit modules. (The `index.html` STEPS array and the PDF template do not require a restart — they are served/read fresh each time.)

8. **Stacked bars in site audit had inconsistent widths** — The stacked bar was nested inside the `1fr` middle column div. The `1fr` column width = total width − icon − `auto` counts/score column. Since the `auto` column varies per row (different character counts), `1fr` was different on every row, making bars different widths. Fix: make `.site-stacked-bar` / `.stacked-bar` a **direct child of `.result-row`** with `grid-column: 1 / -1` so it auto-places to a new grid row spanning the full width. Also change `gap` to `column-gap` (row-gap → 0) so the bar sits directly below the content row, spaced only by its own `margin-top`. Applied to both the web UI and the PDF template.

9. **Crawler did not skip non-HTML files (PDFs, images, etc.)** — The BFS crawler was enqueuing all same-origin links including `.pdf`, `.jpg`, and other binary files. When a PDF was downloaded, `cheerio.load()` spent 20-40 seconds parsing binary data as HTML, and all 64 DOM-based audits ran on garbage DOM. On chipotle.com, pages 27-36 were all PDFs — each took 23-45 seconds instead of under 1 second. Fix: `NON_HTML_EXTENSIONS` set in `crawler.js` filters non-HTML extensions before enqueueing (primary fix) and `fetcher.js` checks `Content-Type` before calling `cheerio.load()` (safety net for extensionless URLs serving binary data). Always filter by extension at enqueue time AND at the top of the crawl loop (defense in depth).

## Server Notes

- `open` package (v9+) is ESM-only — use `import('open').then(m => m.default(url))`, not `require('open')`
- Template is compiled fresh on every `generatePDF()` call — no restart needed after editing `report.hbs`
- `/download` route serves the most recently modified `.pdf` in `/output`
- Changes to `score.js` require a server restart (module is cached by Node.js `require()`)
- **New or removed `/audits/*.js` files require a server restart** — `readdirSync` runs once at startup
- `/audit` POST accepts optional `logoUrl` (string) — validated server-side (http/https only), passed to `generatePDF()`
- `/crawl` GET streams SSE to the client; `crawler.js` is loaded at startup like audits — restart required after changes to it
- `/crawl` generates a site audit PDF after crawling via `transformSiteResultsForPDF()` + `generatePDF()`, then includes `pdfFile` (filename) in the `done` SSE event
- `transformSiteResultsForPDF(aggregated, pageCount)` converts `{name, fail[], warn[], pass[], recommendation, message}` → `{name, status, normalizedScore, message, details, recommendation}` — the shape `generatePDF()` expects
- `gradeSummary` is imported from `./utils/score` in `server.js` and used to build the site audit PDF `summary` field
- Site audit PDF input passes `summary` (grade description only) and `siteAuditLine` (`"Site audit · N pages crawled"`) as separate fields so the template can render them on separate lines

## Site Audit (`utils/crawler.js` + `utils/pageWorker.js`)

BFS crawler, same-origin only. `crawlSite(startUrl, { maxPages, onProgress })` returns `pages[]` each `{ url, results[] }`. `aggregateResults(pages)` collapses into `{ name, fail: [url,...], warn: [url,...], pass: [url,...], recommendation, message }[]` sorted by fail count desc. `recommendation` and `message` are populated from the first non-null occurrence across all pages for that check name.

**Worker thread architecture:** Each page is processed in a dedicated worker thread (`utils/pageWorker.js`) with an isolated V8 heap capped at 1 GB (`resourceLimits.maxOldGenerationSizeMb`). When the worker exits, its entire heap (cheerio DOM, HTML string, audit locals) is freed — no accumulation across pages. Workers run sequentially (one at a time). A 45-second timeout per page terminates hung workers automatically.

**Audits skipped** (make extra HTTP calls — too slow at 50-page scale):
- `checkPageSpeed.js` — PSI API
- `technicalBrokenLinks.js` — HEADs 20 links per page
- `technicalCanonicalChain.js` — fetches canonical target URL
- `contentOGImageCheck.js` — HEADs og:image URL
- `technicalRedirectChain.js` — up to 10 sequential GETs per page chasing redirects
- `checkCrawlability.js` — fetches /robots.txt + /sitemap.xml (domain-level, same for every page)
- `technicalRobotsSafety.js` — fetches /robots.txt (domain-level, same for every page)

**⚠ Audit memory rule:** Audit functions MUST use the `$` and `html` arguments passed in by the crawler — never re-fetch the page with their own `axios.get(url)`. Re-fetching creates a second cheerio DOM per page (50-100 MB each), which across a 50-page crawl accumulates 4+ GB and causes OOM. `checkNAP.js` and `checkMetaTags.js` were previously broken this way and have been fixed.

**SSE event shapes streamed from `/crawl`:**
- `{ type: 'progress', crawled: N, total: 50, url: '...' }` — fired before each page fetch
- `{ type: 'done', pageCount: N, results: [...], pdfFile: 'signalgrade-site-report-...' }` — final aggregated payload; `pdfFile` is the PDF filename (basename only) served from `/output`
- `{ type: 'error', message: '...' }` — on crawl failure

**UI (`renderSiteResults({ pageCount, results, siteUrl, pdfFile })`):**
- Site grade block: `letterGrade()` + `gradeColor()` colored grade letter + score + descriptive label
- Summary stats row: checks-with-fails / warnings-only / all-passing counts
- PDF download button (centered, shown only when `pdfFile` is truthy): links to `/output/{pdfFile}`
- **Top Issues** (7 items): sorted by fail count, shows check name + `N% of pages affected`
- **Issue Breakdown**: sorted by `categoryOrder()`, category headers injected, each row has a **stacked pass/warn/fail bar** (red/amber/green, proportional to page count) + `+ N pages affected` toggle + `+ recommendation` toggle
- **What's Working** (collapsed by default): category-grouped list of all-passing checks with a solid green stacked bar; collapsed `✓ What's Working (N checks)` button signals passes exist without obstructing triage flow
- `toggleSiteRow(i)` / `toggleSiteRec(id)` / `toggleSiteWorking()` — row-level toggle helpers
- New CSS classes: `.site-grade-block`, `.site-grade-letter`, `.site-grade-score`, `.site-grade-label`, `.site-top-pct`, `.site-working-toggle`, `.site-working-rows`, `.site-stacked-bar`, `.site-stacked-seg`
- **Stacked bar layout rule:** `.site-stacked-bar` must be a **direct child of `.result-row`** (not nested inside the inner div) with `grid-column: 1 / -1`. This ensures all bars span the same full row width. `.result-row` uses `column-gap: 16px; row-gap: 0` so the bar auto-places to a new grid row with only `margin-top: 8px` spacing.

## Known Issues

- `titleTag.js`, `metaDescription.js`, and `checkMetaTags.js` overlap (intentional redundancy)
- `utils/reporter.js` is legacy and unused — kept for compatibility
- PSI free tier: ~400 req/day/IP. Set `PAGESPEED_API_KEY` in `.env` to avoid 429s
- JS-rendered SPAs will score poorly — static HTML only

## To-Do

- **Multi-location Audit** — run Page Audit against several URLs at once, aggregate and compare scores across locations. Natural upsell tier for agencies managing multi-location clients.
- **Monetization** — pricing tiers, payment integration, and feature gating (e.g. higher crawl limits, historical tracking, scheduled audits). Design when feature set is more stable.

## Global Rules (from ~/.claude/CLAUDE.md)

- Run tests after changes *(no test suite yet — add one)*
- Ask before committing
- Keep code simple

## Language

- **American English** throughout — all user-facing strings, recommendations, code comments, and documentation. The company is US-based. Use: optimize, color, behavior, favor, recognize, analyze. Never: optimise, colour, behaviour, favour, recognise, analyse.
