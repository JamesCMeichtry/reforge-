import { useEffect, useState } from 'react'
import TabBar, { CLIENTS_TAB, TABS } from './components/TabBar.jsx'
import { SCREENS } from './screens.jsx'
import { AuthProvider, useAuth } from './auth/AuthProvider.jsx'
import AuthScreen from './auth/AuthScreen.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'
import { fetchProfile } from './lib/profile.js'
import { setMe } from './lib/me.js'
import Onboarding from './screens/Onboarding.jsx'

const DEFAULT_TAB = 'today'

// Hashes look like #programme or #programme/upper-a; the first part picks the tab
function tabFromHash(tabs) {
  const id = window.location.hash.replace('#', '').split('/')[0]
  return tabs.some((tab) => tab.id === id) ? id : DEFAULT_TAB
}

// Physios, PTs and coaches get the full training app for themselves, plus a Clients tab
function AppShell({ profile }) {
  const tabs = profile?.role === 'pro' ? [...TABS, CLIENTS_TAB] : TABS
  const [activeTab, setActiveTab] = useState(() => tabFromHash(tabs))
  const [route, setRoute] = useState(() => window.location.hash)

  // Keeps the tab in sync with the URL, so refresh and the back button work
  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(tabFromHash(tabs))
      setRoute(window.location.hash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [tabs.length])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [route])

  // Tapping the current tab again returns to its main screen
  const selectTab = (id) => {
    if (window.location.hash !== `#${id}`) window.location.hash = id
  }

  const Screen = SCREENS[activeTab]

  return (
    <div className="min-h-dvh bg-ink text-white">
      <main
        className="mx-auto max-w-xl px-5"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 2rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 6.5rem)',
        }}
      >
        <Screen />
      </main>
      <TabBar activeTab={activeTab} onSelect={selectTab} tabs={tabs} />
    </div>
  )
}

function SetupMissing() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-4xl font-bold uppercase">Database not connected</h1>
      <p className="mt-4 text-muted">
        Add VITE_SUPABASE_URL and VITE_SUPABASE_KEY to the environment variables, then redeploy or restart the dev
        server.
      </p>
    </main>
  )
}

// Signed in: everyone answers the starting questionnaire once, then gets the app for their account type
function SignedIn({ userId }) {
  // Every query for "my" training uses this, so it's set before anything loads
  setMe(userId)
  const [profile, setProfile] = useState(undefined)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchProfile(userId)
      .then((data) => !cancelled && setProfile(data))
      .catch(() => !cancelled && setFailed(true))
    return () => {
      cancelled = true
    }
  }, [userId, failed])

  if (failed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
        <p className="text-red-400">Couldn't load your account. Check your connection.</p>
        <button
          type="button"
          onClick={() => setFailed(false)}
          className="mt-4 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-white"
        >
          Try again
        </button>
      </main>
    )
  }
  if (profile === undefined) return <div className="min-h-dvh bg-ink" />
  if (!profile?.onboarded_at) return <Onboarding userId={userId} onDone={setProfile} />
  return <AppShell profile={profile} />
}

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-dvh bg-ink" />
  return session ? <SignedIn userId={session.user.id} /> : <AuthScreen />
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupMissing />
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
