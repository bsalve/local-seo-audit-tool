import { createRequire } from 'module'
import { join } from 'path'

const _require = createRequire(import.meta.url)

export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, message: 'Not found' })
  }

  const session = await getUserSession(event)
  const user    = session?.user
  if (!user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { plan } = await readBody(event) as { plan?: string }
  if (!['free', 'pro', 'agency'].includes(plan ?? '')) {
    throw createError({ statusCode: 400, message: 'Invalid plan' })
  }

  const db = _require(join(process.cwd(), 'utils/db.js'))
  if (!db) throw createError({ statusCode: 503, message: 'Database not available' })

  await db('users').where({ id: user.id }).update({ plan })

  await setUserSession(event, {
    user: { ...user, plan },
  })

  return { ok: true, plan }
})
