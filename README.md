# Local SEO Audit Tool

A Node.js tool for auditing a website's health across four signal categories: **Technical** (site infrastructure), **Content** (on-page marketing signals), **AEO** (Answer Engine Optimization), and **GEO** (Generative Engine Optimization). Run it as a **CLI** for terminal output and JSON, or spin up the **web UI** for a browser-based dashboard with animated results and one-click PDF export.

---

## Requirements

- Node.js >= 16

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

Opens `http://localhost:3000` in your browser automatically. Enter any URL, hit **Run**, and the tool works through all 58 checks in real time with a categorized progress tracker. When the audit finishes:

- A letter grade and animated score counter are displayed
- Per-category scores (Technical / Content / AEO / GEO) appear as mini score cards below the overall grade
- Results are grouped into **Technical → Content → AEO → GEO** sections with color-coded category headers
- Each result shows a status icon, score bar, and expandable recommendation
- A **Download PDF Report** button appears — clicking it saves a dark-themed A4 PDF

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

# Pipe into jq silently
node index.js https://example.com 2>/dev/null | jq '.grade'
```

---

## How It Works

1. The URL is fetched with `axios` and parsed with `cheerio`
2. Each file in `/audits` is auto-discovered and run against the page
3. Scores are normalized to 0–100 and averaged into a total score covering Technical, Content, AEO, and GEO signals
4. A letter grade (A–F) is assigned based on the total
5. A PDF is generated via Puppeteer using the Handlebars template in `/templates`

The web server (`server.js`) exposes three routes:
- `GET /` — serves the single-page UI
- `POST /audit` — runs the audit and returns JSON
- `GET /download` — serves the most recently generated PDF

---

## PDF Report

Every audit automatically produces a dark-themed A4 PDF saved to `/output`:

```
seo-report-[domain]-[YYYY-MM-DD].pdf
```

The PDF includes:
- Header with audited URL, timestamp, and `Technical · Content · AEO · GEO` category line
- Letter grade + numeric score + score meter
- Pass / Warnings / Failed summary row
- Per-category score breakdown (Technical / Content / AEO / GEO) with individual grades and mini meters
- Results grouped into **Technical**, **Content**, **AEO**, and **GEO** sections with color-coded headers
- Each result with status icon, message, score bar, and recommendation
- Footer on every page: tool name · date · Page N of M

The `/output` folder is gitignored.

---

## Grading Scale

| Score  | Grade | Meaning  |
|--------|-------|----------|
| 90–100 | A     | Excellent — strong SEO, AEO, and GEO signals across the board |
| 80–89  | B     | Good — core signals solid; targeted AEO or GEO improvements would push this higher |
| 70–79  | C     | Average — several SEO, AEO, or GEO signals are missing or weak |
| 60–69  | D     | Poor — significant gaps in SEO foundations and AI-readiness signals |
| 0–59   | F     | Critical — foundational SEO elements and AI optimisation signals are missing |

Total score is the arithmetic mean of all 58 individual normalized scores (each scaled 0–100). The report also shows per-category scores (Technical / Content / AEO / GEO) with individual letter grades.

---

## Audit Checks

All modules live in `/audits` and are auto-discovered — adding a new file is all that's needed.

### Technical — Site Health & Infrastructure (22 checks)

| File | Check | Score |
|---|---|---|
| `checkSSL.js` | HTTPS active, certificate valid, days until expiry | 0–100 |
| `checkPageSpeed.js` | Google PageSpeed Insights performance score | 0–100 |
| `checkPageSpeed.js` *(2nd result)* | Mobile friendliness via Lighthouse SEO audits | 0–100 |
| `checkPageSpeed.js` *(3rd result)* | Core Web Vitals — LCP, TBT, CLS thresholds | 0–100 |
| `checkCrawlability.js` | `/robots.txt` and `/sitemap.xml` exist and are valid | 0–100 |
| `checkCanonical.js` | `<link rel="canonical">` present, non-empty, single tag | pass/warn/fail |
| `checkMetaRobots.js` | Detects accidental noindex / nofollow / none directives | pass/warn/fail |
| `contentInternalLinks.js` | Internal link count — 0: fail, 1–2: warn, 3–9: pass, 10+: 100 | 0–100 |
| `schema.js` | JSON-LD structured data, LocalBusiness schema detection | pass/warn/fail |
| `technicalBusinessHours.js` | LocalBusiness openingHoursSpecification — completeness scored | 0–100 |
| `technicalAggregateRating.js` | AggregateRating schema with ratingValue + ratingCount | 0–100 |
| `technicalGeoCoordinates.js` | GeoCoordinates (latitude + longitude) in LocalBusiness schema | 0–100 |
| `technicalHreflang.js` | `<link rel="alternate" hreflang>` tags — presence, x-default, malformed | 0–100 |
| `technicalBrokenLinks.js` | HEADs up to 20 internal links for 4xx/5xx responses | 0–100 |
| `technicalSecurityHeaders.js` | HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy | 0–100 |
| `technicalCompression.js` | gzip / Brotli / zstd via Content-Encoding response header | pass/fail |
| `technicalResponseTime.js` | TTFB — Good <800ms, Needs Improvement <1800ms, Poor ≥1800ms | 0–100 |
| `technicalRedirectChain.js` | Follows redirect chain — scored by hop count and redirect type | 0–100 |
| `technicalMixedContent.js` | HTTP assets (img/script/iframe/link) on HTTPS pages | 0–100 |
| `technicalFavicon.js` | `<link rel="icon">` in DOM or `/favicon.ico` reachable | 0–100 |
| `technicalImageDimensions.js` | `<img>` tags missing width+height attributes (CLS risk) | 0–100 |
| `technicalBreadcrumbSchema.js` | BreadcrumbList JSON-LD with itemListElement entries | 0–100 |

### Content — Marketing & On-Page Signals (16 checks)

| File | Check | Score |
|---|---|---|
| `checkMetaTags.js` | Title (30–60 chars) + meta description (70–160 chars) | 0–100 |
| `checkNAP.js` | Phone number and street address present in page text | 0–100 |
| `checkOpenGraph.js` | og:title, og:description, og:image, og:url, twitter:card | 0–100 |
| `checkImageAlt.js` | Percentage of `<img>` tags with alt attributes | 0–100 |
| `contentWordCount.js` | Body word count — scored proportionally, pass at 300+ words | 0–100 |
| `contentHeadingHierarchy.js` | H2/H3 ordering — H3 must follow H2, at least one H2 | pass/warn/fail |
| `contentBrandConsistency.js` | Brand name consistency across title, H1, og:title, og:site_name | 0–100 |
| `contentSocialLinks.js` | Links to social platforms (Facebook, Instagram, LinkedIn, etc.) | 0–100 |
| `titleTag.js` | Title tag presence and length | pass/warn/fail |
| `metaDescription.js` | Meta description presence and length | pass/warn/fail |
| `headings.js` | Exactly one H1 tag present | pass/warn/fail |
| `contentReadability.js` | Flesch-Kincaid Reading Ease — scored by readability band | 0–100 |
| `contentFreshness.js` | Publish/update date via meta, JSON-LD, `<time>`, or text — scored by age | 0–100 |
| `contentOutboundLinks.js` | External links and authority domain links (.gov/.edu/Wikipedia etc.) | 0–100 |
| `contentCallToAction.js` | CTA buttons/links/tel/mailto — scored by type count | 0–100 |
| `contentImageOptimization.js` | WebP/AVIF usage, `<figcaption>` presence, absence of GIFs | 0–100 |

### AEO — Answer Engine Optimization (9 checks)

Checks that optimize for featured snippets, People Also Ask, and voice assistant responses.

| File | Check | Score |
|---|---|---|
| `aeoFaqSchema.js` | FAQPage, QAPage, or HowTo JSON-LD schema with populated Q&A pairs | 0–100 |
| `aeoQuestionHeadings.js` | H2/H3 headings phrased as questions (voice & answer engine signal) | 0–100 |
| `aeoSpeakable.js` | Speakable schema with CSS selectors that resolve in the DOM | 0–100 |
| `aeoVideoSchema.js` | VideoObject schema — name, description, thumbnailUrl, uploadDate | 0–100 |
| `aeoHowToSchema.js` | HowTo schema — step count and quality (name + text per step) | 0–100 |
| `aeoFeaturedSnippetFormat.js` | Opening paragraph length vs 40–60 word featured snippet ideal | 0–100 |
| `aeoArticleSchema.js` | Article/BlogPosting/NewsArticle JSON-LD — headline, author, datePublished, publisher, image | 0–100 |
| `aeoDefinitionContent.js` | `<dl>/<dt>/<dd>` definition lists and `<dfn>` elements | 0–100 |
| `aeoConciseAnswers.js` | Paragraphs in the 20–80 word snippet-ready range | 0–100 |

### GEO — Generative Engine Optimization (11 checks)

Checks that optimize for AI-generated answers in Gemini, ChatGPT, Perplexity, and similar.

| File | Check | Score |
|---|---|---|
| `geoEeat.js` | E-E-A-T signals: author byline, publication date, about link, contact link | 0–100 |
| `geoEntityClarity.js` | Organization/LocalBusiness schema completeness: name, description, url, sameAs, logo | 0–100 |
| `geoStructuredContent.js` | AI-parseable content: data tables, ordered lists, definition lists, H2+H3 hierarchy | 0–100 |
| `geoPrivacyTrust.js` | Privacy policy link, terms of service link, cookie/GDPR notice | 0–100 |
| `geoGoogleBusinessProfile.js` | Google Business Profile URL in sameAs schema or as visible page link | 0–100 |
| `geoCitations.js` | Citation style signals: `<cite>`, attributed blockquotes, references heading, numbered refs | 0–100 |
| `geoServiceSchema.js` | Service/Product JSON-LD — name, description, provider, areaServed/offers | 0–100 |
| `geoAuthorSchema.js` | Person JSON-LD — name, jobTitle, sameAs (LinkedIn etc.), image/url | 0–100 |
| `geoReviewContent.js` | Visible testimonial signals: blockquotes, review classes, star patterns, attributed quotes | 0–100 |
| `geoServiceAreaContent.js` | areaServed in schema + geographic text mentions (state names, location phrases) | 0–100 |
| `geoMultiModal.js` | Embedded video (YouTube/Vimeo/etc. or `<video>`) and `<audio>` element | 0–100 |

---

## Adding a New Audit

1. Create `/audits/yourCheck.js`
2. Export a function with the signature `($, html, url, meta)` returning a result object or array:

```js
// meta = { headers, finalUrl, responseTimeMs }
module.exports = function myCheck($, html, url, meta) {
  return {
    name: '[Technical] My Check', // prefix: [Technical], [Content], [AEO], or [GEO]
    status: 'pass',             // 'pass' | 'warn' | 'fail'
    score: 95,                  // optional — omit if pass/warn/fail is sufficient
    maxScore: 100,              // only needed if score is not already 0–100
    message: 'All good.',
    details: '...',             // optional
    recommendation: '...',      // include for warn/fail
  };
};
```

3. Done — the CLI picks it up automatically. **Restart the web server** (`npm start`) to load the new file, since audits are discovered once at startup.

**Naming convention:** Prefix `name` with `[Technical]`, `[Content]`, `[AEO]`, or `[GEO]` to have the result automatically grouped in the correct category in the UI and PDF. Unprefixed results appear in the Technical section.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `PAGESPEED_API_KEY` | Google PageSpeed Insights API key (optional — free tier allows ~400 req/day/IP) |

Set in a `.env` file at the project root:

```
PAGESPEED_API_KEY=your_key_here
```

---

## Project Structure

```
local-seo-audit-tool/
├── index.js              # CLI entry point
├── server.js             # Express web server (port 3000)
├── audits/               # Auto-discovered audit modules (58 checks total)
│   ├── checkSSL.js
│   ├── checkPageSpeed.js         # Returns 3 results: perf + mobile + Core Web Vitals
│   ├── checkCrawlability.js
│   ├── checkCanonical.js
│   ├── checkMetaRobots.js
│   ├── contentInternalLinks.js
│   ├── schema.js
│   ├── technicalBusinessHours.js
│   ├── technicalAggregateRating.js
│   ├── technicalGeoCoordinates.js
│   ├── technicalHreflang.js
│   ├── technicalBrokenLinks.js
│   ├── technicalSecurityHeaders.js
│   ├── technicalCompression.js
│   ├── technicalResponseTime.js
│   ├── technicalRedirectChain.js
│   ├── technicalMixedContent.js
│   ├── technicalFavicon.js
│   ├── technicalImageDimensions.js
│   ├── technicalBreadcrumbSchema.js
│   ├── checkMetaTags.js
│   ├── checkNAP.js
│   ├── checkOpenGraph.js
│   ├── checkImageAlt.js
│   ├── contentWordCount.js
│   ├── contentHeadingHierarchy.js
│   ├── contentBrandConsistency.js
│   ├── contentSocialLinks.js
│   ├── titleTag.js
│   ├── metaDescription.js
│   ├── headings.js
│   ├── contentReadability.js
│   ├── contentFreshness.js
│   ├── contentOutboundLinks.js
│   ├── contentCallToAction.js
│   ├── contentImageOptimization.js
│   ├── aeoFaqSchema.js
│   ├── aeoQuestionHeadings.js
│   ├── aeoSpeakable.js
│   ├── aeoVideoSchema.js
│   ├── aeoHowToSchema.js
│   ├── aeoFeaturedSnippetFormat.js
│   ├── aeoArticleSchema.js
│   ├── aeoDefinitionContent.js
│   ├── aeoConciseAnswers.js
│   ├── geoEeat.js
│   ├── geoEntityClarity.js
│   ├── geoStructuredContent.js
│   ├── geoPrivacyTrust.js
│   ├── geoGoogleBusinessProfile.js
│   ├── geoCitations.js
│   ├── geoServiceSchema.js
│   ├── geoAuthorSchema.js
│   ├── geoReviewContent.js
│   ├── geoServiceAreaContent.js
│   └── geoMultiModal.js
├── public/
│   └── index.html        # Single-page web UI
├── templates/
│   └── report.hbs        # Handlebars template for PDF output
├── utils/
│   ├── fetcher.js        # axios + cheerio page fetcher (returns headers, finalUrl, responseTimeMs)
│   ├── generatePDF.js    # Puppeteer PDF renderer
│   └── score.js          # Shared scoring and grading logic
└── output/               # Generated PDFs (gitignored)
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `axios` | HTTP requests |
| `cheerio` | HTML parsing |
| `express` | Web server |
| `open` | Auto-opens browser on server start |
| `puppeteer` | Headless browser for PDF generation |
| `handlebars` | HTML templating for PDF reports |

---

## License

MIT
