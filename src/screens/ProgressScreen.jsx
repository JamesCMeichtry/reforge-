import { useEffect, useMemo, useState } from 'react'
import StreakCard from '../components/StreakCard.jsx'
import { MyTargets } from '../components/Plans.jsx'
import MonthReport, { ReportLink } from '../components/MonthReport.jsx'
import { useHashParts } from '../components/Friends.jsx'
import Collapsible from '../components/Collapsible.jsx'
import { LoadingCards, ScreenHeader, buttonSecondary } from '../components/ui.jsx'
import { fetchSetHistory, tinyDate, topSets, weightedExercises } from '../lib/progress.js'
import { fetchActiveProgramme } from '../lib/programme.js'
import { computeStreak, fetchActivityDays } from '../lib/streak.js'
import { fetchTargets } from '../lib/plans.js'
import { progressStory } from '../lib/story.js'
import '../components/Screens.css'

function Card({ eyebrow, title, aside, children }) {
  return (
    <section className="tint-glow rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>}
          <h2 className="mt-1 font-display text-2xl font-semibold leading-tight">{title}</h2>
        </div>
        {aside}
      </div>
      {children}
    </section>
  )
}

// The change since the first session shown, as a small coloured pill
function ChangePill({ change }) {
  const up = change > 0
  const flat = change === 0
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-sm font-bold ${
        flat ? 'bg-line text-muted' : up ? 'bg-gold/15 text-gold' : 'bg-red-500/15 text-red-400'
      }`}
    >
      {flat ? 'Level' : `${up ? '▲ +' : '▼ '}${change} kg`}
    </span>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-xl bg-ink/40 px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className="mt-1 font-display text-xl font-bold leading-none text-white">{value}</p>
    </div>
  )
}

// The big three, and which logged exercises count as each. Variations like Romanian deadlifts,
// dumbbell or incline bench and split or goblet squats are accessories, so they're left out.
const BIG_LIFTS = [
  [
    'Squat',
    /\bsquats?\b/i,
    /split|goblet|jump|spanish|sissy|single|hack|bodyweight|box|bulgarian|pistol|wall|overhead/i,
  ],
  ['Bench', /bench press/i, /dumbbell|\bdb\b|incline|decline|close|floor/i],
  ['Deadlift', /deadlift/i, /romanian|\brdl\b|single|stiff|snatch/i],
]
const bigLift = (name) => BIG_LIFTS.findIndex(([, match, skip]) => match.test(name) && !skip.test(name))

// Only main lifts get a strength chart. Squat, bench and deadlift if you log them; otherwise
// the first main exercise of each day in your programme (whatever your sport's key movement is).
function mainLifts(history, programme) {
  const weighted = weightedExercises(history)
  const big = weighted.filter((name) => bigLift(name) !== -1)
  if (big.length) return big.sort((a, b) => bigLift(a) - bigLift(b))
  const firsts = (programme?.days ?? [])
    .map((day) => day.exercises?.find((e) => (e.section || 'Main') === 'Main')?.name)
    .filter(Boolean)
  return [...new Set(firsts)].filter((name) => weighted.includes(name))
}

function StrengthChart({ history, programme, bare = false }) {
  const exercises = useMemo(() => mainLifts(history, programme), [history, programme])
  const [picked, setPicked] = useState(null)
  const exercise = picked ?? exercises[0]
  const sessions = useMemo(() => (exercise ? topSets(history, exercise).slice(-10) : []), [history, exercise])

  if (!exercises.length) {
    const empty = (
      <p className={bare ? 'text-neutral-300' : 'mt-2 text-neutral-300'}>
        Your main lifts show here once you log a weight on them: squat, bench and deadlift, or the first main exercise
        of each day in your programme.
      </p>
    )
    if (bare) return empty
    return (
      <Card eyebrow="Main lifts" title="Strength">
        <p className="mt-2 text-neutral-300">
          Your main lifts show here once you log a weight on them: squat, bench and deadlift, or the first main exercise
          of each day in your programme.
        </p>
      </Card>
    )
  }

  const best = Math.max(...sessions.map((s) => s.weight))
  const floor = Math.max(0, Math.min(...sessions.map((s) => s.weight)) * 0.6)
  const change = sessions.length > 1 ? sessions.at(-1).weight - sessions[0].weight : 0
  const bestSet = sessions.find((s) => s.weight === best)
  const bestIndex = sessions.indexOf(bestSet)

  const pill = sessions.length > 1 ? <ChangePill change={Math.round(change * 10) / 10} /> : null

  const content = (
    <>
      <div className={`chip-scroll -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 ${bare ? '' : 'mt-4'}`}>
        {exercises.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setPicked(name)}
            aria-pressed={exercise === name}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200 ${
              exercise === name ? 'border-gold bg-gold text-ink' : 'border-line text-neutral-300 hover:text-white'
            }`}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="relative mt-5">
        {/* Faint guide lines behind the bars */}
        <div
          className="pointer-events-none absolute inset-x-0 top-5 bottom-5 flex flex-col justify-between"
          aria-hidden="true"
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="block border-t border-dashed border-line" />
          ))}
        </div>
        <div
          key={exercise}
          className="relative flex h-48 items-end gap-2"
          role="img"
          aria-label={`Heaviest set per session for ${exercise}`}
        >
          {sessions.map((s, i) => {
            const isBest = i === bestIndex
            return (
              <div key={s.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className={`text-[11px] font-semibold ${isBest ? 'text-gold' : 'text-neutral-300'}`}>
                  {isBest ? `★ ${s.weight}` : s.weight}
                </span>
                <div
                  className={`bar-grow w-full max-w-9 rounded-t-lg ${isBest ? 'best-glow' : ''}`}
                  style={{
                    height: `${Math.max(6, ((s.weight - floor) / (best - floor || 1)) * 100)}%`,
                    background: isBest
                      ? 'linear-gradient(180deg, color-mix(in srgb, var(--color-gold) 70%, #fff), var(--color-gold))'
                      : 'var(--chart-dim)',
                    animationDelay: `${i * 40}ms`,
                  }}
                />
                <span className="w-full truncate text-center text-[10px] text-muted">{tinyDate(s.date)}</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Best" value={`${best} kg`} />
        <MiniStat label="Reps" value={`× ${bestSet.reps}`} />
        <MiniStat label="Sessions" value={sessions.length} />
      </div>
      <p className="mt-3 text-xs text-muted">Heaviest set each session, in kg. ★ marks your best.</p>
    </>
  )

  if (bare) {
    return (
      <div>
        {pill && <div className="mb-3 flex justify-end">{pill}</div>}
        {content}
      </div>
    )
  }
  return (
    <Card eyebrow="Main lifts" title="Strength" aside={pill}>
      {content}
    </Card>
  )
}

// The one big story at the top of Progress, with this week's numbers and an 8-week rhythm underneath
function Headline({ story }) {
  const { headline, chips, weeks } = story
  const most = Math.max(1, ...weeks.map((w) => w.count))
  return (
    <section className="tint-glow rounded-3xl border border-line bg-panel p-6">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">Last 4 weeks</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2">
          <span className={`font-display text-7xl font-bold leading-none ${headline.achievement ? 'text-gold' : ''}`}>
            {headline.prefix}
            <span>{headline.value}</span>
          </span>
          <span className="font-display text-3xl font-bold uppercase leading-none text-neutral-300">
            {headline.unit}
          </span>
        </p>
        <div
          className="mb-1 flex h-12 shrink-0 items-end gap-1"
          role="img"
          aria-label="Sessions each week, last 8 weeks"
        >
          {weeks.map((w, i) => (
            <span
              key={w.start}
              className="bar-grow w-2 rounded-t-sm"
              style={{
                height: `${Math.max(8, (w.count / most) * 100)}%`,
                background: i === weeks.length - 1 ? 'var(--color-gold)' : w.count ? '#5a5a5a' : 'var(--color-line)',
                animationDelay: `${i * 40}ms`,
              }}
            />
          ))}
        </div>
      </div>
      <p className="mt-2 text-lg leading-snug text-neutral-200">{headline.line}</p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li key={chip} className="rounded-full border border-line px-3 py-1 text-sm font-semibold text-neutral-200">
            {chip}
          </li>
        ))}
      </ul>
    </section>
  )
}

