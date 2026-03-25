const fs   = require('fs');
const path = require('path');

// Load .env if present (no external dependency)
try {
  for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] = m[2];
  }
} catch (_) {}

const { fetchPage }   = require('./utils/fetcher');
const { generatePDF } = require('./utils/generatePDF');

// Auto-load every .js file in /audits
const auditsDir = path.join(__dirname, 'audits');
const audits = fs
  .readdirSync(auditsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(auditsDir, f)));

// Scoring

function normalizeScore(result) {
  if (result.score !== undefined)
    return Math.round((result.score / (result.maxScore ?? 100)) * 100);
  if (result.status === 'pass') return 100;
  if (result.status === 'warn') return 50;
  return 0;
}

function calcTotalScore(results) {
  if (!results.length) return 0;
  return Math.round(results.reduce((sum, r) => sum + normalizeScore(r), 0) / results.length);
}

function letterGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

const GRADE_LABELS = {
  A: 'Excellent — this site is well-optimised for local SEO.',
  B: 'Good — a few improvements would push this site to the top tier.',
  C: 'Average — several important local SEO signals are missing or weak.',
  D: 'Poor — significant issues are likely hurting local search visibility.',
  F: 'Critical — foundational local SEO elements are missing.',
};

function gradeSummary(grade, score) {
  return `${grade} (${score}/100) — ${GRADE_LABELS[grade]}`;
}

// Output builders

function buildJsonOutput(url, results, score, grade) {
  return {
    url,
    auditedAt: new Date().toISOString(),
    grade,
    totalScore: score,
    summary: gradeSummary(grade, score),
    results: results.map((r) => ({
      name: r.name,
      status: r.status,
      score: r.score,
      maxScore: r.maxScore,
      normalizedScore: normalizeScore(r),
      message: r.message,
      details: r.details,
      recommendation: r.recommendation,
    })),
  };
}

function printHumanReport(results, score, grade) {
  const line = '─'.repeat(54);
  const err  = (s) => process.stderr.write(s);

  err(`\n${line}\n LOCAL SEO AUDIT REPORT\n${line}\n\n`);

  let passed = 0, warned = 0, failed = 0;
  for (const r of results) {
    const icon     = r.status === 'pass' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
    const scoreTag = r.score !== undefined ? ` [${normalizeScore(r)}/100]` : '';
    err(`[${icon}] ${r.name}${scoreTag}\n`);
    err(`    ${r.message}\n`);
    if (r.details)        err(`    Details: ${r.details}\n`);
    if (r.recommendation) err(`    Recommendation: ${r.recommendation}\n`);
    err('\n');
    if (r.status === 'pass') passed++;
    else if (r.status === 'warn') warned++;
    else failed++;
  }

  err(`${line}\n GRADE: ${grade}   SCORE: ${score}/100\n`);
  err(` ${gradeSummary(grade, score)}\n`);
  err(` ${passed} passed · ${warned} warnings · ${failed} failed\n${line}\n\n`);
}

// Entry point

async function runAudit(url) {
  if (!url) {
    process.stderr.write('Usage: node index.js <url>\n');
    process.exit(1);
  }

  process.stderr.write(`\nFetching ${url} …\n`);
  const { html, $ } = await fetchPage(url);

  process.stderr.write(`Running ${audits.length} audit module(s) …\n`);
  const results = (await Promise.all(audits.map((a) => a($, html, url)))).flat();

  const score      = calcTotalScore(results);
  const grade      = letterGrade(score);
  const jsonOutput = buildJsonOutput(url, results, score, grade);

  printHumanReport(results, score, grade);
  process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');

  process.stderr.write('Generating PDF report …\n');
  const pdfPath = await generatePDF(jsonOutput);
  process.stderr.write(`PDF saved → ${pdfPath}\n\n`);
}

runAudit(process.argv[2]).catch((err) => {
  process.stderr.write(`Audit failed: ${err.message}\n`);
  process.exit(1);
});
