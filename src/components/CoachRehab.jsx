import { useEffect, useState } from 'react'
import { LoadingCards, buttonPrimary, inputBase } from './ui.jsx'
import { fetchInjurySites, fetchRecentCheckIns } from '../lib/checkins.js'
import { fetchRehabPlans, saveRehabPlan } from '../lib/pro.js'
import { daysAgo } from '../lib/programme.js'
import { PainChart, STAGES, recovery, score, trend } from '../screens/RehabScreen.jsx'

// The coach decides each injured area's stage and what the client should do or avoid.
// The app's reading of the check-ins is shown as a suggestion only.
export default function CoachRehab({ clientId, clientName = 'your client' }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([fetchInjurySites(clientId), fetchRecentCheckIns(56, clientId), fetchRehabPlans(clientId)])
      .then(([sites, checkIns, plans]) => setData({ sites, checkIns, plans }))
      .catch(() => setError(true))
  }, [clientId])

  if (error) return <p className="text-red-400">Couldn't load their rehab. Check your connection.</p>
  if (!data) return <LoadingCards count={2} height="h-48" label="Loading rehab" />
  if (!data.sites.length) {
    return <p className="text-neutral-300">{clientName} has no injuries on their map. Add them in Injuries.</p>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        You set each area's stage and guidance. {clientName} sees exactly what you write here, and none of the app's
        automatic advice.
      </p>
      {data.sites.map((site) => (
        <AreaPlan
          key={site.areaId}
          clientId={clientId}
          clientName={clientName}
          site={site}
          checkIns={data.checkIns.filter((c) => c.area_id === site.areaId)}
          saved={data.plans.find((p) => p.area_id === site.areaId)}
        />
      ))}
    </div>
  )
}

function AreaPlan({ clientId, clientName, site, checkIns, saved }) {
  const [stage, setStage] = useState(saved?.stage ?? null)
  const [guidance, setGuidance] = useState(saved?.guidance ?? '')
  const [restrictions, setRestrictions] = useState(saved?.restrictions ?? '')
  const [state, setState] = useState(saved ? 'saved' : 'idle')
  const suggested = recovery(checkIns)
  const scores = checkIns.map(score).filter((v) => v != null)
  const direction = trend(scores)
  const latest = checkIns.at(-1)
  const dirty = () => setState('idle')

  async function save() {
    setState('saving')
    try {
      await saveRehabPlan(clientId, site.areaId, { stage, guidance, restrictions })
      setState('saved')
    } catch {
      setState('error')
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-panel">
      <div
        className="h-1"
        style={{ backgroundColor: stage != null ? STAGES[stage].colour : 'var(--color-line)' }}
        aria-hidden="true"
      />
      <div className="p-5">
        <h2 className="font-display text-3xl font-semibold leading-tight">{site.label}</h2>
        <p className="text-xs text-muted">{site.injuries.join(' · ')}</p>

        <p className="mt-3 text-sm text-neutral-300">
          {latest
            ? `Last check-in ${daysAgo(latest.session_date).toLowerCase()}: ${score(latest) ?? latest.pain_during ?? '–'}/10`
            : 'No check-ins yet.'}
          {direction && <span className={`font-semibold ${direction.tone}`}> · {direction.label}</span>}
          {checkIns.slice(-5).some((c) => c.red_flag) && (
            <span className="font-semibold text-red-400"> · Warning signs reported</span>
          )}
        </p>
        <PainChart checkIns={checkIns} />

        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-dashed border-line px-3 py-2.5">
          <p className="text-sm text-muted">
            Check-ins suggest{' '}
            <span className="font-semibold" style={{ color: STAGES[suggested.stage].colour }}>
              {STAGES[suggested.stage].name}
            </span>
          </p>
          {stage !== suggested.stage && (
            <button
              type="button"
              onClick={() => {
                setStage(suggested.stage)
                dirty()
              }}
              className="shrink-0 text-sm font-semibold text-gold"
            >
              Use this
            </button>
          )}
        </div>

        <p className="mb-2 mt-4 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">Your stage</p>
        <div className="grid grid-cols-4 gap-1 rounded-xl border border-line p-1" role="group" aria-label="Stage">
          {STAGES.map((s, i) => (
            <button
              key={s.name}
              type="button"
              aria-pressed={stage === i}
              onClick={() => {
                setStage(stage === i ? null : i)
                dirty()
              }}
              className="rounded-lg py-2 text-xs font-bold uppercase tracking-wide"
              style={stage === i ? { backgroundColor: s.colour, color: '#111' } : { color: 'var(--color-muted)' }}
            >
              {s.name}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-xs font-medium text-muted">
          Guidance {clientName} sees
          <textarea
            value={guidance}
            onChange={(event) => {
              setGuidance(event.target.value)
              dirty()
            }}
            rows={3}
            maxLength={1000}
            placeholder="e.g. Keep squats to the box this week. Pain up to 3/10 is fine if it settles by morning."
            className={`mt-1 ${inputBase}`}
          />
        </label>
        <label className="mt-3 block text-xs font-medium text-muted">
          Avoid for now
          <input
            value={restrictions}
            onChange={(event) => {
              setRestrictions(event.target.value)
              dirty()
            }}
            maxLength={300}
            placeholder="e.g. Running, jumping, deep knee bends under load"
            className={`mt-1 ${inputBase}`}
          />
        </label>
        <button
          type="button"
          onClick={save}
          disabled={state === 'saving' || state === 'saved'}
          className={`mt-4 w-full ${buttonPrimary}`}
        >
          {state === 'saving'
            ? 'Saving…'
            : state === 'saved'
              ? `✓ ${clientName} can see this`
              : 'Save for ' + clientName}
        </button>
        {state === 'error' && <p className="mt-2 text-sm text-red-400">Couldn't save. Check your connection.</p>}
      </div>
    </article>
  )
}
