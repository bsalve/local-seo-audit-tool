<script setup>
const route = useRoute()
useHead({ title: 'Shared Report — SignalGrade' })

const report = ref(null)
const error  = ref('')

function gradeColor(score) {
  if (score >= 90) return '#34d399'
  if (score >= 80) return '#4d9fff'
  if (score >= 70) return '#ffb800'
  if (score >= 60) return '#ff8800'
  return '#ff4455'
}

function statusIcon(s) {
  return s === 'pass' ? '✓' : s === 'warn' ? '△' : '✕'
}

function auditTypeLabel(t) {
  return t === 'site' ? 'Site Audit' : t === 'multi' ? 'Compare Audit' : 'Page Audit'
}

onMounted(async () => {
  try {
    report.value = await $fetch(`/api/share/${route.params.token}`)
  } catch (e) {
    error.value = e.data?.message || 'Report not found or the link has expired.'
  }
})
</script>

<template>
  <div>
    <AppNav>
      <a href="/" class="nav-link">← SignalGrade</a>
    </AppNav>

    <div class="share-page">
      <div v-if="error" class="share-error">{{ error }}</div>

      <template v-if="report">
        <div class="share-header">
          <div class="share-label">Shared Report</div>
          <div class="share-domain">{{ report.url }}</div>
          <div class="share-meta">
            {{ auditTypeLabel(report.audit_type) }} ·
            {{ new Date(report.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}
          </div>
        </div>

        <div class="share-score-block" :style="`border-top: 3px solid ${gradeColor(report.score)}`">
          <div class="share-grade" :style="`color:${gradeColor(report.score)}`">{{ report.grade }}</div>
          <div class="share-score" :style="`color:${gradeColor(report.score)}`">
            {{ report.score }}<span class="share-denom">/100</span>
          </div>
        </div>

        <div v-if="report.results && report.results.length" class="share-results">
          <div class="share-results-label">Audit Results</div>
          <div v-for="r in report.results" :key="r.name" class="share-row" :class="r.status">
            <span class="share-icon" :class="r.status">{{ statusIcon(r.status) }}</span>
            <div class="share-row-body">
              <div class="share-row-name">{{ r.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '') }}</div>
              <div v-if="r.message" class="share-row-msg">{{ r.message }}</div>
            </div>
            <div v-if="r.normalizedScore != null" class="share-row-score">{{ r.normalizedScore }}/100</div>
          </div>
        </div>

        <div class="share-footer">
          Powered by <a href="/" class="share-footer-link">SignalGrade</a> — search visibility audits
        </div>
      </template>
    </div>

    <AppFooter />
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scrollbar-gutter: stable; }
:root {
  --bg: #0b0c0e; --bg2: #111214; --border: #1e2025; --dim2: #2a2d35;
  --text: #e4e6ea; --muted: #8892a4; --accent: #4d9fff;
  --warn: #ffb800; --fail: #ff4455; --pass: #34d399;
}
body {
  background: var(--bg); color: var(--text);
  font-family: 'Inter', sans-serif; font-size: 14px;
  line-height: 1.5; min-height: 100vh;
}

.nav-link { font-family: 'Space Mono', monospace; font-size: 10px; color: var(--muted); text-decoration: none; letter-spacing: 0.05em; padding: 5px 10px; border-radius: 4px; transition: background 0.15s, color 0.15s; }
.nav-link:hover { background: rgba(228,230,234,0.06); color: var(--text); }

.share-page { max-width: 760px; margin: 0 auto; padding: 48px 32px 80px; }

.share-error { background: rgba(255,68,85,0.08); border: 1px solid rgba(255,68,85,0.3); border-radius: 6px; padding: 16px; font-size: 13px; color: var(--fail); margin-bottom: 24px; }

.share-header { margin-bottom: 24px; }
.share-label { font-family: 'Space Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 8px; }
.share-domain { font-size: 16px; font-weight: 600; color: var(--text); word-break: break-all; margin-bottom: 4px; }
.share-meta { font-size: 12px; color: var(--muted); }

.share-score-block { display: flex; align-items: center; gap: 20px; background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; padding: 24px 28px; margin-bottom: 32px; }
.share-grade { font-family: 'Space Mono', monospace; font-size: 56px; font-weight: 700; line-height: 1; }
.share-score { font-family: 'Space Mono', monospace; font-size: 32px; font-weight: 700; line-height: 1; }
.share-denom { font-size: 16px; color: var(--muted); font-weight: 400; }

.share-results-label { font-family: 'Space Mono', monospace; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin-bottom: 10px; }
.share-row { display: grid; grid-template-columns: 24px 1fr auto; gap: 12px; align-items: start; padding: 12px 0; border-bottom: 1px solid var(--border); }
.share-row:last-child { border-bottom: none; }
.share-icon { font-size: 13px; padding-top: 1px; }
.share-icon.pass { color: var(--pass); }
.share-icon.warn { color: var(--warn); }
.share-icon.fail { color: var(--fail); }
.share-row-name { font-size: 13px; color: var(--text); font-weight: 500; margin-bottom: 2px; }
.share-row-msg { font-size: 12px; color: var(--muted); }
.share-row-score { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--muted); white-space: nowrap; padding-top: 2px; }

.share-footer { margin-top: 48px; font-size: 12px; color: var(--muted); text-align: center; }
.share-footer-link { color: var(--accent); text-decoration: none; }
.share-footer-link:hover { text-decoration: underline; }
</style>
