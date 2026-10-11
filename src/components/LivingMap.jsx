import { useEffect, useMemo, useState } from 'react'
import { ABS_LINES, DETAILS, FIGURE, INJURY_STRUCTURES, NAMES, STRUCTURES, WIDTH } from '../data/anatomy.js'
import { FIGURE_DETAILED } from '../data/anatomyDetailed.js'
import { INJURIES } from '../data/injuries.js'
import { musclesForExercise } from '../data/muscles.js'
import { fetchRecentCheckIns } from '../lib/checkins.js'
import { fetchActiveProgramme } from '../lib/programme.js'
import { fetchSetHistory } from '../lib/progress.js'
import { LEVELS, XP, XP_LEVELS, combine, fetchInjuryRows, injuryLayer, nextStep, shapeKey, strengthLayer } from '../lib/livingMap.js'
import { LoadingCards, buttonSecondary } from './ui.jsx'

const SEEN_KEY = 'reforge.levels.seen.v1'
const STYLE_KEY = 'reforge.mapStyle'

// Colours for each level come from the theme (see index.css), so they suit dark and light
const FILLS = {
  injured: 'var(--lvl-injured)',
  affected: 'var(--lvl-affected)',
  watch: 'var(--lvl-watch)',
  neutral: 'var(--fig-muscle)',
  building: 'var(--lvl-building)',
  strong: 'var(--lvl-strong)',
  elite: 'var(--color-gold)',
}
const tone = (level) => (level === 'watch' ? 'var(--lvl-watch-text)' : FILLS[level])
const STRENGTH_ORDER = ['neutral', 'building', 'strong', 'elite']
const ORDER = ['injured', 'affected', 'watch', 'neutral', 'building', 'strong', 'elite']
// Each level has its own movement: injuries throb, recovering areas breathe, strong muscles glow
const MOTION = { injured: 'lvl-throb', affected: 'lvl-breathe', strong: 'lvl-glow', elite: 'lvl-glow' }

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
const parse = (text) => text.split(' ').map((pair) => pair.split(',').map(Number))
const polygon = (points) => `M${points.map(([x, y]) => `${x},${y}`).join(' L')}Z`
const openPath = (points) => {
  if (points.length === 2) return `M${points[0]} L${points[1]}`
  let d = `M${points[0][0]},${points[0][1]}`
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1]
    const [x, y] = points[i]
    d += ` Q${px},${py} ${((px + x) / 2).toFixed(1)},${((py + y) / 2).toFixed(1)}`
  }
  const last = points.at(-1)
  return `${d} L${last[0]},${last[1]}`
}
const sideName = (side) => (side === 'right' ? 'Right' : 'Left')

const mirrorAngle = (angle) => (angle == null ? null : (180 - angle) % 180)

// Front view: the figure's right side is on the viewer's left.
// Classic rows are [id, kind, central, points]; detailed rows add a fibre angle before the points.
function shapesFor(figure, view, detailed) {
  const leftOfScreen = view === 'front' ? 'right' : 'left'
  const rightOfScreen = view === 'front' ? 'left' : 'right'
  return figure[view].shapes.flatMap((row) => {
    const [id, kind, central] = row
    const angle = detailed ? row[3] : null
    const points = parse(detailed ? row[4] : row[3])
    const base = { id, kind, name: NAMES[id], lines: !detailed && id === 'abs' ? ABS_LINES : null }
    if (central) return [{ ...base, key: id, side: null, angle, d: polygon(points) }]
    return [
      { ...base, key: shapeKey(id, leftOfScreen), side: leftOfScreen, angle, d: polygon(points) },
      { ...base, key: shapeKey(id, rightOfScreen), side: rightOfScreen, angle: mirrorAngle(angle), d: polygon(mirror(points)) },
    ]
  })
}

function buildFigure(figure, detailed) {
  const shapes = { front: shapesFor(figure, 'front', detailed), back: shapesFor(figure, 'back', detailed) }
  const all = [...shapes.front, ...shapes.back]
  return {
    detailed,
    shapes,
    all,
    outlines: { front: polygon(parse(figure.front.outline)), back: polygon(parse(figure.back.outline)) },
    angles: [...new Set(all.map((s) => s.angle).filter((a) => a != null))],
  }
}

