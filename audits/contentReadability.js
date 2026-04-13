const AUDIT_NAME = '[Content] Readability';

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  // Count vowel groups as syllable approximation
  const matches = word.match(/[aeiouy]+/g);
  let count = matches ? matches.length : 1;
  // Silent trailing 'e'
  if (word.length > 2 && word.endsWith('e') && !/[aeiouy]e$/.test(word.slice(-3))) count--;
  return Math.max(1, count);
}

function gradeLabel(fre) {
  if (fre >= 90) return 'Very Easy (5th grade)';
  if (fre >= 70) return 'Easy (6th grade)';
  if (fre >= 60) return 'Standard (7th–9th grade)';
  if (fre >= 50) return 'Fairly Difficult (10th–12th grade)';
  if (fre >= 30) return 'Difficult (college level)';
  return 'Very Confusing (college graduate)';
}

module.exports = function checkReadability($, html, url) {
  // Clone and strip non-content elements
  const $clone = $.load($.html());
  $clone('script, style, nav, footer, header, noscript, aside, [role="navigation"]').remove();
  const text = $clone('body').text().replace(/\s+/g, ' ').trim();

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 100) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: `Not enough content to assess readability (${words.length} words found, minimum 100 required).`,
      recommendation: 'Add more body copy to allow a meaningful readability assessment.',
    };
  }

  // Count sentences (split on terminal punctuation)
  const sentenceMatches = text.match(/[^.!?]*[.!?]+/g) || [];
  const sentences = Math.max(1, sentenceMatches.length);

  // Count syllables
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const fre = 206.835
    - 1.015  * (words.length / sentences)
    - 84.6   * (totalSyllables / words.length);

  const freRounded = Math.round(fre * 10) / 10;
  const label = gradeLabel(freRounded);

  const score  = freRounded >= 60 ? 100 : freRounded >= 30 ? 60 : 20;
  const status = freRounded >= 60 ? 'pass' : freRounded >= 30 ? 'warn' : 'fail';

  const message = freRounded >= 60
    ? `Content is easy to read (FRE: ${freRounded} — ${label}).`
    : freRounded >= 30
    ? `Content readability needs improvement (FRE: ${freRounded} — ${label}).`
    : `Content is very difficult to read (FRE: ${freRounded} — ${label}).`;

  return {
    name: AUDIT_NAME,
    status,
    score,
    message,
    details: `FRE: ${freRounded} | Words: ${words.length} | Sentences: ${sentences} | Grade: ${label}`,
    ...(freRounded < 60 && {
      recommendation:
        'Write for a general audience. Use shorter sentences (aim for 15–20 words), ' +
        'common vocabulary, and active voice. Break long paragraphs into 2–3 sentence chunks. ' +
        'A score of 60+ is ideal for most business websites.',
    }),
  };
};
