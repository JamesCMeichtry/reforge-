import { useEffect, useMemo, useState } from 'react'
import { CENTRAL_AREAS, INJURIES, INJURY_GROUPS, TIERS } from '../data/injuries.js'
import { supabase } from '../lib/supabase.js'

const WIDTH = 200
const LOCAL_KEY = 'reforge.injuries.v1'
const BASE_FILL = '#1c1c1c'

// Areas down the middle of the body
const CENTRAL = [
  { front: 'Head', back: 'Head', shape: { type: 'ellipse', cx: 100, cy: 32, rx: 17, ry: 21 } },
  { front: 'Neck', back: 'Neck', shape: { type: 'rect', x: 93, y: 52, w: 14, h: 12, r: 4 } },
  { front: 'Chest', back: 'Upper back', shape: { type: 'rect', x: 80, y: 66, w: 40, h: 38, r: 12 } },
  { front: 'Abdomen', back: 'Lower back', shape: { type: 'rect', x: 80, y: 106, w: 40, h: 40, r: 9 } },
]

// Areas on both sides, drawn for the side on the viewer's left and mirrored for the other side
const PAIRED = [
  { front: 'Shoulder', back: 'Shoulder', shape: { type: 'ellipse', cx: 69, cy: 74, rx: 14, ry: 11 } },
  { front: 'Upper arm', back: 'Upper arm', shape: { type: 'rect', x: 49, y: 85, w: 15, h: 45, r: 7.5 } },
  { front: 'Elbow', back: 'Elbow', shape: { type: 'ellipse', cx: 56, cy: 137, rx: 7, ry: 7 } },
  { front: 'Forearm', back: 'Forearm', shape: { type: 'rect', x: 48, y: 146, w: 14, h: 40, r: 7 } },
  { front: 'Wrist and hand', back: 'Wrist and hand', shape: { type: 'ellipse', cx: 55, cy: 198, rx: 8, ry: 11 } },
  { front: 'Hip', back: 'Glute', shape: { type: 'rect', x: 78, y: 148, w: 21, h: 24, r: 8 } },
  { front: 'Quad', back: 'Hamstring', shape: { type: 'rect', x: 79, y: 175, w: 19, h: 60, r: 9 } },
  { front: 'Knee', back: 'Knee', shape: { type: 'ellipse', cx: 88.5, cy: 245, rx: 9.5, ry: 9 } },
  { front: 'Shin', back: 'Calf', shape: { type: 'rect', x: 81, y: 257, w: 15, h: 56, r: 7.5 } },
  { front: 'Ankle and foot', back: 'Ankle and foot', shape: { type: 'ellipse', cx: 88, cy: 324, rx: 10, ry: 8 } },
]

const slug = (text) => text.toLowerCase().replace(/\s+/g, '-')
const sideName = (side) => (side === 'right' ? 'Right' : 'Left')
const areaId = (area, side) => (CENTRAL_AREAS.includes(area) ? slug(area) : `${side}-${slug(area)}`)

function mirror(shape) {
  if (shape.type === 'rect') return { ...shape, x: WIDTH - shape.x - shape.w }
  return { ...shape, cx: WIDTH - shape.cx }
}

// Front view: the figure's right side appears on the viewer's left. Back view: it doesn't.
function regionsFor(view) {
  const leftOfScreen = view === 'front' ? 'right' : 'left'
  const rightOfScreen = view === 'front' ? 'left' : 'right'
  const regions = CENTRAL.map((area) => ({ id: slug(area[view]), label: area[view], shape: area.shape }))

  for (const area of PAIRED) {
    const name = area[view]
    for (const [side, shape] of [
      [leftOfScreen, area.shape],
      [rightOfScreen, mirror(area.shape)],
    ]) {
      regions.push({ id: `${side}-${slug(name)}`, label: `${sideName(side)} ${name.toLowerCase()}`, shape })
    }
  }
  return regions
}

const REGIONS = { front: regionsFor('front'), back: regionsFor('back') }
const injuryById = (id) => INJURIES.find((injury) => injury.id === id)