const FIGURES = { classic: buildFigure(FIGURE, false), detailed: buildFigure(FIGURE_DETAILED, true) }

function readStyle() {
  try {
    return localStorage.getItem(STYLE_KEY) === 'classic' ? 'classic' : 'detailed'
  } catch {
    return 'detailed'
  }
}

// Fine anatomical lines (neck, collarbones, fingers, toes) drawn over the figure
function detailsFor(view) {
  const { central, sided } = DETAILS[view]
  return [...central, ...sided, ...sided.map(mirror)].map(openPath)
}

// Tendons and ligaments drawn on this view, one copy per side
function structuresFor(view) {
  const leftOfScreen = view === 'front' ? 'right' : 'left'
  const rightOfScreen = view === 'front' ? 'left' : 'right'
  const out = []
  for (const [id, s] of Object.entries(STRUCTURES)) {
    if (s.internal || s.view !== view) continue
    for (const [side, flip] of [
      [leftOfScreen, false],
      [rightOfScreen, true],
    ]) {
      const place = (points) => (flip ? mirror(points) : points)
      out.push({
        id,
        side,
        key: `${side}-${id}`,
        d: s.closed ? smooth(place(s.closed)) : s.lines.map((line) => openPath(place(line))).join(' '),
        closed: Boolean(s.closed),
        width: s.width ?? (s.kind === 'Tendon' ? 1.5 : 1.1),
      })
    }
  }
  return out
}

// Which tendons and ligaments your injuries involve, coloured by how that area is doing
function structureLayer(rows, injuries) {
  const layer = {}
  for (const row of rows) {
    const injury = INJURIES.find((item) => item.id === row.injury_key)
    if (!injury || !row.side) continue
    for (const [id, note] of INJURY_STRUCTURES[row.injury_key] ?? []) {
      const structure = STRUCTURES[id]
      if (!structure) continue
      const area = injuries[shapeKey(structure.shape, row.side)]
      const key = `${row.side}-${id}`
      const entry = (layer[key] ??= { id, side: row.side, level: area?.level ?? 'injured', flare: false, notes: [] })
      if (area && LEVELS[area.level].rank < LEVELS[entry.level].rank) entry.level = area.level
      entry.flare ||= Boolean(area?.flare)
      entry.notes.push({ injury: injury.name, note })
    }
  }
  return layer
}

const DETAIL_PATHS = { front: detailsFor('front'), back: detailsFor('back') }
const STRUCTURE_SHAPES = { front: structuresFor('front'), back: structuresFor('back') }

