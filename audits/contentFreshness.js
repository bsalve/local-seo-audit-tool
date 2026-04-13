const AUDIT_NAME = '[Content] Content Freshness';

const NOW = Date.now();
const MS_12_MONTHS = 365 * 24 * 60 * 60 * 1000;
const MS_24_MONTHS = 2 * MS_12_MONTHS;

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function ageLabel(date) {
  const months = Math.round((NOW - date.getTime()) / (30 * 24 * 60 * 60 * 1000));
  if (months < 2) return 'less than 1 month ago';
  if (months < 12) return `${months} months ago`;
  const years = Math.round(months / 12);
  return `~${years} year${years > 1 ? 's' : ''} ago`;
}

function scoreByAge(date, source) {
  const age = NOW - date.getTime();
  const label = ageLabel(date);
  const formatted = date.toISOString().slice(0, 10);

  if (age <= MS_12_MONTHS) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `Content date found — updated ${label}.`,
      details: `Date: ${formatted} (source: ${source})`,
    };
  }
  if (age <= MS_24_MONTHS) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: `Content was last updated ${label} — consider refreshing it.`,
      details: `Date: ${formatted} (source: ${source})`,
      recommendation:
        'Search engines and AI systems favour recently updated content. ' +
        'Review and update this page annually to maintain freshness signals.',
    };
  }
  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 40,
    message: `Content may be stale — last updated ${label}.`,
    details: `Date: ${formatted} (source: ${source})`,
    recommendation:
      'This page has not been updated in over 2 years. Stale content ranks lower in search ' +
      'and is less likely to be cited by AI engines. Update statistics, examples, and any ' +
      'time-sensitive information, then refresh the publish date.',
  };
}

module.exports = function checkFreshness($, html, url) {
  // 1. Open Graph / article meta tags
  const ogModified  = $('meta[property="article:modified_time"]').attr('content');
  const ogPublished = $('meta[property="article:published_time"]').attr('content');
  const metaDate = parseDate(ogModified) || parseDate(ogPublished);
  if (metaDate) return scoreByAge(metaDate, 'article meta tag');

  // 2. JSON-LD Article/BlogPosting schema
  let schemaDate = null;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (schemaDate) return;
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const d = parseDate(item.dateModified) || parseDate(item.datePublished);
        if (d) { schemaDate = d; break; }
        if (Array.isArray(item['@graph'])) {
          for (const node of item['@graph']) {
            const nd = parseDate(node.dateModified) || parseDate(node.datePublished);
            if (nd) { schemaDate = nd; break; }
          }
        }
      }
    } catch { /* skip */ }
  });
  if (schemaDate) return scoreByAge(schemaDate, 'JSON-LD schema');

  // 3. <time datetime="...">
  const timeEl = $('time[datetime]').first();
  if (timeEl.length) {
    const d = parseDate(timeEl.attr('datetime'));
    if (d) return scoreByAge(d, '<time> element');
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 60,
      message: 'Date found in <time> element but could not be parsed.',
      details: `datetime="${timeEl.attr('datetime')}"`,
      recommendation: 'Use ISO 8601 format in the datetime attribute: <time datetime="2025-01-15">January 15, 2025</time>',
    };
  }

  // 4. Text pattern near top of page
  const topText = $('body').text().slice(0, 2000);
  const datePattern = /(?:updated|published|last\s+updated|posted)[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i;
  const match = topText.match(datePattern);
  if (match) {
    const d = parseDate(match[1]);
    if (d) return scoreByAge(d, 'page text');
  }

  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 50,
    message: 'No publication or update date found on this page.',
    recommendation:
      'Adding a visible publish and/or update date helps search engines and AI systems ' +
      'assess content freshness. Use a <time datetime="YYYY-MM-DD"> element, ' +
      'add Article JSON-LD with datePublished/dateModified, or show a visible "Last updated:" line.',
  };
};
