import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext({ session: null, loading: true, recovering: false, linkError: null })

// Read the address before the sign-in library tidies it away: a password reset link says type=recovery,
// and an expired or used link carries an error message instead
const linkText = typeof window !== 'undefined' ? `${window.location.hash}&${window.location.search}` : ''
const cameFromResetLink = /type=recovery/.test(linkText)
const linkErrorMatch = /error_description=([^&]+)/.exec(linkText)
const initialLinkError = linkErrorMatch
  ? decodeURIComponent(linkErrorMatch[1].replace(/\+/g, ' ')).replace(/^Email link/, 'That link')
  : null
if (initialLinkError && typeof window !== 'undefined') {
  window.history.replaceState(null, '', window.location.pathname)
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [recovering, setRecovering] = useState(cameFromResetLink)
  const [linkError, setLinkError] = useState(initialLinkError)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (event === 'SIGNED_OUT') setRecovering(false)
      setSession(newSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = {
    session,
    loading,
    recovering,
    finishRecovery: () => setRecovering(false),
    linkError,
    clearLinkError: () => setLinkError(null),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
