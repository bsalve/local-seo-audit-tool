const AUDIT_NAME = '[GEO] Service Area Content';

const US_STATES = [
  'Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut',
  'Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa',
  'Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan',
  'Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
  'New Hampshire','New Jersey','New Mexico','New York','North Carolina',
  'North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island',
  'South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont',
  'Virginia','Washington','West Virginia','Wisconsin','Wyoming',
  // Common abbreviations
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

const GEO_PHRASE_PATTERN = /\b(serving|based in|located in|near|in the|serving the|we serve|our .{0,20}area|coverage area)\b/i;

function hasAreaServed(data) {
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (item.areaServed) return true;
    if (Array.isArray(item['@graph']) && item['@graph'].some((n) => n.areaServed)) return true;
  }
  return false;
}

module.exports = function checkServiceAreaContent($, html) {
  // 1. Check schema for areaServed
  let schemaAreaServed = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    if (schemaAreaServed) return;
    try { schemaAreaServed = hasAreaServed(JSON.parse($(el).html())); } catch { /* skip */ }
  });

  // 2. Extract body text and find geographic mentions
  const $clone = $.load($.html());
  $clone('script, style, nav, footer').remove();
  const bodyText = $clone('body').text().replace(/\s+/g, ' ');

  // Find state names in text
  const foundStates = US_STATES.filter((state) => {
    const escaped = state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${escaped}\\b`).test(bodyText);
  });
  const uniqueStates = [...new Set(foundStates.filter((s) => s.length > 2))]; // exclude abbreviations for display

  // Find geographic phrases
  const hasGeoPhrases = GEO_PHRASE_PATTERN.test(bodyText);

  const textMentions = uniqueStates.length + (hasGeoPhrases ? 1 : 0);

  // Score
  if (schemaAreaServed && textMentions >= 1) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'Service area declared in schema and mentioned in page content.',
      details: `areaServed in schema: yes | Geographic mentions: ${uniqueStates.length > 0 ? uniqueStates.slice(0, 5).join(', ') : 'geographic phrases found'}`,
    };
  }

  if (textMentions >= 2) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: `Geographic area mentioned in content (${uniqueStates.length > 0 ? uniqueStates.slice(0, 3).join(', ') : 'location phrases found'}) but not declared in schema.`,
      details: `areaServed in schema: no | States/areas found in text: ${uniqueStates.slice(0, 5).join(', ') || 'geographic phrases'}`,
      recommendation:
        'Add areaServed to your LocalBusiness or Service schema to formally declare your coverage area. ' +
        'Example: "areaServed": [{"@type": "City", "name": "Austin"}, {"@type": "State", "name": "Texas"}]',
    };
  }

  if (schemaAreaServed) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: 'areaServed declared in schema but no geographic area mentioned in visible content.',
      recommendation:
        'Reinforce your schema by also mentioning your service area naturally in page copy — ' +
        'e.g. "Serving the greater Austin, TX area." Visible geographic text helps both users ' +
        'and AI systems confirm your local relevance.',
    };
  }

  if (textMentions === 1) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'Limited geographic content found — consider expanding your service area signals.',
      details: `States found: ${uniqueStates.join(', ') || 'none'} | Geographic phrases: ${hasGeoPhrases ? 'yes' : 'no'}`,
      recommendation:
        'Mention your city, state, or service region explicitly in your page content and add ' +
        'areaServed to your schema. Strong local geographic signals improve both local SEO rankings ' +
        'and AI system geographic targeting.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 40,
    message: 'No service area or geographic signals found on this page.',
    recommendation:
      'For local businesses, explicitly stating your service area is critical. ' +
      'Add your city/state to your page copy ("We serve Austin, TX and surrounding areas"), ' +
      'and declare areaServed in your LocalBusiness or Service JSON-LD schema.',
  };
};
