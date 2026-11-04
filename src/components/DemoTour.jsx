import { useEffect, useState } from 'react'
import './Screens.css'

// A short guided tour for the demo app: one card above the tab bar that walks through the main screens,
// the monthly report, and how clients and friends connect with codes.
// Shows once on a new demo; "Tour" on the demo bar plays it again.

const DONE_KEY = 'reforge.demo-tour.done'
export const TOUR_EVENT = 'reforge:tour'

const STEPS = [
  {
    hash: 'today',
    title: 'Welcome, Sam',
    text: "You're a PT with 4 clients, and you train too. Here's a one-minute tour of the main parts.",
  },
  {
    hash: 'today',
    title: 'Today',
    text: 'Your day at a glance: the session up next, your week, and check-ins for your injuries.',
  },
  {
    hash: 'body-map',
    title: 'Body map',
    text: 'Injuries and strength on one body. Your left hamstring and right shoulder are healing; muscles you train level up.',
  },
  {
    hash: 'programme',
    title: 'Programme',
    text: 'Your plan, built around those injuries. Tap a day to see it, then start the session and log as you go.',
  },
  {
    hash: 'rehab',
    title: 'Rehab',
    text: 'Each injury moves from Flare to Cleared, based on how it feels after training and the next morning.',
  },
  {
    hash: 'progress/report',
    title: 'Monthly report',
    text: 'Every month gets a one-page report: sessions, new bests, how each injury went and targets met. Share yours, or send a client theirs as a message.',
  },
  {
    hash: 'clients',
    title: 'Clients',
    text: 'Needs you puts the urgent things first. Margaret reported a warning sign, so she is at the top. Tap any client to coach them.',
  },
  {
    hash: 'clients',
    title: 'Adding a client',
    text: 'Clients join with a 6-letter code. They tap Get a connect code on their Profile, and you type it into Add a client at the bottom of this page. Each code works once.',
  },
  {
    hash: 'profile',
    title: 'Friends',
    text: "Friends use codes too: tap Show my code for a friend and send it. Friends see each other's sessions and bests, never injuries or pain, and can train together live.",
  },
  {
    hash: 'profile',
    title: "That's it",
    text: 'Have a look around. Anything confusing or missing? Tell me with Send feedback on this page.',
  },
]

function readDone() {
  try {
    return localStorage.getItem(DONE_KEY) === '1'
  } catch {
    return true
  }
}

function markDone() {
  try {
    localStorage.setItem(DONE_KEY, '1')
  } catch {
    // The tour just shows again next time
  }
}

export default function DemoTour() {
  const [step, setStep] = useState(() => (readDone() ? null : 0))

  // "Tour" on the demo bar starts it again
  useEffect(() => {
    const replay = () => setStep(0)
    window.addEventListener(TOUR_EVENT, replay)
    return () => window.removeEventListener(TOUR_EVENT, replay)
  }, [])

  // Each step opens its screen
  useEffect(() => {
    if (step == null) return
    const hash = STEPS[step].hash
    if (window.location.hash.replace('#', '') !== hash) window.location.hash = hash
  }, [step])

  if (step == null) return null
  const current = STEPS[step]
  const last = step === STEPS.length - 1
  const close = () => {
    markDone()
    setStep(null)
  }

  return (
    <div
      className="fixed inset-x-3 z-[55] mx-auto max-w-md lg:inset-x-auto lg:right-8 lg:bottom-8!"
      style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5.25rem)' }}
      role="dialog"
      aria-label="Demo tour"
    >
      <section
        key={step}
        className="rise-in tint-glow relative overflow-hidden rounded-3xl border border-gold/70 bg-panel p-5 shadow-2xl"
      >
        <span
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: 'linear-gradient(90deg, var(--color-gold), transparent)' }}
          aria-hidden="true"
        />
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            Tour · {step + 1} of {STEPS.length}
          </p>
          <button type="button" onClick={close} className="text-sm font-semibold text-muted hover:text-white">
            Skip
          </button>
        </div>
        <h2 className="mt-2 font-display text-3xl font-bold uppercase leading-none">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-300">{current.text}</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex flex-1 gap-1.5" aria-hidden="true">
            {STEPS.map((s, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-gold' : i < step ? 'w-1.5 bg-gold/60' : 'w-1.5 bg-line'
                }`}
              />
            ))}
          </div>
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold text-white hover:border-gold"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => (last ? close() : setStep(step + 1))}
            className="rounded-xl bg-gold px-5 py-2 text-sm font-semibold text-ink"
          >
            {last ? 'Done' : step === 0 ? 'Start' : 'Next'}
          </button>
        </div>
      </section>
    </div>
  )
}