// Works out every affected area from the injuries entered, keeping the most serious tier per area
function buildEffects(injuries) {
  const effects = {}
  for (const entry of injuries) {
    const injury = injuryById(entry.injuryId)
    if (!injury) continue
    const injuryLabel = injury.central ? injury.name : `${sideName(entry.side)}: ${injury.name}`

    for (const effect of injury.effects) {
      const sides = CENTRAL_AREAS.includes(effect.area)
        ? [null]
        : injury.central || effect.bothSides
          ? ['right', 'left']
          : [entry.side]

      for (const side of sides) {
        const id = areaId(effect.area, side)
        const current = effects[id] ?? { tier: effect.tier, reasons: [] }
        if (TIERS[effect.tier].rank > TIERS[current.tier].rank) current.tier = effect.tier
        current.reasons.push({ injuryLabel, tier: effect.tier, note: effect.note })
        effects[id] = current
      }
    }
  }
  return effects
}

const fromRow = (row) => ({ id: row.id, injuryId: row.injury_key, side: row.side })

// Injuries saved on this device before accounts existed, moved to the account once
function readLocalInjuries() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_KEY))
    return Array.isArray(saved) ? saved.filter((entry) => injuryById(entry.injuryId)) : []
  } catch {
    return []
  }
}

function clearLocalInjuries() {
  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {
    // Nothing to clear
  }
}

async function fetchInjuries() {
  const { data, error } = await supabase.from('injuries').select('id, injury_key, side').order('created_at')
  if (error) throw error

  const local = readLocalInjuries()
  const toMove = local.filter(
    (entry) => !data.some((row) => row.injury_key === entry.injuryId && row.side === (entry.side ?? null)),
  )
  if (toMove.length === 0) {
    if (local.length) clearLocalInjuries()
    return data.map(fromRow)
  }

  const { data: moved, error: moveError } = await supabase
    .from('injuries')
    .insert(toMove.map((entry) => ({ injury_key: entry.injuryId, side: entry.side ?? null })))
    .select('id, injury_key, side')
  if (moveError) return data.map(fromRow)
  clearLocalInjuries()
  return [...data, ...moved].map(fromRow)
}

function Shape({ shape, ...props }) {
  if (shape.type === 'rect') {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} {...props} />
  }
  return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...props} />
}

function TierDot({ tier, size = 'h-2.5 w-2.5' }) {
  return <span className={`${size} shrink-0 rounded-full`} style={{ backgroundColor: TIERS[tier].fill }} />
}

function AddInjury({ injuries, onAdd }) {
  const [injuryId, setInjuryId] = useState('')
  const [side, setSide] = useState('right')
  const [saving, setSaving] = useState(false)
  const injury = injuryById(injuryId)
  const isDuplicate = injuries.some((entry) => entry.injuryId === injuryId && (injury?.central || entry.side === side))

  async function handleAdd() {
    if (!injury || isDuplicate || saving) return
    setSaving(true)
    const saved = await onAdd({ injuryId, side: injury.central ? null : side })
    setSaving(false)
    if (saved) setInjuryId('')
  }

  return (
    <div className="mt-4 rounded-2xl border border-line bg-panel p-5">
      <h3 className="font-display text-xl font-semibold">Add an injury</h3>
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

      {isDuplicate && <p className="mt-3 text-sm text-muted">That injury is already on your map.</p>}

      <button
        type="button"
        onClick={handleAdd}
        disabled={!injury || isDuplicate || saving}
        className="mt-4 w-full rounded-xl bg-gold py-3 font-semibold text-ink hover:bg-gold-light disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Add to body map'}
      </button>
      <p className="mt-3 text-xs text-muted">
        Not listed? Describing any injury in your own words arrives with AI onboarding.
      </p>
    </div>
  )
}

