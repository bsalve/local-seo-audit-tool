'use strict';

const GRADE_LABELS = {
  A: 'Excellent — strong SEO, AEO, and GEO signals across the board.',
  B: 'Good — core signals are solid; targeted AEO or GEO improvements would push this higher.',
  C: 'Average — several SEO, AEO, or GEO signals are missing or weak.',
  D: 'Poor — significant gaps in SEO foundations and AI-readiness signals.',
  F: 'Critical — foundational SEO elements and AI optimisation signals are missing.',
};

function normalizeScore(result) {
  if (result.score !== undefined)
    return Math.round((result.score / (result.maxScore ?? 100)) * 100);
  if (result.status === 'pass') return 100;
  if (result.status === 'warn') return 50;
  return 0;
}

function calcTotalScore(results) {
  if (!results.length) return 0;
  return Math.round(results.reduce((sum, r) => sum + normalizeScore(r), 0) / results.length);
}

function letterGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function gradeSummary(grade, score) {
  return `${grade} (${score}/100) — ${GRADE_LABELS[grade]}`;
}

function buildJsonOutput(url, results, score, grade) {
  return {
    url,
    auditedAt: new Date().toISOString(),
    grade,
    totalScore: score,
    summary: gradeSummary(grade, score),
    results: results.map((r) => ({
      name:            r.name,
      status:          r.status,
      score:           r.score,
      maxScore:        r.maxScore,
      normalizedScore: normalizeScore(r),
      message:         r.message,
      details:         r.details,
      recommendation:  r.recommendation,
    })),
  };
}

module.exports = { normalizeScore, calcTotalScore, letterGrade, gradeSummary, buildJsonOutput };
