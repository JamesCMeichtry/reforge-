import { supabase } from './supabase.js'
import { VERSION } from '../data/legal.js'

// Everything Reforge stores about a person, table by table, and how each table links to them
const MY_DATA = [
  ['profile', 'profiles', ['id']],
  ['injuries', 'injuries', ['user_id']],
  ['check_ins', 'check_ins', ['user_id']],
  ['programmes', 'programmes', ['user_id']],
  ['sets', 'set_logs', ['user_id']],
  ['connections', 'connections', ['client_id', 'pro_id']],
  ['programme_changes', 'programme_changes', ['client_id']],
  ['change_requests', 'change_requests', ['client_id']],
  ['live_sessions', 'live_sessions', ['client_id', 'coach_id']],
  ['rehab_plans', 'rehab_plans', ['client_id']],
  ['session_reviews', 'session_reviews', ['client_id']],
  ['assessments', 'assessments', ['client_id', 'pro_id']],
  ['professional_notes', 'pro_notes', ['client_id', 'pro_id']],
  ['templates', 'programme_templates', ['owner_id']],
  ['session_packages', 'session_packages', ['client_id', 'pro_id']],
  ['friends', 'friendships', ['user_id']],
  ['workout_invites', 'workout_invites', ['from_id', 'to_id']],
  ['targets', 'targets', ['client_id', 'pro_id']],
  ['booked_sessions', 'booked_sessions', ['client_id', 'pro_id']],
  ['messages', 'messages', ['client_id', 'pro_id']],
  ['notification_phones', 'push_subscriptions', ['user_id']],
  ['reminder_settings', 'reminder_settings', ['user_id']],
]

export const hasConsented = (profile) => profile?.consent_version === VERSION && Boolean(profile?.consented_at)

export async function giveConsent(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, consented_at: new Date().toISOString(), consent_version: VERSION })
    .select('*')
    .single()
  if (error) throw error
  return data
}

// Collects everything into one file and downloads it to the phone or computer
export async function downloadMyData(userId, email) {
  const out = { exported_at: new Date().toISOString(), account: { id: userId, email } }
  const results = await Promise.all(
    MY_DATA.map(async ([name, table, columns]) => {
      let query = supabase.from(table).select('*')
      query =
        columns.length === 1
          ? query.eq(columns[0], userId)
          : query.or(columns.map((c) => `${c}.eq.${userId}`).join(','))
      const { data, error } = await query
      return [name, data, error]
    }),
  )
  const failed = []
  for (const [name, data, error] of results) {
    if (error) failed.push(name)
    else out[name] = name === 'profile' ? (data[0] ?? null) : data
  }
  // If too much fails it's most likely the connection, so say so instead of handing over a half-empty file
  if (failed.length > MY_DATA.length / 2) throw new Error('offline')

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reforge-data-${out.exported_at.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { failed }
}

// Removes everything Reforge saved on this phone, apart from the light or dark choice
function clearThisPhone() {
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('reforge.') && key !== 'reforge.theme')
      .forEach((key) => localStorage.removeItem(key))
    sessionStorage.clear()
  } catch {
    // Storage blocked: nothing was saved on the phone anyway
  }
}

export async function deleteMyAccount() {
  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw error
  clearThisPhone()
  // The login no longer exists, so this only tidies up the session saved on the phone
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
}
