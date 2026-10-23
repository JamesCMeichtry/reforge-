import { useEffect, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary } from '../components/ui.jsx'
import MorningCheck from '../components/MorningCheck.jsx'
import { TrainTogether, WorkoutInvites, useHashParts } from '../components/Friends.jsx'
import { NextSessions } from '../components/Plans.jsx'
import { NewMessages } from '../components/Chat.jsx'
import { InstallCard } from '../components/Install.jsx'
import HomeMenu from '../components/HomeMenu.jsx'
import {
  currentWeek,
  daysAgo,
  fetchActiveProgramme,
  fetchLastDayName,
  fetchRecentTraining,
  nextDay,
  todayDate,
} from '../lib/programme.js'
import { fetchMyPros } from '../lib/pro.js'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function WeekStrip({ trainedDates }) {
  const week = currentWeek()
  const today = todayDate()
  const count = week.filter((d) => trainedDates.has(d.date)).length

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl font-semibold">This week</h2>
        <p className="text-sm text-muted">
          {count} {count === 1 ? 'session' : 'sessions'}
        </p>
      </div>
      <ol className="mt-4 grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const trained = trainedDates.has(d.date)
          const isToday = d.date === today
          return (
            <li key={d.date} className="flex flex-col items-center gap-2">
              <span className={`text-xs font-semibold ${isToday ? 'text-white' : 'text-muted'}`}>{d.label}</span>
              <span
                role="img"
                aria-label={`${d.label}${isToday ? ' (today)' : ''}: ${trained ? 'trained' : 'not trained'}`}
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  trained ? 'border-gold bg-gold text-ink' : isToday ? 'border-white/70' : 'border-line'
                }`}
              >
                {trained ? '✓' : ''}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default function TodayScreen() {
  const [state, setState] = useState({ status: 'loading' })
  const [, page, inviteId] = useHashParts()

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([fetchActiveProgramme(), fetchRecentTraining(14), fetchMyPros().catch(() => [])])
      .then(async ([programme, recent, pros]) => {
        const last = programme ? await fetchLastDayName(programme.id) : null
        if (cancelled) return
        setState({
          status: 'ready',
          programme,
          recent,
          coach: pros[0] ?? null,
          upNext: programme ? nextDay(programme.days, last) : null,
        })
      })
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status])

  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const lastDone = state.upNext && state.recent?.lastByDay[state.upNext.name]

  // #today/train/<invite> is a workout with a friend
  if (page === 'train' && inviteId) return <TrainTogether key={inviteId} inviteId={inviteId} />

  return (
    <>
      <ScreenHeader title="Today" intro={`${greeting()}. ${date}.`} />
      <div className="space-y-4">
        {state.status === 'loading' && <LoadingCards count={2} height="h-36" label="Loading today" />}
        {state.status === 'error' && (
          <div>
            <p className="text-red-400">Couldn't load your programme. Check your connection.</p>
            <button type="button" onClick={() => setState({ status: 'loading' })} className={`mt-4 ${buttonSecondary}`}>
              Try again
            </button>
          </div>
        )}
        {state.status === 'ready' && state.upNext && (
          <section className="rounded-2xl border border-gold/60 bg-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
              Up next{state.coach ? ` · set by ${state.coach.display_name ?? 'your coach'}` : ''}
            </p>
            <h2 className="mt-2 font-display text-5xl font-bold uppercase leading-none">{state.upNext.name}</h2>
            <p className="mt-2 text-neutral-300">
              {[
                state.upNext.focus,
                `${state.upNext.exercises.length} ${state.upNext.exercises.length === 1 ? 'exercise' : 'exercises'}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="mt-1 text-sm text-muted">
              {lastDone ? `Last done ${daysAgo(lastDone).toLowerCase()}` : 'First time on this day'}
            </p>
            <a href={`#programme/${state.upNext.id}`} className={`mt-5 block text-center ${buttonPrimary}`}>
              Start session
            </a>
          </section>
        )}
        {state.status === 'ready' && !state.programme && state.coach && (
          <section className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-display text-2xl font-semibold">Your programme is on its way</h2>
            <p className="mt-2 text-neutral-300">
              {state.coach.display_name ?? 'Your coach'} is setting up your programme. It will appear here as soon as
              it's ready.
            </p>
          </section>
        )}
        {state.status === 'ready' && !state.programme && !state.coach && (
          <section className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-display text-2xl font-semibold">No programme yet</h2>
            <p className="mt-2 text-neutral-300">
              Load the starter plan on the Programme tab to get your first session.
            </p>
            <a href="#programme" className={`mt-5 block text-center ${buttonPrimary}`}>
              Go to Programme
            </a>
          </section>
        )}
        <NewMessages />
        <NextSessions />
        <WorkoutInvites />
        <MorningCheck />
        <HomeMenu upNext={state.status === 'loading' ? undefined : (state.upNext ?? null)} />
        {state.status === 'ready' && <WeekStrip trainedDates={state.recent.dates} />}
        <InstallCard />
      </div>
    </>
  )
}
