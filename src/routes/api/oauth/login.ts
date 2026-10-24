import { createFileRoute } from '@tanstack/react-router'
import { createServerOnlyFn } from '@tanstack/react-start'

import { publicOrigin } from '../../../lib/origin'

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const randomString = () => base64url(crypto.getRandomValues(new Uint8Array(32)))
async function challenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64url(new Uint8Array(digest))
}

const handle = createServerOnlyFn(async (request: Request) => {
  const { setCookie } = await import('@tanstack/react-start/server')
  const url = new URL(request.url)
  const verifier = randomString()
  const state = randomString()
  const nonce = randomString()
  const short = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 600 } as const

  // Only a path on this site. `//evil.com` and `/\evil.com` are absolute.
  const wanted = url.searchParams.get('redirect_to') ?? '/'
  setCookie('oauth_return', /^\/(?![/\\])/.test(wanted) ? wanted : '/', short)
  setCookie('oauth_verifier', verifier, short)
  setCookie('oauth_state', state, short)
  setCookie('oauth_nonce', nonce, short)

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.APP_ID!,
    redirect_uri: `${publicOrigin(request)}/api/oauth/callback`,
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: await challenge(verifier),
    code_challenge_method: 'S256',
  })
  return new Response(null, { status: 302, headers: { Location: `https://api.whop.com/oauth/authorize?${params}` } })
})

export const Route = createFileRoute('/api/oauth/login')({
  server: { handlers: { GET: ({ request }: { request: Request }) => handle(request) } },
} as any)
