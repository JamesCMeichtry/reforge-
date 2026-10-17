import { useState } from 'react'
import { buttonPrimary, inputBase } from './ui.jsx'
import { searchExercises, similarExercises } from '../data/exerciseLibrary.js'
import { UNITS, unitOf, unitToSave } from '../lib/measure.js'
import {
  BANDS,
  ChipPicker,
  Label,
  SKIP_REASONS,
  SWAP_REASONS,
  SetExtras,
  Sheet,
  Stepper,
  fmt,
  toNumber,
} from './LiveParts.jsx'

// The bottom sheets a coach uses mid-session: swap, edit, add, skip, notes and fixing a logged set
// Targets for one exercise: sets, reps, load, rest and a coaching note
export function TargetFields({ value, onChange }) {
  const set = (changes) => onChange({ ...value, ...changes })
  return (
    <div className="grid grid-cols-2 gap-2">
      <label className="text-xs font-medium text-muted">
        Sets
        <input
          inputMode="numeric"
          value={value.sets}
          onChange={(event) => set({ sets: event.target.value.replace(/\D/g, '') })}
          className={`mt-1 ${inputBase}`}
        />
      </label>
      <label className="text-xs font-medium text-muted">
        Reps, time or distance
        <input
          value={value.reps}
          onChange={(event) => set({ reps: event.target.value })}
          placeholder="10, 40 s, 50 m, 15 cal"
          className={`mt-1 ${inputBase}`}
        />
      </label>
      <label className="text-xs font-medium text-muted">
        Load type
        <select
          value={value.load.kind}
          onChange={(event) =>
            set({ load: { kind: event.target.value, value: event.target.value === 'band' ? 'Medium' : '' } })
          }
          className={`mt-1 ${inputBase}`}
        >
          <option value="kg">Weight (kg)</option>
          <option value="band">Band</option>
          <option value="bodyweight">Bodyweight</option>
        </select>
      </label>
      {value.load.kind === 'kg' ? (
        <label className="text-xs font-medium text-muted">
          Weight (kg)
          <input
            inputMode="decimal"
            value={value.load.value ?? ''}
            onChange={(event) => set({ load: { kind: 'kg', value: event.target.value } })}
            className={`mt-1 ${inputBase}`}
          />
        </label>
      ) : value.load.kind === 'band' ? (
        <label className="text-xs font-medium text-muted">
          Band
          <select
            value={value.load.value}
            onChange={(event) => set({ load: { kind: 'band', value: event.target.value } })}
            className={`mt-1 ${inputBase}`}
          >
            {BANDS.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
        </label>
      ) : (
        <span />
      )}
      <label className="col-span-2 text-xs font-medium text-muted">
        Coaching cue (shown every time)
        <input
          value={value.note ?? ''}
          onChange={(event) => set({ note: event.target.value })}
          placeholder="e.g. Pause 2 seconds at the bottom"
          className={`mt-1 ${inputBase}`}
        />
      </label>
    </div>
  )
}

export const cleanTargets = (value) => ({
  sets: Math.min(10, Math.max(1, parseInt(value.sets, 10) || 1)),
  reps: String(value.reps).trim() || '10',
  load:
    value.load.kind === 'kg'
      ? { kind: 'kg', value: toNumber(value.load.value) || 0 }
      : value.load.kind === 'band'
        ? { kind: 'band', value: value.load.value || 'Medium' }
        : { kind: 'bodyweight' },
  note: value.note?.trim() || undefined,
})

export function ExerciseSearch({ value, onChange, onPick, suggestions }) {
  const results = value.trim() ? searchExercises(value) : suggestions
  const exact = results.some((r) => r.name.toLowerCase() === value.trim().toLowerCase())
  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search or type any exercise"
        aria-label="Exercise"
        className={inputBase}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {results.map((item) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onPick(item)}
            className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-neutral-300 hover:border-gold"
          >
            {item.name}
          </button>
        ))}
        {value.trim() && !exact && (
          <button
            type="button"
            onClick={() => onPick({ name: value.trim() })}
            className="rounded-full border border-gold px-3 py-1.5 text-sm font-semibold text-gold"
          >
            Use “{value.trim()}”
          </button>
        )}
      </div>
    </>
  )
}

