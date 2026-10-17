import { useEffect, useState } from 'react'
import { buttonPrimary, buttonSecondary } from './ui.jsx'
import { BANDS, SET_NOTES, SetExtras, Stepper, buzz, clock, fmt, targetSets, toNumber, useNow } from './LiveParts.jsx'
import { NoteSheet } from './LiveSheets.jsx'
import { UNITS, amountText, targetAmount, unitOf, unitToSave } from '../lib/measure.js'

/* ---------- Logging a set ---------- */

function prefill(exercise, sets, past) {
  const kind = exercise.load?.kind ?? 'bodyweight'
  const lastHere = sets[sets.length - 1]
  const lastTime = past?.last?.sets[sets.length] ?? past?.last?.sets[past.last.sets.length - 1]
  const target = targetAmount(exercise.reps)
  return {
    weight:
      kind !== 'kg'
        ? ''
        : lastHere?.weight_kg != null
          ? fmt(Number(lastHere.weight_kg))
          : lastTime?.weight_kg != null
            ? fmt(Number(lastTime.weight_kg))
            : fmt(toNumber(exercise.load.value) || 0),
    band: kind === 'band' ? (lastHere?.band ?? exercise.load.value ?? 'Medium') : null,
    reps: String(lastHere?.reps ?? lastTime?.reps ?? target ?? 10),
    rpe: null,
    pain: null,
    form: null,
    notes: '',
  }
}

// When every set last time hit the top of the rep target, suggest the next jump in load
function progression(exercise, past) {
  if (exercise.load?.kind !== 'kg' || unitOf(exercise.reps) !== 'reps' || !past?.last?.sets.length) return null
  const top = Math.max(...(String(exercise.reps).match(/\d+/g) ?? ['0']).map(Number))
  const sets = past.last.sets.filter((s) => s.weight_kg != null)
  if (!top || sets.length < targetSets(exercise) || sets.some((s) => (s.reps ?? 0) < top)) return null
  const weight = Math.max(...sets.map((s) => Number(s.weight_kg)))
  return fmt(weight + (weight >= 20 ? 2.5 : 1))
}

