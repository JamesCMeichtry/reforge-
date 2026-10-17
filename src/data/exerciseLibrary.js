// Common exercises a coach can swap in or add during a live session. Anything else can be typed in.
// load: the usual way it's loaded (kg, band or bodyweight); section: where it usually sits in a session
const kg = 'kg'
const band = 'band'
const bw = 'bodyweight'

const rows = [
  // Squat and knee-dominant
  ['Back squat', 'Main', kg, 'Squat'],
  ['Front squat', 'Main', kg, 'Squat'],
  ['Goblet squat', 'Main', kg, 'Squat'],
  ['Box squat', 'Main', kg, 'Squat'],
  ['Leg press', 'Main', kg, 'Squat'],
  ['Hack squat', 'Main', kg, 'Squat'],
  ['Bulgarian split squat', 'Main', kg, 'Squat'],
  ['Split squat', 'Main', kg, 'Squat'],
  ['Reverse lunge', 'Main', kg, 'Squat'],
  ['Walking lunge', 'Main', kg, 'Squat'],
  ['Step-up', 'Main', kg, 'Squat'],
  ['Leg extension', 'Main', kg, 'Squat'],
  ['Spanish squat', 'Rehab', band, 'Squat'],
  ['Wall sit', 'Rehab', bw, 'Squat'],
  ['Terminal knee extension', 'Rehab', band, 'Squat'],
  ['Reverse Nordic', 'Rehab', bw, 'Squat'],
  ['Sissy squat', 'Main', bw, 'Squat'],
  // Hinge and hamstrings
  ['Deadlift', 'Main', kg, 'Hinge'],
  ['Trap bar deadlift', 'Main', kg, 'Hinge'],
  ['Romanian deadlift', 'Main', kg, 'Hinge'],
  ['Single-leg Romanian deadlift', 'Main', kg, 'Hinge'],
  ['Hip thrust', 'Main', kg, 'Hinge'],
  ['Glute bridge', 'Rehab', bw, 'Hinge'],
  ['Single-leg glute bridge', 'Rehab', bw, 'Hinge'],
  ['Good morning', 'Main', kg, 'Hinge'],
  ['Kettlebell swing', 'Main', kg, 'Hinge'],
  ['Back extension', 'Main', bw, 'Hinge'],
  ['Lying leg curl', 'Main', kg, 'Hinge'],
  ['Seated leg curl', 'Main', kg, 'Hinge'],
  ['Nordic curl', 'Rehab', bw, 'Hinge'],
  ['Hamstring slider curl', 'Rehab', bw, 'Hinge'],
  ['Isometric hamstring bridge', 'Rehab', bw, 'Hinge'],
  // Push
  ['Bench press', 'Main', kg, 'Push'],
  ['Incline bench press', 'Main', kg, 'Push'],
  ['Dumbbell bench press', 'Main', kg, 'Push'],
  ['Incline dumbbell press', 'Main', kg, 'Push'],
  ['Push-up', 'Main', bw, 'Push'],
  ['Overhead press', 'Main', kg, 'Push'],
  ['Seated dumbbell press', 'Main', kg, 'Push'],
  ['Landmine press', 'Main', kg, 'Push'],
  ['Dip', 'Main', bw, 'Push'],
  ['Cable fly', 'Main', kg, 'Push'],
  ['Lateral raise', 'Main', kg, 'Push'],
  ['Triceps pushdown', 'Main', kg, 'Push'],
  // Pull
  ['Pull-up', 'Main', bw, 'Pull'],
  ['Chin-up', 'Main', bw, 'Pull'],
  ['Lat pulldown', 'Main', kg, 'Pull'],
  ['Barbell row', 'Main', kg, 'Pull'],
  ['Chest-supported row', 'Main', kg, 'Pull'],
  ['Single-arm dumbbell row', 'Main', kg, 'Pull'],
  ['Seated cable row', 'Main', kg, 'Pull'],
  ['Face pull', 'Main', kg, 'Pull'],
  ['Inverted row', 'Main', bw, 'Pull'],
  ['Biceps curl', 'Main', kg, 'Pull'],
  ['Hammer curl', 'Main', kg, 'Pull'],
  // Shoulder rehab and prehab
  ['Band external rotation', 'Physio', band, 'Shoulder'],
  ['Band internal rotation', 'Physio', band, 'Shoulder'],
  ['Band pull-apart', 'Warm-up', band, 'Shoulder'],
  ['Scapular push-up', 'Physio', bw, 'Shoulder'],
  ['Prone Y-T-W', 'Physio', kg, 'Shoulder'],
  ['Wall slide', 'Warm-up', bw, 'Shoulder'],
  // Calf, ankle and hip
  ['Standing calf raise', 'Main', kg, 'Lower leg'],
  ['Seated calf raise', 'Main', kg, 'Lower leg'],
  ['Single-leg calf raise', 'Rehab', bw, 'Lower leg'],
  ['Tibialis raise', 'Rehab', bw, 'Lower leg'],
  ['Copenhagen plank', 'Rehab', bw, 'Hip'],
  ['Side-lying hip abduction', 'Physio', bw, 'Hip'],
  ['Banded crab walk', 'Warm-up', band, 'Hip'],
  ['Clamshell', 'Physio', band, 'Hip'],
  ['Hip flexor march', 'Physio', band, 'Hip'],
  ['90/90 hip switch', 'Warm-up', bw, 'Hip'],
  // Trunk
  ['Plank', 'Main', bw, 'Core'],
  ['Side plank', 'Main', bw, 'Core'],
  ['Dead bug', 'Physio', bw, 'Core'],
  ['Bird dog', 'Physio', bw, 'Core'],
  ['Pallof press', 'Main', band, 'Core'],
  ['Suitcase carry', 'Main', kg, 'Core'],
  ['Farmer carry', 'Main', kg, 'Core'],
  ['Hanging knee raise', 'Main', bw, 'Core'],
  ['Ab wheel rollout', 'Main', bw, 'Core'],
  // Conditioning and warm-up
  ['Bike', 'Warm-up', bw, 'Conditioning'],
  ['Rower', 'Warm-up', bw, 'Conditioning'],
  ['Sled push', 'Main', kg, 'Conditioning'],
  ['Box jump', 'Main', bw, 'Conditioning'],
  // HYROX stations and HIIT
  ['Run', 'Main', bw, 'Conditioning'],
  ['SkiErg', 'Main', bw, 'Conditioning'],
  ['Rowing erg', 'Main', bw, 'Conditioning'],
  ['Sled pull', 'Main', kg, 'Conditioning'],
  ['Burpee broad jump', 'Main', bw, 'Conditioning'],
  ['Sandbag lunge', 'Main', kg, 'Conditioning'],
  ['Wall ball', 'Main', kg, 'Conditioning'],
  ['Assault bike', 'Main', bw, 'Conditioning'],
  ['Burpee', 'Main', bw, 'Conditioning'],
  ['Thruster', 'Main', kg, 'Conditioning'],
  ['Kettlebell clean', 'Main', kg, 'Conditioning'],
  ['Devil press', 'Main', kg, 'Conditioning'],
  ['Jump squat', 'Main', bw, 'Conditioning'],
  ['Mountain climber', 'Main', bw, 'Conditioning'],
  ['Battle ropes', 'Main', bw, 'Conditioning'],
  ['Skipping', 'Warm-up', bw, 'Conditioning'],
]

export const EXERCISE_LIBRARY = rows.map(([name, section, load, group]) => ({ name, section, load, group }))

// Best matches first: names that start with the search, then names that contain it
export function searchExercises(text, limit = 8) {
  const query = text.trim().toLowerCase()
  if (!query) return []
  const starts = EXERCISE_LIBRARY.filter((e) => e.name.toLowerCase().startsWith(query))
  const contains = EXERCISE_LIBRARY.filter(
    (e) => !e.name.toLowerCase().startsWith(query) && e.name.toLowerCase().includes(query),
  )
  return [...starts, ...contains].slice(0, limit)
}

// Alternatives for a swap: same movement group as the exercise being replaced
export function similarExercises(name, limit = 6) {
  const current = EXERCISE_LIBRARY.find((e) => e.name.toLowerCase() === name.toLowerCase())
  if (!current) return []
  return EXERCISE_LIBRARY.filter((e) => e.group === current.group && e.name !== current.name).slice(0, limit)
}
