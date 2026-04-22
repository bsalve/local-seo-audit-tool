const axios = require('axios');

const AUDIT_NAME = '[Technical] Page Speed';
const MOBILE_AUDIT_NAME = '[Technical] Mobile Friendliness';
const CWV_AUDIT_NAME = '[Technical] Core Web Vitals';

// Google's "Good" thresholds for Core Web Vitals
const CWV_THRESHOLDS = {
  lcp: 2500,   // ms — Largest Contentful Paint
  tbt: 200,    // ms — Total Blocking Time (Lighthouse proxy for INP/FID)
  cls: 0.1,    // unitless — Cumulative Layout Shift
};
const PSI_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

// Thresholds match Google's own "Good / Needs Improvement / Poor" bands
const SCORE_GOOD = 90;
const SCORE_POOR = 50;

// The four PSI/Lighthouse audits that directly measure mobile friendliness.
// Each is a binary pass (1) / fail (0); together they make up the 100-point score.
const MOBILE_AUDITS = [
  {
    key: 'viewport',
    label: 'Viewport meta tag',
    fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to your <head>. Without it, mobile browsers render the page at desktop width and scale it down, making text and buttons tiny.',
  },
  {
    key: 'font-size',
    label: 'Legible font sizes',
    fix: 'Ensure body text is at least 16 px on mobile. Small fonts force users to pinch-zoom, increasing bounce rate.',
  },
  {
    key: 'tap-targets',
    label: 'Tap target sizing',
    fix: 'Make buttons and links at least 48 × 48 px with 8 px spacing between them so they are easy to tap on touchscreens.',
  },
  {
    key: 'content-width',
    label: 'Content fits viewport',
    fix: 'Avoid fixed pixel widths wider than the screen. Use max-width: 100% on images and containers so the page does not require horizontal scrolling.',
  },
];

function scoreToStatus(score) {
  if (score >= SCORE_GOOD) return 'pass';
  if (score >= SCORE_POOR) return 'warn';
  return 'fail';
}

function buildSummary(score, audits) {
  const lines = [];

  if (score >= SCORE_GOOD) {
    lines.push(`Performance score is ${score}/100 — Good. Your page loads quickly on mobile.`);
    return { message: lines[0] };
  }

  if (score >= SCORE_POOR) {
    lines.push(`Performance score is ${score}/100 — Needs improvement.`);
  } else {
    lines.push(`Performance score is ${score}/100 — Poor. This will negatively affect search rankings and user retention.`);
  }

  // Pull the most actionable failed/warning opportunities from the PSI response
  const opportunities = Object.values(audits)
    .filter(
      (a) =>
        a.details &&
        a.details.type === 'opportunity' &&
        typeof a.numericValue === 'number' &&
        a.numericValue > 500 // only surface items saving >500 ms
    )
    .sort((a, b) => b.numericValue - a.numericValue)
    .slice(0, 3);

  const recommendations = [];

  if (opportunities.length) {
    recommendations.push('Top opportunities to improve load time:');
    for (const opp of opportunities) {
      const saving = (opp.numericValue / 1000).toFixed(1);
      recommendations.push(`  • ${opp.title} (potential saving: ~${saving}s)`);
    }
  } else {
    // Fallback: surface any failing audits by score impact
    const failing = Object.values(audits)
      .filter((a) => a.score !== null && a.score < 0.9 && a.title)
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1))
      .slice(0, 3);

    if (failing.length) {
      recommendations.push('Areas needing attention:');
      for (const f of failing) {
        recommendations.push(`  • ${f.title}`);
      }
    }
  }

  if (score < SCORE_POOR) {
    recommendations.push(
      'Page speed is a confirmed Google ranking factor. ' +
      'Slow mobile performance increases bounce rate and reduces conversions. ' +
      'Consider compressing images, enabling caching, and minimising render-blocking resources.'
    );
  }

  return {
    message: lines[0],
    recommendation: recommendations.join('\n    '),
  };
}

function buildMobileFriendlinessResult(audits) {
  const pointsEach = Math.floor(100 / MOBILE_AUDITS.length); // 25 per audit
  let score = 0;
  const failing = [];

  for (const { key, label, fix } of MOBILE_AUDITS) {
    const auditScore = audits[key]?.score ?? null;
    if (auditScore === 1) {
      score += pointsEach;
    } else {
      failing.push({ label, fix, displayValue: audits[key]?.displayValue });
    }
  }

  if (failing.length === 0) {
    return {
      name: MOBILE_AUDIT_NAME,
      status: 'pass',
      score: 100,
      message: 'All mobile-friendliness checks passed.',
      details: MOBILE_AUDITS.map((a) => a.label).join(' | '),
    };
  }

  const status = score >= 50 ? 'warn' : 'fail';
  const issueList = failing.map((f) => `  • ${f.label}`).join('\n    ');
  const fixList = failing.map((f) => `  • ${f.label}: ${f.fix}`).join('\n    ');

  return {
    name: MOBILE_AUDIT_NAME,
    status,
    score,
    message: `${failing.length} mobile-friendliness issue(s) found:\n    ${issueList}`,
    recommendation:
      'Mobile usability is a Google ranking factor. Fix the following:\n    ' + fixList,
  };
}

