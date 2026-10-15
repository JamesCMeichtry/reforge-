import { useEffect, useState } from 'react'
import { INJURIES, INJURY_GROUPS } from '../data/injuries.js'
import { LEVELS, XP_LEVELS } from '../lib/livingMap.js'
import {
  EXPERIENCE,
  GOALS,
  INJURY_CLEARED,
  INJURY_STAGES,
  INJURY_WHEN,
  LIFTS,
  PROFESSIONS,
  STYLES,
  movesFor,
  saveProfile,
  startingXp,
} from '../lib/profile.js'
import { supabase } from '../lib/supabase.js'
import { buttonPrimary } from '../components/ui.jsx'

const sideName = (side) => (side === 'right' ? 'Right' : 'Left')
const injuryById = (id) => INJURIES.find((injury) => injury.id === id)
const levelForXp = (xp) => [...XP_LEVELS].reverse().find((step) => xp >= step.xp)?.level ?? 'neutral'

const inputClass =
  'mt-2 w-full rounded-xl border border-line bg-panel px-4 py-3 text-base text-white placeholder:text-neutral-600 focus:border-gold focus:outline-none'

// Groups shown on the summary, with the muscles that make each one up
const SUMMARY_GROUPS = [
  ['Chest', ['upper-chest', 'mid-chest', 'lower-chest']],
  ['Shoulders', ['front-delt', 'side-delt', 'rear-delt']],
  ['Arms', ['biceps-long', 'biceps-short', 'triceps-long', 'triceps-lateral', 'triceps-medial']],
  ['Back', ['lats', 'mid-traps', 'upper-trap', 'lower-back']],
  ['Legs', ['quad-front', 'quad-outer', 'quad-inner', 'hamstring-outer', 'hamstring-inner', 'glute-max']],
]

const LEVEL_COLOURS = {
  neutral: 'var(--color-muted)',
  active: 'var(--lvl-active)',
  building: 'var(--lvl-building)',
  silver: 'var(--lvl-silver-text)',
  elite: 'var(--color-gold)',
  diamond: 'var(--lvl-diamond-text)',
}

function Choice({ selected, onClick, label, note }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full rounded-2xl border px-4 py-3.5 text-left transition-colors ${
        selected ? 'border-gold bg-gold/10' : 'border-line bg-panel hover:border-neutral-600'
      }`}
    >
      <span className={`block font-semibold ${selected ? 'text-gold' : 'text-white'}`}>{label}</span>
      {note && <span className="mt-0.5 block text-sm text-muted">{note}</span>}
    </button>
  )
}

function Question({ title, hint, children }) {
  return (
    <div>
      <h1 className="font-display text-4xl font-bold uppercase leading-none tracking-tight">{title}</h1>
      {hint && <p className="mt-3 text-muted">{hint}</p>}
      <div className="mt-6">{children}</div>
    </div>
  )
}

function InjuryPicker({ injuries, setInjuries }) {
  const [injuryId, setInjuryId] = useState('')
  const [side, setSide] = useState('right')
  const injury = injuryById(injuryId)
  const isDuplicate = injuries.some((row) => row.injury_key === injuryId && (injury?.central || row.side === side))

  const add = () => {
    if (!injury || isDuplicate) return
    setInjuries([...injuries, { injury_key: injuryId, side: injury.central ? null : side, details: { worse: [] } }])
    setInjuryId('')
  }

  return (
    <div className="space-y-4">
      {injuries.length > 0 && (
        <ul className="space-y-2">
          {injuries.map((row, i) => (
            <li
              key={i}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3"
            >
              <div>
                <p className="font-semibold text-white">{injuryById(row.injury_key).name}</p>
                {row.side && <p className="text-sm text-muted">{sideName(row.side)} side</p>}
              </div>
              <button
                type="button"
                onClick={() => setInjuries(injuries.filter((_, j) => j !== i))}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-red-400"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-2xl border border-line bg-panel p-4">
        <select
          value={injuryId}
          onChange={(event) => setInjuryId(event.target.value)}
          aria-label="Injury"
          className="w-full appearance-none rounded-xl border border-line bg-ink px-4 py-3 text-base text-white focus:border-gold focus:outline-none"
        >
          <option value="">Choose an injury…</option>
          {INJURY_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {INJURIES.filter((item) => item.group === group).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {injury && !injury.central && (
          <div className="mt-3 flex gap-2" role="group" aria-label="Side">
            {['right', 'left'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSide(option)}
                aria-pressed={side === option}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold ${
                  side === option ? 'border-gold bg-gold text-ink' : 'border-line text-white'
                }`}
              >
                {sideName(option)}
              </button>
            ))}
          </div>
        )}
        {isDuplicate && <p className="mt-3 text-sm text-muted">That one is already added.</p>}
        <button
          type="button"
          onClick={add}
          disabled={!injury || isDuplicate}
          className="mt-3 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Add injury
        </button>
      </div>
    </div>
  )
}

