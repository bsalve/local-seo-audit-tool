'use strict';

// Worker thread — processes one URL: fetch, run audits, extract links.
// Each worker runs in its own V8 heap. When it exits, all memory (cheerio
// DOM, HTML string, audit locals) is completely freed — no accumulation.

const { workerData, parentPort } = require('worker_threads');
const { fetchPage } = require('./fetcher');

async function run() {
  const { url, auditPaths } = workerData;

  try {
    const { html, $, headers, finalUrl, responseTimeMs } = await fetchPage(url);
    const meta = { headers, finalUrl, responseTimeMs };

    const auditFns = auditPaths.map(p => require(p));

    const results = (await Promise.all(
      auditFns.map(fn => new Promise(resolve => resolve(fn($, html, url, meta))).catch(() => null))
    )).flat().filter(Boolean);

    // Ensure results are plain serializable objects before postMessage
    const safeResults = results.map(r => ({
      name:           String(r.name           ?? ''),
      status:         String(r.status         ?? 'fail'),
      score:          r.score          != null ? Number(r.score)    : undefined,
      maxScore:       r.maxScore       != null ? Number(r.maxScore) : undefined,
      message:        r.message        != null ? String(r.message)        : undefined,
      details:        r.details        != null ? String(r.details)        : undefined,
      recommendation: r.recommendation != null ? String(r.recommendation) : undefined,
    }));

    const hrefs = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) hrefs.push(href);
    });

    const title    = $('title').first().text().trim() || null;
    const metaDesc = $('meta[name="description"]').attr('content')?.trim() || null;

    parentPort.postMessage({ results: safeResults, hrefs, title, metaDesc });
  } catch (err) {
    // Page fetch failed — return empty so the crawler skips this URL
    parentPort.postMessage({ results: [], hrefs: [], error: err.message });
  }
}

run();
