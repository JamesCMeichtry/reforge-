import { useEffect, useState } from 'react'
import { InstallSteps } from './Install.jsx'
import { DEMO_CLIENTS } from '../lib/demo.js'
import './Screens.css'

// Pages anyone can open, signed in or not: #plans (what each plan includes) and #testers (a guide for testers).
// Nothing here charges anyone. Plans are a preview until payments are switched on.

const primary =
  'inline-flex w-full items-center justify-center rounded-xl bg-gold px-5 py-3 font-semibold text-ink hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'
const secondary =
  'inline-flex w-full items-center justify-center rounded-xl border border-line px-5 py-3 font-semibold text-white hover:border-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold'

function PageFrame({ signedIn, children }) {
  // Opened from somewhere else in the app, so start at the top
  useEffect(() => window.scrollTo(0, 0), [])
  return (
    <main
      className="mx-auto max-w-5xl overflow-x-clip px-5 sm:px-8"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 2.5rem)',
      }}
    >
      <header className="flex items-center justify-between">
        <a href={signedIn ? '#today' : '#welcome'} className="font-display text-2xl font-bold uppercase tracking-tight">
          Reforge
          <span aria-hidden="true" className="mt-0.5 block h-0.5 w-6 bg-gold" />
        </a>
        {signedIn ? (
          <a href="#profile" className="rounded-full bg-gold px-3.5 py-1.5 text-sm font-semibold text-ink">
            Back to app
          </a>
        ) : (
          <a href="#signin" className="text-sm font-semibold text-muted hover:text-white">
            Sign in
          </a>
        )}
      </header>
      {children}
      <footer className="mt-16 border-t border-line pt-6 text-xs leading-relaxed text-muted">
        <p className="max-w-2xl">
          Reforge helps you train alongside advice from a qualified professional. It doesn't diagnose or treat injuries.
          If you're in severe pain or think something is wrong, speak to a physio or GP, call 111, or 999 in an
          emergency.
        </p>
      </footer>
    </main>
  )
}

function Eyebrow({ children }) {
  return <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold">{children}</p>
}

