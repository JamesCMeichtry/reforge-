import { useEffect, useRef, useState } from 'react'
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
import { ask, deleteWithUndo, toast } from '../components/Feedback.jsx'
import { daysAgo, deleteSet, updateSet } from '../lib/programme.js'
import { ProgrammeView } from './ProgrammeScreen.jsx'
import LiveSession from './LiveSession.jsx'
import TemplatesScreen from './TemplatesScreen.jsx'
import { loadLive } from '../lib/live.js'
import { fetchSetHistory, shortDate } from '../lib/progress.js'
import { useWide } from '../lib/useWide.js'
import { PackageCard } from '../components/Packages.jsx'

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
        <a
          href="#clients/templates"
          className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-4 hover:border-gold"
        >
          <span>
            <span className="block font-semibold text-white">Programme templates</span>
            <span className="block text-sm text-muted">Build a programme once, give it to any client</span>
          </span>
          <span aria-hidden="true" className="text-muted">
            ›
          </span>
        </a>
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
                  role="img"
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
function SetChip({ set, onChanged, onDeleted, onRestored }) {
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
      toast("Couldn't save that set. Check your connection.", { tone: 'error' })
    }
    setBusy(false)
  }

  function remove() {
    setOpen(false)
    deleteWithUndo({
      text: `Deleted ${set.exercise}, set ${set.set_number}`,
      remove: () => onDeleted(set),
      restore: () => onRestored(set),
      commit: () => deleteSet(set.id),
    })
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
      toast("Couldn't save the review. Check your connection.", { tone: 'error' })
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
  const restore = (set) => setRows((current) => [...current, set])

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
                          <SetChip key={set.id} set={set} onChanged={replace} onDeleted={drop} onRestored={restore} />
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

  function remove(note) {
    deleteWithUndo({
      text: 'Note deleted',
      remove: () => setNotes((current) => current.filter((n) => n.id !== note.id)),
      restore: () => setNotes((current) => [note, ...current].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))),
      commit: () => deleteNote(note.id),
    })
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

