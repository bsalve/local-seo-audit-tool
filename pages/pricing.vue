<script setup>
useHead({ title: 'Pricing — SignalGrade' })

const { loggedIn, user } = useUserSession()
const plan = computed(() => user.value?.plan || 'free')

const stripeAvailable = ref(false)
const hasBilling = ref(false)

onMounted(async () => {
  if (!loggedIn.value) return
  try {
    const d = await $fetch('/api/account-data')
    stripeAvailable.value = d.stripeAvailable ?? false
    hasBilling.value = d.hasBilling ?? false
  } catch {}
})
</script>

<template>
  <div>
    <AppNav>
      <AppNavAuth>
        <a href="/pricing" class="nav-link nav-link-current">Pricing</a>
        <a href="/docs" class="nav-link">API Docs</a>
        <a href="/dashboard" class="nav-link">Dashboard</a>
        <a href="/account" class="nav-link">Account</a>
      </AppNavAuth>
    </AppNav>

    <div class="page">
      <div class="page-hero">
        <div class="page-eyebrow">Plans &amp; Pricing</div>
        <div class="page-title">Simple, transparent pricing</div>
        <div class="page-sub">Audit any site. Export to PDF. Know your score.<br>Start free — upgrade when you need more.</div>
      </div>

      <div class="pricing-grid">

        <!-- Free -->
        <div class="pricing-card">
          <div class="tier-name">Free</div>
          <div class="tier-price">$0 <span>/ month</span></div>
          <div class="tier-desc">Get started with no commitment.</div>
          <ul class="tier-features">
            <li>10 pages per site crawl</li>
            <li>3 URLs per compare audit</li>
            <li>10 audits per hour</li>
            <li>Report history</li>
            <li>PDF exports</li>
          </ul>
          <div class="tier-cta">
            <span v-if="loggedIn && plan === 'free'" class="current-badge">Current plan</span>
            <a v-else-if="!loggedIn" href="/auth/google" class="btn-tier btn-tier-ghost">Get started free</a>
          </div>
        </div>

        <!-- Pro (featured) -->
        <div class="pricing-card featured">
          <div class="tier-popular">Most popular</div>
          <div class="tier-name">Pro</div>
          <div class="tier-price">$29 <span>/ month</span></div>
          <div class="tier-desc">For consultants and in-house SEO teams.</div>
          <ul class="tier-features">
            <li>50 pages per site crawl</li>
            <li>10 URLs per compare audit</li>
            <li>60 audits per hour</li>
            <li>Report history</li>
            <li>PDF exports</li>
            <li>Agency branding on PDFs</li>
          </ul>
          <div class="tier-cta">
            <span v-if="loggedIn && plan === 'pro'" class="current-badge">Current plan</span>
            <template v-else-if="loggedIn && plan !== 'agency' && stripeAvailable">
              <form action="/checkout" method="POST">
                <input type="hidden" name="plan" value="pro" />
                <button type="submit" class="btn-tier btn-tier-primary">Upgrade to Pro</button>
              </form>
            </template>
            <a v-else-if="!loggedIn" href="/auth/google" class="btn-tier btn-tier-primary">Get started</a>
          </div>
        </div>

        <!-- Agency -->
        <div class="pricing-card">
          <div class="tier-name">Agency</div>
          <div class="tier-price">$79 <span>/ month</span></div>
          <div class="tier-desc">For agencies running audits at scale.</div>
          <ul class="tier-features">
            <li>200 pages per site crawl</li>
            <li>10 URLs per compare audit</li>
            <li>200 audits per hour</li>
            <li>Everything in Pro</li>
            <li>Priority support</li>
          </ul>
          <div class="tier-cta">
            <span v-if="loggedIn && plan === 'agency'" class="current-badge">Current plan</span>
            <template v-else-if="loggedIn && stripeAvailable">
              <form action="/checkout" method="POST">
                <input type="hidden" name="plan" value="agency" />
                <button type="submit" class="btn-tier btn-tier-ghost">Upgrade to Agency</button>
              </form>
            </template>
            <a v-else-if="!loggedIn" href="/auth/google" class="btn-tier btn-tier-ghost">Get started</a>
          </div>
        </div>

      </div>

      <!-- Feature comparison strip -->
      <div class="compare">
        <div class="compare-title">What's included in every plan</div>
        <div class="compare-grid">
          <div class="compare-item">
            <div class="compare-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="compare-label">73 audit checks</div>
              <div class="compare-sub">Technical, Content, AEO, and GEO signals</div>
            </div>
          </div>
          <div class="compare-item">
            <div class="compare-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="compare-label">Dark-themed PDF reports</div>
              <div class="compare-sub">A4 export with grade, category scores, and recommendations</div>
            </div>
          </div>
          <div class="compare-item">
            <div class="compare-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="compare-label">Report history</div>
              <div class="compare-sub">Every audit saved automatically to your dashboard</div>
            </div>
          </div>
          <div class="compare-item">
            <div class="compare-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="compare-label">Multi-location compare</div>
              <div class="compare-sub">Side-by-side audit of multiple URLs</div>
            </div>
          </div>
          <div class="compare-item">
            <div class="compare-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="compare-label">Site-wide crawl</div>
              <div class="compare-sub">BFS crawler with orphan and duplicate detection</div>
            </div>
          </div>
          <div class="compare-item">
            <div class="compare-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div>
              <div class="compare-label">Google sign-in</div>
              <div class="compare-sub">One-click auth — no separate password to manage</div>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQ -->
      <div class="faq">
        <div class="faq-title">Common questions</div>
        <div class="faq-grid">
          <div class="faq-item">
            <div class="faq-q">Can I cancel anytime?</div>
            <div class="faq-a">Yes. Cancel from your account page at any time. Your plan stays active until the end of the current billing period — no prorated charges.</div>
          </div>
          <div class="faq-item">
            <div class="faq-q">Is there a free trial?</div>
            <div class="faq-a">The Free tier is permanent and requires no credit card. Start auditing immediately and upgrade only when you need higher limits.</div>
          </div>
          <div class="faq-item">
            <div class="faq-q">What happens when I hit the rate limit?</div>
            <div class="faq-a">Audit requests return an error message until your hourly window resets. Upgrade your plan for a higher limit, or wait for the window to reset.</div>
          </div>
          <div class="faq-item">
            <div class="faq-q">Do you offer refunds?</div>
            <div class="faq-a">Contact us within 7 days of payment and we'll issue a full refund, no questions asked.</div>
          </div>
        </div>
      </div>
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
</style>

