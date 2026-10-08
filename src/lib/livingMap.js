 import { supabase } from './supabase.js'
import { todayDate } from './programme.js'
import { CENTRAL_AREAS, INJURIES } from '../data/injuries.js'
import { musclesForExercise } from '../data/muscles.js'

// One scale for everyone, from injured up to elite
export const LEVELS = {
  injured: { label: 'Injured', fill: '#dc2626', rank: 0 },
  affected: { label: 'Affected', fill: '#f59e0b', rank: 1 },
  watch: { label: 'Watch', fill: '#fde047', rank: 2 },
  neutral: { label: 'Neutral', fill: '#222222', rank: 3 },
  building: { label: 'Building', fill: '#2f6fde', rank: 4 },
  strong: { label: 'Strong', fill: '#38bdf8', rank: 5 },
  elite: { label: 'Elite', fill: '#c9a227', rank: 6 },
}

const TIER_TO_LEVEL = { primary: 'injured', affected: 'affected', watch: 'watch' }

// The figure's muscles and joints that sit under each injury-library area
const AREA_SHAPES = {
  Head: ['head'],
  Neck: ['neck', 'upper-trap'],
  Chest: ['upper-chest', 'mid-chest', 'lower-chest'],
  'Upper back': ['upper-trap', 'mid-traps'],
  Abdomen: ['abs', 'obliques'],
  'Lower back': ['lower-back'],
  Shoulder: ['front-delt', 'side-delt', 'rear-delt', 'infraspinatus'],
  'Upper arm': ['biceps-long', 'biceps-short', 'triceps-long', 'triceps-lateral', 'triceps-medial'],
  Elbow: ['elbow'],
  Forearm: ['forearm-flexors', 'forearm-extensors'],
  'Wrist and hand': ['wrist-and-hand'],
  Hip: ['hip-flexor', 'adductors', 'glute-med'],
  Glute: ['glute-max', 'glute-med'],
  Quad: ['quad-outer', 'quad-front', 'quad-inner'],
  Hamstring: ['hamstring-outer', 'hamstring-inner'],
  Knee: ['knee'],
  Shin: ['tibialis'],
  Calf: ['calf-outer', 'calf-inner', 'soleus'],
  'Ankle and foot': ['ankle-and-foot'],
}

// Shapes drawn once down the middle of the figure; everything else exists on each side
export const CENTRAL_SHAPES = new Set(['head', 'neck', 'abs'])

const slug = (text) => text.toLowerCase().replace(/\s+/g, '-')
const sideName = (side) => (side === 'right' ? 'Right' : 'Left')
export const shapeKey = (id, side) => (CENTRAL_SHAPES.has(id) ? id : `${side}-${id}`)

export async function fetchInjuryRows() {
  const { data, error } = await supabase.from('injuries').select('injury_key, side').order('created_at')
  if (error) throw error
  return data
}

// How an injury site is doing, from its check-ins. Worsening shows at once; improving needs a run of good days.
export function siteStatus(checkIns) {
  const scores = checkIns.map((c) => c.next_morning ?? c.pain_after).filter((v) => v != null)
  const recent = checkIns.slice(-5)
  if (recent.some((c) => c.red_flag) || (scores.length && scores.at(-1) >= 7)) return { level: 'injured', flare: true }
  const goodRun = (n) => scores.length >= n && scores.slice(-n).every((v) => v <= 2)
  if (goodRun(6)) return { level: 'watch', stepped: 2 }
  if (goodRun(3)) return { level: 'affected', stepped: 1 }
  return { level: 'injured' }
}

