'use strict';

const AUDIT_NAME = '[Content] NAP Consistency';

// ---------------------------------------------------------------------------
// Phone patterns
// Covers the most common North American and international formats, e.g.:
//   (512) 555-1234  |  512-555-1234  |  512.555.1234  |  +1 512 555 1234
//   +44 20 7946 0958  |  tel:5125551234
// ---------------------------------------------------------------------------
const PHONE_PATTERNS = [
  // North American: optional country code, then (NXX) NXX-XXXX variants
  /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.\-–]\d{3}[\s.\-–]\d{4}/,
  // International E.164-ish: +XX XXX XXXX XXXX (2–3 digit country code)
  /\+\d{1,3}[\s.\-]?\(?\d{1,4}\)?[\s.\-]?\d{2,5}[\s.\-]?\d{2,5}[\s.\-]?\d{0,5}/,
  // href="tel:..." attribute — reliable signal even without visible text
  /tel:\+?[\d\s.\-()]{7,}/,
];

// ---------------------------------------------------------------------------
// Street address patterns
// Looks for a house number followed by a street name and common suffix.
// Intentionally loose — real addresses are wildly varied.
// Examples matched:
//   123 Main Street  |  4500 N. Broadway Ave  |  One Microsoft Way
//   Suite 200, 99 Park Blvd  |  1600 Amphitheatre Pkwy
// ---------------------------------------------------------------------------
const STREET_SUFFIXES = [
  'st(?:reet)?', 'ave(?:nue)?', 'blvd', 'boulevard', 'rd', 'road',
  'dr(?:ive)?', 'ln', 'lane', 'way', 'pkwy', 'parkway', 'ct', 'court',
  'pl(?:ace)?', 'ter(?:race)?', 'cir(?:cle)?', 'hwy', 'highway',
  'fwy', 'freeway', 'trl', 'trail', 'sq(?:uare)?',
].join('|');

const ADDRESS_PATTERNS = [
  // Number + optional direction + street name + suffix
  new RegExp(
    `\\b\\d{1,5}\\s+(?:[NSEW]\\.?\\s+)?[A-Za-z0-9 .'-]{2,40}\\s+(?:${STREET_SUFFIXES})\\.?\\b`,
    'i'
  ),
  // "Suite / Ste / Unit / Floor" line — secondary address indicator
  /\b(?:suite|ste|unit|floor|fl|apt|apartment)\.?\s*#?\d+/i,
  // PO Box
  /\bP\.?\s*O\.?\s*Box\s+\d+/i,
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractText($) {
  // Clone body before removing elements — do NOT mutate the shared $ passed in
  // from the crawler, which other audits also use.
  let text = $('body').clone().find('script, style, noscript').remove().end().text();
  // Also append tel: hrefs so click-to-call links are detected even when the
  // anchor text doesn't include the phone number in a matchable format.
  $('a[href^="tel:"]').each((_, el) => { text += ' ' + ($(el).attr('href') || ''); });
  return text.replace(/\s+/g, ' ');
}

function testPatterns(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0].trim();
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main audit — uses the $ already fetched by the caller, no extra HTTP request
// ---------------------------------------------------------------------------

function checkNAP($, html, url) {
  const pageText = extractText($);

  const phoneMatch   = testPatterns(pageText, PHONE_PATTERNS);
  const addressMatch = testPatterns(pageText, ADDRESS_PATTERNS);

  // Score: 50 points each
  const phoneScore   = phoneMatch   ? 50 : 0;
  const addressScore = addressMatch ? 50 : 0;
  const score = phoneScore + addressScore;

  const missing = [];
  const recommendations = [];

  if (!phoneMatch) {
    missing.push('phone number');
    recommendations.push(
      'Phone number not detected. Add a clearly visible phone number to your page — ideally ' +
      'in the header and footer. Use a consistent format (e.g. (512) 555-1234) across your ' +
      'website, Google Business Profile, and all directory listings. Inconsistent NAP data ' +
      'confuses search engines and weakens local rankings.'
    );
  }

  if (!addressMatch) {
    missing.push('street address');
    recommendations.push(
      'Street address not detected. Display your full street address on the page in plain text ' +
      '(not just inside an image or map embed). Consistent NAP across your site and citations ' +
      'is one of the strongest local SEO signals. Consider adding it to your footer and wrapping ' +
      'it in LocalBusiness schema markup.'
    );
  }

  if (score === 100) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'Phone number and street address detected on the page.',
      details: `Phone: "${phoneMatch}" | Address: "${addressMatch}"`,
    };
  }

  return {
    name: AUDIT_NAME,
    status: score === 0 ? 'fail' : 'warn',
    score,
    message: `NAP check incomplete — missing: ${missing.join(' and ')}.`,
    recommendation: recommendations.join('\n    '),
    details: [
      phoneMatch   ? `Phone: "${phoneMatch}"`     : 'Phone: not found',
      addressMatch ? `Address: "${addressMatch}"` : 'Address: not found',
    ].join(' | '),
  };
}

module.exports = checkNAP;
