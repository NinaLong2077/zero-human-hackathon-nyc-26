import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

export const Route = createFileRoute('/payouts')({
  head: () => ({ meta: [{ title: 'Host payouts | Purrfect Hour' }, { name: 'robots', content: 'noindex' }] }),
  component: Payouts,
})

type Row = {
  id: string; cat: string; guest: string; date: string; time: string; hours: number; total: number
  hostShare: number; host: string; hostEmail: string | null; paidAt: string | null; paidOutAt: string | null
}
const KEY = 'purrfect-results-key'
const usd = (n: number) => `$${n.toFixed(2)}`
const input = 'min-h-11 rounded-xl border border-line bg-white px-4 text-base focus-visible:outline-2 focus-visible:outline-accent'

function Payouts() {
  const [key, setKey] = useState('')
  const [rows, setRows] = useState<Row[] | null>(null)
  const [fee, setFee] = useState(0)
  const [error, setError] = useState('')

  const load = useCallback(async (k: string) => {
    setError('')
    const res = await fetch('/api/payouts', { headers: { authorization: `Bearer ${k}` } })
    if (res.status === 401) {
      sessionStorage.removeItem(KEY)
      setRows(null)
      setError('That key didn’t work.')
      return
    }
    const d = await res.json()
    setRows(d.bookings)
    setFee(d.feePercent)
  }, [])

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY)
    if (saved) {
      setKey(saved)
      load(saved)
    }
  }, [load])

  async function markPaid(ids: string[]) {
    await fetch('/api/payouts', { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ ids }) })
    load(key)
  }

  if (!rows) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <main className="mx-auto max-w-md px-6 py-24">
          <h1 className="font-display text-3xl font-bold">Host payouts</h1>
          <p className="mt-2 text-muted">Enter the results key to continue.</p>
          <form className="mt-6 flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); sessionStorage.setItem(KEY, key); load(key) }}>
            <input type="password" autoComplete="off" className={input} value={key} onChange={(e) => setKey(e.target.value)} aria-label="Results key" />
            <button className="min-h-12 rounded-full bg-accent font-semibold text-accent-ink">View payouts</button>
          </form>
          {error && <p className="mt-4 text-sm font-semibold">{error}</p>}
        </main>
      </div>
    )
  }

  const owed = rows.filter((r) => !r.paidOutAt && r.hostEmail)
  const byHost = new Map<string, { email: string | null; total: number; ids: string[] }>()
  for (const r of owed) {
    const h = byHost.get(r.host) ?? { email: r.hostEmail, total: 0, ids: [] }
    h.total += r.hostShare
    h.ids.push(r.id)
    byHost.set(r.host, h)
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl font-bold">Host payouts</h1>
        <p className="mt-2 text-muted">
          Guests pay into your Purrfect Hour balance. Send each host their share, then mark it paid. Fee kept by Purrfect Hour: {fee}%.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold">Owed to hosts</h2>
        {byHost.size === 0 ? (
          <p className="mt-3 text-muted">Nothing owed right now.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {[...byHost].map(([host, h]) => (
              <li key={host} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <span>
                  <span className="font-semibold">{host}</span>
                  <span className="block text-sm text-muted">{h.email} · {h.ids.length} visit{h.ids.length === 1 ? '' : 's'}</span>
                </span>
                <span className="font-display text-2xl font-bold">{usd(h.total)}</span>
                <button onClick={() => markPaid(h.ids)} className="min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper">
                  Mark paid out
                </button>
              </li>
            ))}
          </ul>
        )}

        <h2 className="mt-12 font-display text-2xl font-bold">All paid bookings</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-3">
              <span>{r.cat} · {r.guest}</span>
              <span className="text-muted">{r.date} {r.time} · {r.hours}h</span>
              <span>{usd(r.total)} → host {usd(r.hostShare)}</span>
              <span className="font-semibold">{r.paidOutAt ? 'Paid out' : r.hostEmail ? 'Owed' : 'Example'}</span>
            </li>
          ))}
          {rows.length === 0 && <li className="py-3 text-muted">No paid bookings yet.</li>}
        </ul>
      </main>
    </div>
  )
}
