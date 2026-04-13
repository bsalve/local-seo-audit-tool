const axios = require('axios');

const AUDIT_NAME = '[Technical] Broken Internal Links';
const MAX_LINKS = 20;
const REQUEST_TIMEOUT = 5000;

module.exports = async function checkBrokenLinks($, html, url) {
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return {
      name: AUDIT_NAME,
      status: 'fail',
      score: 0,
      message: 'Could not parse the page URL.',
    };
  }

  // Collect unique internal links, excluding anchors, mailto:, tel:, javascript:
  const seen = new Set();
  const internalLinks = [];

  $('a[href]').each((_, el) => {
    const raw = $( el).attr('href').trim();
    if (!raw || raw.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(raw)) return;

    let resolved;
    try {
      resolved = new URL(raw, url).href;
    } catch {
      return;
    }

    // Internal = same origin
    if (!resolved.startsWith(origin)) return;

    // Strip fragment for deduplication
    const withoutFragment = resolved.split('#')[0];
    if (seen.has(withoutFragment)) return;
    seen.add(withoutFragment);
    internalLinks.push(withoutFragment);
  });

  if (internalLinks.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'No internal links found on this page.',
      recommendation:
        'Internal links help search engines crawl your site and distribute page authority. ' +
        'Add links to key pages (services, contact, about) from your homepage.',
    };
  }

  const toCheck = internalLinks.slice(0, MAX_LINKS);
  const capped = internalLinks.length > MAX_LINKS;

  const results = await Promise.all(
    toCheck.map(async (link) => {
      try {
        const res = await axios.head(link, {
          timeout: REQUEST_TIMEOUT,
          maxRedirects: 5,
          validateStatus: () => true, // don't throw on 4xx/5xx
          headers: { 'User-Agent': 'LocalSEOAuditBot/1.0' },
        });
        return { link, status: res.status, broken: res.status >= 400 };
      } catch {
        return { link, status: null, broken: true };
      }
    })
  );

  const broken = results.filter((r) => r.broken);
  const checkedCount = toCheck.length;
  const cappedNote = capped ? ` (checked first ${MAX_LINKS} of ${internalLinks.length} links)` : '';

  if (broken.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `No broken internal links found. Checked ${checkedCount} link(s)${cappedNote}.`,
    };
  }

  const brokenList = broken
    .map((r) => `  • ${r.link} (${r.status ?? 'no response'})`)
    .join('\n    ');

  const score = broken.length <= 2 ? 60 : 20;
  const status = broken.length <= 2 ? 'warn' : 'fail';

  return {
    name: AUDIT_NAME,
    status,
    score,
    message: `${broken.length} broken internal link(s) found${cappedNote}.`,
    details: `Broken links:\n    ${brokenList}`,
    recommendation:
      'Fix or remove broken links. Each 404 wastes crawl budget, signals poor site maintenance ' +
      'to search engines, and frustrates users. Set up 301 redirects for pages that have moved.',
  };
};
