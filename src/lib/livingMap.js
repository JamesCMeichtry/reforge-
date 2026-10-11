import { supabase } from './supabase.js'
import { me } from './me.js'
import { todayDate } from './programme.js'
import { CENTRAL_AREAS, INJURIES } from '../data/injuries.js'
import { musclesForExercise } from '../data/muscles.js'

// One scale for everyone: five injury tiers, neutral, then five strength tiers up to gold
export const LEVELS = {
  flare: { label: 'Flare', fill: '#be123c', rank: 0 },
  injured: { label: 'Injured', fill: '#ef4444', rank: 1 },
  affected: { label: 'Affected', fill: '#f97316', rank: 2 },
  recovering: { label: 'Recovering', fill: '#f59e0b', rank: 3 },
  watch: { label: 'Watch', fill: '#4a1f1f', rank: 4 },
  neutral: { label: 'Neutral', fill: '#272727', rank: 5 },
  active: { label: 'Active', fill: '#22c55e', rank: 6 },
  building: { label: 'Building', fill: '#3b82f6', rank: 7 },
  strong: { label: 'Strong', fill: '#22d3ee', rank: 8 },
  silver: { label: 'Silver', fill: '#cbd5e1', rank: 9 },
  elite: { label: 'Gold', fill: '#c9a227', rank: 10 },
}
export const INJURY_TIERS = ['flare', 'injured', 'affected', 'recovering', 'watch']
export const STRENGTH_TIERS = ['active', 'building', 'strong', 'silver', 'elite']
// Injury tiers that hold a muscle's strength colour back until they settle
const BLOCKING = new Set(['flare', 'injured', 'affected'])

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

export async function fetchInjuryRows(userId = me()) {
  const { data, error } = await supabase
    .from('injuries')
    .select('injury_key, side, details')
    .eq('user_id', userId)
    .order('created_at')

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
        // A flare is its own tier; a site with a long run of good check-ins is recovering
        level = status.flare ? 'flare' : status.level === 'watch' ? 'recovering' : status.level
      }
      const note = status?.flare
        ? 'Recent check-ins flagged pain or warning signs here.'
        : status?.stepped
          ? `${effect.note} Check-ins have been good, so it has stepped down.`
          : effect.note
      for (const side of sides) {
        for (const id of AREA_SHAPES[effect.area] ?? []) {
          add(
            shapeKey(id, side),
            level,
            { injuryLabel, level, note, details: effect.tier === 'primary' ? row.details : null },
            status?.flare,
          )
        }
      }
    }
  }
  return layer
}

const DAY = 86400000
const e1rm = (weight, reps) => weight * (1 + Math.min(reps, 12) / 30)

// Levelling up: every muscle earns XP from the work you log and from using the app.
export const XP = {
  primarySet: 10, // a set where this is a main muscle
  secondarySet: 4, // a set where it also works
  checkIn: 5, // a check-in day, for each muscle trained in the 7 days before
  fadeAfterDays: 21, // untrained this long and XP starts to fade
  fadePerDay: 0.02, // 2% a day after that
}
export const XP_LEVELS = [
  { level: 'active', xp: 30 },
  { level: 'building', xp: 100 },
  { level: 'strong', xp: 400 },
  { level: 'silver', xp: 1000 },
  { level: 'elite', xp: 2000 },
]
const daysBetween = (a, b) => Math.round((new Date(`${b}T12:00:00`) - new Date(`${a}T12:00:00`)) / DAY)

function levelForXp(xp) {
  let level = 'neutral'
  for (const step of XP_LEVELS) if (xp >= step.xp) level = step.level
  return level
}

