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
      <ScreenHeader title="Body map" intro="Injuries, today's session and weekly load on one body." />
      <Panel heading="Your body map" note="Arrives in phase 4">
        Injured areas show in red and amber, today's muscles in gold, and weekly volume as intensity.
      </Panel>
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

function ProfileScreen() {
  return (
    <>
      <ScreenHeader title="Profile" intro="Your goals, settings and professional connection." />
      <div className="space-y-4">
        <Panel heading="Account" note="Arrives next session">
          Sign in to save your programme and progress across devices.
        </Panel>
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