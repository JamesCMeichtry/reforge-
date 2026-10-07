import { useState } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import { supabase } from './lib/supabase.js'
import BodyMap from './components/BodyMap.jsx'
import { Panel, ScreenHeader } from './components/ui.jsx'
import TodayScreen from './screens/TodayScreen.jsx'
import ProgrammeScreen from './screens/ProgrammeScreen.jsx'

function BodyMapScreen() {
  return (
    <>
      <ScreenHeader title="Body map" intro="Add your injuries and see every area they affect." />
      <BodyMap />
    </>
  )
}

function ProgressScreen() {
  return (
    <>
      <ScreenHeader title="Progress" intro="Strength, volume and consistency over time." />
      <Panel heading="Nothing to chart yet" note="Arrives in phase 7">
        Every set you log is already being saved. Strength charts, your training calendar and milestones build from
        it.
      </Panel>
    </>
  )
}

function RehabScreen() {
  return (
    <>
      <ScreenHeader title="Rehab" intro="Track each injury and move up its progression ladder." />
      <Panel heading="Check-ins and ladders" note="Arrives in phase 4">
        After each session you'll rate how your injured areas responded, and the body map colours will move with it.
      </Panel>
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
        <Panel heading="Connect a professional" note="Arrives in phase 9">
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