// Injury colour for every shape on the figure, with the reasons behind it
export function injuryLayer(rows, checkIns) {
  const layer = {}
  const add = (key, level, reason, flare) => {
    const entry = (layer[key] ??= { level, reasons: [], flare: false })
    if (LEVELS[level].rank < LEVELS[entry.level].rank) entry.level = level
    entry.flare ||= Boolean(flare)
    entry.reasons.push(reason)
  }

  for (const row of rows) {
    const injury = INJURIES.find((item) => item.id === row.injury_key)
    if (!injury) continue
    const injuryLabel = injury.central ? injury.name : `${sideName(row.side)}: ${injury.name}`

    for (const effect of injury.effects) {
      const centralArea = CENTRAL_AREAS.includes(effect.area)
      // One-sided injuries stay on their side, even for areas like the upper back
      const sides = injury.central || effect.bothSides ? ['right', 'left'] : [row.side]
      let level = TIER_TO_LEVEL[effect.tier]
      let status = null
      if (effect.tier === 'primary') {
        const areaId = centralArea ? slug(effect.area) : `${row.side}-${slug(effect.area)}`
        status = siteStatus(checkIns.filter((c) => c.area_id === areaId))
        level = status.level
      }
      const note = status?.flare
        ? 'Recent check-ins flagged pain or warning signs here.'
        : status?.stepped
          ? `${effect.note} Check-ins have been good, so it has stepped down.`
          : effect.note
      for (const side of sides) {
        for (const id of AREA_SHAPES[effect.area] ?? []) {
          add(shapeKey(id, side), level, { injuryLabel, level, note }, status?.flare)
        }
      }
    }
  }
  return layer
}

const DAY = 86400000
const e1rm = (weight, reps) => weight * (1 + Math.min(reps, 12) / 30)

// Strength level per muscle from the last eight weeks of logged sets
export function strengthLayer(history) {
  const today = new Date(`${todayDate()}T12:00:00`).getTime()
  const weekOf = (date) => Math.floor((today - new Date(`${date}T12:00:00`).getTime()) / DAY / 7)
  const muscles = {}

  for (const row of history) {
    const week = weekOf(row.session_date)
    if (week < 0 || week > 7) continue
    const { primary, secondary } = musclesForExercise(row.exercise)
    for (const [ids, credit] of [
      [primary, 1],
      [secondary, 0.5],
    ]) {
      for (const id of ids) {
        const m = (muscles[id] ??= { weeks: Array(8).fill(0), recent: {}, before: {} })
        m.weeks[week] += credit
        if (credit === 1 && row.weight_kg != null && row.reps) {
          const value = e1rm(Number(row.weight_kg), row.reps)
          const bucket = week < 2 ? m.recent : week < 4 ? m.before : null
          if (bucket) bucket[row.exercise] = Math.max(bucket[row.exercise] ?? 0, value)
        }
      }
    }
  }

  const layer = {}
  for (const [id, m] of Object.entries(muscles)) {
    const trained = (n) => m.weeks.slice(0, n).filter((sets) => sets >= 2).length
    const last4 = trained(4)
    const last8 = trained(8)
    const changes = Object.keys(m.recent)
      .filter((name) => m.before[name])
      .map((name) => m.recent[name] / m.before[name] - 1)
    const change = changes.length ? Math.max(...changes) : null
    const holding = change == null || change > -0.05
    const improving = change != null && change >= 0.025

    let level = 'neutral'
    if (last4 >= 2) level = 'building'
    if (last4 >= 3 && holding) level = 'strong'
    if (last8 >= 7 && improving) level = 'elite'
    layer[id] = { level, last4, last8, change }
  }
  return layer
}

// What each shape shows: injury colours win while they matter, then earned strength
export function combine(injury, strength) {
  if (injury && injury.level !== 'watch') return { level: injury.level, source: 'injury' }
  if (strength && strength.level !== 'neutral') return { level: strength.level, source: 'strength' }
  if (injury) return { level: 'watch', source: 'injury' }
  return { level: 'neutral', source: 'none' }
}

export function nextStep(strength) {
  if (!strength || strength.level === 'neutral') return 'Train it in 2 of the next 4 weeks to start Building.'
  if (strength.level === 'building') return 'Train it in 3 of 4 weeks without your lifts dropping to reach Strong.'
  if (strength.level === 'strong') return 'Keep it going 7 of 8 weeks with your lifts climbing to go Elite.'
  return 'Elite. Keep the streak alive to hold it.'
}
