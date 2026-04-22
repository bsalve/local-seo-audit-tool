# SignalGrade

**Score your site across Google, and across AI.**

A Node.js tool for auditing a website's search visibility across four signal categories: **Technical** (site infrastructure), **Content** (on-page marketing signals), **AEO** (Answer Engine Optimization — featured snippets, voice), and **GEO** (Generative Engine Optimization — ChatGPT, Perplexity, Gemini). Run a **Page Audit** for a single URL, a **Site Audit** to crawl up to 50 pages, or a **Multi-location Audit** to compare up to 10 URLs side by side. Available as a **CLI** or **web UI** with animated results and PDF export.

---

## Requirements

- Node.js >= 18
- PostgreSQL (optional — required only for user accounts and report history)

---

## Installation

```bash
git clone https://github.com/bsalve/local-seo-audit-tool.git
cd local-seo-audit-tool
npm install
```

---

## Modes

### Web UI (recommended)

```bash
npm start
```

Opens `http://localhost:3000` automatically. Use the **Page Audit / Site Audit / Multi** toggle above the URL input.

#### Page Audit (default)
Runs all 73 checks against a single URL. When the audit finishes:
- A letter grade and animated score counter appear
- Per-category scores (Technical / Content / AEO / GEO) appear as mini score cards
- Results are grouped **Technical → Content → AEO → GEO** with color-coded headers
- Each result shows a status icon, score bar, and expandable recommendation
- A **Download PDF Report** button saves a dark-themed A4 PDF to `/output`

#### Site Audit
Crawls up to 50 pages (free tier) within the same domain via a worker-thread BFS crawler. Progress is driven by real SSE events — the status line shows each URL as it's fetched. When complete:
- Summary stats show how many checks have failures, warnings, or all-passing pages
- **Top Issues** section lists the 7 checks affecting the most pages
- **Issue Breakdown** lists every check with a stacked pass/warn/fail bar; click to expand affected URLs
- **What's Working** (collapsed) lists all-passing checks
- Generates a site-wide PDF report (`signalgrade-site-report-*.pdf`)

Site-only post-crawl checks (not run per-page):
- **Duplicate Page Titles** — flags pages sharing an identical title tag
- **Duplicate Meta Descriptions** — flags pages sharing an identical meta description
- **Orphan Pages** — flags crawled pages with no inbound links from other crawled pages

#### Multi-location Audit
Runs page audits against up to 10 URLs in parallel and renders a side-by-side comparison. Enter one URL per line. Results include:
- Per-location grade card with overall score, grade, and category scores (T / C / A / G)
- **Common Issues** section ranked by how many locations they affect
- **Check Comparison** table — all 73 checks × all locations, with ✓ / △ / ✕ icons and scores
- Generates a PDF comparison report (`signalgrade-multi-report-*.pdf`)

### CLI

```bash
node index.js <url>
```

Prints a human-readable report to `stderr`, structured JSON to `stdout`, and saves a PDF to `/output`.

```bash
# Terminal report + PDF
node index.js https://example.com

# Save JSON to a file
node index.js https://example.com > result.json

# Pipe into jq
node index.js https://example.com 2>/dev/null | jq '.grade'
```

---

## Grading Scale

| Score  | Grade | Meaning |
|--------|-------|---------|
| 90–100 | A     | Excellent — strong SEO, AEO, and GEO signals across the board |
| 80–89  | B     | Good — core signals solid; targeted improvements would push this higher |
| 70–79  | C     | Average — several signals are missing or weak |
| 60–69  | D     | Poor — significant gaps in SEO foundations and AI-readiness signals |
| 0–59   | F     | Critical — foundational elements and AI optimization signals are missing |

Total score is the arithmetic mean of all 73 individual normalized scores (each scaled 0–100). Per-category scores (Technical / Content / AEO / GEO) are shown separately with individual letter grades.

---

## Audit Checks — 73 Total

All modules live in `/audits` and are auto-discovered — adding a new `.js` file is all that's needed.

### Technical — Site Health & Infrastructure (33 checks)