export default function BodyMap() {
  const [view, setView] = useState('front')
  const [injuries, setInjuries] = useState([])
  const [status, setStatus] = useState('loading')
  const [saveError, setSaveError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    if (status !== 'loading') return
    let cancelled = false
    fetchInjuries()
      .then((rows) => {
        if (cancelled) return
        setInjuries(rows.filter((entry) => injuryById(entry.injuryId)))
        setStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [status])

  async function addInjury({ injuryId, side }) {
    setSaveError('')
    const { data, error } = await supabase
      .from('injuries')
      .insert({ injury_key: injuryId, side })
      .select('id, injury_key, side')
      .single()
    if (error) {
      setSaveError("Couldn't save that injury. Check your connection and try again.")
      return false
    }
    setInjuries((current) => [...current, fromRow(data)])
    return true
  }

  async function removeInjury(entry) {
    setSaveError('')
    setInjuries((current) => current.filter((item) => item.id !== entry.id))
    const { error } = await supabase.from('injuries').delete().eq('id', entry.id)
    if (error) {
      setInjuries((current) => [...current, entry])
      setSaveError("Couldn't remove that injury. Check your connection and try again.")
    }
  }

  const effects = useMemo(() => buildEffects(injuries), [injuries])
  const selected = selectedId ? [...REGIONS.front, ...REGIONS.back].find((r) => r.id === selectedId) : null
  const selectedEffect = selected ? effects[selected.id] : null
  const sideLabels = view === 'front' ? ['Right', 'Left'] : ['Left', 'Right']

  return (
    <div>
      <div className="flex rounded-xl border border-line bg-panel p-1" role="group" aria-label="Body view">
        {['front', 'back'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setView(option)}
            aria-pressed={view === option}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize ${
              view === option ? 'bg-gold text-ink' : 'text-muted hover:text-white'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <svg
        viewBox="0 0 200 352"
        className="mx-auto mt-6 block w-full max-w-[280px]"
        role="group"
        aria-label={`Body, ${view} view`}
      >
        {REGIONS[view].map((region) => {
          const effect = effects[region.id]
          const isSelected = region.id === selectedId
          const select = () => setSelectedId(isSelected ? null : region.id)
          return (
            <Shape
              key={`${view}-${region.id}`}
              shape={region.shape}
              role="button"
              tabIndex={0}
              aria-label={`${region.label}${effect ? `, ${TIERS[effect.tier].label.toLowerCase()}` : ''}`}
              aria-pressed={isSelected}
              onClick={select}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  select()
                }
              }}
              fill={effect ? TIERS[effect.tier].fill : BASE_FILL}
              fillOpacity={effect ? 0.9 : 1}
              stroke={isSelected ? '#ffffff' : '#3a3a3a'}
              strokeWidth={isSelected ? 2.5 : 1}
              className="cursor-pointer outline-none transition-[fill] duration-300 focus-visible:stroke-[#e3c565]"
            />
          )
        })}
        <text x="20" y="348" fill="#9a9a9a" fontSize="9" fontWeight="600" letterSpacing="1">
          {sideLabels[0].toUpperCase()}
        </text>
        <text x="180" y="348" fill="#9a9a9a" fontSize="9" fontWeight="600" letterSpacing="1" textAnchor="end">
          {sideLabels[1].toUpperCase()}
        </text>
      </svg>

      <div className="mt-4 flex justify-center gap-4 text-xs text-muted">
        {Object.entries(TIERS).map(([key, { label }]) => (
          <span key={key} className="flex items-center gap-2">
            <TierDot tier={key} />
            {label}
          </span>
        ))}
      </div>

      {selected && (
        <section className="mt-6 rounded-2xl border border-line bg-panel p-5" aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold">{selected.label}</h2>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-sm font-semibold text-muted hover:text-white"
            >
              Close
            </button>
          </div>
          {selectedEffect ? (
            <ul className="mt-3 space-y-3">
              {[...selectedEffect.reasons]
                .sort((a, b) => TIERS[b.tier].rank - TIERS[a.tier].rank)
                .map((reason, index) => (
                  <li key={index} className="flex gap-3">
                    <TierDot tier={reason.tier} size="mt-1.5 h-2.5 w-2.5" />
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {TIERS[reason.tier].label} · {reason.injuryLabel}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-neutral-300">{reason.note}</p>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-2 text-neutral-300">Not affected by any injury on your map.</p>
          )}
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-display text-3xl font-bold uppercase">Your injuries</h2>
        {status === 'loading' ? (
          <p className="mt-2 text-muted">Loading your injuries…</p>
        ) : status === 'error' ? (
          <div className="mt-2">
            <p className="text-red-400">Couldn't load your injuries. Check your connection.</p>
            <button
              type="button"
              onClick={() => setStatus('loading')}
              className="mt-3 rounded-xl border border-line px-4 py-2 text-sm font-semibold text-white hover:border-gold"
            >
              Try again
            </button>
          </div>
        ) : injuries.length === 0 ? (
          <p className="mt-2 text-neutral-300">
            Add an injury and the map lights up the areas it affects, coloured by how much they change your training.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {injuries.map((entry) => {
              const injury = injuryById(entry.injuryId)
              return (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-panel px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{injury.name}</p>
                    {entry.side && <p className="text-sm text-muted">{sideName(entry.side)} side</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeInjury(entry)}
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
        {saveError && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {saveError}
          </p>
        )}
        {status === 'ready' && <AddInjury injuries={injuries} onAdd={addInjury} />}
      </section>

      <p className="mt-6 text-xs text-muted">Saved to your account, so it's the same on every device.</p>
    </div>
  )
}
