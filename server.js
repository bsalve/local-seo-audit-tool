'use strict';

const fs      = require('fs');
const path    = require('path');
const express = require('express');

// Load .env if present (mirrors index.js behavior)
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch (_) {}

const { fetchPage }              = require('./utils/fetcher');
const { generatePDF, generateMultiPDF } = require('./utils/generatePDF');
const { calcTotalScore, letterGrade, gradeSummary, buildJsonOutput } = require('./utils/score');
const { crawlSite, aggregateResults } = require('./utils/crawler');

// Auto-load every .js file in /audits (same as index.js)
const auditsDir = path.join(__dirname, 'audits');
const audits = fs
  .readdirSync(auditsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(auditsDir, f)));

// Load .env if present
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch (_) {}

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve generated PDFs for download
app.use('/output', express.static(path.join(__dirname, 'output')));

// Main UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Run audit
app.post('/audit', async (req, res) => {
  const { url, logoUrl } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  // Validate logoUrl if provided — must be http/https only
  let safeLogoUrl = null;
  if (logoUrl && typeof logoUrl === 'string') {
    try {
      const parsed = new URL(logoUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        safeLogoUrl = logoUrl;
      }
    } catch {}
  }

  try {
    const { html, $, headers, finalUrl, responseTimeMs } = await fetchPage(url);
    const meta = { headers, finalUrl, responseTimeMs };
    const results     = (await Promise.all(audits.map((a) => a($, html, url, meta)))).flat();
    const score       = calcTotalScore(results);
    const grade       = letterGrade(score);
    const jsonOutput  = buildJsonOutput(url, results, score, grade);
    const pdfPath     = await generatePDF(jsonOutput, { logoUrl: safeLogoUrl });
    const pdfFile     = path.basename(pdfPath);

    res.json({ ...jsonOutput, pdfFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Multi-location audit — runs page audits against up to 10 URLs in parallel
app.post('/multi-audit', async (req, res) => {
  const { urls } = req.body;
  if (!Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'urls array is required' });
  }
  if (urls.length > 10) {
    return res.status(400).json({ error: 'Maximum 10 URLs allowed' });
  }

  // Validate: http/https only
  const validUrls = urls
    .map(u => (typeof u === 'string' ? u.trim() : ''))
    .filter(u => { try { const p = new URL(u); return p.protocol === 'http:' || p.protocol === 'https:'; } catch { return false; } });

  if (validUrls.length === 0) {
    return res.status(400).json({ error: 'No valid http/https URLs provided' });
  }

  try {
    const settled = await Promise.allSettled(
      validUrls.map(async (url) => {
        const { html, $, headers, finalUrl, responseTimeMs } = await fetchPage(url);
        const meta    = { headers, finalUrl, responseTimeMs };
        const results = (await Promise.all(audits.map((a) => a($, html, url, meta)))).flat();
        const score   = calcTotalScore(results);
        const grade   = letterGrade(score);
        return buildJsonOutput(url, results, score, grade);
      })
    );

    const locations = settled.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { url: validUrls[i], error: r.reason?.message || 'Audit failed', results: [], totalScore: 0, grade: 'F' }
    );

    let pdfFile = null;
    const successful = locations.filter(l => !l.error);
    if (successful.length > 0) {
      try {
        const pdfPath = await generateMultiPDF(successful);
        pdfFile = path.basename(pdfPath);
      } catch (e) {
        console.error('Multi-audit PDF generation failed:', e.message);
      }
    }

    res.json({ locations, pdfFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function transformSiteResultsForPDF(aggregated, pageCount) {
  return aggregated.map(r => {
    const total = r.fail.length + r.warn.length + r.pass.length || pageCount;
    const status = r.fail.length > 0 ? 'fail' : r.warn.length > 0 ? 'warn' : 'pass';
    const normalizedScore = Math.round((r.pass.length + r.warn.length * 0.5) / total * 100);
    let details;
    if (r.fail.length > 0) {
      details = `Failing on ${r.fail.length}/${pageCount} pages${r.warn.length > 0 ? `, warnings on ${r.warn.length} more` : ''}`;
    } else if (r.warn.length > 0) {
      details = `Warnings on ${r.warn.length}/${pageCount} pages`;
    } else {
      details = `Passing on all ${r.pass.length} crawled pages`;
    }
    const pctFail = Math.round(r.fail.length / pageCount * 100);
    const pctWarn = Math.round(r.warn.length / pageCount * 100);
    const pctPass = 100 - pctFail - pctWarn;
    return {
      name: r.name, status, normalizedScore, message: r.message || '', details,
      recommendation: r.recommendation || undefined,
      failCount: r.fail.length, warnCount: r.warn.length, passCount: r.pass.length,
      totalPages: pageCount, pctFail, pctWarn, pctPass,
    };
  });
}

// Site-wide crawl — streams progress via SSE, returns aggregate results
app.get('/crawl', async (req, res) => {
  const rawUrl = (req.query.url || '').trim();
  if (!rawUrl) return res.status(400).json({ error: 'url required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  try {
    const pages = await crawlSite(rawUrl, {
      maxPages: 50,
      onProgress: (evt) => send(evt),
    });
    const aggregated = aggregateResults(pages);

    // Generate PDF from site audit results
    const transformed = transformSiteResultsForPDF(aggregated, pages.length);
    const siteScore = transformed.length
      ? Math.round(transformed.reduce((s, r) => s + r.normalizedScore, 0) / transformed.length)
      : 0;
    const siteGrade = letterGrade(siteScore);
    const pdfInput = {
      url: rawUrl,
      auditedAt: new Date().toISOString(),
      totalScore: siteScore,
      grade: siteGrade,
      summary: gradeSummary(siteGrade, siteScore),
      siteAuditLine: `Site audit · ${pages.length} page${pages.length !== 1 ? 's' : ''} crawled`,
      results: transformed,
    };
    let pdfFile = null;
    try {
      const pdfPath = await generatePDF(pdfInput, { prefix: 'signalgrade-site', isSiteReport: true, pageCount: pages.length });
      pdfFile = path.basename(pdfPath);
    } catch (e) {
      console.error('Site audit PDF generation failed:', e.message);
    }

    send({ type: 'done', pageCount: pages.length, results: aggregated, pdfFile });
  } catch (err) {
    send({ type: 'error', message: err.message });
  } finally {
    res.end();
  }
});

// Download most recently generated PDF
app.get('/download', (req, res) => {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) return res.status(404).send('No reports generated yet.');

  const latest = fs.readdirSync(outputDir)
    .filter((f) => f.endsWith('.pdf'))
    .map((f) => ({ f, t: fs.statSync(path.join(outputDir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)[0];

  if (!latest) return res.status(404).send('No PDF found.');
  res.download(path.join(outputDir, latest.f));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`SignalGrade running at http://localhost:${PORT}`);
  import('open').then((m) => m.default(`http://localhost:${PORT}`));
});
