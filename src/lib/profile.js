import { supabase } from './supabase.js'
import { FIGURE_DETAILED } from '../data/anatomyDetailed.js'
import { XP_LEVELS } from './livingMap.js'

// Answers from the starting questionnaire, one row per account in the profiles table
export async function fetchProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) throw error
  return data
}

export async function saveProfile(userId, values) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...values, updated_at: new Date().toISOString() })
    .select('*')
    .single()
  if (error) throw error
  return data
}

export const STYLES = [
  { id: 'general', label: 'General fitness', note: 'Staying fit, strong and healthy' },
  { id: 'bodybuilding', label: 'Bodybuilding', note: 'Building muscle and shape' },
  { id: 'powerlifting', label: 'Powerlifting', note: 'Squat, bench and deadlift' },
  { id: 'strongman', label: 'Strongman', note: 'Heavy events and odd objects' },
  { id: 'sport', label: 'Sport', note: 'Training to perform in a sport' },
  { id: 'returning', label: 'Coming back from injury', note: 'Rebuilding after time out' },
]

export const EXPERIENCE = [
  { id: 'new', label: 'Just starting', note: 'Less than 6 months', xp: 0 },
  { id: 'under-1', label: 'Under a year', note: '6 to 12 months', xp: 40 },
  { id: '1-3', label: '1 to 3 years', note: 'Training regularly', xp: 120 },
  { id: '3-5', label: '3 to 5 years', note: 'Experienced', xp: 250 },
  { id: '5-plus', label: '5 years or more', note: 'Very experienced', xp: 420 },
]

export const GOALS = [
  { id: 'strength', label: 'Get stronger' },
  { id: 'muscle', label: 'Build muscle' },
  { id: 'recover', label: 'Recover from injury' },
  { id: 'health', label: 'Stay healthy and moving' },
  { id: 'compete', label: 'Compete' },
  { id: 'lose-fat', label: 'Lose fat' },
]

export const PROFESSIONS = [
  { id: 'physio', label: 'Physiotherapist' },
  { id: 'pt', label: 'Personal trainer' },
  { id: 'sc', label: 'Strength and conditioning coach' },
  { id: 'sports-therapist', label: 'Sports therapist' },
]

// Best lifts, compared with bodyweight. Ratios are rough guides for each level (men; women use 70%).
export const LIFTS = [
  {
    id: 'squat',
    label: 'Squat',
    ratios: [0.75, 1.25, 1.75, 2.25],
    muscles: ['quad-front', 'quad-outer', 'quad-inner', 'glute-max', 'adductors'],
  },
  {
    id: 'bench',
    label: 'Bench press',
    ratios: [0.6, 1.0, 1.35, 1.65],
    muscles: ['upper-chest', 'mid-chest', 'lower-chest', 'front-delt', 'triceps-lateral', 'triceps-medial'],
  },
  {
    id: 'deadlift',
    label: 'Deadlift',
    ratios: [1.0, 1.5, 2.1, 2.6],
    muscles: ['hamstring-outer', 'hamstring-inner', 'glute-max', 'lower-back', 'mid-traps', 'forearm-flexors', 'lats'],
  },
  {
    id: 'press',
    label: 'Overhead press',
    ratios: [0.4, 0.65, 0.85, 1.05],
    muscles: ['front-delt', 'side-delt', 'triceps-long', 'upper-trap'],
  },
]

const ALL_MUSCLES = [
  ...new Set(
    ['front', 'back'].flatMap((view) =>
      FIGURE_DETAILED[view].shapes.filter((row) => row[1] === 'muscle').map((row) => row[0]),
    ),
  ),
]

// XP for a lift: each ratio reaches the next level from Building up to Gold, in between is shared out evenly
function liftXp(ratio, ratios) {
  const steps = [0, ...XP_LEVELS.slice(1).map((step) => step.xp)]
  const marks = [0, ...ratios]
  for (let i = marks.length - 1; i >= 0; i--) {
    if (ratio >= marks[i]) {
      if (i === marks.length - 1) return steps[i]
      const t = (ratio - marks[i]) / (marks[i + 1] - marks[i])
      return Math.round(steps[i] + (steps[i + 1] - steps[i]) * t)
    }
  }
  return 0
}

