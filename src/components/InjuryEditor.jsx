import { useEffect, useState } from 'react'
import { INJURIES, INJURY_GROUPS, TIERS } from '../data/injuries.js'
import { supabase } from '../lib/supabase.js'
import { LoadingCards, buttonPrimary, buttonSecondary } from './ui.jsx'

const sideName = (side) => (side === 'right' ? 'Right' : 'Left')
const injuryById = (id) => INJURIES.find((injury) => injury.id === id)

function AddInjury({ injuries, onAdd }) {
  const [injuryId, setInjuryId] = useState('')
  const [side, setSide] = useState('right')
  const [saving, setSaving] = useState(false)
  const injury = injuryById(injuryId)
  const isDuplicate = injuries.some((row) => row.injury_key === injuryId && (injury?.central || row.side === side))

  async function handleAdd() {
    if (!injury || isDuplicate || saving) return
    setSaving(true)
    const saved = await onAdd({ injury_key: injuryId, side: injury.central ? null : side })
    setSaving(false)
    if (saved) setInjuryId('')
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">Add an injury</h2>
      <label className="mt-3 block text-sm font-medium text-neutral-300">
        Injury
        <select
          value={injuryId}
          onChange={(event) => setInjuryId(event.target.value)}
          className="mt-2 w-full appearance-none rounded-xl border border-line bg-ink px-4 py-3 text-base text-white focus:border-gold focus:outline-none"
        >
          <option value="">Choose an injury…</option>
          {INJURY_GROUPS.map((group) => (
            <optgroup key={group} label={group}>
              {INJURIES.filter((item) => item.group === group).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {injury && !injury.central && (
        <div className="mt-4">
          <p className="text-sm font-medium text-neutral-300">Side</p>
          <div className="mt-2 flex gap-2" role="group" aria-label="Side">
            {['right', 'left'].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSide(option)}
                aria-pressed={side === option}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold ${
                  side === option ? 'border-gold bg-gold text-ink' : 'border-line text-white'
                }`}
              >
                {sideName(option)}
              </button>
            ))}
          </div>
        </div>
      )}

      {injury && (
        <ul className="mt-4 space-y-1.5 text-sm">
          {injury.effects.map((effect) => (
            <li key={effect.area} className="flex items-center gap-2 text-neutral-300">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: TIERS[effect.tier].fill }} />
              {effect.area} · {TIERS[effect.tier].label.toLowerCase()}
            </li>
          ))}
        </ul>
      )}

      {isDuplicate && <p className="mt-3 text-sm text-muted">That injury is already on your map.</p>}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!injury || isDuplicate || saving}
        className={`mt-4 w-full ${buttonPrimary}`}
      >
        {saving ? 'Saving…' : 'Add to body map'}
      </button>
      <p className="mt-3 text-xs text-muted">Not listed? Describing any injury in your own words arrives with the AI.</p>
    </section>
  )
}

export default function InjuryEditor() {
  const [injuries, setInjuries] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    supabase
      .from('injuries')
      .select('id, injury_key, side')
      .order('created_at')
      .then(({ data, error: loadError }) => {
        if (cancelled) return
        if (loadError) return setStatus('error')
        setInjuries(data.filter((row) => injuryById(row.injury_key)))
        setStatus('ready')
      })
    return () => {
      cancelled = true
    }
  }, [status])

  async function addInjury(row) {
    setError('')
    const { data, error: saveError } = await supabase
      .from('injuries')
      .insert(row)
      .select('id, injury_key, side')
      .single()
    if (saveError) {
      setError("Couldn't save that injury. Check your connection and try again.")
      return false
    }
    setInjuries((current) => [...current, data])
    return true
  }

  async function removeInjury(row) {
    setError('')
    setInjuries((current) => current.filter((item) => item.id !== row.id))
    const { error: deleteError } = await supabase.from('injuries').delete().eq('id', row.id)
    if (deleteError) {
      setInjuries((current) => [...current, row])
      setError("Couldn't remove that injury. Check your connection and try again.")
    }
  }

  if (status === 'loading') return <LoadingCards count={2} label="Loading your injuries" />
  if (status === 'error') {
    return (
      <div>
        <p className="text-red-400">Couldn't load your injuries. Check your connection.</p>
        <button type="button" onClick={() => setStatus('loading')} className={`mt-4 ${buttonSecondary}`}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section>
        <h2 className="font-display text-3xl font-bold uppercase">Your injuries</h2>
        {injuries.length === 0 ? (
          <p className="mt-2 text-neutral-300">No injuries yet. Add one below and it appears on your living map.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {injuries.map((row) => {
              const injury = injuryById(row.injury_key)
              return (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{injury.name}</p>
                    {row.side && <p className="text-sm text-muted">{sideName(row.side)} side</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInjury(row)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-muted hover:text-red-400"
                    aria-label={`Remove ${injury.name}`}
                  >
                    Remove
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {error}
          </p>
        )}
      </section>
      <AddInjury injuries={injuries} onAdd={addInjury} />
    </div>
  )
}
