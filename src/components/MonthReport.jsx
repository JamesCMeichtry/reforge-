import { useEffect, useState } from 'react'
import { LoadingCards, buttonPrimary, buttonSecondary } from './ui.jsx'
import { ask, toast } from './Feedback.jsx'
import { sendMessage } from '../lib/chat.js'
import { me } from '../lib/me.js'
import {
  fetchMonthReport,
  lastMonth,
  monthDates,
  monthName,
  painLine,
  reportText,
  shiftMonth,
  thisMonth,
} from '../lib/report.js'

const SEEN_KEY = 'reforge.report-seen'
const shortDay = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
const TREND_COLOUR = {
  down: 'var(--pain-mild)',
  steady: 'var(--color-muted)',
  up: 'var(--pain-moderate)',
  new: 'var(--color-muted)',
}

function Stat({ value, label, note }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="font-display text-4xl font-bold leading-none text-white">{value}</p>
      <p className="mt-1 text-sm font-semibold text-neutral-300">{label}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-gold">{title}</h3>
      {children}
    </section>
  )
}

// The month as a calendar: gold for training days, a ring for days with only a check-in
function MonthGrid({ month, trained, checkedIn }) {
  const dates = monthDates(month)
  const offset = (new Date(`${dates[0]}T12:00:00`).getDay() + 6) % 7
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold text-muted" aria-hidden="true">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <ol className="mt-1.5 grid grid-cols-7 gap-1.5" aria-label={`Days trained in ${monthName(month)}`}>
        {Array.from({ length: offset }, (_, i) => (
          <li key={`gap-${i}`} aria-hidden="true" />
        ))}
        {dates.map((date) => {
          const did = trained.has(date)
          const checked = !did && checkedIn.has(date)
          return (
            <li
              key={date}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs font-semibold ${
                did ? 'bg-gold text-ink' : checked ? 'border border-gold/60 text-gold' : 'bg-line/40 text-muted'
              }`}
              aria-label={`${shortDay(date)}: ${did ? 'trained' : checked ? 'checked in' : 'rest'}`}
            >
              {Number(date.slice(8))}
            </li>
          )
        })}
      </ol>
      <p className="mt-3 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gold" aria-hidden="true" /> Trained
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-gold/60" aria-hidden="true" /> Check-in only
        </span>
      </p>
    </div>
  )
}

function compareText(now, before) {
  if (!before) return now ? 'Nothing logged the month before' : null
  const diff = now - before
  if (diff === 0) return 'Same as the month before'
  return `${diff > 0 ? '+' : ''}${diff} on the month before`
}

async function share(report, name) {
  const text = reportText(report, name)
  try {
    if (navigator.share) {
      await navigator.share({ title: `${monthName(report.month)} on Reforge`, text })
      return
    }
    await navigator.clipboard.writeText(text)
    toast('Copied. Paste it wherever you like.')
  } catch (error) {
    if (error?.name !== 'AbortError') toast("Couldn't share it from this phone.", { tone: 'error' })
  }
}

// viewer: 'self' (your own report) or 'coach' (a professional looking at a client's)
export default function MonthReport({ userId = me(), name, viewer = 'self', initialMonth }) {
  const [month, setMonth] = useState(initialMonth ?? lastMonth())
  const [state, setState] = useState({ status: 'loading' })
  const [sending, setSending] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const earliest = shiftMonth(thisMonth(), -11)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    fetchMonthReport(month, userId)
      .then((report) => !cancelled && setState({ status: 'ready', report }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [month, userId, attempt])

  // Opening your own report counts as having seen it, so the Today card goes away
  useEffect(() => {
    if (viewer !== 'self' || month !== lastMonth()) return
    try {
      localStorage.setItem(SEEN_KEY, month)
    } catch {
      // Private mode: the card just shows again
    }
  }, [viewer, month])

  async function sendToClient(report) {
    const sure = await ask({
      title: `Send to ${name ?? 'your client'}?`,
      body: `Sends a summary of ${monthName(report.month)} as a message, pain included. Only the two of you can read it.`,
      confirm: 'Send',
    })
    if (!sure) return
    setSending(true)
    try {
      await sendMessage(userId, me(), reportText(report, null, { includePain: true, forYou: true }))
      toast('Sent in your messages')
    } catch {
      toast("Couldn't send it. Check your connection.", { tone: 'error' })
    }
    setSending(false)
  }

  const current = month === thisMonth()
  const report = state.report
  const t = report?.training

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          disabled={month <= earliest}
          aria-label="Previous month"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-xl text-white hover:border-gold disabled:opacity-30"
        >
          ‹
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="font-display text-3xl font-bold uppercase leading-none">{monthName(month, true)}</p>
          {current && <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold">So far</p>}
        </div>
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          disabled={current}
          aria-label="Next month"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-xl text-white hover:border-gold disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {state.status === 'loading' && <LoadingCards count={3} height="h-32" label="Working out the month" />}
      {state.status === 'error' && (
        <div>
          <p className="text-red-400">Couldn't load the report. Check your connection.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={`mt-4 ${buttonSecondary}`}>
            Try again
          </button>
        </div>
      )}

      {state.status === 'ready' && report.empty && (
        <Section title="Nothing logged">
          <p className="mt-2 text-neutral-300">
            {viewer === 'coach' ? `${name ?? 'They'} didn't` : "You didn't"} log any training or check-ins in{' '}
            {monthName(month)}.
          </p>
        </Section>
      )}

      {state.status === 'ready' && !report.empty && (
        <div className="space-y-4">
          <p className="text-xl font-semibold leading-snug text-white">{report.headline}</p>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              value={t.sessions}
              label={t.sessions === 1 ? 'Session' : 'Sessions'}
              note={compareText(t.sessions, report.previousSessions)}
            />
            <Stat
              value={report.pbs.length}
              label={report.pbs.length === 1 ? 'New best' : 'New bests'}
              note="Heaviest ever on a lift"
            />
            <Stat
              value={t.sets}
              label="Sets logged"
              note={t.weeks ? `Across ${t.weeks} ${t.weeks === 1 ? 'week' : 'weeks'}` : null}
            />
            <Stat
              value={t.volume >= 10000 ? `${Math.round(t.volume / 1000)}k` : t.volume.toLocaleString('en-GB')}
              label="Kg moved"
              note="Weight × reps"
            />
          </div>

          <Section title="Days trained">
            <div className="mt-3">
              <MonthGrid month={month} trained={t.dates} checkedIn={report.checkInDays} />
            </div>
            {(t.coached > 0 || t.withFriends > 0) && (
              <p className="mt-3 text-sm text-neutral-300">
                {[
                  t.coached ? `${t.coached} with ${viewer === 'coach' ? 'you' : 'your coach'}` : null,
                  t.withFriends ? `${t.withFriends} with friends` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </Section>

          {report.pbs.length > 0 && (
            <Section title="New bests">
              <ul className="mt-3 space-y-2.5">
                {report.pbs.slice(0, 8).map((pb) => (
                  <li key={pb.exercise} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block font-semibold text-white">{pb.exercise}</span>
                      <span className="block text-xs text-muted">
                        {shortDay(pb.date)} · was {pb.previous} kg
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-display text-xl font-bold text-gold">
                        {pb.weight} kg × {pb.reps}
                      </span>
                      <span className="block text-xs font-semibold text-gold">+{pb.gain} kg</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {report.pain.length > 0 && (
            <Section title="Injuries">
              <ul className="mt-3 space-y-3">
                {report.pain.map((area) => (
                  <li key={area.areaId} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: area.flags ? 'var(--pain-severe)' : TREND_COLOUR[area.trend] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block font-semibold text-white">{area.label}</span>
                      <span className="block text-sm text-neutral-300">{painLine(area)}</span>
                      <span className="block text-xs text-muted">
                        {area.checkIns} {area.checkIns === 1 ? 'check-in' : 'check-ins'}
                        {area.peak ? ` · worst ${area.peak.pain}/10 on ${shortDay(area.peak.date)}` : ''}
                      </span>
                      {area.flags > 0 && (
                        <span className="block text-sm font-semibold text-red-400">
                          Warning signs reported {area.flags === 1 ? 'once' : `${area.flags} times`}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(report.targets.done.length > 0 || report.targets.open.length > 0) && (
            <Section title="Targets">
              <ul className="mt-3 space-y-2">
                {report.targets.done.map((target) => (
                  <li key={target.id} className="flex items-baseline gap-2.5">
                    <span className="font-bold text-gold" aria-hidden="true">
                      ✓
                    </span>
                    <span className="text-white">{target.title}</span>
                  </li>
                ))}
                {report.targets.open.map((target) => (
                  <li key={target.id} className="flex items-baseline gap-2.5">
                    <span className="text-muted" aria-hidden="true">
                      ○
                    </span>
                    <span className="text-neutral-300">{target.title} · still to do</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {viewer === 'self' ? (
            <>
              <button type="button" onClick={() => share(report, null)} className={`w-full ${buttonPrimary}`}>
                Share my month
              </button>
              <p className="text-center text-xs text-muted">
                Sharing shows your training only, never your pain or injuries.
              </p>
            </>
          ) : (
            <button
              type="button"
              onClick={() => sendToClient(report)}
              disabled={sending}
              className={`w-full ${buttonPrimary}`}
            >
              {sending ? 'Sending…' : `Send to ${name ?? 'client'} as a message`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// On Today for the first week of a month, until the report is opened
export function ReportReady() {
  const month = lastMonth()
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === month
    } catch {
      return false
    }
  })
  if (seen || new Date().getDate() > 7) return null

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, month)
    } catch {
      // Private mode: it just hides until the app reopens
    }
    setSeen(true)
  }

  return (
    <section className="relative rounded-2xl border border-gold/60 bg-gold/10 p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Hide"
        className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:text-white"
      >
        ✕
      </button>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Monthly report</p>
      <h2 className="mt-1 pr-8 font-display text-3xl font-bold uppercase leading-none">Your {monthName(month)}</h2>
      <p className="mt-2 text-neutral-300">
        Sessions, new bests, how each injury went and targets hit, all in one place.
      </p>
      <a href="#progress/report" className={`mt-4 block text-center ${buttonPrimary}`}>
        See my month
      </a>
    </section>
  )
}

// A link into the report, for the Progress page
export function ReportLink() {
  return (
    <a
      href="#progress/report"
      className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-5 hover:border-gold"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-display text-2xl font-semibold">Monthly report</span>
        <span className="block text-sm text-muted">Your {monthName(lastMonth())} in one page, ready to share</span>
      </span>
      <span aria-hidden="true" className="text-2xl text-muted">
        ›
      </span>
    </a>
  )
}
