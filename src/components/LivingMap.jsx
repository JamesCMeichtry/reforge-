import { useEffect, useMemo, useState } from 'react'
import { DETAILS, INJURY_STRUCTURES, NAMES, STRUCTURES, WIDTH } from '../data/anatomy.js'
import { FIGURE_DETAILED } from '../data/anatomyDetailed.js'
import { BODY_TYPES, FEMALE_HAIR } from '../data/bodyShapes.js'
import { INJURIES } from '../data/injuries.js'
import { musclesForExercise } from '../data/muscles.js'
import { fetchRecentCheckIns } from '../lib/checkins.js'
import { fetchActiveProgramme } from '../lib/programme.js'
import { fetchSetHistory } from '../lib/progress.js'
import { describeInjury, fetchProfile, startingXp } from '../lib/profile.js'
import { me } from '../lib/me.js'
import {
  INJURY_TIERS,
  LEVELS,
  STRENGTH_TIERS,
  XP,
  XP_LEVELS,
  combine,
  fetchInjuryRows,
  injuryLayer,
  isBlocking,
  nextStep,
  shapeKey,
  strengthLayer,
} from '../lib/livingMap.js'
import { LoadingCards, buttonSecondary } from './ui.jsx'

const SEEN_KEY = 'reforge.levels.seen.v1'
// Which body the map shows. For now it's picked on the map; later the starting questionnaire will set it.
const BODY_KEY = 'reforge.bodymap.body'

// The Test colours tools only show for testers. Open the site once with ?dev on the end to turn them on.
const DEV = (() => {
  try {
    if (new URLSearchParams(window.location.search).has('dev')) localStorage.setItem('reforge.dev', '1')
    return localStorage.getItem('reforge.dev') === '1'
  } catch {
    return false
  }
})()

// Colours for each level come from the theme (see index.css), so they suit dark and light
const FILLS = {
  flare: 'var(--lvl-flare)',
  injured: 'var(--lvl-injured)',
  affected: 'var(--lvl-affected)',
  recovering: 'var(--lvl-recovering)',
  watch: 'var(--lvl-watch)',
  neutral: 'var(--fig-muscle)',
  active: 'var(--lvl-active)',
  building: 'var(--lvl-building)',
  strong: 'var(--lvl-strong)',
  silver: 'var(--lvl-silver)',
  elite: 'var(--color-gold)',
}
const SHAPE_FILLS = { ...FILLS, silver: 'url(#silver-shine)', elite: 'url(#elite-shine)' }
const tone = (level) =>
  level === 'watch' ? 'var(--lvl-watch-text)' : level === 'silver' ? 'var(--lvl-silver-text)' : FILLS[level]
const STRENGTH_ORDER = ['neutral', ...STRENGTH_TIERS]
const ORDER = [...INJURY_TIERS, 'neutral', ...STRENGTH_TIERS]

// Only the ends of the scale move. Middle tiers are still, so the moving ones stand out:
// Flare pulses, Injured has a wave sweeping side to side, Affected has rings spreading from its centre,
// Strong has a glint passing across it, Silver and Gold have flowing light, a halo and sparkles.
const FX = {
  flare: { body: 'fx-flare', flow: 'flow-hot' },
  injured: { flow: 'wave-hot' },
  affected: { flow: 'ember' },
  strong: { flow: 'glint', halo: 'halo-strong' },
  silver: { flow: 'flow-bright', halo: 'halo-silver', sparkle: 2 },
  elite: { flow: 'flow-gold', halo: 'halo-gold', sparkle: 3 },
}
const HALO_FILLS = { ...FILLS, silver: '#e2e8f0' }
const STAR = 'M0,-2.2 L0.45,-0.45 L2.2,0 L0.45,0.45 L0,2.2 L-0.45,0.45 L-2.2,0 L-0.45,-0.45Z'
const levelForXp = (xp) => [...XP_LEVELS].reverse().find((step) => xp >= step.xp)?.level ?? 'neutral'
const xpForLevel = (level) => XP_LEVELS.find((step) => step.level === level)?.xp ?? 0

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

