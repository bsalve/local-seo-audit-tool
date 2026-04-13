const AUDIT_NAME = '[Content] Image Optimization';

function getExt(src) {
  try {
    const pathname = new URL(src, 'https://x.com').pathname.toLowerCase();
    return pathname.split('.').pop().split('?')[0];
  } catch {
    return '';
  }
}

module.exports = function checkImageOptimization($) {
  const imgs = $('img[src]');
  if (imgs.length === 0) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'No images found on this page — nothing to optimise.',
    };
  }

  let modernCount = 0;
  let gifCount = 0;

  imgs.each((_, el) => {
    const src = $(el).attr('src') || '';
    const ext = getExt(src);
    if (ext === 'webp' || ext === 'avif') modernCount++;
    if (ext === 'gif') gifCount++;
  });

  // Check for captioned images
  const captionedCount = $('figure:has(img):has(figcaption)').length;

  let score = 0;
  const notes = [];

  if (modernCount > 0) {
    score += 50;
    notes.push(`${modernCount} WebP/AVIF image(s)`);
  } else {
    notes.push('0 WebP/AVIF images (legacy formats only)');
  }

  if (captionedCount > 0) {
    score += 30;
    notes.push(`${captionedCount} captioned image(s) (<figcaption>)`);
  } else {
    notes.push('0 captioned images');
  }

  if (gifCount === 0) {
    score += 20;
    notes.push('no GIF files');
  } else {
    notes.push(`${gifCount} GIF file(s) found`);
  }

  const status = score >= 80 ? 'pass' : score >= 50 ? 'warn' : 'fail';

  const recs = [];
  if (modernCount === 0) recs.push('Convert images to WebP or AVIF — typically 25–35% smaller than JPEG/PNG at equal quality. Most image editors and CDNs support this automatically.');
  if (captionedCount === 0) recs.push('Wrap key images in <figure><img ...><figcaption>Description</figcaption></figure>. Captions provide contextual signals for both search engines and AI systems.');
  if (gifCount > 0) recs.push(`Replace ${gifCount} GIF(s) with WebP animations or short MP4/WebM videos — GIFs are significantly larger and slow down page load.`);

  return {
    name: AUDIT_NAME,
    status,
    score,
    message: score >= 80
      ? `Image optimisation is good. ${notes.join(' | ')}.`
      : `Image optimisation needs improvement. ${imgs.length} image(s) on page.`,
    details: notes.join(' | '),
    ...(recs.length && { recommendation: recs.join('\n    ') }),
  };
};
