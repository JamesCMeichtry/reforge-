// How hard each exercise should feel. Saved on the exercise as `effort`, with an optional `tempo`.
// RPE (rate of perceived exertion) is 1–10: 10 is nothing left, 8 is about two more reps in the tank.

export const EFFORTS = [
  { id: 'light', label: 'Light', rpe: '6', hint: 'about 4 reps in the tank', colour: 'var(--pain-mild)' },
  { id: 'moderate', label: 'Moderate', rpe: '7', hint: 'about 3 reps in the tank', colour: 'var(--lvl-building)' },
  { id: 'heavy', label: 'Heavy', rpe: '8', hint: 'about 2 reps in the tank', colour: 'var(--color-gold)' },
  { id: 'max', label: 'All-out', rpe: '9–10', hint: '0–1 reps in the tank', colour: 'var(--pain-severe)' },
]

export const effortOf = (exercise) => EFFORTS.find((e) => e.id === exercise?.effort) ?? null

// "Heavy · RPE 8 · about 2 reps in the tank · 3 s down"
export function effortLine(exercise) {
  const effort = effortOf(exercise)
  const parts = []
  if (effort) parts.push(`${effort.label} · RPE ${effort.rpe} · ${effort.hint}`)
  if (exercise?.tempo) parts.push(exercise.tempo)
  return parts.join(' · ')
}

// Short version for tight spaces: "RPE 8"
export const effortShort = (exercise) => (effortOf(exercise) ? `RPE ${effortOf(exercise).rpe}` : '')

/* ---------- Size of a day ---------- */

const REST = { 'Warm-up': 30, Physio: 45, Rehab: 45, Main: 90 }
const sets = (exercise) => Math.max(1, Number(exercise.sets) || 1)

export const totalSets = (day) => day.exercises.reduce((sum, e) => sum + sets(e), 0)

// Roughly how long a day takes: each set's work plus its rest, rounded to 5 minutes
export function estimateMinutes(day) {
  const seconds = day.exercises.reduce(
    (sum, e) => sum + sets(e) * (40 + (Number(e.rest) || REST[e.section || 'Main'] || 60)),
    0,
  )
  return Math.max(5, Math.round(seconds / 60 / 5) * 5)
}
