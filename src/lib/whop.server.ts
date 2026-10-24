// Server only. Calls the Whop API as the app's own company; the platform injects the key.
export async function whop<T = any>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${process.env.WHOP_API_ORIGIN}/api/v1${path}`, {
    method: init?.method ?? 'GET',
    // In production the platform replaces this header with the app's company key; in the sandbox it carries a dev token.
    headers: {
      'content-type': 'application/json',
      // Without this the API answers as its oldest version, which expects different fields.
      'api-version-date': '2026-10-24',
      authorization: `Bearer ${process.env.WHOP_API_KEY ?? ''}` },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {}
  if (!res.ok) {
    const msg = json?.error?.message ?? json?.message ?? json?.error ?? text.slice(0, 200)
    throw new Error(`Whop API ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`)
  }
  return json as T
}
