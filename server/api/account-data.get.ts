import { createRequire } from 'module'
import { join } from 'path'

const _require = createRequire(import.meta.url)
const db = _require(join(process.cwd(), 'utils/db.js'))
const { TIERS } = _require(join(process.cwd(), 'utils/tiers.js'))

const PLAN_LABELS: Record<string, { label: string; color: string; price: string }> = {
  free:   { label: 'Free',   color: '#8892a4', price: '$0/mo' },
  pro:    { label: 'Pro',    color: '#4d9fff', price: '$29/mo' },
  agency: { label: 'Agency', color: '#b07bff', price: '$79/mo' },
}

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const sessionUser = (session as any)?.user ?? null
  if (!sessionUser) throw createError({ statusCode: 401, message: 'Not authenticated' })

  if (!db) {
    const plan = sessionUser.plan || 'free'
    const tier = TIERS[plan] || TIERS.free
    const planMeta = PLAN_LABELS[plan] || PLAN_LABELS.free
    return {
      user: sessionUser, plan,
      planLabel: planMeta.label, planColor: planMeta.color, planPrice: planMeta.price,
      crawlLimit: tier.crawlPageLimit, multiLimit: tier.multiAuditLimit, rateLimit: tier.rateLimit.max,
      isPro: plan === 'pro', isAgency: plan === 'agency', isFree: plan === 'free',
      hasBilling: false, stripeAvailable: !!process.env.STRIPE_PRO_PRICE_ID,
      totalReports: 0, monthlyReports: 0, pdfLogoUrl: null,
    }
  }

  const user = (await db('users').where({ id: sessionUser.id }).first()) ?? sessionUser
  const plan = user?.plan || 'free'
  const tier = TIERS[plan] || TIERS.free
  const planMeta = PLAN_LABELS[plan] || PLAN_LABELS.free

  const now        = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const [{ count: totalReports }]   = await db('reports').where({ user_id: sessionUser.id }).whereNull('deleted_at').count('id as count')
  const [{ count: monthlyReports }] = await db('reports').where({ user_id: sessionUser.id }).where('created_at', '>=', monthStart).count('id as count')

  return {
    user, plan,
    planLabel:  planMeta.label,
    planColor:  planMeta.color,
    planPrice:  planMeta.price,
    crawlLimit: tier.crawlPageLimit,
    multiLimit: tier.multiAuditLimit,
    rateLimit:  tier.rateLimit.max,
    isPro:      plan === 'pro',
    isAgency:   plan === 'agency',
    isFree:     plan === 'free',
    hasBilling: !!(user?.stripe_customer_id && process.env.STRIPE_SECRET_KEY),
    stripeAvailable: !!process.env.STRIPE_PRO_PRICE_ID,
    totalReports:   Number(totalReports),
    monthlyReports: Number(monthlyReports),
    pdfLogoUrl: user?.pdf_logo_url || null,
  }
})
