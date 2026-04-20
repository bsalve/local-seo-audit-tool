'use strict';

const AUDIT_NAME = '[Content] Meta Tags';

// Scoring: 10 points for title, 10 points for description = 20 total
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN  = 70;
const DESC_MAX  = 160;

function checkTitle($) {
  const text = $('title').first().text().trim();

  if (!text) {
    return {
      score: 0,
      status: 'fail',
      message: 'Title tag is missing.',
      recommendation:
        'Add a <title> tag to every page. The title is the single most important ' +
        'on-page SEO element — it appears in search results and browser tabs. ' +
        `Keep it between ${TITLE_MIN}–${TITLE_MAX} characters and include your primary keyword and city/region.`,
    };
  }

  if (text.length < TITLE_MIN) {
    return {
      score: 5,
      status: 'warn',
      message: `Title tag is too short (${text.length} chars). Aim for ${TITLE_MIN}–${TITLE_MAX} characters.`,
      recommendation:
        'Expand your title tag to include your business name, primary service, and location. ' +
        `Example: "Affordable Plumber in Austin, TX | Joe's Plumbing" (${TITLE_MIN}–${TITLE_MAX} chars).`,
      details: text,
    };
  }

  if (text.length > TITLE_MAX) {
    return {
      score: 5,
      status: 'warn',
      message: `Title tag is too long (${text.length} chars). Google truncates titles above ~${TITLE_MAX} characters.`,
      recommendation:
        `Shorten your title to ${TITLE_MIN}–${TITLE_MAX} characters so it displays in full on search results pages. ` +
        'Prioritize your keyword and location at the front of the title.',
      details: text,
    };
  }

  return {
    score: 10,
    status: 'pass',
    message: `Title tag is present and well-sized (${text.length} chars).`,
    details: text,
  };
}

function checkDescription($) {
  const content = $('meta[name="description"]').attr('content') || '';
  const text    = content.trim();

  if (!text) {
    return {
      score: 0,
      status: 'fail',
      message: 'Meta description tag is missing.',
      recommendation:
        'Add a <meta name="description"> tag to every page. While not a direct ranking factor, ' +
        'a compelling description improves click-through rate from search results. ' +
        `Keep it between ${DESC_MIN}–${DESC_MAX} characters and include a call to action.`,
    };
  }

  if (text.length < DESC_MIN) {
    return {
      score: 5,
      status: 'warn',
      message: `Meta description is too short (${text.length} chars). Aim for ${DESC_MIN}–${DESC_MAX} characters.`,
      recommendation:
        'Expand your meta description to give searchers a reason to click. ' +
        'Include your primary service, location, and a call to action such as ' +
        '"Call us today for a free quote in [City]."',
      details: text,
    };
  }

  if (text.length > DESC_MAX) {
    return {
      score: 5,
      status: 'warn',
      message: `Meta description is too long (${text.length} chars). Google truncates descriptions above ~${DESC_MAX} characters.`,
      recommendation:
        `Trim your meta description to ${DESC_MIN}–${DESC_MAX} characters so the full message ` +
        'appears in search results without being cut off. Front-load the most important information.',
      details: text,
    };
  }

  return {
    score: 10,
    status: 'pass',
    message: `Meta description is present and well-sized (${text.length} chars).`,
    details: text,
  };
}

// Uses the $ already fetched by the caller — no extra HTTP request needed.
function checkMetaTags($, html, url) {
  const titleResult = checkTitle($);
  const descResult  = checkDescription($);

  const totalScore    = titleResult.score + descResult.score;
  const overallStatus =
    titleResult.status === 'fail' || descResult.status === 'fail' ? 'fail' :
    titleResult.status === 'warn' || descResult.status === 'warn' ? 'warn' : 'pass';

  const checks = [];
  if (titleResult.status !== 'pass') checks.push(`Title: ${titleResult.message}`);
  if (descResult.status  !== 'pass') checks.push(`Description: ${descResult.message}`);

  const recommendations = [];
  if (titleResult.recommendation) recommendations.push(`Title — ${titleResult.recommendation}`);
  if (descResult.recommendation)  recommendations.push(`Description — ${descResult.recommendation}`);

  return {
    name: AUDIT_NAME,
    status: overallStatus,
    score: totalScore,
    maxScore: 20,
    message:
      overallStatus === 'pass'
        ? `Both title and meta description are present and correctly sized. (${totalScore}/20)`
        : checks.join(' | '),
    recommendation: recommendations.length ? recommendations.join('\n    ') : undefined,
    details: [
      titleResult.details ? `Title: "${titleResult.details}"`       : null,
      descResult.details  ? `Description: "${descResult.details}"` : null,
    ].filter(Boolean).join('\n    ') || undefined,
  };
}

module.exports = checkMetaTags;
