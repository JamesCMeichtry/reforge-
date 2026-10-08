import { useEffect, useMemo, useState } from 'react'
import { JOINTS, MUSCLES, OUTLINE, WIDTH, musclesForExercise } from '../data/muscles.js'
import { fetchRecentCheckIns } from '../lib/checkins.js'
import { fetchActiveProgramme } from '../lib/programme.js'
import { fetchSetHistory } from '../lib/progress.js'
import { LEVELS, combine, fetchInjuryRows, injuryLayer, nextStep, shapeKey, strengthLayer } from '../lib/livingMap.js'
import { LoadingCards, buttonSecondary } from './ui.jsx'

const SEEN_KEY = 'reforge.levels.seen.v1'
const STRENGTH_ORDER = ['neutral', 'building', 'strong', 'elite']

// Smooth closed outline through a list of points
function smooth(points, tension = 0.5) {
  const n = points.length
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n]
    const p1 = points[i]
    const p2 = points[(i + 1) % n]
    const p3 = points[(i + 2) % n]
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3]
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3]
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`
  }
  return `${d}Z`
}

const mirror = (points) => points.map(([x, y]) => [WIDTH - x, y])
const OUTLINE_PATH = smooth(OUTLINE, 0.35)
const sideName = (side) => (side === 'right' ? 'Right' : 'Left')

// Front view: the figure's right side is on the viewer's left
function shapesFor(view) {
  const leftOfScreen = view === 'front' ? 'right' : 'left'
  const rightOfScreen = view === 'front' ? 'left' : 'right'
  const build = (item, kind) =>
    item.central
      ? [{ ...item, kind, key: item.id, side: null, d: item.ellipse ? null : smooth(item.points) }]
      : [
          { ...item, kind, key: shapeKey(item.id, leftOfScreen), side: leftOfScreen, d: smooth(item.points) },
          { ...item, kind, key: shapeKey(item.id, rightOfScreen), side: rightOfScreen, d: smooth(mirror(item.points)) },
        ]
  return [...JOINTS.flatMap((j) => build(j, 'joint')), ...MUSCLES[view].flatMap((m) => build(m, 'muscle'))]
}

const SHAPES = { front: shapesFor('front'), back: shapesFor('back') }
const ALL_SHAPES = [...SHAPES.front, ...SHAPES.back]
const labelOf = (shape) => `${shape.side ? `${sideName(shape.side)} ` : ''}${shape.name.toLowerCase()}`

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) ?? null
  } catch {
    return null
  }
}

function writeSeen(levels) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(levels))
  } catch {
    // Level-up messages just won't show in private browsing
  }
}

export default function LivingMap() {
  const [view, setView] = useState('front')
  const [state, setState] = useState({ status: 'loading' })
  const [selected, setSelected] = useState(null)
  const [levelUps, setLevelUps] = useState([])

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([fetchInjuryRows(), fetchRecentCheckIns(56), fetchSetHistory(56), fetchActiveProgramme()])
      .then(([rows, checkIns, history, programme]) => {
        if (cancelled) return
        setState({
          status: 'ready',
          injuries: injuryLayer(rows, checkIns),
          strength: strengthLayer(history),
          programme,
        })
      })
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status])

  const display = useMemo(() => {
    if (state.status !== 'ready') return {}
    const out = {}
    for (const shape of ALL_SHAPES) {
      out[shape.key] = combine(state.injuries[shape.key], shape.kind === 'muscle' ? state.strength[shape.id] : null)
    }
    return out
  }, [state])

  // Celebrate muscles that reached a higher strength level since the last visit
  useEffect(() => {
    if (state.status !== 'ready') return
    const now = {}
    for (const [id, s] of Object.entries(state.strength)) now[id] = s.level
    const seen = readSeen()
    if (seen) {
      const names = new Map(ALL_SHAPES.map((s) => [s.id, s.name]))
      const ups = Object.entries(now)
        .filter(([id, level]) => STRENGTH_ORDER.indexOf(level) > STRENGTH_ORDER.indexOf(seen[id] ?? 'neutral'))
        .map(([id, level]) => ({ name: names.get(id), level }))
        .filter((u) => u.name)
      setLevelUps(ups)
    }
    writeSeen(now)
  }, [state])

  const counts = useMemo(() => {
    const tally = {}
    const seenIds = new Set()
    for (const shape of ALL_SHAPES) {
      if (shape.kind !== 'muscle' || seenIds.has(shape.key)) continue
      seenIds.add(shape.key)
      const level = display[shape.key]?.level
      if (level) tally[level] = (tally[level] ?? 0) + 1
    }
    return tally
  }, [display])

  if (state.status === 'loading') return <LoadingCards count={1} height="h-[480px]" label="Loading your body map" />
  if (state.status === 'error') {
    return (
      <div>
        <p className="text-red-400">Couldn't load your body map. Check your connection.</p>
        <button type="button" onClick={() => setState({ status: 'loading' })} className={`mt-4 ${buttonSecondary}`}>
          Try again
        </button>
      </div>
    )
  }

  const selectedShape = selected ? ALL_SHAPES.find((s) => s.key === selected) : null
  const sideLabels = view === 'front' ? ['Right', 'Left'] : ['Left', 'Right']

  return (
    <div>
      {levelUps.length > 0 && (
        <section className="celebrate mb-5 rounded-2xl border border-gold/60 bg-panel p-4" role="status">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Level up</p>
          <ul className="mt-2 space-y-1">
            {levelUps.slice(0, 4).map((u) => (
              <li key={u.name} className="font-semibold text-white">
                {u.name} reached <span style={{ color: LEVELS[u.level].fill }}>{LEVELS[u.level].label}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setLevelUps([])}
            className="mt-3 text-sm font-semibold text-muted hover:text-white"
          >
            Nice, close
          </button>
        </section>
      )}

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
        viewBox="20 0 160 400"
        className="mx-auto mt-6 block w-full max-w-[300px] overflow-visible"
        role="group"
        aria-label={`Living body map, ${view} view`}
      >
        <defs>
          <filter id="glow-strong" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="elite-shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8a6d12" />
            <stop offset="45%" stopColor="#c9a227" />
            <stop offset="55%" stopColor="#f5dd85" />
            <stop offset="100%" stopColor="#c9a227" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-1 -1; 1 1"
              dur="3.5s"
              repeatCount="indefinite"
            />
          </linearGradient>
        </defs>
        <path d={OUTLINE_PATH} fill="#0c0c0c" stroke="#2a2a2a" strokeWidth="1" />
        {SHAPES[view].map((shape) => {
          const shown = display[shape.key] ?? { level: 'neutral' }
          const level = shown.level
          const isSelected = shape.key === selected
          const flare = state.injuries[shape.key]?.flare && level === 'injured'
          const fill =
            level === 'elite'
              ? 'url(#elite-shine)'
              : level === 'neutral'
                ? shape.kind === 'joint'
                  ? '#141414'
                  : '#222222'
                : LEVELS[level].fill
          const select = () => setSelected(isSelected ? null : shape.key)
          const props = {
            role: 'button',
            tabIndex: 0,
            'aria-label': `${labelOf(shape)}, ${LEVELS[level].label.toLowerCase()}`,
            'aria-pressed': isSelected,
            onClick: select,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                select()
              }
            },
            fill,
            fillOpacity: level === 'neutral' ? 1 : 0.92,
            stroke: isSelected
              ? '#ffffff'
              : level === 'neutral'
                ? shape.kind === 'joint'
                  ? '#2c2c2c'
                  : '#3a3a3a'
                : '#0c0c0c',
            strokeWidth: isSelected ? 2 : 0.8,
            filter: level === 'strong' || level === 'elite' ? 'url(#glow-strong)' : undefined,
            className: `cursor-pointer outline-none transition-[fill,fill-opacity] duration-500 focus-visible:stroke-[#e3c565] ${
              flare ? 'flare-pulse' : ''
            }`,
          }
          return (
            <g key={`${view}-${shape.key}`}>
              {shape.ellipse ? <ellipse {...shape.ellipse} {...props} /> : <path d={shape.d} {...props} />}
              {shape.lines?.map(([from, to], i) => (
                <path key={i} d={`M${from} L${to}`} stroke="#0c0c0c" strokeWidth="1.2" pointerEvents="none" />
              ))}
            </g>
          )
        })}
        <text x="30" y="398" fill="#9a9a9a" fontSize="8" fontWeight="600" letterSpacing="1">
          {sideLabels[0].toUpperCase()}
        </text>
        <text x="170" y="398" fill="#9a9a9a" fontSize="8" fontWeight="600" letterSpacing="1" textAnchor="end">
          {sideLabels[1].toUpperCase()}
        </text>
      </svg>

      <div className="mt-5" aria-label="Scale">
        <div className="flex h-2 overflow-hidden rounded-full">
          {Object.entries(LEVELS).map(([key, { fill }]) => (
            <span key={key} className="flex-1" style={{ backgroundColor: key === 'neutral' ? '#333333' : fill }} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-[10px] leading-tight text-muted">
          {Object.entries(LEVELS).map(([key, { label }]) => (
            <span key={key}>
              {label}
              {counts[key] ? <span className="block font-semibold text-white">{counts[key]}</span> : null}
            </span>
          ))}
        </div>
      </div>

      {selectedShape && (
        <AreaPanel
          shape={selectedShape}
          shown={display[selectedShape.key]}
          injury={state.injuries[selectedShape.key]}
          strength={selectedShape.kind === 'muscle' ? state.strength[selectedShape.id] : null}
          programme={state.programme}
          onClose={() => setSelected(null)}
        />
      )}

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Injury colours move with your check-ins: a bad day shows straight away, recovery needs a run of good ones.
        Muscles earn blue, then gold, from consistent training and rising lifts. An injured area can't level up until it
        settles.
      </p>
    </div>
  )
}

function AreaPanel({ shape, shown, injury, strength, programme, onClose }) {
  const level = shown?.level ?? 'neutral'
  const exercises = []
  if (shape.kind === 'muscle') {
    for (const day of programme?.days ?? []) {
      for (const exercise of day.exercises) {
        const { primary, secondary } = musclesForExercise(exercise.name)
        if (primary.includes(shape.id) || secondary.includes(shape.id)) {
          exercises.push({ name: exercise.name, day: day.name, main: primary.includes(shape.id) })
        }
      }
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-line bg-panel p-5" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold leading-tight">{labelOf(shape)}</h2>
          <p
            className="mt-1 text-sm font-semibold"
            style={{ color: level === 'neutral' ? '#9a9a9a' : LEVELS[level].fill }}
          >
            {LEVELS[level].label}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-muted hover:text-white">
          Close
        </button>
      </div>

      {injury && (
        <ul className="mt-4 space-y-3">
          {injury.reasons.map((reason, i) => (
            <li key={i} className="flex gap-3">
              <span
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: LEVELS[reason.level].fill }}
              />
              <div>
                <p className="text-sm font-semibold text-white">{reason.injuryLabel}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-neutral-300">{reason.note}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {shape.kind === 'muscle' && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm text-neutral-300">
            Trained {strength?.last4 ?? 0} of the last 4 weeks
            {strength?.change != null &&
              (Math.abs(strength.change) < 0.01
                ? ' · lifts steady'
                : ` · lifts ${strength.change > 0 ? 'up' : 'down'} ${Math.abs(Math.round(strength.change * 100))}%`)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {injury && injury.level !== 'watch' ? 'Strength levels unlock once this area settles.' : nextStep(strength)}
          </p>
          {exercises.length > 0 && (
            <ul className="mt-3 space-y-1">
              {exercises.map((e) => (
                <li key={`${e.day}-${e.name}`} className="text-sm text-white">
                  {e.name}{' '}
                  <span className="text-muted">
                    · {e.day}
                    {e.main ? '' : ' · also worked'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
