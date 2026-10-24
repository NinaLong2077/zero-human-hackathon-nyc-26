// Server only. Whop is the identity provider; tokens live in httpOnly cookies.
import { getCookie, setCookie } from '@tanstack/react-start/server'

const COOKIE = { httpOnly: true, secure: true, sameSite: 'lax', path: '/' } as const

type Token = { access_token: string; refresh_token: string; expires_in: number }

export function writeSession(token: Token) {
  setCookie('wa', token.access_token, { ...COOKIE, maxAge: token.expires_in })
  setCookie('wr', token.refresh_token, { ...COOKIE, maxAge: 60 * 60 * 24 * 30 })
}

export function clearSession() {
  for (const name of ['wa', 'wr']) setCookie(name, '', { ...COOKIE, maxAge: 0 })
}

export type UserInfo = {
  sub: string
  name?: string
  preferred_username?: string
  picture?: string
  email?: string
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getCookie('wr')
  if (!refreshToken) return null
  const response = await fetch(`${process.env.WHOP_API_ORIGIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: process.env.APP_ID!, refresh_token: refreshToken }),
  })
  if (!response.ok) return null
  const token = (await response.json()) as Token
  writeSession(token)
  return token.access_token
}

async function fetchUserinfo(accessToken: string): Promise<UserInfo | null> {
  const response = await fetch(`${process.env.WHOP_API_ORIGIN}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}`, 'x-whop-inject-key': 'none' },
  })
  if (!response.ok) return null
  return (await response.json()) as UserInfo
}

export async function currentUser(): Promise<UserInfo | null> {
  let accessToken = getCookie('wa')
  if (!accessToken) accessToken = (await refreshAccessToken()) ?? undefined
  if (!accessToken) return null
  const profile = await fetchUserinfo(accessToken)
  if (profile) return profile
  const retried = await refreshAccessToken()
  return retried ? await fetchUserinfo(retried) : null
}
