# Local SEO Audit Tool

A Node.js tool for auditing a website's local SEO health across three signal categories: **SEO**, **AEO** (Answer Engine Optimization), and **GEO** (Generative Engine Optimization). Run it as a **CLI** for terminal output and JSON, or spin up the **web UI** for a browser-based dashboard with animated results and one-click PDF export.

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

Opens `http://localhost:3000` in your browser automatically. Enter any URL, hit **Run**, and the tool works through all 18 checks in real time with a categorized progress tracker. When the audit finishes:

- A letter grade and animated score counter are displayed
- Results are grouped into **SEO → AEO → GEO** sections with color-coded category headers
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
3. Scores are normalized to 0–100 and averaged into a total score covering SEO, AEO, and GEO signals
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
- Header with audited URL, timestamp, and `SEO · AEO · GEO` category line
- Letter grade + numeric score + score meter
- Pass / Warnings / Failed summary row
- Results grouped into **SEO**, **AEO**, and **GEO** sections with color-coded headers
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

Total score is the arithmetic mean of all 16 individual normalized scores (each scaled 0–100).

---

## Audit Checks

All modules live in `/audits` and are auto-discovered — adding a new file is all that's needed.

### SEO — Search Engine Optimization

| File | Check | Score |
|---|---|---|
| `checkSSL.js` | HTTPS active, certificate valid, days until expiry | 0–100 |
| `checkMetaTags.js` | Title (30–60 chars) + meta description (70–160 chars) | 0–100 |
| `checkPageSpeed.js` | Google PageSpeed Insights mobile performance | 0–100 |
| `checkPageSpeed.js` *(2nd result)* | Mobile friendliness via Lighthouse SEO audits | 0–100 |
| `checkNAP.js` | Phone number and street address present in page text | 0–100 |
| `checkCrawlability.js` | `/robots.txt` and `/sitemap.xml` exist and are valid | 0–100 |
| `titleTag.js` | Title tag presence and length | pass/warn/fail |
| `metaDescription.js` | Meta description presence and length | pass/warn/fail |
| `headings.js` | Exactly one H1 tag present | pass/warn/fail |
| `schema.js` | JSON-LD structured data, LocalBusiness schema detection | pass/warn/fail |

### AEO — Answer Engine Optimization

Checks that optimize for featured snippets, People Also Ask, and voice assistant responses.

| File | Check | Score |
|---|---|---|
| `aeoFaqSchema.js` | FAQPage, QAPage, or HowTo JSON-LD schema with populated Q&A pairs | 0–100 |
| `aeoQuestionHeadings.js` | H2/H3 headings phrased as questions (voice & answer engine signal) | 0–100 |
| `aeoSpeakable.js` | Speakable schema with CSS selectors that resolve in the DOM | 0–100 |

### GEO — Generative Engine Optimization

Checks that optimize for AI-generated answers in Gemini, ChatGPT, Perplexity, and similar.

| File | Check | Score |
|---|---|---|
| `geoEeat.js` | E-E-A-T signals: author byline, publication date, about link, contact link | 0–100 |
| `geoEntityClarity.js` | Organization/LocalBusiness schema completeness: name, description, url, sameAs, logo | 0–100 |
| `geoStructuredContent.js` | AI-parseable content: data tables, ordered lists, definition lists, H2+H3 hierarchy | 0–100 |

---

## Adding a New Audit

1. Create `/audits/yourCheck.js`
2. Export a function with the signature `($, html, url)` returning a result object or array:

```js
module.exports = function myCheck($, html, url) {
  return {
    name: 'My Check',           // prefix with [AEO] or [GEO] to categorize
    status: 'pass',             // 'pass' | 'warn' | 'fail'
    score: 95,                  // optional — omit if pass/warn/fail is sufficient
    maxScore: 100,              // only needed if score is not already 0–100
    message: 'All good.',
    details: '...',             // optional
    recommendation: '...',      // include for warn/fail
  };
};
```

3. Done — both the CLI and web server pick it up automatically on the next run.

**Naming convention:** Prefix `name` with `[AEO]` or `[GEO]` to have the result automatically grouped in the correct category in the UI and PDF. Unprefixed results appear in the SEO section.

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
├── audits/               # Auto-discovered audit modules
│   ├── checkCrawlability.js
│   ├── checkMetaTags.js
│   ├── checkNAP.js
│   ├── checkPageSpeed.js
│   ├── checkSSL.js
│   ├── headings.js
│   ├── metaDescription.js
│   ├── schema.js
│   ├── titleTag.js
│   ├── aeoFaqSchema.js       # [AEO] FAQ / Q&A Schema
│   ├── aeoQuestionHeadings.js # [AEO] Question-Based Headings
│   ├── aeoSpeakable.js       # [AEO] Speakable Schema
│   ├── geoEeat.js            # [GEO] E-E-A-T Signals
│   ├── geoEntityClarity.js   # [GEO] Organization Entity Clarity
│   └── geoStructuredContent.js # [GEO] Structured Content for AI
├── public/
│   └── index.html        # Single-page web UI
├── templates/
│   └── report.hbs        # Handlebars template for PDF output
├── utils/
│   ├── fetcher.js        # axios + cheerio page fetcher
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
| `dotenv` | `.env` file support |

---

## License

MIT
