import { useEffect, useMemo, useState } from 'react'
import { JOINTS, MUSCLES, OUTLINE, WIDTH, allMuscles, musclesForExercise } from '../data/muscles.js'
import { fetchActiveProgramme } from '../lib/programme.js'

const COVERAGE = {
  primary: { label: 'Main target', fill: '#c9a227', opacity: 0.9 },
  secondary: { label: 'Also worked', fill: '#c9a227', opacity: 0.35 },
}

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

// Each shape gets the side it belongs to: on the front view the figure's right is on the viewer's left
function shapesFor(view) {
  const leftOfScreen = view === 'front' ? 'right' : 'left'
  const rightOfScreen = view === 'front' ? 'left' : 'right'
  const build = (item, kind) =>
    item.central || item.ellipse
      ? [{ ...item, kind, key: item.id, side: null, d: item.ellipse ? null : smooth(item.points) }]
      : [
          { ...item, kind, key: `${leftOfScreen}-${item.id}`, side: leftOfScreen, d: smooth(item.points) },
          { ...item, kind, key: `${rightOfScreen}-${item.id}`, side: rightOfScreen, d: smooth(mirror(item.points)) },
        ]
  return [...JOINTS.flatMap((j) => build(j, 'joint')), ...MUSCLES[view].flatMap((m) => build(m, 'muscle'))]
}

const SHAPES = { front: shapesFor('front'), back: shapesFor('back') }
const MUSCLE_INFO = allMuscles()

export default function MuscleMap() {
  const [view, setView] = useState('front')
  const [programme, setProgramme] = useState(null)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    fetchActiveProgramme()
      .then(setProgramme)
      .catch(() => setProgramme(null))
  }, [])

  // For every muscle: which exercises in the programme train it, and whether as a main target
  const training = useMemo(() => {
    const map = {}
    for (const day of programme?.days ?? []) {
      for (const exercise of day.exercises) {
        const { primary, secondary } = musclesForExercise(exercise.name)
        for (const [ids, role] of [
          [primary, 'primary'],
          [secondary, 'secondary'],
        ]) {
          for (const id of ids) {
            const entry = (map[id] ??= { role, exercises: [] })
            if (role === 'primary') entry.role = 'primary'
            if (!entry.exercises.some((e) => e.name === exercise.name && e.day === day.name)) {
              entry.exercises.push({ name: exercise.name, day: day.name, role })
            }
          }
        }
      }
    }
    return map
  }, [programme])

  const selectedShape = selected ? [...SHAPES.front, ...SHAPES.back].find((s) => s.key === selected) : null
  const selectedTraining = selectedShape?.kind === 'muscle' ? training[selectedShape.id] : null
  const sideLabels = view === 'front' ? ['Right', 'Left'] : ['Left', 'Right']
  const untrained = [...MUSCLE_INFO.values()].filter((m) => !training[m.id])

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
        viewBox="20 0 160 400"
        className="mx-auto mt-6 block w-full max-w-[300px]"
        role="group"
        aria-label={`Muscles, ${view} view`}
      >
        <path d={OUTLINE_PATH} fill="#0c0c0c" stroke="#2a2a2a" strokeWidth="1" />
        {SHAPES[view].map((shape) => {
          const isSelected = shape.key === selected
          const coverage = shape.kind === 'muscle' ? training[shape.id] : null
          const label = `${shape.side ? `${sideName(shape.side)} ` : ''}${shape.name.toLowerCase()}`
          const props = {
            role: 'button',
            tabIndex: 0,
            'aria-label': `${label}${coverage ? `, ${COVERAGE[coverage.role].label.toLowerCase()}` : ''}`,
            'aria-pressed': isSelected,
            onClick: () => setSelected(isSelected ? null : shape.key),
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setSelected(isSelected ? null : shape.key)
              }
            },
            fill: coverage ? COVERAGE[coverage.role].fill : shape.kind === 'joint' ? '#141414' : '#222222',
            fillOpacity: coverage ? COVERAGE[coverage.role].opacity : 1,
            stroke: isSelected ? '#ffffff' : shape.kind === 'joint' ? '#2c2c2c' : '#3a3a3a',
            strokeWidth: isSelected ? 2 : 0.8,
            className:
              'cursor-pointer outline-none transition-[fill,fill-opacity] duration-300 focus-visible:stroke-[#e3c565]',
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

      <div className="mt-4 flex justify-center gap-5 text-xs text-muted">
        {Object.entries(COVERAGE).map(([key, { label, fill, opacity }]) => (
          <span key={key} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: fill, opacity }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full border border-[#3a3a3a] bg-[#222222]" />
          Not in plan
        </span>
      </div>

      {selectedShape && (
        <section className="mt-6 rounded-2xl border border-line bg-panel p-5" aria-live="polite">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold leading-tight">
                {selectedShape.side ? `${sideName(selectedShape.side)} ` : ''}
                {selectedShape.name.toLowerCase()}
              </h2>
              <p className="text-xs text-muted">{selectedShape.kind === 'joint' ? 'Joint' : selectedShape.group}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm font-semibold text-muted hover:text-white"
            >
              Close
            </button>
          </div>
          {selectedShape.kind === 'joint' ? (
            <p className="mt-3 text-neutral-300">Joints are tracked in Injuries mode.</p>
          ) : selectedTraining ? (
            <ul className="mt-3 space-y-2">
              {[...selectedTraining.exercises]
                .sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1))
                .map((exercise) => (
                  <li key={`${exercise.day}-${exercise.name}`} className="flex items-start gap-3">
                    <span
                      className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: COVERAGE[exercise.role].fill,
                        opacity: COVERAGE[exercise.role].opacity,
                      }}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white">{exercise.name}</p>
                      <p className="text-xs text-muted">
                        {exercise.day} · {COVERAGE[exercise.role].label.toLowerCase()}
                      </p>
                    </div>
                  </li>
                ))}
            </ul>
          ) : (
            <p className="mt-3 text-neutral-300">Nothing in your current plan trains this directly.</p>
          )}
        </section>
      )}

      {programme && untrained.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted">Not in your plan yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-300">{untrained.map((m) => m.name).join(', ')}</p>
        </section>
      )}
      {!programme && (
        <p className="mt-6 text-sm text-muted">
          Load a programme to see which muscles it trains. You can still tap any muscle for its name.
        </p>
      )}
    </div>
  )
}
