const AUDIT_NAME = '[Technical] BreadcrumbList Schema';

module.exports = function checkBreadcrumbSchema($, html) {
  const scripts = $('script[type="application/ld+json"]');
  let breadcrumb = null;

  scripts.each((_, el) => {
    if (breadcrumb) return;
    try {
      const data = JSON.parse($(el).html());
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] === 'BreadcrumbList') {
          breadcrumb = item;
          break;
        }
        // Also check @graph
        if (Array.isArray(item['@graph'])) {
          const found = item['@graph'].find((n) => n['@type'] === 'BreadcrumbList');
          if (found) { breadcrumb = found; break; }
        }
      }
    } catch {
      // invalid JSON — skip
    }
  });

  if (!breadcrumb) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'No BreadcrumbList schema found.',
      recommendation:
        'Add BreadcrumbList JSON-LD to interior pages to enable breadcrumb display in Google search results. ' +
        'Example: { "@type": "BreadcrumbList", "itemListElement": [ ' +
        '{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://example.com/" }, ' +
        '{ "@type": "ListItem", "position": 2, "name": "Services", "item": "https://example.com/services/" } ] }',
    };
  }

  const items = breadcrumb.itemListElement;
  if (!Array.isArray(items) || items.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 60,
      message: 'BreadcrumbList schema found but itemListElement is empty or invalid.',
      recommendation: 'Populate itemListElement with ListItem entries, each with position, name, and item (URL).',
    };
  }

  if (items.length === 1) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 60,
      message: 'BreadcrumbList schema found with only 1 item — breadcrumbs are most useful with 2+ levels.',
      details: `Item: ${items[0]?.name ?? '(unnamed)'}`,
      recommendation: 'Expand the breadcrumb trail to include parent pages for richer search result display.',
    };
  }

  const trail = items
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((i) => i.name ?? '(unnamed)')
    .join(' › ');

  return {
    name: AUDIT_NAME,
    status: 'pass',
    score: 100,
    message: `BreadcrumbList schema found with ${items.length} levels.`,
    details: `Trail: ${trail}`,
  };
};