export function EntryPanel({ exercise, sets, past, sites, rest, onRestChange, onLog, nextName, onNext }) {
  const [entry, setEntry] = useState(() => prefill(exercise, sets, past))
  const [area, setArea] = useState(sites[0]?.areaId ?? null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [extra, setExtra] = useState(false)
  const kind = exercise.load?.kind ?? 'bodyweight'
  const unit = unitOf(exercise.reps)
  const done = sets.length >= targetSets(exercise)
  const suggestion = sets.length === 0 ? progression(exercise, past) : null
  const set = (changes) => setEntry((current) => ({ ...current, ...changes }))

  function log() {
    const weight = toNumber(entry.weight)
    onLog({
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
  }

  return (
    <section
      aria-label="Log a set"
      className="border-t border-line bg-panel px-4 pt-3"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
    >
      {rest && <RestStrip rest={rest} onChange={onRestChange} />}

      {done && !extra ? (
        <div className="flex gap-2">
          <button type="button" onClick={() => setExtra(true)} className={`h-14 shrink-0 ${buttonSecondary}`}>
            + Extra set
          </button>
          <button type="button" onClick={onNext} className={`h-14 min-w-0 flex-1 truncate text-lg ${buttonPrimary}`}>
            {nextName ? `Next: ${nextName} →` : 'Review session →'}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
              {done ? 'Extra set' : `Set ${sets.length + 1} of ${targetSets(exercise)}`}
            </p>
            {suggestion && entry.weight !== suggestion && (
              <button type="button" onClick={() => set({ weight: suggestion })} className="text-xs font-bold text-gold">
                ↑ All reps hit last time · try {suggestion} kg
              </button>
            )}
          </div>

          <div className="flex gap-2">
            {kind === 'kg' && (
              <Stepper label="kg" value={entry.weight} step={2.5} onChange={(weight) => set({ weight })} />
            )}
            {kind === 'band' && (
              <div className="flex flex-1 flex-col justify-center gap-1 rounded-2xl border border-line bg-ink p-1.5">
                <p className="text-center text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Band</p>
                <div className="grid grid-cols-2 gap-1">
                  {BANDS.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => set({ band: b })}
                      aria-pressed={entry.band === b}
                      className={`rounded-lg py-1.5 text-xs font-bold ${entry.band === b ? 'bg-gold text-ink' : 'text-muted'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {kind === 'bodyweight' && (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-line bg-ink text-sm font-semibold text-muted">
                Bodyweight
              </div>
            )}
            <Stepper
              label={UNITS[unit].label}
              value={entry.reps}
              step={UNITS[unit].step}
              numeric
              onChange={(reps) => set({ reps })}
            />
          </div>

          <SetExtras entry={entry} set={set} sites={sites} area={area} onArea={setArea} />

          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setNoteOpen(true)}
              aria-label={entry.notes ? `Set note: ${entry.notes}` : 'Add a note to this set'}
              className={`h-14 shrink-0 rounded-xl border px-4 text-sm font-semibold ${
                entry.notes ? 'border-gold text-gold' : 'border-line text-muted'
              }`}
            >
              {entry.notes ? '✎ Note' : '+ Note'}
            </button>
            <button
              type="button"
              onClick={log}
              className={`h-14 flex-1 font-display text-2xl font-bold uppercase ${buttonPrimary}`}
            >
              {done ? 'Log extra set' : `Log set ${sets.length + 1}`}
            </button>
          </div>
        </>
      )}

      {noteOpen && (
        <NoteSheet
          title="Note on this set"
          chips={SET_NOTES}
          initial={entry.notes}
          onClose={() => setNoteOpen(false)}
          onSave={(notes) => set({ notes })}
        />
      )}
    </section>
  )
}

export function RestStrip({ rest, onChange }) {
  const now = useNow(250)
  const remaining = Math.max(0, Math.ceil((rest.endsAt - now) / 1000))
  const finished = remaining === 0
  useEffect(() => {
    if (finished) buzz([120, 80, 120])
  }, [finished])
  return (
    <div className="mb-2 overflow-hidden rounded-xl border border-line bg-ink">
      <div className="flex items-center gap-3 px-3 py-1.5">
        <p className={`font-display text-2xl font-bold leading-none ${finished ? 'text-gold' : 'text-white'}`}>
          {finished ? 'Rest done · go' : clock(remaining)}
        </p>
        <span className="flex-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {finished ? '' : 'Rest'}
        </span>
        {!finished && (
          <button
            type="button"
            onClick={() => onChange({ endsAt: rest.endsAt + 15000, total: rest.total + 15 })}
            className="rounded-lg border border-line px-2.5 py-1 text-sm font-semibold"
          >
            +15s
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-lg px-2 py-1 text-sm font-semibold text-muted"
        >
          {finished ? 'Close' : 'Skip'}
        </button>
      </div>
      <div
        className="h-1 bg-gold transition-[width] duration-300 ease-linear"
        style={{ width: `${(remaining / Math.max(rest.total, 1)) * 100}%` }}
      />
    </div>
  )
}

export function PbBurst({ pb }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-1/3 z-[70] flex justify-center px-6" role="status">
      <div className="pb-burst rounded-3xl border-2 border-gold bg-ink px-8 py-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold">New personal best</p>
        <p className="mt-2 whitespace-nowrap font-display text-4xl font-bold uppercase leading-none text-white">
          {fmt(pb.weight)} kg × {amountText(pb.reps, pb.unit)}
        </p>
        <p className="mt-2 text-sm text-muted">
          {pb.name} · was {fmt(pb.previous.weight)} kg
        </p>
      </div>
    </div>
  )
}
