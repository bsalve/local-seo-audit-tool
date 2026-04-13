const AUDIT_NAME = '[GEO] Service / Product Schema';

const TARGET_TYPES = ['Service', 'Product', 'LocalBusiness', 'ProfessionalService',
  'HomeAndConstructionBusiness', 'AutomotiveBusiness', 'FoodEstablishment',
  'LegalService', 'MedicalBusiness', 'FinancialService'];

function findServiceOrProduct(data) {
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (TARGET_TYPES.includes(item['@type'])) return item;
    if (Array.isArray(item['@graph'])) {
      const found = item['@graph'].find((n) => TARGET_TYPES.includes(n['@type']));
      if (found) return found;
    }
  }
  return null;
}

module.exports = function checkServiceSchema($, html) {
  let entity = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (entity) return;
    try { entity = findServiceOrProduct(JSON.parse($(el).html())); } catch { /* skip */ }
  });

  if (!entity) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'No Service or Product schema found.',
      recommendation:
        'Add Service or Product JSON-LD to describe what your business offers. ' +
        'Include name, description, provider (your organization), and areaServed. ' +
        'This helps AI systems understand and recommend your services accurately.',
    };
  }

  let score = 0;
  const present = [];
  const missing = [];

  if (entity.name) { score += 30; present.push('name'); } else missing.push('name (30 pts)');

  if (entity.description) { score += 30; present.push('description'); } else missing.push('description (30 pts)');

  const hasProvider = entity.provider?.name || entity.brand?.name || entity.manufacturer?.name;
  if (hasProvider) { score += 20; present.push('provider/brand'); } else missing.push('provider or brand (20 pts)');

  const hasAreaOrOffers = entity.areaServed || entity.offers;
  if (hasAreaOrOffers) { score += 20; present.push('areaServed/offers'); } else missing.push('areaServed or offers (20 pts)');

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';
  const typeLabel = entity['@type'];

  return {
    name: AUDIT_NAME,
    status,
    score,
    message: score >= 80
      ? `${typeLabel} schema is well-defined (${score}/100).`
      : `${typeLabel} schema found but incomplete (${score}/100).`,
    details: `Present: ${present.join(', ')}${missing.length ? ` | Missing: ${missing.join(', ')}` : ''}`,
    ...(missing.length && {
      recommendation:
        'Improve your Service/Product schema to help AI systems accurately describe your offering. ' +
        'Add the missing fields:\n    • ' + missing.join('\n    • '),
    }),
  };
};
