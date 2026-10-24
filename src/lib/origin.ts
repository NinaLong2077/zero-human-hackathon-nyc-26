/** The public origin the visitor used. Behind the preview proxy, request.url can say localhost. */
export function publicOrigin(request: Request): string {
  const url = new URL(request.url)
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? url.host
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:|$)/.test(host)) return url.origin
  const proto = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || 'https'
  return `${proto}://${host.split(',')[0].trim()}`
}