// Summary lines for the closed cards
function strengthSummary(history, programme) {
  const lift = mainLifts(history, programme)[0]
  if (!lift) return 'No lifts logged yet'
  const tops = topSets(history, lift).slice(-10)
  const best = Math.max(...tops.map((t) => t.weight))
  return `${lift} ${best} kg`
}

// #progress/report is the monthly report
export default function ProgressScreen() {
  const [, page] = useHashParts()
  if (page === 'report') return <ReportPage />
  return <ProgressOverview />
}

function ReportPage() {
  // Opens at the top, not wherever Progress was scrolled to
  useEffect(() => window.scrollTo(0, 0), [])
  return (
    <>
      <a
        href="#progress"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-white"
      >
        <span aria-hidden="true">‹</span> Progress
      </a>
      <ScreenHeader title="Your month" intro="Training, new bests, injuries and targets, a month at a time." />
      <MonthReport />
    </>
  )
}

function ProgressOverview() {
  const [state, setState] = useState({ status: 'loading' })
  const [streak, setStreak] = useState(null)
  const [targets, setTargets] = useState([])

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([fetchSetHistory(), fetchActiveProgramme().catch(() => null)])
      .then(([history, programme]) => !cancelled && setState({ status: 'ready', history, programme }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status])

  // Just the numbers for the summaries; the cards load their own detail when opened
  useEffect(() => {
    fetchActivityDays()
      .then((dates) => setStreak(computeStreak(dates)))
      .catch(() => {})
    fetchTargets()
      .then(setTargets)
      .catch(() => {})
  }, [])

  const story = useMemo(
    () =>
      state.status === 'ready'
        ? progressStory({ history: state.history, lifts: mainLifts(state.history, state.programme), streak })
        : null,
    [state, streak],
  )
  const done = targets.filter((t) => t.done_at).length

  return (
    <>
      <ScreenHeader title="Progress" intro="How your training is going. Tap a card to see the detail." />
      {state.status === 'loading' && <LoadingCards count={3} height="h-40" label="Loading your progress" />}
      {state.status === 'error' && (
        <div>
          <p className="text-red-400">Couldn't load your progress. Check your connection.</p>
          <button type="button" onClick={() => setState({ status: 'loading' })} className={`mt-4 ${buttonSecondary}`}>
            Try again
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <div className="space-y-3">
          <div className="rise-in" style={{ '--i': 0 }}>
            <Headline story={story} />
          </div>
          <div className="rise-in" style={{ '--i': 1 }}>
            <Collapsible
              id="progress-strength"
              eyebrow="Main lifts"
              title="Strength"
              summary={strengthSummary(state.history, state.programme)}
              defaultOpen
            >
              <StrengthChart history={state.history} programme={state.programme} bare />
            </Collapsible>
          </div>
          <div className="rise-in" style={{ '--i': 2 }}>
            <Collapsible
              id="progress-streak"
              eyebrow="Every day counts"
              title="Streak"
              summary={streak ? `${streak.current} ${streak.current === 1 ? 'day' : 'days'} · best ${streak.best}` : ''}
            >
              <StreakCard />
            </Collapsible>
          </div>
          {targets.length > 0 && (
            <div className="rise-in" style={{ '--i': 3 }}>
              <Collapsible
                id="progress-targets"
                eyebrow="From your coach"
                title="Targets"
                summary={`${done} of ${targets.length} done`}
                defaultOpen
              >
                <MyTargets bare />
              </Collapsible>
            </div>
          )}
          <div className="rise-in" style={{ '--i': 4 }}>
            <ReportLink />
          </div>
        </div>
      )}
    </>
  )
}