async function checkPageSpeed($, html, url) {
  let response;

  try {
    response = await axios.get(PSI_API, {
      params: {
        url,
        strategy: 'mobile',
        // axios serialises arrays as repeated keys: category=performance&category=seo
        category: ['performance', 'seo'],
        ...(process.env.PAGESPEED_API_KEY && { key: process.env.PAGESPEED_API_KEY }),
      },
      timeout: 60000,
    });
  } catch (err) {
    const status = err.response?.status;
    const isTimeout = !status && err.code === 'ECONNABORTED';
    const hint =
      status === 429
        ? 'The PageSpeed Insights API rate limit was hit. Wait a minute and try again, or add an API key via the PAGESPEED_API_KEY environment variable.'
        : status === 400
        ? 'The URL was rejected by the PageSpeed Insights API. Ensure it is publicly reachable (not localhost or behind a login).'
        : isTimeout
        ? 'PageSpeed Insights could not analyze this site within the time limit. This usually means the site blocks automated analysis tools (including Google\'s own Lighthouse crawler). Try auditing a different URL.'
        : `Network error contacting PageSpeed Insights API: ${err.message}`;

    const errorResult = {
      status: 'fail',
      score: 0,
      message: 'Could not retrieve PageSpeed Insights data.',
      recommendation: hint,
    };

    return [
      { name: AUDIT_NAME, ...errorResult },
      { name: MOBILE_AUDIT_NAME, ...errorResult },
      { name: CWV_AUDIT_NAME, ...errorResult },
    ];
  }

  const data = response.data;
  const categories = data.lighthouseResult?.categories;
  const audits = data.lighthouseResult?.audits ?? {};

  if (!categories?.performance) {
    const errorResult = {
      status: 'fail',
      score: 0,
      message: 'PageSpeed Insights returned an unexpected response structure.',
      recommendation:
        'The API response did not include a performance category. ' +
        'Ensure the target URL is a publicly accessible HTML page.',
    };
    return [
      { name: AUDIT_NAME, ...errorResult },
      { name: MOBILE_AUDIT_NAME, ...errorResult },
      { name: CWV_AUDIT_NAME, ...errorResult },
    ];
  }

  // --- Page Speed result ---
  const rawScore = categories.performance.score;
  const perfScore = Math.round(rawScore * 100);
  const lcp = audits['largest-contentful-paint']?.displayValue ?? 'n/a';
  const tbt = audits['total-blocking-time']?.displayValue ?? 'n/a';
  const cls = audits['cumulative-layout-shift']?.displayValue ?? 'n/a';
  const { message: perfMessage, recommendation: perfRec } = buildSummary(perfScore, audits);

  // LCP element identification — available in the PSI response
  const lcpElAudit = audits['largest-contentful-paint-element'];
  const lcpSnippet =
    lcpElAudit?.details?.items?.[0]?.node?.snippet ||
    lcpElAudit?.details?.items?.[0]?.snippet ||
    null;

  const pageSpeedResult = {
    name: AUDIT_NAME,
    status: scoreToStatus(perfScore),
    score: perfScore,
    message: perfMessage,
    recommendation: perfRec,
    details: `Core Web Vitals (mobile) — LCP: ${lcp} | TBT: ${tbt} | CLS: ${cls}${lcpSnippet ? `\nLCP element: ${lcpSnippet}` : ''}`,
  };

  // --- Mobile Friendliness result ---
  const mobileResult = buildMobileFriendlinessResult(audits);

  // --- Core Web Vitals result ---
  const lcpMs = audits['largest-contentful-paint']?.numericValue ?? null;
  const tbtMs = audits['total-blocking-time']?.numericValue ?? null;
  const clsVal = audits['cumulative-layout-shift']?.numericValue ?? null;

  let cwvResult;
  if (lcpMs === null && tbtMs === null && clsVal === null) {
    cwvResult = {
      name: CWV_AUDIT_NAME,
      status: 'warn',
      score: 50,
      message: 'Core Web Vitals data could not be retrieved from PageSpeed Insights.',
    };
  } else {
    const lcpGood = lcpMs !== null && lcpMs <= CWV_THRESHOLDS.lcp;
    const tbtGood = tbtMs !== null && tbtMs <= CWV_THRESHOLDS.tbt;
    const clsGood = clsVal !== null && clsVal <= CWV_THRESHOLDS.cls;
    const goodCount = [lcpGood, tbtGood, clsGood].filter(Boolean).length;

    const score = goodCount === 3 ? 100 : goodCount === 2 ? 60 : 20;
    const status = goodCount === 3 ? 'pass' : goodCount === 2 ? 'warn' : 'fail';

    const detailParts = [
      `LCP: ${lcp} (threshold ≤${CWV_THRESHOLDS.lcp / 1000}s) — ${lcpGood ? 'Good' : 'Needs improvement'}`,
      `TBT: ${tbt} (threshold ≤${CWV_THRESHOLDS.tbt}ms) — ${tbtGood ? 'Good' : 'Needs improvement'}`,
      `CLS: ${cls} (threshold ≤${CWV_THRESHOLDS.cls}) — ${clsGood ? 'Good' : 'Needs improvement'}`,
    ];

    const failing = [];
    if (!lcpGood) failing.push(`LCP ${lcp} — use faster hosting, preload hero images, and defer non-critical JS`);
    if (!tbtGood) failing.push(`TBT ${tbt} — reduce long JavaScript tasks, split code, and defer third-party scripts`);
    if (!clsGood) failing.push(`CLS ${cls} — set explicit width/height on images and avoid inserting content above existing elements`);

    cwvResult = {
      name: CWV_AUDIT_NAME,
      status,
      score,
      message:
        goodCount === 3
          ? `All Core Web Vitals are in the "Good" range. LCP: ${lcp} | TBT: ${tbt} | CLS: ${cls}`
          : `${3 - goodCount} Core Web Vital(s) need improvement. LCP: ${lcp} | TBT: ${tbt} | CLS: ${cls}`,
      details: detailParts.join('\n    '),
      ...(failing.length && {
        recommendation:
          'Core Web Vitals are a Google ranking signal. Improve the following:\n    • ' +
          failing.join('\n    • '),
      }),
    };
  }

  return [pageSpeedResult, mobileResult, cwvResult];
}

module.exports = checkPageSpeed;
