import { createRequire } from 'module'
import { join } from 'path'

const _require = createRequire(import.meta.url)

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user: googleUser, tokens }: { user: any, tokens: any }) {
    const db    = _require(join(process.cwd(), 'utils/db.js'))
    const email = _require(join(process.cwd(), 'utils/email.js'))

    if (!db) {
      await setUserSession(event, {
        user: { id: 0, name: googleUser.name, email: googleUser.email, avatar_url: googleUser.picture, plan: 'free' },
      })
      return sendRedirect(event, '/dashboard')
    }

    const tokenExpiry = Date.now() + ((tokens?.expires_in ?? 3600) * 1000)

    const existing = await db('users').where({ google_id: googleUser.sub }).first()
    let userId: number
    let isNew = false

    if (existing) {
      const updateData: any = {
        name: googleUser.name,
        email: googleUser.email,
        avatar_url: googleUser.picture,
        google_access_token: tokens?.access_token ?? null,
        google_token_expiry: tokenExpiry,
      }
      if (tokens?.refresh_token) updateData.google_refresh_token = tokens.refresh_token
      await db('users').where({ google_id: googleUser.sub }).update(updateData)
      userId = existing.id
    } else {
      const [newUser] = await db('users')
        .insert({
          google_id: googleUser.sub,
          name: googleUser.name,
          email: googleUser.email,
          avatar_url: googleUser.picture,
          google_access_token: tokens?.access_token ?? null,
          google_refresh_token: tokens?.refresh_token ?? null,
          google_token_expiry: tokenExpiry,
        })
        .returning(['id'])
      userId = newUser.id
      isNew = true
    }

    const dbUser = await db('users').where({ id: userId }).first()
    await setUserSession(event, {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
        avatar_url: dbUser.avatar_url,
        plan: dbUser.plan || 'free',
      },
    })

    if (isNew && dbUser.email && email.isConfigured()) {
      email.sendWelcome(dbUser.email, dbUser.name).catch((e: any) => console.error('[email] welcome failed:', e.message))
    }

    return sendRedirect(event, '/dashboard')
  },
  onError(event, error) {
    console.error('Google OAuth error:', error)
    return sendRedirect(event, '/?auth_error=1')
  },
})
