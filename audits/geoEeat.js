function geoEeatAudit($) {
  const found = [];
  const missing = [];

  // 1. Author byline (25 pts)
  const hasAuthor =
    $('[rel="author"]').length > 0 ||
    $('[itemprop="author"]').length > 0 ||
    $('[data-author]').length > 0 ||
    $('*').filter((_, el) => {
      const cls = $(el).attr('class') || '';
      return /\bauthor\b/i.test(cls);
    }).length > 0;

  if (hasAuthor) found.push('Author byline');
  else missing.push('Author byline');

  // 2. Publication/updated date (25 pts)
  const hasDate =
    $('time[datetime]').length > 0 ||
    $('[itemprop="datePublished"]').length > 0 ||
    $('[itemprop="dateModified"]').length > 0 ||
    $('meta[property="article:published_time"]').length > 0 ||
    $('meta[property="article:modified_time"]').length > 0;

  if (hasDate) found.push('Publication date');
  else missing.push('Publication date');

  // 3. About page link (25 pts)
  const hasAbout = $('a').filter((_, el) => {
    const href = $(el).attr('href') || '';
    return /\/about/i.test(href);
  }).length > 0;

  if (hasAbout) found.push('About page link');
  else missing.push('About page link');

  // 4. Contact page link (25 pts)
  const hasContact = $('a').filter((_, el) => {
    const href = $(el).attr('href') || '';
    return /\/contact/i.test(href);
  }).length > 0;

  if (hasContact) found.push('Contact page link');
  else missing.push('Contact page link');

  const score = found.length * 25;
  let status;
  if (score >= 75) status = 'pass';
  else if (score >= 25) status = 'warn';
  else status = 'fail';

  const detailParts = [];
  if (found.length) detailParts.push(`Found: ${found.join(', ')}`);
  if (missing.length) detailParts.push(`Missing: ${missing.join(', ')}`);

  const recommendations = [];
  if (!hasAuthor)
    recommendations.push('Add an author byline using rel="author" or itemprop="author" — AI models prefer pages with clear human authorship.');
  if (!hasDate)
    recommendations.push('Add a <time datetime="YYYY-MM-DD"> element or article:published_time meta tag — recency is a key trust signal for AI citations.');
  if (!hasAbout)
    recommendations.push('Link to an /about page — AI models treat institutional transparency as an authority signal.');
  if (!hasContact)
    recommendations.push('Link to a /contact page — contactability signals trustworthiness to both AI engines and users.');

  return {
    name: '[GEO] E-E-A-T Signals',
    status,
    score,
    maxScore: 100,
    message:
      score === 100
        ? 'All 4 E-E-A-T signals detected.'
        : `${found.length} of 4 E-E-A-T signals detected (${score}/100).`,
    details: detailParts.join(' · ') || undefined,
    recommendation: recommendations.length > 0 ? recommendations.join(' ') : undefined,
  };
}

module.exports = geoEeatAudit;
