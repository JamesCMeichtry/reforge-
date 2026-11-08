import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { fetchInjuryRows } from '../lib/livingMap.js'
import { fetchRecentCheckIns, painWord } from '../lib/checkins.js'
import { fetchRequests } from '../lib/coaching.js'
import { daysAgo } from '../lib/programme.js'
import { INJURIES } from '../data/injuries.js'

// The strip across the top of the builder: what to plan around, without leaving the plan

const areaLabel = (id) => id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ')
const painColour = (value) =>
  value >= 7
    ? 'var(--pain-severe)'
    : value >= 4
      ? 'var(--pain-moderate, #f59e0b)'
      : value > 0
        ? 'var(--pain-mild)'
        : 'var(--color-muted)'

// Average effort and the last day trained, from the last two weeks of logged sets
async function fetchEffort(userId) {
  const since = new Date()
  since.setDate(since.getDate() - 14)
  const { data, error } = await supabase
    .from('set_logs')
    .select('session_date, rpe')
    .eq('user_id', userId)
    .gte('session_date', since.toLocaleDateString('en-CA'))
    .order('session_date', { ascending: false })
    .limit(500)
  if (error) throw error
  const rated = data.filter((row) => row.rpe != null)
  const sessions = new Set(data.map((row) => row.session_date)).size
  return {
    lastTrained: data[0]?.session_date ?? null,
    sessions,
    rpe: rated.length ? rated.reduce((sum, row) => sum + Number(row.rpe), 0) / rated.length : null,
  }
}

function useClientContext(userId, isCoach) {
  const [state, setState] = useState({ injuries: null, sites: [], effort: null, requests: 0 })
  useEffect(() => {
    let live = true
    const merge = (part) => live && setState((s) => ({ ...s, ...part }))
    fetchInjuryRows(userId)
      .then((rows) =>
        merge({
          injuries: rows.map((row) => {
            const injury = INJURIES.find((i) => i.id === row.injury_key)
            const side = row.side === 'right' ? 'R' : row.side === 'left' ? 'L' : ''
            return { key: `${row.injury_key}-${row.side}`, name: injury?.name ?? row.injury_key, side }
          }),
        }),
      )
      .catch(() => merge({ injuries: [] }))
    fetchRecentCheckIns(14, userId)
      .then((rows) => {
        const latest = new Map()
        for (const row of rows) latest.set(row.area_id, row)
        merge({
          sites: [...latest.values()].map((row) => ({
            area: areaLabel(row.area_id),
            pain: Math.max(row.pain_during ?? 0, row.pain_after ?? 0, row.next_morning ?? 0),
            date: row.session_date,
            flag: row.red_flag,
          })),
        })
      })
      .catch(() => {})
    fetchEffort(userId)
      .then((effort) => merge({ effort }))
      .catch(() => {})
    if (isCoach)
      fetchRequests(userId, true)
        .then((list) => merge({ requests: list.length }))
        .catch(() => {})
    return () => {
      live = false
    }
  }, [userId, isCoach])
  return state
}

function Chip({ children, tone, title }) {
  return (
    <span
      title={title}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1 text-xs font-semibold text-neutral-200"
    >
      {tone && <span className="h-2 w-2 rounded-full" style={{ background: tone }} aria-hidden="true" />}
      {children}
    </span>
  )
}

function Group({ label, children }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">{label}</span>
      {children}
    </div>
  )
}

export default function BuilderContext({ userId, isCoach }) {
  const { injuries, sites, effort, requests } = useClientContext(userId, isCoach)
  const flagged = sites.some((s) => s.flag || s.pain >= 7)

  return (
    <div
      className="bd-strip flex items-center gap-6 overflow-x-auto border-b border-line px-6 py-2.5"
      aria-label="Plan around"
    >
      <Group label="Injuries">
        {injuries === null && <Chip>Loading…</Chip>}
        {injuries?.length === 0 && <Chip tone="var(--lvl-active, #22c55e)">None recorded</Chip>}
        {injuries?.map((injury) => (
          <Chip key={injury.key} tone="var(--pain-severe)">
            {injury.name}
            {injury.side && <span className="text-muted">{injury.side}</span>}
          </Chip>
        ))}
      </Group>
      {sites.length > 0 && (
        <Group label="Latest pain">
          {sites.map((site) => (
            <Chip
              key={site.area}
              tone={painColour(site.pain)}
              title={`${painWord(site.pain)} · checked in ${daysAgo(site.date).toLowerCase()}`}
            >
              {site.area} {site.pain}/10
              {site.flag && <span className="text-red-400">· red flag</span>}
            </Chip>
          ))}
        </Group>
      )}
      {effort && (
        <Group label="Last 2 weeks">
          <Chip>
            {effort.sessions} {effort.sessions === 1 ? 'session' : 'sessions'}
          </Chip>
          {effort.rpe != null && <Chip>Avg RPE {effort.rpe.toFixed(1)}</Chip>}
          <Chip>{effort.lastTrained ? `Trained ${daysAgo(effort.lastTrained).toLowerCase()}` : 'Not trained'}</Chip>
        </Group>
      )}
      {requests > 0 && (
        <Group label="Asked for">
          <Chip tone="var(--color-gold)">
            {requests} change {requests === 1 ? 'request' : 'requests'}
          </Chip>
        </Group>
      )}
      {flagged && (
        <span className="ml-auto shrink-0 rounded-full bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
          Flaring up: go easy on the sore areas
        </span>
      )}
    </div>
  )
}
