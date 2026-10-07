import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoadingCards, buttonPrimary, buttonSecondary, inputBase } from '../components/ui.jsx'
import CheckInForm from '../components/CheckInForm.jsx'
import { fetchInjurySites } from '../lib/checkins.js'
import { deleteSet, fetchPreviousSets, fetchTodaySets, formatLoad, formatPrevious, logSet } from '../lib/programme.js'

const SECTION_ORDER = ['Warm-up', 'Physio', 'Rehab', 'Main']
const REST_SECONDS = { 'Warm-up': 30, Physio: 45, Rehab: 45, Main: 90 }

export function groupBySection(exercises) {
  const groups = {}
  for (const exercise of exercises) (groups[exercise.section || 'Main'] ??= []).push(exercise)
  return SECTION_ORDER.filter((name) => groups[name]).map((name) => [name, groups[name]])
}

const targetLine = (exercise) => `${exercise.sets} × ${exercise.reps} · ${formatLoad(exercise.load)}`
const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function RestTimer({ endsAt, total, onAdd, onSkip }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(tick)
  }, [])

  const remaining = Math.max(0, Math.ceil((endsAt - now) / 1000))
  const finished = remaining === 0
  useEffect(() => {
    if (finished) navigator.vibrate?.([120, 80, 120])
  }, [finished])

  // Rendered straight onto the page body so it always sits just above the tab bar
  return createPortal(
    <div
      className="fixed inset-x-0 z-40 px-4 pb-2"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 4.25rem)' }}
      role="timer"
      aria-live="polite"
    >
      <div className="slide-up mx-auto flex max-w-xl items-center gap-3 overflow-hidden rounded-2xl border border-line bg-panel/95 p-3 shadow-2xl backdrop-blur">
        <div className="relative h-11 w-11 shrink-0">
          <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90" aria-hidden="true">
            <circle cx="22" cy="22" r="19" fill="none" stroke="#262626" strokeWidth="4" />
            <circle
              cx="22"
              cy="22"
              r="19"
              fill="none"
              stroke="#c9a227"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={119.4}
              strokeDashoffset={119.4 * (1 - remaining / Math.max(total, 1))}
              className="transition-[stroke-dashoffset] duration-300"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{finished ? 'Rest done' : 'Rest'}</p>
          <p className={`font-display text-3xl font-bold leading-none ${finished ? 'text-gold' : 'text-white'}`}>
            {finished ? 'Go' : clock(remaining)}
          </p>
        </div>
        {!finished && (
          <button type="button" onClick={onAdd} className={buttonSecondary}>
            +15s
          </button>
        )}
        <button type="button" onClick={onSkip} className={finished ? buttonPrimary : buttonSecondary}>
          {finished ? 'Close' : 'Skip'}
        </button>
      </div>
    </div>,
    document.body,
  )
}

