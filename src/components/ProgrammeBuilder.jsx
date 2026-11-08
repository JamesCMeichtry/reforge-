import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buttonPrimary, inputBase } from './ui.jsx'
import { toast } from './Feedback.jsx'
import BuilderContext from './BuilderContext.jsx'
import BuilderLibrary, { DRAG_TYPE } from './BuilderLibrary.jsx'
import { SECTION_ORDER, REST_DEFAULTS } from './DayEditor.jsx'
import { searchExercises } from '../data/exerciseLibrary.js'
import { EFFORTS } from '../lib/effort.js'
import { estimateMinutes, totalSets } from '../lib/effort.js'
import { fetchPreviousSets } from '../lib/programme.js'
import {
  blankDay,
  blankExercise,
  cleanDays,
  copyDay,
  describeChanges,
  insertExercise,
  lastLine,
  moveExercise,
  newId,
  problems,
} from '../lib/builder.js'
import {
  MAX_WEEKS,
  MIN_WEEKS,
  PROGRESS_KINDS,
  blockStatus,
  blockText,
  dayForWeek,
  exerciseForWeek,
  isDeload,
  nextMonday,
} from '../lib/blocks.js'
import './Builder.css'

// The laptop programme builder: every day side by side, the library on the right, the client's
// injuries and recent training across the top. Edits stay local until Save, with undo and a draft.

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
const MOD = isMac ? '⌘' : 'Ctrl'
const SECTION_TONE = {
  'Warm-up': 'var(--color-muted)',
  Physio: 'var(--lvl-building)',
  Rehab: '#22c55e',
  Main: 'transparent',
}
// Where the rule takes an exercise by the top week of the block: "→ 80 kg", "→ 12 reps", "→ 5 sets"
const endValue = (e, kind) =>
  kind === 'kg'
    ? Number(e.load?.value) > 0
      ? `→ ${e.load.value} kg`
      : 'add a weight'
    : kind === 'reps'
      ? `→ ${e.reps} reps`
      : `→ ${e.sets} sets`
const draftStore = (key) => `reforge.builder-draft.${key}`
const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)

function readDraft(key) {
  try {
    return JSON.parse(localStorage.getItem(draftStore(key)) ?? 'null')
  } catch {
    return null
  }
}
function writeDraft(key, value) {
  try {
    if (value) localStorage.setItem(draftStore(key), JSON.stringify(value))
    else localStorage.removeItem(draftStore(key))
  } catch {
    // Storage can be off (private windows); the draft is a convenience only
  }
}

/* ---------- Undo history ---------- */

function useHistory(initial) {
  const [state, setState] = useState({ days: initial, past: [], future: [] })
  const last = useRef({ key: null, at: 0 })
  // Typing in one field within a second counts as one step, so undo doesn't go letter by letter
  const commit = useCallback((change, key = null) => {
    const now = Date.now()
    const merge = key && last.current.key === key && now - last.current.at < 1200
    last.current = { key, at: now }
    setState((s) => ({ days: change(s.days), past: merge ? s.past : [...s.past.slice(-60), s.days], future: [] }))
  }, [])
  const undo = useCallback(() => {
    last.current = { key: null, at: 0 }
    setState((s) =>
      s.past.length ? { days: s.past.at(-1), past: s.past.slice(0, -1), future: [s.days, ...s.future] } : s,
    )
  }, [])
  const redo = useCallback(() => {
    last.current = { key: null, at: 0 }
    setState((s) => (s.future.length ? { days: s.future[0], past: [...s.past, s.days], future: s.future.slice(1) } : s))
  }, [])
  const reset = useCallback((days) => setState({ days, past: [], future: [] }), [])
  return { ...state, commit, undo, redo, reset }
}

/* ---------- One exercise ---------- */

