import { useEffect, useState } from 'react'
import { buttonPrimary, inputBase } from './ui.jsx'
import { toast } from './Feedback.jsx'
import { TABS, CLIENTS_TAB } from './TabBar.jsx'
import { KINDS, fetchMyFeedback, sendFeedback } from '../lib/feedback.js'

const AREAS = [...TABS.map((t) => t.label), CLIENTS_TAB.label, 'Somewhere else']
const STATUS = { new: 'Sent', seen: 'Seen', done: 'Sorted' }
const shortDate = (value) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// Profile: tell us what's broken or what would make Reforge better
export function FeedbackPanel() {
  const [kind, setKind] = useState('bug')
  const [area, setArea] = useState(null)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState([])

  useEffect(() => {
    fetchMyFeedback()
      .then(setSent)
      .catch(() => {})
  }, [])

  async function submit(event) {
    event.preventDefault()
    if (!body.trim()) return
    setBusy(true)
    try {
      await sendFeedback({ kind, body, area })
      setSent((current) => [
        { id: `new-${Date.now()}`, kind, body: body.trim(), area, status: 'new', created_at: new Date().toISOString() },
        ...current,
      ])
      setBody('')
      setArea(null)
      toast('Thanks! Your feedback was sent.')
    } catch (error) {
      const limit = /a lot of feedback/.test(error?.message ?? '')
      toast(limit ? error.message : "Couldn't send that. Check your connection.", { tone: 'error' })
    }
    setBusy(false)
  }

  const placeholder =
    kind === 'bug'
      ? 'What happened, and what did you expect? e.g. I tapped Save on a set and it disappeared'
      : kind === 'idea'
        ? 'What would make Reforge better for you?'
        : 'Tell us anything'

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">Send feedback</h2>
      <p className="mt-1 text-sm text-muted">
        Found a bug or have an idea? It goes straight to the person building Reforge.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="What kind of feedback">
          {KINDS.map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              aria-pressed={kind === id}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                kind === id ? 'border-gold bg-gold text-ink' : 'border-line text-neutral-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <p className="mb-1.5 text-xs font-medium text-muted">Which part of the app? (optional)</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Which part of the app">
            {AREAS.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setArea(area === label ? null : label)}
                aria-pressed={area === label}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  area === label ? 'border-gold text-gold' : 'border-line text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value.slice(0, 2000))}
          rows={4}
          placeholder={placeholder}
          aria-label="Your feedback"
          className={inputBase}
        />
        <p className="-mt-2 text-xs text-muted">
          Your phone type and screen size are included to help fix bugs. Please don't include health details.
        </p>
        <button type="submit" disabled={busy || !body.trim()} className={`w-full ${buttonPrimary}`}>
          {busy ? 'Sending…' : 'Send feedback'}
        </button>
      </form>

      {sent.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted">What you've sent</h3>
          <ul className="mt-2 space-y-2">
            {sent.slice(0, 3).map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="line-clamp-2 min-w-0 text-neutral-300">{item.body}</span>
                <span
                  className={`shrink-0 text-xs font-semibold ${item.status === 'new' ? 'text-muted' : 'text-gold'}`}
                >
                  {STATUS[item.status] ?? 'Sent'} · {shortDate(item.created_at)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
