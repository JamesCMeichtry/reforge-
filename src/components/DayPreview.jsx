import { useEffect, useState } from 'react'
import { buttonPrimary } from './ui.jsx'
import { daysAgo, fetchPreviousSets, fetchTodaySets, formatLoad, formatPrevious } from '../lib/programme.js'
import { effortOf, estimateMinutes, totalSets } from '../lib/effort.js'
import { groupBySection } from '../screens/SessionLog.jsx'

function EffortChip({ exercise }) {
  const effort = effortOf(exercise)
  if (!effort) return null
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold"
      style={{ borderColor: effort.colour, color: effort.colour }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: effort.colour }} aria-hidden="true" />
      {effort.label} · RPE {effort.rpe}
    </span>
  )
}

// Before a session: what's in it, how long it takes, and what you did last time. Then Start.
export default function DayPreview({ programme, day, userId, onStart }) {
  const [previous, setPrevious] = useState({})

  useEffect(() => {
    let cancelled = false
    // Already part-way through today's session: go straight back into it
    fetchTodaySets(programme.id, day.name, userId)
      .then((sets) => !cancelled && sets.length && onStart())
      .catch(() => {})
    fetchPreviousSets(
      day.exercises.map((e) => e.name),
      userId,
    )
      .then((found) => !cancelled && setPrevious(found))
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [programme.id, day, userId, onStart])

  const minutes = estimateMinutes(day)
  let index = 0

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {[
          [`~${minutes}`, 'minutes'],
          [day.exercises.length, day.exercises.length === 1 ? 'exercise' : 'exercises'],
          [totalSets(day), 'sets'],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl border border-line bg-panel px-3 py-3 text-center">
            <p className="font-display text-3xl font-bold leading-none text-white">{value}</p>
            <p className="mt-1 text-xs font-semibold text-muted">{label}</p>
          </div>
        ))}
      </div>

      {day.exercises.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line p-5 text-neutral-300">
          No exercises on this day yet.
        </p>
      )}

      {groupBySection(day.exercises).map(([section, exercises]) => (
        <section key={section} className="mb-6">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">{section}</h2>
          <ol className="overflow-hidden rounded-2xl border border-line bg-panel">
            {exercises.map((exercise) => {
              const last = formatPrevious(previous[exercise.name])
              const i = index++
              return (
                <li
                  key={exercise.id}
                  className="card-rise flex gap-3 border-b border-line px-4 py-3.5 last:border-b-0"
                  style={{ '--i': i }}
                >
                  <span className="w-5 shrink-0 pt-0.5 font-display text-lg font-bold text-gold">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-semibold text-white">{exercise.name}</span>
                      <EffortChip exercise={exercise} />
                    </span>
                    <span className="mt-0.5 block text-sm text-neutral-300">
                      {exercise.sets} × {exercise.reps} · {formatLoad(exercise.load)}
                      {exercise.tempo ? ` · ${exercise.tempo}` : ''}
                    </span>
                    {last && (
                      <span className="mt-0.5 block text-xs text-muted">
                        Last: {last} · {daysAgo(previous[exercise.name].date).toLowerCase()}
                      </span>
                    )}
                    {exercise.note && (
                      <span className="mt-1 block border-l-2 border-gold/50 pl-2 text-xs text-neutral-400">
                        {exercise.note}
                      </span>
                    )}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      ))}

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-10 -mx-1 bg-gradient-to-t from-ink via-ink to-transparent px-1 pt-4 pb-2 lg:bottom-4">
        <button type="button" onClick={onStart} className={`h-14 w-full text-lg shadow-2xl ${buttonPrimary}`}>
          Start session
        </button>
      </div>
    </div>
  )
}
