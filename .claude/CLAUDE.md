# Claude Project Memory — SignalGrade

Read this file at the start of every session.

---

## What This Project Is

**SignalGrade** — a search visibility audit tool. Two modes:
- **CLI** (`node index.js <url>`): runs audits, prints human report to stderr, JSON to stdout, saves PDF to `/output`
- **Web server** (`npm run dev` → Nuxt 3 on port 3001, `npm start` → production build): Nuxt/Nitro replaces Express entirely. UI at `pages/index.vue`, backend routes in `server/routes/`.

Audits cover four categories: **Technical** (site health & infrastructure), **Content** (marketing & on-page signals), **AEO** (Answer Engine Optimization — featured snippets, voice), **GEO** (Generative Engine Optimization — Gemini, ChatGPT, Perplexity).

**Positioning:** "Score your site across Google, and across AI." — covers traditional SEO + AEO + GEO. Not a "Local SEO" tool.

---

## Project Layout

```
index.js               # CLI entry — auto-loads audits, scores, outputs report + JSON + PDF
nuxt.config.ts         # Nuxt 3 config — port 3001, modules (nuxt-auth-utils, @pinia/nuxt), Google OAuth runtimeConfig
knexfile.js            # Knex database config — reads DATABASE_URL from .env
audits/                # One file per check (auto-discovered via readdirSync)
pages/
  index.vue            # Main audit page — Page / Site / Compare toggle
  dashboard.vue        # Report history — fetches /api/dashboard-data, redirects if unauthenticated
  account.vue          # Account/billing/API keys — fetches /api/account-data, redirects if unauthenticated
  widget.vue           # Embeddable audit widget — reads ?key= query param, no AppNav/AppFooter
components/
  AppNav.vue           # Shared navbar (sticky, max-width 1080px, SIGNALGRADE wordmark)
  AppFooter.vue        # Shared footer
stores/
  user.ts              # Pinia store — user state + fetchMe() action
composables/
  useAudit.ts          # Wraps /audit POST + /crawl SSE for use in pages/index.vue
public/
  app-main.js          # Vanilla JS for the homepage audit UI (~1130 lines)
  widget.js            # Embeddable iframe loader script (~15 lines)
  docs.html            # API reference documentation (static)
  privacy.html         # Privacy policy static HTML
  terms.html           # Terms of service static HTML
assets/
  main.css             # CSS extracted from old index.html style block (739 lines)
server/
  plugins/
    audits.ts          # Nitro plugin — loads all 81 audit modules once at startup via readdirSync
  middleware/
    00.apiKeyAuth.ts   # Bearer token API key auth — hashes token, looks up api_keys table, sets event.context.apiKeyUser
    01.rateLimit.ts    # In-memory rate limiter (Map) — attaches event.context.tier/plan/userId; falls back to apiKeyUser if no session
  routes/
    auth/
      google.get.ts    # Google OAuth via defineOAuthGoogleEventHandler (handles redirect + callback)
      logout.get.ts    # clearUserSession + redirect to /
    audit.post.ts      # Page audit — fetch page, run audits, score, save report, generate PDF
    multi-audit.post.ts# Compare audit — same as audit but N URLs, enforces tier.multiAuditLimit
    crawl.get.ts       # SSE site crawl — streams progress events, generates site PDF on completion
    widget-audit.post.ts # Widget audit — API key gated, validates key from body, no PDF generation
    output/
      [...path].get.ts # Streams PDFs from /output directory (directory traversal protected)
    terms.get.ts       # Serves public/terms.html with correct Content-Type
    privacy.get.ts     # Serves public/privacy.html with correct Content-Type
    webhooks/
      stripe.post.ts   # Stripe webhook — readRawBody for signature verification
    checkout.post.ts   # Creates Stripe Checkout session
    billing-portal.post.ts # Creates Stripe billing portal session
    checkout/
      success.get.ts   # Stripe success redirect
      cancel.get.ts    # Stripe cancel redirect
  api/
    me.get.ts          # Returns { user, limits } from session + event.context.tier
    dashboard-data.get.ts # DB query for report history (requires auth)
    account-data.get.ts   # User + plan info for account page (requires auth)
    reports/
      [id].delete.ts   # Deletes report by id — verifies user_id ownership
    keys/
      index.get.ts     # Lists API keys for current user (returns prefix, not hash)
      index.post.ts    # Generates API key — sg_ + 32 random bytes, stores SHA-256 hash, returns plaintext once
      [id].delete.ts   # Revokes API key — verifies user_id ownership
utils/
  fetcher.js           # axios + cheerio page fetcher
  score.js             # Shared scoring logic (normalizeScore, calcTotalScore, letterGrade, etc.)
  generatePDF.js       # Handlebars + Puppeteer → /output/signalgrade-report-[domain]-[date].pdf
  crawler.js           # BFS site crawler — crawlSite(), aggregateResults()
  db.js                # Knex instance — returns null gracefully if DATABASE_URL not set
  tiers.js             # Tier/rate-limit config — TIERS, ANON_RATE_LIMIT, getTier()
db/
  migrations/          # Knex migration files — creates users, reports, sessions, api_keys tables
templates/
  report.hbs           # Handlebars HTML template for the PDF (dark theme, matches web UI)
output/                # Generated PDFs (gitignored)
```

