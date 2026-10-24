// Server only. Credentials come from app secrets, never from source.
import { createClient } from '@libsql/client/web'

let ready: Promise<ReturnType<typeof createClient>> | null = null

export function db() {
  if (!ready) {
    ready = (async () => {
      const url = process.env.TURSO_DATABASE_URL
      const authToken = process.env.TURSO_AUTH_TOKEN
      if (!url || !authToken) throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set as app secrets')
      const client = createClient({ url: url.replace(/^libsql:/, 'https:'), authToken })
      await client.batch(
        [
          `create table if not exists feedback_responses (
            submission_id text primary key, task_id text, version text not null, is_test integer not null default 0,
            q1 text not null, answers text not null, created_at text not null)`,
          `create table if not exists listings (
            id text primary key, owner_id text not null, owner_name text not null, name text not null, breed text not null,
            age text not null, city text not null, address text, rate real not null, min_hours integer not null,
            max_hours integer not null, bio text not null, traits text not null, hue integer not null, created_at text not null)`,
          `create table if not exists listing_photos (
            id text primary key, listing_id text not null, position integer not null, data_url text not null)`,
          `create index if not exists listing_photos_listing on listing_photos (listing_id, position)`,
          `create table if not exists bookings (
            id text primary key, listing_id text not null, cat_name text not null, host_id text, guest_id text not null,
            guest_name text not null, date text not null, time text not null, hours integer not null, total real not null,
            status text not null default 'pending', created_at text not null)`,
        ],
        'write',
      )
      await client.execute(
        'create table if not exists host_accounts (user_id text primary key, account_id text not null, created_at text not null)',
      )
      // Added after launch: ignore "duplicate column" on later runs.
      for (const col of [
        'payment_status text not null default \'unpaid\'',
        'checkout_id text',
        'plan_id text',
        'pay_account_id text',
        'paid_at text',
        'host_paid_at text',
      ]) {
        try {
          await client.execute(`alter table bookings add column ${col}`)
        } catch {}
      }
      await client.execute('alter table listings add column owner_email text').catch(() => {})
      return client
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

export function isAuthorized(request: Request) {
  const expected = process.env.RESULTS_KEY
  if (!expected) return false
  const auth = request.headers.get('authorization') ?? ''
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : (request.headers.get('x-results-key') ?? '')
  if (given.length !== expected.length) return false
  let diff = 0
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i)
  return diff === 0
}
