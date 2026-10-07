import { useEffect, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary, inputBase } from '../components/ui.jsx'
import { STARTER_PLAN } from '../data/starterPlan.js'
import {
  createProgramme,
  daysAgo,
  fetchActiveProgramme,
  fetchLastDayName,
  fetchRecentTraining,
  nextDay,
  saveProgrammeDays,
} from '../lib/programme.js'
import SessionLog from './SessionLog.jsx'

const SECTION_ORDER = ['Warm-up', 'Physio', 'Rehab', 'Main']
const REST_DEFAULTS = { 'Warm-up': 30, Physio: 45, Rehab: 45, Main: 90 }
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

function useDayFromHash() {
  const read = () => window.location.hash.replace('#', '').split('/')[1] ?? null
  const [dayId, setDayId] = useState(read)
  useEffect(() => {
    const onChange = () => setDayId(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return dayId
}

export default function ProgrammeScreen() {
  const dayId = useDayFromHash()
  const [programme, setProgramme] = useState(null)
  const [lastDayName, setLastDayName] = useState(null)
  const [lastByDay, setLastByDay] = useState({})
  const [status, setStatus] = useState('loading')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    fetchActiveProgramme()
      .then(async (found) => {
        const last = found ? await fetchLastDayName(found.id) : null
        if (cancelled) return
        setProgramme(found)
        setLastDayName(last)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [status])

  // Refresh "Up next" and "Last done" whenever the day list is showing
  const programmeId = programme?.id
  useEffect(() => {
    if (dayId || !programmeId) return
    fetchLastDayName(programmeId)
      .then(setLastDayName)
      .catch(() => {})
    fetchRecentTraining(90)
      .then(({ lastByDay: last }) => setLastByDay(last))
      .catch(() => {})
  }, [dayId, programmeId])

  async function loadStarter() {
    setCreating(true)
    try {
      setProgramme(await createProgramme(STARTER_PLAN))
    } catch {
      setStatus('error')
    } finally {
      setCreating(false)
    }
  }

  async function saveDay(updatedDay) {
    const days = programme.days.map((day) => (day.id === updatedDay.id ? updatedDay : day))
    await saveProgrammeDays(programme.id, days)
    setProgramme({ ...programme, days })
  }

  if (status === 'loading') {
    return (
      <>
        <ScreenHeader title="Programme" intro="Loading your plan…" />
        <LoadingCards count={4} label="Loading your plan" />
      </>
    )
  }
  if (status === 'error') {
    return (
      <>
        <ScreenHeader title="Programme" />
        <p className="text-red-400">Couldn't load your programme. Check your connection.</p>
        <button type="button" onClick={() => setStatus('loading')} className={`mt-4 ${buttonSecondary}`}>
          Try again
        </button>
      </>
    )
  }

  if (!programme) {
    return (
      <>
        <ScreenHeader title="Programme" intro="Your full plan, built around your goals and injuries." />
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-display text-2xl font-semibold">Start with the starter plan</h2>
          <p className="mt-2 leading-relaxed text-neutral-300">
            A four-day upper/lower split with the knee rehab, physio block and hamstring ladder built in. You can edit
            every exercise afterwards.
          </p>
          <button type="button" onClick={loadStarter} disabled={creating} className={`mt-5 w-full ${buttonPrimary}`}>
            {creating ? 'Loading…' : 'Load starter plan'}
          </button>
        </section>
      </>
    )
  }

  const day = programme.days.find((item) => item.id === dayId)
  if (day) return <DayView key={day.id} programme={programme} day={day} onSaveDay={saveDay} />

  const upNext = nextDay(programme.days, lastDayName)
  return (
    <>
      <ScreenHeader title="Programme" intro={programme.name} />
      <ul className="space-y-3">
        {programme.days.map((item) => (
          <li key={item.id}>
            <a
              href={`#programme/${item.id}`}
              className={`block rounded-2xl border bg-panel p-5 transition-colors hover:border-gold focus-visible:outline-2 focus-visible:outline-gold ${
                item.id === upNext?.id ? 'border-gold/60' : 'border-line'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-3xl font-bold uppercase leading-none">{item.name}</h2>
                {item.id === upNext?.id && (
                  <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink">
                    Up next
                  </span>
                )}
              </div>
              <p className="mt-2 text-neutral-300">{item.focus}</p>
              <p className="mt-1 text-sm text-muted">
                {item.exercises.length} exercises ·{' '}
                {lastByDay[item.name] ? `Last done ${daysAgo(lastByDay[item.name]).toLowerCase()}` : 'Not done yet'}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </>
  )
}

function DayView({ programme, day, onSaveDay }) {
  const [editing, setEditing] = useState(false)

  return (
    <>
      <a href="#programme" className="mb-4 inline-block text-sm font-semibold text-muted hover:text-white">
        ← All days
      </a>
      <ScreenHeader title={day.name} intro={day.focus} />
      <div className="mb-6 flex rounded-xl border border-line bg-panel p-1" role="group" aria-label="Mode">
        {[
          [false, 'Log session'],
          [true, 'Edit day'],
        ].map(([value, label]) => (
          <button
            key={label}
            type="button"
            onClick={() => setEditing(value)}
            aria-pressed={editing === value}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
              editing === value ? 'bg-gold text-ink' : 'text-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {editing ? (
        <DayEditor
          day={day}
          onCancel={() => setEditing(false)}
          onSave={async (updated) => {
            await onSaveDay(updated)
            setEditing(false)
          }}
        />
      ) : (
        <SessionLog programme={programme} day={day} />
      )}
    </>
  )
}

function DayEditor({ day, onSave, onCancel }) {
  const [exercises, setExercises] = useState(() => day.exercises.map((e) => ({ ...e, load: { ...e.load } })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (id, changes) =>
    setExercises((current) => current.map((e) => (e.id === id ? { ...e, ...changes } : e)))

  async function handleSave() {
    if (exercises.some((e) => !e.name.trim())) return setError('Every exercise needs a name.')
    setSaving(true)
    setError('')
    try {
      const cleaned = exercises.map((e) => ({
        ...e,
        name: e.name.trim(),
        sets: Math.min(10, Math.max(1, parseInt(e.sets, 10) || 1)),
        reps: e.reps.trim() || '10',
        rest: Math.min(600, parseInt(e.rest, 10) || 0) || null,
        load:
          e.load.kind === 'bodyweight'
            ? { kind: 'bodyweight' }
            : e.load.kind === 'kg'
              ? { kind: 'kg', value: parseFloat(String(e.load.value).replace(',', '.')) || 0 }
              : { kind: 'band', value: String(e.load.value || '').trim() || 'Light' },
      }))
      await onSave({ ...day, exercises: cleaned })
    } catch {
      setError("Couldn't save your changes. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Renaming an exercise starts a fresh history for it, so keep names the same to keep your previous weights.
      </p>
      {exercises.map((exercise) => (
        <article key={exercise.id} className="space-y-3 rounded-2xl border border-line bg-panel p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={exercise.name}
              onChange={(event) => update(exercise.id, { name: event.target.value })}
              placeholder="Exercise name"
              className={inputBase}
              aria-label="Exercise name"
            />
            <button
              type="button"
              onClick={() => setExercises((current) => current.filter((e) => e.id !== exercise.id))}
              className="shrink-0 rounded-lg px-3 text-sm font-semibold text-muted hover:text-red-400"
              aria-label={`Remove ${exercise.name || 'exercise'}`}
            >
              Remove
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-medium text-muted">
              Section
              <select
                value={exercise.section || 'Main'}
                onChange={(event) => update(exercise.id, { section: event.target.value })}
                className={`mt-1 ${inputBase}`}
              >
                {SECTION_ORDER.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted">
              Sets
              <input
                type="text"
                inputMode="numeric"
                value={exercise.sets}
                onChange={(event) => update(exercise.id, { sets: event.target.value.replace(/\D/g, '') })}
                className={`mt-1 ${inputBase}`}
              />
            </label>
            <label className="text-xs font-medium text-muted">
              Reps
              <input
                type="text"
                value={exercise.reps}
                onChange={(event) => update(exercise.id, { reps: event.target.value })}
                className={`mt-1 ${inputBase}`}
              />
            </label>
            <label className="text-xs font-medium text-muted">
              Rest (seconds)
              <input
                type="text"
                inputMode="numeric"
                value={exercise.rest ?? ''}
                placeholder={`${REST_DEFAULTS[exercise.section || 'Main'] ?? 60} (default)`}
                onChange={(event) => update(exercise.id, { rest: event.target.value.replace(/\D/g, '') })}
                className={`mt-1 ${inputBase}`}
              />
            </label>
            <label className="text-xs font-medium text-muted">
              Load type
              <select
                value={exercise.load.kind}
                onChange={(event) => update(exercise.id, { load: { kind: event.target.value, value: '' } })}
                className={`mt-1 ${inputBase}`}
              >
                <option value="kg">Weight (kg)</option>
                <option value="band">Band</option>
                <option value="bodyweight">Bodyweight</option>
              </select>
            </label>
            {exercise.load.kind !== 'bodyweight' && (
              <label className="text-xs font-medium text-muted">
                {exercise.load.kind === 'kg' ? 'Weight (kg)' : 'Band'}
                <input
                  type="text"
                  inputMode={exercise.load.kind === 'kg' ? 'decimal' : 'text'}
                  value={exercise.load.value ?? ''}
                  onChange={(event) => update(exercise.id, { load: { ...exercise.load, value: event.target.value } })}
                  className={`mt-1 ${inputBase}`}
                />
              </label>
            )}
          </div>
        </article>
      ))}
      <button
        type="button"
        onClick={() =>
          setExercises((current) => [
            ...current,
            { id: newId(), section: 'Main', name: '', sets: 3, reps: '10', load: { kind: 'kg', value: '' } },
          ])
        }
        className={`w-full ${buttonSecondary}`}
      >
        + Add exercise
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className={`flex-1 ${buttonSecondary}`}>
          Cancel
        </button>
        <button type="button" onClick={handleSave} disabled={saving} className={`flex-1 ${buttonPrimary}`}>
          {saving ? 'Saving…' : 'Save day'}
        </button>
      </div>
    </div>
  )
}