| File | Check | Score |
|---|---|---|
| `checkSSL.js` | HTTPS active, certificate valid, days until expiry | 0–100 |
| `checkPageSpeed.js` | Google PageSpeed Insights performance score | 0–100 |
| `checkPageSpeed.js` *(2nd result)* | Mobile friendliness via Lighthouse SEO audits | 0–100 |
| `checkPageSpeed.js` *(3rd result)* | Core Web Vitals — LCP, TBT, CLS thresholds | 0–100 |
| `checkCrawlability.js` | `/robots.txt` and `/sitemap.xml` exist and are valid | 0–100 |
| `technicalSitemapValidation.js` | HEADs up to 15 sitemap `<loc>` URLs; scores by % reachable | 0–100 |
| `checkCanonical.js` | `<link rel="canonical">` present, non-empty, single tag | pass/warn/fail |
| `technicalCanonicalChain.js` | Canonical chain detection — A→B→C points-elsewhere chain | 0–100 |
| `checkMetaRobots.js` | Detects accidental noindex / nofollow / none directives | pass/warn/fail |
| `technicalMobileViewport.js` | `<meta name="viewport">` presence and `width=device-width` | 0–100 |
| `technicalIndexability.js` | noindex in meta/header + canonical-points-elsewhere | 0–100 |
| `contentInternalLinks.js` | Internal link count — 0: fail, 1–2: warn, 3–9: pass, 10+: 100 | 0–100 |
| `technicalBrokenLinks.js` | HEADs up to 20 internal links for 4xx/5xx responses | 0–100 |
| `technicalRedirectChain.js` | Follows redirect chain — scored by hop count and type | 0–100 |
| `technicalMixedContent.js` | HTTP assets (img/script/iframe/link) on HTTPS pages | 0–100 |
| `technicalSecurityHeaders.js` | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy | 0–100 |
| `technicalCompression.js` | gzip / Brotli / zstd via Content-Encoding response header | pass/fail |
| `technicalResponseTime.js` | TTFB — Good <800ms, Needs Improvement <1800ms, Poor ≥1800ms | 0–100 |
| `technicalHTTPVersion.js` | HTTP/2 or HTTP/3 detection via response headers | 0–100 |
| `technicalFavicon.js` | `<link rel="icon">` in DOM or `/favicon.ico` reachable | 0–100 |
| `technicalImageDimensions.js` | `<img>` missing width+height attributes (CLS risk) | 0–100 |
| `technicalLazyLoading.js` | `loading="lazy"` on below-fold images | 0–100 |
| `technicalBreadcrumbSchema.js` | BreadcrumbList JSON-LD with itemListElement entries | 0–100 |
| `technicalSchemaInventory.js` | Lists all JSON-LD `@type` values found on page | pass/warn/fail |
| `technicalSchemaValidation.js` | Required field validation for detected schema types | 0–100 |
| `schema.js` | JSON-LD LocalBusiness entity presence | pass/warn/fail |
| `technicalBusinessHours.js` | LocalBusiness openingHoursSpecification completeness | 0–100 |
| `technicalAggregateRating.js` | AggregateRating schema with ratingValue + ratingCount | 0–100 |
| `technicalGeoCoordinates.js` | GeoCoordinates (latitude + longitude) in LocalBusiness | 0–100 |
| `technicalHreflang.js` | `<link rel="alternate" hreflang>` — presence, x-default, malformed | 0–100 |
| `technicalRobotsSafety.js` | Dangerous `Disallow:` rules — blocks site or CSS/JS files | 0–100 |
| `technicalAccessibility.js` | lang attribute, `<main>` landmark, labeled inputs, skip nav link | 0–100 |
| `technicalPagination.js` | `<link rel="next">` / `<link rel="prev">` detection | pass/warn/fail |

### Content — Marketing & On-Page Signals (18 checks)

| File | Check | Score |
|---|---|---|
| `checkMetaTags.js` | Title (30–60 chars) + meta description (70–160 chars) combined | 0–100 |
| `titleTag.js` | Title tag presence and length | pass/warn/fail |
| `metaDescription.js` | Meta description presence and length | pass/warn/fail |
| `headings.js` | Exactly one H1 tag present | pass/warn/fail |
| `contentHeadingHierarchy.js` | H2/H3 ordering — H3 must follow H2 | pass/warn/fail |
| `contentWordCount.js` | Body word count — scored proportionally, pass at 300+ words | 0–100 |
| `checkImageAlt.js` | Percentage of `<img>` tags with alt attributes | 0–100 |
| `checkOpenGraph.js` | og:title, og:description, og:image, og:url, twitter:card | 0–100 |
| `contentOGImageCheck.js` | og:image URL reachability via HEAD request | 0–100 |
| `contentBrandConsistency.js` | Brand name in title, H1, og:title, og:site_name | 0–100 |
| `checkNAP.js` | Phone number and street address in page text | 0–100 |
| `contentSocialLinks.js` | Links to social platforms — scored by count | 0–100 |
| `contentReadability.js` | Flesch-Kincaid Reading Ease — scored by readability band | 0–100 |
| `contentFreshness.js` | Publish/update date via meta, JSON-LD, `<time>`, or text | 0–100 |
| `contentOutboundLinks.js` | External links + authority domain links (.gov/.edu/Wikipedia) | 0–100 |
| `contentCallToAction.js` | CTA buttons/links/tel/mailto — scored by type count | 0–100 |
| `contentImageOptimization.js` | WebP/AVIF usage, `<figcaption>` presence, absence of GIFs | 0–100 |
| `contentKeywordDensity.js` | Top 15 keyword frequencies from body text | 0–100 |

