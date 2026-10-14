import { useEffect, useState } from 'react'
import InjuryEditor from '../components/InjuryEditor.jsx'
import LivingMap from '../components/LivingMap.jsx'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary, inputBase } from '../components/ui.jsx'
import { fetchRecentCheckIns, painWord } from '../lib/checkins.js'
import { me } from '../lib/me.js'
import {
  addNote,
  attentionItems,
  connectWithCode,
  deleteNote,
  disconnect,
  fetchClient,
  fetchMyClients,
  fetchNotes,
  fetchReviews,
  reviewSession,
} from '../lib/pro.js'
import CoachRehab from '../components/CoachRehab.jsx'
import AssessmentPanel from '../components/Assessment.jsx'
import { daysAgo, deleteSet, updateSet } from '../lib/programme.js'
import { ProgrammeView } from './ProgrammeScreen.jsx'
import LiveSession from './LiveSession.jsx'
import { loadLive } from '../lib/live.js'
import { fetchSetHistory, shortDate } from '../lib/progress.js'

// #clients is the list, #clients/<id>/<section> is one client
const hashParts = () => window.location.hash.replace('#', '').split('/')
const clientFromHash = () => hashParts()[1] ?? null
const sectionFromHash = () => hashParts()[2] ?? 'map'
const areaLabel = (areaId) => areaId.charAt(0).toUpperCase() + areaId.slice(1).replace(/-/g, ' ')

function AddClient({ onAdded }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      const client = await connectWithCode(code)
      setMessage({ ok: true, text: `${client.display_name ?? 'Your client'} is now connected.` })
      setCode('')
      onAdded()
    } catch (err) {
      setMessage({ ok: false, text: err.message })
    }
    setBusy(false)
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">Add a client</h2>
      <p className="mt-2 text-sm text-neutral-300">
        Ask your client to tap <span className="font-semibold text-white">Get a connect code</span> on their Profile,
        then enter it here.
      </p>
      <div className="mt-4 flex gap-2">
        <input
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 6),
            )
          }
          aria-label="Client's code"
          placeholder="ABC123"
          autoCapitalize="characters"
          autoComplete="off"
          className={`${inputBase} font-display text-2xl tracking-[0.25em]`}
        />
        <button type="submit" disabled={code.length !== 6 || busy} className={buttonPrimary}>
          {busy ? '…' : 'Add'}
        </button>
      </div>
      {message && (
        <p role="status" className={`mt-3 text-sm ${message.ok ? 'text-gold' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </form>
  )
}

function ClientList() {
  const [clients, setClients] = useState(null)
  const [error, setError] = useState(false)

  const load = () =>
    fetchMyClients()
      .then((list) => {
        setClients(list)
        setError(false)
      })
      .catch(() => setError(true))

  useEffect(() => {
    load()
  }, [])

  return (
    <>
      <ScreenHeader title="Clients" intro="What needs you today, then everyone you look after." />
      <div className="space-y-4">
        {clients?.length > 0 && <NeedsYou clients={clients} />}
        {clients?.length > 0 && (
          <h2 className="pt-2 text-xs font-bold uppercase tracking-[0.2em] text-muted">All clients</h2>
        )}
        {error && <p className="text-red-400">Couldn't load your clients. Check your connection.</p>}
        {!clients && !error && <LoadingCards count={2} label="Loading your clients" />}
        {clients?.length === 0 && (
          <p className="text-neutral-300">No clients yet. Add your first one with their code below.</p>
        )}
        {clients?.length > 0 && (
          <ul className="space-y-2">
            {clients.map((client) => (
              <li key={client.id}>
                <a
                  href={`#clients/${client.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-4 hover:border-gold"
                >
                  <div>
                    <p className="font-semibold text-white">{client.display_name ?? 'Unnamed client'}</p>
                    <p className="text-sm text-muted">
                      {client.lastTrained
                        ? `Trained ${daysAgo(client.lastTrained).toLowerCase()}`
                        : 'No training in 2 weeks'}
                      {client.worstPain != null ? ` · worst pain ${client.worstPain}/10` : ''}
                    </p>
                    {loadLive(client.id) && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gold">
                        <span className="live-dot h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                        Live session running
                      </p>
                    )}
                    {client.openRequests > 0 && (
                      <p className="mt-0.5 text-sm font-semibold text-gold">
                        {client.openRequests} change {client.openRequests === 1 ? 'request' : 'requests'}
                      </p>
                    )}
                  </div>
                  {client.flagged ? (
                    <span className="rounded-full bg-red-950 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-400">
                      Flare
                    </span>
                  ) : (
                    <span aria-hidden="true" className="text-muted">
                      ›
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        )}
        <AddClient onAdded={load} />
      </div>
    </>
  )
}

