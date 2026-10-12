import { supabase } from './supabase.js'
import { todayDate } from './programme.js'
import { me } from './me.js'

const since = (days) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toLocaleDateString('en-CA')
}

// Supabase returns at most 1000 rows per request, so fetch in pages until we have everything
export async function fetchSetHistory(days = 180, userId = me()) {
  const pageSize = 1000
  const rows = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('set_logs')
      .select('id, exercise, session_date, set_number, weight_kg, reps, logged_by')
      .eq('user_id', userId)
      .gte('session_date', since(days))
      .order('session_date', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) throw error
    rows.push(...data)
    if (data.length < pageSize) return rows
  }
}

// Heaviest set per session for one exercise
export function topSets(history, exercise) {
  const byDate = new Map()
  for (const row of history) {
    if (row.exercise !== exercise || row.weight_kg == null) continue
    const weight = Number(row.weight_kg)
    const best = byDate.get(row.session_date)
    if (!best || weight > best.weight || (weight === best.weight && (row.reps ?? 0) > best.reps)) {
      byDate.set(row.session_date, { date: row.session_date, weight, reps: row.reps ?? 0 })
    }
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
}

// Exercises with weighted sets, most recently trained first
export function weightedExercises(history) {
  const last = new Map()
  for (const row of history) if (row.weight_kg != null) last.set(row.exercise, row.session_date)
  return [...last.entries()].sort((a, b) => (a[1] < b[1] ? 1 : -1)).map(([name]) => name)
}

// Rehab streak: how many training sessions in a row included your rehab or physio work
export function rehabStreak(history, rehabExercises) {
  const sessions = new Map()
  for (const row of history) {
    const entry = sessions.get(row.session_date) ?? { date: row.session_date, rehab: false }
    if (rehabExercises.has(row.exercise)) entry.rehab = true
    sessions.set(row.session_date, entry)
  }
  const ordered = [...sessions.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
  let best = 0
  let run = 0
  for (const session of ordered) {
    run = session.rehab ? run + 1 : 0
    best = Math.max(best, run)
  }
  let current = 0
  for (let i = ordered.length - 1; i >= 0 && ordered[i].rehab; i--) current++
  return { current, best, rehabDates: new Set(ordered.filter((s) => s.rehab).map((s) => s.date)) }
}

// One overall "how you feel" score per day: 10 minus the average pain across your injury sites
export function feelingTimeline(checkIns) {
  const byDate = new Map()
  for (const c of checkIns) {
    const pain = c.next_morning ?? c.pain_after
    if (pain == null) continue
    const entry = byDate.get(c.session_date) ?? { date: c.session_date, total: 0, count: 0, flag: false }
    entry.total += pain
    entry.count += 1
    entry.flag ||= c.red_flag
    byDate.set(c.session_date, entry)
  }
  return [...byDate.values()]
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((e) => ({ date: e.date, feeling: Math.round((10 - e.total / e.count) * 10) / 10, flag: e.flag }))
}

// The last few weeks as Monday-start columns of dates, for the rehab calendar
export function recentWeeks(count = 12) {
  const today = new Date(`${todayDate()}T12:00:00`)
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7) - (count - 1) * 7)
  return Array.from({ length: count }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = new Date(monday)
      day.setDate(monday.getDate() + w * 7 + d)
      return day.toLocaleDateString('en-CA')
    }),
  )
}

export const shortDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// Compact day/month for narrow chart labels, e.g. 12/9
export const tinyDate = (value) => {
  const [, month, day] = value.split('-')
  return `${Number(day)}/${Number(month)}`
}