### AEO — Answer Engine Optimization (9 checks)

Signals for featured snippets, People Also Ask, and voice assistant responses.

| File | Check | Score |
|---|---|---|
| `aeoFaqSchema.js` | FAQPage / QAPage / HowTo JSON-LD with populated Q&A pairs | 0–100 |
| `aeoArticleSchema.js` | Article/BlogPosting/NewsArticle — headline, author, datePublished, publisher, image | 0–100 |
| `aeoHowToSchema.js` | HowTo schema — step count and quality (name + text per step) | 0–100 |
| `aeoVideoSchema.js` | VideoObject schema — name, description, thumbnailUrl, uploadDate | 0–100 |
| `aeoSpeakable.js` | Speakable schema with CSS selectors that resolve in the DOM | 0–100 |
| `aeoQuestionHeadings.js` | H2/H3 headings phrased as questions | 0–100 |
| `aeoFeaturedSnippetFormat.js` | Opening paragraph length vs. 40–60 word featured snippet ideal | 0–100 |
| `aeoDefinitionContent.js` | `<dl>/<dt>/<dd>` definition lists and `<dfn>` elements | 0–100 |
| `aeoConciseAnswers.js` | Paragraphs in the 20–80 word snippet-ready range | 0–100 |

### GEO — Generative Engine Optimization (13 checks)

Signals for citation and representation in AI-generated answers.

| File | Check | Score |
|---|---|---|
| `geoEeat.js` | E-E-A-T: author byline, publish date, about link, contact link | 0–100 |
| `geoEntityClarity.js` | Org/LocalBusiness schema: name, description, url, sameAs, logo | 0–100 |
| `geoAuthorSchema.js` | Person JSON-LD — name, jobTitle, sameAs (LinkedIn etc.), image/url | 0–100 |
| `geoServiceSchema.js` | Service/Product JSON-LD — name, description, provider, areaServed | 0–100 |
| `geoGoogleBusinessProfile.js` | GBP URL in sameAs schema or as a visible page link | 0–100 |
| `geoServiceAreaContent.js` | areaServed in schema + geographic text mentions | 0–100 |
| `geoStructuredContent.js` | AI-parseable content: data tables, ordered lists, definition lists, heading depth | 0–100 |
| `geoCitations.js` | `<cite>`, attributed blockquotes, references heading, numbered refs | 0–100 |
| `geoReviewContent.js` | Testimonial signals: blockquotes, review classes, star patterns, attributed quotes | 0–100 |
| `geoPrivacyTrust.js` | Privacy policy link, terms of service link, cookie/GDPR notice | 0–100 |
| `geoMultiModal.js` | Embedded video (YouTube/Vimeo/etc. or `<video>`) and `<audio>` elements | 0–100 |
| `geoLlmsTxt.js` | `/llms.txt` file presence and content quality | 0–100 |
| `geoAICrawlerAccess.js` | GPTBot, ClaudeBot, PerplexityBot, Googlebot-Extended access in robots.txt | 0–100 |

---

## Adding a New Audit

1. Create `/audits/yourCheck.js`
2. Export a function with the signature `($, html, url, meta)` returning a result object:

```js
// meta = { headers, finalUrl, responseTimeMs }
module.exports = function myCheck($, html, url, meta) {
  return {
    name: '[Technical] My Check', // prefix: [Technical], [Content], [AEO], or [GEO]
    status: 'pass',               // 'pass' | 'warn' | 'fail'
    score: 95,                    // optional — omit if pass/warn/fail is sufficient
    message: 'All good.',
    details: '...',               // optional
    recommendation: '...',        // include for warn/fail results
  };
};
```

3. Done — the CLI picks it up automatically. **Restart the web server** to load the new file (audits are discovered once at startup). Also add a corresponding entry to the `STEPS` array in `public/index.html` so the progress bar reflects it.

**Naming convention:** Prefix `name` with `[Technical]`, `[Content]`, `[AEO]`, or `[GEO]` to auto-group results in the UI and PDF. Unprefixed results appear in the Technical section.

---

## PDF Reports

Every audit produces a dark-themed A4 PDF saved to `/output`:

| Mode | Filename |
|---|---|
| Page Audit | `signalgrade-report-[domain]-[YYYY-MM-DD].pdf` |
| Site Audit | `signalgrade-site-report-[domain]-[YYYY-MM-DD].pdf` |
| Multi-location | `signalgrade-multi-report-[YYYY-MM-DD].pdf` |