export function SwapSheet({ exercise, onClose, onSwap }) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(null)
  const [targets, setTargets] = useState({
    sets: exercise.sets,
    reps: exercise.reps,
    load: { ...exercise.load },
    note: '',
  })
  const [reason, setReason] = useState('')

  function pick(item) {
    setPicked(item.name)
    setSearch(item.name)
    if (item.load && item.load !== targets.load.kind) {
      setTargets((t) => ({ ...t, load: { kind: item.load, value: item.load === 'band' ? 'Medium' : '' } }))
    }
  }

  return (
    <Sheet title="Swap exercise" onClose={onClose}>
      <p className="-mt-2 mb-3 text-sm text-muted">Replacing {exercise.name}</p>
      <ExerciseSearch
        value={search}
        onChange={(text) => {
          setSearch(text)
          setPicked(null)
        }}
        onPick={pick}
        suggestions={similarExercises(exercise.name)}
      />
      {picked && (
        <>
          <Label>Targets for {picked}</Label>
          <TargetFields value={targets} onChange={setTargets} />
          <Label>Why?</Label>
          <ChipPicker options={SWAP_REASONS} value={reason} onChange={setReason} />
          <button
            type="button"
            onClick={() => {
              onSwap({ name: picked, section: exercise.section, rest: exercise.rest, ...cleanTargets(targets) }, reason)
              onClose()
            }}
            className={`mt-5 h-14 w-full text-lg ${buttonPrimary}`}
          >
            Swap
          </button>
        </>
      )}
    </Sheet>
  )
}

export function EditSheet({ exercise, onClose, onSave }) {
  const [targets, setTargets] = useState({
    sets: exercise.sets,
    reps: exercise.reps,
    load: { ...exercise.load },
    note: exercise.note ?? '',
  })
  const [reason, setReason] = useState('')
  return (
    <Sheet title={`Edit ${exercise.name}`} onClose={onClose}>
      <TargetFields value={targets} onChange={setTargets} />
      <Label>Why? (optional)</Label>
      <ChipPicker
        options={['Progression', 'Regression', 'Pain or discomfort', 'Technique']}
        value={reason}
        onChange={setReason}
      />
      <button
        type="button"
        onClick={() => {
          onSave(cleanTargets(targets), reason)
          onClose()
        }}
        className={`mt-5 h-14 w-full text-lg ${buttonPrimary}`}
      >
        Save changes
      </button>
    </Sheet>
  )
}

export function AddSheet({ onClose, onAdd }) {
  const [search, setSearch] = useState('')
  const [picked, setPicked] = useState(null)
  const [targets, setTargets] = useState({ sets: 3, reps: '10', load: { kind: 'kg', value: '' }, note: '' })
  return (
    <Sheet title="Add an exercise" onClose={onClose}>
      <ExerciseSearch
        value={search}
        onChange={(text) => {
          setSearch(text)
          setPicked(null)
        }}
        onPick={(item) => {
          setPicked(item)
          setSearch(item.name)
          if (item.load)
            setTargets((t) => ({ ...t, load: { kind: item.load, value: item.load === 'band' ? 'Medium' : '' } }))
        }}
        suggestions={[]}
      />
      {picked && (
        <>
          <Label>Targets</Label>
          <TargetFields value={targets} onChange={setTargets} />
          <button
            type="button"
            onClick={() => {
              onAdd({ name: picked.name, section: picked.section ?? 'Main', ...cleanTargets(targets) }, '')
              onClose()
            }}
            className={`mt-5 h-14 w-full text-lg ${buttonPrimary}`}
          >
            Add {picked.name}
          </button>
        </>
      )}
    </Sheet>
  )
}

