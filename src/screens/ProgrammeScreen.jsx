import { useEffect, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary, inputBase } from '../components/ui.jsx'
import { STARTER_PLAN } from '../data/starterPlan.js'
import {
  copyDays,
  describeDayChange,
  fetchChanges,
  fetchRequests,
  recordChange,
  requestChange,
  resolveRequest,
  saveTemplate,
} from '../lib/coaching.js'
import DayEditor from '../components/DayEditor.jsx'
import { ask, toast } from '../components/Feedback.jsx'
import { TemplatePicker } from '../components/Templates.jsx'
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
  const [picking, setPicking] = useState(false)

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

  // A template was given from the picker: it's already saved, so just show it
  function applied(created) {
    setPicking(false)
    setProgramme(created)
    setHistoryKey((k) => k + 1)
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
            <button type="button" onClick={() => setPicking(true)} className={`w-full ${buttonSecondary} py-3`}>
              Choose a template
            </button>
            <a href="#clients/templates" className="block text-center text-sm font-semibold text-gold">
              Manage your templates ›
            </a>
            {picking && (
              <TemplatePicker
                client={{ id: userId, display_name: clientName }}
                onClose={() => setPicking(false)}
                onDone={applied}
              />
            )}
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
        <CoachTemplates programme={programme} client={{ id: userId, display_name: clientName }} onApplied={applied} />
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

// Templates from a client's programme: save this one for reuse, or switch them to another
function CoachTemplates({ programme, client, onApplied }) {
  const [picking, setPicking] = useState(false)
  const [saving, setSaving] = useState(false)

  async function saveAsTemplate() {
    const name = await ask({
      title: 'Save as a template',
      body: 'Reuse this programme for other clients. Their weights and history aren’t included.',
      confirm: 'Save template',
      input: { label: 'Template name', value: programme.name, maxLength: 80 },
    })
    if (!name) return
    setSaving(true)
    try {
      await saveTemplate(name, copyDays(programme.days))
      toast(`Saved "${name}" to your templates`)
    } catch {
      toast("Couldn't save the template. Check your connection.", { tone: 'error' })
    }
    setSaving(false)
  }

  return (
    <section className="mt-8 rounded-2xl border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Templates</h2>
        <a href="#clients/templates" className="text-sm font-semibold text-gold">
          Manage ›
        </a>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={saveAsTemplate} disabled={saving} className={buttonSecondary}>
          {saving ? 'Saving…' : 'Save as template'}
        </button>
        <button type="button" onClick={() => setPicking(true)} className={buttonSecondary}>
          Switch template
        </button>
      </div>
      {picking && (
        <TemplatePicker
          client={client}
          onClose={() => setPicking(false)}
          onDone={(created) => {
            setPicking(false)
            onApplied(created)
          }}
        />
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
          onDelete={async () => {
            const sure = await ask({
              title: `Remove ${day.name}?`,
              body: 'It comes out of the programme. Sessions already logged for it stay in the history.',
              confirm: 'Remove day',
              danger: true,
            })
            if (sure) onDeleteDay(day)
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
                {exercise.load?.kind === 'kg' && Number(exercise.load.value) > 0 ? ` · ${exercise.load.value} kg` : ''}
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
