import { useEffect, useState } from 'react'
import CheckInForm from './CheckInForm.jsx'
import { fetchInjurySites, fetchPendingMorning, fetchRecentCheckIns, painWord, saveMorning } from '../lib/checkins.js'
import { todayDate } from '../lib/programme.js'
import { buttonPrimary } from './ui.jsx'

const labelFromId = (id) => id.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

// The one place to check in. In the morning it asks how yesterday's session settled overnight;
// the rest of the day it offers a 30-second "how do they feel right now". Once done, it shrinks to one line.
export default function MorningCheck() {
  const [state, setState] = useState({ status: 'loading' })
  const [values, setValues] = useState({})
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPendingMorning(), fetchInjurySites(), fetchRecentCheckIns(1)])
      .then(([pending, sites, recent]) => {
        if (cancelled) return
        if (!sites.length) return setState({ status: 'hidden' })
        if (pending.length) {
          const grouped = new Map()
          for (const row of pending) {
            const entry = grouped.get(row.area_id) ?? {
              areaId: row.area_id,
              label: sites.find((s) => s.areaId === row.area_id)?.label ?? labelFromId(row.area_id),
              ids: [],
            }
            entry.ids.push(row.id)
            grouped.set(row.area_id, entry)
          }
          return setState({ status: 'morning', areas: [...grouped.values()], sites })
        }
        const doneToday = recent.some((c) => c.session_date === todayDate())
        setState({ status: doneToday ? 'done' : 'quick', sites })
      })
      .catch(() => !cancelled && setState({ status: 'hidden' }))
    return () => {
      cancelled = true
    }
  }, [])

  async function saveMorningScores() {
    setState((s) => ({ ...s, saving: true, error: false }))
    try {
      await Promise.all(state.areas.map((area) => saveMorning(area.ids, values[area.areaId] ?? 0)))
      setState((s) => ({ ...s, status: 'done', saving: false }))
    } catch {
      setState((s) => ({ ...s, saving: false, error: true }))
    }
  }

  if (state.status === 'loading' || state.status === 'hidden') return null

  if (state.status === 'done') {
    return (
      <a
        href="#rehab"
        className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-5 py-4 hover:border-gold"
      >
        <span>
          <span className="block font-semibold text-white">
            <span className="text-gold">✓</span> Checked in today
          </span>
          <span className="block text-sm text-muted">See how each injury is going on Rehab</span>
        </span>
        <span aria-hidden="true" className="text-muted">
          ›
        </span>
      </a>
    )
  }

  if (state.status === 'quick') {
    if (open) return <CheckInForm sites={state.sites} title="How do they feel right now?" quick />
    return (
      <section className="rounded-2xl border border-line bg-panel p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Check-in · 30 seconds</p>
        <h2 className="mt-2 font-display text-2xl font-semibold">How are your injuries today?</h2>
        <p className="mt-1 text-sm text-neutral-300">Keeps your rehab stages, streak and coach up to date.</p>
        <button type="button" onClick={() => setOpen(true)} className={`mt-5 w-full ${buttonPrimary}`}>
          Check in
        </button>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gold/60 bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Check-in · this morning</p>
      <h2 className="mt-2 font-display text-2xl font-semibold">How do they feel after a night's rest?</h2>
      <div className="mt-5 space-y-5">
        {state.areas.map((area) => {
          const value = values[area.areaId] ?? 0
          return (
            <label key={area.areaId} className="block">
              <span className="flex items-baseline justify-between text-sm">
                <span className="font-semibold text-white">{area.label}</span>
                <span className={`font-semibold ${value >= 7 ? 'text-red-400' : value ? 'text-gold' : 'text-muted'}`}>
                  {value}/10 · {painWord(value)}
                </span>
              </span>
              <input
                type="range"
                min="0"
                max="10"
                value={value}
                onChange={(event) =>
                  setValues((current) => ({ ...current, [area.areaId]: Number(event.target.value) }))
                }
                className="pain-slider mt-2 w-full"
                style={{ '--fill': `${value * 10}%` }}
              />
            </label>
          )
        })}
      </div>
      {state.error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          Couldn't save. Check your connection and try again.
        </p>
      )}
      <button
        type="button"
        onClick={saveMorningScores}
        disabled={state.saving}
        className={`mt-6 w-full ${buttonPrimary}`}
      >
        {state.saving ? 'Saving…' : 'Save check-in'}
      </button>
    </section>
  )
}
