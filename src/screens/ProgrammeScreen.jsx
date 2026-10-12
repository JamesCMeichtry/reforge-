import { useEffect, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary, inputBase } from '../components/ui.jsx'
import { STARTER_PLAN } from '../data/starterPlan.js'
import {
  copyDays,
  deleteTemplate,
  describeDayChange,
  fetchChanges,
  fetchRequests,
  fetchTemplates,
  recordChange,
  requestChange,
  resolveRequest,
  saveTemplate,
} from '../lib/coaching.js'
import { fetchLatestSession } from '../lib/live.js'
import { me } from '../lib/me.js'
import { fetchMyPros } from '../lib/pro.js'
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
const shortDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// The day id comes from the part of the address after the programme's path, e.g. #programme/<day>
function dayFromHash(basePath) {
  const hash = window.location.hash.replace('#', '')
  return hash.startsWith(`${basePath}/`) ? hash.slice(basePath.length + 1).split('/')[0] : null
}

function useDayFromHash(basePath) {
  const [dayId, setDayId] = useState(() => dayFromHash(basePath))
  useEffect(() => {
    const onChange = () => setDayId(dayFromHash(basePath))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [basePath])
  return dayId
}

// Your own Programme tab. If a professional looks after you, they run it and it's read-only here.
export default function ProgrammeScreen() {
  const [coach, setCoach] = useState(undefined)
  useEffect(() => {
    fetchMyPros()
      .then((list) => setCoach(list[0] ?? null))
      .catch(() => setCoach(null))
  }, [])
  if (coach === undefined) {
    return (
      <>
        <ScreenHeader title="Programme" intro="Loading your plan…" />
        <LoadingCards count={4} label="Loading your plan" />
      </>
    )
  }
  return <ProgrammeView role={coach ? 'coached' : 'self'} coachName={coach?.display_name} />
}

// role: 'self' (you run your own plan), 'coached' (your professional runs it), 'coach' (you run a client's)
export function ProgrammeView({ userId = me(), basePath = 'programme', role = 'self', coachName, clientName }) {
  const dayId = useDayFromHash(basePath)
  const canEdit = role !== 'coached'
  const [programme, setProgramme] = useState(null)
  const [lastDayName, setLastDayName] = useState(null)
  const [lastByDay, setLastByDay] = useState({})
  const [status, setStatus] = useState('loading')
  const [busy, setBusy] = useState(false)
  const [historyKey, setHistoryKey] = useState(0)

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    fetchActiveProgramme(userId)
      .then(async (found) => {
        const last = found ? await fetchLastDayName(found.id, userId) : null
        if (cancelled) return
        setProgramme(found)
        setLastDayName(last)
        setStatus('ready')
      })
      .catch(() => !cancelled && setStatus('error'))
    return () => {
      cancelled = true
    }
  }, [status, userId])

  // Refresh "Up next" and "Last done" whenever the day list is showing
  const programmeId = programme?.id
  useEffect(() => {
    if (dayId || !programmeId) return
    fetchLastDayName(programmeId, userId)
      .then(setLastDayName)
      .catch(() => {})
    fetchRecentTraining(90, userId)
      .then(({ lastByDay: last }) => setLastByDay(last))
      .catch(() => {})
  }, [dayId, programmeId, userId])

  const note = (summary, reason) =>
    recordChange(userId, programme?.id, summary, reason)
      .catch(() => {})
      .finally(() => setHistoryKey((k) => k + 1))

  async function startProgramme(plan, summary) {
    setBusy(true)
    try {
      const created = await createProgramme(plan, userId)
      setProgramme(created)
      await recordChange(userId, created.id, summary).catch(() => {})
      setHistoryKey((k) => k + 1)
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  async function saveDays(days, summary, reason) {
    await saveProgrammeDays(programme.id, days)
    setProgramme({ ...programme, days })
    if (summary) note(summary, reason)
  }

  async function saveDay(updated, reason) {
    const before = programme.days.find((day) => day.id === updated.id)
    const days = programme.days.map((day) => (day.id === updated.id ? updated : day))
    await saveDays(days, describeDayChange(before, updated), reason)
  }

  async function deleteDay(day) {
    await saveDays(
      programme.days.filter((d) => d.id !== day.id),
      `Removed ${day.name}`,
    )
    window.location.hash = basePath
  }

  async function addDay() {
    const day = { id: newId(), name: `Day ${programme.days.length + 1}`, focus: '', exercises: [] }
    await saveDays([...programme.days, day], `Added ${day.name}`)
    window.location.hash = `${basePath}/${day.id}`
  }

  const title = role === 'coach' ? null : 'Programme'

  if (status === 'loading') {
    return (
      <>
        {title && <ScreenHeader title={title} intro="Loading your plan…" />}
        <LoadingCards count={4} label="Loading the programme" />
      </>
    )
  }
  if (status === 'error') {
    return (
      <>
        {title && <ScreenHeader title={title} />}
        <p className="text-red-400">Couldn't load the programme. Check your connection.</p>
        <button type="button" onClick={() => setStatus('loading')} className={`mt-4 ${buttonSecondary}`}>
          Try again
        </button>
      </>
    )
  }

  const day = programme?.days.find((item) => item.id === dayId)
  if (day) {
    return (
      <DayView
        key={day.id}
        programme={programme}
        day={day}
        userId={userId}
        basePath={basePath}
        role={role}
        clientName={clientName}
        coachName={coachName}
        onSaveDay={saveDay}
        onDeleteDay={deleteDay}
      />
    )
  }

  if (!programme) {
    return (
      <>
        {title && <ScreenHeader title={title} intro="Your full plan, built around your goals and injuries." />}
        {role === 'coached' && (
          <section className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-display text-2xl font-semibold">Waiting for your programme</h2>
            <p className="mt-2 text-neutral-300">{coachName ?? 'Your professional'} hasn't set your programme yet.</p>
          </section>
        )}
        {role === 'self' && (
          <section className="rounded-2xl border border-line bg-panel p-5">
            <h2 className="font-display text-2xl font-semibold">Start with the starter plan</h2>
            <p className="mt-2 leading-relaxed text-neutral-300">
              A four-day upper/lower split with the knee rehab, physio block and hamstring ladder built in. You can edit
              every exercise afterwards.
            </p>
            <button
              type="button"
              onClick={() => startProgramme(STARTER_PLAN, 'Started the starter plan')}
              disabled={busy}
              className={`mt-5 w-full ${buttonPrimary}`}
            >
              {busy ? 'Loading…' : 'Load starter plan'}
            </button>
          </section>
        )}
        {role === 'coach' && (
          <div className="space-y-4">
            <p className="text-neutral-300">{clientName ?? 'This client'} doesn't have a programme yet.</p>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                startProgramme(
                  {
                    name: `${clientName ?? 'Client'}'s programme`,
                    days: [{ id: newId(), name: 'Day 1', focus: '', exercises: [] }],
                  },
                  'Started a new programme',
                )
              }
              className={`w-full ${buttonPrimary}`}
            >
              Start from scratch
            </button>
            <Templates
              clientName={clientName}
              onUse={(t) =>
                startProgramme({ name: t.name, days: copyDays(t.days) }, `Started ${t.name} from a template`)
              }
            />
          </div>
        )}
      </>
    )
  }

  const upNext = nextDay(programme.days, lastDayName)
  return (
    <>
      {title && <ScreenHeader title={title} intro={programme.name} />}
      {role === 'coach' && <p className="mb-4 font-display text-2xl font-semibold">{programme.name}</p>}
      {role === 'coached' && <CoachedBanner coachName={coachName} />}
      {role !== 'self' && <LastSession clientId={userId} role={role} coachName={coachName} clientName={clientName} />}
      {role === 'coach' && <OpenRequests clientId={userId} />}

      <ul className="space-y-3">
        {programme.days.map((item) => (
          <li key={item.id}>
            <a
              href={`#${basePath}/${item.id}`}
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
              {item.focus && <p className="mt-2 text-neutral-300">{item.focus}</p>}
              <p className="mt-1 text-sm text-muted">
                {item.exercises.length} {item.exercises.length === 1 ? 'exercise' : 'exercises'} ·{' '}
                {lastByDay[item.name] ? `Last done ${daysAgo(lastByDay[item.name]).toLowerCase()}` : 'Not done yet'}
              </p>
            </a>
          </li>
        ))}
      </ul>

      {canEdit && (
        <button type="button" onClick={addDay} className={`mt-3 w-full ${buttonSecondary}`}>
          + Add a day
        </button>
      )}

      {role === 'coach' && (
        <div className="mt-8 space-y-4">
          <SaveAsTemplate programme={programme} />
          <Templates
            clientName={clientName}
            replacing
            onUse={(t) =>
              startProgramme({ name: t.name, days: copyDays(t.days) }, `Switched to ${t.name} from a template`)
            }
          />
        </div>
      )}

      <History key={historyKey} clientId={userId} role={role} coachName={coachName} clientName={clientName} />
    </>
  )
}

