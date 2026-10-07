import { useEffect, useState } from 'react'
import TabBar, { TABS } from './components/TabBar.jsx'
import { SCREENS } from './screens.jsx'
import { AuthProvider, useAuth } from './auth/AuthProvider.jsx'
import AuthScreen from './auth/AuthScreen.jsx'
import { isSupabaseConfigured } from './lib/supabase.js'

const DEFAULT_TAB = 'today'

// Hashes look like #programme or #programme/upper-a; the first part picks the tab
function tabFromHash() {
  const id = window.location.hash.replace('#', '').split('/')[0]
  return TABS.some((tab) => tab.id === id) ? id : DEFAULT_TAB
}

function AppShell() {
  const [activeTab, setActiveTab] = useState(tabFromHash)
  const [route, setRoute] = useState(() => window.location.hash)

  // Keeps the tab in sync with the URL, so refresh and the back button work
  useEffect(() => {
    const onHashChange = () => {
      setActiveTab(tabFromHash())
      setRoute(window.location.hash)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

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
      <TabBar activeTab={activeTab} onSelect={selectTab} />
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

function Gate() {
  const { session, loading } = useAuth()
  if (loading) return <div className="min-h-dvh bg-ink" />
  return session ? <AppShell /> : <AuthScreen />
}

export default function App() {
  if (!isSupabaseConfigured) return <SetupMissing />
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
