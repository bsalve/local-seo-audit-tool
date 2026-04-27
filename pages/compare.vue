<script setup>
definePageMeta({ middleware: 'auth' })
useHead({ title: 'Compare Audits — SignalGrade' })

const route = useRoute()

const reportA = ref(null)
const reportB = ref(null)
const loading = ref(true)
const error = ref(null)

function gradeColor(score) {
  if (score >= 90) return '#34d399'
  if (score >= 80) return '#4d9fff'
  if (score >= 70) return '#ffb800'
  if (score >= 60) return '#ff8800'
  return '#ff4455'
}

function stripPrefix(name) {
  return name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '')
}

const diff = computed(() => {
  if (!reportA.value?.results_json || !reportB.value?.results_json) return null
  const aResults = reportA.value.results_json
  const bResults = reportB.value.results_json
  const aMap = {}
  for (const r of aResults) aMap[r.name] = r
  const regressions = []
  const improvements = []
  const unchanged = []
  for (const b of bResults) {
    const a = aMap[b.name]
    if (!a) continue
    const aScore = a.normalizedScore ?? 0
    const bScore = b.normalizedScore ?? 0
    const delta = bScore - aScore
    const row = { name: stripPrefix(b.name), aScore, bScore, delta }
    if (delta < 0) regressions.push(row)
    else if (delta > 0) improvements.push(row)
    else unchanged.push(row)
  }
  regressions.sort((x, y) => x.delta - y.delta)
  improvements.sort((x, y) => y.delta - x.delta)
  return { regressions, improvements, unchanged }
})

const showUnchanged = ref(false)

const scoreDelta = computed(() => {
  if (!reportA.value || !reportB.value) return null
  return (reportB.value.score ?? 0) - (reportA.value.score ?? 0)
})

onMounted(async () => {
  const aId = route.query.a
  const bId = route.query.b
  if (!aId || !bId) { error.value = 'Missing report IDs.'; loading.value = false; return }
  try {
    const [a, b] = await Promise.all([
      $fetch(`/api/reports/${aId}`),
      $fetch(`/api/reports/${bId}`),
    ])
    reportA.value = a
    reportB.value = b
  } catch (e) {
    error.value = 'Could not load reports. They may have been deleted.'
  }
  loading.value = false
})
</script>

