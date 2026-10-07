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

const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
const restFor = (exercise) => Number(exercise.rest) || REST_SECONDS[exercise.section] || 60
const targetLine = (exercise) =>
  `${exercise.sets} × ${exercise.reps} · ${formatLoad(exercise.load)} · rest ${clock(restFor(exercise))}`

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
      const seconds = restFor(exercise)
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
              