## Audit Modules

### Technical (41 checks) — name prefixed `[Technical]`
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
| `technicalSitemapValidation.js` | Fetches sitemap.xml, HEADs up to 15 `<loc>` URLs, scores by % returning 2xx/3xx — scored 0/50/80/100 |
| `technicalAccessibility.js` | lang attr(30) + main landmark(25) + labeled inputs(25) + skip nav(20) — scored 0–100 |
| `technicalPagination.js` | `<link rel="next/prev">` in head; warns if URL looks paginated but tags are absent |
| `technicalCacheControl.js` | Cache-Control header — no-store (fail), no max-age (warn), positive max-age (pass) — scored 0/50/100 |
| `technicalCSP.js` | Content-Security-Policy header — enforcing (pass/100), report-only (warn/60), absent (fail/0) |
| `technicalPreconnect.js` | `<link rel="preconnect">` / dns-prefetch / preload in head — scored 0/60/100 by hint type |
| `technicalRenderBlocking.js` | `<script src>` in `<head>` without defer/async — scored 0/40/70/100 by blocking script count |
| `technicalMinification.js` | `.min.` filename heuristic on external JS/CSS — scored 0/60/100 by % minified |
| `technicalWebManifest.js` | `<link rel="manifest">` presence; apple-touch-icon fallback — scored 0/60/100 |
| `technicalCrawlDelay.js` | Fetches /robots.txt, parses Crawl-delay: directive — ≥2s (fail/0), <2s (warn/50), absent (pass/100) |
| `technicalXRobotsTag.js` | X-Robots-Tag response header — noindex (fail/0), other (warn/70), absent (pass/100) |

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

### GEO (14 checks) — name prefixed `[GEO]`
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
| `geoLlmsTxt.js` | Fetches /llms.txt AND /llms-full.txt — both missing (0), sparse <100 chars (60), either present with content (100) |
| `geoAICrawlerAccess.js` | Parses robots.txt for 7 AI bots (GPTBot, ClaudeBot, PerplexityBot, etc.) — 0 blocked (100), 1–2 (50), 3+ (0) |
| `geoAIPresence.js` | Queries Perplexity API (sonar model) to check if site is cited in AI search results for a brand query — cited (100), mentioned in text (60), absent (0), API key missing (warn/50). Requires `PERPLEXITY_API_KEY`. Skipped in site crawl. |

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
- `totalScore` = arithmetic mean of all normalized scores (all 73 checks)
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

**Page Audit:** `startSteps()` calls `showProgressUI()` then drives the bar via `STEPS` fake animation. The `STEPS` array has **85 entries**: 41 `[Technical]`, 18 `[Content]`, 9 `[AEO]`, 13 `[GEO]`, + 4 setup/teardown steps. Displayed check count = `STEPS.filter(s => s.startsWith('[')).length` = **81**. Timer: `Math.max(500, Math.round(20000 / STEPS.length))` ms — self-adjusts as checks are added.

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

## ⚠ Do Not Repeat

**Colors & theme:**
1. **Color separation** — `--pass` (green) = pass status + A-grade only. `--accent` (blue) = links, hover, UI chrome. Never let accent bleed into status colors. Category colors (`#8892a4`/`#e8a87c`/`#7baeff`/`#b07bff`) are also independent from `--accent` — don't unify them.
2. **Hardcoded hex values** — When changing a theme color, grep for hardcoded hex values (e.g., `#00ffaa`). `#auditBtn:hover` previously had a stale green hex missed during an accent color sweep.
3. **`gradeColor()` scope** — Only for the overall score meter. Individual result row bars must use status color directly (`pass→var(--pass)`, `warn→var(--warn)`, `fail→var(--fail)`). `gradeColor()` maps 80–89 to a hardcoded blue, which was showing blue bars on green-status checks.
4. **AEO/GEO dark-bg contrast** — `#4a5ea8` / `#6a4a98` are unreadable on `#0b0c0e`. Confirmed readable: AEO = `#7baeff`, GEO = `#b07bff`.

