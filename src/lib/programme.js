import { supabase } from './supabase.js'

// Local calendar date (YYYY-MM-DD), so late-evening sessions count as today
export const todayDate = () => new Date().toLocaleDateString('en-CA')

export async function fetchActiveProgramme() {
  const { data, error } = await supabase
    .from('programmes')
    .select('id, name, days')
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
