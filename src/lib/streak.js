import { supabase } from './supabase.js'

// Daily streak: any logged set or check-in keeps it alive.
// One streak freeze per week (Mon-Sun) covers a single missed day automatically.

export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365]
export const BADGES = [7, 30, 100, 365]

const toDate = (value) => new Date(`${value}T12:00:00`)
const iso = (date) => date.toLocaleDateString('en-CA')

export const localToday = () => iso(new Date())

export function addDays(value, n) {
  const date = toDate(value)
  date.setDate(date.getDate() + n)
  return iso(date)
}

export function weekKey(value) {
  const date = toDate(value)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return iso(date)
}

export function computeStreak(activeDates, today = localToday()) {
  const active = activeDates instanceof Set ? activeDates : new Set(activeDates)
  const sorted = [...active].filter((d) => d <= today).sort()
  const base = { current: 0, best: 0, doneToday: false, atRisk: false, freezeReady: true, frozen: [], runStart: null }
  if (!sorted.length) return base

  const usedWeeks = new Set()
  let run = 0
  let best = 0
  let frozen = []
  let runStart = null

  for (let day = sorted[0]; day <= today; day = addDays(day, 1)) {
    if (active.has(day)) {
      if (run === 0) runStart = day
      run += 1
    } else if (day === today) {
      // Today isn't over yet, so it can't break the streak
    } else {
      const next = addDays(day, 1)
      const bridgeable = active.has(next) || next === today
      if (run > 0 && bridgeable && !usedWeeks.has(weekKey(day))) {
        usedWeeks.add(weekKey(day))
        frozen.push(day)
      } else {
        run = 0
        frozen = []
        runStart = null
      }
    }
    best = Math.max(best, run)
  }

  const doneToday = active.has(today)
  return {
    current: run,
    best,
    doneToday,
    atRisk: run > 0 && !doneToday,
    freezeReady: !usedWeeks.has(weekKey(today)),
    frozen: frozen.filter((d) => d >= addDays(today, -6)),
    runStart,
  }
}

export function nextMilestone(current) {
  return MILESTONES.find((m) => m > current) ?? null
}

export async function fetchActivityDays(days = 400) {
  const { data, error } = await supabase
    .from('activity_days')
    .select('session_date')
    .gte('session_date', addDays(localToday(), -days))
    .order('session_date', { ascending: true })
  if (error) throw error
  return new Set(data.map((row) => row.session_date))
}
