import { createServerFn } from '@tanstack/react-start'

import { PLATFORM_ACCOUNT_ID } from './config'
import { type Listing, SAMPLES } from './samples'

export type BookingRow = {
  id: string
  listingId: string
  catName: string
  guestName: string
  date: string
  time: string
  hours: number
  total: number
  status: 'pending' | 'accepted' | 'declined'
  paymentStatus: 'unpaid' | 'awaiting' | 'paid'
  address?: string | null
  createdAt: string
}

const MAX_PHOTOS = 5
const MAX_PHOTO_CHARS = 450_000

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

async function requireUser() {
  const { currentUser } = await import('./session.server')
  const u = await currentUser()
  if (!u) throw new Error('Please sign in first.')
  return { id: u.sub, name: u.name ?? u.preferred_username ?? 'Guest', email: u.email }
}

export const listListings = createServerFn({ method: 'GET' }).handler(async (): Promise<Listing[]> => {
  const { db } = await import('./db.server')
  const client = await db()
  const rows = (await client.execute('select * from listings order by created_at desc limit 200')).rows
  const photos = (await client.execute('select id, listing_id from listing_photos order by listing_id, position')).rows
  const byListing = new Map<string, string[]>()
  for (const p of photos) {
    const k = String(p.listing_id)
    byListing.set(k, [...(byListing.get(k) ?? []), `/api/photos/${p.id}`])
  }
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    breed: String(r.breed),
    age: String(r.age),
    city: String(r.city),
    rate: Number(r.rate),
    minHours: Number(r.min_hours),
    maxHours: Number(r.max_hours),
    bio: String(r.bio),
    traits: JSON.parse(String(r.traits)) as string[],
    hue: Number(r.hue),
    owner: String(r.owner_name),
    ownerId: String(r.owner_id),
    images: byListing.get(String(r.id)) ?? [],
  }))
})

export const createListing = createServerFn({ method: 'POST' })
  .validator((raw: unknown) => raw as any)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const name = str(data?.name, 60)
    const city = str(data?.city, 80)
    const bio = str(data?.bio, 600)
    const rate = Number(data?.rate)
    const min = Math.max(1, Math.min(12, Math.round(Number(data?.minHours))))
    const max = Math.max(min, Math.min(12, Math.round(Number(data?.maxHours))))
    if (!name || !city || !bio) throw new Error('Name, neighborhood and bio are required.')
    if (!Number.isFinite(rate) || rate < 1 || rate > 500) throw new Error('Choose a price between $1 and $500 per hour.')
    const photos: string[] = (Array.isArray(data?.photos) ? data.photos : []).slice(0, MAX_PHOTOS)
    for (const p of photos) {
      if (typeof p !== 'string' || !p.startsWith('data:image/') || p.length > MAX_PHOTO_CHARS) {
        throw new Error('One of the photos is too large or not an image.')
      }
    }
    const traits = (Array.isArray(data?.traits) ? data.traits : []).map((t: unknown) => str(t, 30)).filter(Boolean).slice(0, 4)
    const id = crypto.randomUUID()
    const { db } = await import('./db.server')
    const client = await db()
    await client.batch(
      [
        {
          sql: `insert into listings (id, owner_id, owner_name, name, breed, age, city, address, rate, min_hours, max_hours, bio, traits, hue, created_at, owner_email)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            id, user.id, str(data?.owner, 60) || user.name, name, str(data?.breed, 60) || 'Cat', str(data?.age, 40) || 'Age unknown',
            city, str(data?.address, 200) || null, Math.round(rate * 100) / 100, min, max, bio, JSON.stringify(traits),
            Math.floor(Math.random() * 360), new Date().toISOString(), user.email ?? null,
          ],
        },
        ...photos.map((p, i) => ({
          sql: 'insert into listing_photos (id, listing_id, position, data_url) values (?, ?, ?, ?)',
          args: [crypto.randomUUID(), id, i, p],
        })),
      ],
      'write',
    )
    return { id }
  })

export const createBooking = createServerFn({ method: 'POST' })
  .validator((raw: unknown) => raw as any)
  .handler(async ({ data }): Promise<BookingRow> => {
    const user = await requireUser()
    const { db } = await import('./db.server')
    const client = await db()
    const listingId = str(data?.listingId, 80)
    let name: string, rate: number, min: number, max: number, hostId: string | null
    const sample = SAMPLES.find((s) => s.id === listingId)
    if (sample) {
      throw new Error('That listing is an AI-generated example and can’t be booked.')
    } else {
      const r = (await client.execute({ sql: 'select * from listings where id = ?', args: [listingId] })).rows[0]
      if (!r) throw new Error('That cat is no longer listed.')
      name = String(r.name); rate = Number(r.rate); min = Number(r.min_hours); max = Number(r.max_hours); hostId = String(r.owner_id)
    }
    if (hostId === user.id) throw new Error('You can’t book your own cat.')
    const hours = Math.round(Number(data?.hours))
    if (!(hours >= min && hours <= max)) throw new Error(`Visits are ${min} to ${max} hours.`)
    const date = str(data?.date, 10)
    const time = str(data?.time, 5)
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < yesterday) throw new Error('Pick a date that hasn’t passed.')
    if (!/^\d{2}:\d{2}$/.test(time)) throw new Error('Pick a start time.')
    const row: BookingRow = {
      id: crypto.randomUUID(), listingId, catName: name, guestName: user.name, date, time, hours,
      total: Math.round(hours * rate * 100) / 100, status: 'pending', paymentStatus: 'unpaid', createdAt: new Date().toISOString(),
    }
    await client.execute({
      sql: `insert into bookings (id, listing_id, cat_name, host_id, guest_id, guest_name, date, time, hours, total, status, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      args: [row.id, listingId, name, hostId, user.id, user.name, date, time, hours, row.total, row.createdAt],
    })
    return row
  })