// Three spots inside a shape for sparkles: its centre, and halfway to its top and bottom
function sparkPoints(points) {
  const cx = points.reduce((sum, p) => sum + p[0], 0) / points.length
  const cy = points.reduce((sum, p) => sum + p[1], 0) / points.length
  const top = points.reduce((a, b) => (b[1] < a[1] ? b : a))
  const bottom = points.reduce((a, b) => (b[1] > a[1] ? b : a))
  const mid = (p) => [+((cx + p[0]) / 2).toFixed(1), +((cy + p[1]) / 2).toFixed(1)]
  return [mid(top), [+cx.toFixed(1), +cy.toFixed(1)], mid(bottom)]
}

// Front view: the figure's right side is on the viewer's left. Rows are [id, kind, central, fibre angle, points].
function shapesFor(figure, view, warp) {
  const leftOfScreen = view === 'front' ? 'right' : 'left'
  const rightOfScreen = view === 'front' ? 'left' : 'right'
  return figure[view].shapes.flatMap((row) => {
    const [id, kind, central] = row
    const angle = row[3]
    const points = parse(row[4]).map(warp)
    const base = { id, kind, name: NAMES[id] }
    const sparks = sparkPoints(points)
    if (central) return [{ ...base, key: id, side: null, angle, d: polygon(points), sparks }]
    return [
      { ...base, key: shapeKey(id, leftOfScreen), side: leftOfScreen, angle, d: polygon(points), sparks },
      {
        ...base,
        key: shapeKey(id, rightOfScreen),
        side: rightOfScreen,
        angle: mirrorAngle(angle),
        d: polygon(mirror(points)),
        sparks: mirror(sparks),
      },
    ]
  })
}

function buildFigure(figure, warp) {
  const shapes = { front: shapesFor(figure, 'front', warp), back: shapesFor(figure, 'back', warp) }
  const all = [...shapes.front, ...shapes.back]
  return {
    shapes,
    all,
    outlines: {
      front: polygon(parse(figure.front.outline).map(warp)),
      back: polygon(parse(figure.back.outline).map(warp)),
    },
    angles: [...new Set(all.map((s) => s.angle).filter((a) => a != null))],
  }
}

// Fine anatomical lines (neck, collarbones, fingers, toes) drawn over the figure
function detailsFor(view, warp) {
  const { central, sided } = DETAILS[view]
  return [...central, ...sided, ...sided.map(mirror)].map((line) => openPath(line.map(warp)))
}

// Tendons and ligaments drawn on this view, one copy per side
function structuresFor(view, warp) {
  const leftOfScreen = view === 'front' ? 'right' : 'left'
  const rightOfScreen = view === 'front' ? 'left' : 'right'
  const out = []
  for (const [id, s] of Object.entries(STRUCTURES)) {
    if (s.internal || s.view !== view) continue
    for (const [side, flip] of [
      [leftOfScreen, false],
      [rightOfScreen, true],
    ]) {
      const place = (points) => (flip ? mirror(points) : points).map(warp)
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

// Everything drawn for each body type: muscle shapes, outline, detail lines, tendons and ligaments
const BODIES = Object.fromEntries(
  BODY_TYPES.map(({ id, warp }) => [
    id,
    {
      ...buildFigure(FIGURE_DETAILED, warp),
      details: { front: detailsFor('front', warp), back: detailsFor('back', warp) },
      structures: { front: structuresFor('front', warp), back: structuresFor('back', warp) },
    },
  ]),
)

// Shapes are the same muscles on every body, so lookups by key use the first one
const ALL_SHAPES = BODIES.male.all
const labelOf = (shape) => `${shape.side ? `${sideName(shape.side)} ` : ''}${shape.name.toLowerCase()}`

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY)) ?? null
  } catch {
    return null
  }
}

function readBody() {
  try {
    const saved = localStorage.getItem(BODY_KEY)
    return saved === 'female' || saved === 'male' ? saved : null
  } catch {
    return null
  }
}

