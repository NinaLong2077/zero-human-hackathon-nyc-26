import { createServerFn } from '@tanstack/react-start'

export const getMe = createServerFn({ method: 'GET' }).handler(async () => {
  const { currentUser } = await import('./session.server')
  const u = await currentUser()
  return u ? { id: u.sub, name: u.name ?? u.preferred_username ?? 'Account', picture: u.picture ?? null } : null
})

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  const { clearSession } = await import('./session.server')
  clearSession()
  return { ok: true }
})
