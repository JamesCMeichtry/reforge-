// What a set is measured in, read from the exercise's target: reps, seconds, metres or calories.
// "10", "8 each leg" → reps · "40 s", "5 min" → seconds · "50 m", "1 km" → metres · "15 cal" → calories

export const UNITS = {
  reps: { label: 'reps', short: 'reps', step: 1 },
  s: { label: 'seconds', short: 's', step: 5 },
  m: { label: 'metres', short: 'm', step: 10 },
  cal: { label: 'calories', short: 'cal', step: 1 },
}

export function unitOf(target) {
  const text = String(target ?? '').toLowerCase()
  if (/\d\s*(km|m|metres?|meters?)\b/.test(text)) return 'm'
  if (/\d\s*(cal|cals|kcal|calories)\b/.test(text)) return 'cal'
  if (/\d\s*(s|sec|secs|seconds?|min|mins|minutes?)\b/.test(text)) return 's'
  return 'reps'
}

// The target as a number in its own unit: "1 km" is 1000 metres, "5 min" is 300 seconds
export function targetAmount(target) {
  const text = String(target ?? '').toLowerCase()
  const value = parseFloat(text.match(/\d+([.,]\d+)?/)?.[0]?.replace(',', '.') ?? '')
  if (!Number.isFinite(value)) return null
  if (/\d\s*km\b/.test(text)) return Math.round(value * 1000)
  if (/\d\s*(min|mins|minutes?)\b/.test(text)) return Math.round(value * 60)
  return Math.round(value)
}

// A logged amount for people to read: "12", "45 s", "1:30", "250 m", "1 km", "15 cal"
export function amountText(value, unit) {
  if (value == null) return '–'
  const n = Number(value)
  if (unit === 's') return n >= 60 ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}` : `${n} s`
  if (unit === 'm') return n >= 1000 && n % 100 === 0 ? `${n / 1000} km` : `${n} m`
  if (unit === 'cal') return `${n} cal`
  return String(n)
}

// Only sets counted in reps add to "kg moved" and lift comparisons; a 50 m sled push isn't 50 reps
export const countsReps = (set) => !set.unit || set.unit === 'reps'

// Saved with each set, so history shows "50 m" rather than "50". Reps are left blank, as before.
export const unitToSave = (unit) => (unit === 'reps' ? null : unit)
