function aeoSpeakableAudit($, html) {
  const scripts = $('script[type="application/ld+json"]');

  let speakableData = null;

  scripts.each((_, el) => {
    if (speakableData) return;
    try {
      const data = JSON.parse($(el).html());
      const objects = data['@graph'] ? data['@graph'] : [data];
      for (const obj of objects) {
        if (obj.speakable !== undefined) {
          speakableData = obj.speakable;
          break;
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  if (!speakableData) {
    return {
      name: '[AEO] Speakable Schema',
      status: 'fail',
      score: 0,
      maxScore: 100,
      message: 'No Speakable schema markup found.',
      recommendation:
        'Speakable schema tells Google Assistant which sections of your page are suitable for text-to-speech. ' +
        'Add a "speakable" property to your page\'s JSON-LD with a SpeakableSpecification listing CSS selectors for your key content. ' +
        'While still uncommon, this is a growing AEO signal for voice-first AI interfaces.',
    };
  }

  const spec = Array.isArray(speakableData) ? speakableData[0] : speakableData;
  const cssSelectors = spec && spec.cssSelector ? [].concat(spec.cssSelector) : [];
  const xPaths = spec && spec.xPath ? [].concat(spec.xPath) : [];

  if (cssSelectors.length === 0 && xPaths.length === 0) {
    return {
      name: '[AEO] Speakable Schema',
      status: 'warn',
      score: 50,
      maxScore: 100,
      message: 'Speakable schema found but no cssSelector or xPath specified.',
      recommendation:
        'The speakable property requires a SpeakableSpecification with a "cssSelector" or "xPath" value pointing to the content Google Assistant should read. ' +
        'Example: {"speakable":{"@type":"SpeakableSpecification","cssSelector":["h1",".summary"]}}',
    };
  }

  // Check if at least one CSS selector resolves in the DOM
  const resolves = cssSelectors.some((sel) => {
    try {
      return $(sel).length > 0;
    } catch {
      return false;
    }
  });

  if (!resolves && cssSelectors.length > 0) {
    return {
      name: '[AEO] Speakable Schema',
      status: 'warn',
      score: 60,
      maxScore: 100,
      message: 'Speakable schema found but CSS selectors do not match any page elements.',
      details: `Selectors defined: ${cssSelectors.join(', ')}`,
      recommendation:
        'The CSS selectors in your speakable schema do not match elements in the current HTML. ' +
        'Verify that the selector paths are correct and point to visible content on the page.',
    };
  }

  return {
    name: '[AEO] Speakable Schema',
    status: 'pass',
    score: 100,
    maxScore: 100,
    message: 'Speakable schema found with valid selectors that resolve in the DOM.',
    details: cssSelectors.length > 0 ? `Selectors: ${cssSelectors.join(', ')}` : `xPath configured`,
  };
}

module.exports = aeoSpeakableAudit;
