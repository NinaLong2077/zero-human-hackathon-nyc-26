import { createFileRoute } from '@tanstack/react-router'
import { createServerOnlyFn } from '@tanstack/react-start'

import { PLATFORM_FEE_PERCENT } from '../../lib/config'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

const handle = createServerOnlyFn(async (request: Request) => {
  const { db, isAuthorized } = await import('../../lib/db.server')
  if (!isAuthorized(request)) return json({ error: 'Unauthorized' }, 401)
  const client = await db()

  if (request.method === 'POST') {
    const body = (await request.json().catch(() => ({}))) as { ids?: string[] }
    const ids = (body.ids ?? []).filter((x) => typeof x === 'string').slice(0, 200)
    const now = new Date().toISOString()
    for (const id of ids) {
      await client.execute({ sql: 'update bookings set host_paid_at = ? where id = ? and payment_status = ? and host_paid_at is null', args: [now, id, 'paid'] })
    }
    return json({ marked: ids.length })
  }

  const rows = (
    await client.execute(
      `select b.id, b.cat_name, b.guest_name, b.date, b.time, b.hours, b.total, b.paid_at, b.host_paid_at, b.listing_id,
              l.owner_name, l.owner_email
         from bookings b left join listings l on l.id = b.listing_id
        where b.payment_status = 'paid' order by b.paid_at desc limit 500`,
    )
  ).rows.map((r) => {
    const total = Number(r.total)
    const hostShare = Math.round(total * (100 - PLATFORM_FEE_PERCENT)) / 100
    return {
      id: String(r.id),
      cat: String(r.cat_name),
      guest: String(r.guest_name),
      date: String(r.date),
      time: String(r.time),
      hours: Number(r.hours),
      total,
      hostShare,
      host: r.owner_name ? String(r.owner_name) : 'Example listing',
      hostEmail: r.owner_email ? String(r.owner_email) : null,
      paidAt: r.paid_at ? String(r.paid_at) : null,
      paidOutAt: r.host_paid_at ? String(r.host_paid_at) : null,
    }
  })
  return json({ feePercent: PLATFORM_FEE_PERCENT, bookings: rows })
})

export const Route = createFileRoute('/api/payouts')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handle(request),
      POST: ({ request }: { request: Request }) => handle(request),
    },
  },
} as any)
