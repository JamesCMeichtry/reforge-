import { useEffect, useState } from 'react'
import { fetchInjurySites, fetchPendingMorning, painWord, saveMorning } from '../lib/checkins.js'
import { buttonPrimary } from './ui.jsx'

const labelFromId = (id) => id.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase())

// Asks for the next-morning score on yesterday's check-ins, then gets out of the way
export default function MorningCheck() {
  const [areas, setAreas] = useState([])
  const [values, setValues] = useState({})
  const [state, setState] = useState('loading')

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPendingMorning(), fetchInjurySites()])
      .then(([pending, sites]) => {
        if (cancelled) return
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
        setAreas([...grouped.values()])
        setState('ready')
      })
      .catch(() => !cancelled && setState('hidden'))
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSave() {
    setState('saving')
    try {
      await Promise.all(areas.map((area) => saveMorning(area.ids, values[area.areaId] ?? 0)))
      setState('done')
    } catch {
      setState('error')
    }
  }

  if (state === 'loading' || state === 'hidden' || (state === 'ready' && !areas.length)) return null

  if (state === 'done') {
    return (
      <section className="rounded-2xl border border-gold/50 bg-panel p-5">
        <h2 className="font-display text-2xl font-semibold">Morning check saved</h2>
        <p className="mt-1 text-sm text-neutral-300">See the trend for each area on the Rehab tab.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gold/60 bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Morning check</p>
      <h2 className="mt-2 font-display text-2xl font-semibold">How do these feel after a night's rest?</h2>
      <div className="mt-5 space-y-5">
        {areas.map((area) => {
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
      {state === 'error' && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          Couldn't save. Check your connection and try again.
        </p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={state === 'saving'}
        className={`mt-6 w-full ${buttonPrimary}`}
      >
        {state === 'saving' ? 'Saving…' : 'Save morning check'}
      </button>
    </section>
  )
}
