const AUDIT_NAME = '[GEO] Source Citations';

module.exports = function checkCitations($, html) {
  const signals = new Set();

  // 1. <cite> elements
  if ($('cite').length > 0) signals.add('cite elements');

  // 2. <blockquote> with attribution (cite attr, or followed by em-dash + text)
  $('blockquote').each((_, el) => {
    if ($(el).attr('cite')) { signals.add('attributed blockquote'); return false; }
    const next = $(el).next();
    if (next.length && /^[\u2014\u2013—–-]/.test(next.text().trim())) {
      signals.add('attributed blockquote');
      return false;
    }
  });
  if ($('blockquote').length > 0 && !signals.has('attributed blockquote')) {
    signals.add('blockquote');
  }

  // 3. References / Sources / Bibliography heading
  const headingPattern = /\b(sources?|references?|bibliography|further\s+reading|footnotes?|citations?)\b/i;
  $('h1, h2, h3, h4, h5, h6').each((_, el) => {
    if (headingPattern.test($(el).text())) { signals.add('references section'); return false; }
  });

  // 4. Inline numbered citations: [1], [2], (1) as superscripts or bracketed text
  const bodyText = $('body').text();
  if (/\[\d+\]/.test(bodyText) || $('sup a, a sup').length > 0) {
    signals.add('numbered inline citations');
  }

  // 5. <sup> elements near links (footnote-style)
  if ($('sup').length >= 2) signals.add('superscript footnotes');

  const count = signals.size;

  if (count >= 2) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `${count} citation signal(s) found — content appears well-sourced.`,
      details: [...signals].join(' | '),
    };
  }

  if (count === 1) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: '1 citation signal found — consider adding more source attribution.',
      details: [...signals].join(' | '),
      recommendation:
        'AI systems are more likely to cite pages that clearly attribute their claims. ' +
        'Add a "Sources" or "References" section, use <cite> elements for quoted content, ' +
        'or include numbered inline citations linking to primary sources.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 50,
    message: 'No citation or source attribution signals found.',
    recommendation:
      'Pages with clear source attribution are trusted and cited more often by AI systems. ' +
      'Consider adding a "Sources" heading with links to supporting data, wrapping quotes in ' +
      '<blockquote cite="URL">, or using <cite> for author/publication references.',
  };
};
