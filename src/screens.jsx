import { lazy, useState } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import { supabase } from './lib/supabase.js'
import InjuryEditor from './components/InjuryEditor.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import ConnectPanel from './components/ConnectPanel.jsx'
import { FriendPage, FriendsPanel, useHashParts } from './components/Friends.jsx'
import { MessagesPage } from './components/Chat.jsx'
import { PrivacyPanel } from './components/Legal.jsx'
import { NotificationsPanel, PushKeysTool } from './components/Notifications.jsx'
import { disablePush } from './lib/push.js'
import { ScreenHeader } from './components/ui.jsx'
import TodayScreen from './screens/TodayScreen.jsx'
import ProgrammeScreen from './screens/ProgrammeScreen.jsx'
import RehabScreen from './screens/RehabScreen.jsx'

// Heavier screens load when first opened
const LivingMap = lazy(() => import('./components/LivingMap.jsx'))
const ProgressScreen = lazy(() => import('./screens/ProgressScreen.jsx'))
const ClientsScreen = lazy(() => import('./screens/ClientsScreen.jsx'))

function BodyMapScreen() {
  const [mode, setMode] = useState('living')
  return (
    <>
      <ScreenHeader
        title="Body map"
        intro={
          mode === 'living'
            ? 'Injuries and strength on one body, updated as you train.'
            : 'Add or remove injuries. Each one lights up every area it affects.'
        }
      />
      <div className="mb-4 flex gap-2" role="group" aria-label="Map mode">
        {[
          ['living', 'Living map'],
          ['injuries', 'Edit injuries'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold ${
              mode === value ? 'border-gold text-gold' : 'border-line text-muted hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'living' ? <LivingMap /> : <InjuryEditor />}
    </>
  )
}

function AccountPanel() {
  const { session } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    // This phone stops getting your notifications, so whoever signs in next doesn't see them
    await disablePush().catch(() => {})
    const { error } = await supabase.auth.signOut()
    if (error) setSigningOut(false)
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">Account</h2>
      <p className="mt-2 text-neutral-300">
        Signed in as <span className="font-semibold text-white">{session?.user?.email}</span>
      </p>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-5 rounded-xl border border-line px-5 py-2.5 font-semibold text-white transition-colors hover:border-gold hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-60"
      >
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
    </section>
  )
}

const DEV_KEY = 'reforge.dev'

function readDev() {
  try {
    return localStorage.getItem(DEV_KEY) === '1'
  } catch {
    return false
  }
}

// Testing tools (like Test colours on the body map) stay hidden from everyone else.
// Tap the Profile title 5 times quickly to turn them on or off; the app reloads to apply it.
function useSecretTaps(onUnlock) {
  const [taps, setTaps] = useState([])
  return () => {
    const now = Date.now()
    const recent = [...taps.filter((t) => now - t < 2000), now]
    if (recent.length >= 5) {
      setTaps([])
      onUnlock()
    } else setTaps(recent)
  }
}

function ProfileScreen() {
  const [dev, setDev] = useState(readDev)
  const toggleDev = () => {
    const next = !dev
    try {
      if (next) localStorage.setItem(DEV_KEY, '1')
      else localStorage.removeItem(DEV_KEY)
    } catch {
      return
    }
    setDev(next)
    window.setTimeout(() => window.location.reload(), 700)
  }
  const onTitleTap = useSecretTaps(toggleDev)
  const [, page, friendId] = useHashParts()

  // #profile/friends/<id> is one friend's page
  if (page === 'friends' && friendId) return <FriendPage key={friendId} friendId={friendId} />
  // #profile/messages is the conversation with your physio or PT
  if (page === 'messages') return <MessagesPage />

  return (
    <>
      <div onClick={onTitleTap} className="select-none">
        <ScreenHeader title="Profile" intro="Your settings, professional connection and data." />
      </div>
      {dev && (
        <p className="-mt-4 mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Testing tools on · tap the title 5 times to turn off
        </p>
      )}
      <div className="space-y-4">
        <AccountPanel />
        <ThemeToggle />
        <NotificationsPanel />
        <ConnectPanel />
        <FriendsPanel />
        <PrivacyPanel />
        {dev && <PushKeysTool />}
      </div>
    </>
  )
}

export const SCREENS = {
  today: TodayScreen,
  programme: ProgrammeScreen,
  'body-map': BodyMapScreen,
  progress: ProgressScreen,
  rehab: RehabScreen,
  profile: ProfileScreen,
  clients: ClientsScreen,
}
