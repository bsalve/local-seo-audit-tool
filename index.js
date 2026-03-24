const fs = require('fs');
const path = require('path');

// Load .env file if present (no external dependency needed)
try {
  const envPath = path.join(__dirname, '.env');
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*([^#=\s][^=]*?)\s*=\s*(.*?)\s*$/);
    if (match) process.env[match[1]] = match[2];
  }
} catch (_) { /* .env is optional */ }

const { fetchPage } = require('./utils/fetcher');

// ---------------------------------------------------------------------------
// Dynamically load every audit module in /audits at startup.
// Drop a new .js file in that folder and it is automatically included.
// ---------------------------------------------------------------------------
const auditsDir = path.join(__dirname, 'audits');
const audits = fs
  .readdirSync(auditsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(auditsDir, f)));

// ---------------------------------------------------------------------------
// Scoring helpers
// ---------------------------------------------------------------------------

function statusToScore(status) {
  if (status === 'pass') return 100;
  if (status === 'warn') return 50;
  return 0;
}

/**
 * Normalize any audit result to a 0–100 score.
 *  - Results with a `score` field are scaled using `maxScore` (default 100).
 *  - Results with no `score` fall back to status-derived values.
 */
function normalizeScore(result) {
  if (result.score !== undefined) {
    const max = result.maxScore ?? 100;
    return Math.round((result.score / max) * 100);
  }
  return statusToScore(result.status);
}

function totalScore(results) {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + normalizeScore(r), 0);
  return Math.round(sum / results.length);
}

function letterGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

// ---------------------------------------------------------------------------
// Report builders
// ---------------------------------------------------------------------------

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

function gradeSummary(grade, score) {
  const labels = {
    A: 'Excellent — this site is well-optimised for local SEO.',
    B: 'Good — a few improvements would push this site to the top tier.',
    C: 'Average — several important local SEO signals are missing or weak.',
    D: 'Poor — significant issues are likely hurting local search visibility.',
    F: 'Critical — foundational local SEO elements are missing.',
  };
  return `${grade} (${score}/100) — ${labels[grade]}`;
}

function printHumanReport(results, score, grade) {
  const WIDTH = 54;
  const line = '─'.repeat(WIDTH);

  process.stderr.write(`\n${line}\n`);
  process.stderr.write(' LOCAL SEO AUDIT REPORT\n');
  process.stderr.write(`${line}\n\n`);

  let passed = 0, warned = 0, failed = 0;

  for (const r of results) {
    const icon = r.status === 'pass' ? '✓' : r.status === 'warn' ? '⚠' : '✗';
    const normScore = normalizeScore(r);
    const scoreTag = r.score !== undefined ? ` [${normScore}/100]` : '';
    process.stderr.write(`[${icon}] ${r.name}${scoreTag}\n`);
    process.stderr.write(`    ${r.message}\n`);
    if (r.details)         process.stderr.write(`    Details: ${r.details}\n`);
    if (r.recommendation)  process.stderr.write(`    Recommendation: ${r.recommendation}\n`);
    process.stderr.write('\n');

    if (r.status === 'pass') passed++;
    else if (r.status === 'warn') warned++;
    else failed++;
  }

  process.stderr.write(`${line}\n`);
  process.stderr.write(` GRADE: ${grade}   SCORE: ${score}/100\n`);
  process.stderr.write(` ${gradeSummary(grade, score)}\n`);
  process.stderr.write(` ${passed} passed · ${warned} warnings · ${failed} failed\n`);
  process.stderr.write(`${line}\n\n`);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function runAudit(url) {
  if (!url) {
    process.stderr.write('Usage: node index.js <url>\n');
    process.exit(1);
  }

  process.stderr.write(`\nFetching ${url} …\n`);
  const { html, $ } = await fetchPage(url);

  process.stderr.write(`Running ${audits.length} audit module(s) …\n`);
  const results = (
    await Promise.all(audits.map((audit) => audit($, html, url)))
  ).flat();

  const score = totalScore(results);
  const grade = letterGrade(score);

  // Human-readable report → stderr (safe to pipe/redirect stdout as JSON)
  printHumanReport(results, score, grade);

  // Machine-readable JSON → stdout
  process.stdout.write(JSON.stringify(buildJsonOutput(url, results, score, grade), null, 2) + '\n');
}

const url = process.argv[2];
runAudit(url).catch((err) => {
  process.stderr.write(`Audit failed: ${err.message}\n`);
  process.exit(1);
});
