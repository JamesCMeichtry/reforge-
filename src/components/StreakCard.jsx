import { useEffect, useState } from 'react'
import { BADGES, MILESTONES, computeStreak, fetchActivityDays, nextMilestone } from '../lib/streak.js'

const SEEN_KEY = 'reforge.streak.celebrated.v1'

const dayName = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'long' })

function readSeen() {
  try {
    return localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function writeSeen(value) {
  try {
    localStorage.setItem(SEEN_KEY, value)
  } catch {
    // Private mode: the banner just shows again next time
  }
}

function Flame({ lit }) {
  return (
    <svg viewBox="5.5 1 13 19" className={`h-16 w-11 shrink-0 ${lit ? 'flame-flicker' : ''}`} aria-hidden="true">
      <defs>
        <linearGradient id="flame-fill" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="var(--color-gold)" />
          <stop offset="100%" stopColor="var(--color-gold-light)" />
        </linearGradient>
      </defs>
      <path
        d="M12 1.8c.6 3.3 4.8 5.6 4.8 10.9a4.8 4.8 0 0 1-9.6 0c0-2.3 1-3.9 2.2-5 .1 1.7.8 2.8 1.9 3.3-.3-3.3.1-6.2.7-9.2Z"
        fill={lit ? 'url(#flame-fill)' : 'none'}
        stroke={lit ? 'none' : 'var(--color-muted)'}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {lit && <path d="M12 12.4c.5 1.6 2.4 2.5 2.4 4.6a2.4 2.4 0 0 1-4.8 0c0-1.6 1.1-2.8 2.4-4.6Z" fill="#fff6d8" opacity="0.85" />}
    </svg>
  )
}

function Snowflake() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 2v20M4.9 6.5l14.2 11M4.9 17.5l14.2-11M9.5 3.8 12 6l2.5-2.2M9.5 20.2 12 18l2.5 2.2" />
    </svg>
  )
}

function Badge({ days, earned }) {
  return (
    <li
      className={`flex h-11 w-11 flex-col items-center justify-center rounded-full border text-center leading-none ${
        earned ? 'border-gold bg-gold text-ink' : 'border-line text-muted'
      }`}
      title={earned ? `${days}-day streak reached` : `Reach a ${days}-day streak`}
    >
      <span className="font-display text-base font-bold">{days}</span>
      <span className="text-[8px] font-semibold uppercase tracking-wide">days</span>
      <span className="sr-only">{earned ? 'earned' : 'locked'}</span>
    </li>
  )
}

function Celebration({ days, onClose }) {
  const badge = BADGES.includes(days)
  return (
    <div role="status" className="celebrate mb-4 rounded-xl border border-gold bg-gold/10 p-4">
      <p className="font-display text-2xl font-bold uppercase text-gold">{days}-day streak!</p>
      <p className="mt-1 text-sm text-muted">
        {badge ? `New badge unlocked. ` : ''}That's {days} days in a row of showing up for your body.
      </p>
      <button type="button" onClick={onClose} className="mt-3 text-sm font-semibold text-gold">
        Nice one
      </button>
    </div>
  )
}

export default function StreakCard() {
  const [streak, setStreak] = useState(null)
  const [failed, setFailed] = useState(false)
  const [seen, setSeen] = useState(readSeen)

  useEffect(() => {
    let live = true
    fetchActivityDays()
      .then((dates) => live && setStreak(computeStreak(dates)))
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [])

  if (failed) return null
  if (!streak) return <div aria-hidden="true" className="skeleton h-40 rounded-2xl bg-panel" />

  const { current, best, doneToday, atRisk, freezeReady, frozen, runStart } = streak
  const target = nextMilestone(current)
  const previous = [...MILESTONES].reverse().find((m) => m <= current) ?? 0
  const progress = target ? (current - previous) / (target - previous) : 1
  const celebrateKey = `${runStart}:${current}`
  const celebrate = doneToday && MILESTONES.includes(current) && seen !== celebrateKey

  let message
  if (doneToday) message = `Today's done. Come back tomorrow to make it ${current + 1}.`
  else if (atRisk) message = 'Log a set or a 30-second check-in today to keep it alive.'
  else message = 'Start a streak today: log a set or do a quick check-in.'

  return (
    <section aria-label="Daily streak" className="rounded-2xl border border-line bg-panel p-5">
      {celebrate && (
        <Celebration
          days={current}
          onClose={() => {
            writeSeen(celebrateKey)
            setSeen(celebrateKey)
          }}
        />
      )}

      <div className="flex items-center gap-4">
        <Flame lit={doneToday} />
        <div className="min-w-0">
          <p className="flex items-baseline gap-2">
            <span className={`font-display text-6xl font-bold leading-none ${doneToday ? 'text-gold' : 'text-white'}`}>
              {current}
            </span>
            <span className="font-display text-xl font-semibold uppercase tracking-wide text-muted">
              day streak
            </span>
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted">Best {best}</p>
        </div>
      </div>

      <p className={`mt-4 text-sm ${atRisk ? 'font-semibold text-white' : 'text-muted'}`}>{message}</p>
      {atRisk && (
        <a href="#rehab" className="mt-3 inline-block rounded-xl border border-gold px-4 py-2 text-sm font-semibold text-gold">
          Quick check-in
        </a>
      )}

      {target && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-muted">
            <span>Next milestone: {target} days</span>
            <span>{target - current} to go</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-gold transition-[width] duration-700" style={{ width: `${Math.max(progress * 100, 4)}%` }} />
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 text-sm text-muted">
        <Snowflake />
        <span>
          {frozen.length
            ? `A freeze saved your streak on ${dayName(frozen[frozen.length - 1])}.`
            : freezeReady
              ? 'Streak freeze ready: miss one day this week and you keep your streak.'
              : 'Freeze used this week. Resets Monday.'}
        </span>
      </div>

      <ul className="mt-5 flex gap-3" aria-label="Streak badges">
        {BADGES.map((days) => (
          <Badge key={days} days={days} earned={best >= days} />
        ))}
      </ul>
    </section>
  )
}
