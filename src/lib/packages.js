import { supabase } from './supabase.js'

// Packages of 1-1 sessions. A 1-1 is a live session the professional runs from their phone; every one they
// finish after the package starts counts towards it, plus any corrections made by hand.

// The current package between a client and a professional, with how many sessions are used and left
export async function fetchPackage(clientId, proId) {
  let query = supabase.from('session_packages').select('*').eq('client_id', clientId)
  if (proId) query = query.eq('pro_id', proId)
  const { data: pkg, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  if (!pkg) return null

  const { data: done, error: liveError } = await supabase
    .from('live_sessions')
    .select('id')
    .eq('client_id', clientId)
    .eq('coach_id', pkg.pro_id)
    .not('ended_at', 'is', null)
    .gte('started_at', pkg.started_on)
  if (liveError) throw liveError

  const used = Math.max(0, done.length + pkg.adjust)
  return { ...pkg, used, left: pkg.sessions - used }
}

export async function startPackage(clientId, sessions) {
  const { error } = await supabase.from('session_packages').insert({ client_id: clientId, sessions })
  if (error) throw error
}

export async function adjustPackage(id, adjust) {
  const { error } = await supabase.from('session_packages').update({ adjust }).eq('id', id)
  if (error) throw error
}
