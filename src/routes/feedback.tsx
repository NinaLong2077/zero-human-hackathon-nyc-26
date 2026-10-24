import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

import { submitFeedback } from '../lib/feedback.functions'
import {
  CALLBACK_URL,
  type Answers,
  Q1,
  Q1_CONDITIONAL,
  Q2,
  Q3,
  Q4,
  Q5_LABEL,
  Q6,
  Q7,
  Q8,
  Q9,
  Q10_LABEL,
  Q11_LABEL,
  type Choice,
} from '../lib/survey'

export const Route = createFileRoute('/feedback')({
  head: () => ({
    meta: [
      { title: 'Feedback | Purrfect Hour' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: Feedback,
})

type State = {
  q1: string
  q2: string
  q2_other: string
  q3: string
  q4: string
  q5: string
  q6: string
  q7: string[]
  q7_other: string
  q8: string
  q9: string
  q10: string
  q11: string
}
const empty: State = {
  q1: '', q2: '', q2_other: '', q3: '', q4: '', q5: '', q6: '', q7: [], q7_other: '', q8: '', q9: '', q10: '', q11: '',
}

const box =
  'mt-2 w-full rounded-xl border border-line bg-white px-4 text-base focus-visible:outline-2 focus-visible:outline-accent'

function Feedback() {
  const [ids, setIds] = useState<{ submissionId: string | null; taskId: string | null }>({ submissionId: null, taskId: null })
  const [ready, setReady] = useState(false)
  const [s, setS] = useState<State>(empty)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState<null | 'test' | 'live'>(null)
  const [visited, setVisited] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setIds({
      submissionId: p.get('teracSubmissionId') || p.get('submissionId'),
      taskId: p.get('taskId'),
    })
    setReady(true)
  }, [])

  const testMode = ready && !(ids.submissionId && ids.taskId)
  const set = <K extends keyof State>(k: K, v: State[K]) => setS((prev) => ({ ...prev, [k]: v }))

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const missing: string[] = []
    if (!s.q1) missing.push('question 1')
    if (s.q1 === Q1_CONDITIONAL && !s.q2) missing.push('what’s stopping you')
    if (s.q1 === Q1_CONDITIONAL && s.q2 === Q2.other && !s.q2_other.trim()) missing.push('your “Other” reason')
    if (!s.q3) missing.push('cat cafe question')
    if (!s.q4) missing.push('paying to spend time question')
    if (!s.q5.trim()) missing.push('what the site does')
    if (!s.q6) missing.push('the $12 visit question')
    if (s.q7.length === 0) missing.push('what you’d need to see')
    if (s.q7.includes('Other') && !s.q7_other.trim()) missing.push('your “Other” answer for what you’d need to see')
    if (!s.q8) missing.push('the Airbnb comparison')
    if (!s.q9) missing.push('the host question')
    if (!s.q10.trim()) missing.push('the one thing that would change your answers')
    if (s.q11 === '' || Number(s.q11) < 0 || !Number.isFinite(Number(s.q11))) missing.push('the most you’d pay')
    if (missing.length) {
      setError(`Please answer: ${missing.join(', ')}.`)
      return
    }
    setBusy(true)
    try {
      const answers: Partial<Answers> = {
        q1: s.q1,
        q3: s.q3,
        q4: s.q4,
        q5: s.q5,
        q6: s.q6,
        q7: s.q7,
        q8: s.q8,
        q9: s.q9,
        q10: s.q10,
        q11: Number(s.q11),
      }
      if (s.q1 === Q1_CONDITIONAL) {
        answers.q2 = s.q2
        if (s.q2 === Q2.other) answers.q2_other = s.q2_other
      }
      if (s.q7.includes('Other')) answers.q7_other = s.q7_other
      await submitFeedback({
        data: { submissionId: testMode ? null : ids.submissionId, taskId: testMode ? null : ids.taskId, answers: answers as Answers },
      })
      if (testMode) {
        setDone('test')
        window.scrollTo({ top: 0 })
      } else {
        setDone('live')
        const u = new URL(CALLBACK_URL)
        u.searchParams.set('teracSubmissionId', ids.submissionId!)
        u.searchParams.set('taskId', ids.taskId!)
        window.location.href = u.toString()
      }
    } catch (err: any) {
      setError(err?.message?.includes('secrets') ? 'Saving isn’t set up yet. Please try again later.' : 'Something went wrong saving your answers. Please try again.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Shell>
        <h1 className="font-display text-4xl font-bold tracking-tight">Thank you!</h1>
        <p className="mt-4 text-lg text-muted">
          {done === 'test'
            ? 'Your answers were saved and marked as a test submission, since this page was opened without a submission ID.'
            : 'Your answers were saved. Taking you back now…'}
        </p>
      </Shell>
    )
  }

  return (
    <Shell>
      <p className="text-sm font-semibold tracking-wide text-accent uppercase">Purrfect Hour feedback</p>
      <h1 className="mt-3 font-display text-4xl leading-tight font-bold tracking-tight md:text-5xl">Tell us what you think</h1>
      <p className="mt-4 text-lg text-muted">It takes about 5 minutes. There are no wrong answers.</p>
      {testMode && (
        <p className="mt-6 rounded-xl border border-line bg-card p-4 text-sm">
          <strong>Test mode.</strong> No submission ID was found in the link, so your answers will be marked as a test.
        </p>
      )}

      <form onSubmit={onSubmit} className="mt-12 space-y-16" noValidate>
        <section className="space-y-8">
          <Heading n={1}>About you</Heading>
          <Radios c={Q1} value={s.q1} onChange={(v) => set('q1', v)} />
          {s.q1 === Q1_CONDITIONAL && (
            <div>
              <Radios c={Q2} value={s.q2} onChange={(v) => set('q2', v)} />
              {s.q2 === Q2.other && (
                <input aria-label="Other reason" className={`${box} min-h-11`} value={s.q2_other} onChange={(e) => set('q2_other', e.target.value)} placeholder="Tell us more" />
              )}
            </div>
          )}
          <Radios c={Q3} value={s.q3} onChange={(v) => set('q3', v)} />
          <Radios c={Q4} value={s.q4} onChange={(v) => set('q4', v)} />
        </section>

        <section className="space-y-5">
          <Heading n={2}>Browse the site</Heading>
          <p className="text-muted">Spend about 2 minutes looking around, then come back to this tab.</p>
          <a
            href="/"
            target="_blank"
            rel="noopener"
            onClick={() => setVisited(true)}
            className="inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-7 font-semibold text-accent-ink hover:brightness-110"
          >
            Open the Purrfect Hour homepage <ExternalLink className="size-4" aria-hidden />
          </a>
          {visited && <p className="text-sm text-muted">Opened in a new tab. Come back here when you’re done.</p>}
        </section>

        <section className="space-y-8">
          <Heading n={3}>Your reaction</Heading>
          <label className="block font-semibold">
            <span className="text-muted">5.</span> {Q5_LABEL}
            <textarea rows={2} className={`${box} py-3 font-normal`} value={s.q5} onChange={(e) => set('q5', e.target.value)} />
          </label>
          <Radios c={Q6} n={6} value={s.q6} onChange={(v) => set('q6', v)} />
          <fieldset>
            <legend className="font-semibold">
              <span className="text-muted">7.</span> {Q7.label}
            </legend>
            <div className="mt-3 space-y-2">
              {Q7.options.map((o) => (
                <label key={o} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-2">
                  <input
                    type="checkbox"
                    className="size-5 accent-[#e8641b]"
                    checked={s.q7.includes(o)}
                    onChange={(e) => set('q7', e.target.checked ? [...s.q7, o] : s.q7.filter((x) => x !== o))}
                  />
                  {o}
                </label>
              ))}
            </div>
            {s.q7.includes('Other') && (
              <input aria-label="Other" className={`${box} min-h-11`} value={s.q7_other} onChange={(e) => set('q7_other', e.target.value)} placeholder="Tell us more" />
            )}
          </fieldset>
          <Radios c={Q8} n={8} value={s.q8} onChange={(v) => set('q8', v)} />
          <Radios c={Q9} n={9} value={s.q9} onChange={(v) => set('q9', v)} />
          <label className="block font-semibold">
            <span className="text-muted">10.</span> {Q10_LABEL}
            <textarea rows={3} className={`${box} py-3 font-normal`} value={s.q10} onChange={(e) => set('q10', e.target.value)} />
          </label>
          <label className="block font-semibold">
            <span className="text-muted">11.</span> {Q11_LABEL}
            <div className="relative mt-2 max-w-48">
              <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted">$</span>
              <input type="number" inputMode="decimal" min={0} step="0.01" className={`${box} mt-0 min-h-11 pl-8 font-normal`} value={s.q11} onChange={(e) => set('q11', e.target.value)} />
            </div>
          </label>
        </section>

        {error && (
          <p role="alert" className="rounded-xl border border-accent bg-card p-4 text-sm font-semibold">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !ready}
          className="min-h-12 w-full rounded-full bg-accent font-semibold text-accent-ink hover:brightness-110 disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Submit feedback'}
        </button>
      </form>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <main className="mx-auto max-w-2xl px-6 py-12 md:py-20">{children}</main>
    </div>
  )
}

function Heading({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="border-b border-line pb-3 font-display text-2xl font-bold">
      <span className="text-accent">Part {n}.</span> {children}
    </h2>
  )
}

function Radios({ c, value, onChange, n }: { c: Choice; value: string; onChange: (v: string) => void; n?: number }) {
  const num = n ?? Number(c.id.slice(1))
  return (
    <fieldset>
      <legend className="font-semibold">
        <span className="text-muted">{num}.</span> {c.label}
      </legend>
      <div className="mt-3 space-y-2">
        {c.options.map((o) => (
          <label key={o} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-line bg-white px-4 py-2">
            <input type="radio" name={c.id} className="size-5 accent-[#e8641b]" checked={value === o} onChange={() => onChange(o)} />
            {o}
          </label>
        ))}
      </div>
    </fieldset>
  )
}
