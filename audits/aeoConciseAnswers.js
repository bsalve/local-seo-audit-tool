const AUDIT_NAME = '[AEO] Concise Answer Paragraphs';

const SNIPPET_MIN = 20;
const SNIPPET_MAX = 80;

module.exports = function checkConciseAnswers($) {
  const $clone = $.load($.html());
  $clone('script, style, nav, footer, header, aside, noscript, [role="navigation"]').remove();

  const paragraphs = [];
  $clone('body p').each((_, el) => {
    const text = $clone(el).text().replace(/\s+/g, ' ').trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    if (words >= 5) paragraphs.push(words); // ignore near-empty <p> tags
  });

  if (paragraphs.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 40,
      message: 'No meaningful paragraphs found on this page.',
      recommendation:
        'Structure your content using <p> tags with clear, self-contained answer paragraphs. ' +
        'Aim for at least 3 paragraphs in the 20–80 word range for voice search and snippet readiness.',
    };
  }

  const snippetReady = paragraphs.filter((w) => w >= SNIPPET_MIN && w <= SNIPPET_MAX).length;
  const longest = Math.max(...paragraphs);
  const total = paragraphs.length;

  if (snippetReady >= 3) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `${snippetReady} of ${total} paragraph(s) are snippet-ready (${SNIPPET_MIN}–${SNIPPET_MAX} words).`,
      details: `Total paragraphs: ${total} | Snippet-ready: ${snippetReady} | Longest: ${longest} words`,
    };
  }

  if (snippetReady >= 1) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: `${snippetReady} of ${total} paragraph(s) are snippet-ready — aim for at least 3.`,
      details: `Total paragraphs: ${total} | Snippet-ready: ${snippetReady} | Longest: ${longest} words`,
      recommendation:
        'Add more concise, self-contained paragraphs in the 20–80 word range. Each should answer ' +
        'a specific question or make a single clear point. This makes it easier for Google and AI ' +
        'engines to extract and surface your content as a direct answer.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 40,
    message: `No snippet-ready paragraphs found — content is in dense blocks (longest: ${longest} words).`,
    details: `Total paragraphs: ${total} | Snippet-ready (${SNIPPET_MIN}–${SNIPPET_MAX} words): 0 | Longest: ${longest} words`,
    recommendation:
      'Your content appears to be written in long, dense blocks that are difficult for search engines ' +
      'and AI systems to extract as direct answers. Break long paragraphs into focused chunks of 20–80 words, ' +
      'each addressing a single point or question. Use subheadings to separate topics.',
  };
};
