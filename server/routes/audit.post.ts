import { createRequire } from 'module'
import { join, basename } from 'path'

const _require = createRequire(import.meta.url)

function classifyFetchError(err: any): string {
  const code = err.code || ''
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'dns_failed'
  if (code === 'ECONNREFUSED') return 'connection_refused'
  if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') return 'timeout'
  if (code.startsWith('CERT_') || code.startsWith('ERR_TLS') || code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') return 'ssl_error'
  if (err.response?.status >= 400) return 'http_error'
  return 'fetch_failed'
}

function fetchErrorMessage(errorCode: string, url: string): string {
  let host = url
  try { host = new URL(url).hostname } catch {}
  switch (errorCode) {
    case 'dns_failed':         return `Could not reach ${host}. Check the URL is correct and the site is live.`
    case 'connection_refused': return `Connection refused by ${host}. The server may be blocking automated requests.`
    case 'timeout':            return `Request to ${host} timed out. The server may be slow or unavailable.`
    case 'ssl_error':          return `SSL certificate error on ${host}. The site's HTTPS certificate may be expired or invalid.`
    case 'http_error':         return `${host} returned an error response. The page may require login or may not exist.`
    default:                   return `Could not fetch ${host}. Verify the URL is publicly accessible.`
  }
}

export default defineEventHandler(async (event) => {
  const { fetchPage, fetchPageWithJS } = _require(join(process.cwd(), 'utils/fetcher.js'))
  const { calcTotalScore, letterGrade, buildJsonOutput } = _require(join(process.cwd(), 'utils/score.js'))
  const { generatePDF } = _require(join(process.cwd(), 'utils/generatePDF.js'))
  const db              = _require(join(process.cwd(), 'utils/db.js'))
  const email           = _require(join(process.cwd(), 'utils/email.js'))
  const { dispatchWebhooks } = _require(join(process.cwd(), 'utils/webhooks.js'))

  const body = await readBody(event)
  const { url, logoUrl, jsRender } = body ?? {}
  if (!url) throw createError({ statusCode: 400, message: 'url is required' })

  let safeLogoUrl: string | null = null
  if (logoUrl && typeof logoUrl === 'string') {
    try {
      const parsed = new URL(logoUrl)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') safeLogoUrl = logoUrl
    } catch {}
  }

  const audits: any[] = useNitroApp().audits ?? []

  // Fall back to stored pdf_logo_url if no logo provided in request
  const userId = event.context.userId ?? null
  if (!safeLogoUrl && userId && db) {
    try {
      const dbUser = await db('users').where({ id: userId }).first()
      if (dbUser?.pdf_logo_url) safeLogoUrl = dbUser.pdf_logo_url
    } catch {}
  }

  const r2 = _require(join(process.cwd(), 'utils/r2.js'))

  try {
    const plan = event.context.plan ?? 'anon'
    const useJsRender = jsRender === true && (plan === 'pro' || plan === 'agency')
    const { html, $, headers, finalUrl, responseTimeMs } = useJsRender
      ? await fetchPageWithJS(url, parseInt(process.env.JS_RENDER_TIMEOUT ?? '15000'))
      : await fetchPage(url)
    const meta = { headers, finalUrl, responseTimeMs }
    const results = (
      await Promise.all(audits.map((a) => new Promise((resolve) => resolve(a($, html, url, meta))).catch(() => null)))
    ).flat().filter(Boolean)

    const score = calcTotalScore(results)
    const grade = letterGrade(score)
    const jsonOutput = buildJsonOutput(url, results, score, grade)
    const pdfPath = await generatePDF(jsonOutput, { logoUrl: safeLogoUrl })
    const pdfFile = basename(pdfPath)

    let r2Key: string | null = null
    if (r2.isConfigured() && userId) {
      try {
        r2Key = `reports/${userId}/${pdfFile}`
        await r2.uploadPDF(pdfPath, r2Key)
        // Local file kept as cache for the homepage download button
      } catch (e: any) {
        console.error('[audit] R2 upload failed:', e.message)
        r2Key = null
      }
    }

    if (db && userId) {
      await db('reports').insert({ user_id: userId, url, audit_type: 'page', score, grade, pdf_filename: pdfFile, r2_key: r2Key, results_json: JSON.stringify(results) })
        .catch((err: any) => console.error('[audit] DB insert failed:', err.message))

      // Regression alert: if score dropped ≥10 pts vs previous audit of same URL
      if (email.isConfigured()) {
        const session = await getUserSession(event)
        const sessionUser = (session as any)?.user ?? null
        if (sessionUser?.email) {
          db('reports')
            .where({ user_id: userId, url, audit_type: 'page' })
            .orderBy('created_at', 'desc')
            .offset(1).limit(1)
            .first()
            .then((prev: any) => {
              if (prev && prev.score !== null && score !== null && (prev.score - score) >= 10) {
                email.sendRegressionAlert(sessionUser.email, sessionUser.name, url, prev.score, score, grade)
                  .catch((e: any) => console.error('[email] regression alert failed:', e.message))
              }
            })
            .catch(() => {})
        }
      }
    }

    if (userId) dispatchWebhooks(userId, 'audit.complete', { url, score, grade, pdfFile }).catch(() => {})

    return { ...jsonOutput, pdfFile }
  } catch (err: any) {
    const errorCode = classifyFetchError(err)
    throw createError({ statusCode: 502, message: fetchErrorMessage(errorCode, url), data: { errorCode } })
  }
})
