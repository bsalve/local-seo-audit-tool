const AUDIT_NAME = '[Technical] Security Headers';

const HEADERS = [
  {
    key: 'strict-transport-security',
    label: 'Strict-Transport-Security (HSTS)',
    fix: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains" to your server response headers. This tells browsers to always use HTTPS for your domain.',
  },
  {
    key: 'x-frame-options',
    label: 'X-Frame-Options',
    fix: 'Add "X-Frame-Options: SAMEORIGIN" to prevent your site from being embedded in iframes on other domains (clickjacking protection).',
  },
  {
    key: 'x-content-type-options',
    label: 'X-Content-Type-Options',
    fix: 'Add "X-Content-Type-Options: nosniff" to prevent browsers from MIME-sniffing responses away from the declared content type.',
  },
  {
    key: 'referrer-policy',
    label: 'Referrer-Policy',
    fix: 'Add "Referrer-Policy: strict-origin-when-cross-origin" to control how much referrer information is sent with requests.',
  },
];

module.exports = function checkSecurityHeaders($, html, url, meta) {
  const headers = meta?.headers ?? {};
  const present = [];
  const missing = [];

  for (const h of HEADERS) {
    if (headers[h.key]) {
      present.push(h.label);
    } else {
      missing.push(h);
    }
  }

  const score = present.length * 25;
  const status = present.length === 4 ? 'pass' : present.length >= 2 ? 'warn' : 'fail';

  if (present.length === 4) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'All 4 security headers are present.',
      details: present.join(' | '),
    };
  }

  const missingLabels = missing.map((h) => `  • ${h.label}`).join('\n    ');
  const fixes = missing.map((h) => `  • ${h.label}: ${h.fix}`).join('\n    ');

  return {
    name: AUDIT_NAME,
    status,
    score,
    message: `${missing.length} security header(s) missing.`,
    details: `Present: ${present.length > 0 ? present.join(', ') : 'none'}\n    Missing:\n    ${missingLabels}`,
    recommendation: 'Security headers protect users and signal trustworthiness to search engines. Add the following:\n    ' + fixes,
  };
};
