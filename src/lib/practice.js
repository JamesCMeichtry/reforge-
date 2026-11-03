import { supabase } from './supabase.js'

// Try-it-now accounts for testers: no email, filled with practice data, deleted after 7 days.
// kind is 'pro' (a coach with the 4 demo clients) or 'athlete' (Alex, 5 months after ACL surgery).
export async function startPractice(kind) {
  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    throw new Error(
      /disabled/i.test(error.message)
        ? 'Practice accounts are switched off right now.'
        : 'Couldn’t start. Check your connection.',
    )
  }
  const { error: fillError } = await supabase.rpc('start_practice', { kind })
  if (fillError) {
    await supabase.auth.signOut()
    throw new Error('Couldn’t set up the practice account. Try again in a moment.')
  }
  // Open the app fresh, so it loads the filled-in account
  window.location.hash = kind === 'pro' ? 'clients' : 'today'
  window.location.reload()
}

export const isPractice = (session) => Boolean(session?.user?.is_anonymous)

export async function endPractice() {
  await supabase.auth.signOut()
  window.location.hash = 'testers'
}
