import { supabase } from './supabase.js'
import { me } from './me.js'
import { INJURIES } from '../data/injuries.js'

const FIELDS = 'id, client_id, pro_id, answers, status, created_at, updated_at, completed_at'

// The most recent assessment for a client (drafts included), or null
export async function fetchLatestAssessment(clientId) {
  const { data, error } = await supabase
    .from('assessments')
    .select(FIELDS)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function saveAssessment(assessment) {
  const { error } = await supabase.from('assessments').upsert({
    id: assessment.id,
    client_id: assessment.client_id,
    pro_id: me(),
    answers: assessment.answers,
    status: assessment.status,
    completed_at: assessment.completed_at ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw error
}

const sideName = (side) => (side === 'right' ? 'Right' : 'Left')

// The client's injuries from their body map, each with a stable key for its assessment answers
export async function fetchClientInjuries(clientId) {
  const { data, error } = await supabase
    .from('injuries')
    .select('injury_key, side')
    .eq('user_id', clientId)
    .order('created_at')
  if (error) throw error
  return data
    .map((row) => {
      const injury = INJURIES.find((item) => item.id === row.injury_key)
      if (!injury) return null
      return {
        key: `${row.injury_key}${injury.central ? '' : `-${row.side}`}`,
        label: injury.central ? injury.name : `${sideName(row.side)}: ${injury.name}`,
      }
    })
    .filter(Boolean)
}
