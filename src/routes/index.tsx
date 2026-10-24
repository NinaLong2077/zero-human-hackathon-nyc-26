import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { getMe, signOut } from '../lib/auth.functions'
import { type BookingRow, createBooking, createListing, listListings, myBookings, respondBooking, startPayment } from '../lib/marketplace.functions'
import { type Listing, SAMPLES } from '../lib/samples'
import { BadgeCheck, CalendarDays, ImagePlus, Cat, Check, Clock, Heart, Home as Home2, Lock, MapPin, Plus, ShieldCheck, UserCheck, Video, X } from 'lucide-react'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Purrfect Hour | Spend time with a cat' },
      {
        name: 'description',
        content:
          'Owners list their cat and set a price. Guests book a set stretch of time with the cat. Owners get paid.',
      },
      { property: 'og:title', content: 'Purrfect Hour | Spend time with a cat' },
    ],
  }),
  component: Home,
})

const usd = (n: number) => `$${n.toFixed(2)}`

// Whop's sign-in page refuses to load inside another page (the editor preview is one),
// so when framed we open it in its own tab instead.
function startAuth(e: React.MouseEvent<HTMLAnchorElement>) {
  try {
    if (window.self !== window.top) {
      e.preventDefault()
      window.open(e.currentTarget.href, '_blank')
    }
  } catch {
    e.preventDefault()
    window.open(e.currentTarget.href, '_blank')
  }
}

function goTo(url: string) {
  try {
    if (window.self !== window.top) {
      window.open(url, '_blank')
      return
    }
  } catch {
    window.open(url, '_blank')
    return
  }
  window.location.href = url
}

