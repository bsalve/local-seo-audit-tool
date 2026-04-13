const AUDIT_NAME = '[GEO] Author Schema';

function findPerson(data) {
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (item['@type'] === 'Person') return item;
    if (Array.isArray(item['@graph'])) {
      const found = item['@graph'].find((n) => n['@type'] === 'Person');
      if (found) return found;
    }
    // Author nested inside Article etc.
    if (item.author?.['@type'] === 'Person') return item.author;
  }
  return null;
}

module.exports = function checkAuthorSchema($, html) {
  let person = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (person) return;
    try { person = findPerson(JSON.parse($(el).html())); } catch { /* skip */ }
  });

  if (!person) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'No Person schema found.',
      recommendation:
        'Add Person JSON-LD for the author or business owner. Include name, jobTitle, ' +
        'sameAs links (LinkedIn, professional profiles), and an image. ' +
        'AI systems use Person schema to assess author expertise and E-E-A-T signals.',
    };
  }

  let score = 0;
  const present = [];
  const missing = [];

  if (person.name) { score += 30; present.push('name'); } else missing.push('name (30 pts)');

  if (person.jobTitle || person.description) {
    score += 25; present.push(person.jobTitle ? 'jobTitle' : 'description');
  } else missing.push('jobTitle or description (25 pts)');

  const sameAs = person.sameAs;
  const hasSameAs = Array.isArray(sameAs) ? sameAs.length > 0 : !!sameAs;
  if (hasSameAs) { score += 25; present.push('sameAs'); } else missing.push('sameAs (25 pts)');

  if (person.image || person.url) {
    score += 20; present.push(person.image ? 'image' : 'url');
  } else missing.push('image or url (20 pts)');

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

  return {
    name: AUDIT_NAME,
    status,
    score,
    message: score >= 80
      ? `Person schema is well-defined (${score}/100) — strong author credibility signal.`
      : `Person schema found but incomplete (${score}/100).`,
    details: `Name: ${person.name ?? 'n/a'} | Present: ${present.join(', ')}${missing.length ? ` | Missing: ${missing.join(', ')}` : ''}`,
    ...(missing.length && {
      recommendation:
        'A complete Person schema strengthens E-E-A-T and increases the chance of AI systems ' +
        'attributing cited content to a named expert. Add the missing fields:\n    • ' +
        missing.join('\n    • '),
    }),
  };
};
