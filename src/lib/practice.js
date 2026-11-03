import { supabase } from './supabase.js'

// The demo app for testers: no email, filled in as Sam (a PT with 4 demo clients and their own training),
// deleted after 7 days
export async function startPractice() {
  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    throw new Error(
      /disabled/i.test(error.message)
        ? 'The demo is switched off right now.'
        : 'Couldn’t start. Check your connection.',
    )
  }
  const { error: fillError } = await supabase.rpc('start_practice', { kind: 'pro' })
  if (fillError) {
    await supabase.auth.signOut()
    throw new Error('Couldn’t set up the demo. Try again in a moment.')
  }
  // Open the app fresh, so it loads the filled-in account
  window.location.hash = 'today'
  window.location.reload()
}

export const isPractice = (session) => Boolean(session?.user?.is_anonymous)

export async function endPractice() {
  await supabase.auth.signOut()
  window.location.hash = 'testers'
}