function writeBody(body) {
  try {
    localStorage.setItem(BODY_KEY, body)
  } catch {
    // The choice just won't be remembered in private browsing
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
  // Testing only: preview colours without real data
  const [testing, setTesting] = useState(false)
  const [testAll, setTestAll] = useState(null)
  const [testOverrides, setTestOverrides] = useState({})
  const [testXp, setTestXp] = useState({})
  const [testNote, setTestNote] = useState(null)
  // Muscles that just levelled up get a pop; n replays the animation
  const [pop, setPop] = useState({ keys: new Set(), n: 0 })
  const { session } = useAuth()
  const [chosenBody, setBody] = useState(readBody)
  // A body picked on the map wins; otherwise the one from the questionnaire
  const body = chosenBody ?? (state.profile?.body === 'female' ? 'female' : 'male')
  const figure = BODIES[body]
  const chooseBody = (next) => {
    setBody(next)
    writeBody(next)
  }

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([
      fetchInjuryRows(),
      fetchRecentCheckIns(365),
      fetchSetHistory(365),
      fetchActiveProgramme(),
      session ? fetchProfile(session.user.id).catch(() => null) : null,
    ])
      .then(([rows, checkIns, history, programme, profile]) => {
        if (cancelled) return
        const start = profile?.onboarded_at
          ? { xp: startingXp(profile), date: profile.onboarded_at.slice(0, 10) }
          : null
        setState({
          status: 'ready',
          injuries: injuryLayer(rows, checkIns),
          structures: structureLayer(rows, injuryLayer(rows, checkIns)),
          strength: strengthLayer(history, checkIns, start),
          programme,
          profile,
        })
      })
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status, session])

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
  const testTarget = selectedShape ? selectedShape.key : 'all'
  const testXpNow = testXp[testTarget] ?? (selectedShape ? (state.strength[selectedShape.id]?.xp ?? 0) : 0)
  const testNext = XP_LEVELS.find((step) => step.xp > testXpNow) ?? null
  const testFloor = [...XP_LEVELS].reverse().find((step) => step.xp <= testXpNow)?.xp ?? 0
  const testProgress = testNext ? (testXpNow - testFloor) / (testNext.xp - testFloor) : 1

  const applyTestLevel = (level) => {
    if (selectedShape) setTestOverrides((current) => ({ ...current, [selectedShape.key]: level }))
    else {
      setTestAll(level)
      setTestOverrides({})
    }
  }
  const celebrate = (level) => {
    setPop((current) => ({
      keys: new Set(selectedShape ? [selectedShape.key] : ALL_SHAPES.map((s) => s.key)),
      n: current.n + 1,
    }))
    setTestNote((current) => ({ text: `Level up! ${LEVELS[level].label}`, n: (current?.n ?? 0) + 1 }))
  }
  const stepTest = (direction) => {
    const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, ORDER.indexOf(testLevel) + direction))]
    applyTestLevel(next)
    if (ORDER.indexOf(next) >= ORDER.indexOf('neutral'))
      setTestXp((current) => ({ ...current, [testTarget]: xpForLevel(next) }))
    // Preview the level-up pop when going up into a strength level
    if (direction > 0 && ORDER.indexOf(next) > ORDER.indexOf('neutral')) celebrate(next)
  }
  const addTestXp = (amount) => {
    const after = Math.max(0, testXpNow + amount)
    const before = levelForXp(testXpNow)
    const level = levelForXp(after)
    setTestXp((current) => ({ ...current, [testTarget]: after }))
    applyTestLevel(level)
    if (ORDER.indexOf(level) > ORDER.indexOf(before)) celebrate(level)
  }
  const resetTest = () => {
    setTestAll(null)
    setTestOverrides({})
    setTestXp({})
    setTestNote(null)
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

      <div className="mt-2 flex justify-center">
        <div
          className="flex rounded-full border border-line bg-panel p-0.5 text-xs"
          role="group"
          aria-label="Body type"
        >
          {BODY_TYPES.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => chooseBody(option.id)}
              aria-pressed={body === option.id}
              className={`rounded-full px-3 py-1 font-semibold ${
                body === option.id ? 'bg-line text-white' : 'text-muted hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
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
          <filter id="halo" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" />
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
          {/* Light running down and back up the muscle */}
          {[
            ['flow-hot', '#ffffff', 0.55, '1.6s'],
            ['flow-bright', '#ffffff', 0.7, '2s'],
            ['flow-gold', '#fff6d8', 0.8, '1.7s'],
          ].map(([id, colour, strength, dur]) => (
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0.3" stopColor={colour} stopOpacity="0" />
              <stop offset="0.5" stopColor={colour} stopOpacity={strength} />
              <stop offset="0.7" stopColor={colour} stopOpacity="0" />
              <animateTransform
                attributeName="gradientTransform"
                type="translate"
                values="0 0.75; 0 -0.75; 0 0.75"
                keyTimes="0; 0.5; 1"
                calcMode="spline"
                keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
                dur={dur}
                repeatCount="indefinite"
              />
            </linearGradient>
          ))}
          {/* Injured: a wave of heat sweeping from one side of the muscle to the other */}
          <linearGradient id="wave-hot" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.25" stopColor="#fecaca" stopOpacity="0" />
            <stop offset="0.5" stopColor="#fff1f2" stopOpacity="0.6" />
            <stop offset="0.75" stopColor="#fecaca" stopOpacity="0" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-0.8 0; 0.8 0"
              calcMode="spline"
              keyTimes="0; 1"
              keySplines="0.4 0 0.6 1"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </linearGradient>
          {/* Affected: rings of warmth spreading out from the centre, staying inside the muscle */}
          <radialGradient id="ember" cx="0.5" cy="0.5" r="0.1">
            <stop offset="0.2" stopColor="#fed7aa" stopOpacity="0" />
            <stop offset="0.75" stopColor="#ffedd5" stopOpacity="0.45" />
            <stop offset="1" stopColor="#fed7aa" stopOpacity="0" />
            <animate attributeName="r" values="0.15; 0.8" dur="2.6s" repeatCount="indefinite" />
          </radialGradient>
          {/* Strong: a glint passing across the muscle, then a pause */}
          <linearGradient id="glint" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0.38" stopColor="#ecfeff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="0.62" stopColor="#ecfeff" stopOpacity="0" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-1 -1; 1 1; 1 1"
              keyTimes="0; 0.55; 1"
              dur="2.8s"
              repeatCount="indefinite"
            />
          </linearGradient>
          <linearGradient id="silver-shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#64748b" />
            <stop offset="40%" stopColor="#cbd5e1" />
            <stop offset="52%" stopColor="#ffffff" />
            <stop offset="64%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
            <animateTransform
              attributeName="gradientTransform"
              type="translate"
              values="-1 -1; 1 1"
              dur="3s"
              repeatCount="indefinite"
            />
          </linearGradient>
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
        {body === 'female' && (
          <g style={{ fill: 'var(--fig-outline)' }} pointerEvents="none">
            <path d={FEMALE_HAIR.bun} />
            {view === 'back' && <path d={FEMALE_HAIR.back} />}
          </g>
        )}
        <path
          d={figure.outlines[view]}
          style={{ fill: 'var(--fig-body)', stroke: 'var(--fig-outline)' }}
          strokeWidth="1"
        />
        {figure.shapes[view].map((shape, index) => {
          const shown = display[shape.key] ?? { level: 'neutral' }
          const level = shown.level
          const isSelected = shape.key === selected
          const fill = level === 'neutral' && shape.kind === 'joint' ? 'var(--fig-joint)' : SHAPE_FILLS[level]
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
            className: 'cursor-pointer outline-none transition-[fill] duration-500 focus-visible:stroke-[#e3c565]',
          }
          const popping = pop.keys.has(shape.key)
          const fx = FX[level] ?? {}
          return (
            <g key={`${view}-${index}-${popping ? pop.n : 0}`} className={popping ? 'map-pop' : undefined}>
              {fx.halo && (
                <path
                  d={shape.d}
                  className={fx.halo}
                  style={{ fill: HALO_FILLS[level] }}
                  filter="url(#halo)"
                  pointerEvents="none"
                />
              )}
              <g className={fx.body}>
                <path d={shape.d} {...props} />
                {shape.angle != null && (
                  <path
                    d={shape.d}
                    fill={`url(#fibre-${shape.angle})`}
                    style={{ opacity: 'var(--fig-fibre-opacity)' }}
                    pointerEvents="none"
                  />
                )}
                {fx.flow && <path d={shape.d} fill={`url(#${fx.flow})`} pointerEvents="none" />}
                <path d={shape.d} fill="url(#sheen)" pointerEvents="none" />
              </g>
              {fx.sparkle &&
                shape.sparks.slice(0, fx.sparkle).map(([x, y], i) => (
                  <g key={i} transform={`translate(${x} ${y})`} pointerEvents="none">
                    <path
                      d={STAR}
                      className="fx-sparkle"
                      style={{
                        fill: level === 'elite' ? '#fff6d8' : '#ffffff',
                        animationDelay: `${((index * 0.37 + i * 0.6) % 2).toFixed(2)}s`,
                      }}
                    />
                  </g>
                ))}
            </g>
          )
        })}
        {figure.details[view].map((d, i) => (
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
        {figure.structures[view].map((item) => {
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

      <div className="mt-5 space-y-3" aria-label="Scale">
        {[
          ['Recovery', INJURY_TIERS],
          ['Strength', STRENGTH_TIERS],
        ].map(([title, tiers]) => (
          <div key={title}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">{title}</p>
            <div className="mt-1.5 grid grid-cols-5 gap-1 text-center text-[10px] leading-tight text-muted">
              {tiers.map((key) => (
                <span key={key}>
                  <span
                    className="mb-1 block h-2 rounded-full"
                    style={{
                      background: key === 'silver' ? 'linear-gradient(90deg,#94a3b8,#f8fafc,#94a3b8)' : FILLS[key],
                    }}
                  />
                  {LEVELS[key].label}
                  {counts[key] ? <span className="block font-semibold text-white">{counts[key]}</span> : null}
                </span>
              ))}
            </div>
          </div>
        ))}
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
              <p
                className="text-sm font-semibold"
                style={{ color: testLevel === 'neutral' ? 'var(--color-muted)' : tone(testLevel) }}
              >
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

          <div className="mt-4">
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold uppercase tracking-[0.2em] text-gold">XP</span>
              <span className="text-muted">
                {testXpNow.toLocaleString('en-GB')}
                {testNext
                  ? ` / ${testNext.xp.toLocaleString('en-GB')} to ${LEVELS[testNext.level].label}`
                  : ' · max level'}
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-500"
                style={{ width: `${Math.max(2, Math.round(testProgress * 100))}%` }}
              />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['+1 set', XP.primarySet],
                ['+100 XP', 100],
                ['−100 XP', -100],
              ].map(([label, amount]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => addTestXp(amount)}
                  className="rounded-xl border border-line py-2 text-sm font-semibold text-white"
                >
                  {label}
                </button>
              ))}
            </div>
            {testNote && (
              <p
                key={testNote.n}
                className="celebrate mt-3 text-center font-display text-2xl font-bold uppercase text-gold"
              >
                {testNote.text}
              </p>
            )}
          </div>

          <p className="mt-3 text-center text-xs text-muted">
            Tap an area to change just that one, or tap it again to go back to the whole body.{' '}
            <button type="button" onClick={resetTest} className="font-semibold text-gold">
              Reset
            </button>
          </p>
        </div>
      )}

      {DEV && (
        <div className="mt-4 flex justify-center text-xs">
          <button
            type="button"
            onClick={() => {
              setTesting((on) => !on)
              resetTest()
            }}
            aria-pressed={testing}
            className={`rounded-full border border-dashed px-3 py-1 font-semibold ${
              testing ? 'border-gold text-gold' : 'border-line text-muted'
            }`}
          >
            Test colours
          </button>
        </div>
      )}

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
        Muscles level up with XP: {XP.primarySet} for every set that works them, {XP.secondarySet} when they help out,
        and {XP.checkIn} for each check-in in a week you trained them.{' '}
        {XP_LEVELS.map((step) => `${step.xp.toLocaleString('en-GB')} XP is ${LEVELS[step.level].label}`).join(', ')}.
        Leave one untrained for 3 weeks and it starts to fade. An injured area can't level up until it settles.
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
                {describeInjury(reason.details).map((line) => (
                  <p key={line} className="mt-0.5 text-sm text-muted">
                    {line}
                  </p>
                ))}
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
            {injury && isBlocking(injury.level) ? 'Strength levels unlock once this area settles.' : nextStep(strength)}
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
