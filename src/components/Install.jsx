import { useState } from 'react'
import { buttonPrimary } from './ui.jsx'
import { dismissInstall, promptInstall, useInstall } from '../lib/install.js'
import { toast } from './Feedback.jsx'

// Little pictures of the buttons people need to find, drawn like the ones on their phone
function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M12 15V3M8 7l4-4 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 10H5.5A1.5 1.5 0 0 0 4 11.5v8A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-8a1.5 1.5 0 0 0-1.5-1.5H17" />
    </svg>
  )
}
function AddIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M12 8.5v7M8.5 12h7" strokeLinecap="round" />
    </svg>
  )
}
function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5.5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="18.5" r="1.7" />
    </svg>
  )
}

function Step({ n, icon, children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-bold text-ink">
        {n}
      </span>
      <span className="min-w-0 flex-1 pt-0.5 text-neutral-300">{children}</span>
      {icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-white">
          {icon}
        </span>
      )}
    </li>
  )
}

// The steps for this phone, or the one-tap button where the browser offers it
export function InstallSteps({ onInstalled }) {
  const { platform, canPrompt, installed } = useInstall()

  async function install() {
    if (await promptInstall()) {
      toast('Reforge is on your home screen')
      onInstalled?.()
    }
  }

  if (installed) {
    return <p className="text-neutral-300">You're using the installed app. Nothing else to do.</p>
  }
  if (canPrompt) {
    return (
      <div>
        <button type="button" onClick={install} className={`w-full ${buttonPrimary}`}>
          Install Reforge
        </button>
        <p className="mt-2 text-sm text-muted">Free. It opens straight into your training, full screen.</p>
      </div>
    )
  }
  if (platform === 'iphone' || platform === 'ipad') {
    return (
      <ol className="space-y-3">
        <Step n={1} icon={<ShareIcon />}>
          Tap <span className="font-semibold text-white">Share</span>. In Safari it's at the bottom of the screen (or
          top right on iPad), or under the <span className="font-semibold text-white">•••</span> button.
        </Step>
        <Step n={2} icon={<AddIcon />}>
          Scroll down and tap <span className="font-semibold text-white">Add to Home Screen</span>.
        </Step>
        <Step n={3}>
          Tap <span className="font-semibold text-white">Add</span>. Reforge appears on your home screen. Open it from
          there from now on.
        </Step>
      </ol>
    )
  }
  if (platform === 'android') {
    return (
      <ol className="space-y-3">
        <Step n={1} icon={<MenuIcon />}>
          Tap the browser's <span className="font-semibold text-white">menu</span> button (top right in Chrome).
        </Step>
        <Step n={2} icon={<AddIcon />}>
          Tap <span className="font-semibold text-white">Install app</span> or{' '}
          <span className="font-semibold text-white">Add to Home screen</span>.
        </Step>
        <Step n={3}>Confirm, then open Reforge from your home screen.</Step>
      </ol>
    )
  }
  return (
    <p className="text-neutral-300">
      Open Reforge on your phone to add it to your home screen. On a laptop, Chrome and Edge show an install icon at the
      right of the address bar.
    </p>
  )
}

// Today: a gentle suggestion to install, until it's installed or dismissed
export function InstallCard() {
  const { worthSuggesting } = useInstall()
  const [hidden, setHidden] = useState(false)
  if (!worthSuggesting || hidden) return null

  function dismiss() {
    dismissInstall()
    setHidden(true)
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Get the app</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">Add Reforge to your home screen</h2>
        </div>
        <button type="button" onClick={dismiss} aria-label="Not now" className="px-1 text-muted hover:text-white">
          ✕
        </button>
      </div>
      <p className="mt-1 mb-4 text-sm text-neutral-300">
        It opens full screen, faster, and keeps working in the gym with no signal.
      </p>
      <InstallSteps onInstalled={() => setHidden(true)} />
    </section>
  )
}
