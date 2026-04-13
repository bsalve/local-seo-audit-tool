const AUDIT_NAME = '[Technical] Hreflang / i18n Tags';

module.exports = function checkHreflang($, html, url) {
  const tags = $('link[rel="alternate"][hreflang]');

  if (tags.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'No hreflang tags found.',
      details: 'Hreflang tags tell search engines which language/region a page targets.',
      recommendation:
        'If this site serves only one language and region, hreflang tags are not required. ' +
        'If you serve multiple languages or regions, add <link rel="alternate" hreflang="xx"> ' +
        'tags to each language variant, including an x-default fallback.',
    };
  }

  // Check for malformed tags (missing href or hreflang value)
  const malformed = [];
  tags.each((_, el) => {
    const lang = $(el).attr('hreflang');
    const href = $(el).attr('href');
    if (!lang || !href) malformed.push({ lang, href });
  });

  if (malformed.length > 0) {
    return {
      name: AUDIT_NAME,
      status: 'fail',
      score: 20,
      message: `${malformed.length} malformed hreflang tag(s) found (missing href or hreflang value).`,
      details: `${tags.length} hreflang tag(s) total; ${malformed.length} are incomplete.`,
      recommendation:
        'Each hreflang tag must have both a valid hreflang language code (e.g. "en", "en-GB") ' +
        'and an absolute href URL. Malformed tags are ignored by search engines.',
    };
  }

  const hasXDefault = tags.toArray().some((el) => $(el).attr('hreflang') === 'x-default');
  const langs = [...new Set(tags.toArray().map((el) => $(el).attr('hreflang')))].join(', ');

  if (!hasXDefault) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: `${tags.length} hreflang tag(s) found but no x-default fallback.`,
      details: `Languages/regions declared: ${langs}`,
      recommendation:
        'Add an x-default hreflang tag to specify the fallback page for users whose ' +
        'language or region does not match any declared variant: ' +
        '<link rel="alternate" hreflang="x-default" href="https://example.com/">',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'pass',
    score: 100,
    message: `${tags.length} hreflang tag(s) found including x-default.`,
    details: `Languages/regions declared: ${langs}`,
  };
};