const LEVEL_STYLE = [
  { dot: 'var(--pain-severe)', label: 'Urgent' },
  { dot: 'var(--color-gold)', label: 'Request' },
  { dot: 'var(--color-gold)', label: 'Review' },
  { dot: 'var(--color-muted)', label: 'Quiet' },
]

// The coach's to-do list: warning signs and high pain first, then requests, solo sessions and quiet clients
function NeedsYou({ clients }) {
  const items = attentionItems(clients)
  return (
    <section className="rounded-2xl border border-line bg-panel">
      <div className="flex items-baseline justify-between px-4 pt-4">
        <h2 className="font-display text-2xl font-semibold">Needs you</h2>
        <span className="text-sm text-muted">{items.length ? `${items.length} to look at` : 'All clear'}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 pb-4 pt-1 text-sm text-neutral-300">
          No warning signs, requests or sessions waiting. Everyone's on track.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {items.map((item, i) => (
            <li key={i}>
              <a href={item.href} className="flex items-center gap-3 px-4 py-3 hover:bg-ink/40">
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${item.level === 0 ? 'live-dot' : ''}`}
                  style={{ background: LEVEL_STYLE[item.level].dot }}
                  aria-label={LEVEL_STYLE[item.level].label}
                />
                <span className="min-w-0 flex-1">
                  <span className={`block font-semibold ${item.level === 0 ? 'text-red-400' : 'text-white'}`}>
                    {item.title}
                  </span>
                  <span className="block text-sm text-muted">{item.detail}</span>
                </span>
                <span aria-hidden="true" className="text-muted">
                  ›
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function CheckIns({ clientId }) {
  const [rows, setRows] = useState(null)
  useEffect(() => {
    fetchRecentCheckIns(28, clientId)
      .then((data) => setRows([...data].reverse()))
      .catch(() => setRows([]))
  }, [clientId])
  if (!rows) return <LoadingCards count={2} label="Loading check-ins" />
  if (!rows.length) return <p className="text-neutral-300">No check-ins in the last 4 weeks.</p>
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id} className="rounded-xl border border-line bg-panel px-4 py-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-white">{areaLabel(row.area_id)}</p>
            <p className="text-sm text-muted">{shortDate(row.session_date)}</p>
          </div>
          <p className="mt-1 text-sm text-neutral-300">
            During {row.pain_during ?? '–'} · after {row.pain_after ?? '–'} · next morning {row.next_morning ?? '–'}
            {row.pain_after != null ? ` (${painWord(row.pain_after).toLowerCase()})` : ''}
          </p>
          {row.red_flag && <p className="mt-1 text-sm font-semibold text-red-400">{row.notes ?? 'Red flag'}</p>}
        </li>
      ))}
    </ul>
  )
}

// One logged set the professional can correct or delete
function SetChip({ set, onChanged, onDeleted }) {
  const [open, setOpen] = useState(false)
  const [weight, setWeight] = useState(set.weight_kg != null ? String(Number(set.weight_kg)) : '')
  const [reps, setReps] = useState(set.reps != null ? String(set.reps) : '')
  const [busy, setBusy] = useState(false)
  const label = `${set.weight_kg != null ? `${Number(set.weight_kg)} kg × ` : ''}${set.reps ?? '–'}`

  async function save() {
    setBusy(true)
    const changes = {
      weight_kg: weight.trim() === '' ? null : parseFloat(weight.replace(',', '.')) || 0,
      reps: reps.trim() === '' ? null : parseInt(reps, 10) || 0,
    }
    try {
      await updateSet(set.id, changes)
      onChanged({ ...set, ...changes })
      setOpen(false)
    } catch {
      window.alert("Couldn't save that set. Check your connection.")
    }
    setBusy(false)
  }

  async function remove() {
    if (!window.confirm(`Delete set ${set.set_number} of ${set.exercise}?`)) return
    setBusy(true)
    try {
      await deleteSet(set.id)
      onDeleted(set)
    } catch {
      window.alert("Couldn't delete that set. Check your connection.")
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-lg border px-2 py-1 text-xs font-semibold ${
          set.logged_by && set.logged_by === me() ? 'border-gold/60 text-gold' : 'border-line text-neutral-300'
        }`}
      >
        {label}
      </button>
    )
  }
  return (
    <div className="mt-1 flex w-full items-center gap-1.5 rounded-lg border border-gold/60 p-2">
      <span className="text-xs text-muted">Set {set.set_number}</span>
      <input
        value={weight}
        onChange={(event) => setWeight(event.target.value)}
        inputMode="decimal"
        placeholder="kg"
        aria-label="Weight in kilograms"
        className={`${inputBase} w-16 text-center`}
      />
      <span className="text-xs text-muted">×</span>
      <input
        value={reps}
        onChange={(event) => setReps(event.target.value.replace(/\D/g, ''))}
        inputMode="numeric"
        placeholder="reps"
        aria-label="Reps"
        className={`${inputBase} w-14 text-center`}
      />
      <button type="button" onClick={save} disabled={busy} className="px-1 text-sm font-semibold text-gold">
        Save
      </button>
      <button type="button" onClick={remove} disabled={busy} className="px-1 text-sm font-semibold text-red-400">
        Delete
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-1 text-sm text-muted">
        ✕
      </button>
    </div>
  )
}

