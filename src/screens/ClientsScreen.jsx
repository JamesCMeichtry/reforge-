import { useEffect, useState } from 'react'
import InjuryEditor from '../components/InjuryEditor.jsx'
import LivingMap from '../components/LivingMap.jsx'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary, inputBase } from '../components/ui.jsx'
import { fetchRecentCheckIns, painWord } from '../lib/checkins.js'
import { me } from '../lib/me.js'
import { addNote, connectWithCode, deleteNote, disconnect, fetchMyClients, fetchNotes } from '../lib/pro.js'
import { daysAgo, fetchActiveProgramme, formatLoad } from '../lib/programme.js'
import { fetchSetHistory, shortDate } from '../lib/progress.js'

// #clients is the list, #clients/<id> is one client
const clientFromHash = () => window.location.hash.replace('#', '').split('/')[1] ?? null
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
      <ScreenHeader title="Clients" intro="Everyone you look after, with anyone flaring up at the top." />
      <div className="space-y-4">
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
                      {client.lastCheckIn
                        ? `Last check-in ${daysAgo(client.lastCheckIn).toLowerCase()}`
                        : 'No check-ins in 2 weeks'}
                      {client.worstPain != null ? ` · worst pain ${client.worstPain}/10` : ''}
                    </p>
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

function Sessions({ clientId }) {
  const [days, setDays] = useState(null)
  useEffect(() => {
    fetchSetHistory(28, clientId)
      .then((rows) => {
        const byDate = new Map()
        for (const row of rows) {
          const day = byDate.get(row.session_date) ?? new Map()
          const sets = day.get(row.exercise) ?? []
          sets.push(row)
          day.set(row.exercise, sets)
          byDate.set(row.session_date, day)
        }
        setDays([...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)))
      })
      .catch(() => setDays([]))
  }, [clientId])
  if (!days) return <LoadingCards count={2} label="Loading sessions" />
  if (!days.length) return <p className="text-neutral-300">No sessions logged in the last 4 weeks.</p>
  const setText = (s) => `${s.weight_kg != null ? `${Number(s.weight_kg)} kg × ` : ''}${s.reps ?? '–'}`
  return (
    <ul className="space-y-3">
      {days.map(([date, exercises]) => (
        <li key={date} className="rounded-xl border border-line bg-panel px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            {shortDate(date)} · {daysAgo(date)}
          </p>
          <ul className="mt-2 space-y-1">
            {[...exercises.entries()].map(([name, sets]) => (
              <li key={name} className="text-sm">
                <span className="font-semibold text-white">{name}</span>{' '}
                <span className="text-neutral-300">{sets.map(setText).join(', ')}</span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  )
}

function Programme({ clientId }) {
  const [state, setState] = useState({ status: 'loading' })
  useEffect(() => {
    fetchActiveProgramme(clientId)
      .then((programme) => setState({ status: 'ready', programme }))
      .catch(() => setState({ status: 'error' }))
  }, [clientId])
  if (state.status === 'loading') return <LoadingCards count={2} label="Loading programme" />
  if (state.status === 'error') return <p className="text-red-400">Couldn't load their programme.</p>
  if (!state.programme) return <p className="text-neutral-300">They haven't set up a programme yet.</p>
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        {state.programme.name}. Editing a client's programme from here is the next update.
      </p>
      {state.programme.days.map((day) => (
        <section key={day.name} className="rounded-xl border border-line bg-panel px-4 py-3">
          <h3 className="font-display text-xl font-semibold">{day.name}</h3>
          <ul className="mt-2 space-y-1">
            {day.exercises.map((exercise) => (
              <li key={exercise.id ?? exercise.name} className="text-sm">
                <span className="font-semibold text-white">{exercise.name}</span>{' '}
                <span className="text-neutral-300">
                  {exercise.sets} × {exercise.reps} · {formatLoad(exercise.load)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
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
  ['injuries', 'Injuries'],
  ['checkins', 'Check-ins'],
  ['sessions', 'Sessions'],
  ['programme', 'Programme'],
  ['notes', 'Notes'],
]

function ClientDetail({ clientId }) {
  const [client, setClient] = useState(null)
  const [section, setSection] = useState('map')

  useEffect(() => {
    fetchMyClients()
      .then((list) => setClient(list.find((c) => c.id === clientId) ?? false))
      .catch(() => setClient(false))
  }, [clientId])

  async function remove() {
    if (!window.confirm(`Remove ${client.display_name}? You'll lose access to their training straight away.`)) return
    await disconnect(clientId, me())
    window.location.hash = 'clients'
  }

  if (client === null) return <LoadingCards count={2} label="Loading client" />
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
      {section === 'injuries' && <InjuryEditor key={clientId} userId={clientId} />}
      {section === 'checkins' && <CheckIns clientId={clientId} />}
      {section === 'sessions' && <Sessions clientId={clientId} />}
      {section === 'programme' && <Programme clientId={clientId} />}
      {section === 'notes' && <Notes clientId={clientId} />}
      <button type="button" onClick={remove} className="mt-10 text-sm font-semibold text-muted hover:text-red-400">
        Remove client
      </button>
    </>
  )
}

export default function ClientsScreen() {
  const [clientId, setClientId] = useState(clientFromHash)
  useEffect(() => {
    const onHashChange = () => setClientId(clientFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])
  return clientId ? <ClientDetail clientId={clientId} /> : <ClientList />
}
