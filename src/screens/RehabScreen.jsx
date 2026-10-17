import { useEffect, useState } from 'react'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary } from '../components/ui.jsx'
import { fetchInjurySites, fetchRecentCheckIns, painWord } from '../lib/checkins.js'
import { fetchMyPros, fetchRehabPlans } from '../lib/pro.js'
import { siteStatus } from '../lib/livingMap.js'
import { daysAgo } from '../lib/programme.js'
import { tinyDate } from '../lib/progress.js'

// Recovery stages use the same rules as the living body map, so both always agree
export const STAGES = [
  {
    name: 'Flare',
    colour: 'var(--stage-flare)',
    advice:
      'Back off loading this area for now. Keep moving gently in pain-free ranges, and see a physio if the warning signs stick around.',
  },
  {
    name: 'Settling',
    colour: 'var(--stage-settling)',
    advice: 'Stick to your rehab work. Pain up to about 3/10 that has settled by the next morning is usually fine.',
  },
  {
    name: 'Rebuilding',
    colour: 'var(--stage-rebuilding)',
    advice: 'Good run. Start adding load gradually, one change at a time, and keep checking in.',
  },
  {
    name: 'Cleared',
    colour: 'var(--stage-cleared)',
    advice: 'Back to normal training for this area. Keep your rehab going as maintenance.',
  },
]

const GOOD = 2 // a score of 2 or less counts as a good check-in
export const score = (c) => c.next_morning ?? c.pain_after

const painColour = (value) =>
  value == null
    ? 'var(--chart-empty)'
    : value >= 7
      ? 'var(--pain-severe)'
      : value >= 4
        ? 'var(--pain-moderate)'
        : value >= 1
          ? 'var(--pain-mild)'
          : 'var(--pain-none)'

function goodRun(scores) {
  let run = 0
  for (let i = scores.length - 1; i >= 0 && scores[i] <= GOOD; i--) run++
  return run
}

// Where this area sits on the ladder, and what moves it up a rung
export function recovery(checkIns) {
  const scores = checkIns.map(score).filter((v) => v != null)
  const status = siteStatus(checkIns)
  const run = goodRun(scores)

  if (status.flare) {
    const recent = checkIns.slice(-5)
    const lastFlag = recent.map((c) => c.red_flag).lastIndexOf(true)
    const clearIn = lastFlag === -1 ? 0 : lastFlag + 1
    const high = scores.length && scores.at(-1) >= 7
    const parts = []
    if (high) parts.push('a check-in below 7')
    if (clearIn) parts.push(`${clearIn} more check-in${clearIn > 1 ? 's' : ''} without warning signs`)
    return { stage: 0, need: 1, have: 0, next: `To settle: ${parts.join(' and ')}.` }
  }
  if (status.level === 'watch')
    return { stage: 3, need: 6, have: 6, next: 'Top of the ladder. Keep checking in now and then.' }
  if (status.level === 'affected') {
    return {
      stage: 2,
      need: 6,
      have: run,
      next: `${6 - run} more good check-in${6 - run > 1 ? 's' : ''} in a row to reach Cleared.`,
    }
  }
  if (!scores.length) return { stage: 1, need: 3, have: 0, next: 'Check in to start tracking this area.' }
  return {
    stage: 1,
    need: 3,
    have: run,
    next: `${3 - run} more good check-in${3 - run > 1 ? 's' : ''} in a row to reach Rebuilding.`,
  }
}

export function trend(scores) {
  if (scores.length < 4) return null
  const avg = (list) => list.reduce((sum, v) => sum + v, 0) / list.length
  const change = avg(scores.slice(-3)) - avg(scores.slice(-6, -3))
  if (change <= -1) return { label: 'Improving', tone: 'text-gold' }
  if (change >= 1) return { label: 'Worse lately', tone: 'text-red-400' }
  return { label: 'Steady', tone: 'text-muted' }
}

