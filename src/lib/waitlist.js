import { supabase } from './supabase.js'

// The waiting list on the landing page. Read it in Supabase under Table Editor → waitlist.
// The table only allows inserts, so nothing here reads it back.

export const WAITLIST_ROLES = [
  ['solo', 'Just me'],
  ['pt', 'PT or coach'],
  ['physio', 'Physio'],
]

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

export function isValidEmail(email) {
  const value = email.trim()
  return value.length <= 254 && EMAIL_PATTERN.test(value)
}

// Where the visitor came from, e.g. reforge-rosy.vercel.app/?ref=instagram → "landing:instagram"
export function waitlistSource() {
  const ref = new URLSearchParams(window.location.search).get('ref')
  const clean = ref?.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40)
  return clean ? `landing:${clean}` : 'landing'
}

// Returns 'joined' or 'already'. Throws for anything else.
export async function joinWaitlist({ email, role }) {
  if (!supabase) throw new Error('Reforge is not connected to its database.')
  const { error } = await supabase.from('waitlist').insert({
    email: email.trim(),
    role,
    source: waitlistSource(),
  })
  if (!error) return 'joined'
  // 23505 = unique violation: this email is already on the list
  if (error.code === '23505') return 'already'
  throw error
}
