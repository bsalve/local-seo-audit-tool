const AUDIT_NAME = '[AEO] Featured Snippet Format';

module.exports = function checkFeaturedSnippetFormat($) {
  const $clone = $.load($.html());
  $clone('script, style, nav, footer, header, aside, noscript, [role="navigation"]').remove();

  const firstP = $clone('body p').first();
  if (!firstP.length) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 40,
      message: 'No opening paragraph found in body content.',
      recommendation:
        'Start your page with a concise introductory paragraph (40–60 words) that directly ' +
        'answers the main question or topic of the page. This is the format Google uses for featured snippets.',
    };
  }

  const text = firstP.text().replace(/\s+/g, ' ').trim();
  const words = text.split(/\s+/).filter(Boolean).length;
  const preview = text.length > 100 ? text.slice(0, 100) + '…' : text;

  if (words >= 40 && words <= 60) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `Opening paragraph is ${words} words — ideal featured snippet length (40–60 words).`,
      details: `"${preview}"`,
    };
  }

  if (words >= 25 && words <= 75) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: `Opening paragraph is ${words} words — close to the 40–60 word ideal.`,
      details: `"${preview}"`,
      recommendation:
        words < 40
          ? 'Expand your opening paragraph slightly. Google\'s featured snippets typically extract 40–60 word answers. Add a sentence or two to fully address the topic upfront.'
          : 'Tighten your opening paragraph. Aim for 40–60 words — trim any phrases that don\'t add meaning to the core answer.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 50,
    message: `Opening paragraph is ${words} words — ${words < 25 ? 'too short' : 'too long'} for featured snippet capture.`,
    details: `"${preview}"`,
    recommendation:
      words < 25
        ? 'Your opening paragraph is too brief to win a featured snippet. Write a 40–60 word introductory answer that directly addresses the page topic. This is the most important snippet-capture technique.'
        : 'Your opening paragraph is too long for Google to extract as a featured snippet. Move the core answer to the first 40–60 words and use subsequent sentences for supporting detail.',
  };
};
