'use strict';

const fs         = require('fs');
const path       = require('path');
const puppeteer  = require('puppeteer');
const Handlebars = require('handlebars');
const axios      = require('axios');

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
  const technical = [], content = [], aeo = [], geo = [];
  for (const r of results) {
    if (r.name.startsWith('[AEO]'))       aeo.push({ ...r, name: r.name.replace(/^\[AEO\]\s*/, '') });
    else if (r.name.startsWith('[GEO]'))  geo.push({ ...r, name: r.name.replace(/^\[GEO\]\s*/, '') });
    else if (r.name.startsWith('[Content]')) content.push({ ...r, name: r.name.replace(/^\[Content\]\s*/, '') });
    else technical.push({ ...r, name: r.name.replace(/^\[Technical\]\s*/, '') });
  }
  return { technicalResults: technical, contentResults: content, aeoResults: aeo, geoResults: geo };
}

function calcCatScore(arr) {
  if (!arr.length) return { score: 0, grade: 'F' };
  const avg = Math.round(arr.reduce((s, r) => s + (r.normalizedScore ?? 0), 0) / arr.length);
  const grade = avg >= 90 ? 'A' : avg >= 80 ? 'B' : avg >= 70 ? 'C' : avg >= 60 ? 'D' : 'F';
  return { score: avg, grade };
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

  const grouped = groupResults(auditJson.results);
  const catScores = {
    technical: calcCatScore(grouped.technicalResults),
    content:   calcCatScore(grouped.contentResults),
    aeo:       calcCatScore(grouped.aeoResults),
    geo:       calcCatScore(grouped.geoResults),
  };

  // Executive summary: top 3 critical issues and top 3 passes
  const sorted = [...auditJson.results].sort((a, b) => (a.normalizedScore ?? 0) - (b.normalizedScore ?? 0));
  const top7Fails = sorted
    .filter(r => r.status === 'fail' || r.status === 'warn')
    .slice(0, 7)
    .map(r => ({
      name: r.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, ''),
      message: r.message || '', status: r.status,
      pctFail: r.pctFail, failCount: r.failCount, totalPages: r.totalPages,
    }));
  const top7Passes = [...auditJson.results]
    .filter(r => r.status === 'pass')
    .sort((a, b) => (b.normalizedScore ?? 0) - (a.normalizedScore ?? 0))
    .slice(0, 7)
    .map(r => ({
      name: r.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, ''),
      message: r.message || '',
      pctPass: r.pctPass, passCount: r.passCount, totalPages: r.totalPages,
    }));

  // Fetch logo and embed as base64 — avoids CORS/CORP blocks when Puppeteer
  // loads the PDF from a file:/// temp file (external URLs can be silently blocked)
  let logoUrl = null;
  if (options.logoUrl) {
    try {
      const imgRes = await axios.get(options.logoUrl, {
        responseType: 'arraybuffer',
        timeout: 8000,
        headers: { 'User-Agent': 'SignalGrade/1.0' },
      });
      const contentType = (imgRes.headers['content-type'] || 'image/png').split(';')[0];
      const base64 = Buffer.from(imgRes.data).toString('base64');
      logoUrl = `data:${contentType};base64,${base64}`;
    } catch {
      // Logo fetch failed — fall back to default SIGNALGRADE header
    }
  }

  const html = template({
    ...auditJson,
    auditedAt,
    meterColor: meterColor(auditJson.totalScore),
    ...statusCounts(auditJson.results),
    ...grouped,
    catScores,
    top7Fails,
    top7Passes,
    logoUrl,
    isSiteReport: !!options.isSiteReport,
    pageCount:    options.pageCount ?? null,
  });

  const domain   = domainSlug(auditJson.url);
  const datePart = (auditJson.auditedAt || new Date().toISOString()).slice(0, 10);
  const prefix   = options.prefix || 'signalgrade';
  const outPath  = path.join(outputDir, `${prefix}-report-${domain}-${datePart}.pdf`);

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
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
  } finally {
    await browser.close();
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }

  return outPath;
}

function gradeColorForScore(score) {
  if (score >= 90) return '#34d399';
  if (score >= 80) return '#4d9fff';
  if (score >= 70) return '#ffb800';
  if (score >= 60) return '#ff8800';
  return '#ff4455';
}

function shortDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

const CAT_PREFIXES = ['[Technical]', '[Content]', '[AEO]', '[GEO]'];
const CAT_KEYS     = ['technical',   'content',   'aeo',   'geo'];
const CAT_FULL_NAMES = {
  technical: 'Technical — Site Health & Infrastructure',
  content:   'Content — Marketing & On-Page Signals',
  aeo:       'AEO — Answer Engine Optimization',
  geo:       'GEO — Generative Engine Optimization',
};

