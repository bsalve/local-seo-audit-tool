const AUDIT_NAME = '[Technical] Mixed Content';

const SELECTORS = [
  { sel: 'img[src^="http://"]',    type: 'image' },
  { sel: 'script[src^="http://"]', type: 'script' },
  { sel: 'iframe[src^="http://"]', type: 'iframe' },
  { sel: 'link[href^="http://"]',  type: 'stylesheet' },
  { sel: 'audio[src^="http://"]',  type: 'audio' },
  { sel: 'video[src^="http://"]',  type: 'video' },
];

module.exports = function checkMixedContent($, html, url) {
  let isHttps;
  try {
    isHttps = new URL(url).protocol === 'https:';
  } catch {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'Could not determine page protocol from URL.',
    };
  }

  if (!isHttps) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'Page is served over HTTP — mixed content check requires HTTPS.',
      recommendation:
        'Migrate to HTTPS first. Mixed content becomes a concern only once your site is on HTTPS.',
    };
  }

  const found = [];
  for (const { sel, type } of SELECTORS) {
    $(sel).each((_, el) => {
      const attr = el.attribs.src || el.attribs.href;
      found.push({ type, url: attr });
    });
  }

  if (found.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'No mixed content found — all resources are loaded over HTTPS.',
    };
  }

  const list = found.map((f) => `  • [${f.type}] ${f.url}`).join('\n    ');
  const score = found.length <= 2 ? 60 : 20;
  const status = found.length <= 2 ? 'warn' : 'fail';

  return {
    name: AUDIT_NAME,
    status,
    score,
    message: `${found.length} mixed content resource(s) found — HTTP assets on an HTTPS page.`,
    details: `Mixed content:\n    ${list}`,
    recommendation:
      'Browsers block or warn about HTTP resources on HTTPS pages, breaking functionality and eroding user trust. ' +
      'Update all resource URLs to HTTPS. If an external resource is HTTP-only, find an HTTPS alternative or self-host it.',
  };
};
