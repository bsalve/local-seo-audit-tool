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
const { normalizeScore, calcTotalScore, letterGrade, gradeSummary, buildJsonOutput } = require('./utils/score');

// Auto-load every .js file in /audits
const auditsDir = path.join(__dirname, 'audits');
const audits = fs
  .readdirSync(auditsDir)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(auditsDir, f)));

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
  const { html, $, headers, finalUrl, responseTimeMs } = await fetchPage(url);
  const meta = { headers, finalUrl, responseTimeMs };

  process.stderr.write(`Running ${audits.length} audit module(s) …\n`);
  const results = (await Promise.all(audits.map((a) => a($, html, url, meta)))).flat();

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
