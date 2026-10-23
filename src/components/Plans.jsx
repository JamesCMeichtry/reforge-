import { useEffect, useState } from 'react'
import { LoadingCards, buttonPrimary, inputBase } from './ui.jsx'
import { ask, toast } from './Feedback.jsx'
import { Label, Sheet } from './LiveParts.jsx'
import {
  addTarget,
  addToDeviceCalendar,
  bookSession,
  cancelBooking,
  deleteTarget,
  dueText,
  fetchBookings,
  fetchTargets,
  googleCalendarLink,
  isOverdue,
  setTargetDone,
  timeUsed,
} from '../lib/plans.js'
import { inviteTime } from '../lib/friends.js'
import { fetchMyPros } from '../lib/pro.js'
import { todayDate } from '../lib/programme.js'

const inWeeks = (weeks) => {
  const date = new Date()
  date.setDate(date.getDate() + weeks * 7)
  return date.toLocaleDateString('en-CA')
}

/* ---------- Adding to a calendar ---------- */

// Two small buttons: the phone's own calendar (Apple, Outlook) and Google Calendar
export function AddToCalendar({ event }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted">Add to calendar:</span>
      <button
        type="button"
        onClick={() => addToDeviceCalendar(event)}
        className="rounded-full border border-line px-3 py-1 font-semibold text-white hover:border-gold"
      >
        Phone calendar
      </button>
      <a
        href={googleCalendarLink(event)}
        target="_blank"
        rel="noreferrer"
        className="rounded-full border border-line px-3 py-1 font-semibold text-white hover:border-gold"
      >
        Google
      </a>
    </div>
  )
}

/* ---------- Targets ---------- */

function TargetRow({ target, onToggle, onDelete }) {
  const done = Boolean(target.done_at)
  const overdue = isOverdue(target)
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        {onToggle ? (
          <button
            type="button"
            onClick={() => onToggle(target)}
            aria-pressed={done}
            aria-label={done ? `Mark "${target.title}" as not done` : `Mark "${target.title}" as done`}
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${
              done ? 'tick-pop border-gold bg-gold text-ink' : 'border-line text-transparent hover:border-gold'
            }`}
          >
            ✓
          </button>
        ) : (
          <span
            aria-hidden="true"
            className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-sm font-bold ${
              done ? 'border-gold bg-gold text-ink' : 'border-line text-transparent'
            }`}
          >
            ✓
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`font-semibold ${done ? 'text-muted line-through' : 'text-white'}`}>{target.title}</p>
          {target.detail && <p className="mt-0.5 text-sm text-neutral-300">{target.detail}</p>}
          <p className={`mt-1 text-xs font-semibold ${done ? 'text-gold' : overdue ? 'text-red-400' : 'text-muted'}`}>
            {dueText(target)}
          </p>
          {!done && (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(3, Math.round(timeUsed(target) * 100))}%`,
                  background: overdue ? 'var(--pain-severe)' : 'var(--color-gold)',
                }}
              />
            </div>
          )}
        </div>
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(target)}
            aria-label={`Delete "${target.title}"`}
            className="shrink-0 px-1 text-sm text-muted hover:text-red-400"
          >
            ✕
          </button>
        )}
      </div>
    </li>
  )
}

// Professional, on a client's page: set targets with a deadline and tick them off
export function TargetsPanel({ clientId, clientName = 'your client' }) {
  const [targets, setTargets] = useState(null)
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [dueOn, setDueOn] = useState(() => inWeeks(4))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchTargets(clientId)
      .then(setTargets)
      .catch(() => setTargets([]))
  }, [clientId])

  async function add(event) {
    event.preventDefault()
    setBusy(true)
    try {
      const made = await addTarget(clientId, { title, detail, dueOn })
      setTargets((current) => [...current, made].sort((a, b) => (a.due_on < b.due_on ? -1 : 1)))
      setTitle('')
      setDetail('')
      toast(`Target set for ${clientName}`)
    } catch {
      toast("Couldn't save the target. Check your connection.", { tone: 'error' })
    }
    setBusy(false)
  }

  async function toggle(target) {
    const done = !target.done_at
    try {
      const doneAt = await setTargetDone(target.id, done)
      setTargets((current) => current.map((t) => (t.id === target.id ? { ...t, done_at: doneAt } : t)))
      if (done) toast(`${clientName} hit "${target.title}"`)
    } catch {
      toast("Couldn't update the target. Check your connection.", { tone: 'error' })
    }
  }

  async function remove(target) {
    const sure = await ask({
      title: 'Delete this target?',
      body: `"${target.title}" will be removed for ${clientName} too.`,
      confirm: 'Delete',
      danger: true,
    })
    if (!sure) return
    try {
      await deleteTarget(target.id)
      setTargets((current) => current.filter((t) => t.id !== target.id))
    } catch {
      toast("Couldn't delete the target. Check your connection.", { tone: 'error' })
    }
  }

  const open = targets?.filter((t) => !t.done_at) ?? []
  const done = targets?.filter((t) => t.done_at) ?? []

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Set what {clientName} is working towards and by when. They see these on their Progress tab, and you tick them
        off when they're met.
      </p>
      {targets === null ? (
        <LoadingCards count={2} height="h-20" label="Loading targets" />
      ) : (
        targets.length > 0 && (
          <section className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-display text-2xl font-semibold">
              Targets{' '}
              <span className="text-base font-semibold text-muted">
                {done.length}/{targets.length} done
              </span>
            </h2>
            <ul className="mt-4 divide-y divide-line">
              {[...open, ...done].map((t) => (
                <TargetRow key={t.id} target={t} onToggle={toggle} onDelete={remove} />
              ))}
            </ul>
          </section>
        )
      )}

      <form onSubmit={add} className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="font-display text-2xl font-semibold">New target</h2>
        <label className="mt-3 block text-xs font-medium text-muted">
          Target
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={200}
            placeholder="e.g. Hop test at 90% of the good leg"
            className={`mt-1 ${inputBase}`}
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-muted">
          Details (optional)
          <textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="e.g. 3 hops for distance, best of three, no pain above 2/10"
            className={`mt-1 ${inputBase}`}
          />
        </label>
        <Label>By when</Label>
        <div className="flex flex-wrap gap-2">
          {[2, 4, 6, 12].map((weeks) => (
            <button
              key={weeks}
              type="button"
              aria-pressed={dueOn === inWeeks(weeks)}
              onClick={() => setDueOn(inWeeks(weeks))}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                dueOn === inWeeks(weeks) ? 'border-gold bg-gold text-ink' : 'border-line text-neutral-300'
              }`}
            >
              {weeks} weeks
            </button>
          ))}
        </div>
        <label className="mt-3 block text-xs font-medium text-muted">
          Or pick a date
          <input
            type="date"
            value={dueOn}
            min={todayDate()}
            onChange={(event) => setDueOn(event.target.value)}
            className={`mt-1 ${inputBase}`}
          />
        </label>
        <button type="submit" disabled={!title.trim() || !dueOn || busy} className={`mt-4 w-full ${buttonPrimary}`}>
          {busy ? 'Saving…' : 'Set target'}
        </button>
      </form>
    </div>
  )
}