async function generateMultiPDF(locations, options = {}) {
  const outputDir = options.outputDir ?? path.join(__dirname, '..', 'output');
  fs.mkdirSync(outputDir, { recursive: true });

  const auditedAt = new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });

  // Enrich each location with display data
  const processedLocations = locations.map(loc => {
    const grouped      = groupResults(loc.results);
    const catScores    = {
      technical: calcCatScore(grouped.technicalResults),
      content:   calcCatScore(grouped.contentResults),
      aeo:       calcCatScore(grouped.aeoResults),
      geo:       calcCatScore(grouped.geoResults),
    };
    const domain      = shortDomain(loc.url);
    const displayName = (loc.label && loc.label.trim()) ? loc.label.trim() : domain;
    return {
      url:         loc.url,
      domain,
      displayName,
      grade:       loc.grade,
      totalScore:  loc.totalScore,
      gradeColor:  gradeColorForScore(loc.totalScore),
      catScores,
      results:     loc.results,
      nap:         loc.nap || { phone: null, address: null },
    };
  });

  // Collect all unique check names across all locations, sorted by category then name
  const allNames = new Set();
  for (const loc of processedLocations) {
    for (const r of loc.results) allNames.add(r.name);
  }
  const sortedNames = [...allNames].sort((a, b) => {
    const ia = CAT_PREFIXES.findIndex(p => a.startsWith(p));
    const ib = CAT_PREFIXES.findIndex(p => b.startsWith(p));
    if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return a.localeCompare(b);
  });

  // Build the checks array for the comparison table
  const checks = [];
  let lastCat = null;
  for (const name of sortedNames) {
    const prefixIdx = CAT_PREFIXES.findIndex(p => name.startsWith(p));
    const cat = prefixIdx >= 0 ? CAT_KEYS[prefixIdx] : 'technical';
    const isNewCat = cat !== lastCat;
    lastCat = cat;

    const displayName = name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
    const cells = processedLocations.map(loc => {
      const result = loc.results.find(r => r.name === name);
      if (!result) return { status: 'na', score: null, statusIcon: '—' };
      return {
        status:     result.status,
        score:      result.normalizedScore ?? null,
        statusIcon: result.status === 'pass' ? '✓' : result.status === 'warn' ? '△' : '✕',
      };
    });

    checks.push({ name, displayName, cat, catFullName: CAT_FULL_NAMES[cat], isNewCat, cells });
  }

  // Best / worst locations by score
  const ranked        = [...processedLocations].sort((a, b) => b.totalScore - a.totalScore);
  const bestLocation  = ranked[0];
  const worstLocation = ranked.length > 1 ? ranked[ranked.length - 1] : null;

  // NAP cross-comparison: build rows and flag mismatches
  const napRows = processedLocations.map(loc => ({
    displayName: loc.displayName,
    phone:       loc.nap.phone   || '—',
    address:     loc.nap.address || '—',
  }));
  const napPhones    = napRows.map(r => r.phone).filter(v => v !== '—');
  const napAddresses = napRows.map(r => r.address).filter(v => v !== '—');
  const napMismatch  = {
    phone:   new Set(napPhones).size > 1,
    address: new Set(napAddresses).size > 1,
  };
  // Per-row mismatch flags for template cell coloring
  const majorityPhone   = napPhones.length   ? napPhones.sort((a, b) =>
    napPhones.filter(v => v === b).length - napPhones.filter(v => v === a).length)[0]   : null;
  const majorityAddress = napAddresses.length ? napAddresses.sort((a, b) =>
    napAddresses.filter(v => v === b).length - napAddresses.filter(v => v === a).length)[0] : null;
  for (const row of napRows) {
    row.phoneMismatch   = napMismatch.phone   && row.phone   !== '—' && row.phone   !== majorityPhone;
    row.addressMismatch = napMismatch.address && row.address !== '—' && row.address !== majorityAddress;
  }

  // Common issues: checks failing at the most locations, top 7
  const CAT_COLORS = { technical: '#8892a4', content: '#e8a87c', aeo: '#7baeff', geo: '#b07bff' };
  const top7CommonIssues = checks
    .map(c => ({
      displayName:    c.displayName,
      cat:            c.cat,
      catColor:       CAT_COLORS[c.cat] || '#8892a4',
      failCount:      c.cells.filter(x => x.status === 'fail').length,
      warnCount:      c.cells.filter(x => x.status === 'warn').length,
      totalLocations: processedLocations.length,
    }))
    .filter(c => c.failCount > 0)
    .sort((a, b) => b.failCount - a.failCount || b.warnCount - a.warnCount)
    .slice(0, 7);

  // Column widths: 515px usable (A4 portrait minus 24mm margins)
  // Reserve more label space for fewer locations
  const n = processedLocations.length;
  const checkColWidth = n <= 4 ? 220 : 180;

  const multiTemplatePath = path.join(__dirname, '..', 'templates', 'multi-report.hbs');
  const template = Handlebars.compile(fs.readFileSync(multiTemplatePath, 'utf8'));

  const html = template({
    auditedAt,
    locationCount:    n,
    locationCountGt1: n > 1,
    totalCheckCount:  sortedNames.length,
    tableColSpan:     n + 1,
    checkColWidth,
    locations:        processedLocations,
    checks,
    bestLocation,
    worstLocation,
    top7CommonIssues,
    napRows,
    napAnyMismatch: napMismatch.phone || napMismatch.address,
  });

  const datePart = new Date().toISOString().slice(0, 10);
  const outPath  = path.join(outputDir, `signalgrade-multi-report-${datePart}.pdf`);
  const tmpHtml  = path.resolve(outputDir, '_tmp_multi_report.html');
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
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    });
  } finally {
    await browser.close();
    if (fs.existsSync(tmpHtml)) fs.unlinkSync(tmpHtml);
  }

  return outPath;
}

module.exports = { generatePDF, generateMultiPDF };
