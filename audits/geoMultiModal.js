const AUDIT_NAME = '[GEO] Multi-Modal Content';

const VIDEO_PLATFORMS = [
  'youtube.com', 'youtu.be', 'vimeo.com', 'wistia.com', 'wistia.net',
  'loom.com', 'dailymotion.com', 'twitch.tv', 'facebook.com/video',
  'videopress.com', 'rumble.com', 'brightcove.com',
];

function isVideoEmbed(src) {
  if (!src) return false;
  try {
    const hostname = new URL(src).hostname.toLowerCase();
    return VIDEO_PLATFORMS.some((p) => hostname.includes(p));
  } catch {
    return false;
  }
}

module.exports = function checkMultiModal($) {
  // Video: <video> element or <iframe> from known video platforms
  const hasVideoElement = $('video').length > 0;
  const hasVideoEmbed = $('iframe').toArray().some((el) => isVideoEmbed($(el).attr('src')));
  const hasVideo = hasVideoElement || hasVideoEmbed;

  // Audio: <audio> element
  const hasAudio = $('audio').length > 0;

  const details = [
    `Video: ${hasVideo ? (hasVideoElement ? '<video> element' : 'embedded iframe') : 'none'}`,
    `Audio: ${hasAudio ? '<audio> element' : 'none'}`,
  ].join(' | ');

  if (hasVideo && hasAudio) {
    return {
      name: AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'Page contains both video and audio content — strong multi-modal signal.',
      details,
    };
  }

  if (hasVideo) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 70,
      message: 'Video content found — consider adding audio or a podcast embed for fuller multi-modal coverage.',
      details,
      recommendation:
        'Video content is a strong GEO signal. Adding a complementary audio embed or podcast player ' +
        'would make this page even more likely to be cited by AI systems that value diverse content formats.',
    };
  }

  if (hasAudio) {
    return {
      name: AUDIT_NAME,
      status: 'warn',
      score: 60,
      message: 'Audio content found — consider adding video for stronger multi-modal signals.',
      details,
      recommendation:
        'Audio content is good. Adding a relevant video (e.g. a YouTube explainer or product demo) ' +
        'would significantly strengthen multi-modal signals for AI citation systems.',
    };
  }

  return {
    name: AUDIT_NAME,
    status: 'warn',
    score: 40,
    message: 'No video or audio content detected — page is text and image only.',
    details,
    recommendation:
      'AI systems and search engines favour pages with diverse content formats. ' +
      'Consider embedding a relevant YouTube video, adding a short explainer video, ' +
      'or including a podcast/audio clip. Even one embedded video significantly improves ' +
      'multi-modal signals and can increase time-on-page.',
  };
};