function ClientDetail({ clientId, section, desk = false }) {
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
    const sure = await ask({
      title: `Remove ${client.display_name ?? 'this client'}?`,
      body: "You'll lose access to their training straight away. Their own data stays with them.",
      confirm: 'Remove client',
      danger: true,
    })
    if (!sure) return
    try {
      await disconnect(clientId, me())
      toast(`${client.display_name ?? 'Client'} removed`)
      window.location.hash = 'clients'
    } catch {
      toast("Couldn't remove them. Check your connection.", { tone: 'error' })
    }
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
      {!desk && (
        <a href="#clients" className="text-sm font-semibold text-muted hover:text-white">
          ‹ All clients
        </a>
      )}
      <div className={desk ? '' : 'mt-3'}>
        <ScreenHeader
          title={client.display_name ?? 'Client'}
          intro={
            client.flagged
              ? 'Flaring up: recent check-ins show high pain or warning signs.'
              : 'Changes you make here apply to their account straight away.'
          }
        />
      </div>
      <div className={desk ? 'grid max-w-3xl items-start gap-x-4 xl:grid-cols-2' : undefined}>
        <LiveButton clientId={clientId} />
        <PackageCard clientId={clientId} clientName={client.display_name} />
      </div>
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
      {section === 'map' &&
        (desk ? (
          // On a laptop the map and recent check-ins sit side by side
          <div className="grid items-start gap-8 xl:grid-cols-2">
            <LivingMap key={clientId} userId={clientId} />
            <div>
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted">Recent check-ins</h2>
              <CheckIns clientId={clientId} />
            </div>
          </div>
        ) : (
          <LivingMap key={clientId} userId={clientId} />
        ))}
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

/* ---------- Pro desk: the laptop layout ----------
   Clients down the left, always in reach, with whoever is open (or the overview) on the right. */

const initials = (name) =>
  (name ?? '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()

const lastTrainedText = (client) =>
  client.lastTrained ? `Trained ${daysAgo(client.lastTrained).toLowerCase()}` : 'No training in 2 weeks'

// The one most important thing about a client, as a coloured dot
function StatusDot({ client }) {
  const live = loadLive(client.id)
  const [colour, label, pulse] = client.flagged
    ? ['var(--pain-severe)', 'Flaring up', true]
    : live
      ? ['#ef4444', 'Live session running', true]
      : client.openRequests || client.toReview.length
        ? ['var(--color-gold)', 'Waiting on you', false]
        : client.quiet
          ? ['var(--color-muted)', 'Quiet this week', false]
          : null
  if (!colour) return null
  return (
    <span
      role="img"
      aria-label={label}
      className={`h-2.5 w-2.5 shrink-0 rounded-full ${pulse ? 'live-dot' : ''}`}
      style={{ background: colour }}
    />
  )
}

function ClientRail({ clients, error, selected, searchRef }) {
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const shown = clients?.filter((c) => (c.display_name ?? '').toLowerCase().includes(needle))

  return (
    <aside className="sticky top-8 flex max-h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="border-b border-line p-4">
        <div className="flex items-baseline justify-between">
          <a href="#clients" className="font-display text-2xl font-semibold hover:text-gold">
            Clients
          </a>
          {clients && <span className="text-sm text-muted">{clients.length}</span>}
        </div>
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => event.key === 'Escape' && (setQuery(''), event.currentTarget.blur())}
          placeholder="Search  ( / )"
          aria-label="Search clients"
          className={`mt-3 ${inputBase} py-2 text-sm`}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {error && <p className="p-2 text-sm text-red-400">Couldn't load your clients.</p>}
        {!clients && !error && <LoadingCards count={4} height="h-12" label="Loading your clients" />}
        {shown?.length === 0 && (
          <p className="p-2 text-sm text-muted">{clients.length ? 'No one matches that.' : 'No clients yet.'}</p>
        )}
        <ul className="space-y-0.5">
          {shown?.map((client) => {
            const isSelected = client.id === selected
            return (
              <li key={client.id}>
                <a
                  href={`#clients/${client.id}`}
                  aria-current={isSelected ? 'page' : undefined}
                  className={`flex items-center gap-3 rounded-xl px-2.5 py-2 ${
                    isSelected ? 'bg-gold/10' : 'hover:bg-ink/60'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      isSelected ? 'bg-gold text-ink' : 'bg-line text-white'
                    }`}
                  >
                    {initials(client.display_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm font-semibold ${isSelected ? 'text-gold' : 'text-white'}`}>
                      {client.display_name ?? 'Unnamed client'}
                    </span>
                    <span className="block truncate text-xs text-muted">{lastTrainedText(client)}</span>
                  </span>
                  <StatusDot client={client} />
                </a>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="space-y-0.5 border-t border-line p-2 text-sm font-semibold">
        <a
          href="#clients/templates"
          className="block rounded-xl px-2.5 py-2 text-muted hover:bg-ink/60 hover:text-white"
        >
          Programme templates
        </a>
        <a href="#clients" className="block rounded-xl px-2.5 py-2 text-muted hover:bg-ink/60 hover:text-white">
          + Add a client
        </a>
      </div>
    </aside>
  )
}

function Stat({ value, label, tone }) {
  return (
    <div className="rounded-2xl border border-line bg-panel px-5 py-4">
      <p className="font-display text-4xl font-bold leading-none" style={{ color: tone }}>
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  )
}

// Everyone at a glance, one row each
function ClientTable({ clients }) {
  const open = (id) => (window.location.hash = `clients/${id}`)
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-panel">
      <h2 className="px-5 pt-4 font-display text-2xl font-semibold">Everyone</h2>
      <div className="overflow-x-auto">
        <table className="mt-3 w-full text-left text-sm">
          <thead className="whitespace-nowrap text-[11px] uppercase tracking-[0.15em] text-muted">
            <tr className="border-b border-line">
              <th className="px-5 py-2 font-bold">Client</th>
              <th className="px-3 py-2 font-bold">Last trained</th>
              <th className="px-3 py-2 font-bold">Worst pain</th>
              <th className="px-3 py-2 font-bold">Waiting</th>
              <th className="px-5 py-2 font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {clients.map((client) => {
              const waiting = client.openRequests + client.toReview.length
              return (
                <tr key={client.id} onClick={() => open(client.id)} className="cursor-pointer hover:bg-ink/50">
                  <td className="whitespace-nowrap px-5 py-3">
                    <a href={`#clients/${client.id}`} className="font-semibold text-white hover:text-gold">
                      {client.display_name ?? 'Unnamed client'}
                    </a>
                  </td>
                  <td className="px-3 py-3 text-neutral-300">
                    {client.lastTrained ? daysAgo(client.lastTrained) : <span className="text-muted">2+ weeks</span>}
                  </td>
                  <td className="px-3 py-3">
                    {client.worstPain == null ? (
                      <span className="text-muted">–</span>
                    ) : (
                      <span className={client.worstPain >= 7 ? 'font-semibold text-red-400' : 'text-neutral-300'}>
                        {client.worstPain}/10
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {waiting ? (
                      <span className="font-semibold text-gold">{waiting}</span>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {client.flagged ? (
                      <span className="rounded-full bg-red-950 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-400">
                        Flare
                      </span>
                    ) : client.quiet ? (
                      <span className="text-muted">Quiet</span>
                    ) : (
                      <span className="text-neutral-300">On track</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Overview({ clients, error, reload }) {
  const toLookAt = clients ? attentionItems(clients).length : 0
  return (
    <>
      <ScreenHeader title="Your desk" intro="What needs you today, and how everyone is doing." />
      {error && <p className="text-red-400">Couldn't load your clients. Check your connection.</p>}
      {!clients && !error && <LoadingCards count={3} label="Loading your clients" />}
      {clients && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Stat value={clients.length} label={clients.length === 1 ? 'Client' : 'Clients'} />
            <Stat value={toLookAt} label="To look at" tone={toLookAt ? 'var(--color-gold)' : undefined} />
            <Stat
              value={clients.filter((c) => c.flagged).length}
              label="Flaring up"
              tone={clients.some((c) => c.flagged) ? 'var(--pain-severe)' : undefined}
            />
            <Stat value={clients.filter((c) => !c.quiet).length} label="Active this week" />
          </div>
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-6">
              {clients.length > 0 ? (
                <NeedsYou clients={clients} />
              ) : (
                <p className="text-neutral-300">No clients yet. Add your first one with their code.</p>
              )}
            </div>
            <div className="space-y-4">
              <AddClient onAdded={reload} />
              <a
                href="#clients/templates"
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-4 hover:border-gold"
              >
                <span>
                  <span className="block font-semibold text-white">Programme templates</span>
                  <span className="block text-sm text-muted">Build a programme once, give it to any client</span>
                </span>
                <span aria-hidden="true" className="text-muted">
                  ›
                </span>
              </a>
            </div>
          </div>
          {clients.length > 0 && <ClientTable clients={clients} />}
        </div>
      )}
    </>
  )
}

function Desk({ clientId, section }) {
  const [clients, setClients] = useState(null)
  const [error, setError] = useState(false)
  const searchRef = useRef(null)

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

  // Press / anywhere to jump to the client search
  useEffect(() => {
    const onKey = (event) => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="grid grid-cols-[17rem_minmax(0,1fr)] items-start gap-8">
      <ClientRail clients={clients} error={error} selected={clientId} searchRef={searchRef} />
      <div className="min-w-0">
        {clientId ? (
          <ClientDetail key={clientId} clientId={clientId} section={section} desk />
        ) : (
          <Overview clients={clients} error={error} reload={load} />
        )}
      </div>
    </div>
  )
}

export default function ClientsScreen() {
  const wide = useWide()
  const [route, setRoute] = useState(() => ({ clientId: clientFromHash(), section: sectionFromHash() }))
  useEffect(() => {
    const onHashChange = () => setRoute({ clientId: clientFromHash(), section: sectionFromHash() })
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  if (route.clientId === 'templates') return <TemplatesScreen />
  // Live sessions always take the whole screen, so they skip the desk
  if (wide && route.section !== 'live') return <Desk clientId={route.clientId} section={route.section} />
  return route.clientId ? <ClientDetail clientId={route.clientId} section={route.section} /> : <ClientList />
}
