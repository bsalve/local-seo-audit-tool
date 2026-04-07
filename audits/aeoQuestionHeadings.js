function aeoQuestionHeadingsAudit($) {
  const headings = $('h2, h3').filter((_, el) => $(el).closest('nav, footer').length === 0);
  const total = headings.length;

  if (total === 0) {
    return {
      name: '[AEO] Question-Based Headings',
      status: 'fail',
      score: 0,
      maxScore: 100,
      message: 'No H2 or H3 headings found on this page.',
      recommendation:
        'Add subheadings (H2/H3) structured as questions (e.g. "What areas do we serve?", "How do I get a quote?"). ' +
        'Voice assistants and AI answer engines use question-phrased headings to identify answer-ready content.',
    };
  }

  const questionHeadings = [];
  headings.each((_, el) => {
    const text = $(el).text().trim();
    if (text.endsWith('?')) questionHeadings.push(text);
  });

  const count = questionHeadings.length;
  const examples = questionHeadings.slice(0, 3).join(' | ');

  let score, status, message;

  if (count === 0) {
    score = 20;
    status = 'warn';
    message = `${total} subheadings found, but none are phrased as questions.`;
  } else if (count === 1) {
    score = 60;
    status = 'warn';
    message = `1 of ${total} subheadings is phrased as a question.`;
  } else if (count === 2) {
    score = 80;
    status = 'warn';
    message = `2 of ${total} subheadings are phrased as questions.`;
  } else {
    score = 100;
    status = 'pass';
    message = `${count} of ${total} subheadings are phrased as questions — strong AEO signal.`;
  }

  return {
    name: '[AEO] Question-Based Headings',
    status,
    score,
    maxScore: 100,
    message,
    details: count > 0 ? `Examples: ${examples}` : undefined,
    recommendation:
      count < 3
        ? 'Aim for at least 3 H2/H3 headings phrased as questions. Use real questions customers ask (e.g. "How much does X cost?", "What is the difference between A and B?"). These are directly extracted by AI search engines to generate answer snippets.'
        : undefined,
  };
}

module.exports = aeoQuestionHeadingsAudit;
