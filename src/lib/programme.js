import { supabase } from './supabase.js'
import { me } from './me.js'

// Local calendar date (YYYY-MM-DD), so late-evening sessions count as today
export const todayDate = () => new Date().toLocaleDateString('en-CA')

export async function fetchActiveProgramme(userId = me()) {
  const { data, error } = await supabase
    .from('programmes')
    .select('id, name, days')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createProgramme({ name, days }) {
  const { data, error } = await supabase.from('programmes').insert({ name, days }).select('id, name, days').single()
  if (error) throw error
  return data
}

export async function saveProgrammeDays(id, days) {
  const { error } = await supabase
    .from('programmes')
    .update({ days, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// The day of the most recent logged set, used to work out which session comes next
export async function fetchLastDayName(programmeId) {
  const { data, error } = await supabase
    .from('set_logs')
    .select('day_name')
    .eq('user_id', me())
    .eq('programme_id', programmeId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.day_name ?? null
}

export function nextDay(days, lastDayName) {
  if (!days.length) return null
  const index = days.findIndex((day) => day.name === lastDayName)
  return index === -1 ? days[0] : days[(index + 1) % days.length]
}

// For each exercise, the sets from the most recent session before today
export async function fetchPreviousSets(exerciseNames) {
  if (!exerciseNames.length) return {}
  const { data, error } = await supabase
    .from('set_logs')
    .select('exercise, session_date, set_number, weight_kg, band, reps')
    .eq('user_id', me())
    .in('exercise', exerciseNames)
    .lt('session_date', todayDate())
    .order('session_date', { ascending: false })
    .order('set_number')
    .limit(1000)
  if (error) throw error

  const previous = {}
  for (const row of data) {
    const latest = previous[row.exercise]
    if (!latest) previous[row.exercise] = { date: row.session_date, sets: [row] }
    else if (latest.date === row.session_date) latest.sets.push(row)
  }
  return previous
}

export async function fetchTodaySets(programmeId, dayName) {
  const { data, error } = await supabase
    .from('set_logs')
    .select('id, exercise, set_number, weight_kg, band, reps')
    .eq('user_id', me())
    .eq('programme_id', programmeId)
    .eq('day_name', dayName)
    .eq('session_date', todayDate())
  if (error) throw error
  return data
}

export async function logSet(row) {
  const { data, error } = await supabase
    .from('set_logs')
    .insert({ ...row, session_date: todayDate() })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function deleteSet(id) {
  const { error } = await supabase.from('set_logs').delete().eq('id', id)
  if (error) throw error
}

export function formatLoad(load) {
  if (!load || load.kind === 'bodyweight') return 'Bodyweight'
  if (load.kind === 'band') return `${load.value} band`
  return `${load.value} kg`
}

export function formatPrevious(previous) {
  if (!previous?.sets.length) return null
  const sets = [...previous.sets].sort((a, b) => a.set_number - b.set_number)
  const loadOf = (s) => (s.weight_kg != null ? `${Number(s.weight_kg)} kg` : s.band ? `${s.band} band` : '')
  const loads = new Set(sets.map(loadOf))
  if (loads.size === 1) {
    const load = loadOf(sets[0])
    return `${load ? `${load} × ` : ''}${sets.map((s) => s.reps ?? '–').join(', ')}`
  }
  return sets.map((s) => `${loadOf(s)} × ${s.reps ?? '–'}`).join(', ')
}

const toDate = (value) => new Date(`${value}T12:00:00`)

export function daysAgo(dateString) {
  const diff = Math.round((toDate(todayDate()) - toDate(dateString)) / 86400000)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return `${diff} days ago`
}

// Every training date in the last few weeks, with the most recent date per programme day
export async function fetchRecentTraining(days = 42) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('set_logs')
    .select('session_date, day_name')
    .eq('user_id', me())
    .gte('session_date', since.toLocaleDateString('en-CA'))
    .order('session_date', { ascending: false })
    .limit(2000)
  if (error) throw error

  const dates = new Set()
  const lastByDay = {}
  for (const row of data) {
    dates.add(row.session_date)
    if (row.day_name && !lastByDay[row.day_name]) lastByDay[row.day_name] = row.session_date
  }
  return { dates, lastByDay }
}

// Monday-to-Sunday dates for the current week
export function currentWeek() {
  const today = toDate(todayDate())
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return { date: day.toLocaleDateString('en-CA'), label: day.toLocaleDateString('en-GB', { weekday: 'narrow' }) }
  })
}
