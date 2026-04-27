import { createRequire } from 'module'
import { join } from 'path'
import { randomBytes } from 'crypto'

const _require = createRequire(import.meta.url)
const db = _require(join(process.cwd(), 'utils/db.js'))

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user = (session as any)?.user ?? null
  if (!user?.id) throw createError({ statusCode: 401, message: 'Not authenticated' })
  if (!db) throw createError({ statusCode: 503, message: 'Database not available' })

  const id = getRouterParam(event, 'id')
  const report = await db('reports').where({ id, user_id: user.id }).first()
  if (!report) throw createError({ statusCode: 404, message: 'Report not found' })

  if (report.share_token) {
    return { shareUrl: `/report/share/${report.share_token}` }
  }

  const token = randomBytes(32).toString('hex')
  await db('reports').where({ id, user_id: user.id }).update({ share_token: token })
  return { shareUrl: `/report/share/${token}` }
})
