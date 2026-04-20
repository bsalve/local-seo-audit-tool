'use strict';

const path           = require('path');
const fs             = require('fs');
const { Worker }     = require('worker_threads');
const WORKER_PATH    = path.join(__dirname, 'pageWorker.js');

// Non-HTML file extensions — skip without fetching or counting against the page limit.
// All 60+ audits are HTML/DOM-based; binary files produce garbage results and cheerio
// can take 20-40 seconds trying to parse them (confirmed with PDF timing data).
const NON_HTML_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.zip', '.tar', '.gz', '.rar',
  '.mp4', '.mp3', '.avi', '.mov', '.wav',
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
  '.css', '.js', '.json', '.xml', '.csv',
]);

function isHtmlUrl(url) {
  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    return !NON_HTML_EXTENSIONS.has(ext);
  } catch {
    return true; // unparseable URL — assume HTML and let the worker handle it
  }
}

// Audits that make extra HTTP requests — too slow at 50-page scale
const SKIP_AUDITS = new Set([
  'checkPageSpeed.js',           // PSI API call — slow + rate-limited
  'technicalBrokenLinks.js',     // HEADs up to 20 links per page
  'technicalCanonicalChain.js',  // Fetches canonical target URL
  'contentOGImageCheck.js',      // HEADs og:image URL
  'technicalRedirectChain.js',   // Up to 10 sequential GETs per page chasing redirects
  'checkCrawlability.js',        // Fetches /robots.txt + /sitemap.xml — same result for every page
  'technicalRobotsSafety.js',    // Fetches /robots.txt — same result for every page
]);

// ---------------------------------------------------------------------------
// processPage — runs one URL in a dedicated worker thread.
// The worker has its own V8 heap; when it exits that heap is freed entirely,
// guaranteeing zero accumulation of cheerio DOMs across pages.
// ---------------------------------------------------------------------------
function processPage(url, auditPaths) {
  return new Promise((resolve) => {
    const worker = new Worker(WORKER_PATH, {
      workerData: { url, auditPaths },
      resourceLimits: { maxOldGenerationSizeMb: 1024 }, // cap each page at 1 GB
    });

    // 30-second safety timeout per page
    const timer = setTimeout(() => {
      worker.terminate();
      resolve({ results: [], hrefs: [] });
    }, 30000);

    worker.once('message', (data) => {
      clearTimeout(timer);
      resolve(data);
    });

    worker.once('error', () => {
      clearTimeout(timer);
      resolve({ results: [], hrefs: [] });
    });

    worker.once('exit', (code) => {
      clearTimeout(timer);
      if (code !== 0) resolve({ results: [], hrefs: [] });
    });
  });
}

async function crawlSite(startUrl, { maxPages = 50, onProgress } = {}) {
  const auditsDir  = path.join(__dirname, '..', 'audits');
  const auditPaths = fs.readdirSync(auditsDir)
    .filter(f => f.endsWith('.js') && !SKIP_AUDITS.has(f))
    .map(f => path.join(auditsDir, f));

  const origin  = new URL(startUrl).origin;
  const visited = new Set();
  const queued  = new Set([startUrl]); // O(1) dedup
  const queue   = [startUrl];
  const pages   = [];                  // { url, results[] }

  while (queue.length && pages.length < maxPages) {
    const url = queue.shift();
    queued.delete(url);
    if (visited.has(url)) continue;
    visited.add(url);

    if (!isHtmlUrl(url)) continue; // skip non-HTML files without counting

    onProgress?.({ type: 'progress', crawled: pages.length, total: maxPages, url });

    try {
      // Worker handles fetch + audits; its heap is freed when it exits
      const { results, hrefs } = await processPage(url, auditPaths);
      pages.push({ url, results });

      // Enqueue same-origin links
      for (const href of hrefs) {
        try {
          const next = new URL(href, url);
          if (next.origin !== origin) continue;
          const norm = next.origin + next.pathname; // strip query + fragment
          if (!visited.has(norm) && !queued.has(norm) && isHtmlUrl(norm)) {
            queued.add(norm);
            queue.push(norm);
          }
        } catch {}
      }
    } catch {
      // Skip unreachable pages silently
    }
  }

  return pages;
}

function aggregateResults(pages) {
  const map = new Map();
  for (const { url, results } of pages) {
    for (const r of results) {
      if (!map.has(r.name)) map.set(r.name, { name: r.name, fail: [], warn: [], pass: [], recommendation: null, message: null });
      const bucket = map.get(r.name);
      (bucket[r.status] ?? bucket.fail).push(url);
      if (!bucket.recommendation && r.recommendation) bucket.recommendation = r.recommendation;
      if (!bucket.message && r.message) bucket.message = r.message;
    }
  }
  return [...map.values()].sort(
    (a, b) => b.fail.length - a.fail.length || b.warn.length - a.warn.length
  );
}

module.exports = { crawlSite, aggregateResults };
