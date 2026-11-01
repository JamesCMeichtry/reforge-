import { supabase } from './supabase.js'
import { me } from './me.js'
import { notify } from './push.js'

// Programme history: every change, who made it and why. The AI coach will read this later.
// A professional changing a client's programme also lets the client know (at most once a day)
export async function recordChange(clientId, programmeId, summary, reason) {
  const { data, error } = await supabase
    .from('programme_changes')
    .insert({ client_id: clientId, programme_id: programmeId, summary, reason: reason?.trim() || null })
    .select('id')
    .single()
  if (error) throw error
  if (clientId !== me()) notify('programme', data.id)
}

export async function fetchChanges(clientId = me(), limit = 20) {
  const { data, error } = await supabase
    .from('programme_changes')
    .select('id, summary, reason, changed_by, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data
}

// A plain-English summary of what changed between two versions of a day
export function describeDayChange(before, after) {
  if (!before) return `Added ${after.name}`
  const parts = []
  if (before.name !== after.name) parts.push(`renamed to ${after.name}`)
  const oldById = new Map(before.exercises.map((e) => [e.id, e]))
  const newIds = new Set(after.exercises.map((e) => e.id))
  const added = after.exercises.filter((e) => !oldById.has(e.id)).map((e) => e.name)
  const removed = before.exercises.filter((e) => !newIds.has(e.id)).map((e) => e.name)
  const changed = []
  for (const e of after.exercises) {
    const old = oldById.get(e.id)
    if (!old) continue
    const bits = []
    if (old.name !== e.name) bits.push(`now ${e.name}`)
    if (String(old.sets) !== String(e.sets) || old.reps !== e.reps) bits.push(`${e.sets} × ${e.reps}`)
    if (JSON.stringify(old.load) !== JSON.stringify(e.load)) {
      bits.push(
        e.load.kind === 'kg' ? `${e.load.value} kg` : e.load.kind === 'band' ? `${e.load.value} band` : 'bodyweight',
      )
    }
    if ((old.note ?? '') !== (e.note ?? '')) bits.push('new note')
    if (bits.length) changed.push(`${old.name} (${bits.join(', ')})`)
  }
  if (added.length) parts.push(`added ${added.join(', ')}`)
  if (removed.length) parts.push(`removed ${removed.join(', ')}`)
  if (changed.length) parts.push(`changed ${changed.join('; ')}`)
  return parts.length ? `${before.name}: ${parts.join(' · ')}` : null
}

// Templates a professional saves once and gives to any client
const TEMPLATE_FIELDS = 'id, name, description, days, updated_at'

export async function fetchTemplates() {
  const { data, error } = await supabase
    .from('programme_templates')
    .select(TEMPLATE_FIELDS)
    .eq('owner_id', me())
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data
}

export async function fetchTemplate(id) {
  const { data, error } = await supabase.from('programme_templates').select(TEMPLATE_FIELDS).eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function saveTemplate(name, days, description = null) {
  const { data, error } = await supabase
    .from('programme_templates')
    .insert({ name, days, description })
    .select(TEMPLATE_FIELDS)
    .single()
  if (error) throw error
  return data
}

export async function updateTemplate(id, changes) {
  const { error } = await supabase
    .from('programme_templates')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from('programme_templates').delete().eq('id', id)
  if (error) throw error
}

// Change requests from a coached client
export async function requestChange(body) {
  const { error } = await supabase.from('change_requests').insert({ body })
  if (error) throw error
}

export async function fetchRequests(clientId = me(), openOnly = false) {
  let query = supabase
    .from('change_requests')
    .select('id, body, created_at, resolved_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20)
  if (openOnly) query = query.is('resolved_at', null)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function resolveRequest(id) {
  const { error } = await supabase
    .from('change_requests')
    .update({ resolved_at: new Date().toISOString(), resolved_by: me() })
    .eq('id', id)
  if (error) throw error
}

// Fresh ids so a template or copied day never shares exercise ids with the original
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
export const copyDays = (days) =>
  days.map((day) => ({ ...day, id: newId(), exercises: day.exercises.map((e) => ({ ...e, id: newId() })) }))
