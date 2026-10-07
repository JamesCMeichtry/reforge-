import { useEffect, useState } from 'react'
import { Panel, ScreenHeader, buttonPrimary } from '../components/ui.jsx'
import { fetchActiveProgramme, fetchLastDayName, nextDay } from '../lib/programme.js'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function TodayScreen() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchActiveProgramme()
      .then(async (programme) => {
        const last = programme ? await fetchLastDayName(programme.id) : null
        if (!cancelled)
          setState({ status: 'ready', programme, upNext: programme ? nextDay(programme.days, last) : null })
      })
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [])

  const date = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <>
      <ScreenHeader title="Today" intro={`${greeting()}. ${date}.`} />
      <div className="space-y-4">
        {state.status === 'loading' && <p className="text-muted">Loading your next session…</p>}
        {state.status === 'error' && (
          <p className="text-red-400">Couldn't load your programme. Check your connection.</p>
        )}
        {state.status === 'ready' && state.upNext && (
          <section className="rounded-2xl border border-gold/60 bg-panel p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Up next</p>
            <h2 className="mt-2 font-display text-4xl font-bold uppercase leading-none">{state.upNext.name}</h2>
            <p className="mt-2 text-neutral-300">
              {state.upNext.focus} · {state.upNext.exercises.length} exercises
            </p>
            <a href={`#programme/${state.upNext.id}`} className={`mt-5 block text-center ${buttonPrimary}`}>
              Start session
            </a>
          </section>
        )}
        {state.status === 'ready' && !state.programme && (
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
        <Panel heading="Daily check-in" note="Arrives in phase 4">
          A quick question about how your body feels, so the session can adapt before you start.
        </Panel>
      </div>
    </>
  )
}