export function Ladder({ stage }) {
  return (
    <ol className="mt-5 grid grid-cols-4 gap-1.5" aria-label={`Recovery stage: ${STAGES[stage].name}`}>
      {STAGES.map((s, i) => {
        const reached = i <= stage
        const current = i === stage
        return (
          <li key={s.name} aria-current={current ? 'step' : undefined}>
            <span
              className={`block h-2 rounded-full ${current && stage === 0 ? 'stage-pulse' : ''}`}
              style={{ backgroundColor: reached ? s.colour : 'var(--color-line)' }}
            />
            <span
              className={`mt-1.5 block text-[11px] font-semibold uppercase tracking-wide ${
                current ? 'text-white' : 'text-muted'
              }`}
            >
              {s.name}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function Rungs({ need, have, colour }) {
  if (need <= 1) return null
  return (
    <div className="mt-3 flex gap-1.5" aria-hidden="true">
      {Array.from({ length: need }, (_, i) => (
        <span
          key={i}
          className="h-3 w-3 rounded-full border"
          style={i < have ? { backgroundColor: colour, borderColor: colour } : { borderColor: 'var(--color-line)' }}
        />
      ))}
    </div>
  )
}

// Pain over time, with the good / caution / flare zones shaded behind it
export function PainChart({ checkIns }) {
  const points = checkIns.filter((c) => score(c) != null).slice(-14)
  if (!points.length) return null

  const W = 320
  const H = 132
  const left = 24
  const right = 8
  const top = 8
  const bottom = 20
  const x = (i) =>
    points.length === 1 ? (left + W - right) / 2 : left + (i * (W - left - right)) / (points.length - 1)
  const y = (v) => top + ((10 - v) / 10) * (H - top - bottom)
  const line = points.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(score(c)).toFixed(1)}`).join(' ')
  const band = (from, to, colour) => (
    <rect x={left} width={W - left - right} y={y(to)} height={y(from) - y(to)} fill={colour} opacity="0.12" />
  )

  return (
    <figure className="mt-5">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`Pain over your last ${points.length} check-ins`}
      >
        {band(6.5, 10, 'var(--pain-severe)')}
        {band(2.5, 6.5, 'var(--pain-moderate)')}
        {band(0, 2.5, 'var(--color-gold)')}
        {[0, 5, 10].map((v) => (
          <text key={v} x={left - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-muted)">
            {v}
          </text>
        ))}
        {points.length > 1 && (
          <path
            d={line}
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            className="draw-line"
          />
        )}
        {points.map((c, i) => (
          <g key={c.id ?? i}>
            {c.red_flag && (
              <circle cx={x(i)} cy={y(score(c))} r="7.5" fill="none" stroke="var(--pain-severe)" strokeWidth="1.5" />
            )}
            <circle
              cx={x(i)}
              cy={y(score(c))}
              r="4"
              fill={painColour(score(c))}
              stroke="var(--color-panel)"
              strokeWidth="1.5"
            />
          </g>
        ))}
        <text
          x={x(0)}
          y={H - 4}
          textAnchor={points.length === 1 ? 'middle' : 'start'}
          fontSize="10"
          fill="var(--color-muted)"
        >
          {tinyDate(points[0].session_date)}
        </text>
        {points.length > 1 && (
          <text x={x(points.length - 1)} y={H - 4} textAnchor="end" fontSize="10" fill="var(--color-muted)">
            {tinyDate(points.at(-1).session_date)}
          </text>
        )}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        <span>0–2 good</span>
        <span>3–6 manageable</span>
        <span>7+ flare</span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full border-[1.5px]" style={{ borderColor: 'var(--pain-severe)' }} />
          warning signs
        </span>
      </figcaption>
    </figure>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2.5">
      <p className="font-display text-2xl font-bold leading-none">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}

// With a coach, the coach's stage and guidance replace the app's automatic advice
function AreaCard({ site, checkIns, coach, coachPlan }) {
  const scores = checkIns.map(score).filter((v) => v != null)
  const latest = checkIns.at(-1)
  const plan = recovery(checkIns)
  const coachName = coach?.display_name ?? 'your coach'
  const coachStage = coach ? (coachPlan?.stage ?? null) : plan.stage
  const stage = coachStage != null ? STAGES[coachStage] : { name: 'With your coach', colour: 'var(--color-line)' }
  const direction = trend(scores)
  const recentFlag = checkIns.slice(-5).some((c) => c.red_flag)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 6)
  const weekScores = checkIns
    .filter((c) => c.session_date >= weekStart.toLocaleDateString('en-CA'))
    .map(score)
    .filter((v) => v != null)
  const weekAvg = weekScores.length ? (weekScores.reduce((s, v) => s + v, 0) / weekScores.length).toFixed(1) : '–'

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div className="h-1" style={{ backgroundColor: stage.colour }} aria-hidden="true" />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-3xl font-semibold leading-tight">{site.label}</h2>
            <p className="text-xs text-muted">{site.injuries.join(' · ')}</p>
          </div>
          {coachStage != null && (
            <span
              className="shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-ink"
              style={{ backgroundColor: stage.colour }}
            >
              {stage.name}
            </span>
          )}
        </div>

        {coachStage != null && <Ladder stage={coachStage} />}

        {coach ? (
          <div className="mt-5 rounded-xl bg-ink/40 p-4">
            {coachPlan?.guidance || coachPlan?.restrictions ? (
              <>
                {coachPlan.guidance && <p className="text-sm text-neutral-200">{coachPlan.guidance}</p>}
                {coachPlan.restrictions && (
                  <p className="mt-2 text-sm text-neutral-200">
                    <span className="font-semibold text-white">Avoid for now:</span> {coachPlan.restrictions}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted">
                  From {coachName} · {daysAgo(coachPlan.updated_at.slice(0, 10)).toLowerCase()}
                </p>
              </>
            ) : (
              <p className="text-sm text-neutral-200">
                {coachName} will guide your loading for this area. Keep checking in so they can see how it's going.
              </p>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-xl bg-ink/40 p-4">
            <p className="text-sm text-neutral-200">{stage.advice}</p>
            <p className="mt-2 text-sm font-semibold text-white">{plan.next}</p>
            <Rungs need={plan.need} have={plan.have} colour={STAGES[Math.min(plan.stage + 1, 3)].colour} />
          </div>
        )}

        {recentFlag && (
          <p className="mt-4 rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {coach
              ? `Warning signs reported recently. Stop loading this area and tell ${coachName}. If it's getting worse, or you can't put weight through it, get medical help.`
              : 'Warning signs reported recently. Get this area checked before loading it.'}
          </p>
        )}

        {scores.length > 0 ? (
          <>
            <PainChart checkIns={checkIns} />
            <div className="mt-4 grid grid-cols-3 gap-2">
              <Stat label="Good in a row" value={goodRun(scores)} />
              <Stat label="7-day average" value={weekAvg} />
              <Stat label="Check-ins" value={scores.length} />
            </div>
            <p className="mt-4 text-sm text-neutral-300">
              Last check-in {daysAgo(latest.session_date).toLowerCase()}:{' '}
              {[
                latest.pain_during != null && `during ${latest.pain_during}`,
                latest.pain_after != null && `after ${latest.pain_after}`,
                latest.next_morning != null && `next morning ${latest.next_morning}`,
              ]
                .filter(Boolean)
                .join(' · ')}
              <span className="text-muted"> ({painWord(score(latest) ?? 0).toLowerCase()})</span>
              {direction && <span className={`font-semibold ${direction.tone}`}> · {direction.label}</span>}
            </p>
          </>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No check-ins yet. Check in from the Today tab, or after your next session.
          </p>
        )}
      </div>
    </article>
  )
}

function HowItWorks({ coach }) {
  if (coach) {
    return (
      <details className="rounded-2xl border border-line bg-panel p-5 text-sm text-neutral-300">
        <summary className="cursor-pointer font-semibold text-white">How this works with your coach</summary>
        <ul className="mt-3 space-y-2">
          <li>{coach.display_name ?? 'Your coach'} sets the stage for each area and what to do or avoid.</li>
          <li>Every check-in goes straight to them, so the more you check in, the better they can guide you.</li>
          <li>Warning signs alert them straight away.</li>
        </ul>
      </details>
    )
  }
  return (
    <details className="rounded-2xl border border-line bg-panel p-5 text-sm text-neutral-300">
      <summary className="cursor-pointer font-semibold text-white">How the stages work</summary>
      <ul className="mt-3 space-y-2">
        <li>A check-in scoring {GOOD} or less counts as good.</li>
        <li>3 good check-ins in a row moves an area up to Rebuilding, and 6 moves it to Cleared.</li>
        <li>A score of 7 or more, or any warning sign, drops it back to Flare.</li>
        <li>Your body map uses the same rules, so its colours always match these stages.</li>
      </ul>
      <p className="mt-3 text-xs text-muted">
        A guide to help you pace things, not a diagnosis. If you're unsure, ask a physio.
      </p>
    </details>
  )
}

export default function RehabScreen() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([fetchInjurySites(), fetchRecentCheckIns(), fetchMyPros(), fetchRehabPlans()])
      .then(
        ([sites, checkIns, pros, plans]) =>
          !cancelled && setState({ status: 'ready', sites, checkIns, coach: pros[0] ?? null, plans }),
      )
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status])

  const ready = state.status === 'ready'
  const cards = ready
    ? state.sites
        .map((site) => {
          const checkIns = state.checkIns.filter((c) => c.area_id === site.areaId)
          const coachPlan = state.plans.find((p) => p.area_id === site.areaId)
          const stage = state.coach ? (coachPlan?.stage ?? 1.5) : recovery(checkIns).stage
          return { site, checkIns, coachPlan, stage }
        })
        .sort((a, b) => a.stage - b.stage)
    : []
  const lastDate = ready ? state.checkIns.at(-1)?.session_date : null
  const checkedToday = lastDate && daysAgo(lastDate) === 'Today'

  return (
    <>
      <ScreenHeader
        title="Rehab"
        intro={
          state.coach
            ? `How each injury is going. ${state.coach.display_name ?? 'Your coach'} sets your stages and guidance.`
            : 'Where each injury is on the road back, and what moves it up a stage.'
        }
      />
      {state.status === 'loading' && <LoadingCards count={3} height="h-48" label="Loading your rehab" />}
      {state.status === 'error' && (
        <div>
          <p className="text-red-400">Couldn't load your rehab. Check your connection.</p>
          <button type="button" onClick={() => setState({ status: 'loading' })} className={`mt-4 ${buttonSecondary}`}>
            Try again
          </button>
        </div>
      )}
      {ready && !state.sites.length && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-display text-2xl font-semibold">No injuries on your map</h2>
          <p className="mt-2 text-neutral-300">Add your injuries on the Body map tab and they'll be tracked here.</p>
          <a href="#body-map" className={`mt-5 block text-center ${buttonPrimary}`}>
            Go to Body map
          </a>
        </section>
      )}
      {ready && state.sites.length > 0 && (
        <div className="space-y-4">
          <a
            href="#today"
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-5 py-4 text-sm hover:border-gold"
          >
            <span className="text-neutral-300">
              {checkedToday
                ? "You've checked in today. Nice."
                : lastDate
                  ? `Last check-in ${daysAgo(lastDate).toLowerCase()}`
                  : 'No check-ins yet'}
            </span>
            {!checkedToday && <span className="shrink-0 font-semibold text-gold">Check in on Today ›</span>}
          </a>
          {cards.map(({ site, checkIns, coachPlan }) => (
            <AreaCard key={site.areaId} site={site} checkIns={checkIns} coach={state.coach} coachPlan={coachPlan} />
          ))}
          <HowItWorks coach={state.coach} />
        </div>
      )}
    </>
  )
}
