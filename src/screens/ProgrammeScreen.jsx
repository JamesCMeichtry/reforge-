import { useEffect, useMemo, useState } from 'react'
import { ScreenHeader, buttonPrimary, buttonSecondary, inputBase } from '../components/ui.jsx'
import { STARTER_PLAN } from '../data/starterPlan.js'
import {
  createProgramme,
  deleteSet,
  fetchActiveProgramme,
  fetchLastDayName,
  fetchPreviousSets,
  fetchTodaySets,
  formatLoad,
  formatPrevious,
  logSet,
  nextDay,
  saveProgrammeDays,
} from '../lib/programme.js'

const SECTION_ORDER = ['Warm-up', 'Physio', 'Rehab', 'Main']
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

function groupBySection(exercises) {
  const groups = {}
  for (const exercise of exercises) (groups[exercise.section || 'Main'] ??= []).push(exercise)
  return SECTION_ORDER.filter((name) => groups[name]).map((name) => [name, groups[name]])
}

const targetLine = (exercise) => `${exercise.sets} × ${exercise.reps} · ${formatLoad(exercise.load)}`

export default function ProgrammeScreen() {
  const dayId = useDayFromHash()
  const [programme, setProgramme] = useState(null)
  const [lastDayName, setLastDayName] = useState(null)
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

  // Refresh "Up next" when coming back to the day list after a session
  const programmeId = programme?.id
  useEffect(() => {
    if (dayId || !programmeId) return
    fetchLastDayName(programmeId)
      .then(setLastDayName)
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

  if (status === 'loading') return <ScreenHeader title="Programme" intro="Loading your plan…" />
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
              className="block rounded-2xl border border-line bg-panel p-5 transition-colors hover:border-gold focus-visible:outline-2 focus-visible:outline-gold"
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
              <p className="mt-1 text-sm text-muted">{item.exercises.length} exercises</p>
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

function SessionLog({ programme, day }) {
  const [previous, setPrevious] = useState({})
  const [todaySets, setTodaySets] = useState([])
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    Promise.all([fetchPreviousSets(day.exercises.map((e) => e.name)), fetchTodaySets(programme.id, day.name)])
      .then(([prev, today]) => {
        if (cancelled) return
        setPrevious(prev)
        setTodaySets(today)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [status, day, programme.id])

  const totalSets = day.exercises.reduce((sum, e) => sum + Number(e.sets || 0), 0)
  const [doneCount, setDoneCount] = useState(0)
  useEffect(() => setDoneCount(todaySets.length), [todaySets])

  if (status === 'loading') return <p className="text-muted">Loading your last session…</p>
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

  return (
    <div>
      <div className="mb-6">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-white">Today's progress</span>
          <span className="text-muted">
            {doneCount} of {totalSets} sets
          </span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-300"
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
                onChangeCount={(delta) => setDoneCount((count) => count + delta)}
              />
            ))}
          </div>
        </section>
      ))}

      <a href="#programme" className={`block text-center ${buttonPrimary}`}>
        Finish session
      </a>
      <p className="mt-3 text-center text-xs text-muted">Every ticked set is saved straight away.</p>
    </div>
  )
}

function ExerciseLog({ programme, day, exercise, previous, todaySets, onChangeCount }) {
  const setCount = Math.max(1, Number(exercise.sets) || 1)
  const hasReps = /\d/.test(exercise.reps)
  const repsUnit = /\bs\b/.test(exercise.reps) ? 's' : 'reps'
  const kind = exercise.load?.kind ?? 'bodyweight'

  const initialRows = useMemo(
    () =>
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
        }
      }),
    // Rows are set up once when the session opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  const [rows, setRows] = useState(initialRows)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const lastTime = formatPrevious(previous)

  const update = (index, field, value) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [field]: value } : row)))

  async function toggle(index) {
    const row = rows[index]
    setError('')
    if (hasReps && !row.id && !row.reps.trim()) {
      setError(`Enter the ${repsUnit === 's' ? 'seconds' : 'reps'} for set ${index + 1} first.`)
      return
    }
    setBusy(index)
    try {
      if (row.id) {
        await deleteSet(row.id)
        update(index, 'id', null)
        onChangeCount(-1)
      } else {
        const weight = kind === 'kg' ? parseFloat(row.weight.replace(',', '.')) : null
        const id = await logSet({
          programme_id: programme.id,
          day_name: day.name,
          exercise: exercise.name,
          set_number: index + 1,
          weight_kg: Number.isFinite(weight) ? weight : null,
          band: kind === 'band' ? row.band.trim() || null : null,
          reps: hasReps ? parseInt(row.reps, 10) || 0 : null,
        })
        update(index, 'id', id)
        onChangeCount(1)
      }
    } catch {
      setError("Couldn't save that set. Check your connection and try again.")
    } finally {
      setBusy(null)
    }
  }

  return (
    <article className="rounded-2xl border border-line bg-panel p-4">
      <h3 className="font-display text-xl font-semibold leading-tight">{exercise.name}</h3>
      <p className="mt-1 text-sm text-neutral-300">{targetLine(exercise)}</p>
      {lastTime && <p className="mt-1 text-sm text-gold">Last time: {lastTime}</p>}
      {exercise.note && <p className="mt-2 text-sm leading-relaxed text-muted">{exercise.note}</p>}

      <div className="mt-4 space-y-2">
        {rows.map((row, index) => {
          const done = Boolean(row.id)
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
                    onChange={(event) => update(index, 'weight', event.target.value)}
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
                  onChange={(event) => update(index, 'band', event.target.value)}
                  className={`${inputBase} min-w-0 flex-1 disabled:opacity-60`}
                  aria-label={`Set ${index + 1} band`}
                />
              )}
              {kind === 'bodyweight' && <span className="flex-1 text-sm text-muted">Bodyweight</span>}
              {hasReps && (
                <label className="flex w-24 shrink-0 items-center gap-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={row.reps}
                    placeholder={exercise.reps.replace(/[^\d-]/g, '') || '0'}
                    disabled={done}
                    onChange={(event) => update(index, 'reps', event.target.value.replace(/\D/g, ''))}
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
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg font-bold ${
                  done ? 'border-gold bg-gold text-ink' : 'border-line text-muted hover:border-gold hover:text-white'
                }`}
              >
                ✓
              </button>
            </div>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </article>
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
              <label className="col-span-2 text-xs font-medium text-muted">
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