**PDF generation:**
5. **Puppeteer dark background** — `page.setContent()` strips backgrounds; use `page.goto('file:///')` with a temp file. Requires `--force-color-profile=srgb` + `--run-all-compositor-stages-before-draw` launch args. `printBackground: true` alone is not enough.
6. **`displayHeaderFooter` white bars** — Puppeteer renders header/footer in a separate context; dark background doesn't apply → white bars on every page. Disable entirely; embed metadata in HTML body instead.
7. **PDF performance** — Never use `box-shadow`, `opacity` on overlapping elements, or `transition`/`animation` in `report.hbs` — causes scroll lag in PDF viewers. Use `border` instead of `box-shadow`; pre-mix solid colors instead of opacity.

**Layout & CSS:**
8. **Stacked bar width** — `.site-stacked-bar` must be a direct child of `.result-row` with `grid-column: 1 / -1`, not nested in the `1fr` column (which varies per row). Use `column-gap` not `gap` to avoid unwanted row spacing.
9. **Windows scrollbar shift** — Scrollbar reduces content area, shifting `margin: 0 auto` centering. Fix: `html { scrollbar-gutter: stable; }` on every page.
10. **Navbar wordmark weight** — Explicitly set `font-weight: 400` on `.nav-brand` in every template; default inheritance varies and causes boldness mismatch between pages.
11. **Stale container dimensions after refactors** — After changing layout width/padding, grep for old values (e.g., `1100px`, `56px`) to catch containers that weren't updated.

**Nuxt / Nitro:**
12. **`createRequire` paths** — Always use `join(process.cwd(), 'utils/foo.js')`. Relative paths resolve from `.nuxt/dev/index.mjs` (the bundle), not the source file. The single most pervasive Nuxt migration bug — applies to all routes, middleware, plugins, and API handlers.
13. **`public/index.html` overrides routes** — Nuxt serves `public/` before page routes. A stale `public/index.html` prevents `pages/index.vue` from ever rendering. Delete it.
14. **TypeScript in `<script setup>`** — Requires `lang="ts"` or vite-node crashes silently ("IPC connection closed"). After fixing, delete `.nuxt/` to clear stale compiled artifacts before restarting.
15. **New audit files need a restart** — `audits.ts` caches the module list at Nitro startup. Also manually update the `STEPS` array in `app-main.js` to match the new check count.

**Vue / data fetching:**
16. **SSR cookies not forwarded** — `useAsyncData` + `$fetch` during SSR doesn't forward the session cookie → 401. Use `useUserSession()` for profile/plan data. Use `ref(null)` + `$fetch` in `onMounted` for frequently-changing data (reports, counts) — `useAsyncData` SSR payload caching causes stale empty-state renders even with `getCachedData: () => null`.
17. **Vue scoped CSS + slots** — Scoped styles don't reach slot content. Define `.nav-link` in every consuming page (`index.vue`, `dashboard.vue`, `account.vue`); don't rely on `AppNav.vue`'s scoped styles for slot-injected elements.
18. **Vite HMR on `output/`** — PDF writes trigger full browser reloads, wiping audit results mid-render. Add `vite.server.watch.ignored: ['**/output/**']` to `nuxt.config.ts`.
19. **`getElementById` at parse time** — If the target element is conditionally absent, the call throws and crashes all page JS. Guard: `const el = document.getElementById('x'); if (el) el.textContent = ...`.
20. **PDF download href stubs** — Always interpolate `data.pdfFile` into download button hrefs (`/output/${pdfFile}`). Placeholder `/download` hrefs have shipped broken before.

