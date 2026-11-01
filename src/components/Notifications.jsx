import { useEffect, useState } from 'react'
import { buttonPrimary, buttonSecondary } from './ui.jsx'
import { toast } from './Feedback.jsx'
import { InstallSteps } from './Install.jsx'
import {
  REMINDERS,
  disablePush,
  enablePush,
  fetchReminderSettings,
  makeKeys,
  pushStatus,
  saveReminderSettings,
} from '../lib/push.js'

const WHAT = [
  'Messages from your physio, PT or clients',
  'Workout invites and replies',
  '1-1 sessions booked or cancelled',
  'New targets and programme changes from your coach',
  'Reminders you choose below',
]

const PROBLEMS = {
  blocked: "Your phone said no to notifications. Turn them on in your phone's settings, then come back here.",
  'not-set-up': "Notifications aren't switched on for Reforge yet. Try again soon.",
  'no-worker': 'Close Reforge completely, open it again, then try once more.',
}

// One switch per reminder. Saved to your account, so it applies on every phone you use.
function Reminders() {
  const [settings, setSettings] = useState(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    fetchReminderSettings()
      .then(setSettings)
      .catch(() => setFailed(true))
  }, [])

  async function flip(id) {
    const before = settings
    const next = { ...settings, [id]: !settings[id] }
    setSettings(next)
    try {
      await saveReminderSettings(next)
    } catch {
      setSettings(before)
      toast("Couldn't save that. Check your connection.", { tone: 'error' })
    }
  }

  if (failed) return <p className="mt-4 text-sm text-muted">Couldn't load your reminders. Check your connection.</p>
  if (!settings) return null
  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-muted">Reminders</h3>
      <ul className="mt-2 divide-y divide-line">
        {REMINDERS.map(([id, label, detail]) => (
          <li key={id} className="flex items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">{label}</span>
              <span className="block text-sm text-muted">{detail}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={settings[id]}
              aria-label={label}
              onClick={() => flip(id)}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
                settings[id] ? 'bg-gold' : 'bg-line'
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute top-1 left-1 h-6 w-6 rounded-full shadow transition-transform ${
                  settings[id] ? 'translate-x-6' : ''
                }`}
                style={{ background: '#fff' }}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Profile: turn notifications on or off for this phone
export function NotificationsPanel() {
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState('')

  useEffect(() => {
    pushStatus()
      .then(setStatus)
      .catch(() => setStatus('unsupported'))
  }, [])

  async function turnOn() {
    setBusy(true)
    setProblem('')
    try {
      await enablePush()
      setStatus('on')
      toast('Notifications are on')
    } catch (err) {
      const now = await pushStatus().catch(() => 'ask')
      setStatus(now)
      // A blocked phone already explains itself below the list
      if (now !== 'blocked') {
        setProblem(PROBLEMS[err.message] ?? "Couldn't turn notifications on. Check your connection and try again.")
      }
    }
    setBusy(false)
  }

  async function turnOff() {
    setBusy(true)
    try {
      await disablePush()
      setStatus('ask')
      toast('Notifications are off on this phone')
    } catch {
      setProblem("Couldn't turn them off. Check your connection and try again.")
    }
    setBusy(false)
  }

  if (status === null) return null
  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Notifications</h2>
        {status === 'on' && <span className="text-sm font-semibold text-gold">On</span>}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-neutral-300">
        {WHAT.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted">
        They never show what a message says or anything about your injuries, so nothing private appears on your lock
        screen.
      </p>

      {status === 'on' && <Reminders />}
      {status === 'on' && (
        <button type="button" onClick={turnOff} disabled={busy} className={`mt-4 ${buttonSecondary}`}>
          Turn off on this phone
        </button>
      )}
      {status === 'ask' && (
        <button type="button" onClick={turnOn} disabled={busy} className={`mt-4 w-full ${buttonPrimary}`}>
          {busy ? 'Turning on…' : 'Turn on notifications'}
        </button>
      )}
      {status === 'blocked' && <p className="mt-4 text-sm text-neutral-300">{PROBLEMS.blocked}</p>}
      {status === 'install-first' && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-3 text-sm text-neutral-300">
            On iPhone, notifications work once Reforge is on your home screen. Add it, open it from there, then turn
            them on here.
          </p>
          <InstallSteps />
        </div>
      )}
      {status === 'unsupported' && (
        <p className="mt-4 text-sm text-neutral-300">
          This browser can't show notifications. Try Safari on iPhone or Chrome on Android.
        </p>
      )}
      {problem && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {problem}
        </p>
      )}
    </section>
  )
}

function KeyBox({ label, value }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      toast(`${label} copied`)
    } catch {
      toast('Press and hold the key to copy it', { tone: 'error' })
    }
  }
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted">{label}</p>
        <button type="button" onClick={copy} className="text-sm font-semibold text-gold">
          Copy
        </button>
      </div>
      <p className="mt-1 select-all break-all rounded-lg border border-line bg-ink px-3 py-2 font-mono text-xs text-white">
        {value}
      </p>
    </div>
  )
}

// Testing tools: makes the notification keys for setting up Supabase, right here on this phone
export function PushKeysTool() {
  const [keys, setKeys] = useState(null)
  return (
    <section className="rounded-2xl border border-dashed border-gold/60 bg-panel p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Testing tools · set up once</p>
      <h2 className="mt-2 font-display text-2xl font-semibold">Notification keys</h2>
      <p className="mt-2 text-sm text-neutral-300">
        Makes the two keys Supabase needs to send notifications. Put both in Supabase under Edge Functions, Secrets.
        Keep the private key to yourself, and only make keys once: new keys stop everyone's notifications until they
        turn them on again.
      </p>
      {keys ? (
        <>
          <KeyBox label="VAPID_PUBLIC_KEY" value={keys.publicKey} />
          <KeyBox label="VAPID_PRIVATE_KEY" value={keys.privateKey} />
        </>
      ) : (
        <button type="button" onClick={() => makeKeys().then(setKeys)} className={`mt-4 w-full ${buttonSecondary}`}>
          Make keys
        </button>
      )}
    </section>
  )
}
