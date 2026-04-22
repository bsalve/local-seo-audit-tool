'use strict';

const fs      = require('fs');
const path    = require('path');
const express = require('express');
const session = require('express-session');

// Load .env if present (mirrors index.js behavior)
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch (_) {}

const Handlebars = require('handlebars');
const { fetchPage }              = require('./utils/fetcher');
const { generatePDF, generateMultiPDF } = require('./utils/generatePDF');
const { calcTotalScore, letterGrade, gradeSummary, buildJsonOutput } = require('./utils/score');
const { crawlSite, aggregateResults } = require('./utils/crawler');
const { detectDuplicates }           = require('./utils/detectDuplicates');
const { detectOrphans }              = require('./utils/detectOrphans');
const db                             = require('./utils/db');
const { passport, requireAuth }      = require('./utils/auth');

// Auto-load every .js file in /audits (same as index.js)
const auditsDir = path.join(__dirname, 'audits');
const audits = fs
  .readdirSync(auditsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(auditsDir, f)));

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Session & auth middleware ──────────────────────────────────────────────
const sessionConfig = {
  secret:            process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
};

if (db) {
  const PgSession = require('connect-pg-simple')(session);
  sessionConfig.store = new PgSession({
    conString:            process.env.DATABASE_URL,
    tableName:            'sessions',
    createTableIfMissing: true,
  });
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/output', express.static(path.join(__dirname, 'output')));

// ── Auth routes ────────────────────────────────────────────────────────────
const authAvailable = !!(db && process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

app.get('/auth/google', (req, res, next) => {
  if (!authAvailable) return res.status(503).json({ error: 'Auth not configured' });
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

app.get('/auth/google/callback', (req, res, next) => {
  if (!authAvailable) return res.redirect('/');
  passport.authenticate('google', { failureRedirect: '/' })(req, res, (err) => {
    if (err) return next(err);
    res.redirect('/dashboard');
  });
});

app.get('/auth/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// ── Current user API ───────────────────────────────────────────────────────
app.get('/api/me', (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    const { id, name, email, avatar_url } = req.user;
    res.json({ user: { id, name, email, avatar_url } });
  } else {
    res.json({ user: null });
  }
});

// ── Delete report ──────────────────────────────────────────────────────────
app.delete('/api/reports/:id', requireAuth, async (req, res) => {
  try {
    const deleted = await db('reports')
      .where({ id: req.params.id, user_id: req.user.id })
      .delete();
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Dashboard ──────────────────────────────────────────────────────────────
function gradeColorForDashboard(score) {
  if (score >= 90) return '#34d399';
  if (score >= 80) return '#4d9fff';
  if (score >= 70) return '#ffb800';
  if (score >= 60) return '#ff8800';
  return '#ff4455';
}

Handlebars.registerHelper('eq',        (a, b) => a === b);
Handlebars.registerHelper('isDefined', (v) => v !== undefined && v !== null);

app.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    const rawReports = await db('reports')
      .where({ user_id: req.user.id })
      .orderBy('created_at', 'desc')
      .limit(100);

    const TYPE_LABELS = { page: 'Page', site: 'Site', multi: 'Multi' };
    const TYPE_COLORS = { page: '#8892a4', site: '#7baeff', multi: '#b07bff' };

    const reports = rawReports.map(r => ({
      ...r,
      gradeColor:    gradeColorForDashboard(r.score || 0),
      typeLabel:     TYPE_LABELS[r.audit_type] || r.audit_type,
      typeColor:     TYPE_COLORS[r.audit_type] || '#8892a4',
      dateFormatted: new Date(r.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }),
    }));

    const templateSrc  = fs.readFileSync(path.join(__dirname, 'templates', 'dashboard.hbs'), 'utf8');
    const html = Handlebars.compile(templateSrc)({
      user:         req.user,
      reports,
      reportCount:  reports.length,
      hasReports:   reports.length > 0,
    });
    res.send(html);
  } catch (err) {
    next(err);
  }
});

// ── Main UI ────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Helper: save report to DB (fire-and-forget) ────────────────────────────
function saveReport(userId, data) {
  if (!db || !userId) return;
  db('reports').insert(data)
    .catch(err => console.error('Failed to save report:', err.message));
}

// ── Run audit ──────────────────────────────────────────────────────────────
app.post('/audit', async (req, res) => {
  const { url, logoUrl } = req.body;
  if (!url) return res.status(400).json({ error: 'url is required' });

  let safeLogoUrl = null;
  if (logoUrl && typeof logoUrl === 'string') {
    try {
      const parsed = new URL(logoUrl);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') safeLogoUrl = logoUrl;
    } catch {}
  }

  try {
    const { html, $, headers, finalUrl, responseTimeMs } = await fetchPage(url);
    const meta      = { headers, finalUrl, responseTimeMs };
    const results   = (await Promise.all(
      audits.map(a => new Promise(resolve => resolve(a($, html, url, meta))).catch(() => null))
    )).flat().filter(Boolean);
    const score     = calcTotalScore(results);
    const grade     = letterGrade(score);
    const jsonOutput = buildJsonOutput(url, results, score, grade);
    const pdfPath   = await generatePDF(jsonOutput, { logoUrl: safeLogoUrl });
    const pdfFile   = path.basename(pdfPath);

    saveReport(req.user?.id, { user_id: req.user?.id, url, audit_type: 'page', score, grade, pdf_filename: pdfFile });

    res.json({ ...jsonOutput, pdfFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Extract NAP from audit results ─────────────────────────────────────────
function extractNAP(results) {
  const napResult = (results || []).find(r => r.name === '[Content] NAP Consistency');
  if (!napResult || !napResult.details) return { phone: null, address: null };
  const phoneMatch = napResult.details.match(/Phone:\s*"([^"]+)"/);
  const addrMatch  = napResult.details.match(/Address:\s*"([^"]+)"/);
  return {
    phone:   phoneMatch ? phoneMatch[1] : null,
    address: addrMatch  ? addrMatch[1]  : null,
  };
}

// ── Multi-location audit ───────────────────────────────────────────────────
app.post('/multi-audit', async (req, res) => {
  const inputLocs = Array.isArray(req.body.locations)
    ? req.body.locations
    : (Array.isArray(req.body.urls) ? req.body.urls : []).map(u => ({ url: u, label: '' }));

  if (inputLocs.length === 0)  return res.status(400).json({ error: 'urls or locations array is required' });
  if (inputLocs.length > 10)   return res.status(400).json({ error: 'Maximum 10 URLs allowed' });

  const validLocs = inputLocs
    .map(l => ({ url: (typeof l.url === 'string' ? l.url : '').trim(), label: (l.label || '').trim() }))
    .filter(l => { try { const p = new URL(l.url); return p.protocol === 'http:' || p.protocol === 'https:'; } catch { return false; } });

  if (validLocs.length === 0) return res.status(400).json({ error: 'No valid http/https URLs provided' });

  const normalizedUrls = validLocs.map(l => l.url.toLowerCase().replace(/\/+$/, ''));
  if (new Set(normalizedUrls).size !== validLocs.length) {
    return res.status(400).json({ error: 'Duplicate URLs are not allowed — each location must be unique' });
  }

  try {
    const settled = await Promise.allSettled(
      validLocs.map(async ({ url, label }) => {
        const { html, $, headers, finalUrl, responseTimeMs } = await fetchPage(url);
        const meta    = { headers, finalUrl, responseTimeMs };
        const results = (await Promise.all(audits.map((a) => a($, html, url, meta)))).flat();
        const score   = calcTotalScore(results);
        const grade   = letterGrade(score);
        return { ...buildJsonOutput(url, results, score, grade), label };
      })
    );

    const locations = settled.map((r, i) =>
      r.status === 'fulfilled'
        ? { ...r.value, nap: extractNAP(r.value.results) }
        : { url: validLocs[i].url, label: validLocs[i].label, error: r.reason?.message || 'Audit failed', results: [], totalScore: 0, grade: 'F', nap: { phone: null, address: null } }
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

    saveReport(req.user?.id, {
      user_id:      req.user?.id,
      url:          validLocs[0].url,
      audit_type:   'multi',
      score:        successful.length ? Math.round(successful.reduce((s, l) => s + l.totalScore, 0) / successful.length) : null,
      grade:        successful.length ? letterGrade(Math.round(successful.reduce((s, l) => s + l.totalScore, 0) / successful.length)) : null,
      pdf_filename: pdfFile,
      locations:    JSON.stringify(successful.map(l => ({ url: l.url, label: l.label || '', score: l.totalScore, grade: l.grade }))),
    });

    res.json({ locations, pdfFile });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Site audit helpers ─────────────────────────────────────────────────────
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

// ── Site-wide crawl (SSE) ──────────────────────────────────────────────────
app.get('/crawl', async (req, res) => {
  const rawUrl = (req.query.url || '').trim();
  if (!rawUrl) return res.status(400).json({ error: 'url required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // Capture user id before async crawl (session may not persist across SSE lifetime)
  const userId = req.user?.id || null;

  try {
    const pages = await crawlSite(rawUrl, { maxPages: 50, onProgress: (evt) => send(evt) });
    const aggregated = aggregateResults(pages);
    aggregated.push(...detectDuplicates(pages));
    aggregated.push(...detectOrphans(pages, rawUrl));

    const transformed = transformSiteResultsForPDF(aggregated, pages.length);
    const siteScore   = transformed.length
      ? Math.round(transformed.reduce((s, r) => s + r.normalizedScore, 0) / transformed.length)
      : 0;
    const siteGrade = letterGrade(siteScore);
    const pdfInput  = {
      url: rawUrl,
      auditedAt:   new Date().toISOString(),
      totalScore:  siteScore,
      grade:       siteGrade,
      summary:     gradeSummary(siteGrade, siteScore),
      siteAuditLine: `Site audit · ${pages.length} page${pages.length !== 1 ? 's' : ''} crawled`,
      results:     transformed,
    };

    let pdfFile = null;
    try {
      const pdfPath = await generatePDF(pdfInput, { prefix: 'signalgrade-site', isSiteReport: true, pageCount: pages.length });
      pdfFile = path.basename(pdfPath);
    } catch (e) {
      console.error('Site audit PDF generation failed:', e.message);
    }

    saveReport(userId, { user_id: userId, url: rawUrl, audit_type: 'site', score: siteScore, grade: siteGrade, pdf_filename: pdfFile });

    send({ type: 'done', pageCount: pages.length, results: aggregated, pdfFile });
  } catch (err) {
    send({ type: 'error', message: err.message });
  } finally {
    res.end();
  }
});

// ── Download most recent PDF ───────────────────────────────────────────────
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