export function SkipSheet({ exercise, onClose, onSkip }) {
  const [reason, setReason] = useState('')
  return (
    <Sheet title={`Skip ${exercise.name}?`} onClose={onClose}>
      <p className="text-neutral-300">It stays in the programme unless you choose to remove it at the end.</p>
      <Label>Why?</Label>
      <ChipPicker options={SKIP_REASONS} value={reason} onChange={setReason} />
      <button
        type="button"
        onClick={() => {
          onSkip(reason)
          onClose()
        }}
        className={`mt-5 h-14 w-full text-lg ${buttonPrimary}`}
      >
        Skip it
      </button>
    </Sheet>
  )
}

export function NoteSheet({ title, chips, initial = '', onClose, onSave }) {
  const [picked, setPicked] = useState(() => chips.filter((c) => initial.split(' · ').includes(c)))
  const [text, setText] = useState(() =>
    initial
      .split(' · ')
      .filter((part) => part && !chips.includes(part))
      .join(' · '),
  )
  const combined = [...picked, text.trim()].filter(Boolean).join(' · ')
  return (
    <Sheet title={title} onClose={onClose}>
      <ChipPicker options={chips} value={picked} onChange={setPicked} multi />
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={2}
        maxLength={300}
        placeholder="Or type (the mic on your keyboard works too)"
        aria-label="Note"
        className={`mt-3 ${inputBase}`}
      />
      <button
        type="button"
        onClick={() => {
          onSave(combined)
          onClose()
        }}
        className={`mt-4 h-14 w-full text-lg ${buttonPrimary}`}
      >
        {combined ? 'Save note' : 'Clear note'}
      </button>
    </Sheet>
  )
}

export function SetSheet({ exercise, set, sites, onClose, onSave, onDelete }) {
  const kind = exercise.load?.kind ?? 'bodyweight'
  const unit = set.unit ?? unitOf(exercise.reps)
  const [entry, setEntry] = useState({
    weight: set.weight_kg != null ? fmt(Number(set.weight_kg)) : '',
    band: set.band,
    reps: String(set.reps ?? ''),
    rpe: set.rpe ?? null,
    pain: set.pain ?? null,
    form: set.form ?? null,
    notes: set.notes ?? '',
  })
  const [area, setArea] = useState(set.pain_area ?? sites[0]?.areaId ?? null)
  const change = (changes) => setEntry((current) => ({ ...current, ...changes }))
  return (
    <Sheet title={`Set ${set.set_number}`} onClose={onClose}>
      <div className="flex gap-2">
        {kind === 'kg' && (
          <Stepper label="kg" value={entry.weight} step={2.5} onChange={(weight) => change({ weight })} />
        )}
        <Stepper
          label={UNITS[unit].label}
          value={entry.reps}
          step={UNITS[unit].step}
          numeric
          onChange={(reps) => change({ reps })}
        />
      </div>
      <SetExtras entry={entry} set={change} sites={sites} area={area} onArea={setArea} />
      <label className="mt-3 block text-xs font-medium text-muted">
        Note
        <input
          value={entry.notes}
          onChange={(event) => change({ notes: event.target.value })}
          className={`mt-1 ${inputBase}`}
        />
      </label>
      <button
        type="button"
        onClick={() => {
          const weight = toNumber(entry.weight)
          onSave({
            ...set,
            weight_kg: kind === 'kg' && Number.isFinite(weight) ? weight : null,
            band: kind === 'band' ? entry.band : null,
            reps: parseInt(entry.reps, 10) || 0,
            unit: unitToSave(unit),
            rpe: entry.rpe,
            pain: entry.pain,
            pain_area: entry.pain != null ? area : null,
            form: entry.form,
            notes: entry.notes.trim() || null,
          })
          onClose()
        }}
        className={`mt-5 h-14 w-full text-lg ${buttonPrimary}`}
      >
        Save set
      </button>
      <button
        type="button"
        onClick={() => {
          onDelete(set)
          onClose()
        }}
        className="mt-3 w-full py-2 text-sm font-semibold text-red-400"
      >
        Delete this set
      </button>
    </Sheet>
  )
}
