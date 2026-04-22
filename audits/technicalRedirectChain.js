const axios = require('axios');

const AUDIT_NAME = '[Technical] Redirect Chain';
const MAX_HOPS = 10;
const TIMEOUT  = 8000;

module.exports = async function checkRedirectChain($, html, url) {
  const chain = [];
  let current = url;

  try {
    for (let i = 0; i < MAX_HOPS; i++) {
      const res = await axios.get(current, {
        maxRedirects: 0,
        validateStatus: () => true,
        timeout: TIMEOUT,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' },
      });

      chain.push({ url: current, status: res.status });

      if (res.status >= 300 && res.status < 400 && res.headers.location) {
        current = new URL(res.headers.location, current).href;
      } else {
        break;
      }
    }
  } catch (err) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'Could not check redirects — network error.',
      recommendation: `Error: ${err.message}`,
    };
  }

  const hops = chain.length - 1; // number of redirects before final destination

  if (hops === 0) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'No redirects — URL loads directly.',
      details: `Final status: ${chain[0]?.status}`,
    };
  }

  const chainDisplay = chain.map((c, i) => `  ${i + 1}. ${c.url} (${c.status})`).join('\n    ');
  const lastStatus = chain[chain.length - 1]?.status;
  const firstRedirectCode = chain[0]?.status;

  if (hops === 1 && firstRedirectCode === 301) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: 'Single 301 redirect detected.',
      details: `Redirect chain:\n    ${chainDisplay}`,
      recommendation:
        'A single permanent (301) redirect is generally acceptable, but a direct URL is always preferable. ' +
        'Update any links pointing to the old URL to point directly to the final destination.',
    };
  }

  if (hops === 1 && firstRedirectCode === 302) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'Single 302 (temporary) redirect detected.',
      details: `Redirect chain:\n    ${chainDisplay}`,
      recommendation:
        'Temporary (302) redirects do not pass link equity to the destination URL. ' +
        'If this redirect is permanent, change it to a 301. ' +
        'If it is intentionally temporary, consider linking directly to the final URL in your content.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'fail',
    score: 20,
    message: `Redirect chain detected — ${hops} hop(s) before reaching the final URL.`,
    details: `Redirect chain:\n    ${chainDisplay}`,
    recommendation:
      'Redirect chains waste crawl budget and dilute link equity with each additional hop. ' +
      'Update all redirects to point directly to the final destination URL using a single 301.',
  };
};