function SessionSummary({ day, stats, onDone }) {
  const [sites, setSites] = useState(null)
  useEffect(() => {
    fetchInjurySites()
      .then(setSites)
      .catch(() => setSites([]))
  }, [])

  return (
    <div className="pt-4 text-center">
      <div className="celebrate mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold text-5xl text-gold">
        ✓
      </div>
      <h2 className="mt-6 font-display text-5xl font-bold uppercase leading-none">Session done</h2>
      <p className="mt-3 text-muted">{day.name} logged. Every set is saved.</p>
      <dl className="mt-8 grid grid-cols-3 gap-2 text-left">
        {[
          ['Sets', stats.sets],
          ['Exercises', `${stats.exercisesDone}/${stats.exercisesTotal}`],
          ['Volume', stats.volume ? `${stats.volume.toLocaleString('en-GB')} kg` : '–'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-panel p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      {sites?.length > 0 && (
        <div className="mt-6">
          <CheckInForm sites={sites} />
        </div>
      )}
      <button
        type="button"
        onClick={onDone}
        className={`mt-6 w-full ${sites?.length ? buttonSecondary : buttonPrimary}`}
      >
        Back to programme
      </button>
    </div>
  )
}

export default function SessionLog({ programme, day }) {
  const [previous, setPrevious] = useState({})
  const [todaySets, setTodaySets] = useState([])
  const [status, setStatus] = useState('loading')
  const [logged, setLogged] = useState({})
  const [rest, setRest] = useState(null)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    Promise.all([fetchPreviousSets(day.exercises.map((e) => e.name)), fetchTodaySets(programme.id, day.name)])
      .then(([prev, today]) => {
        if (cancelled) return
        setPrevious(prev)
        setTodaySets(today)
        const initial = {}
        for (const set of today) initial[`${set.exercise}#${set.set_number}`] = set
        setLogged(initial)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [status, day, programme.id])

  const totalSets = day.exercises.reduce((sum, e) => sum + Number(e.sets || 0), 0)
  const doneCount = Object.keys(logged).length

  function handleLogged(exercise, setNumber, row) {
    setLogged((current) => {
      const next = { ...current }
      if (row) next[`${exercise.name}#${setNumber}`] = row
      else delete next[`${exercise.name}#${setNumber}`]
      return next
    })
    if (row) {
      const seconds = REST_SECONDS[exercise.section] ?? 60
      setRest({ endsAt: Date.now() + seconds * 1000, total: seconds })
    }
  }

  const stats = useMemo(() => {
    const rows = Object.values(logged)
    const names = new Set(rows.map((r) => r.exercise))
    return {
      sets: rows.length,
      exercisesDone: day.exercises.filter((e) => names.has(e.name)).length,
      exercisesTotal: day.exercises.length,
      volume: Math.round(rows.reduce((sum, r) => sum + (Number(r.weight_kg) || 0) * (Number(r.reps) || 0), 0)),
    }
  }, [logged, day.exercises])

  if (status === 'loading') return <LoadingCards count={4} height="h-40" label="Loading your session" />
  if (status === 'error') {
    return (
      <div>
        <p className="text-red-400">Couldn't load this session. Check your connection.</p>
        <button type="button" onClick={() => setStatus('loading')} className={`mt-4 ${buttonSecondary}`}>
          Try again
        </button>
      </div>
    )
  }

  if (finished) return <SessionSummary day={day} stats={stats} onDone={() => (window.location.hash = 'programme')} />

  return (
    <div>
      <div
        className="sticky top-0 z-30 -mx-5 mb-6 border-b border-line bg-ink/90 px-5 pt-3 pb-3 backdrop-blur"
        style={{ top: 'env(safe-area-inset-top)' }}
      >
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-white">{day.name}</span>
          <span className="text-muted">
            {doneCount} of {totalSets} sets
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out"
            style={{ width: `${totalSets ? Math.min(100, (doneCount / totalSets) * 100) : 0}%` }}
          />
        </div>
      </div>

      {groupBySection(day.exercises).map(([section, exercises]) => (
        <section key={section} className="mb-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-gold">{section}</h2>
          <div className="space-y-3">
            {exercises.map((exercise) => (
              <ExerciseLog
                key={exercise.id}
                programme={programme}
                day={day}
                exercise={exercise}
                previous={previous[exercise.name]}
                todaySets={todaySets.filter((s) => s.exercise === exercise.name)}
                onLogged={(setNumber, row) => handleLogged(exercise, setNumber, row)}
              />
            ))}
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={() => {
          setRest(null)
          if (doneCount) setFinished(true)
          else window.location.hash = 'programme'
        }}
        className={`w-full ${buttonPrimary}`}
      >
        {doneCount ? 'Finish session' : 'Leave session'}
      </button>
      <p className="mt-3 text-center text-xs text-muted">Every ticked set is saved straight away.</p>
      {rest && <div className="h-24" aria-hidden="true" />}

      {rest && (
        <RestTimer
          key={rest.endsAt - rest.total * 1000}
          endsAt={rest.endsAt}
          total={rest.total}
          onAdd={() => setRest((r) => ({ endsAt: r.endsAt + 15000, total: r.total + 15 }))}
          onSkip={() => setRest(null)}
        />
      )}
    </div>
  )
}

function ExerciseLog({ programme, day, exercise, previous, todaySets, onLogged }) {
  const setCount = Math.max(1, Number(exercise.sets) || 1)
  const hasReps = /\d/.test(exercise.reps)
  const repsUnit = /\bs\b/.test(exercise.reps) ? 's' : 'reps'
  const kind = exercise.load?.kind ?? 'bodyweight'
  const targetReps = exercise.reps.replace(/[^\d-]/g, '') || '0'

  const [rows, setRows] = useState(() =>
    Array.from({ length: setCount }, (_, index) => {
      const number = index + 1
      const logged = todaySets.find((s) => s.set_number === number)
      const prev = previous?.sets.find((s) => s.set_number === number)
      if (logged) {
        return {
          id: logged.id,
          weight: logged.weight_kg != null ? String(Number(logged.weight_kg)) : '',
          band: logged.band ?? '',
          reps: logged.reps != null ? String(logged.reps) : '',
          touched: true,
        }
      }
      return {
        id: null,
        weight:
          prev?.weight_kg != null
            ? String(Number(prev.weight_kg))
            : kind === 'kg'
              ? String(exercise.load.value ?? '')
              : '',
        band: prev?.band ?? (kind === 'band' ? exercise.load.value : ''),
        reps: '',
        touched: false,
      }
    }),
  )
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const repsRefs = useRef([])
  const lastTime = formatPrevious(previous)
  const allDone = rows.every((row) => row.id)
  const collapsed = allDone && !expanded

  const update = (index, changes) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...changes } : row)))

  async function toggle(index) {
    const row = rows[index]
    setError('')
    if (hasReps && !row.id && !row.reps.trim()) {
      setError(`Enter the ${repsUnit === 's' ? 'seconds' : 'reps'} for set ${index + 1} first.`)
      repsRefs.current[index]?.focus()
      return
    }
    setBusy(index)
    try {
      if (row.id) {
        await deleteSet(row.id)
        update(index, { id: null })
        onLogged(index + 1, null)
        return
      }
      const weight = kind === 'kg' ? parseFloat(row.weight.replace(',', '.')) : null
      const saved = {
        programme_id: programme.id,
        day_name: day.name,
        exercise: exercise.name,
        set_number: index + 1,
        weight_kg: Number.isFinite(weight) ? weight : null,
        band: kind === 'band' ? row.band.trim() || null : null,
        reps: hasReps ? parseInt(row.reps, 10) || 0 : null,
      }
      const id = await logSet(saved)
      // Carry this set's load forward to later sets you haven't changed yourself
      setRows((current) =>
        current.map((r, i) => {
          if (i === index) return { ...r, id, touched: true }
          if (i > index && !r.id) {
            return {
              ...r,
              ...(r.touched ? {} : { weight: row.weight, band: row.band }),
              reps: r.reps || row.reps,
            }
          }
          return r
        }),
      )
      onLogged(index + 1, { ...saved, id })
      if (index === rows.length - 1) setExpanded(false)
    } catch {
      setError("Couldn't save that set. Check your connection and try again.")
    } finally {
      setBusy(null)
    }
  }

  const summary = rows
    .map((row) => (kind === 'kg' ? `${row.weight}×${row.reps || '–'}` : hasReps ? row.reps || '–' : '✓'))
    .join(', ')

  return (
    <article
      className={`rounded-2xl border bg-panel p-4 transition-colors duration-300 ${allDone ? 'border-gold/50' : 'border-line'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-xl font-semibold leading-tight">{exercise.name}</h3>
          {collapsed ? (
            <p className="mt-1 text-sm text-gold">Done · {summary}</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-neutral-300">{targetLine(exercise)}</p>
              {lastTime && <p className="mt-1 text-sm text-gold">Last time: {lastTime}</p>}
            </>
          )}
        </div>
        {allDone && (
          <button
            type="button"
            onClick={() => setExpanded((open) => !open)}
            className="shrink-0 rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:text-white"
            aria-expanded={!collapsed}
          >
            {collapsed ? 'Edit' : 'Hide'}
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {exercise.note && <p className="mt-2 text-sm leading-relaxed text-muted">{exercise.note}</p>}
          <div className="mt-4 space-y-2">
            {rows.map((row, index) => {
              const done = Boolean(row.id)
              const previousReps = index > 0 ? rows[index - 1].reps : ''
              return (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-10 shrink-0 text-sm font-semibold text-muted">Set {index + 1}</span>
                  {kind === 'kg' && (
                    <label className="flex min-w-0 flex-1 items-center gap-1.5">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.weight}
                        disabled={done}
                        onChange={(event) => update(index, { weight: event.target.value, touched: true })}
                        className={`${inputBase} text-center disabled:opacity-60`}
                        aria-label={`Set ${index + 1} weight in kilograms`}
                      />
                      <span className="text-xs text-muted">kg</span>
                    </label>
                  )}
                  {kind === 'band' && (
                    <input
                      type="text"
                      value={row.band}
                      disabled={done}
                      onChange={(event) => update(index, { band: event.target.value, touched: true })}
                      className={`${inputBase} min-w-0 flex-1 disabled:opacity-60`}
                      aria-label={`Set ${index + 1} band`}
                    />
                  )}
                  {kind === 'bodyweight' && <span className="flex-1 text-sm text-muted">Bodyweight</span>}
                  {hasReps && (
                    <label className="flex w-24 shrink-0 items-center gap-1.5">
                      <input
                        ref={(el) => (repsRefs.current[index] = el)}
                        type="text"
                        inputMode="numeric"
                        enterKeyHint="done"
                        value={row.reps}
                        placeholder={previousReps || targetReps}
                        disabled={done}
                        onChange={(event) => update(index, { reps: event.target.value.replace(/\D/g, '') })}
                        onKeyDown={(event) => event.key === 'Enter' && toggle(index)}
                        className={`${inputBase} text-center disabled:opacity-60`}
                        aria-label={`Set ${index + 1} ${repsUnit === 's' ? 'seconds' : 'reps'}`}
                      />
                      <span className="w-6 text-xs text-muted">{repsUnit}</span>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(index)}
                    disabled={busy === index}
                    aria-pressed={done}
                    aria-label={done ? `Undo set ${index + 1}` : `Log set ${index + 1}`}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg font-bold transition-colors duration-200 ${
                      done
                        ? 'tick-pop border-gold bg-gold text-ink'
                        : 'border-line text-muted hover:border-gold hover:text-white'
                    }`}
                  >
                    {busy === index ? '…' : '✓'}
                  </button>
                </div>
              )
            })}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </article>
  )
}
