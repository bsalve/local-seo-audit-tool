const AUDIT_NAME = '[Technical] HTTP Compression';

const COMPRESSED_ENCODINGS = ['gzip', 'br', 'zstd', 'deflate'];

module.exports = function checkCompression($, html, url, meta) {
  const encoding = (meta?.headers?.['content-encoding'] ?? '').toLowerCase();
  const matched = COMPRESSED_ENCODINGS.find((enc) => encoding.includes(enc));

  if (matched) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `Compression is enabled (${matched}).`,
      details: `Content-Encoding: ${encoding}`,
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'fail',
    score: 0,
    message: 'HTTP compression is not enabled.',
    details: encoding ? `Content-Encoding: ${encoding}` : 'No Content-Encoding header found.',
    recommendation:
      'Enable gzip or Brotli compression on your web server. ' +
      'Compressed responses are typically 60–80% smaller, directly improving page load speed and Core Web Vitals. ' +
      'For Apache: add "AddOutputFilterByType DEFLATE text/html text/css application/javascript" to .htaccess. ' +
      'For Nginx: add "gzip on;" to your server block. ' +
      'For Cloudflare or a CDN: enable compression in the dashboard.',
  };
};