function Toggle({ options, value, onChange, label }) {
  return (
    <div className="inline-flex rounded-full border border-line bg-panel p-1" role="group" aria-label={label}>
      {options.map(([id, text]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={value === id}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors duration-200 ${
            value === id ? 'bg-gold text-ink shadow' : 'text-muted hover:text-white'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  )
}

/* ---------- Plans ---------- */

// [feature, included?]. Text in the second slot replaces the tick, e.g. 'Up to 5'.
const SOLO_PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Everything you need to train around an injury.',
    price: { month: '£0', year: '£0' },
    note: { month: 'Free forever', year: 'Free forever' },
    features: [
      ['Living body map: injuries and strength on one body', true],
      ['Session logging, rest timers and gym mode', true],
      ['Rehab stages and pain check-ins', true],
      ['Streaks, progress charts and monthly report', true],
      ['Injury-aware programme templates', true],
      ['Train with friends', true],
      ['AI coach that builds your plan', false],
      ['Weekly AI changes from your check-ins', false],
    ],
  },
  {
    id: 'plus',
    name: 'Plus',
    badge: 'AI coach',
    tagline: 'A coach that knows your injuries, for the price of a coffee a week.',
    price: { month: '£9.99', year: '£69' },
    note: { month: 'per month', year: 'per year · about £5.75 a month' },
    featured: true,
    features: [
      ['Everything in Free', true],
      ['AI builds your training plan around your injuries', true],
      ['Adjusts every week from your sets and check-ins', true],
      ['Swaps exercises when something hurts', true],
      ['Ask your coach anything, any time', true],
      ['Steps back when pain flares and points you to a physio', true],
      ['7-day free trial', true],
    ],
  },
]

const COACH_PLANS = [
  {
    id: 'starter',
    name: 'Coach Starter',
    tagline: 'Try every coaching tool with your first clients.',
    price: { month: 'Free', year: 'Free' },
    note: { month: 'for 2 clients · £15 a month for up to 5', year: 'for 2 clients · £150 a year for up to 5' },
    features: [
      ['Clients', 'Up to 5'],
      ['Needs you: pain spikes, red flags and requests first', true],
      ['Programmes, templates and live sessions', true],
      ['Rehab stages, assessments and targets', true],
      ['Bookings, packages, chat and monthly reports', true],
      ['AI drafts and suggestions to save you time', true],
      ['Your own AI coach for your training', false],
    ],
  },
  {
    id: 'pro',
    name: 'Coach Pro',
    badge: 'Best value',
    tagline: 'All-in. No add-ons, no surprises.',
    price: { month: '£35', year: '£350' },
    note: { month: 'per month', year: 'per year · 2 months free' },
    featured: true,
    features: [
      ['Clients', 'Up to 20'],
      ['Everything in Coach Starter', true],
      ['Your own Plus AI coach for your training, included', true],
      ['New clients sent your way from solo users who need help', true],
      ['Priority support', true],
      ['30-day free trial, no card needed', true],
    ],
  },
]

const FAQS = [
  [
    'Do coached clients pay?',
    'No. If a physio or PT looks after you on Reforge, your account is free. Your coach is in charge of your programme, so the AI coach stays off.',
  ],
  [
    'What happens if I stop Plus?',
    'You keep everything you have logged: sessions, check-ins and your body map. Your plan stops changing week to week and you go back to the free templates.',
  ],
  [
    'Is the AI coach medical advice?',
    "No. It works within safe limits, eases off when pain or warning signs show up and points you to a physio. It doesn't diagnose.",
  ],
  [
    'Can a PT use Reforge for their own training too?',
    'Yes. Every coach account is a full training account as well. On Coach Pro the AI coach for your own training is included.',
  ],
  ['Am I charged anything now?', 'No. Reforge is free while it is being tested. These are the planned prices.'],
]

function Feature({ text, value }) {
  const on = value !== false
  return (
    <li className={`flex items-start gap-2.5 text-sm ${on ? 'text-neutral-200' : 'text-muted'}`}>
      <span
        aria-hidden="true"
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
          on ? 'bg-gold/15 text-gold' : 'bg-line text-muted'
        }`}
      >
        {on ? '✓' : '–'}
      </span>
      <span className="min-w-0 flex-1">
        {text}
        {typeof value === 'string' && <span className="font-semibold text-white">: {value}</span>}
        <span className="sr-only">{on ? ' (included)' : ' (not included)'}</span>
      </span>
    </li>
  )
}

function PlanCard({ plan, billing, signedIn, index }) {
  const cta =
    plan.id === 'free' || plan.id === 'starter'
      ? { text: signedIn ? 'Included now' : 'Start free', href: signedIn ? null : '#signup' }
      : { text: 'Coming soon', href: null }
  return (
    <article
      className={`rise-in relative flex flex-col overflow-hidden rounded-3xl border bg-panel p-6 ${
        plan.featured ? 'tint-glow border-gold/70' : 'border-line'
      }`}
      style={{ '--i': index }}
    >
      {plan.featured && (
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: 'linear-gradient(90deg, var(--color-gold), transparent)' }}
          aria-hidden="true"
        />
      )}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-3xl font-bold uppercase leading-none">{plan.name}</h3>
        {plan.badge && (
          <span className="shrink-0 rounded-full bg-gold px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-ink">
            {plan.badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-neutral-300">{plan.tagline}</p>
      <p className="mt-5 font-display text-5xl font-bold leading-none text-white">{plan.price[billing]}</p>
      <p className="mt-1 text-sm text-muted">{plan.note[billing]}</p>
      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map(([text, value]) => (
          <Feature key={text} text={text} value={value} />
        ))}
      </ul>
      <div className="mt-6">
        {cta.href ? (
          <a href={cta.href} className={plan.featured ? primary : secondary}>
            {cta.text}
          </a>
        ) : (
          <button type="button" disabled className={`${plan.featured ? primary : secondary} cursor-default opacity-70`}>
            {cta.text}
          </button>
        )}
      </div>
    </article>
  )
}

export function PlansPage({ signedIn }) {
  const [who, setWho] = useState(() => (window.location.hash === '#plans/coach' ? 'coach' : 'solo'))
  const [billing, setBilling] = useState('month')
  const plans = who === 'solo' ? SOLO_PLANS : COACH_PLANS
  return (
    <PageFrame signedIn={signedIn}>
      <section className="pt-12 pb-8 text-center lg:pt-16">
        <Eyebrow>Plans</Eyebrow>
        <h1 className="mt-4 font-display text-[clamp(2.5rem,11vw,4.5rem)] font-bold uppercase leading-[0.9] tracking-tight">
          Train smarter.
          <span className="block text-gold">Coach better.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg leading-relaxed text-neutral-300">
          Start free. Add an AI coach when you want a plan that changes with you, or bring your clients across with
          everything included.
        </p>
        <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-4 py-1.5 text-sm font-semibold text-gold">
          <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
          Free while in testing. Nothing is charged yet.
        </p>
      </section>

      <div className="flex flex-col items-center gap-3">
        <Toggle
          label="Who it's for"
          value={who}
          onChange={setWho}
          options={[
            ['solo', 'For you'],
            ['coach', 'For PTs and physios'],
          ]}
        />
        <Toggle
          label="Billing"
          value={billing}
          onChange={setBilling}
          options={[
            ['month', 'Monthly'],
            ['year', 'Yearly · save up to 40%'],
          ]}
        />
      </div>

      <div key={who} className="mx-auto mt-8 grid max-w-3xl gap-4 md:grid-cols-2">
        {plans.map((plan, i) => (
          <PlanCard key={plan.id} plan={plan} billing={billing} signedIn={signedIn} index={i} />
        ))}
      </div>

      {who === 'coach' && (
        <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-muted">
          More than 20 clients, or a clinic with several coaches? A Studio plan is on the way.
        </p>
      )}
      <p className="mx-auto mt-4 max-w-3xl text-center text-sm text-muted">
        Clients coached on Reforge are always free.
      </p>

      <section className="mx-auto mt-16 max-w-3xl" aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="font-display text-4xl font-bold uppercase leading-none">
          Questions
        </h2>
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-panel">
          {FAQS.map(([q, a]) => (
            <details key={q} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-white">
                {q}
                <span aria-hidden="true" className="text-gold transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">{a}</p>
            </details>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted">Prices include VAT and may change before launch.</p>
      </section>
    </PageFrame>
  )
}

/* ---------- Tester guide ---------- */

const GUIDES = {
  pro: {
    tab: "I'm a PT or physio",
    steps: [
      [
        'Make your account',
        'Tap Create an account below, then pick "I\'m a physio, PT or coach" on the first question. It takes about two minutes.',
      ],
      [
        'Add the demo clients',
        'Open Clients and tap Add demo clients. Four made-up clients appear with 6 to 8 weeks of training, check-ins and rehab (meet them below). Remove them any time.',
      ],
      [
        'Coach them',
        'Start with Needs you, then open each client: Body map, Rehab stages, Targets, Programme and Messages. Start a Live session and log sets as if they were in front of you.',
      ],
      [
        "See the client's side",
        'Optional: make a second account with another email and pick "I\'m training". On it, go to Profile, tap Get a connect code, then enter the code on your Clients page.',
      ],
    ],
    tryList: [
      'Needs you: is the order right? Is anything missing that you would want flagged?',
      'Rehab stages and restrictions: do they match how you actually progress a patient?',
      'Assessment: what questions would you add or remove?',
      'Live sessions: is it quick enough to use between sets with a real client?',
      'Programme templates: could you build your usual programmes with them?',
    ],
  },
  solo: {
    tab: 'I train myself',
    steps: [
      [
        'Make your account',
        'Tap Create an account below and pick "I\'m training". Add any injuries on the body map and answer the questions about how you train.',
      ],
      [
        'Pick a programme',
        'On Programme, start from a template or build your own days. Tap a day to see the plan before you start.',
      ],
      [
        'Train and check in',
        'Log a session. Afterwards rate how each injury felt, then again the next morning. Your body map and Rehab update from this.',
      ],
      [
        'Watch it change',
        'Over a week or two, check Progress, Rehab and the Body map. Muscles level up as you train them and injuries move through stages.',
      ],
    ],
    tryList: [
      'Logging in the gym: is it fast enough between sets?',
      'The body map: does it make sense without explaining?',
      'Check-ins: would you actually do one after every session?',
      'Anything that felt confusing, slow or pointless.',
    ],
  },
}

// Colours from the Clients page palette, just for these cards
const DEMO_COLOURS = ['#38bdf8', '#a78bfa', '#34d399', '#f472b6']

const COMING = [
  ['AI coach', 'Builds and adjusts your plan around your injuries. Coaches get AI drafts and suggestions.'],
  ['Plans and payments', 'Free, Plus and coach plans. See what each includes on the Plans page.'],
  ['A full app', 'From the App Store and Google Play, after testing.'],
]

export function TesterGuide({ signedIn }) {
  const [who, setWho] = useState('pro')
  const guide = GUIDES[who]
  return (
    <PageFrame signedIn={signedIn}>
      <section className="pt-12 pb-10 lg:pt-16">
        <Eyebrow>Tester guide</Eyebrow>
        <h1 className="mt-4 font-display text-[clamp(2.5rem,11vw,4.5rem)] font-bold uppercase leading-[0.9] tracking-tight">
          Help shape
          <span className="block text-gold">Reforge.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-300">
          Thanks for testing. Reforge is injury-aware training and rehab that keeps the physio or PT in the loop. Here's
          how to get going and what I'd most like your thoughts on.
        </p>
        <div className="mt-7 flex max-w-md flex-col gap-3 sm:flex-row">
          <a href={signedIn ? '#today' : '#signup'} className={primary}>
            {signedIn ? 'Open the app' : 'Create an account'}
          </a>
          <a href="#plans" className={secondary}>
            See the plans
          </a>
        </div>
      </section>

      <section
        className="mb-12 flex gap-3 rounded-2xl border border-gold/50 bg-gold/10 p-5 text-sm leading-relaxed"
        aria-label="Before you start"
      >
        <span aria-hidden="true" className="font-display text-2xl font-bold leading-none text-gold">
          !
        </span>
        <p className="text-neutral-200">
          <span className="font-semibold text-white">This is a test version.</span> Please use made-up clients and
          injuries, not real patients' details. Things will change as I improve it, and nothing is charged.
        </p>
      </section>

      <Toggle
        label="Your role"
        value={who}
        onChange={setWho}
        options={Object.entries(GUIDES).map(([id, g]) => [id, g.tab])}
      />

      <ol key={who} className="mt-6 grid gap-4 md:grid-cols-2">
        {guide.steps.map(([title, text], i) => (
          <li key={title} className="rise-in rounded-2xl border border-line bg-panel p-6" style={{ '--i': i }}>
            <p className="font-display text-5xl font-bold leading-none text-gold">{i + 1}</p>
            <h2 className="mt-3 text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-neutral-300">{text}</p>
          </li>
        ))}
      </ol>

      {who === 'pro' && (
        <section className="mt-12" aria-labelledby="demo-heading">
          <h2 id="demo-heading" className="font-display text-4xl font-bold uppercase leading-none">
            Meet the demo clients
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-neutral-300">
            Made-up people with realistic histories, so you can see Reforge working without setting anyone up.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {DEMO_CLIENTS.map((client, i) => (
              <article
                key={client.id}
                className="rise-in tint-glow relative overflow-hidden rounded-2xl border border-line bg-panel p-5"
                style={{ '--i': i, '--tint': DEMO_COLOURS[i] }}
              >
                <span
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ background: DEMO_COLOURS[i] }}
                  aria-hidden="true"
                />
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-ink"
                    style={{ background: DEMO_COLOURS[i] }}
                  >
                    {client.name
                      .split(' ')
                      .map((part) => part[0])
                      .join('')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white">
                      {client.name}, {client.age}
                    </h3>
                    <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted">{client.tag}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-200">{client.about}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  <span className="font-semibold text-gold">Try: </span>
                  {client.tryThis}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <div className="tint-glow rounded-2xl border border-line bg-panel p-6">
          <Eyebrow>What I'd love to know</Eyebrow>
          <ul className="mt-4 space-y-3">
            {guide.tryList.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-neutral-200">
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {item}
              </li>
            ))}
            <li className="flex gap-2.5 text-sm leading-relaxed text-neutral-200">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
              Would you pay for it? What would make it worth paying for?
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-panel p-6">
          <Eyebrow>Sending feedback</Eyebrow>
          <p className="mt-4 text-sm leading-relaxed text-neutral-200">
            In the app, go to <span className="font-semibold text-white">Profile</span> and use{' '}
            <span className="font-semibold text-white">Send feedback</span>. Pick bug, idea or other and say which page
            you were on. It tells me which phone you're using, so you don't need to.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-neutral-200">
            If something crashes, tap <span className="font-semibold text-white">Report this problem</span> on the error
            screen and I'll get the details.
          </p>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="install-heading">
        <div className="grid gap-6 md:grid-cols-2 md:items-start">
          <div>
            <h2 id="install-heading" className="font-display text-4xl font-bold uppercase leading-none">
              Put it on your phone
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-300">
              No app store needed yet. Add Reforge to your home screen and it opens full screen, and keeps logging sets
              with no signal. Turn on notifications in Profile, then Settings, to hear about messages and bookings.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <InstallSteps />
          </div>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="coming-heading">
        <h2 id="coming-heading" className="font-display text-4xl font-bold uppercase leading-none">
          Coming next
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {COMING.map(([title, text], i) => (
            <div key={title} className="rise-in rounded-2xl border border-line bg-panel p-5" style={{ '--i': i }}>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </PageFrame>
  )
}
