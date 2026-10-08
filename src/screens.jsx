import { useState } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import { supabase } from './lib/supabase.js'
import BodyMap from './components/BodyMap.jsx'
import MuscleMap from './components/MuscleMap.jsx'
import { Panel, ScreenHeader } from './components/ui.jsx'
import TodayScreen from './screens/TodayScreen.jsx'
import ProgrammeScreen from './screens/ProgrammeScreen.jsx'
import RehabScreen from './screens/RehabScreen.jsx'
import ProgressScreen from './screens/ProgressScreen.jsx'


function BodyMapScreen() {
  const [mode, setMode] = useState('injuries')
  return (
    <>
      <ScreenHeader
        title="Body map"
        intro={
          mode === 'injuries'
            ? 'Add your injuries and see every area they affect.'
            : 'Every muscle head, and which exercises in your plan train it.'
        }
      />
      <div className="mb-4 flex gap-2" role="group" aria-label="Map mode">
        {[
          ['injuries', 'Injuries'],
          ['muscles', 'Muscles'],
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
      {mode === 'injuries' ? <BodyMap /> : <MuscleMap />}
    </>
  )
}

function AccountPanel() {
  const { session } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
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

function ProfileScreen() {
  return (
    <>
      <ScreenHeader title="Profile" intro="Your goals, settings and professional connection." />
      <div className="space-y-4">
        <AccountPanel />
        <Panel heading="Connect a professional" note="Coming soon">
          Share a code with your physio or PT so they can see your programme, progress and rehab.
        </Panel>
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
}
