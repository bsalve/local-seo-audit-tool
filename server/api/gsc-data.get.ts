import { createRequire } from 'module'
import { join } from 'path'

const _require = createRequire(import.meta.url)

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  const user    = session?.user
  if (!user?.id) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const { url } = getQuery(event) as { url?: string }
  if (!url) {
    throw createError({ statusCode: 400, message: 'url query parameter is required' })
  }

  const { getGscData } = _require(join(process.cwd(), 'utils/gsc.js'))
  const data = await getGscData(user.id, url)
  return data ?? { connected: false }
})