function Chip({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-3.5 py-2 text-sm font-semibold ${
        selected ? 'border-gold bg-gold/10 text-gold' : 'border-line bg-panel text-white'
      }`}
    >
      {children}
    </button>
  )
}

function Field({ label, children }) {
  return (
    <div className="mt-6 first:mt-0">
      <p className="text-sm font-medium text-neutral-300">{label}</p>
      <div className="mt-2">{children}</div>
    </div>
  )
}

// The detail questions for one injury: these shape what training avoids and how hard it pushes
function InjuryDetail({ row, onChange }) {
  const injury = injuryById(row.injury_key)
  const details = row.details
  const set = (values) => onChange({ ...row, details: { ...details, ...values } })
  const toggleMove = (move) =>
    set({ worse: details.worse.includes(move) ? details.worse.filter((m) => m !== move) : [...details.worse, move] })
  return (
    <>
      <p className="-mt-2 mb-6 font-semibold text-gold">
        {row.side ? `${sideName(row.side)}: ` : ''}
        {injury.name}
      </p>
      <Field label="When did it happen?">
        <div className="flex flex-wrap gap-2">
          {INJURY_WHEN.map((option) => (
            <Chip key={option.id} selected={details.when === option.id} onClick={() => set({ when: option.id })}>
              {option.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Did you have surgery on it?">
        <div className="flex gap-2">
          {[
            [true, 'Yes'],
            [false, 'No'],
          ].map(([value, label]) => (
            <Chip key={label} selected={details.surgery === value} onClick={() => set({ surgery: value })}>
              {label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Where are you with it?">
        <div className="space-y-2">
          {INJURY_STAGES.map((option) => (
            <Choice
              key={option.id}
              selected={details.stage === option.id}
              onClick={() => set({ stage: option.id })}
              label={option.label}
              note={option.note}
            />
          ))}
        </div>
      </Field>
      <Field label="Pain on a normal day (0 is none, 10 is the worst)">
        <div className="grid grid-cols-11 gap-1" role="group" aria-label="Pain">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              onClick={() => set({ pain: n })}
              aria-pressed={details.pain === n}
              className={`rounded-lg border py-2 text-sm font-semibold ${
                details.pain === n ? 'border-gold bg-gold text-ink' : 'border-line bg-panel text-white'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>
      <Field label="What makes it worse? Pick any that apply.">
        <div className="flex flex-wrap gap-2">
          {movesFor(injury.group).map((move) => (
            <Chip key={move} selected={details.worse.includes(move)} onClick={() => toggleMove(move)}>
              {move}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Has a physio or doctor cleared you to train?">
        <div className="flex flex-wrap gap-2">
          {INJURY_CLEARED.map((option) => (
            <Chip key={option.id} selected={details.cleared === option.id} onClick={() => set({ cleared: option.id })}>
              {option.label}
            </Chip>
          ))}
        </div>
      </Field>
      <Field label="Anything else? (optional)">
        <textarea
          value={details.notes ?? ''}
          onChange={(event) => set({ notes: event.target.value })}
          rows={3}
          className={inputClass}
          placeholder="e.g. Told to avoid running until March"
        />
      </Field>
    </>
  )
}

function Summary({ answers }) {
  const xp = startingXp({ ...answers, role: 'athlete' })
  return (
    <ul className="space-y-2">
      {SUMMARY_GROUPS.map(([name, ids]) => {
        const best = Math.max(...ids.map((id) => xp[id] ?? 0))
        const level = levelForXp(best)
        return (
          <li key={name} className="flex items-center justify-between rounded-xl border border-line bg-panel px-4 py-3">
            <span className="font-semibold text-white">{name}</span>
            <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: LEVEL_COLOURS[level] }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVEL_COLOURS[level] }} />
              {LEVELS[level].label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

const EMPTY = {
  role: null,
  display_name: '',
  body: null,
  style: null,
  experience: null,
  bodyweight_kg: '',
  lifts: {},
  goals: [],
  days_per_week: null,
  has_pro: null,
  profession: null,
  business_name: '',
}

export default function Onboarding({ userId, onDone }) {
  const [answers, setAnswers] = useState(EMPTY)
  const [injuries, setInjuries] = useState([])
  const [index, setIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [removed, setRemoved] = useState([])
  const set = (values) => setAnswers((current) => ({ ...current, ...values }))
  const isPro = answers.role === 'pro'

  // Injuries already on the account show up here, so they get their details instead of being added twice
  useEffect(() => {
    let cancelled = false
    supabase
      .from('injuries')
      .select('id, injury_key, side, details')
      .order('created_at')
      .then(({ data }) => {
        if (cancelled || !data?.length) return
        const known = data.filter((row) => injuryById(row.injury_key))
        setInjuries((current) => [
          ...known.map((row) => ({ ...row, details: { worse: [], ...(row.details ?? {}) } })),
          ...current,
        ])
      })
    return () => {
      cancelled = true
    }
  }, [])

  const updateInjuries = (next) => {
    const gone = injuries.filter((row) => row.id && !next.includes(row)).map((row) => row.id)
    if (gone.length) setRemoved((current) => [...current, ...gone])
    setInjuries(next)
  }

  const steps = [
    {
      id: 'role',
      ready: Boolean(answers.role),
      render: () => (
        <Question title="Welcome to Reforge" hint="First, which describes you?">
          <div className="space-y-3">
            <Choice
              selected={answers.role === 'athlete'}
              onClick={() => set({ role: 'athlete' })}
              label="I'm training"
              note="Track your sessions, injuries and progress"
            />
            <Choice
              selected={answers.role === 'pro'}
              onClick={() => set({ role: 'pro' })}
              label="I'm a physio, PT or coach"
              note="Look after clients and their programmes"
            />
          </div>
        </Question>
      ),
    },
    {
      id: 'name',
      ready: answers.display_name.trim().length > 0,
      render: () => (
        <Question
          title="What's your name?"
          hint={isPro ? 'Your clients will see this.' : 'Just your first name is fine.'}
        >
          <label className="block text-sm font-medium text-neutral-300">
            Name
            <input
              value={answers.display_name}
              onChange={(event) => set({ display_name: event.target.value })}
              autoComplete="given-name"
              className={inputClass}
              placeholder="Name"
            />
          </label>
        </Question>
      ),
    },
    ...(isPro
      ? [
          {
            id: 'profession',
            ready: Boolean(answers.profession),
            render: () => (
              <Question title="What do you do?">
                <div className="space-y-3">
                  {PROFESSIONS.map((option) => (
                    <Choice
                      key={option.id}
                      selected={answers.profession === option.id}
                      onClick={() => set({ profession: option.id })}
                      label={option.label}
                    />
                  ))}
                </div>
              </Question>
            ),
          },
          {
            id: 'business',
            ready: true,
            optional: true,
            render: () => (
              <Question title="Clinic or business" hint="Optional. Shown to clients when they connect with you.">
                <label className="block text-sm font-medium text-neutral-300">
                  Name of clinic, gym or business
                  <input
                    value={answers.business_name}
                    onChange={(event) => set({ business_name: event.target.value })}
                    className={inputClass}
                    placeholder="e.g. Amersham Physio"
                  />
                </label>
              </Question>
            ),
          },
        ]
      : [
          {
            id: 'body',
            ready: Boolean(answers.body),
            render: () => (
              <Question title="Your body map" hint="Which body should your map show?">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['male', 'Male'],
                    ['female', 'Female'],
                  ].map(([id, label]) => (
                    <Choice key={id} selected={answers.body === id} onClick={() => set({ body: id })} label={label} />
                  ))}
                </div>
              </Question>
            ),
          },
          {
            id: 'style',
            ready: Boolean(answers.style),
            render: () => (
              <Question title="How do you train?" hint="Pick the one closest to you.">
                <div className="space-y-3">
                  {STYLES.map((option) => (
                    <Choice
                      key={option.id}
                      selected={answers.style === option.id}
                      onClick={() => set({ style: option.id })}
                      label={option.label}
                      note={option.note}
                    />
                  ))}
                </div>
              </Question>
            ),
          },
          {
            id: 'experience',
            ready: Boolean(answers.experience),
            render: () => (
              <Question title="How long have you trained?" hint="Count the time you've trained consistently.">
                <div className="space-y-3">
                  {EXPERIENCE.map((option) => (
                    <Choice
                      key={option.id}
                      selected={answers.experience === option.id}
                      onClick={() => set({ experience: option.id })}
                      label={option.label}
                      note={option.note}
                    />
                  ))}
                </div>
              </Question>
            ),
          },
          {
            id: 'lifts',
            ready: true,
            optional: true,
            render: () => (
              <Question
                title="Your best lifts"
                hint="Optional. Rough numbers are fine; they set how strong each muscle starts on your map."
              >
                <label className="block text-sm font-medium text-neutral-300">
                  Bodyweight (kg)
                  <input
                    value={answers.bodyweight_kg}
                    onChange={(event) => set({ bodyweight_kg: event.target.value.replace(/[^0-9.]/g, '') })}
                    inputMode="decimal"
                    className={inputClass}
                    placeholder="e.g. 80"
                  />
                </label>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {LIFTS.map((lift) => (
                    <label key={lift.id} className="block text-sm font-medium text-neutral-300">
                      {lift.label} (kg)
                      <input
                        value={answers.lifts[lift.id] ?? ''}
                        onChange={(event) =>
                          set({ lifts: { ...answers.lifts, [lift.id]: event.target.value.replace(/[^0-9.]/g, '') } })
                        }
                        inputMode="decimal"
                        className={inputClass}
                        placeholder="–"
                      />
                    </label>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted">Your heaviest single rep with good form, or your best guess.</p>
              </Question>
            ),
          },
          {
            id: 'injuries',
            ready: true,
            optional: true,
            render: () => (
              <Question
                title="Any injuries?"
                hint="Add anything you're working around. They show up on your map straight away."
              >
                <InjuryPicker injuries={injuries} setInjuries={updateInjuries} />
              </Question>
            ),
          },
          ...injuries.map((row, i) => ({
            id: `injury-${i}`,
            ready:
              Boolean(row.details.when) &&
              Boolean(row.details.stage) &&
              row.details.pain != null &&
              row.details.surgery != null &&
              Boolean(row.details.cleared),
            render: () => (
              <Question
                title={injuries.length > 1 ? `Injury ${i + 1} of ${injuries.length}` : 'About your injury'}
                hint="This decides what your training works around and how hard it pushes."
              >
                <InjuryDetail
                  row={row}
                  onChange={(next) => setInjuries(injuries.map((item, j) => (j === i ? next : item)))}
                />
              </Question>
            ),
          })),
          {
            id: 'goals',
            ready: answers.goals.length > 0 && Boolean(answers.days_per_week),
            render: () => (
              <Question title="Your goals" hint="Pick as many as you like.">
                <div className="grid grid-cols-2 gap-2">
                  {GOALS.map((goal) => {
                    const on = answers.goals.includes(goal.id)
                    return (
                      <Choice
                        key={goal.id}
                        selected={on}
                        onClick={() =>
                          set({ goals: on ? answers.goals.filter((g) => g !== goal.id) : [...answers.goals, goal.id] })
                        }
                        label={goal.label}
                      />
                    )
                  })}
                </div>
                <p className="mt-6 text-sm font-medium text-neutral-300">Days a week you can train</p>
                <div className="mt-2 grid grid-cols-6 gap-2" role="group" aria-label="Days a week">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set({ days_per_week: n })}
                      aria-pressed={answers.days_per_week === n}
                      className={`rounded-xl border py-3 font-semibold ${
                        answers.days_per_week === n ? 'border-gold bg-gold text-ink' : 'border-line bg-panel text-white'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </Question>
            ),
          },
          {
            id: 'pro',
            ready: answers.has_pro != null,
            render: () => (
              <Question title="Physio or PT?" hint="Do you work with a physio, PT or coach?">
                <div className="space-y-3">
                  <Choice
                    selected={answers.has_pro === true}
                    onClick={() => set({ has_pro: true })}
                    label="Yes"
                    note="You can connect with them from your profile"
                  />
                  <Choice
                    selected={answers.has_pro === false}
                    onClick={() => set({ has_pro: false })}
                    label="Not right now"
                  />
                </div>
              </Question>
            ),
          },
          {
            id: 'summary',
            ready: true,
            render: () => (
              <Question
                title="Your starting map"
                hint="Based on your answers. Every set you log from here moves it on."
              >
                <Summary answers={answers} />
                {injuries.length > 0 && (
                  <p className="mt-4 text-sm text-muted">
                    {injuries.length === 1 ? 'Your injury' : `Your ${injuries.length} injuries`} will show in recovery
                    colours.
                  </p>
                )}
              </Question>
            ),
          },
        ]),
  ]

  const step = steps[Math.min(index, steps.length - 1)]
  const last = index >= steps.length - 1

  async function finish() {
    setSaving(true)
    setError('')
    try {
      const values = {
        ...answers,
        display_name: answers.display_name.trim(),
        bodyweight_kg: answers.bodyweight_kg ? Number(answers.bodyweight_kg) : null,
        lifts: Object.fromEntries(
          Object.entries(answers.lifts)
            .filter(([, value]) => Number(value) > 0)
            .map(([id, value]) => [id, Number(value)]),
        ),
        business_name: answers.business_name.trim() || null,
        onboarded_at: new Date().toISOString(),
      }
      const profile = await saveProfile(userId, values)
      const added = injuries.filter((row) => !row.id)
      if (added.length) {
        const { error: injuryError } = await supabase.from('injuries').insert(added)
        if (injuryError) throw injuryError
        setInjuries(injuries.filter((row) => row.id))
      }
      for (const row of injuries.filter((item) => item.id)) {
        const { error: injuryError } = await supabase
          .from('injuries')
          .update({ details: row.details, updated_at: new Date().toISOString() })
          .eq('id', row.id)
        if (injuryError) throw injuryError
      }
      for (const id of removed) {
        const { error: injuryError } = await supabase.from('injuries').delete().eq('id', id)
        if (injuryError) throw injuryError
      }
      if (profile.body) {
        try {
          localStorage.setItem('reforge.bodymap.body', profile.body)
        } catch {
          // The map just falls back to the male figure in private browsing
        }
      }
      onDone(profile)
    } catch {
      setError("Couldn't save your answers. Check your connection and try again.")
      setSaving(false)
    }
  }

  return (
    <main
      className="mx-auto flex min-h-dvh max-w-xl flex-col px-5"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1.5rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
      }}
    >
      <div className="flex items-center gap-3">
        {index > 0 && (
          <button
            type="button"
            onClick={() => setIndex(index - 1)}
            className="-ml-2 rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:text-white"
          >
            Back
          </button>
        )}
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500"
            style={{ width: `${Math.round(((index + 1) / steps.length) * 100)}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-muted">
          {index + 1} / {steps.length}
        </span>
      </div>

      <div key={step.id} className="mt-10 flex-1">
        {step.render()}
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-400">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => (last ? finish() : setIndex(index + 1))}
        disabled={!step.ready || saving}
        className={`mt-8 w-full ${buttonPrimary}`}
      >
        {saving ? 'Saving…' : last ? (isPro ? 'Finish' : 'Show my map') : step.optional ? 'Next (or skip)' : 'Next'}
      </button>
    </main>
  )
}
