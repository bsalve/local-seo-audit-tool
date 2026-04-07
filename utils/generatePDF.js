'use strict';

const fs         = require('fs');
const path       = require('path');
const puppeteer  = require('puppeteer');
const Handlebars = require('handlebars');

Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('isDefined', (v) => v !== undefined && v !== null);

const templatePath = path.join(__dirname, '..', 'templates', 'report.hbs');

function domainSlug(url) {
  try { return new URL(url).hostname.replace(/[^a-z0-9.-]/gi, '_'); }
  catch { return 'unknown'; }
}

function meterColor(score) {
  if (score >= 90) return '#34d399';
  if (score >= 80) return '#4d9fff';
  if (score >= 70) return '#ffb800';
  if (score >= 60) return '#ff8800';
  return '#ff4455';
}

function statusCounts(results) {
  return results.reduce(
    (acc, r) => {
      if (r.status === 'pass') acc.passCount++;
      else if (r.status === 'warn') acc.warnCount++;
      else acc.failCount++;
      return acc;
    },
    { passCount: 0, warnCount: 0, failCount: 0 }
  );
}

function groupResults(results) {
  const seo = [], aeo = [], geo = [];
  for (const r of results) {
    if (r.name.startsWith('[AEO]')) aeo.push({ ...r, name: r.name.replace(/^\[AEO\]\s*/, '') });
    else if (r.name.startsWith('[GEO]')) geo.push({ ...r, name: r.name.replace(/^\[GEO\]\s*/, '') });
    else seo.push(r);
  }
  return { seoResults: seo, aeoResults: aeo, geoResults: geo };
}

async function generatePDF(auditJson, options = {}) {
  const outputDir = options.outputDir ?? path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const auditedAt = new Date(auditJson.auditedAt).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  // Read template fresh every call so edits take effect without restarting
  const template = Handlebars.compile(fs.readFileSync(templatePath, 'utf8'));

  const html = template({
    ...auditJson,
    auditedAt,
    meterColor: meterColor(auditJson.totalScore),
    ...statusCounts(auditJson.results),
    ...groupResults(auditJson.results),
  });

  const domain   = domainSlug(auditJson.url);
  const datePart = (auditJson.auditedAt || new Date().toISOString()).slice(0, 10);
  const outPath  = path.join(outputDir, `seo-report-${domain}-${datePart}.pdf`);

  const footerTemplate = `
    <div style="width:100%;padding:0 14mm;display:flex;justify-content:space-between;
                align-items:center;font-family:'Courier New',monospace;font-size:8px;
                color:#8892a4;border-top:1px solid #1e2025;background:#0b0c0e;">
      <span style="letter-spacing:0.1em;text-transform:uppercase;">Local SEO Audit Tool</span>
      <span>${auditedAt}</span>
      <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
    </div>`;

  const tmpHtml = path.resolve(outputDir, '_tmp_report.html');
  fs.writeFileSync(tmpHtml, html, 'utf8');

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--force-color-profile=srgb',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--run-all-compositor-stages-before-draw',
    ],
  });
  try {
    const page = await browser.newPage();
    await page.emulateMediaType('screen');
    await page.goto(`file:///${tmpHtml.replace(/\\/g, '/')}`, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outPath,
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate,
      margin: { top: '0', bottom: '14mm', left: '0', right: '0' },
    });
  } finally {
    await browser.close();
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }

  return outPath;
}

module.exports = { generatePDF };