function Home() {
  const [mine, setMine] = useState<Listing[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [requests, setRequests] = useState<BookingRow[]>([])
  const [notice, setNotice] = useState('')
  const [payBusy, setPayBusy] = useState('')
  const [booking, setBooking] = useState<Listing | null>(null)
  const [listing, setListing] = useState(false)
  const [done, setDone] = useState<BookingRow | null>(null)
  const all = [...mine, ...SAMPLES]

  const [me, setMe] = useState<{ id: string; name: string; picture: string | null } | null>(null)
  const [meLoaded, setMeLoaded] = useState(false)
  const refreshListings = () => listListings().then(setMine).catch(() => {})
  const refreshBookings = () =>
    myBookings()
      .then((r) => {
        setBookings(r.guest)
        setRequests(r.host)
      })
      .catch(() => {})

  useEffect(() => {
    refreshListings()
  }, [])
  useEffect(() => {
    if (me) refreshBookings()
    else {
      setBookings([])
      setRequests([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me])

  const [authPrompt, setAuthPrompt] = useState<null | { intent: string; label: string }>(null)

  useEffect(() => {
    getMe()
      .then((u) => setMe(u))
      .catch(() => setMe(null))
      .finally(() => setMeLoaded(true))
  }, [])

  // After signing up or in, pick up the action the visitor started.
  useEffect(() => {
    if (!meLoaded || !me) return
    const p = new URLSearchParams(window.location.search)
    const intent = p.get('intent')
    if (!intent) return
    if (intent === 'list') setListing(true)
    else if (intent.startsWith('book:')) {
      const cat = [...mine, ...SAMPLES].find((c) => c.id === intent.slice(5))
      if (cat) setBooking(cat)
    }
    window.history.replaceState(null, '', window.location.pathname)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meLoaded, me])

  useEffect(() => {
    if (!meLoaded || !me) return
    const p = new URLSearchParams(window.location.search)
    const paid = p.get('paid')
    if (!paid) return
    window.history.replaceState(null, '', window.location.pathname)
    refreshBookings().then(() => setNotice('Thanks! We’re confirming your payment. It will show as Paid under Your bookings in a moment.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meLoaded, me])

  async function payNow(id: string) {
    setPayBusy(id)
    try {
      const { url } = await startPayment({ data: { bookingId: id, origin: window.location.origin } })
      goTo(url)
    } catch (err: any) {
      setNotice(err?.message || 'Couldn’t start the payment. Please try again.')
    } finally {
      setPayBusy('')
    }
  }

  function openList() {
    if (me) setListing(true)
    else setAuthPrompt({ intent: 'list', label: 'list your cat' })
  }
  function openBook(c: Listing) {
    if (me) setBooking(c)
    else setAuthPrompt({ intent: `book:${c.id}`, label: `book time with ${c.name}` })
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <a href="/" className="flex items-center gap-2 font-display text-xl font-bold">
          <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-ink">
            <Cat className="size-5" aria-hidden />
          </span>
          Purrfect Hour
        </a>
        <nav className="flex items-center gap-6 text-sm font-semibold">
          <a href="#safety" className="hidden text-muted hover:text-ink sm:block">
            Safety
          </a>
          <a href="#how" className="hidden text-muted hover:text-ink sm:block">
            How it works
          </a>
          <a href="#cats" className="hidden text-muted hover:text-ink sm:block">
            Browse cats
          </a>
          {meLoaded && me ? (
            <button
              onClick={async () => {
                await signOut()
                setMe(null)
              }}
              className="hidden min-h-11 text-muted hover:text-ink sm:block"
              title="Sign out"
            >
              {me.name} · Sign out
            </button>
          ) : (
            meLoaded && (
              <a href="/api/oauth/login?redirect_to=%2F" onClick={startAuth} className="hidden min-h-11 items-center text-muted hover:text-ink sm:flex">
                Sign in
              </a>
            )
          )}
          <button
            onClick={openList}
            className="min-h-11 rounded-full border border-ink/20 px-5 hover:border-ink/50"
          >
            List your cat
          </button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-8 pb-20 md:grid-cols-[1.1fr_0.9fr] md:pt-16 md:pb-28">
          <div>
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">Time with a cat, by the hour</p>
            <h1 className="mt-4 font-display text-5xl leading-[1.02] font-bold tracking-tight text-balance md:text-7xl">
              Borrow a cat for the afternoon.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-pretty text-muted">
              Cat owners list their cat and set a price. You book a set amount of time, come over, and spend it with
              them. The owner gets paid.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
              <a
                href="#cats"
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-7 font-semibold text-accent-ink transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Find a cat
              </a>
              <button
                onClick={openList}
                className="min-h-12 font-semibold underline decoration-line decoration-2 underline-offset-4 hover:decoration-ink"
              >
                I have a cat to list
              </button>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-card bg-card">
            <img src="/cats/mango.png" alt="Mango, an orange tabby, relaxing on a blanket" className="size-full object-cover" />
            <div className="absolute right-4 bottom-4 left-4 rounded-2xl border border-line bg-paper p-4 text-sm md:right-auto md:w-64">
              <p className="font-semibold">Mango, 2 hours</p>
              <p className="text-muted">Lap warming, chatting, snack supervision</p>
            </div>
          </div>
        </section>

        <section id="safety" className="border-t border-line bg-card">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">How safety works</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight font-bold tracking-tight text-balance md:text-5xl">
              Everyone is verified, and hosts stay in control
            </h2>
            <div className="mt-6 flex flex-wrap gap-3">
              <VerifiedBadge>Verified host</VerifiedBadge>
              <VerifiedBadge>Verified guest</VerifiedBadge>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: ShieldCheck,
                  t: 'ID verification for both sides',
                  b: 'Hosts and guests confirm their identity before a visit can happen. The badge shows who has done it.',
                },
                {
                  icon: UserCheck,
                  t: 'Hosts approve every request',
                  b: 'Nobody is booked automatically. A host reviews each request and says yes or no.',
                },
                {
                  icon: Lock,
                  t: 'Address shared after acceptance',
                  b: 'Guests see the neighborhood only. The full address is shared once the host accepts the booking.',
                },
                {
                  icon: Video,
                  t: 'Video intro, if the host wants one',
                  b: 'Hosts can ask for a short video call first, so both sides meet before the visit.',
                },
              ].map((x) => (
                <div key={x.t} className="rounded-card border border-line bg-paper p-6">
                  <x.icon className="size-7 text-accent" aria-hidden />
                  <h3 className="mt-4 font-display text-xl font-bold">{x.t}</h3>
                  <p className="mt-2 text-muted">{x.b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <p className="text-sm font-semibold tracking-wide text-accent uppercase">How it works</p>
            <h2 className="mt-3 max-w-2xl font-display text-4xl leading-tight font-bold tracking-tight text-balance md:text-5xl">
              Good for the people who need a cat, and the cats who love company
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {[
                {
                  icon: Heart,
                  who: 'If you want some cat time',
                  lead: 'No adoption, no litter box, just a cozy hour or two with a new friend.',
                  steps: [
                    ['Meet your match', 'Browse cats by personality, from lap warmers to feather-wand chasers.'],
                    ['Pick your hour', 'Choose a day, a start time and how long you want to stay.'],
                    ['Settle in', 'Visit at the owner’s home, say hi, and let the cat set the pace.'],
                    ['Leave happy', 'Know the price up front, with nothing extra to pay at the door.'],
                  ],
                },
                {
                  icon: Home2,
                  who: 'If you have a cat to share',
                  lead: 'Your cat gets visitors who adore them, and you get paid for hosting.',
                  steps: [
                    ['Introduce your cat', 'Add a photo, a few quirks and the house rules you care about.'],
                    ['Set your terms', 'Pick your hourly price and the shortest and longest visit you’re comfortable with.'],
                    ['Welcome guests', 'See who’s coming, when, and for how long before anyone arrives.'],
                    ['Get paid', 'Earn your hourly rate for every hour a guest books.'],
                  ],
                },
              ].map((col) => (
                <div key={col.who} className="rounded-card border border-line bg-card p-8 md:p-10">
                  <col.icon className="size-7 text-accent" aria-hidden />
                  <h3 className="mt-4 font-display text-2xl font-bold">{col.who}</h3>
                  <p className="mt-2 text-muted">{col.lead}</p>
                  <ol className="mt-6 divide-y divide-line border-y border-line">
                    {col.steps.map(([t, b], i) => (
                      <li key={t} className="flex gap-5 py-5">
                        <span className="font-display text-xl font-bold text-accent tabular-nums">0{i + 1}</span>
                        <div>
                          <h4 className="font-semibold">{t}</h4>
                          <p className="mt-1 text-muted">{b}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="cats" className="bg-card">
          <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Cats available now</h2>
              <button
                onClick={openList}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:opacity-90"
              >
                <Plus className="size-4" aria-hidden /> List your cat
              </button>
            </div>
            {notice && (
              <p role="status" className="mt-6 rounded-xl border border-line bg-paper p-4 text-sm font-semibold">
                {notice}{' '}
                <button className="underline" onClick={() => setNotice('')}>
                  Dismiss
                </button>
              </p>
            )}
            {me && (requests.length > 0 || mine.some((c) => c.ownerId === me.id)) && (
              <p className="mt-6 rounded-card border border-line bg-paper p-5 text-sm text-muted">
                <strong className="text-ink">You’re a host.</strong> Guests pay through Purrfect Hour once you accept a request, and Purrfect Hour pays you for each paid visit.
              </p>
            )}
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {all.map((c) => (
                <article key={c.id} className="flex flex-col overflow-hidden rounded-card border border-line bg-paper">
                  <div className="relative">
                    <CatPhotos c={c} />
                    {c.sample && (
                      <span className="absolute top-3 left-3 rounded-full bg-ink/85 px-3 py-1 text-xs font-semibold text-paper">
                        AI-generated example
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-2xl font-bold">{c.name}</h3>
                        <p className="text-sm text-muted">
                          {c.breed} · {c.age}
                        </p>
                      </div>
                      <p className="text-right">
                        <span className="font-display text-2xl font-bold">{usd(c.rate)}</span>
                        <span className="block text-xs text-muted">per hour</span>
                      </p>
                    </div>
                    <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted">
                      Hosted by {c.owner}
                      {c.sample ? <span className="text-xs font-semibold">Example host, not a real person</span> : <span className="text-xs">Verification pending</span>}
                    </p>
                    <p className="mt-4 text-pretty text-muted">{c.bio}</p>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {c.traits.map((t) => (
                        <li key={t} className="rounded-full bg-card px-3 py-1 text-xs font-semibold">
                          {t}
                        </li>
                      ))}
                    </ul>
                    <ul className="mt-5 space-y-1.5 rounded-xl bg-card p-4 text-sm">
                      <li className="flex items-center gap-2">
                        <BadgeCheck className="size-4 text-accent" aria-hidden />
                        {c.sample ? 'Example listing, no real host' : 'Host verification pending'}
                      </li>
                      <li className="flex items-center gap-2">
                        <UserCheck className="size-4 text-accent" aria-hidden /> Approval required
                      </li>
                      <li className="flex items-center gap-2">
                        <Lock className="size-4 text-accent" aria-hidden /> Neighborhood only until accepted
                      </li>
                    </ul>
                    <div className="mt-4 flex flex-col gap-1 text-sm text-muted">
                      <span className="flex items-center gap-2">
                        <MapPin className="size-4" aria-hidden /> {c.city}
                      </span>
                      <span className="flex items-center gap-2">
                        <Clock className="size-4" aria-hidden /> {c.minHours} to {c.maxHours} hour visits
                      </span>
                    </div>
                    <button
                      onClick={() => openBook(c)}
                      disabled={c.sample}
                      aria-label={c.sample ? `${c.name} is an AI-generated example and can't be booked` : `Book time with ${c.name}`}
                      className="mt-6 min-h-12 w-full rounded-full bg-accent font-semibold text-accent-ink hover:brightness-110 disabled:cursor-not-allowed disabled:bg-line disabled:text-muted disabled:hover:brightness-100"
                    >
                      {c.sample ? 'Example only, can’t be booked' : 'Book time'}
                    </button>
                    {c.sample && <p className="mt-3 text-center text-xs text-muted">The cat, photo and host are made up to show how listings look.</p>}
                  </div>
                </article>
              ))}
            </div>

            {requests.length > 0 && (
              <div className="mt-16">
                <h3 className="font-display text-2xl font-bold">Requests for your cats</h3>
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {requests.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <span>
                        <span className="font-semibold">{b.guestName}</span>
                        <span className="text-muted"> wants {b.catName}</span>
                      </span>
                      <span className="text-muted">
                        {b.date} at {b.time} · {b.hours} {b.hours === 1 ? 'hour' : 'hours'} · {usd(b.total)}
                      </span>
                      {b.status === 'pending' ? (
                        <span className="flex gap-2">
                          <button
                            onClick={async () => {
                              await respondBooking({ data: { id: b.id, action: 'accept' } }).catch(() => {})
                              refreshBookings()
                            }}
                            className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink"
                          >
                            Accept
                          </button>
                          <button
                            onClick={async () => {
                              await respondBooking({ data: { id: b.id, action: 'decline' } }).catch(() => {})
                              refreshBookings()
                            }}
                            className="min-h-11 rounded-full border border-ink/20 px-5 text-sm font-semibold"
                          >
                            Decline
                          </button>
                        </span>
                      ) : (
                        <span className="text-sm font-semibold capitalize">
                          {b.status === 'accepted' ? (b.paymentStatus === 'paid' ? 'Accepted · Paid' : 'Accepted · Awaiting payment') : b.status}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {bookings.length > 0 && (
              <div className="mt-16">
                <h3 className="font-display text-2xl font-bold">Your bookings</h3>
                <ul className="mt-4 divide-y divide-line border-y border-line">
                  {bookings.map((b) => (
                    <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-4">
                      <span className="font-semibold">{b.catName}</span>
                      <span className="text-muted">
                        {b.date} at {b.time} · {b.hours} {b.hours === 1 ? 'hour' : 'hours'} · {usd(b.total)}
                      </span>
                      {b.status === 'accepted' && b.paymentStatus !== 'paid' ? (
                        <button
                          onClick={() => payNow(b.id)}
                          disabled={payBusy === b.id}
                          className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-60"
                        >
                          {payBusy === b.id ? 'Opening…' : `Pay ${usd(b.total)}`}
                        </button>
                      ) : (
                        <span className="text-sm font-semibold capitalize">
                          {b.status === 'pending' ? 'Waiting for host' : b.status === 'accepted' ? 'Accepted · Paid' : b.status}
                        </span>
                      )}
                      {b.status === 'accepted' && (
                        <span className="basis-full text-sm text-muted">
                          Address: {b.address ?? 'The host will share it with you.'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <section className="bg-ink text-paper">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-20 md:flex-row md:items-center md:justify-between">
            <h2 className="max-w-xl font-display text-4xl font-bold tracking-tight text-balance md:text-5xl">
              Your cat is already good company. Let them earn.
            </h2>
            <button
              onClick={openList}
              className="min-h-12 rounded-full bg-accent px-7 font-semibold text-accent-ink hover:brightness-110"
            >
              List your cat
            </button>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-sm text-muted">
        © {new Date().getFullYear()} Purrfect Hour
      </footer>

      {booking && (
        <BookModal
          cat={booking}
          onClose={() => setBooking(null)}
          onBooked={(b) => {
            refreshBookings()
            setBooking(null)
            setDone(b)
          }}
        />
      )}
      {listing && (
        <ListModal
          onClose={() => setListing(false)}
          onSave={() => {
            refreshListings()
            setListing(false)
            setTimeout(() => document.getElementById('cats')?.scrollIntoView(), 50)
          }}
        />
      )}
      {authPrompt && (
        <Modal title="Create your account" onClose={() => setAuthPrompt(null)}>
          <p className="text-muted">
            Create a free account to {authPrompt.label}. It keeps hosts and guests accountable and is the first step toward ID verification.
          </p>
          <a
            href={`/api/oauth/login?redirect_to=${encodeURIComponent(`/?intent=${authPrompt.intent}`)}`}
            onClick={startAuth}
            className="mt-6 flex min-h-12 w-full items-center justify-center rounded-full bg-accent font-semibold text-accent-ink hover:brightness-110"
          >
            Create account
          </a>
          <p className="mt-4 text-center text-sm text-muted">
            Already have one?{' '}
            <a
              href={`/api/oauth/login?redirect_to=${encodeURIComponent(`/?intent=${authPrompt.intent}`)}`}
              onClick={startAuth}
              className="font-semibold text-ink underline decoration-line underline-offset-4"
            >
              Sign in
            </a>
          </p>
        </Modal>
      )}
      {done && (
        <Modal onClose={() => setDone(null)} title="Request sent">
          <div className="flex items-start gap-3">
            <Check className="mt-1 size-5 shrink-0 text-accent" aria-hidden />
            <p className="text-muted">
              Your visit with {done.catName} on {done.date} at {done.time} for {done.hours}{' '}
              {done.hours === 1 ? 'hour' : 'hours'} ({usd(done.total)}) is saved under Your bookings. The host will review it, and the full address is shared once they accept.
            </p>
          </div>
          <button onClick={() => setDone(null)} className="mt-6 min-h-12 w-full rounded-full bg-accent font-semibold text-accent-ink">
            Done
          </button>
        </Modal>
      )}
    </div>
  )
}

function VerifiedBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
      <BadgeCheck className="size-3.5" aria-hidden /> {children}
    </span>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-0 sm:place-items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-card bg-paper p-6 sm:rounded-card sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="grid size-10 place-items-center rounded-full hover:bg-card">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const input =
  'mt-1.5 min-h-11 w-full rounded-xl border border-line bg-white px-4 text-base focus-visible:outline-2 focus-visible:outline-accent'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-semibold">
      {label}
      {children}
    </label>
  )
}

function BookModal({ cat, onClose, onBooked }: { cat: Listing; onClose: () => void; onBooked: (b: BookingRow) => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [date, setDate] = useState(today)
  const [time, setTime] = useState('14:00')
  const [hours, setHours] = useState(cat.minHours)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const total = hours * cat.rate
  const options = Array.from({ length: cat.maxHours - cat.minHours + 1 }, (_, i) => cat.minHours + i)

  return (
    <Modal title={`Book time with ${cat.name}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          setBusy(true)
          try {
            onBooked(await createBooking({ data: { listingId: cat.id, date, time, hours } }))
          } catch (err: any) {
            setError(err?.message || 'Something went wrong. Please try again.')
            setBusy(false)
          }
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date">
            <input type="date" required min={today} className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Start time">
            <input type="time" required className={input} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="How long">
          <select className={input} value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {options.map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? 'hour' : 'hours'}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex items-center justify-between rounded-xl bg-card p-4">
          <span className="flex items-center gap-2 text-muted">
            <CalendarDays className="size-4" aria-hidden /> {hours} × {usd(cat.rate)}
          </span>
          <span className="font-display text-2xl font-bold">{usd(total)}</span>
        </div>
        <p className="flex items-start gap-2 text-sm text-muted">
          <BadgeCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          Guests are ID verified. {cat.owner} approves every request, may ask for a video intro first, and shares the full address only after accepting.
        </p>
        {error && (
          <p role="alert" className="text-sm font-semibold">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-full bg-accent font-semibold text-accent-ink hover:brightness-110 disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Request this visit'}
        </button>
      </form>
    </Modal>
  )
}

const MAX_PHOTOS = 5

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file)
      return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() }
    } catch {}
  }
  const url = URL.createObjectURL(file)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = url
  })
  return { source: img, width: img.width, height: img.height, done: () => URL.revokeObjectURL(url) }
}

// Shrinks a photo until it fits comfortably in the database.
async function resizeImage(file: File): Promise<string> {
  const d = await decode(file)
  try {
    for (const [max, quality] of [[900, 0.75], [800, 0.65], [700, 0.55], [600, 0.5]] as const) {
      const scale = Math.min(1, max / Math.max(d.width, d.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(d.width * scale))
      canvas.height = Math.max(1, Math.round(d.height * scale))
      canvas.getContext('2d')!.drawImage(d.source, 0, 0, canvas.width, canvas.height)
      const out = canvas.toDataURL('image/jpeg', quality)
      if (out.length < 400_000) return out
    }
    throw new Error('Photo is too detailed to shrink')
  } finally {
    d.done()
  }
}

function CatPhotos({ c }: { c: Listing }) {
  const photos = c.images?.length ? c.images : c.image ? [c.image] : []
  const [i, setI] = useState(0)
  if (photos.length === 0) {
    return (
      <div
        className="grid h-52 place-items-center"
        style={{ background: `hsl(${c.hue} 70% 85%)`, color: `hsl(${c.hue} 55% 30%)` }}
      >
        <Cat className="size-20" strokeWidth={1.25} aria-hidden />
      </div>
    )
  }
  return (
    <div>
      <img src={photos[Math.min(i, photos.length - 1)]} alt={`${c.name}, ${c.breed}`} loading="lazy" className="h-52 w-full object-cover" />
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto bg-paper p-2">
          {photos.map((src, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setI(idx)}
              aria-label={`Show photo ${idx + 1} of ${c.name}`}
              className={`size-12 shrink-0 overflow-hidden rounded-lg border-2 ${idx === i ? 'border-accent' : 'border-transparent'}`}
            >
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ListModal({ onClose, onSave }: { onClose: () => void; onSave: () => void }) {
  const [f, setF] = useState({
    owner: '',
    name: '',
    breed: '',
    age: '',
    city: '',
    address: '',
    rate: '15',
    minHours: '1',
    maxHours: '4',
    bio: '',
    traits: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [photoError, setPhotoError] = useState('')
  const [photoBusy, setPhotoBusy] = useState(false)
  async function addPhotos(files: File[]) {
    if (files.length === 0) return
    setPhotoError('')
    setPhotoBusy(true)
    const room = MAX_PHOTOS - photos.length
    const picked = files.filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name)).slice(0, room)
    if (picked.length === 0) setPhotoError('Please choose image files (JPG, PNG or WebP).')
    if (files.length > room) setPhotoError(`You can add up to ${MAX_PHOTOS} photos.`)
    const added: string[] = []
    for (const f of picked) {
      try {
        added.push(await resizeImage(f))
      } catch {
        setPhotoError(`“${f.name}” couldn’t be read. Try a JPG or PNG (iPhone HEIC photos aren’t supported in every browser).`)
      }
    }
    setPhotos((prev) => [...prev, ...added].slice(0, MAX_PHOTOS))
    setPhotoBusy(false)
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value })

  return (
    <Modal title="List your cat" onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setError('')
          setBusy(true)
          try {
            await createListing({
              data: {
                owner: f.owner,
                name: f.name,
                breed: f.breed,
                age: f.age,
                city: f.city,
                address: f.address,
                rate: Number(f.rate),
                minHours: Number(f.minHours),
                maxHours: Number(f.maxHours),
                bio: f.bio,
                traits: f.traits.split(',').map((t) => t.trim()).filter(Boolean),
                photos,
              },
            })
            onSave()
          } catch (err: any) {
            setError(err?.message || 'Something went wrong. Please try again.')
            setBusy(false)
          }
        }}
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Your name">
            <input required className={input} value={f.owner} onChange={set('owner')} />
          </Field>
          <Field label="Cat's name">
            <input required className={input} value={f.name} onChange={set('name')} />
          </Field>
          <Field label="Breed">
            <input className={input} value={f.breed} onChange={set('breed')} placeholder="Tabby" />
          </Field>
          <Field label="Age">
            <input className={input} value={f.age} onChange={set('age')} placeholder="2 years" />
          </Field>
        </div>
        <Field label="Neighborhood and city">
          <input required className={input} value={f.city} onChange={set('city')} placeholder="Park Slope, Brooklyn" />
        </Field>
        <Field label="Full address (private)">
          <input className={input} value={f.address} onChange={set('address')} placeholder="Only shown to a guest after you accept their booking" />
        </Field>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Price / hour ($)">
            <input type="number" required min={1} step="0.5" className={input} value={f.rate} onChange={set('rate')} />
          </Field>
          <Field label="Min hours">
            <input type="number" required min={1} max={12} className={input} value={f.minHours} onChange={set('minHours')} />
          </Field>
          <Field label="Max hours">
            <input type="number" required min={1} max={12} className={input} value={f.maxHours} onChange={set('maxHours')} />
          </Field>
        </div>
        <Field label="About your cat">
          <textarea
            required
            rows={3}
            className={`${input} py-3`}
            value={f.bio}
            onChange={set('bio')}
            placeholder="Personality, favorite activities, house rules"
          />
        </Field>
        <div>
          <p className="text-sm font-semibold">
            Photos <span className="font-normal text-muted">(up to {MAX_PHOTOS})</span>
          </p>
          <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((src, idx) => (
              <div key={idx} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                <img src={src} alt={`Upload ${idx + 1}`} className="size-full object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos(photos.filter((_, j) => j !== idx))}
                  aria-label={`Remove photo ${idx + 1}`}
                  className="absolute top-1 right-1 grid size-7 place-items-center rounded-full bg-ink/70 text-paper"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <div className="relative grid aspect-square place-items-center rounded-xl border-2 border-dashed border-line text-center text-xs font-semibold text-muted hover:border-ink/40">
                <span className="pointer-events-none flex flex-col items-center gap-1">
                  <ImagePlus className="size-6" aria-hidden />
                  Add photos
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  aria-label="Add photos"
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  onChange={(e) => {
                    const files = e.target.files ? Array.from(e.target.files) : []
                    e.target.value = ''
                    addPhotos(files)
                  }}
                />
              </div>
            )}
          </div>
          {photoBusy && <p className="mt-2 text-sm text-muted">Processing photos…</p>}
          {photoError && <p className="mt-2 text-sm font-semibold">{photoError}</p>}
        </div>
        <Field label="Traits (comma separated)">
          <input className={input} value={f.traits} onChange={set('traits')} placeholder="Cuddly, Quiet, Loves toys" />
        </Field>
        {error && (
          <p role="alert" className="text-sm font-semibold">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="min-h-12 w-full rounded-full bg-accent font-semibold text-accent-ink hover:brightness-110 disabled:opacity-60"
        >
          {busy ? 'Posting…' : 'Post my cat'}
        </button>
      </form>
    </Modal>
  )
}
