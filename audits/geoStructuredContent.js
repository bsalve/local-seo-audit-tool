function geoStructuredContentAudit($) {
  let score = 0;
  const found = [];
  const missing = [];

  // 1. Data tables (30 pts) — exclude layout tables (must have <th> or <caption>)
  const dataTables = $('table').filter((_, el) => $(el).find('th, caption').length > 0);
  if (dataTables.length > 0) {
    score += 30;
    found.push(`${dataTables.length} data table${dataTables.length > 1 ? 's' : ''}`);
  } else {
    missing.push('data tables');
  }

  // 2. Ordered lists with 3+ items (35 pts)
  const meaningfulOl = $('ol').filter((_, el) => $(el).children('li').length >= 3);
  if (meaningfulOl.length > 0) {
    score += 35;
    found.push(`${meaningfulOl.length} ordered list${meaningfulOl.length > 1 ? 's' : ''} (3+ items)`);
  } else {
    missing.push('ordered lists (3+ items)');
  }

  // 3. Definition lists (20 pts)
  const dlWithContent = $('dl').filter((_, el) => $(el).find('dt').length > 0 && $(el).find('dd').length > 0);
  if (dlWithContent.length > 0) {
    score += 20;
    found.push(`${dlWithContent.length} definition list${dlWithContent.length > 1 ? 's' : ''}`);
  } else {
    missing.push('definition lists');
  }

  // 4. H2 + H3 hierarchy (15 pts)
  const hasH2 = $('h2').length > 0;
  const hasH3 = $('h3').length > 0;
  if (hasH2 && hasH3) {
    score += 15;
    found.push('H2+H3 heading hierarchy');
  } else {
    missing.push('H2+H3 heading hierarchy');
  }

  let status;
  if (score >= 70) status = 'pass';
  else if (score >= 30) status = 'warn';
  else status = 'fail';

  const detailParts = [];
  if (found.length) detailParts.push(`Found: ${found.join(', ')}`);
  if (missing.length) detailParts.push(`Missing: ${missing.join(', ')}`);

  const recommendations = [];
  if (!meaningfulOl.length)
    recommendations.push('Add ordered lists (<ol>) with 3+ steps or ranked items. Step-by-step lists are among the most-cited content formats in AI-generated answers.');
  if (!dataTables.length)
    recommendations.push('Add comparison or data tables (<table> with <th> headers). Tables are easy for AI models to extract and present as structured facts.');
  if (!dlWithContent.length)
    recommendations.push('Consider using definition lists (<dl>/<dt>/<dd>) for glossary-style or Q&A content — they signal explicit key-value structure to parsers.');
  if (!hasH2 || !hasH3)
    recommendations.push('Use a clear heading hierarchy (H2 for main sections, H3 for subsections). This helps AI models understand content organization and extract relevant sections.');

  return {
    name: '[GEO] Structured Content for AI',
    status,
    score,
    maxScore: 100,
    message:
      score === 100
        ? 'Page uses all major structured content formats — excellent AI parsability.'
        : score >= 70
        ? `Good structured content coverage (${score}/100).`
        : score >= 30
        ? `Some structured content found, but key formats are missing (${score}/100).`
        : `Little structured content detected — AI models may struggle to extract facts (${score}/100).`,
    details: detailParts.join(' · ') || undefined,
    recommendation: recommendations.length > 0 ? recommendations.join(' ') : undefined,
  };
}

module.exports = geoStructuredContentAudit;
