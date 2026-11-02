import { useEffect, useState } from 'react'
import './TodayHero.css'
import { currentWeek, todayDate } from '../lib/programme.js'
import { fetchProfile } from '../lib/profile.js'
import { me } from '../lib/me.js'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

const initials = (name) =>
  (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '·'

// The account saved on the phone, so the name shows straight away
function savedProfile() {
  try {
    return JSON.parse(localStorage.getItem(`reforge.profile.${me()}`)) ?? null
  } catch {
    return null
  }
}

// Top of Today: the date, a welcome with your name, your profile, and this week at a glance
export default function TodayHero({ trainedDates, upNext }) {
  const [profile, setProfile] = useState(savedProfile)
  useEffect(() => {
    fetchProfile(me())
      .then((found) => found && setProfile(found))
      .catch(() => {})
  }, [])

  const name = profile?.display_name?.trim().split(/\s+/)[0]
  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const week = currentWeek()
  const today = todayDate()
  const count = trainedDates ? week.filter((d) => trainedDates.has(d.date)).length : 0
  const goal = profile?.days_per_week ?? null
  const trainedToday = trainedDates?.has(today)
  const line = !trainedDates
    ? ''
    : trainedToday
      ? 'Trained today. Good work.'
      : upNext
        ? `${upNext.name} is up next.`
        : 'Ready when you are.'

  return (
    <header className="mb-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">{date}</p>
        <a
          href="#profile"
          aria-label="Your profile"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-[2px] transition-transform active:scale-90"
          style={{ background: 'linear-gradient(135deg, var(--color-gold-light), var(--color-gold))' }}
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-ink font-display text-base font-bold text-gold">
            {initials(profile?.display_name)}
          </span>
        </a>
      </div>

      <h1 className="mt-4 font-display font-bold uppercase leading-[0.88] tracking-tight">
        <span className="block text-3xl text-neutral-400">{greeting()},</span>
        <span className="block truncate text-6xl text-white">{name ?? 'Welcome'}</span>
      </h1>
      <div aria-hidden="true" className="rule-grow mt-3 h-1 w-10 bg-gold" />
      <p className="mt-3 min-h-6 text-base text-neutral-300">{line}</p>

      <section aria-label="This week" className="mt-5 rounded-2xl border border-line bg-panel p-4">
        <ol className="grid grid-cols-7 gap-1.5">
          {week.map((d, i) => {
            const trained = trainedDates?.has(d.date)
            const isToday = d.date === today
            const future = d.date > today
            const dayNumber = Number(d.date.slice(8))
            return (
              <li key={d.date} className="day-pop flex flex-col items-center gap-1.5" style={{ '--i': i }}>
                <span className={`text-[11px] font-bold ${isToday ? 'text-gold' : 'text-muted'}`}>{d.label}</span>
                <span
                  role="img"
                  aria-label={`${d.label} ${dayNumber}${isToday ? ', today' : ''}: ${trained ? 'trained' : future ? 'to come' : 'rest'}`}
                  className={`flex aspect-square w-full max-w-10 items-center justify-center rounded-full text-sm font-bold ${
                    trained
                      ? 'bg-gold text-ink'
                      : isToday
                        ? 'today-ring border-2 border-gold text-white'
                        : future
                          ? 'border border-dashed border-line text-muted'
                          : 'border border-line text-neutral-400'
                  }`}
                >
                  {trained ? '✓' : dayNumber}
                </span>
              </li>
            )
          })}
        </ol>
        <div className="mt-4 flex items-baseline justify-between gap-3 text-sm">
          <span className="font-semibold text-white">
            {count} {count === 1 ? 'session' : 'sessions'} this week
          </span>
          {goal ? <span className="text-muted">Aiming for {goal}</span> : null}
        </div>
        {goal ? (
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden="true">
            <div
              className="week-fill h-full rounded-full bg-gold"
              style={{ width: `${Math.min(100, Math.round((count / goal) * 100))}%` }}
            />
          </div>
        ) : null}
      </section>
    </header>
  )
}