// Look over a session the client did on their own: mark it reviewed, with an optional comment they'll see
function Review({ clientId, date, review, onDone }) {
  const [open, setOpen] = useState(false)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  if (review) {
    return <p className="mt-2 text-sm text-gold">✓ Reviewed{review.comment ? `: “${review.comment}”` : ''}</p>
  }
  async function save() {
    setBusy(true)
    try {
      await reviewSession(clientId, date, comment)
      onDone({ session_date: date, comment: comment.trim() || null })
    } catch {
      window.alert("Couldn't save the review. Check your connection.")
      setBusy(false)
    }
  }
  if (!open) {
    return (
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={save} disabled={busy} className={`flex-1 ${buttonSecondary}`}>
          ✓ Looks good
        </button>
        <button type="button" onClick={() => setOpen(true)} className={`flex-1 ${buttonSecondary}`}>
          Comment
        </button>
      </div>
    )
  }
  return (
    <div className="mt-3">
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="e.g. Great work. Next time keep the RDLs at 50 kg."
        aria-label="Comment for your client"
        className={inputBase}
      />
      <button
        type="button"
        onClick={save}
        disabled={busy || !comment.trim()}
        className={`mt-2 w-full ${buttonPrimary}`}
      >
        {busy ? 'Saving…' : 'Send and mark reviewed'}
      </button>
    </div>
  )
}