<style scoped>
.nav-link { font-family: 'Space Mono', monospace; font-size: 10px; color: var(--muted); text-decoration: none; letter-spacing: 0.05em; padding: 5px 10px; border-radius: 4px; transition: background 0.15s, color 0.15s; }
.nav-link:hover { background: rgba(228,230,234,0.06); color: var(--text); }
.nav-link-current { color: var(--accent); background: rgba(77,159,255,0.08); pointer-events: none; }

.page { max-width: 960px; margin: 0 auto; padding: 64px 32px 100px; }

.page-hero { text-align: center; margin-bottom: 56px; }
.page-eyebrow { font-family: 'Space Mono', monospace; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--accent); margin-bottom: 12px; }
.page-title { font-size: 32px; font-weight: 700; color: var(--text); margin-bottom: 12px; letter-spacing: -0.02em; }
.page-sub { font-size: 15px; color: var(--muted); line-height: 1.7; }

/* Pricing cards */
.pricing-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 64px; }
@media (max-width: 700px) { .pricing-grid { grid-template-columns: 1fr; } }

.pricing-card {
  background: var(--bg2); border: 1px solid var(--border); border-radius: 10px;
  padding: 28px 24px; display: flex; flex-direction: column;
  transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
  position: relative;
}
.pricing-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.4); }
.pricing-card.featured { border-color: var(--accent); box-shadow: 0 0 0 1px rgba(77,159,255,0.15); }
.pricing-card.featured:hover { border-color: #76baff; }

.tier-popular {
  position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
  font-family: 'Space Mono', monospace; font-size: 9px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase;
  background: var(--accent); color: #000; padding: 3px 12px; border-radius: 3px;
  white-space: nowrap;
}

.tier-name { font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
.pricing-card.featured .tier-name { color: var(--accent); }

.tier-price { font-family: 'Space Mono', monospace; font-size: 28px; font-weight: 700; color: var(--text); margin-bottom: 4px; line-height: 1.1; }
.tier-price span { font-size: 12px; font-weight: 400; color: var(--muted); vertical-align: middle; }

.tier-desc { font-size: 12px; color: var(--muted); margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid var(--border); }

.tier-features { list-style: none; margin-bottom: 24px; flex: 1; }
.tier-features li { font-size: 13px; color: var(--muted); padding: 5px 0; display: flex; align-items: center; gap: 8px; }
.tier-features li::before { content: '✓'; color: var(--pass); font-size: 11px; font-weight: 700; flex-shrink: 0; }

.tier-cta { margin-top: auto; }
.current-badge {
  display: block; text-align: center;
  font-family: 'Space Mono', monospace; font-size: 11px; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--muted); border: 1px solid var(--border);
  border-radius: 4px; padding: 10px 0;
}

.btn-tier { display: block; width: 100%; text-align: center; text-decoration: none; font-family: 'Space Mono', monospace; font-size: 12px; border-radius: 4px; padding: 10px 0; cursor: pointer; border: none; transition: background 0.15s, color 0.15s, transform 0.1s; }
.btn-tier:active { transform: scale(0.98); }
.btn-tier-primary { background: var(--accent); color: #000; }
.btn-tier-primary:hover { background: #76baff; }
.btn-tier-ghost { background: none; color: var(--muted); border: 1px solid var(--border); }
.btn-tier-ghost:hover { color: var(--text); border-color: var(--dim2); }

/* Included features strip */
.compare { margin-bottom: 64px; }
.compare-title { font-size: 13px; font-weight: 600; letter-spacing: 0.05em; color: var(--muted); text-transform: uppercase; margin-bottom: 20px; }
.compare-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
@media (max-width: 700px) { .compare-grid { grid-template-columns: 1fr; } }
.compare-item { display: flex; align-items: flex-start; gap: 12px; }
.compare-icon { color: var(--pass); flex-shrink: 0; margin-top: 2px; }
.compare-label { font-size: 13px; font-weight: 500; color: var(--text); }
.compare-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

/* FAQ */
.faq { border-top: 1px solid var(--border); padding-top: 48px; }
.faq-title { font-size: 13px; font-weight: 600; letter-spacing: 0.05em; color: var(--muted); text-transform: uppercase; margin-bottom: 24px; }
.faq-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px 48px; }
@media (max-width: 600px) { .faq-grid { grid-template-columns: 1fr; } }
.faq-q { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
.faq-a { font-size: 13px; color: var(--muted); line-height: 1.65; }
</style>
