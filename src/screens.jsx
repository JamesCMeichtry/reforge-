import { useState } from 'react'
import { useAuth } from './auth/AuthProvider.jsx'
import { supabase } from './lib/supabase.js'
import BodyMap from './components/BodyMap.jsx'

function ScreenHeader({ title, intro }) {
  return (
    <header className="mb-8">
      <h1 className="font-display text-6xl font-bold uppercase leading-none tracking-tight">{title}</h1>
      <div aria-hidden="true" className="mt-3 h-1 w-10 bg-gold" />
      <p className="mt-4 text-base text-muted">{intro}</p>
    </header>
  )
}

function Panel({ heading, note, children }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <h2 className="font-display text-2xl font-semibold">{heading}</h2>
      <p className="mt-2 leading-relaxed text-neutral-300">{children}</p>
      {note && <p className="mt-4 text-sm font-medium text-gold">{note}</p>}
    </section>
  )
}

function TodayScreen() {
  return (
    <>
      <ScreenHeader title="Today" intro="Your session, check-in and progress at a glance." />
      <div className="space-y-4">
        <Panel heading="Today's session" note="Arrives in phase 2">
          Once your programme is built, today's warm-up, main lifts and rehab work appear here.
        </Panel>
        <Panel heading="Daily check-in" note="Arrives in phase 2">
          A quick question about how your body feels, so the session can adapt before you start.
        </Panel>
      </div>
    </>
  )
}

function ProgrammeScreen() {
  return (
    <>
      <ScreenHeader title="Programme" intro="Your full plan, built around your goals and injuries." />
      <Panel heading="No programme yet" note="Arrives in phase 2">
        Answer a few questions about your training, equipment and injuries, and Reforge builds your plan.
        You'll log sets, reps and weight here.
      </Panel>
    </>
  )
}

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
      <Panel heading="Nothing logged yet" note="Arrives in phase 5">
        Log your first session and your strength charts, training calendar and milestones start filling in.
      </Panel>
    </>
  )
}

function RehabScreen() {
  return (
    <>
      <ScreenHeader title="Rehab" intro="Track each injury and move up its progression ladder." />
      <Panel heading="No injuries added">
        Injuries you add during setup get their own card, with a step-by-step ladder and regular check-ins.
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
        <Panel heading="Connect a professional" note="Arrives in phase 6">
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
