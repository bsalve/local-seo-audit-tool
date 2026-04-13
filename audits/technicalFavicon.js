const axios = require('axios');

const AUDIT_NAME = '[Technical] Favicon';

module.exports = async function checkFavicon($, html, url) {
  // Check DOM first
  const domFavicon = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').first();

  if (domFavicon.length) {
    const href = domFavicon.attr('href');
    if (href) {
      return {
        name: AUDIT_NAME,
        status: 'pass',
        score: 100,
        message: 'Favicon declared in HTML.',
        details: `<link rel="${domFavicon.attr('rel')}" href="${href}">`,
      };
    }
  }

  // Fall back: HEAD /favicon.ico
  let origin;
  try {
    origin = new URL(url).origin;
  } catch {
    return {
      name: AUDIT_NAME,
      status: 'fail',
      score: 0,
      message: 'No favicon found — could not parse URL to check /favicon.ico.',
    };
  }

  try {
    const res = await axios.head(`${origin}/favicon.ico`, {
      timeout: 5000,
      validateStatus: () => true,
      headers: { 'User-Agent': 'LocalSEOAuditBot/1.0' },
    });

    if (res.status === 200) {
      return {
        name: AUDIT_NAME,
        status: 'warn',
        score: 70,
        message: 'Favicon found at /favicon.ico but not declared in HTML.',
        details: `${origin}/favicon.ico is reachable (HTTP ${res.status}).`,
        recommendation:
          'Add an explicit <link rel="icon" href="/favicon.ico"> tag inside your <head>. ' +
          'Without it, some browsers and crawlers may not detect your favicon reliably.',
      };
    }
  } catch {
    // network error — fall through to fail
  }

  return {
    name: AUDIT_NAME,
    status: 'fail',
    score: 0,
    message: 'No favicon found in HTML or at /favicon.ico.',
    recommendation:
      'Add a favicon to improve brand recognition in browser tabs, bookmarks, and search results. ' +
      'Create a 32×32px .ico or .png file, upload it to your server root, and add ' +
      '<link rel="icon" href="/favicon.ico"> inside your <head>.',
  };
};
