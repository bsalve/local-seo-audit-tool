// Schema.org types that are subtypes of Organization or LocalBusiness
const ORG_TYPES = new Set([
  'Organization', 'LocalBusiness', 'Corporation', 'EducationalOrganization',
  'GovernmentOrganization', 'MedicalOrganization', 'NGO', 'NewsMediaOrganization',
  'PerformingGroup', 'SportsOrganization', 'Airline', 'Consortium', 'FundingAgency',
  // LocalBusiness subtypes (common)
  'AnimalShelter', 'AutomotiveBusiness', 'ChildCare', 'Dentist', 'DryCleaningOrLaundry',
  'EmergencyService', 'EmploymentAgency', 'EntertainmentBusiness', 'FinancialService',
  'FoodEstablishment', 'GovernmentOffice', 'HealthAndBeautyBusiness', 'HomeAndConstructionBusiness',
  'InternetCafe', 'LegalService', 'Library', 'LodgingBusiness', 'MedicalBusiness',
  'ProfessionalService', 'RadioStation', 'RealEstateAgent', 'RecyclingCenter',
  'SelfStorage', 'ShoppingCenter', 'SportsActivityLocation', 'Store', 'TelevisionStation',
  'TouristInformationCenter', 'TravelAgency', 'Plumber', 'Electrician', 'Locksmith',
  'Restaurant', 'Hotel', 'Hospital', 'Pharmacy', 'Gym',
]);

function geoEntityClarityAudit($, html) {
  const scripts = $('script[type="application/ld+json"]');

  if (scripts.length === 0) {
    return {
      name: '[GEO] Organization Entity Clarity',
      status: 'fail',
      score: 0,
      maxScore: 100,
      message: 'No JSON-LD structured data found.',
      recommendation:
        'Add Organization or LocalBusiness schema with a complete description, sameAs links, and logo. ' +
        'AI models use this data as their primary source for understanding and describing your business.',
    };
  }

  let orgData = null;

  scripts.each((_, el) => {
    if (orgData) return;
    try {
      const data = JSON.parse($(el).html());
      const objects = data['@graph'] ? data['@graph'] : [data];
      for (const obj of objects) {
        const type = obj['@type'];
        if (type && (ORG_TYPES.has(type) || (typeof type === 'string' && type.includes('Business')))) {
          orgData = obj;
          break;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  if (!orgData) {
    return {
      name: '[GEO] Organization Entity Clarity',
      status: 'fail',
      score: 0,
      maxScore: 100,
      message: 'No Organization or LocalBusiness schema found.',
      recommendation:
        'Add an Organization or LocalBusiness JSON-LD block. Include at minimum: name, description, url, sameAs, and logo. ' +
        'The "description" field is the most important — it is what AI models use to describe your business in generated answers.',
    };
  }

  let score = 0;
  const foundFields = [];
  const missingFields = [];

  // name (20 pts)
  if (orgData.name && String(orgData.name).trim()) {
    score += 20;
    foundFields.push('name');
  } else {
    missingFields.push('name');
  }

  // description (25 pts — most valuable)
  if (orgData.description && String(orgData.description).trim()) {
    score += 25;
    foundFields.push('description');
  } else {
    missingFields.push('description');
  }

  // url (15 pts)
  if (orgData.url && String(orgData.url).trim()) {
    score += 15;
    foundFields.push('url');
  } else {
    missingFields.push('url');
  }

  // sameAs (20 pts)
  const sameAs = orgData.sameAs;
  if (sameAs && (Array.isArray(sameAs) ? sameAs.length > 0 : String(sameAs).trim())) {
    score += 20;
    foundFields.push('sameAs');
  } else {
    missingFields.push('sameAs');
  }

  // logo or image (20 pts)
  if (orgData.logo || orgData.image) {
    score += 20;
    foundFields.push('logo/image');
  } else {
    missingFields.push('logo/image');
  }

  let status;
  if (score >= 80) status = 'pass';
  else if (score >= 40) status = 'warn';
  else status = 'fail';

  const detailParts = [];
  if (foundFields.length) detailParts.push(`Present: ${foundFields.join(', ')}`);
  if (missingFields.length) detailParts.push(`Missing: ${missingFields.join(', ')}`);

  const recommendations = [];
  if (missingFields.includes('description'))
    recommendations.push('"description" is the highest-impact missing field — write 1-3 sentences covering what you do, where you operate, and what makes you distinctive. AI models cite this verbatim.');
  if (missingFields.includes('sameAs'))
    recommendations.push('Add "sameAs" links to your Google Business Profile, Yelp, LinkedIn, or Wikidata entry. This dramatically increases entity confidence in AI knowledge graphs.');
  if (missingFields.includes('logo/image'))
    recommendations.push('Add a "logo" field with an ImageObject or direct URL — AI-generated responses often include brand imagery when available.');
  if (missingFields.includes('name'))
    recommendations.push('Add a "name" field to your Organization schema — this is the entity identifier used by AI engines.');
  if (missingFields.includes('url'))
    recommendations.push('Add a "url" field pointing to your canonical homepage.');

  return {
    name: '[GEO] Organization Entity Clarity',
    status,
    score,
    maxScore: 100,
    message:
      score === 100
        ? `Organization entity schema is complete (${orgData['@type']}).`
        : `Organization schema found (${orgData['@type']}) but missing key fields (${score}/100).`,
    details: detailParts.join(' · ') || undefined,
    recommendation: recommendations.length > 0 ? recommendations.join(' ') : undefined,
  };
}

module.exports = geoEntityClarityAudit;