function Sessions({ clientId }) {
  const [rows, setRows] = useState(null)
  const [reviews, setReviews] = useState([])
  useEffect(() => {
    fetchSetHistory(28, clientId)
      .then(setRows)
      .catch(() => setRows([]))
    fetchReviews(clientId)
      .then(setReviews)
      .catch(() => {})
  }, [clientId])
  if (!rows) return <LoadingCards count={2} label="Loading sessions" />
  if (!rows.length) return <p className="text-neutral-300">No sessions logged in the last 4 weeks.</p>

  const byDate = new Map()
  for (const row of rows) {
    const day = byDate.get(row.session_date) ?? new Map()
    const sets = day.get(row.exercise) ?? []
    sets.push(row)
    day.set(row.exercise, sets)
    byDate.set(row.session_date, day)
  }
  const days = [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  const replace = (next) => setRows((current) => current.map((r) => (r.id === next.id ? next : r)))
  const drop = (gone) => setRows((current) => current.filter((r) => r.id !== gone.id))

  return (
    <>
      <p className="mb-3 text-sm text-muted">
        Solo sessions are ones they did on their own. Tap a set to correct or delete it. Gold sets are ones you logged.
      </p>
      <ul className="space-y-3">
        {days.map(([date, exercises]) => {
          const all = [...exercises.values()].flat()
          const solo = all.some((set) => set.logged_by !== me())
          const review = reviews.find((r) => r.session_date === date)
          return (
            <li
              key={date}
              className={`rounded-xl border bg-panel px-4 py-3 ${solo && !review ? 'border-gold/50' : 'border-line'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
                  {shortDate(date)} · {daysAgo(date)}
                </p>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                  {solo ? 'Solo' : 'With you'}
                </span>
              </div>
              <ul className="mt-2 space-y-2">
                {[...exercises.entries()].map(([name, sets]) => (
                  <li key={name} className="text-sm">
                    <p className="font-semibold text-white">{name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {sets
                        .sort((x, y) => x.set_number - y.set_number)
                        .map((set) => (
                          <SetChip key={set.id} set={set} onChanged={replace} onDeleted={drop} />
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
              {solo && (
                <Review
                  clientId={clientId}
                  date={date}
                  review={review}
                  onDone={(added) => setReviews((current) => [...current, added])}
                />
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Notes({ clientId }) {
  const [notes, setNotes] = useState(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    fetchNotes(clientId)
      .then(setNotes)
      .catch(() => setNotes([]))
  }, [clientId])

  async function save(event) {
    event.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError('')
    try {
      const note = await addNote(clientId, text.trim())
      setNotes((current) => [note, ...(current ?? [])])
      setText('')
    } catch {
      setError("Couldn't save that note. Check your connection and try again.")
    }
    setBusy(false)
  }

  async function remove(note) {
    setNotes((current) => current.filter((n) => n.id !== note.id))
    try {
      await deleteNote(note.id)
    } catch {
      setNotes((current) => [note, ...current])
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="rounded-2xl border border-line bg-panel p-4">
        <label className="block text-sm font-medium text-neutral-300">
          Leave a note. Your client sees it on their Profile.
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            maxLength={2000}
            className={`mt-2 ${inputBase}`}
            placeholder="e.g. Keep squats above parallel this week"
          />
        </label>
        <button type="submit" disabled={!text.trim() || busy} className={`mt-3 w-full ${buttonPrimary}`}>
          {busy ? 'Saving…' : 'Add note'}
        </button>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      </form>
      {notes === null ? (
        <LoadingCards count={1} label="Loading notes" />
      ) : (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl border border-line bg-panel px-4 py-3">
              <p className="text-sm leading-relaxed text-white">{note.body}</p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted">
                <span>{shortDate(note.created_at.slice(0, 10))}</span>
                {note.pro_id === me() && (
                  <button type="button" onClick={() => remove(note)} className="font-semibold hover:text-red-400">
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const SECTIONS = [
  ['map', 'Body map'],
  ['assessment', 'Assessment'],
  ['injuries', 'Injuries'],
  ['rehab', 'Rehab'],
  ['checkins', 'Check-ins'],
  ['sessions', 'Sessions'],
  ['programme', 'Programme'],
  ['notes', 'Notes'],
]

// Start a live session, or get back into one that's still running on this phone
function LiveButton({ clientId }) {
  const running = loadLive(clientId)
  if (running) {
    const sets = Object.values(running.sets ?? {}).reduce((sum, list) => sum + list.length, 0)
    const minutes = Math.round((Date.now() - new Date(running.startedAt).getTime()) / 60000)
    return (
      <a
        href={`#clients/${clientId}/live`}
        className="mb-5 flex items-center gap-3 rounded-2xl border border-gold bg-gold/10 px-4 py-4"
      >
        <span className="live-dot h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-white">Resume live session</span>
          <span className="block text-sm text-muted">
            {running.dayName} · {minutes} min · {sets} {sets === 1 ? 'set' : 'sets'}
          </span>
        </span>
        <span className="font-display text-2xl font-bold text-gold">›</span>
      </a>
    )
  }
  return (
    <a
      href={`#clients/${clientId}/live`}
      className="mb-5 flex h-14 items-center justify-center gap-2 rounded-2xl bg-gold font-display text-xl font-bold uppercase tracking-wide text-ink"
    >
      <span aria-hidden="true">▶</span> Start live session
    </a>
  )
}

function ClientDetail({ clientId, section }) {
  const [client, setClient] = useState(null)
  const setSection = (id) => (window.location.hash = `clients/${clientId}/${id}`)

  useEffect(() => {
    fetchClient(clientId)
      .then((found) => setClient(found ?? false))
      .catch(() => {
        // No signal: a live session running on this phone can still be opened
        const running = loadLive(clientId)
        setClient(running?.cache?.clientName ? { id: clientId, display_name: running.cache.clientName } : 'offline')
      })
  }, [clientId])

  async function remove() {
    if (!window.confirm(`Remove ${client.display_name}? You'll lose access to their training straight away.`)) return
    await disconnect(clientId, me())
    window.location.hash = 'clients'
  }

  if (client === null) return <LoadingCards count={2} label="Loading client" />
  if (client && client !== 'offline' && section === 'live') {
    return <LiveSession clientId={clientId} clientName={client.display_name ?? 'Client'} dayId={hashParts()[3]} />
  }
  if (client === 'offline') {
    return (
      <div>
        <p className="text-neutral-300">Couldn't load this client. Check your connection.</p>
        <a href="#clients" className={`mt-4 inline-block ${buttonSecondary}`}>
          Back to clients
        </a>
      </div>
    )
  }
  if (client === false) {
    return (
      <div>
        <p className="text-neutral-300">This client isn't connected to you any more.</p>
        <a href="#clients" className={`mt-4 inline-block ${buttonSecondary}`}>
          Back to clients
        </a>
      </div>
    )
  }

  return (
    <>
      <a href="#clients" className="text-sm font-semibold text-muted hover:text-white">
        ‹ All clients
      </a>
      <div className="mt-3">
        <ScreenHeader
          title={client.display_name ?? 'Client'}
          intro={
            client.flagged
              ? 'Flaring up: recent check-ins show high pain or warning signs.'
              : 'Changes you make here apply to their account straight away.'
          }
        />
      </div>
      <LiveButton clientId={clientId} />
      <div className="-mx-5 mb-5 flex gap-2 overflow-x-auto px-5 pb-1" role="group" aria-label="Client sections">
        {SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSection(id)}
            aria-pressed={section === id}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${
              section === id ? 'border-gold text-gold' : 'border-line text-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {section === 'map' && <LivingMap key={clientId} userId={clientId} />}
      {section === 'assessment' && (
        <AssessmentPanel key={clientId} clientId={clientId} clientName={client.display_name} />
      )}
      {section === 'injuries' && <InjuryEditor key={clientId} userId={clientId} />}
      {section === 'rehab' && <CoachRehab key={clientId} clientId={clientId} clientName={client.display_name} />}
      {section === 'checkins' && <CheckIns clientId={clientId} />}
      {section === 'sessions' && <Sessions clientId={clientId} />}
      {section === 'programme' && (
        <ProgrammeView
          key={clientId}
          userId={clientId}
          basePath={`clients/${clientId}/programme`}
          role="coach"
          clientName={client.display_name}
        />
      )}
      {section === 'notes' && <Notes clientId={clientId} />}
      <button type="button" onClick={remove} className="mt-10 text-sm font-semibold text-muted hover:text-red-400">
        Remove client
      </button>
    </>
  )
}

export default function ClientsScreen() {
  const [route, setRoute] = useState(() => ({ clientId: clientFromHash(), section: sectionFromHash() }))
  useEffect(() => {
    const onHashChange = () => setRoute({ clientId: clientFromHash(), section: sectionFromHash() })
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return route.clientId ? <ClientDetail clientId={route.clientId} section={route.section} /> : <ClientList />
}