async function isPaid(account: string, planId: string) {
  const { whop } = await import('./whop.server')
  try {
    const r = await whop<{ data: { status?: string }[] }>(`/payments?account_id=${account}&plan_id=${planId}&first=10`)
    return (r.data ?? []).some((p) => p.status === 'paid')
  } catch {
    return false
  }
}

export const myBookings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<{ guest: BookingRow[]; host: BookingRow[] }> => {
    const user = await requireUser()
    const { db } = await import('./db.server')
    const client = await db()

    // Confirm any checkout the guest has started.
    const open = (
      await client.execute({
        sql: `select id, plan_id, pay_account_id from bookings where guest_id = ? and payment_status = 'awaiting' and plan_id is not null`,
        args: [user.id],
      })
    ).rows
    for (const r of open) {
      if (await isPaid(String(r.pay_account_id), String(r.plan_id))) {
        await client.execute({
          sql: `update bookings set payment_status = 'paid', paid_at = ? where id = ?`,
          args: [new Date().toISOString(), r.id],
        })
      }
    }

    const map = (r: any, withAddress: boolean): BookingRow => ({
      id: String(r.id), listingId: String(r.listing_id), catName: String(r.cat_name), guestName: String(r.guest_name),
      date: String(r.date), time: String(r.time), hours: Number(r.hours), total: Number(r.total),
      status: r.status as BookingRow['status'], paymentStatus: r.payment_status as BookingRow['paymentStatus'],
      createdAt: String(r.created_at),
      address: withAddress && r.status === 'accepted' ? (r.address ?? null) : undefined,
    })
    const guest = (
      await client.execute({
        sql: `select b.*, l.address from bookings b left join listings l on l.id = b.listing_id
              where b.guest_id = ? order by b.created_at desc limit 100`,
        args: [user.id],
      })
    ).rows.map((r) => map(r, true))
    const host = (
      await client.execute({
        sql: 'select * from bookings where host_id = ? order by created_at desc limit 100',
        args: [user.id],
      })
    ).rows.map((r) => map(r, false))
    return { guest, host }
  },
)

const allowedOrigin = (o: unknown) => {
  try {
    const u = new URL(String(o))
    return u.protocol === 'https:' && (u.hostname.endsWith('.whop.site') || u.hostname.endsWith('.whop.com')) ? u.origin : null
  } catch {
    return null
  }
}

export const startPayment = createServerFn({ method: 'POST' })
  .validator((raw: unknown) => raw as any)
  .handler(async ({ data }): Promise<{ url: string }> => {
    const user = await requireUser()
    const origin = allowedOrigin(data?.origin)
    if (!origin) throw new Error('Unsupported address.')
    const { db } = await import('./db.server')
    const { whop } = await import('./whop.server')
    const client = await db()
    const b = (
      await client.execute({
        sql: `select b.*, l.owner_name, l.owner_email from bookings b left join listings l on l.id = b.listing_id where b.id = ? and b.guest_id = ?`,
        args: [str(data?.bookingId, 80), user.id],
      })
    ).rows[0]
    if (!b) throw new Error('Booking not found.')
    if (b.status !== 'accepted') throw new Error('The host hasn’t accepted this request yet.')
    if (b.payment_status === 'paid') throw new Error('This booking is already paid.')

    // Every booking is paid to Purrfect Hour; hosts are paid out from there.
    const account = PLATFORM_ACCOUNT_ID
    const total = Number(b.total)

    const cfg = await whop<{ id: string; purchase_url: string; plan: { id: string } }>('/checkout_configurations', {
      method: 'POST',
      body: {
        account_id: account,
        plan: {
          currency: 'usd',
          plan_type: 'one_time',
          initial_price: total,
          title: `Visit with ${String(b.cat_name)}`.slice(0, 30),
          product: { external_identifier: 'cat-visit', title: 'Cat visit', visibility: 'hidden' },
        },
        metadata: { booking_id: String(b.id), guest_id: user.id },
        redirect_url: `${origin}/?paid=${encodeURIComponent(String(b.id))}`,
      },
    })
    await client.execute({
      sql: `update bookings set payment_status = 'awaiting', checkout_id = ?, plan_id = ?, pay_account_id = ? where id = ?`,
      args: [cfg.id, cfg.plan.id, account, b.id],
    })
    return { url: cfg.purchase_url }
  })

export const respondBooking = createServerFn({ method: 'POST' })
  .validator((raw: unknown) => raw as any)
  .handler(async ({ data }) => {
    const user = await requireUser()
    const action = data?.action === 'accept' ? 'accepted' : data?.action === 'decline' ? 'declined' : null
    if (!action) throw new Error('Unknown action.')
    const { db } = await import('./db.server')
    const client = await db()
    const res = await client.execute({
      sql: `update bookings set status = ? where id = ? and host_id = ? and status = 'pending'`,
      args: [action, str(data?.id, 80), user.id],
    })
    if (res.rowsAffected === 0) throw new Error('That request can’t be changed.')
    return { status: action }
  })
