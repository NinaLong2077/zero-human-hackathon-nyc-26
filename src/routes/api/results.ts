import { createFileRoute } from '@tanstack/react-router'
import { createServerOnlyFn } from '@tanstack/react-start'

import {
  Q5_LABEL,
  Q10_LABEL,
  Q11_LABEL,
  Q1,
  Q2,
  Q3,
  Q4,
  Q6,
  Q7,
  Q8,
  Q9,
  type Choice,
} from '../../lib/survey'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })

const handle = createServerOnlyFn(async (request: Request) => {
        const { db, isAuthorized } = await import('../../lib/db.server')
        if (!isAuthorized(request)) return json({ error: 'Unauthorized' }, 401)

        const url = new URL(request.url)
        const version = url.searchParams.get('version') || ''
        const q1 = url.searchParams.get('q1') || ''
        const includeTest = url.searchParams.get('include_test') === '1'

        const client = await db()
        const all = (await client.execute('select version, is_test, q1, answers, created_at, submission_id from feedback_responses order by created_at desc')).rows
        const versions = [...new Set(all.map((r) => String(r.version)))].sort()

        const rows = all.filter(
          (r) => (includeTest || !r.is_test) && (!version || r.version === version) && (!q1 || r.q1 === q1),
        )
        const parsed = rows.map((r) => ({
          id: String(r.submission_id),
          at: String(r.created_at),
          version: String(r.version),
          test: !!r.is_test,
          a: JSON.parse(String(r.answers)) as Record<string, any>,
        }))

        const single = (c: Choice) => {
          const answered = parsed.filter((p) => p.a[c.id])
          return {
            id: c.id,
            label: c.label,
            type: 'single',
            respondents: answered.length,
            options: c.options.map((o) => {
              const count = answered.filter((p) => p.a[c.id] === o).length
              return { label: o, count, percent: answered.length ? Math.round((count / answered.length) * 1000) / 10 : 0 }
            }),
          }
        }
        const multi = (c: Choice) => {
          const answered = parsed.filter((p) => Array.isArray(p.a[c.id]) && p.a[c.id].length)
          return {
            id: c.id,
            label: c.label,
            type: 'multi',
            respondents: answered.length,
            options: c.options.map((o) => {
              const count = answered.filter((p) => p.a[c.id].includes(o)).length
              return { label: o, count, percent: answered.length ? Math.round((count / answered.length) * 1000) / 10 : 0 }
            }),
          }
        }
        const texts = (id: string, label: string) => ({
          id,
          label,
          answers: parsed
            .filter((p) => p.a[id])
            .map((p) => ({ text: String(p.a[id]), q1: p.a.q1, version: p.version, at: p.at, test: p.test })),
        })

        const prices = parsed.map((p) => Number(p.a.q11)).filter((n) => Number.isFinite(n)).sort((x, y) => x - y)
        const mid = Math.floor(prices.length / 2)
        const price = {
          id: 'q11',
          label: Q11_LABEL,
          count: prices.length,
          average: prices.length ? Math.round((prices.reduce((s, n) => s + n, 0) / prices.length) * 100) / 100 : null,
          median: prices.length ? (prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2) : null,
          min: prices[0] ?? null,
          max: prices[prices.length - 1] ?? null,
          values: prices,
        }

        return json({
          total: parsed.length,
          versions,
          filters: { version: version || null, q1: q1 || null, include_test: includeTest },
          choices: [single(Q1), single(Q2), single(Q3), single(Q4), single(Q6), multi(Q7), single(Q8), single(Q9)],
          text: [
            texts('q2_other', `${Q2.label} (Other)`),
            texts('q5', Q5_LABEL),
            texts('q7_other', `${Q7.label} (Other)`),
            texts('q10', Q10_LABEL),
          ],
          price,
        })
})

export const Route = createFileRoute('/api/results')({
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) => handle(request),
    },
  },
} as any)
