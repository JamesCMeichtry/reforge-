import { supabase } from './supabase.js'
import { me } from './me.js'
import { PROFESSIONS } from './profile.js'

const PROFILE_FIELDS = 'id, display_name, profession, business_name, body'

export const professionLabel = (id) => PROFESSIONS.find((p) => p.id === id)?.label ?? 'Professional'

// Messages from the database functions are already written for people, so show them as they are
const friendly = (error) => error?.message || 'Something went wrong. Try again.'

async function profilesFor(ids) {
  if (!ids.length) return []
  const { data, error } = await supabase.from('profiles').select(PROFILE_FIELDS).in('id', ids)
  if (error) throw error
  return data
}

// Client side: the professionals looking after me
export async function fetchMyPros() {
  const { data, error } = await supabase.from('connections').select('pro_id, created_at').eq('client_id', me())
  if (error) throw error
  const profiles = await profilesFor(data.map((row) => row.pro_id))
  return data.map((row) => ({ ...profiles.find((p) => p.id === row.pro_id), since: row.created_at }))
}

export async function createConnectCode() {
  const { data, error } = await supabase.rpc('new_connect_code')
  if (error) throw new Error(friendly(error))
  return data
}

export async function disconnect(clientId, proId) {
  const { error } = await supabase.from('connections').delete().eq('client_id', clientId).eq('pro_id', proId)
  if (error) throw error
}

// Professional side: my clients, with a quick read on how each is doing this week
export async function fetchMyClients() {
  const { data, error } = await supabase.from('connections').select('client_id, created_at').eq('pro_id', me())
  if (error) throw error
  const ids = data.map((row) => row.client_id)
  const profiles = await profilesFor(ids)
  const since = new Date()
  since.setDate(since.getDate() - 14)
  const recent = ids.length
    ? await supabase
        .from('check_ins')
        .select('user_id, session_date, pain_after, next_morning, red_flag')
        .in('user_id', ids)
        .gte('session_date', since.toLocaleDateString('en-CA'))
        .order('session_date', { ascending: false })
    : { data: [] }
  if (recent.error) throw recent.error
  const requests = ids.length
    ? await supabase.from('change_requests').select('client_id').in('client_id', ids).is('resolved_at', null)
    : { data: [] }
  return data
    .map((row) => {
      const checkIns = recent.data.filter((c) => c.user_id === row.client_id)
      const worst = Math.max(-1, ...checkIns.map((c) => c.next_morning ?? c.pain_after ?? -1))
      return {
        ...profiles.find((p) => p.id === row.client_id),
        id: row.client_id,
        since: row.created_at,
        lastCheckIn: checkIns[0]?.session_date ?? null,
        flagged: checkIns.some((c) => c.red_flag) || worst >= 7,
        worstPain: worst >= 0 ? worst : null,
        openRequests: (requests.data ?? []).filter((r) => r.client_id === row.client_id).length,
      }
    })
    .sort((a, b) => Number(b.flagged) - Number(a.flagged) || (a.display_name ?? '').localeCompare(b.display_name ?? ''))
}

export async function connectWithCode(code) {
  const { data, error } = await supabase.rpc('connect_with_code', { code })
  if (error) throw new Error(friendly(error))
  return data
}

// Notes a professional leaves for a client; both of them can read them
export async function fetchNotes(clientId) {
  const { data, error } = await supabase
    .from('pro_notes')
    .select('id, body, created_at, pro_id')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return data
}

export async function addNote(clientId, body) {
  const { data, error } = await supabase
    .from('pro_notes')
    .insert({ client_id: clientId, body })
    .select('id, body, created_at, pro_id')
    .single()
  if (error) throw error
  return data
}

export async function deleteNote(id) {
  const { error } = await supabase.from('pro_notes').delete().eq('id', id)
  if (error) throw error
}
