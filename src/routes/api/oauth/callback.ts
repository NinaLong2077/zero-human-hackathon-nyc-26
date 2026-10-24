import { createFileRoute } from '@tanstack/react-router'
import { createServerOnlyFn } from '@tanstack/react-start'

import { publicOrigin } from '../../../lib/origin'

const handle = createServerOnlyFn(async (request: Request) => {
  const { getCookie, setCookie } = await import('@tanstack/react-start/server')
  const { writeSession } = await import('../../../lib/session.server')
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const verifier = getCookie('oauth_verifier')
  const expectedState = getCookie('oauth_state')
  const returnTo = getCookie('oauth_return') ?? '/'

  for (const name of ['oauth_verifier', 'oauth_state', 'oauth_nonce', 'oauth_return']) {
    setCookie(name, '', { path: '/', maxAge: 0 })
  }
  const fail = () => new Response(null, { status: 302, headers: { Location: '/?error=auth_failed' } })
  if (!code || !state || !verifier || state !== expectedState) return fail()

  const response = await fetch(`${process.env.WHOP_API_ORIGIN}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.APP_ID!,
      code,
      code_verifier: verifier,
      redirect_uri: `${publicOrigin(request)}/api/oauth/callback`,
    }),
  })
  if (!response.ok) {
    console.error('[oauth] token exchange failed', response.status)
    return fail()
  }
  writeSession((await response.json()) as { access_token: string; refresh_token: string; expires_in: number })
  return new Response(null, { status: 302, headers: { Location: returnTo } })
})

export const Route = createFileRoute('/api/oauth/callback')({
  server: { handlers: { GET: ({ request }: { request: Request }) => handle(request) } },
} as any)