const ExerciseCard = memo(function ExerciseCard({
  exercise,
  dayId,
  index,
  previous,
  flash,
  invalid,
  week,
  block,
  onChange,
  onRemove,
  onKey,
  onDragStart,
  onDragEnd,
}) {
  const [more, setMore] = useState(Boolean(exercise.tempo || exercise.note))
  const [armed, setArmed] = useState(false)
  const [suggest, setSuggest] = useState(-1)
  const [focused, setFocused] = useState(false)
  const ref = useRef(null)
  const set = (field) => (changes) => onChange(dayId, exercise.id, changes, field)
  // Previewing a later week: show that week's numbers, read-only (they come from week 1 and the rule)
  const preview = Boolean(block?.weeks && week > 1)
  const shown = preview ? exerciseForWeek(exercise, week, block) : exercise
  const topWeek = block?.weeks ? (isDeload(block, block.weeks) ? block.weeks - 1 : block.weeks) : 1

  useEffect(() => {
    if (!flash) return
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    ref.current?.querySelector('input')?.focus({ preventScroll: true })
  }, [flash])

  const suggestions =
    focused && exercise.name.trim().length > 0
      ? searchExercises(exercise.name, 6).filter((s) => s.name.toLowerCase() !== exercise.name.trim().toLowerCase())
      : []
  const pick = (item) => {
    // Take the library's usual load and section, unless the coach has already set them
    const untouched = exercise.load.kind === 'kg' && !exercise.load.value
    set('name')({
      name: item.name,
      ...(untouched ? { load: blankExercise(item).load } : {}),
      ...(exercise.section === 'Main' && item.section !== 'Main' ? { section: item.section } : {}),
    })
    setSuggest(-1)
  }

  const effortOn = EFFORTS.find((e) => e.id === exercise.effort)
  return (
    <article
      ref={ref}
      data-card={exercise.id}
      draggable={armed && !preview}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = 'move'
        event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ kind: 'move', dayId, exId: exercise.id }))
        onDragStart(exercise.id)
      }}
      onDragEnd={() => {
        setArmed(false)
        onDragEnd()
      }}
      onKeyDown={(event) => onKey(event, dayId, exercise.id, index)}
      className={`bd-card relative rounded-xl border bg-ink p-2.5 ${flash ? 'bd-flash' : ''} ${
        preview ? 'bd-preview' : ''
      } ${invalid ? 'border-red-500/70' : 'border-line'}`}
      style={{ '--section': SECTION_TONE[exercise.section || 'Main'] }}
    >
      <fieldset disabled={preview} className="contents">
        <div className="flex items-center gap-1.5">
          <span
            className="bd-handle cursor-grab select-none px-0.5 text-muted"
            onMouseDown={() => setArmed(true)}
            onMouseUp={() => setArmed(false)}
            title="Drag to move"
            aria-hidden="true"
          >
            ⠿
          </span>
          <div className="relative min-w-0 flex-1">
            <input
              value={exercise.name}
              onChange={(event) => {
                set('name')({ name: event.target.value })
                setSuggest(-1)
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setTimeout(() => setFocused(false), 120)}
              onKeyDown={(event) => {
                if (!suggestions.length) return
                if (event.key === 'ArrowDown') {
                  event.preventDefault()
                  setSuggest((i) => Math.min(suggestions.length - 1, i + 1))
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault()
                  setSuggest((i) => Math.max(-1, i - 1))
                } else if (event.key === 'Enter' && suggest >= 0) {
                  event.preventDefault()
                  pick(suggestions[suggest])
                } else if (event.key === 'Escape') {
                  setFocused(false)
                }
              }}
              placeholder="Exercise name"
              aria-label="Exercise name"
              className="bd-name w-full truncate rounded-md bg-transparent px-1.5 py-1 text-sm font-semibold text-white placeholder:text-neutral-600 focus:bg-panel focus:outline-none"
            />
            {suggestions.length > 0 && (
              <ul
                className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-line bg-panel shadow-xl"
                role="listbox"
              >
                {suggestions.map((item, i) => (
                  <li key={item.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === suggest}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        pick(item)
                      }}
                      className={`block w-full px-2.5 py-1.5 text-left text-sm ${i === suggest ? 'bg-ink text-white' : 'text-neutral-300 hover:bg-ink'}`}
                    >
                      {item.name}
                      <span className="ml-1.5 text-xs text-muted">{item.group}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={() => onRemove(dayId, exercise.id)}
            className="rounded-md px-1.5 text-lg leading-none text-muted hover:text-red-400"
            aria-label={`Remove ${exercise.name || 'exercise'}`}
            title="Remove"
          >
            ×
          </button>
        </div>

        <div className="mt-1.5 flex items-center gap-1 text-sm">
          <input
            value={shown.sets}
            onChange={(event) => set('sets')({ sets: event.target.value.replace(/\D/g, '').slice(0, 2) })}
            inputMode="numeric"
            aria-label="Sets"
            className="bd-cell w-9 text-center"
          />
          <span className="text-muted">×</span>
          <input
            value={shown.reps}
            onChange={(event) => set('reps')({ reps: event.target.value.slice(0, 12) })}
            aria-label="Reps"
            className="bd-cell w-14 text-center"
          />
          <span className="text-muted">@</span>
          {exercise.load.kind !== 'bodyweight' && (
            <input
              value={shown.load.value ?? ''}
              onChange={(event) => set('load')({ load: { ...exercise.load, value: event.target.value.slice(0, 16) } })}
              inputMode={exercise.load.kind === 'kg' ? 'decimal' : 'text'}
              placeholder={exercise.load.kind === 'kg' ? '–' : 'Medium'}
              aria-label={exercise.load.kind === 'kg' ? 'Weight in kg' : 'Band'}
              className="bd-cell w-14 text-center"
            />
          )}
          <select
            value={exercise.load.kind}
            onChange={(event) =>
              set('kind')({
                load:
                  event.target.value === 'band'
                    ? { kind: 'band', value: 'Medium' }
                    : { kind: event.target.value, value: '' },
              })
            }
            aria-label="Load type"
            className="bd-cell bd-select min-w-0 flex-1"
          >
            <option value="kg">kg</option>
            <option value="band">band</option>
            <option value="bodyweight">bodyweight</option>
          </select>
        </div>

        <div className="mt-1.5 flex items-center gap-1">
          <select
            value={exercise.section || 'Main'}
            onChange={(event) => set('section')({ section: event.target.value })}
            aria-label="Section"
            className="bd-cell bd-select w-20 text-xs"
          >
            {SECTION_ORDER.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            value={exercise.rest ?? ''}
            onChange={(event) => set('rest')({ rest: event.target.value.replace(/\D/g, '').slice(0, 3) })}
            inputMode="numeric"
            placeholder={`${REST_DEFAULTS[exercise.section || 'Main'] ?? 60}s`}
            aria-label="Rest in seconds"
            title="Rest (seconds)"
            className="bd-cell w-12 text-center text-xs"
          />
          <div className="ml-auto flex gap-0.5" role="group" aria-label="How hard">
            {EFFORTS.map((effort) => {
              const on = exercise.effort === effort.id
              return (
                <button
                  key={effort.id}
                  type="button"
                  onClick={() => set('effort')({ effort: on ? undefined : effort.id })}
                  aria-pressed={on}
                  title={`${effort.label} · RPE ${effort.rpe}`}
                  className={`h-6 w-5 rounded-md text-[10px] font-bold ${on ? 'text-ink' : 'border border-line text-muted hover:text-white'}`}
                  style={on ? { background: effort.colour } : undefined}
                >
                  {effort.label[0]}
                </button>
              )
            })}
          </div>
        </div>

        {block?.weeks > 0 && (
          <div className="mt-1.5 flex items-center gap-1 text-xs">
            <select
              value={exercise.progress?.kind ?? ''}
              onChange={(event) => {
                const kind = PROGRESS_KINDS.find((k) => k.id === event.target.value)
                set('progress')({ progress: kind ? { kind: kind.id, step: kind.step } : undefined })
              }}
              aria-label="Weekly progression"
              className="bd-cell bd-select w-[5.25rem]"
            >
              <option value="">Same weekly</option>
              {PROGRESS_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            {exercise.progress?.kind && (
              <input
                value={exercise.progress.step}
                onChange={(event) =>
                  set('step')({
                    progress: { ...exercise.progress, step: event.target.value.replace(/[^\d.,]/g, '').slice(0, 5) },
                  })
                }
                inputMode="decimal"
                aria-label="Added each week"
                title="Added each week"
                className="bd-cell w-11 text-center"
              />
            )}
            <span className="ml-auto truncate text-muted" title={`Week ${topWeek}`}>
              {exercise.progress?.step
                ? `W${topWeek} ${endValue(exerciseForWeek(exercise, topWeek, block), exercise.progress.kind)}`
                : ''}
            </span>
          </div>
        )}

        {more && (
          <div className="mt-1.5 space-y-1">
            <input
              value={exercise.tempo ?? ''}
              onChange={(event) => set('tempo')({ tempo: event.target.value.slice(0, 40) })}
              placeholder="Tempo, e.g. 3 s down"
              aria-label="Tempo"
              className="bd-cell w-full text-xs"
            />
            <input
              value={exercise.note ?? ''}
              onChange={(event) => set('note')({ note: event.target.value })}
              placeholder="Coaching note"
              aria-label="Coaching note"
              className="bd-cell w-full text-xs"
            />
          </div>
        )}

        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px]">
          <span className="truncate text-muted" title={previous ? 'Best set last session' : undefined}>
            {previous ? `Last: ${previous}` : effortOn ? `${effortOn.label} · RPE ${effortOn.rpe}` : ' '}
          </span>
          <button
            type="button"
            onClick={() => setMore((v) => !v)}
            className="shrink-0 font-semibold text-muted hover:text-white"
          >
            {more ? 'Less' : exercise.note || exercise.tempo ? 'Note •' : 'More'}
          </button>
        </div>
      </fieldset>
    </article>
  )
})

/* ---------- One day ---------- */

function DayColumn({
  day,
  index,
  count,
  active,
  dropIndex,
  previous,
  flashId,
  showInvalid,
  week,
  block,
  onActivate,
  onDay,
  onMoveDay,
  onDuplicate,
  onRemoveDay,
  onAddBlank,
  cardHandlers,
  onDragOverDay,
  onDropDay,
}) {
  const bodyRef = useRef(null)
  const shownDay = dayForWeek(day, week, block)

  // Where in the list the pointer is, so the drop line shows between the right cards
  const indexAt = (clientY) => {
    const cards = [...(bodyRef.current?.querySelectorAll('[data-card]') ?? [])]
    const at = cards.findIndex((card) => {
      const box = card.getBoundingClientRect()
      return clientY < box.top + box.height / 2
    })
    return at === -1 ? cards.length : at
  }

  return (
    <section
      onMouseDown={() => onActivate(day.id)}
      onFocusCapture={() => onActivate(day.id)}
      className={`bd-col flex h-full w-[17rem] shrink-0 flex-col rounded-2xl border bg-panel ${
        active ? 'bd-col-active border-neutral-500' : 'border-line'
      }`}
      aria-label={day.name || `Day ${index + 1}`}
    >
      <header className="border-b border-line p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Day {index + 1}</span>
          <div className="bd-day-tools flex items-center gap-0.5 text-xs text-muted">
            <button
              type="button"
              onClick={() => onMoveDay(day.id, -1)}
              disabled={index === 0}
              title="Move left"
              aria-label="Move day left"
              className="rounded px-1.5 py-0.5 hover:text-white disabled:opacity-30"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => onMoveDay(day.id, 1)}
              disabled={index === count - 1}
              title="Move right"
              aria-label="Move day right"
              className="rounded px-1.5 py-0.5 hover:text-white disabled:opacity-30"
            >
              →
            </button>
            <button
              type="button"
              onClick={() => onDuplicate(day.id)}
              title="Duplicate day"
              className="rounded px-1.5 py-0.5 hover:text-white"
            >
              Copy
            </button>
            <button
              type="button"
              onClick={() => onRemoveDay(day.id)}
              title="Remove day"
              className="rounded px-1.5 py-0.5 hover:text-red-400"
            >
              Remove
            </button>
          </div>
        </div>
        <input
          value={day.name}
          onChange={(event) => onDay(day.id, { name: event.target.value.slice(0, 40) }, 'name')}
          aria-label="Day name"
          className={`mt-1 w-full rounded-md bg-transparent px-1 font-display text-2xl font-bold uppercase leading-tight text-white focus:bg-ink focus:outline-none ${
            showInvalid && !day.name.trim() ? 'ring-1 ring-red-500' : ''
          }`}
        />
        <input
          value={day.focus ?? ''}
          onChange={(event) => onDay(day.id, { focus: event.target.value.slice(0, 80) }, 'focus')}
          placeholder="Focus, e.g. Lower + knee rehab"
          aria-label="Focus"
          className="w-full rounded-md bg-transparent px-1 text-sm text-neutral-300 placeholder:text-neutral-600 focus:bg-ink focus:outline-none"
        />
        <p className="mt-1.5 flex items-center gap-2 px-1 text-xs text-muted">
          <span className="min-w-0 flex-1 truncate">
            {day.exercises.length} {day.exercises.length === 1 ? 'exercise' : 'exercises'} · {totalSets(shownDay)} sets
            · ~{estimateMinutes(shownDay)} min
          </span>
          {active && (
            <span className="flex shrink-0 items-center gap-1 font-semibold text-white" title="Library clicks add here">
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
              Adding here
            </span>
          )}
        </p>
      </header>
      <div
        ref={bodyRef}
        className="bd-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5"
        onDragOver={(event) => {
          if (!event.dataTransfer.types.includes(DRAG_TYPE)) return
          event.preventDefault()
          onDragOverDay(day.id, indexAt(event.clientY))
        }}
        onDrop={(event) => {
          const raw = event.dataTransfer.getData(DRAG_TYPE)
          if (!raw) return
          event.preventDefault()
          onDropDay(day.id, indexAt(event.clientY), JSON.parse(raw))
        }}
      >
        {day.exercises.map((exercise, i) => (
          <div key={exercise.id}>
            {dropIndex === i && <div className="bd-drop" aria-hidden="true" />}
            <ExerciseCard
              exercise={exercise}
              dayId={day.id}
              index={i}
              previous={previous[exercise.name.trim()] ?? null}
              flash={flashId === exercise.id}
              invalid={showInvalid && !exercise.name.trim()}
              week={week}
              block={block}
              {...cardHandlers}
            />
          </div>
        ))}
        {dropIndex === day.exercises.length && <div className="bd-drop" aria-hidden="true" />}
        {day.exercises.length === 0 && dropIndex == null && (
          <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-sm text-muted">
            Drag exercises here, or click one in the library.
          </p>
        )}
        <button
          type="button"
          onClick={() => onAddBlank(day.id)}
          className="w-full rounded-xl border border-dashed border-line py-2 text-sm font-semibold text-muted hover:border-neutral-500 hover:text-white"
        >
          + Blank exercise
        </button>
      </div>
    </section>
  )
}

/* ---------- The block: how many weeks, when it starts, and a preview of any week ---------- */

function BlockBar({ block, allowStart, viewWeek, onWeek, onChange, onRemove }) {
  const status = allowStart ? blockStatus(block) : null
  const weeks = Array.from({ length: block.weeks }, (_, i) => i + 1)
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-6 py-2.5 text-sm">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Block</span>
        <div className="flex items-center gap-1" role="group" aria-label="Weeks in the block">
          <button
            type="button"
            onClick={() => onChange({ weeks: Math.max(MIN_WEEKS, block.weeks - 1) })}
            disabled={block.weeks <= MIN_WEEKS}
            aria-label="One week fewer"
            className="h-7 w-7 rounded-md border border-line text-neutral-300 hover:text-white disabled:opacity-30"
          >
            −
          </button>
          <span className="w-16 text-center font-semibold text-white">{block.weeks} weeks</span>
          <button
            type="button"
            onClick={() => onChange({ weeks: Math.min(MAX_WEEKS, block.weeks + 1) })}
            disabled={block.weeks >= MAX_WEEKS}
            aria-label="One week more"
            className="h-7 w-7 rounded-md border border-line text-neutral-300 hover:text-white disabled:opacity-30"
          >
            +
          </button>
        </div>
        {allowStart && (
          <label className="flex items-center gap-2 text-muted">
            Starts
            <input
              type="date"
              value={block.start ?? ''}
              onChange={(event) => event.target.value && onChange({ start: event.target.value })}
              className="bd-cell py-1 text-sm"
            />
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-neutral-300">
          <input
            type="checkbox"
            checked={Boolean(block.deload)}
            onChange={(event) => onChange({ deload: event.target.checked })}
            className="accent-white"
          />
          Lighter final week
        </label>
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Preview a week">
          {weeks.map((w) => {
            const on = w === viewWeek
            const now = status && !status.notStarted && !status.finished && status.week === w
            return (
              <button
                key={w}
                type="button"
                onClick={() => onWeek(w)}
                aria-pressed={on}
                title={isDeload(block, w) ? 'Lighter week: week 1 numbers, half the sets' : `Week ${w}`}
                className={`relative rounded-md border px-2 py-0.5 text-xs font-semibold transition-colors ${
                  on ? 'border-white bg-white text-ink' : 'border-line text-muted hover:text-white'
                }`}
              >
                W{w}
                {isDeload(block, w) ? ' ·L' : ''}
                {now && (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--lvl-active,#22c55e)]"
                    aria-label="This week"
                  />
                )}
              </button>
            )
          })}
        </div>
        {status && <span className="text-xs text-muted">{status.label}</span>}
        <button
          type="button"
          onClick={onRemove}
          className="ml-auto text-xs font-semibold text-muted hover:text-red-400"
        >
          Remove block
        </button>
      </div>
      {viewWeek > 1 && (
        <div className="flex items-center gap-3 border-b border-line bg-panel px-6 py-2 text-sm text-neutral-300">
          <span>
            Previewing <span className="font-semibold text-white">week {viewWeek}</span>
            {isDeload(block, viewWeek) ? ' (lighter week: week 1 numbers, half the sets)' : ''}. Numbers come from week
            1 plus each exercise's weekly rule.
          </span>
          <button
            type="button"
            onClick={() => onWeek(1)}
            className="ml-auto shrink-0 font-semibold text-white underline underline-offset-4"
          >
            Edit week 1
          </button>
        </div>
      )}
    </>
  )
}

/* ---------- The builder ---------- */

export default function ProgrammeBuilder({
  title,
  subtitle,
  colour,
  days: initialDays,
  block: initialBlock = null,
  allowStart = true,
  userId = null,
  isCoach = false,
  askReason = false,
  draftKey,
  onSave,
  onClose,
}) {
  const base = useRef(initialDays)
  const baseJson = useRef(JSON.stringify(initialDays))
  const { days, past, future, commit, undo, redo, reset } = useHistory(initialDays)
  const [activeDay, setActiveDay] = useState(initialDays[0]?.id ?? null)
  const [flashId, setFlashId] = useState(null)
  const [drop, setDrop] = useState(null)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [showInvalid, setShowInvalid] = useState(false)
  const [previous, setPrevious] = useState({})
  const [block, setBlock] = useState(initialBlock?.weeks ? initialBlock : null)
  const baseBlock = useRef(JSON.stringify(initialBlock?.weeks ? initialBlock : null))
  const [viewWeek, setViewWeek] = useState(1)
  const [draft, setDraft] = useState(() => {
    const found = readDraft(draftKey)
    if (!found) return null
    if (
      found.base !== baseJson.current ||
      (JSON.stringify(found.days) === baseJson.current && JSON.stringify(found.block ?? null) === baseBlock.current)
    ) {
      writeDraft(draftKey, null)
      return null
    }
    return found
  })
  const searchRef = useRef(null)
  const boardRef = useRef(null)

  const blockChanged = JSON.stringify(block) !== baseBlock.current
  const daysChanged = useMemo(() => JSON.stringify(days) !== baseJson.current, [days])
  const dirty = daysChanged || blockChanged
  const issues = useMemo(() => (showInvalid ? problems(days) : []), [days, showInvalid])

  // Keep the page behind still while the builder is open
  useEffect(() => {
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = before
    }
  }, [])

  // A draft on this computer, so a closed tab or a dropped connection doesn't lose work
  useEffect(() => {
    if (draft) return
    const timer = setTimeout(
      () => writeDraft(draftKey, dirty ? { days, block, base: baseJson.current, at: Date.now() } : null),
      500,
    )
    return () => clearTimeout(timer)
  }, [days, block, dirty, draftKey, draft])

  useEffect(() => {
    if (!dirty) return
    const warn = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Last session's best set for each exercise, so loads can be planned from real numbers
  const names = useMemo(
    () => [...new Set(days.flatMap((d) => d.exercises.map((e) => e.name.trim()).filter(Boolean)))].sort().join('|'),
    [days],
  )
  useEffect(() => {
    if (!userId || !names) return
    const timer = setTimeout(() => {
      fetchPreviousSets(names.split('|'), userId)
        .then((found) => {
          const lines = {}
          for (const [name, value] of Object.entries(found)) lines[name] = lastLine(value)
          setPrevious((current) => ({ ...current, ...lines }))
        })
        .catch(() => {})
    }, 600)
    return () => clearTimeout(timer)
  }, [names, userId])

  /* ----- Changes ----- */

  const flash = (id) => {
    setFlashId(id)
    setTimeout(() => setFlashId((current) => (current === id ? null : current)), 1200)
  }

  const changeDay = useCallback(
    (dayId, changes, field) =>
      commit((list) => list.map((d) => (d.id === dayId ? { ...d, ...changes } : d)), `${dayId}:${field}`),
    [commit],
  )

  const changeExercise = useCallback(
    (dayId, exId, changes, field) =>
      commit(
        (list) =>
          list.map((d) =>
            d.id === dayId
              ? { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...changes } : e)) }
              : d,
          ),
        `${exId}:${field}`,
      ),
    [commit],
  )

  const removeExercise = useCallback(
    (dayId, exId) =>
      commit((list) =>
        list.map((d) => (d.id === dayId ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d)),
      ),
    [commit],
  )

  const addFromLibrary = useCallback(
    (item, dayId = activeDay, index = null) => {
      const target = dayId ?? days[0]?.id
      if (!target) return
      const exercise = blankExercise(item)
      commit((list) => insertExercise(list, target, exercise, index))
      flash(exercise.id)
    },
    [activeDay, days, commit],
  )

  const addBlank = useCallback(
    (dayId) => {
      const exercise = blankExercise()
      commit((list) => insertExercise(list, dayId, exercise))
      flash(exercise.id)
    },
    [commit],
  )

  const addDay = () => {
    const day = blankDay(days.length)
    commit((list) => [...list, day])
    setActiveDay(day.id)
    setTimeout(() => boardRef.current?.scrollTo({ left: boardRef.current.scrollWidth, behavior: 'smooth' }), 50)
  }

  const moveDay = useCallback(
    (dayId, step) =>
      commit((list) => {
        const from = list.findIndex((d) => d.id === dayId)
        const to = from + step
        if (from < 0 || to < 0 || to >= list.length) return list
        const next = [...list]
        ;[next[from], next[to]] = [next[to], next[from]]
        return next
      }),
    [commit],
  )

  const duplicateDay = useCallback(
    (dayId) =>
      commit((list) => {
        const at = list.findIndex((d) => d.id === dayId)
        const next = [...list]
        next.splice(at + 1, 0, copyDay(list[at]))
        return next
      }),
    [commit],
  )

  const removeDay = useCallback(
    (dayId) => {
      const day = days.find((d) => d.id === dayId)
      commit((list) => list.filter((d) => d.id !== dayId))
      if (activeDay === dayId) setActiveDay(days.find((d) => d.id !== dayId)?.id ?? null)
      toast(`${day?.name || 'Day'} removed`, { undo })
    },
    [days, activeDay, commit, undo],
  )

  // Keys on a card: Alt+arrows move it, Ctrl/⌘+D duplicates it
  const cardKey = useCallback(
    (event, dayId, exId, index) => {
      const mod = event.metaKey || event.ctrlKey
      if (event.altKey && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault()
        const to = index + (event.key === 'ArrowUp' ? -1 : 2)
        if (to < 0) return
        commit((list) => moveExercise(list, { fromDay: dayId, exId, toDay: dayId, index: to }))
        setTimeout(() => document.querySelector(`[data-card="${exId}"] input`)?.focus(), 0)
      } else if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault()
        const at = days.findIndex((d) => d.id === dayId)
        const target = days[at + (event.key === 'ArrowLeft' ? -1 : 1)]
        if (!target) return
        commit((list) =>
          moveExercise(list, {
            fromDay: dayId,
            exId,
            toDay: target.id,
            index: Math.min(index, target.exercises.length),
          }),
        )
        setActiveDay(target.id)
        setTimeout(() => document.querySelector(`[data-card="${exId}"] input`)?.focus(), 0)
      } else if (mod && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        const source = days.find((d) => d.id === dayId)?.exercises.find((e) => e.id === exId)
        if (!source) return
        const copy = { ...source, id: newId(), load: { ...source.load } }
        commit((list) => insertExercise(list, dayId, copy, index + 1))
        flash(copy.id)
      }
    },
    [days, commit],
  )

  /* ----- Drag and drop ----- */

  const [dragging, setDragging] = useState(null)
  const onDragOverDay = useCallback((dayId, index) => {
    setDrop((current) => (current?.dayId === dayId && current.index === index ? current : { dayId, index }))
  }, [])
  const onDropDay = useCallback(
    (dayId, index, data) => {
      setDrop(null)
      setDragging(null)
      if (data.kind === 'library') addFromLibrary(data.item, dayId, index)
      if (data.kind === 'move') {
        commit((list) => moveExercise(list, { fromDay: data.dayId, exId: data.exId, toDay: dayId, index }))
        setActiveDay(dayId)
      }
    },
    [addFromLibrary, commit],
  )
  useEffect(() => {
    const clear = () => setDrop(null)
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => {
      window.removeEventListener('dragend', clear)
      window.removeEventListener('drop', clear)
    }
  }, [])

  const cardHandlers = useMemo(
    () => ({
      onChange: changeExercise,
      onRemove: removeExercise,
      onKey: cardKey,
      onDragStart: setDragging,
      onDragEnd: () => {
        setDragging(null)
        setDrop(null)
      },
    }),
    [changeExercise, removeExercise, cardKey],
  )

  /* ----- Save and leave ----- */

  async function save() {
    if (saving) return
    if (problems(days).length) {
      setShowInvalid(true)
      return
    }
    if (!dirty) return toast('Nothing to save yet')
    setSaving(true)
    try {
      const cleaned = cleanDays(days)
      const parts = [describeChanges(base.current, cleaned)]
      if (blockChanged) parts.push(block ? `Set a ${blockText(block)}` : 'Removed the block')
      const summary = parts.filter(Boolean).join(' · ') || null
      await onSave(cleaned, summary, reason.trim() || undefined, block)
      base.current = cleaned
      baseJson.current = JSON.stringify(cleaned)
      baseBlock.current = JSON.stringify(block)
      reset(cleaned)
      setReason('')
      setShowInvalid(false)
      writeDraft(draftKey, null)
      toast('Programme saved')
    } catch {
      toast("Couldn't save. Your changes are still here, so try again.", { tone: 'error' })
    }
    setSaving(false)
  }

  function close() {
    if (dirty) toast('Unsaved changes kept as a draft on this computer')
    onClose()
  }

  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    const onKey = (event) => {
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (mod && key === 's') {
        event.preventDefault()
        saveRef.current()
      } else if (mod && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if (mod && ((key === 'z' && event.shiftKey) || key === 'y')) {
        event.preventDefault()
        redo()
      } else if (event.key === '/' && !typing()) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  const activeName = days.find((d) => d.id === activeDay)?.name

  return (
    <div
      className="bd-root fixed inset-0 z-[52] flex flex-col bg-ink text-white"
      role="dialog"
      aria-label="Programme builder"
    >
      <header className="flex items-center gap-4 border-b border-line px-6 py-3">
        <button type="button" onClick={close} className="text-sm font-semibold text-muted hover:text-white">
          ‹ Done
        </button>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
            {colour && <span className="h-2 w-2 rounded-full" style={{ background: colour }} aria-hidden="true" />}
            Programme builder{subtitle ? ` · ${subtitle}` : ''}
          </p>
          <h1 className="truncate font-display text-2xl font-bold uppercase leading-tight">{title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className={`mr-2 text-xs font-semibold ${dirty ? 'text-white' : 'text-muted'}`} aria-live="polite">
            {saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'All saved'}
          </span>
          {!block && (
            <button
              type="button"
              onClick={() => setBlock({ weeks: 6, deload: true, ...(allowStart ? { start: nextMonday() } : {}) })}
              title="Run this programme for a set number of weeks, with numbers that climb each week"
              className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-neutral-300 hover:text-white"
            >
              + Block
            </button>
          )}
          <button
            type="button"
            onClick={addDay}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-neutral-300 hover:text-white"
          >
            + Day
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={!past.length}
            title={`Undo (${MOD}+Z)`}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-neutral-300 hover:text-white disabled:opacity-30"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!future.length}
            title={`Redo (${MOD}+Shift+Z)`}
            className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-neutral-300 hover:text-white disabled:opacity-30"
          >
            ↷ Redo
          </button>
          {askReason && dirty && (
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value.slice(0, 200))}
              placeholder="Why the change? (optional)"
              aria-label="Why the change"
              className={`${inputBase} w-64 py-1.5 text-sm`}
            />
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            title={`Save (${MOD}+S)`}
            className={`${buttonPrimary} py-2`}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      {userId && <BuilderContext userId={userId} isCoach={isCoach} />}

      {block && (
        <BlockBar
          block={block}
          allowStart={allowStart}
          viewWeek={viewWeek}
          onWeek={setViewWeek}
          onChange={(changes) => {
            const next = { ...block, ...changes }
            setBlock(next)
            if (viewWeek > next.weeks) setViewWeek(next.weeks)
          }}
          onRemove={() => {
            setBlock(null)
            setViewWeek(1)
          }}
        />
      )}

      {draft && (
        <div className="flex items-center gap-3 border-b border-line bg-panel px-6 py-2 text-sm">
          <span className="text-neutral-200">
            You have unsaved changes from{' '}
            {new Date(draft.at).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' })}.
          </span>
          <button
            type="button"
            onClick={() => {
              commit(() => draft.days)
              if (draft.block !== undefined) setBlock(draft.block)
              setDraft(null)
            }}
            className="font-semibold text-white underline underline-offset-4"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={() => {
              writeDraft(draftKey, null)
              setDraft(null)
            }}
            className="font-semibold text-muted hover:text-white"
          >
            Discard
          </button>
        </div>
      )}

      {issues.length > 0 && (
        <div role="alert" className="border-b border-red-500/40 bg-red-950/40 px-6 py-2 text-sm text-red-300">
          Can't save yet: {issues.join(' ')}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div
          ref={boardRef}
          className={`bd-board bd-scroll flex min-w-0 flex-1 gap-3 overflow-x-auto p-5 ${dragging ? 'bd-dragging' : ''}`}
        >
          {days.map((day, i) => (
            <DayColumn
              key={day.id}
              day={day}
              index={i}
              count={days.length}
              active={day.id === activeDay}
              dropIndex={drop?.dayId === day.id ? drop.index : null}
              previous={previous}
              flashId={flashId}
              showInvalid={showInvalid}
              week={block ? viewWeek : 1}
              block={block}
              onActivate={setActiveDay}
              onDay={changeDay}
              onMoveDay={moveDay}
              onDuplicate={duplicateDay}
              onRemoveDay={removeDay}
              onAddBlank={addBlank}
              cardHandlers={cardHandlers}
              onDragOverDay={onDragOverDay}
              onDropDay={onDropDay}
            />
          ))}
          <button
            type="button"
            onClick={addDay}
            className="flex h-full w-40 shrink-0 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line text-muted hover:border-neutral-500 hover:text-white"
          >
            <span className="text-3xl leading-none">+</span>
            <span className="text-sm font-semibold">Add a day</span>
          </button>
        </div>
        <BuilderLibrary activeDayName={activeName} onAdd={(item) => addFromLibrary(item)} searchRef={searchRef} />
      </div>

      <footer className="flex flex-wrap gap-x-5 gap-y-1 border-t border-line px-6 py-2 text-[11px] text-muted">
        <span>
          <kbd>{MOD}+S</kbd> save
        </span>
        <span>
          <kbd>{MOD}+Z</kbd> undo
        </span>
        <span>
          <kbd>/</kbd> search library
        </span>
        <span>
          <kbd>Alt+↑↓</kbd> move exercise
        </span>
        <span>
          <kbd>Alt+←→</kbd> move to another day
        </span>
        <span>
          <kbd>{MOD}+D</kbd> duplicate exercise
        </span>
        <span>Drag ⠿ to reorder</span>
      </footer>
    </div>
  )
}
