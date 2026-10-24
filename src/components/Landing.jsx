import { useEffect, useState } from 'react'
import { useLegal } from './Legal.jsx'
import { InstallSteps } from './Install.jsx'

// The first thing someone sees before they have an account: what Reforge is, who it's for, and how to start

const AUDIENCES = [
  {
    id: 'train',
    tab: 'Training',
    title: 'Train hard around what hurts',
    intro: 'Tell Reforge about your injuries once. Every session is built around them, and changes as you recover.',
    points: [
      [
        'A body map that lives',
        'See what’s injured, what’s healing and which muscles are getting stronger, on one body.',
      ],
      [
        'A 30-second check-in',
        'Rate how each injury feels after training and the next morning. Your rehab and coach stay up to date.',
      ],
      ['Fast logging in the gym', 'Big buttons and rest timers, made for between sets. Keeps working with no signal.'],
      ['Train with friends', 'Invite a mate to the same session and see each other’s sets appear live.'],
    ],
  },
  {
    id: 'pt',
    tab: 'PTs',
    title: 'Every client, one screen',
    intro: 'Run programmes, log live sessions on your phone and see who needs you today, without the spreadsheets.',
    points: [
      ['Needs you', 'Pain spikes, warning signs, messages and solo sessions to review, most urgent first.'],
      ['Live sessions', 'Log your client’s sets as they lift, with swaps, notes and form cues in a tap.'],
      ['Programmes and templates', 'Build a programme once and give it to any client in seconds.'],
      [
        'Bookings, packages and chat',
        '1-1s go straight into calendars, sessions are counted off, and clients can message you.',
      ],
    ],
  },
  {
    id: 'physio',
    tab: 'Physios',
    title: 'Rehab that carries on between appointments',
    intro: 'Set the stage, the guidance and the limits for each injury. Your patient sees them every time they train.',
    points: [
      [
        'Rehab stages and restrictions',
        'Move each injured area through its stages and say what to avoid. Your patient sees it every time.',
      ],
      [
        'Pain check-ins and red flags',
        'Daily scores and warning signs come to you, so you can act before the next appointment.',
      ],
      ['Assessments', 'A structured first assessment that sits on the patient’s record.'],
      ['Targets with deadlines', 'For example: hop test at 90% of the good leg by 1 December. Tick them off together.'],
    ],
  },
]

const STEPS = [
  ['Tell us what hurts', 'Pick your injuries on the body map and answer a few questions about how you train.'],
  [
    'Train with a plan that adapts',
    'Follow the starter plan or one from your coach. Check in, log, and watch the map change.',
  ],
  [
    'Bring in your physio or PT',
    'Share a 6-letter code. They see your training and pain, and guide what happens next.',
  ],
]