**Crawler / audits:**
21. **Non-HTML files in crawler** — Filter by `NON_HTML_EXTENSIONS` at enqueue time and check `Content-Type` in fetcher. Binary files (PDFs, images) take 20-40s each and produce garbage DOM results.
22. **Audit re-fetching causes OOM** — Audits must use the `$`/`html` passed in, never call `axios.get(url)` themselves. Each re-fetch creates a 50-100 MB cheerio DOM; across a 50-page crawl that's 4+ GB → OOM. `checkNAP.js` and `checkMetaTags.js` were previously broken this way.
23. **`assets/main.css` `.pdf-link` is invisible by default** — Global `assets/main.css` defines `.pdf-link` with `opacity: 0` and `margin-bottom: 48px`. The `.in` class is required to make it visible (`opacity: 1`). Always add class `pdf-link in` when using this class in Vue pages. Also override `margin-bottom: 0` in the page's global style block to prevent vertical misalignment in table rows.
24. **Vue scoped CSS doesn't apply to client-only rendered elements** — Elements rendered after `onMounted` (i.e., data fetched client-side via `$fetch`) won't receive scoped CSS styles. Move styles for dynamically rendered elements to the unscoped `<style>` block. This bit us on `dashboard.vue`'s PDF download button.
25. **Never use `innerHTML` for interactive UI inside Vue pages** — Elements injected via `element.innerHTML = ...` don't get the `data-v-xxx` attribute, so scoped CSS never applies to them — they render as plain browser-default elements. Moving styles to an unscoped block is not a reliable workaround (specificity and load-order issues). The correct fix is always a Vue template with `v-if`/`v-else` and a reactive `ref()`. Also: never attach event listeners with both `@click` in the template AND `addEventListener` in `onMounted` to the same element — both fire on click, causing double execution.

## Auth & Dashboard

**Stack:** nuxt-auth-utils sealed cookie sessions + Google OAuth via `defineOAuthGoogleEventHandler`.

**ENV variables required:**
```
DATABASE_URL=postgresql://...        # Postgres connection string
NUXT_SESSION_PASSWORD=<32+ chars>   # Random secret for cookie encryption (nuxt-auth-utils)
GOOGLE_CLIENT_ID=...                 # From Google Cloud Console → OAuth credentials
GOOGLE_CLIENT_SECRET=...             # Same
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google  # Must match Google Cloud Console
RESEND_API_KEY=                              # From resend.com — enables welcome, regression, and scheduled report emails
EMAIL_FROM=SignalGrade <noreply@yourdomain.com>  # Verified sender in Resend dashboard
PERPLEXITY_API_KEY=                          # From perplexity.ai/settings/api — enables [GEO] AI Search Presence check
```

**Auth routes:**
- `GET /auth/google` — single route handles both OAuth redirect (no `code`) and callback (with `code`) via `defineOAuthGoogleEventHandler`; on success calls `setUserSession` + redirects to `/dashboard`
- `GET /auth/logout` — `clearUserSession(event)` + redirect to `/`
- `GET /api/me` — returns `{ user, limits }` from session + `event.context.tier`

**`defineOAuthGoogleEventHandler`** — nuxt-auth-utils built-in. `onSuccess(event, { user: googleUser })` receives the Google profile; `onError(event, error)` handles failures. Session is a sealed cookie — no DB session table needed.

**⚠ Google Cloud Console:** The authorized redirect URI must be `http://localhost:3000/auth/google` (not `/auth/google/callback` — nuxt-auth-utils handles the callback at the same path). Update this in Google Cloud Console → APIs & Services → Credentials when changing environments.

**`utils/db.js`** — exports a Knex instance or `null` if `DATABASE_URL` is not set. All DB calls guard against `null` so the server runs without a database (auth and history disabled, audits still work).

**Database tables** (created by `npm run migrate`):
- `users` — id, google_id, name, email, avatar_url, plan, created_at
- `reports` — id, user_id (FK), url, audit_type (page/site/multi), score, grade, pdf_filename, locations (JSON), created_at
- `api_keys` — id, user_id (FK, CASCADE), key_hash (SHA-256 hex, unique), label, created_at, last_used_at

**`pages/dashboard.vue`** — Vue SFC at `/dashboard`. Fetches `/api/dashboard-data` server-side via `useAsyncData`. Unauthenticated users are redirected to `/` via `navigateTo('/')`. Shows saved reports table with per-row delete (inline "Sure? [Yes] [No]" confirmation). `DELETE /api/reports/:id` verifies `user_id` ownership before deleting.

**Report saving** — `saveReport(userId, data)` in `server/routes/audit.post.ts` is fire-and-forget (`.catch` logs errors silently). Called after every page, site, and multi-location audit. No-ops if `db` is null or `userId` is falsy.

