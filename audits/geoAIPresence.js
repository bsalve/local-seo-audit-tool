'use strict';

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

module.exports = async function ($, html, url, meta) {
  const name = '[GEO] AI Search Presence';

  if (!process.env.PERPLEXITY_API_KEY) {
    return {
      name,
      status: 'warn',
      score: 50,
      maxScore: 100,
      message: 'PERPLEXITY_API_KEY not set — check skipped.',
      recommendation: 'Add PERPLEXITY_API_KEY to .env to enable live AI search presence checks.',
    };
  }

  let host;
  try {
    host = new URL(meta?.finalUrl || url).hostname.replace(/^www\./, '');
  } catch {
    host = url;
  }

  // Extract brand name: og:site_name > first title segment > domain
  const brand =
    $('meta[property="og:site_name"]').attr('content')?.trim() ||
    $('title').text().split(/[-–|]/)[0].trim() ||
    host;

  const query = `What is ${brand} and what does their website ${host} offer?`;

  try {
    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: query }],
        max_tokens: 400,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      return {
        name, status: 'warn', score: 50, maxScore: 100,
        message: `Perplexity API returned ${res.status} — check skipped.`,
      };
    }

    const data = await res.json();
    const responseText = data.choices?.[0]?.message?.content || '';
    const citations    = data.citations || [];

    const inCitations = citations.some((c) => String(c).includes(host));
    const inText      = responseText.toLowerCase().includes(host.toLowerCase());

    if (inCitations) {
      return {
        name, status: 'pass', score: 100, maxScore: 100,
        message: `${host} was cited by Perplexity AI in response to a brand query.`,
        details: `Query: "${query}"\nCited sources: ${citations.slice(0, 3).join(', ')}`,
      };
    } else if (inText) {
      return {
        name, status: 'warn', score: 60, maxScore: 100,
        message: `${host} was mentioned in AI response text but not in cited sources.`,
        recommendation: 'Improve structured data (Organization schema, sameAs links) and publish authoritative content to increase citation likelihood.',
        details: `Query: "${query}"`,
      };
    } else {
      return {
        name, status: 'fail', score: 0, maxScore: 100,
        message: `${host} was not found in Perplexity AI search results for a brand query.`,
        recommendation: 'Build GEO signals: add Organization schema with sameAs links, publish content that answers questions about your brand, and ensure your domain is crawlable by AI bots.',
        details: `Query: "${query}"`,
      };
    }
  } catch {
    return {
      name, status: 'warn', score: 50, maxScore: 100,
      message: 'AI presence check timed out or failed — skipped.',
      recommendation: 'Check PERPLEXITY_API_KEY and network connectivity.',
    };
  }
};
