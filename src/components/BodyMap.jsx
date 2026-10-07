import { useEffect, useMemo, useState } from 'react'

const WIDTH = 200
const STORAGE_KEY = 'reforge.bodymap.v1'

const STATUS = {
  active: { label: 'Active injury', short: 'Active', fill: '#dc2626' },
  monitor: { label: 'Monitor', short: 'Monitor', fill: '#f59e0b' },
}

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
      regions.push({
        id: `${side}-${slug(name)}`,
        label: `${side === 'right' ? 'Right' : 'Left'} ${name.toLowerCase()}`,
        shape,
      })
    }
  }
  return regions
}

const REGIONS = { front: regionsFor('front'), back: regionsFor('back') }

function findRegion(id) {
  for (const view of ['front', 'back']) {
    const region = REGIONS[view].find((r) => r.id === id)
    if (region) return { view, region }
  }
  return null
}

function loadStatuses() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

function Shape({ shape, ...props }) {
  if (shape.type === 'rect') {
    return <rect x={shape.x} y={shape.y} width={shape.w} height={shape.h} rx={shape.r} {...props} />
  }
  return <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...props} />
}

export default function BodyMap() {
  const [view, setView] = useState('front')
  const [statuses, setStatuses] = useState(loadStatuses)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses))
    } catch {
      // Storage can be unavailable in private browsing; the map still works for this visit
    }
  }, [statuses])

  const selected = selectedId ? findRegion(selectedId)?.region : null
  const marked = useMemo(
    () =>
      Object.entries(statuses)
        .map(([id, status]) => ({ id, status, label: findRegion(id)?.region.label }))
        .filter((item) => item.label),
    [statuses],
  )

  function setStatus(id, status) {
    setStatuses((current) => {
      const next = { ...current }
      if (status) next[id] = status
      else delete next[id]
      return next
    })
  }

  function selectFromList(id) {
    const found = findRegion(id)
    if (!found) return
    if (!REGIONS[view].some((r) => r.id === id)) setView(found.view)
    setSelectedId(id)
  }

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

      <svg viewBox="0 0 200 352" className="mx-auto mt-6 block w-full max-w-[280px]" role="group" aria-label={`Body, ${view} view`}>
        {REGIONS[view].map((region) => {
          const status = statuses[region.id]
          const isSelected = region.id === selectedId
          return (
            <Shape
              key={`${view}-${region.id}`}
              shape={region.shape}
              role="button"
              tabIndex={0}
              aria-label={`${region.label}${status ? `, ${STATUS[status].label.toLowerCase()}` : ''}`}
              aria-pressed={isSelected}
              onClick={() => setSelectedId(isSelected ? null : region.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedId(isSelected ? null : region.id)
                }
              }}
              fill={status ? STATUS[status].fill : '#1c1c1c'}
              fillOpacity={status ? 0.85 : 1}
              stroke={isSelected ? '#c9a227' : '#3a3a3a'}
              strokeWidth={isSelected ? 2.5 : 1}
              className="cursor-pointer outline-none transition-[fill] duration-200 focus-visible:stroke-[#e3c565]"
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

      <div className="mt-4 flex justify-center gap-5 text-xs text-muted">
        {Object.entries(STATUS).map(([key, { label, fill }]) => (
          <span key={key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fill }} />
            {label}
          </span>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-line bg-panel p-5" aria-live="polite">
        {selected ? (
          <>
            <h2 className="font-display text-2xl font-semibold">{selected.label}</h2>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {Object.entries(STATUS).map(([key, { short, fill }]) => {
                const isCurrent = statuses[selected.id] === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatus(selected.id, key)}
                    aria-pressed={isCurrent}
                    className="rounded-xl border px-2 py-2.5 text-sm font-semibold"
                    style={{
                      borderColor: isCurrent ? fill : '#262626',
                      backgroundColor: isCurrent ? fill : 'transparent',
                      color: isCurrent ? '#000000' : '#ffffff',
                    }}
                  >
                    {short}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setStatus(selected.id, null)}
                disabled={!statuses[selected.id]}
                className="rounded-xl border border-line px-2 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display text-2xl font-semibold">Tap an area</h2>
            <p className="mt-2 leading-relaxed text-neutral-300">
              Mark anywhere that's injured or worth keeping an eye on. Flip to the back for hamstrings, glutes and
              your lower back.
            </p>
          </>
        )}
      </section>

      {marked.length > 0 && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold text-muted">Marked areas</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {marked.map(({ id, status, label }) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => selectFromList(id)}
                  className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-sm text-white hover:border-gold"
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS[status].fill }} />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-xs text-muted">Saved on this device for now. It moves to your account when we add the database.</p>
    </div>
  )
}