// A picture of the app, made from the app's own pieces
function PhonePreview() {
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[19rem] select-none">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gold/10 blur-2xl" />
      <div className="rounded-[2.4rem] border border-line bg-ink p-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-line" />
        <div className="space-y-2.5 px-1 pb-2">
          <div className="rounded-2xl border border-gold/60 bg-panel p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">Up next · set by Sarah</p>
            <p className="mt-1 font-display text-3xl font-bold uppercase leading-none">Lower A</p>
            <p className="mt-1 text-xs text-muted">Box squat 3 × 8 · 40 kg</p>
            <div className="mt-3 rounded-lg bg-gold py-2 text-center text-xs font-semibold text-ink">Start session</div>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-semibold text-white">Left knee</p>
              <p className="text-xs font-semibold" style={{ color: 'var(--pain-mild)' }}>
                2/10 · Mild
              </p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full w-1/5 rounded-full" style={{ background: 'var(--pain-mild)' }} />
            </div>
            <p className="mt-2 text-[11px] text-muted">Sarah: keep jumps low this week.</p>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-4">
            <p className="text-xs font-semibold text-white">Hop test at 90% of the good leg</p>
            <p className="mt-1 text-[11px] text-muted">by 1 Dec · 39 days left</p>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
              <div className="h-full w-2/5 rounded-full bg-gold" />
            </div>
          </div>
          <div className="flex justify-start">
            <p className="max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-panel px-3 py-2 text-xs text-white">
              Great session. Keep the box squats at 40 kg this week.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Audiences() {
  const [picked, setPicked] = useState(AUDIENCES[0].id)
  const audience = AUDIENCES.find((a) => a.id === picked)
  return (
    <section aria-labelledby="who-heading">
      <h2 id="who-heading" className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
        Built for
      </h2>
      <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Who it's for">
        {AUDIENCES.map((a) => (
          <button
            key={a.id}
            type="button"
            role="tab"
            id={`tab-${a.id}`}
            aria-selected={picked === a.id}
            aria-controls="audience-panel"
            onClick={() => setPicked(a.id)}
            className={`rounded-full border px-5 py-2 font-semibold ${
              picked === a.id ? 'border-gold bg-gold text-ink' : 'border-line text-muted hover:text-white'
            }`}
          >
            {a.tab}
          </button>
        ))}
      </div>
      <div
        key={audience.id}
        id="audience-panel"
        role="tabpanel"
        aria-labelledby={`tab-${audience.id}`}
        className="mt-6 rounded-2xl border border-line bg-panel p-6 sm:p-8"
      >
        <h3 className="font-display text-3xl font-bold uppercase leading-none">{audience.title}</h3>
        <p className="mt-3 max-w-2xl leading-relaxed text-neutral-300">{audience.intro}</p>
        <ul className="mt-6 grid gap-5 sm:grid-cols-2">
          {audience.points.map(([title, text]) => (
            <li key={title} className="flex gap-3">
              <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
              <span>
                <span className="block font-semibold text-white">{title}</span>
                <span className="mt-0.5 block text-sm leading-relaxed text-muted">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

const startButton =
  'inline-flex items-center justify-center rounded-xl bg-gold px-6 py-3.5 font-semibold text-ink hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'
const signInButton =
  'inline-flex items-center justify-center rounded-xl border border-line px-6 py-3.5 font-semibold text-white hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'

// preview: opened from the testing tools while signed in, with a way back to the app
export default function Landing({ preview = false }) {
  const { link, doc } = useLegal()
  // Opened from Profile, so start at the top rather than wherever Profile was scrolled to
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  return (
    <>
      {preview && (
        <div
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 border-b border-gold/60 bg-ink/95 px-5 py-2.5 text-sm backdrop-blur"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}
        >
          <span className="font-semibold text-gold">Testing · landing page preview</span>
          <a href="#profile" className="rounded-full bg-gold px-3 py-1 font-semibold text-ink">
            Back to app
          </a>
        </div>
      )}
      <main
        className="mx-auto max-w-5xl overflow-x-clip px-5 sm:px-8"
        style={{
          paddingTop: `calc(env(safe-area-inset-top) + ${preview ? '4rem' : '1.25rem'})`,
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
        }}
      >
        <header className="flex items-center justify-between">
          <p className="font-display text-2xl font-bold uppercase tracking-tight">
            Reforge
            <span aria-hidden="true" className="mt-0.5 block h-0.5 w-6 bg-gold" />
          </p>
          <a href="#signin" className="text-sm font-semibold text-muted hover:text-white">
            Sign in
          </a>
        </header>

        <section className="grid items-center gap-12 pt-12 pb-16 lg:grid-cols-[1.35fr_1fr] lg:pt-20 lg:pb-24">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">Injury-aware training and rehab</p>
            <h1 className="mt-4 font-display text-[clamp(2.25rem,calc((100vw-2.75rem)/7.9),4.1rem)] font-bold uppercase leading-[0.9] tracking-tight">
              <span className="block whitespace-nowrap">Train around it.</span>
              <span className="block whitespace-nowrap text-gold">Come back stronger.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-neutral-300">
              Reforge builds your training around your injuries and keeps your physio or PT in the loop, every session.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#signup" className={startButton}>
                Create an account
              </a>
              <a href="#signin" className={signInButton}>
                I have an account
              </a>
            </div>
          </div>
          <PhonePreview />
        </section>

        <div className="space-y-20">
          <Audiences />

          <section aria-labelledby="how-heading">
            <h2 id="how-heading" className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
              How it works
            </h2>
            <ol className="mt-6 grid gap-4 md:grid-cols-3">
              {STEPS.map(([title, text], i) => (
                <li key={title} className="rounded-2xl border border-line bg-panel p-6">
                  <p className="font-display text-5xl font-bold leading-none text-gold">{i + 1}</p>
                  <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="install-heading" className="grid gap-8 md:grid-cols-2 md:items-start">
            <div>
              <h2 id="install-heading" className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">
                Use it like an app
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-neutral-300">
                No app store needed. Add Reforge to your home screen and it opens full screen, loads fast, and keeps
                logging your sets when the gym has no signal.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-6">
              <InstallSteps />
            </div>
          </section>

          <section className="rounded-2xl border border-gold/60 bg-panel px-6 py-10 text-center sm:px-10">
            <h2 className="font-display text-4xl font-bold uppercase leading-none sm:text-5xl">Start today</h2>
            <p className="mx-auto mt-3 max-w-md text-neutral-300">
              Set up takes about two minutes. Bring your physio or PT in whenever you're ready.
            </p>
            <a href="#signup" className={`mt-6 ${startButton}`}>
              Create an account
            </a>
          </section>
        </div>

        <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
          <p className="max-w-2xl">
            Reforge helps you train alongside advice from a qualified professional. It doesn't diagnose or treat
            injuries. If you're in severe pain or think something is wrong, speak to a physio or GP, call 111, or 999 in
            an emergency.
          </p>
          <p className="mt-4 flex gap-4">
            {link('privacy', 'Privacy')}
            {link('terms', 'Terms')}
          </p>
        </footer>
        {doc}
      </main>
    </>
  )
}
