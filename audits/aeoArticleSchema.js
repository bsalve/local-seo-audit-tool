const AUDIT_NAME = '[AEO] Article Schema';

const ARTICLE_TYPES = ['Article', 'BlogPosting', 'NewsArticle', 'TechArticle', 'ScholarlyArticle'];

function findArticle(data) {
  const items = Array.isArray(data) ? data : [data];
  for (const item of items) {
    if (ARTICLE_TYPES.includes(item['@type'])) return item;
    if (Array.isArray(item['@graph'])) {
      const found = item['@graph'].find((n) => ARTICLE_TYPES.includes(n['@type']));
      if (found) return found;
    }
  }
  return null;
}

module.exports = function checkArticleSchema($, html) {
  let article = null;

  $('script[type="application/ld+json"]').each((_, el) => {
    if (article) return;
    try {
      article = findArticle(JSON.parse($(el).html()));
    } catch { /* skip */ }
  });

  if (!article) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'No Article / BlogPosting / NewsArticle schema found.',
      recommendation:
        'If this page is an article, blog post, or news story, add Article JSON-LD with at minimum: ' +
        'headline, author (Person with name), datePublished, and publisher (Organization with name + logo). ' +
        'Article schema unlocks rich results in Google and increases AI citation likelihood.',
    };
  }

  let score = 0;
  const present = [];
  const missing = [];

  if (article.headline) { score += 25; present.push('headline'); }
  else missing.push('headline (25 pts)');

  const hasAuthor = article.author && (
    typeof article.author === 'string' ||
    article.author.name ||
    article.author['@type']
  );
  if (hasAuthor) { score += 25; present.push('author'); }
  else missing.push('author (25 pts)');

  if (article.datePublished) { score += 20; present.push('datePublished'); }
  else missing.push('datePublished (20 pts)');

  const hasPublisher = article.publisher && (
    typeof article.publisher === 'string' || article.publisher.name
  );
  if (hasPublisher) { score += 20; present.push('publisher'); }
  else missing.push('publisher (20 pts)');

  if (article.image) { score += 10; present.push('image'); }
  else missing.push('image (10 pts)');

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';
  const typeLabel = article['@type'] || 'Article';

  return {
    name: AUDIT_NAME,
    status,
    score,
    message: score >= 80
      ? `${typeLabel} schema is complete (${score}/100).`
      : `${typeLabel} schema found but incomplete (${score}/100).`,
    details: `Present: ${present.join(', ')}${missing.length ? ` | Missing: ${missing.join(', ')}` : ''}`,
    ...(missing.length && {
      recommendation:
        'Complete your Article schema to maximise rich result eligibility and AI citation signals. ' +
        'Add the missing fields:\n    • ' + missing.join('\n    • '),
    }),
  };
};
