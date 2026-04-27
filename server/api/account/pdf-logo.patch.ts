import { createRequire } from 'module'
import { join } from 'path'

const _require = createRequire(import.meta.url)

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user    = (session as any)?.user
  if (!user?.id) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { logoUrl } = await readBody(event) as { logoUrl?: string }

  let safeUrl: string | null = null
  if (logoUrl && typeof logoUrl === 'string') {
    try {
      const parsed = new URL(logoUrl)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') safeUrl = logoUrl
    } catch {}
  }

  const db = _require(join(process.cwd(), 'utils/db.js'))
  if (!db) throw createError({ statusCode: 503, message: 'Database not available' })

  await db('users').where({ id: user.id }).update({ pdf_logo_url: safeUrl })
  return { ok: true }
})
