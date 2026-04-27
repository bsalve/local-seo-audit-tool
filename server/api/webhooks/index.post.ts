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

  const plan = user.plan ?? 'free'
  if (plan !== 'pro' && plan !== 'agency') {
    throw createError({ statusCode: 403, message: 'Webhooks require a Pro or Agency plan.' })
  }

  const body = await readBody(event)
  const { url, events } = body ?? {}
  if (!url || typeof url !== 'string') throw createError({ statusCode: 400, message: 'url is required' })

  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error()
  } catch {
    throw createError({ statusCode: 400, message: 'Invalid webhook URL — must be http or https.' })
  }

  const eventsStr = (typeof events === 'string' && events.trim())
    ? events.trim()
    : 'audit.complete,site.complete'

  const [{ count }] = await db('webhooks').where({ user_id: user.id }).count('id as count')
  if (Number(count) >= 10) {
    throw createError({ statusCode: 400, message: 'Maximum of 10 webhooks per account.' })
  }

  const secret = randomBytes(32).toString('hex')
  const [row] = await db('webhooks')
    .insert({ user_id: user.id, url, events: eventsStr, secret })
    .returning(['id', 'url', 'events', 'created_at'])

  return { id: row.id, url: row.url, events: row.events, created_at: row.created_at, secret }
})