function CoachedBanner({ coachName }) {
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(null)

  async function send(event) {
    event.preventDefault()
    if (!text.trim()) return
    setState('sending')
    try {
      await requestChange(text.trim())
      setText('')
      setOpen(false)
      setState('sent')
    } catch {
      setState('error')
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-gold/50 bg-gold/10 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Managed by {coachName ?? 'your coach'}</p>
      <p className="mt-1 text-sm text-neutral-300">
        Your programme is set by your professional. Log your sessions as normal, and ask if something needs to change.
      </p>
      {open ? (
        <form onSubmit={send} className="mt-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="e.g. My knee is sore on the lunges, can we swap them?"
            className={inputBase}
            aria-label="What would you like changed?"
          />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className={`flex-1 ${buttonSecondary}`}>
              Cancel
            </button>
            <button type="submit" disabled={!text.trim() || state === 'sending'} className={`flex-1 ${buttonPrimary}`}>
              {state === 'sending' ? 'Sending…' : 'Send'}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className={`mt-3 ${buttonSecondary}`}>
          Request a change
        </button>
      )}
      {state === 'sent' && <p className="mt-2 text-sm text-gold">Sent. {coachName ?? 'Your coach'} will see it.</p>}
      {state === 'error' && <p className="mt-2 text-sm text-red-400">Couldn't send that. Try again.</p>}
    </section>
  )
}

function OpenRequests({ clientId }) {
  const [requests, setRequests] = useState([])
  useEffect(() => {
    fetchRequests(clientId, true)
      .then(setRequests)
      .catch(() => {})
  }, [clientId])
  if (!requests.length) return null

  async function done(request) {
    setRequests((current) => current.filter((r) => r.id !== request.id))
    await resolveRequest(request.id).catch(() => setRequests((current) => [request, ...current]))
  }

  return (
    <section className="mb-5 rounded-2xl border border-gold/50 bg-gold/10 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Change requests</p>
      <ul className="mt-2 space-y-3">
        {requests.map((request) => (
          <li key={request.id} className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white">{request.body}</p>
              <p className="text-xs text-muted">{shortDate(request.created_at)}</p>
            </div>
            <button type="button" onClick={() => done(request)} className="shrink-0 text-sm font-semibold text-gold">
              Done
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function History({ clientId, role, coachName, clientName }) {
  const [changes, setChanges] = useState(null)
  useEffect(() => {
    fetchChanges(clientId, 10)
      .then(setChanges)
      .catch(() => setChanges([]))
  }, [clientId])
  if (!changes?.length) return null
  const who = (id) => {
    if (id === me()) return 'You'
    if (role === 'coached') return coachName ?? 'Your coach'
    return clientName ?? 'Client'
  }
  return (
    <section className="mt-8">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted">What changed</h2>
      <ul className="mt-3 space-y-3">
        {changes.map((change) => (
          <li key={change.id} className="border-l-2 border-line pl-3">
            <p className="text-sm text-white">{change.summary}</p>
            {change.reason && <p className="text-sm text-neutral-300">Why: {change.reason}</p>}
            <p className="text-xs text-muted">
              {who(change.changed_by)} · {shortDate(change.created_at)}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function SaveAsTemplate({ programme }) {
  const [state, setState] = useState(null)
  async function save() {
    const name = window.prompt('Name this template', programme.name)
    if (!name?.trim()) return
    setState('saving')
    try {
      await saveTemplate(name.trim(), copyDays(programme.days))
      setState('saved')
    } catch {
      setState('error')
    }
  }
  return (
    <div>
      <button type="button" onClick={save} disabled={state === 'saving'} className={`w-full ${buttonSecondary}`}>
        {state === 'saving' ? 'Saving…' : 'Save this programme as a template'}
      </button>
      {state === 'saved' && <p className="mt-2 text-sm text-gold">Saved to your templates.</p>}
      {state === 'error' && <p className="mt-2 text-sm text-red-400">Couldn't save the template.</p>}
    </div>
  )
}

function Templates({ clientName, onUse, replacing }) {
  const [templates, setTemplates] = useState(null)
  useEffect(() => {
    fetchTemplates()
      .then(setTemplates)
      .catch(() => setTemplates([]))
  }, [])
  if (!templates) return null

  function use(template) {
    const message = replacing
      ? `Switch ${clientName ?? 'this client'} to "${template.name}"? Their current programme is replaced, and the change goes in their history.`
      : `Give ${clientName ?? 'this client'} "${template.name}"?`
    if (window.confirm(message)) onUse(template)
  }

  async function remove(template) {
    if (!window.confirm(`Delete the template "${template.name}"? Clients already using it keep their programme.`))
      return
    setTemplates((current) => current.filter((t) => t.id !== template.id))
    await deleteTemplate(template.id).catch(() => setTemplates((current) => [template, ...current]))
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="font-display text-xl font-semibold">Your templates</h2>
      {templates.length === 0 ? (
        <p className="mt-1 text-sm text-muted">
          None yet. Build a programme for a client, then save it as a template to reuse it.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {templates.map((template) => (
            <li key={template.id} className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{template.name}</p>
                <p className="text-xs text-muted">{template.days.length} days</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => remove(template)}
                  className="px-2 text-sm font-semibold text-muted hover:text-red-400"
                >
                  Delete
                </button>
                <button type="button" onClick={() => use(template)} className={buttonSecondary}>
                  Use
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DayView({ programme, day, userId, basePath, role, clientName, coachName, onSaveDay, onDeleteDay }) {
  const canEdit = role !== 'coached'
  const [editing, setEditing] = useState(canEdit && day.exercises.length === 0)

  return (
    <>
      <a href={`#${basePath}`} className="mb-4 inline-block text-sm font-semibold text-muted hover:text-white">
        ← All days
      </a>
      {role === 'coach' ? (
        <div className="mb-6">
          <h2 className="font-display text-4xl font-bold uppercase leading-none">{day.name}</h2>
          {day.focus && <p className="mt-2 text-muted">{day.focus}</p>}
        </div>
      ) : (
        <ScreenHeader title={day.name} intro={day.focus} />
      )}
      {role === 'coached' && (
        <p className="-mt-4 mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Set by {coachName ?? 'your coach'}
        </p>
      )}
      {canEdit && (
        <div className="mb-6 flex rounded-xl border border-line bg-panel p-1" role="group" aria-label="Mode">
          {[
            [false, role === 'coach' ? 'Session' : 'Log session'],
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
      )}
      {editing ? (
        <DayEditor
          day={day}
          askReason={role === 'coach'}
          onCancel={() => setEditing(false)}
          onDelete={() => {
            if (window.confirm(`Remove ${day.name} from the programme?`)) onDeleteDay(day)
          }}
          onSave={async (updated, reason) => {
            await onSaveDay(updated, reason)
            setEditing(false)
          }}
        />
      ) : role === 'coach' ? (
        <CoachDayPreview day={day} clientId={userId} clientName={clientName} />
      ) : (
        <SessionLog programme={programme} day={day} userId={userId} backHash={basePath} />
      )}
    </>
  )
}

// What the coach sees on a client's day: the plan at a glance and one tap into a live session
function CoachDayPreview({ day, clientId, clientName }) {
  return (
    <>
      <a
        href={`#clients/${clientId}/live/${day.id}`}
        className="mb-5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-gold font-display text-xl font-bold uppercase tracking-wide text-ink"
      >
        <span aria-hidden="true">▶</span> Start live session
      </a>
      <p className="mb-3 text-sm text-muted">
        Run {clientName ?? 'the client'}'s session from the gym floor: log every set, swap exercises and add notes as
        you go.
      </p>
      <ol className="space-y-2">
        {day.exercises.map((exercise, i) => (
          <li key={exercise.id} className="flex gap-3 rounded-xl border border-line bg-panel px-4 py-3">
            <span className="w-5 font-display text-xl font-bold text-gold">{i + 1}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">{exercise.name}</span>
              <span className="block text-sm text-muted">
                {exercise.section || 'Main'} · {exercise.sets} × {exercise.reps}
                {exercise.load?.kind === 'kg' ? ` · ${exercise.load.value} kg` : ''}
                {exercise.load?.kind === 'band' ? ` · ${exercise.load.value} band` : ''}
              </span>
              {exercise.note && <span className="mt-1 block text-sm text-neutral-300">{exercise.note}</span>}
            </span>
          </li>
        ))}
      </ol>
    </>
  )
}

// The latest session a professional ran: the client sees what they did, PBs, pain and the coach's message
function LastSession({ clientId, role, coachName, clientName }) {
  const [session, setSession] = useState(null)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    fetchLatestSession(clientId)
      .then(setSession)
      .catch(() => {})
  }, [clientId])
  if (!session?.summary) return null
  const age = (Date.now() - new Date(session.ended_at).getTime()) / 86400000
  if (age > 14) return null
  const s = session.summary
  const when = daysAgo(session.ended_at.slice(0, 10))
  const title = role === 'coached' ? `Your session with ${coachName ?? 'your coach'}` : `Last live session`
  return (
    <section className="mb-5 overflow-hidden rounded-2xl border border-gold/50 bg-panel">
      <div className="p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
          {title} · {when}
        </p>
        <p className="mt-1 font-display text-2xl font-bold uppercase leading-none">{session.day_name}</p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-semibold">
          <span className="rounded-full border border-line px-2.5 py-1 text-neutral-300">{s.minutes} min</span>
          <span className="rounded-full border border-line px-2.5 py-1 text-neutral-300">{s.sets} sets</span>
          {s.volume > 0 && (
            <span className="rounded-full border border-line px-2.5 py-1 text-neutral-300">
              {s.volume.toLocaleString('en-GB')} kg moved
            </span>
          )}
          {s.pbs?.length > 0 && (
            <span className="rounded-full bg-gold px-2.5 py-1 text-ink">
              {s.pbs.length} {s.pbs.length === 1 ? 'PB' : 'PBs'}
            </span>
          )}
        </div>
        {session.message && (
          <blockquote className="mt-3 border-l-2 border-gold pl-3 text-neutral-300">
            “{session.message}”
            {role === 'coached' && <span className="mt-1 block text-xs text-muted">– {coachName ?? 'Your coach'}</span>}
          </blockquote>
        )}
        {s.pbs?.map((pb) => (
          <p key={pb.exercise} className="mt-2 text-sm text-gold">
            New best: {pb.exercise} {pb.weight} kg × {pb.reps}
          </p>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="mt-3 text-sm font-semibold text-muted hover:text-white"
        >
          {open ? 'Hide details' : 'See every set'}
        </button>
      </div>
      {open && (
        <div className="border-t border-line px-4 py-3">
          <ul className="space-y-2">
            {s.exercises?.map((e, i) => (
              <li key={i} className="text-sm">
                <span className={`font-semibold ${e.status === 'skipped' ? 'text-muted line-through' : 'text-white'}`}>
                  {e.name}
                </span>
                {e.sets.length > 0 && <span className="block text-neutral-300">{e.sets.join(' · ')}</span>}
                {e.notes?.length > 0 && <span className="block text-gold">{e.notes.join(' · ')}</span>}
              </li>
            ))}
          </ul>
          {s.pain?.length > 0 && (
            <p className="mt-3 text-sm text-neutral-300">
              Pain: {s.pain.map((p) => `${p.label} peaked at ${p.max}/10`).join(', ')}
            </p>
          )}
          {s.kept?.length > 0 && (
            <p className="mt-3 text-sm text-neutral-300">
              Kept in {role === 'coached' ? 'your' : clientName ? `${clientName}'s` : 'their'} programme:{' '}
              {s.kept.join('; ')}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function DayEditor({ day, askReason, onSave, onCancel, onDelete }) {
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
      <button
        type="button"
        onClick={onDelete}
        className="w-full pt-2 text-sm font-semibold text-muted hover:text-red-400"
      >
        Remove this day
      </button>
    </div>
  )
}
