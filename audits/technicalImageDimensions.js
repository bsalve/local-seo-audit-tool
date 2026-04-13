const AUDIT_NAME = '[Technical] Image Dimensions';

module.exports = function checkImageDimensions($) {
  const imgs = $('img');
  const total = imgs.length;

  if (total === 0) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'No images found on this page.',
    };
  }

  const missing = [];
  imgs.each((_, el) => {
    const hasWidth  = el.attribs.width  !== undefined && el.attribs.width  !== '';
    const hasHeight = el.attribs.height !== undefined && el.attribs.height !== '';
    if (!hasWidth || !hasHeight) {
      missing.push(el.attribs.src || el.attribs['data-src'] || '(no src)');
    }
  });

  if (missing.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: `All ${total} image(s) have explicit width and height attributes.`,
    };
  }

  const pct = Math.round((missing.length / total) * 100);
  const score = pct < 50 ? 60 : 20;
  const status = pct < 50 ? 'warn' : 'fail';
  const sampleList = missing.slice(0, 5).map((s) => `  • ${s}`).join('\n    ');
  const moreNote = missing.length > 5 ? `\n    … and ${missing.length - 5} more` : '';

  return {
    name: AUDIT_NAME,
    status,
    score,
    message: `${missing.length} of ${total} image(s) (${pct}%) are missing width and/or height attributes.`,
    details: `Images without dimensions (first 5):\n    ${sampleList}${moreNote}`,
    recommendation:
      'Missing width and height attributes cause Cumulative Layout Shift (CLS) — the browser cannot ' +
      'reserve space for images before they load, causing content to jump around. ' +
      'Add explicit width and height to every <img> tag matching its natural dimensions: ' +
      '<img src="..." width="800" height="600" alt="...">',
  };
};
