import { createServerFn } from '@tanstack/react-start'

import {
  type Answers,
  MULTI_CHOICES,
  Q1,
  Q1_CONDITIONAL,
  Q2,
  Q3,
  Q4,
  Q6,
  Q7,
  Q8,
  Q9,
  SURVEY_VERSION,
} from './survey'

type Input = { submissionId: string | null; taskId: string | null; answers: Answers }

function text(v: unknown, max = 2000) {
  return typeof v === 'string' ? v.trim().slice(0, max) : ''
}
function oneOf(v: unknown, options: string[]) {
  return typeof v === 'string' && options.includes(v) ? v : ''
}

function validate(raw: any): Input {
  const a = raw?.answers ?? {}
  const clean: Partial<Answers> = {}
  clean.q1 = oneOf(a.q1, Q1.options)
  clean.q3 = oneOf(a.q3, Q3.options)
  clean.q4 = oneOf(a.q4, Q4.options)
  clean.q5 = text(a.q5)
  clean.q6 = oneOf(a.q6, Q6.options)
  clean.q8 = oneOf(a.q8, Q8.options)
  clean.q9 = oneOf(a.q9, Q9.options)
  clean.q10 = text(a.q10)
  const n = Number(a.q11)
  clean.q7 = Array.isArray(a.q7) ? Q7.options.filter((o) => a.q7.includes(o)) : []

  const missing: string[] = []
  for (const k of ['q1', 'q3', 'q4', 'q5', 'q6', 'q8', 'q9', 'q10'] as const) if (!clean[k]) missing.push(k)
  if (clean.q7!.length === 0) missing.push('q7')
  if (!Number.isFinite(n) || n < 0 || n > 100000 || a.q11 === '' || a.q11 == null) missing.push('q11')
  else clean.q11 = Math.round(n * 100) / 100

  if (clean.q1 === Q1_CONDITIONAL) {
    clean.q2 = oneOf(a.q2, Q2.options)
    if (!clean.q2) missing.push('q2')
    if (clean.q2 === Q2.other) {
      clean.q2_other = text(a.q2_other, 500)
      if (!clean.q2_other) missing.push('q2_other')
    }
  }
  if (clean.q7!.includes(Q7.other!)) {
    clean.q7_other = text(a.q7_other, 500)
    if (!clean.q7_other) missing.push('q7_other')
  }
  if (missing.length) throw new Error(`Please answer: ${missing.join(', ')}`)

  const sid = text(raw?.submissionId, 200)
  const tid = text(raw?.taskId, 200)
  return { submissionId: sid || null, taskId: tid || null, answers: clean as Answers }
}

export const submitFeedback = createServerFn({ method: 'POST' })
  .validator((raw: unknown) => validate(raw))
  .handler(async ({ data }) => {
    const { db } = await import('./db.server')
    const client = await db()
    const isTest = !data.submissionId
    const id = data.submissionId ?? `test-${crypto.randomUUID()}`
    try {
      await client.execute({
        sql: `insert into feedback_responses (submission_id, task_id, version, is_test, q1, answers, created_at)
              values (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, data.taskId, SURVEY_VERSION, isTest ? 1 : 0, data.answers.q1, JSON.stringify(data.answers), new Date().toISOString()],
      })
    } catch (e: any) {
      if (/UNIQUE|constraint/i.test(String(e?.message))) return { status: 'duplicate' as const, isTest }
      throw e
    }
    return { status: 'saved' as const, isTest }
  })

export { MULTI_CHOICES }
