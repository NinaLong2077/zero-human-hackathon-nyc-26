import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'

import { Q1 } from '../lib/survey'

export const Route = createFileRoute('/results')({
  head: () => ({ meta: [{ title: 'Results | Purrfect Hour' }, { name: 'robots', content: 'noindex' }] }),
  component: Results,
})

type Data = {
  total: number
  versions: string[]
  choices: { id: string; label: string; respondents: number; options: { label: string; count: number; percent: number }[] }[]
  text: { id: string; label: string; answers: { text: string; q1: string; version: string; at: string; test: boolean }[] }[]
  price: { count: number; average: number | null; median: number | null; min: number | null; max: number | null }
}

const KEY = 'purrfect-results-key'
const input = 'min-h-11 rounded-xl border border-line bg-white px-4 text-base focus-visible:outline-2 focus-visible:outline-accent'

function Results() {
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState('')
  const [version, setVersion] = useState('')
  const [q1, setQ1] = useState('')
  const [includeTest, setIncludeTest] = useState(false)

  const load = useCallback(
    async (k: string) => {
      setError('')
      const p = new URLSearchParams()
      if (version) p.set('version', version)
      if (q1) p.set('q1', q1)
      if (includeTest) p.set('include_test', '1')
      const res = await fetch(`/api/results?${p}`, { headers: { authorization: `Bearer ${k}` } })
      if (res.status === 401) {
        sessionStorage.removeItem(KEY)
        setAuthed(false)
        setData(null)
        setError('That key didn’t work.')
        return
      }
      if (!res.ok) {
        setError('Couldn’t load results.')
        return
      }
      setData(await res.json())
      setAuthed(true)
    },
    [version, q1, includeTest],
  )

  useEffect(() => {
    const saved = sessionStorage.getItem(KEY)
    if (saved) {
      setKey(saved)
      load(saved)
    }
  }, [load])

  if (!authed) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <main className="mx-auto max-w-md px-6 py-24">
          <h1 className="font-display text-3xl font-bold">Results</h1>
          <p className="mt-2 text-muted">Enter the results key to continue.</p>
          <form
            className="mt-6 flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              sessionStorage.setItem(KEY, key)
              load(key)
            }}
          >
            <input type="password" autoComplete="off" className={input} value={key} onChange={(e) => setKey(e.target.value)} aria-label="Results key" />
            <button className="min-h-12 rounded-full bg-accent font-semibold text-accent-ink">View results</button>
          </form>
          {error && <p className="mt-4 text-sm font-semibold">{error}</p>}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-4xl font-bold">Survey results</h1>
        <div className="mt-6 flex flex-wrap items-end gap-4 rounded-card border border-line bg-card p-5">
          <label className="text-sm font-semibold">
            Version
            <select className={`${input} mt-1 block`} value={version} onChange={(e) => setVersion(e.target.value)}>
              <option value="">All versions</option>
              {data?.versions.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Question 1 answer
            <select className={`${input} mt-1 block max-w-xs`} value={q1} onChange={(e) => setQ1(e.target.value)}>
              <option value="">Everyone</option>
              {Q1.options.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
            <input type="checkbox" className="size-5 accent-[#e8641b]" checked={includeTest} onChange={(e) => setIncludeTest(e.target.checked)} />
            Include test submissions
          </label>
          <p className="ml-auto text-sm text-muted">
            <strong className="text-ink">{data?.total ?? 0}</strong> responses
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {data?.choices.map((c) => (
            <section key={c.id}>
              <h2 className="font-semibold">
                {c.label} <span className="font-normal text-muted">({c.respondents} answered)</span>
              </h2>
              <ul className="mt-3 space-y-2">
                {c.options.map((o) => (
                  <li key={o.label}>
                    <div className="flex justify-between gap-4 text-sm">
                      <span>{o.label}</span>
                      <span className="shrink-0 tabular-nums">
                        {o.count} · {o.percent}%
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-line">
                      <div className="h-2 rounded-full bg-accent" style={{ width: `${o.percent}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {data && (
            <section>
              <h2 className="font-semibold">What’s the most you’d pay for one hour with a cat?</h2>
              {data.price.count ? (
                <p className="mt-2 text-sm">
                  {data.price.count} answers. Average ${data.price.average}, median ${data.price.median}, lowest ${data.price.min}, highest ${data.price.max}.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted">No answers yet.</p>
              )}
            </section>
          )}

          {data?.text.map((t) => (
            <section key={t.id}>
              <h2 className="font-semibold">
                {t.label} <span className="font-normal text-muted">({t.answers.length})</span>
              </h2>
              <ul className="mt-3 space-y-2">
                {t.answers.map((a, i) => (
                  <li key={i} className="rounded-xl border border-line bg-white p-4 text-sm">
                    <p>{a.text}</p>
                    <p className="mt-2 text-xs text-muted">
                      {a.q1} · {a.version}
                      {a.test ? ' · test' : ''} · {new Date(a.at).toLocaleString()}
                    </p>
                  </li>
                ))}
                {t.answers.length === 0 && <li className="text-sm text-muted">No answers yet.</li>}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
