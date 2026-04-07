function aeoFaqSchemaAudit($, html) {
  const AEO_TYPES = ['FAQPage', 'QAPage', 'HowTo'];
  const scripts = $('script[type="application/ld+json"]');

  if (scripts.length === 0) {
    return {
      name: '[AEO] FAQ / Q&A Schema',
      status: 'fail',
      score: 0,
      maxScore: 100,
      message: 'No JSON-LD structured data found on this page.',
      recommendation:
        'Add FAQPage or HowTo schema markup to signal answer-ready content to AI search engines. ' +
        'FAQPage schema enables People Also Ask rich results and is parsed directly by Gemini and ChatGPT. ' +
        'Example: <script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage",' +
        '"mainEntity":[{"@type":"Question","name":"What services do you offer?","acceptedAnswer":{"@type":"Answer","text":"We offer..."}}]}</script>',
    };
  }

  let foundType = null;
  let entityCount = 0;

  scripts.each((_, el) => {
    if (foundType) return;
    try {
      const data = JSON.parse($(el).html());
      const objects = data['@graph'] ? data['@graph'] : [data];
      for (const obj of objects) {
        const type = obj['@type'];
        if (AEO_TYPES.includes(type)) {
          foundType = type;
          if (type === 'FAQPage' || type === 'QAPage') {
            const entities = obj.mainEntity;
            entityCount = Array.isArray(entities) ? entities.length : 0;
          } else if (type === 'HowTo') {
            const steps = obj.step;
            entityCount = Array.isArray(steps) ? steps.length : 0;
          }
          break;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  if (!foundType) {
    return {
      name: '[AEO] FAQ / Q&A Schema',
      status: 'fail',
      score: 0,
      maxScore: 100,
      message: 'No FAQPage, QAPage, or HowTo schema found.',
      recommendation:
        'Add FAQPage schema with at least 3 Q&A pairs to qualify for People Also Ask rich results. ' +
        'These schema types are among the strongest signals for answer engine optimization.',
    };
  }

  const entityLabel = foundType === 'HowTo' ? 'steps' : 'Q&A pairs';

  if (entityCount === 0) {
    return {
      name: '[AEO] FAQ / Q&A Schema',
      status: 'warn',
      score: 40,
      maxScore: 100,
      message: `${foundType} schema found but has no ${entityLabel}.`,
      details: `Schema type: ${foundType}`,
      recommendation: `Populate the ${foundType} schema with at least 3 ${entityLabel}. Google requires populated content to generate a rich result — an empty schema type is ignored.`,
    };
  }

  if (entityCount < 3) {
    return {
      name: '[AEO] FAQ / Q&A Schema',
      status: 'warn',
      score: 70,
      maxScore: 100,
      message: `${foundType} schema found with ${entityCount} ${entityLabel}. Add more for stronger rich result eligibility.`,
      details: `Schema type: ${foundType} · ${entityLabel}: ${entityCount}`,
      recommendation: `Expand to at least 3 ${entityLabel} to maximize rich result eligibility and AI citation potential.`,
    };
  }

  return {
    name: '[AEO] FAQ / Q&A Schema',
    status: 'pass',
    score: 100,
    maxScore: 100,
    message: `${foundType} schema found with ${entityCount} ${entityLabel}.`,
    details: `Schema type: ${foundType} · ${entityLabel}: ${entityCount}`,
  };
}

module.exports = aeoFaqSchemaAudit;
