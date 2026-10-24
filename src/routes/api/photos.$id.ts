import { createFileRoute } from '@tanstack/react-router'
import { createServerOnlyFn } from '@tanstack/react-start'

const handle = createServerOnlyFn(async (id: string) => {
  const { db } = await import('../../lib/db.server')
  const client = await db()
  const row = (await client.execute({ sql: 'select data_url from listing_photos where id = ?', args: [id] })).rows[0]
  const m = row && /^data:(image\/[a-z+.-]+);base64,(.+)$/s.exec(String(row.data_url))
  if (!m) return new Response('Not found', { status: 404 })
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
  return new Response(bytes, {
    headers: { 'content-type': m[1], 'cache-control': 'public, max-age=31536000, immutable' },
  })
})

export const Route = createFileRoute('/api/photos/$id')({
  server: { handlers: { GET: ({ params }: { params: { id: string } }) => handle(params.id) } },
} as any)
