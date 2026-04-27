import { createRequire } from 'module'
import { join } from 'path'

const _require = createRequire(import.meta.url)
const db = _require(join(process.cwd(), 'utils/db.js'))

function gradeColor(score: number): string {
  if (score >= 90) return '#34d399'
  if (score >= 80) return '#4d9fff'
  if (score >= 70) return '#ffb800'
  if (score >= 60) return '#ff8800'
  return '#ff4455'
}

const TYPE_LABELS: Record<string, string> = { page: 'Page', site: 'Site', multi: 'Compare' }
const TYPE_COLORS: Record<string, string> = { page: '#8892a4', site: '#7baeff', multi: '#b07bff' }

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = (session as any)?.user ?? null
  if (!user) throw createError({ statusCode: 401, message: 'Not authenticated' })
  if (!db) throw createError({ statusCode: 503, message: 'Database not available' })

  const rawReports = await db('reports')
    .where({ user_id: user.id })
    .whereNull('deleted_at')
    .orderBy('created_at', 'desc')
    .limit(100)

  const reports = rawReports.map((r: any) => ({
    ...r,
    gradeColor:    gradeColor(r.score || 0),
    typeLabel:     TYPE_LABELS[r.audit_type] || r.audit_type,
    typeColor:     TYPE_COLORS[r.audit_type] || '#8892a4',
    dateFormatted: new Date(r.created_at).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }),
  }))

  return { user, reports, reportCount: reports.length, hasReports: reports.length > 0 }
})
