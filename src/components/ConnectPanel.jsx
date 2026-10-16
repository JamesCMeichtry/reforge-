import { useEffect, useState } from 'react'
import { createConnectCode, disconnect, fetchMyPros, fetchNotes, professionLabel } from '../lib/pro.js'
import { me } from '../lib/me.js'
import { buttonPrimary, buttonSecondary } from './ui.jsx'
import { ask, toast } from './Feedback.jsx'
import { PackageLine } from './Packages.jsx'

const shortDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// Profile: share a code with a physio or PT, see who's connected, and read their notes
export default function ConnectPanel() {
  const [pros, setPros] = useState(null)
  const [notes, setNotes] = useState([])
  const [code, setCode] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    Promise.all([fetchMyPros(), fetchNotes(me())])
      .then(([list, noteList]) => {
        setPros(list)
        setNotes(noteList)
      })
      .catch(() => setError("Couldn't load your connections. Check your connection."))

  useEffect(() => {
    load()
  }, [])

  async function makeCode() {
    setBusy(true)
    setError('')
    try {
      setCode(await createConnectCode())
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  async function remove(pro) {
    const sure = await ask({
      title: `Disconnect from ${pro.display_name}?`,
      body: "They'll lose access to your training straight away. You can reconnect later with a new code.",
      confirm: 'Disconnect',
      danger: true,
    })
    if (!sure) return
    try {
      await disconnect(me(), pro.id)
      setPros((current) => current.filter((p) => p.id !== pro.id))
      toast(`Disconnected from ${pro.display_name}`)
    } catch {
      setError("Couldn't disconnect. Check your connection and try again.")
    }
  }

  const nameOf = (id) => pros?.find((p) => p.id === id)?.display_name ?? 'Your professional'

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">Your physio or PT</h2>
      <p className="mt-2 leading-relaxed text-neutral-300">
        {pros?.length
          ? `${pros[0].display_name ?? 'Your professional'} runs your programme and rehab, and can see your body map, check-ins and sessions.`
          : 'Connect with a professional so they can see your body map, check-ins and sessions, and run your programme and rehab.'}
      </p>

      {pros?.length > 0 && (
        <ul className="mt-4 space-y-2">
          {pros.map((pro) => (
            <li
              key={pro.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3"
            >
              <div>
                <p className="font-semibold text-white">{pro.display_name}</p>
                <p className="text-sm text-muted">
                  {professionLabel(pro.profession)}
                  {pro.business_name ? ` · ${pro.business_name}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(pro)}
                className="rounded-lg px-2 py-1 text-sm font-semibold text-muted hover:text-red-400"
              >
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
      {pros?.length > 0 && <PackageLine proId={pros[0].id} />}

      {pros?.length > 0 ? (
        <p className="mt-3 text-sm text-muted">
          One professional looks after your training at a time. To switch, disconnect first.
        </p>
      ) : code ? (
        <div className="mt-4 rounded-xl border border-gold/60 bg-gold/10 p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Your code</p>
          <p className="mt-2 font-display text-5xl font-bold tracking-[0.25em] text-white">{code}</p>
          <p className="mt-2 text-sm text-neutral-300">
            Give this to your physio or PT to enter in their Clients tab. It works once.
          </p>
          <button type="button" onClick={load} className={`mt-3 ${buttonSecondary}`}>
            They've added me
          </button>
        </div>
      ) : (
        <button type="button" onClick={makeCode} disabled={busy} className={`mt-4 w-full ${buttonPrimary}`}>
          {busy ? 'Making a code…' : 'Get a connect code'}
        </button>
      )}

      {notes.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Notes for you</p>
          <ul className="mt-3 space-y-3">
            {notes.slice(0, 5).map((note) => (
              <li key={note.id}>
                <p className="text-sm leading-relaxed text-white">{note.body}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {nameOf(note.pro_id)} · {shortDate(note.created_at)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  )
}
