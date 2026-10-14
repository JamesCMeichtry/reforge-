import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { LoadingCards, buttonPrimary, buttonSecondary } from './ui.jsx'
import { toast } from './Feedback.jsx'
import { REFORGE_TEMPLATES } from '../data/templateLibrary.js'
import { RED_FLAGS } from '../data/assessmentForm.js'
import { copyDays, fetchTemplates, recordChange } from '../lib/coaching.js'
import { fetchClientInjuries, fetchLatestAssessment } from '../lib/assessment.js'
import { createProgramme, fetchActiveProgramme } from '../lib/programme.js'
import { fetchMyClients } from '../lib/pro.js'

/* ---------- Showing a template ---------- */

export function exerciseLine(e) {
  const load =
    e.load?.kind === 'kg' && Number(e.load.value) > 0
      ? ` · ${Number(e.load.value)} kg`
      : e.load?.kind === 'band' && e.load.value
        ? ` · ${e.load.value} band`
        : ''
  return `${e.sets} × ${e.reps}${load}`
}

export const exerciseCount = (days) => days.reduce((sum, d) => sum + d.exercises.length, 0)

export function TemplateDays({ days, flagged = new Set() }) {
  return (
    <ol className="space-y-3">
      {days.map((day) => (
        <li key={day.id} className="rounded-2xl border border-line bg-panel p-4">
          <p className="font-display text-xl font-bold uppercase leading-none">{day.name}</p>
          {day.focus && <p className="mt-1 text-sm text-muted">{day.focus}</p>}
          <ul className="mt-3 space-y-1.5">
            {day.exercises.map((e) => (
              <li key={e.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className={flagged.has(e.name) ? 'font-semibold text-red-400' : 'text-neutral-200'}>
                  {flagged.has(e.name) && <span aria-hidden="true">⚠ </span>}
                  {e.name}
                </span>
                <span className="shrink-0 text-muted">{exerciseLine(e)}</span>
              </li>
            ))}
            {day.exercises.length === 0 && <li className="text-sm text-muted">No exercises yet</li>}
          </ul>
        </li>
      ))}
    </ol>
  )
}

/* ---------- Checking a template against the client ----------
   Reads their assessment and body map and points out anything worth a second look. These are only
   suggestions for the professional: nothing is changed or blocked. */

const TRIGGER_PATTERNS = {
  Kneeling: /split squat|lunge|kneeling/i,
  Stairs: /step-up|step-down|lunge/i,
  Squatting: /squat|lunge|leg press|wall sit/i,
  Running: /run|sprint/i,
  Jumping: /jump|hop|bound/i,
  Twisting: /twist|rotation|woodchop/i,
  Overhead: /overhead|pull-up|chin-up|lateral raise|wall slide|seated dumbbell press|landmine press/i,
  Lifting: /deadlift|row|carry|good morning|swing/i,
}

function avoidWords(text) {
  return (text ?? '')
    .toLowerCase()
    .split(/,|;|\/|\band\b|\bor\b/)
    .map((w) => w.trim().replace(/(es|s)$/, ''))
    .filter((w) => w.length >= 3)
}

export async function loadCautions(clientId) {
  const [assessment, injuries] = await Promise.all([
    fetchLatestAssessment(clientId).catch(() => null),
    fetchClientInjuries(clientId).catch(() => []),
  ])
  return { answers: assessment?.answers ?? null, injuries }
}

export function cautionsFor(template, context) {
  if (!context?.answers) return []
  const { answers, injuries } = context
  const names = [...new Set(template.days.flatMap((d) => d.exercises.map((e) => e.name)))]
  const found = []

  const flags = answers.screening?.flags ?? {}
  const yes = RED_FLAGS.filter((f) => flags[f.id] === 'yes')
  if (yes.length && answers.screening?.clearance !== 'Cleared by GP or physio') {
    found.push({
      level: 'red',
      text: `Health screen: ${yes.map((f) => f.label.toLowerCase()).join('; ')}`,
      detail: 'Medical clearance not recorded yet.',
      exercises: [],
    })
  }

  for (const injury of injuries) {
    const detail = answers.injuries?.[injury.key]
    if (!detail) continue
    if (detail.cleared === 'Not yet') {
      found.push({ level: 'red', text: `${injury.label}: not cleared to train yet`, exercises: [] })
    }
    for (const trigger of detail.aggravating ?? []) {
      const pattern = TRIGGER_PATTERNS[trigger]
      const hits = pattern ? names.filter((n) => pattern.test(n)) : []
      if (hits.length) {
        found.push({
          level: 'amber',
          text: `${injury.label} is aggravated by ${trigger.toLowerCase()}`,
          exercises: hits,
        })
      }
    }
  }

  const words = avoidWords(answers.lifestyle?.avoid)
  const avoided = names.filter((n) => words.some((w) => n.toLowerCase().includes(w)))
  if (avoided.length) {
    found.push({ level: 'amber', text: `They said to avoid: ${answers.lifestyle.avoid}`, exercises: avoided })
  }
  return found
}

export function Cautions({ cautions }) {
  if (!cautions.length) return null
  return (
    <section className="rounded-2xl border border-red-400/50 bg-red-950/40 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">Worth checking first</p>
      <ul className="mt-2 space-y-2.5">
        {cautions.map((c, i) => (
          <li key={i} className="text-sm">
            <span className={c.level === 'red' ? 'font-semibold text-red-400' : 'text-white'}>{c.text}</span>
            {c.detail && <span className="block text-muted">{c.detail}</span>}
            {c.exercises.length > 0 && (
              <span className="block text-muted">In this template: {c.exercises.join(', ')}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">From their assessment and body map. Suggestions only: you decide.</p>
    </section>
  )
}

/* ---------- Giving a template to a client ---------- */

export async function applyTemplate(template, clientId) {
  const created = await createProgramme({ name: template.name, days: copyDays(template.days) }, clientId)
  await recordChange(clientId, created.id, `Started ${template.name} from a template`).catch(() => {})
  return created
}

// A full-screen panel above everything else (outside the page, so scrolling and animations don't move it)
export function Overlay({ title, onClose, children }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="sheet-up fixed inset-0 z-[58] overflow-y-auto bg-ink text-white"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
    >
      <div className="mx-auto max-w-xl px-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 2rem)' }}>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-3xl font-bold uppercase leading-none">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-10 w-10 shrink-0 rounded-full border border-line text-lg text-muted hover:text-white"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// The last step before a client gets a programme: what it replaces, anything to check, then confirm
function ConfirmGive({ template, client, onBack, onDone }) {
  const [state, setState] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([loadCautions(client.id), fetchActiveProgramme(client.id).catch(() => null)]).then(
      ([context, current]) => !cancelled && setState({ cautions: cautionsFor(template, context), current }),
    )
    return () => {
      cancelled = true
    }
  }, [template, client.id])

  async function give() {
    setBusy(true)
    try {
      const created = await applyTemplate(template, client.id)
      toast(`${template.name} is now ${client.display_name ?? 'their'}'s programme. Set their starting weights.`)
      onDone(created)
    } catch {
      toast("Couldn't set the programme. Check your connection.", { tone: 'error' })
      setBusy(false)
    }
  }

  if (!state) return <LoadingCards count={2} label="Checking their assessment" />
  const flagged = new Set(state.cautions.flatMap((c) => c.exercises))
  return (
    <div className="space-y-4">
      <p className="text-neutral-300">
        Give <span className="font-semibold text-white">{template.name}</span> to{' '}
        <span className="font-semibold text-white">{client.display_name ?? 'this client'}</span>.
        {state.current
          ? ` It replaces "${state.current.name}". Their logged sessions and history stay.`
          : ' They don’t have a programme yet.'}
      </p>
      <Cautions cautions={state.cautions} />
      <TemplateDays days={template.days} flagged={flagged} />
      <p className="text-center text-xs text-muted">You can edit any day afterwards.</p>
      <div
        className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-ink px-5 pt-3"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}
      >
        {onBack && (
          <button type="button" onClick={onBack} className={`px-5 py-3 ${buttonSecondary}`}>
            Back
          </button>
        )}
        <button type="button" onClick={give} disabled={busy} className={`flex-1 whitespace-nowrap ${buttonPrimary}`}>
          {busy ? 'Setting…' : state.current ? 'Replace programme' : 'Give programme'}
        </button>
      </div>
    </div>
  )
}

// From the template library: pick which client gets it
export function GiveTemplate({ template, onClose }) {
  const [clients, setClients] = useState(null)
  const [client, setClient] = useState(null)
  useEffect(() => {
    fetchMyClients()
      .then(setClients)
      .catch(() => setClients([]))
  }, [])
  return (
    <Overlay title={client ? 'Check and confirm' : 'Give to a client'} onClose={onClose}>
      {client ? (
        <ConfirmGive
          template={template}
          client={client}
          onBack={() => setClient(null)}
          onDone={() => {
            onClose()
            window.location.hash = `clients/${client.id}/programme`
          }}
        />
      ) : !clients ? (
        <LoadingCards count={3} label="Loading your clients" />
      ) : clients.length === 0 ? (
        <p className="text-neutral-300">No clients yet. Add one from the Clients screen with their code.</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setClient(c)}
                className="flex w-full items-center justify-between rounded-2xl border border-line bg-panel px-4 py-4 text-left hover:border-gold"
              >
                <span className="font-semibold text-white">{c.display_name ?? 'Unnamed client'}</span>
                <span aria-hidden="true" className="text-muted">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Overlay>
  )
}

// From a client's programme: pick a template for them
export function TemplatePicker({ client, onClose, onDone }) {
  const [mine, setMine] = useState(null)
  const [chosen, setChosen] = useState(null)
  useEffect(() => {
    fetchTemplates()
      .then(setMine)
      .catch(() => setMine([]))
  }, [])

  const row = (t) => (
    <li key={t.id}>
      <button
        type="button"
        onClick={() => setChosen(t)}
        className="w-full rounded-2xl border border-line bg-panel px-4 py-3 text-left hover:border-gold"
      >
        <span className="block font-semibold text-white">{t.name}</span>
        <span className="block text-sm text-muted">
          {t.days.length} {t.days.length === 1 ? 'day' : 'days'} · {exerciseCount(t.days)} exercises
        </span>
        {t.description && <span className="mt-1 block line-clamp-2 text-sm text-neutral-300">{t.description}</span>}
      </button>
    </li>
  )

  return (
    <Overlay title={chosen ? 'Check and confirm' : 'Choose a template'} onClose={onClose}>
      {chosen ? (
        <ConfirmGive template={chosen} client={client} onBack={() => setChosen(null)} onDone={onDone} />
      ) : (
        <div className="space-y-6">
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted">Your templates</h3>
            {!mine ? (
              <LoadingCards count={2} height="h-20" label="Loading your templates" />
            ) : mine.length === 0 ? (
              <p className="text-sm text-muted">None yet. Save any client's programme as a template to reuse it.</p>
            ) : (
              <ul className="space-y-2">{mine.map(row)}</ul>
            )}
          </section>
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-muted">From Reforge</h3>
            <ul className="space-y-2">{REFORGE_TEMPLATES.map(row)}</ul>
          </section>
        </div>
      )}
    </Overlay>
  )
}
