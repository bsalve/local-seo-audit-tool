const axios = require('axios');

const AUDIT_NAME = '[GEO] llms.txt';

async function tryFetch(url) {
  try {
    const res = await axios.get(url, {
      timeout: 8000,
      maxRedirects: 3,
      validateStatus: s => s < 400,
      headers: { 'User-Agent': 'SignalGrade/1.0' },
    });
    return String(res.data);
  } catch {
    return null;
  }
}

module.exports = async function ($, html, url) {
  let baseUrl;
  try {
    const parsed = new URL(url);
    baseUrl = `${parsed.protocol}//${parsed.host}`;
  } catch {
    return { name: AUDIT_NAME, status: 'warn', score: 50, message: 'Could not determine domain root.' };
  }

  const [llms, llmsFull] = await Promise.all([
    tryFetch(`${baseUrl}/llms.txt`),
    tryFetch(`${baseUrl}/llms-full.txt`),
  ]);

  const hasLlms     = llms !== null;
  const hasLlmsFull = llmsFull !== null;
  const mainBody    = llms ?? llmsFull ?? '';
  const charCount   = mainBody.trim().length;

  if (!hasLlms && !hasLlmsFull) {
    return {
      name: AUDIT_NAME,
      status: 'fail',
      score: 0,
      message: 'No llms.txt or llms-full.txt file found.',
      recommendation:
        'Create an /llms.txt file at your domain root to help AI assistants understand your site. ' +
        'This emerging standard (similar to robots.txt) lets you provide context about your business, ' +
        'key pages, and content — improving how AI tools like ChatGPT and Perplexity represent your brand. ' +
        'An /llms-full.txt variant (the complete expanded version) is also supported. See llmstxt.org for the spec.',
    };
  }

  if (hasLlms && charCount < 100) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 60,
      message: 'llms.txt exists but appears empty or minimal.',
      details: `File length: ${charCount} characters${hasLlmsFull ? ' · llms-full.txt also present' : ''}`,
      recommendation:
        'Your /llms.txt file exists but contains very little content. Add a title, a brief description of ' +
        'your business, and links to your most important pages. A well-formed llms.txt helps AI tools ' +
        'accurately summarize and cite your site.',
    };
  }

  const files = [hasLlms && 'llms.txt', hasLlmsFull && 'llms-full.txt'].filter(Boolean).join(' and ');
  return {
    name: AUDIT_NAME,
    status: 'pass',
    score: 100,
    message: `${files} ${hasLlms && hasLlmsFull ? 'are' : 'is'} present and has meaningful content.`,
    details: `${hasLlms ? `llms.txt: ${llms.trim().length} chars` : ''}${hasLlmsFull ? `${hasLlms ? ' · ' : ''}llms-full.txt: ${llmsFull.trim().length} chars` : ''}`,
  };
};