// Starting XP for every muscle, from experience and best lifts, so the map starts at the right level
export function startingXp(profile) {
  if (!profile || profile.role !== 'athlete') return {}
  const base = EXPERIENCE.find((step) => step.id === profile.experience)?.xp ?? 0
  const out = Object.fromEntries(ALL_MUSCLES.map((id) => [id, base]))
  const bodyweight = Number(profile.bodyweight_kg)
  if (bodyweight > 0) {
    const scale = profile.body === 'female' ? 0.7 : 1
    for (const lift of LIFTS) {
      const best = Number(profile.lifts?.[lift.id])
      if (!(best > 0)) continue
      const xp = liftXp(
        best / bodyweight,
        lift.ratios.map((r) => r * scale),
      )
      for (const id of lift.muscles) out[id] = Math.max(out[id] ?? 0, xp)
    }
  }
  return out
}

// Questions asked about each injury, so training can work around it
export const INJURY_WHEN = [
  { id: 'under-2w', label: 'Under 2 weeks ago' },
  { id: '2-6w', label: '2 to 6 weeks ago' },
  { id: '6w-3m', label: '6 weeks to 3 months ago' },
  { id: '3-12m', label: '3 to 12 months ago' },
  { id: 'over-1y', label: 'Over a year ago' },
]

export const INJURY_STAGES = [
  { id: 'acute', short: 'just happened', label: 'It has just happened', note: 'Still sore, swollen or hard to use' },
  { id: 'rehab', short: 'in rehab', label: "I'm doing rehab", note: 'Building it back up, with or without a physio' },
  { id: 'returning', short: 'mostly better', label: 'Mostly better', note: 'Getting back to normal training' },
  { id: 'niggle', short: 'long-term niggle', label: 'Long-term niggle', note: 'Flares up now and then' },
]

export const INJURY_CLEARED = [
  { id: 'yes', label: 'Yes, cleared for full training' },
  { id: 'partly', label: 'Cleared with limits' },
  { id: 'no', label: 'Not cleared yet' },
  { id: 'not-seen', label: "Haven't seen anyone" },
]

// Movements that commonly make each kind of injury worse
const MOVES = {
  Knee: [
    'Deep bending',
    'Kneeling',
    'Stairs',
    'Running',
    'Jumping or landing',
    'Twisting or pivoting',
    'Straightening fully',
  ],
  Hamstring: ['Sprinting', 'Bending forward', 'Stretching it', 'Deadlifts', 'Kicking', 'Sitting for a long time'],
  'Hip and groin': [
    'Deep squatting',
    'Lifting the knee',
    'Moving the leg out sideways',
    'Running',
    'Cutting or changing direction',
    'Sitting for a long time',
  ],
  Back: [
    'Bending forward',
    'Lifting from the floor',
    'Sitting for a long time',
    'Twisting',
    'Arching back',
    'Carrying heavy loads',
  ],
  Shoulder: [
    'Reaching overhead',
    'Pushing',
    'Pulling',
    'Reaching behind the back',
    'Lying on it',
    'Lifting to the side',
  ],
  Arm: [
    'Gripping',
    'Lifting with the palm up',
    'Lifting with the palm down',
    'Pushing up from a chair',
    'Pull-ups or rows',
    'Twisting the wrist',
  ],
  'Ankle and foot': [
    'Running',
    'Jumping or landing',
    'Uneven ground',
    'Rising onto the toes',
    'Deep ankle bending',
    'Walking for a long time',
  ],
}
const ANY = ['Bending', 'Lifting', 'Twisting', 'Pushing', 'Pulling', 'Impact']
export const movesFor = (group) => MOVES[group] ?? ANY

// Short lines describing an injury's details, for the body map and the physio view
export function describeInjury(details) {
  if (!details) return []
  const lines = []
  const when = INJURY_WHEN.find((o) => o.id === details.when)?.label
  const stage = INJURY_STAGES.find((o) => o.id === details.stage)?.short
  const first = [when, details.surgery ? 'had surgery' : null, stage].filter(Boolean)
  if (first.length) lines.push(first.join(' · ').replace(/^./, (c) => c.toUpperCase()))
  if (details.pain != null) lines.push(`Pain on a normal day: ${details.pain}/10`)
  if (details.worse?.length) lines.push(`Worse with: ${details.worse.join(', ').toLowerCase()}`)
  const cleared = INJURY_CLEARED.find((o) => o.id === details.cleared)?.label
  if (cleared) lines.push(cleared)
  if (details.notes?.trim()) lines.push(`“${details.notes.trim()}”`)
  return lines
}