// XP and level per muscle, plus how often it's trained and whether lifts are moving.
// start is the XP each muscle began with from the questionnaire, and the date it was set.
export function strengthLayer(history, checkIns = [], start = null) {
  const todayStr = todayDate()
  const today = new Date(`${todayStr}T12:00:00`).getTime()
  const weekOf = (date) => Math.floor((today - new Date(`${date}T12:00:00`).getTime()) / DAY / 7)
  const muscles = {}
  const trainedOn = new Map() // date -> Set of muscles trained that day

  for (const [id, xp] of Object.entries(start?.xp ?? {})) {
    if (xp > 0) muscles[id] = { xp, last: start.date, weeks: Array(8).fill(0), recent: {}, before: {} }
  }

  for (const row of history) {
    const week = weekOf(row.session_date)
    if (week < 0) continue
    const { primary, secondary } = musclesForExercise(row.exercise)
    for (const [ids, credit, xp] of [
      [primary, 1, XP.primarySet],
      [secondary, 0.5, XP.secondarySet],
    ]) {
      for (const id of ids) {
        const m = (muscles[id] ??= { xp: 0, last: null, weeks: Array(8).fill(0), recent: {}, before: {} })
        m.xp += xp
        if (!m.last || row.session_date > m.last) m.last = row.session_date
        if (!trainedOn.has(row.session_date)) trainedOn.set(row.session_date, new Set())
        trainedOn.get(row.session_date).add(id)
        if (week > 7) continue
        m.weeks[week] += credit
        if (credit === 1 && row.weight_kg != null && row.reps) {
          const value = e1rm(Number(row.weight_kg), row.reps)
          const bucket = week < 2 ? m.recent : week < 4 ? m.before : null
          if (bucket) bucket[row.exercise] = Math.max(bucket[row.exercise] ?? 0, value)
        }
      }
    }
  }

  // Check-ins reward the muscles you've been working that week
  const checkInDays = [...new Set(checkIns.map((c) => c.session_date))]
  for (const day of checkInDays) {
    const recent = new Set()
    for (const [date, ids] of trainedOn) {
      const gap = daysBetween(date, day)
      if (gap >= 0 && gap <= 7) ids.forEach((id) => recent.add(id))
    }
    recent.forEach((id) => (muscles[id].xp += XP.checkIn))
  }

  const layer = {}
  for (const [id, m] of Object.entries(muscles)) {
    const idle = m.last ? daysBetween(m.last, todayStr) : 0
    const fadeDays = Math.max(0, idle - XP.fadeAfterDays)
    const xp = Math.round(m.xp * Math.pow(1 - XP.fadePerDay, fadeDays))
    const level = levelForXp(xp)
    const next = XP_LEVELS.find((step) => step.xp > xp) ?? null
    const floor = [...XP_LEVELS].reverse().find((step) => step.xp <= xp)?.xp ?? 0
    const last4 = m.weeks.slice(0, 4).filter((sets) => sets >= 2).length
    const changes = Object.keys(m.recent)
      .filter((name) => m.before[name])
      .map((name) => m.recent[name] / m.before[name] - 1)
    const change = changes.length ? Math.max(...changes) : null
    layer[id] = {
      level,
      xp,
      next,
      progress: next ? (xp - floor) / (next.xp - floor) : 1,
      fading: fadeDays > 0,
      last4,
      change,
    }
  }
  return layer
}

// What each shape shows: injury colours win while they matter, then earned strength
export function combine(injury, strength) {
  if (injury && BLOCKING.has(injury.level)) return { level: injury.level, source: 'injury' }
  if (strength && strength.level !== 'neutral') return { level: strength.level, source: 'strength' }
  if (injury) return { level: injury.level, source: 'injury' }
  return { level: 'neutral', source: 'none' }
}

export const isBlocking = (level) => BLOCKING.has(level)

export function nextStep(strength) {
  if (!strength || !strength.xp)
    return `Log a set that works it to start earning XP. ${XP_LEVELS[0].xp} XP reaches ${LEVELS[XP_LEVELS[0].level].label}.`
  const fade = strength.fading ? ' It is fading from lack of training, so train it soon to stop the slide.' : ''
  if (!strength.next) return `Gold. Keep training it to hold the top tier.${fade}`
  const sets = Math.ceil((strength.next.xp - strength.xp) / XP.primarySet)
  const name = LEVELS[strength.next.level].label
  return `${strength.next.xp - strength.xp} XP to ${name}, about ${sets} more working ${sets === 1 ? 'set' : 'sets'}.${fade}`
}