const ALL_SHAPES = FIGURES.classic.all
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
  const [figureStyle, setFigureStyle] = useState(readStyle)
  // Testing only: preview colours without real data
  const [testing, setTesting] = useState(false)
  const [testAll, setTestAll] = useState(null)
  const [testOverrides, setTestOverrides] = useState({})
  // Muscles that just levelled up get a pop; n replays the animation
  const [pop, setPop] = useState({ keys: new Set(), n: 0 })
  const figure = FIGURES[figureStyle]
  const chooseStyle = (next) => {
    setFigureStyle(next)
    try {
      localStorage.setItem(STYLE_KEY, next)
    } catch {
      // Falls back to the default next time
    }
  }

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([fetchInjuryRows(), fetchRecentCheckIns(365), fetchSetHistory(365), fetchActiveProgramme()])
      .then(([rows, checkIns, history, programme]) => {
        if (cancelled) return
        setState({
          status: 'ready',
          injuries: injuryLayer(rows, checkIns),
          structures: structureLayer(rows, injuryLayer(rows, checkIns)),
          strength: strengthLayer(history, checkIns),
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
      if (testing) {
        if (testAll) out[shape.key] = { level: testAll }
        if (testOverrides[shape.key]) out[shape.key] = { level: testOverrides[shape.key] }
      }
    }
    return out
  }, [state, testing, testAll, testOverrides])

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
        .map(([id, level]) => ({ id, name: names.get(id), level }))
        .filter((u) => u.name)
      setLevelUps(ups)
      if (ups.length) {
        const ids = new Set(ups.map((u) => u.id))
        setPop({ keys: new Set(ALL_SHAPES.filter((s) => ids.has(s.id)).map((s) => s.key)), n: 1 })
      }
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
  const selectedStructure = selected?.startsWith('structure:') ? state.structures[selected.slice(10)] : null
  const involvedIn = (shape) =>
    Object.values(state.structures).filter(
      (entry) => entry.side === shape.side && STRUCTURES[entry.id].shape === shape.id,
    )
  const sideLabels = view === 'front' ? ['Right', 'Left'] : ['Left', 'Right']
  const testLevel = selectedShape ? (display[selectedShape.key]?.level ?? 'neutral') : (testAll ?? 'neutral')
  const stepTest = (direction) => {
    const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(testLevel) + direction))]
    if (selectedShape) setTestOverrides((current) => ({ ...current, [selectedShape.key]: next }))
    else {
      setTestAll(next)
      setTestOverrides({})
    }
    // Preview the level-up pop when going up into a strength level
    if (direction > 0 && ORDER.indexOf(next) > ORDER.indexOf('neutral')) {
      setPop((current) => ({
        keys: new Set(selectedShape ? [selectedShape.key] : ALL_SHAPES.map((s) => s.key)),
        n: current.n + 1,
      }))
    }
  }

  return (
    <div>
      {levelUps.length > 0 && (
        <section className="celebrate mb-5 rounded-2xl border border-gold/60 bg-panel p-4" role="status">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Level up</p>
          <ul className="mt-2 space-y-1">
            {levelUps.slice(0, 4).map((u) => (
              <li key={u.id} className="font-semibold text-white">
                {u.name} reached <span style={{ color: tone(u.level) }}>{LEVELS[u.level].label}</span>
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
          <linearGradient id="sheen" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.13" />
            <stop offset="0.45" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.28" />
          </linearGradient>
          {figure.angles.map((angle) => (
            <pattern
              key={angle}
              id={`fibre-${angle}`}
              width="1.7"
              height="1.7"
              patternUnits="userSpaceOnUse"
              patternTransform={`rotate(${angle})`}
            >
              <line x1="0" y1="0.85" x2="1.7" y2="0.85" style={{ stroke: 'var(--fig-fibre)' }} strokeWidth="0.4" />
            </pattern>
          ))}
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
        <path d={figure.outlines[view]} style={{ fill: 'var(--fig-body)', stroke: 'var(--fig-outline)' }} strokeWidth="1" />
        {figure.shapes[view].map((shape, index) => {
          const shown = display[shape.key] ?? { level: 'neutral' }
          const level = shown.level
          const isSelected = shape.key === selected
          const flare = state.injuries[shape.key]?.flare && level === 'injured'
          const fill =
            level === 'elite'
              ? 'url(#elite-shine)'
              : level === 'neutral' && shape.kind === 'joint'
                ? 'var(--fig-joint)'
                : FILLS[level]
          const stroke = isSelected ? 'var(--fig-selected)' : 'none'
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
            style: { fill, stroke },
            strokeWidth: isSelected ? 1.4 : 0,
            filter: level === 'strong' || level === 'elite' ? 'url(#glow-strong)' : undefined,
            className: `cursor-pointer outline-none transition-[fill,fill-opacity] duration-500 focus-visible:stroke-[#e3c565] ${
              flare ? 'flare-pulse' : ''
            }`,
          }
          const popping = pop.keys.has(shape.key)
          const motion = flare ? '' : (MOTION[level] ?? '')
          return (
            <g
              key={`${figureStyle}-${view}-${index}-${popping ? pop.n : 0}`}
              className={`${motion} ${popping ? 'level-pop' : ''}`}
            >
              <path d={shape.d} {...props} />
              {figure.detailed && shape.angle != null && (
                <path
                  d={shape.d}
                  fill={`url(#fibre-${shape.angle})`}
                  style={{ opacity: 'var(--fig-fibre-opacity)' }}
                  pointerEvents="none"
                />
              )}
              {figure.detailed && <path d={shape.d} fill="url(#sheen)" pointerEvents="none" />}
              {shape.lines?.map(([from, to], i) => (
                <path
                  key={i}
                  d={`M${from} L${to}`}
                  style={{ stroke: 'var(--fig-body)' }}
                  strokeWidth="1.4"
                  pointerEvents="none"
                />
              ))}
            </g>
          )
        })}
        {DETAIL_PATHS[view].map((d, i) => (
          <path
            key={`detail-${i}`}
            d={d}
            fill="none"
            style={{ stroke: 'var(--fig-edge)' }}
            strokeWidth="0.7"
            strokeLinecap="round"
            pointerEvents="none"
          />
        ))}
        {STRUCTURE_SHAPES[view].map((item) => {
          const lit = state.structures[item.key]
          if (item.closed && !lit) return null
          const selectKey = `structure:${item.key}`
          const isSelected = selected === selectKey
          const colour = lit ? tone(lit.level) : 'var(--fig-tendon)'
          const select = () => setSelected(isSelected ? null : selectKey)
          return (
            <g
              key={item.key}
              {...(lit
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `${sideName(item.side)} ${STRUCTURES[item.id].name}, involved in your injury`,
                    'aria-pressed': isSelected,
                    onClick: select,
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        select()
                      }
                    },
                    className: 'cursor-pointer outline-none',
                  }
                : { pointerEvents: 'none' })}
            >
              {lit && <path d={item.d} fill="none" stroke="transparent" strokeWidth="8" strokeLinecap="round" />}
              {lit && (
                <path
                  d={item.d}
                  fill="none"
                  style={{ stroke: 'var(--fig-body)' }}
                  strokeWidth={item.width + 3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              <path
                d={item.d}
                style={{
                  stroke: isSelected ? 'var(--fig-selected)' : colour,
                  fill: item.closed && lit ? colour : 'none',
                  fillOpacity: lit ? 0.85 : 1,
                  opacity: lit ? 1 : 0.35,
                }}
                strokeWidth={lit ? item.width + 1 : item.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={lit ? 'url(#glow-strong)' : undefined}
                className={lit?.flare && lit.level === 'injured' ? 'stage-pulse' : undefined}
              />
            </g>
          )
        })}
        <text x="30" y="398" style={{ fill: 'var(--color-muted)' }} fontSize="8" fontWeight="600" letterSpacing="1">
          {sideLabels[0].toUpperCase()}
        </text>
        <text
          x="170"
          y="398"
          style={{ fill: 'var(--color-muted)' }}
          fontSize="8"
          fontWeight="600"
          letterSpacing="1"
          textAnchor="end"
        >
          {sideLabels[1].toUpperCase()}
        </text>
      </svg>

      <div className="mt-5" aria-label="Scale">
        <div className="flex h-2 overflow-hidden rounded-full">
          {Object.keys(LEVELS).map((key) => (
            <span
              key={key}
              className="flex-1"
              style={{ backgroundColor: FILLS[key] }}
            />
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

      {testing && (
        <div className="mt-4 rounded-2xl border border-dashed border-gold/60 p-3">
          <p className="text-center text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Testing only</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => stepTest(-1)}
              aria-label="Lower level"
              className="h-11 w-11 shrink-0 rounded-xl border border-line text-2xl font-bold text-white"
            >
              −
            </button>
            <div className="min-w-0 text-center">
              <p className="truncate text-sm font-semibold text-white">
                {selectedShape ? labelOf(selectedShape) : 'Whole body'}
              </p>
              <p className="text-sm font-semibold" style={{ color: testLevel === 'neutral' ? 'var(--color-muted)' : tone(testLevel) }}>
                {LEVELS[testLevel].label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => stepTest(1)}
              aria-label="Raise level"
              className="h-11 w-11 shrink-0 rounded-xl border border-line text-2xl font-bold text-white"
            >
              +
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Tap an area to change just that one, or tap it again to go back to the whole body.{' '}
            <button
              type="button"
              onClick={() => {
                setTestAll(null)
                setTestOverrides({})
              }}
              className="font-semibold text-gold"
            >
              Reset
            </button>
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted" role="group" aria-label="Figure style">
        <span>Figure</span>
        {['detailed', 'classic'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => chooseStyle(option)}
            aria-pressed={figureStyle === option}
            className={`rounded-full border px-3 py-1 font-semibold capitalize ${
              figureStyle === option ? 'border-gold text-gold' : 'border-line text-muted'
            }`}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setTesting((on) => !on)
            setTestAll(null)
            setTestOverrides({})
          }}
          aria-pressed={testing}
          className={`rounded-full border border-dashed px-3 py-1 font-semibold ${
            testing ? 'border-gold text-gold' : 'border-line text-muted'
          }`}
        >
          Test colours
        </button>
      </div>

      {selectedShape && (
        <AreaPanel
          shape={selectedShape}
          shown={display[selectedShape.key]}
          injury={state.injuries[selectedShape.key]}
          strength={selectedShape.kind === 'muscle' ? state.strength[selectedShape.id] : null}
          programme={state.programme}
          involved={involvedIn(selectedShape)}
          onClose={() => setSelected(null)}
        />
      )}
      {selectedStructure && <StructurePanel entry={selectedStructure} onClose={() => setSelected(null)} />}

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Injury colours move with your check-ins: a bad day shows straight away, recovery needs a run of good ones.
        Muscles level up with XP: {XP.primarySet} for every set that works them, {XP.secondarySet} when they help out, and{' '}
        {XP.checkIn} for each check-in in a week you trained them. {XP_LEVELS[0].xp} XP is Building, {XP_LEVELS[1].xp} Strong and{' '}
        {XP_LEVELS[2].xp.toLocaleString('en-GB')} Elite. Leave one untrained for 3 weeks and it starts to fade. An injured area can't level
        up until it settles.
      </p>
    </div>
  )
}

function StructureNotes({ entry }) {
  const structure = STRUCTURES[entry.id]
  return (
    <li className="flex gap-3">
      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tone(entry.level) }} />
      <div>
        <p className="text-sm font-semibold text-white">
          {structure.name}
          <span className="font-normal text-muted">
            {' '}
            · {structure.kind.toLowerCase()}
            {structure.internal ? ', inside the joint' : ''}
          </span>
        </p>
        {entry.notes.map((n) => (
          <p key={n.injury} className="mt-0.5 text-sm leading-relaxed text-neutral-300">
            {n.note}
          </p>
        ))}
      </div>
    </li>
  )
}

function StructurePanel({ entry, onClose }) {
  const structure = STRUCTURES[entry.id]
  return (
    <section className="mt-6 rounded-2xl border border-line bg-panel p-5" aria-live="polite">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold leading-tight">
            {sideName(entry.side)} {structure.name.replace(/ \(.*\)$/, '')}
          </h2>
          <p className="mt-1 text-sm font-semibold" style={{ color: tone(entry.level) }}>
            {structure.kind} · {LEVELS[entry.level].label}
          </p>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-muted hover:text-white">
          Close
        </button>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-neutral-300">{structure.about}</p>
      <ul className="mt-4 space-y-3">
        {entry.notes.map((n) => (
          <li key={n.injury}>
            <p className="text-sm font-semibold text-white">{n.injury}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-neutral-300">{n.note}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AreaPanel({ shape, shown, injury, strength, programme, involved = [], onClose }) {
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
            style={{ color: level === 'neutral' ? 'var(--color-muted)' : tone(level) }}
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
                style={{ backgroundColor: tone(reason.level) }}
              />
              <div>
                <p className="text-sm font-semibold text-white">{reason.injuryLabel}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-neutral-300">{reason.note}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {involved.length > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Tendons and ligaments</p>
          <ul className="mt-3 space-y-3">
            {involved.map((entry) => (
              <StructureNotes key={entry.id} entry={entry} />
            ))}
          </ul>
        </div>
      )}

      {shape.kind === 'muscle' && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-bold uppercase tracking-[0.2em] text-gold">XP</span>
            <span className="text-muted">
              {(strength?.xp ?? 0).toLocaleString('en-GB')}
              {strength?.next ? ` / ${strength.next.xp.toLocaleString('en-GB')}` : ' · max level'}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-700"
              style={{ width: `${Math.max(3, Math.round((strength?.progress ?? 0) * 100))}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-neutral-300">
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
