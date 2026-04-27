<script setup>
useHead({ title: 'SignalGrade — Search Visibility Audit' })

onMounted(() => {
  if (typeof window._sgOnMount === 'function') {
    window._sgOnMount()
    return
  }
  // First load — inject script after Vue has rendered the DOM
  const s = document.createElement('script')
  s.src = '/app-main.js'
  document.body.appendChild(s)
})
</script>

<style scoped>
.meta-strip {
  max-width: 1080px;
  margin: 0 auto;
  padding: 9px 32px;
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--muted);
  font-family: 'Space Mono', monospace;
  text-align: center;
}
.nav-link { font-family: 'Space Mono', monospace; font-size: 10px; color: var(--muted); text-decoration: none; letter-spacing: 0.05em; padding: 5px 10px; border-radius: 4px; transition: background 0.15s, color 0.15s; }
.nav-link:hover { background: rgba(228,230,234,0.06); color: var(--text); }
.nav-link-current { color: var(--accent); background: rgba(77,159,255,0.08); pointer-events: none; }
</style>

<template>
  <AppNav>
    <AppNavAuth>
      <a href="/pricing" class="nav-link">Pricing</a>
      <a href="/docs" class="nav-link">API Docs</a>
      <a href="/dashboard" class="nav-link">Dashboard</a>
      <a href="/account" class="nav-link">Account</a>
    </AppNavAuth>
  </AppNav>
  <div class="meta-strip">
    <span class="cat-tag cat-technical">Technical</span>
    <span class="meta-dot">·</span>
    <span class="cat-tag cat-content">Content</span>
    <span class="meta-dot">·</span>
    <span class="cat-tag cat-aeo">AEO</span>
    <span class="meta-dot">·</span>
    <span class="cat-tag cat-geo">GEO</span>
    <span class="meta-dot">·</span>
    <span id="checkCount">81</span> CHECKS · PDF OUTPUT
  </div>
  <div id="app">

    <!-- HERO -->
    <section class="hero">
      <div class="display-block">
        <div class="display-tag">Search Visibility Audit</div>
        <h1 class="display-heading">
          AUDIT YOUR<br>
          <span class="line2"><span class="acc">SEARCH</span></span><br>
          <span class="line2">VISIBILITY</span>
        </h1>
        <p class="display-tagline">Score your site across Google, and across AI.</p>

        <div class="input-area">
          <div class="mode-toggle">
            <button class="mode-btn active" id="modePageBtn" onclick="setMode('page')">Page Audit</button>
            <button class="mode-btn" id="modeSiteBtn" onclick="setMode('site')">Site Audit</button>
            <button class="mode-btn" id="modeMultiBtn" onclick="setMode('multi')">Compare</button>
          </div>
          <div class="crawl-limit-note" id="crawlLimitNote" style="display:none">
            Up to 50 pages per crawl<span class="tier-badge">FREE</span>
          </div>

          <!-- Single URL input (Page + Site modes) -->
          <div id="singleInputWrap">
            <div class="input-descriptor">Target URL</div>
            <div class="input-row">
              <div class="input-prefix">$ audit</div>
              <input type="url" id="urlInput" placeholder="https://yoursite.com"
                     autocomplete="off" spellcheck="false" />
              <button id="auditBtn">Run →</button>
            </div>
          </div>

          <!-- Compare URL input (Compare mode) -->
          <div id="multiInputWrap" style="display:none">
            <div class="input-descriptor">Compare — Label (optional) + URL</div>
            <div id="multiLocRows"></div>
            <div style="max-width:720px;margin:0 auto;display:flex;justify-content:space-between;align-items:center">
              <button id="multiAddRowBtn" onclick="addMultiRow()">+ Add URL</button>
              <div class="multi-limit-note">Up to 10 URLs<span class="tier-badge" style="margin-left:8px">FREE</span></div>
            </div>
            <div class="input-row" style="margin-top:14px">
              <button id="multiAuditBtn" style="flex:1;padding:16px 28px">Run Comparison →</button>
            </div>
          </div>

          <div class="customize-row" id="customizeRow">
            <button class="customize-toggle" onclick="toggleCustomize()">+ Customize Report</button>
            <div class="customize-panel" id="customizePanel" style="display:none">
              <div class="input-descriptor">Agency Logo URL (optional)</div>
              <input type="url" id="logoUrlInput" class="logo-input"
                     placeholder="https://youragency.com/logo.png"
                     autocomplete="off" spellcheck="false" />
              <div style="margin-top:12px;display:flex;align-items:center;gap:8px;font-size:12px;color:var(--muted);">
                <label id="jsRenderLabel" style="display:flex;align-items:center;gap:8px;cursor:pointer;opacity:0.45">
                  <input type="checkbox" id="jsRenderToggle" disabled />
                  <span>JS Rendering — headless browser fetch (React/Vue/Angular SPAs)</span>
                  <span class="tier-badge" style="margin-left:4px">PRO</span>
                </label>
                <span style="font-size:11px;color:var(--muted)">+5–15s</span>
              </div>
            </div>
          </div>

          <div id="statusArea">
            <div id="statusLine" class="status-line" style="display:none">
              <span class="prompt-char">&gt;</span>
              <span id="statusText"></span>
              <span class="cursor"></span>
            </div>
            <div id="progressTrack" class="progress-track" style="display:none">
              <div id="progressFill" class="progress-fill"></div>
            </div>
            <div id="errorLine" class="status-line error-line" style="display:none">
              <span class="prompt-char">!</span>
              <span id="errorText"></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RESULTS -->
    <section id="results">
      <hr class="results-divider" />
      <div id="resultsInner"></div>
    </section>

  </div>

  <footer style="border-top:1px solid var(--border);padding:20px 32px;text-align:center;margin-top:40px;">
    <div style="max-width:1080px;margin:0 auto;display:flex;justify-content:center;gap:24px;">
      <a href="/terms" style="font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);text-decoration:none;letter-spacing:0.05em;">Terms</a>
      <a href="/privacy" style="font-family:'Space Mono',monospace;font-size:11px;color:var(--muted);text-decoration:none;letter-spacing:0.05em;">Privacy</a>
    </div>
  </footer>
</template>
