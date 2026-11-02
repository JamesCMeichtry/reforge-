import { useState } from 'react'
import { buttonPrimary, buttonSecondary, inputBase } from './ui.jsx'
import { EFFORTS } from '../lib/effort.js'

export const SECTION_ORDER = ['Warm-up', 'Physio', 'Rehab', 'Main']
export const REST_DEFAULTS = { 'Warm-up': 30, Physio: 45, Rehab: 45, Main: 90 }
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)

// Edit one day of a programme or template: its name, focus and every exercise
export default function DayEditor({ day, askReason, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(day.name)
  const [focus, setFocus] = useState(day.focus ?? '')
  const [reason, setReason] = useState('')
  const [exercises, setExercises] = useState(() => day.exercises.map((e) => ({ ...e, load: { ...e.load } })))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const update = (id, changes) =>
    setExercises((current) => current.map((e) => (e.id === id ? { ...e, ...changes } : e)))

  async function handleSave() {
    if (!name.trim()) return setError('The day needs a name.')
    if (exercises.some((e) => !e.name.trim())) return setError('Every exercise needs a name.')
    setSaving(true)
    setError('')
    try {
      const cleaned = exercises.map((e) => ({
        ...e,
        name: e.name.trim(),
        note: e.note?.trim() || undefined,
        sets: Math.min(10, Math.max(1, parseInt(e.sets, 10) || 1)),
        reps: String(e.reps).trim() || '10',
        rest: Math.min(600, parseInt(e.rest, 10) || 0) || null,
        effort: e.effort || undefined,
        tempo: e.tempo?.trim().slice(0, 40) || undefined,
        load:
          e.load.kind === 'bodyweight'
            ? { kind: 'bodyweight' }
            : e.load.kind === 'kg'
              ? { kind: 'kg', value: parseFloat(String(e.load.value).replace(',', '.')) || 0 }
              : { kind: 'band', value: String(e.load.value || '').trim() || 'Light' },
      }))
      await onSave({ ...day, name: name.trim(), focus: focus.trim(), exercises: cleaned }, reason)
    } catch {
      setError("Couldn't save the changes. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-medium text-muted">
          Day name
          <input value={name} onChange={(event) => setName(event.target.value)} className={`mt-1 ${inputBase}`} />
        </label>
        <label className="text-xs font-medium text-muted">
          Focus
          <input
            value={focus}
            onChange={(event) => setFocus(event.target.value)}
            placeholder="e.g. Lower body + knee rehab"
            className={`mt-1 ${inputBase}`}
          />
        </label>
      </div>
      <p className="text-sm text-muted">
        Renaming an exercise starts a fresh history for it, so keep names the same to keep previous weights.
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
                {SECTION_ORDER.map((section) => (
                  <option key={section}>{section}</option>
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
          <div>
            <p className="text-xs font-medium text-muted">How hard (optional)</p>
            <div className="mt-1 grid grid-cols-4 gap-1.5" role="group" aria-label="How hard">
              {EFFORTS.map((effort) => {
                const on = exercise.effort === effort.id
                return (
                  <button
                    key={effort.id}
                    type="button"
                    onClick={() => update(exercise.id, { effort: on ? undefined : effort.id })}
                    aria-pressed={on}
                    className={`rounded-xl border px-1 py-2 text-center ${
                      on ? 'border-transparent text-ink' : 'border-line text-neutral-300'
                    }`}
                    style={on ? { background: effort.colour } : undefined}
                  >
                    <span className="block text-xs font-bold">{effort.label}</span>
                    <span className={`block text-[10px] ${on ? 'opacity-80' : 'text-muted'}`}>RPE {effort.rpe}</span>
                  </button>
                )
              })}
            </div>
          </div>
          <label className="block text-xs font-medium text-muted">
            Tempo (optional)
            <input
              type="text"
              value={exercise.tempo ?? ''}
              onChange={(event) => update(exercise.id, { tempo: event.target.value })}
              placeholder="e.g. 3 s down, pause at the bottom"
              maxLength={40}
              className={`mt-1 ${inputBase}`}
            />
          </label>
          <label className="block text-xs font-medium text-muted">
            Coaching note (optional)
            <input
              type="text"
              value={exercise.note ?? ''}
              onChange={(event) => update(exercise.id, { note: event.target.value })}
              placeholder="e.g. Pause 2 seconds at the bottom"
              className={`mt-1 ${inputBase}`}
            />
          </label>
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
      {askReason && (
        <label className="block text-xs font-medium text-muted">
          Why the change? (optional, saved in their history)
          <input
            type="text"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. Knee pain on lunges, swapped to split squats"
            className={`mt-1 ${inputBase}`}
          />
        </label>
      )}
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
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className="w-full pt-2 text-sm font-semibold text-muted hover:text-red-400"
        >
          Remove this day
        </button>
      )}
    </div>
  )
}