// Client, on Progress: the targets their professional has set
export function MyTargets() {
  const [state, setState] = useState(null)

  useEffect(() => {
    Promise.all([fetchTargets(), fetchMyPros().catch(() => [])])
      .then(([targets, pros]) => setState({ targets, pros }))
      .catch(() => setState({ targets: [], pros: [] }))
  }, [])

  if (!state?.targets.length) return null
  const { targets, pros } = state
  const coach = pros.find((p) => p.id === targets[0].pro_id)?.display_name ?? 'your coach'
  const open = targets.filter((t) => !t.done_at)
  const done = targets.filter((t) => t.done_at)

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Set by {coach}</p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Your targets</h2>
        <span className="text-sm font-semibold text-gold">
          {done.length}/{targets.length} done
        </span>
      </div>
      <ul className="mt-4 divide-y divide-line">
        {[...open, ...done].map((t) => (
          <TargetRow key={t.id} target={t} />
        ))}
      </ul>
    </section>
  )
}

/* ---------- Booked 1-1 sessions ---------- */

const sessionEvent = (booking, title) => ({
  id: booking.id,
  title,
  start: new Date(booking.starts_at),
  minutes: booking.minutes,
  place: booking.place,
  details: 'Booked in Reforge',
})

const nextHour = () => `${String(Math.min(23, new Date().getHours() + 1)).padStart(2, '0')}:00`

