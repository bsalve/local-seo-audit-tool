const AUDIT_NAME = '[GEO] Review Content Visible';

const REVIEW_CLASS_PATTERN = /\b(review|testimonial|feedback|rating|quote|customer|client)\b/i;
const STAR_PATTERN = /[★⭐✭✩☆]{2,}|(\d(\.\d)?)\s*(?:out\s+of\s+)?(?:\/\s*)?\d\s*stars?/i;

module.exports = function checkReviewContent($) {
  const signals = new Set();

  // 1. <blockquote> elements (common testimonial container)
  if ($('blockquote').length > 0) signals.add('blockquote element(s)');

  // 2. Elements with review/testimonial class or id
  $('[class], [id]').each((_, el) => {
    const cls = ($(el).attr('class') || '') + ' ' + ($(el).attr('id') || '');
    if (REVIEW_CLASS_PATTERN.test(cls)) { signals.add('review/testimonial element'); return false; }
  });

  // 3. <cite> elements (attribution in quotes)
  if ($('cite').length > 0) signals.add('cite attribution');

  // 4. Star rating patterns in visible text
  const bodyText = $('body').clone().find('script, style').remove().end().text();
  if (STAR_PATTERN.test(bodyText)) signals.add('star rating pattern');

  // 5. Quoted attribution: text with "said" or "says" or "—" near a name
  const attributionPattern = /[""]([^""]{20,})[""]\s*[—\-–]\s*[A-Z][a-z]+/;
  if (attributionPattern.test(bodyText)) signals.add('quoted attribution');

  const count = signals.size;

  if (count >= 2) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `${count} review/testimonial signal(s) found on this page.`,
      details: [...signals].join(' | '),
    };
  }

  if (count === 1) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: '1 review signal found — adding more testimonial content would strengthen trust signals.',
      details: [...signals].join(' | '),
      recommendation:
        'Include at least 2–3 customer testimonials with names and attribution. ' +
        'Use <blockquote> with a <cite> tag for each. Star ratings alongside quotes add further credibility. ' +
        'Social proof directly increases conversion rates and trust signals for both users and AI systems.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 50,
    message: 'No visible review or testimonial content detected.',
    recommendation:
      'Add customer testimonials or reviews to your page. Visible social proof builds trust with visitors ' +
      'and signals credibility to AI systems. Use <blockquote>...<cite>— Customer Name</cite></blockquote> ' +
      'and pair with AggregateRating schema for maximum impact.',
  };
};
