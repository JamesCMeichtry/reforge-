import { useState } from 'react'
import { RED_FLAGS, painWord, saveCheckIns } from '../lib/checkins.js'
import { buttonPrimary } from './ui.jsx'

function PainSlider({ label, value, onChange }) {
  const severe = value >= 7
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-neutral-300">{label}</span>
        <span className={`font-semibold ${severe ? 'text-red-400' : value ? 'text-gold' : 'text-muted'}`}>
          {value}/10 · {painWord(value)}
        </span>
      </span>
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="pain-slider mt-2 w-full"
        style={{ '--fill': `${value * 10}%` }}
      />
    </label>
  )
}

export function RedFlagWarning({ entries }) {
  const flagged = entries.filter((entry) => entry.flags.length)
  if (!flagged.length) return null
  return (
    <div role="alert" className="rounded-2xl border border-red-500/60 bg-red-950/40 p-5 text-left">
      <h3 className="font-display text-2xl font-semibold text-red-300">Get this checked</h3>
      <ul className="mt-2 space-y-1 text-sm text-neutral-200">
        {flagged.map((entry) => (
          <li key={entry.areaId}>
            <span className="font-semibold">{entry.label}:</span> {entry.flags.join(', ').toLowerCase()}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-relaxed text-neutral-300">
        These can point to something more than soreness. Book in with a physio or GP, and avoid loading that area until
        you've been seen. If a joint is stuck, swelling fast or won't take your weight, get seen urgently.
      </p>
    </div>
  )
}

export default function CheckInForm({ sites, title = 'How did your injuries respond?', quick = false, onSaved }) {
  const [entries, setEntries] = useState(() =>
    sites.map((site) => ({ ...site, during: 0, after: 0, flags: [], open: false })),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const update = (areaId, changes) =>
    setEntries((current) => current.map((entry) => (entry.areaId === areaId ? { ...entry, ...changes } : entry)))

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      await saveCheckIns(quick ? entries.map((entry) => ({ ...entry, during: null })) : entries)
      setSaved(true)
      onSaved?.(entries)
    } catch {
      setError("Couldn't save your check-in. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gold/50 bg-panel p-5 text-left">
          <h3 className="font-display text-2xl font-semibold">Check-in saved</h3>
          <p className="mt-1 text-sm text-neutral-300">
            {quick
              ? 'Added to your rehab history.'
              : "Tomorrow morning, the Today tab will ask how these areas feel after a night's rest."}
          </p>
        </div>
        <RedFlagWarning entries={entries} />
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5 text-left">
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted">Leave an area at 0 if you didn't notice it.</p>
      <div className="mt-5 space-y-6">
        {entries.map((entry) => (
          <fieldset key={entry.areaId} className="space-y-4">
            <legend className="mb-3 font-semibold text-white">
              {entry.label}
              <span className="block text-xs font-normal text-muted">{entry.injuries.join(' · ')}</span>
            </legend>
            {!quick && (
              <PainSlider
                label="During the session"
                value={entry.during}
                onChange={(v) => update(entry.areaId, { during: v })}
              />
            )}
            <PainSlider label="Right now" value={entry.after} onChange={(v) => update(entry.areaId, { after: v })} />
            <button
              type="button"
              onClick={() => update(entry.areaId, { open: !entry.open })}
              aria-expanded={entry.open}
              className="text-sm font-semibold text-muted underline decoration-line underline-offset-4 hover:text-white"
            >
              {entry.flags.length
                ? `${entry.flags.length} warning sign${entry.flags.length > 1 ? 's' : ''} ticked`
                : 'Anything unusual?'}
            </button>
            {entry.open && (
              <div className="flex flex-wrap gap-2">
                {RED_FLAGS.map((flag) => {
                  const on = entry.flags.includes(flag)
                  return (
                    <button
                      key={flag}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        update(entry.areaId, {
                          flags: on ? entry.flags.filter((f) => f !== flag) : [...entry.flags, flag],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                        on ? 'border-red-500 bg-red-500 text-white' : 'border-line text-neutral-300'
                      }`}
                    >
                      {flag}
                    </button>
                  )
                })}
              </div>
            )}
          </fieldset>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}
      <button type="button" onClick={handleSave} disabled={saving} className={`mt-6 w-full ${buttonPrimary}`}>
        {saving ? 'Saving…' : 'Save check-in'}
      </button>
    </section>
  )
}