**Auth widget in `public/app-main.js`** — `initAuthWidget()` fetches `/api/me` on page load and populates `#authWidget`:
- Unauthenticated: `<a href="/auth/google" class="google-btn">Sign in</a>`
- Authenticated: avatar + Dashboard link + Sign out link

`showSavedNote()` appends a `✓ Saved to your history` line after results render (only when logged in).

**Navbar alignment** — `AppNav.vue` + all pages use identical navbar structure: sticky `<nav>` with `border-bottom: 1px solid var(--border)` containing an inner div at `max-width: 1080px; margin: 0 auto; padding: 0 32px; height: 56px`. All pages set `html { scrollbar-gutter: stable; }` so Windows scrollbar presence doesn't shift `margin: 0 auto` centering.

## Server Notes (Nitro / Nuxt 3)

- **`createRequire` path rule — CRITICAL:** Nitro bundles all server TypeScript into `.nuxt/dev/index.mjs`. Relative paths in `createRequire` (e.g., `'../../../utils/db.js'`) resolve relative to the BUNDLE file, not the source file, breaking module resolution. **Always use `join(process.cwd(), 'utils/db.js')` absolute paths.** Applied to all routes, middleware, plugins, and API handlers.
- **CJS/ESM bridge pattern:** All Nitro TypeScript files use `import { createRequire } from 'module'` + `const _require = createRequire(import.meta.url)` to load CJS utility modules. Requires inside route handlers (lazy) or at module level with `process.cwd()` paths.
- **`server/plugins/audits.ts`** loads all 73 audit modules once at startup via `readdirSync` + `_require`. Routes access them via `useNitroApp().audits`. Restart required after adding/removing audit files.
- **h3 v1.x SSE API:** `createEventStream(event)` creates the stream; async IIFE pushes data via `stream.push(JSON.stringify(obj))`; `return stream.send()` starts streaming. `sendEventStream` does NOT exist in h3 v1.x.
- **`defineOAuthGoogleEventHandler`** from nuxt-auth-utils handles both the OAuth redirect and callback in a single route file at `server/routes/auth/google.get.ts`. No separate callback route needed.
- Template is compiled fresh on every `generatePDF()` call — no restart needed after editing `report.hbs`
- Changes to `score.js` require a server restart (module is cached by Node.js `require()`)
- `/audit` POST accepts optional `logoUrl` (string) — validated server-side (http/https only), passed to `generatePDF()`
- `/crawl` GET streams SSE to the client; `crawler.js` is loaded at startup like audits — restart required after changes to it
- `/crawl` generates a site audit PDF after crawling via `transformSiteResultsForPDF()` + `generatePDF()`, then includes `pdfFile` (filename) in the `done` SSE event
- `transformSiteResultsForPDF(aggregated, pageCount)` converts `{name, fail[], warn[], pass[], recommendation, message}` → `{name, status, normalizedScore, message, details, recommendation}` — the shape `generatePDF()` expects
- `gradeSummary` is imported from `utils/score.js` (via `_require`) in Nitro routes and used to build the site audit PDF `summary` field
- Site audit PDF input passes `summary` (grade description only) and `siteAuditLine` (`"Site audit · N pages crawled"`) as separate fields so the template can render them on separate lines

## Site Audit (`utils/crawler.js` + `utils/pageWorker.js`)

BFS crawler, same-origin only. `crawlSite(startUrl, { maxPages, onProgress })` returns `pages[]` each `{ url, results[], title, metaDesc, outLinks[] }`. `aggregateResults(pages)` collapses into `{ name, fail: [url,...], warn: [url,...], pass: [url,...], recommendation, message }[]` sorted by fail count desc. `recommendation` and `message` are populated from the first non-null occurrence across all pages for that check name.

**`utils/detectOrphans.js`** — post-crawl link graph analysis. `detectOrphans(pages, startUrl)` builds an inbound link count map from each page's `outLinks[]`, then returns one synthetic result (`[Technical] Orphan Pages`) listing pages with zero inbound links from other crawled pages. The start URL is excluded (it's the entry point). Called in `server/routes/crawl.get.ts` alongside `detectDuplicates`. Site audit only.

