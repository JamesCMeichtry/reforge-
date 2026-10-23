import { useEffect, useMemo, useState } from 'react'
import StreakCard from '../components/StreakCard.jsx'
import { MyTargets } from '../components/Plans.jsx'
import { LoadingCards, ScreenHeader, buttonSecondary } from '../components/ui.jsx'
import { fetchSetHistory, tinyDate, topSets, weightedExercises } from '../lib/progress.js'

function Card({ title, aside, children }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {aside && <span className="text-sm font-semibold text-gold">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function StrengthChart({ history }) {
  const exercises = useMemo(() => weightedExercises(history), [history])
  const [picked, setPicked] = useState(null)
  const exercise = picked ?? exercises[0]
  const sessions = useMemo(() => (exercise ? topSets(history, exercise).slice(-10) : []), [history, exercise])

  if (!exercises.length) {
    return (
      <Card title="Strength">
        <p className="mt-2 text-neutral-300">Log a weighted set and your heaviest set each session appears here.</p>
      </Card>
    )
  }

  const best = Math.max(...sessions.map((s) => s.weight))
  const floor = Math.max(0, Math.min(...sessions.map((s) => s.weight)) * 0.6)
  const change = sessions.length > 1 ? sessions.at(-1).weight - sessions[0].weight : 0
  const bestSet = sessions.find((s) => s.weight === best)

  return (
    <Card title="Strength" aside={sessions.length > 1 ? `${change >= 0 ? '+' : ''}${change} kg` : null}>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {exercises.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setPicked(name)}
            aria-pressed={exercise === name}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
              exercise === name ? 'border-gold bg-gold text-ink' : 'border-line text-neutral-300'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        key={exercise}
        className="mt-5 flex h-44 items-end gap-2"
        role="img"
        aria-label={`Heaviest set per session for ${exercise}`}
      >
        {sessions.map((s) => {
          const isBest = s.weight === best
          return (
            <div key={s.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className={`text-[11px] font-semibold ${isBest ? 'text-gold' : 'text-neutral-300'}`}>
                {s.weight}
              </span>
              <div
                className="bar-grow w-full max-w-9 rounded-t-md"
                style={{
                  height: `${Math.max(6, ((s.weight - floor) / (best - floor || 1)) * 100)}%`,
                  backgroundColor: isBest ? 'var(--color-gold)' : 'var(--chart-dim)',
                }}
              />
              <span className="w-full truncate text-center text-[10px] text-muted">{tinyDate(s.date)}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-sm text-muted">
        Heaviest set each session, in kg. Best: {best} kg × {bestSet.reps}.
      </p>
    </Card>
  )
}

export default function ProgressScreen() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    fetchSetHistory()
      .then((history) => !cancelled && setState({ status: 'ready', history }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status])

  return (
    <>
      <ScreenHeader
        title="Progress"
        intro="Your streak, targets and strength over time. How each injury is going lives on Rehab."
      />
      <div className="mb-4 space-y-4">
        <StreakCard />
        <MyTargets />
      </div>
      {state.status === 'loading' && <LoadingCards count={2} height="h-56" label="Loading your progress" />}
      {state.status === 'error' && (
        <div>
          <p className="text-red-400">Couldn't load your progress. Check your connection.</p>
          <button type="button" onClick={() => setState({ status: 'loading' })} className={`mt-4 ${buttonSecondary}`}>
            Try again
          </button>
        </div>
      )}
      {state.status === 'ready' && <StrengthChart history={state.history} />}
    </>
  )
}
