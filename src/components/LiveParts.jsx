import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { subscribeSync } from '../lib/live.js'
import { amountText } from '../lib/measure.js'

// Shared pieces of the live session screens: helpers, steppers, set details and bottom sheets
/* ---------- Small helpers ---------- */

export const fmt = (n) => String(Math.round(n * 100) / 100)
export const toNumber = (value) => parseFloat(String(value ?? '').replace(',', '.'))
export const firstNumber = (text) => parseInt(String(text ?? '').match(/\d+/)?.[0] ?? '', 10)
export const isTimed = (reps) => /\d\s*(s|sec|secs|seconds)\b/i.test(String(reps ?? ''))
export const buzz = (pattern) => navigator.vibrate?.(pattern)
export const clock = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`
export const REST_SECONDS = { 'Warm-up': 30, Physio: 45, Rehab: 45, Main: 90 }
export const restFor = (exercise) => Number(exercise.rest) || REST_SECONDS[exercise.section] || 60
export const targetSets = (exercise) => Math.max(1, Number(exercise.sets) || 1)
export const loadText = (load) =>
  !load || load.kind === 'bodyweight' ? 'Bodyweight' : load.kind === 'band' ? `${load.value} band` : `${load.value} kg`
export const targetLine = (e) => `${e.sets} × ${e.reps} · ${loadText(e.load)}`
export const BANDS = ['Light', 'Medium', 'Heavy', 'X-Heavy']
export const FORM = [
  ['good', 'Good'],
  ['ok', 'OK'],
  ['poor', 'Poor'],
]
export const SET_NOTES = ['Good depth', 'Good tempo', 'Form break', 'Slow it down', 'Brace harder', 'Pain', 'Grinder']
export const EXERCISE_NOTES = [
  'Progress next time',
  'Hold load next time',
  'Reduce load next time',
  'Technique focus',
  'Pain-free',
  'Felt sore',
]
export const SWAP_REASONS = [
  'Pain or discomfort',
  'Equipment busy',
  'Progression',
  'Regression',
  'Technique',
  'Client preference',
]
export const SKIP_REASONS = ['Pain or discomfort', 'Out of time', 'Fatigue', 'Equipment busy', 'Not needed today']

export const painColour = (value) =>
  value >= 7
    ? 'var(--pain-severe)'
    : value >= 4
      ? 'var(--pain-moderate)'
      : value >= 1
        ? 'var(--pain-mild)'
        : 'var(--pain-none)'

export function setSummary(set, kind) {
  const load = set.weight_kg != null ? `${fmt(Number(set.weight_kg))} kg × ` : set.band ? `${set.band} × ` : ''
  // Sets saved with a unit say so; older timed sets fall back to the exercise's target
  const unit = set.unit ?? (kind === 'timed' ? 's' : 'reps')
  return `${load}${set.reps == null ? '✓' : amountText(set.reps, unit)}`
}

export function statusOf(exercise, sets) {
  if (exercise.status === 'skipped' || exercise.status === 'swapped') return exercise.status
  const count = sets?.length ?? 0
  if (count >= targetSets(exercise)) return 'done'
  return count ? 'active' : 'todo'
}

export function useSync() {
  const [state, setState] = useState({ pending: 0, offline: false })
  useEffect(() => subscribeSync(setState), [])
  return state
}

export function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(tick)
  }, [interval])
  return now
}

export function Centered({ children }) {
  return <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">{children}</div>
}

export function Stepper({ label, value, step, onChange, numeric }) {
  const number = toNumber(value) || 0
  const nudge = (direction) => {
    buzz(8)
    onChange(fmt(Math.max(0, number + direction * step)))
  }
  return (
    <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-line bg-ink">
      <button
        type="button"
        onClick={() => nudge(-1)}
        aria-label={`${step} less ${label}`}
        className="h-14 w-12 shrink-0 rounded-l-2xl text-3xl font-bold text-muted active:bg-line"
      >
        −
      </button>
      <label className="min-w-0 flex-1 text-center">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.replace(numeric ? /\D/g : /[^\d.,]/g, ''))}
          onFocus={(event) => event.target.select()}
          inputMode={numeric ? 'numeric' : 'decimal'}
          aria-label={label}
          className="w-full bg-transparent text-center font-display text-[2.1rem] font-bold leading-none text-white outline-none"
        />
        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{label}</span>
      </label>
      <button
        type="button"
        onClick={() => nudge(1)}
        aria-label={`${step} more ${label}`}
        className="h-14 w-12 shrink-0 rounded-r-2xl text-3xl font-bold text-gold active:bg-line"
      >
        +
      </button>
    </div>
  )
}

// Effort, pain on the injured area and form: each is one optional tap
export function SetExtras({ entry, set, sites, area, onArea }) {
  const areaLabel = sites.find((s) => s.areaId === area)?.label
  const cycleArea = () => {
    const i = sites.findIndex((s) => s.areaId === area)
    onArea(sites[(i + 1) % sites.length].areaId)
  }
  return (
    <div className="mt-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Effort</span>
        <div className="grid flex-1 grid-cols-5 gap-1">
          {[6, 7, 8, 9, 10].map((rpe) => (
            <button
              key={rpe}
              type="button"
              onClick={() => set({ rpe: entry.rpe === rpe ? null : rpe })}
              aria-pressed={entry.rpe === rpe}
              aria-label={`RPE ${rpe}`}
              className={`h-8 rounded-lg text-sm font-bold ${
                entry.rpe === rpe ? 'bg-gold text-ink' : 'border border-line text-neutral-300'
              }`}
            >
              {rpe}
            </button>
          ))}
        </div>
      </div>

      {sites.length > 0 && (
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sites.length > 1 ? cycleArea : undefined}
              aria-label={`Pain on ${areaLabel}${sites.length > 1 ? '. Tap to change area' : ''}`}
              className="w-12 shrink-0 text-left leading-tight"
            >
              <span className="block text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Pain</span>
              <span className="block truncate text-[10px] font-semibold text-gold">
                {areaLabel}
                {sites.length > 1 ? ' ⇄' : ''}
              </span>
            </button>
            <div className="grid flex-1 grid-cols-11 gap-0.5">
              {Array.from({ length: 11 }, (_, value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set({ pain: entry.pain === value ? null : value })}
                  aria-pressed={entry.pain === value}
                  aria-label={`Pain ${value} out of 10`}
                  className="h-8 rounded-md text-xs font-bold"
                  style={
                    entry.pain === value
                      ? { background: painColour(value), color: value >= 1 ? '#111' : 'var(--color-white)' }
                      : { border: '1px solid var(--color-line)', color: 'var(--color-neutral-300)' }
                  }
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="w-12 shrink-0 text-[10px] font-bold uppercase tracking-[0.15em] text-muted">Form</span>
        <div className="grid flex-1 grid-cols-3 gap-1">
          {FORM.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => set({ form: entry.form === value ? null : value })}
              aria-pressed={entry.form === value}
              className={`h-8 rounded-lg text-sm font-bold ${
                entry.form === value
                  ? value === 'poor'
                    ? 'bg-red-400 text-ink'
                    : 'bg-gold text-ink'
                  : 'border border-line text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- Sheets ---------- */

export function Sheet({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="dialog" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="sheet-fade absolute inset-0 bg-black/60" />
      <div
        className="sheet-up relative max-h-[88dvh] overflow-y-auto rounded-t-3xl border-t border-line bg-panel px-5 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.25rem)' }}
      >
        <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold uppercase leading-none">{title}</h2>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-muted">
            Cancel
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function ChipPicker({ options, value, onChange, multi }) {
  const selected = multi ? value : [value]
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const on = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            aria-pressed={on}
            onClick={() =>
              multi ? onChange(on ? value.filter((v) => v !== option) : [...value, option]) : onChange(on ? '' : option)
            }
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
              on ? 'border-gold bg-gold text-ink' : 'border-line text-neutral-300'
            }`}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}

export function Label({ children }) {
  return <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">{children}</p>
}
