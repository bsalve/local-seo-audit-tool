const axios = require('axios');

const AUDIT_NAME = '[Technical] Crawlability';

const CHECKS = [
  {
    path: '/robots.txt',
    label: 'robots.txt',
    score: 40,
    // Validated by content — a real robots.txt must contain at least one directive
    validate: (body) => /User-agent:/i.test(body),
    missingRec:
      'Create a /robots.txt file at the root of your domain. It tells search engine crawlers ' +
      'which pages to index or ignore. At minimum, include:\n' +
      '      User-agent: *\n' +
      '      Allow: /\n' +
      '      Sitemap: https://yourdomain.com/sitemap.xml\n' +
      '    Without it, crawlers must guess your crawl preferences.',
    invalidRec:
      'A /robots.txt file was found but does not appear to contain valid directives. ' +
      'Ensure it includes at least one "User-agent:" line. An invalid robots.txt may be ' +
      'misinterpreted by crawlers, causing important pages to be skipped.',
  },
  {
    path: '/sitemap.xml',
    label: 'sitemap.xml',
    score: 60,
    // Validated by content — must look like XML containing <urlset> or <sitemapindex>
    validate: (body) => /<urlset|<sitemapindex/i.test(body),
    missingRec:
      'Create an XML sitemap at /sitemap.xml and submit it in Google Search Console. ' +
      'A sitemap ensures search engines discover all of your pages — especially important ' +
      'for new sites or pages with few inbound links. Most CMS platforms (WordPress, Shopify, ' +
      'Squarespace) can generate one automatically via a plugin or built-in setting.',
    invalidRec:
      'A /sitemap.xml file was found but does not appear to contain valid XML sitemap markup. ' +
      'Ensure the file includes a <urlset> or <sitemapindex> root element. ' +
      'Validate it at https://www.xml-sitemaps.com/validate-xml-sitemap.html before resubmitting.',
  },
];

async function probe(baseUrl, path) {
  const target = baseUrl + path;
  try {
    const response = await axios.get(target, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
      timeout: 10000,
      // Follow redirects but cap at 5 hops to avoid infinite loops
      maxRedirects: 5,
      // Treat any 2xx as success; throw on 4xx/5xx
      validateStatus: (s) => s >= 200 && s < 300,
    });
    return { found: true, body: String(response.data) };
  } catch (err) {
    if (err.response) {
      // Server responded with a non-2xx status (most likely 404)
      return { found: false, body: null, httpStatus: err.response.status };
    }
    // Network-level failure (DNS, timeout, connection refused)
    return { found: false, body: null, networkError: err.message };
  }
}

async function checkCrawlability($, html, url) {
  let baseUrl;
  try {
    const parsed = new URL(url);
    // Strip path/query so we always probe the domain root
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return {
      name: AUDIT_NAME,
      status: 'fail',
      score: 0,
      message: 'Invalid URL — could not determine domain root.',
      recommendation: 'Provide a valid URL including the protocol, e.g. https://example.com.',
    };
  }

  // Probe both files in parallel
  const [robotsResult, sitemapResult] = await Promise.all(
    CHECKS.map((check) => probe(baseUrl, check.path))
  );

  const probeResults = [robotsResult, sitemapResult];
  let totalScore = 0;
  const issues = [];
  const recommendations = [];
  const detailParts = [];

  CHECKS.forEach((check, i) => {
    const { found, body, httpStatus, networkError } = probeResults[i];

    if (networkError) {
      issues.push(`${check.label}: unreachable (${networkError})`);
      recommendations.push(
        `${check.label} — Could not connect to ${baseUrl}${check.path}. ` +
        'Verify the domain is reachable and DNS is resolving correctly.'
      );
      detailParts.push(`${check.label}: network error`);
      return;
    }

    if (!found) {
      issues.push(`${check.label}: not found (HTTP ${httpStatus ?? '???'})`);
      recommendations.push(`${check.label} — ${check.missingRec}`);
      detailParts.push(`${check.label}: 404`);
      return;
    }

    const valid = check.validate(body);
    if (!valid) {
      // Present but content looks wrong — award half points
      const halfScore = Math.floor(check.score / 2);
      totalScore += halfScore;
      issues.push(`${check.label}: present but content appears invalid`);
      recommendations.push(`${check.label} — ${check.invalidRec}`);
      detailParts.push(`${check.label}: found (invalid content, +${halfScore} pts)`);
      return;
    }

    totalScore += check.score;
    detailParts.push(`${check.label}: OK`);
  });

  const status = totalScore === 100 ? 'pass' : totalScore >= 50 ? 'warn' : 'fail';

  if (status === 'pass') {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'robots.txt and sitemap.xml are both present and valid.',
      details: detailParts.join(' | '),
    };
  }

  return {
    name: AUDIT_NAME,
    status,
    score: totalScore,
    message: `Crawlability issues found: ${issues.join('; ')}.`,
    recommendation: recommendations.join('\n    '),
    details: detailParts.join(' | '),
  };
}

module.exports = checkCrawlability;