**`utils/detectDuplicates.js`** — post-crawl cross-page analysis. `detectDuplicates(pages)` groups pages by `title` and `metaDesc`, then returns two synthetic result objects (`[Technical] Duplicate Page Titles`, `[Technical] Duplicate Meta Descriptions`) in the same shape as `aggregateResults()` output. Called in `server/routes/crawl.get.ts` after `aggregateResults(pages)` and pushed into the aggregated array before PDF generation and the SSE `done` event. Does NOT run during page audit — site audit only.

**Worker thread architecture:** Each page is processed in a dedicated worker thread (`utils/pageWorker.js`) with an isolated V8 heap capped at 1 GB (`resourceLimits.maxOldGenerationSizeMb`). When the worker exits, its entire heap (cheerio DOM, HTML string, audit locals) is freed — no accumulation across pages. Workers run sequentially (one at a time). A 45-second timeout per page terminates hung workers automatically.

**Audits skipped** (make extra HTTP calls — too slow at 50-page scale):
- `checkPageSpeed.js` — PSI API
- `technicalBrokenLinks.js` — HEADs 20 links per page
- `technicalCanonicalChain.js` — fetches canonical target URL
- `contentOGImageCheck.js` — HEADs og:image URL
- `technicalRedirectChain.js` — up to 10 sequential GETs per page chasing redirects
- `checkCrawlability.js` — fetches /robots.txt + /sitemap.xml (domain-level, same for every page)
- `technicalRobotsSafety.js` — fetches /robots.txt (domain-level, same for every page)
- `geoLlmsTxt.js` — fetches /llms.txt + /llms-full.txt (domain-level, same for every page)
- `geoAICrawlerAccess.js` — fetches /robots.txt (domain-level, same for every page)
- `technicalSitemapValidation.js` — HEADs sitemap URLs (domain-level + too slow per-page)
- `technicalCrawlDelay.js` — fetches /robots.txt (domain-level, same for every page)
- `geoAIPresence.js` — Perplexity API call (domain-level, slow)

**SSE event shapes streamed from `/crawl`:**
- `{ type: 'progress', crawled: N, total: 50, url: '...' }` — fired before each page fetch
- `{ type: 'done', pageCount: N, results: [...], pdfFile: 'signalgrade-site-report-...' }` — final aggregated payload; `pdfFile` is the PDF filename (basename only) served from `/output`
- `{ type: 'error', message: '...' }` — on crawl failure

**UI (`renderSiteResults({ pageCount, results, siteUrl, pdfFile })`):**
- Site grade block: `letterGrade()` + `gradeColor()` colored grade letter + score + descriptive label
- Summary stats row: checks-with-fails / warnings-only / all-passing counts
- Download buttons row: PDF (`/output/{pdfFile}`, shown when `pdfFile` is truthy) + **Download Sitemap XML** (always shown; `downloadSitemapXml()` builds XML Blob from all crawled URLs in `_latestSiteResults`)
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

- **Compare Audit (Multi-location)** ✅ DONE — location labels, NAP cross-comparison with mismatch detection, score delta (localStorage), CSV export, dynamic check count in PDF template. UI renamed "Multi" → "Compare" throughout.
- **User Accounts & Report History** ✅ DONE — Google OAuth, PostgreSQL, `/dashboard` with delete, auth widget in homepage navbar.
- **Nuxt 3 Migration** ✅ DONE — Express fully replaced by Nuxt 3 / Nitro. All routes ported, nuxt-auth-utils sessions, Pinia stores, Vue SFC pages. `server.js` and `utils/auth.js` deleted.
- **Monetization**
  - **Stripe implementation** ✅ DONE — full checkout flow, billing portal, webhook handler, tier enforcement, `/pricing` page, plan badge on `/account`. Backend fully wired; activate by populating `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID` in `.env`.
  - Stripe Tax / VAT — not implemented; add when selling to EU customers
  - `invoice.payment_failed` webhook — not handled; no retry email on failed renewal
  - **Scheduled audits** ✅ DONE — `scheduled_audits` DB table, CRUD API at `/api/scheduled`, Nitro scheduler plugin (10-min polling), `utils/runAudit.js` shared helper, dashboard UI with add/remove/toggle. Gated to pro/agency. Requires `RESEND_API_KEY` + `EMAIL_FROM` for email delivery.
