import { useEffect, useMemo, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonSecondary } from '../components/ui.jsx'
import { fetchRecentCheckIns } from '../lib/checkins.js'
import { fetchActiveProgramme, todayDate } from '../lib/programme.js'
import {
  feelingTimeline,
  fetchSetHistory,
  recentWeeks,
  rehabStreak,
  shortDate,
  tinyDate,
  topSets,
  weightedExercises,
} from '../lib/progress.js'

const REHAB_SECTIONS = new Set(['Rehab', 'Physio'])

function Card({ title, aside, children }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {aside && <span className="text-sm font-semibold text-gold">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function StrengthChart({ history }) {
  const exercises = useMemo(() => weightedExercises(history), [history])
  const [picked, setPicked] = useState(null)
  const exercise = picked ?? exercises[0]
  const sessions = useMemo(() => (exercise ? topSets(history, exercise).slice(-10) : []), [history, exercise])

  if (!exercises.length) {
    return (
      <Card title="Strength">
        <p className="mt-2 text-neutral-300">Log a weighted set and your heaviest set each session appears here.</p>
      </Card>
    )
  }

  const best = Math.max(...sessions.map((s) => s.weight))
  const floor = Math.max(0, Math.min(...sessions.map((s) => s.weight)) * 0.6)
  const change = sessions.length > 1 ? sessions.at(-1).weight - sessions[0].weight : 0
  const bestSet = sessions.find((s) => s.weight === best)

  return (
    <Card title="Strength" aside={sessions.length > 1 ? `${change >= 0 ? '+' : ''}${change} kg` : null}>
      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
        {exercises.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setPicked(name)}
            aria-pressed={exercise === name}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold ${
              exercise === name ? 'border-gold bg-gold text-ink' : 'border-line text-neutral-300'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        key={exercise}
        className="mt-5 flex h-44 items-end gap-2"
        role="img"
        aria-label={`Heaviest set per session for ${exercise}`}
      >
        {sessions.map((s) => {
          const isBest = s.weight === best
          return (
            <div key={s.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className={`text-[11px] font-semibold ${isBest ? 'text-gold' : 'text-neutral-300'}`}>
                {s.weight}
              </span>
              <div
                className="bar-grow w-full max-w-9 rounded-t-md"
                style={{
                  height: `${Math.max(6, ((s.weight - floor) / (best - floor || 1)) * 100)}%`,
                  backgroundColor: isBest ? '#c9a227' : '#5c4d1c',
                }}
              />
              <span className="w-full truncate text-center text-[10px] text-muted">{tinyDate(s.date)}</span>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-sm text-muted">
        Heaviest set each session, in kg. Best: {best} kg × {bestSet.reps}.
      </p>
    </Card>
  )
}

function RehabStreak({ history, rehabExercises }) {
  const { current, best, rehabDates } = useMemo(
    () => rehabStreak(history, rehabExercises),
    [history, rehabExercises],
  )
  const weeks = recentWeeks(12)
  const today = todayDate()
  const trainedDates = new Set(history.map((r) => r.session_date))

  return (
    <Card title="Rehab streak" aside={`Best ${best}`}>
      <div className="mt-3 flex items-end gap-3">
        <span className="font-display text-6xl font-bold leading-none text-gold">{current}</span>
        <p className="pb-1 text-sm leading-snug text-neutral-300">
          {current === 1 ? 'session' : 'sessions'} in a row
          <br />
          with your rehab done
        </p>
      </div>
      <div className="mt-5 flex justify-between gap-1" role="img" aria-label="Rehab days over the last 12 weeks">
        {weeks.map((week) => (
          <div key={week[0]} className="flex flex-1 flex-col gap-1">
            {week.map((date) => (
              <span
                key={date}
                className={`aspect-square w-full rounded-[3px] ${date === today ? 'ring-1 ring-white/70' : ''}`}
                style={{
                  backgroundColor: rehabDates.has(date)
                    ? '#c9a227'
                    : trainedDates.has(date)
                      ? '#5c4d1c'
                      : date > today
                        ? 'transparent'
                        : '#1a1a1a',
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-gold" /> Rehab done
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-[#5c4d1c]" /> Trained, rehab skipped
        </span>
      </div>
    </Card>
  )
}

function FeelingChart({ checkIns }) {
  const points = useMemo(() => feelingTimeline(checkIns), [checkIns])
  if (points.length < 2) {
    return (
      <Card title="How you feel">
        <p className="mt-2 text-neutral-300">
          After a couple of check-ins, this shows the ups and downs of your recovery as one line.
        </p>
      </Card>
    )
  }

  const W = 300
  const H = 140
  const pad = { l: 22, r: 8, t: 10, b: 22 }
  const x = (i) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r)
  const y = (v) => pad.t + (1 - v / 10) * (H - pad.t - pad.b)
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.feeling).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z`
  const latest = points.at(-1).feeling
  const trend = latest - points.at(-2).feeling

  return (
    <Card title="How you feel" aside={`${latest}/10 ${trend > 0 ? '▲' : trend < 0 ? '▼' : ''}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" role="img" aria-label="Overall feeling over time">
        <defs>
          <linearGradient id="feel-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a227" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 5, 10].map((v) => (
          <g key={v}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(v)}
              y2={y(v)}
              stroke="#262626"
              strokeDasharray={v === 5 ? '3 3' : undefined}
            />
            <text x={pad.l - 6} y={y(v) + 3} fill="#9a9a9a" fontSize="9" textAnchor="end">
              {v}
            </text>
          </g>
        ))}
        <path d={area} fill="url(#feel-fill)" />
        <path
          d={line}
          fill="none"
          stroke="#c9a227"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="draw-line"
        />
        {points.map((p, i) => (
          <circle key={p.date} cx={x(i)} cy={y(p.feeling)} r={p.flag ? 4 : 2.5} fill={p.flag ? '#dc2626' : '#c9a227'} />
        ))}
        <text x={pad.l} y={H - 6} fill="#9a9a9a" fontSize="9">
          {shortDate(points[0].date)}
        </text>
        <text x={W - pad.r} y={H - 6} fill="#9a9a9a" fontSize="9" textAnchor="end">
          {shortDate(points.at(-1).date)}
        </text>
      </svg>
      <p className="mt-2 text-sm text-muted">
        10 is pain-free, averaged across your injuries. Red dots mark days with warning signs. Each injury's detail is
        on the Rehab tab.
      </p>
    </Card>
  )
}

export default function ProgressScreen() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([fetchSetHistory(), fetchRecentCheckIns(120), fetchActiveProgramme()])
      .then(([history, checkIns, programme]) => {
        if (cancelled) return
        const rehabExercises = new Set(
          (programme?.days ?? []).flatMap((day) =>
            day.exercises.filter((e) => REHAB_SECTIONS.has(e.section)).map((e) => e.name),
          ),
        )
        setState({ status: 'ready', history, checkIns, rehabExercises })
      })
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status])

  return (
    <>
      <ScreenHeader title="Progress" intro="Strength, consistency and how you feel, over time." />
      {state.status === 'loading' && <LoadingCards count={3} height="h-56" label="Loading your progress" />}
      {state.status === 'error' && (
        <div>
          <p className="text-red-400">Couldn't load your progress. Check your connection.</p>
          <button type="button" onClick={() => setState({ status: 'loading' })} className={`mt-4 ${buttonSecondary}`}>
            Try again
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <div className="space-y-4">
          <StrengthChart history={state.history} />
          <RehabStreak history={state.history} rehabExercises={state.rehabExercises} />
          <FeelingChart checkIns={state.checkIns} />
        </div>
      )}
    </>
  )
}
