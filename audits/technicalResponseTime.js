const AUDIT_NAME = '[Technical] Server Response Time';

// Google's TTFB thresholds: Good < 800ms, Needs Improvement < 1800ms, Poor >= 1800ms
const GOOD_MS  = 800;
const POOR_MS  = 1800;

module.exports = function checkResponseTime($, html, url, meta) {
  const ms = meta?.responseTimeMs ?? null;

  if (ms === null) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'Response time could not be measured.',
    };
  }

  const display = ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;

  if (ms < GOOD_MS) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `Server response time is ${display} — Good.`,
      details: `Threshold: < ${GOOD_MS}ms (Google "Good" TTFB band)`,
    };
  }

  if (ms < POOR_MS) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: `Server response time is ${display} — Needs improvement.`,
      details: `Threshold: < ${GOOD_MS}ms for Good, < ${POOR_MS}ms for Needs Improvement`,
      recommendation:
        'A slow server response (TTFB) delays everything on the page. ' +
        'Common causes: shared hosting, no caching, slow database queries, or large server-side processing. ' +
        'Consider adding server-side caching, upgrading your hosting plan, or using a CDN.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'fail',
    score: 0,
    message: `Server response time is ${display} — Poor.`,
    details: `Threshold: < ${GOOD_MS}ms for Good. Your server took ${display} to respond.`,
    recommendation:
      'A response time above 1.8s is a significant performance problem and a confirmed Google ranking signal. ' +
      'Immediate actions: enable server-side caching (Redis, Varnish, or full-page cache), ' +
      'move to a VPS or dedicated server, optimise database queries, and use a CDN to serve content closer to users.',
  };
};