<template>
  <div>
    <AppNav>
      <AppNavAuth>
        <a href="/pricing" class="nav-link">Pricing</a>
        <a href="/docs" class="nav-link">API Docs</a>
        <a href="/dashboard" class="nav-link">Dashboard</a>
        <a href="/account" class="nav-link">Account</a>
      </AppNavAuth>
    </AppNav>

    <div class="page">
      <div class="page-header">
        <div>
          <div class="page-title">Audit Comparison</div>
          <div class="page-subtitle"><a href="/dashboard" class="back-link">← Back to Dashboard</a></div>
        </div>
      </div>

      <div v-if="loading" class="state-msg">Loading reports…</div>
      <div v-else-if="error" class="state-msg state-error">{{ error }}</div>

      <template v-else-if="reportA && reportB">

        <!-- Score delta hero -->
        <div class="compare-hero">
          <div class="compare-side">
            <div class="compare-side-label">Older</div>
            <div class="compare-date">{{ reportA.dateFormatted || new Date(reportA.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</div>
            <div class="compare-grade" :style="`color:${gradeColor(reportA.score ?? 0)}`">{{ reportA.grade }}</div>
            <div class="compare-score" :style="`color:${gradeColor(reportA.score ?? 0)}`">{{ reportA.score ?? '—' }}<span class="compare-denom">/100</span></div>
          </div>
          <div class="compare-arrow">→</div>
          <div class="compare-side">
            <div class="compare-side-label">Newer</div>
            <div class="compare-date">{{ reportB.dateFormatted || new Date(reportB.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }}</div>
            <div class="compare-grade" :style="`color:${gradeColor(reportB.score ?? 0)}`">{{ reportB.grade }}</div>
            <div class="compare-score" :style="`color:${gradeColor(reportB.score ?? 0)}`">{{ reportB.score ?? '—' }}<span class="compare-denom">/100</span></div>
          </div>
          <div v-if="scoreDelta !== null" class="compare-delta" :class="scoreDelta >= 0 ? 'delta-pos' : 'delta-neg'">
            {{ scoreDelta >= 0 ? '+' : '' }}{{ scoreDelta }} pts
          </div>
        </div>

        <div v-if="!reportA.results_json || !reportB.results_json" class="state-msg">
          Per-check comparison is only available for audits run after this feature was added.
        </div>

        <template v-else-if="diff">

          <!-- Regressions -->
          <div v-if="diff.regressions.length > 0" class="compare-section">
            <div class="section-label label-fail">Regressions ({{ diff.regressions.length }})</div>
            <table class="diff-table">
              <thead><tr><th>Check</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
              <tbody>
                <tr v-for="row in diff.regressions" :key="row.name">
                  <td class="diff-name">{{ row.name }}</td>
                  <td class="diff-score">{{ row.aScore }}/100</td>
                  <td class="diff-score">{{ row.bScore }}/100</td>
                  <td class="diff-delta delta-neg">{{ row.delta }}&nbsp;pts</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Improvements -->
          <div v-if="diff.improvements.length > 0" class="compare-section">
            <div class="section-label label-pass">Improvements ({{ diff.improvements.length }})</div>
            <table class="diff-table">
              <thead><tr><th>Check</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
              <tbody>
                <tr v-for="row in diff.improvements" :key="row.name">
                  <td class="diff-name">{{ row.name }}</td>
                  <td class="diff-score">{{ row.aScore }}/100</td>
                  <td class="diff-score">{{ row.bScore }}/100</td>
                  <td class="diff-delta delta-pos">+{{ row.delta }}&nbsp;pts</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="diff.regressions.length === 0 && diff.improvements.length === 0" class="state-msg">
            No changes between these two audits.
          </div>

          <!-- Unchanged toggle -->
          <div v-if="diff.unchanged.length > 0" class="compare-section">
            <button class="toggle-btn" @click="showUnchanged = !showUnchanged">
              {{ showUnchanged ? '▾' : '▸' }} Unchanged ({{ diff.unchanged.length }} checks)
            </button>
            <table v-if="showUnchanged" class="diff-table" style="margin-top:12px">
              <thead><tr><th>Check</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
              <tbody>
                <tr v-for="row in diff.unchanged" :key="row.name">
                  <td class="diff-name">{{ row.name }}</td>
                  <td class="diff-score">{{ row.aScore }}/100</td>
                  <td class="diff-score">{{ row.bScore }}/100</td>
                  <td class="diff-delta" style="color:var(--muted)">—</td>
                </tr>
              </tbody>
            </table>
          </div>

        </template>
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
body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1.5; min-height: 100vh; }
</style>

<style scoped>
.nav-link { font-family: 'Space Mono', monospace; font-size: 10px; color: var(--muted); text-decoration: none; letter-spacing: 0.05em; padding: 5px 10px; border-radius: 4px; transition: background 0.15s, color 0.15s; }
.nav-link:hover { background: rgba(228,230,234,0.06); color: var(--text); }

.page { max-width: 1080px; margin: 0 auto; padding: 40px 32px 80px; }
.page-header { margin-bottom: 32px; }
.page-title { font-size: 22px; font-weight: 600; color: var(--text); }
.back-link { font-size: 13px; color: var(--accent); text-decoration: none; margin-top: 4px; display: inline-block; }
.back-link:hover { text-decoration: underline; }

.state-msg { font-size: 14px; color: var(--muted); padding: 32px 0; }
.state-error { color: var(--fail); }

.compare-hero { display: flex; align-items: center; gap: 32px; background: var(--bg2); border: 1px solid var(--border); padding: 28px 32px; margin-bottom: 36px; flex-wrap: wrap; }
.compare-side { text-align: center; min-width: 100px; }
.compare-side-label { font-family: 'Space Mono', monospace; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 6px; }
.compare-date { font-size: 11px; color: var(--muted); margin-bottom: 8px; }
.compare-grade { font-family: 'Space Mono', monospace; font-size: 32px; font-weight: 700; line-height: 1; }
.compare-score { font-family: 'Space Mono', monospace; font-size: 18px; margin-top: 4px; }
.compare-denom { font-size: 12px; color: var(--muted); }
.compare-arrow { font-size: 20px; color: var(--muted); flex-shrink: 0; }
.compare-delta { font-family: 'Space Mono', monospace; font-size: 22px; font-weight: 700; margin-left: auto; }
.delta-pos { color: var(--pass); }
.delta-neg { color: var(--fail); }

.compare-section { margin-bottom: 32px; }
.section-label { font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding-bottom: 12px; margin-bottom: 4px; border-bottom: 1px solid var(--border); }
.label-fail { color: var(--fail); }
.label-pass { color: var(--pass); }

.diff-table { width: 100%; border-collapse: collapse; }
.diff-table thead tr { border-bottom: 1px solid var(--border); }
.diff-table th { text-align: left; font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); padding: 0 12px 10px; }
.diff-table th:first-child { padding-left: 0; }
.diff-table tbody tr { border-bottom: 1px solid var(--border); }
.diff-table tbody tr:hover { background: var(--bg2); }
.diff-table td { padding: 10px 12px; vertical-align: middle; font-size: 13px; }
.diff-table td:first-child { padding-left: 0; }
.diff-name { color: var(--text); }
.diff-score { font-family: 'Space Mono', monospace; font-size: 12px; color: var(--muted); white-space: nowrap; }
.diff-delta { font-family: 'Space Mono', monospace; font-size: 12px; font-weight: 700; white-space: nowrap; }

.toggle-btn { font-family: 'Space Mono', monospace; font-size: 11px; color: var(--muted); background: none; border: none; cursor: pointer; padding: 0; letter-spacing: 0.04em; }
.toggle-btn:hover { color: var(--text); }
</style>