function BookSheet({ clientId, clientName, onClose, onBooked }) {
  const [date, setDate] = useState(todayDate)
  const [time, setTime] = useState(nextHour)
  const [minutes, setMinutes] = useState(60)
  const [place, setPlace] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function book() {
    const startsAt = new Date(`${date}T${time}`)
    if (Number.isNaN(startsAt.getTime()) || startsAt < new Date(Date.now() - 15 * 60 * 1000)) {
      setError('Pick a day and time that hasn’t passed yet.')
      return
    }
    setBusy(true)
    setError('')
    try {
      onBooked(await bookSession(clientId, { startsAt, minutes, place }))
      toast(`1-1 booked with ${clientName}`)
      onClose()
    } catch {
      setError("Couldn't book the session. Check your connection.")
      setBusy(false)
    }
  }

  return (
    <Sheet title={`Book a 1-1 with ${clientName}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-muted">
          Date
          <input
            type="date"
            value={date}
            min={todayDate()}
            onChange={(event) => setDate(event.target.value)}
            className={`mt-1 ${inputBase}`}
          />
        </label>
        <label className="text-xs font-medium text-muted">
          Time
          <input
            type="time"
            value={time}
            onChange={(event) => setTime(event.target.value)}
            className={`mt-1 ${inputBase}`}
          />
        </label>
      </div>
      <Label>Length</Label>
      <div className="flex flex-wrap gap-2">
        {[30, 45, 60, 90].map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={minutes === m}
            onClick={() => setMinutes(m)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              minutes === m ? 'border-gold bg-gold text-ink' : 'border-line text-neutral-300'
            }`}
          >
            {m} min
          </button>
        ))}
      </div>
      <label className="mt-4 block text-xs font-medium text-muted">
        Where (optional)
        <input
          value={place}
          onChange={(event) => setPlace(event.target.value)}
          maxLength={200}
          placeholder="e.g. PureGym Amersham"
          className={`mt-1 ${inputBase}`}
        />
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="button" onClick={book} disabled={busy} className={`mt-5 h-14 w-full text-lg ${buttonPrimary}`}>
        {busy ? 'Booking…' : 'Book session'}
      </button>
      <p className="mt-2 text-center text-xs text-muted">
        It shows on {clientName}'s Today screen, and you can both add it to your calendars.
      </p>
    </Sheet>
  )
}

// Professional, on a client's page: their upcoming 1-1s, and booking a new one
export function BookingCard({ clientId, clientName = 'your client' }) {
  const [bookings, setBookings] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchBookings(clientId)
      .then(setBookings)
      .catch(() => setBookings('offline'))
  }, [clientId])

  async function cancel(booking) {
    const sure = await ask({
      title: 'Cancel this 1-1?',
      body: `${inviteTime(booking.starts_at)} with ${clientName}. It disappears from their Today screen. If it's in a calendar, remove it there too.`,
      confirm: 'Cancel session',
      danger: true,
    })
    if (!sure) return
    try {
      await cancelBooking(booking.id)
      setBookings((current) => current.filter((b) => b.id !== booking.id))
      toast('Session cancelled')
    } catch {
      toast("Couldn't cancel. Check your connection.", { tone: 'error' })
    }
  }

  if (bookings === null || bookings === 'offline') return null
  const sheet = open && (
    <BookSheet
      clientId={clientId}
      clientName={clientName}
      onClose={() => setOpen(false)}
      onBooked={(made) =>
        setBookings((current) => [...current, made].sort((a, b) => (a.starts_at < b.starts_at ? -1 : 1)))
      }
    />
  )

  if (!bookings.length) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mb-5 flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-line px-4 py-2.5 text-left text-sm hover:border-gold"
        >
          <span className="font-semibold text-muted">Book a 1-1 session</span>
          <span aria-hidden="true" className="font-bold text-gold">
            +
          </span>
        </button>
        {sheet}
      </>
    )
  }

  return (
    <section className="mb-5 rounded-2xl border border-line bg-panel px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Booked 1-1s</p>
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-gold">
          + Book
        </button>
      </div>
      <ul className="mt-2 divide-y divide-line">
        {bookings.slice(0, 3).map((b) => (
          <li key={b.id} className="py-2.5 first:pt-1 last:pb-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold text-white">{inviteTime(b.starts_at)}</p>
              <button
                type="button"
                onClick={() => cancel(b)}
                className="shrink-0 text-xs font-semibold text-muted hover:text-red-400"
              >
                Cancel
              </button>
            </div>
            <p className="text-sm text-muted">
              {b.minutes} min{b.place ? ` · ${b.place}` : ''}
            </p>
            <AddToCalendar event={sessionEvent(b, `1-1 with ${clientName}`)} />
          </li>
        ))}
      </ul>
      {sheet}
    </section>
  )
}

// Client, on Today: 1-1 sessions their professional has booked
export function NextSessions() {
  const [state, setState] = useState(null)

  useEffect(() => {
    Promise.all([fetchBookings(), fetchMyPros().catch(() => [])])
      .then(([bookings, pros]) => setState({ bookings, pros }))
      .catch(() => setState({ bookings: [], pros: [] }))
  }, [])

  if (!state?.bookings.length) return null
  const nameOf = (id) => state.pros.find((p) => p.id === id)?.display_name ?? 'your coach'

  return (
    <div className="space-y-4">
      {state.bookings.slice(0, 2).map((b) => (
        <section key={b.id} className="rounded-2xl border border-gold/60 bg-panel p-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            1-1 session · {inviteTime(b.starts_at)}
          </p>
          <h2 className="mt-2 font-display text-2xl font-semibold">With {nameOf(b.pro_id)}</h2>
          <p className="mt-1 text-sm text-neutral-300">
            {b.minutes} minutes{b.place ? ` · ${b.place}` : ''}
          </p>
          <AddToCalendar event={sessionEvent(b, `1-1 with ${nameOf(b.pro_id)}`)} />
        </section>
      ))}
    </div>
  )
}
