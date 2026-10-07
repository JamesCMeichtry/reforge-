import { supabase } from './supabase.js'
import { CENTRAL_AREAS, INJURIES } from '../data/injuries.js'
import { todayDate } from './programme.js'

const slug = (text) => text.toLowerCase().replace(/\s+/g, '-')
const sideName = (side) => (side === 'right' ? 'Right' : 'Left')

// The injury sites (red areas) from the injuries on the body map, one entry per area
export async function fetchInjurySites() {
  const { data, error } = await supabase.from('injuries').select('injury_key, side').order('created_at')
  if (error) throw error

  const sites = new Map()
  for (const row of data) {
    const injury = INJURIES.find((item) => item.id === row.injury_key)
    if (!injury) continue
    for (const effect of injury.effects.filter((e) => e.tier === 'primary')) {
      const central = CENTRAL_AREAS.includes(effect.area)
      const areaId = central ? slug(effect.area) : `${row.side}-${slug(effect.area)}`
      const label = central ? effect.area : `${sideName(row.side)} ${effect.area.toLowerCase()}`
      const existing = sites.get(areaId)
      if (existing) existing.injuries.push(injury.name)
      else sites.set(areaId, { areaId, label, injuries: [injury.name] })
    }
  }
  return [...sites.values()]
}

export async function saveCheckIns(entries) {
  const rows = entries.map((entry) => ({
    area_id: entry.areaId,
    session_date: todayDate(),
    pain_during: entry.during,
    pain_after: entry.after,
    red_flag: entry.flags.length > 0,
    notes: entry.flags.length ? `Red flags: ${entry.flags.join(', ')}` : null,
  }))
  const { error } = await supabase.from('check_ins').insert(rows)
  if (error) throw error
}

// Check-ins from the last two days still waiting for their next-morning score
export async function fetchPendingMorning() {
  const since = new Date()
  since.setDate(since.getDate() - 2)
  const { data, error } = await supabase
    .from('check_ins')
    .select('id, area_id, session_date')
    .is('next_morning', null)
    .lt('session_date', todayDate())
    .gte('session_date', since.toLocaleDateString('en-CA'))
    .order('session_date', { ascending: false })
  if (error) throw error
  return data
}

export async function saveMorning(ids, value) {
  const { error } = await supabase.from('check_ins').update({ next_morning: value }).in('id', ids)
  if (error) throw error
}

export async function fetchRecentCheckIns(days = 56) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('check_ins')
    .select('id, area_id, session_date, pain_during, pain_after, next_morning, red_flag, notes, created_at')
    .gte('session_date', since.toLocaleDateString('en-CA'))
    .order('session_date', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export function painWord(value) {
  if (value === 0) return 'None'
  if (value <= 3) return 'Mild'
  if (value <= 6) return 'Moderate'
  return 'Severe'
}

export const RED_FLAGS = ['Swelling', 'Locking or catching', 'Giving way', 'Sharp or worsening pain']
