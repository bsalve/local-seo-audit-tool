const AUDIT_NAME = '[Content] Outbound Links';

const AUTHORITY_SUFFIXES = [
  '.gov', '.edu', '.mil',
];
const AUTHORITY_DOMAINS = [
  'wikipedia.org', 'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
  'nytimes.com', 'theguardian.com', 'who.int', 'mayoclinic.org',
  'healthline.com', 'webmd.com', 'forbes.com', 'bloomberg.com', 'wsj.com',
  'ft.com', 'economist.com', 'nature.com', 'sciencedirect.com',
  'pubmed.ncbi.nlm.nih.gov', 'ncbi.nlm.nih.gov', 'scholar.google.com',
];

function isAuthority(hostname) {
  if (AUTHORITY_SUFFIXES.some((s) => hostname.endsWith(s))) return true;
  if (AUTHORITY_DOMAINS.some((d) => hostname === d || hostname.endsWith('.' + d))) return true;
  return false;
}

module.exports = function checkOutboundLinks($, html, url) {
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return { name: AUDIT_NAME, status: 'warn', score: 50, message: 'Could not parse page URL.' };
  }

  const external = [];
  const authority = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href').trim();
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) return;
    let resolved;
    try { resolved = new URL(href, url); } catch { return; }
    if (resolved.origin === origin) return; // internal

    const hostname = resolved.hostname.toLowerCase();
    external.push(resolved.href);
    if (isAuthority(hostname)) authority.push(resolved.href);
  });

  // Deduplicate
  const uniqueExternal  = [...new Set(external)];
  const uniqueAuthority = [...new Set(authority)];

  if (uniqueExternal.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 40,
      message: 'No external links found on this page.',
      recommendation:
        'Linking to relevant, authoritative external sources (Wikipedia, .gov, .edu, research sites) ' +
        'signals content quality to search engines and increases the chance of being cited by AI systems. ' +
        'Add 2–5 relevant outbound links per page.',
    };
  }

  if (uniqueAuthority.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: `${uniqueExternal.length} external link(s) found — none link to authoritative sources.`,
      details: `External links: ${uniqueExternal.length}`,
      recommendation:
        'While external links are present, none point to high-authority domains (.gov, .edu, Wikipedia, ' +
        'major publications). Linking to trusted sources strengthens your content credibility with ' +
        'both search engines and AI citation systems.',
    };
  }

  const authorityList = uniqueAuthority.slice(0, 5).join('\n    ');
  return {
    name: AUDIT_NAME,
    status: 'pass',
    score: 100,
    message: `${uniqueExternal.length} external link(s) found including ${uniqueAuthority.length} to authoritative source(s).`,
    details: `Authority links:\n    ${authorityList}${uniqueAuthority.length > 5 ? `\n    … and ${uniqueAuthority.length - 5} more` : ''}`,
  };
};
