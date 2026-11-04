import { useEffect, useState } from 'react'
import { DEMO_CLIENTS } from '../lib/demo.js'
import { startPractice } from '../lib/practice.js'
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

// What Reforge does, in a line each
const FEATURES = [
  ['Living body map', 'Injuries and strength on one body. Colours change as you train and recover.'],
  ['Programmes and live sessions', 'Build a plan once, then log a client’s sets as they lift.'],
  ['Rehab stages', 'Each injury moves from Flare to Cleared, driven by pain check-ins.'],
  ['Needs you', 'Pain spikes, warning signs, messages and requests, most urgent first.'],
  ['Targets and reports', 'Goals with deadlines, and a monthly report ready to share.'],
  ['Messages and bookings', 'Chat with clients, book 1-1s and count off session packages.'],
]

// Colours from the Clients page palette, just for these rows
const DEMO_COLOURS = ['#38bdf8', '#a78bfa', '#34d399', '#f472b6']

const COMING = [
  ['AI coach', 'Builds and adjusts plans around injuries.'],
  ['Plans and payments', 'Free, Plus and coach plans.'],
  ['A full app', 'App Store and Google Play.'],
]

// The big button: straight into the demo app, no email needed
function DemoButton({ signedIn, practice }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function start() {
    setBusy(true)
    setError('')
    try {
      await startPractice()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  if (signedIn) {
    return (
      <a href="#today" className={`${primary} py-4 text-lg`}>
        {practice ? 'Back to the demo app' : 'Open the app'}
      </a>
    )
  }
  return (
    <>
      <button type="button" onClick={start} disabled={busy} className={`${primary} py-4 text-lg`}>
        {busy ? 'Setting up your demo…' : 'Open the demo app'}
      </button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}
    </>
  )
}

export function TesterGuide({ signedIn, practice }) {
  return (
    <PageFrame signedIn={signedIn}>
      <section className="pt-12 pb-12 lg:pt-16">
        <Eyebrow>Tester preview</Eyebrow>
        <h1 className="mt-4 font-display text-[clamp(2.5rem,11vw,4.5rem)] font-bold uppercase leading-[0.9] tracking-tight">
          See Reforge
          <span className="block text-gold">in action.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-neutral-300">
          Injury-aware training and rehab that keeps the physio or PT in the loop. Have a look around the demo and tell
          me what you think.
        </p>
        <div className="mt-8 max-w-md">
          <DemoButton signedIn={signedIn} practice={practice} />
          {!signedIn && (
            <p className="mt-3 text-sm leading-relaxed text-muted">
              No sign-up. You'll be a PT with 4 clients. The demo is deleted after 7 days.{' '}
              <a href="#signup" className="font-semibold text-gold">
                Make a real account
              </a>{' '}
              instead.
            </p>
          )}
        </div>
      </section>

      <section aria-labelledby="inside-heading">
        <h2 id="inside-heading" className="font-display text-4xl font-bold uppercase leading-none">
          What's inside
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([title, text], i) => (
            <div key={title} className="rise-in rounded-2xl border border-line bg-panel p-5" style={{ '--i': i }}>
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2" aria-labelledby="demo-heading">
        <h2 id="demo-heading" className="font-display text-4xl font-bold uppercase leading-none md:col-span-2">
          In the demo
        </h2>
        <div className="rounded-2xl border border-line bg-panel p-5">
          <Eyebrow>Your clients</Eyebrow>
          <ul className="mt-4 space-y-3">
            {DEMO_CLIENTS.map((client, i) => (
              <li key={client.id} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-xs font-bold text-ink"
                  style={{ background: DEMO_COLOURS[i] }}
                >
                  {client.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">
                    {client.name}, {client.age} · {client.tag}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted">{client.about}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="tint-glow rounded-2xl border border-line bg-panel p-5">
          <Eyebrow>Your own training</Eyebrow>
          <p className="mt-4 text-sm leading-relaxed text-neutral-200">
            You train 4 days a week on an upper/lower split, built around a{' '}
            <span className="font-semibold text-white">left hamstring tear</span> and a niggly{' '}
            <span className="font-semibold text-white">right shoulder</span>. Six weeks of sessions and pain check-ins
            are already logged, so the body map, Rehab and Progress all have something to show.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Try: start today's session, check in afterwards, then open Clients and see who needs you.
          </p>
        </div>
      </section>

      <section className="mt-12 rounded-2xl border border-gold/50 bg-gold/10 p-6" aria-labelledby="feedback-heading">
        <h2 id="feedback-heading" className="font-display text-3xl font-bold uppercase leading-none">
          Tell me what you think
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-200">
          In the app, go to <span className="font-semibold text-white">Profile</span> and tap{' '}
          <span className="font-semibold text-white">Send feedback</span>. Anything that's confusing, missing or
          brilliant helps, and so does "would you pay for this?". This is a test version, so please don't put real
          patients' details in.
        </p>
      </section>

      <section className="mt-12" aria-labelledby="coming-heading">
        <h2 id="coming-heading" className="font-display text-3xl font-bold uppercase leading-none">
          Coming next
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {COMING.map(([title, text]) => (
            <div key={title} className="rounded-2xl border border-line bg-panel p-4">
              <p className="font-semibold text-white">{title}</p>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          ))}
        </div>
        <a href="#plans" className="mt-4 inline-block text-sm font-semibold text-gold">
          See the plans and planned prices ›
        </a>
      </section>
    </PageFrame>
  )
}