- **8 new Technical audit checks** ✅ DONE — Cache-Control, CSP, Resource Hints, Render-Blocking Resources, Asset Minification, Web App Manifest, Crawl Delay, X-Robots-Tag. Total: 73 → 81 checks.
- **Account page enhancements (A1–A4)** ✅ DONE — Usage card (month-to-date + total reports), retention notice in Plan card, PDF Logo URL for agency users (stored in `users.pdf_logo_url`, migration 010, auto-applied to PDFs), Delete Account with "DELETE" confirmation (cascade delete + session clear).
- **llms.txt extended to llms-full.txt (#22)** ✅ DONE — `geoLlmsTxt.js` now fetches both `/llms.txt` and `/llms-full.txt` in parallel. Pass if either has ≥100 chars; warn if llms.txt exists but sparse; fail if both missing.
- **AI Search Presence check (#21)** ✅ DONE — `geoAIPresence.js` queries Perplexity API (sonar model) with a brand query and checks if site appears in citations or response text. Requires `PERPLEXITY_API_KEY`. Shows warn/skip if key not set. Skipped in site crawl. Total: 81 → 82 checks.
- **Sitemap XML export** ✅ DONE — "Download Sitemap XML" button in site audit results; client-side Blob download from crawled URL set (`downloadSitemapXml()` in `app-main.js`).
- **API access & API key management** ✅ DONE — `api_keys` DB table (migration 006), CRUD routes at `/api/keys`, `server/middleware/00.apiKeyAuth.ts` (Bearer token auth, sets `event.context.apiKeyUser`), API Access section on `/account` (pro/agency), `/docs` static API reference page.
- **Embeddable widget** ✅ DONE — `pages/widget.vue` (API key gated iframe page), `server/routes/widget-audit.post.ts` (validates key + plan gate), `public/widget.js` (iframe loader via `document.currentScript`), embed code shown on `/account` for agency users.
- **CSV/JSON export** ✅ DONE — Export JSON + Export CSV buttons on page audit and site audit results. Client-side Blob download. Page audit buttons animate in with PDF button (600ms). Compare audit has CSV export.
- **Webhooks** ✅ DONE — `webhooks` DB table (migration 007), `utils/webhooks.js` (HMAC-SHA256 signed POSTs), CRUD at `/api/webhooks`, dispatched after page and site audits. Managed on `/account` (pro/agency).
- **JS Rendering** ✅ DONE — Puppeteer-based fetch toggle in Customize panel (pro/agency). `fetchPageWithJS()` in `utils/fetcher.js`, `jsRender` body param on `/audit`. Toggle disabled/dimmed for free/anon users.
- **Shareable report links** ✅ DONE — `share_token` column on `reports` (migration 008), `/api/reports/[id]/share` generates token, `/api/share/[token]` returns public report data, `/report/share/[token]` public Vue page. Share button on dashboard copies link to clipboard.
- **Google Search Console integration** ✅ DONE — GSC OAuth scope + token storage (migration 009), `utils/gsc.js` (token refresh + GSC API), `/api/gsc-data` endpoint, Search Console Data panel injected after page audit results (logged-in users only).
- **⚠ UNTESTED — JS Rendering (Feature 16)** — Requires a React/Vue/Angular SPA that returns empty HTML without JS. To test: switch to Pro via Dev Tools, expand Customize Report on the audit page, enable "JS Rendering", audit a known client-side SPA (e.g. a Vite/CRA app). Confirm results differ from a standard fetch of the same URL.
- **⚠ UNTESTED — Google Search Console integration (Feature 17)** — Requires a domain verified in Google Search Console under the authenticated Google account. To test: sign in with a Google account that has GSC properties, run a page audit on one of those domains, confirm the "Search Console Data" panel appears below results with query/click/impression/position data. If the domain isn't in GSC the panel will say "not connected" — that's expected behavior, not a bug.
- **⚠ REMOVE BEFORE LAUNCH — Dev plan switcher** — `server/api/dev/set-plan.post.ts` (404s in production) + "Dev Tools" card in `pages/account.vue` (`v-if="isDev"` / `import.meta.dev`) lets you switch between free/pro/agency tiers for testing. Delete the API file and the card + its CSS + `isDev`/`devPlanBusy`/`devSetPlan` in account.vue before going to production.

## Global Rules (from ~/.claude/CLAUDE.md)

- Run tests after changes *(no test suite yet — add one)*
- Ask before committing
- Keep code simple

## Language

- **American English** throughout — all user-facing strings, recommendations, code comments, and documentation. The company is US-based. Use: optimize, color, behavior, favor, recognize, analyze. Never: optimise, colour, behaviour, favour, recognise, analyse.
