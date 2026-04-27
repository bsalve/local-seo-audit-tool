/* ── Mode toggle ── */
  let currentMode = 'page';
  function setMode(mode) {
    currentMode = mode;
    document.getElementById('modePageBtn').classList.toggle('active', mode === 'page');
    document.getElementById('modeSiteBtn').classList.toggle('active', mode === 'site');
    document.getElementById('modeMultiBtn').classList.toggle('active', mode === 'multi');
    document.getElementById('crawlLimitNote').style.display  = mode === 'site'  ? 'block' : 'none';
    document.getElementById('singleInputWrap').style.display = mode !== 'multi' ? 'block' : 'none';
    document.getElementById('multiInputWrap').style.display  = mode === 'multi' ? 'block' : 'none';
    document.getElementById('customizeRow').style.display    = mode !== 'multi' ? 'block' : 'none';
  }

  /* ── Customize panel ── */
  function toggleCustomize() {
    const panel = document.getElementById('customizePanel');
    const btn   = document.querySelector('.customize-toggle');
    const open  = panel.style.display === 'block';
    panel.style.display = open ? 'none' : 'block';
    btn.textContent     = open ? '+ Customize Report' : '− Customize Report';
  }

  /* ── Step cycling ── */
  const STEPS = [
    'Resolving domain',
    'Fetching page HTML',
    '[Technical] Checking SSL certificate',
    '[Technical] Scanning robots.txt & sitemap',
    '[Technical] Checking canonical URL',
    '[Technical] Checking meta robots',
    '[Technical] Checking internal links',
    '[Technical] Analyzing structured data',
    '[Technical] Checking business hours schema',
    '[Technical] Checking aggregate rating schema',
    '[Technical] Checking geo coordinates',
    '[Technical] Querying PageSpeed Insights',
    '[Technical] Checking mobile friendliness',
    '[Technical] Checking Core Web Vitals',
    '[Technical] Checking hreflang / i18n tags',
    '[Technical] Checking for broken internal links',
    '[Technical] Checking for redirect chains',
    '[Technical] Checking for mixed content',
    '[Technical] Checking security headers',
    '[Technical] Checking compression',
    '[Technical] Checking favicon',
    '[Technical] Checking image dimensions',
    '[Technical] Checking breadcrumb schema',
    '[Technical] Measuring response time',
    '[Technical] Checking mobile viewport tag',
    '[Technical] Checking page indexability',
    '[Technical] Inventorying structured data types',
    '[Technical] Validating schema required fields',
    '[Technical] Checking image lazy loading',
    '[Technical] Detecting HTTP version',
    '[Technical] Checking robots.txt safety',
    '[Technical] Checking canonical chain',
    '[Technical] Validating sitemap URLs',
    '[Technical] Checking accessibility signals',
    '[Technical] Checking pagination tags',
    '[Technical] Checking Cache-Control header',
    '[Technical] Checking Content Security Policy',
    '[Technical] Checking resource hints (preconnect)',
    '[Technical] Checking render-blocking scripts',
    '[Technical] Checking asset minification',
    '[Technical] Checking web app manifest',
    '[Technical] Checking robots.txt crawl delay',
    '[Technical] Checking X-Robots-Tag header',
    '[Content] Auditing meta tags',
    '[Content] Checking title tag',
    '[Content] Checking meta description',
    '[Content] Checking H1 headings',
    '[Content] Checking heading hierarchy',
    '[Content] Analyzing content length',
    '[Content] Checking image alt text',
    '[Content] Auditing Open Graph & social tags',
    '[Content] Checking brand consistency',
    '[Content] Checking NAP consistency',
    '[Content] Checking social media links',
    '[Content] Checking readability score',
    '[Content] Checking content freshness',
    '[Content] Checking outbound links',
    '[Content] Checking calls to action',
    '[Content] Checking image optimization',
    '[Content] Checking og:image reachability',
    '[Content] Analyzing keyword frequency',
    '[AEO] Checking FAQ & question schema',
    '[AEO] Checking speakable markup',
    '[AEO] Analyzing question-based headings',
    '[AEO] Checking video schema',
    '[AEO] Checking how-to schema',
    '[AEO] Checking featured snippet format',
    '[AEO] Checking article schema',
    '[AEO] Checking definition content',
    '[AEO] Checking concise answer paragraphs',
    '[GEO] Auditing E-E-A-T signals',
    '[GEO] Checking organization entity clarity',
    '[GEO] Analyzing structured content',
    '[GEO] Checking privacy & trust signals',
    '[GEO] Checking Google Business Profile link',
    '[GEO] Checking source citations',
    '[GEO] Checking service / product schema',
    '[GEO] Checking author schema',
    '[GEO] Checking review content',
    '[GEO] Checking service area content',
    '[GEO] Checking multi-modal content',
    '[GEO] Checking llms.txt',
    '[GEO] Checking AI crawler access',
    '[GEO] Checking AI search presence',
    'Calculating score',
    'Generating PDF report',
  ];
  const _cc = document.getElementById('checkCount');
  if (_cc) _cc.textContent = STEPS.filter(s => s.startsWith('[')).length;

  let stepInterval = null, currentStep = 0;

  function updateProgress() {
    const pct = Math.round((currentStep / STEPS.length) * 100);
    document.getElementById('progressFill').style.width = pct + '%';
    const label = STEPS[Math.min(currentStep, STEPS.length - 1)];
    document.getElementById('statusText').textContent = label + '...';
  }

  function showProgressUI() {
    document.getElementById('statusLine').style.display = 'flex';
    document.getElementById('progressTrack').style.display = 'block';
    document.getElementById('progressFill').style.width = '0%';
  }

  function startSteps() {
    currentStep = 0;
    showProgressUI();
    updateProgress();
    stepInterval = setInterval(() => {
      if (currentStep < STEPS.length - 1) {
        currentStep++;
        updateProgress();
      }
    }, Math.max(500, Math.round(20000 / STEPS.length)));
  }

  function stopSteps() {
    clearInterval(stepInterval);
    document.getElementById('statusLine').style.display = 'none';
    document.getElementById('progressTrack').style.display = 'none';
  }

  /* ── Animated score counter ── */
  function countUp(el, target, duration = 1200) {
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4); // ease-out-quart
      el.textContent = Math.round(ease * target);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ── Color helpers ── */
  function letterGrade(n) {
    return n >= 90 ? 'A' : n >= 80 ? 'B' : n >= 70 ? 'C' : n >= 60 ? 'D' : 'F';
  }

  function gradeColor(score) {
    if (score >= 90) return 'var(--pass)';
    if (score >= 80) return '#00ccff';
    if (score >= 70) return 'var(--warn)';
    if (score >= 60) return '#ff8800';
    return 'var(--fail)';
  }

  function statusIcon(s) { return s === 'pass' ? '✓' : s === 'warn' ? '△' : '✕'; }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ── Blob download helper ── */
  function downloadBlob(content, filename, type) {
    const blob = new Blob([content], { type });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Page audit export ── */
  function exportPageJSON() {
    if (!window._lastAuditData) return;
    downloadBlob(JSON.stringify(window._lastAuditData, null, 2), 'signalgrade-report.json', 'application/json');
  }

  function exportPageCSV() {
    if (!window._lastAuditData) return;
    const rows = (window._lastAuditData.results || []).map(r =>
      [r.name, r.status, r.normalizedScore !== null && r.normalizedScore !== undefined ? r.normalizedScore : '', r.message || '', r.recommendation || '']
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
    );
    downloadBlob(['name,status,score,message,recommendation', ...rows].join('\n'), 'signalgrade-report.csv', 'text/csv');
  }

  /* ── Site audit export ── */
  function exportSiteJSON() {
    if (!_latestSiteResults.length) return;
    downloadBlob(JSON.stringify({ url: _latestSiteUrl, results: _latestSiteResults }, null, 2), 'signalgrade-site-report.json', 'application/json');
  }

  function exportSiteCSV() {
    if (!_latestSiteResults.length) return;
    const rows = _latestSiteResults.map(r =>
      [r.name, r.fail.length > 0 ? 'fail' : r.warn.length > 0 ? 'warn' : 'pass',
       r.fail.length, r.warn.length, r.pass.length, r.recommendation || '']
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
    );
    downloadBlob(['name,status,failCount,warnCount,passCount,recommendation', ...rows].join('\n'), 'signalgrade-site-report.csv', 'text/csv');
  }

  /* ── Domain display helper ── */
  function toDomain(url) {
    try { return new URL(url).hostname.replace(/^www\./, ''); }
    catch { return url; }
  }

  /* ── Main audit fn ── */
  async function runAudit() {
    if (currentMode === 'multi') { runMultiAudit(); return; }
    const url = document.getElementById('urlInput').value.trim();
    if (!url) { showError('Enter a URL first.'); return; }
    if (currentMode === 'site') { runSiteAudit(url); return; }

    clearError();
    document.getElementById('auditBtn').disabled = true;
    const results = document.getElementById('results');
    results.style.display = 'none';
    results.classList.remove('visible');
    startSteps();

    try {
      const logoUrl  = document.getElementById('logoUrlInput').value.trim();
      const jsRender = document.getElementById('jsRenderToggle')?.checked || false;
      const res  = await fetch('/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, ...(logoUrl && { logoUrl }), ...(jsRender && { jsRender: true }) }),
      });
      const data = await res.json();

      // Fill the progress bar to 100% before showing results
      clearInterval(stepInterval);
      currentStep = STEPS.length;
      document.getElementById('progressFill').style.width = '100%';
      document.getElementById('statusText').textContent = 'Done.';
      await new Promise(resolve => setTimeout(resolve, 600));
      stopSteps();

      if (!res.ok) { handleAuditError(res, data); return; }
      renderResults(data);
      loadGscPanel(url);
      showSavedNote();
      results.style.display = 'block';
      requestAnimationFrame(() => {
        results.scrollIntoView({ behavior: 'smooth' });
        requestAnimationFrame(() => results.classList.add('visible'));
      });
    } catch (err) {
      stopSteps();
      showError('Could not connect to the server. Check your internet connection and try again.');
    } finally {
      document.getElementById('auditBtn').disabled = false;
    }
  }

  function showError(msg, opts = {}) {
    const line = document.getElementById('errorLine');
    const text = document.getElementById('errorText');
    line.style.display = 'flex';
    if (opts.html) {
      text.innerHTML = msg;
    } else {
      text.textContent = msg;
    }
  }
  function clearError() {
    document.getElementById('errorLine').style.display = 'none';
    document.getElementById('errorText').innerHTML = '';
  }

  // Handle structured error responses from the server
  function handleAuditError(res, data) {
    if (res.status === 429) {
      const upgradeLink = '<a href="/account" style="color:var(--accent);text-decoration:underline;">Upgrade your plan</a> for more audits.';
      showError(`Rate limit reached. ${upgradeLink}`, { html: true });
    } else {
      showError(data.error || 'Audit failed. Check the URL and try again.');
    }
  }

  /* ── Category helpers ── */
  function resultCategory(name) {
    if (name.startsWith('[Technical]')) return 'technical';
    if (name.startsWith('[Content]'))  return 'content';
    if (name.startsWith('[AEO]'))      return 'aeo';
    if (name.startsWith('[GEO]'))      return 'geo';
    return 'technical';
  }
  function categoryOrder(name) {
    return { technical: 0, content: 1, aeo: 2, geo: 3 }[resultCategory(name)] ?? 0;
  }
  const CAT_LABELS = {
    technical: { short: 'Technical', full: 'Site Health & Infrastructure' },
    content:   { short: 'Content',   full: 'Marketing & On-Page Signals' },
    aeo:       { short: 'AEO',       full: 'Answer Engine Optimization' },
    geo:       { short: 'GEO',       full: 'Generative Engine Optimization' },
  };

  /* ── Render results ── */
  function renderResults(data) {
    window._lastAuditData = data;
    // Sort: Technical → Content → AEO → GEO, stable within each group
    const results = [...data.results].sort((a, b) => categoryOrder(a.name) - categoryOrder(b.name));

    const pass  = results.filter(r => r.status === 'pass').length;
    const warn  = results.filter(r => r.status === 'warn').length;
    const fail  = results.filter(r => r.status === 'fail').length;
    const color = gradeColor(data.totalScore);

    // Per-category average scores
    function catAvg(prefix) {
      const items = results.filter(r => r.name.startsWith(prefix));
      if (!items.length) return 0;
      return Math.round(items.reduce((s, r) => s + (r.normalizedScore ?? 0), 0) / items.length);
    }
    const catScores = {
      technical: catAvg('[Technical]'),
      content:   catAvg('[Content]'),
      aeo:       catAvg('[AEO]'),
      geo:       catAvg('[GEO]'),
    };

    function catScoreCell(label, score, color) {
      const grade = letterGrade(score);
      return `
        <div class="cat-score-cell" style="border-top:3px solid ${color}">
          <div class="cat-score-name" style="color:${color}">${label}</div>
          <div class="cat-score-num">${score}<span class="cat-score-denom">/100</span></div>
          <div class="cat-score-grade" style="color:${color}">${grade}</div>
          <div class="cat-mini-track"><div class="cat-mini-fill" style="width:${score}%;background:${color}"></div></div>
        </div>`;
    }

    let html = `
      <!-- Score hero -->
      <div class="score-hero">
        <div class="grade-display grade-${data.grade}" id="gradeDisplay">${data.grade}</div>
        <div class="score-right" id="scoreRight">
          <div class="score-counter-row">
            <span id="scoreCounter">0</span><span> / 100</span>
          </div>
          <div class="score-summary-text">${esc(data.summary)}</div>
          <div class="meter-track">
            <div class="meter-fill" id="meterFill" style="background:${color}"></div>
          </div>
          <div class="meter-ticks">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-row" id="statsRow">
        <div class="stat-cell stat-pass"><div class="stat-n">${pass}</div><div class="stat-l">Passed</div></div>
        <div class="stat-cell stat-warn"><div class="stat-n">${warn}</div><div class="stat-l">Warnings</div></div>
        <div class="stat-cell stat-fail"><div class="stat-n">${fail}</div><div class="stat-l">Failed</div></div>
      </div>

      <!-- Category scores -->
      <div class="cat-scores-row" id="catScoresRow">
        ${catScoreCell('Technical', catScores.technical, '#8892a4')}
        ${catScoreCell('Content',   catScores.content,   '#e8a87c')}
        ${catScoreCell('AEO',       catScores.aeo,       '#7baeff')}
        ${catScoreCell('GEO',       catScores.geo,       '#b07bff')}
      </div>

      <!-- PDF download + exports -->
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-bottom:32px">
        <a class="pdf-link" id="pdfLink" href="/output/${esc(data.pdfFile)}" download>
          <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          Download PDF Report
        </a>
        <button id="exportJsonBtn" class="pdf-link" style="background:none;cursor:pointer" onclick="exportPageJSON()">
          <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          Export JSON
        </button>
        <button id="exportCsvBtn" class="pdf-link" style="background:none;cursor:pointer" onclick="exportPageCSV()">
          <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
          Export CSV
        </button>
      </div>

      ${(function() {
        const topFails = results
          .filter(r => r.status === 'fail')
          .sort((a, b) => (a.normalizedScore ?? 0) - (b.normalizedScore ?? 0))
          .slice(0, 5);
        if (!topFails.length) return '';
        const items = topFails.map((r, i) => {
          const name = r.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
          const score = (r.normalizedScore !== null && r.normalizedScore !== undefined) ? r.normalizedScore + '/100' : '0/100';
          const msg = r.message || r.recommendation || '';
          return `<li class="top-issues-item">
            <span class="top-issues-num">${i + 1}</span>
            <div class="top-issues-body">
              <div class="top-issues-name">${esc(name)}</div>
              ${msg ? `<div class="top-issues-msg">${esc(msg)}</div>` : ''}
            </div>
            <span class="top-issues-score">${score}</span>
          </li>`;
        }).join('');
        return `<div class="top-issues" id="topIssues">
          <div class="top-issues-title">Fix These First</div>
          <ol class="top-issues-list">${items}</ol>
        </div>`;
      })()}

      <!-- Horizontal card strip -->
      <div class="cards-label" id="cardsLabel">Check Results</div>
      <div class="cards-strip" id="cardStrip">`;

    let lastCat = null;
    for (const r of results) {
      const cat = resultCategory(r.name);
      if (cat !== lastCat) {
        if (lastCat !== null) {
          html += `<div class="card-cat-sep"><div class="card-cat-sep-inner cat-${cat}">${CAT_LABELS[cat].short}</div></div>`;
        }
        lastCat = cat;
      }
      const hasScore = r.normalizedScore !== null && r.normalizedScore !== undefined;
      const scoreDisplay = hasScore ? r.normalizedScore : '—';
      const barWidth = hasScore ? r.normalizedScore : 0;
      // Strip category prefix from card name display
      const displayName = r.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
      html += `
        <div class="audit-card ${r.status}">
          <div class="card-icon">${statusIcon(r.status)}</div>
          <div class="card-name">${esc(displayName)}</div>
          <div class="card-score-val">${scoreDisplay}${hasScore ? '<span style="font-size:12px;color:var(--muted)">/100</span>' : ''}</div>
          <div class="card-bar"><div class="card-bar-fill" style="width:${barWidth}%"></div></div>
          <div class="card-msg">${esc((r.message || '').split('\n')[0])}</div>
        </div>`;
    }

    html += `</div>

      <!-- Detail rows -->
      <div class="detail-label" id="detailLabel">Detailed Findings</div>
      <div class="result-rows" id="resultRows">`;

    lastCat = null;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const cat = resultCategory(r.name);
      if (cat !== lastCat) {
        const catInfo = CAT_LABELS[cat];
        html += `<div class="detail-cat-header cat-${cat}">${catInfo.short} <span class="cat-full">— ${catInfo.full}</span></div>`;
        lastCat = cat;
      }
      const hasScore = r.normalizedScore !== null && r.normalizedScore !== undefined;
      html += `
        <div class="result-row">
          <div class="row-status ${r.status}">${statusIcon(r.status)}</div>
          <div>
            <div class="row-name">${esc(r.name)}</div>
            ${r.message ? `<div class="row-msg">${esc(r.message)}</div>` : ''}
            ${r.details  ? `<div class="row-detail">${esc(r.details)}</div>` : ''}
            ${r.recommendation ? `
              <button class="rec-btn" onclick="toggleRec(${i})">+ recommendation</button>
              <div class="row-rec" id="rec${i}">${esc(r.recommendation)}</div>` : ''}
            ${hasScore ? `<div class="row-bar"><div class="row-bar-fill" style="width:${r.normalizedScore}%;background:${r.status === 'pass' ? 'var(--pass)' : r.status === 'warn' ? 'var(--warn)' : 'var(--fail)'}"></div></div>` : ''}
          </div>
          <div class="row-score-val ${r.status}">${hasScore ? r.normalizedScore + '/100' : ''}</div>
        </div>`;
    }

    html += `</div>`;
    document.getElementById('resultsInner').innerHTML = html;

    /* Trigger animations after paint */
    requestAnimationFrame(() => {
      setTimeout(() => { document.getElementById('gradeDisplay').classList.add('in'); }, 100);
      setTimeout(() => {
        document.getElementById('scoreRight').classList.add('in');
        countUp(document.getElementById('scoreCounter'), data.totalScore);
        document.getElementById('meterFill').style.width = data.totalScore + '%';
      }, 250);
      setTimeout(() => { document.getElementById('statsRow').classList.add('in'); }, 400);
      setTimeout(() => { document.getElementById('catScoresRow').classList.add('in'); }, 500);
      setTimeout(() => {
        document.getElementById('pdfLink').classList.add('in');
        const ej = document.getElementById('exportJsonBtn'); if (ej) ej.classList.add('in');
        const ec = document.getElementById('exportCsvBtn');  if (ec) ec.classList.add('in');
      }, 600);
      setTimeout(() => { const el = document.getElementById('topIssues'); if (el) el.classList.add('in'); }, 630);
      setTimeout(() => { document.getElementById('cardsLabel').classList.add('in'); }, 650);
      setTimeout(() => { document.getElementById('cardStrip').classList.add('in'); }, 700);
      setTimeout(() => { document.getElementById('detailLabel').classList.add('in'); }, 800);
      setTimeout(() => { document.getElementById('resultRows').classList.add('in'); }, 850);
    });
  }

  /* ── Multi-location audit ── */

  // Dynamic input rows
  function addMultiRow(url = '', label = '') {
    const wrap = document.getElementById('multiLocRows');
    if (wrap.querySelectorAll('.multi-loc-row').length >= _multiLimit) return;
    const row  = document.createElement('div');
    row.className = 'multi-loc-row';
    row.innerHTML = `
      <input type="text" class="multi-loc-label" placeholder="Label (optional)" value="${esc(label)}" autocomplete="off" />
      <input type="url" class="multi-loc-url" placeholder="https://location.com" value="${esc(url)}" autocomplete="off" spellcheck="false" />
      <button class="multi-loc-remove" onclick="removeMultiRow(this)" title="Remove">×</button>`;
    wrap.appendChild(row);
  }

  function removeMultiRow(btn) {
    const rows = document.querySelectorAll('.multi-loc-row');
    if (rows.length <= 1) return; // keep at least one row
    btn.closest('.multi-loc-row').remove();
  }

  function getMultiLocations() {
    return [...document.querySelectorAll('.multi-loc-row')].map(row => ({
      url:   row.querySelector('.multi-loc-url').value.trim(),
      label: row.querySelector('.multi-loc-label').value.trim(),
    })).filter(l => l.url.length > 0);
  }

  // localStorage history for score delta
  const MULTI_HISTORY_KEY = 'sg_multi_history';

  function getMultiHistory(locs) {
    const key = locs.map(l => l.url).sort().join('|');
    try {
      const store = JSON.parse(localStorage.getItem(MULTI_HISTORY_KEY) || '{}');
      return store[key] || null;
    } catch { return null; }
  }

  function saveMultiHistory(locations) {
    const key = locations.map(l => l.url).sort().join('|');
    try {
      const store = JSON.parse(localStorage.getItem(MULTI_HISTORY_KEY) || '{}');
      store[key] = { date: new Date().toISOString(), scores: Object.fromEntries(locations.map(l => [l.url, l.totalScore])) };
      localStorage.setItem(MULTI_HISTORY_KEY, JSON.stringify(store));
    } catch {}
  }

  async function runMultiAudit() {
    const locs = getMultiLocations();
    if (locs.length === 0) { showError('Enter at least one URL.'); return; }
    if (locs.length > _multiLimit) { showError(`Your plan allows up to ${_multiLimit} URLs per audit.`); return; }

    const urls = locs.map(l => l.url.toLowerCase().replace(/\/+$/, ''));
    const seen = new Set();
    const dupes = [];
    for (const u of urls) {
      if (seen.has(u)) dupes.push(u);
      else seen.add(u);
    }
    if (dupes.length) {
      showError(`Duplicate URL${dupes.length > 1 ? 's' : ''} detected — each location must be unique: ${dupes.join(', ')}`);
      return;
    }

    const prevHistory = getMultiHistory(locs);

    clearError();
    document.getElementById('multiAuditBtn').disabled = true;
    const resultsSection = document.getElementById('results');
    resultsSection.style.display = 'none';
    resultsSection.classList.remove('visible');

    startSteps();

    try {
      const res  = await fetch('/multi-audit', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ locations: locs }),
      });
      const data = await res.json();

      document.getElementById('progressFill').style.width = '100%';
      document.getElementById('statusText').textContent = 'Done.';
      await new Promise(resolve => setTimeout(resolve, 600));
      stopSteps();

      if (!res.ok) { handleAuditError(res, data); return; }
      renderMultiResults(data, prevHistory);
      saveMultiHistory(data.locations.filter(l => !l.error));
      showSavedNote();
      resultsSection.style.display = 'block';
      requestAnimationFrame(() => {
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        requestAnimationFrame(() => resultsSection.classList.add('visible'));
      });
    } catch (err) {
      stopSteps();
      showError('Could not connect to the server. Check your internet connection and try again.');
    } finally {
      document.getElementById('multiAuditBtn').disabled = false;
    }
  }

  // Display name: label if set, otherwise domain
  function multiDisplayName(loc) {
    return (loc.label && loc.label.trim()) ? loc.label.trim() : toDomain(loc.url);
  }

  function renderNapSection(locations) {
    const successLocs = locations.filter(l => !l.error && l.nap);
    if (!successLocs.length) return '';

    const rows = successLocs.map(loc => ({
      label:   multiDisplayName(loc),
      phone:   loc.nap.phone   || '—',
      address: loc.nap.address || '—',
    }));

    const phones    = rows.map(r => r.phone).filter(v => v !== '—');
    const addresses = rows.map(r => r.address).filter(v => v !== '—');
    const phoneMismatch   = new Set(phones).size > 1;
    const addressMismatch = new Set(addresses).size > 1;
    if (!phoneMismatch && !addressMismatch && phones.length === 0 && addresses.length === 0) return '';

    const majorityOf = (arr) => arr.length ? arr.sort((a, b) => arr.filter(v => v === b).length - arr.filter(v => v === a).length)[0] : null;
    const majPhone   = majorityOf(phones);
    const majAddress = majorityOf(addresses);

    const headerNote = (phoneMismatch || addressMismatch) ? ' <span style="color:var(--fail);font-size:10px">— mismatches detected</span>' : '';
    let html = `<div class="nap-section">
      <div class="detail-label in">NAP Consistency${headerNote}</div>
      <table class="nap-cmp-table">
        <thead><tr><th>Location</th><th>Phone</th><th>Address</th></tr></thead>
        <tbody>`;
    for (const row of rows) {
      const pMismatch = phoneMismatch   && row.phone   !== '—' && row.phone   !== majPhone;
      const aMismatch = addressMismatch && row.address !== '—' && row.address !== majAddress;
      html += `<tr>
        <td class="nap-loc">${esc(row.label)}</td>
        <td${pMismatch ? ' class="nap-cell-mismatch"' : ''}>${esc(row.phone)}</td>
        <td${aMismatch ? ' class="nap-cell-mismatch"' : ''}>${esc(row.address)}</td>
      </tr>`;
    }
    html += `</tbody></table></div>`;
    return html;
  }

  // CSV export
  function exportMultiCSV(locations, sortedNames) {
    const headers = ['Check', 'Category', ...locations.map(loc => multiDisplayName(loc))];
    const rows = sortedNames.map(name => {
      const cat = resultCategory(name);
      const displayName = name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
      const statuses = locations.map(loc => {
        if (loc.error) return 'error';
        const r = (loc.results || []).find(x => x.name === name);
        return r ? r.status : 'n/a';
      });
      return [displayName, CAT_LABELS[cat].short, ...statuses];
    });
    const csv = [headers, ...rows].map(row =>
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'signalgrade-multi-comparison.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // Sitemap XML export (site audit)
  let _latestSiteResults = [];
  let _latestSiteUrl     = '';
  function downloadSitemapXml() {
    const urlSet = new Set();
    for (const r of _latestSiteResults) {
      for (const u of [...(r.fail || []), ...(r.warn || []), ...(r.pass || [])]) {
        if (u && u.startsWith('http')) urlSet.add(u);
      }
    }
    if (!urlSet.size) { alert('No crawled URLs found.'); return; }
    const locs = [...urlSet].map(u => `  <url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n');
    const xml  = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs}\n</urlset>`;
    const blob = new Blob([xml], { type: 'application/xml' });
    const href = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    try {
      const host = new URL(_latestSiteUrl).hostname.replace(/[^a-z0-9.-]/gi, '-');
      a.download = `sitemap-${host}.xml`;
    } catch { a.download = 'sitemap.xml'; }
    a.href = href; a.click();
    URL.revokeObjectURL(href);
  }

  // Table filter
  let _multiFilter = 'all';
  let _multiSortedNames = [];
  let _multiLocations   = [];
  function filterMultiTable(filter) {
    _multiFilter = filter;
    document.querySelectorAll('.multi-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.filter === filter));
    const tbody = document.getElementById('multiCmpTbody');
    if (!tbody) return;
    const rows  = tbody.querySelectorAll('tr.multi-data-row');
    rows.forEach(row => {
      if (filter === 'all') { row.style.display = ''; return; }
      const statuses = [...row.querySelectorAll('.multi-cell-icon')].map(el => {
        if (el.classList.contains('pass')) return 'pass';
        if (el.classList.contains('warn')) return 'warn';
        if (el.classList.contains('fail')) return 'fail';
        return 'na';
      });
      const hasFail = statuses.includes('fail');
      const hasWarn = statuses.includes('warn');
      row.style.display = (filter === 'fails' && hasFail) || (filter === 'warns' && !hasFail && hasWarn) ? '' : 'none';
    });
  }

  function renderMultiResults({ locations, pdfFile }, prevHistory) {
    const CAT_ORDER = ['[Technical]', '[Content]', '[AEO]', '[GEO]'];

    // Collect all unique check names in category order
    const allNames = new Set();
    for (const loc of locations) {
      if (!loc.error) for (const r of (loc.results || [])) allNames.add(r.name);
    }
    const sortedNames = [...allNames].sort((a, b) => {
      const ia = CAT_ORDER.findIndex(p => a.startsWith(p));
      const ib = CAT_ORDER.findIndex(p => b.startsWith(p));
      if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      return a.localeCompare(b);
    });
    _multiSortedNames = sortedNames;
    _multiLocations   = locations;

    // Per-location category averages
    function catAvg(loc, prefix) {
      if (loc.error) return 0;
      const items = (loc.results || []).filter(r => r.name.startsWith(prefix));
      if (!items.length) return 0;
      return Math.round(items.reduce((s, r) => s + (r.normalizedScore ?? 0), 0) / items.length);
    }

    // Location cards
    let cardsHtml = `<div class="multi-loc-cards">`;
    for (const loc of locations) {
      const color     = loc.error ? 'var(--muted)' : gradeColor(loc.totalScore);
      const grade     = loc.error ? '—' : loc.grade;
      const score     = loc.error ? '—' : loc.totalScore;
      const dispName  = multiDisplayName(loc);
      const technical = catAvg(loc, '[Technical]');
      const content   = catAvg(loc, '[Content]');
      const aeo       = catAvg(loc, '[AEO]');
      const geo       = catAvg(loc, '[GEO]');
      let deltaHtml = '';
      if (!loc.error && prevHistory && prevHistory.scores) {
        const prev = prevHistory.scores[loc.url];
        if (prev != null && prev !== loc.totalScore) {
          const diff = loc.totalScore - prev;
          deltaHtml = `<span class="score-delta ${diff > 0 ? 'up' : 'down'}">${diff > 0 ? '↑' : '↓'}${Math.abs(diff)}</span>`;
        }
      }
      cardsHtml += `
        <div class="multi-loc-card" style="border-top-color:${color}">
          <div class="multi-loc-domain">${esc(dispName)}</div>
          <div class="multi-loc-grade" style="color:${color}">${grade}</div>
          <div class="multi-loc-score" style="color:${color}">${score}${!loc.error ? `<span class="multi-loc-denom">/100</span>${deltaHtml}` : ''}</div>
          ${!loc.error ? `<div class="multi-loc-meter"><div class="multi-loc-meter-fill" style="width:${score}%;background:${color}"></div></div>` : ''}
          ${!loc.error ? `
          <div class="multi-loc-cats">
            <span class="multi-loc-cat" style="color:#8892a4">T&nbsp;${technical}</span>
            <span class="multi-loc-cat" style="color:#e8a87c">C&nbsp;${content}</span>
            <span class="multi-loc-cat" style="color:#7baeff">A&nbsp;${aeo}</span>
            <span class="multi-loc-cat" style="color:#b07bff">G&nbsp;${geo}</span>
          </div>` : `<div class="multi-loc-error">${esc(loc.error)}</div>`}
        </div>`;
    }
    cardsHtml += `</div>`;

    // Downloads row (PDF + CSV)
    const csvBtn = `<button class="pdf-link in" style="background:none;cursor:pointer" onclick="exportMultiCSV(_multiLocations,_multiSortedNames)">
      <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      Download CSV
    </button>`;
    const pdfBtn = pdfFile ? `<a class="pdf-link in" href="/output/${esc(pdfFile)}" download>
      <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
      Download Comparison PDF
    </a>` : '';
    const downloadsHtml = (pdfBtn || csvBtn) ? `<div style="display:flex;gap:16px;justify-content:center;margin-bottom:32px">${pdfBtn}${csvBtn}</div>` : '';

    // NAP cross-comparison section
    const napHtml = renderNapSection(locations);

    // Common issues: checks failing at the most locations, ranked
    const CAT_COLORS_UI = { technical: '#8892a4', content: '#e8a87c', aeo: '#7baeff', geo: '#b07bff' };
    const commonIssues = sortedNames
      .map(name => {
        const failCount = locations.filter(loc => !loc.error && (loc.results || []).some(r => r.name === name && r.status === 'fail')).length;
        const warnCount = locations.filter(loc => !loc.error && (loc.results || []).some(r => r.name === name && r.status === 'warn')).length;
        return { name, failCount, warnCount };
      })
      .filter(c => c.failCount > 0)
      .sort((a, b) => b.failCount - a.failCount || b.warnCount - a.warnCount)
      .slice(0, 7);

    let commonIssuesHtml = '';
    if (commonIssues.length) {
      commonIssuesHtml = `<div class="detail-label in">Common Issues</div><div class="result-rows in">`;
      for (const issue of commonIssues) {
        const cat = resultCategory(issue.name);
        const dispName = issue.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
        commonIssuesHtml += `
          <div class="result-row">
            <div class="row-status fail">${statusIcon('fail')}</div>
            <div>
              <div class="row-name">${esc(dispName)}</div>
              <div class="site-issue-cat cat-${cat}">${CAT_LABELS[cat].short}</div>
            </div>
            <div class="site-issue-counts">
              <span class="site-count-fail" style="font-size:12px">${issue.failCount}/${locations.length} locations</span>
              ${issue.warnCount ? `<span class="site-count-warn" style="font-size:11px">+${issue.warnCount} warn</span>` : ''}
            </div>
          </div>`;
      }
      commonIssuesHtml += `</div>`;
    }

    // Comparison table with filter buttons
    _multiFilter = 'all';
    const colHeaders = locations.map(loc => `<th>${esc(multiDisplayName(loc))}</th>`).join('');
    let tableHtml = `
      <div class="detail-label in" style="margin-top:32px">Check Comparison</div>
      <div class="multi-table-filter">
        <span class="multi-filter-label">Show:</span>
        <button class="multi-filter-btn active" data-filter="all"   onclick="filterMultiTable('all')">All</button>
        <button class="multi-filter-btn"         data-filter="fails" onclick="filterMultiTable('fails')">Fails</button>
        <button class="multi-filter-btn"         data-filter="warns" onclick="filterMultiTable('warns')">Warns</button>
      </div>
      <div class="multi-cmp-wrap">
        <table class="multi-cmp-table">
          <thead>
            <tr>
              <th class="th-check">Check</th>
              ${colHeaders}
            </tr>
          </thead>
          <tbody id="multiCmpTbody">`;

    let lastCat = null;
    for (const name of sortedNames) {
      const cat = resultCategory(name);
      if (cat !== lastCat) {
        const colSpan = locations.length + 1;
        tableHtml += `<tr class="multi-cmp-cat-row cat-${cat}"><td colspan="${colSpan}">${CAT_LABELS[cat].short} — ${CAT_LABELS[cat].full}</td></tr>`;
        lastCat = cat;
      }
      const dispName = name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
      const cells = locations.map(loc => {
        if (loc.error) return `<td class="td-loc"><span class="multi-cell-icon" style="color:var(--muted)">—</span></td>`;
        const r = (loc.results || []).find(x => x.name === name);
        if (!r) return `<td class="td-loc"><span class="multi-cell-icon" style="color:var(--muted)">—</span></td>`;
        const icon = r.status === 'pass' ? '✓' : r.status === 'warn' ? '△' : '✕';
        const hasScore = r.normalizedScore != null;
        return `<td class="td-loc">
          <span class="multi-cell-icon ${r.status}">${icon}</span>
          ${hasScore ? `<div class="multi-cell-score">${r.normalizedScore}</div>` : ''}
        </td>`;
      }).join('');
      tableHtml += `<tr class="multi-data-row"><td class="td-check">${esc(dispName)}</td>${cells}</tr>`;
    }

    tableHtml += `</tbody></table></div>`;

    document.getElementById('resultsInner').innerHTML = `
      <div class="site-results-wrap">
        <div class="site-results-header">
          <strong>${locations.length} location${locations.length !== 1 ? 's' : ''} audited</strong>
        </div>
        ${cardsHtml}
        ${downloadsHtml}
        ${napHtml}
        ${commonIssuesHtml}
        ${tableHtml}
      </div>`;
  }

  /* ── Site audit ── */
  function runSiteAudit(url) {
    clearError();
    document.getElementById('auditBtn').disabled = true;
    const resultsSection = document.getElementById('results');
    resultsSection.style.display = 'none';
    resultsSection.classList.remove('visible');
    showProgressUI();
    document.getElementById('statusText').textContent = 'Starting crawl...';

    const es = new EventSource(`/crawl?url=${encodeURIComponent(url)}`);
    es.onmessage = (e) => {
      const evt = JSON.parse(e.data);
      if (evt.type === 'progress') {
        const pct = Math.min(Math.round((evt.crawled / evt.total) * 100), 99);
        document.getElementById('progressFill').style.width = pct + '%';
        document.getElementById('statusText').textContent = `Crawling page ${evt.crawled + 1} — ${evt.url}`;
      } else if (evt.type === 'done') {
        es.close();
        document.getElementById('progressFill').style.width = '100%';
        document.getElementById('statusText').textContent = 'Done.';
        setTimeout(() => {
          document.getElementById('statusLine').style.display = 'none';
          document.getElementById('progressTrack').style.display = 'none';
          renderSiteResults({ ...evt, siteUrl: url });
          showSavedNote();
          resultsSection.style.display = 'block';
          requestAnimationFrame(() => {
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            requestAnimationFrame(() => resultsSection.classList.add('visible'));
          });
          document.getElementById('auditBtn').disabled = false;
        }, 600);
      } else if (evt.type === 'error') {
        es.close();
        document.getElementById('statusLine').style.display = 'none';
        document.getElementById('progressTrack').style.display = 'none';
        showError(evt.message);
        document.getElementById('auditBtn').disabled = false;
      }
    };
    es.onerror = () => {
      es.close();
      document.getElementById('statusLine').style.display = 'none';
      document.getElementById('progressTrack').style.display = 'none';
      showError('Connection lost during crawl.');
      document.getElementById('auditBtn').disabled = false;
    };
  }

  function renderSiteResults({ pageCount, results, siteUrl, pdfFile }) {
    _latestSiteResults = results;
    _latestSiteUrl     = siteUrl;
    const checksWithFail = results.filter(r => r.fail.length > 0).length;
    const checksWarnOnly = results.filter(r => r.fail.length === 0 && r.warn.length > 0).length;
    const checksAllPass  = results.filter(r => r.fail.length === 0 && r.warn.length === 0).length;

    // Site health score: per-check weighted average (pass=100, warn=50, fail=0)
    const siteScore = results.length ? Math.round(
      results.reduce((sum, r) => {
        const t = r.pass.length + r.warn.length + r.fail.length;
        return sum + (t ? (r.pass.length + r.warn.length * 0.5) / t * 100 : 100);
      }, 0) / results.length
    ) : 0;
    const grade  = letterGrade(siteScore);
    const gColor = gradeColor(siteScore);

    // Sort by category for the breakdown
    const sorted = [...results].sort((a, b) => categoryOrder(a.name) - categoryOrder(b.name));

    // Top 7 issues by fail count
    const topIssues = [...results].filter(r => r.fail.length > 0)
      .sort((a, b) => b.fail.length - a.fail.length).slice(0, 7);

    function pct(n) { return Math.round(n / (pageCount || 1) * 100); }

    let html = `
      <div class="site-results-wrap">
        <div class="site-results-header">
          <strong>${pageCount} page${pageCount !== 1 ? 's' : ''} crawled</strong>
          <span>·</span><span>${esc(siteUrl)}</span>
        </div>

        <div class="site-grade-block">
          <div class="site-grade-letter" style="color:${gColor}">${grade}</div>
          <div class="site-grade-score" style="color:${gColor}">${siteScore}/100</div>
          <div class="site-grade-label">Site Health Score</div>
        </div>

        <div class="site-summary-stats">
          <div class="site-stat-cell site-stat-fail">
            <div class="site-stat-n">${checksWithFail}</div>
            <div class="site-stat-l">checks with fails</div>
          </div>
          <div class="site-stat-cell site-stat-warn">
            <div class="site-stat-n">${checksWarnOnly}</div>
            <div class="site-stat-l">warnings only</div>
          </div>
          <div class="site-stat-cell site-stat-pass">
            <div class="site-stat-n">${checksAllPass}</div>
            <div class="site-stat-l">all-passing</div>
          </div>
        </div>

        <div style="display:flex;gap:16px;justify-content:center">
          ${pdfFile ? `<a class="pdf-link in" href="/output/${esc(pdfFile)}" download>
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Download PDF Report
          </a>` : ''}
          <button class="pdf-link in" style="background:none;cursor:pointer" onclick="downloadSitemapXml()">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Download Sitemap XML
          </button>
          <button class="pdf-link in" style="background:none;cursor:pointer" onclick="exportSiteJSON()">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Export JSON
          </button>
          <button class="pdf-link in" style="background:none;cursor:pointer" onclick="exportSiteCSV()">
            <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
            Export CSV
          </button>
        </div>`;

    // Top Issues summary
    if (topIssues.length) {
      html += `<div class="detail-label in">Top Issues</div><div class="result-rows in">`;
      topIssues.forEach((r, i) => {
        const cat = resultCategory(r.name);
        const displayName = r.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
        html += `
          <div class="result-row">
            <div class="row-status fail">${statusIcon('fail')}</div>
            <div>
              <div class="site-issue-name">${esc(displayName)}</div>
              <div class="site-issue-cat cat-${cat}">${CAT_LABELS[cat].short}</div>
              ${r.recommendation ? `
                <button class="rec-btn" onclick="toggleSiteRec('top${i}')">+ recommendation</button>
                <div class="row-rec" id="siteRectop${i}">${esc(r.recommendation)}</div>` : ''}
            </div>
            <div class="site-top-pct">${pct(r.fail.length)}%<div style="font-size:9px;color:var(--muted);font-weight:400;margin-top:2px">of pages</div></div>
          </div>`;
      });
      html += `</div>`;
    }

    // Issue Breakdown grouped by category
    const issueResults = sorted.filter(r => r.fail.length > 0 || r.warn.length > 0);
    if (issueResults.length) {
      html += `<div class="detail-label in" style="margin-top:32px">Issue Breakdown</div><div class="result-rows in">`;
      let lastCat = null;
      issueResults.forEach((r, i) => {
        const cat = resultCategory(r.name);
        if (cat !== lastCat) {
          html += `<div class="detail-cat-header cat-${cat}">${CAT_LABELS[cat].short} <span class="cat-full">— ${CAT_LABELS[cat].full}</span></div>`;
          lastCat = cat;
        }
        const worstStatus = r.fail.length > 0 ? 'fail' : 'warn';
        const displayName = r.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
        const totalAffected = r.fail.length + r.warn.length;
        const affectedUrls = [...r.fail.slice(0, 5), ...r.warn.slice(0, 5)];
        const moreCount = totalAffected - affectedUrls.length;
        const pctFail = pct(r.fail.length);
        const pctWarn = pct(r.warn.length);
        const pctPass = Math.max(0, 100 - pctFail - pctWarn);
        html += `
          <div class="result-row">
            <div class="row-status ${worstStatus}">${statusIcon(worstStatus)}</div>
            <div>
              <div class="site-issue-name">${esc(displayName)}</div>
              <div class="site-issue-cat cat-${cat}">${CAT_LABELS[cat].short}</div>
              ${r.recommendation ? `
                <button class="rec-btn" onclick="toggleSiteRec('issue${i}')">+ recommendation</button>
                <div class="row-rec" id="siteRecissue${i}">${esc(r.recommendation)}</div>` : ''}
              <button class="rec-btn" id="siteRowBtn${i}" data-total="${totalAffected}" onclick="toggleSiteRow(${i})">+ ${totalAffected} page${totalAffected !== 1 ? 's' : ''} affected</button>
              <div class="site-issue-urls" id="siteRow${i}">
                ${affectedUrls.map(u => `<div>${esc(u)}</div>`).join('')}
                ${moreCount > 0 ? `<div style="font-style:italic">…and ${moreCount} more</div>` : ''}
              </div>
            </div>
            <div class="site-issue-counts">
              ${r.fail.length > 0 ? `<span class="site-count-fail">${r.fail.length}/${pageCount} <span style="font-size:9px;font-weight:400">(${pct(r.fail.length)}%)</span></span>` : ''}
              ${r.warn.length > 0 ? `<span class="site-count-warn">${r.warn.length}/${pageCount} <span style="font-size:9px;font-weight:400">(${pct(r.warn.length)}%)</span></span>` : ''}
            </div>
            <div class="site-stacked-bar">
              <div class="site-stacked-seg" style="width:${pctFail}%;background:#ff4455"></div>
              <div class="site-stacked-seg" style="width:${pctWarn}%;background:#ffb800"></div>
              <div class="site-stacked-seg" style="width:${pctPass}%;background:#34d399"></div>
            </div>
          </div>`;
      });
      html += `</div>`;
    }

    // What's Working
    const passingChecks = sorted.filter(r => r.fail.length === 0 && r.warn.length === 0);
    if (passingChecks.length) {
      html += `<button class="site-working-toggle" onclick="toggleSiteWorking()">✓ What's Working (${passingChecks.length} checks)</button>
        <div class="site-working-rows" id="siteWorkingRows"><div class="result-rows in">`;
      let lastCat = null;
      passingChecks.forEach(r => {
        const cat = resultCategory(r.name);
        if (cat !== lastCat) {
          html += `<div class="detail-cat-header cat-${cat}">${CAT_LABELS[cat].short} <span class="cat-full">— ${CAT_LABELS[cat].full}</span></div>`;
          lastCat = cat;
        }
        const displayName = r.name.replace(/^\[(Technical|Content|AEO|GEO)\]\s*/, '');
        html += `
          <div class="result-row">
            <div class="row-status pass">${statusIcon('pass')}</div>
            <div>
              <div class="site-issue-name">${esc(displayName)}</div>
              <div class="site-issue-cat cat-${cat}">${CAT_LABELS[cat].short}</div>
            </div>
            <div class="site-issue-counts"><span class="site-count-pass">${r.pass.length}/${pageCount}</span></div>
            <div class="site-stacked-bar">
              <div class="site-stacked-seg" style="width:100%;background:#34d399"></div>
            </div>
          </div>`;
      });
      html += `</div></div>`;
    }

    html += `</div>`;
    document.getElementById('resultsInner').innerHTML = html;
  }

  function toggleSiteRow(i) {
    const el   = document.getElementById('siteRow' + i);
    const btn  = document.getElementById('siteRowBtn' + i);
    const open = el.style.display === 'block';
    el.style.display = open ? 'none' : 'block';
    if (btn) {
      const total = btn.dataset.total;
      const noun  = total !== '1' ? 'pages' : 'page';
      btn.textContent = open ? `+ ${total} ${noun} affected` : `− ${total} ${noun} affected`;
    }
  }

  function toggleSiteRec(id) {
    const el  = document.getElementById('siteRec' + id);
    const btn = el.previousElementSibling;
    const open = el.style.display === 'block';
    el.style.display = open ? 'none' : 'block';
    btn.textContent  = open ? '+ recommendation' : '− recommendation';
  }

  function toggleSiteWorking() {
    const el = document.getElementById('siteWorkingRows');
    el.style.display = el.style.display === 'block' ? 'none' : 'block';
  }

  function toggleRec(i) {
    const el  = document.getElementById('rec' + i);
    const btn = el.previousElementSibling;
    const open = el.style.display === 'block';
    el.style.display = open ? 'none' : 'block';
    btn.textContent  = open ? '+ recommendation' : '− recommendation';
  }

  /* ── Auth widget ── */
  let _currentUser  = null;
  let _multiLimit   = 3;   // default until /api/me responds

  async function initAuthWidget() {
    try {
      const res = await fetch('/api/me');
      const { user, limits } = await res.json();
      _currentUser = user;

      // Update limit notes and enforce tier caps in the UI
      if (limits) {
        const planLabel = user ? (user.plan === 'pro' ? 'PRO' : user.plan === 'agency' ? 'AGENCY' : 'FREE') : 'FREE';

        const crawlNote = document.getElementById('crawlLimitNote');
        if (crawlNote) crawlNote.innerHTML = `Up to ${limits.crawlPageLimit} pages per crawl<span class="tier-badge">${planLabel}</span>`;

        _multiLimit = limits.multiAuditLimit;
        const multiNote = document.querySelector('.multi-limit-note');
        if (multiNote) multiNote.innerHTML = `Up to ${_multiLimit} location${_multiLimit !== 1 ? 's' : ''}<span class="tier-badge" style="margin-left:8px">${planLabel}</span>`;

        // Remove excess rows if user added more than their limit before auth loaded
        const wrap = document.getElementById('multiLocRows');
        if (wrap) {
          const rows = wrap.querySelectorAll('.multi-loc-row');
          for (let i = rows.length - 1; i >= _multiLimit; i--) rows[i].remove();
        }
      }

      // Enable JS Render toggle for pro/agency users
      const jsToggle = document.getElementById('jsRenderToggle');
      const jsLabel  = document.getElementById('jsRenderLabel');
      if (jsToggle) {
        const isPro = user && (user.plan === 'pro' || user.plan === 'agency');
        jsToggle.disabled = !isPro;
        if (jsLabel) jsLabel.style.opacity = isPro ? '1' : '0.45';
      }

      const widget = document.getElementById('authWidget');
      if (!widget) return;
      if (user) {
        widget.innerHTML =
          `<div class="auth-user">` +
          (user.avatar_url ? `<img class="auth-avatar" src="${esc(user.avatar_url)}" referrerpolicy="no-referrer" alt="" />` : '') +
          `<a href="/dashboard" class="auth-link">Dashboard</a>` +
          `<a href="/account" class="auth-link">Account</a>` +
          `<a href="/auth/logout" class="auth-signout">Sign out</a>` +
          `</div>`;
      } else {
        widget.innerHTML = `<a href="/auth/google" class="google-btn">Sign in</a>`;
      }
    } catch (_) {}
  }

  function buildGscPanelHtml(gsc) {
    if (!gsc.connected) {
      return `<div class="gsc-panel">
        <div class="gsc-panel-title">Search Console Data</div>
        <div class="gsc-panel-empty">
          This site isn't connected to Google Search Console, or you haven't granted access yet.
          <a class="gsc-connect-link" href="https://search.google.com/search-console" target="_blank" rel="noopener">Open Search Console →</a>
        </div>
      </div>`;
    }

    let siteLabel = gsc.site || '';
    try {
      if (!siteLabel.startsWith('sc-domain:')) siteLabel = new URL(gsc.site).hostname;
    } catch (_) {}

    if (!gsc.rows || !gsc.rows.length) {
      return `<div class="gsc-panel">
        <div class="gsc-panel-title">Search Console Data</div>
        <div class="gsc-panel-period">Last 28 days · ${esc(siteLabel)}</div>
        <div class="gsc-panel-empty">No query data found for this property in the last 28 days.</div>
      </div>`;
    }

    const rows = gsc.rows.map(r => {
      const query      = (r.keys && r.keys[0]) || '';
      const clicks     = (r.clicks     ?? 0).toLocaleString();
      const impressions= (r.impressions ?? 0).toLocaleString();
      const position   = r.ctr !== undefined ? (r.position ?? 0).toFixed(1) : (r.position ?? 0).toFixed(1);
      return `<tr>
        <td>${esc(query)}</td>
        <td class="gsc-td-num">${clicks}</td>
        <td class="gsc-td-num">${impressions}</td>
        <td class="gsc-td-num">${position}</td>
      </tr>`;
    }).join('');

    return `<div class="gsc-panel">
      <div class="gsc-panel-title">Search Console Data</div>
      <div class="gsc-panel-period">Last 28 days · Top 10 queries · ${esc(siteLabel)}</div>
      <table class="gsc-table">
        <thead><tr>
          <th>Query</th>
          <th class="gsc-td-num">Clicks</th>
          <th class="gsc-td-num">Impressions</th>
          <th class="gsc-td-num">Position</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  async function loadGscPanel(url) {
    if (!_currentUser) return;
    const inner = document.getElementById('resultsInner');
    if (!inner) return;
    try {
      const gsc = await fetch(`/api/gsc-data?url=${encodeURIComponent(url)}`).then(r => r.json());
      const div = document.createElement('div');
      div.innerHTML = buildGscPanelHtml(gsc);
      inner.appendChild(div.firstElementChild);
    } catch (_) {}
  }

  function showSavedNote() {
    if (!_currentUser) return;
    const inner = document.getElementById('resultsInner');
    if (!inner) return;
    const note = document.createElement('div');
    note.className = 'saved-note';
    note.textContent = '✓ Saved to your history';
    inner.appendChild(note);
  }

  function _sgInit() {
    initAuthWidget();
    const urlInput = document.getElementById('urlInput');
    if (urlInput) urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') runAudit(); });
    const auditBtn = document.getElementById('auditBtn');
    if (auditBtn) auditBtn.addEventListener('click', runAudit);
    const multiAuditBtn = document.getElementById('multiAuditBtn');
    if (multiAuditBtn) multiAuditBtn.addEventListener('click', runMultiAudit);
    if (!document.querySelectorAll('.multi-loc-row').length) addMultiRow();
  }

  window._sgOnMount = _sgInit;
  _sgInit();
