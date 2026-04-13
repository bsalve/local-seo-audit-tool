const AUDIT_NAME = '[Content] Call to Action';

const CTA_KEYWORDS = [
  'contact', 'book', 'schedule', 'appointment', 'get a quote', 'quote',
  'free', 'buy', 'order', 'sign up', 'get started', 'request', 'reserve',
  'enquire', 'enquiry', 'hire', 'consult', 'consultation', 'message',
  'chat', 'speak', 'talk', 'reach out', 'get in touch', 'learn more',
  'find out', 'discover', 'explore', 'try', 'start', 'join', 'subscribe',
];

function hasCtaText(text) {
  const lower = (text || '').toLowerCase();
  return CTA_KEYWORDS.some((kw) => lower.includes(kw));
}

module.exports = function checkCallToAction($) {
  const found = new Set();

  // Phone links
  if ($('a[href^="tel:"]').length) found.add('phone link (tel:)');

  // Email links
  if ($('a[href^="mailto:"]').length) found.add('email link (mailto:)');

  // Form submit / button inputs
  const submitInputs = $('input[type="submit"], input[type="button"]');
  submitInputs.each((_, el) => {
    const val = $(el).attr('value') || '';
    if (hasCtaText(val) || val) found.add('form submit button');
  });

  // <button> elements
  $('button').each((_, el) => {
    const text = $(el).text().trim();
    const aria = $(el).attr('aria-label') || '';
    if (hasCtaText(text) || hasCtaText(aria)) found.add('CTA button');
  });

  // <a> links with CTA text (exclude tel/mailto already counted)
  $('a[href]:not([href^="tel:"]):not([href^="mailto:"])').each((_, el) => {
    const text = $(el).text().trim();
    const aria = $(el).attr('aria-label') || '';
    if (hasCtaText(text) || hasCtaText(aria)) {
      found.add('CTA link');
      return false; // one is enough
    }
  });

  const foundList = [...found];
  const count = foundList.length;

  if (count === 0) {
    return {
      name: AUDIT_NAME,
      status: 'fail',
      score: 20,
      message: 'No calls to action found on this page.',
      recommendation:
        'Every page should prompt visitors to take the next step. Add a phone number (tel: link), ' +
        'contact form, booking button, or CTA link such as "Get a Free Quote" or "Book an Appointment". ' +
        'For local businesses, a visible phone number and contact button are essential.',
    };
  }

  // Only passive links (tel/mailto) without button/form CTAs
  const hasActiveCtа = found.has('CTA button') || found.has('form submit button') || found.has('CTA link');
  const hasPassiveOnly = !hasActiveCtа && (found.has('phone link (tel:)') || found.has('email link (mailto:)'));

  if (hasPassiveOnly) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 60,
      message: 'Only passive contact links found (tel/mailto) — no button or form CTAs detected.',
      details: `Found: ${foundList.join(', ')}`,
      recommendation:
        'Phone and email links are good, but adding a visible button ("Book Now", "Get a Quote") ' +
        'or contact form increases engagement and conversion rates significantly.',
    };
  }

  if (count === 1) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: `1 call to action type found.`,
      details: `Found: ${foundList.join(', ')}`,
      recommendation:
        'Add a second CTA type (e.g. a phone link alongside a "Book Now" button) to give visitors ' +
        'multiple ways to convert. Multiple CTAs increase overall conversion rate.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'pass',
    score: 100,
    message: `${count} call-to-action type(s) found.`,
    details: `Found: ${foundList.join(', ')}`,
  };
};
