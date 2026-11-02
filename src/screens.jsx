import { lazy, useState } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import { supabase } from './lib/supabase.js'
import InjuryEditor from './components/InjuryEditor.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'
import ConnectPanel from './components/ConnectPanel.jsx'
import { FriendPage, FriendsPanel, useHashParts } from './components/Friends.jsx'
import { MessagesPage } from './components/Chat.jsx'
import { PrivacyPanel } from './components/Legal.jsx'
import { FeedbackPanel } from './components/FeedbackPanel.jsx'
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
      <div className="mb-5 flex rounded-full border border-line bg-panel p-1" role="group" aria-label="Map mode">
        {[
          ['living', 'Living map'],
          ['injuries', 'Edit injuries'],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors duration-200 ${
              mode === value ? 'bg-gold text-ink shadow' : 'text-muted hover:text-white'
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

// Testing tools: see the landing page as a new visitor would, without signing out
function LandingPreviewTool() {
  return (
    <section className="rounded-2xl border border-dashed border-gold/60 bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Testing tools</p>
      <h2 className="mt-2 font-display text-2xl font-semibold">New visitor preview</h2>
      <p className="mt-2 text-sm text-neutral-300">
        See what new visitors see: the landing page, then the starting questions a new account answers. You stay signed
        in and nothing is saved.
      </p>
      <a
        href="#welcome"
        className="mt-4 block rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-white hover:border-gold"
      >
        Open landing page
      </a>
      <a
        href="#welcome/start"
        className="mt-2 block rounded-xl border border-line px-4 py-2.5 text-center text-sm font-semibold text-white hover:border-gold"
      >
        Open new account setup
      </a>
    </section>
  )
}

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

// #profile/settings: account, look and notifications. More settings arrive with the profile review.
function SettingsPage() {
  return (
    <>
      <a
        href="#profile"
        className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-white"
      >
        <span aria-hidden="true">‹</span> Profile
      </a>
      <ScreenHeader title="Settings" intro="Your account, how Reforge looks and what it tells you." />
      <div className="space-y-4">
        <AccountPanel />
        <ThemeToggle />
        <NotificationsPanel />
      </div>
    </>
  )
}

function SettingsLink() {
  return (
    <a
      href="#profile/settings"
      className="flex items-center gap-3 rounded-2xl border border-line bg-panel p-4 transition-colors hover:border-gold/60"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold/40 text-gold"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
        </svg>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-white">Settings</span>
        <span className="block text-sm text-muted">Account, theme and notifications</span>
      </span>
      <span className="text-xl text-muted" aria-hidden="true">
        ›
      </span>
    </a>
  )
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
  if (page === 'settings') return <SettingsPage />

  return (
    <>
      <div onClick={onTitleTap} className="select-none">
        <ScreenHeader title="Profile" intro="Your coach, friends, feedback and data." />
      </div>
      {dev && (
        <p className="-mt-4 mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold">
          Testing tools on · tap the title 5 times to turn off
        </p>
      )}
      <div className="space-y-4">
        <SettingsLink />
        <ConnectPanel />
        <FriendsPanel />
        <FeedbackPanel />
        <PrivacyPanel />
        {dev && <LandingPreviewTool />}
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