**Page/Site Audit PDF** includes: grade + score meter, pass/warn/fail stats, per-category scores, executive summary (top 7 issues + top 7 passes), full results table.

**Multi-location PDF** includes: per-location grade cards, best/worst summary, common issues across locations, full side-by-side check comparison table.

**Agency branding:** Pass a `logoUrl` in the Page Audit request body to replace the SIGNALGRADE wordmark with your agency logo. The logo URL must be `http://https` and is validated server-side.

---

## User Accounts & Report History

SignalGrade supports optional Google OAuth sign-in backed by PostgreSQL. When enabled:

- A **Sign in** button appears in the navbar on the homepage
- Every completed audit (page, site, or multi-location) is automatically saved to the database
- Signed-in users can visit `/dashboard` to see their full report history with grade, score, date, and PDF download links
- Reports can be deleted individually with an inline confirmation step

**Setup:**

1. Create a PostgreSQL database (local or hosted, e.g. [Neon](https://neon.tech))
2. Set up Google OAuth credentials in [Google Cloud Console](https://console.cloud.google.com) (APIs & Services → Credentials → OAuth client ID → Web application; add `http://localhost:3000/auth/google/callback` as an authorized redirect URI)
3. Add to `.env`:

```
DATABASE_URL=postgresql://user:password@host/dbname
SESSION_SECRET=<64-char random hex>
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

4. Run the database migration:

```bash
npm run migrate
```

The server runs without these variables — auth is simply disabled and audits work as normal.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `PAGESPEED_API_KEY` | Google PageSpeed Insights API key — optional, free tier ~400 req/day/IP |
| `DATABASE_URL` | PostgreSQL connection string — required for user accounts and report history |
| `SESSION_SECRET` | Random secret for signing session cookies — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID — from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret — from Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | OAuth redirect URI — use `http://localhost:3000/auth/google/callback` for local dev |

Set in a `.env` file at the project root.

---

## Project Structure

```
signalgrade/
├── index.js                  # CLI entry point
├── server.js                 # Express web server (port 3000)
├── knexfile.js               # Database configuration
├── audits/                   # Auto-discovered audit modules (73 checks)
│   ├── check*.js             # Core checks (SSL, crawlability, meta tags, etc.)
│   ├── technical*.js         # Technical checks
│   ├── content*.js           # Content checks
│   ├── aeo*.js               # AEO checks
│   └── geo*.js               # GEO checks
├── db/
│   └── migrations/           # Knex migration files (users, reports, sessions tables)
├── public/
│   └── index.html            # Single-page web UI (Page / Site / Multi modes)
├── templates/
│   ├── report.hbs            # Handlebars PDF template (page + site audit)
│   ├── multi-report.hbs      # Handlebars PDF template (multi-location)
│   └── dashboard.hbs         # Server-rendered report history page
├── utils/
│   ├── fetcher.js            # axios + cheerio fetcher (returns headers, finalUrl, responseTimeMs)
│   ├── crawler.js            # BFS site crawler — crawlSite(), aggregateResults()
│   ├── pageWorker.js         # Per-page worker thread (isolated V8 heap, freed after each page)
│   ├── detectDuplicates.js   # Post-crawl: flags duplicate title tags and meta descriptions
│   ├── detectOrphans.js      # Post-crawl: flags pages with no inbound internal links
│   ├── generatePDF.js        # Puppeteer PDF renderer (page, site, multi)
│   ├── score.js              # Shared scoring and grading logic
│   ├── auth.js               # Passport.js Google OAuth strategy + requireAuth middleware
│   └── db.js                 # Knex database instance (null if DATABASE_URL not set)
└── output/                   # Generated PDFs (gitignored)
```

---

## Known Limitations

- JS-rendered SPAs will score poorly — static HTML only
- PageSpeed Insights free tier: ~400 req/day/IP. Set `PAGESPEED_API_KEY` to raise this
- Site crawl is capped at 50 pages; multi-location at 10 URLs (free tier)
- Site audit skips checks that make extra HTTP requests per page (PageSpeed, broken links, redirect chains, sitemap validation, robots.txt checks, og:image check, canonical chain) to keep crawl time manageable

---

## Dependencies

| Package | Purpose |
|---|---|
| `axios` | HTTP requests |
| `cheerio` | HTML parsing |
| `express` | Web server |
| `express-session` | Session middleware |
| `connect-pg-simple` | PostgreSQL session store |
| `passport` | Authentication middleware |
| `passport-google-oauth20` | Google OAuth 2.0 strategy |
| `knex` | SQL query builder and migrations |
| `pg` | PostgreSQL client |
| `open` | Auto-opens browser on server start |
| `puppeteer` | Headless browser for PDF generation |
| `handlebars` | HTML templating for PDF reports and dashboard |

---

## License

MIT
