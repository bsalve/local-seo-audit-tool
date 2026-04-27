import { createRequire } from 'module'
import { join } from 'path'

const _require = createRequire(import.meta.url)
const db = _require(join(process.cwd(), 'utils/db.js'))

export default defineEventHandler(async (event) => {
  if (!db) throw createError({ statusCode: 503, message: 'Database not available' })

  const token = getRouterParam(event, 'token')
  const report = await db('reports').where({ share_token: token }).first()
  if (!report) throw createError({ statusCode: 404, message: 'Report not found or link is invalid' })

  const resultsRaw = report.results_json
  const results = resultsRaw
    ? (typeof resultsRaw === 'string' ? JSON.parse(resultsRaw) : resultsRaw)
    : null

  return {
    id: report.id,
    url: report.url,
    audit_type: report.audit_type,
    score: report.score,
    grade: report.grade,
    created_at: report.created_at,
    results,
  }
})
