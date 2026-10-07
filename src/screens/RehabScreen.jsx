import { useEffect, useState } from 'react'
import CheckInForm from '../components/CheckInForm.jsx'
import { LoadingCards, ScreenHeader, buttonPrimary, buttonSecondary } from '../components/ui.jsx'
import { fetchInjurySites, fetchRecentCheckIns, painWord } from '../lib/checkins.js'
import { daysAgo } from '../lib/programme.js'

const SLOTS = 12

const painColour = (value) =>
  value == null ? '#262626' : value >= 7 ? '#dc2626' : value >= 4 ? '#f59e0b' : value >= 1 ? '#fde047' : '#3a3a3a'

// Compares the average of the last three scores with the three before
function trend(values) {
  if (values.length < 4) return { label: 'Building a picture', tone: 'text-muted' }
  const recent = values.slice(-3)
  const before = values.slice(-6, -3)
  const avg = (list) => list.reduce((sum, v) => sum + v, 0) / list.length
  const change = avg(recent) - avg(before)
  if (change <= -1) return { label: 'Improving', tone: 'text-gold' }
  if (change >= 1) return { label: 'Worse lately', tone: 'text-red-400' }
  return { label: 'Steady', tone: 'text-neutral-300' }
}

function AreaCard({ site, checkIns }) {
  const latest = checkIns.at(-1)
  const scores = checkIns.map((c) => c.next_morning ?? c.pain_after).filter((v) => v != null)
  const { label, tone } = trend(scores)
  const recentFlag = checkIns.slice(-5).some((c) => c.red_flag)
  const bars = checkIns.slice(-SLOTS)

  return (
    <article className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold leading-tight">{site.label}</h2>
          <p className="text-xs text-muted">{site.injuries.join(' · ')}</p>
        </div>
        <span className={`shrink-0 text-sm font-semibold ${tone}`}>{label}</span>
      </div>

      {recentFlag && (
        <p className="mt-3 rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          Warning signs reported recently. Get this area checked before loading it.
        </p>
      )}

      {bars.length ? (
        <>
          <div
            className="mt-4 flex h-14 items-end gap-1.5"
            role="img"
            aria-label={`Pain scores for the last ${bars.length} check-ins`}
          >
            {Array.from({ length: SLOTS - bars.length }, (_, i) => (
              <span key={`empty-${i}`} className="h-[8%] flex-1 rounded-t bg-[#161616]" />
            ))}
            {bars.map((c) => {
              const value = c.next_morning ?? c.pain_after
              return (
                <span
                  key={c.id}
                  className="flex-1 rounded-t transition-[height] duration-500"
                  style={{ height: `${Math.max(8, (value ?? 0) * 10)}%`, backgroundColor: painColour(value) }}
                />
              )
            })}
          </div>
          <p className="mt-3 text-sm text-neutral-300">
            Last check-in {daysAgo(latest.session_date).toLowerCase()}:{' '}
            {[
              latest.pain_during != null && `during ${latest.pain_during}`,
              latest.pain_after != null && `after ${latest.pain_after}`,
              latest.next_morning != null && `next morning ${latest.next_morning}`,
            ]
              .filter(Boolean)
              .join(' · ')}
            <span className="text-muted">
              {' '}
              ({painWord(latest.next_morning ?? latest.pain_after ?? 0).toLowerCase()})
            </span>
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">No check-ins yet. They're added after each session.</p>
      )}
    </article>
  )
}

export default function RehabScreen() {
  const [state, setState] = useState({ status: 'loading' })
  const [checkingIn, setCheckingIn] = useState(false)

  useEffect(() => {
    if (state.status !== 'loading') return
    let cancelled = false
    Promise.all([fetchInjurySites(), fetchRecentCheckIns()])
      .then(([sites, checkIns]) => !cancelled && setState({ status: 'ready', sites, checkIns }))
      .catch(() => !cancelled && setState({ status: 'error' }))
    return () => {
      cancelled = true
    }
  }, [state.status])

  return (
    <>
      <ScreenHeader title="Rehab" intro="How each injury is responding, check-in by check-in." />
      {state.status === 'loading' && <LoadingCards count={3} height="h-40" label="Loading your rehab" />}
      {state.status === 'error' && (
        <div>
          <p className="text-red-400">Couldn't load your rehab. Check your connection.</p>
          <button type="button" onClick={() => setState({ status: 'loading' })} className={`mt-4 ${buttonSecondary}`}>
            Try again
          </button>
        </div>
      )}
      {state.status === 'ready' && !state.sites.length && (
        <section className="rounded-2xl border border-line bg-panel p-5">
          <h2 className="font-display text-2xl font-semibold">No injuries on your map</h2>
          <p className="mt-2 text-neutral-300">Add your injuries on the Body map tab and they'll be tracked here.</p>
          <a href="#body-map" className={`mt-5 block text-center ${buttonPrimary}`}>
            Go to Body map
          </a>
        </section>
      )}
      {state.status === 'ready' && state.sites.length > 0 && (
        <div className="space-y-4">
          {checkingIn ? (
            <CheckInForm
              sites={state.sites}
              title="Quick check-in"
              quick
              onSaved={() =>
                setTimeout(() => {
                  setCheckingIn(false)
                  setState({ status: 'loading' })
                }, 1500)
              }
            />
          ) : (
            <button type="button" onClick={() => setCheckingIn(true)} className={`w-full ${buttonSecondary}`}>
              Check in now (rest day or anytime)
            </button>
          )}
          {state.sites.map((site) => (
            <AreaCard
              key={site.areaId}
              site={site}
              checkIns={state.checkIns.filter((c) => c.area_id === site.areaId)}
            />
          ))}
          <div className="flex justify-center gap-4 pt-2 text-xs text-muted">
            {[
              ['None', '#3a3a3a'],
              ['Mild', '#fde047'],
              ['Moderate', '#f59e0b'],
              ['Severe', '#dc2626'],
            ].map(([name, colour]) => (
              <span key={name} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
